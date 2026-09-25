import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { IntelligenceWorkspace } from '@/features/intelligence/components/intelligence-workspace';
import { parseIntelligenceFilters } from '@/features/intelligence/model';
import { loadIntelligenceWorkspace } from '@/features/intelligence/workspace-data';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Uttarakhand Sector Intelligence',
  description:
    'Explore Uttarakhand public-data intelligence across demographics, health, education, economy, industry, and connectivity in one unified platform.',
  path: '/intelligence',
  keywords: [
    'Uttarakhand development indicators',
    'Uttarakhand sector data',
    'Uttarakhand analytics',
  ],
});

export const revalidate = 3600;

interface IntelligencePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function IntelligencePage({ searchParams }: IntelligencePageProps) {
  const [data, rawFilters] = await Promise.all([loadIntelligenceWorkspace(), searchParams]);
  const filters = parseIntelligenceFilters(rawFilters);

  return (
    <DashboardLayout>
      <IntelligenceWorkspace data={data} filters={filters} />
    </DashboardLayout>
  );
}
