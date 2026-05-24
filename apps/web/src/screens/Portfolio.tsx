import { FleetStats } from "../components/FleetStats.js";
import { VendorCard, type VendorCardData } from "../components/VendorCard.js";

// Seeded vendor display data. Two vendors come from /seed/vendors.json (Notion,
// Stripe); the remaining six fill the grid for a convincing demo. No new API
// endpoints added — spec §4 permits seeded display for posture/renewal/owner.
const VENDORS: VendorCardData[] = [
  {
    id: "vnd_notion",
    name: "Notion",
    domain: "notion.so",
    tier: 1,
    posture: "risk",
    renewsAt: "2026-07-04",
    ownerInitial: "P",
    ownerEmail: "priya@acme.dev",
  },
  {
    id: "vnd_stripe",
    name: "Stripe",
    domain: "stripe.com",
    tier: 1,
    posture: "watch",
    renewsAt: "2026-07-18",
    ownerInitial: "L",
    ownerEmail: "lin@acme.dev",
  },
  {
    id: "vnd_figma",
    name: "Figma",
    domain: "figma.com",
    tier: 2,
    posture: "ok",
    renewsAt: "2026-11-01",
    ownerInitial: "M",
    ownerEmail: "marcus@acme.dev",
  },
  {
    id: "vnd_vercel",
    name: "Vercel",
    domain: "vercel.com",
    tier: 2,
    posture: "ok",
    renewsAt: "2027-02-15",
    ownerInitial: "J",
    ownerEmail: "jordan@acme.dev",
  },
  {
    id: "vnd_okta",
    name: "Okta",
    domain: "okta.com",
    tier: 1,
    posture: "fresh",
    renewsAt: "2027-01-08",
    ownerInitial: "A",
    ownerEmail: "ada@acme.dev",
  },
  {
    id: "vnd_github",
    name: "GitHub",
    domain: "github.com",
    tier: 1,
    posture: "fresh",
    renewsAt: "2027-03-20",
    ownerInitial: "D",
    ownerEmail: "devon@acme.dev",
  },
  {
    id: "vnd_datadog",
    name: "Datadog",
    domain: "datadoghq.com",
    tier: 2,
    posture: "expiring",
    renewsAt: "2026-06-30",
    ownerInitial: "M",
    ownerEmail: "marcus@acme.dev",
  },
  {
    id: "vnd_slack",
    name: "Slack",
    domain: "slack.com",
    tier: 2,
    posture: "watch",
    renewsAt: "2026-08-12",
    ownerInitial: "P",
    ownerEmail: "priya@acme.dev",
  },
];

function SkeletonCard(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "var(--surface-2)",
        borderRadius: "var(--radius-lg)",
        height: 168,
        opacity: 0.5,
      }}
    />
  );
}

export function Portfolio(): JSX.Element {
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "var(--space-8) var(--space-6)",
      }}
    >
      {/* Fleet stats strip */}
      <FleetStats />

      <hr className="hairline" style={{ margin: "var(--space-6) 0" }} />

      {/* Vendor grid section */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <h2 className="h2">Recent vendors</h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {VENDORS.length === 0 ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : (
          VENDORS.map((v) => <VendorCard key={v.id} vendor={v} />)
        )}
      </div>
    </div>
  );
}
