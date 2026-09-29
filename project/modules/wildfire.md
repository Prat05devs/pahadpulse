# Module: `wildfire`

| | |
|---|---|
| **Owner** | Pahad Pulse |
| **Status** | in progress |
| **Backend** | `src/services/ingestion/connectors/nasa-firms.*`, `src/repositories/fire.repository.ts`, `src/controllers/map.controller.ts` (`getFireFeatures`), `src/services/notification.service.ts` (`dispatchFireNotifications`) |
| **Web** | not yet. `/map/fires` is ready for the web map when wanted |
| **Mobile** | `src/features/map/` (fire layer and detail card), `src/features/notifications/` (tap routing) |

---

## 1. Purpose

Shows where NASA satellites have detected active fires in Uttarakhand over the last 48 hours,
and tells subscribed phones when a district gets new detections. Every detection is presented
as what it is: a hot pixel seen from orbit, not a fire confirmed on the ground.

## 2. Boundaries

**Owns**
- `fire_detections` and `fire_district_notices` (migration 068)
- the `nasa-firms` source row and connector
- the fire layer on the mobile map, and the fire notification rule

**Does not own**
- district boundaries (used to place each detection): `geography`
- device tokens and the Expo send/receipt pipeline: shared with `alerts`
- official fire reports: the Uttarakhand Forest Department. See §8 open questions.

**Depends on**

| Module | For | How |
|---|---|---|
| `geography` | which district a detection falls in, and dropping points outside the state | `ST_Covers` against `area_boundaries.geom` in `FireRepository.upsertMany` |
| `datasets` | run tracking, freshness, DS-6 redistribution flag | connector registry, `sources.may_redistribute` |
| `alerts` | push delivery | `DeviceRepository`, `sendBatch` in `notification.service.ts` |

## 3. Domain

### Entities

| Entity | Key fields | Notes |
|---|---|---|
| `FireDetection` | `source_event_id, area_id, sensor, confidence, frp_mw, location, acquired_at, notified_at` | Key is `sensor:lat:lng:date:time:satellite`, since FIRMS has no id |
| `FireDistrictNotice` | `area_id, notified_at, detection_count` | Last fire notification per district, for the cooldown |

### Rules

| # | Rule |
|---|---|
| WLD-1 | A detection is stored only if a district boundary covers it. The FIRMS query box is a rectangle; the state is not. |
| WLD-2 | Every surface that shows a detection (map card, notification) says it is a satellite heat signature and not confirmed on the ground. Nothing calls it a "forest fire". |
| WLD-3 | Low-confidence detections are mapped (fainter, smaller) but never pushed. Hiding them would be this product deciding what counts as a fire. |
| WLD-4 | At most one fire notification per district per 24 hours (`FIRE_PUSH.COOLDOWN_HOURS`). Product owner decision, 2026-09-29. |
| WLD-5 | A detection more than 12 hours old when it arrives is mapped but not pushed (`FIRE_PUSH.WINDOW_HOURS`). |
| WLD-6 | Confidence bands are the instruments' own: VIIRS `l/n/h`; MODIS <30 low, 30–79 nominal, ≥80 high. The raw value is stored next to the band. |

## 4. Data

- **Upstream:** `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/77.5,28.6,81.1,31.5/2`
  for `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, `MODIS_NRT`. That's three transactions per run,
  every 30 minutes, well inside FIRMS's 5,000 per 10 minutes.
- **Key:** `FIRMS_MAP_KEY`, set in Render (never in the mobile bundle). It sits in the URL path,
  so `fetchText` redacts it from logs. Without it the connector reports itself unavailable.
- **Licence:** NASA FIRMS data has no restrictions on use; attribution "NASA LANCE FIRMS, part of
  NASA ESDIS" is carried in every `/map/fires` response and in the map credits.
- **Retention:** not pruned yet. A heavy fire season is a few tens of thousands of small rows.

## 5. API

`GET /api/map/fires`: a GeoJSON FeatureCollection of Point features from the last 48 hours,
cached 5 minutes. Properties: `detectionId, acquiredAt, confidence, frpMw, satellite, instrument,
dayNight, districtSlug, districtNameEn, districtNameHi`, plus the collection's `attribution`.
Rows from a source with `may_redistribute = FALSE` are excluded in the query (DS-6).

## 6. UI

Mobile map: a **Fires** layer chip (on by default) with the 48-hour count. Points are coloured
by confidence and sized by fire radiative power, with a soft halo. Tapping one opens a card with
the district, time (relative and IST), confidence, power, instrument and satellite, and the
WLD-2 caveat. The legend shows the count; the credits name NASA FIRMS.

Push: `Satellite fire detection · <District>` with the number of heat signatures and the WLD-2
caveat. Tapping opens the map tab. It uses the existing `alerts` Android channel.

## 7. Failure modes

| Failure | Behaviour |
|---|---|
| No `FIRMS_MAP_KEY` | Run recorded as skipped with the reason; layer empty |
| Bad key / quota exhausted (FIRMS replies 200 with text) | Parser rejects the body; run fails. It is not read as "no fires" |
| One product down (satellite safe mode) | Others stored; run `partial_success`, notes name the missing product |
| `/map/fires` fails on the phone | Map still works; legend reads "fire data unavailable" |
| Expo unreachable | District left pending; next 5-minute pass retries |

## 8. Decisions and open questions

### 2026-09-29: FIRMS area API rather than the WMS layer

The WMS service returns rendered images. The area API returns points, which can be clipped to
the real state boundary, assigned to a district, tapped for detail, and used to trigger
notifications. The approach follows the AgniVision app's use of the same API; the code here was
written for this codebase, not copied.

### Open

- The Uttarakhand Forest Department publishes fire incidents and alerts (FSI also sends
  alerts). If either has a machine-readable feed, it should lead this module, and FIRMS
  should become the corroborating source.
- Web map layer: not built (product owner, 2026-09-29).
- A fire-specific Android channel, so readers can mute fires without muting flood warnings.
