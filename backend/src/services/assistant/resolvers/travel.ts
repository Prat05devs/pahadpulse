import { err, ok } from 'neverthrow';

import * as networkController from '../../../controllers/network.controller.js';
import * as roadController from '../../../controllers/road.controller.js';
import { getTourismGuide } from '../../tourism-guide.service.js';
import { asUnavailable, empty, formatCount, formatDay, same, unavailable } from '../format.js';
import type { DistrictRef, Fact, Localised, Resolver, SlotValue } from '../types.js';
import { alertsDistrict, firesDistrict } from './safety.js';
import { weatherNow } from './weather.js';

/** The helplines come from the official travel guide, never from a template (AST-1). */
function helplines(): { road: string; emergency: string; source: Fact['source'] } {
  const guide = getTourismGuide();
  return {
    road: guide.helplines.yatra[0] ?? '',
    emergency: guide.helplines.emergency,
    source: {
      department: same(new URL(guide.sourceUrl).hostname),
      url: guide.sourceUrl,
    },
  };
}

function roadsResolver(scope: 'state' | 'district'): Resolver {
  return async ({ district }, now) => {
    const slug = scope === 'district' ? (district?.slug ?? null) : null;
    const report = await roadController.listRoadClosures(slug, now);
    if (report.isErr()) return asUnavailable(report.error) ?? err(report.error);

    const help = helplines();
    const base = { district: district?.name ?? same(''), helpline: help.road };
    // An unavailable list is never "no closures" (RD-1): until PWD permits display, say so.
    if (!report.value.available) {
      return ok(
        unavailable(
          report.value.unavailableReason === 'not_permitted'
            ? 'not_redistributable'
            : 'source_unavailable',
          base,
        ),
      );
    }
    const closed = report.value.closures;
    if (closed.length === 0) return ok(empty(base));

    return ok({
      status: 'ok',
      slots: {
        ...base,
        count: formatCount(closed.length),
        roads: closed
          .slice(0, 3)
          .map((c) => c.roadName)
          .join('; '),
      },
      facts: closed.slice(0, 3).map((closure) => ({
        label: same(closure.district?.name ?? closure.roadType ?? 'Road'),
        value: closure.roadName,
        vintage: closure.closedAt,
        source: { department: same(report.value.source.department), url: report.value.source.url },
      })),
    });
  };
}

export const roadsClosed = roadsResolver('state');
export const roadsDistrict = roadsResolver('district');

export const roadsHelpline: Resolver = () => {
  const help = helplines();
  return Promise.resolve(
    ok({
      status: 'ok',
      slots: { helpline: help.road, emergency: help.emergency },
      facts: [
        {
          label: { en: 'Road and yatra helpline', hi: 'सड़क व यात्रा हेल्पलाइन' },
          value: help.road,
          vintage: null,
          source: help.source,
        },
      ],
    }),
  );
};

/** One line per signal, in the reader's language, from another resolver's own answer. */
function line(status: string, live: Localised, quiet: Localised, missing: Localised): Localised {
  if (status === 'ok') return live;
  if (status === 'empty') return quiet;
  return missing;
}

function text(slot: SlotValue | undefined): Localised {
  if (slot === undefined) return same('');
  return typeof slot === 'object' ? slot : same(String(slot));
}

/**
 * Signals before a trip. It lists what the platform shows and never concludes that a trip is
 * safe or unsafe (AST-4): that judgement belongs to the reader and the authorities.
 */
export const travelCheck: Resolver = async ({ district }, now) => {
  if (district === undefined) return ok(empty());
  const params: { district: DistrictRef } = { district };
  const [alerts, weather, fires, roads] = await Promise.all([
    alertsDistrict(params, now),
    weatherNow(params, now),
    firesDistrict(params, now),
    roadsDistrict(params, now),
  ]);
  // A failure in one signal is reported as that signal missing, not as a failed answer.
  const a = alerts.isOk() ? alerts.value : unavailable('source_unavailable');
  const w = weather.isOk() ? weather.value : unavailable('source_unavailable');
  const f = fires.isOk() ? fires.value : unavailable('source_unavailable');
  const r = roads.isOk() ? roads.value : unavailable('source_unavailable');
  const help = helplines();
  const count = text(a.slots.count);
  const temp = text(w.slots.temperature);
  const condition = text(w.slots.condition);
  const fireCount = text(f.slots.count);
  const roadCount = text(r.slots.count);

  return ok({
    status: 'ok',
    slots: {
      district: district.name,
      helpline: help.road,
      emergency: help.emergency,
      alerts: line(
        a.status,
        { en: `${count.en} active`, hi: `${count.hi} सक्रिय` },
        { en: 'none active', hi: 'कोई सक्रिय नहीं' },
        { en: 'not available', hi: 'उपलब्ध नहीं' },
      ),
      weather: line(
        w.status,
        {
          en: `${temp.en}°C, ${condition.en.toLowerCase()}`,
          hi: `${temp.hi}°C, ${condition.hi}`,
        },
        { en: 'not reported', hi: 'दर्ज नहीं' },
        { en: 'not available', hi: 'उपलब्ध नहीं' },
      ),
      fires: line(
        f.status,
        { en: `${fireCount.en} in the last 48 hours`, hi: `पिछले 48 घंटों में ${fireCount.hi}` },
        { en: 'none in the last 48 hours', hi: 'पिछले 48 घंटों में कोई नहीं' },
        { en: 'not available', hi: 'उपलब्ध नहीं' },
      ),
      roads: line(
        r.status,
        {
          en: `${roadCount.en} closures reported to PWD`,
          hi: `PWD को ${roadCount.hi} बंद सड़कें दर्ज`,
        },
        { en: 'no closures reported to PWD', hi: 'PWD को कोई बंद सड़क दर्ज नहीं' },
        { en: 'not shown in the app yet', hi: 'ऐप में अभी उपलब्ध नहीं' },
      ),
    },
    facts: [...a.facts.slice(0, 1), ...w.facts.slice(0, 1), ...f.facts, ...r.facts.slice(0, 1)],
  });
};

function latestMobile(connections: Awaited<ReturnType<typeof networkController.getAreaNetwork>>) {
  if (connections.isErr()) return null;
  // Newest quarter first (getAreaNetwork).
  return connections.value.connections.find((c) => c.kind === 'mobile') ?? null;
}

export const networkDistrict: Resolver = async ({ district }, now) => {
  if (district === undefined) return ok(empty());
  const network = await networkController.getAreaNetwork(district.slug, now);
  if (network.isErr()) return asUnavailable(network.error) ?? err(network.error);

  const mobile = latestMobile(network);
  if (mobile === null) return ok(empty({ district: district.name }));

  return ok({
    status: 'ok',
    slots: {
      district: district.name,
      download: formatCount(mobile.downloadMbps, 1),
      upload: formatCount(mobile.uploadMbps, 1),
      tests: formatCount(mobile.sample.tests),
      quarter: formatDay(mobile.quarterStart),
    },
    facts: [
      {
        label: { en: 'Median mobile download', hi: 'मोबाइल डाउनलोड गति' },
        value: `${formatCount(mobile.downloadMbps, 1)} Mbps`,
        vintage: mobile.vintage,
        source:
          mobile.provenance === null
            ? null
            : { department: mobile.provenance.department, url: mobile.provenance.url },
      },
    ],
  });
};

function networkExtreme(pick: 'fastest' | 'slowest'): Resolver {
  return async (_params, now) => {
    const state = await networkController.listStateNetwork(now);
    if (state.isErr()) return asUnavailable(state.error) ?? err(state.error);

    const spread = state.value.spread.find((s) => s.kind === 'mobile');
    if (spread === undefined) return ok(unavailable('no_data'));
    const chosen = spread[pick];
    const district = state.value.districts.find((d) => d.slug === chosen.slug);
    const connection = district?.connections.find((c) => c.kind === 'mobile');
    const name: Localised = district?.name ?? same(chosen.slug);

    return ok({
      status: 'ok',
      slots: {
        district: name,
        download: formatCount(chosen.downloadMbps, 1),
        average: formatCount(spread.stateAverageMbps, 1),
        measured: formatCount(spread.districtsMeasured),
      },
      facts: [
        {
          label: name,
          value: `${formatCount(chosen.downloadMbps, 1)} Mbps`,
          vintage: connection?.vintage ?? null,
          source:
            connection?.provenance === null || connection === undefined
              ? null
              : { department: connection.provenance.department, url: connection.provenance.url },
        },
      ],
    });
  };
}

export const networkFastest = networkExtreme('fastest');
export const networkSlowest = networkExtreme('slowest');
