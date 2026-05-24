// vendor-data.jsx — central registry for every vendor in the demo.
// Each vendor record carries everything the portfolio / change / evidence
// screens need to render. Notion stays the interactive hero flow
// (P1 → escalate → ROUTED). Other vendors are pre-baked in different
// states (acknowledged, snoozed, healthy) and render as read-only.

const VENDOR_DATA = {

  // ─────────────────────────────────────────────────────────
  // NOTION — the hero flow (P1, interactive escalate)
  // ─────────────────────────────────────────────────────────
  notion: {
    key: "notion",
    letter: "N",
    name: "Notion",
    category: "DOCS · COLLAB",
    meta: "DOCS · TIER 1",
    tier: 1,
    sev: "p1",
    sevLabel: "P1",
    owner: { initials: "PN", cls: "b", name: "Priya Natarajan", role: "LEGAL COUNSEL" },
    secondary: { initials: "MC", cls: "tangerine", name: "Marcus Chen", role: "PROCUREMENT" },
    annual: "$184,200",
    annualUsd: 184200,
    seats: 847,
    renewsInDays: 42,
    renewsLabel: "42 DAYS",
    renewsCls: "warn",
    dataClasses: ["pii", "source"],
    interactive: true,
    lastChange: { label: "17m ago · DATA · PRICING", cls: "crit" },
    activity: {
      sev: "p1", when: "17m",
      title: "Data retention shrinks 90→30d, per-seat +18%",
      meta: "DATA · PRICING", impact: "+$28.4k/yr", impactCls: "in",
    },
    cr: {
      bundleId: "RL·4839",
      categories: ["DATA", "PRICING"],
      titleOpen: <>Data retention <em>shrinks</em> from 90 to 30 days. Per-seat pricing rises 18%.</>,
      titleRouted: <>Routed to Legal. Negotiation packet <em>witnessed</em> and signed.</>,
      detectedAt: "2026-05-22 · 14:42:18 EST",
      detectedWhen: "17 minutes ago",
      routedAt: "2026-05-22 · 14:59 EST",
      routedWhen: "just now",
      agent: "agent-redline-v1.4",
      citationCount: 4,
      impacts: [
        { lbl: "$ Impact · annual", val: "+$28,400", cls: "dollar" },
        { lbl: "Per-seat change", val: "+18% / 30d", cls: "delta" },
        { lbl: "Compliance", val: "GDPR · Art 5(1)e", cls: "compl" },
      ],
      diffs: [
        {
          label: "Change · §4.2 Data Retention",
          before: {
            when: "SNAPSHOT · MAR 18 2026",
            text: <>"Workspace owners may request export and deletion of all user content at any time.
                  Notion will retain backup copies for <strong>ninety (90) days</strong> following deletion,
                  after which content is permanently erased from all systems."</>,
            source: "SOURCE · notion.so/terms#4.2 · FETCHED 2026-03-18 09:14 UTC · HASH a3f9…d21c",
          },
          after: {
            when: "SNAPSHOT · MAY 22 2026",
            text: <>"Workspace owners may request export and deletion of all user content at any time.
                  Notion will retain backup copies for <strong>thirty (30) days</strong> following deletion,
                  after which content is permanently erased from all systems."</>,
            sourceLink: "notion.so/terms#4.2",
            sourceMeta: " · FETCHED 2026-05-22 14:42 UTC · HASH 8b2e…f94a",
          },
        },
        {
          label: "Change · §7.1 Plus Plan Pricing",
          before: {
            when: "SNAPSHOT · MAR 18 2026",
            text: <>"Plus plan: <strong>$10 per member per month</strong>, billed annually.
                  Includes unlimited blocks, file uploads up to 5 GB, and 30-day version history."</>,
            source: "SOURCE · notion.so/pricing · FETCHED 2026-03-18 09:14 UTC",
          },
          after: {
            when: "SNAPSHOT · MAY 22 2026",
            text: <>"Plus plan: <strong>$11.80 per member per month</strong>, billed annually.
                  Includes unlimited blocks, file uploads up to 5 GB, and 30-day version history."</>,
            sourceLink: "notion.so/pricing",
            sourceMeta: " · FETCHED 2026-05-22 14:42 UTC",
          },
        },
      ],
      policy: {
        head: "Policy fired",
        name: "Price ↑ >10% within 90d of renewal → P1 to Procurement",
        meta: "AUTHOR · Maya A. · GRC LEAD · v4 · 2026-04-12",
        yamlKey: "pricing",
      },
      actions: [
        { type: "slack",  target: "DM · @priya",          queued: "queued · awaits escalation", sent: "14:59:02 · delivered" },
        { type: "jira",   target: "PROC-2104",            queued: "queued",                     sent: "14:59:03 · assigned" },
        { type: "cal",    target: "Renewal call · Jun 24", queued: "queued",                     sent: "14:59:04 · 4 invitees" },
        { type: "email",  target: "Renego draft · ready", queued: "queued",                     sent: "14:59:05 · 3 versions" },
      ],
      recoOpen: {
        head: "Recommendation",
        text: <>Renewal is in <strong>42 days</strong>. The compounded retention shrinkage and price
              increase are <em>both negotiable</em> at this stage. Generate the renegotiation packet
              to push back on retention to 60d as a minimum (industry standard), and lock pricing at
              the prior $10/seat for the renewal term. Estimated leverage: <strong>$28,400/yr saved</strong> on
              price alone; retention recovery maps to <strong>SOC2 CC6.5</strong> and <strong>GDPR Art 5(1)e</strong>.</>,
      },
      recoRouted: {
        head: "Outcome · Routed",
        text: <>Routed to <strong>Priya Natarajan</strong> (Legal) and <strong>Marcus Chen</strong> (Procurement). The
              renegotiation packet has been <em>generated</em> and witnessed — see Bundle RL·4839.
              4 actions dispatched: Slack DM, Jira PROC-2104, calendar invite for Jun 24, draft email
              with three negotiation positions. Deadline: 2026-05-29.</>,
      },
    },
    bundle: {
      id: "RL·4839",
      seal: "US",
      signedAt: "2026-05-22 · 14:59:08 EST",
      hash: "8b2e…f94a",
      eyebrow: "NOTION · CR · DATA + PRICING",
      coverSubtitle: <>Notion · data retention &amp; pricing change · <em>witnessed</em></>,
      sectionCount: 4,
      miniDiffs: [
        [
          { kind: "b", text: <>"…will retain backup copies for <strong>ninety (90) days</strong> following deletion…"</>, src: "SOURCE · notion.so/terms#4.2 · 2026-03-18 · HASH a3f9…d21c" },
          { kind: "a", text: <>"…will retain backup copies for <strong>thirty (30) days</strong> following deletion…"</>, src: "SOURCE · notion.so/terms#4.2 · 2026-05-22 · HASH 8b2e…f94a" },
        ],
        [
          { kind: "b", text: <>"Plus plan: <strong>$10 per member per month</strong>, billed annually."</>, src: "SOURCE · notion.so/pricing · 2026-03-18" },
          { kind: "a", text: <>"Plus plan: <strong>$11.80 per member per month</strong>, billed annually."</>, src: "SOURCE · notion.so/pricing · 2026-05-22" },
        ],
      ],
      policyBody: <><b>severity-rules.yaml v4</b> · "Price ↑ &gt;10% within 90d of renewal → P1 to Procurement."
                  Notion renewal is in <b>42 days</b>; per-seat change is <b>+18%</b>. The policy clause
                  matched at <b>2026-05-22 14:42:21 EST</b> and was queued for routing.</>,
      trail: [
        { ts: "14:59:01", msg: <>Policy fired · <b>severity-rules.yaml v4</b></>, status: "✓ MATCH" },
        { ts: "14:59:02", msg: <>Slack DM · <b>@priya</b> · delivered</>, status: "✓ SENT" },
        { ts: "14:59:03", msg: <>Jira · <b>PROC-2104</b> · assigned Marcus Chen</>, status: "✓ OPEN" },
        { ts: "14:59:04", msg: <>Calendar · <b>Jun 24 renewal call</b> · 4 invitees</>, status: "✓ SCHED" },
        { ts: "14:59:05", msg: <>Drafts · <b>renegotiation packet</b> · 3 positions</>, status: "✓ READY" },
        { ts: "14:59:08", msg: <>Bundle signed · hash <b>8b2e…f94a</b></>, status: "✓ WITNESSED" },
      ],
      citations: [
        { src: "notion.so/terms#4.2 · §4.2 Data Retention · public", hash: "8b2e…f94a" },
        { src: "notion.so/pricing · §7.1 Plus Plan · public", hash: "d4a1…2c7b" },
        { src: "internal · DPA §3.1 (Acme ⟷ Notion) · private", hash: "f9c3…81de" },
        { src: "policy · severity-rules.yaml v4 · internal", hash: "a3f9…d21c" },
      ],
      nextActions: [
        { type: "cal",   target: "Renewal call",      when: "Jun 24 · 14:00 EST",       status: "SCHED", pending: false },
        { type: "email", target: "Send renego draft", when: "Owner · Priya N.",         status: "DUE 5/29", pending: true },
      ],
    },
    routingTitle: <>Routed to <em>Priya</em>. Bundle <em>RL·4839</em> generating…</>,
    routingLog: [
      { ts: "14:59:01", lvl: "info", msg: <>Policy fired · <b>severity-rules.yaml v4</b> · severity P1</> },
      { ts: "14:59:02", lvl: "exec", msg: <>Slack DM dispatched · <b>@priya</b> · message + 4 citations</> },
      { ts: "14:59:03", lvl: "exec", msg: <>Jira ticket created · <b>PROC-2104</b> · assigned to Marcus Chen</> },
      { ts: "14:59:04", lvl: "exec", msg: <>Calendar invite sent · <b>Jun 24 · Notion renewal call</b> · 4 invitees</> },
      { ts: "14:59:05", lvl: "exec", msg: <>Renegotiation draft generated · <b>3 positions</b> · saved to Drafts</> },
      { ts: "14:59:06", lvl: "info", msg: <>Compiling evidence bundle <b>RL·4839</b> · 4 grounded citations</> },
      { ts: "14:59:07", lvl: "sign", msg: <>Clauses extracted · §4.2 Retention · §7.1 Pricing · DPA §3.1 · policy</> },
      { ts: "14:59:08", lvl: "sign", msg: <>Bundle signed · hash <b>8b2e…f94a</b> · witnessed by agent-redline-v1.4</> },
      { ts: "14:59:09", lvl: "ok",   msg: <>Bundle <b>RL·4839</b> written · grounded · routed · ready</> },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // DATADOG — P1, already acknowledged, bundle witnessed
  // ─────────────────────────────────────────────────────────
  datadog: {
    key: "datadog",
    letter: "D",
    name: "Datadog",
    category: "OBSERVABILITY · MONITORING",
    meta: "OBSERVABILITY · TIER 1",
    tier: 1,
    sev: "p1",
    sevLabel: "P1",
    owner: { initials: "RK", cls: "a", name: "Ravi Krishnan", role: "SECURITY LEAD" },
    secondary: { initials: "AO", cls: "grape", name: "Ada Owens", role: "PRIVACY OFFICER" },
    annual: "$420,000",
    annualUsd: 420000,
    seats: 312,
    renewsInDays: 11,
    renewsLabel: "11 DAYS",
    renewsCls: "warn",
    dataClasses: ["pii", "phi"],
    mode: "acknowledged",
    interactive: false,
    lastChange: { label: "2h ago · SUB-PROC", cls: "crit" },
    activity: {
      sev: "p1", when: "2h",
      title: "Sub-processor added · Tencent Cloud · CN",
      meta: "SUB-PROC · JURISDICTION", impact: "+30d NOTICE", impactCls: "",
    },
    cr: {
      bundleId: "RL·4812",
      categories: ["SUB-PROC", "JURISDICTION"],
      titleOpen: <>New sub-processor <em>Tencent Cloud (CN)</em> added to data path. Non-adequate jurisdiction.</>,
      detectedAt: "2026-05-22 · 12:18:04 EST",
      detectedWhen: "2 hours ago",
      acknowledgedAt: "2026-05-22 · 12:51 EST",
      acknowledgedWhen: "1h 51m ago",
      agent: "agent-redline-v1.4",
      citationCount: 3,
      impacts: [
        { lbl: "Jurisdiction", val: "CN · non-adequate", cls: "dollar" },
        { lbl: "Customer notice", val: "+30d required", cls: "delta" },
        { lbl: "Compliance", val: "GDPR · Art 28(2)", cls: "compl" },
      ],
      diffs: [
        {
          label: "Change · Sub-processor list · APAC region",
          before: {
            when: "SNAPSHOT · APR 14 2026",
            text: <>"Datadog uses the following sub-processors in APAC: <strong>AWS (ap-northeast-1)</strong>,
                  <strong>GCP (asia-east1)</strong>. No data routed through PRC-based providers."</>,
            source: "SOURCE · datadog.com/legal/sub-processors · FETCHED 2026-04-14 06:02 UTC · HASH 71be…0caf",
          },
          after: {
            when: "SNAPSHOT · MAY 22 2026",
            text: <>"Datadog uses the following sub-processors in APAC: AWS (ap-northeast-1),
                  GCP (asia-east1), and <strong>Tencent Cloud (cn-shanghai)</strong> for traffic-origin
                  metrics retention in the Greater China region."</>,
            sourceLink: "datadog.com/legal/sub-processors",
            sourceMeta: " · FETCHED 2026-05-22 12:18 UTC · HASH 4d09…b2e1",
          },
        },
      ],
      policy: {
        head: "Policy fired",
        name: "Sub-processor added in non-adequate jurisdiction → P1 to Privacy",
        meta: "AUTHOR · Marcus Chen · SECURITY · v1 · 2026-01-08",
        yamlKey: "subprocessor",
      },
      actions: [
        { type: "slack",  target: "#privacy",            queued: "queued", sent: "12:18:42 · 6 members" },
        { type: "jira",   target: "PRIV-1188",           queued: "queued", sent: "12:18:44 · Ada Owens" },
        { type: "email",  target: "Customer notice · draft", queued: "queued", sent: "12:18:46 · 30d countdown" },
      ],
      recoOpen: {
        head: "Recommendation",
        text: <>Tencent Cloud is in a <em>non-adequate</em> jurisdiction under GDPR. A <strong>30-day customer
              notice</strong> is required before the sub-processor goes live. Privacy team should evaluate
              transfer mechanism (SCCs + supplementary measures) and confirm data classes routed (PHI must
              not be eligible). Renewal in <strong>11 days</strong> — block renewal until DPA addendum signed.</>,
      },
      recoRouted: {
        head: "Outcome · Acknowledged",
        text: <>Privacy team acknowledged at <strong>12:51 EST</strong>. Customer-notice draft attached to
              <strong> PRIV-1188</strong>. Transfer mechanism review scheduled for <strong>2026-05-25</strong>.
              Renewal of <strong>$420k</strong> contract held until DPA addendum signature.</>,
      },
    },
    bundle: {
      id: "RL·4812",
      seal: "US",
      signedAt: "2026-05-22 · 12:51:33 EST",
      hash: "4d09…b2e1",
      eyebrow: "DATADOG · CR · SUB-PROCESSOR",
      coverSubtitle: <>Datadog · new sub-processor (Tencent Cloud · CN) · <em>acknowledged</em></>,
      sectionCount: 4,
      miniDiffs: [
        [
          { kind: "b", text: <>"…APAC sub-processors: AWS, GCP. <strong>No PRC-based providers</strong>…"</>, src: "SOURCE · datadog.com/legal/sub-processors · 2026-04-14 · HASH 71be…0caf" },
          { kind: "a", text: <>"…APAC sub-processors: AWS, GCP, and <strong>Tencent Cloud (cn-shanghai)</strong>…"</>, src: "SOURCE · datadog.com/legal/sub-processors · 2026-05-22 · HASH 4d09…b2e1" },
        ],
      ],
      policyBody: <><b>severity-rules.yaml v4</b> · "Sub-processor added in non-adequate jurisdiction → P1 to Privacy."
                  Datadog added Tencent Cloud (CN-Shanghai). The policy matched at
                  <b> 2026-05-22 12:18:09 EST</b> and queued a customer-notice draft.</>,
      trail: [
        { ts: "12:18:09", msg: <>Policy fired · <b>subprocessor.yaml v1</b></>, status: "✓ MATCH" },
        { ts: "12:18:42", msg: <>Slack channel · <b>#privacy</b> · 6 members notified</>, status: "✓ SENT" },
        { ts: "12:18:44", msg: <>Jira · <b>PRIV-1188</b> · assigned Ada Owens</>, status: "✓ OPEN" },
        { ts: "12:18:46", msg: <>Draft · <b>30-day customer notice</b></>, status: "✓ READY" },
        { ts: "12:51:30", msg: <>Acknowledged by Ada Owens · <b>transfer review 5/25</b></>, status: "✓ ACK" },
        { ts: "12:51:33", msg: <>Bundle signed · hash <b>4d09…b2e1</b></>, status: "✓ WITNESSED" },
      ],
      citations: [
        { src: "datadog.com/legal/sub-processors · APAC list · public", hash: "4d09…b2e1" },
        { src: "internal · DPA §6 (Acme ⟷ Datadog) · private", hash: "71be…0caf" },
        { src: "policy · subprocessor.yaml v1 · internal", hash: "c2a8…59f0" },
      ],
      nextActions: [
        { type: "cal",   target: "Transfer review",   when: "May 25 · 10:00 EST",   status: "SCHED",   pending: false },
        { type: "email", target: "Customer notice",   when: "Send by Jun 21",       status: "DUE 6/21", pending: true },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────
  // STRIPE — P2, terms change (liability cap)
  // ─────────────────────────────────────────────────────────
  stripe: {
    key: "stripe",
    letter: "S",
    name: "Stripe",
    category: "PAYMENTS · BILLING",
    meta: "PAYMENTS · TIER 1",
    tier: 1,
    sev: "p2",
    sevLabel: "P2",
    owner: { initials: "MA", cls: "c", name: "Maya Ahmadi", role: "GRC LEAD" },
    secondary: { initials: "LP", cls: "lime", name: "Lin Park", role: "LEGAL COUNSEL" },
    annual: "$2.4M",
    annualUsd: 2400000,
    seats: 20,
    renewsInDays: 244,
    renewsLabel: "8 MONTHS",
    renewsCls: "",
    dataClasses: ["pii", "payments"],
    mode: "open",
    interactive: false,
    lastChange: { label: "6h ago · TERMS", cls: "" },
    activity: {
      sev: "p2", when: "6h",
      title: "Liability cap reduced from $1M to $500k",
      meta: "TERMS · LIABILITY", impact: "LEGAL REVIEW", impactCls: "",
    },
    cr: {
      bundleId: "RL·4798",
      categories: ["TERMS", "LIABILITY"],
      titleOpen: <>Liability cap <em>halved</em> from $1M to $500k. Indemnification scope narrowed.</>,
      detectedAt: "2026-05-22 · 08:31:17 EST",
      detectedWhen: "6 hours ago",
      agent: "agent-redline-v1.4",
      citationCount: 3,
      impacts: [
        { lbl: "Liability cap", val: "−$500,000", cls: "dollar" },
        { lbl: "Indemnification", val: "Narrowed scope", cls: "delta" },
        { lbl: "Renewal", val: "8 months out", cls: "compl" },
      ],
      diffs: [
        {
          label: "Change · §11.3 Limitation of Liability",
          before: {
            when: "SNAPSHOT · FEB 02 2026",
            text: <>"Stripe's aggregate liability under this agreement shall not exceed
                  <strong> one million dollars ($1,000,000)</strong> or the fees paid by Customer
                  in the preceding twelve (12) months, whichever is greater."</>,
            source: "SOURCE · stripe.com/legal#11.3 · FETCHED 2026-02-02 11:08 UTC · HASH 9f2c…7b4d",
          },
          after: {
            when: "SNAPSHOT · MAY 22 2026",
            text: <>"Stripe's aggregate liability under this agreement shall not exceed
                  <strong> five hundred thousand dollars ($500,000)</strong> or the fees paid by Customer
                  in the preceding twelve (12) months, whichever is greater."</>,
            sourceLink: "stripe.com/legal#11.3",
            sourceMeta: " · FETCHED 2026-05-22 08:31 UTC · HASH 6a13…8e29",
          },
        },
      ],
      policy: {
        head: "Policy fired",
        name: "Liability cap reduced >25% → P2 to Legal",
        meta: "AUTHOR · Lin Park · LEGAL · v2 · 2026-03-04",
        yamlKey: "terms",
      },
      actions: [
        { type: "slack",  target: "DM · @maya",          queued: "queued · awaits ack", sent: "—" },
        { type: "jira",   target: "LEGAL-0942",          queued: "queued",              sent: "—" },
      ],
      recoOpen: {
        head: "Recommendation",
        text: <>Stripe's standard cap is now <strong>50% lower</strong>. Acme processes <strong>$2.4M/yr</strong>
              through Stripe; current cap is materially under-protective vs. annual volume. Renewal is
              8 months out — leverage MSA negotiation to <em>restore $1M cap or negotiate a custom carve-out</em>.
              No immediate action required; flag for renewal-prep cycle.</>,
      },
    },
    bundle: null,
  },

  // ─────────────────────────────────────────────────────────
  // AWS — P2, pricing increase on hot SKU
  // ─────────────────────────────────────────────────────────
  aws: {
    key: "aws",
    letter: "A",
    name: "AWS",
    category: "CLOUD · INFRASTRUCTURE",
    meta: "INFRA · TIER 1",
    tier: 1,
    sev: "p2",
    sevLabel: "P2",
    owner: { initials: "RK", cls: "a", name: "Ravi Krishnan", role: "PLATFORM LEAD" },
    secondary: { initials: "JT", cls: "d", name: "Jordan Tao", role: "FINOPS" },
    annual: "$1.8M",
    annualUsd: 1800000,
    seats: 0,
    renewsInDays: 92,
    renewsLabel: "3 MONTHS",
    renewsCls: "",
    dataClasses: ["pii", "source"],
    mode: "open",
    interactive: false,
    lastChange: { label: "1d ago · PRICING", cls: "" },
    activity: {
      sev: "p2", when: "1d",
      title: "EC2 g6.xlarge +8% in us-east-1",
      meta: "PRICING", impact: "+$14.2k/yr", impactCls: "in",
    },
    cr: {
      bundleId: "RL·4761",
      categories: ["PRICING"],
      titleOpen: <>EC2 <em>g6.xlarge</em> hourly rate up <strong>8%</strong> in us-east-1. Acme runs 47 nodes.</>,
      detectedAt: "2026-05-21 · 14:42:00 EST",
      detectedWhen: "1 day ago",
      agent: "agent-redline-v1.4",
      citationCount: 2,
      impacts: [
        { lbl: "$ Impact · annual", val: "+$14,200", cls: "dollar" },
        { lbl: "Per-node change", val: "+$0.094/hr", cls: "delta" },
        { lbl: "Affected nodes", val: "47 · ML inference", cls: "compl" },
      ],
      diffs: [
        {
          label: "Change · EC2 g6.xlarge · us-east-1",
          before: {
            when: "SNAPSHOT · MAY 15 2026",
            text: <>"g6.xlarge (1× L4 GPU, 4 vCPU, 16 GiB) · <strong>$1.174 per hour</strong> · on-demand · us-east-1."</>,
            source: "SOURCE · aws.amazon.com/ec2/instance-types · FETCHED 2026-05-15 09:00 UTC · HASH 3c80…d471",
          },
          after: {
            when: "SNAPSHOT · MAY 21 2026",
            text: <>"g6.xlarge (1× L4 GPU, 4 vCPU, 16 GiB) · <strong>$1.268 per hour</strong> · on-demand · us-east-1."</>,
            sourceLink: "aws.amazon.com/ec2/instance-types",
            sourceMeta: " · FETCHED 2026-05-21 14:42 UTC · HASH a09f…1c3b",
          },
        },
      ],
      policy: {
        head: "Policy fired",
        name: "SKU pricing increase >5% → P2 to FinOps",
        meta: "AUTHOR · Jordan Tao · FINOPS · v3 · 2026-02-18",
        yamlKey: "pricing",
      },
      actions: [
        { type: "slack",  target: "DM · @jordan",        queued: "queued · awaits ack", sent: "—" },
        { type: "jira",   target: "FIN-0322",            queued: "queued",              sent: "—" },
      ],
      recoOpen: {
        head: "Recommendation",
        text: <>g6.xlarge powers Acme's ML inference fleet (47 nodes). Annualized impact: <strong>+$14.2k</strong>.
              FinOps should evaluate <em>3-year savings plan</em> at the older rate (auto-applies if signed
              before 2026-08-22 renewal) or migrate inference to <em>g5.xlarge</em> (−12% perf, −18% cost).</>,
      },
    },
    bundle: null,
  },

  // ─────────────────────────────────────────────────────────
  // LINEAR — Healthy, no recent diff
  // ─────────────────────────────────────────────────────────
  linear: {
    key: "linear",
    letter: "L",
    name: "Linear",
    category: "PROJECT · COLLAB",
    meta: "PROJECT · TIER 2",
    tier: 2,
    sev: "healthy",
    sevLabel: "OK",
    owner: { initials: "JT", cls: "d", name: "Jordan Tao", role: "OWNER" },
    annual: "$48,000",
    annualUsd: 48000,
    seats: 240,
    renewsInDays: 153,
    renewsLabel: "5 MONTHS",
    renewsCls: "",
    dataClasses: ["pii"],
    mode: "healthy",
    interactive: false,
    lastChange: { label: "14 days · no diff", cls: "" },
    activity: null,
    cr: {
      categories: ["NO CHANGE"],
      titleOpen: <>No material changes detected in the last <em>14 days</em>. Posture stable.</>,
      detectedAt: "2026-05-22 · 14:42:18 EST",
      detectedWhen: "14 days since last scan diff",
      agent: "agent-redline-v1.4",
      citationCount: 0,
      lastScannedSurfaces: [
        { url: "linear.app/terms",        when: "2026-05-22 14:38 UTC", hash: "stable · e7d2…c918" },
        { url: "linear.app/dpa",          when: "2026-05-22 14:38 UTC", hash: "stable · 819a…0042" },
        { url: "linear.app/security",     when: "2026-05-22 14:39 UTC", hash: "stable · 4f0c…dd80" },
        { url: "linear.app/sub-processors", when: "2026-05-22 14:39 UTC", hash: "stable · 6b22…aaef" },
      ],
      recoOpen: {
        head: "Status · Healthy",
        text: <>All <strong>4 monitored surfaces</strong> match prior snapshots. Last meaningful change
              was on <strong>2026-05-08</strong> (security headers update, non-material). Renewal in
              <strong> 5 months</strong> — no early action needed.</>,
      },
    },
    bundle: null,
  },

  // ─────────────────────────────────────────────────────────
  // FIGMA — Healthy, no recent diff
  // ─────────────────────────────────────────────────────────
  figma: {
    key: "figma",
    letter: "F",
    name: "Figma",
    category: "DESIGN · COLLAB",
    meta: "DESIGN · TIER 2",
    tier: 2,
    sev: "healthy",
    sevLabel: "OK",
    owner: { initials: "JT", cls: "d", name: "Jordan Tao", role: "OWNER" },
    annual: "$96,000",
    annualUsd: 96000,
    seats: 480,
    renewsInDays: 214,
    renewsLabel: "7 MONTHS",
    renewsCls: "",
    dataClasses: ["pii"],
    mode: "healthy",
    interactive: false,
    lastChange: { label: "22 days · no diff", cls: "" },
    activity: null,
    cr: {
      categories: ["NO CHANGE"],
      titleOpen: <>No material changes detected in the last <em>22 days</em>. Posture stable.</>,
      detectedAt: "2026-05-22 · 14:42:18 EST",
      detectedWhen: "22 days since last scan diff",
      agent: "agent-redline-v1.4",
      citationCount: 0,
      lastScannedSurfaces: [
        { url: "figma.com/legal/terms",         when: "2026-05-22 14:35 UTC", hash: "stable · 1eaa…58c2" },
        { url: "figma.com/legal/dpa",           when: "2026-05-22 14:36 UTC", hash: "stable · 0c44…b1f9" },
        { url: "figma.com/security",            when: "2026-05-22 14:36 UTC", hash: "stable · d8e7…7710" },
        { url: "figma.com/legal/sub-processors", when: "2026-05-22 14:37 UTC", hash: "stable · 33ab…ee21" },
      ],
      recoOpen: {
        head: "Status · Healthy",
        text: <>All <strong>4 monitored surfaces</strong> match prior snapshots. Last meaningful change
              was on <strong>2026-04-30</strong> (pricing FAQ refresh, non-material). Renewal in
              <strong> 7 months</strong> — no early action needed.</>,
      },
    },
    bundle: null,
  },

};

// Per-vendor YAML snippet used in the policy panel. Kept terse so it fits.
const POLICY_YAML = {
  pricing: (
    <pre className="policy-yaml">
{`# severity-rules.yaml`}
{"\n"}<span className="y-key">when:</span>{"\n  "}change.category: <span className="y-str">"pricing"</span>{"\n  "}change.dollarImpact.pct: <span className="y-str">">10"</span>{"\n  "}vendor.renewsAt: <span className="y-str">"within 90d"</span>{"\n"}<span className="y-key">then:</span>{"\n  "}severity: <span className="y-str">P1</span>{"\n  "}route:{"\n    - "}<span className="y-str">slack:@priya</span>{"\n    - "}<span className="y-str">jira:PROC</span>{"\n    - "}<span className="y-str">copilot:renegotiate</span>
    </pre>
  ),
  subprocessor: (
    <pre className="policy-yaml">
{`# severity-rules.yaml`}
{"\n"}<span className="y-key">when:</span>{"\n  "}change.category: <span className="y-str">"subprocessor"</span>{"\n  "}new.jurisdiction.adequate: <span className="y-str">"false"</span>{"\n"}<span className="y-key">then:</span>{"\n  "}severity: <span className="y-str">P1</span>{"\n  "}route:{"\n    - "}<span className="y-str">slack:#privacy</span>{"\n    - "}<span className="y-str">jira:PRIV</span>{"\n    - "}<span className="y-str">draft:customer-notice-30d</span>
    </pre>
  ),
  terms: (
    <pre className="policy-yaml">
{`# severity-rules.yaml`}
{"\n"}<span className="y-key">when:</span>{"\n  "}change.category: <span className="y-str">"terms"</span>{"\n  "}clause.liabilityCap.pctDelta: <span className="y-str">{'"<= -25"'}</span>{"\n"}<span className="y-key">then:</span>{"\n  "}severity: <span className="y-str">P2</span>{"\n  "}route:{"\n    - "}<span className="y-str">slack:@maya</span>{"\n    - "}<span className="y-str">jira:LEGAL</span>
    </pre>
  ),
};

// Order used by the portfolio grid + the order the activity feed cycles.
const VENDOR_ORDER = ["notion", "datadog", "stripe", "aws", "linear", "figma"];

Object.assign(window, { VENDOR_DATA, POLICY_YAML, VENDOR_ORDER });
