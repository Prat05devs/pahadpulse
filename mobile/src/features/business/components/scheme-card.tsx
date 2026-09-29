import { memo, useState } from 'react';

import {
  Badge,
  Card,
  HStack,
  Icon,
  Pressable,
  Text,
  VStack,
  type BadgeTone,
} from '@/components/atoms';
import { ActionButton } from '@/components/molecules';
import { useT, type TranslationKey } from '@/i18n';
import { openExternal } from '@/lib/external-link';
import { humanise } from '@/lib/format';

import type { BusinessScheme } from '../schemas';
import { schemeAvailability, type SchemeAvailability } from '../schemes';

const AVAILABILITY: Record<SchemeAvailability, { tone: BadgeTone; label: TranslationKey }> = {
  open: { tone: 'success', label: 'schemes.open' },
  closed: { tone: 'danger', label: 'schemes.closed' },
  periodic: { tone: 'neutral', label: 'schemes.periodic' },
};

function BulletList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <VStack gap="xs">
      <Text variant="footnote" color="textMuted" weight="semibold">
        {title.toUpperCase()}
      </Text>
      {items.map((item) => (
        <HStack key={item} gap="sm" align="flex-start">
          <Text variant="caption" color="primary">
            •
          </Text>
          <Text variant="caption" style={{ flex: 1 }}>
            {item}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}

/**
 * One scheme: what it gives, who runs it and whether it is open - collapsed to a summary,
 * expanded to eligibility, benefits and how to apply, ending at the official page.
 */
export const SchemeCard = memo(function SchemeCard({ scheme }: { scheme: BusinessScheme }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const availability = AVAILABILITY[schemeAvailability(scheme.status)];

  return (
    <Card padding="md">
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityState={{ expanded: open }}
        accessibilityLabel={scheme.name}
        style={{ minHeight: 0 }}
      >
        <VStack gap="xs">
          <HStack gap="xs" wrap>
            <Badge label={t(availability.label)} tone={availability.tone} />
            <Badge label={humanise(scheme.status)} tone="neutral" variant="dot" />
          </HStack>
          <HStack gap="sm" align="flex-start">
            <VStack gap="xxs" grow>
              <Text variant="heading">{scheme.name}</Text>
              <Text variant="footnote" color="textMuted">
                {scheme.acronym} · {scheme.owner}
              </Text>
            </VStack>
            <Icon name={open ? 'chevron-up' : 'chevron-down'} tone="textMuted" />
          </HStack>
          <Text variant="caption">{scheme.summary}</Text>
          <Text variant="footnote" color="primary">
            {scheme.support.slice(0, 4).map(humanise).join(' · ')}
          </Text>
        </VStack>
      </Pressable>
      {open ? (
        <VStack gap="md" style={{ marginTop: 12 }}>
          <BulletList title={t('schemes.eligibility')} items={scheme.eligibility} />
          <BulletList title={t('schemes.benefits')} items={scheme.benefits} />
          <BulletList title={t('schemes.apply')} items={scheme.apply} />
          <Text variant="footnote" color="textMuted">
            {t('schemes.access', { access: scheme.access })}
            {scheme.availability ? ` ${scheme.availability}` : ''}
          </Text>
          <ActionButton
            label={t('schemes.officialPage')}
            icon="open-outline"
            tone="primary"
            onPress={() => void openExternal(scheme.url)}
          />
        </VStack>
      ) : null}
    </Card>
  );
});
