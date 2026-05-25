import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Mail } from "lucide-react";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";

interface SubProcessor {
  name: string;
  jurisdiction: string;
  purpose: string;
  adequate: boolean;
  addedAt: string;
  flagged?: boolean;
  flagReason?: string;
}

interface CustomerNotification {
  customerName: string;
  contractId: string;
  domain: string;
  ourObligation: string;
  affectedSubProcessor: string;
  notifyByDate: string;
  suggestedAction: string;
}

interface SubProcessorData {
  vendorId: string;
  vendorName: string;
  subProcessors: SubProcessor[];
  lastChangeAt: string;
  flaggedCount: number;
  customerNotifications: CustomerNotification[];
}

const ADEQUATE_JURISDICTIONS = new Set(["US", "EU", "EEA", "UK", "CH", "CA", "JP", "AU", "NZ", "KR", "IL", "AR", "UY"]);

const JURISDICTION_LABELS: Record<string, string> = {
  US: "United States",
  EU: "European Union",
  UK: "United Kingdom",
  CH: "Switzerland",
  CA: "Canada",
  IN: "India",
  CN: "China",
  BR: "Brazil",
  JP: "Japan",
  AU: "Australia",
  SG: "Singapore",
  ZA: "South Africa",
  RU: "Russia",
  MX: "Mexico",
  KR: "South Korea",
};

function relTime(iso: string): string {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  return m === 1 ? "1mo ago" : `${m}mo ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

function groupByJurisdiction(sps: SubProcessor[]): Map<string, SubProcessor[]> {
  const map = new Map<string, SubProcessor[]>();
  for (const sp of sps) {
    const key = sp.jurisdiction;
    const existing = map.get(key);
    if (existing) {
      existing.push(sp);
    } else {
      map.set(key, [sp]);
    }
  }
  return map;
}

function JurisdictionGrid({ subProcessors }: { subProcessors: SubProcessor[] }): JSX.Element {
  const grouped = groupByJurisdiction(subProcessors);
  const entries = Array.from(grouped.entries()).sort((a, b) => {
    const aAdequate = ADEQUATE_JURISDICTIONS.has(a[0]);
    const bAdequate = ADEQUATE_JURISDICTIONS.has(b[0]);
    if (aAdequate && !bAdequate) return -1;
    if (!aAdequate && bAdequate) return 1;
    return b[1].length - a[1].length;
  });

  return (
    <div
      role="table"
      aria-label="Sub-processor jurisdiction map"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
    >
      <div role="rowgroup">
        {entries.map(([jurisdiction, sps]) => {
          const adequate = ADEQUATE_JURISDICTIONS.has(jurisdiction);
          const hasFlagged = sps.some((sp) => sp.flagged);
          const label = JURISDICTION_LABELS[jurisdiction] ?? jurisdiction;

          return (
            <div
              key={jurisdiction}
              role="row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                background: hasFlagged ? "rgba(220,38,38,0.06)" : "transparent",
                marginBottom: "var(--space-1)",
              }}
            >
              <span role="cell" style={{ width: 32, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-2)", flexShrink: 0 }}>
                {jurisdiction}
              </span>
              <span role="cell" style={{ flex: 1, fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
                {label}
              </span>
              <span role="cell" style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                {sps.map((sp, i) =>
                  sp.flagged ? (
                    <span
                      key={i}
                      aria-label={`Non-adequate: ${sp.name}`}
                      title={`Non-adequate: ${sp.name}`}
                      style={{ color: "var(--danger)", fontSize: 14, lineHeight: 1 }}
                    >
                      ▲
                    </span>
                  ) : (
                    <span
                      key={i}
                      aria-label={`Adequate: ${sp.name}`}
                      title={`Adequate: ${sp.name}`}
                      style={{ color: "var(--success)", fontSize: 14, lineHeight: 1 }}
                    >
                      ●
                    </span>
                  )
                )}
              </span>
              <span role="cell" style={{ width: 80, textAlign: "right", flexShrink: 0 }}>
                {adequate && !hasFlagged ? (
                  <span className="badge badge-success" style={{ fontSize: 10 }}>adequate</span>
                ) : (
                  <span className="badge badge-danger" style={{ fontSize: 10 }}>flagged</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "var(--space-4)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--border)", marginTop: "var(--space-1)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          <span style={{ color: "var(--success)" }}>●</span> adequate (EU/EEA/UK/CH/US/JP/AU)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          <span style={{ color: "var(--danger)" }}>▲</span> non-adequate (flagged)
        </span>
      </div>
    </div>
  );
}

function buildMailtoHref(notifications: CustomerNotification[], vendorName: string): string {
  const to = notifications.map((n) => n.domain).join(",");
  const subject = encodeURIComponent(`[Action Required] Sub-processor change notification — ${vendorName}`);
  const firstNotify = notifications[0];
  const spName = firstNotify?.affectedSubProcessor ?? "a sub-processor";
  const notifyBy = firstNotify?.notifyByDate ?? "";
  const body = encodeURIComponent(
    `Dear Customer,\n\nPursuant to our Data Processing Agreement, we are notifying you that ${vendorName} has added ${spName} as a sub-processor. This processor operates in a jurisdiction that may require your acknowledgment under your DPA with us.\n\nRequired notification deadline: ${notifyBy}\n\nPlease review and acknowledge receipt of this notice. Contact us if you have questions.\n\nBest regards,\nCompliance Team`
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function SubprocessorHeatmap({ vendorId }: { vendorId: string }): JSX.Element {
  const [data, setData] = useState<SubProcessorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/v1/vendors/${encodeURIComponent(vendorId)}/sub-processors`, {
      headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SubProcessorData>;
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load sub-processor data.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [vendorId]);

  if (loading) {
    return (
      <div style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }} aria-live="polite" aria-busy>
        Loading sub-processors...
      </div>
    );
  }

  if (error || !data) {
    return <span className="badge badge-danger">{error ?? "No data available."}</span>;
  }

  const jurisdictionCount = new Set(data.subProcessors.map((sp) => sp.jurisdiction)).size;
  const hasFlagged = data.flaggedCount > 0;

  return (
    <section aria-label="Sub-processor heatmap" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Sub-processors · {data.vendorName}
          </h2>
          <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
            {data.subProcessors.length} sub-processor{data.subProcessors.length !== 1 ? "s" : ""} across {jurisdictionCount} jurisdiction{jurisdictionCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--text-muted)", flexShrink: 0 }}>
          <Clock size={12} aria-hidden="true" />
          Last changed {relTime(data.lastChangeAt)}
        </div>
      </div>

      {/* Flagged banner */}
      {hasFlagged && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <AlertTriangle size={16} aria-hidden="true" style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong style={{ fontSize: "var(--text-sm)", color: "var(--danger)" }}>
              {data.flaggedCount} non-adequate jurisdiction{data.flaggedCount !== 1 ? "s" : ""} detected
            </strong>
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-xs)", color: "var(--text-2)" }}>
              Sub-processors in non-adequate jurisdictions may trigger customer DPA notification obligations. Review required.
            </p>
          </div>
        </div>
      )}

      {/* Jurisdiction heatmap */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <h3 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Jurisdiction heatmap
        </h3>
        <JurisdictionGrid subProcessors={data.subProcessors} />
      </div>

      {/* Sub-processor list */}
      <div>
        <h3 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Sub-processor list
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {data.subProcessors.map((sp) => (
            <div
              key={sp.name}
              style={{
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: sp.flagged ? "1px solid rgba(220,38,38,0.3)" : "1px solid var(--border)",
                background: sp.flagged ? "rgba(220,38,38,0.05)" : "var(--surface)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                {sp.flagged ? (
                  <span aria-hidden="true" style={{ color: "var(--danger)", fontSize: 14 }}>▲</span>
                ) : (
                  <CheckCircle size={14} aria-hidden="true" style={{ color: "var(--success)", flexShrink: 0 }} />
                )}
                <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text)", flex: 1 }}>{sp.name}</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    color: sp.flagged ? "var(--danger)" : "var(--text-2)",
                    fontWeight: sp.flagged ? 600 : 400,
                  }}
                >
                  {sp.jurisdiction}
                </span>
              </div>
              <div style={{ paddingLeft: "var(--space-5)", fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <span>{sp.purpose}</span>
                <span>Active since {formatDate(sp.addedAt)}</span>
              </div>
              {sp.flagged && sp.flagReason && (
                <div
                  style={{
                    paddingLeft: "var(--space-5)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-2)",
                    marginTop: "var(--space-1)",
                  }}
                >
                  <AlertTriangle size={12} aria-hidden="true" style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)", lineHeight: 1.4 }}>
                    {sp.flagReason}. Action required.
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Customer commitments cross-reference */}
      {hasFlagged && data.customerNotifications.length > 0 && (
        <div className="card" style={{ padding: "var(--space-4)", border: "1px solid rgba(220,38,38,0.25)" }}>
          <h3 style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Customer commitments cross-reference
          </h3>
          <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
            Your DPA obligations triggered:
            <strong style={{ color: "var(--danger)" }}> {data.customerNotifications.length} of your customer contracts require 30-day notice</strong>
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            {data.customerNotifications.map((n) => (
              <div
                key={n.contractId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)", minWidth: 120 }}>
                  {n.customerName}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  {n.contractId}
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-2)" }}>{n.domain}</span>
                <span style={{ marginLeft: "auto", fontSize: "var(--text-xs)", color: "var(--danger)", fontWeight: 500, whiteSpace: "nowrap" }}>
                  notify by{" "}
                  {new Date(n.notifyByDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            ))}
          </div>

          <a
            href={buildMailtoHref(data.customerNotifications, data.vendorName)}
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
            aria-label={`Draft ${data.customerNotifications.length} customer notice email${data.customerNotifications.length !== 1 ? "s" : ""}`}
          >
            <Mail size={14} aria-hidden="true" />
            Draft {data.customerNotifications.length} customer notice email{data.customerNotifications.length !== 1 ? "s" : ""}
          </a>
        </div>
      )}
    </section>
  );
}
