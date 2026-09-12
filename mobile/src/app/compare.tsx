import React from 'react';
import { BusinessComparisonScreen } from '@/features/business';
import { useDistrictFeatures } from '@/features/map';
import { Screen } from '@/components/templates';

export default function BusinessScreen() {
  const districts = useDistrictFeatures();
  
  const mappedDistricts = (districts.data?.features || []).map(f => ({
    slug: f.properties.slug,
    name: { en: f.properties.nameEn } // mock name shape matching web
  }));

  return (
    <Screen onRefresh={() => districts.refetch()} refreshing={districts.isRefetching}>
      <BusinessComparisonScreen districts={mappedDistricts} />
    </Screen>
  );
}
