# Regression Report — main branch (commit `fec0a41`)

Date: 2026-05-24 · Method: 3 background source-audit agents + foreground browser tests via Claude Preview MCP + API curl probes.

## Verdict: **SHIP** (1 minor UX finding + 1 pre-existing known-debt bug surfaced)

---

## Score card

| Layer | Method | Checks | PASS | FAIL | Notes |
|---|---|---|---|---|---|
| Build & types | `pnpm typecheck`, `pnpm test`, `pnpm build` | 3 | 3 | 0 | 98/98 tests, 0 type errors, 287KB build |
| Static demo source | sub-agent audit | 27 | 27 | 0 | Full mirror parity between `public/app/` and `apps/web/public/app/` |
| React app source | sub-agent audit | 27 | 27 | 0 | All Copilot fixes verified on main |
| API endpoints | sub-agent curl | 11 | 9 | 2 | See "API findings" below — neither blocks ship |
| Halo landing browser | preview MCP eval | 11 | 11 | 0 | Logo, nav, footer (mailto:), live sync, body.app-mode toggle |
| Static demo browser | preview MCP eval + click | 8 | 8 | 0 | Notion→Escalate→Routing→Evidence flow, all action button alerts, EXPORT DIFF Blob+anchor |
| React app browser | preview MCP eval | 11 | 10 | 1 | Modal close button didn't fire — see UX finding |
| **TOTAL** | | **98** | **95** | **3** | **97% pass** |

---

## Baseline (Phase 1)

```
pnpm install             → clean
pnpm --filter @redline/shared build → ok
pnpm typecheck           → 0 errors (3 workspaces)
pnpm test                → 98/98 passing in 1.32s
pnpm build               → 287.64 kB JS (89 kB gzip), 9.28 kB CSS
```

---

## API findings (2 of 11 endpoints returned non-2xx)

### A1. `POST /v1/vendors` with `https://example.com` → HTTP 422 `discovery-incomplete`
**Not a bug.** The agent's test payload used `example.com` which the discovery step can't crawl. With a real URL (`https://notion.so`), the endpoint returns 409 `duplicate` (Notion already seeded). The endpoint validates URL discoverability before creation — by design.

### A2. `POST /v1/changes/chg_seed_notion/acknowledge` → HTTP 404 `Change id not in org`
**Real bug, but pre-existing — not introduced by PR #10.** Root cause:
- `apps/api/src/routes/changes.ts:119` calls `deps.reports.getLatest(orgId, id)` — queries the canonical `ChangeReportRepository` (`db/changeReports.ts`)
- `apps/api/src/seed/loader.ts:5,52` loads seed into the legacy `changeReportStore` (`db/change-reports.ts`)
- Two separate stores → lifecycle endpoints see no seeded data → 404 for every seeded change

This is the duplicate-file debt explicitly called out in the merged PR's "Known debt (deferred)" section. Same pattern affects `/snooze` and `/resolve`. Filed for follow-up plan.

---

## Browser findings

### Halo landing (`/`) — all clean
- Logo image (`/logo.png`) in nav + footer
- 1 nav link (`PRODUCT`) + GET ACCESS CTA → `/app/`
- Hero CTAs: "Start free trial" → `/app/`, "Book a walkthrough" → `mailto:`
- Footer hrefs all resolve: `mailto:privacy@`, `mailto:legal@`, `mailto:hello@…?subject=Documentation`, `/app/`, GitHub URL — **no `/docs` `/api` `/changelog` 404 risks** (Copilot fix held)
- Live sync card shows real API numbers: 26 vendors, $48,210 ARR
- Favicon (`/logo-32.png`) registered
- Zero console errors
- `body.app-mode` correctly NOT applied on `/`

### Static demo (`/app/`) — full flow works
- Portfolio: 27 vendors, fleet stats, scan ticker
- Click Notion → Change screen renders all 6 action buttons (Forward/More **gone** ✓)
- All 3 alert-based handlers fire correct strings:
  - "Acknowledged. Lifecycle hand-off coming soon."
  - "Snoozed for 48h. Lifecycle hand-off coming soon."
  - "Copilot coming soon"
- ESCALATE TO LEGAL → modal opens with "ROUTE & GENERATE BUNDLE →" button
- Confirm → Routing log streams → auto-advance to Evidence
- Evidence screen: 8 buttons including 4 download/share variants, all with onClick wired
- **EXPORT DIFF** (P2 vendor — Stripe): triggers `URL.createObjectURL(new Blob([…], {type:"application/json"}))` + programmatic `<a download="stripe-diff.json">` click → **NO `window.open("data:…")`** (Copilot fix verified live)
- Mirror parity: byte-for-byte identical between `public/app/` and `apps/web/public/app/`

### React app
- `/` — App returns null, Halo bleeds through ✓
- `/dashboard` — Add Vendor form, logo, `<nav aria-label="breadcrumb">`, 3 required field labels (CSS `::after` asterisk), Upgrade + Vendor Onboarding actions ✓
- `/dashboard?tier=1` — prefills Tier 1 ✓
- `/dashboard?tier=99` — defaults to Tier 2 (Copilot validation fix held) ✓
- `/onboarding` — 3 tier cards ($999/$299/$99), all CTAs have onClick ✓
- 24H Standard CTA → `/dashboard?tier=2` → form prefills correctly ✓
- Upgrade modal: opens, `role="dialog"`, `aria-modal="true"`, Stripe Elements iframe loads, **detects already-entitled state** (proves SSE entitlement flip from earlier `simulate-success` propagated)
- `/evidence/chg_seed_notion` — public route, SensoBrief renders article with severity badge, policy, recommendation, 2 change diffs, citations
- `/evidence/does-not-exist` — clean 404 message "Evidence brief not found"
- `body.app-mode` correctly toggles per route

### UX finding (1)

**[UX-1] Upgrade modal `×` button + ESC don't close when org already has Compliance Pack.**
- Repro: open modal after a prior `POST /v1/billing/simulate-success` has flipped the entitlement
- Expected: × click or ESC closes modal
- Actual: modal stays open (only text changes to "This org already has the Compliance Pack")
- Severity: low — modal still renders close affordance but it's inert in the already-entitled branch
- Likely cause: the modal's success-state branch in `StripeModal.tsx` doesn't wire `onClose` to the `×` button
- Recommend: file as follow-up; not a ship blocker

---

## Source-audit detail (sub-agents — verbatim summaries)

### Static demo regression — 27/27 PASS
- Brand/logo: `<img src="/logo.png">` in brand.jsx, sidebar uses `UnsyphnMark size={24}`
- All 7 dispatch cases present and correctly typed (acknowledge/snooze do NOT mutate `state.notion` — Copilot fix held)
- `export-diff` uses Blob+anchor (no `data:` URI)
- `share-audit` feature-detects `navigator.clipboard` with `window.prompt` fallback
- Forward/More buttons absent from screen-change.jsx + screen-evidence.jsx
- Bearer token sourced from `meta[name="redline-bearer"]` in screen-onboarding.jsx
- live.js has SSE EventSource subscription
- **Full mirror parity** (`diff -q` returns zero differences across 7 file pairs)

### React app regression — 27/27 PASS
- `apps/web/index.html` has `<div id="root">` + `<script type="module" src="/src/main.tsx">`
- Favicon links (`/logo-32.png`, `/favicon-16.png`, `/favicon.ico`, `/logo-192.png`) + 5 OpenGraph meta tags
- App.tsx routing: `parseEvidenceId`, `isOnboardingRoute`, `isDashboardRoute` regex correct
- Tier param validation: `parsed === 1 || 2 || 3 ? parsed : undefined` (Copilot fix)
- `useEffect` toggles `body.app-mode` on/off
- Logo image (`/logo.png`) in both DashboardApp + VendorOnboardingApp headers
- Semantic `<nav aria-label="breadcrumb">` wrap
- Zero "Redline" hits in `grep -rn "Redline" apps/web/src/`
- SensoBrief says "Unsyphn · Evidence brief" + "Generated by Unsyphn"
- Onboard uses CSS-based required asterisks (`.field__label--required::after { content: " *" }`)
- Auto-dismiss error `useEffect` with `setTimeout` cleanup
- VendorOnboarding tier CTA → `/dashboard?tier=${tier.id}` (NOT `/?tier=`)

### API regression — 9/11 PASS
- `/health` ✓ · `/v1/dashboard/summary` ✓ · `401 without bearer` ✓ · `/v1/billing/products` ✓
- `/v1/billing/payment-intents` ✓ · `/v1/billing/simulate-success` ✓ · `/v1/evidence/:id` valid ✓ · `/v1/evidence/:id` 404 ✓
- `/v1/stream?token=` SSE ✓ (times out as expected at `--max-time 4`)
- `/v1/vendors` → 422 for bad URLs (by design), 409 for duplicates (correct)
- `/v1/changes/:id/acknowledge` → 404 (pre-existing dup-store bug, see A2)

---

## Known debt (acknowledged from PR #10, surfaced here)

1. **`apps/api/src/db/change-reports.ts` vs `changeReports.ts`** — two stores with different APIs. Lifecycle endpoints (acknowledge/snooze/resolve) fail with 404 on seeded data because they query the new repo while seed loader writes the legacy one. **Recommended next plan**.
2. **Two static demo copies** (`public/app/` + `apps/web/public/app/`) — currently byte-identical, but manual sync risks drift.
3. **SSE bearer token in URL query** — existing pattern, not introduced in PR #10.

---

## Recommendations

| Priority | Item | Effort |
|---|---|---|
| P1 | Fix `change-reports.ts` / `changeReports.ts` split — migrate routes/evidence + seed/loader to canonical repo OR teach legacy store to share data with new repo | ~1 hour |
| P3 | UX-1: wire Upgrade modal `×` button in already-entitled state | ~10 min |
| P3 | Dedupe `public/app/` and `apps/web/public/app/` (single source, build copy) | ~30 min |
| P3 | Move SSE token from URL query to fetch-based SSE with `Authorization` header | ~1 hour |

---

## Sign-off

**main is healthy and demo-ready.** No regressions introduced by PR #10. One pre-existing
lifecycle bug surfaced (filed). One minor modal UX issue (filed). Browser flows verified
end-to-end across Halo, static demo, and React app.
