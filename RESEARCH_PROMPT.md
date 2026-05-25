# Deep Research Prompt — Unsyphn (Rocket Money for Enterprise SaaS)

> Copy everything below the line into ChatGPT Pro Deep Research, Gemini Advanced Deep Research, and/or Claude Deep Research. Run in parallel; merge the outputs.

---

# Research brief: build the most intuitive enterprise SaaS-vendor management app of 2026

## 1. Who I am building for

**Product**: **Unsyphn** — an enterprise software platform positioned as **"Rocket Money for the 200–1,000 SaaS apps your company runs."** It auto-discovers every SaaS vendor in the org (via SSO, expense cards, browser plugins), watches each vendor's pricing/terms/security pages continuously, identifies waste (unused seats, duplicate apps, shadow IT), surfaces price hikes + sub-processor changes + posture drift, routes alerts to the right owner in Slack/Jira/email, drafts renegotiation packets, and exports audit-ready evidence bundles. The hero promise: **"recover $135k a quarter from SaaS you didn't know you were wasting."**

**Buyers / primary personas**:
- **CFO / VP Finance** — wants the total SaaS spend number to go down, predictable renewals, no surprise mid-year price hikes.
- **Head of Procurement** — wants leverage at renewal, benchmark pricing, automated negotiation packets.
- **CISO / GRC Lead** — wants continuous SOC 2 / sub-processor watch, evidence bundles for audits, no manual sub-processor diff tracking.
- **General Counsel / Legal Ops** — wants ToS/DPA change alerts with diff, liability creep monitoring, unsyphn-ready clauses.
- **IT Admin / Vendor Owner** — wants one Slack DM when anything material changes, automatic ticket creation, less context-switching.
- **Internal Audit** — wants chronology + citations + immutable evidence on demand.

**Market context (already validated)**: enterprises run ~291 SaaS apps on average (473 for large), 51% of seats go unused, $18M wasted per enterprise per year, 70% of IT leaders say SaaS sprawl is their top operational challenge. ([Cloudnuro 2026](https://www.cloudnuro.ai/blog/saas-statistics-2026), [Certero](https://www.certero.com/blog/five-surprising-stats-about-saas-waste-in-enterprise-it/)).

## 2. What I have today (current state — what to improve from)

Existing app on the saasb2b branch:

- 6 in-app routes: `/app` Portfolio (vendor grid + fleet stats), `/app/vendor/:id`, `/app/change/:id` (ChangeReport diff card), `/app/evidence/:id` (public Senso brief), `/app/policy` (placeholder), `/app/onboarding` (4 pricing tiers + Stripe checkout), `/app/settings` (placeholder).
- ⌘K command palette with role switcher (Procurement / Legal / Security / Finance).
- Dark mode with periwinkle accent ("Slate") + Helvetica Neue ("Seven") — but I want to **switch to a clean LIGHT mode** with a more intuitive layout.
- Landing page has a 3D Halo cube animation but **cube faces are random colors, not vendor logos** — I want them to show real SaaS vendor logos (Notion, Microsoft 365, Salesforce, Figma, Slack, GitHub, Datadog, Stripe, etc.).
- The brand should be **Unsyphn** (not Unsyphn — currently mis-branded).
- The in-app experience **feels empty** — placeholder screens, no real workflows, no inbox/queue, no negotiation copilot UI, no spend visualizations, no vendor logos, no usage charts, no policy editor, no settings depth.

## 3. What I need from you (the research)

Produce a single structured report with the following sections. Be opinionated. Cite every concrete claim with a source URL. Prioritize 2025–2026 data and product references.

### A. Competitive landscape — full feature inventory (the table)

Build a feature comparison matrix covering at least these 12 products:

1. **Vendr** (vendr.com)
2. **Sastrify** (sastrify.com)
3. **Spendflo** (spendflo.com)
4. **Tropic** (tropicapp.io)
5. **Zylo** (zylo.com)
6. **Cledara** (cledara.com)
7. **Productiv** (productiv.com)
8. **BetterCloud** (bettercloud.com)
9. **Zluri** (zluri.com)
10. **Nudge Security** (nudgesecurity.com)
11. **Torii** (toriihq.com)
12. **Spendesk / Spendhound** (spendesk.com / spendhound.com)
13. Optional: **Vanta** + **OneTrust** for the GRC overlap.

For each, list:
- Core product modules (e.g. Discovery, Renewal Calendar, Negotiation, Compliance, etc.)
- Onboarding mechanism (SSO connectors, expense-card import, browser extension, Finance system pull, etc.)
- Pricing model (per-vendor, per-user, % of savings, flat platform fee, enterprise custom)
- Key UI patterns they use (inbox-first, calendar-first, list-first, dashboard-first, command palette, etc.)
- 1-line differentiator and 1-line weakness

Then synthesize: **what is the union of all features across these products?** Group into the canonical modules an enterprise SaaS management product *must* have in 2026.

### B. The full feature set — must / should / nice (the priority list)

Based on (A) plus the personas in §1, produce a categorized feature list:

- **MUST-HAVE** (table stakes — competitors all have these)
- **SHOULD-HAVE** (most competitors; differentiates from bottom-tier)
- **NICE-TO-HAVE** (only some; potential wedge)
- **NOVEL** (no competitor has it yet but personas need it)

Cover at minimum: **Discovery & Inventory · Spend & Cost · Renewal Management · Contract & Document Vault · Usage & Adoption Analytics · Vendor Risk & Compliance · Negotiation & Procurement Workflows · Policy & Approval Workflows · Integrations · Reporting & Dashboards · Notifications & Routing · Audit & Evidence · Onboarding · Mobile & In-Context · AI / Agent Capabilities**.

For each feature, also note: which persona benefits, typical screen/affordance, typical data source.

### C. User workflows / Jobs To Be Done (the customer journeys)

For each of the 6 personas in §1, write 3–5 concrete JTBD narratives in the format:
> "When [trigger / context], I want to [job], so I can [outcome]."

Then for each JTBD, sketch the **minimum-step ideal workflow** (3–7 steps) inside Unsyphn. Specify which screen, which input, which output, and which integration is involved at each step. Cite which competitor's product (if any) does this well today, and what they do badly.

### D. Information architecture (the page tree)

Design the **ideal IA** for Unsyphn given §B and §C. Recommend:

- **Top-level nav items** (how many, named what)
- **Whether the primary surface is**: inbox / calendar / vendor list / dashboard / something else — and **why**
- **Detail-page structure** for: a single vendor, a single contract, a single change/alert, a single renewal
- **Workspace partitioning**: does role-based view (Procurement / Legal / Security / Finance) live in the URL, a workspace switcher, a sidebar lens, or a per-card chip? What's the evidence-best pattern?
- **Empty states** for each main route — what should users see on day 1 vs day 30?
- **Mobile vs desktop** — what's mobile-essential, what's desktop-only?

Compare to specific 2025–2026 references: **Linear**, **Vercel**, **Notion**, **Cursor**, **Raycast**, **Pylon**, **Attio**, **Plain** — pull specific design decisions from each that apply.

### E. Visual design language — LIGHT MODE specifically

I want to switch from a dark theme to a clean, intuitive **light** theme. Research and recommend:

- **Color palette**: surfaces (white / off-white / cool gray hierarchy), borders (hairline grays), 1 primary action color, 3 semantic colors (success / warning / danger), 1 informational color. Hex values. Contrast ratios on white.
- **Typography**: pick a primary font + a mono font. Compare Inter vs Geist vs SF Pro vs Helvetica Neue vs Söhne vs ABC Diatype for an enterprise B2B SaaS in 2026. State weight pairs (display + body).
- **Spacing scale** (4px or 8px base)
- **Radius scale**
- **Elevation language** — light mode usually leans on borders + soft shadows; recommend a 3-step shadow scale
- **Icon system** — Lucide vs Phosphor vs Heroicons vs Tabler vs Iconoir. Which fits a finance/procurement enterprise tool best? Why?
- **Vendor logo system** — see §F separately
- **Reference companies that nailed light-mode B2B SaaS** (Stripe Dashboard, Linear "light", Vercel "light", Notion, Attio, Pylon, Mercury Banking, Ramp, Brex). Specific URLs to screenshots if possible.

### F. Vendor logo & icon strategy (the cube + everywhere)

The landing page has a 3D rotating cube; today its faces are random colors. I want each face / each card / each row of the app to show real SaaS vendor logos.

Research:

1. **Open vendor logo sources** — comprehensive list of free, hotlinkable, CDN-served logo libraries. Include at minimum:
   - Clearbit Logo API (clearbit.com/logo)
   - Logo.dev (logo.dev)
   - Brandfetch (brandfetch.com)
   - simple-icons.org
   - cdn.jsdelivr.net/gh/simple-icons
   - Worldvectorlogo, Logosearch, vectorlogo.zone, SVG Repo
2. For each: **license terms**, **rate limits**, **does it require an API key**, **coverage** (do they have all the apps we'd plot: Notion, Slack, Figma, Microsoft 365, Salesforce, Stripe, Datadog, GitHub, AWS, Adobe, Zoom, HubSpot, Asana, Linear, Jira, Confluence, Okta, Vanta, etc.)
3. **Recommendation**: which source(s) to use for production-grade enterprise app, balancing license, reliability, coverage, and design consistency (some are flat brand color, some are full-color, some have transparency — pick the visually coherent one).
4. **Logo rendering pattern**: how should the logo show up — square avatar with vendor name, monogram fallback when missing, on-brand color background or neutral, etc.
5. **The cube specifically**: what's the design pattern for showing N vendor logos rotating on faces of a 3D cube? Look for references from Stripe Connect's homepage, Datadog's logo wall, Brex / Ramp marketing pages. Should it be 6 faces × 1 logo, or 6 faces with a grid of logos?

### G. Onboarding flow (the wedge)

Rocket Money's onboarding is one button: connect your bank. What's the equivalent for Unsyphn? Research:

- What does **Vendr / Sastrify / Tropic / Zluri / Productiv** actually ask for on signup?
- What's the **fastest "time to first wow"** any competitor has? Cite specific numbers from public reviews/case studies.
- What's the **minimum viable connection set** that makes the rest of the product work (SSO? expense card? both?)
- **Cold-start problem**: how does a competitor populate the vendor list on day 1 when no data is connected? (Manual? Vendor library? AI predict-from-domain?)
- Recommend a **single-screen onboarding** that goes from email → fleet visible in < 60 seconds.

### H. Pricing & packaging (mid-market + enterprise)

Research public + leaked pricing for the 12 competitors in §A. For each: tier names, list prices, what's included where, what's the upsell trap. Synthesize:

- **Recommended Unsyphn pricing**: 3–4 tiers + add-ons. Specific $ amounts based on what's defensible.
- **Free tier yes/no?** Pros and cons.
- **Pricing axis**: per-vendor, per-employee, % of savings, flat platform — which works best for which buyer?
- **What does the buyer expect to see on the pricing page** (feature matrix, FAQ, ROI calculator, sample savings number)?

### I. The novel/contrarian wedge

Based on all the above, what could Unsyphn ship that **no other competitor does**? Brainstorm 5–10 specific feature ideas that match the personas and the "Rocket Money for enterprise" framing. Examples to spark thinking (don't copy these — generate better ones):

- Auto-cancel-unused-seat one-click with vendor API
- AI counter-offer generator (drafts negotiation email from public benchmarks)
- Shadow-IT detection from browser extension telemetry
- Vendor "report card" sharable externally
- Sub-processor jurisdiction heatmap with auto 30-day customer notification draft

For each idea you generate, rate it on: **value-to-persona (1-5)**, **engineering difficulty (1-5)**, **moat depth (1-5)**.

### J. Integration ecosystem (the trust ring)

List, in priority order, the integrations Unsyphn must have to be enterprise-credible. Group as **Inbound** (data sources) vs **Outbound** (action sinks). For each, note: which API to use, OAuth vs API key, what data Unsyphn pulls/pushes, which competitors already have it.

Cover at minimum: Okta · Google Workspace · Azure AD · OneLogin · Brex · Ramp · Spendesk · NetSuite · QuickBooks · Slack · Microsoft Teams · Jira · Linear · Google Calendar · Outlook · Gmail · Notion · Ironclad · Lexion · DocuSign · Vanta · Drata · OneTrust · Datadog · Webhooks/SIEM.

### K. Trust & defensibility

What features make enterprise buyers say yes? Research and list specific things competitors do for: data residency (US/EU pinning), SSO + SCIM, no-train guarantees on AI, audit-trail immutability, RBAC scopes, citation-grounded outputs. Cite what specific enterprise contracts (e.g. Vanta, Drata customer pages) require.

### L. Demo / sales narrative

Look at how Vendr, Sastrify, Tropic open their demo. What's the **first 30 seconds**? Synthesize a 3-minute demo narrative for Unsyphn that lands the "Rocket Money for enterprise" framing, hits the $135k recoverable number early, and closes on a transact moment.

## 4. Output format requirements

- **Markdown** with clear `##` section headers matching A–L above.
- **Cite every concrete claim** with a markdown link. No claim-without-source for $ figures, feature lists, or competitor positioning.
- **Comparison tables** wherever 3+ competitors are compared.
- **Use 2025–2026 data**. Skip anything older than 2024 unless it's the only source.
- **At the end**: a **30-item ranked feature priority list** (1 = ship immediately, 30 = year-2 nice-to-have) with effort estimate (S/M/L) for each, and which competitor already has it (or "novel").
- **Append a one-page "What Unsyphn must ship next" memo** synthesizing everything into 5 concrete recommendations for the next 4 weeks of build.

## 5. Out of scope

Do not research: payroll, HRIS, expense reimbursement, P-card issuance, ERP replacement, devops tooling, code analysis, fundraising mechanics. Stay strictly on **SaaS vendor management / spend / risk / renewal / negotiation / audit**.

---

**Run depth**: spend the full deep-research budget. I'd rather wait 20 minutes for a sourced 12,000-word report than get a 2,000-word summary in 4 minutes.
