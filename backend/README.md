# PahadPulse API

Express 5 · TypeScript ESM · MySQL 8 · mysql2 · Zod · neverthrow

The API serves geography, district indicators, alerts, highway routes, and source metadata.
See the [main README](../README.md) for current data coverage, frontend setup, and deployment.

## Local setup

Use Node.js 22 and Docker Compose. From this directory:

```bash
cp .env.example .env
docker compose up --build -d
```

Compose starts MySQL, runs migrations, and serves the API at `http://localhost:3000` with
hot reload. After startup, load external data:

```bash
docker compose exec api npm run ingest -- --all
```

To run the API on the host instead, start only the database and use local dependencies:

```bash
docker compose up -d --wait db
npm ci
npm run db:migrate
npm run dev
```

Use either the container API or the host API to avoid a port 3000 conflict. Environment
variables are documented in [.env.example](.env.example) and validated in
[src/config/env.ts](src/config/env.ts). Local MySQL uses `DB_SSL=false`; managed MySQL can
use `DB_SSL=true` with optional `DB_SSL_CA` PEM contents and enforced certificate/hostname
verification.

## Commands

Run these in `backend/` after `npm ci`, or prefix them with `docker compose exec api`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | API with hot reload |
| `npm run build` | Compile the production API |
| `npm start` | Run the compiled API |
| `npm run db:migrate` | Apply unapplied SQL migrations |
| `npm run ingest` | Inspect source and connector status |
| `npm run ingest -- --all` | Run all available connectors |
| `npm run ingest -- sachet-ndma` | Refresh SACHET alerts |
| `npm run ingest -- imd-cap-alerts` | Refresh IMD CAP alerts |
| `npm run ingest -- openstreetmap` | Refresh district boundaries and village data |
| `npm run ingest -- openstreetmap-roads` | Refresh highway routes |
| `npm run typecheck` | Check TypeScript |
| `npm run lint` | Check code conventions |
| `npm test -- --runInBand` | Run tests; use a local test database |
| `npm run verify` | Typecheck, lint, formatting checks, and tests |

`npm run db:seed` creates synthetic development data and refuses production. Normal setup
uses migrations and ingestion instead. Ingestion requires upstream network access; inspect
per-source results and freshness after a run. The data.gov.in connector remains unimplemented.

## Public endpoints

| GET endpoint | Returns |
| --- | --- |
| `/health` | Process liveness |
| `/ready` | Database readiness |
| `/api/areas/districts` | District records and child counts |
| `/api/areas/districts/:slug` | District detail |
| `/api/areas/:slug/boundary` | Area boundary geometry |
| `/api/map/layers` | Map layer registry |
| `/api/map/districts` | District GeoJSON collection |
| `/api/map/alerts` | Mappable active alerts |
| `/api/roads` | Highway network, not live closures |
| `/api/alerts/active` | Active alert records |
| `/api/alerts/summary` | Alert summary |
| `/api/indicators` | Indicator catalogue |
| `/api/indicators/population/ranking` | District population ranking |
| `/api/sources` | Public source metadata |

API routes are mounted under `/api`; health endpoints are mounted at the application root.
Operator ingestion HTTP endpoints remain deferred until authenticated operator accounts exist.

## Production

The [Render Blueprint](../render.yaml) runs migrations before API rollout and uses the same
Docker image for ingestion jobs. Scripts require `tsx` and the source SQL migration files,
so the image deliberately keeps devDependencies and source alongside the compiled server.

The Blueprint creates private MySQL with a persistent disk and automatically wires the API
and jobs to its application credentials. It uses `DB_SSL=false` for this private connection.
After MySQL initialization and migrations, run initial ingestion.
See [deployment instructions](../README.md#deployment) and the
[operations notes](../project/operations.md) for TLS, schedules, CORS, and post-deploy checks.
