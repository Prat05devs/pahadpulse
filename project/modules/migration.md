# Module: `migration`

| | |
|---|---|
| **Owner** | `<TBD>` |
| **Status** | built (district scope) |
| **Backend** | `src/controllers/migration.controller.ts`, `src/repositories/migration.repository.ts` |
| **Web** | `web/src/features/migration/`, `/migration`, the district page panel |
| **Mobile** | not in this repo |

---

## 1. Purpose

Owns what the Uttarakhand Rural Development and Migration Commission (Palayan Ayog) counted:
how many people left each district's gram panchayats, why, at what age, where they went, and
what became of the villages they left. Two survey rounds so far — 2008–2018 and 2018 to
September 2022 — published as PDFs and transcribed by hand.

This is the question the hill districts are actually organised around, and it is the one thing
Census 2011 cannot answer at all.

## 2. Boundaries

**Owns**
- The survey rounds, their field windows, and their coverage
- District migration counts, temporary and permanent, per round
- The survey instrument's answer options and their bilingual labels
- Per-district breakdowns: reasons, ages, destinations, occupation, village conditions

**Does not own**
- Village size classes — those are Census 2011 and live in `indicators`
  (`inhabited_villages`, `villages_under_200`, `share_villages_under_200`). They are the
  structural backdrop this module's figures act on, not a survey finding.
- Anything about who lives somewhere now. That is `indicators`.

**Depends on**

| Module | For | How |
|---|---|---|
| `geography` | resolving districts | `AreaRepository.findBySlug`, `listDistricts` |
| `datasets` | provenance, freshness, DS-6 | `attachProvenance`, `publiclyDisplayable` |

## 3. Domain

### Why this is not `indicator_values`

Most of this data is not one number. "Why did people leave" is eight shares that must sum to
100 and mean nothing read apart; "where did they go" is five more. Spreading a composition
across thirteen unrelated indicator keys loses the one property that makes it readable — that
the parts answer a single question and account for all of it — and nothing in
`indicator_values` can enforce it.

The headline counts *are* scalars and could have lived there. They are here so that a
district's figures and the breakdown explaining them cannot drift apart across two tables.

### Entities

| Entity | Key fields | Notes |
|---|---|---|
| Survey | `survey_key, label_*, covers_from, covers_to, published_on, gram_panchayats_surveyed, blocks_surveyed, source_id, evidence_url` | a round, with its own coverage |
| Category | `category_key, dimension, label_en, label_hi, sort_order, note_en` | the survey instrument's answer options |
| DistrictFigures | `survey_id, area_id, temporary_*, permanent_*, blocks_reporting` | the headline counts |
| Observation | `survey_id, area_id, category_key, value` | one answer; a share, or a village count |

### Enums

```ts
type MigrationDimension = 'reason' | 'age' | 'destination' | 'occupation' | 'village_condition';
type CoverageState = 'covered' | 'partial' | 'not_yet_available';
```

### Rules

| # | Rule |
|---|---|
| MIG-1 | Temporary and permanent counts are never summed. A temporary migrant keeps the house and returns; a permanent one has sold the land. A combined figure describes nobody. |
| MIG-2 | The four share dimensions sum to 100 per district per round. `village_condition` is counts and deliberately overlaps — a village with neither road nor power is counted under both — so it is never totalled. |
| MIG-3 | Breakdowns are **not** comparable across rounds and the API gives no structure that lets them be. 2022 merged farming, horticulture and dairy into one occupation option and added MGNREGA and self-employment; reasons, ages and destinations were asked in 2018 only. Only the counts may be trended. |
| MIG-4 | Categories keep the printed report's order, never value order, so a category sits in the same place when the reader moves between districts. |
| MIG-5 | Coverage is stated for every district, including those with nothing. A blank panel is indistinguishable from a broken one, and a district dropped from a comparison makes the comparison wrong silently. |
| MIG-6 | A district with fewer than two rounds has no `change`. `null`, never `0` — zero claims migration did not change. |

## 4. Data

| Table | Purpose |
|---|---|
| `migration_surveys` | one row per round |
| `migration_categories` | the answer options, bilingual |
| `migration_district_figures` | headline counts per round per district |
| `migration_observations` | one answer per round, district, category |

### Migrations

| File | What |
|---|---|
| `038-migration-surveys.sql` | schema |
| `039-seed-migration-surveys.sql` | source, both rounds, categories, every district figure |

## 5. API

| Method | Path | Auth | Cache | Paginated |
|---|---|---|---|---|
| GET | `/api/migration` | none | 24h | no |
| GET | `/api/areas/:slug/migration` | none | 24h | no |

### `GET /api/migration`

**Response 200** — `{ surveys, districts, totals }`. `districts` carries **all thirteen**
whatever the data does (MIG-5), each with a `coverage` and its own `figures` and `change`.
`totals` are summed from the districts actually served, so a DS-6 removal moves the headline
with the rows rather than contradicting them.

### `GET /api/areas/:slug/migration`

**Response 200** — `{ coverage, coverageNote, rounds, change }`. Each round nests its own
`figures` and `breakdowns` (MIG-3).

A district that exists but has no figures returns **200** with
`coverage: 'not_yet_available'`, not 404 — the question is answerable and the answer is "not
published yet". An unknown slug still 404s from the area lookup.

### Error code range

`55xxx` — allocated to this module. None allocated yet: every failure so far is an existing
`AREA_NOT_FOUND` or `DATABASE_ERROR`.

## 6. UI

- `/migration` — state table, every district, both rounds, signed change.
- District page — a panel with counts, the change, and each round's breakdowns as
  single-hue horizontal bars in printed order (MIG-4).

## 7. Sources

| Source key | Publisher | Access | Note |
|---|---|---|---|
| `uk-migration-commission` | Rural Development and Migration Commission, Uttarakhand | `manual` | Two PDF reports; there is no feed. |

Every district figure appears in two independently typeset reports and reconciles across
both; the per-district columns sum to the state totals each report states for itself. One
discrepancy is recorded rather than resolved: the 2023 prose says 28,631 permanent migrants
where its own tables say 28,531, and the tables add up.

## 8. Open questions

- [ ] Block-level figures. Both rounds publish all 95 development blocks, but `area_type` has
      no `block` — blocks are not tehsils. Seeding them changes the hierarchy every other
      module joins against. — *owner:* `<TBD>`
- [ ] The five Hindi district reports carry block-level socio-economic tables in legacy
      Kruti Dev font encoding, which needs a transliteration pass to read. — *owner:* `<TBD>`
- [ ] A third survey round, if the commission publishes one. Nothing here assumes two.
      — *owner:* `<TBD>`
