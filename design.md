# Vert & Dirt — Team Performance Portal — Design

Web-first (desktop), responsive to tablet and mobile. Visual prototype only: fictional demo data, no backend, no auth.
Core loop: TEST. UNDERSTAND. TRAIN. RETEST.

## Brand direction

Derived from vertanddirt.co.za and the logo (condensed all-caps wordmark, script "Coaching", line-art mountain
"Made for Mountains"). The portal is a data product, but it keeps the trail/mountain origin: paper-light
surfaces, near-black sidebar, forest and clay accents, topographic line textures, no clinical blue/white.

## Colour tokens (CSS variables in `packages/web/src/web/styles.css`)

| Token | Hex | Use |
|---|---|---|
| background | #F5F4EF | Page (paper) |
| card | #FFFFFF | Cards, tables |
| foreground | #111412 | Primary text |
| muted-foreground | #6B716C | Secondary text, labels |
| border | #DEDCD3 | Hairlines |
| primary | #16201A | Primary buttons, active states |
| accent (forest) | #2F5D46 | Positive trend, key data series |
| ochre | #B9793A | Secondary data series, "due" warnings |
| clay | #B3412B | Declines, errors, "not approved" |
| sage | #7C8F86 | Neutral / stable, tertiary series |
| sidebar | #0F1411 | Left navigation (logo colour family) |

Trend colours are never the only signal: arrows and words ("Improving", "Stable", "Declined") accompany them.

## Typography

- Display: **Barlow Condensed** 600/700, uppercase for section titles and team names (echoes the wordmark).
- Body and data: **Barlow** 400/500/600, `font-variant-numeric: tabular-nums` for every number.
- Loaded from Google Fonts in `index.html`.
- Hierarchy: page title 40px condensed, card title 14px condensed uppercase tracked +0.08em, body 14–15px, data 13px.

## Layout

- Left sidebar 232px (logo, team switcher, nav). Top bar with page breadcrumb, role switch, "Demo data" flag.
- Content max width ~1400px, 24px gutters, 16px card radius-lite (10px), 1px hairline borders, no heavy shadows.
- Dashboard hero band: team identity block on a topographic contour texture (SVG, low contrast).
- Under 1024px: sidebar collapses to a top scroll nav; grids stack to 1 or 2 columns.

## Components

- **Summary card**: label (uppercase), big value, unit, sub-line with n (e.g. "n = 13 tested"). Shows "—" when suppressed.
- **Status pill**: Draft (stone), Under review (ochre), Approved (forest), Published (ink).
- **Athlete table**: sticky header, sort on header click, search, event filter, column chooser, row checkbox, CSV export, name opens passport.
- **Charts**: hand-built SVG (line, histogram, horizontal bars, lactate curve). Axis labels, units, and reference lines always labelled.
- **Demo banner**: every screen shows "FICTIONAL DEMO DATA" in the top bar. Values are never presented as real measurements.

## Pages

1. Team Dashboard — `/` — team header, 7 summary cards, team performance table preview, graphs (VO2max distribution, LT2 pace trend), retest queue, passport preview card.
2. Team Athletes — `/athletes` — full interactive table with column customisation and export.
3. Athlete Passport — `/athletes/:id` — profile, performance snapshot (only measured values), testing history timeline, sharing/consent panel, trend chart.
4. Lactate Test Report — `/athletes/:id/tests/:testId` — method disclosure, lactate curve with LT1/LT2, stages table, zones, practitioner interpretation, report status.
5. Team Analytics — `/analytics` — distributions, event grouping (n >= 5 rule), period comparison with practitioner-set change thresholds, athlete development classes.
6. Practitioner Test Entry — `/practitioner/test-entry` — session details, protocol, stage entry grid, file upload area, workflow actions.
Placeholders: Testing History, Team Reports, Testing Schedule, Settings.

## Roles and privacy (prototype behaviour)

- Role switch (Practitioner / Coach). Coach cannot see Test Entry or approve/publish actions; edit controls are disabled.
- Passports show an athlete-consent panel: what is shared with the coach (team-level metrics) and what is private.
- Group statistics are suppressed when n < 5 and shown as "Suppressed (n<5)".
- Only "Published" reports appear in athlete/coach views.

## Interaction rules

- Animations: one staggered fade-up on the dashboard load; no decorative motion elsewhere.
- Not tested: "Not tested" text. Missing value: "—". Never invent a value.
- Tables: keyboard focus rings, 44px touch targets on mobile.

## Architecture (future phases, not built now)

- API: oRPC procedures per feature (not in this phase).
- Data model mirrors the brief's entities (teams, athletes, team memberships, test sessions, raw data, results, protocols, reports, approvals, permissions). Demo data is shaped like those entities in `src/web/lib/demo-data.ts`.
