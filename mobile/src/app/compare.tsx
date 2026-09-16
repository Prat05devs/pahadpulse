import React from 'react';
import { BusinessComparisonScreen } from '@/features/business';
import { useDistrictFeatures } from '@/features/map';
import { useT } from '@/i18n';
import { Screen } from '@/components/templates';
import { ErrorState, LoadingState } from '@/components/molecules';

export default function BusinessScreen() {
  const districts = useDistrictFeatures();
  const t = useT();

  const mappedDistricts = (districts.data?.features || []).map((f) => ({
    slug: f.properties.slug,
    name: { en: f.properties.nameEn }, // mock name shape matching web
  }));

  if (districts.isPending) {
    return (
      <Screen>
        <LoadingState label={t('today.districts.loading')} />
      </Screen>
    );
  }

  if (districts.isError) {
    return (
      <Screen>
        <ErrorState error={districts.error} onRetry={districts.refetch} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => districts.refetch()} refreshing={districts.isRefetching}>
      <BusinessComparisonScreen districts={mappedDistricts} />
    </Screen>
  );
}
