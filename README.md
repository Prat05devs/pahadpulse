# PahadPulse

A public data portal for Uttarakhand, bringing district statistics, disaster alerts, maps,
and the highway network into one place. Data is associated with its source and vintage so
residents, travellers, and journalists can understand what each figure represents.

The project is under active development. Deployment configuration is included; a successful
deploy still requires a configured MySQL database, migrations, and initial ingestion.

## Current data coverage

| Area | Available today | How it is populated |
| --- | --- | --- |
| Geography | 13 districts, bilingual names, and tehsil records | Database migrations |
| Statistics | Census 2011 population, literacy, sex ratio, and published district income history | Database migrations |
| Map | District boundaries and village enrichment from OpenStreetMap | Ingestion |
| Roads | National and state highway routes from OpenStreetMap | Ingestion; this is network data, not road closure status |
| Alerts | SACHET/NDMA and IMD CAP connectors, active alert lists, and mappable alert geometry | Ingestion, subject to upstream availability |
| Sources | Source registry, ingestion history, provenance, and freshness | Migrations and ingestion runs |

Weather observations, river levels, tourism, connectivity, road closures, and authenticated
subscriptions are not complete live integrations. Some screens contain placeholders. In
particular, dashboard tourist, closed-road, and connectivity counters currently use zero
placeholders; these must not be interpreted as measured values. The data.gov.in connector
is scaffolded but not implemented.

## Stack

- **Web:** Next.js 15, React 19, TypeScript, Tailwind CSS, TanStack Query, MapLibre GL.
- **API:** Express 5, TypeScript ESM, Zod, and mysql2.
- **Database:** MySQL 8, with SQL migrations and source ingestion CLIs.
- **Deployment:** Render for the API and scheduled jobs; Vercel for the web app; external
  managed MySQL, with the provider still undecided.

## Local setup

Install Node.js 22 (see [backend/.nvmrc](backend/.nvmrc)), npm, and Docker with Compose.
Use npm and the committed `package-lock.json` files for installation.

### 1. Start MySQL and the API

From the repository root:

```bash
cd backend
cp .env.example .env
docker compose up --build -d
```

Compose starts MySQL, runs migrations, and starts the API with hot reload at
`http://localhost:3000`. Database data persists in a Docker named volume.

If port 3306 is already occupied, set `DB_HOST_PORT=3307` and `DB_PORT=3307` in
`backend/.env` before starting Compose. Containers still communicate with MySQL on port 3306.

### 2. Load map, road, and alert data

From `backend/`, after the API has started:

```bash
docker compose exec api npm run ingest -- --all
```

This fetches external sources and can take several minutes. Inspect each source's result;
a failed upstream request does not mean every source failed. You can inspect ingestion
status or retry an individual source:

```bash
docker compose exec api npm run ingest
docker compose exec api npm run ingest -- sachet-ndma
docker compose exec api npm run ingest -- openstreetmap
docker compose exec api npm run ingest -- openstreetmap-roads
```

Migrations populate reference records and selected statistics, but not the live feeds or
OSM geometry. `db:seed` is an optional development-only generator of synthetic data; it is
not part of the normal setup and must not be used to populate production.

### 3. Start the web app

In a second terminal, from the repository root:

```bash
cd web
npm ci
```

Create `web/.env.local` containing:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Then run:

```bash
npm run dev
```

Open **http://localhost:3001**. The backend environment example permits this origin through
CORS. Keep environment files and database credentials out of Git.

### 4. Check the API

```bash
curl --fail http://localhost:3000/health
curl --fail http://localhost:3000/ready
curl --fail http://localhost:3000/api/areas/districts
curl --fail http://localhost:3000/api/map/districts
curl --fail http://localhost:3000/api/roads
```

`/health` checks the running process; `/ready` checks database access. Neither proves all
sources have populated data. Inspect the map, roads, and source statuses after ingestion.
An empty active-alert list can be valid when no current warnings apply.

## Deployment

Your local database is **not** copied to production when you push to GitHub.

### MySQL and Render

1. Provision a managed MySQL 8 database. Keep the provider hostname, port, database name,
   credentials, and any CA certificate available for configuration.
2. Push this repository to GitHub, then create a Render Blueprint using
   [render.yaml](render.yaml).
3. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` on all three services,
   pointing to the same database. The Blueprint enables `DB_SSL=true`; certificate and
   hostname verification stay enabled. If the provider supplies a private CA, add its PEM
   contents as `DB_SSL_CA` on all three services. Otherwise leave it unset.
4. Set the API's `SERVER_URL` to its public HTTPS origin and `CORS_ORIGIN` to the Vercel
   origin, without a trailing slash. Multiple allowed origins are comma-separated.
5. Confirm the API's pre-deploy migration command succeeds. Then manually trigger the
   reference ingestion job once so maps and roads do not wait for the weekly schedule.
   Inspect the ingestion logs and trigger the alert job if needed.

| Render service | Purpose | Schedule |
| --- | --- | --- |
| `pahadpulse-api` | API, with migrations before rollout | Long-running service |
| `pahadpulse-ingest-alerts` | SACHET alert ingestion | Every 15 minutes |
| `pahadpulse-ingest-reference` | All available connectors | Sunday 02:00 IST |

The weekly expression is `30 20 * * 6`: Saturday 20:30 UTC equals Sunday 02:00 IST.
Render evaluates cron schedules in [UTC](https://render.com/docs/cronjobs).

The Docker image intentionally retains source, SQL files, and devDependencies because the
migration and ingestion scripts run through `tsx`. Its default command runs the compiled
production API; Compose overrides the command for local hot reload.

### Vercel

Import the same repository, choose **Root Directory: `web`**, and set:

```dotenv
NEXT_PUBLIC_API_URL=https://<render-host>/api
```

Set this before building. If the API URL changes, rebuild the web deployment. Ensure the
resulting Vercel origin is also listed in Render's `CORS_ORIGIN`.

After deployment, check the live website, API readiness, district map, highway network,
and source freshness. Successful builds alone do not verify production data access.

For IMD whitelisting, obtain the Render services' outbound ranges from **Connect → Outbound**
and confirm IMD accepts them. Render's default egress uses shared regional ranges; see
[Render outbound IP documentation](https://render.com/docs/outbound-ip-addresses).

## Development checks

Backend, from `backend/` with local dependencies installed using `npm ci`:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
```

Web, from `web/`:

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
```

Keep the local test database running for database-backed checks. Avoid running integration
tests against a production database.

## Project documentation

| Path | Contents |
| --- | --- |
| [backend/](backend/) | API, migrations, connectors, and backend setup |
| [web/](web/) | Next.js application |
| [project/overview.md](project/overview.md) | Product scope, module map, and open decisions |
| [project/modules/](project/modules/) | Module specifications and data-source decisions |
| [project/operations.md](project/operations.md) | Deployment configuration and operational follow-ups |
| [guidelines/](guidelines/) | Engineering conventions |
| [CLAUDE.md](CLAUDE.md) | Repository instructions for coding agents |
