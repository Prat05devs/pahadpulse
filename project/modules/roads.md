# Module: `roads`

| | |
|---|---|
| **Owner** | `<TBD>` |
| **Status** | planned |
| **Backend** | `src/controllers/road.controller.ts`, `src/repositories/road.repository.ts` |
| **Web** | `src/features/roads/` |
| **Mobile** | not in this repo |

---

## 1. Purpose

Owns the road network and its current usability: which highways and routes exist, which are
open, which are closed or blocked, and why. In a state where a single landslide can cut off a
valley, "can I get there today" is one of the two questions this product exists to answer.

The module has an unusual constraint that shapes everything: **it has two data paths.** Road
identity and closures are ours, stored and served. Live traffic congestion is Google's, rendered
in the browser and never persisted.

## 2. Boundaries

**Owns**
- Road segment identity and geometry: national highways, state highways, key routes
- Segment status — open, restricted, closed — with cause and reported time
- The closure history

**Does not own**
- Live traffic congestion. Google's content cannot be stored (see §8); it is rendered
  client-side and discarded.
- The public *notice* about a closure — see `alerts.md`. A closure is a road fact; the alert is
  the warning about it. Both exist and reference each other.
- Landslide incidents as disaster events — those are alerts. Here, a landslide is only a *cause*
  on a segment.

**Used by other modules via**
- `RoadRepository.closedCountByArea(areaIds)` — the state overview's closed-roads counter

**Depends on**

| Module | For | How |
|---|---|---|
| `geography` | placing segments in districts | `AreaRepository.resolveToDistricts` |
| `datasets` | provenance and freshness | connector interface |

## 3. Domain

### Entities

| Entity | Key fields | Notes |
|---|---|---|
| RoadSegment | `id, ref, name_en, name_hi, classification, geometry, from_label, to_label, source_id` | `ref` is the official designation, e.g. `NH-7` |
| SegmentArea | `segment_id, area_id` | a highway crosses districts |
| SegmentStatus | `segment_id, status, cause, reported_at, expected_clear_at, note, language, source_id, fetched_at` | current status; history retained |

### Enums

```ts
enum RoadClassification { NationalHighway = 'nh', StateHighway = 'sh', District = 'district', Other = 'other' }
enum RoadStatus { Open = 'open', Restricted = 'restricted', Closed = 'closed', Unknown = 'unknown' }
enum ClosureCause { Landslide = 'landslide', Snow = 'snow', Flood = 'flood', Construction = 'construction', Accident = 'accident', Other = 'other' }
```

`RoadStatus.Unknown` is a real and common state. Most of Uttarakhand's road network has no
status feed at all, and claiming `open` for an unmonitored road is the dangerous default.

### Rules

| # | Rule |
|---|---|
| RD-1 | Absence of a closure report is **not** evidence a road is open. Unmonitored segments are `unknown` and are rendered distinctly from `open`. |
| RD-2 | Stored road geometry comes only from OSM, NHAI or PWD. Google-derived geometry is never persisted (see §8). |
| RD-3 | Live traffic is rendered client-side through the Maps JavaScript API only. No server call to Google, no traffic value in the database, no traffic in any API response. |
| RD-4 | Status changes append to history; the current status is the newest row. Closure history is the product's most useful analytical asset. |
| RD-5 | Every status carries its reporting authority and report time. "Closed" without a timestamp is worthless during an incident. |
| RD-6 | Closure notes are stored in their source language with `language`, never translated (as ALR-2). |
| RD-7 | `expected_clear_at` is displayed as an authority's estimate, explicitly attributed, never as a promise. |

### Permissions

Fully public, read-only. No write API — status arrives by ingestion only.

## 4. Data

| Table | Purpose | Notes |
|---|---|---|
| `road_segments` | network | `geometry` is `LINESTRING`; never in a list `SELECT` |
| `segment_areas` | district mapping | composite PK |
| `segment_statuses` | status + history | append-only |

### Indexes and why

| Index | Serves |
|---|---|
| `uq_segment_ref_source (ref, source_id)` | idempotent segment upsert |
| `idx_status_segment_reported (segment_id, reported_at DESC)` | current status per segment |
| `idx_segment_area (area_id)` on `segment_areas` | district dashboard: segments here |

Fetching the current status of every segment is a per-segment latest-row query and will need a
covering approach or a materialised `current_status_id` on the segment if it becomes hot.

### Migrations

| # | File | What |
|---|---|---|
| 010 | `010-create-road-segments.sql` | segments + area mapping |
| 011 | `011-create-segment-statuses.sql` | status history |

## 5. API

| Method | Path | Auth | Cache | Paginated |
|---|---|---|---|---|
| GET | `/api/roads/status` | none | 5m | cursor |
| GET | `/api/roads/closed` | none | 5m | cursor |
| GET | `/api/areas/:slug/roads` | none | 5m | cursor |
| GET | `/api/roads/:id` | none | 5m | — |

No traffic endpoint exists, and none may be added (RD-3).

### `GET /api/roads/closed`

**Query** — `areaSlug?`, `cause?`, `cursor?`, `limit?` (1..100, default 20)
**Response 200** — `paginatedEnvelope(SegmentStatusSchema)` — ref, name, districts, cause,
reported time, expected clear time, authority.

**Errors**

| Constant | Code | HTTP | When |
|---|---|---|---|
| `INVALID_QUERY_PARAMETER` | `10003` | 400 | bad cursor, limit or cause |
| `AREA_NOT_FOUND` | `40001` | 404 | unknown `areaSlug` |

### Error code range

`80xxx` — allocated to this module.

| Constant | Code | HTTP |
|---|---|---|
| `ROAD_SEGMENT_NOT_FOUND` | `80001` | 404 |
| `ROAD_STATUS_NOT_AVAILABLE` | `80002` | 404 |
| `ROAD_CLASSIFICATION_NOT_SUPPORTED` | `80003` | 400 |

## 6. UI

| Surface | Route | Rendering | Notes |
|---|---|---|---|
| Web | `/[locale]/roads` | Client Component | closure list plus the map |
| Web | `/[locale]/roads/traffic` | Client Component | Google Maps JS with the traffic layer — **the only Google surface in the product** |
| Web | `/[locale]/district/[slug]` | Server Component | closures in this district |
| Web | `/[locale]` | Server Component | closed-roads counter |

The traffic view is visually distinct from the rest of the product because it is a different map
technology. That is a consequence of the licensing constraint, not an oversight, and the UI
should label it as a live Google traffic view rather than pretending it is the same map.

Traffic colours follow the specification — green clear, yellow slow, red congested — and are
Google's own rendering; we do not restyle them.

### Data hooks

| Hook | Query key | staleTime |
|---|---|---|
| `useClosedRoads(filters)` | `roadKeys.closed(filters)` | 5m |
| `useAreaRoads(slug)` | `roadKeys.byArea(slug)` | 5m |

There is no hook for traffic. It is a map layer, not application data.

## 7. Failure modes

| Failure | User sees | Handling |
|---|---|---|
| No status feed for a segment | `unknown`, rendered distinctly from open, with an explanation | RD-1 — the most important failure mode in this module |
| Closure feed unreachable | last-known statuses with report times and a staleness badge | never flip to `open` on missing data |
| Google Maps key invalid or over quota | the traffic view degrades to the network map with no traffic layer | closures still render — they are ours |
| Segment cannot be mapped to a district | appears state-wide, not on any district page | queued for operators |

## 8. Decisions

### `<TBD>` — Two data paths: stored network, live-only traffic

**Context:** the sourcing strategy is scheduled ingestion into Postgres, but Google Maps Platform
terms permit only limited caching of their content, and the product needs Google's live traffic.
**Decision:** road identity, geometry and closures come from OSM, NHAI and PWD, and are stored
and served by our API. Google's traffic is rendered client-side via the Maps JavaScript API
traffic layer and never touches the server or the database. No API endpoint returns traffic.
**Because:** the boundary must be structural rather than a convention, because a future engineer
adding "just a small traffic cache" would create a terms violation invisible in review.
**Costs:** traffic is unavailable offline and cannot be analysed historically — no "which
routes congest during Char Dham season", which is a feature someone will ask for.
**Revisit if:** a licensed traffic source with redistribution rights becomes available, or
Google's terms change. Verify the current terms before building either path.

## 9. Open questions

- [x] Does any Uttarakhand authority publish road closures? **Yes — PWD's MISPWD dashboard**
      (2026-09-26). It is a web page, not an API; see §10. Reproduction permission from PWD is
      the remaining blocker. — *owner:* `<TBD>`
- [ ] Which segments are in v1? Full OSM highway extract, or a curated set of the routes that
      matter (Char Dham routes, NH-7, NH-34)? Recommend curated — a complete network with no
      status data is noise. — *owner:* `<TBD>`
- [ ] Confirm Google Maps Platform terms on caching and display before building the traffic
      view, and log the finding here. — *owner:* `<TBD>`
- [ ] Are alternative-route suggestions in scope? The specification mentions them; they imply a
      routing engine, which is a much larger commitment than a status board. Recommend out of
      v1. — *owner:* `<TBD>`


## 10. PWD road closures (collecting; not displayed until permission)

**Source.** `pwd-uk-road-closures` — https://mis.pwduk.in/pwd/roadClosure, the PWD dashboard
where PWD, PMGSY, BRO, NHIDCL and NHAI divisions report closures: road name and PWD road id,
kilometre markers, time closed, the division's expected reopening, status, division, district,
road type. Verified 2026-09-26: 2,328 closures since 1 April, 54 closed, 6 partially opened.

**Permission.** PWD's website policy: material "may be reproduced free of charge after taking
proper permission by sending a mail to us", accurately and with the source prominently
acknowledged. Migration 064 seeds the source `is_enabled = TRUE` (collected every 10 minutes,
so the reader is proven on real data — product owner's decision, 2026-09-26) and
`may_redistribute = FALSE` (never served, as for IMD alerts). After written permission, one
migration sets `may_redistribute = TRUE` and records who granted it and when. Contacts: `eicpwduk@nic.in`, `cehq.pwduk@gov.in`.

**Design change from §3–§5.** The planned model was segments with geometry and appended status
history. PWD reports closures of *its own road register* (PWD road ids, km markers) with no
geometry, so they are stored as `road_closures` — one row per PWD closure, upserted — rather
than forced onto OSM segments. Linking closures to `road_routes`/segments is future work. RD-4's
full history is partial: a row keeps its current status plus `status_changed_at`.

**Freshness — the rule this reader exists to keep.** A reopened road shown as closed is
misinformation, as much as the reverse. So:

- Polled every **10 minutes**. Each fetch reaches back to the **oldest road still not open**
  (at least 7 days, at most a year), so a long-running closure's reopening is seen on the next
  poll. A season is ~300 KB gzipped on the wire.
- The API serves closures only while the last successful check is **under 30 minutes old**;
  otherwise `available: false, unavailableReason: 'stale'` and the UI must not show a list.
- A closure is current only if the **latest** check saw it; one that disappears from PWD's
  dashboard stops being shown and is never flipped to open (RD-1).
- Roads that **reopened in the last 24 hours** are listed as reopened, with the time Pahad Pulse
  first saw the change (PWD publishes no reopening time), so someone who saw the closure earlier
  sees it clear.
- The division's expected reopening is shown as their estimate (RD-7), flagged when it has passed.
- Every surface states that statuses are as reported to PWD and a road can reopen before the
  report is updated.

**Personal data.** The dashboard's "Informed By" column (officials' names and ID numbers) is
never parsed or stored; the test fixture is redacted.

**API.** `GET /api/roads/closures?district=<slug>` → `{ available, unavailableReason
('not_permitted' | 'never_checked' | 'stale' | null), checkedAt, closures, recentlyReopened,
source }`. Cached 2 minutes.
