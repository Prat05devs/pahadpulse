import { useState } from 'react';

import {
  Badge,
  Card,
  Divider,
  HStack,
  Icon,
  Pressable,
  Text,
  VStack,
  type BadgeTone,
} from '@/components/atoms';
import { ActionButton } from '@/components/molecules';
import { useT } from '@/i18n';
import { callNumber, openExternal } from '@/lib/external-link';
import { formatDate, formatTime } from '@/lib/format';

import {
  PWD_DASHBOARD_URL,
  PWD_HELPLINE,
  STATUS_LABEL,
  durationSince,
  roadTypeLabel,
  unavailableMessage,
} from '../closures';
import type { RoadClosure, RoadClosuresReport } from '../schemas';

type RoadClosuresPanelProps = {
  /** `null` when the request itself failed - shown like any other "cannot say". */
  report: RoadClosuresReport | null;
  /** Show at most this many closures; the rest are summarised behind `onSeeAll`. */
  limit?: number;
  onSeeAll?: () => void;
  /** Hide the district line when the whole panel is already one district. */
  showDistrict?: boolean;
  /** Used in "No closures reported for …". */
  scopeLabel: string;
};

const STATUS_TONE: Record<RoadClosure['status'], BadgeTone> = {
  closed: 'danger',
  partially_closed: 'warning',
  partially_opened: 'primary',
  open: 'success',
  unknown: 'neutral',
};

/** "26 Sep, 9:15 am" in IST. */
const formatIst = (iso: string) =>
  `${formatDate(iso).replace(/ \d{4}$/, '')}, ${formatTime(iso)}`;

function ClosureRow({
  closure,
  now,
  showDistrict,
}: {
  closure: RoadClosure;
  now: Date;
  showDistrict: boolean;
}) {
  const t = useT();
  return (
    <VStack gap="xs">
      <HStack gap="xs" wrap>
        <Badge
          label={roadTypeLabel(closure.roadType, t)}
          tone={closure.roadType === 'NH' || closure.roadType === 'SH' ? 'primary' : 'neutral'}
        />
        <Badge label={t(STATUS_LABEL[closure.status])} tone={STATUS_TONE[closure.status]} />
      </HStack>
      <Text variant="bodyStrong" numberOfLines={2}>
        {closure.roadName}
      </Text>
      {(showDistrict && closure.district !== null) || closure.kmMarkers !== null ? (
        <Text variant="caption" color="textMuted">
          {[
            showDistrict && closure.district !== null ? closure.district.name : null,
            closure.kmMarkers !== null
              ? t('closures.blockedAt', { km: closure.kmMarkers })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
      <HStack gap="xs" align="center">
        <Icon name="time-outline" size={14} tone="textMuted" />
        <Text variant="caption">
          {t('closures.closedFor', {
            when: formatIst(closure.closedAt),
            duration: durationSince(closure.closedAt, now),
          })}
        </Text>
      </HStack>
      {closure.expectedOpenAt !== null ? (
        <Card tone={closure.estimatePassed ? 'warning' : 'muted'} elevation="none" padding="sm">
          <Text variant="caption">
            {closure.estimatePassed
              ? t('closures.estimatePassed', { when: formatIst(closure.expectedOpenAt) })
              : t('closures.estimate', { when: formatIst(closure.expectedOpenAt) })}
          </Text>
        </Card>
      ) : null}
      {closure.division !== null ? (
        <Text variant="footnote" color="textMuted">
          {t('closures.reportedBy', { division: closure.division })}
        </Text>
      ) : null}
    </VStack>
  );
}

/**
 * PWD road closures, or an honest statement of why they cannot be shown.
 *
 * The rules it keeps, same as the web panel: an unavailable or failed report is never rendered
 * as "no closures"; a closure always shows when PWD said it closed; a division's reopening
 * estimate is theirs, flagged once it has passed; and roads that reopened in the last day are
 * listed, so someone who saw a closure earlier sees it clear.
 */
export function RoadClosuresPanel({
  report,
  limit,
  onSeeAll,
  showDistrict = true,
  scopeLabel,
}: RoadClosuresPanelProps) {
  const t = useT();
  const [showReopened, setShowReopened] = useState(false);
  const now = new Date();
  const dashboardUrl = report?.source.url ?? PWD_DASHBOARD_URL;

  const helpActions = (
    <HStack gap="sm" wrap>
      <ActionButton
        label={t('closures.pwdDashboard')}
        icon="open-outline"
        tone="primary"
        onPress={() => void openExternal(dashboardUrl)}
      />
      <ActionButton
        label={t('closures.call', { number: PWD_HELPLINE })}
        icon="call-outline"
        onPress={() => void callNumber(PWD_HELPLINE)}
      />
    </HStack>
  );

  if (report === null || !report.available) {
    const message = unavailableMessage(report);
    return (
      <Card tone="warning" elevation="none">
        <VStack gap="sm">
          <HStack gap="sm" align="center">
            <Icon name="construct-outline" tone="warning" />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {t(message.title)}
            </Text>
          </HStack>
          <Text variant="caption">{t(message.body)}</Text>
          {helpActions}
        </VStack>
      </Card>
    );
  }

  const shown = limit === undefined ? report.closures : report.closures.slice(0, limit);
  const hidden = report.closures.length - shown.length;

  return (
    <VStack gap="sm">
      {report.closures.length === 0 ? (
        <Card tone="muted" elevation="none">
          <HStack gap="sm" align="flex-start">
            <Icon name="checkmark-circle-outline" tone="textMuted" />
            <VStack gap="xxs" grow>
              <Text variant="bodyStrong">{t('closures.none', { scope: scopeLabel })}</Text>
              <Text variant="caption" color="textMuted">
                {t('closures.none.body', { number: PWD_HELPLINE })}
              </Text>
            </VStack>
          </HStack>
        </Card>
      ) : (
        <Card padding="md">
          {shown.map((closure, index) => (
            <VStack key={closure.id} gap="md">
              {index > 0 ? <Divider /> : null}
              <ClosureRow closure={closure} now={now} showDistrict={showDistrict} />
            </VStack>
          ))}
        </Card>
      )}

      {hidden > 0 && onSeeAll ? (
        <Pressable onPress={onSeeAll} style={{ minHeight: 0, alignSelf: 'flex-start' }}>
          <Text variant="bodyStrong" color="primary">
            {t('closures.seeAll', { count: report.closures.length })}
          </Text>
        </Pressable>
      ) : null}

      {report.recentlyReopened.length > 0 ? (
        <Card tone="muted" elevation="none" padding="md">
          <Pressable
            onPress={() => setShowReopened((open) => !open)}
            accessibilityState={{ expanded: showReopened }}
            style={{ minHeight: 0 }}
          >
            <HStack gap="sm" align="center">
              <Icon name="refresh-outline" tone="primary" />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {t('closures.reopened', { count: report.recentlyReopened.length })}
              </Text>
              <Icon name={showReopened ? 'chevron-up' : 'chevron-down'} tone="textMuted" />
            </HStack>
          </Pressable>
          {showReopened ? (
            <VStack gap="sm" style={{ marginTop: 12 }}>
              {report.recentlyReopened.map((closure) => (
                <VStack key={closure.id} gap="xxs">
                  <Text variant="body" numberOfLines={1}>
                    {closure.roadName}
                  </Text>
                  <Text variant="footnote" color="textMuted">
                    {[
                      showDistrict && closure.district !== null ? closure.district.name : null,
                      roadTypeLabel(closure.roadType, t),
                      t('closures.reopenedSeen', { when: formatIst(closure.statusSeenAt) }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </VStack>
              ))}
            </VStack>
          ) : null}
        </Card>
      ) : null}

      <Text variant="footnote" color="textMuted">
        {report.checkedAt !== null
          ? t('closures.footer.checked', {
              department: report.source.department,
              when: formatIst(report.checkedAt),
            })
          : t('closures.footer', { department: report.source.department })}
      </Text>
    </VStack>
  );
}
