# BasicTech Engineering Standard — Agent Entry Point

You are working inside a project generated from the **BasicTech project template**.
This file is the single entry point. Everything else is reachable from here.

**Read this file fully before writing any code. Then read only the guideline files
relevant to the layer you are touching.**

---

## 1. Non-negotiables

These apply to every project, every layer, every PR. Violating any of these is a blocking review comment.

| # | Rule |
|---|------|
| N1 | **Understand before you build.** Read `project/overview.md`, the module doc for the part you're touching, and the guideline files for that layer — before writing anything. |
| N2 | **TypeScript everywhere, `strict: true`, no `any`.** See [guidelines/common/02-typescript-language-rules.md](guidelines/common/02-typescript-language-rules.md). |
| N3 | **Errors are values, not exceptions,** across layer boundaries. Backend uses `neverthrow` `Result<T, RequestError>`. See [guidelines/common/04-error-model.md](guidelines/common/04-error-model.md). |
| N4 | **Every error has a stable numeric code** registered in the central `ERRORS` registry. Never invent an inline error message. |
| N5 | **Validate at every boundary with Zod.** HTTP in, HTTP out, env vars, localStorage, deep links. Never trust a network payload's shape. |
| N6 | **One folder structure.** Backend is layered; frontend/mobile are feature-sliced. Do not invent new top-level folders. |
| N7 | **No `console.log` in committed code.** Use the project logger. See [guidelines/common/05-logging-and-observability.md](guidelines/common/05-logging-and-observability.md). |
| N8 | **No secrets in code, and no `process.env.X` outside `config/env.ts`.** |
| N9 | **Tests ship with the code**, in the same PR, at the coverage bar in [guidelines/common/09-testing-strategy.md](guidelines/common/09-testing-strategy.md). |
| N10 | **Only approved libraries.** Adding a dependency is a deliberate decision, not a reflex. See [guidelines/common/13-approved-libraries.md](guidelines/common/13-approved-libraries.md). |

---

## 2. Repository map

```
CLAUDE.md                 <- you are here
README.md                 <- how a human uses this template
.claude/
  skills/                 <- kickstart-project
  agents/                 <- role-scoped subagents
  settings.json
project/                  <- the truth about THIS software
  overview.md             <- L1: what it is + the module map
  modules/<part>.md       <- L2: one doc per independent part
  operations.md           <- how it runs
guidelines/               <- how BasicTech builds ANY software
  README.md               <- full index of every guideline file
  common/                 <- applies to ALL layers. Read first.
  backend/                <- Express + MySQL API server
  frontend/               <- Next.js App Router web app
  mobile/                 <- Expo + React Native app
```

**`project/` is what, `guidelines/` is how.** If a rule would be true on any BasicTech project
it belongs in `guidelines/`; if it is only true here, it belongs in `project/`.

If `project/overview.md` is still full of `<placeholders>`, run the **kickstart-project** skill
before writing any code.

---

## 3. What to read

**First, for context — what this software is:**

1. [project/overview.md](project/overview.md) — the software and its module map
2. `project/modules/<part>.md` — the part you're touching, plus any module it depends on

**Then, for rules — how we build it.** Full index: [guidelines/README.md](guidelines/README.md)

Always (all layers):

- [common/01-engineering-principles.md](guidelines/common/01-engineering-principles.md)
- [common/02-typescript-language-rules.md](guidelines/common/02-typescript-language-rules.md)
- [common/03-naming-and-conventions.md](guidelines/common/03-naming-and-conventions.md)
- [common/04-error-model.md](guidelines/common/04-error-model.md)
- [common/06-api-contract.md](guidelines/common/06-api-contract.md)

Then, by layer:

| Working on | Read |
|---|---|
| API server / DB | [guidelines/backend/](guidelines/backend/) — all 12 files |
| Web app | [guidelines/frontend/](guidelines/frontend/) — all 11 files |
| Mobile app | [guidelines/mobile/00-read-this-first.md](guidelines/mobile/00-read-this-first.md) first, then the rest |

> **Mobile reuses the React rules.** `guidelines/mobile/` documents only what *differs* from
> the web guideline. If a mobile file says "same as web", go read the web file.

---

## 4. How to work

```
read      ->  project/overview.md + the module doc + the guidelines for this layer
build     ->  one coherent change at a time, tests written alongside the code
verify    ->  npm run typecheck && npm run lint && npm test
self-review -> against the checklist at the end of each guideline file
record    ->  update the module doc if the API, schema, rules, or UI changed
```

Every guideline file ends with a checklist. That checklist is what a reviewer will check, so
check it yourself first.

If a fact you need isn't in `project/`, **ask** — then write the answer into the right module
doc as part of your change. Never invent a business rule.

---

## 5. Standard commands

Every BasicTech repo exposes the same script names. Never invent new ones.

| Intent | Command |
|---|---|
| Install | `npm ci` |
| Run dev | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Format | `npm run format` |
| Unit + integration tests | `npm test` |
| E2E (web) | `npm run e2e` |
| Storybook (web) | `npm run storybook` |
| Build | `npm run build` |

Before declaring any task done, run: `npm run typecheck && npm run lint && npm test`.

---

## 6. Agent behaviour rules

1. **Ask before assuming.** If a requirement is ambiguous or a decision is missing, stop and ask.
2. **Small diffs.** One coherent change per PR. Do not refactor adjacent code "while you're there".
3. **No new abstractions for a single call site.** See `common/01`.
4. **Mirror existing files.** Before creating `foo.repository.ts`, open the nearest existing repository and match it exactly.
5. **Say when the approach changes.** If implementation forces a different design than discussed, surface it rather than diverging silently.
6. **Never disable a lint rule** to make code pass. Fix the code, or raise it in review.
7. **Never commit** `.env`, database data directories, `error.log`, or build output.
