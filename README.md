# BasicTech Project Template

A Claude Code template that encodes BasicTech's engineering standard for **backend (Express + MySQL)**,
**web (Next.js)**, and **mobile (Expo + React Native)** projects, plus a spec-driven development
workflow so that any engineer — or any agent — produces the same shape of software.

## Why this exists

Cross-functional collaboration only works if every project looks the same. If a backend engineer
opens a frontend repo, they should already know where the API calls live. If a mobile engineer
opens the backend, they should already know where an endpoint's validation schema is. This template
is the contract that makes that true.

## What's inside

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Agent entry point. Non-negotiable rules + navigation. |
| `project/` | **The truth about this software.** `overview.md` (what it is + the module map), then one doc per independent part in `modules/`. |
| `.claude/skills/kickstart-project/` | Interviews you, proposes a module split, and fills in `project/`. |
| `guidelines/common/` | Rules that apply to all layers: TS config, naming, error model, logging, security, testing, tooling, approved libraries. |
| `guidelines/backend/` | Folder structure, HLD, LLD, API design, DB, errors, code quality, testing, security, caching, pagination, deployment. |
| `guidelines/frontend/` | Folder structure, HLD, LLD, UI/design system, state & data fetching, forms, code quality, testing, Storybook, perf/SEO, a11y. |
| `guidelines/mobile/` | Expo/React Native deltas from the web guideline: structure, HLD, LLD, UI, navigation, data, quality, testing, native concerns, release. |
| `.claude/agents/` | Role-scoped subagents (backend, frontend, mobile, reviewer). |

## How to start a new project

```bash
# 1. Copy the template
degit basictech01/claude-template my-new-project   # or: cp -R claude-template my-new-project
cd my-new-project

# 2. Open Claude Code and describe the software — the kickstart-project skill will
#    interview you, propose a module split, and write:
#      project/overview.md         what it is, who uses it, how it splits into parts
#      project/modules/<part>.md   one doc per part

# 3. Scaffold the app(s) you need, following the folder-structure guideline for each layer
#    guidelines/backend/01-folder-structure.md
#    guidelines/frontend/01-folder-structure.md
#    guidelines/mobile/01-folder-structure.md

# 4. Build, starting with a module nothing depends on
```

Step 2 is the one people skip and regret. The module split decides who can work in parallel.

## How to work day to day

```
read      ->  project/overview.md + the module doc + the guidelines for that layer
build     ->  one coherent change at a time, tests alongside the code
verify    ->  npm run typecheck && npm run lint && npm test
self-review -> against the checklist at the end of each guideline file
record    ->  update the module doc if the API, schema, rules, or UI changed
```

Every guideline file ends with a checklist. That checklist is what a reviewer checks, so check
it yourself first. Use the `code-reviewer` subagent to audit a diff before opening a PR.

## How to change a guideline

Guidelines are versioned code, not folklore.

1. Open a PR against this template.
2. Explain what changes, why, and what it costs.
3. Get one approval from a tech lead.
4. Downstream projects pull the change deliberately — never silently.
