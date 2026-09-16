import Link from 'next/link';
import { AlertTriangle, BookOpen, LifeBuoy, Mail, RefreshCw, ShieldCheck } from 'lucide-react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Support',
  description:
    'Get help with Pahad Pulse, report a data correction, or send accessibility feedback.',
  path: '/support',
  keywords: ['Pahad Pulse support', 'Pahad Pulse help', 'report Uttarakhand data correction'],
});

const SUPPORT_EMAIL = 'admin@wtsolutions.cc';

const faqs = [
  {
    question: 'Do I need an account?',
    answer:
      'No. Pahad Pulse is a read-only public information service and currently has no sign-in or account system.',
  },
  {
    question: 'Why does a figure look old?',
    answer:
      'Each figure identifies its publisher and the date it describes. Government datasets update on different schedules, so a published census or annual statistic can be valid without being recent.',
  },
  {
    question: 'Why are there no active alerts?',
    answer:
      'Expired and cancelled warnings are excluded automatically. If the issuing authority has no current warning in the connected feed, the app correctly shows no active alerts.',
  },
  {
    question: 'What should I try when data will not load?',
    answer:
      'Confirm the device has a working connection, pull down to refresh, and try again. Previously loaded public data may remain available from the mobile cache during limited connectivity.',
  },
  {
    question: 'How do I clear followed districts and preferences?',
    answer:
      'In the mobile app, open More → Settings → Reset preferences. This clears language, appearance and followed districts stored on that device.',
  },
];

export default function SupportPage() {
  return (
    <DashboardLayout>
      <div className="min-h-full">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
            <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-info-soft text-info">
              <LifeBuoy className="size-6" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Pahad Pulse help</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-text-light sm:text-4xl">
              Support
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Get help with the app or website, report a source-backed correction, or tell us
              about an accessibility problem.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <section className="grid gap-4 md:grid-cols-2" aria-labelledby="contact-support">
            <div className="surface-card p-5 sm:p-6">
              <Mail className="size-6 text-accent" strokeWidth={1.8} aria-hidden="true" />
              <h2 id="contact-support" className="mt-4 font-display text-xl font-semibold text-text-light">
                Email support
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Include the screen, district or source involved, what you expected, and what
                happened. For a mobile issue, include the app version and iPhone or iPad model.
                Please do not send passwords or identity documents.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Pahad%20Pulse%20support`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
              >
                Email {SUPPORT_EMAIL}
              </a>
            </div>

            <div className="rounded-lg border border-warning/30 bg-warning-soft p-5 sm:p-6">
              <AlertTriangle className="size-6 text-warning" strokeWidth={1.8} aria-hidden="true" />
              <h2 className="mt-4 font-display text-xl font-semibold text-text-light">
                Not an emergency service
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Pahad Pulse republishes attributed public information; it does not issue official
                warnings or provide emergency response. For immediate danger, follow local
                authorities and the issuing agency linked on the alert.
              </p>
            </div>
          </section>

          <section aria-labelledby="common-questions">
            <div className="mb-4 flex items-center gap-3">
              <BookOpen className="size-5 text-accent" aria-hidden="true" />
              <h2 id="common-questions" className="font-display text-2xl font-semibold text-text-light">
                Common questions
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {faqs.map((faq) => (
                <article key={faq.question} className="surface-card p-5">
                  <h3 className="font-semibold text-text-light">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="surface-card p-5 sm:p-6" aria-labelledby="corrections">
            <div className="flex gap-4">
              <RefreshCw className="mt-0.5 size-6 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <h2 id="corrections" className="font-display text-xl font-semibold text-text-light">
                  Data corrections
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Send the figure, page URL, named publisher and a link to the corrected primary
                  source. We review attribution and transcription issues, but the publishing
                  department remains responsible for the underlying official dataset.
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
                Read how information is handled.
              </p>
              <p className="mt-2 text-xs">
                Built by Team Pahad Pulse · Dehradun, Uttarakhand, India · © 2026
              </p>
            </div>
            <Link href="/privacy" className="font-medium text-accent underline underline-offset-4">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
