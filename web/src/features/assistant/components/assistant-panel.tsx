'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MessageCircleQuestion, RotateCcw, Send, X } from 'lucide-react';
import clsx from 'clsx';

import { fetchAnswer, fetchCatalogue, fetchMatch, webRoute } from '../services';
import type { Answer, Catalogue, Match, Needs } from '../schemas';

/**
 * "Ask Pahad Pulse": preset questions answered from the platform's own data
 * (project/modules/assistant.md). Messages live in component state only and are gone when
 * the panel closes (AST-7). Styling uses the dashboard's own tokens; nothing here is bespoke.
 */

type Asked = { questionId: string; text: string; needs: Needs; district?: string; place?: string };

type Message =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'bot'; kind: 'intro' }
  | { id: number; role: 'bot'; kind: 'topic'; categoryId: string }
  | { id: number; role: 'bot'; kind: 'pick'; asked: Asked }
  | { id: number; role: 'bot'; kind: 'suggest'; suggestions: Match['suggestions'] }
  | { id: number; role: 'bot'; kind: 'answer'; answer: Answer }
  | { id: number; role: 'bot'; kind: 'text'; text: string; retry?: Asked };

/** `Omit` applied to each member, so a message keeps its own fields. */
type NewMessage = Message extends infer M ? (M extends Message ? Omit<M, 'id'> : never) : never;

let nextId = 1;

const chip =
  'min-h-11 rounded-full border border-border bg-surface px-3 py-2 text-left text-sm text-text-light transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function fill(text: string, catalogue: Catalogue | null, district?: string, place?: string) {
  let out = text;
  const d = catalogue?.districts.find((x) => x.slug === district);
  const p = catalogue?.places.find((x) => x.slug === place);
  if (d) out = out.replace('{district}', d.name);
  if (p) out = out.replace('{place}', p.name);
  return out;
}

export function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [catalogueFailed, setCatalogueFailed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const conversationRef = useRef(0);
  const catalogueRequestRef = useRef(false);

  const push = useCallback((message: NewMessage) => {
    setMessages((current) => [...current, { ...message, id: nextId++ } as Message]);
  }, []);

  const loadCatalogue = useCallback(() => {
    if (catalogueRequestRef.current) return;
    catalogueRequestRef.current = true;
    const conversation = conversationRef.current;
    setCatalogueFailed(false);
    fetchCatalogue()
      .then((data) => {
        setCatalogue(data);
        if (conversationRef.current === conversation) {
          setMessages([{ id: nextId++, role: 'bot', kind: 'intro' }]);
        }
      })
      .catch(() => {
        if (conversationRef.current === conversation) setCatalogueFailed(true);
      })
      .finally(() => {
        catalogueRequestRef.current = false;
      });
  }, []);

  const closePanel = useCallback(() => {
    conversationRef.current += 1;
    setOpen(false);
    setMessages([]);
    setDraft('');
    setBusy(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (catalogue === null && !catalogueFailed) loadCatalogue();
    else if (messages.length === 0) setMessages([{ id: nextId++, role: 'bot', kind: 'intro' }]);
  }, [open, catalogue, catalogueFailed, loadCatalogue, messages.length]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, closePanel]);

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const ask = useCallback(
    async (asked: Asked) => {
      if (asked.needs === 'district' && asked.district === undefined) {
        push({ role: 'bot', kind: 'pick', asked });
        return;
      }
      if (asked.needs === 'place' && asked.place === undefined) {
        push({ role: 'bot', kind: 'pick', asked });
        return;
      }
      push({ role: 'user', text: fill(asked.text, catalogue, asked.district, asked.place) });
      const conversation = conversationRef.current;
      setBusy(true);
      try {
        const answer = await fetchAnswer({
          questionId: asked.questionId,
          ...(asked.district !== undefined && { district: asked.district }),
          ...(asked.place !== undefined && { place: asked.place }),
        });
        if (conversationRef.current === conversation) {
          push({ role: 'bot', kind: 'answer', answer });
        }
      } catch {
        if (conversationRef.current === conversation) {
          push({
            role: 'bot',
            kind: 'text',
            text: "That answer couldn't be loaded. Check your connection and try again.",
            retry: asked,
          });
        }
      } finally {
        if (conversationRef.current === conversation) setBusy(false);
      }
    },
    [catalogue, push]
  );

  const askById = useCallback(
    (questionId: string, district?: string | null, place?: string | null) => {
      const question = catalogue?.categories
        .flatMap((c) => c.questions)
        .find((q) => q.id === questionId);
      if (question === undefined) return;
      void ask({
        questionId,
        text: question.text,
        needs: question.needs,
        ...(district ? { district } : {}),
        ...(place ? { place } : {}),
      });
    },
    [ask, catalogue]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (text === '' || busy) return;
    setDraft('');
    push({ role: 'user', text });
    const conversation = conversationRef.current;
    setBusy(true);
    try {
      const match = await fetchMatch(text);
      if (conversationRef.current !== conversation) return;
      setBusy(false);
      if (match.outcome === 'matched' && match.questionId !== null) {
        const question = catalogue?.categories
          .flatMap((category) => category.questions)
          .find((candidate) => candidate.id === match.questionId);
        if (question === undefined) {
          push({
            role: 'bot',
            kind: 'text',
            text: "That question isn't available right now. Please choose one of the topics below.",
          });
          push({ role: 'bot', kind: 'intro' });
          return;
        }

        // Keep the user's original wording visible and fetch the matched catalogue answer
        // without echoing a second, rewritten user bubble.
        const asked: Asked = {
          questionId: question.id,
          text: question.text,
          needs: question.needs,
          ...(match.district ? { district: match.district } : {}),
          ...(match.place ? { place: match.place } : {}),
        };
        if (asked.needs === 'district' && asked.district === undefined) {
          push({ role: 'bot', kind: 'pick', asked });
        } else if (asked.needs === 'place' && asked.place === undefined) {
          push({ role: 'bot', kind: 'pick', asked });
        } else {
          setBusy(true);
          try {
            const answer = await fetchAnswer({
              questionId: asked.questionId,
              ...(asked.district !== undefined && { district: asked.district }),
              ...(asked.place !== undefined && { place: asked.place }),
            });
            if (conversationRef.current === conversation) {
              push({ role: 'bot', kind: 'answer', answer });
            }
          } catch {
            if (conversationRef.current === conversation) {
              push({
                role: 'bot',
                kind: 'text',
                text: "That answer couldn't be loaded. Check your connection and try again.",
                retry: asked,
              });
            }
          } finally {
            if (conversationRef.current === conversation) setBusy(false);
          }
        }
      } else if (match.outcome === 'suggest') {
        push({ role: 'bot', kind: 'suggest', suggestions: match.suggestions });
      } else {
        push({
          role: 'bot',
          kind: 'text',
          text: 'I can only answer set questions from Pahad Pulse data. Try one of these topics:',
        });
        push({ role: 'bot', kind: 'intro' });
      }
    } catch {
      if (conversationRef.current !== conversation) return;
      setBusy(false);
      push({
        role: 'bot',
        kind: 'text',
        text: "That couldn't be sent. Check your connection and try again.",
      });
    }
  };

  return (
    <>
      {!open ? (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded="false"
          aria-controls="assistant-panel"
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white shadow-card hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <MessageCircleQuestion className="size-5" aria-hidden="true" />
          Ask Pahad Pulse
        </button>
      ) : null}

      {open ? (
        <section
          id="assistant-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-title"
          aria-describedby="assistant-description"
          className="surface-card fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden shadow-card sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:max-h-[calc(100dvh-2.5rem)] sm:w-[400px] sm:rounded-2xl"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 id="assistant-title" className="font-semibold text-text-light">
                Ask Pahad Pulse
              </h2>
              <p id="assistant-description" className="text-xs text-muted-foreground">
                Answers from official data, with the source on every figure.{' '}
                <Link
                  href="/sources"
                  className="rounded-sm text-accent underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  How answers work
                </Link>
              </p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>

          <div
            ref={listRef}
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto bg-bg-light px-4 py-4"
          >
            {catalogueFailed ? (
              <div className="rounded-2xl bg-surface p-3 text-sm text-text-light">
                Questions couldn&apos;t be loaded.{' '}
                <button
                  type="button"
                  onClick={loadCatalogue}
                  className="min-h-11 rounded-sm px-1 font-semibold text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Try again
                </button>
              </div>
            ) : catalogue === null ? (
              <p className="text-sm text-muted-foreground">Loading questions…</p>
            ) : null}

            {catalogue !== null &&
              messages.map((message) => (
                <MessageView
                  key={message.id}
                  message={message}
                  catalogue={catalogue}
                  onAsk={(asked) => void ask(asked)}
                  onAskId={askById}
                  onTopic={(categoryId) => push({ role: 'bot', kind: 'topic', categoryId })}
                />
              ))}
            {busy ? <p className="text-sm text-muted-foreground">Looking that up…</p> : null}
          </div>

          <form
            onSubmit={submit}
            className="flex items-center gap-2 border-t border-border bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Type a question
            </label>
            <input
              id="assistant-input"
              ref={inputRef}
              value={draft}
              maxLength={200}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a question, e.g. weather in Almora"
              className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-bg-light px-4 text-sm focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            <button
              type="submit"
              disabled={busy || draft.trim() === ''}
              aria-label="Send"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}

function MessageView({
  message,
  catalogue,
  onAsk,
  onAskId,
  onTopic,
}: {
  message: Message;
  catalogue: Catalogue;
  onAsk: (asked: Asked) => void;
  onAskId: (questionId: string, district?: string | null, place?: string | null) => void;
  onTopic: (categoryId: string) => void;
}) {
  const questions = catalogue.categories.flatMap((c) => c.questions);
  const bubble =
    'max-w-[90%] rounded-2xl bg-surface p-3 text-sm leading-relaxed text-text-light shadow-sm';

  if (message.role === 'user') {
    return (
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl bg-accent px-3 py-2 text-sm text-white">
        {message.text}
      </p>
    );
  }

  switch (message.kind) {
    case 'intro':
      return (
        <div className={bubble}>
          <p>
            Ask about warnings, weather, roads, pilgrim places, districts, tools or where our data
            comes from.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {catalogue.starters.map((id) => {
              const q = questions.find((x) => x.id === id);
              if (!q) return null;
              return (
                <button
                  key={id}
                  type="button"
                  className={chip}
                  onClick={() => onAsk({ questionId: id, text: q.text, needs: q.needs })}
                >
                  {q.text.replace('{district}', 'a district').replace('{place}', 'a place')}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Browse topics
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {catalogue.categories.map((c) => (
              <button key={c.id} type="button" className={chip} onClick={() => onTopic(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      );
    case 'topic': {
      const category = catalogue.categories.find((c) => c.id === message.categoryId);
      if (!category) return null;
      return (
        <div className={bubble}>
          <p className="font-semibold">{category.label}</p>
          <div className="mt-2 flex flex-col gap-2">
            {category.questions.map((q) => (
              <button
                key={q.id}
                type="button"
                className={chip}
                onClick={() => onAsk({ questionId: q.id, text: q.text, needs: q.needs })}
              >
                {q.text.replace('{district}', 'a district').replace('{place}', 'a place')}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case 'pick': {
      const { asked } = message;
      const byDistrict = asked.needs === 'district';
      const groups = byDistrict
        ? [{ title: null, items: catalogue.districts }]
        : [
            { title: 'Char Dham', items: catalogue.places.filter((p) => p.kind === 'char_dham') },
            {
              title: 'Pilgrim places',
              items: catalogue.places.filter((p) => p.kind === 'pilgrimage'),
            },
            {
              title: 'Destinations',
              items: catalogue.places.filter((p) => p.kind === 'destination'),
            },
          ];
      return (
        <div className={bubble}>
          <p>{byDistrict ? 'Which district?' : 'Which place?'}</p>
          {groups.map((group) => (
            <div key={group.title ?? 'all'} className="mt-2">
              {group.title ? (
                <p className="text-xs font-semibold text-muted-foreground">{group.title}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    className={chip}
                    onClick={() =>
                      onAsk(
                        byDistrict
                          ? { ...asked, district: item.slug }
                          : { ...asked, place: item.slug }
                      )
                    }
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'suggest':
      return (
        <div className={bubble}>
          <p>Did you mean:</p>
          <div className="mt-2 flex flex-col gap-2">
            {message.suggestions.map((s) => (
              <button
                key={s.questionId}
                type="button"
                className={chip}
                onClick={() => onAskId(s.questionId, s.district, s.place)}
              >
                {s.text.replace('{district}', 'a district').replace('{place}', 'a place')}
              </button>
            ))}
          </div>
        </div>
      );
    case 'text':
      return (
        <div className={bubble}>
          <p>{message.text}</p>
          {message.retry ? (
            <button
              type="button"
              className={clsx(chip, 'mt-2')}
              onClick={() => message.retry && onAsk(message.retry)}
            >
              <RotateCcw className="mr-1 inline size-3.5" aria-hidden="true" />
              Retry
            </button>
          ) : null}
        </div>
      );
    case 'answer': {
      const { answer } = message;
      return (
        <div className={bubble}>
          <p>{answer.text}</p>
          {answer.facts.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {answer.facts.map((fact, index) => (
                <li
                  key={`${fact.label}-${index}`}
                  className="rounded-xl border border-border bg-bg-light p-2.5"
                >
                  <p className="text-xs text-muted-foreground">{fact.label}</p>
                  <p className="font-semibold tabular-nums">{fact.value}</p>
                  {fact.source ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fact.source.url ? (
                        <a
                          href={fact.source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-2 hover:text-accent"
                        >
                          {fact.source.department}
                        </a>
                      ) : (
                        fact.source.department
                      )}
                      {fact.vintage ? ` · ${fact.vintage.slice(0, 10)}` : ''}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {answer.links.map((link) => (
            <Link
              key={link.route}
              href={webRoute(link.route)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent"
            >
              {link.label} <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ))}
          {answer.followUps.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {answer.followUps.map((f) => (
                <button
                  key={`${f.questionId}-${f.district ?? ''}-${f.place ?? ''}`}
                  type="button"
                  className={chip}
                  onClick={() => onAskId(f.questionId, f.district, f.place)}
                >
                  {f.text}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
    }
  }
}
