# Unsyphn — Product Strategy (synthesized)

**Source:** three deep-research reports (ChatGPT, Claude, Gemini) run against `RESEARCH_PROMPT.md`.
**Date:** May 24, 2026.
**Purpose:** lock the product direction so the long-term plan can be built on it.

> Where reports agreed, the decision is stated as fact.
> Where they conflicted, the divergence is shown and a call is made with reasoning.

---

## 0. Executive summary — what's decided

| Decision | Direction | Confidence |
|---|---|---|
| Brand | **Unsyphn** (kill all "Redline") | 3/3 reports + user |
| Theme | **Light mode primary**, dark deferred to year 2 | 3/3 + user |
| Positioning | **Vendor Change & Savings Operating System** — discover, prove what changed, route, evidence | 3/3 |
| Primary surface | **Inbox** (not dashboard) | 3/3 — strongest signal in the research |
| Nav | **7 top-level routes** (Inbox · Vendors · Renewals · Requests · Evidence · Policies · Settings) | 3/3 converge |
| Object model | 5 canonical objects: **Vendor · Renewal · Material Change · Request · Evidence Bundle** | 3/3 |
| Role partitioning | **Sidebar lens chips**, not URL workspaces | 3/3 |
| Primary onboarding | **One screen: Google Workspace / M365 OAuth** (Nudge model + email metadata) | 3/3 |
| Time-to-first-wow | **<60 seconds** beats Nudge's "5 minutes" | 3/3 |
| Logo CDN | **Simple Icons (CC0)** primary → **Brandfetch** fallback → **Logo.dev** only if licensed | 2/3 agree on this stack; Report 2 has the strongest license analysis |
| Icon system | **Lucide** for product UI | 3/3 unanimous |
| Type | **Inter** body + **Geist Mono** (or IBM Plex Mono) for numeric/tabular | 2/3 say Inter primary; defer premium fonts (Söhne, Diatype) to year 2 |
| Accent color | **Indigo `#4F46E5`** — preserves the periwinkle DNA from current build | 2/3 say indigo; Report 2 proposed teal but reasoning ("money + trust") doesn't beat continuity |
| Marketing cube | **6 faces × 4-9 logo grid per face**, on white background, logos in brand color | 2/3 (Reports 1 & 3) — Stripe-Connect-style 1-logo-per-face read as toy in 2/3 evaluations |
| Pricing axis | **Flat platform fee** (NOT per-seat, NOT % of savings as default) | 2/3; Report 2 allows % of savings as Enterprise add-on with cap |
| Free tier | **Yes — narrowly scoped** (1 source, ≤50 vendors, top-N findings, no automation, "Powered by Unsyphn" branding) | 3/3 |
| Pricing levels | **4 tiers: Free → Growth $1,500-2,500/mo → Scale $3,500-6,000/mo → Enterprise from $30K + add-ons** | Reports converge in middle; Enterprise pricing diverges from $30K (R2) to $72K (R3) |
| Top-3 novel wedges | (1) **Material Change Feed** · (2) **Renegotiation Packet** · (3) **Sub-processor heatmap + customer-notice auto-draft** | 3/3 unanimous |

**Strongest line in any of the three reports** (from Gemini's report 3, worth printing on the wall):

> Every screen should answer four questions instantly:
> **What changed · Why it matters · Who owns it · What happens next.**
> If a screen cannot answer those, it is probably not ready.

That is the product test.

---

## 1. Positioning & the wedge

### 1.1 What Unsyphn is, in one paragraph

Unsyphn is the **Vendor Change & Savings Operating System** for enterprise SaaS. It auto-discovers every SaaS vendor in the organization in under 60 seconds via a single Google or Microsoft 365 OAuth, watches every vendor's pricing/terms/sub-processor/security pages continuously, surfaces material changes ranked by dollar/legal/security impact, routes each change to the right owner in Slack/Jira with evidence attached, drafts the renegotiation or compliance response, and exports audit-grade immutable bundles on demand. **Rocket Money for the 200–1,000 SaaS apps your company runs.**

### 1.2 The market gap (all three reports agree)

Twelve credible competitors exist. None combine the three things that matter:

1. **Continuous external monitoring** of vendor pricing/terms/sub-processors (no SMP has this today)
2. **Opinionated cross-functional routing** with persona-aware action cards
3. **Immutable, citation-grounded evidence bundles** as a first-class export

Procurement tools (Vendr, Sastrify, Spendflo, Tropic) cover negotiation. SMPs (Zylo, BetterCloud, Zluri, Torii, Productiv) cover discovery and lifecycle. GRC tools (Vanta, OneTrust, Drata) cover compliance posture. **No one sits in the middle and makes the connections visible.** That is Unsyphn's defensible position.

### 1.3 Who buys

Six personas, two are the budget owners:

- **Buyers (sign the contract)**: CFO/VP Finance, Head of Procurement.
- **Champions (drive adoption)**: CISO/GRC Lead, General Counsel/Legal Ops.
- **Power users (live in the app)**: IT Admin/Vendor Owner.
- **Validators (audit windows)**: Internal Audit.

The CFO is the dollar conversation. Procurement is the daily user. Security/Legal are the wedge against incumbents. Sell to the CFO; design for Procurement; defend with Security/Legal.

---

## 2. Competitive landscape — synthesized matrix

Reports 1 and 2 produced detailed competitor tables; Report 3 added pricing transparency depth. Below is the merged, conflict-resolved table.

| Product | Core wedge | Onboarding | Pricing (verified 2025–26) | UI default | Strongest feature | Biggest weakness |
|---|---|---|---|---|---|---|
| **Vendr** | Negotiation + benchmarks ($15B+ spend dataset, 130K+ deals) | Sales-led | $36K / $78K / $120K per year (G2/Tekpon) | Workflow + dashboard | Largest negotiation dataset in market | Procurement-only; no continuous monitoring; long sales cycle |
| **Sastrify** | EU procurement + compliance intelligence | SSO + ERP + Slack-bot | €12.5K/yr Software Mgmt + €15K/yr Vendor Benchmarks (modular) | Dashboard + procurement queue | DORA/NIS2 compliance packs; 6.5× ROI claim | Procurement-first; thin on lifecycle/identity |
| **Spendflo** | AI procurement + managed sourcing | Sales-led; "live in 14 days" | ~$18K start; opaque | Workflow + intake | Procurement-as-a-service hybrid | Opaque pricing; deployment requires heavy consultation |
| **Tropic** | Intake-to-procure + SaaS *and* non-SaaS spend | SSO + ERP (NetSuite) | ~$10–22K/yr starting | Intake + supplier intelligence | Broader scope (covers non-SaaS) | Not built for continuous security/legal monitoring |
| **Zylo** | Finance-grade system of record | ERP + financial + Usage Connect no-code | Quote-only; ~$38–50K/yr typical (AWS marketplace anchor) | Spend-first dashboard | Largest benchmark dataset ($75B+); deep consumption tracking | Visibility-strong but weak remediation; manual data cleansing |
| **Cledara** | SaaS spend via virtual cards | Issue virtual cards = discovery | $75 / $200 / $500+/mo tiered by app count | Card-led + invoice inbox | Payment-method-as-discovery (unique angle) | Caps app counts; UK/EU flavor; thin security |
| **Productiv** | Feature-level usage analytics + AI contract scanning | SSO + 20,000+ app connectors + CASB | Quote-only Enterprise | Analytics-first | Best-in-class engagement depth (Slack Huddles vs login, not just login) | Action/automation thin; unpredictable syncing |
| **BetterCloud** | IT automation + lifecycle workflows | SSO + browser ext + IdP | $3 / $6 / $10 per user/mo ($17K–$111K/yr typical) | Workflow + admin grid | Most mature no-code workflow engine | Per-seat scales painfully; setup measured in weeks |
| **Zluri** | SaaS mgmt + identity governance (IGA) | 9 discovery methods (SSO, browser/desktop agents, finance, HRIS, MDM) | ~$4–8/user/mo; $35K AWS anchor; median ~$38K | Discovery list + access workflows | "300+ direct APIs", "239K+ apps" in catalog | Setup time-consuming; manual workarounds; fragmented packaging |
| **Nudge Security** | Shadow-IT discovery via email metadata | Single Google or M365 OAuth — **the speed benchmark** | $750/mo flat (<150 accounts); $5/user/mo (150–2,500) | Inbox-of-discoveries + per-app card | "Got 5 minutes? See everything—today" — fastest TTV in category | Light on contracts/renewals/negotiation |
| **Torii** | Discovery + lifecycle automation + IGA | SSO + browser ext + 120+ HRIS/ITSM | Quote-only; "weeks to value" | Lifecycle workflow canvas | Drag-and-drop workflow engine; "immediate" discovery TTV | Reporting depth limited; browser-ext-dependent |
| **Spendhound** | Renewal tracking + benchmarks | ERP/billing sync | **Free** under 1,000 employees; $10K/yr Enterprise with $150K savings guarantee | Renewal-calendar-first | Ghostwritten renegotiation emails within 24h via Slack | No automation/lifecycle; SMB tilt |
| **Vanta** *(GRC overlap)* | Compliance + TPRM + Trust Center; 2025 Customer Commitments extraction | 375+ integrations via OAuth | Quote-only; 8,000+ customers, $100M+ ARR | Compliance-program dashboard | Customer Commitments auto-extraction (sub-processor notices, deletion SLAs, incident SLAs) — *recently launched, perfect cross-reference target for Unsyphn* | Not a SaaS spend tool — complementary, not competitive |
| **OneTrust** *(GRC overlap)* | Enterprise TPRM + privacy | Enterprise CMDB integration | Custom enterprise | Risk-register-first | Deepest privacy + sub-processor jurisdiction tooling | Heavy, slow, expensive |

### 2.1 The unified 12 (or 15) canonical modules

After de-duplication, "what an enterprise SMP must include in 2026":

1. Discovery & inventory (multi-source)
2. Spend visibility (by vendor, dept, cost center, billing cycle)
3. Usage & adoption analytics (license utilization + feature-level)
4. Contract & document vault (with LLM clause extraction)
5. Renewal management (calendar + workbench)
6. Procurement intake & approvals
7. Benchmarking & negotiation support
8. Vendor risk & compliance posture
9. Identity & lifecycle automation (onboard/offboard)
10. Notifications & workflow routing (Slack, Jira, email)
11. Reporting & executive dashboards
12. Audit & evidence (immutable, exportable)
13. AI / agent capabilities (always with citations)
14. Mobile / in-context approvals
15. Integration breadth (inbound + outbound)

Unsyphn must hit 1–12 at MVP credibility; 13–15 are differentiators.

---

## 3. Personas → Jobs To Be Done → Workflows

Synthesized from the strongest JTBDs across all three reports. Each persona gets the top three jobs that anchor the product.

### 3.1 CFO / VP Finance

| JTBD | Workflow (steps) |
|---|---|
| "When quarterly planning hits, show me the top reclaimable waste so I can cut without random budget hacks" | Open Inbox → sort by recoverable dollars → vendor compare card → approve right-size/cancel/renegotiate → export CFO summary PDF |
| "When a vendor announces a mid-term price hike, show me the dollar exposure and the leverage we have" | Material change appears in Inbox → click Impact → contract scope + spend exposure + benchmark + notice window → "Send counteroffer brief" |
| "When the board asks 'what did we save?', generate a one-page report" | Reports → Savings YoY → toggle quarter → branded PDF |

**Done well by**: Zylo (depth), Cledara (clean UI), BetterCloud (savings framing).
**Done badly**: Vendr (procurement-buried), Spendhound (top-200 vendors only).

### 3.2 Head of Procurement

| JTBD | Workflow |
|---|---|
| "When a vendor sends a renewal quote, generate a benchmark-backed counter-offer email I can send same-day" | Vendor card → "Renegotiation Packet" button → review packet (usage + benchmark + 3 drafted emails) → send via Gmail handoff |
| "When a renewal is 30 days out, show me the vendor's pricing-page diff over the last 90 days so I know what's likely to change before the call" | Renewal alert → vendor "Change Feed" tab → pricing diff + sub-processor delta + SLA-language changes — **done by no competitor today** |
| "When a new SaaS request hits intake, triage for duplicates and security review automatically" | Inbox → request card → auto-detected "similar tools" + auto-routed approvals |

**Done well by**: Spendhound (24h ghostwritten emails), Tropic (intake-first IA).
**Done badly**: Productiv (analytics-heavy, action-thin).

### 3.3 CISO / GRC Lead

| JTBD | Workflow |
|---|---|
| "When a vendor adds a sub-processor in a high-risk jurisdiction, tell me immediately AND cross-reference whether our customer contracts require us to notify customers" | Slack alert → vendor card → "Sub-processor diff" → "Affected customer contracts" (cross-referenced via Vanta-style Customer Commitments) → draft customer notice — **done by no one today** |
| "When a vendor's SOC2 attestation expires, auto-open a Jira ticket to the owner" | Continuous polling of vendor trust centers → policy fires on expiration → Jira ticket + Slack DM |
| "When auditors ask 'what did we know and when', give me an immutable chronology" | Vendor page → Evidence tab → timeline → export signed bundle |

**Done well by**: Nudge Security (discovery + posture), Vanta (Customer Commitments — 2025 launch).
**Cross-reference gap**: nobody connects sub-processor changes to customer contract obligations. That is Unsyphn's wedge.

### 3.4 General Counsel / Legal Ops

| JTBD | Workflow |
|---|---|
| "When a vendor publishes new ToS language, show me a redline diff against the version we agreed to so I can push back" | Inbox alert → Change Report → Git-style diff highlighting liability/indemnity/AI-training/sub-processor/term clauses → "Draft objection" button → email to vendor — **done by no one at scale today** |
| "When reviewing a new MSA, show clauses that deviate from our standard playbook so I focus my review on the 5 things that matter" | Contract upload → clause extraction → playbook comparison → flag deviations |
| "When an auditor asks 'what did this vendor commit to', search across all contracts for the obligation" | Search → Customer Commitments index → cited result — **Vanta launched parity in 2025; ship in v1** |

### 3.5 IT Admin / Vendor Owner

| JTBD | Workflow |
|---|---|
| "When assigned a vendor I've never heard of, show me who uses it and whether we still need it in 5 minutes" | Vendor page → Usage tab → active-user list + license utilization + spend → keep/consolidate/kill chips |
| "When an employee offboards, auto-deprovision everywhere — sanctioned and shadow apps" | HRIS webhook → offboarding run → revoke SSO + direct API + virtual card pause + summary report |
| "When shadow IT appears, ping the buyer in Slack asking for security justification" | Discovery event → Slack DM to buyer → response routes to security queue or auto-onboards under SSO |

**Done well by**: BetterCloud, Torii, Zluri (lifecycle).
**Done badly**: Vendr/Sastrify/Spendhound (out of scope for them).

### 3.6 Internal Audit

| JTBD | Workflow |
|---|---|
| "When SOC2 fieldwork begins, hand the auditor a read-only link to all vendor evidence" | Auditor Mode → time-boxed link → watermarked PDFs → viewer activity log |
| "When verifying offboarding SLAs, cross-reference HR termination timestamps with identity revocation timestamps" | Audit query → compliance dashboard → HRIS × IdP timestamp join → exportable report |
| "When spot-checking high-risk vendor, see immutable decision history" | Vendor page → Activity tab → full append-only event log |

---

## 4. Information architecture (final)

### 4.1 Top-level navigation — 7 routes

```
┌────────────────────────────────────────────────────────────────┐
│ Unsyphn   Inbox  Vendors  Renewals  Requests  Evidence  ...  │
└────────────────────────────────────────────────────────────────┘

/app/inbox        — material changes, approvals, renewals due, alerts (HOME)
/app/vendors      — full directory; logo-rich rows; filterable
/app/renewals     — calendar + kanban + workbench
/app/requests     — intake; approvals; policy checks
/app/evidence     — audit bundles; chronology exports; share links
/app/policies     — rule editor; materiality thresholds; clause library
/app/settings     — integrations; RBAC; team; billing; branding
```

**Why Inbox-first and not Dashboard-first?** Three reports converged independently on this. The product's job is triage of material events (price hikes, sub-processor changes, expiring certs, renewals due, requests waiting). Vendr/Zluri/Sastrify default to dashboards and that's exactly why customers describe them as "too many tabs to remember to check." Linear, Pylon, Plain, and the modern Attio prove that operators want a queue at home, not vanity tiles.

**Vendor and Senso brief are not top-level** — they're detail pages reached via the Inbox or Vendors list. Vendor lives at `/app/vendors/:id`. The public evidence brief lives at `/evidence/:id` (no `/app/` prefix — it's externally shareable, auth-optional).

### 4.2 The 5 canonical objects

Every URL and every screen maps to one of five objects:

| Object | URL | Purpose |
|---|---|---|
| **Vendor** | `/app/vendors/:id` | Canonical record for a single SaaS app |
| **Renewal** | `/app/renewals/:id` | A specific upcoming or past renewal cycle |
| **Material Change** | `/app/inbox/:changeId` | A diff event (price/terms/sub-processor/posture) |
| **Request** | `/app/requests/:id` | An intake for a new vendor / change to existing |
| **Evidence Bundle** | `/evidence/:bundleId` (public) | An immutable signed export |

Every other surface is a list, filter, or lens over these five.

### 4.3 Detail page anatomy

**Vendor page** — header (logo + name + owner + spend tier + risk tier + renewal countdown), 6 tabs (Overview · Spend & Usage · Contracts & Renewals · Risk & Legal · Change Feed · Activity & Evidence), right rail with sticky next-action.

**Contract page** — clause-first, not file-first. Extracted clauses above (term length, notice window, auto-renewal flag, price escalators, AI rights, sub-processors, liability cap, DPA status). Document viewer below.

**Material Change page** — the **hero object**. Top: "What changed · Why it matters · Who owns · What's next · Proof." Middle: redline diff or before/after card. Right rail: affected customer contracts (cross-ref) + suggested action + Slack/Jira route buttons. This page is what makes Unsyphn memorable.

**Renewal page** — decision workbench. 4 panels: benchmark delta · usage/waste · legal/risk blockers · recommended action. Bottom third: drafted renegotiation packet (one click to send/export).

### 4.4 Role partitioning — sidebar lens, not URL workspaces

All three reports converged: **do not put roles in the URL**. A vendor is `/app/vendors/notion`, not `/procurement/vendors/notion`. Roles change the *ranking* and *default tabs*, never the *URL*. This keeps Slack deep-links stable, evidence URLs stable, and cross-functional handoffs friction-free.

Implementation:
- Lens chips in top bar: `Procurement · Legal · Security · Finance · IT · Audit`
- Selecting a lens changes saved-view defaults across every list (Inbox, Vendors, Renewals)
- Per-card persona chip (`👤 CFO + CISO`) signals which roles care about this row
- Lens preference persisted to user profile + URL param (for sharing)

This is the Attio pattern. Linear does a lighter version with "Views." Notion does it heavier with "Teamspaces." Pick the Attio pattern.

### 4.5 Empty states — never blank charts

| Route | Day 1 (cold start) | Day 30 (activated) |
|---|---|---|
| Inbox | Sample 3 demo changes + "Connect Google Workspace to see your real inbox" | Real ranked queue |
| Vendors | AI-predicted vendor list from email domain + checkbox "Confirm" | 200–500 cards filterable |
| Renewals | Sample renewal card from uploaded contract or demo seed | Calendar + kanban |
| Requests | Pre-built intake form template + policy presets | Live pipeline with SLAs |
| Evidence | One sample bundle showing chronology + citations | Searchable library |
| Policies | 5 prebuilt rules (renewal notice, price hike, AI rights, sub-processor, cert expiry) | Real exception counts |

The current app's "empty screens" problem is solved here.

### 4.6 Mobile

Mobile is intentionally narrow: **inbox triage, approve/reject, view critical alert, assign owner, view renewal countdown.** Anything analytical (compare, clause review, policy editing, dashboards) is desktop-only. Slack approval cards do 80% of the mobile job. Native iOS app is year-2; mobile-responsive PWA is year-1.

---

## 5. Visual system — LIGHT mode

Switch from current dark Slate to light. Light mode is the right default for the Finance / Procurement / Legal audience who work in glare-prone rooms during business hours. Mercury, Ramp, Brex, Stripe Dashboard, Linear (post-2025 warm-gray refresh) all prove this. Dev tools default dark; we are not selling to devs.

### 5.1 Color tokens (final)

```css
:root {
  /* Surfaces — warm neutral hierarchy */
  --bg:               #F7F8FA;  /* canvas */
  --surface:          #FFFFFF;  /* cards, tables, modals */
  --surface-2:        #F3F5F7;  /* secondary panels, filters */
  --surface-3:        #EDEDEB;  /* hover, active */

  /* Borders */
  --border:           #E5E7EB;  /* hairline dividers */
  --border-strong:    #D1D5DB;  /* inputs, selected */

  /* Text */
  --text:             #0F172A;  /* primary, 16:1 on white ✓ AAA */
  --text-2:           #475569;  /* secondary, 8.4:1 ✓ AAA */
  --text-muted:       #64748B;  /* tertiary, 5.7:1 ✓ AA */
  --text-disabled:    #A3A3A3;  /* decorative only */

  /* Brand accent — Indigo. Preserves periwinkle DNA. */
  --accent:           #4F46E5;  /* Indigo 600, 8.6:1 on white ✓ AAA */
  --accent-hover:     #4338CA;  /* Indigo 700 */
  --accent-soft:      rgba(79,70,229,0.10);
  --accent-ring:      rgba(79,70,229,0.30);

  /* Semantic — traffic light */
  --success:          #16A34A;  /* savings recovered, passed checks */
  --warning:          #D97706;  /* renew soon, needs review */
  --danger:           #DC2626;  /* high risk, expired, rejected */
  --info:             #0EA5E9;  /* sub-processor change, FYI */

  /* Type */
  --font-display:     "Geist", "Inter", system-ui, sans-serif;  /* marketing hero */
  --font-text:        "Inter", system-ui, sans-serif;            /* product UI */
  --font-mono:        "Geist Mono", "IBM Plex Mono", ui-monospace, monospace;

  /* Scale */
  --space-base:       8px;
  --space-tight:      4px;
  --space-card:       16px;
  --space-section:    24px;
  --space-page:       32px;

  --radius-sm:        6px;
  --radius-md:        8px;
  --radius-lg:        12px;
  --radius-pill:      999px;

  /* Elevation — light mode leans on borders not shadows */
  --shadow-1:         0 1px 2px rgba(15,23,42,0.04);
  --shadow-2:         0 4px 10px rgba(15,23,42,0.06);
  --shadow-3:         0 12px 24px rgba(15,23,42,0.10);

  --ring-focus:       0 0 0 2px white, 0 0 0 4px var(--accent-ring);
}
```

**Why indigo over teal?**
Two of three reports proposed indigo (`#6366F1` and `#4F46E5`). The third proposed teal (`#0F766E`) with "money + trust" reasoning. The current build uses periwinkle `#7C8CFA`, which is in the indigo family. Continuity wins; switching to teal would require regenerating brand assets that don't yet exist. Pick `#4F46E5` — slightly deeper than current periwinkle for better contrast on white.

### 5.2 Typography

| Use | Font | Weight | Size |
|---|---|---|---|
| Hero (marketing) | Geist | 600 | 56–72px |
| Screen titles | Inter | 600 | 28–40px |
| Section headings | Inter | 600 | 20–24px |
| Body | Inter | 400 | 15–16px |
| Table cells | Inter | 400 | 13–14px |
| Labels / buttons | Inter | 500 | 13px |
| Numerals / monospace | Geist Mono | 500 | matches context |

**Why Inter, not Geist, for body?** Inter is the global default for enterprise B2B (414B Google Fonts hits in the year ending May 2025 per FullStop Insights). Geist is "Inter + 10% polish" and looks great on marketing pages, but its weights at small UI sizes are less battle-tested for dense tables. Use Geist on marketing pages (`/`), Inter in-app.

**Why Geist Mono for numbers?** Tabular figures. Aligning `$135,247` over `$9,432` over `$1,247,891` requires monospace numerals. Inter has tabular-nums, but Geist Mono's metrics are perfect.

**Premium fonts (Söhne, Diatype, TWK Lausanne)** — defer to year 2. Each is $200–500/yr per weight; the ROI doesn't justify until brand maturity. Inter + Geist is the right zero-cost stack.

### 5.3 Spacing, radius, elevation

8px base scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 96`.
Radius: 6px default (cards, inputs, buttons), 12px modals.
Shadow: 3 steps; cards mostly flat with border, shadows reserved for popovers / modals / palette.

### 5.4 Icon system

**Lucide.** All three reports unanimous. Open source (MIT), 1,500+ icons, 24px grid, 2px stroke, the default for shadcn/ui ecosystem, ~5M weekly npm downloads. Backward-compatible with Feather (so the existing visual language doesn't shift).

Considered and rejected: Phosphor (too illustrative for finance), Heroicons (only 292 icons), Tabler (stroke inconsistency at small sizes), Iconoir (smaller ecosystem).

### 5.5 Light-mode references to study in Figma

- **Stripe Dashboard** — gold standard for financial light mode; perceptually-uniform color system.
- **Linear (light)** — warm-gray surfaces, Geist typography, density done right.
- **Vercel Dashboard** — hairline borders, restraint.
- **Mercury Banking** — fintech-grade numeric precision in light mode.
- **Ramp** — TWK Lausanne typeface, dense data tables done right.
- **Brex** — finance-grade authority.
- **Attio** — flexible objects, sidebar-driven IA (model for our role lens).
- **Pylon** — modern inbox metaphor for B2B operators.

---

## 6. Vendor logo strategy

### 6.1 The post-Clearbit landscape

Clearbit Logo API was deprecated December 8, 2025 (Logo.dev's own docs confirm). Three viable successors. Reports diverged on which to use as primary; the strongest analysis (Report 2) flagged a Logo.dev gotcha that decides the choice.

| Source | Coverage | Free tier | Attribution required? | License clarity |
|---|---|---|---|---|
| **Logo.dev** | 30M+ companies | 500K req/mo | **YES on free** — strict: must link to logo.dev on production site, no `rel="noreferrer"`, must pass referrer data. Removed only at $300+/yr | Disclaims third-party logo IP — customer responsible for fair use |
| **Brandfetch** | 50M+ brands | 500K req/mo (soft); 2,400 req per 5 min throttle | No attribution required | "Logo usage must comply with fair use"; non-endorsement, non-alteration |
| **Simple Icons** | ~3,400 popular brands | Unlimited via CDN | No attribution | **CC0 1.0** for the icon project; trademarks still owned by brands |
| Google s2 favicons | Virtually any domain | Free, no key | No | Unofficial/undocumented per Chromium team — fragile |

### 6.2 Recommendation — three-tier resolver

```typescript
// resolve in this order, cache aggressively
1. Simple Icons via cdn.simpleicons.org/{slug}     // primary; CC0; no attribution; covers top 200
2. Brandfetch Logo API                              // fallback for long tail; no attribution
3. Monogram fallback (2-letter on hashed pastel)   // last resort
```

**Why Simple Icons over Logo.dev primary?** Logo.dev's free-tier requires a `logo.dev` backlink visible on production. For an enterprise B2B SaaS, surfacing a third-party brand-attribution link in customer environments is a sales objection waiting to happen. Simple Icons is CC0, requires nothing, ships via jsDelivr or unpkg CDN, and covers all 18 vendors named in the brief plus the top 200 enterprise SaaS apps. Brandfetch fills the long tail for free.

**Logo.dev gets considered at $300+/yr** once revenue justifies it for the long tail beyond Brandfetch's free tier.

### 6.3 Logo rendering pattern

- **Container**: 32×32 (lists), 48×48 (cards), 64×64 (vendor header). 6px radius. 1px `--border` border. White background (`--surface`).
- **Logo**: vendor brand color preserved (logos look wrong in monochrome). Centered. Max 80% of container to leave breathing room.
- **Monogram fallback**: 2 letters of vendor name in 500 weight. Background: deterministically-hashed pastel from a 12-color palette (no two adjacent vendors share a color).
- **Always show vendor name next to logos ≤32px** — small logos alone are unreadable for non-globally-famous brands.

### 6.4 The marketing cube — replace random colors with vendor logos

Current state: cube faces have random colors. Two design options surfaced in research:

**Option A — 1 logo per face, big.** Stripe-Connect-style. 6 faces × 1 logo each, rotating slowly.
**Option B — Grid per face, 4–9 logos.** Each face is a dense mini-grid; conveys app sprawl. 2 of 3 reports recommend this.

**Decision: Option B.** "Too many vendors in one shape" is the actual product message. A single logo per face reads as a toy showcase. A grid per face conveys the 291-apps-per-enterprise statistic visually.

**Build pattern**:
- 6 faces, each a 3×3 CSS grid of vendor logos (54 logos total, picked from top enterprise SaaS by recognition).
- White face background, logos render in brand color.
- Slow rotation (15–20s per revolution), random-pause on hover.
- Honor `prefers-reduced-motion` — static on those devices.
- Below the fold: a static "Datadog-style logo wall" with 100+ "Supported integrations" logos as a trust signal.
- Mobile: cube collapses to a single 4×4 grid of 16 logos.

---

## 7. Onboarding — the 60-second wedge

### 7.1 What the bar is

Nudge Security: **"Got 5 minutes? See everything—today."** (homepage verbatim). That's the bar to beat.

Other competitors: Sastrify "5 minutes" (third-party claim), Spendflo "14 days," Zluri "time-consuming," Vendr "sales-led / no self-serve."

**Unsyphn's target: 60 seconds from email to populated fleet.**

### 7.2 Minimum viable connection set

**One connection: Google Workspace or Microsoft 365 OAuth.** That single connection unlocks:
- **Email metadata discovery** — every SaaS that has sent a billing email, invite, or password reset to a corp address (Nudge's exact wedge)
- **OAuth grants** — third-party apps with scopes
- **Calendar metadata** — vendor meeting cadence as a proxy for active relationships
- **Directory** — user roster for ownership assignment

Add expense-card OAuth (Brex/Ramp) on screen 2 as optional. Defer SSO connectors, browser extensions, HRIS, contract uploads to "after the wow."

### 7.3 The single-screen flow

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                       UNSYPHN                                │
│                                                              │
│       Find every SaaS your company is wasting money on.      │
│                                                              │
│                                                              │
│   [ Sign in with Google Workspace ]   [ Microsoft 365 ]      │
│                                                              │
│                                                              │
│   We only read OAuth grants, email senders, and calendar     │
│   metadata. We never read message bodies or attachments.     │
│                                                              │
│   SOC 2 Type II  ·  No-train AI guarantee  ·  GDPR-ready     │
│                                                              │
│                  Skip → Connect later                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 7.4 The 60-second sequence

| Time | What happens |
|---|---|
| 0:00 | User enters work email |
| 0:15 | OAuth consent |
| 0:30 | Discovery starts; skeleton vendor grid materializes; logos resolve from Simple Icons CDN |
| 0:45 | Vendor count ticker climbs ("Found 84... 137... 247 apps") |
| 1:00 | Fleet visible. Headline metric: **"We found 247 SaaS apps. 89 weren't in your IT inventory."** |
| 1:30 | First wow card surfaces: "Biggest waste we can see: 412 unused Salesforce seats at $165/mo = $815K/yr. Draft renegotiation email?" |
| 2:00 | One-click drafts the email. "Send to AE" or "Schedule for renewal date" buttons. |
| 3:00 | User has signed up, seen real waste, and engaged with first action. Activation criterion met. |

### 7.5 Cold start problem (when there's literally no data)

Three techniques (use in combination):
1. **AI predict-from-domain** — sign-up email `cfo@acme.com` → industry classification → render 50 most-likely apps with confidence scores. Checkboxes to confirm/deny.
2. **Vendor library of 10,000+ pre-categorized apps** — show top 100 by industry as "starter cards."
3. **One-click CSV import** from finance as fallback.

---

## 8. Pricing & packaging

### 8.1 Where the market sits

| Vendor | Anchor price | Axis |
|---|---|---|
| Vendr | $36K → $78K → $120K (with savings guarantees) | Platform + negotiation credits |
| Sastrify | €12.5K + €15K modular | Modular |
| Spendflo | ~$18K start | Platform + managed |
| Tropic | ~$10–22K start | Platform |
| Zylo | ~$38–50K typical | Per-employee + spend-managed |
| Cledara | $75 → $200 → $500+/mo | App-count tier |
| BetterCloud | $3 / $6 / $10 per user/mo | Per-user-per-month |
| Zluri | ~$35K base | Per-user blended |
| **Nudge** | **$5/user/mo or $750/mo flat** | Per active user — most transparent |
| Torii | Quote-only | Per-user/per-app blended |
| **Spendhound** | **Free under 1,000 employees; $10K Enterprise** | Free; monetizes data |
| Spendesk | Subscription + transaction fee | Spend mgmt, not pure SMP |

### 8.2 Decision — Unsyphn pricing

**Axis: flat platform fee.** Not per-seat (penalizes growth), not pure % of savings (creates trust friction). Add % of savings as an optional Enterprise add-on with a cap (Vendr-pattern) for very large deals.

**4 tiers + 2 add-ons:**

| Tier | Price | Best for | What's in |
|---|---|---|---|
| **Discover** (free) | $0 | Anyone (PLG funnel, pre-qualification) | Single Google/M365 connection · email-metadata + OAuth-grant discovery · Top-100 vendor cards with benchmark hints · 5 contract uploads · Slack alerts · "Powered by Unsyphn" footer in shared reports |
| **Growth** | **$1,500/mo flat** ($18K/yr) | 50–250 employees | + Material Change Feed · unlimited contracts · Renegotiation packets · Jira/Slack routing · 3 integrations · audit log · remove branding |
| **Scale** | **$3,500/mo flat** ($42K/yr) | 250–1,000 employees | + Sub-processor heatmap · Customer Commitments extraction · unlimited integrations · RBAC · SCIM · 1 dedicated CSM hour/wk |
| **Enterprise** | **$30K platform + 15% of net savings (capped at $200K/yr)** | 1,000+ employees | + Data residency (US/EU pinning) · custom SSO · dedicated negotiation analyst · on-prem SIEM webhook · audit-mode workspaces · private API · 99.9% SLA |

**Add-ons (sold across tiers):**
- **Negotiation Concierge** — $10K/quarter — human procurement analyst handles 5 negotiations per quarter end-to-end. Vendr-style managed motion.
- **GRC Bridge** — $1,000/mo — deep two-way Vanta + Drata + OneTrust integration; auto-Trust-Center sync.

### 8.3 Why a free tier

Spendhound is free and growing. Comparison articles will mark Unsyphn as a con without one. Free funnels mid-market the way Rocket Money's free tier funnels consumers. Constraints prevent value leak: 5 contracts max, top-100 vendors only, no automation, no audit export, branded footer.

### 8.4 The pricing page

Must include:
1. Three tiers visible at first scroll; Enterprise via "Contact sales."
2. Feature matrix below.
3. **ROI calculator** — slider for employee count → estimated waste → estimated recovery → payback weeks.
4. FAQ: "Why no per-seat pricing? · What counts as net savings? · Where is my data stored? · No-train AI guarantee."
5. **Sample savings number** at top: *"Companies on Growth average $135K recovered per quarter in their first year."* — defensible against Vendr's published 17.13% average savings × 9.5× ROI; for a $3M/yr SaaS spend, 17% = $510K/yr ≈ $128K/quarter.

---

## 9. Novel wedges — top 5 to ship

From the 30 ideas brainstormed across reports, these five are the consensus high-value novel features that no competitor combines.

| # | Wedge | Personas | Value | Diff | Moat |
|---|---|---|---|---|---|
| 1 | **Material Change Feed** — daily diff of every vendor's pricing, terms, sub-processor, security pages; surfaces as ranked Inbox items | CFO, GC, CISO, PROC | 5 | 4 | 5 |
| 2 | **One-click Renegotiation Packet** — benchmark + usage + 3 drafted counter-offer emails + Slack-to-AE handoff | PROC, CFO | 5 | 3 | 3 |
| 3 | **Sub-processor jurisdiction heatmap + Customer Commitments cross-ref** — when a vendor adds sub-processor in non-adequate region, cross-check *your* customer DPAs to see which require 30-day notification, auto-draft those notices | CISO, GC | 5 | 4 | 5 |
| 4 | **Auditor Mode** — time-boxed read-only workspace with watermarked PDFs + viewer activity log | AUD, CISO | 4 | 3 | 3 |
| 5 | **AI-predict-from-domain cold start** — fleet visible before any integration is connected | All | 4 | 2 | 2 |

These five together = the "Rocket Money for enterprise" story:
- Continuous external monitoring (no SMP has this) — #1
- Opinionated action (most SMPs are read-only) — #2
- Cross-system glue (no one connects sub-processor → customer DPA) — #3
- Audit-grade evidence (Vanta does this, no SMP does) — #4
- Zero-friction cold start (Nudge does this, but only on Google/M365) — #5

**Deferred to year 2** (good ideas, not the wedge): browser-extension shadow IT, virtual-card auto-pause, vendor report cards, Slack-bot "Vendor Whisperer," feature-level usage analytics (Productiv territory), full lifecycle/IGA (BetterCloud/Torii/Zluri territory).

---

## 10. Integration roadmap

**Phase 1 (MVP)** — what makes the wedge work:

| # | Integration | Direction | What it pulls/pushes |
|---|---|---|---|
| 1 | Google Workspace | In | OAuth grants, email metadata, calendar, license usage |
| 2 | Microsoft 365 / Entra | In | Same |
| 3 | Okta | In | SSO catalog, user assignments |
| 4 | Brex | In | Transactions, receipts |
| 5 | Ramp | In | Transactions, vendors, AP |
| 6 | NetSuite | In | Vendors, bills, GL, departments |
| 7 | QuickBooks | In | Vendors, bills |
| 8 | Slack | Out | Alerts, intake, approvals, drafted vendor emails |
| 9 | Jira | Out | Tickets to owner / security / legal queues |
| 10 | Email (SES/SendGrid) | Out | Renewal alerts, drafted emails with "send via Gmail" handoff |
| 11 | Webhooks | Out | Generic for SIEM, ticketing, BI |

**Phase 2 (mid-year)** — bake-off vs Zluri/Sastrify:

12. Microsoft Teams · 13. Linear · 14. HRIS (Workday/BambooHR/Rippling) · 15. Spendesk · 16. Vanta (Customer Commitments) · 17. Drata · 18. DocuSign · 19. OneLogin · 20. SIEM (Splunk, Datadog, Sumo)

**Phase 3 (year 2)**:

21. OneTrust · 22. Ironclad · 23. Lexion · 24. Embedded BI (Looker, Sigma, Hex) · 25. Browser extension · 26. Custom ERP connectors

---

## 11. Trust & compliance posture

What enterprise buyers require — Unsyphn ships parity with Vanta from day one (table stakes, not differentiator).

| Requirement | What Unsyphn ships |
|---|---|
| **SSO + SCIM** on all paid tiers (no "SSO tax") | SAML + OIDC on all tiers; SCIM on Scale + Enterprise |
| **RBAC** with persona scopes | Roles: Finance, Procurement, Security, Legal, IT, Audit, Admin, Owner |
| **Immutable audit trail** | Append-only event log per workspace; 7-year retention default; exportable as audit-grade CSV + JSON + signed PDF |
| **No-train AI guarantee** | Verbatim mirror of Vanta's policy: "Unsyphn does not train models on customer data today. Should this change, we will provide customers with advance notice." Sensitive operations (clause extraction, Customer Commitments) on internally-hosted LLMs; third-party API use only with explicit DPA terms |
| **Data residency** | US/EU pinning at Enterprise tier (Vanta-pattern, separate EU instance) |
| **Citation-grounded AI** | Every AI output (clause extraction, counter-offer draft, sub-processor flag) cites source: clickable link to contract paragraph or vendor webpage with fetch timestamp. **No bare assertions.** |
| **Workspace isolation** | Multi-BU / M&A use cases; separate subsidiaries with shared central governance |
| **Trust Center** | Public page with SOC 2, DPA, sub-processor list, security appendix |

**Certifications, priority order**: SOC 2 Type II (year 1) → ISO 27001 (year 1) → GDPR + DPF (year 1 EU) → ISO 27701 (year 2 privacy) → ISO 42001 (year 2 AI) → HIPAA-ready (year 2 if healthcare) → FedRAMP Moderate (year 3 if pubsec).

**Customer Commitments primitives** (Vanta launched these in 2025; Unsyphn ships parity):
- 30-day sub-processor change notice (HubSpot DPA verbatim sets the standard: "we will notify you at least 30 days prior")
- Incident notification SLAs (24–72h typical)
- Certificate of deletion within 90 days of termination
- Audit rights with reasonable notice

---

## 12. Demo narrative — 3 minutes

### The hook (0:00–0:30)

> "Most companies can tell you what they *budgeted* for software. Very few can tell you what *changed* across their vendor fleet this week. Unsyphn fixes that. We discover your vendors in 60 seconds, watch every pricing page, every DPA, every sub-processor list, and turn material changes into one action queue. In this demo account, Unsyphn found **$135,000 recoverable** this quarter from duplicate apps, unused seats, and one renewal with both benchmark and clause-drift risk."

### Discovery (0:30–1:00)

Live: "Sign in with Google Workspace" → vendor logos materialize via Simple Icons CDN → "247 apps found, 89 weren't in your IT inventory." Real-time logo wall builds on screen.

### The wedge (1:00–2:00) — material change cards

Open Inbox. Show three cards in sequence:

1. **Price hike detected.** Salesforce updated their AI add-on pricing page yesterday. Diff: $20/seat surcharge. Affected: 412 active seats. Slack DM already sent to VP RevOps.
2. **Legal change detected.** Datadog quietly added a sub-processor in India three days ago. Diff highlighted. Your customer contracts require 30-day notice → Unsyphn already drafted notice email to top 12 affected customers.
3. **Waste detected.** Figma utilization dropped 30%. Duplicate design tools in product team. Recoverable: $1,800/yr.

Open card 1. Show: what changed · why it matters · who owns · proof (citation) · drafted counter-offer email. One click: send.

### Audit close (2:00–2:30)

Jump to Evidence. Click "Generate Bundle" on Datadog. Watermarked, time-boxed, signed PDF. "What used to take two weeks now takes 90 seconds."

### The transact (2:30–3:00)

> "We're $1,500 a month, flat. No per-seat tax. Sign up with your Google account, see your fleet in 60 seconds. For enterprises with $5M+ in SaaS, we'll guarantee $200K+ recovered or you don't pay the variable component. Where do you want to start?"

Two CTAs: self-serve free / enterprise contact-sales.

---

## 13. Final 30-item priority list (synthesized)

| # | Feature | Effort | Wave | Already-has |
|---|---|---|---|---|
| 1 | **Brand rename Redline → Unsyphn** everywhere | S | 0 | — |
| 2 | **Light-mode token swap** (replace current Slate tokens with §5.1 above) | M | 0 | — |
| 3 | **Inbox as new home route** (`/app` → `/app/inbox`, redirect current Portfolio) | M | 0 | — |
| 4 | **Google + M365 OAuth onboarding** (email metadata + OAuth grants) | M | 1 | Nudge Security |
| 5 | **Vendor card with logo** (Simple Icons primary, Brandfetch fallback, monogram last) | S | 1 | All |
| 6 | **AI-predict-from-domain cold start** | M | 1 | Novel |
| 7 | **Brex/Ramp/NetSuite/QuickBooks expense ingestion** | M | 1 | Sastrify, Cledara, Spendhound |
| 8 | **Continuous Vendor Change Feed** (pricing + terms + sub-processors, 200 hardcoded vendors initially) | L | 1 | Novel |
| 9 | **Renewal calendar with 30/60/90-day Slack alerts** | S | 1 | All |
| 10 | **One-click Renegotiation Packet** with benchmark + drafted email + Gmail handoff | M | 2 | Vendr (manual), Spendhound (24h ghostwriting) |
| 11 | **Contract vault with LLM clause extraction** | M | 2 | Vendr, Sastrify, Tropic |
| 12 | **Slack + Jira routing per persona** | S | 2 | BetterCloud, Torii |
| 13 | **Vendor-detail page with persona "lens chips"** (6 tabs) | M | 2 | Novel |
| 14 | **License utilization & inactive-seat reclamation list** | M | 2 | Zluri, Productiv, BetterCloud |
| 15 | **Sub-processor jurisdiction heatmap + Customer Commitments cross-ref** | L | 3 | Novel |
| 16 | **Auto-draft 30-day customer notice on sub-processor change** | M | 3 | Novel |
| 17 | **CFO scorecard dashboard** (waste, savings, YoY) | M | 3 | Zylo, Cledara |
| 18 | **"Two tools, same job" duplicate detector** with savings estimate | M | 3 | Partially BetterCloud, Productiv |
| 19 | **Auditor Mode** (time-boxed read-only watermarked workspace) | M | 3 | Novel |
| 20 | **OAuth-grant inventory & risk scoring** | M | 3 | Nudge Security |
| 21 | **Vanta + Drata bidirectional integration** | M | 4 | Few cross-integrate |
| 22 | **SAML SSO on all paid tiers; SCIM on Scale+** | M | 4 | All enterprise SMPs |
| 23 | **Marketing cube refresh** (6 faces × 3×3 logo grids, real SaaS vendors) | M | 4 | Stripe Connect pattern |
| 24 | **Pricing page + ROI calculator** | M | 4 | All competitors |
| 25 | **Trust Center page** (SOC2 in audit, no-train AI, DPA, sub-processors) | M | 4 | Vanta-pattern |
| 26 | **HRIS-driven owner assignment + offboarding deprovisioning** | L | 5 | Torii, Zluri, BetterCloud |
| 27 | **Browser extension for personal-device discovery** | L | 5 | BetterCloud, Zluri, Torii |
| 28 | **Auto-cancel-unused-seat one-click** (Slack/Notion/Figma admin APIs) | L | 5 | Novel |
| 29 | **Mobile-responsive web + Slack approval cards** | S | 5 | All |
| 30 | **Public Vendor Report Cards** (shareable external URL) | M | 6 | Novel |

---

## 14. Where reports disagreed (for the record)

These are the open questions that need user/team calls. The decisions above reflect my synthesis; the user can override.

| Question | Report 1 | Report 2 | Report 3 | My call | Why |
|---|---|---|---|---|---|
| Primary accent color | Indigo `#6366F1` | Teal `#0F766E` | Indigo `#4F46E5` | **Indigo `#4F46E5`** | Continuity with existing periwinkle; 2/3 agree on indigo family |
| Primary body font | Geist | Inter (UI) + Geist (marketing) | Inter | **Inter UI + Geist marketing** | Inter is the safer enterprise default; Geist for hero pages |
| Numeric font | Geist Mono | Geist Mono | IBM Plex Mono | **Geist Mono** | Stays in Geist family |
| Cube design | 4×4 grid per face | 1 logo per face (Stripe Connect) | 4-9 logo grid per face | **3×3 grid per face** | Conveys sprawl better than single logo; matches user request for real vendor logos |
| Pricing axis | Per-employee | Flat platform + % savings on Enterprise | Flat platform | **Flat platform; %savings as Enterprise option** | Hybrid of R2/R3 — clean and defensible |
| Free tier | Yes (Free Audit) | Yes (Discover) | Yes (constrained) | **Yes — Discover tier with branded footer** | Unanimous; constraints from R3 |
| Enterprise base price | Custom from $5K | $30K + 15% savings | $72K | **$30K + 15% savings (capped $200K)** | R2 has the most defensible structure |
| Logo CDN primary | Logo.dev | Simple Icons | Logo.dev | **Simple Icons + Brandfetch fallback** | R2's analysis of Logo.dev attribution gotcha decides it |
| Top wedge | Auto-cancel-unused-seat | Vendor Change Feed | Material Change Graph + Evidence Ledger | **Material Change Feed** (= R2 + R3 same idea) | 2/3 converge; R1's auto-cancel is downstream of detection |
| % savings pricing | Doesn't mention | Yes with cap (Enterprise) | Avoid entirely | **Optional add-on, not the main axis** | R3's trust concern is real; R2's cap addresses it |
| Onboarding primary connection | Email scan (Google/M365) | Email scan (Google/M365) | Finance source OR identity | **Google/M365 OAuth** | 2/3 + the Nudge precedent is the strongest single proof in the research |

---

## 15. What this document supersedes

- `plan.md` — original Slate × Seven dark-mode plan with Redline branding. **Superseded.** Some sections (visual system, IA basics) still apply with the swaps above (dark→light, Redline→Unsyphn, periwinkle accent retained as Indigo `#4F46E5`).
- `BUILD.md` — original 5-wave execution plan. **Needs rewrite** against the new IA (7 routes, Inbox-first, light mode, logo work).
- `RESEARCH_PROMPT.md` — kept for future research runs.
- `PAGE_AUDIT.md` and `REGRESSION_REPORT.md` — historical; still useful for "what was already shipped under Redline" context.

The codebase as of `saasb2b` branch is the current build state. Wave 1–5 shipped under Redline; everything in this strategy doc is the delta to get to Unsyphn v1.

---

## Next step

Now we build the **long-term plan** on top of this strategy:

1. **Roadmap** — 4 quarters, what ships when, with success metrics per quarter.
2. **Engineering plan** — rewrite `BUILD.md` against the new 7-route IA + light mode + Material Change Feed wedge.
3. **Go-to-market** — pricing page launch, design partner program, content plan.
4. **Metrics** — leading indicators (activation rate, time-to-first-wow, fleet-visible-in-60s rate), lagging (recovered $ per customer, NRR).

When ready, say the word and I'll draft the long-term plan referencing this doc as the source of truth.
