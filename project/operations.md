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

The deployment configuration is in [`render.yaml`](../render.yaml). Deployment is pending;
the external managed MySQL provider is undecided. The Git remote already points to
`git@github.com:Prat05devs/pahadpulse.git`.

1. Provision a MySQL 8 service compatible with the migrations in `backend/`. Record its
   hostname, port, database, username, password, and any CA certificate it supplies.
2. Push the reviewed changes, then create a Render Blueprint from the repository.
3. Enter the same `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` for all three
   services. `DB_SSL=true` enables certificate and hostname verification. If the provider
   supplies a private CA, add `DB_SSL_CA` to all three services in Render's dashboard, using
   the PEM contents (actual newlines or literal `\n` escapes). Otherwise leave it unset to
   use Node's trusted CAs. Use the provider's hostname, not a custom alias.
4. Set the API's `SERVER_URL` to its public HTTPS origin and `CORS_ORIGIN` to the Vercel
   origin, with no trailing slash. Multiple allowed origins are comma-separated.
5. On Vercel choose root directory `web`, use npm with `package-lock.json`, and set
   `NEXT_PUBLIC_API_URL=https://<render-host>/api` before building.
6. Confirm the API pre-deploy migration succeeds before triggering the first ingestion
   runs. Check `/health`, `/ready`, `/api/roads`, and `/api/map/layers` after deployment.

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
