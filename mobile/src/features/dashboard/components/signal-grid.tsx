import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { HStack } from '@/components/atoms';
import { useAlertSummary } from '@/features/alerts';
import { useBusinessSchemes } from '@/features/business';
import { useStateNetwork } from '@/features/connectivity';
import { formatCrore, useDepartmentBudget } from '@/features/governance';
import { closureCounts, useRoadClosures } from '@/features/roads';
import { usePilgrimArrivals } from '@/features/tourism';
import { useT } from '@/i18n';
import { formatCompact, formatNumber } from '@/lib/format';
import { shouldStackCardGrid } from '@/lib/layout';

import { SignalCard } from './signal-card';

/**
 * The state snapshot: six signals, each a door into the screen that explains it. Mirrors the
 * web homepage's live counters. A figure that has not loaded shows "…", and one that could not
 * be loaded says so - never a zero.
 */
export function SignalGrid() {
  const t = useT();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const cardWidth = shouldStackCardGrid(width, fontScale) ? '100%' : '46%';

  const alerts = useAlertSummary();
  const roads = useRoadClosures();
  const arrivals = usePilgrimArrivals();
  const network = useStateNetwork();
  const budget = useDepartmentBudget();
  const schemes = useBusinessSchemes();

  const pending = '…';
  const failed = t('common.notAvailable');
  const value = <T,>(query: { isPending: boolean; data?: T }, read: (data: T) => string) =>
    query.data !== undefined ? read(query.data) : query.isPending ? pending : failed;

  // The latest year can be an in-progress season; the card shows the last completed one.
  const currentYear = new Date().getUTCFullYear();
  const completed = arrivals.data?.totals
    .filter((entry) => entry.year < currentYear)
    .sort((a, b) => b.year - a.year)[0];
  const mobile = network.data?.spread.find((entry) => entry.kind === 'mobile');
  const severe = (alerts.data?.bySeverity.severe ?? 0) + (alerts.data?.bySeverity.extreme ?? 0);
  const roadCounts = roads.data?.available ? closureCounts(roads.data) : null;

  return (
    <HStack gap="sm" wrap>
      <SignalCard
        tone="red"
        icon="warning"
        tag={t('home.signal.alerts.tag')}
        label={t('home.signal.alerts')}
        value={value(alerts, (data) => formatNumber(data.activeCount))}
        caption={
          severe > 0
            ? t('today.severeOrWorse', { count: severe })
            : t('home.signal.alerts.caption')
        }
        onPress={() => router.push('/alerts')}
        width={cardWidth}
      />
      <SignalCard
        tone="slate"
        icon="car"
        tag={t('home.signal.roads.tag')}
        label={t('home.signal.roads')}
        value={
          roadCounts !== null
            ? formatNumber(roadCounts.closed)
            : roads.isPending
              ? pending
              : t('home.signal.roads.soon')
        }
        caption={
          roadCounts !== null ? t('home.signal.roads.caption') : t('home.signal.roads.helpline')
        }
        onPress={() => router.push('/roads')}
        width={cardWidth}
      />
      <SignalCard
        tone="amber"
        icon="footsteps"
        tag={t('home.signal.tourism.tag')}
        label={t('home.signal.tourism')}
        value={
          completed ? formatCompact(completed.visitors) : arrivals.isPending ? pending : failed
        }
        caption={
          completed
            ? t('home.signal.tourism.caption', { year: completed.year })
            : t('home.signal.tourism.fallback')
        }
        onPress={() => router.push('/tourism')}
        width={cardWidth}
      />
      <SignalCard
        tone="sky"
        icon="cellular"
        tag={t('home.signal.connectivity.tag')}
        label={t('home.signal.connectivity')}
        value={
          mobile
            ? `${formatNumber(mobile.stateAverageMbps)} Mbps`
            : network.isPending
              ? pending
              : failed
        }
        caption={
          mobile
            ? t('home.signal.connectivity.caption', { count: mobile.districtsMeasured })
            : t('home.signal.connectivity.fallback')
        }
        onPress={() => router.push('/connectivity')}
        width={cardWidth}
      />
      <SignalCard
        tone="indigo"
        icon="wallet"
        tag={t('home.signal.budget.tag')}
        label={t('home.signal.budget')}
        value={value(budget, (data) =>
          data.summary ? formatCrore(data.summary.totalExpenditure, 0) : failed
        )}
        caption={
          budget.data?.fiscalYear
            ? t('home.signal.budget.caption', { year: budget.data.fiscalYear })
            : t('home.signal.budget.fallback')
        }
        onPress={() => router.push('/budget')}
        width={cardWidth}
      />
      <SignalCard
        tone="emerald"
        icon="briefcase"
        tag={t('home.signal.schemes.tag')}
        label={t('home.signal.schemes')}
        value={value(schemes, (data) => formatNumber(data.total))}
        caption={t('home.signal.schemes.caption')}
        onPress={() => router.push('/schemes')}
        width={cardWidth}
      />
    </HStack>
  );
}
