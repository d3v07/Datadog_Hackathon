import { Lightbulb } from "lucide-react";
import type { Vendor } from "@unsyphn/shared";
import { fmtUsd, hashSeed } from "./utils.js";

interface Props {
  vendor: Vendor;
  onOpenPacket: () => void;
}

// Per-seat benchmark by category, USD/year. Numbers picked from publicly
// available pricing pages where possible, otherwise a category midpoint.
const BENCHMARK_PER_SEAT: Record<string, number> = {
  productivity: 96,
  observability: 1200,
  payments: 0,
  security: 120,
  developer: 240,
  design: 180,
  collaboration: 100,
  crm: 1500,
  hr: 84,
  finance: 240,
  uncategorized: 200,
};

function lastTwelveMonths(): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  return out;
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }): JSX.Element {
  return (
    <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "var(--text-2xl)", color: "var(--text)", lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-2)" }}>{sub}</span>}
    </div>
  );
}

function Head({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <h2 style={{ margin: "0 0 var(--space-3) 0", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </h2>
  );
}

export function SpendTab({ vendor, onOpenPacket }: Props): JSX.Element {
  const seatCount = vendor.contract?.seatCount ?? 0;
  const annualSpend = vendor.contract?.annualSpendUsd ?? 0;
  const perSeat = seatCount > 0 ? Math.round(annualSpend / seatCount) : 0;

  // Deterministic synthetic utilization and monthly jitter from vendor id.
  const rand = hashSeed(vendor.id);
  const utilizationPct = 40 + Math.floor(rand() * 56); // 40-95
  const activeSeats = Math.round((seatCount * utilizationPct) / 100);

  const months = lastTwelveMonths();
  const monthlyBase = annualSpend / 12;
  const monthlyValues = months.map(() => {
    const jitter = 0.85 + rand() * 0.3; // 0.85 - 1.15
    return monthlyBase * jitter;
  });
  const maxMonthly = Math.max(...monthlyValues, 1);

  const benchmark = BENCHMARK_PER_SEAT[vendor.category ?? "uncategorized"] ?? BENCHMARK_PER_SEAT["uncategorized"]!;
  const aboveBenchmark = benchmark > 0 && perSeat > benchmark;
  const benchmarkDelta = benchmark > 0 ? Math.round(((perSeat - benchmark) / benchmark) * 100) : 0;

  const unused = Math.max(0, seatCount - activeSeats);
  const recoverable = seatCount > 0 ? unused * perSeat : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "var(--space-3)" }}>
        <Tile label="Annual spend" value={fmtUsd(annualSpend)} />
        <Tile label="Per-seat cost" value={`$${perSeat.toLocaleString()}`} sub="per year" />
        <Tile label="Active seats" value={seatCount > 0 ? `${activeSeats} / ${seatCount}` : "—"} sub={seatCount > 0 ? `${utilizationPct}% utilization` : undefined} />
        <Tile label="Benchmark" value={benchmark > 0 ? `$${benchmark.toLocaleString()}` : "—"} sub={benchmark > 0 ? "industry per seat / yr" : undefined} />
      </div>

      <div>
        <Head>Monthly spend · last 12 months</Head>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <svg
            role="img"
            aria-label={`Monthly spend chart for ${vendor.name}, last 12 months`}
            viewBox="0 0 640 200"
            preserveAspectRatio="none"
            style={{ width: "100%", height: 200, display: "block" }}
          >
            {monthlyValues.map((v, i) => {
              const bw = 640 / months.length - 8;
              const x = i * (640 / months.length) + 4;
              const h = (v / maxMonthly) * 160;
              const y = 170 - h;
              return (
                <g key={months[i]!.key}>
                  <rect x={x} y={y} width={bw} height={h} rx={3} fill="var(--accent)" opacity={0.85}>
                    <title>{`${months[i]!.label}: ${fmtUsd(Math.round(v))}`}</title>
                  </rect>
                  <text x={x + bw / 2} y={192} fontSize={10} textAnchor="middle" fill="var(--text-muted)">
                    {months[i]!.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {seatCount > 0 && (
        <div>
          <Head>Seat utilization</Head>
          <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>
                {activeSeats} of {seatCount} seats active
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-2)" }}>{utilizationPct}%</span>
            </div>
            <div style={{ height: 8, background: "var(--surface-2)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${utilizationPct}%`,
                  background: utilizationPct < 50 ? "var(--warning)" : "var(--success)",
                  borderRadius: "var(--radius-full)",
                }}
              />
            </div>
            {recoverable > 0 && (
              <span className="badge badge-warning" style={{ alignSelf: "flex-start" }}>
                Recoverable from {unused} unused seats: {fmtUsd(recoverable)}/yr
              </span>
            )}
          </div>
        </div>
      )}

      {aboveBenchmark && (
        <div className="card" style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)", borderColor: "var(--warning)" }}>
          <Lightbulb size={18} aria-hidden="true" style={{ color: "var(--warning)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "var(--text-sm)" }}>
              {benchmarkDelta}% above industry benchmark
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-2)" }}>
              You pay ${perSeat.toLocaleString()}/seat vs benchmark ${benchmark.toLocaleString()}. Consider renegotiation.
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={onOpenPacket} style={{ fontSize: "var(--text-xs)" }}>
            Build packet
          </button>
        </div>
      )}
    </div>
  );
}
