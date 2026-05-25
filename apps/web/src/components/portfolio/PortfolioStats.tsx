import type { Vendor } from "@unsyphn/shared";
import { CountUp } from "../CountUp.js";
import { fmtUsd } from "./types.js";

interface Props {
  vendors: ReadonlyArray<Vendor>;
}

function vendorsRenewingIn(vendors: ReadonlyArray<Vendor>, days: number): number {
  const cutoff = Date.now() + days * 86_400_000;
  let count = 0;
  for (const v of vendors) {
    if (!v.contract?.renewsAt) continue;
    const t = Date.parse(v.contract.renewsAt);
    if (Number.isFinite(t) && t >= Date.now() && t <= cutoff) count++;
  }
  return count;
}

interface StatSpec {
  value: number;
  format: (n: number) => string;
  label: string;
  tone?: "danger" | "warning";
}

export function PortfolioStats({ vendors }: Props): JSX.Element {
  const total = vendors.length;
  const runRate = vendors.reduce((s, v) => s + (v.contract?.annualSpendUsd ?? 0), 0);
  const renewingSoon = vendorsRenewingIn(vendors, 90);
  const highRisk = vendors.filter((v) => v.posture === "risk").length;

  const intFmt = (n: number): string => Math.round(n).toString();

  const stats: ReadonlyArray<StatSpec> = [
    { value: total, format: intFmt, label: "Vendors" },
    { value: runRate, format: (n) => fmtUsd(Math.round(n)), label: "Annual run-rate" },
    {
      value: renewingSoon,
      format: intFmt,
      label: "Renewing in 90 days",
      tone: renewingSoon > 0 ? "warning" : undefined,
    },
    {
      value: highRisk,
      format: intFmt,
      label: "High-risk",
      tone: highRisk > 0 ? "danger" : undefined,
    },
  ];

  return (
    <div
      role="region"
      aria-label="Portfolio summary"
      className="stagger-children"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="glass-strong lift-on-hover"
          style={{
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 300,
              color:
                s.tone === "danger"
                  ? "#dc2626"
                  : s.tone === "warning"
                    ? "#d97706"
                    : "#0f172a",
              lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <CountUp value={s.value} format={s.format} />
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#64748b",
              fontWeight: 600,
              marginTop: 6,
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
