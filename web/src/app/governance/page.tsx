import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { GovernanceWorkspace } from '@/features/governance/components/governance-workspace';
import { loadGovernanceWorkspace } from '@/features/governance/workspace-data';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Governance Workspace',
  description:
    'Uttarakhand district standing, departmental budget allocations, live alerts and geography in one workspace, with the source of every figure.',
  path: '/governance',
  noIndex: true,
});

/** Budget and indicators change by publication, not by the hour. */
export const revalidate = 3600;

interface GovernancePageProps {
  searchParams: Promise<{ budgetYear?: string | string[] }>;
}

export default async function GovernancePage({ searchParams }: GovernancePageProps) {
  const { budgetYear } = await searchParams;
  const selectedYear = typeof budgetYear === 'string' ? budgetYear : undefined;
  const data = await loadGovernanceWorkspace(selectedYear);

  return (
    <DashboardLayout>
      <GovernanceWorkspace data={data} />
    </DashboardLayout>
  );
}
