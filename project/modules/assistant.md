# Module: `assistant`

| | |
|---|---|
| **Owner** | Pahad Pulse |
| **Status** | in progress: backend and web UI done 2026-09-29; mobile UI next |
| **Backend** | `src/services/assistant/` (catalogue, resolvers, matcher, composer), `src/controllers/assistant.controller.ts`, `src/routes/assistant.route.ts` |
| **Web** | `src/features/assistant/`: floating launcher and chat panel on every page |
| **Mobile** | `src/features/assistant/`, `src/app/assistant.tsx`: entry from Today and More |

---

## 1. Purpose

"Ask Pahad Pulse" answers everyday questions about Uttarakhand in a chat, using only the data
the platform already holds. Every answer is built from a fixed catalogue of questions. The
backend looks up the figures through the same controllers the dashboards use, then fills a
written template, so each answer carries the same source and date as the dashboard figure it
came from.

It does not generate text, guess, or answer anything outside the catalogue. When it can't
answer, it says so and offers the questions it can answer.

## 2. Boundaries

**Owns**
- the question catalogue, its wording (en/hi), templates and follow-ups
- the free-text matcher (keywords and synonyms, including Hindi and romanised Hindi), kept
  behind one function (`match()`) so it can be changed without touching resolvers, the API or the UIs
- the chat UIs on web and mobile

**Does not own, and never re-implements**
- any figure. Each figure comes from the owning module's controller, which already applies
  DS-6 (redistribution), expiry and freshness rules. The assistant must never become a way
  around those rules, just as the map must not (see `map.controller.ts`).

**Depends on** (read-only, through controllers)

| Module | Controller calls used |
|---|---|
| geography | `area.controller.listDistricts`, `getDistrictDetail` |
| indicators | `indicator.controller.getAreaIndicators`, `getRanking` |
| alerts | `alert.controller.getSummary`, `listActiveForArea` |
| hydromet | `observation.controller.getAreaWeather`, `getAreaAirQuality`, `getAllDistrictAirQuality` |
| seismic | `seismic.controller.getRecentSeismic` |
| wildfire | `map.controller.getFireFeatures` |
| roads | `road.controller.listRoadClosures` |
| tourism | `destination.controller.listPilgrimArrivals` |
| connectivity | `network.controller.listStateNetwork`, `getAreaNetwork` |
| governance | `governance.controller.listBudgetYears`, `getBudget` |
| datasets | `source` registry, for the "where does this come from" questions |

## 3. Domain

### Entities (code, not tables: the catalogue is typed source, reviewed in PRs)

| Entity | Fields | Notes |
|---|---|---|
| `Question` | `id, category, text {en,hi}, params, keywords {en,hi}, resolver, followUps[], cacheClass, route` | `id` is stable, e.g. `district.population`; UIs and analytics key on it |
| `Category` | `id, label {en,hi}, icon, order` | 11 topics (§3.2) |
| `Param` | `district` (the 13 districts) or `place` (the 22 places in the official travel guide) | a place answers district questions through its district |
| `Fact` | `label {en,hi}, value, unit, vintage, source {department, url}, freshness` | one figure the answer rests on; rendered as a card |
| `Answer` | `questionId, params, text, facts[], status, links[], followUps[], generatedAt` | §5 |

### 3.1 How many questions

**75 questions in 11 topics.** 46 are about the whole state or the product, 17 take a district and
3 take a place. With 13 districts and 22 guide places, that is 46 + 17 × 13 + 3 × 22 =
**333 concrete answers**, each backed by data or wording we already hold.

Why this many:
- Every dataset on the dashboard is covered at least once, with the questions people actually
  ask (safety now, weather, travel, district facts), and not one question per indicator.
- Every tool (Trip Check, map, comparison, scheme finder, budget, data explorer) and every
  source family has a question, so a reader can learn the product without leaving the chat.
- Each question needs two languages, a template, a "not available" wording, follow-ups and a
  test. 75 can still be reviewed properly; wording errors in a source-first product cost trust.
- On screen, users see **6 starter chips** and **11 topic tiles**; each topic holds 2–10
  questions. Nobody scrolls a list of 75.

Rule for adding a question: it must resolve from an existing controller, it must name its
source, and it must have a follow-up path. A question that needs new data belongs to that
data's module first.

### 3.2 The catalogue

`{d}` = the question takes a district, `{p}` = a place from the travel guide. **L** = live data (cached 1 min), **D** = daily
(15 min), **R** = reference (6 h).

| # | id | Question (en) | Resolves from | Cache |
|---|---|---|---|---|
| **Safety now** ||||
| 1 | `alerts.active` | Are there any active warnings right now? | alerts summary | L |
| 2 | `alerts.district` | Are there warnings for {d}? | alerts for area | L |
| 3 | `alerts.recent` | Which warnings ended in the last 48 hours? | alerts recent | L |
| 4 | `fires.state` | Have satellites detected any fires recently? | fire features (48 h) | L |
| 5 | `fires.district` | Any fire detections in {d}? | fire features, filtered | L |
| 6 | `quakes.recent` | Were there any earthquakes recently? | seismic recent | L |
| 7 | `quakes.largest` | What was the largest recent earthquake? | seismic recent | L |
| **Weather & air** ||||
| 8 | `weather.now` | What's the weather in {d} right now? | area weather | L |
| 9 | `weather.rain` | Will it rain in {d} in the next few days? | area weather forecast | L |
| 10 | `air.district` | How is the air quality in {d}? | area air quality | L |
| 11 | `air.worst` | Which district has the worst air today? | all-district air quality | L |
| 12 | `air.best` | Which district has the cleanest air today? | all-district air quality | L |
| **Roads & travel** ||||
| 13 | `roads.closed` | Which roads are closed right now? | road closures | L |
| 14 | `roads.district` | Are any roads closed in {d}? | road closures, filtered | L |
| 15 | `roads.helpline` | Who do I call for road status? | static: 1364 helpline, PWD | R |
| 16 | `travel.check` | What should I check before travelling to {d}? | warnings + weather + roads + fires | L |
| 17 | `travel.network` | Will my phone have internet in {d}? | area connectivity | R |
| **Char Dham & tourism** ||||
| 18 | `tourism.chardham` | How many pilgrims visited the Char Dham last year? | pilgrim arrivals | R |
| 19 | `tourism.busiest` | Which shrine had the most visitors? | pilgrim arrivals | R |
| 20 | `tourism.trend` | Are pilgrim numbers going up or down? | pilgrim arrivals (years) | R |
| **Districts** ||||
| 21 | `district.overview` | Tell me about {d} | district detail + indicators | R |
| 22 | `district.population` | What is the population of {d}? | area indicators | R |
| 23 | `district.hq` | What is the headquarters of {d}? | district detail | R |
| 24 | `district.literacy` | What is the literacy rate in {d}? | area indicators | R |
| 25 | `district.largest` | Which district has the most people? | population ranking | R |
| 26 | `district.smallest` | Which district has the fewest people? | population ranking | R |
| 27 | `district.list` | What are the 13 districts of Uttarakhand? | district list | R |
| 28 | `district.division` | Is {d} in Garhwal or Kumaon? | district detail | R |
| **Uttarakhand profile** ||||
| 29 | `state.population` | What is the population of Uttarakhand? | state indicators (projection) | R |
| 30 | `state.forest` | How much of Uttarakhand is forest? | state indicators | R |
| 31 | `state.area` | How big is Uttarakhand? | state indicators | R |
| 32 | `state.villages` | How many villages are in Uttarakhand? | state indicators (LGD) | R |
| 33 | `state.literacy` | What is Uttarakhand's literacy rate? | state indicators (PLFS) | R |
| **Connectivity** ||||
| 34 | `network.fastest` | Which district has the fastest mobile internet? | state network | R |
| 35 | `network.slowest` | Where is mobile internet slowest? | state network | R |
| 36 | `network.district` | How fast is internet in {d}? | area connectivity | R |
| **Budget & governance** ||||
| 37 | `budget.total` | What is the state budget this year? | governance budget | D |
| 38 | `budget.top` | Which departments get the most money? | governance budget | D |
| **Char Dham, pilgrim places & tourism (more)** ||||
| 43 | `place.about` | Tell me about {p} | travel guide (altitude, season, access or summary) | R |
| 44 | `place.weather` | What's the weather at {p}? | area weather for the place's district | L |
| 45 | `place.travel` | What should I check before visiting {p}? | travel check for the place's district | L |
| 46 | `tourism.pilgrimages` | Which pilgrim places are there besides the Char Dham? | travel guide | R |
| 47 | `tourism.destinations` | What are the popular tourist places in Uttarakhand? | travel guide | R |
| 48 | `tourism.district` | What places can I visit in {d}? | travel guide, by district | R |
| 49 | `tourism.season` | When is the Char Dham yatra season? | travel guide | R |
| 50 | `tourism.register` | How do I register for the Char Dham yatra? | travel guide official links | R |
| 51 | `tourism.guidelines` | What should pilgrims keep in mind? | travel guide guidelines | R |
| **Pahad Pulse tools** ||||
| 52 | `tools.list` | What tools does Pahad Pulse have? | product wording | R |
| 53 | `tools.tripcheck` | What does Trip Check do? | product wording | R |
| 54 | `tools.compare` | How does the district comparison tool work? | product wording | R |
| 55 | `tools.schemes` | What is the scheme finder? | scheme directory (live count) | D |
| 56 | `tools.map` | What can I see on the map? | product wording | R |
| 57 | `tools.explorer` | What is the Data Explorer? | product wording | R |
| 58 | `tools.budget` | What does the budget explorer show? | product wording | R |
| 59 | `tools.notifications` | How do I get warning notifications? | product wording | R |
| **Data & sources** ||||
| 39 | `data.sources` | Where does Pahad Pulse get its data? | source registry | D |
| 40 | `data.fresh` | How up to date is this data? | source registry freshness | D |
| 41 | `data.district` | What data is available for {d}? | area indicators (count by category) | R |
| 60 | `data.official` | Is this official government data? | product wording | R |
| 61 | `data.verify` | How can I check a figure myself? | product wording | R |
| 62 | `data.missing` | Why do some figures say 'not available'? | product wording | R |
| 63–70 | `source.weather`, `.alerts`, `.fires`, `.quakes`, `.statistics`, `.tourism`, `.internet`, `.budget` | Where do the … figures come from? | source registry, by owning module | D |
| **About Pahad Pulse** ||||
| 42 | `app.help` | What can you answer? | catalogue itself | R |
| 71 | `about.what` | What is Pahad Pulse? | product wording | R |
| 72 | `about.why` | Why use Pahad Pulse instead of government portals? | product wording | R |
| 73 | `about.government` | Is Pahad Pulse a government app? | product wording | R |
| 74 | `about.scope` | Why doesn't Pahad Pulse show live traffic or navigation? | product wording: reduce complexity; maps apps already do this | R |
| 75 | `about.account` | Do I need an account to use Pahad Pulse? | product wording | R |

**District-taking (17):** 2, 5, 8, 9, 10, 14, 16, 17, 21, 22, 23, 24, 28, 36, 41, 48. **Place-taking
(3):** 43–45. The district list comes from `listDistricts` and the place list from the travel
guide, never hard-coded. When a name is both (Nainital), a district's own name means the
district; an alias that is also a guide place (Kedarnath) means the place.

"Product wording" answers state facts about Pahad Pulse itself and hold no figures. The scope
answer (74) records the product principle: reduce complexity, and don't rebuild what map apps
already do well.

**Starter chips (6):** 1, 8, 16, 4, 18, 29. They cover safety, weather, travel, fires, the Char
Dham and the state profile.

### 3.3 Rules

| # | Rule |
|---|---|
| AST-1 | Every number in an answer comes from a resolver `Fact`. Templates hold no numbers of their own. |
| AST-2 | Every answer that states a figure shows its source and the date the figure describes. |
| AST-3 | A resolver whose source is unavailable, not redistributable, or empty returns `status: 'unavailable'` with a reason. It never says "zero" when the truth is "we don't know". This is the road-closures case until PWD permission (RD-1). |
| AST-4 | Safety answers (1, 2, 4, 5, 13, 14, 16) end by pointing to the authority: warnings to SDMA/IMD, emergencies to 112. `travel.check` never says a trip is "safe" or "unsafe". It lists signals only. |
| AST-5 | The matcher only ever routes to a catalogue question. With low confidence it asks the reader to pick; it never produces an answer from the reader's own words. |
| AST-6 | Answers use the reader's language. Hindi templates are written, not machine-translated, and the district name uses the Hindi spelling where the area record has one. |
| AST-7 | No chat history leaves the device. The server is stateless: each request is one question, with no identity, token or transcript. |
| AST-8 | The chat describes itself as answers from Pahad Pulse data, and nothing more. |

## 4. Backend design

```
src/services/assistant/
  catalogue.ts        Question + Category definitions (typed, en/hi text, keywords, follow-ups)
  resolvers/          one file per category; each resolver: (params, now) → Result<ResolvedFacts, RequestError>
    safety.ts  weather.ts  roads.ts  tourism.ts  district.ts  state.ts  network.ts  budget.ts  data.ts
  composer.ts         (question, facts, language) → Answer: fills the template, attaches sources
  matcher.ts          (text, language) → ranked question ids + detected district
  districts.ts        district name/alias lookup (en, hi, romanised, common misspellings)
src/controllers/assistant.controller.ts
src/routes/assistant.route.ts
```

### 4.1 Catalogue entry

```ts
interface Question {
  id: QuestionId;                        // 'district.population'
  category: CategoryId;                  // 'districts'
  text: Localised;                       // { en: 'What is the population of {district}?', hi: '...' }
  params: readonly ('district')[];       // [] or ['district']
  keywords: { en: string[]; hi: string[] };  // matcher input, not shown
  resolver: Resolver;                    // see 4.2
  template: AnswerTemplates;             // ok / unavailable / empty wordings, en + hi
  followUps: readonly QuestionId[];      // 2–3, may carry the same district forward
  cacheClass: 'live' | 'daily' | 'reference';
  route: (params) => string | null;      // deep link: '/districts/almora', '/map', '/alerts'
}
```

### 4.2 Resolvers

A resolver calls one or more **existing controller functions** and returns plain facts:

```ts
type Resolver = (params: { district?: DistrictRef }, now: Date)
  => Promise<Result<ResolvedFacts, RequestError>>;

interface ResolvedFacts {
  status: 'ok' | 'empty' | 'unavailable';
  slots: Record<string, string | number>;   // what the template interpolates
  facts: Fact[];                            // what the UI renders as source cards
  reason?: 'source_unavailable' | 'not_redistributable' | 'no_data';
}
```

Controllers, not repositories, so DS-6, expiry and freshness are applied exactly as they are
for the dashboards. If a controller returns `SOURCE_NOT_REDISTRIBUTABLE`, the resolver turns
it into `status: 'unavailable', reason: 'not_redistributable'`. It is not an HTTP error: the
question was valid, and the answer is "we can't show this".

### 4.3 Composer

Templates use named slots: `'{district} has an estimated population of {population}
({vintage}).'` The composer:
1. picks the `ok`, `empty` or `unavailable` template for the status
2. formats numbers per language (`en-IN` digit grouping, as the dashboards do)
3. fails closed: a slot the template names but the resolver didn't supply is a programming
   error. That fails a test at build time and never reaches a reader as "{population}".

### 4.4 Matcher (free text → question)

Deterministic scoring, no model:

1. **Normalise:** lowercase, strip punctuation, Unicode NFC, collapse spaces.
2. **Find the district:** longest match against the alias table (`dehradun`, `देहरादून`,
   `dehra dun`, `pauri`, `garhwal pauri`, `nainital`/`naini tal`, …). Remove it from the text.
3. **Score** each question: keyword hits (weight 3), category word hits (weight 1), with +2 when
   the question takes a district and one was found, and −3 when it needs one and none was found.
4. **Decide:**
   - top score ≥ 5 and at least 2 more than the next → answer directly (`matched`)
   - top score ≥ 3 → offer the top 3 as chips (`suggest`)
   - otherwise → apologise, show the starter chips (`none`)
5. Log only the `outcome` and question id, never the typed text (AST-7). Counts of `none`
   show which questions to add next.

Romanised Hindi keywords (`mausam`, `baarish`, `aag`, `sadak band`, `bhookamp`) are listed with
the English ones, because readers type Hindi in Latin script.

### 4.5 Endpoints

| Method | Path | Body / query | Returns | Cache |
|---|---|---|---|---|
| GET | `/api/assistant/catalogue` | `?lang=en\|hi` | categories, questions (id, text, params, category), starters, district list | 6 h |
| POST | `/api/assistant/answer` | `{ questionId, district?, lang }` | `Answer` | none. Caching sits inside the resolvers, per `cacheClass` |
| POST | `/api/assistant/match` | `{ text (≤ 200 chars), lang }` | `{ outcome, questionId?, district?, suggestions[] }` | none |

POST, not GET, for `answer` and `match`: typed text must not end up in URLs, proxy logs or CDN
keys (AST-7). All bodies are validated with Zod (N5). The existing API rate limit applies, and
`match` gets a tighter one (30 requests a minute per IP).

**Errors** (new range `97xxx`, registered in `ERRORS`):

| Code | When | HTTP |
|---|---|---|
| 97001 `ASSISTANT_QUESTION_UNKNOWN` | `questionId` not in the catalogue | 404 |
| 97002 `ASSISTANT_PARAM_REQUIRED` | a district question sent with no district | 400 |
| 97003 `ASSISTANT_DISTRICT_UNKNOWN` | a slug that isn't one of the 13 | 400 |
| 97004 `ASSISTANT_PLACE_UNKNOWN` | a place slug that isn't in the travel guide | 400 |

An upstream or source failure is **not** an error at this level. It comes back as
`status: 'unavailable'` inside a 200 (AST-3).

## 5. Answer shape

```json
{
  "questionId": "district.population",
  "district": { "slug": "almora", "name": "Almora" },
  "status": "ok",
  "text": "Almora has an estimated population of 6,22,506 (Census 2011).",
  "facts": [
    { "label": "Population", "value": 622506, "unit": "people",
      "vintage": "2011-03-01", "source": { "department": "Office of the Registrar General & Census Commissioner", "url": "…" } }
  ],
  "links": [{ "label": "Open Almora", "route": "/districts/almora" }],
  "followUps": [
    { "questionId": "district.literacy", "district": "almora", "text": "What is the literacy rate in Almora?" },
    { "questionId": "weather.now", "district": "almora", "text": "What's the weather in Almora right now?" }
  ],
  "generatedAt": "2026-09-29T08:00:00.000Z"
}
```

`route` values are app paths shared by web and mobile (`/districts/[slug]`, `/alerts`, `/map`,
`/roads`, `/tourism`, `/connectivity`, `/governance`, `/sources`). Each client maps a path it
doesn't have to the nearest page it does.

## 6. Flows

### 6.1 Open the chat
```
User taps launcher → client GET /assistant/catalogue (cached; reference staleTime)
  → greeting bubble ("Ask about warnings, weather, roads, districts…")
  → 6 starter chips + "Browse topics" (11 topic tiles)
```

### 6.2 Tap a question that needs no district
```
chip tap → user bubble shows the question text
        → POST /assistant/answer {questionId, lang}
        → typing indicator (skeleton bubble)
        → answer bubble: text, fact cards (value, date, source), "Open page" link, follow-up chips
```

### 6.3 Tap a question that needs a district
```
chip tap → the bot asks "Which district?" with 13 district chips, or "Which place?" with the
           guide's places grouped as Char Dham / pilgrim places / destinations
           (followed districts first; on mobile, from the Zustand store)
        → district tap → POST /answer {questionId, district, lang} → as 6.2
        → follow-ups keep the chosen district, so "weather in Almora" → "roads in Almora" is one tap
```

### 6.4 Type a question
```
submit text → user bubble → POST /assistant/match {text, lang}
   matched  → POST /answer (with the detected district) → as 6.2
   matched but needs a district and none found → as 6.3
   suggest  → "Did you mean…" + up to 3 question chips
   none     → "I can answer questions about warnings, weather, roads, districts…" + starter chips
```

### 6.5 Failures
```
network error on /answer   → error bubble with a Retry chip (resends the same questionId + district)
status: 'unavailable'      → honest bubble: "Road closure data isn't available in the app yet.
                             For road status call 1364." + link to the source page
status: 'empty'            → "No active warnings for Almora right now." (this is a real answer, not a failure)
catalogue fails to load    → launcher still opens; one bubble explains and offers Retry
```

### 6.6 Conversation state (client only)
```
messages[]   – in component state; cleared when the panel or screen closes (AST-7)
district     – last district used, offered first in the district picker
lang         – from the app's language store / web locale; switching language changes only
               messages sent after the switch, earlier ones stay as they were
```

## 7. UI

Both UIs use the current design system, the one the Today screen was redesigned in (surfaces,
cards, type scale, spacing, tokens), so the chat looks like the rest of the app and site. Nothing in
the chat gets its own styling. (Product owner, 2026-09-29.)

**Web.** A floating "Ask" button, bottom-right, on every page (in the dashboard layout). It
opens a 400 × 600 panel on desktop and a full-height sheet under 640 px. Fact cards reuse the
source-note style. Keyboard: Enter sends, Esc closes, focus is trapped in the panel,
`aria-live="polite"` on the message list.

**Mobile.** An `/assistant` stack screen, opened from an "Ask Pahad Pulse" card on Today
(under the hero) and from More. The same atoms as elsewhere (Card, Text, Chip, Pressable),
with a keyboard-avoiding input bar and 48 pt chips. Hindi uses the bundled Noto Devanagari
fonts.

Both UIs call the chat "Ask Pahad Pulse · answers from official data" and link "How answers
work" to `/sources` (AST-8).

## 8. Testing

| Layer | What |
|---|---|
| catalogue | every question has en + hi text and templates; every follow-up id exists; every template slot is supplied by its resolver's fixture; ids are unique |
| resolvers | per category, with mocked controllers: ok / empty / unavailable / not-redistributable |
| composer | number formatting per language; a missing slot fails; the unavailable wording never contains a digit |
| matcher | a table of about 80 phrases (en, hi, romanised, misspelled districts) → expected question and district; `none` for off-topic text |
| routes | validation errors 97001–97004; `match` rejects text over 200 chars |
| web | panel opens, chip → answer renders facts; keyboard and aria |
| mobile | screen flow with mocked API; district picker; follow-up keeps the district |

## 9. Delivery phases

1. **Backend — complete**: catalogue, resolvers, composer, matcher, three endpoints, tests.
2. **Web — complete**: launcher and responsive panel on every dashboard page.
3. **Mobile — next**: screen, entry points, i18n.
4. **Tuning**: review `none` outcomes after two weeks; add or reword questions.

## 10. Open questions

- Should `roads.*` stay listed while PWD closures can't be shown? Proposed: yes. The answer
  gives the 1364 helpline, which is useful, and the question will work once permission
  arrives, with no release needed.
- Analytics: are outcome counts (no text) wanted in `/ops`?
