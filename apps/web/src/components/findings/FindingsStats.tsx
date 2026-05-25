import type { Finding, FindingType } from "../../lib/api.js";
import { CountUp } from "../CountUp.js";

const TYPE_LABELS: Record<FindingType, string> = {
  change: "Change",
  compliance: "Compliance",
  subprocessor: "Sub-processor",
  spend: "Spend",
  security: "Security",
};

interface Props {
  findings: ReadonlyArray<Finding>;
}

const intFmt = (n: number): string => Math.round(n).toString();

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }): JSX.Element {
  return (
    <div
      className="card glass-strong lift-on-hover"
      style={{
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 130,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xl)",
          fontWeight: 600,
          color: accent ? "var(--danger)" : "var(--text-strong)",
          lineHeight: 1.1,
        }}
      >
        <CountUp value={value} format={intFmt} />
      </span>
    </div>
  );
}

export function FindingsStats({ findings }: Props): JSX.Element {
  const open = findings.filter((f) => f.state !== "resolved");
  const p1 = findings.filter((f) => f.severity === "P1" && f.state !== "resolved").length;

  const byType: Record<FindingType, number> = {
    change: 0,
    compliance: 0,
    subprocessor: 0,
    spend: 0,
    security: 0,
  };
  for (const f of open) byType[f.type] += 1;

  return (
    <div
      role="region"
      aria-label="Findings overview"
      className="stagger-children"
      style={{
        display: "flex",
        gap: "var(--space-3)",
        marginBottom: "var(--space-5)",
        flexWrap: "wrap",
      }}
    >
      <Stat label="Open findings" value={open.length} />
      <Stat label="P1 critical" value={p1} accent={p1 > 0} />
      {(Object.entries(byType) as Array<[FindingType, number]>).map(([type, count]) => (
        <Stat key={type} label={TYPE_LABELS[type]} value={count} />
      ))}
    </div>
  );
}
