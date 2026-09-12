import React from 'react';
import type { Metadata } from 'next';
import { AlertCircle, GitCompare } from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { apiClient } from '@/lib/api';
import { z } from 'zod';
import { DistrictSummarySchema } from '@/features/dashboard/schemas';
import { fetchIndicatorComparison } from '@/features/indicators/services';
import { ComparisonTable } from '@/features/indicators/components/comparison-table';
import { DistrictPicker } from '@/features/indicators/components/district-picker';
import { BusinessComparisonScreen } from '@/features/business/components/business-comparison-screen';
import { QueryProvider } from '@/components/providers/query-provider';

export const metadata: Metadata = {
  title: 'Compare Districts — Pahad Pulse',
  description: 'Side-by-side comparison of two districts across key indicators.',
};

/** An hour. Every figure here is Census 2011 or a published state statistic; they change
 *  by migration, never between requests. */
export const revalidate = 3600;

const DistrictListSchema = z.array(DistrictSummarySchema);

interface ComparePageProps {
  searchParams: Promise<{ a?: string; b?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { a, b } = await searchParams;

  let districts = null;
  let error: string | null = null;

  try {
    districts = await apiClient.get('/areas/districts', DistrictListSchema);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load districts';
  }

  const known = new Set((districts ?? []).map((district) => district.slug));
  // A slug from the URL is untrusted input; fall back to empty string if not found.
  const slugA = a !== undefined && known.has(a) ? a : '';
  const slugB = b !== undefined && known.has(b) && b !== slugA ? b : '';

  let comparison = null;
  let comparisonError: string | null = null;

  if (districts !== null && slugA && slugB) {
    try {
      comparison = await fetchIndicatorComparison(slugA, slugB);
    } catch (err) {
      comparisonError = err instanceof Error ? err.message : 'Comparison unavailable';
    }
  }

  const nameOf = (slug: string) =>
    districts?.find((district) => district.slug === slug)?.name.en ?? slug;

  return (
    <DashboardLayout>
      <div className="min-h-full">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-accent">Analysis Engine</p>
            <h1 className="flex items-center gap-2 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-3xl text-text-light">
              <GitCompare className="size-6 text-accent" strokeWidth={1.8} aria-hidden="true" />
              Pahad Pulse Comparison Engine
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              We have engineered a robust comparison engine that dynamically processes thousands of socio-economic data points across demographics, infrastructure, and economics. We are incredibly proud of the comprehensive data warehouse we have built for Uttarakhand, allowing you to instantly benchmark any two districts across 60+ key indicators with raw, unadulterated precision.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          {error !== null && (
            <section className="surface-card flex flex-col items-start gap-3 p-4 sm:flex-row sm:gap-4 sm:p-6" role="alert">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
                <AlertCircle className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Unable to load districts</h2>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </section>
          )}

          {districts !== null && districts.length > 0 && (
            <>
              <div className="surface-card p-6 shadow-sm rounded-xl">
                <DistrictPicker
                  districts={districts.map((district) => ({
                    slug: district.slug,
                    nameEn: district.name.en,
                    nameHi: district.name.hi,
                  }))}
                  selectedA={slugA}
                  selectedB={slugB}
                />
              </div>

              {comparisonError !== null && (
                <p className="text-sm text-muted-foreground">
                  Comparison unavailable — {comparisonError}
                </p>
              )}

              {comparison !== null && comparison.rows.length > 0 && (
                <ComparisonTable
                  comparison={comparison}
                  nameA={nameOf(slugA)}
                  nameB={nameOf(slugB)}
                />
              )}

              {comparison !== null && comparison.rows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No indicator has a published value for both districts yet.
                </p>
              )}

              <div id="business" className="pt-10 mt-10 border-t border-border">
                <div className="mb-8">
                  <h2 className="text-2xl font-display font-bold text-text-light flex items-center gap-2">
                    Ease of Doing Business Engine
                  </h2>
                  <p className="text-muted-foreground mt-3 text-sm max-w-3xl leading-relaxed">
                    Moving beyond raw data, we have synthesized these data points into 5 highly specialized, pre-calculated investment scenarios tailored specifically for Uttarakhand&apos;s terrain. From boutique homestays to agro-processing units, our engine evaluates multiple weighted metrics—like digital connectivity, geological safety, and urban market size—to mathematically recommend the most profitable location for your venture.
                  </p>
                </div>
                
                <QueryProvider>
                  <BusinessComparisonScreen districts={districts} />
                </QueryProvider>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
