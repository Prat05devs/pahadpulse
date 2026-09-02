# Project

**`guidelines/` is how BasicTech builds anything. `project/` is the truth about *this* software.**

This folder is written **top-down**:

```
overview.md          L1 — what the whole software is, and how it splits into parts
modules/<part>.md    L2 — one document per independent part
operations.md         —  how it runs (cross-cutting; belongs to no single part)
```

Write `overview.md` first. Decide the split. Then write one module doc per part — and only
then write code.

> Starting from scratch, or staring at a folder full of `<placeholders>`? Run the
> **kickstart-project** skill. It interviews you, proposes a split, and fills all of this in.

---

## Level 1 — `overview.md`

The whole software in one page: what it does, who uses it, the stack, the glossary, and — most
importantly — **the module map**: the independent parts and how they relate.

Getting the split right is the highest-leverage decision in this folder. See "How to split" below.

## Level 2 — `modules/<part>.md`

One document per independent part. **Every module doc follows the same shape**, defined in
[modules/_TEMPLATE.md](modules/_TEMPLATE.md) — copy it, don't invent a new layout.

A module doc owns everything about its part: domain rules, data, endpoints, screens, failure
modes. If you're changing article publishing, you open `modules/articles.md` and it's all there.

```
project/modules/
  _TEMPLATE.md      copy this
  auth.md
  articles.md
  authors.md
  media.md
```

---

## How to split into parts

A good module is one you could hand to one engineer and have them work for a week without
constantly asking about someone else's code.

**Split by domain capability, not by technical layer.** `articles` is a module.
`controllers` is not.

A part is a good part when:

| Test | |
|---|---|
| **Owns its data** | It has tables no other module writes to. |
| **Owns its rules** | Its business logic lives in one place. |
| **Has a narrow surface** | Other modules use it through a few named operations, not by reaching into its internals. |
| **Names itself easily** | If the name needs "and" or "misc", it's two modules, or none. |
| **Fails alone** | You can say what breaks when it's down without describing the whole app. |

Signs the split is wrong:

- Two modules both write the same table → they're one module, or one owns it and the other asks.
- A module doc is mostly links to other modules → it isn't independent.
- A module has no data and no rules → it's a utility, not a module. Don't give it a doc.
- More than ~8 modules on the first pass → too fine. Group them.

Modules are a **documentation and ownership** boundary. They don't have to match the folder
structure: the backend stays layered and the frontend stays feature-sliced, per `guidelines/`.
In practice one module maps to one backend domain (`article.controller.ts`,
`article.repository.ts`) and one frontend feature (`features/article/`).

---

## Rules

1. **Facts, not plans.** These describe what *is* or what is *agreed* — not a backlog.
2. **Short.** Past ~200 lines it stops being read. Split the module.
3. **Same shape every time.** Module docs use `_TEMPLATE.md`. Predictability is the point.
4. **Updated in the same PR** that changes the thing described. Reviewers check this.
5. **No duplication of `guidelines/`.** Generic rules live there; project facts live here.
6. **One owner per fact.** If a rule appears in two module docs, one of them is wrong.

---

## For agents

Before implementing anything in this repo:

1. Read [overview.md](overview.md) for context and the module map.
2. Read the module doc for the part you're touching, plus any module it depends on.
3. Read the `guidelines/` files for the layer you're touching.
4. If a fact you need isn't written down, **ask** — then write the answer into the right module
   doc as part of your change.
