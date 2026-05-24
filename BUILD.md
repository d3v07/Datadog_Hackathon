# BUILD.md — Multi-Agent Execution Plan

**Spec:** [plan.md](plan.md) (locked, do not re-debate during build).
**Branch:** `saasb2b` · **Mode:** parallel where safe, sequential where required.

---

## Overview

Five waves. **Strict file-ownership boundaries** prevent agent collisions
(no two agents touch the same file in the same wave). **Hard gates** between
waves: `pnpm typecheck && pnpm test` must be green before the next wave starts.
**Max 3 concurrent agents per wave** (global rule: coordination cost dominates beyond that).

```
Wave 1  Foundation        ───3 agents in parallel───►  GATE: typecheck + grep clean
Wave 2  App shell         ───1 agent (sequential)──►   GATE: shell renders, body.app-mode toggles
Wave 3  Screens           ───3 agents in parallel───►  GATE: each route renders w/ seed data
Wave 4  Cross-cutting     ───2 agents in parallel───►  GATE: ⌘K + role param both work
Wave 5  Polish + review   ───1 build + 1 reviewer───►  GATE: AA clean, PR ready
```

---

## Architecture Changes (file ownership matrix)

| Path | Owner agent | Wave |
|---|---|---|
| `apps/web/src/styles/tokens.css` (new) | A | 1 |
| `apps/web/src/styles/app.css` (new) | A | 1 |
| `apps/web/src/styles.css` (delete) | A | 1 |
| `apps/api/src/db/change-reports.ts` (delete) | B | 1 |
| `apps/api/src/db/changeReports.ts` | B | 1 |
| `apps/api/src/seed/loader.ts` | B | 1 |
| `apps/api/src/routes/changes.ts` | B | 1 |
| `public/app/**/*` (delete all) | C | 1 |
| `apps/web/public/app/**/*` (delete all) | C | 1 |
| Global "Unsyphn" → "Redline" (grep -ril) | C | 1 |
| `apps/web/src/App.tsx` | D | 2 |
| `apps/web/index.html` | D | 2 |
| `apps/web/src/main.tsx` | D | 2 |
| `apps/web/src/lib/role.ts` (new) | D | 2 |
| `apps/web/src/screens/Portfolio.tsx` (new) | E | 3 |
| `apps/web/src/components/VendorCard.tsx` (new) | E | 3 |
| `apps/web/src/components/FleetStats.tsx` (new) | E | 3 |
| `apps/web/src/screens/ChangeReport.tsx` (new) | F | 3 |
| `apps/web/src/components/Drawer.tsx` (new) | F | 3 |
| `apps/web/src/components/SeverityBadge.tsx` (new) | F | 3 |
| `apps/web/src/screens/SensoBrief.tsx` (restyle) | G | 3 |
| `apps/web/src/screens/StripeModal.tsx` (UX-1 fix) | G | 3 |
| `apps/web/src/screens/Onboarding.tsx` (new, replaces VendorOnboarding) | G | 3 |
| `apps/api/src/routes/evidence.ts` (add `/bundle.html`) | G | 3 |
| `apps/web/src/components/CommandPalette.tsx` (new) | H | 4 |
| `apps/web/src/lib/keyboard.ts` (new) | H | 4 |
| `apps/web/src/components/RoleSwitcher.tsx` (new) | I | 4 |
| `apps/web/src/lib/role.ts` (extend) | I | 4 |
| `PAGE_AUDIT.md` (refresh) | J | 5 |

**No path appears under more than one agent in the same wave.**
Cross-wave reuse is fine because of hard gates.

---

## Implementation Phases

### Wave 1 — Foundation (3 parallel)

Run all three in one message. None depends on the others. Each has a tight,
self-contained brief.

#### Agent A — Design tokens & global CSS
- **Type:** `frontend-architect`
- **Owns:** `apps/web/src/styles/tokens.css`, `apps/web/src/styles/app.css`
- **Brief:**
  > Create `apps/web/src/styles/tokens.css` with the exact token block from
  > [plan.md](plan.md) §1.1. Create `apps/web/src/styles/app.css` with global
  > resets, body defaults (Helvetica Neue, font-weight 300), and `body.app-mode`
  > dark scope. Delete `apps/web/src/styles.css`. Do NOT touch React components
  > (the shell wave imports the new CSS). Verify: file paths exist, no other
  > files modified.
- **Risk:** Low (additive + one delete).

#### Agent B — API bug fixes
- **Type:** `backend-architect`
- **Owns:** `apps/api/src/db/change-reports.ts`, `apps/api/src/db/changeReports.ts`, `apps/api/src/seed/loader.ts`, `apps/api/src/routes/changes.ts`
- **Brief:**
  > Fix the lifecycle 404 bug documented in REGRESSION_REPORT.md §A2. The
  > legacy `db/change-reports.ts` and canonical `db/changeReports.ts` are two
  > stores. Migrate `seed/loader.ts` and `routes/changes.ts` to use the
  > canonical repo only. Delete `db/change-reports.ts`. Verify with
  > `pnpm test` (lifecycle tests must pass on seeded data) and
  > `curl -X POST .../v1/changes/chg_seed_notion/acknowledge` returns 200.
- **Risk:** Medium (touches production state machine; tests are the safety net).

#### Agent C — Static demo delete + brand rename
- **Type:** `general-purpose`
- **Owns:** `public/app/**/*`, `apps/web/public/app/**/*`, all "Unsyphn" occurrences
- **Brief:**
  > Two mechanical sweeps. (1) Delete `public/app/` and `apps/web/public/app/`
  > directories entirely — audit confirmed non-load-bearing. (2) Global rename
  > "Unsyphn" → "Redline" across `apps/`, `public/`, `packages/`. Use case-aware
  > replacement (Unsyphn / UNSYPHN / unsyphn → Redline / REDLINE / redline).
  > Skip `node_modules`, `dist`, `.git`. Verify: `grep -ril "unsyphn"` returns
  > zero. Do NOT change any logo asset references yet (logo stays as
  > `unsyphlogo.png` until Wave 2 swaps it).
- **Risk:** Medium (broad search-replace; verify with grep before declaring done).

**Wave 1 GATE (run after all three return):**
```bash
pnpm typecheck                       # must be 0 errors
pnpm test                            # 98+ tests pass (B added lifecycle coverage)
grep -ril "unsyphn" apps/ public/ packages/  # must be empty
test ! -d public/app                 # must not exist
test ! -d apps/web/public/app        # must not exist
test -f apps/web/src/styles/tokens.css
test ! -f apps/web/src/styles.css
```

---

### Wave 2 — App shell (1 agent)

#### Agent D — Routes, mount, role plumbing
- **Type:** `frontend-architect`
- **Owns:** `apps/web/src/App.tsx`, `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/src/lib/role.ts` (new)
- **Brief:**
  > Rewrite `App.tsx` against the 6-route IA in [plan.md](plan.md) §2:
  > `/app` (Portfolio), `/app/vendor/:id`, `/app/change/:id`, `/app/evidence/:id`,
  > `/app/policy`, `/app/onboarding`, `/app/settings`. Each route is a
  > placeholder screen for this wave (`<div>Portfolio coming in W3</div>`).
  > Add top bar with brand mark + nav + role dropdown slot. Import
  > `styles/tokens.css` and `styles/app.css` in `main.tsx`. Toggle
  > `body.app-mode` on `/app/*` routes via `useEffect`. Create
  > `lib/role.ts` exporting `parseRole(search): Role` and `useRole(): Role`
  > hook (reads `?role=`). Verify: every route returns 200, body class toggles
  > correctly, landing at `/` unaffected.
- **Risk:** Medium (router is the spine; placeholder screens prevent over-scoping).

**Wave 2 GATE:**
```bash
pnpm dev:web &
sleep 3
curl -s localhost:4004/ | grep -q "Redline"           # landing renders
curl -s localhost:4004/app | grep -q "Portfolio"      # placeholder route works
# manual: body.app-mode applies on /app, not on /
```

---

### Wave 3 — Screens (3 parallel)

All three depend on Wave 2 (shell exists, tokens loaded). They own disjoint screens
and components.

#### Agent E — Portfolio + Vendor cards
- **Type:** `frontend-architect`
- **Owns:** `apps/web/src/screens/Portfolio.tsx`, `apps/web/src/components/VendorCard.tsx`, `apps/web/src/components/FleetStats.tsx`
- **Brief:**
  > Implement Portfolio per [plan.md](plan.md) §3 step 1. Fleet stats strip
  > (`143 vendors · 12 changes · 3 P1 · $84k at-risk`) pulls from
  > `/v1/dashboard/summary` (already exists). Vendor card grid (6–8 cards)
  > with posture chip, renewal date, owner avatar. Click vendor →
  > `/app/vendor/:id`. Click change chip → `/app/change/:id`. Use tokens from
  > Wave 1. No new API endpoints — read what exists.
- **Risk:** Low.

#### Agent F — ChangeReport + Drawer + lifecycle wiring
- **Type:** `frontend-architect`
- **Owns:** `apps/web/src/screens/ChangeReport.tsx`, `apps/web/src/components/Drawer.tsx`, `apps/web/src/components/SeverityBadge.tsx`
- **Brief:**
  > Port `public/app/screen-change.jsx` to React TSX with new tokens. Header
  > (vendor + severity badge), diff cards with citations, 4 lifecycle action
  > buttons (acknowledge/snooze/resolve/escalate). Wire to the canonical
  > `/v1/changes/:id/*` endpoints (Wave 1 Agent B fixed these). Escalate
  > opens a modal (use Drawer component). Render at `/app/change/:id`.
- **Risk:** Medium (lifecycle integration — verify with seed data).

#### Agent G — Evidence + Bundle + Onboarding + Stripe fix
- **Type:** `frontend-architect`
- **Owns:** `apps/web/src/screens/SensoBrief.tsx`, `apps/web/src/screens/StripeModal.tsx`, `apps/web/src/screens/Onboarding.tsx` (new), `apps/api/src/routes/evidence.ts`
- **Brief:**
  > Three jobs.
  > (1) Restyle `SensoBrief.tsx` to new tokens; preserve print stylesheet.
  > Add "Generate Compliance Bundle" button.
  > (2) Add `GET /v1/evidence/:id/bundle.html` to `routes/evidence.ts` —
  > server-rendered printable HTML (ChangeReport + citations + routed actions).
  > (3) Create `Onboarding.tsx` with 4 tier cards (Team/Business/Enterprise +
  > Compliance Pack add-on per PDF §10). CTA opens existing `StripeModal`.
  > Fix `StripeModal` UX-1 (× button inert in already-entitled branch) —
  > one wire fix from REGRESSION_REPORT.
- **Risk:** Medium (touches API + 3 React files; all logic boundaries are well-defined).

**Wave 3 GATE:**
```bash
pnpm typecheck                     # 0 errors
pnpm test                          # all green
pnpm build                         # ≤ 320kB JS bundle
# manual via preview MCP:
#   /app shows Portfolio with seed data
#   /app/change/chg_seed_notion shows ChangeReport, acknowledge button returns 200
#   /app/evidence/chg_seed_notion renders Senso brief
#   /app/onboarding shows 4 tier cards; Stripe modal opens + closes
```

---

### Wave 4 — Cross-cutting (2 parallel)

#### Agent H — Command palette + keyboard
- **Type:** `frontend-architect`
- **Owns:** `apps/web/src/components/CommandPalette.tsx`, `apps/web/src/lib/keyboard.ts`
- **Brief:**
  > Global `⌘K` palette. Items: Jump to vendor (fuzzy match against
  > `/v1/dashboard/summary` vendor list), Open recent change, Switch role,
  > Generate Bundle, Open settings. Up/Down navigates, Enter executes,
  > Esc closes. Mount in App.tsx via React portal so it overlays any route.
  > Keyboard registry must respect text input focus (don't fire ⌘K when typing).
- **Risk:** Low (purely additive overlay).

#### Agent I — Role switcher
- **Type:** `frontend-architect`
- **Owns:** `apps/web/src/components/RoleSwitcher.tsx`, `apps/web/src/lib/role.ts` (extend)
- **Brief:**
  > Top-bar dropdown (Procurement / Legal / Security / Finance). Selecting
  > a role updates `?role=` query param via `history.replaceState`. Hook
  > `useRole()` (created in Wave 2) returns current role. Three of four
  > views can show placeholder copy in their screens for v1 — only
  > Procurement is real. Mount into the App.tsx top bar slot Agent D left.
- **Risk:** Low.

**Wave 4 GATE:**
```bash
pnpm typecheck && pnpm test && pnpm build
# manual: ⌘K opens palette from /app and /app/vendor/notion; role dropdown
# updates URL; back/forward preserves role
```

---

### Wave 5 — Polish + review

#### Agent J — A11y + audit refresh
- **Type:** `quality-engineer`
- **Owns:** any file with an a11y violation; `PAGE_AUDIT.md`
- **Brief:**
  > Run axe on every route. Fix: missing labels, contrast violations,
  > focus traps in drawer + palette, keyboard reach for all interactive
  > elements, focus restore on modal close. Refresh `PAGE_AUDIT.md`
  > to reflect new IA. Update score card. **Do not refactor unrelated
  > code.** Report violations fixed, count by severity.
- **Risk:** Low.

#### Code review (final, by reviewer agent — not parallel with J)
- **Type:** `code-reviewer`
- **Brief:**
  > Review the full `saasb2b` branch diff vs `main`. Focus: security
  > (Stripe path, evidence public route auth, SSE token handling),
  > silent failures, mock leftovers, dead code, TASTE check
  > (Slate × Seven applied or drifted?). Block on CRITICAL; else
  > produce sign-off table.

**Wave 5 GATE (release):**
- `pnpm typecheck && pnpm test && pnpm build` all green
- `grep -ril "unsyphn"` empty
- axe AA clean on every route
- 3-min demo script runs end-to-end without dead ends
- `code-reviewer` returns no CRITICAL findings
- PR opened, branch ready to merge

---

## Concurrency rules

1. **Max 3 agents in any one message.** Coordination cost beats marginal speed past 3.
2. **No file appears under two owners in the same wave.** Re-read the matrix before dispatch.
3. **Each agent gets its file list verbatim in its brief.** Agents must error rather than touch unlisted paths.
4. **Hard gate between waves.** Do not start Wave N+1 until Wave N gate passes.
5. **Background allowed, not required.** Wave 1 agents can run foreground (we need their work before Wave 2).
6. **Worktree isolation NOT used** — file boundaries already prevent collisions; worktree adds merge cost without benefit here.

---

## Testing strategy

### Per-wave verification
- **Wave 1:** typecheck, full test suite, grep for forbidden strings, file-existence asserts.
- **Wave 2:** dev server boots, both routes (landing + placeholder app) render, body class toggles.
- **Wave 3:** typecheck + tests + build size budget; manual preview MCP walk of 4 routes.
- **Wave 4:** typecheck + tests; manual ⌘K + role-switcher flow.
- **Wave 5:** axe AA clean + code-reviewer sign-off.

### Test coverage targets (global rules)
- Unit (Vitest): `lib/role.ts` parser, `keyboard.ts` registry, `lib/evidence-bundle.ts` HTML render. Add tests when shape stabilizes (Wave 4+).
- Integration: lifecycle endpoint (already tested; Agent B widens coverage).
- E2E: 3-min demo script as a Playwright test (Wave 5, optional but high value).

### What we don't test pre-build
- Layout pixel-perfection — visual via preview MCP screenshots is enough.
- Static screen content — covered by snapshot if it stabilizes; otherwise manual.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Agents collide on shared file | Low (matrix prevents it) | High (lost work) | File-ownership matrix; each brief lists owned paths explicitly. |
| Agent B's store migration breaks lifecycle in prod path | Medium | High | `pnpm test` covers it; Wave 1 gate requires green tests. Roll back single commit if red. |
| Brand rename catches false positives ("Unsync", etc.) | Low | Low | Case-aware replace, exclude `node_modules`. Grep verifies cleanup. |
| Wave 3 agents pull conflicting design decisions | Medium | Medium | Tokens are the single source of truth from Wave 1. Each agent reads plan.md §1 before starting. |
| StripeModal UX-1 fix has unseen side effects | Low | Medium | Existing webhook tests in place; manual verification of both branches (entitled vs not). |
| Static demo deletion removes something React app secretly imports | Low (audit checked) | Medium | Wave 1 ends with typecheck — failure indicates a hidden import; restore selectively. |
| Wave 4 keyboard registry conflicts with native shortcuts | Medium | Low | Scope to `/app/*` routes; honor `e.target.tagName === "INPUT"`; document conflicts. |
| Wave 5 a11y agent over-reaches and refactors | Medium | Medium | Brief is explicit: fix only violations, don't refactor. Reviewer agent catches it. |

---

## Success criteria

The build is done when, in a single `pnpm dev` session:

1. `/` renders the existing landing page on dark Slate paint.
2. `/app` renders Portfolio with fleet stats and 6+ vendor cards.
3. Clicking a vendor card → vendor detail (placeholder OK for v1).
4. Clicking a change chip → `/app/change/:id` with working acknowledge/escalate.
5. Escalate flow opens drawer → modal → confirmation → `/app/evidence/:id`.
6. Evidence brief renders with Senso URL semantics + Generate Bundle button.
7. Bundle button serves a print-ready HTML page.
8. `/app/onboarding` → 4 tier cards → Stripe modal → test-mode checkout → success state with × that closes.
9. `⌘K` opens palette anywhere in `/app/*`.
10. Role dropdown updates `?role=` and back/forward preserves it.
11. `pnpm typecheck && pnpm test && pnpm build` green.
12. No "Unsyphn" string anywhere.
13. axe AA clean on every route.
14. `code-reviewer` agent returns no CRITICAL.

---

## STOP — awaiting your call

Reply with one of:
- **`yes`** / **`proceed`** → I dispatch Wave 1 (Agents A, B, C in parallel).
- **`modify: <changes>`** → I revise this orchestration and stop again.
- **`abort`** → drop it.

I will not dispatch any agent until you confirm.
