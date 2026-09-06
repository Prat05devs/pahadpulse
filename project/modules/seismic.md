# Module: `seismic`

| | |
|---|---|
| **Owner** | `<TBD>` |
| **Status** | live |
| **Backend** | `src/controllers/seismic.controller.ts`, `src/repositories/seismic.repository.ts`, `src/models/seismic.model.ts`, `src/services/ingestion/connectors/usgs.connector.ts` |
| **Web** | `src/features/seismic/` |
| **Mobile** | not in this repo |

---

## 1. Purpose

Records earthquakes that have occurred in and around Uttarakhand, with magnitude, depth,
location and time.

The state sits in Seismic Zones IV and V. Earthquakes are not an occasional curiosity here,
they are a standing condition, and a public data portal for Uttarakhand that cannot say
whether the ground moved last week is missing something structural.

## 2. Boundaries

**Owns**
- Observed seismic events: magnitude, magnitude type, depth, epicentre, time, review status

**Does not own**
- Warnings, advisories or instructions — those belong to `alerts`, and only an authority
  issues them
- Any prediction whatsoever

**The rule that defines this module:** it reports what happened. It never forecasts, never
advises, and never implies an earthquake is expected.

## 3. Domain

### Why this is not part of `alerts`

`alerts` models time-bounded **warnings issued by an authority** (alerts.md §1). An
earthquake record is a measurement of something that has already occurred. Filing it as an
alert would force one of two errors:

- show a three-week-old M4.3 as an "active alert", or
- invent an `expires_at` the source never stated, which ALR-3 forbids

So it gets its own table and its own page section, visually separated from the warnings.

This does not contradict the GDACS decision (migration 022). GDACS publishes an ongoing,
scored humanitarian **alert level** with a validity window — that is a warning. USGS
publishes the fact that the ground moved.

### Entities

| Entity | Key fields | Notes |
|---|---|---|
| SeismicEvent | `source_event_id, magnitude, magnitude_type, depth_km, place, lat, lng, occurred_at, review_status` | |

### Rules

| # | Rule |
|---|---|
| SEI-1 | Upsert by `(source_id, source_event_id)`. USGS revises magnitude and depth for hours after an event; a revision replaces our row and never creates a second earthquake. |
| SEI-2 | An event with no computed magnitude is skipped, never stored as 0 — an unknown event must not render as a harmless one. |
| SEI-3 | `magnitude_type` is displayed. mb, ml and mw are not interchangeable, and a bare number implies a precision the source does not claim. |
| SEI-4 | `review_status = automatic` is shown as provisional. An unreviewed machine solution can still be revised in either direction. |
| SEI-5 | The source's own `place` string is stored verbatim and never re-derived into our district names — that would be us asserting a location the source did not state. |
| SEI-6 | Magnitude bands describe the EVENT, never its consequences. Actual shaking depends on depth, distance, geology and building stock, none of which this record knows. Damage assessment is the state disaster authority's job. |
| SEI-7 | No magnitude floor on ingestion. A small tremor in a fragile valley is information; filtering the feed would be this platform editorialising about what counts. The UI decides what to foreground. |

## 4. Data

| Table | Purpose |
|---|---|
| `seismic_events` | the event record |

### Migrations

| # | File | What |
|---|---|---|
| 027 | `027-create-seismic-and-air-metrics.sql` | `seismic_events`, plus air-quality metrics for hydromet |
| 028 | `028-seed-air-and-seismic-sources.sql` | the `usgs-earthquakes` registry row |

## 5. API

| Method | Path | Auth | Cache | Paginated |
|---|---|---|---|---|
| GET | `/api/seismic/recent` | none | 5m | no (`limit`, max 100) |

Returns recent events newest first, a 30-day count, and the largest event in the returned
set — labelled as the largest *recent* event, since the list is capped.

### Error code range

`75xxx` — allocated to this module.

## 6. UI

Rendered as a section on the Live Alerts page, **below and visually separated from** the
warnings. The section states in plain words that these are events which have already
happened and that earthquakes cannot be predicted — a seismic panel on a government
dashboard invites exactly that misreading.

## 7. Sources

| Source | Displayable | Notes |
|---|---|---|
| `usgs-earthquakes` | yes | US Government work, public domain. Keyless. Bounding box applied by the upstream query. |

**The National Center for Seismology (NCS) is the Indian authority** for earthquakes in
India and should lead this source chain once its terms are known — the same relationship
IMD has to Open-Meteo for weather. USGS is used because it is the fastest global feed with
an unambiguous open licence, not because it outranks NCS.

## 8. Open questions

- [ ] Does NCS publish a machine-readable feed, and on what terms? — *owner:* `<TBD>`
- [ ] Retention for `seismic_events`. The 90-day ingestion window is not a retention policy;
      rows accumulate indefinitely today. — *owner:* `<TBD>`
- [ ] Should events be attached to districts? Currently only an epicentre is stored, and
      SEI-5 deliberately avoids inferring a district from it. — *owner:* `<TBD>`
