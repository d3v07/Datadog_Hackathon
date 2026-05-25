import { useId, useState } from "react";

// ROI formula — calibrated: 500 employees -> ~291 apps. Numbers held constant
// with the original Pricing.tsx so the ROI story doesn't shift mid-demo.
const AVG_APPS_PER_EMP = 0.582;
const WASTE_RATE = 0.51;
const AVG_SEAT_COST_MO = 22;
const GROWTH_PRICE_MO = 1500;

function calcRoi(n: number) {
  const annualWaste = n * AVG_APPS_PER_EMP * 12 * AVG_SEAT_COST_MO * WASTE_RATE;
  const recoverableQ1 = annualWaste * 0.25 * 0.6;
  const annualRecoverable = recoverableQ1 * 4;
  const paybackWeeks =
    recoverableQ1 > 0 ? ((GROWTH_PRICE_MO * 12) / recoverableQ1) * 52 : 0;
  return { annualWaste, recoverableQ1, annualRecoverable, paybackWeeks };
}

const fmt = (n: number): string =>
  "$" + Math.round(n).toLocaleString("en-US");

const S = {
  section: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "0 var(--space-5) var(--space-7)",
  } as React.CSSProperties,
  h2: {
    fontFamily: "var(--font-display)",
    color: "var(--text-strong)",
    marginBottom: "var(--space-4)",
  } as React.CSSProperties,
  sm: { fontSize: "var(--text-sm)", color: "var(--text-2)" } as React.CSSProperties,
  xs: { fontSize: "var(--text-xs)", color: "var(--text-muted)" } as React.CSSProperties,
  mono500: { fontFamily: "var(--font-mono)", fontWeight: 500 } as React.CSSProperties,
} as const;

export function PricingRoi(): JSX.Element {
  const [employees, setEmployees] = useState(500);
  const sliderId = useId();
  const roi = calcRoi(employees);
  // Cap visual progress at $1M so the bar gives a useful sense of scale.
  const SAVINGS_CAP = 1_000_000;
  const barPct = Math.min(100, (roi.annualRecoverable / SAVINGS_CAP) * 100);

  return (
    <section aria-label="ROI calculator" style={S.section}>
      <div className="card" style={{ padding: "var(--space-6)" }}>
        <h2 className="h2" style={{ ...S.h2, marginBottom: "var(--space-5)" }}>
          ROI calculator
        </h2>
        <div style={{ marginBottom: "var(--space-5)" }}>
          <label
            htmlFor={sliderId}
            style={{ display: "flex", justifyContent: "space-between", ...S.sm, marginBottom: "var(--space-2)" }}
          >
            <span>Employee count</span>
            <span style={{ ...S.mono500, color: "var(--text-strong)" }}>
              {employees.toLocaleString("en-US")}
            </span>
          </label>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={5000}
            step={50}
            value={employees}
            onChange={(e) => setEmployees(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent)" }}
            aria-label="Number of employees"
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              ...S.xs,
              marginTop: "var(--space-1)",
            }}
          >
            <span>0</span>
            <span>5,000</span>
          </div>
        </div>
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--space-4)",
            marginBottom: "var(--space-5)",
          }}
        >
          <RoiStat
            label="Avg SaaS apps"
            value={Math.round(employees * AVG_APPS_PER_EMP).toLocaleString("en-US")}
          />
          <RoiStat label="Annual waste" value={fmt(roi.annualWaste)} />
          <RoiStat label="Recoverable in Q1" value={fmt(roi.recoverableQ1)} />
          <RoiStat
            label="Payback on Growth tier"
            value={roi.paybackWeeks > 0 ? `${Math.round(roi.paybackWeeks)} weeks` : "—"}
          />
        </div>

        {/* Annual savings bar */}
        <div aria-live="polite" style={{ marginBottom: "var(--space-5)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              ...S.sm,
              marginBottom: "var(--space-2)",
            }}
          >
            <span>Projected annual savings</span>
            <span style={{ ...S.mono500, color: "var(--success)" }}>
              {fmt(roi.annualRecoverable)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(roi.annualRecoverable)}
            aria-valuemin={0}
            aria-valuemax={SAVINGS_CAP}
            aria-label="Projected annual savings"
            style={{
              height: 8,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${barPct}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, var(--accent) 0%, var(--success) 100%)",
                transition: "width 200ms",
              }}
            />
          </div>
        </div>

        <a
          href="mailto:deals@unsyphn.com?subject=Talk%20to%20a%20deal%20expert"
          className="btn btn-secondary"
          style={{ justifyContent: "center" }}
        >
          Talk to a deal expert
        </a>
      </div>
    </section>
  );
}

interface RoiStatProps {
  label: string;
  value: string;
}

function RoiStat({ label, value }: RoiStatProps): JSX.Element {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
      }}
    >
      <div
        style={{
          ...S.xs,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "var(--space-1)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...S.mono500,
          fontSize: "var(--text-xl)",
          color: "var(--text-strong)",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
    </div>
  );
}
