# Page Audit — Redline B2B SaaS

Generated: 2026-05-24 · Branch: production
Status legend: `[ok]` working · `[brk]` broken/dead · `[wrn]` works but ugly/inconsistent · `[na]` not in scope

---

## Phase 0 — Boot & smoke results

| Check | Result | Notes |
|---|---|---|
| `pnpm install` | ok | clean |
| `pnpm typecheck` | ok | 0 errors all 3 workspaces |
| `pnpm test` | ok | 98/98 across 16 files |
| API on `:3005` | ok | ClickHouse DDL applied, Stripe ready, scheduler armed |
| Web on `:4004` | ok | Vite 5.4.21 ready in 139ms |
| `GET /health` | ok | `{"ok":true}` |
| `GET /v1/dashboard/summary` (auth) | ok | 27 vendors, $5.0M ARR, 3 open changes |
| `GET /v1/billing/products` (auth) | ok | Compliance Pack $999 surfaced |
| `GET /` (web) | ok | Halo landing renders |
| `GET /app/` (web) | ok | Static demo HTML renders |
| `GET /onboarding` (web) | **brk** | Returns Halo HTML — no `#root` in `apps/web/index.html` |
| `GET /evidence/:id` (web) | **brk** | Same — React SensoBrief never mounts |

### Critical Phase 0 finding (single biggest blocker)

`apps/web/index.html` has **no `#root` element and no `<script type="module" src="/src/main.tsx">`** —
the entire React app (`apps/web/src/screens/*.tsx`) is **orphaned**. Tests mount components
directly via jsdom (98 tests pass), but no browser path mounts the React tree. Real product
flows route to `/app/` (the static Babel-JSX demo).

---

## Consolidated audit summary

| Surface | Items audited | ok | brk | wrn |
|---|---|---|---|---|
| A. Halo landing (`public/index.html`) | 48 | 32 | 6 | 10 |
| B–F. Static demo (`public/app/*.jsx`) | 159 | 133 | 16 | 3 |
| G–L. React app (`apps/web/src/*`) | 67 | 43 | 15 | 9 |
| **Total** | **274** | **208 (76%)** | **37 (13%)** | **22 (8%)** |

---

## A. Halo landing — `public/index.html` (mirrored at `apps/web/index.html`)

### A.1 Nav
- A.1.1 [wrn] Brand mark `.nav .brand .mark` — conic-gradient circle, no logo image — **fix**: replace with `<img src="/logo.png">` from `unsyphlogo.png`
- A.1.2 [ok] Brand text "REDLINE / Subscription OS"
- A.1.3 [brk] Product link — `href="#"` dead
- A.1.4 [brk] Vault link — `href="#"` dead
- A.1.5 [brk] Pricing link — `href="#"` dead
- A.1.6 [brk] Changelog link — `href="#"` dead
- A.1.7 [ok] "Get access" CTA → `/app/`
- A.1.8 [brk] Mobile nav — `@media (max-width:680px)` hides nav ul with no hamburger fallback

### A.2 Hero
- A.2.1 [ok] Eyebrow badge "v4.2 · The Subscription OS"
- A.2.2 [ok] Hero headline (gradient text)
- A.2.3 [ok] Subheading
- A.2.4 [ok] Primary CTA "Start free trial" → `/app/`
- A.2.5 [brk] Secondary CTA "Book a walkthrough" — **no handler defined**
- A.2.6 [ok] Rainbow stripe
- A.2.7 [ok] 3D cube animation

### A.3 Scroll/animation
- A.3.1–A.3.4 [ok] Scroll-explode cube renders correctly, honors prefers-reduced-motion
- A.3.5 [wrn] Cube tumble does not decelerate with scroll (only opacity does) — minor

### A.4–A.6 Sections / a11y
- A.4 [wrn] Stat grid: no mobile breakpoint, stays 3-col on small screens
- A.6.3 [wrn] No semantic `<nav>` / `<main>` landmarks
- A.6.6 [wrn] Color contrast: gradient title + low-opacity nav links borderline WCAG AA

### A.12 Footer
- A.12.1 [brk] **No footer at all** — missing legal, social, copyright

---

## B. Static demo — Portfolio (`public/app/screen-portfolio.jsx`)

- B.1–B.16 [ok] Sidebar, top bar, fleet stats, vendor cards, activity feed all wired with dispatchers
- B.4 [wrn] 6 sidebar items (Renewals/Policies/Procurement/Legal/Security/Finance) intentionally read-only with flash feedback

## C. Static demo — Change report (`public/app/screen-change.jsx`)

- C.5 [brk] Forward button (→) — no onClick — line 64
- C.6 [brk] More button (⋯) — no onClick — line 65
- C.25a [brk] ACKNOWLEDGE button (Notion P1) — no onClick — line 345
- C.25b [brk] SNOOZE 48H button (Notion P1) — no onClick — line 347
- C.25c [brk] OPEN RENEGO COPILOT — no onClick — line 351
- C.26a–C.26e [brk] Generic P2 buttons (Acknowledge / Snooze / Export / Assign) — no onClick — lines 358–365
- C.18 [ok] ESCALATE TO LEGAL (Notion) → `open-escalate` ✓

## D. Static demo — Escalate modal (`public/app/escalate.jsx`)

- D.1–D.11 [ok] All wired correctly (backdrop click, ✕, Cancel, Route & Generate Bundle)

## E. Static demo — Routing transition (`public/app/routing.jsx`)

- E.1–E.7 [ok] Log streams at 220ms, auto-advances to evidence after 1100ms

## F. Static demo — Evidence brief (`public/app/screen-evidence.jsx`)

- F.6 [brk] Forward button — line 40
- F.7 [brk] More button — line 41
- F.16 [brk] Download PDF button (sidebar) — line 170
- F.17 [brk] Share with audit button — line 171
- F.18 [brk] Copy share link button — line 172
- F.20 [brk] DOWNLOAD BUNDLE (footer) — line 197
- F.21 [brk] SHARE WITH AUDIT (footer) — line 198
- F.22 [ok] BACK TO REPORT → `goto:change` ✓
- F.23 [ok] PORTFOLIO → `goto:portfolio` ✓

## J. Cross-cutting demo issues

- J.17 [brk] `public/app/index.html` loads `screen-onboarding.jsx` (line 43) — **file does not exist**; Babel fails silently
- J.18 [brk] `public/app/live.js` polls `/v1/dashboard/summary` but returns 401 — bearer token not picked up from meta tag
- J.19 [wrn] No SSE subscription in static demo — `live.js` only polls once, no `/v1/stream` listener

---

## G. React app — Onboard / Add Vendor (`apps/web/src/screens/Onboard.tsx`)

- G.1 [wrn] Vendor name input — no UI-side required indicator (zod only)
- G.2 [wrn] URL input — type="url" but no validation hint
- G.3 [wrn] Owner select — required field, no asterisk
- G.6 [ok] Submit calls POST /v1/vendors ✓
- G.7 [wrn] Error toast — no auto-dismiss
- G.8 [ok] FirstScanPanel with SSE useFirstScan ✓
- G.10 [wrn] FirstScanPanel — no "Add another vendor" button after success

## H. React app — VendorOnboarding wizard (`apps/web/src/screens/VendorOnboarding.tsx`)

- H.1–H.4 [ok] Tier cards, recommended badge, price, feature list all render
- H.5 [brk] TierCard CTA navigates to `/?tier=${id}` — App.tsx ignores query params, tier is lost

## I. React app — StripeModal (`apps/web/src/screens/StripeModal.tsx`)

- I.1–I.11 [ok] Modal, dialog a11y, fetch product, payment intent, Stripe Elements, SSE entitlement listener all wired
- I.12 [wrn] Error retry restarts entire flow

## J. React app — SensoBrief (`apps/web/src/screens/SensoBrief.tsx`)

- J.1–J.16 [ok] Fetch, loading, 404, error states, severity styling, citations, print stylesheet all wired
- Note: requires `#root` mount (currently orphaned)

## K. React app — App.tsx routing/header

- **K.0** [**CRITICAL**] `apps/web/index.html` missing `#root` + main.tsx script — entire React tree unreachable
- K.1 [brk] Default route "/" falls to `<RedlineApp />` = Add Vendor (not a dashboard)
- K.4 [brk] Header brand text `.app__mark` says **"Redline"** — mismatch with landing "REDLINE"
- K.5 [ok] Header nav buttons wired
- K.7 [wrn] Breadcrumb is `<span>`, should be `<nav aria-label="breadcrumb">`

## L. Brand inconsistency (cross-app)

- L.1 [brk] **Landing: "REDLINE"**, **App: "Redline"** — same product, two names
- L.2 [brk] No logo image asset referenced anywhere — only CSS gradient marks
- L.3 [ok] Dark theme palette consistent
- L.4 [ok] Brief light theme is print-friendly

---

## Top 15 fixes (priority order)

| # | Pri | Item | File | Fix |
|---|---|---|---|---|
| 1 | **P0** | React app has no mount point | `apps/web/index.html` | Add `<div id="root">` + `<script type="module" src="/src/main.tsx">` |
| 2 | **P0** | Brand split "Redline" vs "REDLINE" | `apps/web/src/App.tsx` + styles.css | Replace text mark with logo, rename "Redline" → "Redline" everywhere |
| 3 | **P0** | No logo on any surface | All 3 surfaces | Distribute `unsyphlogo.png` (198x144 RGBA) → favicons + nav marks |
| 4 | **P0** | Static demo dead file ref kills Babel pipeline | `public/app/index.html:43` | Remove `<script src="screen-onboarding.jsx">` |
| 5 | **P1** | Static demo `live.js` 401s | `public/app/live.js` | Use seed token; add SSE subscription to `/v1/stream` |
| 6 | **P1** | 4 dead nav links in Halo | `public/index.html` + apps/web mirror | Anchor to in-page sections or remove |
| 7 | **P1** | "Book a walkthrough" button dead | `public/index.html` | Wire to Calendly URL or remove |
| 8 | **P1** | 11 static demo action buttons no onClick | `public/app/screen-change.jsx`, `screen-evidence.jsx` | Either wire (alert/console for demo) or remove |
| 9 | **P1** | Halo has no footer | `public/index.html` + apps/web mirror | Add footer with legal links, social, copyright |
| 10 | **P2** | Mobile nav broken | `public/index.html` | Add hamburger menu or keep nav inline |
| 11 | **P2** | Stat grid not responsive on mobile | `public/index.html` | Add `@media (max-width:680px) { grid-template-columns: 1fr; }` |
| 12 | **P2** | VendorOnboarding tier CTA loses param | `apps/web/src/App.tsx` | Parse `?tier=` in default route |
| 13 | **P2** | Onboard form lacks required indicators | `apps/web/src/screens/Onboard.tsx` | Add `*` to required labels |
| 14 | **P3** | Onboard error toast no auto-dismiss | `apps/web/src/screens/Onboard.tsx` | setTimeout + dismiss button |
| 15 | **P3** | Header breadcrumb not semantic | `apps/web/src/App.tsx` | Wrap in `<nav aria-label="breadcrumb">` |

---

## Phase 2 fix routing (3 agents fan out)

- **Agent α — Halo landing** (P0/P1 items: #1 logo, #6 nav, #7 walkthrough, #9 footer, #10 mobile nav, #11 grid)
- **Agent β — Static demo** (P0 #3 logo, #4 dead ref, #5 live.js auth+SSE, #8 button handlers — wire or remove)
- **Agent γ — React app** (P0 #1 mount point, #2 brand→Redline+logo, #12 tier param, #13 required indicators, #14 toast dismiss, #15 breadcrumb a11y)

Logo distribution (Phase 3) runs FIRST so Agent α/β/γ can reference `/logo.png` and the sized favicons.
