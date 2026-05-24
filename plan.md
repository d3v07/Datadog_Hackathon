# Redline — Build Plan (saasb2b branch)

A clean, minimal B2B SaaS app for **Vendor Change Intelligence (VCI)**.
Style is a deliberate hybrid: **Slate** layout + **Seven** typography.

> Source: `Redline-Enterprise-Vision.pdf` (the 10-flow product surface).
> Web research May 2026: B2B dashboards now favor *restraint over density*,
> progressive disclosure, and role-aware views — Linear, Vercel, Notion lineage.

---

## 0. Constraints I'm honoring

1. **Build on the existing monorepo** — `apps/web`, `apps/api`, `packages/shared`. Don't fork.
2. **One brand**: "Redline" (drop the legacy "Unsyphn" string everywhere).
3. **Hero flow first** — Portfolio → Change → Routing → Evidence → Transact → Bundle. Everything else is staged.
4. **Real where it matters, faked where it doesn't** — one real change run, one real Senso URL, one real Stripe checkout. The rest is seeded.
5. **No marketing chrome on the app surface** — landing page lives at `/`; product lives at `/app`.

---

## 1. Visual system — Slate × Seven

The two reference HTMLs (`seven.html`, `slate.html`) define this exactly.
**Layout, density, spacing, components → Slate.** **Type, weight discipline → Seven.**

### 1.1 Tokens (drop into `apps/web/src/styles/tokens.css`)

```css
:root {
  /* Surfaces — Slate's cool blacks */
  --bg:            #0A0B0F;
  --surface:       #13151B;
  --surface-2:     #1B1E27;
  --surface-3:     #232734;

  /* Borders — hairlines, 0.5px capable */
  --border:        #262934;
  --border-strong: #3A3E4D;
  --hairline:      rgba(255,255,255,0.06);

  /* Text — Seven's discipline applied to a dark base */
  --muted:         #5A5E6E;
  --text-2:        #A0A4B5;
  --text:          #EEF0F6;
  --text-strong:   #FFFFFF;

  /* Accent — Slate's periwinkle, action only */
  --accent:        #7C8CFA;
  --accent-hover:  #93A0FC;
  --accent-soft:   rgba(124,140,250,0.10);
  --accent-ring:   rgba(124,140,250,0.35);

  /* Semantic — traffic-light, role-bound */
  --success:       #3FCF8E;   /* "passing", "fresh", "P3" */
  --warning:       #F5C44A;   /* "expiring", "P2" */
  --danger:        #F47174;   /* "P1", "breach", "destructive" */

  /* Type — Seven's Helvetica Neue, NOT Geist */
  --font-display: "Helvetica Neue", "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
  --font-text:    "Helvetica Neue", "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
  --font-mono:    "SF Mono", "Geist Mono", ui-monospace, monospace;

  /* Scale — Slate's tight scale */
  --text-xs:   0.75rem;
  --text-sm:   0.8125rem;
  --text-base: 0.9375rem;
  --text-lg:   1.0625rem;
  --text-xl:   1.25rem;
  --text-2xl:  1.625rem;
  --text-3xl:  2.25rem;
  --text-4xl:  3rem;

  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 28px;
  --space-7: 40px; --space-8: 56px; --space-9: 80px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 999px;

  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-fast: 100ms;
  --dur-base: 180ms;
  --dur-slow: 300ms;

  --ring-focus: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent-ring);
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-text);
  font-size: var(--text-base);
  line-height: 1.55;
  font-weight: 300;        /* Seven's secret — Light default */
  -webkit-font-smoothing: antialiased;
}
```

### 1.2 Type rules (Seven applied to Slate)

| Token | Weight | Letter-spacing | Use |
|---|---|---|---|
| Hero (landing only) | **100** | -0.045em | "Redline." mark, 96–144px |
| h1 (in-app) | **200** | -0.035em | screen titles, 36–48px |
| h2 | **300** | -0.020em | section labels, 20–26px |
| h3 | **500** | normal | row group titles, 13–15px |
| body | **300** | normal | prose, 15px |
| label / button | **400** | normal | nav, controls, 13px |
| caption / meta | **400** | 0.04em uppercase | timestamps, ids, badges |

Single-font discipline — no serif, no display swap. **Helvetica Neue or stack fallback.**

### 1.3 Components — Slate lineage

- **Command palette** (`⌘K`) is the navigation primitive, not a sidebar tree.
- **Cards** are `--surface` + 1px `--border` + `border-radius: 12px`. Hover lifts border to `--border-strong`. **No shadows.**
- **Buttons**: `primary` (periwinkle bg), `secondary` (surface-2 bg + border), `ghost` (transparent). 32px tall, 8px radius. **No gradients.**
- **Badges**: filled with 10%-opacity color of the meaning (success / warning / danger / accent / neutral).
- **Hairlines** are 0.5px on retina, fall back to 1px. Use for list separators, never for emphasis.
- **Toggles** are Slate-style pills — periwinkle when on, not iOS-green.

### 1.4 Density rules

- Above-the-fold caps at **7 elements** (working-memory ceiling per 2026 dashboard research).
- Stat row is the ONE big number + 5 secondary chips. Never 8 KPIs in a wall.
- Tables wrap at 1280px to vertical stacks; never horizontal scroll.

---

## 2. Information architecture

```
/                          → Landing (Halo, marketing — keep current but restyle to dark Slate)
/app                       → Portfolio (hero screen, lands here post-login)
/app/vendor/:id            → Vendor detail (change history + posture + spend)
/app/change/:id            → ChangeReport (the diff card with citations)
/app/evidence/:id          → Public Senso brief (immutable, citable)
/app/policy                → Policy Studio (YAML view, not the editor)
/app/onboarding            → Add Vendor / pricing tier
/app/settings              → Org, integrations, role switcher
```

**Role switcher in the top bar** — Procurement | Legal | Security | Finance.
Same data, different lens. (PDF §4, plus 2026 trend: role-based interfaces.)

---

## 3. The hero flow (the only one that must be flawless)

This is the 3-minute demo. Build *this* before anything else.

1. **Portfolio** — fleet stats header (`143 vendors · 12 changes this week · 3 P1 · $84k at-risk`), 6–8 vendor cards in a grid with posture chip + renewal date + owner avatar.
2. **One live change** — click Notion → real ChangeReport with citations from a real Nimble pull + Gemini diff.
3. **Severity + routing** — policy fires, Slack DM card shown, Jira ticket card shown (typed Action record, not real Jira).
4. **Published evidence** — opens real Senso URL, immutable cited brief with dollar impact + recommendation.
5. **Transact** — Stripe test-mode "Buy Compliance Pack $999" → PaymentIntent.
6. **Compliance Evidence Bundle** — button generates real PDF (print view) bundling the ChangeReport + citations + routed actions.

Everything else is mentioned in the UI but not built.

---

## 4. What to *fake* convincingly (the 20% that buys 80%)

From PDF §12 "Demo dressing" + my taste pass:

- **Integrations footer**: Slack, Jira, Okta, Vanta, Ramp, Ironclad logos. Implies the trust ring.
- **Role switcher**: all four buttons clickable; two of three views can be placeholder copy.
- **Static fleet stats** at top of every in-app page (`143 vendors · 12 changes · 3 P1 · $84k`).
- **Recent activity feed** in Portfolio sidebar: 6 seeded items, last one ticks fresh on page load.
- **Posture chips** on every vendor card (color-coded; only Notion's posture is "real" data).
- **Wayback "backfilled 18 months ago"** caption under any seeded vendor — sells the cold-start answer.

---

## 5. Engineering tweaks (delta from the existing PR #10 main)

These are the *changes I'm making* on `saasb2b` — not a rewrite.

### 5.1 Brand & shell
- [ ] Rip "Unsyphn" everywhere → "Redline" (text + nav marks + favicon alt + page titles).
- [ ] Replace `unsyphlogo.png` references with a new `/logo.png` (mark + wordmark). Keep all favicon sizes.
- [ ] Rewrite `apps/web/src/styles.css` against the new tokens in §1.1.
- [ ] One global font load (`Helvetica Neue` system → `Inter` web fallback) — delete the existing Inter `<link>` if Helvetica Neue is local.
- [ ] Add `body.app-mode` dark-only styles so the React app never inherits landing-page paint.

### 5.2 Routing
- [ ] Move React app root from `/` → `/app`. Landing stays at `/`.
- [ ] Add `/app/policy` and `/app/settings` as placeholder screens (just the shell + "Coming soon" copy).
- [ ] Wire `?role=procurement|legal|security|finance` query param through `App.tsx` and reflect in top-bar switcher.

### 5.3 Portfolio (new — the hero screen)
- [ ] `apps/web/src/screens/Portfolio.tsx` with: fleet stats strip, role switcher, vendor card grid, activity sidebar.
- [ ] Pull from `/v1/dashboard/summary` — already exists, just style it.
- [ ] Click vendor card → `/app/vendor/:id` (placeholder OK), click "Open change" chip → `/app/change/:id`.

### 5.4 Change report restyle
- [ ] Port `public/app/screen-change.jsx` → React component `apps/web/src/screens/ChangeReport.tsx` using new tokens.
- [ ] Wire the 4 lifecycle actions (acknowledge / snooze / resolve / escalate) to the canonical `changeReports.ts` repo — *fixes the pre-existing 404 bug from REGRESSION_REPORT.md A2*.

### 5.5 Evidence brief
- [ ] Keep `SensoBrief.tsx`; restyle to new tokens; ensure print stylesheet still hits A4.
- [ ] Add "Generate Compliance Bundle" button that calls a new `/v1/evidence/:id/bundle` endpoint returning a printable HTML route.

### 5.6 Pricing / Stripe
- [ ] Collapse `VendorOnboarding.tsx` into `/app/onboarding` with the 4 PDF tiers (Team $499 / Business $1999 / Enterprise Custom / Compliance Pack $999).
- [ ] Keep StripeModal — fix UX-1 (× button inert in already-entitled state).

### 5.7 Command palette (Slate signature)
- [ ] Add `⌘K` palette globally. Items: Jump to vendor · Open recent change · Switch role · Generate Bundle · Toggle theme (no-op, dark only).
- [ ] Keyboard shortcut hints visible in palette rows (e.g. `⌘D` for deploy-style actions).

### 5.8 API (mostly already there)
- [ ] Fix the duplicate-store bug: migrate `db/change-reports.ts` callers to `db/changeReports.ts`, delete the legacy file.
- [ ] Add `GET /v1/evidence/:id/bundle.html` — server-rendered printable view.
- [ ] No new tables. Use the data model from PDF §5 as-is.

### 5.9 Out of scope (intentionally)
- Policy Studio UI (show YAML, don't build editor).
- Spend Reconciliation (mention in footer, skip).
- Negotiation Copilot (mention in palette, skip).
- Vendor onboarding wizard with Wayback backfill (one click → live status, fake the timeline).
- Calendar / Outlook integration (event card is a static rendering).

---

## 6. Page-by-page acceptance

Each screen passes when:

| Screen | Pass criteria |
|---|---|
| `/` Landing | Dark Slate restyle, Helvetica Neue, single CTA → `/app`, integrations footer with 6 real logos. |
| `/app` Portfolio | Fleet stats row · 8 vendor cards · role switcher · activity sidebar. Real `/v1/dashboard/summary` data. |
| `/app/change/:id` | Header with vendor + severity badge · diff cards · citations · 4 lifecycle buttons that actually work · ESCALATE opens modal. |
| `/app/evidence/:id` | Public route · severity hero · diff + citations · "Generate Bundle" button · print works. |
| `/app/onboarding` | 4 tier cards · CTA opens StripeModal · success state closes cleanly. |
| `⌘K` palette | Opens from any screen · arrow keys navigate · enter executes · esc closes. |

---

## 7. Quality gates (FAANG rules from global config)

- `pnpm typecheck` → 0 errors across 3 workspaces.
- `pnpm test` → all green (currently 98/98).
- `pnpm build` → ≤ 320 kB JS (current 287 kB; we add palette + portfolio, budget room).
- `pnpm dev` → both servers up in one command (already wired).
- A11y: keyboard reaches every interactive element; focus rings visible; landmarks present; contrast ≥ 4.5:1 on the dark theme (periwinkle on `#0A0B0F` = 8.1:1, text on bg = 14.2:1 — both pass AA).
- No `console.log` in shipped code (Stop hook enforces).
- No "Unsyphn" / "Redline" string mixing — `grep -rin "unsyphn" apps/` returns zero.

---

## 8. Build order (vertical slices, not horizontal)

Per global rules: build one path end-to-end before starting the next.

1. **Tokens + shell** — new CSS, new logo, new fonts, dark `/app` shell. Verify landing still renders.
2. **Portfolio** — wire fleet stats + cards against the existing API.
3. **Change report** — port from JSX → TSX, restyle, fix lifecycle 404.
4. **Evidence + Bundle** — restyle, add bundle endpoint.
5. **Onboarding + Stripe** — collapse the wizard, fix the close-button bug.
6. **Command palette** — global keyboard shortcut, four item types.
7. **Role switcher** — query param + top-bar toggle, lens different rows visible per role.
8. **Polish + a11y pass + page audit refresh**.

Each step ends with a working demo of *that slice*. No "scaffold everything, wire later".

---

## 9. What's deliberately *not* in this plan

- A redesign of the landing page beyond restyling — the Halo cube can stay if it doesn't fight the new dark Slate paint.
- A backend rewrite — the existing API is fine, only 1 bug to fix + 1 endpoint to add.
- A11y beyond WCAG AA — perf and a11y both green is the bar, not green-plus-feature.
- Brand voice rewrite — copy is fine, just restyled.
- Tests for new screens until the screen is stable. TDD applies to logic (palette filtering, role param parsing), not to layout.

---

## 10. References

- `Redline-Enterprise-Vision.pdf` — source of truth for what the product *is*.
- `the-kit/seven.html` — Helvetica Neue type discipline + iOS 7 candy palette semantics.
- `the-kit/slate.html` — dark surfaces, periwinkle accent, command palette, density.
- `PAGE_AUDIT.md` — what's broken on `main` today.
- `REGRESSION_REPORT.md` — the lifecycle 404 bug + StripeModal UX-1 to fix.
- 2026 dashboard research: progressive disclosure, working-memory ceiling, role-based UI — applied above.
