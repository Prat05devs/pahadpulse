import type { ReactNode } from 'react';

import {
  HStack,
  Icon,
  Pressable,
  Spinner,
  Text,
  VStack,
  type IconName,
} from '@/components/atoms';
import { useT, type Translate } from '@/i18n';
import { ApiError } from '@/lib/api';
import { useTheme } from '@/theme';

/**
 * The four render states every data-backed block must handle: loading, error, empty, ready.
 *
 * Centralised because the wording matters. This app is read in places with poor signal, and
 * "Something went wrong" tells a reader nothing about whether to move to a window or give up.
 */

function StateShell({
  icon,
  title,
  message,
  action,
  tone = 'textMuted',
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
  tone?: 'textMuted' | 'danger';
}) {
  const theme = useTheme();
  return (
    <VStack
      align="center"
      justify="center"
      gap="sm"
      padding="xl"
      style={{ minHeight: 160 }}
      accessible
      accessibilityLabel={[title, message].filter(Boolean).join('. ')}
    >
      <Icon name={icon} size={30} tone={tone} />
      <Text variant="bodyStrong" align="center">
        {title}
      </Text>
      {message ? (
        <Text
          variant="caption"
          color="textMuted"
          align="center"
          style={{ maxWidth: 320, marginTop: -theme.spacing.xxs }}
        >
          {message}
        </Text>
      ) : null}
      {action}
    </VStack>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const theme = useTheme();
  const t = useT();
  const shown = label ?? t('common.loading');
  return (
    <VStack
      align="center"
      justify="center"
      gap="sm"
      padding="xl"
      style={{ minHeight: 160 }}
      accessibilityRole="progressbar"
      accessibilityLabel={shown}
    >
      <Spinner />
      <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xxs }}>
        {shown}
      </Text>
    </VStack>
  );
}

export function EmptyState({
  title,
  message,
  icon = 'file-tray-outline',
}: {
  title: string;
  message?: string;
  icon?: IconName;
}) {
  return <StateShell icon={icon} title={title} message={message} />;
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const t = useT();
  return (
    <Pressable
      onPress={onRetry}
      haptic
      accessibilityLabel={t('common.tryAgain')}
      style={{
        minHeight: 40,
        justifyContent: 'center',
        marginTop: theme.spacing.xs,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.primary,
      }}
    >
      <HStack align="center" gap="xs">
        <Icon name="refresh" size={15} tone="textInverse" />
        <Text variant="bodyStrong" color="textInverse">
          {t('common.tryAgain')}
        </Text>
      </HStack>
    </Pressable>
  );
}

/**
 * Turn a failure into words a reader can act on.
 *
 * The distinction that matters most on a phone is offline versus server-side: one is fixed
 * by walking uphill, the other by waiting. An app that says the same thing for both trains
 * people to ignore the message.
 */
function describe(
  error: unknown,
  t: Translate
): { icon: IconName; title: string; message: string } {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case 'offline':
        return {
          icon: 'cloud-offline-outline',
          title: t('error.offline.title'),
          message: t('error.offline.message'),
        };
      case 'timeout':
        return {
          icon: 'time-outline',
          title: t('error.timeout.title'),
          message: t('error.timeout.message'),
        };
      case 'not-found':
        return {
          icon: 'help-circle-outline',
          title: t('error.notFound.title'),
          message: t('error.notFound.message'),
        };
      case 'invalid-response':
        return {
          icon: 'bug-outline',
          title: t('error.invalidResponse.title'),
          message: t('error.invalidResponse.message', { detail: error.message }),
        };
      default:
        return {
          icon: 'alert-circle-outline',
          title: t('error.generic.title'),
          message: error.message,
        };
    }
  }
  return {
    icon: 'alert-circle-outline',
    title: t('error.generic.title'),
    message: error instanceof Error ? error.message : t('error.generic.message'),
  };
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useT();
  const { icon, title, message } = describe(error, t);
  const retryable = !(error instanceof ApiError) || error.isRetryable;

  return (
    <StateShell
      icon={icon}
      title={title}
      message={message}
      tone="danger"
      action={onRetry && retryable ? <RetryButton onRetry={onRetry} /> : undefined}
    />
  );
}
