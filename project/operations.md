# Operations

How this project runs, deploys, and gets fixed. Generic process lives in
[guidelines/backend/11-build-and-deployment.md](../guidelines/backend/11-build-and-deployment.md)
and [guidelines/mobile/11-build-and-release.md](../guidelines/mobile/11-build-and-release.md).

---

## Environments

| Env | URL | Branch / tag | Database | Secrets |
|---|---|---|---|---|
| local | `http://localhost:3000` | any | Docker | `.env` (from `<vault>`) |
| staging | `<url>` | `main` (auto) | `<anonymised copy>` | `<store>` |
| production | `<url>` | tag `v*` (approval) | `<prod>` | `<store>` |

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

### Render API and ingestion, Vercel web

The deployment configuration is in [`render.yaml`](../render.yaml). The selected database
is PostgreSQL 16 on a Render private service, with 2 GB RAM and a 10 GB disk mounted at
`/var/lib/postgres`. Postgres, the API, and both cron jobs must share a workspace and the Singapore
region. Live provisioning has not been verified.

1. Push the reviewed Blueprint and create or sync it in Render. Review compute and disk
   charges before applying. The Blueprint generates separate application and root passwords
   and wires the three consumers to the application's private database connection.
2. Set the API's `SERVER_URL` to its public HTTPS origin and `CORS_ORIGIN` to the Vercel
   origin, with no trailing slash. Multiple allowed origins are comma-separated. Temporary
   localhost values can be used during creation and replaced after the URLs are assigned.
3. On Vercel choose root directory `web`, use npm with `package-lock.json`, and set
   `NEXT_PUBLIC_API_URL=https://<render-host>/api` before building.
4. Wait for Postgres initialization and successful API migrations before triggering ingestion.
   If initial migrations fail because Postgres is starting, redeploy the API once Postgres is ready.
5. Trigger both ingestion jobs and inspect their source results. Check `/health`, `/ready`,
   `/api/roads`, and `/api/map/districts`, then verify the live web app.

`DB_SSL=false` applies to the Render private Postgres connection only; it does not traverse the
public internet. The Postgres service has no public endpoint. External database connections
should use `DB_SSL=true`, with `DB_SSL_CA` if needed. Do not expose this Postgres instance as a
web service. Ensure environment isolation rules permit the API and cron jobs to reach it.

Switching an existing deployment to this Blueprint does not transfer external database data.
The `MYSQL_*` initialization variables create users only on an empty disk. To rotate a
password later, change it in Postgres and update the corresponding Render environment variable,
then sync the Blueprint to propagate the value. Never delete the disk to reset credentials.

Alerts run every 15 minutes. Reference ingestion (`--all`, which also includes alerts)
runs at Saturday 20:30 UTC, or Sunday 02:00 IST. Render cron schedules use
[UTC](https://render.com/docs/cronjobs).

The production image deliberately retains devDependencies, scripts, and SQL source files:
the migration and ingestion CLIs require `tsx`, and TypeScript does not copy SQL assets.

After deployment, collect outbound ranges from each Render service's Connect → Outbound
panel. Confirm IMD accepts the shared regional CIDR ranges before submitting the
whitelisting request; a dedicated static IP is not included by default.
See [Render outbound IPs](https://render.com/docs/outbound-ip-addresses).

The generic rollout and monitoring placeholders below remain to be filled when production
is provisioned.

| Step | How |
|---|---|
| Trigger | `<push tag v*>` |
| Migrations | run **before** the rollout, backward-compatible only |
| Rollout | `<rolling, maxUnavailable 0, readiness gated>` |
| Smoke test | `<what runs after deploy>` |
| Rollback | redeploy the previous image tag: `<command>` |

Images are tagged by git SHA and are immutable. `latest` is not deployable.

## Health

| Endpoint | Checks |
|---|---|
| `GET /health` | process alive only — **no** dependency checks |
| `GET /ready` | DB pool ping |

## Monitoring

| Signal | Where | Alert threshold |
|---|---|---|
| 5xx rate | `<tool>` | > 1% over 5 min |
| p95 latency | `<tool>` | > 1 s over 10 min |
| `/ready` failing | `<tool>` | any instance > 2 min |
| DB pool saturation | `<tool>` | > 80% for 5 min |
| Crash-free sessions (mobile) | `<Sentry>` | < 99.5% |

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

| | |
|---|---|
| Rotation | `<who / schedule>` |
| Escalation | `<path>` |
| Paging | `<tool>` |

## Postgres backups and recovery

**Not yet configured:** automated logical backups, separate backup storage, retention,
monitoring of backup failures, and a verified restore. Assign these before production use.
Render disk snapshots are not a substitute for a consistent Postgres backup; see
[Render's Postgres backup guidance](https://render.com/docs/deploy-postgres#backups).

- Run `mysqldump` using `--single-transaction --quick --no-tablespaces` for the application
  schema from a trusted host on the private network. Avoid schema changes during the dump.
  Supply credentials through a protected client option file, not command-line arguments.
- Store encrypted backups outside the database service and its disk. Restrict access and
  configure retention with the selected storage provider.
- Restore into a separate PostgreSQL 16 instance and verify the migration ledger, row counts,
  API readiness, district geometry, and road data before any production cutover.
- Before Postgres image upgrades, create and verify a logical backup. Test the upgrade on a
  restored copy; do not assume downgrading the image can reverse an on-disk format change.
