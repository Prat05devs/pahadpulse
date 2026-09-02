# 12 — Git Workflow & Code Review

---

## 1. Branching

Trunk-based. `main` is always releasable.

```
main
 └── prapande/feat/article-scheduling
 └── ananya/fix/pagination-cursor-drift
```

- Branch name: `<author>/<type>/<short-slug>` — types: `feat` `fix` `chore` `refactor` `docs` `test` `perf` `ci`.
- Branch from latest `main`. **Rebase** onto `main` before opening the PR — never merge `main` into your branch.
- Branch lifetime ≤ 3 days. Longer means the task wasn't decomposed enough.
- Delete the branch on merge.

`main` protection: no direct pushes, required status checks, ≥ 1 approval, linear history,
squash merge only.

---

## 2. Commits

Conventional Commits, enforced by `commitlint`.

```
<type>(<scope>): <subject>

<body — what changed and why, wrapped at 72>

Refs: #142
```

- `type`: `feat` `fix` `chore` `refactor` `docs` `test` `perf` `ci` `build` `revert`
- `scope`: domain (`article`, `auth`, `web-story`) or layer (`api`, `web`, `mobile`, `db`)
- `subject`: imperative, lowercase, no trailing period, ≤ 72 chars
- Breaking change: `feat(api)!: ...` plus a `BREAKING CHANGE:` footer

Each commit compiles and passes tests on its own. Squash locally before pushing rather than
pushing a chain of "wip" commits.

---

## 3. Pull requests

### Size and scope

- Target < 400 changed lines (excluding lockfiles, snapshots, generated files).
- One concern per PR. Feature + refactor = two PRs.
- Stacked PRs are preferred over one large PR.

### Template

```markdown
## What
One paragraph.

## Why
Link the ticket: `#142`
What problem this solves, in one or two sentences.

## How
Key design decisions and anything a reviewer would otherwise have to reverse-engineer.

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manually verified: <steps>

## Screenshots / recordings
(UI changes only — before & after, mobile + desktop)

## Risk & rollback
Migration? Backfill? Feature flag? How do we revert?

## Checklist
- [ ] `npm run verify` passes
- [ ] No new lint suppressions
- [ ] Module doc updated if the API, schema, rules, or ops changed
- [ ] No secrets, no debug logging, no commented-out code
- [ ] Error codes registered and documented
```

### Author responsibilities

1. Self-review the full diff in the GitHub UI before requesting review.
2. Leave inline comments explaining anything non-obvious — pre-empt the questions.
3. Keep the PR green. A red PR is not ready for review.
4. Reply to every comment; don't silently push a change.

### Reviewer responsibilities

1. Respond within one working day.
2. Review in this order: **spec conformance → architecture/layering → correctness → security →
   tests → naming → style**. Style is last and is mostly the linter's job.
3. Use the comment taxonomy: `blocking:` / `question:` / `nit:` / `praise:`.
4. Approve when it is *better than what's there*, not when it is perfect.
5. If the PR is too big to review properly, say so and ask for a split — that is a valid review outcome.

---

## 4. What a reviewer must check

| Area | Question |
|---|---|
| Scope | Does this do what the ticket asked, and nothing extra? |
| Layering | Any downward-only violations? SQL in a controller? `fetch` in a component? |
| Error model | Registry codes used? No `throw` across layers? Every branch tested? |
| Security | Parameterised SQL? Auth + ownership? Secrets? Actor from token? |
| Boundaries | Zod at every untrusted input? |
| Naming | Matches `03-naming-and-conventions.md`? |
| Tests | Behaviour, not implementation? Error branches covered? Deterministic? |
| Observability | Failures logged with `requestId` and enough context? |
| Structure | Files in the right folders? No new top-level folder? |
| Deletion | Is anything now dead that should have been removed? |

---

## 5. Merging

- **Squash merge** into `main`. The squash message is the PR title in Conventional Commit form.
- Never merge with failing checks, unresolved `blocking:` comments, or an out-of-date branch.
- The author merges (not the reviewer) — the author owns the deploy.
- Revert with `git revert`; never force-push `main`.

---

## 6. Handling conflicts and hotfixes

- Conflicts are resolved by the author, by rebasing. Re-run `npm run verify` after resolving.
- Hotfix: branch from `main` as `<author>/fix/<slug>`, minimal diff, same review bar,
  fast-tracked review. A hotfix still needs a test that would have caught the bug.

---

## 7. Things that are never acceptable

- `git commit --no-verify` to skip hooks.
- Force-pushing a shared branch someone else is reviewing.
- Committing directly to `main`.
- Merging your own PR without an approval.
- "Fix lint" commits that add `eslint-disable` lines.
- Committing `.env`, data directories, logs, or build output.
- A PR whose description is "updates".
