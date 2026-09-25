# Module: `governance`

|             |                                                                                         |
| ----------- | --------------------------------------------------------------------------------------- |
| **Owner**   | Team Pahad Pulse                                                                        |
| **Status**  | in progress — public evidence workspace built; source permission still open             |
| **Backend** | `src/controllers/governance.controller.ts`, `src/repositories/governance.repository.ts` |
| **Web**     | `src/features/governance/`                                                              |
| **Mobile**  | not built                                                                               |

---

## 1. Purpose

Turns already-public government evidence into an accountability workspace: what the state
allocated, which district indicators are relatively strong or weak, and which current warnings
need attention. It arranges and explains evidence; it does not score departments, predict
outcomes, or claim that an allocation was spent.

## 2. Boundaries

**Owns**

- Department-level budget allocations and their demand numbers
- The district-standing calculation used by the governance workspace
- The `/governance` public evidence workspace

**Does not own**

- Indicator definitions or observations — see `indicators.md`
- Alerts or map warnings — see `alerts.md`
- Source licensing, freshness, or provenance — see `datasets.md`
- Officer identity or private workflows — see `accounts.md`; these remain post-v1

**Used by other modules via**

- `GET /api/governance/budget` for demand-wise allocations
- `GET /api/governance/district-standing` for comparable district evidence

**Depends on**

| Module       | For                                 | How                                                  |
| ------------ | ----------------------------------- | ---------------------------------------------------- |
| `datasets`   | provenance and redistribution guard | `attachProvenance`, `publiclyDisplayable`            |
| `indicators` | full-coverage district series       | indicator definitions and values                     |
| `geography`  | the canonical 13 districts          | `areas` table                                        |
| `alerts`     | current public warnings             | existing alert and map services in the web workspace |

## 3. Domain

### Entities

| Entity           | Key fields                                                       | Notes                                               |
| ---------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| DepartmentBudget | `fiscal_year, demand_no, revenue_*, capital_*, total, source_id` | Stored in thousands of rupees, exactly as published |
| DistrictProfile  | `district, ranked, strengths, weaknesses`                        | Derived at read time; never persisted               |
| RankedIndicator  | `indicator, vintage, value, rank, of`                            | Ties share a rank                                   |

### Rules

| #     | Rule                                                                                                                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| GOV-1 | Every displayed allocation carries source provenance and passes the source redistribution guard.                                       |
| GOV-2 | Budget estimates are described as allocations, never expenditure or outcomes.                                                          |
| GOV-3 | A district indicator is ranked only when all 13 districts have a value from one vintage and the indicator declares a better direction. |
| GOV-4 | Ties receive the same rank; a stable alphabetical order only makes tied rows deterministic.                                            |
| GOV-5 | Missing, partial, or directionless evidence is labelled and excluded, never converted to zero.                                         |
| GOV-6 | The current workspace is public and read-only. No simulated login protects data that is already public.                                |

### Permissions

| Action                                    | Public | Officer | Operator                                   |
| ----------------------------------------- | ------ | ------- | ------------------------------------------ |
| Read cleared budget and district evidence | yes    | yes     | yes                                        |
| Change a source's redistribution status   | no     | no      | yes, through datasets operations           |
| Publish or edit an allocation             | no     | no      | no — data arrives from a registered source |
| Private workflow or intervention tracking | no     | post-v1 | post-v1                                    |

## 4. Data

| Table                | Purpose                      | Notes                                                                 |
| -------------------- | ---------------------------- | --------------------------------------------------------------------- |
| `department_budgets` | demand-wise budget estimates | one row per fiscal year and demand; component sum enforced by `CHECK` |

### Indexes and why

| Index                                                   | Serves                                              |
| ------------------------------------------------------- | --------------------------------------------------- |
| `idx_department_budgets_year (fiscal_year, total DESC)` | latest-year workspace ordered by largest allocation |
| unique `(fiscal_year, demand_no)`                       | idempotent transcription and source cross-checking  |

### Migrations

| #   | File                         | What                                                                      |
| --- | ---------------------------- | ------------------------------------------------------------------------- |
| 056 | `056-department-budgets.sql` | registers the Budget Directorate source and stores 31 demands for 2026-27 |

The 31 stored demands sum to 1,117,032,109 thousand rupees (₹1,11,703 crore), the total printed
in the source document. The database also rejects a row when its four components do not equal
its published total.

## 5. API

| Method | Path                                  | Auth | Cache         | Paginated |
| ------ | ------------------------------------- | ---- | ------------- | --------- |
| GET    | `/api/governance/budget?year=2026-27` | none | indicator TTL | no        |
| GET    | `/api/governance/district-standing`   | none | indicator TTL | no        |

`/budget` defaults to the latest stored fiscal year. Its totals and shares are computed only
from rows cleared for public display. `/district-standing` returns the evidence used, excluded
indicators with reasons, profiles, and a need-oriented ordering; it is a comparison, not an
official government ranking.

### Error code range

`95xxx` remains reserved for future governance-specific write workflows. Current reads use the
shared validation and database errors.

## 6. UI

| Surface | Route         | Rendering        | Notes                                                                      |
| ------- | ------------- | ---------------- | -------------------------------------------------------------------------- |
| Web     | `/governance` | Server Component | budget, evidence queue, warnings, map and full accessible allocation table |

The page is deliberately labelled a public preview. It keeps source/vintage language beside
the evidence and remains useful when any one upstream service fails.

## 7. Failure modes

| Failure                                | User sees                                                 | Handling                                     |
| -------------------------------------- | --------------------------------------------------------- | -------------------------------------------- |
| Budget unavailable or contract invalid | explicit unavailable state; other workspace panels remain | independent settled loads                    |
| District series partial                | excluded evidence with a coverage reason                  | GOV-3 and GOV-5                              |
| Alerts or map unavailable              | that panel degrades independently                         | no whole-page failure                        |
| Source not cleared for redistribution  | no budget rows from that source                           | enforced in the controller, not the template |

## 8. Decisions

### 2026-09-24 — Launch the evidence workspace publicly before private officer workflows

**Context:** Budget allocations, district indicators, and public warnings are already public;
accounts and an officer workflow are not built.
**Decision:** Ship a read-only public workspace and reserve authenticated intervention tools for
a later module increment.
**Because:** An auth placeholder creates no safety or value, while residents, journalists, and
administrators can all use the same sourced evidence now.
**Costs:** The page must not imply that it is an official administrative decision system.
**Revisit if:** officer-only notes, assignments, or non-public datasets are introduced.

### 2026-09-24 — Store the published budget unit and derive display units

**Context:** The source publishes thousands of rupees while people commonly read crore.
**Decision:** Persist the source unit and convert only at the display boundary.
**Because:** It preserves exact source values and avoids permanent rounding.
**Costs:** Every consumer must use the documented conversion.
**Revisit if:** a future source publishes a different unit; add an explicit unit column first.

## 9. Open questions

- [ ] Obtain and record the Budget Directorate's reproduction permission before production;
      its website policy requests prior permission even when attribution is provided. — _owner: Team Pahad Pulse_
- [ ] Add revised estimates and actual expenditure when an official, machine-readable source is
      registered; never infer them from budget estimates. — _owner: Team Pahad Pulse_
- [ ] Decide which future actions genuinely require officer authentication. — _owner: Team Pahad Pulse_
