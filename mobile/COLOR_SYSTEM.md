# Pahad Pulse Mobile Colour System

## Strategy

**Direction:** Himalayan Signal  
**Design intent:** make public data feel calm, legible, locally rooted, and operationally trustworthy.  
**Material rule:** glass communicates a floating or urgent layer; it is not the default decoration for every container.  
**Colour rule:** neutrals organize content, glacier blue indicates action/trusted information, deodar teal indicates environmental/regional context, saffron attracts non-danger attention, and severity colours belong only to alert state.

## Brand tonal scales

### Glacier blue

| Step | HEX       | RGB           |
| ---- | --------- | ------------- |
| 50   | `#EDF7FF` | 237, 247, 255 |
| 100  | `#D8EDFC` | 216, 237, 252 |
| 200  | `#AFDDF8` | 175, 221, 248 |
| 300  | `#79C6F1` | 121, 198, 241 |
| 400  | `#3EA7E4` | 62, 167, 228  |
| 500  | `#147FBD` | 20, 127, 189  |
| 600  | `#075E9C` | 7, 94, 156    |
| 700  | `#064C80` | 6, 76, 128    |
| 800  | `#0A4069` | 10, 64, 105   |
| 900  | `#0D3658` | 13, 54, 88    |
| 950  | `#072239` | 7, 34, 57     |

### Deodar teal

| Step | HEX       | RGB           |
| ---- | --------- | ------------- |
| 50   | `#ECFBF7` | 236, 251, 247 |
| 100  | `#D1F5EB` | 209, 245, 235 |
| 200  | `#A6E9D8` | 166, 233, 216 |
| 300  | `#70D7C0` | 112, 215, 192 |
| 400  | `#3CBDA3` | 60, 189, 163  |
| 500  | `#1A9A82` | 26, 154, 130  |
| 600  | `#147D71` | 20, 125, 113  |
| 700  | `#106359` | 16, 99, 89    |
| 800  | `#104F49` | 16, 79, 73    |
| 900  | `#0E423D` | 14, 66, 61    |
| 950  | `#062824` | 6, 40, 36     |

### Himalayan saffron

| Step | HEX       | RGB           |
| ---- | --------- | ------------- |
| 50   | `#FFF8E8` | 255, 248, 232 |
| 100  | `#FDEDC4` | 253, 237, 196 |
| 200  | `#FAD98A` | 250, 217, 138 |
| 300  | `#F5BD4F` | 245, 189, 79  |
| 400  | `#EC9B20` | 236, 155, 32  |
| 500  | `#D7790B` | 215, 121, 11  |
| 600  | `#A95600` | 169, 86, 0    |
| 700  | `#884104` | 136, 65, 4    |
| 800  | `#703309` | 112, 51, 9    |
| 900  | `#5D2B0B` | 93, 43, 11    |
| 950  | `#351504` | 53, 21, 4     |

The logo’s original `#015BD6`, `#01BAFE`, `#FD1C1D`, and `#2B2B2C` remain immutable asset colours. UI themes use the tuned scales above because asset colours do not automatically make accessible interface colours.

## Light theme mapping

| Role                    | Value                    | Purpose                               |
| ----------------------- | ------------------------ | ------------------------------------- |
| background-primary      | `#F2F7F7`                | Main mineral canvas                   |
| background-secondary    | `#E8F2F1`                | Ambient section wash                  |
| background-tertiary     | `#DCEDEB`                | Strongest ambient layer               |
| surface-primary         | `#FBFDFD`                | Default cards                         |
| surface-secondary       | `#E8F1F0`                | Nested/recessed cards                 |
| surface-tertiary        | `#DDEBE9`                | Grouped data regions                  |
| surface-elevated        | `#FFFFFF`                | Sheets/modals                         |
| surface-interactive     | `#F0F6F6`                | Inputs/search                         |
| surface-glass           | `rgba(251,253,253,0.78)` | Floating cards over ambient canvas    |
| surface-glass-strong    | `rgba(251,253,253,0.92)` | Android/reduced-transparency fallback |
| text-primary            | `#102A2B`                | Primary content                       |
| text-secondary          | `#314B4C`                | Supporting content                    |
| text-tertiary/muted     | `#587071`                | Captions/provenance                   |
| text-disabled           | `#91A5A3`                | Disabled only                         |
| text-inverse            | `#FFFFFF`                | Solid dark/brand fills                |
| text-link               | `#075E9C`                | Links                                 |
| border-subtle           | `#DCE8E6`                | Internal separators                   |
| border-default          | `#C8DAD7`                | Cards/chips                           |
| border-strong           | `#9DB9B4`                | Strong boundaries                     |
| border-focus            | `#075E9C`                | Focus state                           |
| action-primary          | `#075E9C`                | Primary action                        |
| action-primary-pressed  | `#064C80`                | Pressed action                        |
| action-primary-disabled | `#9DB9B4`                | Disabled action                       |
| selected                | `#D8EDFC`                | Selection state                       |
| pressed                 | `#DDEBE9`                | Generic press layer                   |
| secondary               | `#147D71`                | Environmental/regional context        |
| accent                  | `#A95600`                | Non-danger attention                  |
| shadow                  | `#102A2B`                | Elevation shadow                      |
| scrim                   | `rgba(7,34,57,0.52)`     | Modal isolation                       |
| skeleton                | `#DCE8E6`                | Loading                               |
| separator               | `#E3ECEB`                | Hairline divider                      |

## Dark theme mapping

| Role                    | Value                 | Purpose                                     |
| ----------------------- | --------------------- | ------------------------------------------- |
| background-primary      | `#071719`             | Deep spruce canvas; avoids pure black glare |
| background-secondary    | `#0B2022`             | Ambient section wash                        |
| background-tertiary     | `#103033`             | Strongest ambient layer                     |
| surface-primary         | `#10282A`             | Default cards                               |
| surface-secondary       | `#163336`             | Nested/recessed cards                       |
| surface-tertiary        | `#1A3B3E`             | Grouped data regions                        |
| surface-elevated        | `#1E4245`             | Sheets/modals                               |
| surface-interactive     | `#143033`             | Inputs/search                               |
| surface-glass           | `rgba(16,40,42,0.72)` | Floating glass                              |
| surface-glass-strong    | `rgba(16,40,42,0.92)` | Android/reduced-transparency fallback       |
| text-primary            | `#F2F8F7`             | Primary content                             |
| text-secondary          | `#C4D8D5`             | Supporting content                          |
| text-tertiary/muted     | `#9CB6B2`             | Captions/provenance                         |
| text-disabled           | `#607B77`             | Disabled only                               |
| text-inverse            | `#071719`             | Text on bright semantic fills               |
| text-link               | `#65BFFC`             | Links                                       |
| border-subtle           | `#1A3B3E`             | Internal separators                         |
| border-default          | `#285052`             | Cards/chips                                 |
| border-strong           | `#3C6869`             | Strong boundaries                           |
| border-focus            | `#65BFFC`             | Focus state                                 |
| action-primary          | `#65BFFC`             | Primary action                              |
| action-primary-pressed  | `#98D5FC`             | Pressed action                              |
| action-primary-disabled | `#3C6869`             | Disabled action                             |
| selected                | `#123A4D`             | Selection state                             |
| pressed                 | `#1A3B3E`             | Generic press layer                         |
| secondary               | `#5FD1BD`             | Environmental/regional context              |
| accent                  | `#FFB454`             | Non-danger attention                        |
| shadow                  | `#000000`             | Elevation shadow                            |
| scrim                   | `rgba(0,0,0,0.70)`    | Modal isolation                             |
| skeleton                | `#1A3B3E`             | Loading                                     |
| separator               | `#173437`             | Hairline divider                            |

## Semantic states

| State            | Light foreground | Light subtle | Dark foreground | Dark subtle |
| ---------------- | ---------------- | ------------ | --------------- | ----------- |
| Success/minor    | `#2E7D5B`        | `#E2F4EA`    | `#6DD6A6`       | `#10392B`   |
| Warning/moderate | `#895900`        | `#FFF1D6`    | `#F4BE58`       | `#392A0B`   |
| Severe           | `#C4420C`        | `#FCE9DF`    | `#FF925B`       | `#442014`   |
| Error/extreme    | `#A71930`        | `#FCE8EC`    | `#FF7188`       | `#40141D`   |
| Information      | `#075E9C`        | `#D8EDFC`    | `#65BFFC`       | `#123A4D`   |
| Unknown          | `#5F6F72`        | `#E7ECEB`    | `#A7B8B6`       | `#263A3B`   |

Alert cards use the relevant subtle colour as a high-opacity Android fallback and use the same hue as the tint/border on supported iOS glass. The worded severity badge and alert-type icon remain present; colour is supplementary.

## Contrast verification

Ratios use WCAG relative luminance.

| Pair                              |   Ratio | Result             |
| --------------------------------- | ------: | ------------------ |
| Light primary text / background   | 13.99:1 | AAA                |
| Light secondary text / background |  8.67:1 | AAA                |
| Light muted text / background     |  4.89:1 | AA for normal text |
| Light primary action / white      |  6.80:1 | AA                 |
| Light saffron action / white      |  5.23:1 | AA                 |
| Light warning / warning subtle    |  5.38:1 | AA                 |
| Light extreme / extreme subtle    |  6.33:1 | AA                 |
| Dark primary text / background    | 17.06:1 | AAA                |
| Dark secondary text / background  | 12.33:1 | AAA                |
| Dark muted text / background      |  8.51:1 | AAA                |
| Dark primary / background         |  9.09:1 | AAA                |
| Dark warning / warning subtle     |  8.18:1 | AAA                |
| Dark extreme / extreme subtle     |  5.97:1 | AA                 |

Disabled text is exempt from WCAG text contrast only when the control is genuinely disabled and exposes disabled semantics.

## Permitted combinations

- `text-primary`, `text-secondary`, and `text-muted` on their theme’s background and high-opacity surfaces.
- `text-inverse` on light-theme primary, primary-strong, saffron-600, severe, and extreme fills.
- Dark `text-inverse` only on bright dark-theme primary/accent/semantic fills.
- Severity foreground on its matching subtle surface.
- Primary, secondary, or accent as icon/data emphasis on neutral surfaces.
- Glass text only with the high-contrast text tokens; never with translucent gray.

## Prohibited combinations

- Saffron as an error or severe-alert colour.
- Brand pulse red as decoration, navigation selection, or ordinary data emphasis.
- White normal text on light cyan/teal/yellow fills without verified contrast.
- Muted text on a translucent surface whose composed contrast has not been checked.
- Severity conveyed by tint alone without badge text/icon.
- Two translucent surfaces stacked directly on one another.
- Arbitrary gradients, neon glows, or blue-purple “AI” treatments.

## Component applications

- **Screen:** a quiet mineral/spruce base. Colour belongs to meaningful content rather than decorative background blobs.
- **Default card:** high-opacity surface; no glass required for dense tables.
- **Alert card:** full severity-tinted glass, semantic border, alert icon, and worded badge.
- **Stat tile:** neutral surface; only the metric/icon receives one semantic emphasis.
- **Tab bar:** floating glass on supported iOS; strong translucent/opaque fallback elsewhere.
- **Map:** alert colours exactly match the semantic severity scale; district/road encodings remain separate categorical palettes.
- **Modal/sheet:** elevated surface or stronger glass plus scrim; never weak glass over dense content.

## Migration strategy

1. Extend the theme contract without removing existing token names.
2. Map current components to new light/dark values so the entire app changes centrally.
3. Apply the mineral/spruce canvas and semantic colour to key metrics.
4. Replace the alert stripe treatment with a full semantic glass card and safe fallback.
5. Give the tab bar a material background while preserving native navigation behaviour.
6. Align map alert colours and native launch surfaces.
7. Run format, TypeScript, lint, tests, iOS export, and simulator review in both themes.
8. Perform an external-style critique and one refinement pass.
