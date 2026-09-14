# Pahad Pulse Mobile Colour Audit

## Product design read

Pahad Pulse is a bilingual, public-interest intelligence application for Uttarakhand. It brings alerts, terrain, district statistics, weather, roads, connectivity, tourism, air quality, seismic activity, and source provenance into one operational view.

- **Primary users:** residents, travellers, district administrators, researchers, journalists, and people making location-sensitive decisions.
- **Primary job:** understand what is happening, where it is happening, how serious it is, and which source supports the claim.
- **Usage pattern:** quick daily checks plus deeper analytical sessions; often outdoors, in strong light, in weak-network conditions, and during stressful weather events.
- **Required emotional register:** calm, authoritative, locally rooted, alert when necessary, and optimistic about useful public data.
- **Highest visual priority:** active safety alerts, current status, data values, affected place, and provenance—in that order.
- **Risk level:** high. Colour can help scanning, but it must never exaggerate severity or make uncertain data look live.

This is an informational and operational product, not a social or entertainment app. Its colour system should feel alive without becoming playful, decorative, or sensational.

## Evidence collected

- Audited 148 React Native/Expo files with the mobile UX static scanner.
- Inspected the running iPhone 17 simulator in dark mode on the Today and More screens.
- Scanned all TypeScript, TSX, JavaScript, and JSON files for HEX/RGB/HSL values: 136 syntactic occurrences, including documentation examples.
- Inspected theme, navigation, cards, badges, alerts, loading/error states, map WebView styling, map data colours, and native app configuration.
- Queried UI/UX Pro Max for data dashboards, glassmorphism, semantic colour/accessibility, and React Native guidance.

## Existing system: what works

- Application components already consume a centralized semantic theme rather than scattering raw HEX values.
- Light and dark palettes are separate mappings rather than simple inversions.
- Severity and freshness have dedicated domain scales.
- Text tokens were designed with small-text contrast in mind.
- The Pahad Pulse logo already supplies a recognizable blue/cyan/red identity.
- Severity badges include words, so colour is not the only signal.

These foundations should be retained.

## Existing system: problems

| Priority | Area                      | Evidence                                                                                             | Effect                                                                                                                       |
| -------- | ------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| P1       | Dark surface hierarchy    | `background`, `surface`, and `surfaceMuted` are neighbouring blue-navies and most cards add a border | The interface reads as one flat navy plane; dense information is harder to group.                                            |
| P1       | Alert cards               | Alert severity appears mainly as a 4 px stripe and badge                                             | The most important objects do not own their visual surface; the stripe looks appended rather than structural.                |
| P1       | Cross-layer inconsistency | Mobile map severity colours differ from the app theme severity scale                                 | The same alert can change colour between the list and map, weakening learned meaning.                                        |
| P2       | Brand expression          | Blue is used as both general brand and informational status; cyan is barely expressed                | The product feels generic and does not evoke Uttarakhand or environmental intelligence.                                      |
| P2       | Surface strategy          | Most cards are white/navy rectangles with either shadow or border                                    | Information hierarchy relies too much on boxes and too little on material weight and tonal grouping.                         |
| P2       | Background                | Screen backgrounds are uniform fills                                                                 | Translucent cards have nothing meaningful to refract, so glass treatment would look fake without a restrained ambient layer. |
| P2       | Semantic collision        | `danger`, `error`, and extreme alert red are close but not explicitly separated by purpose           | Destructive UI and environmental severity can become visually interchangeable.                                               |
| P2       | Native chrome             | Tab bar uses an opaque surface and hard top border                                                   | It feels detached from iOS 26 material while remaining acceptable but plain on Android.                                      |
| P2       | Map/WebView               | Several map colours and the WebView background are hardcoded outside the theme                       | Theme changes cannot propagate consistently to the map.                                                                      |
| P3       | App configuration         | Splash and Android adaptive-icon backgrounds retain pure white and the old brand blue                | Launch surfaces can flash a different visual system before the app loads.                                                    |

## Static UX signals relevant to colour

The scanner reported no P0 issues, 32 P1 signals, and 13 P2 signals. Many P1 entries are conservative accessibility detections on custom `Pressable` components, but they reinforce two colour-system requirements:

1. interactive state cannot rely on colour alone;
2. large text and localized labels must remain readable on tinted cards.

The colour migration will not change navigation, data behaviour, or information architecture. It will preserve existing labels, badges, icons, press feedback, and accessibility names.

## Three explored directions

### 1. Himalayan Signal — selected

- **Personality:** clear mountain air, public-service confidence, modern environmental intelligence.
- **Primary:** glacier blue, deep enough for white action text.
- **Supporting colour:** deodar teal, used for regional/environmental context rather than every action.
- **Accent:** restrained Himalayan saffron for attention and highlights that are not danger.
- **Neutrals:** mineral blue-green grays; warm enough to avoid a clinical SaaS look.
- **Surfaces:** snow/mineral glass in light mode and layered spruce glass in dark mode.
- **Expected response:** calm trust with a recognizable Uttarakhand identity.
- **Accessibility:** strong; chosen text pairs pass WCAG AA, and semantic status retains labels/icons.
- **Weakness:** needs disciplined accent usage or teal/saffron can become decorative.

### 2. Devbhoomi Editorial

- **Personality:** cultural, civic, archival, dignified.
- **Primary:** deep maroon.
- **Supporting colours:** temple saffron and forest green.
- **Neutrals:** parchment, stone, charcoal.
- **Surfaces:** warm paper-like panels with minimal translucency.
- **Expected response:** rooted, historical, official.
- **Accessibility:** achievable, especially in light mode.
- **Weakness:** maroon competes with extreme-alert red; parchment feels less appropriate for maps, live weather, and technical measurements.

### 3. Monsoon Observatory

- **Personality:** highly technical, atmospheric, real-time.
- **Primary:** midnight navy.
- **Supporting colours:** electric turquoise and storm violet.
- **Accent:** lime/chartreuse for live signals.
- **Neutrals:** cold blue grays.
- **Surfaces:** high-translucency dark glass.
- **Expected response:** advanced monitoring centre.
- **Accessibility:** good in dark mode if luminance is controlled.
- **Weakness:** risks the generic neon “AI dashboard” aesthetic prohibited by the brief, performs less comfortably in daylight, and can make ordinary data feel urgent.

## Decision

**Himalayan Signal** best fits the product because it keeps the existing blue identity, adds a regionally credible natural secondary colour, preserves red exclusively for safety/error meaning, and works for both calm research and urgent scanning. Glass is a material hierarchy, not a visual effect applied everywhere: alert cards, navigation chrome, and elevated overlays may use it; tables and dense data panels remain stable, high-opacity surfaces.

## Migration risks

- Existing uncommitted feature work must not be overwritten.
- Native Liquid Glass is available only on supported iOS builds; Android and older iOS need an opaque, contrast-safe fallback.
- Alpha surfaces must be checked over the real ambient background, not against an assumed solid colour.
- Map severity colours must migrate atomically with cards to avoid conflicting meanings.
- Pure palette changes can expose latent component typing errors; validation must distinguish pre-existing failures from colour regressions.
