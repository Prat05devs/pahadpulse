# Operations

How this project runs, deploys, and gets fixed. Generic process lives in
[guidelines/backend/11-build-and-deployment.md](../guidelines/backend/11-build-and-deployment.md)
and [guidelines/mobile/11-build-and-release.md](../guidelines/mobile/11-build-and-release.md).

---

## Environments

| Env        | URL                     | Branch / tag        | Database            | Secrets                 |
| ---------- | ----------------------- | ------------------- | ------------------- | ----------------------- |
| local      | `http://localhost:3000` | any                 | Docker              | `.env` (from `<vault>`) |
| staging    | `<url>`                 | `main` (auto)       | `<anonymised copy>` | `<store>`               |
| production | `<url>`                 | tag `v*` (approval) | `<prod>`            | `<store>`               |

## Local setup

```bash
cp .env.example .env      # values from <password manager vault>
docker compose up -d      # database + local services
npm ci
npm run db:migrate && npm run db:seed
npm run dev
```

A new engineer should reach a running app from this alone, in under 30 minutes. If they can't,
fix this section.

## Deploy

### API and database on the DigitalOcean droplet, website on Vercel

The API and its PostgreSQL database run on the shared DigitalOcean droplet (`139.59.72.220`,
Bangalore) alongside the other apps' APIs, using the droplet's `server` command. Unlike the
other apps, Pahad Pulse has its **own** database container: the shared PostgreSQL has no
PostGIS, and adding it would restart the database every other app depends on. The website
stays on Vercel and calls `https://api.pahadpulse.live/api`; the mobile apps call the same URL.

| Piece | Where |
|---|---|
| API | `/opt/apps/pahadpulse/backend`, Compose project `pahadpulse`, file [`backend/compose.production.yaml`](../backend/compose.production.yaml) |
| Proxy | Shared Caddy: `api.pahadpulse.live` → `pahadpulse-api:3000`, HTTPS certificate issued automatically |
| Database | This project's own `db` container (`postgis/postgis:17-3.5-alpine`), data in the `pahadpulse_db_data` volume, on the internal `db` network only |
| Secrets | `/opt/apps/pahadpulse/backend/.env` (mode 600) and the password manager; never in git |
| Backups | The project's `backup` service ([`backend/deploy/backup.sh`](../backend/deploy/backup.sh)): every 24 h and before every `server deploy`, in `/opt/backups/postgres/pahadpulse/`, kept 14 days |
| DNS | Hostinger DNS (nameservers `dns-parking.com`): `A api → 139.59.72.220` |

The database is reachable only on the project's internal `db` network, so `DB_SSL=false`
is correct here and nothing from outside can connect to it.

**Release:** push to `main`, then `ssh deploy@139.59.72.220` and
`server deploy /opt/apps/pahadpulse/backend`. It pulls, backs up every database, rebuilds,
runs migrations on start and waits until `/ready` passes. Logs:
`cd /opt/apps/pahadpulse/backend && docker compose logs -f --tail 100 api`.

#### One-time move from Hostinger and Supabase (2026-10)

Run each block as `deploy` on the droplet, one command at a time.

None of these steps changes the shared services or any other app. The only shared piece
touched is Caddy, in step 5, and `server add-site` checks the new site and reloads without
dropping connections.

1. **Checkout.**
   ```sh
   git clone https://github.com/Prat05devs/pahadpulse.git /opt/apps/pahadpulse
   cd /opt/apps/pahadpulse/backend
   ```

2. **`.env`.** Copy `EXPO_ACCESS_TOKEN` and `FIRMS_MAP_KEY` from Hostinger's environment
   variables. Leave `SACHET_RELAY_*` unset: SACHET answers machines in India directly.
   ```sh
   cat > .env <<EOF
   COMPOSE_PROJECT_NAME=pahadpulse
   COMPOSE_FILE=compose.production.yaml
   DB_PASSWORD=$(openssl rand -hex 24)
   DB_POOL_LIMIT=10
   LOG_LEVEL=info
   CORS_ORIGIN=https://www.pahadpulse.live,https://pahadpulse.live
   SCHEDULER_ENABLED=false
   EXPO_ACCESS_TOKEN=...
   FIRMS_MAP_KEY=...
   EOF
   chmod 600 .env
   ```
   Save `DB_PASSWORD` in the password manager. Then fill in the two `...` values with `nano .env`.

3. **Database and schema.** Start only the database, then let the migrations build the schema
   (they create the PostGIS extension, as the container's own superuser):
   ```sh
   sudo mkdir -p /opt/backups/postgres/pahadpulse
   docker compose up -d --wait db
   docker compose build api
   docker compose run --rm api npm run db:migrate
   ```

4. **Data from Supabase.** On Hostinger, set `SCHEDULER_ENABLED=false` and redeploy, so
   Supabase stops changing. Then copy only the rows (not Supabase's own schemas, roles or
   grants). Use the pooler host, user and password from Hostinger:
   ```sh
   read -s SB_PASSWORD       # paste the Supabase password; it is not shown or kept in history
   docker run --rm -e PGPASSWORD="$SB_PASSWORD" postgres:17-alpine pg_dump \
     "host=<pooler host> port=5432 user=<pooler user> dbname=postgres sslmode=require" \
     --data-only --schema=public --format=custom \
     --exclude-table=public.schema_migrations --exclude-table=public.spatial_ref_sys \
     > /tmp/pahadpulse-data.dump
   # The seed migrations already inserted rows; empty every table so Supabase's copy wins.
   docker compose exec -T db psql -U pahadpulse -d pahadpulse -v ON_ERROR_STOP=1 <<'SQL'
   DO $$ DECLARE t text; BEGIN
     SELECT string_agg(format('%I.%I', schemaname, tablename), ', ') INTO t FROM pg_tables
     WHERE schemaname = 'public' AND tablename NOT IN ('schema_migrations', 'spatial_ref_sys');
     EXECUTE 'TRUNCATE ' || t || ' RESTART IDENTITY CASCADE';
   END $$;
   SQL
   docker compose exec -T db pg_restore -U pahadpulse -d pahadpulse \
     --data-only --disable-triggers --no-owner < /tmp/pahadpulse-data.dump
   rm /tmp/pahadpulse-data.dump; unset SB_PASSWORD
   ```
   `--disable-triggers` lets rows load in any order despite foreign keys. It works because
   `pahadpulse` is the superuser of its own container.

5. **Start and proxy.**
   ```sh
   server deploy .
   server add-site api.pahadpulse.live pahadpulse-api:3000
   ```

6. **Cut over.** Delete the Hostinger website `api.pahadpulse.live` first. While it
   exists, Hostinger keeps a separate DNS zone for that name, which overrides the `api`
   record in `pahadpulse.live` and is rewritten back to Hostinger's addresses after any
   edit. Its CDN also needs opting out, or it re-enables itself. After deletion the stale
   zone took about 25 minutes to clear from every Hostinger nameserver. Then, in Hostinger DNS, replace the `api`
   records with `A api → 139.59.72.220`. When `dig +short api.pahadpulse.live` prints only
   that address, open `https://api.pahadpulse.live/ready` once to issue the certificate.
   Then set `SCHEDULER_ENABLED=true` in `.env` and run `server deploy .`.

7. **Check.** `/ready` gives `{"status":"ready"}`, `/api/sources` shows new `lastRunAt` times
   within 15 minutes, and the website and an installed app load data.

8. **Retire the old hosts after a week of clean running.** Stop the Hostinger Node.js app,
   delete the cron-job.org job (nothing sleeps now), and pause the Supabase project before
   deleting it. Render is already suspended.

Anything that registered a push token on Hostinger between the dump in step 4 and the
cut-over in step 6 is lost. Those devices register again the next time the app opens.

### Ingestion schedule

Ingestion runs **inside the API process** when `SCHEDULER_ENABLED=true`
(`backend/src/services/ingestion/scheduler.ts`). There are no Render cron services and no
GitHub Actions workflow. Render bills each cron job separately, and the Actions workflow that
replaced them stopped silently when the GitHub account was locked for billing. That left the
data frozen from 17 Sep 2026 until this change.

| Job                                 | Every  | Source key                 |
| ----------------------------------- | ------ | -------------------------- |
| Alerts (SACHET)                     | 15 min | `sachet-ndma`              |
| Disaster events (GDACS)             | 30 min | `gdacs`                    |
| Earthquakes (USGS)                  | 1 h    | `usgs-earthquakes`         |
| Weather (Open-Meteo)                | 1 h    | `open-meteo`               |
| Air quality (Open-Meteo CAMS)       | 1 h    | `open-meteo-air-quality`   |
| Observation rollup and 90-day prune | 24 h   | none (`npm run db:rollup`) |

Jobs are intervals, not clock times. A job is due once its interval has passed since its last
run from any trigger, the CLI included. On boot, the scheduler reads the run log, so a server
that slept or redeployed catches up at once, highest priority first. Jobs run one at a time.

**No pinger.** The droplet never sleeps, so the scheduler's timers keep running. The
cron-job.org job that kept Render's free instance awake is no longer needed.

**SACHET relay (alerts).** SACHET drops every connection from Render, yet answers Vercel,
including Vercel's US region (verified 2026-09-22 against another app fetching the national feed
from `iad1`). The block is on Render's network, not on foreign traffic in general. Alert ingestion
therefore fetches SACHET through `web/src/app/api/relay/sachet` on Vercel. `web/vercel.json` pins
the web project to Mumbai (`bom1`), nearest to SACHET and to users; the Hobby plan allows one
function region. The relay
accepts only the feed, alert and polygon resources, builds the SACHET URL itself, and refuses
any request without the shared key.

1. Generate a key: `openssl rand -hex 32`.
2. Vercel → web project → Settings → Environment Variables: `SACHET_RELAY_KEY` = the key
   (Production). Redeploy.
3. Test from any machine:
   `curl -s -o /dev/null -w "%{http_code}\n" -H "x-relay-key: <key>" "https://www.pahadpulse.live/api/relay/sachet?resource=feed"`
   gives `200` when Mumbai can reach SACHET. `502` means SACHET blocks Vercel Mumbai too.
4. Only after a `200`: Render → API → Environment: `SACHET_RELAY_URL` =
   `https://www.pahadpulse.live/api/relay/sachet` and `SACHET_RELAY_KEY` = the same key.
   Set both or neither; the API refuses to boot with only one.

Leave both unset on a machine in India, which includes the droplet: the API then fetches
SACHET directly. The relay exists only for hosts outside India that SACHET blocks.

**Alert notifications.** The API announces new warnings to devices that asked for them, via
Expo's push service — a scheduler job every 5 minutes, after the alert ingestion jobs. Devices
register their own push token at `POST /api/devices`; no account exists and none is needed.

Rules worth knowing before changing any of it:

- A warning is announced at most once. `alerts.notified_at` records it, and the upsert that
  revises a warning deliberately leaves the column alone.
- Only warnings issued in the last 3 hours are sent. A server that slept announces what is
  current, not everything it missed; the rest are marked announced without being sent.
- DS-6 applies: a source flagged `may_redistribute = false` (IMD today) never reaches a lock
  screen, exactly as it never reaches the API.
- Successful send tickets are checked after 15 minutes. A push token Expo reports as
  `DeviceNotRegistered` in either the ticket or final APNs/FCM receipt is disabled, not deleted.
- Missing receipts retry until Expo's 24-hour retention window ends; resolved and expired ticket
  rows are removed so notification state cannot grow without bound.

Credentials are an EAS matter, not a code one: the build must have `EAS_PROJECT_ID`, Android
needs `google-services.json` plus a matching FCM V1 service-account key, and iOS needs an APNs
key. Set `EXPO_ACCESS_TOKEN` on the API to stop anyone who learns a token sending notifications
that appear to come from this app.

**Weekly manual step.** The reference refresh (`openstreetmap` boundaries and villages,
`openstreetmap-roads`) is deliberately not scheduled. It holds the whole state's geometry in
memory for over a minute. The database is reachable only from the droplet, so run it there,
at a quiet hour, and watch memory with `server status`:

```bash
cd /opt/apps/pahadpulse/backend
docker compose exec api npm run ingest -- openstreetmap
docker compose exec api npm run ingest -- openstreetmap-roads
docker compose exec api npm run ingest     # status: every live source should read "fresh"
```

This data changes only when the government re-notifies boundaries or OSM volunteers edit
roads, so a missed week costs nothing visible. The status check is the part that matters,
because it is how a stopped scheduler gets noticed.

The production image deliberately retains devDependencies, scripts, and SQL source files:
the migration and ingestion CLIs require `tsx`, and TypeScript does not copy SQL assets.

**IMD whitelisting.** IMD's CAP feed answers only whitelisted addresses, which is why
`imd-cap-alerts` has been expired since 17 Sep 2026. The droplet has a fixed address,
`139.59.72.220`; that is the one to submit.

The generic rollout and monitoring placeholders below remain to be filled when production
is provisioned.

| Step       | How                                                  |
| ---------- | ---------------------------------------------------- |
| Trigger    | `<push tag v*>`                                      |
| Migrations | run **before** the rollout, backward-compatible only |
| Rollout    | `<rolling, maxUnavailable 0, readiness gated>`       |
| Smoke test | `<what runs after deploy>`                           |
| Rollback   | redeploy the previous image tag: `<command>`         |

Images are tagged by git SHA and are immutable. `latest` is not deployable.

## Health

| Endpoint      | Checks                                        |
| ------------- | --------------------------------------------- |
| `GET /health` | process alive only — **no** dependency checks |
| `GET /ready`  | DB pool ping                                  |

## Monitoring

| Signal                       | Where      | Alert threshold      |
| ---------------------------- | ---------- | -------------------- |
| 5xx rate                     | `<tool>`   | > 1% over 5 min      |
| p95 latency                  | `<tool>`   | > 1 s over 10 min    |
| `/ready` failing             | `<tool>`   | any instance > 2 min |
| DB pool saturation           | `<tool>`   | > 80% for 5 min      |
| Crash-free sessions (mobile) | `<Sentry>` | < 99.5%              |

## Runbook

One entry per alert: what it means, how to confirm, how to mitigate.

### `<Alert: 5xx rate high>`

**Means:** `<...>`
**Confirm:** `<query/dashboard>`
**Mitigate:** `<roll back / scale / disable flag>`
**Escalate to:** `<who>`

### `<Alert: database unreachable>`

...

## Incident process

1. **Mitigate first** — roll back, scale, or disable the feature. Diagnose after.
2. Rollback is the default action, not the last resort.
3. Get the `requestId` from the user report; it maps directly to a log line.
4. Blameless postmortem for anything customer-visible, with one owned action item.

## On call

|            |                    |
| ---------- | ------------------ |
| Rotation   | `<who / schedule>` |
| Escalation | `<path>`           |
| Paging     | `<tool>`           |

## Postgres backups and recovery

**Not yet configured:** automated logical backups, separate backup storage, retention,
monitoring of backup failures, and a verified restore. Assign these before production use.
Provider snapshots are not a substitute for a separately stored, tested logical backup.

- Run `pg_dump` in PostgreSQL custom format from a trusted host. Avoid schema changes during
  the dump and supply credentials through a protected environment or password file, not as a
  command-line argument.
- Store encrypted backups outside the database service and its disk. Restrict access and
  configure retention with the selected storage provider.
- Restore into a separate PostgreSQL 16 instance and verify the migration ledger, row counts,
  API readiness, district geometry, and road data before any production cutover.
- Before Postgres image upgrades, create and verify a logical backup. Test the upgrade on a
  restored copy; do not assume downgrading the image can reverse an on-disk format change.
