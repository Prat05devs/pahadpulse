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
