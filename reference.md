# Pahad Pulse — Reference

A single document covering what this product is, why it exists, where every figure comes from,
what it is built with, and how the pieces fit together. Written for a reviewer or a developer
joining the project. Everything here is drawn from the running system on 23 September 2026;
where something is unbuilt or unconfirmed, it says so.

- **Web:** https://www.pahadpulse.live
- **API:** https://pahadpulse.onrender.com
- **Android:** in review on Google Play
- **Contact:** admin@wtsolutions.cc

---

## 1. What it is, and the need it answers

**Pahad Pulse consolidates Uttarakhand's public data into one place, with the source of every
figure visible next to it.** Weather, air quality, disaster alerts, earthquakes, district
boundaries and villages, highways, connectivity, tourism load and district statistics, on the
web and on Android, in English and Hindi, with no account required.

**The need.** Uttarakhand's public information is published, but scattered. A resident asking a
practical question — _is there a warning for my district tonight, what is the air like in
Haldwani, which tehsil is this village in, how many hotel beds does Chamoli have_ — has to know
which of a dozen departmental portals to open, and each publishes in its own format, on its own
schedule, often as a PDF. The information exists; finding it does not scale to the person who
needs it.

Two things follow from that, and they shape every technical decision in this repository:

1. **The platform authors no data.** It ingests, normalises, attributes and displays data owned
   by government departments and open data projects. A figure arrives from a source or it does
   not exist. There is no content-authoring role anywhere in the system.
2. **Provenance is a field, not a footnote.** Every value carries its source, its licence, the
   date it describes (its _vintage_) and how fresh it is. A number whose source may not be
   redistributed is not shown at all, rather than shown without credit.

**What it is not.** Not a government website, not affiliated with or endorsed by the Government
of Uttarakhand or the Government of India. Not a news product — it publishes no articles and has
no editorial voice. Not an emergency service: it mirrors warnings published by NDMA and IMD, and
says so, rather than issuing any of its own.

---

## 2. What exists today

| Surface         | Built with                      | State                              |
| --------------- | ------------------------------- | ---------------------------------- |
| **Web app**     | Next.js, deployed on Vercel     | Live at pahadpulse.live            |
| **Android app** | Expo / React Native             | In Play review                     |
| **iOS app**     | Same codebase                   | Archived and submitted; TestFlight |
| **API**         | Express + PostgreSQL, on Render | Live, public, no key               |

**Web pages:** dashboard (map-first), alerts, districts (list and per-district), hydromet
(weather and air), connectivity, roads and road closures, tourism, trip check, compare,
intelligence, governance, sources, support, privacy, offline.

**App screens:** tabs for Today, Districts, Map, Alerts and More; plus air quality, alerts and
alert detail, districts and district detail, roads, seismic, tourism, connectivity, compare
(business planning), settings and credits.

**Feature areas, by module.** `project/modules/*.md` carries one doc per module with its own
decisions and open questions. Status as recorded there: `seismic` live; `hydromet` partial
(weather live, rivers and reservoirs not started); `datasets`, `geography` in progress;
`alerts`, `indicators`, `roads`, `tourism` planned-to-partial; `accounts` deferred — which is
why there is no login anywhere in the product today.

---

## 3. Where the data comes from

27 sources are registered as of migration 066 (which retired the project register and Migration Commission sources with their features). The registry is a
database table, served at `/api/sources`, and it is
the single place a source's department, link, licence and cadence are defined — the same row
that stamps every figure derived from it. The web page `/sources` and the app's Credits screen
are rendered from it, so a source cannot appear in the product without appearing in the list
with its link.

### 3.1 Live, automatically ingested

| Source                   | Publisher                                              | Link                | Licence                             | Cadence              |
| ------------------------ | ------------------------------------------------------ | ------------------- | ----------------------------------- | -------------------- |
| `sachet-ndma`            | National Disaster Management Authority (SACHET)        | sachet.ndma.gov.in  | Public domain, declared in the feed | 15 min               |
| `gdacs`                  | Global Disaster Alert and Coordination System (JRC/UN) | gdacs.org           | Public domain, declared by the feed | 30 min               |
| `usgs-earthquakes`       | US Geological Survey                                   | earthquake.usgs.gov | Public domain (US Government work)  | hourly               |
| `open-meteo`             | Open-Meteo                                             | open-meteo.com      | CC BY 4.0                           | hourly               |
| `open-meteo-air-quality` | Open-Meteo Air Quality (Copernicus CAMS)               | open-meteo.com      | CC BY 4.0                           | hourly               |
| `openstreetmap`          | OpenStreetMap contributors                             | openstreetmap.org   | ODbL 1.0                            | monthly, run by hand |
| `openstreetmap-roads`    | OpenStreetMap contributors                             | openstreetmap.org   | ODbL 1.0                            | monthly, run by hand |
| `imd-cap-alerts`         | India Meteorological Department                        | mausam.imd.gov.in   | **Not confirmed**                   | 15 min, ingest-only  |
| `pwd-uk-road-closures`   | Public Works Department, Uttarakhand (MISPWD)          | mis.pwduk.in        | **Permission required, not yet granted** | 10 min, ingest-only |

**`imd-cap-alerts` is ingested but never displayed.** IMD's redistribution terms are
unconfirmed, so the source is flagged `may_redistribute = false` and the API filters its rows
out of every public response. This is the clearest illustration of the provenance rule: the data
is collected so that the day terms are confirmed it appears, and until then no user sees it.

**`pwd-uk-road-closures` is collected but not displayed.** PWD's road closure dashboard is a public
web page (not an API) listing every closure reported by PWD, PMGSY, BRO, NHIDCL and NHAI
divisions. PWD's website policy requires permission by email before its material is reproduced,
so, like IMD, the source is ingested every 10 minutes with `may_redistribute = false`: the API
reports road closures as unavailable — never as "no closures" — until permission is recorded. The
dashboard's "Informed By" column (officials' names and ID numbers) is never read or stored. See
`project/modules/roads.md`.

### 3.2 Government statistics, transcribed by hand

No feed exists for these; each was read from a published report and cross-checked against the
totals that report states for itself. Each row records the page it came from.

| Source                        | Publisher                                          | Link                      | What it gives                                                     |
| ----------------------------- | -------------------------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| `census-2011`                 | Registrar General & Census Commissioner, India     | censusindia.gov.in        | Population, literacy, sex ratio, all 13 districts                 |
| `uk-des-ddp`                  | Directorate of Economics & Statistics, Uttarakhand | des.uk.gov.in             | Per capita income, 11 years                                       |
| `uk-des-district-reports`     | Directorate of Economics & Statistics, Uttarakhand | palayanayog.uk.gov.in     | Schools and hospital beds, 3 districts                            |
| `uk-district-composite-index` | Uttarakhand State SDG Composite Index              | palayanayog.uk.gov.in     | District SDG score and rank                                       |
| `uk-tourism-capacity`         | Uttarakhand Tourism Department                     | uttarakhandtourism.gov.in | Accommodation capacity, Char Dham arrivals                        |
| `uk-tourism-statistics-*`     | Uttarakhand Tourism Development Board              | uttarakhandtourism.gov.in | Published pilgrim arrivals 2019–2025, four reports (migration 062)  |
| `uk-dairy-federation`         | Uttarakhand Co-operative Dairy Federation          | uttarakhandmilk.com       | Dairy societies, milk production                                  |
| `forest-survey-india`         | Forest Survey of India                             | fsi.nic.in                | State forest cover                                                |
| `uk-budget-directorate`       | Budget Directorate, Government of Uttarakhand      | budget.uk.gov.in          | 2026-27 demand-wise estimates; display blocked pending permission |

The budget table preserves revenue/capital and voted/charged components in the published unit
(thousands of rupees). Its 31 demands sum to the source document's stated ₹1,11,703 crore total.
They are allocations, not expenditure or outcome measures.

### 3.3 Registered, not yet ingesting

`data-gov-in` (data.gov.in) needs a free API key that has not been obtained — it is the single
unlock for several indicator sets. `ookla-open-data` (Speedtest open data, CC BY-NC-SA) backs
the connectivity figures.

### 3.4 References that are not data sources

Listed on `/sources` under "Also used on this site", because the product relies on them without
ingesting them: Uttarakhand Tourism destination pages and photographs, and the curated guide in
`backend/src/data/tourism-guide.json`; the official Registration & Tourist Care portal; two
Unsplash photographs (Kedarnath, Gangotri); IMD's 24-hour rainfall intensity terms, which the
trip check applies to Open-Meteo's forecast; the NDMA SACHET portal; and Google Maps, which
directions links open in a new tab without any Google data being stored.

### 3.5 Map and rendering

OpenStreetMap data under ODbL, vector basemap from OpenFreeMap, terrain from Mapzen / AWS
Terrain Tiles, rendered with MapLibre GL. Attribution is required by those licences and is shown
on every map surface, reachable from the ⓘ control and in full on `/sources` and the Credits
screen.

### 3.6 How freshness is judged

Each source declares a cadence. Freshness is computed from the last _successful_ run against
that cadence: within 1× the interval it is **fresh**, up to 3× **stale**, beyond that
**expired**. Grace is deliberately generous — government feeds are irregular, and crying stale
on every late publication trains people to ignore the badge. A failed run never invalidates
stored data; it records the failure, and freshness degrades on its own.

---

## 4. Technology

| Layer        | Stack                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API**      | Node 22/24, TypeScript ESM, Express 5, PostgreSQL 16 + PostGIS, `pg`, Zod, neverthrow, Winston, node-cache, fast-xml-parser, helmet, express-rate-limit          |
| **Web**      | Next.js 15 (App Router), React 19, TanStack Query, Tailwind v4, MapLibre GL, Zod, Lucide                                                          |
| **Mobile**   | Expo SDK 57, React Native 0.86, React 19.2, Expo Router, TanStack Query (+ AsyncStorage persistence), Zustand, Zod, Reanimated, Noto Sans / Noto Sans Devanagari |
| **Database** | 55 SQL migration files, PostgreSQL tables plus PostGIS geometry for boundaries and alert extents                                                                 |
| **Hosting**  | Render free instance (API + ingestion), Supabase Postgres, Vercel (web, Mumbai `bom1`), cron-job.org (keep-alive ping)                                           |
| **Quality**  | TypeScript `strict`, ESLint, Prettier, Jest (backend, 447 tests), Vitest (web, 90), Jest + Testing Library (mobile, 81)                                          |

**Conventions that hold across all three codebases.** Errors are values, not exceptions:
the backend returns `Result<T, RequestError>` (neverthrow) across every layer boundary, and each
error carries a stable numeric code from a central registry (1xxxx common, 4xxxx geography,
5xxxx indicators, 6xxxx alerts, 7xxxx hydromet, 8xxxx roads, 9xxxx datasets).
Every boundary is validated with Zod — HTTP in, HTTP out, environment variables, and every API
response the clients read. No `process.env` access outside `config/env.ts`. The backend is
layered (routes → controllers → services → repositories); the web and mobile apps are
feature-sliced.

**Response envelope.** Every API response is `{ success, message, data, requestId, timestamp }`,
with errors carrying `{ code, message }`. Public figures additionally carry a `provenance`
object: source key, department (en/hi), url, attribution, vintage, fetchedAt, freshness and
whether it may be redistributed. Licence and cadence remain on the linked source-registry row.

---

## 5. High-level design

```
   Publishers                    Pahad Pulse                          Readers
   ─────────────                 ───────────────────────────          ───────────

   SACHET / NDMA  ─┐
   IMD CAP        ─┤                                               ┌─ Web (Vercel, bom1)
   GDACS          ─┤   ┌──────────────────────────┐               │   Next.js App Router
   USGS           ─┼──▶│  Connectors (9)          │               │   ISR + server fetch
   Open-Meteo     ─┤   │  fetch · parse · upsert  │               │
   Open-Meteo AQ  ─┤   └───────────┬──────────────┘               │
   OpenStreetMap  ─┘               │                              │
                                   ▼                              │
                       ┌───────────────────────┐                  │
                       │ In-process scheduler  │                  │
                       │ (interval timers)     │                  │
                       └───────────┬───────────┘                  │
                                   ▼                              │
   ┌───────────────────────────────────────────┐                  │
   │ Express API (Render free instance)        │◀─────────────────┤
   │  routes → controllers → services → repos  │                  │
   │  Zod validation · provenance filter       │                  ├─ Android / iOS (Expo)
   │  node-cache (60s–24h by resource)         │                  │   TanStack Query +
   └───────────────────┬───────────────────────┘                  │   AsyncStorage (7 days)
                       │                                          │
                       ▼                                          │
            ┌──────────────────────┐                              │
            │ Supabase PostgreSQL  │                              │
            │ + PostGIS            │                              │
            └──────────────────────┘                              │
                                                                  │
   cron-job.org ──▶ GET /health every 10 min (keeps the free instance awake)
   Vercel /api/relay/sachet ──▶ sachet.ndma.gov.in (Render is blocked; see 6.2)
```

**Why the API is not serverless.** Ingestion is a long job — the OpenStreetMap boundary and
village pass alone takes about 80 seconds — and it needs a database pool and a process that
outlives a request. A long-running container that also serves HTTP is the simplest thing that
does both.

**Why everything runs on free tiers.** Render's free instance sleeps after 15 minutes without
traffic, so an external pinger keeps it awake; 750 free instance-hours a month cover one
always-on service. Supabase pauses a free project after 7 days without database activity, which
the 15-minute ingestion prevents. This is deliberate and documented in `project/operations.md`,
including what would have to change to move to paid instances.

---

## 6. Low-level design: the flows that matter

### 6.1 Ingestion

```
tick (every 60s)
  └─ dueJobs(jobs, lastRuns, now)          interval elapsed since last run?
       └─ for each due job, one at a time, alerts first:
            runSource(key, 'scheduler')
              ├─ read source row            disabled? → skip, recorded as skipped
              ├─ connector available?       no credentials → skip, not a failure
              ├─ expireStuckRuns()          close runs abandoned by a killed process
              ├─ startRun()                 locks the source row, writes ingestion_runs
              ├─ connector.fetch()          HTTP with timeout + bounded retries
              │    └─ parse → validate → upsert into the module's tables
              └─ completeRun()              status, rows written/rejected, vintage, error code
```

**Rules the runner enforces.** A failed run never deletes or invalidates data (`DS-4`) —
freshness degrades because it is computed from the last success. Idempotency is the connector's
job (`DS-5`): every connector upserts and re-reads a window, so a re-run converges rather than
duplicating. Two schedulers cannot ingest the same source at once, because `startRun` locks the
source row; a run still `running` after 30 minutes is treated as dead, not as a lock.

**Scheduling.** Jobs are intervals, not clock times: alerts every 15 minutes, GDACS every 30,
weather, air quality and earthquakes hourly, the observation rollup daily. On boot the scheduler
seeds each job's last run from the run log, so a server that slept or redeployed catches up at
once instead of waiting for the next slot. The weekly OpenStreetMap refresh is deliberately
_not_ scheduled — it holds the whole state's geometry in memory for over a minute, which risks
taking down a 512 MB instance — and is run by hand.

### 6.2 Alerts, and the SACHET relay

SACHET publishes per-state CAP feeds. The connector reads the Uttarakhand feed, then for each
item fetches the CAP document and, separately, its polygon — the polygon second, so a broken
polygon service degrades the map rather than losing the warning. Geometry is simplified once at
ingestion (roughly 500 m tolerance for alerts) rather than on every read.

**SACHET drops connections from Render.** Every fetch fails at connect from Singapore, while the
same feed answers in 0.1 s from India and from Vercel — including Vercel's US region, which
rules out a simple foreign-IP block. Alert ingestion therefore goes through a relay: a Next.js
route on Vercel (`/api/relay/sachet`) that accepts one of three resource names plus a numeric
identifier, builds the SACHET URL itself, and requires a shared key. It cannot be pointed
anywhere else, and it is off entirely when the key is unset.

Alerts expire: SACHET's nowcasts last about three hours. `/api/alerts/active` returns only
warnings still in force; `/api/alerts/recent` returns those that lapsed in the last 48 hours,
newest first, and never overlaps the active list.

### 6.3 A read request

```
client → GET /api/areas/dehradun/weather
  → rate limit (300 / 15 min) · helmet · CORS allowlist
  → Zod validation of params and query
  → cache middleware (node-cache; 60s alerts … 24h geography)
  → controller
       → repository (parameterised SQL, PostGIS for geometry)
       → attachProvenance()   joins each row to its source registry entry
       → publiclyDisplayable() drops anything from a non-redistributable source
  → { success, message, data, requestId, timestamp }
```

The provenance filter runs _before_ serialisation, including for counts — a bare count of rows
from a source we may not redistribute is still a disclosure.

### 6.4 Business comparison (the "decision engine")

51 venture scenarios, each weighting six metrics 0–10: connectivity, tourism, roads, urban
population, agriculture, safety. For two districts the service computes each metric from stored
evidence, scores 0–100, and combines them by the scenario's weights.

What makes it honest rather than a toy:

- A metric with no measured evidence is marked `available: false`, and the API reports which
  metrics are missing, what share of the requested weight is actually backed by data, and a
  confidence of low / medium / high from that coverage.
- Below 50% coverage the API returns `winner: "insufficient"` — it declines to recommend, rather
  than recommending on a coin flip.
- Every scored metric carries the figures behind it: value, unit, vintage, source and link.

Both clients render "Not scored" for unmeasured metrics and show the coverage line. (The neutral
50 the engine uses internally so the weighted sum can still be computed is never displayed —
showing it as a score was a real bug, fixed on 23 September 2026.)

### 6.5 Alert notifications

Devices that opt in register their Expo push token at `POST /api/devices` — no account, and
nothing that identifies a person. Every 5 minutes a scheduler job looks for warnings nobody has
been told about and announces them:

```
dispatchNewAlerts()
  ├─ settle    mark anything unannouncable (expired, cancelled, too old, non-redistributable)
  ├─ pending   active warnings issued in the last 3 hours, notified_at IS NULL, may_redistribute
  ├─ send      one message per active device, in batches of 100, to Expo's push API
  │              title = severity + districts · body = the authority's own headline
  └─ record    notified_at set for every alert in the pass, delivered or not
```

The design decisions behind it: a warning is announced **at most once**, so a revision does not
re-notify; a warning **older than three hours is never announced**, so a server that slept does
not flood every phone on waking; and a **push service that is unreachable leaves the warning
unannounced**, so the next pass retries rather than losing it. Tokens Expo reports as dead are
disabled. The app's settings screen states plainly that delivery cannot be guaranteed and that
official channels remain authoritative.

### 6.6 Governance and intelligence workspaces

`/governance` is a public, read-only evidence workspace, not an officer login simulation. It
combines the official demand-wise budget, district standing across full-coverage indicators,
public warnings and the existing map. District standing is derived at read time and includes
only indicators with one vintage for all 13 districts and a declared better direction. Ties
share a rank. The page calls the resulting order a follow-up queue, never an official rating.

`/intelligence` is the coverage and discovery layer. It inventories every catalogued indicator,
labels evidence as comparable, contextual, partial, state-only, catalogue-only or temporarily
unavailable, and exposes shareable URL filters. It then connects that evidence to practical
resident, traveller, administration, research and business tools. Each upstream request settles
independently, so a budget or ranking outage does not erase the catalogue.

### 6.7 Observation retention

`observations` is the only table that grows without bound: about 169 rows an hour, ~1.48 M a
year, ~249 MB in Postgres, against a 500 MB free tier. A nightly job aggregates raw rows older
than 90 days into daily min/max/mean per station and metric, then prunes them, in one
transaction, aggregate first. The cutoff is local (IST) midnight, never "exactly 90 days ago" —
a mid-day cutoff split the boundary day and silently overwrote half of it on the next run.
Steady state is roughly 74 MB and flat. Hourly detail older than 90 days is lost, deliberately
and in writing.

The same nightly job trims `ingestion_runs` to 90 days (about 200 runs a day with road closures
polled every ten minutes), always keeping each source's latest run and latest successful run,
because freshness and the registry's status are computed from them.

### 6.8 Clients

**Web.** Server components fetch from the API with an 8-second timeout — a hang is not an error,
and every page is dynamic, so a silent hang once took the whole site down. Pages that carry
live figures revalidate every 2 minutes; geography-backed pages hourly. The map is MapLibre GL
with terrain and a cinematic intro on the dashboard.

**Mobile.** TanStack Query with AsyncStorage persistence: the cache is also the offline store,
so a reader on a mountain road sees yesterday's district page marked stale rather than an error.
`gcTime` is a week, far longer than any `staleTime` (typically 15 minutes). Zustand holds only
client state — language, theme, followed districts, intro seen — and never server data. The app
is fully bilingual, with a test that fails if any string is left untranslated.

---

## 7. Operations

- **Deploy:** push to `main`. Vercel builds the web app; Render builds the API, runs migrations
  in a pre-deploy step, then starts the server and the scheduler.
- **Schedule:** in-process, enabled by `SCHEDULER_ENABLED=true` on exactly one instance.
- **Keep-alive:** cron-job.org calls `/health` every 10 minutes.
- **Weekly, by hand:** `npm run ingest -- openstreetmap`, then `openstreetmap-roads`, then
  `npm run ingest` to review the registry — every live source should read _fresh_.
- **Health:** `/health` (liveness) and `/ready` (database round-trip).
- **Logs:** structured JSON via Winston; every ingestion run is also a row in `ingestion_runs`.

---

## 8. Known gaps

Recorded here because a reviewer will find them anyway, and they are tracked in the module docs:

- **IMD redistribution terms are unconfirmed** — its alerts are ingested but cannot be shown.
  This is the blocking question for the alerts module, not a paperwork item.
- **Budget Directorate reproduction permission is not yet recorded.** Its website policy asks
  for prior permission; the budget workspace must not launch publicly until that is confirmed
  and reflected in the source registry.
- **data.gov.in API key not obtained**, which gates several indicator sets.
- **Several statistics are transcribed by hand** from PDFs and are annual at best; each shows its
  vintage, and Census figures are 15 years old and labelled as such.
- **Roads data is OpenStreetMap-derived** and reflects what mappers have tagged. Road _status_
  comes only from PWD's closure dashboard, which is collected but not displayed until PWD grants
  reproduction permission; until then closures are shown as not tracked.
- **`accounts` is deferred**, so there are no logins, subscriptions or saved districts on the web.
- **Single instance:** the scheduler assumes exactly one API instance; scaling out needs the flag
  on one of them.
