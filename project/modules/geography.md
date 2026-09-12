# Module: `geography`

| | |
|---|---|
| **Owner** | `<TBD>` |
| **Status** | in progress — backend implemented, web not started |
| **Backend** | `backend/src/{models,repositories,controllers,routes}/area*.ts` |
| **Web** | `src/features/geography/` |
| **Mobile** | `mobile/src/features/map/` — the Map tab, and `mobile/src/features/areas/` |

---

## 1. Purpose

Owns the geographic spine of the platform: the hierarchy of areas (state → district → tehsil →
village), their boundaries, their bilingual names, and the registry of layers the map can draw.
Every other module attaches its rows to an `area_id` owned here, so this module defines the key
on which the entire product joins.

It holds no statistics, no measurements and no alerts — only *where things are*.

## 2. Boundaries

**Owns**
- The area hierarchy and its identity: codes, slugs, bilingual names, parent relationships
- Boundary geometry and centroids
- The map layer registry — which layers exist, their order, and which module supplies each

**Does not own**
- Any value measured about an area — see `indicators.md`, `hydromet.md`
- The *rendering* of the map; that is client-side composition. This module defines what can be
  drawn. Two clients now render it: the web app directly with `maplibre-gl`, and the mobile app
  with the same library inside a WebView, both fed by `GET /api/map/districts`.
- Live traffic geometry — Google-sourced and never stored, see `roads.md`

**Used by other modules via**
- `AreaRepository.findByCode` / `findBySlug` — resolve a URL segment to an area id
- `AreaRepository.resolveToDistricts(names)` — map free-text place names from an upstream feed
  onto district ids. `alerts` depends on this heavily; CAP feeds name places in prose.

**Depends on**

Nothing. This module is buildable on day one with no external approval.

## 3. Domain

### Entities

| Entity | Key fields | Notes |
|---|---|---|
| Area | `id, type, code, slug, name_en, name_hi, parent_id, division, headquarters_*, centroid_*, lgd_code, census_2011_code` | `code` is OUR stable identifier; `lgd_code`/`census_2011_code` are reserved and NULL. See §8. |
| AreaBoundary | `area_id, geojson, simplified_geojson, is_placeholder, source_note` | split from `Area` because geometry is large and rarely selected. See §8 for the JSON-vs-GEOMETRY decision. |
| MapLayer | `key, module, name_en, name_hi, display_order, default_visible` | registry only — the data comes from the owning module |

### Enums

```ts
enum AreaType { State = 'state', District = 'district', Tehsil = 'tehsil', Village = 'village' }
```

### Rules

| # | Rule |
|---|---|
| GEO-1 | Every area except the state root has a parent. The hierarchy is a tree, never a graph. |
| GEO-2 | `name_en` and `name_hi` are both required. An area cannot exist in one language only. |
| GEO-3 | `slug` is stable and URL-safe, derived from `name_en`, and never changes once shipped — district URLs are the product's most-shared links. |
| GEO-4 | `code` is our own stable identifier, unique per `type`, and is the join key today. `lgd_code` and `census_2011_code` are reserved for official identifiers and are backfilled, never swapped in. |
| GEO-5 | Boundary geometry is stored at full precision and served simplified. The map never receives full-precision polygons. |
| GEO-6 | Uttarakhand has 13 districts. `UTTARAKHAND_DISTRICT_COUNT` asserts this in the integration suite. |
| GEO-7 | Placeholder geometry is always flagged. `isPlaceholder` is on every boundary response, so no consumer can mistake generated geometry for a survey boundary. |

### Permissions

Read-only and fully public. There is no write API — areas change only by migration, because a
district boundary changing is a government act, not a user action.

| Action | Visitor | Officer | Operator |
|---|---|---|---|
| Read areas, boundaries, layers | ✅ | ✅ | ✅ |
| Write | ❌ | ❌ | ❌ (migration only) |

## 4. Data

| Table | Purpose | Notes |
|---|---|---|
| `areas` | the hierarchy | small and hot — cache the full district list in process |
| `area_boundaries` | geometry | RFC 7946 GeoJSON in a `JSON` column; never in a list `SELECT` |
| `map_layers` | layer registry | seeded, ~12 rows |

### Indexes and why

| Index | Serves |
|---|---|
| `uq_area_type_code (type, code)` | lookup by our stable code; later, joins by backfilled official code |
| `uq_area_slug (slug)` | URL resolution — the most frequent lookup in the product |
| `idx_area_parent (parent_id, type, id)` | "tehsils of a district", "villages of a tehsil" |
| `idx_area_lgd`, `idx_area_census` | joining upstream datasets once official ids are backfilled |

### Migrations

| # | File | What |
|---|---|---|
| 001 | `001-create-areas.sql` | hierarchy + boundaries + layer registry |
| 002 | `002-seed-state-and-districts.sql` | the state row and 13 districts, bilingual |
| 003 | `003-seed-map-layers.sql` | the 12-row layer registry |

Placeholder boundaries and the demo tehsil/village hierarchy are created by `npm run db:seed`,
**not** by a migration — they are invented data and must never reach production.

The real village list is deferred with the `migration` module — it is large and its only v1
consumer would be that module. The schema and endpoints exist now; only the data is demo.

## 5. API

| Method | Path | Auth | Cache | Paginated |
|---|---|---|---|---|
| GET | `/api/areas/districts` | none | 24h | no |
| GET | `/api/areas/districts/:slug` | none | 24h | no |
| GET | `/api/areas/:slug` | none | 24h | no |
| GET | `/api/areas/:slug/boundary` | none | 24h | no |
| GET | `/api/areas/:slug/children?type=` | none | 24h | no |
| GET | `/api/map/layers` | none | 24h | no |

### `GET /api/areas/districts`

| | |
|---|---|
| Auth | none |
| Cache | `cacheMiddleware(CACHE_TTL.STATIC)` — 24h; this data changes by migration only |

**Response 200** — array of `AreaSchema`, both names, centroid, no geometry.

**Errors**

| Constant | Code | HTTP | When |
|---|---|---|---|
| `DATABASE_ERROR` | `10001` | 500 | pool failure |

### `GET /api/areas/:slug`

**Errors**

| Constant | Code | HTTP | When |
|---|---|---|---|
| `AREA_NOT_FOUND` | `40001` | 404 | no area with that slug |
| `INVALID_PARAMS` | `10007` | 400 | malformed slug |

### Error code range

`40xxx` — allocated to this module. Codes are immutable once shipped.

| Constant | Code | HTTP |
|---|---|---|
| `AREA_NOT_FOUND` | `40001` | 404 |
| `BOUNDARY_NOT_AVAILABLE` | `40002` | 404 |
| `AREA_TYPE_NOT_SUPPORTED` | `40003` | 400 |

## 6. UI

| Surface | Route | Rendering | Notes |
|---|---|---|---|
| Web | `/[locale]` | Server Component + ISR | the state map is the product's front door — SEO critical |
| Web | `/[locale]/district/[slug]` | Server Component + ISR | shell and metadata; live panels stream in |

### Data hooks

| Hook | Query key | staleTime |
|---|---|---|
| `useDistricts` | `areaKeys.districts()` | `STALE_TIME.STATIC` (24h) |
| `useArea(slug)` | `areaKeys.detail(slug)` | `STALE_TIME.STATIC` |

## 7. Failure modes

| Failure | User sees | Handling |
|---|---|---|
| Boundary geometry missing for an area | district list and data render; the map shows a marker at the centroid instead of a polygon | degrade, do not blank the page |
| Unknown slug | 404 page with a district list | `notFound()` |
| Map tile provider unreachable | district polygons render on a blank ground | boundaries are ours; tiles are not |

## 8. Decisions

### 2026-09-03 — Store boundaries as GeoJSON in a `JSON` column, not as Postgres `GEOMETRY`

**Context:** this doc originally specified a `GEOMETRY` column. The v1 endpoints are
list districts, get district, get boundary, get layers — none of which is a spatial query.
**Decision:** store RFC 7946 GeoJSON in a `JSON` column and serve it verbatim.
**Because:** it is what the client actually consumes, so there is no conversion on the read
path, no SRID axis-order trap, and the placeholder geometry is human-readable in the database.
`GEOMETRY` would buy spatial indexing that nothing in v1 uses.
**Costs:** no point-in-polygon or nearest-district query. When `alerts` needs to resolve a
coordinate to a district, a `GEOMETRY SRID 4326` column plus a `SPATIAL INDEX` is added
alongside — expand, backfill, switch reads.
**Revisit if:** any module needs a spatial query. `alerts` probably will.

### 2026-09-03 — Ship our own `code` as the join key; reserve the official ones

**Context:** whether LGD or 2011 census codes are the join key is still open (§9), and it
blocks every ingestion connector — but it does not block geography itself.
**Decision:** `code` (`UK-DD`, `UK-AL`, …) is ours, stable, and the join key today.
`lgd_code` and `census_2011_code` are nullable, indexed, and left NULL.
**Because:** it unblocks all downstream work now, and the answer arrives as a backfill rather
than a schema change. `code` and `slug` never change, so public URLs are safe either way.
**Costs:** connectors written before the backfill will need a mapping step.
**Revisit if:** never — the official codes are added beside ours, not instead of them.

### 2026-09-03 — Relative `.js` imports rather than the guideline's `@alias/file.ts` style

**Context:** `guidelines/backend/` shows imports like `@config/env.ts`. TypeScript path
aliases are erased at compile time, so a plain `tsc` build plus `node dist/server.js` cannot
resolve them without a runtime loader or a bundler — and no bundler is on the approved list.
**Decision:** relative imports with explicit `.js` extensions, standard Node ESM.
**Because:** it builds and runs with nothing but `tsc` and `node`, which is the least
surprising setup for the next person.
**Costs:** deviates from the written guideline; deeper paths are more verbose.
**Revisit if:** the team adopts subpath imports (`#config/*` in `package.json`), which would
restore alias-style imports without a loader. Belongs in
`guidelines/common/15-known-deviations.md`.

### `<TBD>` — Render maps with MapLibre GL, not the Google Maps SDK

**Context:** the product needs a district-boundary choropleth with several toggleable layers,
and separately needs Google's live traffic (see `roads.md`).
**Decision:** MapLibre GL renders our own boundary and layer data. Google's Maps JavaScript API
is used **only** for the traffic layer, on the roads surface.
**Because:** our boundary data is ours and we must be free to store and serve it. Building the
whole map on Google would drag every layer under their caching restrictions.
**Costs:** two map technologies in one codebase, and the traffic view is visually distinct from
the rest of the product.
**Revisit if:** the traffic layer proves unusable alongside a separate map, or Google's terms
change.
**Status:** proposed — not on the approved-libraries list, needs tech-lead approval.

### `<TBD>` — Use `next-intl` for Hindi/English

**Context:** the portal is bilingual and no i18n library is on the approved list.
**Decision:** `next-intl`, with `/[locale]` routing.
**Because:** it is the App-Router-native option and handles locale routing, message catalogs and
formatting in one dependency rather than three.
**Costs:** every route gains a `[locale]` segment; a new dependency to maintain.
**Revisit if:** a third language is ever required, or Next.js ships adequate built-in i18n.
**Status:** proposed — needs tech-lead approval per `common/13` §6.

## 9. Open questions

- [ ] Boundary source: Survey of India, Bhuvan, or OSM extracts? Licensing differs sharply and
      determines whether we may serve the geometry publicly. — *owner:* `<TBD>`
- [ ] Which official code system to backfill — LGD codes or 2011 census codes? Upstream
      datasets use both and they do not agree. No longer blocks geography (see §8), but still
      blocks every ingestion connector. — *owner:* `<TBD>`
- [ ] Are tehsils needed in v1, or is district → village sufficient? No v1 feature currently
      uses them. — *owner:* `<TBD>`
- [ ] Confirmed Hindi names for all 13 districts, from an official source rather than
      transliteration. Currently seeded from common usage and **not verified against an
      official gazetteer**. — *owner:* `<TBD>`
- [ ] Real tehsil and village lists. The schema and endpoints are live; the data is `DEMO-`
      prefixed placeholder. — *owner:* `<TBD>`
- [ ] District centroids are headquarters coordinates, not polygon centroids. Fine for map
      pins, wrong for label placement — revisit with official boundaries. — *owner:* `<TBD>`
