# Module: `hydromet`

| | |
|---|---|
| **Owner** | `<TBD>` |
| **Status** | planned |
| **Backend** | `src/controllers/observation.controller.ts`, `src/repositories/observation.repository.ts`, `src/services/ingestion/imd.connector.ts` |
| **Web** | `src/features/weather/` |
| **Mobile** | not in this repo |

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
}
enum ThresholdLevel { Warning = 'warning', Danger = 'danger', HighestFloodLevel = 'hfl' }
```

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
| 008 | `008-create-stations.sql` | stations + thresholds |
| 009 | `009-create-observations.sql` | time series + forecasts |

## 5. API

| Method | Path | Auth | Cache | Paginated |
|---|---|---|---|---|
| GET | `/api/areas/:slug/weather` | none | 10m | no |
| GET | `/api/stations` | none | 1h | cursor |
| GET | `/api/stations/:id/series` | none | 10m | no |
| GET | `/api/rivers/levels` | none | 10m | no |
| GET | `/api/reservoirs` | none | 1h | no |

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

### `<TBD>` — Ordered source chain per metric, with the source shown

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
