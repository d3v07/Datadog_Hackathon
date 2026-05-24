import { useEffect, useState } from "react";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";

interface DashboardSummary {
  vendorCount: number;
  annualRunRateUsd: number;
  openChangeCount: number;
}

interface StatItem {
  value: string;
  label: string;
}

const CHANGES_THIS_WEEK = 12;

function formatArr(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}k`;
  return `$${usd}`;
}

export function FleetStats(): JSX.Element {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    fetch("/v1/dashboard/summary", {
      headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<DashboardSummary>;
      })
      .then(setSummary)
      .catch((err: unknown) => {
        setFetchFailed(true);
        if (err instanceof Error) console.error("FleetStats fetch failed:", err.message);
      });
  }, []);

  const stats: StatItem[] = summary
    ? [
        { value: String(summary.vendorCount), label: "Vendors" },
        { value: String(CHANGES_THIS_WEEK), label: "Changes this week" },
        { value: String(summary.openChangeCount), label: "Open P1" },
        { value: formatArr(summary.annualRunRateUsd), label: "ARR monitored" },
      ]
    : [
        { value: "—", label: "Vendors" },
        { value: "—", label: "Changes this week" },
        { value: "—", label: "Open P1" },
        { value: "—", label: "ARR monitored" },
      ];

  return (
    <div
      role="region"
      aria-label="Fleet statistics"
      style={{ display: "flex", gap: "var(--space-7)", alignItems: "center", flexWrap: "wrap" }}
    >
      {fetchFailed && (
        <span className="badge badge-danger" style={{ marginRight: "var(--space-3)" }}>
          Stats unavailable
        </span>
      )}
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}
        >
          {i > 0 && (
            <span
              aria-hidden="true"
              style={{
                color: "var(--border-strong)",
                marginRight: "var(--space-7)",
                fontSize: "var(--text-lg)",
              }}
            >
              ·
            </span>
          )}
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 200,
              fontSize: "1.875rem",
              color: "var(--text-strong)",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {stat.value}
          </span>
          <span
            style={{
              fontFamily: "var(--font-text)",
              fontWeight: 400,
              fontSize: "var(--text-xs)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--text-2)",
            }}
          >
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
