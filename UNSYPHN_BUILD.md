# UNSYPHN_BUILD.md — Multi-Agent Execution Plan v2

**Spec:** [STRATEGY.md](STRATEGY.md) (locked, do not re-debate during build).
**Supersedes:** `BUILD.md` (Redline / dark / 6-route — now obsolete).
**Branch:** `saasb2b`. **Mode:** parallel where safe, sequential where required.
**22 agents, 7 waves, never more than 4 concurrent.**

---

## Overview

```
Wave 1  Foundation flip     ───4 agents in parallel───►  GATE: brand+light+routes+API
Wave 2  Logos + cube + icons ───3 agents in parallel───►  GATE: every vendor row has a logo
Wave 3  Inbox (the hero)    ───3 agents in parallel───►  GATE: /app/inbox is real
Wave 4  Detail + Renewals + Requests ───3 in parallel─►  GATE: 3 routes real
Wave 5  Onboarding + Lens + Pricing ───3 in parallel──►  GATE: 60-sec flow + 6 chips + 4 tiers
Wave 6  Wedge features      ───3 agents in parallel───►  GATE: 3 novel wedges live
Wave 7  Trust + Settings + Polish ───3 in parallel────►  GATE: AA clean, PR-ready
```

**Hard gates** between waves: `pnpm typecheck && pnpm test && pnpm build` must pass + visual smoke via preview MCP.

---

## File-ownership matrix (master)

See plan in conversation — full matrix locked. No path appears under more than one agent in the same wave.

---

## Wave summaries (brief)

| Wave | Agents | Goal |
|---|---|---|
| 1 | A · B · C · D | Kill Redline brand · light tokens · 5 API stubs · 7-route shell |
| 2 | E · F · G | Logo CDN resolver · marketing cube refresh · Lucide swap |
| 3 | H · I · J | Inbox + MaterialChangeCard · ChangeDrawer + DiffViewer · seed expansion |
| 4 | K · L · M | Vendor detail 6-tab · Renewals workbench · Requests intake |
| 5 | N · O · P | 60-sec OAuth onboarding · 6 lens chips · 4-tier pricing |
| 6 | Q · R · S | Renegotiation Packet · Sub-processor heatmap + customer notice · Auditor Mode |
| 7 | T · U · V | Trust Center · Settings tabs · a11y + code review + ship |

Each agent gets a self-contained brief referencing STRATEGY.md sections. Full briefs and gates appear in conversation history; this doc is the index.

---

## Success criteria (final)

- `pnpm typecheck && pnpm test && pnpm build` all green
- `grep -ril "redline"` returns empty
- 7 routes all render with real data
- 3 wedge features (Material Change Feed, Renegotiation Packet, Sub-processor heatmap) live
- Marketing cube shows real vendor logos in 3×3 grids
- axe AA clean on all routes
- code-reviewer agent returns no CRITICAL
- 3-minute demo script runs end-to-end
- Bundle ≤ 380 kB JS

---

## Execution log

Wave 1: dispatching now (Agents A, B, C, D in parallel)
