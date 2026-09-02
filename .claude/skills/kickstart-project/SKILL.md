---
name: kickstart-project
description: Bootstrap a new or undocumented project's `project/` folder. Use when starting a new project, when `project/overview.md` is still full of `<placeholders>`, or when an existing codebase has no module docs. Interviews the user, proposes a module split, then writes overview.md and one doc per module.
---

# Kickstart Project

Turn "we're building X" into a filled-in `project/` folder: an L1 overview and one L2 doc per
independent part. **This skill writes documentation only. It never writes application code.**

---

## When to run

| Situation | Run it? |
|---|---|
| Brand-new project, empty `project/` | ✅ |
| `project/overview.md` still has `<placeholders>` | ✅ |
| Existing codebase, no module docs | ✅ — derive the split from the code |
| Adding one module to an already-documented project | ❌ — just copy `_TEMPLATE.md` |
| Overview is filled and modules exist | ❌ — say so and stop |

Check first. If `project/overview.md` has no `<` placeholders and `project/modules/` contains
files other than `_TEMPLATE.md`, tell the user it's already bootstrapped and ask what they
actually want changed.

---

## Phase 0 — Orient

1. Read `project/README.md` — especially **"How to split into parts"**. Those tests decide the
   module boundaries. Do not invent your own criteria.
2. Read `project/modules/_TEMPLATE.md` — the shape every module doc must follow.
3. Look for existing code. If `src/` exists anywhere, skim it: route files, table names,
   feature folders. An existing codebase already implies a split — derive it and confirm,
   rather than asking from scratch.

---

## Phase 1 — Interview

**Ask in one batch, not one question at a time.** Only ask what you cannot infer from the
codebase or from what the user already said.

Core questions:

1. **What does this software do, and for whom?** One or two sentences.
2. **What are the user roles**, and what can each do?
3. **Which platforms** — API, web, mobile? Any of them not in this repo?
4. **What are the main things users create or act on?** (These usually become modules.)
5. **Anything with a lifecycle** — does something move through states like draft → approved?
6. **What's explicitly out of scope** for v1?
7. **Anything unusual** — offline support, real-time, heavy media, compliance, existing clients
   you can't break?

Follow-ups only if the answers leave a real gap. Don't interrogate.

If the user is vague, **propose a concrete interpretation and ask them to correct it.** That is
faster than another round of open questions:

> "So: authors write articles, admins approve them, readers browse published ones. Content is
> tagged by region and category. Is that right?"

---

## Phase 2 — Propose the split

This is the part that matters. Get it wrong and every later doc is wrong.

1. List candidate modules from the nouns in the user's answers (or from the code's domains).
2. Test each against `project/README.md`: owns its data, owns its rules, narrow surface, names
   itself without "and", fails alone.
3. Merge anything that fails. Aim for **3–8 modules** on a first pass.
4. Draw the dependency graph. Flag any cycle — it usually means a boundary is wrong.

Present it as a table and **wait for approval before writing files**:

```
Proposed split:

| Module   | Owns                                          | Depends on      |
|----------|-----------------------------------------------|-----------------|
| auth     | login, tokens, sessions, password reset       | accounts        |
| accounts | author + admin accounts, profiles             | —               |
| articles | article lifecycle, moderation, public feeds   | accounts, media |
| media    | image upload, storage, delivery               | —               |

Notes:
- Folded "tags" into articles — it has no rules of its own.
- "notifications" left out; you said out of scope for v1.
```

Say what you merged and why. That is where the user will disagree, and it's cheap to fix now.

---

## Phase 3 — Write `project/overview.md`

Fill every section from the interview. Rules:

- **Never invent a business rule.** Anything you weren't told becomes an explicit gap —
  `<TBD: ...>` — and goes in your final report.
- Fill the **glossary** properly. It is the highest-value section and the one people skip.
- Fill the **module map** table and the Mermaid dependency graph.
- Add cross-module flows only for genuinely cross-module journeys (e.g. "author publishes an
  article" spanning auth → media → articles). Self-contained flows belong in module docs.
- Fill **global constraints** with anything that shapes every module — timezone policy, error
  code ranges, shipped clients you can't break.
- Stack rows: use the defaults from `guidelines/common/13-approved-libraries.md` unless the
  user said otherwise.

---

## Phase 4 — Write the module docs

For each approved module, copy `project/modules/_TEMPLATE.md` to
`project/modules/<name>.md` and fill it in.

| Section | Fill it if… |
|---|---|
| Purpose, Boundaries | **always** — even a first draft. This is what makes modules independent. |
| Domain (entities, enums, states, rules, permissions) | you were told, or the code shows it |
| Data | you know the tables, or can read the migrations |
| API | endpoints are known or already exist |
| UI | routes/screens are known |
| Failure modes | at minimum the obvious external-dependency failures |
| Decisions | only real decisions already made |
| Open questions | **always** — this is where the gaps go |

Rules:

- **Keep the section order.** Delete sections that truly don't apply; never reorder.
- Leave `<placeholder>` text where a fact is genuinely unknown, and mirror it into
  **§9 Open questions** with an owner. A placeholder nobody knows about is a lie waiting to
  be believed.
- Be concrete where you *do* know. A half-filled doc with real facts beats a full doc of guesses.
- Don't copy generic rules out of `guidelines/` into module docs. Link instead.
- Assign an error-code range per module in `overview.md` global constraints, and record it in
  each module's §5.

---

## Phase 5 — Report

```
project/ bootstrapped.

Written:
  project/overview.md          4 modules mapped
  project/modules/auth.md
  project/modules/accounts.md
  project/modules/articles.md
  project/modules/media.md

Decisions I made for you (correct me if wrong):
  - folded "tags" into articles — no rules of its own
  - error ranges: accounts 3xxxx, admin 4xxxx, articles 5xxxx, media 7xxxx

Open questions blocking implementation (7):
  articles.md  — what happens to a scheduled article if it's un-approved first?
  media.md     — max upload size? which storage provider?
  auth.md      — is self-serve author signup allowed, or admin-invite only?
  ...

Next: answer the blocking questions, then start with `<module>` — nothing depends on it.
```

Recommend a starting module: one with **no dependencies**, so work can begin without waiting.

---

## Hard rules

1. **No application code.** Not a schema, not a route, not a component. Documentation only.
2. **Never invent a business rule, a permission, or a state transition.** Ask, or mark `<TBD>`.
3. **Get the split approved before writing files.** Rewriting eight module docs is expensive;
   changing a table row is free.
4. **Ask in batches.** One round of seven questions, not seven rounds of one.
5. **Don't duplicate `guidelines/`.** If a rule is true for any BasicTech project, link to it.
6. **Stop at 8 modules.** More than that on a first pass means the split is too fine — merge
   and say so.
7. **Every `<placeholder>` you leave must appear in that module's Open questions.**
