import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Card,
  Eyebrow,
  HStack,
  Icon,
  Pressable,
  Spinner,
  Text,
  VStack,
} from '@/components/atoms';
import { useT } from '@/i18n';
import { openExternal } from '@/lib/external-link';
import { useLanguage } from '@/stores';
import { familyFor, HIT_SLOP_MIN_SIZE, platformTextFixes, useTheme } from '@/theme';

import { useAssistantCatalogue } from '../hooks';
import { fillQuestion, findQuestion } from '../model';
import type { Answer, Catalogue, Match, Needs } from '../schemas';
import { fetchAnswer, fetchMatch, mobileRoute, safeSourceUrl } from '../services';

type Asked = {
  questionId: string;
  text: string;
  needs: Needs;
  district?: string;
  place?: string;
};

type Message =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'bot'; kind: 'intro' }
  | { id: number; role: 'bot'; kind: 'topic'; categoryId: string }
  | { id: number; role: 'bot'; kind: 'pick'; asked: Asked }
  | { id: number; role: 'bot'; kind: 'suggest'; suggestions: Match['suggestions'] }
  | { id: number; role: 'bot'; kind: 'answer'; answer: Answer }
  | { id: number; role: 'bot'; kind: 'text'; text: string; retry?: Asked };

type NewMessage = Message extends infer M ? (M extends Message ? Omit<M, 'id'> : never) : never;

function Chip({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      style={{
        alignSelf: 'flex-start',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceInteractive,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text variant="caption" weight="semibold">
        {label}
      </Text>
    </Pressable>
  );
}

export function AssistantScreen() {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const catalogueQuery = useAssistantCatalogue();
  const catalogue = catalogueQuery.data;
  const router = useRouter();
  const listRef = useRef<FlatList<Message>>(null);
  const nextId = useRef(1);
  const conversation = useRef(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const push = useCallback((message: NewMessage) => {
    setMessages((current) => [...current, { ...message, id: nextId.current++ } as Message]);
  }, []);

  useEffect(() => {
    conversation.current += 1;
    setMessages(catalogue ? [{ id: nextId.current++, role: 'bot', kind: 'intro' }] : []);
    setDraft('');
    setBusy(false);
  }, [catalogue, language]);

  useEffect(
    () => () => {
      conversation.current += 1;
    },
    []
  );

  const requestAnswer = useCallback(
    async (asked: Asked, echoUser = true) => {
      if (!catalogue || busy) return;
      if (asked.needs === 'district' && asked.district === undefined) {
        push({ role: 'bot', kind: 'pick', asked });
        return;
      }
      if (asked.needs === 'place' && asked.place === undefined) {
        push({ role: 'bot', kind: 'pick', asked });
        return;
      }
      if (echoUser) {
        push({
          role: 'user',
          text: fillQuestion(asked.text, catalogue, asked.district, asked.place),
        });
      }
      const activeConversation = conversation.current;
      setBusy(true);
      try {
        const answer = await fetchAnswer({
          questionId: asked.questionId,
          ...(asked.district !== undefined && { district: asked.district }),
          ...(asked.place !== undefined && { place: asked.place }),
          lang: language,
        });
        if (conversation.current === activeConversation) {
          push({ role: 'bot', kind: 'answer', answer });
        }
      } catch {
        if (conversation.current === activeConversation) {
          push({ role: 'bot', kind: 'text', text: t('assistant.error.answer'), retry: asked });
        }
      } finally {
        if (conversation.current === activeConversation) setBusy(false);
      }
    },
    [busy, catalogue, language, push, t]
  );

  const askById = useCallback(
    (questionId: string, district?: string | null, place?: string | null) => {
      if (!catalogue) return;
      const question = findQuestion(catalogue, questionId);
      if (!question) return;
      void requestAnswer({
        questionId,
        text: question.text,
        needs: question.needs,
        ...(district ? { district } : {}),
        ...(place ? { place } : {}),
      });
    },
    [catalogue, requestAnswer]
  );

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!catalogue || text === '' || busy) return;
    setDraft('');
    push({ role: 'user', text });
    const activeConversation = conversation.current;
    setBusy(true);
    try {
      const match = await fetchMatch(text, language);
      if (conversation.current !== activeConversation) return;
      setBusy(false);
      if (match.outcome === 'matched' && match.questionId !== null) {
        const question = findQuestion(catalogue, match.questionId);
        if (!question) {
          push({ role: 'bot', kind: 'text', text: t('assistant.unavailable') });
          push({ role: 'bot', kind: 'intro' });
          return;
        }
        const asked: Asked = {
          questionId: question.id,
          text: question.text,
          needs: question.needs,
          ...(match.district ? { district: match.district } : {}),
          ...(match.place ? { place: match.place } : {}),
        };
        if (
          (asked.needs === 'district' && asked.district === undefined) ||
          (asked.needs === 'place' && asked.place === undefined)
        ) {
          push({ role: 'bot', kind: 'pick', asked });
        } else {
          await requestAnswer(asked, false);
        }
      } else if (match.outcome === 'suggest') {
        push({ role: 'bot', kind: 'suggest', suggestions: match.suggestions });
      } else {
        push({ role: 'bot', kind: 'text', text: t('assistant.none') });
        push({ role: 'bot', kind: 'intro' });
      }
    } catch {
      if (conversation.current === activeConversation) {
        setBusy(false);
        push({ role: 'bot', kind: 'text', text: t('assistant.error.send') });
      }
    }
  }, [busy, catalogue, draft, language, push, requestAnswer, t]);

  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<Message>) => {
      if (!catalogue) return null;
      return (
        <MessageView
          message={item}
          catalogue={catalogue}
          disabled={busy}
          onAsk={(asked) => void requestAnswer(asked)}
          onAskId={askById}
          onTopic={(categoryId) => push({ role: 'bot', kind: 'topic', categoryId })}
          onOpenRoute={(route) => {
            const href = mobileRoute(route);
            if (href) router.push(href);
          }}
        />
      );
    },
    [askById, busy, catalogue, push, requestAnswer, router]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : undefined}
    >
      {catalogueQuery.isPending ? (
        <VStack grow align="center" justify="center" gap="sm" padding="lg">
          <Spinner />
          <Text color="textMuted">{t('assistant.loading.questions')}</Text>
        </VStack>
      ) : catalogueQuery.isError || !catalogue ? (
        <VStack grow align="center" justify="center" gap="md" padding="lg">
          <Icon name="cloud-offline-outline" size={32} tone="textMuted" />
          <Text align="center">{t('assistant.error.catalogue')}</Text>
          <Chip label={t('common.tryAgain')} onPress={() => void catalogueQuery.refetch()} />
        </VStack>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={{
            width: '100%',
            maxWidth: 720,
            alignSelf: 'center',
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
            flexGrow: 1,
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            busy ? (
              <HStack align="center" gap="sm" style={{ paddingVertical: theme.spacing.sm }}>
                <Spinner />
                <Text variant="caption" color="textMuted">
                  {t('assistant.loading.answer')}
                </Text>
              </HStack>
            ) : null
          }
        />
      )}

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingTop: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
        }}
      >
        <HStack
          align="flex-end"
          gap="sm"
          style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            editable={catalogue !== undefined && !busy}
            maxLength={200}
            multiline
            placeholder={t('assistant.input.placeholder')}
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel={t('assistant.input.label')}
            maxFontSizeMultiplier={theme.typography.body.maxFontScale}
            cursorColor={theme.colors.primary}
            selectionColor={theme.colors.primary}
            style={{
              flex: 1,
              minHeight: HIT_SLOP_MIN_SIZE,
              maxHeight: 112,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              textAlignVertical: 'top',
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              fontFamily: familyFor(draft, 'regular'),
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              ...platformTextFixes(draft),
            }}
          />
          <Pressable
            onPress={() => void submit()}
            disabled={busy || catalogue === undefined || draft.trim() === ''}
            haptic
            accessibilityLabel={t('assistant.send')}
            accessibilityState={{
              disabled: busy || catalogue === undefined || draft.trim() === '',
            }}
            style={{
              width: HIT_SLOP_MIN_SIZE,
              height: HIT_SLOP_MIN_SIZE,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primary,
              opacity: busy || catalogue === undefined || draft.trim() === '' ? 0.45 : 1,
            }}
          >
            <Icon name="send" size={19} tone="textInverse" />
          </Pressable>
        </HStack>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageView({
  message,
  catalogue,
  disabled,
  onAsk,
  onAskId,
  onTopic,
  onOpenRoute,
}: {
  message: Message;
  catalogue: Catalogue;
  disabled: boolean;
  onAsk: (asked: Asked) => void;
  onAskId: (questionId: string, district?: string | null, place?: string | null) => void;
  onTopic: (categoryId: string) => void;
  onOpenRoute: (route: string) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const questions = catalogue.categories.flatMap((category) => category.questions);

  if (message.role === 'user') {
    return (
      <View
        style={{
          maxWidth: '86%',
          alignSelf: 'flex-end',
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.primary,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <Text color="textInverse">{message.text}</Text>
      </View>
    );
  }

  const body = (() => {
    switch (message.kind) {
      case 'intro':
        return (
          <VStack gap="md">
            <VStack gap="xs">
              <Text variant="bodyStrong">{t('assistant.intro.title')}</Text>
              <Text variant="caption" color="textSecondary">
                {t('assistant.intro.body')}
              </Text>
              <Pressable
                onPress={() => onOpenRoute('/sources')}
                accessibilityLabel={t('assistant.howAnswersWork')}
                style={{ alignSelf: 'flex-start', minHeight: 0 }}
              >
                <Text variant="footnote" color="primary" weight="semibold">
                  {t('assistant.howAnswersWork')}
                </Text>
              </Pressable>
            </VStack>
            <HStack gap="sm" wrap>
              {catalogue.starters.map((id) => {
                const question = questions.find((item) => item.id === id);
                if (!question) return null;
                return (
                  <Chip
                    key={id}
                    label={fillQuestion(question.text, catalogue)}
                    disabled={disabled}
                    onPress={() =>
                      onAsk({ questionId: id, text: question.text, needs: question.needs })
                    }
                  />
                );
              })}
            </HStack>
            <Eyebrow color="textMuted">{t('assistant.browseTopics')}</Eyebrow>
            <HStack gap="sm" wrap>
              {catalogue.categories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.label}
                  disabled={disabled}
                  onPress={() => onTopic(category.id)}
                />
              ))}
            </HStack>
          </VStack>
        );
      case 'topic': {
        const category = catalogue.categories.find((item) => item.id === message.categoryId);
        if (!category) return null;
        return (
          <VStack gap="sm">
            <Text variant="bodyStrong">{category.label}</Text>
            {category.questions.map((question) => (
              <Chip
                key={question.id}
                label={fillQuestion(question.text, catalogue)}
                disabled={disabled}
                onPress={() =>
                  onAsk({
                    questionId: question.id,
                    text: question.text,
                    needs: question.needs,
                  })
                }
              />
            ))}
          </VStack>
        );
      }
      case 'pick': {
        const byDistrict = message.asked.needs === 'district';
        const groups = byDistrict
          ? [{ title: null, items: catalogue.districts }]
          : [
              {
                title: t('assistant.group.charDham'),
                items: catalogue.places.filter((item) => item.kind === 'char_dham'),
              },
              {
                title: t('assistant.group.pilgrimage'),
                items: catalogue.places.filter((item) => item.kind === 'pilgrimage'),
              },
              {
                title: t('assistant.group.destinations'),
                items: catalogue.places.filter((item) => item.kind === 'destination'),
              },
            ];
        return (
          <VStack gap="sm">
            <Text variant="bodyStrong">
              {t(byDistrict ? 'assistant.whichDistrict' : 'assistant.whichPlace')}
            </Text>
            {groups.map((group) => (
              <VStack key={group.title ?? 'districts'} gap="xs">
                {group.title ? (
                  <Text variant="footnote" color="textMuted" weight="semibold">
                    {group.title}
                  </Text>
                ) : null}
                <HStack gap="sm" wrap>
                  {group.items.map((item) => (
                    <Chip
                      key={item.slug}
                      label={item.name}
                      disabled={disabled}
                      onPress={() =>
                        onAsk(
                          byDistrict
                            ? { ...message.asked, district: item.slug }
                            : { ...message.asked, place: item.slug }
                        )
                      }
                    />
                  ))}
                </HStack>
              </VStack>
            ))}
          </VStack>
        );
      }
      case 'suggest':
        return (
          <VStack gap="sm">
            <Text variant="bodyStrong">{t('assistant.didYouMean')}</Text>
            {message.suggestions.map((suggestion) => (
              <Chip
                key={`${suggestion.questionId}-${suggestion.district ?? ''}-${suggestion.place ?? ''}`}
                label={fillQuestion(suggestion.text, catalogue)}
                disabled={disabled}
                onPress={() =>
                  onAskId(suggestion.questionId, suggestion.district, suggestion.place)
                }
              />
            ))}
          </VStack>
        );
      case 'text':
        return (
          <VStack gap="sm">
            <Text>{message.text}</Text>
            {message.retry ? (
              <Chip
                label={t('assistant.retry')}
                disabled={disabled}
                onPress={() => message.retry && onAsk(message.retry)}
              />
            ) : null}
          </VStack>
        );
      case 'answer':
        return (
          <VStack gap="md">
            <Text>{message.answer.text}</Text>
            {message.answer.facts.map((fact, index) => {
              const sourceUrl = safeSourceUrl(fact.source?.url ?? null);
              return (
                <Card key={`${fact.label}-${index}`} tone="muted" elevation="none" padding="md">
                  <VStack gap="xxs">
                    <Text variant="footnote" color="textMuted">
                      {fact.label}
                    </Text>
                    <Text variant="bodyStrong" tabular>
                      {fact.value}
                    </Text>
                    {fact.source ? (
                      sourceUrl ? (
                        <Pressable
                          onPress={() => void openExternal(sourceUrl)}
                          accessibilityLabel={t('source.openedInBrowser', {
                            department: fact.source?.department ?? '',
                          })}
                          style={{ alignSelf: 'flex-start', minHeight: 0 }}
                        >
                          <Text variant="footnote" color="primary">
                            {fact.source.department}
                            {fact.vintage ? ` · ${fact.vintage.slice(0, 10)}` : ''}
                          </Text>
                        </Pressable>
                      ) : (
                        <Text variant="footnote" color="textMuted">
                          {fact.source.department}
                          {fact.vintage ? ` · ${fact.vintage.slice(0, 10)}` : ''}
                        </Text>
                      )
                    ) : null}
                  </VStack>
                </Card>
              );
            })}
            {message.answer.links.map((link) =>
              mobileRoute(link.route) ? (
                <Pressable
                  key={link.route}
                  onPress={() => onOpenRoute(link.route)}
                  accessibilityLabel={link.label}
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                >
                  <Text variant="caption" color="primary" weight="bold">
                    {link.label}
                  </Text>
                  <Icon name="arrow-forward" size={16} tone="primary" />
                </Pressable>
              ) : null
            )}
            {message.answer.followUps.length ? (
              <HStack gap="sm" wrap>
                {message.answer.followUps.map((followUp) => (
                  <Chip
                    key={`${followUp.questionId}-${followUp.district ?? ''}-${followUp.place ?? ''}`}
                    label={followUp.text}
                    disabled={disabled}
                    onPress={() =>
                      onAskId(followUp.questionId, followUp.district, followUp.place)
                    }
                  />
                ))}
              </HStack>
            ) : null}
          </VStack>
        );
    }
  })();

  if (body === null) return null;
  return (
    <Card
      elevation="none"
      style={{ maxWidth: '94%', alignSelf: 'flex-start' }}
      accessibilityLiveRegion="polite"
    >
      {body}
    </Card>
  );
}
