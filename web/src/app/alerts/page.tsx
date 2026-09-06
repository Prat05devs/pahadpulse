import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { AlertCard } from '@/features/alerts/components';
import { fetchActiveAlerts } from '@/features/alerts/services';
import { TerrainMap, fetchAlertFeatures } from '@/features/map';
import { fetchRecentSeismic } from '@/features/seismic/services';
import { SeismicPanel } from '@/features/seismic/components/seismic-panel';

export const metadata: Metadata = {
  title: 'Live Alerts — Pahad Pulse',
  description: 'Active weather, disaster, road, and river alerts across Uttarakhand.',
};

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  let alerts = null;
  let alertFeatures = null;
  let error = null;

  const [listResult, mapResult, seismicResult] = await Promise.allSettled([
    fetchActiveAlerts(undefined, 50),
    fetchAlertFeatures(),
    fetchRecentSeismic(10),
  ]);

  if (listResult.status === 'fulfilled') {
    alerts = listResult.value;
  } else {
    const caught = listResult.reason;
    error = caught instanceof Error ? caught.message : 'Failed to load alerts';
  }

  // The map is settled separately: geometry failing must never cost the reader the warnings
  // themselves, which are the safety-critical half of this page.
  if (mapResult.status === 'fulfilled') alertFeatures = mapResult.value;

  // Observed events, kept structurally separate from the warnings above — see the section
  // heading. Its failure never affects the alerts, which are the safety-critical half.
  const seismic = seismicResult.status === 'fulfilled' ? seismicResult.value : null;

  const mappedCount = alertFeatures?.features.length ?? 0;
  // Any feature drawn at district precision changes what the map is allowed to claim.
  const anyDistrictExtent =
    alertFeatures?.features.some((feature) => feature.properties.extent === 'district') ?? false;
  const listedCount = alerts?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark px-4 py-6 text-text-dark sm:px-6 md:py-8">
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
            Live Alerts
          </h1>
          <p className="mt-1.5 text-sm text-text-dark/70 sm:mt-2 sm:text-base">
            Weather, disaster, road &amp; river alerts across Uttarakhand
          </p>
        </div>

        {/* Content */}
        <div className="px-4 py-5 sm:px-6 md:py-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <p className="font-semibold">Unable to load alerts</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* The warnings on the terrain they cover.
              No district layer here: on this page the subject is the warning, and filled
              districts underneath would compete with it — and make a district look alerted
              when it is not. Clicking a warning opens its detail; nothing navigates away. */}
          {alertFeatures !== null && mappedCount > 0 && (
            <div className="mb-6">
              <TerrainMap
                districts={null}
                alerts={alertFeatures}
                showDistricts={false}
                navigateOnClick={false}
                fitToAlerts
              />
              <p className="mt-2 text-xs leading-relaxed text-text-light/60">
                Select a highlighted area for that warning&rsquo;s details.{' '}
                {/* Captioned from the data, never assumed. Describing district extent as the
                    authority's published polygon would overstate a warning's reach, which on
                    a safety map is the expensive direction to be wrong in. */}
                {anyDistrictExtent ? (
                  <>
                    Shaded areas are the <strong>districts</strong> each warning names, not the
                    precise area the authority published — a warning for one valley is drawn
                    over the whole district. SACHET&rsquo;s polygon service is currently
                    unavailable.
                  </>
                ) : (
                  <>
                    Shaded areas are the extent the issuing authority published — they are not
                    district boundaries.
                  </>
                )}
                {mappedCount < listedCount && (
                  <>
                    {' '}
                    {listedCount - mappedCount} further alert
                    {listedCount - mappedCount !== 1 ? 's are' : ' is'} active but state their
                    area only in words, so they appear in the list below and not on the map.
                  </>
                )}
              </p>
            </div>
          )}

          {alerts === null ? (
            /* A failed fetch is NOT an all-clear. This block used to render "No active
               alerts / All systems normal" whenever `alerts` was null — which is exactly
               what happens when the API is unreachable. During an outage the public alerts
               page was telling people there were no warnings. Never merge these two states. */
            <div className="rounded-lg border border-warning/50 bg-warning-soft/60 px-4 py-5">
              <p className="font-semibold text-text-light">Alerts could not be loaded</p>
              <p className="mt-1 text-sm leading-relaxed text-text-light/80">
                This is a problem with this page, not an all-clear. There may be active
                warnings that are not shown here. Check SACHET (sachet.ndma.gov.in) or your
                district administration before making any decision.
              </p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-10 text-center sm:py-12">
              <p className="mb-2 text-2xl" aria-hidden="true">✨</p>
              <p className="mb-1 font-semibold text-text-light">No active alerts</p>
              <p className="text-sm text-text-light/60">
                No warnings are currently in force across Uttarakhand.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-light/70">
                Showing {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
              </p>

              <div className="space-y-3">
                {alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>

            </div>
          )}

          {/* Below the warnings, and visually separated from them. An earthquake that has
              already happened is not a warning, and the two must not read as one list. */}
          {seismic !== null && (
            <div className="mt-8">
              <SeismicPanel data={seismic} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
