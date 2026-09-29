# Pahad Pulse Mobile App — Design Context

> Current-state product and screen inventory for a ground-up UX/UI redesign.
>
> Reviewed from the Expo/React Native implementation in `mobile/` on 26 September 2026. This document describes what exists today, what each screen contains, how screens connect, and which product rules should remain true. It is not a proposed redesign or a pixel specification.

## 1. Product summary

Pahad Pulse is a public information app for Uttarakhand. It brings together official and attributable information that is otherwise spread across government departments: warnings, weather, roads, district statistics, tourism guidance, connectivity measurements, air quality, earthquakes, government schemes, and budget information.

The central product question is:

> What is happening in this district right now, and where did that information come from?

The app does not author official data and does not claim that a journey is safe. It collects, normalises, explains, and attributes information published by other authorities.

### Main audiences

- Uttarakhand residents monitoring their district, warnings, weather, roads, and public data.
- Travellers and pilgrims checking conditions before a trip, especially Char Dham journeys.
- Journalists, researchers, and citizens comparing districts or checking the source and age of a figure.
- Small-business owners looking for district comparisons, public schemes, and state investment context.

### Primary jobs to be done

1. Check official warnings and current conditions quickly.
2. Check a destination and travel date before making a journey.
3. Follow one or more districts and return to their current information.
4. Understand a district through weather, roads, statistics, connectivity, and administrative information.
5. Explore state-level public data without losing its source, vintage, or limitations.

### Product maturity and risk

The current app is a feature-rich public-information product, not a social network or account-based service. Most screens are live-data readers. Alerts, road closures, weather, and trip information are safety-adjacent, so ambiguity, stale information, or false reassurance carry higher risk than ordinary dashboard errors.

There is no sign-in, profile, payment, subscription purchase, content creation, or officer workflow in the current mobile app. Saved districts, appearance, language, onboarding status, and notification choice are stored locally on the device.

## 2. Product rules the redesign must understand

These are not merely visual details. They shape the information architecture and copy on nearly every screen.

### Provenance is part of the content

Every important data point is expected to identify:

- the department or organisation that published it;
- the date the information describes (`vintage`);
- when Pahad Pulse retrieved it;
- whether it is fresh, stale, expired, or unknown;
- an original or official link when one exists.

Source notes are shown beside the data, not hidden only in an About page.

### Missing data must not look like a real zero

- A loading value may temporarily show an ellipsis.
- An unavailable value may show a dash or an explicit “not measured / unavailable” message.
- A failed road-closure feed must never be presented as “no roads are closed.”
- An unmeasured comparison metric must say “Not scored”; it must not display the neutral score used internally by the calculation.
- Stale cached data may still be shown, but it must be labelled as saved or old data.

### Safety wording is intentionally cautious

- Trip Check presents evidence and never declares a trip safe.
- “No warnings today” is stronger than “no warning has yet been published for a future date.”
- Road reopening estimates are attributed to the reporting division and are flagged when the estimate has passed.
- Air and water information is omitted when the app cannot support it with trustworthy measurements.
- Official government and emergency channels remain authoritative.

### Bilingual behaviour

- The interface supports English and Hindi.
- The initial language follows the phone language; the user can change it later.
- Noto Sans and Noto Sans Devanagari are bundled so English and Hindi layouts behave consistently on iOS and Android.
- Numerals remain Latin in both languages.
- Source-provided warning text is not automatically translated because mistranslating a safety warning would be harmful.
- Proper names and licence names may remain in their published form.

### Offline and poor-network behaviour

- Successful server responses are cached on the device for up to one week.
- A previously viewed page can show cached data when connectivity is lost.
- Cached content is accompanied by a saved-data warning and its last checked time.
- Offline, timeout, not-found, invalid-response, and general server errors use different explanations.
- Data-heavy screens generally support pull to refresh.

## 3. Navigation and screen architecture

### Primary tab bar

The app currently has five persistent bottom tabs:

| Tab | Route | Purpose |
| --- | --- | --- |
| Today | `/` | Current statewide picture, Trip Check entry point, followed districts, alerts, and shortcuts. |
| Map | `/map` | Interactive geographic view of districts, alerts, highways, and terrain. |
| Districts | `/districts` | Searchable list of all 13 districts with follow controls. |
| Alerts | `/alerts` | All active official warnings, ordered by severity and recency. The tab can show an active-alert count badge. |
| More | `/more` | Grouped directory for travel, area, business/data, and app-related destinations. |

On supported iOS versions the tab background uses native glass material. Other platforms receive a high-opacity themed surface. The tab bar hides while the keyboard is open.

### Secondary routes

| Screen | Route / presentation | Common entry points |
| --- | --- | --- |
| District detail | `/districts/:slug` | Districts, Today, Map, Alert detail, Trip Check, Data Explorer. |
| Alert detail | `/alerts/:id` | Alert list, Today, District detail, Trip Check, push notification. |
| Trip Check | `/trip-check?to=&date=` | Today hero, Tourism, District detail, More, deep link. |
| Roads | `/roads?district=` | Today, District detail, Trip Check, More. |
| Tourism guide | `/tourism` | Today signal card, More. |
| Connectivity | `/connectivity` | Today signal card, More. |
| Air quality | `/air-quality` | Today tools, More. |
| Seismic activity | `/seismic` | Today tools, More. |
| Compare districts | `/compare` | Today tools, More. |
| Scheme finder | `/schemes` | Today signal card, More, comparison results. |
| Budget explorer | `/budget` | Today signal card, More. |
| Data explorer | `/data-explorer` | Today tools, More. |
| Settings | `/settings` modal | Today header, More, deep link. |
| Welcome | `/welcome` full-screen modal | First launch and More. |
| Credits and sources | `/credits` | More. |
| Not found | unmatched route | Invalid or obsolete links. |

Deep links are always placed on top of the tab navigator, so a user opening a shared link or notification still has a route back into the app. A notification containing an alert ID opens that alert’s detail screen.

## 4. Core user flows

### Traveller checks a journey

`Today → Trip Check → choose place/district and date → review warnings → forecast → road closures → signal estimate → helplines`

From the report the traveller can also open the destination’s district, get directions, open an official guide, inspect an alert, or open the complete roads screen.

### Resident follows a district

`Districts → search or browse → follow district → district appears on Today → open district detail`

The followed-district strip shows current temperature when a weather station is available. Following is entirely local and requires no account.

### User responds to a warning

`Alert badge, Today card, district card, or push notification → Alert detail → read instruction → open affected district or original notice`

### User researches public evidence

`Today or More → Data Explorer / Budget / Compare / Connectivity → inspect source, vintage, coverage, missing-data notes → open district or official document`

## 5. Screen-by-screen inventory

### 5.1 Welcome / first-launch introduction

**Route:** `/welcome`
**Presentation:** Full-screen modal with swipe-to-dismiss disabled. It appears once after preferences have finished loading and can be reopened from More.

The screen is a three-page horizontal onboarding flow:

1. **Why the app exists**
   - Pahad Pulse logo.
   - Introductory title and body copy.
   - Three benefit rows: official warnings, visible sources, and offline access.
2. **What the user can do**
   - Trip Check.
   - Road information.
   - Char Dham / yatra guidance.
   - Business information.
3. **Make it yours**
   - English/Hindi language choice.
   - Explanation of warning notifications.
   - Button to request notification permission and display whether notifications are on or blocked.

Persistent controls include Skip, three page indicators, and a Next button. The last page offers two exits: start a Trip Check immediately or enter the main app. Completing or skipping marks the introduction as seen.

### 5.2 Today

**Route:** `/`
**Role:** Main dashboard and fastest route to current value.

The top area is custom rather than a native navigation header. It contains the app logo, “Pahad Pulse,” the Today title, and a round Settings button.

Content appears in this order:

1. **Trip Check hero**
   - Framed card asking where the user is going.
   - Short explanation of what the check includes.
   - Optional horizontal chips for the four Char Dham destinations.
   - Primary “check a trip” action.
2. **State signals grid**
   - Six photographic cards: active alerts, closed roads, completed-season tourism arrivals, average mobile download speed, total state expenditure, and number of schemes.
   - Each card is a shortcut to the relevant full screen.
   - Pending figures display an ellipsis; failed figures do not display zero.
3. **Followed districts**
   - If districts are followed, a horizontal strip shows district name, temperature or “no station,” and condition/division.
   - A Manage action opens the Districts tab.
   - If none are followed, a prompt explains the feature and links to Browse districts.
4. **Active alerts**
   - Up to four currently in-force alert cards.
   - Each card includes alert type icon, severity, relative issue time, headline, affected area, and source note.
   - A section action opens the complete Alerts tab.
5. **Tools**
   - List rows for Compare districts, Data Explorer, Map, Air quality, and Seismic activity.
6. **Uttarakhand at a glance**
   - Available cards for state population, area, literacy rate, forest cover, and village count.
   - Each value includes vintage and publishing department.
7. **All districts**
   - Compact pill-style links to every district.
8. **Trust promise**
   - Closing card stating the product’s source/transparency promise.

The entire screen supports pull to refresh. Individual sections can load or fail independently.

### 5.3 Map

**Route:** `/map`
**Role:** Full-screen geographic exploration.

The body is a gesture-controlled MapLibre map of Uttarakhand with hillshade relief. The default view is flat and north-up; the user can explicitly turn on 3D terrain.

Visible controls:

- A horizontal chip row over the map for Districts, Alerts, Highways, and 3D.
- District boundaries, division-based fills, and district name pills.
- Alert polygons or points, coloured by severity.
- Optional National Highway and State Highway highlighting.
- Zoom in, zoom out, and “fit the whole state” buttons.
- An information button opening a bottom attribution sheet for OpenStreetMap and the map stack.

Tapping a district shape opens its District detail screen. Panning, pinching, layer changes, and terrain changes happen without reloading or resetting the current map position.

The screen has separate loading/error handling for API geometry and for map-library/basemap failures. The map itself is announced to accessibility services as an image with the number of districts; the separate controls provide non-gesture actions.

### 5.4 Districts

**Route:** `/districts`
**Role:** Find and follow any of Uttarakhand’s 13 districts.

The pinned header contains a 48-point search field and a cross-platform clear button. Search matches English names, Hindi names, and slugs.

The list behaviour is:

- Followed districts are pinned above unfollowed districts.
- Each group is alphabetised in the active language.
- Each card displays district name, headquarters when available, division, tehsil count, and village count.
- A bookmark control follows or unfollows the district without opening it.
- Tapping the rest of the row opens District detail.
- The footer states how many of the 13 districts are currently shown.

The screen includes loading, recoverable error, no-search-results, pull-to-refresh, and keyboard-dismiss-on-drag states.

### 5.5 District detail

**Route:** `/districts/:slug`
**Role:** The most complete view of a single district.

The native header uses the district name and includes a follow/unfollow bookmark.

Sections appear in this order:

1. **District identity card**
   - Name, division, headquarters, and a warning if boundary geometry is missing.
   - Tehsil count and LGD code.
   - Primary action to run Trip Check with this district preselected.
2. **Weather**
   - Current temperature and condition.
   - Station name and relative observation time.
   - Available rainfall, humidity, and wind readings.
   - Multi-day forecast rows with min/max temperature and precipitation.
   - Source note.
   - The section is omitted when the district has no station rather than being shown as an error.
3. **Active alerts**
   - Up to three alert cards for the district.
   - Link to the full alert list.
4. **Road closures**
   - Up to three current closures for the district.
   - Link to the Roads screen with the district filter applied.
   - Unavailable-feed, none reported, recent reopening, PWD dashboard, and helpline states are supported.
5. **District statistics**
   - Indicators grouped by category.
   - Each row shows label, formatted value, unit, and source note.
   - A separate muted card lists indicators that are still being compiled.
6. **Measured connectivity**
   - Fixed and/or mobile cards with download, upload, latency, test count, device count, and thin-sample warning.
   - Copy clarifies that measurements are not the same as coverage.
7. **Tehsils**
   - List of tehsil names and available village counts.

The screen is intentionally assembled from independent requests. Weather failure should not blank statistics; road failure should not remove alerts. Pull to refresh refreshes all sections.

### 5.6 Alerts

**Route:** `/alerts`
**Role:** All currently active official warnings.

The custom header displays the screen title, the number of warnings in force, and a horizontally scrolling filter row:

- All
- Weather
- River
- Flood
- Road
- Disaster

Warnings are sorted by severity first and newest issue time second. Each alert card includes type, severity, relative time, headline, affected districts/statewide scope, and provenance. Tapping a card opens Alert detail.

When a refresh fails but cached alerts exist, the list remains visible with a saved-data/offline banner and last checked time. Empty states distinguish “no alerts at all” from “no alerts matching this filter.” The list supports pull to refresh.

### 5.7 Alert detail

**Route:** `/alerts/:id`
**Role:** Present one official warning completely and make the authority’s instruction prominent.

The main alert card includes:

- severity badge;
- alert type, urgency, and certainty;
- headline and full body;
- issued time, effective-from time, expiry time plus relative expiry, and authority.

Additional blocks:

- **What to do:** a severity-accented instruction card, shown only when the authority supplied instructions.
- **Affected areas:** tappable district rows that open District detail.
- **Source:** provenance and an optional link to the original notice.

The screen supports pull to refresh and standard loading, error, and cached-data handling.

### 5.8 More

**Route:** `/more`
**Role:** Grouped navigation for destinations that do not belong in the primary tab bar.

The screen uses four labelled card groups:

1. **Travel:** Trip Check, Tourism, Roads, Alerts.
2. **Area:** Districts, Map, Air quality, Seismic activity, Connectivity.
3. **Business and data:** Compare districts, Schemes, Budget, Data Explorer.
4. **App:** Settings, replay Welcome, Credits and sources.

Every row has an icon, title, short explanatory subtitle, and chevron. There is no independent content or server data on this screen.

### 5.9 Trip Check

**Route:** `/trip-check?to=<place-or-district>&date=YYYY-MM-DD`
**Role:** The app’s main traveller tool.

The top explains that the screen checks official signals and does not certify safety. The form contains:

- A searchable, grouped destination selector containing Char Dham sites, other pilgrimages, destinations, and every district.
- Seven date chips: today plus the next six forecast days.
- Optional preselection from a district page, destination card, or deep link.

Before a destination is selected, the screen shows:

- image cards for the four Char Dham destinations;
- a plain-language list of what the report will check: warnings, weather, roads, mobile signal, and help numbers.

After selection, the report contains:

1. **Destination summary**
   - Place photo when one exists, date, destination, district, altitude.
   - Directions, official guide, and District detail actions.
2. **At-a-glance grid**
   - Warnings valid on the chosen date.
   - IMD-style rainfall category and 24-hour millimetres.
   - Forecast temperature range and condition.
   - District-average mobile download speed.
3. **Official warnings**
   - Alerts whose effective/expiry window covers the selected date.
   - Failed-check state links to NDMA SACHET.
   - “None today” differs from the more cautious future-date message.
   - Alerts active on other dates are available in an expandable section.
4. **Forecast**
   - Selected day condition, min/max temperature, precipitation, and rainfall classification.
   - Horizontal seven-day forecast strip that can also change the selected date.
   - Weather station/source and an altitude caution for high destinations.
5. **Road closures**
   - Up to five closures for the destination’s district.
   - Complete district road list, official registration link when available, PWD dashboard, and helpline.
6. **Mobile signal**
   - District-average measured download and latency.
   - Thin-sample warning and a note that district measurements are not a guarantee at the exact destination.
7. **Help**
   - Tappable yatra helpline numbers.
   - A visually stronger emergency-call button, normally 112.

Each report signal loads and fails independently. The screen closes with a persistent disclaimer rather than a safe/unsafe verdict.

### 5.10 Tourism and Char Dham guide

**Route:** `/tourism`
**Role:** Plan and prepare for pilgrimage and Uttarakhand travel.

Content order follows a traveller’s likely decisions:

1. **Hero**
   - Kedarnath or first available destination image.
   - Intro to the travel guide.
   - Primary link to the official Uttarakhand registration portal.
   - Yatra and emergency helpline summary.
2. **Three pre-trip reminders**
   - Register first.
   - Recheck changing conditions.
   - Prepare for altitude/health demands.
3. **Four Char Dham cards**
   - Photo, sequence number, district, altitude, name, best season, and access description.
   - Actions for Trip Check, directions, and official guide.
4. **Other pilgrimage places**
   - Photo, category, name, district, summary, Trip Check, directions, and official page.
5. **Preparation**
   - Checklist-style official guidance.
   - Yatra and emergency call actions.
6. **Published pilgrim arrivals**
   - Explicit statement that these are annual published totals, not live crowd counts.
   - Latest total and a reference-year total.
   - Year chips, destination ranking/list, total, tentative current-season warning, and source note.
7. **Explore Uttarakhand**
   - Destination cards using the same photo/summary/action pattern.
8. **Official travel desk**
   - Links such as primary registration, maps, and official documents.
   - Verification date and closing disclaimer.

The screen supports pull to refresh for the guide and arrival data.

### 5.11 Roads

**Route:** `/roads?district=<slug>`
**Role:** Answer “what is closed?” first, then provide highway reference information.

The road-closure section contains:

- Optional chips to switch between a deep-linked district and all Uttarakhand.
- Summary tiles for closed roads and affected highways when live closure reporting is available.
- Current closure rows with road type, status, road name, district/km markers, closure time and duration, expected reopening, passed-estimate warning, and reporting division.
- A separate expandable list of roads reopened recently.
- Honest unavailable-feed and request-failure states.
- PWD dashboard and phone helpline actions.
- Last checked / reporting department footer.

Below the live section is the road-network register:

- Summary cards for recorded national and state highway counts.
- Chips switching between NH and SH lists.
- Route reference and mapped segment count for each highway.
- Button to open the map.
- Caveat that the register is crowd-sourced map data rather than an NHAI/PWD operational register.
- Source and vintage.

The whole screen supports pull to refresh.

### 5.12 Connectivity

**Route:** `/connectivity`
**Role:** Explain measured internet performance across districts without presenting it as complete network coverage.

The opening caveat establishes that the figures come from measurements. The screen then shows:

1. **State spread**
   - One card per connection type: fixed broadband and mobile.
   - Quarter, state-average download speed, number of measured districts, spread ratio, fastest district, and slowest district.
2. **District ranking**
   - Chips for Fixed and Mobile.
   - Ranked rows with district, download, upload, latency, test count, device count, and thin-sample badge.
3. **Not measured**
   - Explicit list of districts with no measurements in the quarter.
4. **How to read**
   - Longer methodological caveat.
5. **Source note**

The screen supports pull to refresh and standard loading, empty, and error states.

### 5.13 Air quality

**Route:** `/air-quality`
**Role:** Compare available district air-quality readings.

The state summary identifies the station with the highest available National AQI and reports how many district readings are available or missing. A caveat explains the limitations before the list.

Each district/station card shows:

- station name and relative observation time;
- National AQI number and band: Good, Satisfactory, Moderate, Poor, Very poor, or Severe;
- danger emphasis for Poor or worse;
- PM2.5 and PM10;
- dominant pollutant when available;
- optional US AQI cross-reference.

The screen includes source attribution and an empty state when no readings exist. A final warning card currently also states that river-gauge estimates are intentionally omitted until trustworthy Central Water Commission access exists; this cross-domain note is part of the current screen even though it is not air-quality content.

### 5.14 Seismic activity

**Route:** `/seismic`
**Role:** Summarise recently recorded earthquakes affecting Uttarakhand.

The first card shows the number of events in the last 30 days and, when available, the largest magnitude and place. A caveat explains how to interpret the feed.

The event list shows:

- magnitude and magnitude band;
- place;
- date and time in IST;
- depth or “not reported”;
- magnitude type and review status;
- optional link to the source event record.

The screen ends with an optional source link. It supports pull to refresh, loading, error, and no-events states.

### 5.15 Compare districts for business

**Route:** `/compare`
**Role:** Compare two districts for a selected business scenario.

The configurator contains:

- Business/scenario selector with category and description.
- District A and District B selectors; choosing the same district is prevented and explained.
- Disabled Compare button until the form is valid.

Results contain:

1. **Outcome card**
   - One of three explicit outcomes: a recommended district, a tie, or insufficient evidence.
   - Narrative verdict.
   - Evidence confidence, percentage coverage, and missing metrics.
2. **Two district score cards**
   - District name and total score.
   - Metric rows such as connectivity, tourism, roads, urban population, agriculture, and safety, depending on scenario weights.
   - Available metrics use score bars; unavailable metrics say “Not scored.”
3. **Public investment context** when returned
   - Fiscal year, total, capital component, change from prior year, relevant departments, and explanatory note.
4. **Recommended schemes**
   - Expandable scheme cards relevant to the selected business type.

The comparison is only run after the user taps Compare; changing any selector clears the previous result. The screen has skeleton loading and separate failure states for scenario loading and comparison loading.

### 5.16 Scheme finder

**Route:** `/schemes`
**Role:** Find verified finance, subsidy, guarantee, training, incubation, and market-access programmes usable from Uttarakhand.

The screen starts with a title and explanatory introduction. Filters include:

- free-text search across scheme name, acronym, owner, summary, and support types;
- searchable sector selector;
- horizontally scrolling support-type chips: any, grant, loan, subsidy, equity, incubation, training, and market access.

The result count shows displayed schemes versus the total directory. Each scheme card is collapsed by default and shows availability, raw status, name, acronym, owner, summary, and major support types. Expanding a card reveals eligibility, benefits, application steps, access/availability notes, and a button to the official page.

The screen includes no-match, loading, empty, error, pull-to-refresh, source link, and directory verification date states.

### 5.17 Budget explorer

**Route:** `/budget`
**Role:** Explain what the Uttarakhand government plans to spend, by year and department.

The screen contains:

- Title and plain-language introduction.
- Horizontal fiscal-year chips.
- Summary tiles for total expenditure, capital expenditure and share, total receipts, and revenue receipts.
- Button to open the official budget document.
- Department allocation list sorted from largest to smallest, with total, share, proportional bar, demand number, and capital amount.
- Initial limit of eight departments with Show all / Show fewer.
- Historical total-expenditure bars when more than one year exists.
- Interpretation caveat and source note.

Changing the year requests that year’s report. The screen supports pull to refresh and loading, empty, error, and cached-data states.

### 5.18 Data Explorer

**Route:** `/data-explorer`
**Role:** Show what the platform knows, how complete it is, and which comparisons are defensible.

The screen begins with two summary tiles: total indicators/sectors and count of indicators comparable across districts.

Main sections:

1. **Sector coverage**
   - Rows for demography, education, health, economy, industry, connectivity, development, tourism, geography, environment, and any future category.
   - Each row shows indicator count and district-coverage percentage with a bar.
   - Tapping a sector also filters the catalogue below.
2. **District benchmarks**
   - For each comparable indicator, a card displays label, vintage, leading district(s), and trailing district(s).
   - District names are links to District detail.
   - Initially shows six benchmarks, with Show all / Show fewer.
3. **Indicator catalogue**
   - Search in English or Hindi.
   - Horizontal sector chips.
   - Each row shows the selected-language label, sector, vintage, and one status badge: comparable, published context/not rankable, partial coverage, state-level, catalogued without district values, or unavailable.
4. **Caveat**
   - Explains that coverage and ranking depend on comparable, complete evidence.

Catalogue and district-standing data load independently. The screen supports pull to refresh and catalogue loading/failure/no-match states.

### 5.19 Settings

**Route:** `/settings`
**Presentation:** Modal with a visible Done button. A deep-linked settings screen falls back to Today when there is no navigation history.

Sections:

1. **Language**
   - English and हिन्दी chips.
   - Note explaining language behaviour.
2. **Appearance**
   - System, Light, and Dark chips.
3. **Notifications**
   - One row for new official alert notifications.
   - Shows On, Off, Working, or Blocked in system settings.
   - Enabling may trigger the OS permission request.
   - When permission is blocked, a system dialog can open device settings.
   - Adjacent copy explains that delivery is not guaranteed and official channels remain authoritative.
4. **Your data**
   - Number of followed districts.
   - Reset preferences action with a destructive confirmation dialog.
5. **About**
   - App version and web-portal domain.
   - Links to Support and Privacy on the website.
   - Closing independence/data disclaimer.

Preferences persist across launches. Reset returns language to the device-derived default, theme to System, saved districts to none, intro status to unseen, and local notification choice to off.

### 5.20 Credits and sources

**Route:** `/credits`
**Role:** Explain ownership, official data provenance, contact, mapping stack, and licences.

The screen contains:

- Introductory explanation of why sources are visible.
- Prominent disclaimer that Pahad Pulse is not an official government app.
- Dynamic list of official data-source registry entries with department, licence, and source link.
- Contact card with email link.
- Map sources and licences: OpenStreetMap, AWS Terrain Tiles, OpenFreeMap, and MapLibre GL.
- Figure/data providers and licence context, including IMD, SACHET/NDMA, and Open-Meteo.

Loading or failure of the dynamic official-source list is stated inside the screen; it does not remove the static map and provider credits.

### 5.21 Not found

**Route:** Any unmatched route
**Role:** Recover from an invalid, old, or malformed link.

The screen uses a compass-style empty state with title and explanation, followed by a direct link back to Today. Invalid district slugs are handled by the District detail screen’s own recoverable query state rather than crashing the app.

## 6. Reusable UI and content patterns

### Page frame

- The common screen frame owns themed background, safe-area spacing, bottom clearance above the tab bar, scrolling, keyboard dismissal, and optional pull to refresh.
- Tab screens use custom pinned headers where search/filter controls must stay visible.
- Pushed routes use centred native navigation titles and back navigation.

### Cards and list rows

- Most information is grouped into rounded surface cards.
- Cards can be standard, muted, warning, or semantic/severity-tinted.
- Dividers separate rows within a card.
- List rows commonly combine an icon, title, explanatory subtitle, optional value, and chevron.

### Alerts

- Alert severity is communicated by a written badge, icon, border/surface tint, and colour; colour is not the only signal.
- Alert cards preserve the same structure wherever they appear.
- iOS may use glass material; Android uses an opaque semantic surface and stronger border.

### Filters and selection

- Small choice sets use pill chips.
- Large sets use searchable selection fields presented as modal lists.
- Search fields always include a clear action.
- Horizontal scrolling is used for chips when wrapping would make the section excessively tall.

### Data states

The standard data-backed block has four states:

1. Loading, normally with a spinner or shape-matched skeleton.
2. Error, with a specific explanation and retry when useful.
3. Empty, with an icon, title, and optional explanation.
4. Ready, optionally preceded by a saved-data warning if refresh failed.

### External actions

The app can:

- open official websites and original notices;
- open map directions;
- start phone calls to yatra/PWD/emergency numbers;
- open an email composer;
- open the operating system’s notification settings.

These actions should remain visually distinct from internal navigation in a redesign.

## 7. Current visual language

### Brand and colour

The current palette is derived from the logo:

- Mountain blue `#015BD6` as the brand identity source; the accessible light-theme action blue is `#075E9C`.
- River cyan `#01BAFE`, adapted to accessible accents in the interface.
- Pulse red `#FD1C1D`, reserved for urgent/live meaning rather than decoration.
- Road ink `#2B2B2C`.

The shipped UI supports complete light and dark themes. Semantic roles include primary, secondary, accent, success, warning, danger/error, alert severity, and data freshness. Severity and freshness are data encodings and should remain systematic across screens.

### Typography

- Noto Sans and Noto Sans Devanagari are bundled at regular, medium, semibold, and bold weights.
- Type roles: display, title, heading, body, strong body, caption, footnote, and large tabular metric.
- Metrics use tabular numerals so refreshing values do not visually jump.
- Body/caption text allows more system font scaling than fixed-geometry titles and metrics.

### Spacing and shape

- Base rhythm: 4-point scale, ranging from 2 to 48 points.
- Radius scale: 6, 10, 14, 20, and full pill.
- Minimum cross-platform target size: 48 points/dp.
- Card grids stack into one column when width or font scale makes two columns too tight.

### Imagery

- App mark in the Today header, Welcome screen, native icons, and splash assets.
- Six local photographic signal-card images: alerts, roads, tourism, connectivity, budget, and schemes.
- Tourism and Trip Check use remote destination photographs supplied by the guide data.
- Imagery carries content and orientation; important images have descriptive labels where available.

## 8. Persistence, notifications, and re-entry

The following survive app restarts:

- language;
- theme preference;
- ordered list of followed district slugs;
- whether Welcome has been completed;
- local notification preference;
- a one-week cache of successful data queries.

Alert notifications are optional. Enabling them registers the device; disabling unregisters it. A notification opened while the app is running or relaunched can route directly to the alert. The interface does not promise notification delivery.

The app refreshes stale information after reconnection and when returning to the foreground, rather than refetching on every tab switch.

## 9. Accessibility and adaptive behaviour already represented

The current implementation includes the following design intentions, which should remain requirements even if the visual system changes:

- 48-point minimum interactive targets.
- Text alternatives or combined accessibility labels for major controls and data cards.
- Written labels in addition to semantic colours.
- Explicit selected, checked, expanded, disabled, and progress states.
- Accessible zoom/reset buttons in addition to map pinch gestures.
- Safe-area handling for status bars, home indicators, and the tab bar.
- Keyboard-aware navigation and drag-to-dismiss behaviour.
- Layout changes for compact phones and larger system text.
- Hindi glyph protection on Android and script-appropriate font selection.
- Reduced dependence on transient network access through cached content.

This list describes current intent, not proof that every current control passes a full VoiceOver/TalkBack audit.

## 10. What does not exist in the current mobile product

A redesign team should not assume these are hidden screens:

- Sign-up, sign-in, OTP, account, or profile screens.
- User-generated posts, comments, chat, or social feeds.
- Saved trips or itinerary management.
- A dedicated notifications inbox or notification-history screen.
- Payment, donation, subscription purchase, or paywall.
- Officer/operator administration.
- Editable government data or content-authoring forms.
- River-level dashboard; the app explicitly avoids unsupported river estimates.
- Village-detail screens or a complete village browser.

Adding any of these would be new product scope, not merely a visual redesign of an existing screen.

## 11. Implementation reference map

For designers or engineers validating this document against the current app:

- Routes and navigation: `mobile/src/app/`
- Today: `mobile/src/features/dashboard/components/today-screen.tsx`
- Map: `mobile/src/features/map/components/map-screen.tsx`
- Districts: `mobile/src/features/areas/components/`
- Alerts: `mobile/src/features/alerts/components/`
- Trip Check: `mobile/src/features/trip-check/components/trip-check-screen.tsx`
- Tourism: `mobile/src/features/tourism/components/`
- Roads: `mobile/src/features/roads/components/`
- Connectivity: `mobile/src/features/connectivity/components/connectivity-screen.tsx`
- Air quality: `mobile/src/features/air-quality/components/air-quality-screen.tsx`
- Seismic: `mobile/src/features/seismic/components/seismic-screen.tsx`
- Compare and schemes: `mobile/src/features/business/components/`
- Budget: `mobile/src/features/governance/components/budget-screen.tsx`
- Data Explorer: `mobile/src/features/intelligence/components/intelligence-screen.tsx`
- Welcome: `mobile/src/features/onboarding/components/welcome-screen.tsx`
- Settings, More, and Credits: `mobile/src/features/settings/components/`
- Shared screen states: `mobile/src/components/molecules/states.tsx`
- Theme tokens: `mobile/src/theme/tokens.ts`
- English and Hindi interface strings: `mobile/src/i18n/strings.en.ts` and `strings.hi.ts`

## 12. Handoff note for the redesign team

The visual language, hierarchy, component shapes, and navigation grouping can be reconsidered from scratch. The redesign should, however, deliberately account for the product’s harder constraints: public access without an account, five major user intents, bilingual text, official-source visibility, independent partial failures, stale/offline data, safety-sensitive wording, large data ranges, and a mix of quick-glance and deep-research use cases.

The most important test for any redesigned screen is not whether it looks more polished. It is whether a reader can answer four questions without guessing:

1. Where am I and what am I looking at?
2. What does this information actually say?
3. How current and trustworthy is it?
4. What is the next useful action, and how do I recover if the data is unavailable?
