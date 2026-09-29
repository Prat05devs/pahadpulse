import { err, ok } from 'neverthrow';

import * as observationController from '../../../controllers/observation.controller.js';
import type { NationalAqi } from '../../../models/cpcb-aqi.js';
import {
  asUnavailable,
  empty,
  formatCount,
  formatDay,
  formatMoment,
  unavailable,
} from '../format.js';
import type { Fact, Localised, Resolver } from '../types.js';

/** Rain below this in a day is a drizzle a traveller does not plan around. */
const RAIN_DAY_MM = 1;
const FORECAST_DAYS = 3;

export const AQI_BAND: Record<string, Localised> = {
  good: { en: 'Good', hi: 'अच्छी' },
  satisfactory: { en: 'Satisfactory', hi: 'संतोषजनक' },
  moderate: { en: 'Moderate', hi: 'मध्यम' },
  poor: { en: 'Poor', hi: 'ख़राब' },
  very_poor: { en: 'Very poor', hi: 'बहुत ख़राब' },
  severe: { en: 'Severe', hi: 'गंभीर' },
};

function bandOf(aqi: NationalAqi): Localised {
  return AQI_BAND[aqi.band] ?? { en: aqi.band, hi: aqi.band };
}

export const weatherNow: Resolver = async ({ district }, now) => {
  if (district === undefined) return ok(empty());
  const weather = await observationController.getAreaWeather(district.slug, now);
  if (weather.isErr()) return asUnavailable(weather.error) ?? err(weather.error);

  const { temperature, humidity, condition, observedAt, source } = weather.value;
  // Temperature is the headline; without it there is no "weather now" to report (HYD-6).
  if (temperature === undefined || observedAt === null) return ok(unavailable('no_data'));

  const factSource: Fact['source'] = { department: source.department, url: null };
  const facts: Fact[] = [
    {
      label: { en: 'Temperature', hi: 'तापमान' },
      value: `${formatCount(temperature.value, 1)}°C`,
      vintage: observedAt,
      source: factSource,
    },
  ];
  if (humidity !== undefined) {
    facts.push({
      label: { en: 'Humidity', hi: 'नमी' },
      value: `${formatCount(humidity.value)}%`,
      vintage: observedAt,
      source: factSource,
    });
  }

  return ok({
    status: 'ok',
    slots: {
      district: district.name,
      temperature: formatCount(temperature.value, 1),
      condition: condition?.label ?? { en: 'conditions not reported', hi: 'स्थिति दर्ज नहीं' },
      when: formatMoment(observedAt),
    },
    facts,
  });
};

export const weatherRain: Resolver = async ({ district }, now) => {
  if (district === undefined) return ok(empty());
  const weather = await observationController.getAreaWeather(district.slug, now);
  if (weather.isErr()) return asUnavailable(weather.error) ?? err(weather.error);

  const today = observationController.forecastDateKey(now.toISOString());
  const days = weather.value.forecast
    .filter((day) => day.date >= today && day.precipitationMm !== null)
    .slice(0, FORECAST_DAYS);
  if (days.length === 0) return ok(unavailable('no_data'));

  const wet = days.filter((day) => (day.precipitationMm ?? 0) >= RAIN_DAY_MM);
  const slots = { district: district.name, days: formatCount(days.length) };
  if (wet.length === 0) return ok(empty(slots));

  const source: Fact['source'] = { department: weather.value.source.department, url: null };
  const wettest = Math.max(...wet.map((day) => day.precipitationMm ?? 0));
  return ok({
    status: 'ok',
    slots: {
      ...slots,
      wetDays: wet.map((day) => formatDay(day.date)).join(', '),
      wettest: formatCount(wettest, 1),
    },
    facts: wet.map((day) => ({
      label: { en: `Rain · ${formatDay(day.date)}`, hi: `बारिश · ${formatDay(day.date)}` },
      value: `${formatCount(day.precipitationMm ?? 0, 1)} mm`,
      vintage: day.date,
      source,
    })),
  });
};

export const airDistrict: Resolver = async ({ district }, now) => {
  if (district === undefined) return ok(empty());
  const air = await observationController.getAreaAirQuality(district.slug, now);
  if (air.isErr()) return asUnavailable(air.error) ?? err(air.error);

  const aqi = air.value.nationalAqi;
  // Null means "not enough readings for an index", never clean air (cpcb-aqi.ts).
  if (aqi === null || air.value.observedAt === null) return ok(unavailable('no_data'));

  return ok({
    status: 'ok',
    slots: {
      district: district.name,
      aqi: formatCount(aqi.value),
      band: bandOf(aqi),
      when: formatMoment(air.value.observedAt),
    },
    facts: [
      {
        label: { en: 'National AQI (CPCB method)', hi: 'राष्ट्रीय AQI (CPCB पद्धति)' },
        value: `${formatCount(aqi.value)} · ${bandOf(aqi).en}`,
        vintage: air.value.observedAt,
        source: { department: air.value.source.department, url: null },
      },
    ],
  });
};

function airExtreme(pick: 'worst' | 'best'): Resolver {
  return async (_params, now) => {
    const all = await observationController.getAllDistrictAirQuality(now);
    if (all.isErr()) return asUnavailable(all.error) ?? err(all.error);

    const rated = all.value
      .flatMap((entry) =>
        entry.air?.nationalAqi === null || entry.air === null
          ? []
          : [{ entry, aqi: entry.air.nationalAqi, air: entry.air }],
      )
      .sort((a, b) => (pick === 'worst' ? b.aqi.value - a.aqi.value : a.aqi.value - b.aqi.value));
    const top = rated[0];
    if (top === undefined) return ok(unavailable('no_data'));

    const name: Localised = {
      en: top.entry.areaName.en,
      hi: top.entry.areaName.hi ?? top.entry.areaName.en,
    };
    return ok({
      status: 'ok',
      slots: {
        district: name,
        aqi: formatCount(top.aqi.value),
        band: bandOf(top.aqi),
        rated: formatCount(rated.length),
      },
      facts: [
        {
          label: name,
          value: `AQI ${formatCount(top.aqi.value)} · ${bandOf(top.aqi).en}`,
          vintage: top.air.observedAt,
          source: { department: top.air.source.department, url: null },
        },
      ],
    });
  };
}

export const airWorst = airExtreme('worst');
export const airBest = airExtreme('best');
