# Module: `tourism`

| | |
|---|---|
| **Owner** | `<TBD>` |
| **Status** | planned — most at risk of having no data source, see §9 |
| **Backend** | `src/controllers/tourism.controller.ts`, `src/repositories/tourism.repository.ts` |
| **Web** | `src/features/tourism/` |
| **Mobile** | not in this repo |

---

## 1. Purpose

Owns tourist and pilgrim load: how many people are at a destination, how that compares to what
the destination can absorb, and what the route conditions to it are. The Char Dham yatra
concentrates millions of visitors into a few months on a handful of mountain routes, and
carrying capacity is the specification's stated reason for this module existing.

## 2. Boundaries

**Owns**
- Destinations: the Char Dham sites and other tourist locations, with their carrying capacity
- Visitor counts per destination over time
- Accommodation availability, if a source is ever obtained

**Does not own**
- Route status to a destination — see `roads.md`. This module links to a route's status; it
  does not track it.
- Weather at a destination — see `hydromet.md`
- Yatra advisories and route warnings — see `alerts.md`
- Annual tourist-arrival statistics used for district comparison — those are indicators

**Used by other modules via**
- `TourismRepository.currentLoadByArea(areaIds)` — the state overview's live tourism counter

**Depends on**

| Module | For | How |
|---|---|---|
| `geography` | placing destinations in districts | `AreaRepository.findBySlug` |
| `datasets` | provenance and freshness | connector interface |

## 3. Domain

### Entities

| Entity | Key fields | Notes |
|---|---|---|
| Destination | `id, slug, type, name_en, name_hi, area_id, lat, lng, daily_capacity, capacity_source_id` | capacity is an official figure, attributed like any other |
| VisitorCount | `destination_id, counted_on, count, basis, source_id, fetched_at` | daily granularity |
| Accommodation | `destination_id, observed_at, total_rooms, available_rooms, source_id` | only if a source is obtained |

### Enums

```ts
enum DestinationType { CharDham = 'char_dham', HillStation = 'hill_station', Trek = 'trek', Wildlife = 'wildlife', Religious = 'religious', Other = 'other' }
enum CountBasis { Registration = 'registration', Footfall = 'footfall', Estimate = 'estimate' }
enum LoadState { Low = 'low', Moderate = 'moderate', High = 'high', AtCapacity = 'at_capacity', Unknown = 'unknown' }
```

`CountBasis` exists because registrations and actual footfall are different numbers and must
never be silently mixed. A registration count is a plan; footfall is what happened.

### Rules

| # | Rule |
|---|---|
| TOU-1 | A visitor count is always displayed with its basis. Registrations and footfall are never summed or compared as if equivalent. |
| TOU-2 | Load state is computed at read time from count against capacity, never stored. |
| TOU-3 | Where capacity is unknown, load state is `unknown`. A raw count with no capacity context is shown as a number only, never as a load indicator. |
| TOU-4 | Carrying capacity is an official published figure with a source. The platform never estimates one. |
| TOU-5 | "Live" means the freshest available count with its timestamp visible. If the best available figure is yesterday's registrations, the UI says so rather than implying a real-time count. |
| TOU-6 | The platform states load; it never advises whether to travel. That is an authority's call, and advisories come through `alerts`. |

### Permissions

Fully public, read-only.

## 4. Data

| Table | Purpose | Notes |
|---|---|---|
| `destinations` | registry | small, seeded |
| `visitor_counts` | daily counts | one row per destination per day per basis. **Not built** — no daily feed obtained yet. |
| `destination_annual_visitors` | published yearly totals | **Built.** One row per destination per year. |
| `accommodation_snapshots` | availability | only if a source is obtained |

### Why annual totals are a separate table

`visitor_counts` is daily, keyed by `counted_on` with a registration/footfall basis. What the
state actually publishes today is a yearly total per shrine. Writing 998,956 into a row dated
2019-12-31 would claim a million people reached Kedarnath on one December day — false, and
exactly what a daily table invites. So `destination_annual_visitors` keys on `year`, which is
the precision the figure has, and `visitor_counts` stays free for the daily feed when one is
obtained.

The `destinations` registry was built alongside it so both tables name the same shrine rather
than accumulating a second list of five spellings of Kedarnath.

`daily_capacity` is NULL on every seeded row and is constrained to move with its source:
TOU-4 forbids estimating one, none is published, and TOU-3 therefore leaves load `unknown`.
The tourism page says outright that it cannot tell you how busy a shrine is today.

The 2020 and 2021 figures are pandemic years — the yatra was suspended, then capped — and
arrivals fell roughly tenfold. They are stored and displayed as published, never smoothed; a
test asserts the collapse so a future seed cannot interpolate it away.

### Indexes and why

| Index | Serves |
|---|---|
| `uq_count (destination_id, counted_on, basis)` | idempotent upsert; enforces TOU-1 at the schema level |
| `idx_count_dest_date (destination_id, counted_on DESC)` | latest count and the season chart |
| `idx_destination_area (area_id)` | district dashboard |

### Migrations

| # | File | What |
|---|---|---|
| 043 | `043-destinations-and-annual-visitors.sql` | `destinations` + `destination_annual_visitors` |
| 044 | `044-seed-char-dham-visitors.sql` | the five shrines and their 2019-2021 arrivals |
| 045 | `045-widen-tourism-source-attribution.sql` | corrects text 040 wrote before arrivals existed |

`visitor_counts` has no migration yet — it waits on a daily feed. The numbers 012/013 in an
earlier draft of this doc were never written.

Accommodation tables are deliberately not in the initial migration — see §9.

## 5. API

| Method | Path | Auth | Cache | Paginated | Status |
|---|---|---|---|---|---|
| GET | `/api/tourism/pilgrim-arrivals` | none | 24h | no | **built** |
| GET | `/api/tourism/summary` | none | 15m | no | planned |
| GET | `/api/tourism/destinations` | none | 15m | no | planned |
| GET | `/api/tourism/destinations/:slug` | none | 15m | — | planned |
| GET | `/api/tourism/char-dham` | none | 15m | no | planned |
| GET | `/api/areas/:slug/tourism` | none | 15m | no | planned |

Everything marked planned needs a daily visitor feed, which does not exist yet. The web app
called `/tourism/char-dham` and `/destinations` before either was built, so the tourism page
rendered its error state on every visit; it now reads `pilgrim-arrivals`.

### `GET /api/tourism/pilgrim-arrivals`

**Response 200** — `{ destinations, totals, years }`. Yearly arrivals per shrine with the
district each sits in, plus per-year totals summed from the destinations actually served
(DS-6), and the years present, oldest first.

Named for arrivals rather than the Char Dham because Hemkund Sahib is in the state's figures
and is not one of the four dhams — naming the endpoint for the dhams would make the fifth row
look like a mistake. It is carried as `religious`, not relabelled a fifth dham.

No load state is exposed: TOU-3 makes load `unknown` where no capacity is published, and none
is.

### `GET /api/tourism/char-dham` (planned)

The specification's headline tourism view: all four sites with their latest counts, basis,
capacity, computed load state, and a link to each route's status in `roads`.

**Errors**

| Constant | Code | HTTP | When |
|---|---|---|---|
| `VISITOR_COUNT_NOT_AVAILABLE` | `85002` | 404 | no count within the acceptable window for any site |

### Error code range

`85xxx` — allocated to this module.

| Constant | Code | HTTP |
|---|---|---|
| `DESTINATION_NOT_FOUND` | `85001` | 404 |
| `VISITOR_COUNT_NOT_AVAILABLE` | `85002` | 404 |
| `CAPACITY_NOT_DEFINED` | `85003` | 404 |
| `ACCOMMODATION_NOT_AVAILABLE` | `85004` | 404 |

## 6. UI

| Surface | Route | Rendering | Notes |
|---|---|---|---|
| Web | `/[locale]/tourism` | Client Component | state tourism view |
| Web | `/[locale]/tourism/char-dham` | Client Component | the four sites — the module's headline screen |
| Web | `/[locale]/district/[slug]` | Server Component | destinations and load in this district |
| Web | `/[locale]` | Server Component | live tourism counter |

Load state is shown as a state, not a bare percentage, and the count's timestamp and basis sit
next to it. During yatra season this is the most-read screen in the product and the one most
likely to be quoted, so ambiguity about what the number means is a real risk.

### Data hooks

| Hook | Query key | staleTime |
|---|---|---|
| `useCharDham()` | `tourismKeys.charDham()` | 15m |
| `useTourismSummary()` | `tourismKeys.summary()` | 15m |
| `useAreaTourism(slug)` | `tourismKeys.byArea(slug)` | 15m |

## 7. Failure modes

| Failure | User sees | Handling |
|---|---|---|
| No count source obtained at all | destinations, capacity and route status, with counts marked unavailable | the likely v1 state — the page must be worth visiting without counts |
| Count is a day old | the count with its date, plainly | TOU-5; never presented as live |
| Capacity unknown for a destination | raw count only, no load state | TOU-3 |
| Registration feed switches format | last-good counts, stale | Zod parse failure marks the run failed |

## 8. Decisions

### `<TBD>` — Design the module to be useful with no visitor counts

**Context:** the live count depends on the Char Dham registration portal, which is login-gated
and requires a departmental data request with no SLA. It may never arrive.
**Decision:** destinations, capacity, route status and weather are the module's baseline. Counts
are an enhancement layered on top, and every screen is designed to work without them.
**Because:** the alternative is a headline feature that ships empty for an unknown period. A
Char Dham page showing capacity, route status and weather is genuinely useful; the same page
with four "—" placeholders is not.
**Costs:** the live tourism counter promised in the specification may be absent at launch. That
needs saying to stakeholders early rather than at launch.
**Revisit if:** the Tourism Department grants a feed.

### `<TBD>` — Do not scrape the Char Dham registration portal

**Decision:** the registration and tourist-care portal is authenticated. We do not scrape it
under any circumstances; the departmental request is the only route.
**Because:** scraping a login-gated government portal risks access being cut and damages the
partnership the whole platform depends on. The downside is unbounded and the upside is a counter.
**Costs:** a headline feature blocked on a request with no SLA.
**Revisit if:** never, unless the department grants explicit written permission.

## 9. Open questions

- [ ] **Will the Tourism Department provide registration counts?** The module's headline feature
      depends entirely on this. Escalate early; it is the single highest-value data request on
      the project. — *owner:* `<TBD>`
- [ ] Published carrying-capacity figures per Char Dham site — are they official and current?
      TOU-4 forbids estimating them, so without these there is no load state at all. — *owner:* `<TBD>`
- [ ] **Accommodation is probably not obtainable.** Booking.com requires an approved commercial
      relationship; MakeMyTrip and Yatra have no self-serve route. Decide whether to cut it from
      scope or narrow it to Tourism Department registered-property data. Cutting now is cheaper
      than a card that ships empty. — *owner:* `<TBD>`
- [ ] Which non-Char-Dham destinations are in v1? — *owner:* `<TBD>`
- [ ] Does the IMD Char Dham pilgrimage forecast land here or in `hydromet`? It is weather, so
      `hydromet` owns it and this module links to it — confirm. — *owner:* `<TBD>`
