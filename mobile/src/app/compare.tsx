import React from 'react';
import { BusinessComparisonScreen } from '@/features/business';
import { useDistrictFeatures } from '@/features/map';
import { Screen } from '@/components/templates';
import { ErrorState, LoadingState } from '@/components/molecules';

export default function BusinessScreen() {
  const districts = useDistrictFeatures();
  
  const mappedDistricts = (districts.data?.features || []).map(f => ({
    slug: f.properties.slug,
    name: { en: f.properties.nameEn } // mock name shape matching web
  }));

  if (districts.isPending) {
    return <Screen><LoadingState label="Loading districts" /></Screen>;
  }

  if (districts.isError) {
    return <Screen><ErrorState error={districts.error} onRetry={districts.refetch} /></Screen>;
  }

  return (
    <Screen onRefresh={() => districts.refetch()} refreshing={districts.isRefetching}>
      <BusinessComparisonScreen districts={mappedDistricts} />
    </Screen>
  );
}
