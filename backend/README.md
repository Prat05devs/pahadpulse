# Pahad Pulse — API

Express 5 · TypeScript (ESM) · MySQL 8 · neverthrow · Zod

Two modules are implemented:

- **`geography`** — the area hierarchy every other module joins to.
  [`project/modules/geography.md`](../project/modules/geography.md)
- **`datasets`** — the source registry, ingestion runs, provenance and freshness.
  [`project/modules/datasets.md`](../project/modules/datasets.md)

---

## Prerequisites

|       |                                                                 |
| ----- | --------------------------------------------------------------- |
| Node  | 22 LTS (`.nvmrc`) — **not currently installed on this machine** |
| MySQL | 8.0+ running locally, or `docker compose up -d db`              |

## Setup

```bash
cd backend
npm ci

# create backend/.env from the template below, then:
npm run db:migrate     # schema + the 13 districts + map layer registry
npm run db:seed        # placeholder boundaries + demo tehsils/villages (dev only)
npm run dev            # http://localhost:3000
```

### `.env`

`.env.example` could not be written by the agent (blocked by a local permission rule).
Create `backend/.env.example` and `backend/.env` with exactly these keys:

```dotenv
# App
NODE_ENV=development
APP_ENV=local
PORT=3000
SERVER_URL=http://localhost:3000
LOG_LEVEL=debug

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pahad_pulse
DB_POOL_LIMIT=20

# CORS — comma separated
CORS_ORIGIN=http://localhost:3001
```

Auth, mail and storage keys arrive with the `accounts` module. Never add a key here that
no code reads — CI compares `.env.example` against `EnvSchema`.

Create the database first:

```sql
CREATE DATABASE pahad_pulse CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

## Commands

| Intent             | Command                    |
| ------------------ | -------------------------- |
| Dev server         | `npm run dev`              |
| Typecheck          | `npm run typecheck`        |
| Lint               | `npm run lint`             |
| Format             | `npm run format`           |
| Tests              | `npm test`                 |
| Integration only   | `npm run test:integration` |
| Build              | `npm run build`            |
| Migrate            | `npm run db:migrate`       |
| Seed (dev)         | `npm run db:seed`          |
| Everything CI runs | `npm run verify`           |

## API

All geography endpoints are public, read-only and cached for 24h — this data changes only
by migration.

| Method | Path                                             | Returns                                        |
| ------ | ------------------------------------------------ | ---------------------------------------------- |
| GET    | `/health`                                        | liveness                                       |
| GET    | `/ready`                                         | readiness (pings MySQL)                        |
| GET    | `/api/areas/districts`                           | all 13 districts with child counts             |
| GET    | `/api/areas/districts/:slug`                     | district + tehsils + boundary                  |
| GET    | `/api/areas/:slug`                               | any addressable area (state, district, tehsil) |
| GET    | `/api/areas/:slug/boundary`                      | GeoJSON geometry                               |
| GET    | `/api/areas/:slug/children?type=tehsil\|village` | child areas                                    |
| GET    | `/api/map/layers`                                | map layer registry                             |

Both languages are always returned; the API does not negotiate locale:

```json
{
  "success": true,
  "message": "Districts fetched successfully",
  "data": [
    {
      "id": 6,
      "type": "district",
      "code": "UK-DD",
      "slug": "dehradun",
      "name": { "en": "Dehradun", "hi": "देहरादून" },
      "division": "garhwal",
      "headquarters": { "en": "Dehradun", "hi": "देहरादून" },
      "centroid": { "lat": 30.3165, "lng": 78.0322 },
      "officialIds": { "lgd": null, "census2011": null },
      "counts": { "tehsils": 3, "villages": 12 },
      "hasBoundary": true
    }
  ],
  "timestamp": "2026-09-03T00:00:00.000Z"
}
```

## Ingestion

`datasets` owns where data came from and whether it can be trusted right now. No connector
fetches anything yet — each declares itself unavailable with a reason, and the runner records
a _skipped_ run rather than a failure, so the failure count stays meaningful.

```
npm run ingest
```

prints every source with its freshness, last successful run, redistribution status and
connector state. Adding a real source means writing one `fetch` method and adding a line to
`src/services/ingestion/index.ts` — the runner, run tracking and freshness rules do not change.

Operator HTTP endpoints (`/api/ops/ingestion/*`) are deferred until `accounts` exists; there is
no way to authenticate an operator yet, and an interim auth scheme is not worth writing.

## Data status

| Data                                                  | Status                                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| 13 districts, bilingual names, division, headquarters | administrative fact                                                              |
| Centroids                                             | **approximate** — district headquarters coordinates, adequate for map placement  |
| `lgd_code`, `census_2011_code`                        | **NULL** — reserved, backfilled when the official identifier system is confirmed |
| Boundaries                                            | **placeholder hexagons** — `isPlaceholder: true` on every response               |
| Tehsils, villages                                     | **demo only** — `DEMO-` code prefix, created by `db:seed`, never by a migration  |

Population, literacy and area are deliberately absent: those are statistics and belong to
the `indicators` module with full provenance. Geography holds only where things are.
