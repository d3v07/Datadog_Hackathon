import { Hono } from "hono";

type Tone = "firm" | "friendly" | "aggressive";

interface Draft {
  tone: Tone;
  subject: string;
  body: string;
}

interface PacketResponse {
  vendorId: string;
  vendorName: string;
  currentSpend: number;
  benchmarkRange: { low: number; high: number };
  usagePct: number;
  recoverableUsd: number;
  drafts: Draft[];
  talkingPoints: string[];
}

const VENDOR_PACKETS: Record<string, Omit<PacketResponse, "vendorId">> = {
  vnd_salesforce: {
    vendorName: "Salesforce",
    currentSpend: 815000,
    benchmarkRange: { low: 620000, high: 700000 },
    usagePct: 51,
    recoverableUsd: 312000,
    talkingPoints: [
      "Active utilization at 51% (industry avg: 68%) — 412 of 850 seats in use",
      "Benchmark range $1,400–$1,550/seat vs current $1,800/seat on Enterprise Cloud",
      "Comparable companies negotiated -18% to -25% YoY on similar ARR profiles",
      "Renewal on Jul 9, 2026 — 47 days to close without disruption",
    ],
    drafts: [
      {
        tone: "firm",
        subject: "Salesforce renewal — request for 22% adjustment ahead of Jul 9 expiry",
        body: `Hi [AE],

Our annual contract is up for renewal on July 9, 2026. Before we sign for another term, I want to share what we're seeing internally and discuss adjustments.

Over the past 12 months, our active seat count has been 438 against 850 provisioned — a 51% utilization rate. At our current $1,800 per-seat annual rate, that's $740k in unused capacity.

Comparable companies (similar ARR and headcount profile) are paying $1,400–$1,550 per seat on Enterprise Cloud, per our benchmark data. Our current rate sits above that band.

We're requesting: a 22% adjustment to $1,400/seat, with a seat reduction to 500 active. That puts our annual at $700k — still a meaningful expansion for Salesforce against your peer accounts.

If that's not workable, we'll need to evaluate alternative platforms ahead of the renewal date. Happy to set up a call this week.

Thanks,
[Procurement]`,
      },
      {
        tone: "friendly",
        subject: "Salesforce renewal — let's align on terms ahead of July",
        body: `Hi [AE],

We've had a great partnership with Salesforce this year and want to set up another strong term together. As we head into renewal on July 9, I wanted to share a few data points so we're aligned before the paperwork.

Our team has 438 active users out of 850 provisioned — about 51% utilization. We've been working to right-size, and a seat reduction to around 500 would better match our actual footprint.

Looking at market benchmarks, similar companies are renewing in the $1,400–$1,550/seat range. Our current $1,800/seat rate is a bit above that, so we'd love to explore moving closer to $1,450/seat for the renewal term.

That gets us to around $725k annually — a fair deal for both sides. Would you have time for a quick call this week to align?

Looking forward to continuing the partnership.

Best,
[Procurement]`,
      },
      {
        tone: "aggressive",
        subject: "Salesforce renewal — 22% reduction required or we evaluate alternatives",
        body: `Hi [AE],

We need to resolve Salesforce pricing before July 9. Here's where we stand: 51% seat utilization (438 of 850), $740k sitting in unused capacity at your current $1,800/seat rate, and benchmark data showing peers closing deals at $1,400–$1,550/seat.

We've modeled switching costs to HubSpot and Microsoft Dynamics. Neither is our preference, but both are viable at these price points.

Our ask is direct: $1,400/seat on 500 seats, $700k total annual. We need confirmation by June 20 to stay on track for July 9 signatures.

If we don't get to $1,400/seat, we'll be issuing an RFP to two competitors this month. This isn't a bluff — our board has already approved the budget to switch.

Please escalate if needed. We want to stay on Salesforce but not at current rates.

[Procurement]`,
      },
    ],
  },

  vnd_notion: {
    vendorName: "Notion",
    currentSpend: 84000,
    benchmarkRange: { low: 60000, high: 70000 },
    usagePct: 69,
    recoverableUsd: 22000,
    talkingPoints: [
      "69% active utilization — 412 of 600 seats in use, 188 idle",
      "Benchmark range $8–$10/seat/month vs current $11.67/seat/month",
      "Peer companies at similar scale renewing at $9–$10/seat",
      "Renewal Jul 4 — 40 days to lock in terms",
    ],
    drafts: [
      {
        tone: "firm",
        subject: "Notion renewal — 17% adjustment requested before Jul 4",
        body: `Hi Notion team,

Our contract renews on July 4, 2026. Before we move forward, we want to discuss our current rate.

We're at $11.67/seat/month across 600 seats, with 412 actively using the product (69% utilization). Benchmark data puts comparable teams at $9–$10/seat/month for our workspace size.

We're requesting a reduction to $9.50/seat/month and a seat adjustment to 450 — bringing our annual to approximately $51,300. That's a 17% reduction from current spend of $84k.

If you can confirm this by June 20, we can execute contracts quickly.

Thanks,
[Procurement]`,
      },
      {
        tone: "friendly",
        subject: "Notion renewal — quick alignment before July",
        body: `Hi Notion team,

The team loves Notion — it's become core to how we document and collaborate. As we head into our July 4 renewal, I wanted to share a few data points.

We have 412 active users out of 600 provisioned (69% utilization). We'd like to right-size to around 450 seats and bring the per-seat rate closer to the $9–$10 range we're seeing from peer companies.

That would put us around $51k–$54k annually, down from our current $84k. Happy to lock in a two-year term if that helps on your side.

Can we schedule 20 minutes this week?

Best,
[Procurement]`,
      },
      {
        tone: "aggressive",
        subject: "Notion renewal — must resolve rate before Jun 25 or we switch to Confluence",
        body: `Hi Notion team,

Our renewal is July 4. We're paying $84k annually at $11.67/seat with 69% utilization. Confluence and Coda are both quoting us $8–$9/seat for comparable feature sets.

We need $9.50/seat on 450 seats ($51,300/yr) confirmed by June 25. If we don't have a revised order form by then, we'll execute the Confluence migration we have scoped.

This isn't a negotiating position — our engineering team already has a migration playbook. The only question is whether Notion matches market rate.

Please respond with a revised quote or an escalation contact.

[Procurement]`,
      },
    ],
  },

  vnd_stripe: {
    vendorName: "Stripe",
    currentSpend: 62000,
    benchmarkRange: { low: 45000, high: 55000 },
    usagePct: 90,
    recoverableUsd: 12000,
    talkingPoints: [
      "Usage at 90% — 18 of 20 seats active; minimal seat waste but rate is above benchmark",
      "Current blended rate runs 11% above peer companies at similar transaction volume",
      "Volume discount tier not applied — we qualify for the $250k+/yr rate card",
      "Renewal Jul 18 — opportunity to lock in volume pricing before next tier resets",
    ],
    drafts: [
      {
        tone: "firm",
        subject: "Stripe platform renewal — volume discount adjustment before Jul 18",
        body: `Hi Stripe team,

Our platform agreement renews July 18, 2026. I want to discuss our rate before we sign.

At current transaction volume, we qualify for Stripe's $250k+ annual volume tier. Our blended rate isn't reflecting that, and benchmark data puts comparable companies at $45k–$55k annually for our profile.

We're asking for the volume discount tier to be applied, bringing our annual to approximately $50k. That's a 19% reduction from current $62k — in line with your published rate card for our volume.

Please send a revised quote by July 1 so we have time to execute before renewal.

Thanks,
[Finance]`,
      },
      {
        tone: "friendly",
        subject: "Stripe renewal — aligning on volume pricing for next term",
        body: `Hi Stripe team,

We've been a happy Stripe customer and plan to stay so for the long term. As we approach our July 18 renewal, we'd like to discuss rate alignment.

Our transaction volume puts us in the $250k+ annual tier, and we'd expect our rate to reflect that. Benchmark data shows comparable companies at $45k–$55k/yr. We're currently at $62k.

Would love to get this resolved before July 1 so we can execute cleanly. We're also open to a 2-year commitment if that unlocks better terms.

Happy to jump on a call.

Best,
[Finance]`,
      },
      {
        tone: "aggressive",
        subject: "Stripe renewal — volume discount must apply or we evaluate Adyen",
        body: `Hi Stripe team,

Our transaction volume qualifies for your $250k+ rate card. Our current contract doesn't reflect that, and we're paying $62k annually against a benchmark of $45k–$55k for companies at our scale.

We've had preliminary conversations with Adyen and Braintree. Both quoted meaningfully lower. Stripe is our preference for ecosystem reasons, but not at a 25% premium over market.

We need a revised quote at $50k or below by July 5. If we don't receive it, we'll begin the migration process.

This is a straightforward ask — apply the volume discount we've earned.

[Finance]`,
      },
    ],
  },

  vnd_figma: {
    vendorName: "Figma",
    currentSpend: 24000,
    benchmarkRange: { low: 16000, high: 20000 },
    usagePct: 69,
    recoverableUsd: 7200,
    talkingPoints: [
      "69% active utilization — 55 of 80 seats in use, 25 idle",
      "Benchmark $16k–$20k for our seat count vs current $24k",
      "Figma Professional at $12/seat/month — we're at $25/seat effective rate including extras",
      "Alternative: Adobe XD and Penpot both quoted under $15k for comparable access",
    ],
    drafts: [
      {
        tone: "firm",
        subject: "Figma renewal — seat reduction and rate adjustment before Nov 1",
        body: `Hi Figma team,

Our contract renews November 1, 2026. We want to right-size before then.

We have 55 active designers out of 80 seats (69% utilization). Peer benchmarks show comparable design teams renewing at $16k–$20k annually. Our current $24k puts us 20% above that band.

We're requesting: reduce to 60 seats at $15/seat/month — $10,800/yr. Alternatively, we'll accept current seat count at $12/seat/month Professional plan — $11,520/yr.

Please respond with a revised quote before October 1.

[Procurement]`,
      },
      {
        tone: "friendly",
        subject: "Figma renewal — let's right-size for next year",
        body: `Hi Figma team,

The design team loves Figma — it's central to how we ship. As we approach the November renewal, we want to make sure our contract matches how we actually use the product.

We're at 55 active designers out of 80 provisioned. Right-sizing to 60 seats and moving to Professional plan pricing ($12/seat) would get us to $8,640 annually — or we'd be happy to discuss a bundled rate for our actual footprint.

Benchmark data for teams our size runs $16k–$20k, so there's some room to align. Can we get 20 minutes on the calendar?

Best,
[Procurement]`,
      },
      {
        tone: "aggressive",
        subject: "Figma renewal — 33% reduction required; Penpot migration scoped as alternative",
        body: `Hi Figma team,

We're paying $24k for a product 31% of our licensed seats don't actively use. Benchmark for comparable design orgs is $16k–$20k.

Penpot is open source and our engineering team has it running in our infrastructure already as a pilot. Adobe XD quoted us $14k for equivalent access.

We need Figma at $16k or below to renew — either through seat reduction or rate adjustment. Confirm by October 15 or we'll complete the Penpot migration before November 1.

[Procurement]`,
      },
    ],
  },

  vnd_slack: {
    vendorName: "Slack",
    currentSpend: 38000,
    benchmarkRange: { low: 28000, high: 34000 },
    usagePct: 78,
    recoverableUsd: 9000,
    talkingPoints: [
      "78% active utilization — 310 of 400 seats active; 90 seats unused at $9.58/seat/month",
      "Benchmark $28k–$34k for our headcount vs current $38k",
      "Microsoft Teams included in existing M365 subscription — migration cost is low",
      "Renewal Aug 12 — 79 days to negotiate",
    ],
    drafts: [
      {
        tone: "firm",
        subject: "Slack renewal — 21% reduction and seat right-sizing before Aug 12",
        body: `Hi Slack team,

Our renewal is August 12, 2026. We want to resolve pricing before then.

We have 310 active Slack users out of 400 provisioned (78% utilization). At $9.58/seat/month, we're paying for 90 seats our team doesn't actively use. Benchmark data puts comparable companies at $28k–$34k annually; we're at $38k.

We're requesting: reduce to 320 seats at $8.50/seat/month — $32,640/yr. That's a 14% reduction that reflects actual usage.

If the rate can't move, we'll need to move to Teams which is already included in our M365 agreement.

Please respond by July 15.

[IT]`,
      },
      {
        tone: "friendly",
        subject: "Slack renewal — right-sizing and rate check before August",
        body: `Hi Slack team,

Slack is deeply embedded in how our team communicates and we'd like to renew for another year. Before we do, I wanted to align on a few things.

We're at 310 daily active users out of 400 seats. Right-sizing to 325 seats would better match our footprint. Benchmark data shows companies our size at $28k–$34k annually; we're currently at $38k.

Can we explore $8.50/seat on 325 seats (~$33k/yr)? Happy to commit to a two-year term for better rates.

Let's find a time this week.

Best,
[IT]`,
      },
      {
        tone: "aggressive",
        subject: "Slack renewal — $30k or we migrate to Teams by Aug 12",
        body: `Hi Slack team,

We have Teams bundled in our M365 agreement. We've been paying $38k/year for Slack because the product is better — but not $8k/year better at our utilization rate.

78% active utilization, benchmark at $28k–$34k, and Teams is already available to every employee. We need Slack at $30k annually (325 seats at $7.69/seat) to justify not migrating.

This is a binary decision point. We need a revised quote by July 25 or we'll begin the Teams rollout in August.

[IT]`,
      },
    ],
  },

  vnd_datadog: {
    vendorName: "Datadog",
    currentSpend: 145000,
    benchmarkRange: { low: 105000, high: 125000 },
    usagePct: 93,
    recoverableUsd: 28000,
    talkingPoints: [
      "93% utilization — highly active; leverage is on rate, not seats",
      "Benchmark $105k–$125k for our infra scale vs current $145k",
      "Log retention at 15 days — reducing to 7 days would save ~$18k/year",
      "New Relic and Grafana Cloud both quoted 25–30% below current Datadog rate",
    ],
    drafts: [
      {
        tone: "firm",
        subject: "Datadog renewal — 17% rate reduction requested before Jun 30",
        body: `Hi Datadog team,

Our renewal is June 30, 2026. Before we commit to another term, we need to align on rate.

We're at $145k annually and highly active (93% of provisioned hosts in use). The rate issue isn't utilization — it's that comparable observability stacks at our infrastructure scale run $105k–$125k. We're 16% above the top of that band.

We're requesting a 17% reduction to $120k for the renewal term. We're also willing to reduce log retention from 15 to 7 days, which our engineering team says would unlock an additional $18k in savings.

New Relic and Grafana Cloud have both submitted competitive quotes. We prefer Datadog's product but need to see rate movement.

Please respond by June 15.

[Engineering]`,
      },
      {
        tone: "friendly",
        subject: "Datadog renewal — aligning on rate for June term",
        body: `Hi Datadog team,

Our team relies heavily on Datadog — 93% host utilization and actively used across engineering, SRE, and security. We want to renew.

As we approach June 30, I wanted to flag a pricing gap. Benchmark data shows comparable observability customers at $105k–$125k annually. We're at $145k. We'd like to close that gap.

We're open to a few paths: a rate adjustment to ~$120k, a retention adjustment from 15 to 7 days, or a longer commitment term for a better blended rate.

Can we get on a call this week to align before June 15?

Best,
[Engineering]`,
      },
      {
        tone: "aggressive",
        subject: "Datadog renewal — $120k or we execute New Relic migration",
        body: `Hi Datadog team,

We have quotes from New Relic and Grafana Cloud at $105k and $108k respectively for comparable observability coverage. We're currently paying Datadog $145k.

We want to stay on Datadog — our team knows the product and migration has real cost. But not $40k/year in cost.

$120k is our number. If we can't get there, we'll execute the New Relic migration before our June 30 renewal date. We've already scoped the effort; it's a 6-week project.

Respond with a revised quote by June 10.

[Engineering / Procurement]`,
      },
    ],
  },

  vnd_github: {
    vendorName: "GitHub",
    currentSpend: 52000,
    benchmarkRange: { low: 38000, high: 46000 },
    usagePct: 90,
    recoverableUsd: 9000,
    talkingPoints: [
      "90% active utilization — 90 of 100 developers active; minimal seat waste",
      "Benchmark $38k–$46k for our developer headcount vs current $52k",
      "GitHub Actions minutes overages adding ~$8k/year beyond base license",
      "GitLab quoted $39k for equivalent Enterprise tier with CI included",
    ],
    drafts: [
      {
        tone: "firm",
        subject: "GitHub Enterprise renewal — 15% adjustment and Actions minute bundle",
        body: `Hi GitHub team,

Our Enterprise agreement renews March 20, 2027. We're starting renewal discussions now to avoid a crunch.

We have 90 active developers out of 100 licenses. At current rate, we're at $52k annually — 13% above the $38k–$46k benchmark for comparable engineering orgs. We're also paying $8k+ in Actions minute overages annually on top of the base rate.

We're requesting: 10% reduction on the base license to $46,800, plus a committed Actions minute bundle that eliminates per-minute overage charges. Total package: $50k flat.

GitLab Enterprise submitted a $39k all-inclusive quote. We prefer GitHub's ecosystem but need to close the gap.

[Engineering]`,
      },
      {
        tone: "friendly",
        subject: "GitHub renewal — early discussions on Enterprise terms",
        body: `Hi GitHub team,

We're happy with GitHub Enterprise — it's core infrastructure for our engineering org. Starting renewal conversations early so we can finalize by Q1 2027.

At 90 of 100 seats active, we're highly utilized. The one area we'd like to address: our Actions minute overages add $8k+/year on top of the $52k base. Benchmark data shows comparable orgs at $38k–$46k all-in.

We'd love to explore a bundled rate — base license plus committed Actions minutes — in the $48k–$50k range. Happy to commit to a 2-year term if that unlocks better pricing.

Let's find a time to talk.

Best,
[Engineering]`,
      },
      {
        tone: "aggressive",
        subject: "GitHub renewal — $46k all-in required; GitLab migration is scoped",
        body: `Hi GitHub team,

We're paying $52k base plus $8k in Actions overages — $60k effectively — for 90 developers. GitLab Enterprise quoted us $39k all-inclusive with equivalent CI/CD.

GitHub is our strong preference. But $21k/year in premium over GitLab is hard to justify to our board.

We need $46k all-in (base + Actions bundle) to renew. No overages, no surprises. If we can't get to $46k, we'll execute the GitLab migration we have scoped for Q4.

Confirm by December 1.

[Engineering]`,
      },
    ],
  },

  vnd_aws: {
    vendorName: "AWS",
    currentSpend: 420000,
    benchmarkRange: { low: 320000, high: 370000 },
    usagePct: 78,
    recoverableUsd: 68000,
    talkingPoints: [
      "28% of EC2 spend on instances running below 20% CPU — rightsizing opportunity",
      "Benchmark $320k–$370k for our workload profile vs current $420k",
      "Reserved Instance coverage at 42% — increasing to 70% would save ~$65k/year",
      "Committed spend contract (EDP) would unlock 15–20% discount on committed tiers",
    ],
    drafts: [
      {
        tone: "firm",
        subject: "AWS spend optimization — EDP and Reserved Instance conversation",
        body: `Hi AWS team,

We're spending $420k annually on AWS and want to optimize before the next budget cycle.

Our analysis shows: 28% of EC2 spend on instances below 20% CPU utilization, Reserved Instance coverage at 42% (industry standard is 70%+), and no active EDP in place. Benchmark for our workload profile is $320k–$370k annually.

We're requesting: an EDP commitment conversation targeting $350k/year with 3-year term, plus guidance on Reserved Instance conversion for our top 20 instance types. That should get us to $350k–$380k annually.

Our alternative is to run the RI analysis ourselves and move 30% of workloads to GCP, which we've piloted successfully.

Let's schedule a technical review with our Solutions Architect.

[Engineering / Finance]`,
      },
      {
        tone: "friendly",
        subject: "AWS spend review — EDP discussion and RI optimization",
        body: `Hi AWS team,

We're happy with our AWS infrastructure and want to set up a conversation about optimizing our spend for the next year.

Current annual run rate is $420k. Our Reserved Instance coverage is at 42% — we know that's leaving savings on the table. And we haven't evaluated an EDP yet. Benchmark data shows companies at our scale at $320k–$370k with better RI and commitment structures.

Would love to connect with our SA to walk through an RI conversion plan and evaluate whether an EDP makes sense for our roadmap.

Can we get something on the calendar this week?

Best,
[Engineering]`,
      },
      {
        tone: "aggressive",
        subject: "AWS spend — $350k commitment required; GCP migration scoped for 30% of workloads",
        body: `Hi AWS team,

We're at $420k/year and our benchmark data says we should be at $320k–$370k for our workload profile. The gap is $50k–$100k annually.

We've piloted GCP for our analytics workloads — performance is comparable and the committed use discount structure is more transparent. We're not looking to migrate the full stack, but 30% of workloads are viable candidates.

To stay fully on AWS, we need: an EDP at $350k committed annual spend with 15% discount on overages, plus RI conversion support on our top instance types.

We need a proposal in 30 days or we'll expand the GCP pilot.

[Engineering / Procurement]`,
      },
    ],
  },
};

const GENERIC_PACKET = (vendorId: string): Omit<PacketResponse, "vendorId"> => ({
  vendorName: vendorId.replace(/^vnd_/, "").replace(/_/g, " "),
  currentSpend: 50000,
  benchmarkRange: { low: 38000, high: 44000 },
  usagePct: 65,
  recoverableUsd: 11000,
  talkingPoints: [
    "65% active utilization — opportunity to right-size seat count",
    "Benchmark range $38k–$44k vs current $50k spend",
    "Comparable companies negotiating 12–18% reductions at renewal",
    "Consider multi-year commit for better rate in exchange for certainty",
  ],
  drafts: [
    {
      tone: "firm",
      subject: "Contract renewal — rate adjustment request",
      body: `Hi [AE],

Our contract is coming up for renewal. After reviewing usage data and benchmark comparisons, we believe an adjustment is warranted.

Our active utilization is at 65%. Benchmark data for comparable customers shows rates 12–18% below our current $50k annual. We're requesting a reduction to $42k for the renewal term, reflecting actual usage and market rate.

Please respond with a revised quote before the renewal date.

[Procurement]`,
    },
    {
      tone: "friendly",
      subject: "Contract renewal — aligning on terms",
      body: `Hi [AE],

We've been happy with the product and want to renew. Before we finalize terms, we'd love to discuss rate alignment.

Our utilization is at 65% of licensed capacity, and benchmark data suggests comparable customers are at $38k–$44k annually. We're currently at $50k.

Can we get on a quick call to discuss? We're open to a longer term commitment if that helps on your end.

Best,
[Procurement]`,
    },
    {
      tone: "aggressive",
      subject: "Contract renewal — $42k required or we evaluate alternatives",
      body: `Hi [AE],

We're paying $50k annually at 65% utilization. Benchmark data shows we're 12–18% above market rate for comparable customers.

Competitors have quoted us $40k–$42k for equivalent capability. We prefer to stay but not at a 20% premium.

We need $42k confirmed before the renewal date or we'll execute on the alternative quotes we have in hand.

[Procurement]`,
    },
  ],
});

export const renegotiationRoute = new Hono();

renegotiationRoute.post("/:vendorId/renegotiation-packet", (c) => {
  const vendorId = c.req.param("vendorId");
  const packet = VENDOR_PACKETS[vendorId] ?? GENERIC_PACKET(vendorId);
  const response: PacketResponse = { vendorId, ...packet };
  return c.json(response);
});
