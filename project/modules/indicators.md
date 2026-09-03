# Module: `indicators`

| | |
|---|---|
| **Owner** | `<TBD>` |
| **Status** | planned |
| **Backend** | `src/controllers/indicator.controller.ts`, `src/repositories/indicator.repository.ts` |
| **Web** | `src/features/indicators/`, `src/features/comparison/` |
| **Mobile** | not in this repo |

---

## 1. Purpose

Owns every comparable government statistic about an area: demography, literacy and education,
health facilities, economy and industry, connectivity. One shape — *this indicator, for this
area, at this vintage, from this source* — serves the state overview, every district dashboard,
the two-district comparison, and the trend views.

This module is deliberately broad. The specification lists demographics, education, health,
economy and transparency as separate features, but they are one data structure with one set of
rules; splitting them would produce five copies of the same doc.

## 2. Boundaries

**Owns**
- The indicator catalogue: keys, bilingual labels, units, precision, direction of "good"
- Indicator values per area and vintage
- Comparison between areas, and trend series over vintages

**Does not own**
- Anything measured continuously — see `hydromet.md`. An indicator is a published statistic; an
  observation is a sensor reading. Literacy rate is an indicator; today's rainfall is not.
- Anything with an expiry — see `alerts.md`
- Where the numbers came from — see `datasets.md`

**Used by other modules via**
- `IndicatorRepository.latestFor(areaIds, keys)` — used by the state overview

**Depends on**

| Module | For | How |
|---|---|---|
| `geography` | resolving and validating area ids | `AreaRepository.findByCode` |
| `datasets` | provenance, vintage, freshness | `SourceRepository.findByIds` |

## 3. Domain

### Entities

| Entity | Key fields | Notes |
|---|---|---|
| Indicator | `key, category, label_en, label_hi, unit, decimals, higher_is_better, scope` | the catalogue; seeded, not ingested |
| IndicatorValue | `indicator_key, area_id, vintage, value, source_id, fetched_at` | the fact table |

### Enums

```ts
enum IndicatorCategory {
  Demography = 'demography', Education = 'education', Health = 'health',
  Economy = 'economy', Industry = 'industry', Connectivity = 'connectivity',
}
enum IndicatorScope { State = 'state', District = 'district', Village = 'village' }
```

`higher_is_better` is nullable on purpose: literacy rate has a direction, population does not,
and a comparison view that colours population green is meaningless.

### Rules

| # | Rule |
|---|---|
| IND-1 | An indicator value is uniquely identified by `(indicator_key, area_id, vintage)`. Re-ingesting the same vintage updates in place. |
| IND-2 | `vintage` is required and displayed with the value everywhere, without exception. Census figures may be many years old and must never read as current. |
| IND-3 | Values from different vintages are never compared or shown side by side without both vintages visible. |
| IND-4 | Comparison is only permitted between areas of the same `AreaType`. Comparing a district to a village is a client error, not an empty result. |
| IND-5 | A comparison shows an indicator only when both areas have a value for it. A one-sided row is misleading and is omitted, with a count of omitted indicators shown. |
| IND-6 | Ranking is computed only over areas that all have the same vintage for that indicator. |
| IND-7 | Derived values (per-capita, density, rates) are computed at read time from stored base values, never stored. A stored derived value goes stale silently when its base updates. |

### Permissions

Fully public, read-only. No write API — values arrive by ingestion only.

## 4. Data

| Table | Purpose | Notes |
|---|---|---|
| `indicators` | catalogue | seeded; ~40 rows |
| `indicator_values` | fact table | the largest table in v1; grows with areas × indicators × vintages |

### Indexes and why

| Index | Serves |
|---|---|
| `pk (indicator_key, area_id, vintage)` | idempotent upsert (IND-1) |
| `idx_value_area_key_vintage (area_id, indicator_key, vintage DESC)` | the district dashboard: latest value per indicator for one area |
| `idx_value_key_vintage_value (indicator_key, vintage, value DESC)` | rankings and the state overview |

The second index covers the filter and the vintage ordering together, per
`guidelines/backend/12-pagination.md` §6.

### Migrations

| # | File | What |
|---|---|---|
| 005 | `005-create-indicators.sql` | catalogue + values |
| 006 | `006-seed-indicator-catalogue.sql` | keys, bilingual labels, units |

## 5. API

| Method | Path | Auth | Cache | Paginated |
|---|---|---|---|---|
| GET | `/api/indicators` | none | 24h | no |
| GET | `/api/areas/:slug/indicators` | none | 1h | no |
| GET | `/api/indicators/compare` | none | 1h | no |
| GET | `/api/indicators/:key/series` | none | 6h | no |
| GET | `/api/indicators/:key/ranking` | none | 6h | cursor |

### `GET /api/indicators/compare`

| | |
|---|---|
| Auth | none |
| Cache | `cacheMiddleware(CACHE_TTL.INDICATORS)` |

**Query** — `areas: string` (exactly two slugs, comma-separated), `categories?: string[]`
**Response 200** — indicator rows present for *both* areas, each with both values, both
vintages, both source ids, plus `omittedCount`.

**Errors**

| Constant | Code | HTTP | When |
|---|---|---|---|
| `INVALID_QUERY_PARAMETER` | `10003` | 400 | not exactly two slugs |
| `AREA_NOT_FOUND` | `40001` | 404 | either slug unknown |
| `COMPARISON_AREA_TYPE_MISMATCH` | `50003` | 400 | the two areas are different types (IND-4) |

### Error code range

`50xxx` — allocated to this module.

| Constant | Code | HTTP |
|---|---|---|
| `INDICATOR_NOT_FOUND` | `50001` | 404 |
| `INDICATOR_VALUE_NOT_AVAILABLE` | `50002` | 404 |
| `COMPARISON_AREA_TYPE_MISMATCH` | `50003` | 400 |
| `COMPARISON_REQUIRES_TWO_AREAS` | `50004` | 400 |
| `INDICATOR_SCOPE_NOT_SUPPORTED` | `50005` | 400 |

## 6. UI

| Surface | Route | Rendering | Notes |
|---|---|---|---|
| Web | `/[locale]` | Server Component + ISR | state overview tiles |
| Web | `/[locale]/district/[slug]` | Server Component + ISR | grouped by category; SEO critical |
| Web | `/[locale]/compare` | Client Component | two district pickers, state in the URL so a comparison is shareable |
| Web | `/[locale]/indicators/[key]` | Server Component + ISR | ranking and trend for one indicator |

Every rendered value carries a `<SourceBadge>` and its vintage. A number without both is a
blocking review comment.

### Data hooks

| Hook | Query key | staleTime |
|---|---|---|
| `useAreaIndicators(slug)` | `indicatorKeys.byArea(slug)` | 1h |
| `useComparison(a, b)` | `indicatorKeys.compare(a, b)` | 1h |
| `useIndicatorSeries(key, slug)` | `indicatorKeys.series(key, slug)` | 6h |

## 7. Failure modes

| Failure | User sees | Handling |
|---|---|---|
| Indicator has no value for a district | the row is absent, with a count of unavailable indicators | never render a `0` or a dash where data is simply missing |
| Only one area in a comparison has the value | row omitted, counted (IND-5) | |
| All values are years old | the vintage badge, prominently | working as designed — the honesty is the product |
| Source retracted | values from that source disappear | driven by `may_redistribute` in `datasets`, not a code change |

## 8. Decisions

### `<TBD>` — One `indicators` module rather than five domain modules

**Context:** the specification lists demography, education, health, economy and transparency as
separate features.
**Decision:** one module, one fact table, `category` as a column.
**Because:** they share a shape, a permission model, a comparison engine and a provenance
contract. Five modules would be five copies of this document differing only in the category.
**Costs:** the module is broad, and the doc will need splitting if any category grows real
rules of its own — health facility *locations*, for instance, are points rather than statistics.
**Revisit if:** a category needs its own entity rather than a value, which health facilities
plausibly will.

### `<TBD>` — Compute derived values at read time

**Decision:** per-capita, density and rates are computed in SQL at read time from stored bases.
**Because:** a stored derived value silently goes stale when its base is re-ingested, and there
is no way to detect it.
**Costs:** slightly heavier queries; mitigated by response caching.
**Revisit if:** a derivation becomes too expensive to compute per request.

## 9. Open questions

- [ ] The full v1 indicator catalogue — which keys, in which categories, with which units. Needs
      to be fixed before the seed migration. — *owner:* `<TBD>`
- [ ] Health facilities and educational institutions are **locations**, not statistics. Do they
      live here as counts, or as point entities with their own table? The spec asks for both a
      count and a map of facility locations. Recommend: counts here, points as a follow-up
      decision. — *owner:* `<TBD>`
- [ ] Per-capita income source is unconfirmed — the Directorate of Economics & Statistics has no
      branded site and publishes PDFs. — *owner:* `<TBD>`
- [ ] Confirm the current census position. If 2011 is the latest complete count, every
      demographic figure is roughly fifteen years old and the vintage treatment must be
      prominent rather than subtle. — *owner:* `<TBD>`
- [ ] Hindi labels for the indicator catalogue, from an official glossary rather than
      translation. — *owner:* `<TBD>`
