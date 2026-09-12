import * as WebBrowser from 'expo-web-browser';

import { Badge, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import { formatDate, formatRelative, localise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';
import type { Provenance } from '@/types/api';

const FRESHNESS_LABEL = {
  fresh: 'Up to date',
  stale: 'May be out of date',
  expired: 'Out of date',
  unknown: 'Currency unknown',
} as const;

/**
 * Where a figure came from, rendered next to the figure.
 *
 * This is not decoration. The platform does not author data — it ingests, attributes and
 * displays what departments publish — so a number without its department, its vintage and
 * how fresh it is has lost the thing that makes it trustworthy. Every panel that shows a
 * value shows one of these.
 */
export function SourceNote({
  provenance,
  compact,
}: {
  provenance: Provenance;
  compact?: boolean;
}) {
  const theme = useTheme();
  const language = useLanguage();

  if (!provenance) {
    return (
      <Text variant="footnote" color="textMuted">
        Source not recorded
      </Text>
    );
  }

  const department = localise(provenance.department, language);
  const freshnessColor = theme.colors.freshness[provenance.freshness];

  const openSource = () => {
    if (!provenance.url) return;
    // In-app browser rather than leaving the app: the reader is mid-task, and a source link
    // is a detour, not a destination.
    void WebBrowser.openBrowserAsync(provenance.url);
  };

  const body = (
    <VStack gap="xxs">
      <HStack align="center" gap="xs" wrap>
        <Badge
          label={FRESHNESS_LABEL[provenance.freshness]}
          color={freshnessColor}
          variant="dot"
        />
        <Text variant="footnote" color="textMuted">
          ·
        </Text>
        <Text variant="footnote" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
          {department}
        </Text>
        {provenance.url ? <Icon name="open-outline" size={11} tone="textMuted" /> : null}
      </HStack>

      {compact ? null : (
        <Text variant="footnote" color="textMuted">
          {`Data for ${formatDate(provenance.vintage)} · retrieved ${formatRelative(provenance.fetchedAt)}`}
        </Text>
      )}
    </VStack>
  );

  if (!provenance.url) return body;

  return (
    <Pressable
      onPress={openSource}
      style={{ minHeight: 0 }}
      accessibilityLabel={`Source: ${department}. Opens in a browser.`}
    >
      {body}
    </Pressable>
  );
}
