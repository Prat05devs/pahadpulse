# Module: `hydromet`

| | |
|---|---|
| **Owner** | `<TBD>` |
| **Status** | **partial** — weather is built and live; rivers and reservoirs are not started |
| **Backend** | `src/controllers/observation.controller.ts`, `src/repositories/observation.repository.ts`, `src/models/observation.model.ts`, `src/services/ingestion/connectors/open-meteo.connector.ts` |
| **Web** | `src/features/weather/` |
| **Mobile** | not in this repo |

**What exists today.** One weather station per district, placed at the district
headquarters, reading current conditions and a 7-day forecast from Open-Meteo every hour.
`GET /api/areas/:slug/weather` serves it and the district page renders it.

**What does not.** Rivers, reservoirs, thresholds and station series. `station_thresholds`
is deliberately not created yet — it exists to satisfy HYD-3, and there is no river source
until CWC access is resolved, so an empty table would only invite the half-built river panel
HYD-3 is written to prevent.

---

## 1. Purpose

Owns measurements of water and weather: temperature, rainfall, river levels, and reservoir
levels. Everything here is a time series from a monitoring station, with a value, a timestamp
and a unit.

The distinction that defines this module: an **observation** is measured continuously and is
only meaningful next to its own history, while an **indicator** is a published statistic
compared across districts. Rainfall is an observation; average annual rainfall is an indicator.

## 2. Boundaries

**Owns**
- Monitoring stations: identity, location, the area they sit in, what they measure
- Observations: the time series
- Danger and warning thresholds per river station, as published by the authority
- Forecasts, where a source provides them

**Does not own**
- Warnings derived from measurements — see `alerts.md`. This module records that the Ganga is at
  294.1m; it never decides that constitutes a flood warning. Only an authority does that.
- Long-run climate statistics used for comparison — those are indicators

**Used by other modules via**
- `ObservationRepository.latestForAreas(areaIds, metrics)` — district dashboard panels

**Depends on**

| Module | For | How |
|---|---|---|
| `geography` | placing stations in areas | `AreaRepository.findByCode` |
| `datasets` | provenance, source chain, freshness | connector interface |

## 3. Domain

### Entities

| Entity | Key fields | Notes |
|---|---|---|
| Station | `id, source_station_code, type, name_en, name_hi, area_id, lat, lng, river_name, source_id` | |
| Observation | `station_id, metric, observed_at, value, unit, source_id, fetched_at` | the time series |
| Threshold | `station_id, level, value, unit, source_id` | warning / danger levels, published by CWC |
| Forecast | `area_id, metric, valid_from, valid_to, value, source_id, fetched_at` | only where a source provides it |

### Enums

```ts
enum StationType { Weather = 'weather', River = 'river', Reservoir = 'reservoir' }
enum Metric {
  TemperatureC = 'temperature_c', RainfallMm = 'rainfall_mm', HumidityPct = 'humidity_pct',
  RiverLevelM = 'river_level_m', ReservoirLevelM = 'reservoir_level_m', ReservoirStorageMcm = 'reservoir_storage_mcm',
  WindSpeedKmh = 'wind_speed_kmh', WindDirectionDeg = 'wind_direction_deg',
  WeatherCode = 'weather_code',
  TemperatureMinC = 'temperature_min_c', TemperatureMaxC = 'temperature_max_c',
}
enum ThresholdLevel { Warning = 'warning', Danger = 'danger', HighestFloodLevel = 'hfl' }
/** Coarse buckets derived from a WMO code for display; the raw code is always stored too. */
enum WeatherCondition {
  Clear = 'clear', PartlyCloudy = 'partly_cloudy', Cloudy = 'cloudy', Fog = 'fog',
  Drizzle = 'drizzle', Rain = 'rain', HeavyRain = 'heavy_rain', Snow = 'snow',
  Thunderstorm = 'thunderstorm', Unknown = 'unknown',
}
```

`weather_code` is a category stored numerically with unit `wmo`. HYD-2 makes that safe: the
unit travels with the row, so nothing can mistake a 51 for millimetres.

`temperature_min_c` / `temperature_max_c` are separate metrics rather than two
`temperature_c` forecast rows, because `forecasts` is keyed on (area, metric, valid_from)
and one metric cannot hold both bounds for a day.

### Rules

| # | Rule |
|---|---|
| HYD-1 | An observation is uniquely identified by `(station_id, metric, observed_at)`. Re-ingestion updates in place. |
| HYD-2 | Units are stored explicitly per row and never assumed from the metric. Upstream sources change units without notice. |
| HYD-3 | A river level is never displayed without its station's danger threshold, when one is known. The number alone means nothing to a reader. |
| HYD-4 | Crossing a threshold is displayed as a fact ("above danger level") and never as a warning or instruction. Warnings come from `alerts` and only from an authority (ALR-6). |
| HYD-5 | The source chain is ordered per metric and the source actually used is shown to the user. IMD and OpenWeatherMap must never be presented as interchangeable. |
| HYD-6 | Observations older than their source's cadence are shown with their timestamp and a staleness state, never hidden and never presented as current. |
| HYD-7 | Reservoir figures ingested manually from a PDF carry the same provenance as any API row, with `AccessMethod.Manual`. |

### Permissions

Fully public, read-only. Manual reservoir entry is the one write path, restricted to operators
and recorded as an ingestion run.

## 4. Data

| Table | Purpose | Notes |
|---|---|---|
| `stations` | station registry | small |
| `observations` | time series | highest-growth table in the product |
| `station_thresholds` | warning/danger levels | rarely changes |
| `forecasts` | forward-looking values | superseded on each run |

### Indexes and why

| Index | Serves |
|---|---|
| `pk (station_id, metric, observed_at)` | idempotent upsert (HYD-1) |
| `idx_obs_station_metric_time (station_id, metric, observed_at DESC)` | "latest reading" and the chart series — the two queries that exist |
| `idx_station_area_type (area_id, type)` | district dashboard: stations in this district |

`observations` needs a retention or rollup policy before launch — see Open questions.

### Migrations

| # | File | What |
|---|---|---|
| 019 | `019-create-hydromet.sql` | stations, observations, forecasts |
| 020 | `020-seed-open-meteo-source.sql` | the Open-Meteo registry row |
| 021 | `021-seed-weather-stations.sql` | one weather station per district, at its headquarters |

These were numbered 008/009 in the original plan. Those numbers were taken by the alerts
tables before hydromet was built, so the tables landed at 019–021 and this table was
corrected rather than the migration history rewritten.

`station_thresholds` is not created yet — see the status note at the top.

## 5. API

| Method | Path | Auth | Cache | Paginated | Status |
|---|---|---|---|---|---|
| GET | `/api/areas/:slug/weather` | none | 10m | no | **built** |
| GET | `/api/stations` | none | 1h | cursor | not built |
| GET | `/api/stations/:id/series` | none | 10m | no | not built |
| GET | `/api/rivers/levels` | none | 10m | no | not built |
| GET | `/api/reservoirs` | none | 1h | no | not built |

`src/features/weather/services.ts` in the web app already has client functions for the
unbuilt four. They resolve to 404 and every caller catches that, so they are dormant rather
than broken — but nothing should start rendering them until the endpoints exist.

### `GET /api/areas/:slug/weather`

Returns the station, the latest reading per metric, the derived condition, the 7-day
forecast, and the source used. `temperature`, `rainfall` and `humidity` keep the exact
shape the web app's `WeatherDataSchema` required before the endpoint existed; everything
else is additive and optional.

An absent metric is omitted from the response rather than sent as zero or null (HYD-6).

**Errors**

| Constant | Code | HTTP | When |
|---|---|---|---|
| `AREA_NOT_FOUND` | `40001` | 404 | no such area slug |
| `STATION_NOT_FOUND` | `70001` | 404 | the area has no weather station — e.g. the state row |
| `OBSERVATION_NOT_AVAILABLE` | `70002` | 404 | a station exists but has no readings yet |
| `SOURCE_NOT_REDISTRIBUTABLE` | `90006` | 403 | DS-6 — enforced here, not in the UI |

### `GET /api/rivers/levels`

| | |
|---|---|
| Auth | none |
| Cache | `cacheMiddleware(CACHE_TTL.OBSERVATIONS)` — 10 minutes |

**Response 200** — every river station with its latest level, its thresholds, the delta since
the previous reading, and the source used.

**Errors**

| Constant | Code | HTTP | When |
|---|---|---|---|
| `OBSERVATION_NOT_AVAILABLE` | `70002` | 404 | no reading within the acceptable window for any station |

### Error code range

`70xxx` — allocated to this module.

| Constant | Code | HTTP |
|---|---|---|
| `STATION_NOT_FOUND` | `70001` | 404 |
| `OBSERVATION_NOT_AVAILABLE` | `70002` | 404 |
| `METRIC_NOT_SUPPORTED` | `70003` | 400 |
| `FORECAST_NOT_AVAILABLE` | `70004` | 404 |
| `THRESHOLD_NOT_DEFINED` | `70005` | 404 |

## 6. UI

| Surface | Route | Rendering | Notes |
|---|---|---|---|
| Web | `/[locale]/weather` | Client Component | state weather and rainfall map |
| Web | `/[locale]/rivers` | Client Component | river levels against thresholds — the module's most important screen |
| Web | `/[locale]/district/[slug]` | Server Component | current conditions panel |

A river level renders as a level against its thresholds, not as a bare number: the reader needs
to see the gap between now and danger at a glance, which is a gauge, not a statistic.

### Data hooks

| Hook | Query key | staleTime |
|---|---|---|
| `useAreaWeather(slug)` | `hydroKeys.weather(slug)` | 10m |
| `useRiverLevels()` | `hydroKeys.rivers()` | 10m |
| `useStationSeries(id, metric)` | `hydroKeys.series(id, metric)` | 10m |

## 7. Failure modes

| Failure | User sees | Handling |
|---|---|---|
| IMD unreachable | OpenWeatherMap values, with the source badge changed accordingly | automatic fallback, visible in the UI (HYD-5) |
| Both weather sources down | last-good readings with timestamps and a staleness badge | never blank |
| CWC dashboard unparseable | last-good river levels, clearly stale | this is the module's most fragile connector |
| Station reports an implausible value | value stored, flagged, not displayed | validate against a plausible range per metric; a river at 9999m is a parse failure, not a flood |
| No threshold defined for a station | level shown with an explicit "no published threshold" note | never invent one |

## 8. Decisions

### 2026-09-06 — Open-Meteo is the first weather source, on licence grounds

**Supersedes** the OpenWeatherMap plan below, which was written before the redistribution
problem was understood.

**Context:** every alert source on the platform speaks CAP, and CAP carries warnings — it has
no field for temperature, wind or humidity. A district weather panel needed an observation
source, not more work on the existing connectors. Two candidates: IMD's own endpoints, and
Open-Meteo.

**Decision:** Open-Meteo, at CC-BY 4.0, one station per district at its headquarters.

**Because:** `may_redistribute`. IMD's terms are unconfirmed, which is why `imd-cap-alerts`
sits at FALSE and its content is ingested but never displayed (migration 009). Adopting IMD
for weather would have produced the same outcome — a panel that legally cannot render.
Open-Meteo grants redistribution in writing, with attribution, so its values can actually
reach a reader. It is also keyless, which removed the credential wait that has kept
`data-gov-in` stubbed since the start.

**This is not a claim that Open-Meteo outranks IMD as an authority.** HYD-5 stands: when
IMD's terms are confirmed it is inserted ahead of Open-Meteo in the chain and the panel
starts naming IMD. Warnings continue to come only from SACHET/IMD — a forecast is never an
alert (HYD-4).

**Costs:** a modelled value rather than a station observation, and an offshore source for
Indian weather, which is a poor look for a government-facing product and is exactly why the
IMD conversation still matters.

**Revisit if:** IMD confirms redistribution terms, or Open-Meteo changes its licence.

### 2026-09-06 — One station per district, at the headquarters

**Context:** a district is not a place with a temperature. Uttarkashi spans Gangotri at
3,000 m and valley floors below 1,000 m.

**Decision:** place the station at the district headquarters and carry the town's name —
'Gopeshwar', not 'Chamoli'. The panel says "Measured at Gopeshwar".

**Because:** the alternative, a polygon centroid, lands on an arbitrary uninhabited ridge.
The headquarters is a real town where people are, so the reading is true about somewhere.
Naming the place is the mechanism that keeps it honest: it never implies the figure covers
8,000 km² of mountain.

**Costs:** a single point per district, which is wrong for anyone in a high valley.

**Revisit if:** demand appears for named places within a district — the schema already
supports many stations per area, so this is seeding work, not a migration.

### `<TBD>` — Ordered source chain per metric, with the source shown *(superseded above)*

**Context:** IMD requires IP whitelisting with a multi-week lead time; OpenWeatherMap is
available immediately.
**Decision:** each metric has an ordered list of sources. Build against OpenWeatherMap, and
promote IMD above it when access lands, keeping OWM as fallback. The source actually used is
displayed with every value.
**Because:** it unblocks development immediately and turns the IMD approval into a
configuration change. Showing the source is required by the product's core promise anyway.
**Costs:** two connectors for the same metric, and values that differ slightly between sources
across a fallback boundary.
**Revisit if:** IMD access is denied outright, which would make OWM primary permanently.

*The chain principle survives; only the choice of first source changed. OpenWeatherMap was
never adopted — its free tier restricts redistribution, the same blocker as IMD.*

### `<TBD>` — Record measurements, never derive warnings

**Decision:** this module never creates an alert. Crossing a danger threshold renders as a
factual state, and the corresponding warning appears only if an authority issues one.
**Because:** issuing flood warnings is a government function. A platform that infers them takes
on responsibility it cannot discharge and may contradict the authority.
**Costs:** a river may visibly sit above danger level with no alert shown, which will look like
a bug and needs explaining in the UI.
**Revisit if:** an authority formally asks us to derive them.

## 9. Open questions

- [ ] Retention and rollup for `observations`. At 10-minute granularity across all stations this
      table outgrows everything else. Raw for 90 days then hourly rollups? Needs a decision
      before the first migration. — *owner:* `<TBD>`
- [ ] Does CWC or India-WRIS expose JSON behind the dashboard? An hour with the network tab
      decides between a connector and a scraper. — *owner:* `<TBD>`
- [ ] Which river stations matter for v1? The spec names Ganga and Alaknanda; the full CWC
      station list for Uttarakhand is unconfirmed. — *owner:* `<TBD>`
- [ ] Are published danger and warning levels available per station, or only for major sites?
      HYD-3 depends on this. — *owner:* `<TBD>`
- [ ] THDC and UJVNL publication format and frequency — confirms whether reservoir data is
      manual weekly entry. — *owner:* `<TBD>`
- [ ] Plausible-range bounds per metric for the validation in Failure modes. — *owner:* `<TBD>`
