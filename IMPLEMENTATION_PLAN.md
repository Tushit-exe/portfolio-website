# Implementation Plan: Bento Grid About Me Section

Rearchitect the **About Me** section of the portfolio into a modern, 6-card **Bento Grid** inspired by the reference design, while preserving 100% of the website's editorial brutalist DNA (Syne/Inter typography, high-contrast monochrome tokens, interactive canvas components, and tactile grain overlay).

---

## 🎨 Design DNA & Aesthetics Alignment

| Element | Specification | Codebase Alignment |
| :--- | :--- | :--- |
| **Color Palette** | Cream `#F5F4F0`, Card White `#FFFFFF`, Dark `#080808`, Accent Green `#10B981` | Uses `var(--bg-cream)`, `var(--text-black)`, `var(--border-dark)` |
| **Typography** | `Syne` (Bold Display Titles), `Inter` (Minimal Body & Eyebrow Labels) | Matches site design system tokens |
| **Borders & Radii** | `1px solid rgba(8,8,8,0.12)` or dark borders, `border-radius: 24px` | Sleek modern card containers |
| **Interactive Widgets** | 1. 3D Dotted Spinning Globe (Canvas API)<br>2. Real-Time Ticking Analog Clock (SVG/Canvas) | Lightweight zero-dependency JS animations |

---

## 📐 Bento Layout Architecture

The section will be organized as a **2-Row Bento Grid** on desktop and stack gracefully on tablet/mobile:

```
+-----------------------------------+-----------------------------------+-----------------------------------+
| CARD 1: PROFILE & BIO             | CARD 2: TIMEZONE & GLOBE          | CARD 3: EDUCATION & CREDENTIALS   |
| - Monogram Avatar ("TA")           | - "FLEXIBLE WITH TIMEZONES"       | - "EDUCATION"                     |
| - Name: Tushit Audi               | - "Based in Hubli, available..."  | - University & Degree card        |
| - Role: Dev & Automation          | - Interactive Dotted Canvas Globe | - Graduation badge (2022 — 2026)  |
| - Detailed Bio Paragraph          |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| CARD 4: AVAILABILITY & CTA        | CARD 5: FLOATING ANALOG CLOCK     | CARD 6: MINDSET QUOTE             |
| - "AVAILABLE FOR WORK" badge      | - Real-time ticking Watch Face    | - Watermark SVG Quote Icon        |
| - "HAVE A VISION? LET'S BUILD IT" | - Day/Date Window ("THU 24")      | - "Real artists ship."            |
| - Resume / Contact Button         | - Sub-dial: "IST (UTC+5:30)"      | - STEVE JOBS / VIBE CODING        |
+-----------------------------------+-----------------------------------+-----------------------------------+
```

---

## 🛠️ Detailed Component Specs

### 1. Card 1: Profile & Bio Card
- **Avatar Monogram**: Circular badge with `TA` initials or photo frame, styled with double-ring borders.
- **Header**: `Tushit Audi` in `Syne` bold font + `Web Developer & Automation Specialist` subtitle.
- **Body**: Editorial bio focusing on full-stack web applications, n8n automation pipelines, and lightspeed AI-assisted delivery.

### 2. Card 2: Flexible Timezone & Dotted 3D Globe
- **Eyebrow**: `FLEXIBLE WITH TIMEZONES` (uppercase, muted inter font).
- **Headline**: `Based in Hubli, available globally`.
- **Canvas Globe**: Lightweight 2D/3D Canvas dot-matrix sphere that continuously rotates with smooth interactive mouse drag control.

### 3. Card 3: Education & Background
- **Eyebrow Header**: Graduation cap icon + `EDUCATION`.
- **Degree Card**:
  - `KLE Technological University` (or relevant institution).
  - `Bachelor of Engineering / Computer Science & Automation`.
  - Pill Badge: `GRADUATE` (Emerald green tint).
  - Years: `2022 — 2026`.

### 4. Card 4: Availability & CTA Card
- **Status Badge**: Pulsing green status dot + `AVAILABLE FOR WORK`.
- **Display Headline**: `HAVE A VISION? LET'S BUILD IT together.`
- **CTA Action**: `Download Resume ⤓` button with hover scale micro-animation.

### 5. Card 5: Real-Time Floating Analog Clock Widget
- **Visual Design**: High-precision circular analog watch face with date window (`THU 24`), sub-dial (`IST`), hour/minute/second hands, and drop shadow.
- **Interactivity**: Ticks in real time synced to India Standard Time (IST / UTC+5:30).
- **Layout Effect**: Dynamically centers and overlaps the bottom grid junction for high visual polish.

### 6. Card 6: Mindset Quote Card
- **Large Watermark**: Semi-transparent quote mark (`“`).
- **Quote Text**: *"Real artists ship. Websites that look elite. Workflows that run on autopilot."*
- **Author Tag**: `STEVE JOBS — THE VIBE CODING MINDSET`.

---

## ⚡ Implementation Steps

### Phase 1: Structure Update (`index.html`)
Replace the current `#about` grid with the new `<div class="bento-grid">` structure containing the 6 specialized card articles.

### Phase 2: Styling Engine (`src/style.css`)
- Define `.bento-grid` layout (CSS Grid: `grid-template-columns: repeat(3, 1fr)`).
- Implement responsive breakpoints (`@media (max-width: 1024px)` -> 2 cols, `@media (max-width: 640px)` -> 1 col).
- Style individual bento card containers, typography, buttons, and floating clock overlapping positioning.

### Phase 3: Interactive JS Modules (`src/main.js`)
1. **Dotted Globe Canvas Engine**:
   - Render ~600 distributed latitude/longitude dots on a 3D sphere projected to 2D Canvas.
   - Smooth Y-axis rotation loop with `requestAnimationFrame`.
2. **IST Real-Time Clock Engine**:
   - Calculate current IST hours, minutes, and seconds.
   - Rotate hour, minute, and second hands (`deg = 360 * (val / max)`).
   - Dynamically update day and date window text (`THU 24`).

### Phase 4: Testing & Verification
1. Run `npm run build` to verify clean Vite compilation.
2. Update `e2e/hero.spec.js` Playwright test assertions for new Bento grid elements.
3. Run `npx playwright test` to ensure 100% pass rate.
4. Capture browser subagent screenshot to confirm pixel-perfect visual execution.

---

## 📋 File Modification Summary

- [`index.html`](file:///Users/tushitaudi/Desktop/portfolio-website/index.html): Update `#about` section markup with Bento Grid cards.
- [`src/style.css`](file:///Users/tushitaudi/Desktop/portfolio-website/src/style.css): Add Bento Grid, Card layout, and Clock/Globe widget styles.
- [`src/main.js`](file:///Users/tushitaudi/Desktop/portfolio-website/src/main.js): Add `initDottedGlobe()` and `initAnalogClock()` functions.
- [`e2e/hero.spec.js`](file:///Users/tushitaudi/Desktop/portfolio-website/e2e/hero.spec.js): Update E2E test selectors for About section.
