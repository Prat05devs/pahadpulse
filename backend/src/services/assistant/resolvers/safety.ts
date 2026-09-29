import { err, ok } from 'neverthrow';

import { FIRMS } from '../../../config/constants.js';
import * as alertController from '../../../controllers/alert.controller.js';
import * as mapController from '../../../controllers/map.controller.js';
import * as seismicController from '../../../controllers/seismic.controller.js';
import type { AlertOut } from '../../../models/alert.model.js';
import {
  asUnavailable,
  empty,
  formatCount,
  formatDay,
  formatMoment,
  same,
  sourceOf,
} from '../format.js';
import type { Fact, Localised, Resolver } from '../types.js';

/** How many warnings an answer names before it says "and N more". */
const LISTED = 3;

export const SEVERITY: Record<string, Localised> = {
  extreme: { en: 'Extreme', hi: 'अत्यधिक' },
  severe: { en: 'Severe', hi: 'गंभीर' },
  moderate: { en: 'Moderate', hi: 'मध्यम' },
  minor: { en: 'Minor', hi: 'सामान्य' },
  unknown: { en: 'Unrated', hi: 'अवर्गीकृत' },
};

function alertFacts(alerts: readonly AlertOut[]): Fact[] {
  return alerts.slice(0, LISTED).map((alert) => ({
    label: SEVERITY[alert.severity] ?? SEVERITY.unknown!,
    // The authority's own headline, never reworded (ALR-2).
    value: alert.headline,
    vintage: alert.issuedAt,
    source: sourceOf(alert.provenance) ?? {
      department: same(alert.authority),
      url: alert.webUrl,
    },
  }));
}

function severityBreakdown(bySeverity: Record<string, number>): Localised {
  const order = ['extreme', 'severe', 'moderate', 'minor', 'unknown'];
  const parts = order
    .filter((key) => (bySeverity[key] ?? 0) > 0)
    .map((key) => ({ count: bySeverity[key] ?? 0, label: SEVERITY[key] ?? SEVERITY.unknown! }));
  return {
    en: parts.map((p) => `${p.count} ${p.label.en.toLowerCase()}`).join(', '),
    hi: parts.map((p) => `${p.count} ${p.label.hi}`).join(', '),
  };
}

export const alertsActive: Resolver = async (_params, now) => {
  const summary = await alertController.getSummary(now);
  if (summary.isErr()) return asUnavailable(summary.error) ?? err(summary.error);
  if (summary.value.activeCount === 0) return ok(empty());

  const listed = await alertController.listActive(
    { cursor: Number.MAX_SAFE_INTEGER, limit: LISTED },
    now,
  );
  if (listed.isErr()) return err(listed.error);

  return ok({
    status: 'ok',
    slots: {
      count: formatCount(summary.value.activeCount),
      breakdown: severityBreakdown(summary.value.bySeverity),
    },
    facts: alertFacts(listed.value.data),
  });
};

export const alertsDistrict: Resolver = async ({ district }, now) => {
  if (district === undefined) return ok(empty());
  const page = await alertController.listActiveForArea(
    district.slug,
    Number.MAX_SAFE_INTEGER,
    20,
    now,
  );
  if (page.isErr()) return asUnavailable(page.error) ?? err(page.error);
  if (page.value.data.length === 0) return ok(empty({ district: district.name }));

  const bySeverity: Record<string, number> = {};
  for (const alert of page.value.data) {
    bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
  }
  return ok({
    status: 'ok',
    slots: {
      district: district.name,
      count: formatCount(page.value.data.length),
      breakdown: severityBreakdown(bySeverity),
    },
    facts: alertFacts(page.value.data),
  });
};

export const alertsRecent: Resolver = async (_params, now) => {
  const recent = await alertController.listRecent(48, 20, now);
  if (recent.isErr()) return asUnavailable(recent.error) ?? err(recent.error);
  if (recent.value.length === 0) return ok(empty());
  return ok({
    status: 'ok',
    slots: { count: formatCount(recent.value.length) },
    facts: alertFacts(recent.value),
  });
};

const FIRMS_SOURCE: Fact['source'] = {
  department: { en: 'NASA FIRMS', hi: 'नासा FIRMS' },
  url: 'https://firms.modaps.eosdis.nasa.gov',
};

function fireResolver(scope: 'state' | 'district'): Resolver {
  return async ({ district }) => {
    const fires = await mapController.getFireFeatures();
    if (fires.isErr()) return asUnavailable(fires.error) ?? err(fires.error);

    const features =
      scope === 'district' && district !== undefined
        ? fires.value.features.filter((f) => f.properties.districtSlug === district.slug)
        : fires.value.features;
    const districtSlot = district?.name ?? same('');
    if (features.length === 0)
      return ok(empty({ district: districtSlot, hours: FIRMS.MAP_WINDOW_HOURS }));

    // Newest first from the repository, so the first is the latest pass.
    const latest = features[0]!.properties.acquiredAt;
    const byDistrict = new Map<string, { name: Localised; count: number }>();
    for (const { properties } of features) {
      const entry = byDistrict.get(properties.districtSlug) ?? {
        name: {
          en: properties.districtNameEn,
          hi: properties.districtNameHi ?? properties.districtNameEn,
        },
        count: 0,
      };
      entry.count += 1;
      byDistrict.set(properties.districtSlug, entry);
    }
    const top = [...byDistrict.values()].sort((a, b) => b.count - a.count).slice(0, 3);

    return ok({
      status: 'ok',
      slots: {
        district: districtSlot,
        count: formatCount(features.length),
        hours: FIRMS.MAP_WINDOW_HOURS,
        latest: formatMoment(latest),
        top: {
          en: top.map((d) => `${d.name.en} (${d.count})`).join(', '),
          hi: top.map((d) => `${d.name.hi} (${d.count})`).join(', '),
        },
      },
      facts: [
        {
          label: { en: 'Satellite fire detections', hi: 'उपग्रह से आग के संकेत' },
          value: formatCount(features.length),
          vintage: latest,
          source: FIRMS_SOURCE,
        },
      ],
    });
  };
}

export const firesState = fireResolver('state');
export const firesDistrict = fireResolver('district');

export const quakesRecent: Resolver = async (_params, now) => {
  const recent = await seismicController.getRecentSeismic(20, undefined, now);
  if (recent.isErr()) return asUnavailable(recent.error) ?? err(recent.error);
  const latest = recent.value.events[0];
  if (recent.value.countLast30Days === 0 || latest === undefined) return ok(empty());

  const source: Fact['source'] =
    recent.value.source === null
      ? null
      : { department: recent.value.source.department, url: recent.value.source.url };
  return ok({
    status: 'ok',
    slots: {
      count: formatCount(recent.value.countLast30Days),
      magnitude: latest.magnitude.toFixed(1),
      place: latest.place,
      when: formatDay(latest.occurredAt),
    },
    facts: [
      {
        label: { en: 'Latest earthquake', hi: 'हाल का भूकंप' },
        value: `M${latest.magnitude.toFixed(1)} · ${latest.place}`,
        vintage: latest.occurredAt,
        source,
      },
    ],
  });
};

export const quakesLargest: Resolver = async (_params, now) => {
  const recent = await seismicController.getRecentSeismic(20, undefined, now);
  if (recent.isErr()) return asUnavailable(recent.error) ?? err(recent.error);
  const largest = recent.value.largest;
  if (largest === null) return ok(empty());

  return ok({
    status: 'ok',
    slots: {
      magnitude: largest.magnitude.toFixed(1),
      place: largest.place,
      when: formatDay(largest.occurredAt),
      depth: largest.depthKm === null ? '—' : formatCount(largest.depthKm, 0),
    },
    facts: [
      {
        label: { en: 'Largest recent earthquake', hi: 'हाल का सबसे बड़ा भूकंप' },
        value: `M${largest.magnitude.toFixed(1)} · ${largest.place}`,
        vintage: largest.occurredAt,
        source:
          recent.value.source === null
            ? null
            : { department: recent.value.source.department, url: recent.value.source.url },
      },
    ],
  });
};
