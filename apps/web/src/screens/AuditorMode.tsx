import { useState, useEffect } from "react";
import { Download, Printer, Shield, Clock, Building2, TrendingUp } from "lucide-react";
import { VendorLogo } from "../components/VendorLogo.js";

interface VendorSummary { id: string; name: string; ownerEmail: string; annualSpendUsd: number; changeCount: number; posture: string; }
interface ChangeReport { id: string; vendorId: string; vendorName: string; severity: string; title: string; actor: string; timestamp: string; }
interface ActivityEvent { id: string; kind: string; vendorId: string; vendorName: string; actor: string; timestamp: string; detail: string; }
interface AuditorSession { orgId: string; vendorIds: string[] | null; expiresAt: string; sessionId: string; vendors: VendorSummary[]; changes: ChangeReport[]; activityLog: ActivityEvent[]; }
interface Props { sessionToken: string; }

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

const POSTURE_COLOR: Record<string, string> = { ok: "var(--success)", watch: "var(--warning)", risk: "var(--danger)", stale: "var(--text-muted)" };
const SEV_COLOR: Record<string, string> = { P1: "var(--danger)", P2: "var(--warning)", P3: "var(--text-muted)" };

function Dot({ posture }: { posture: string }) {
  const c = POSTURE_COLOR[posture] ?? "var(--text-muted)";
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: c, fontFamily: "var(--font-mono)" }}>
    <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />
    {posture}
  </span>;
}

function SevBadge({ severity }: { severity: string }) {
  return <span style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", color: SEV_COLOR[severity] ?? "var(--text-muted)", fontWeight: 600 }}>{severity}</span>;
}

const SECTION_LABEL: React.CSSProperties = { fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "var(--space-3)", fontFamily: "var(--font-mono)", display: "block" };
const CARD: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" };
const TH: React.CSSProperties = { padding: "var(--space-2) var(--space-4)", textAlign: "left", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "var(--font-mono)" };

const WATERMARK_ROWS = 12;

export function AuditorMode({ sessionToken }: Props): JSX.Element {
  const [session, setSession] = useState<AuditorSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Auditor Preview — Unsyphn";
    async function load() {
      try {
        const resp = await fetch(`/v1/auditor/sessions/${encodeURIComponent(sessionToken)}`);
        if (resp.status === 401) {
          const body = (await resp.json()) as { error?: { message?: string } };
          setError(body?.error?.message ?? "This auditor link has expired or is invalid.");
          return;
        }
        if (!resp.ok) { setError("Unable to load auditor session. Please contact the sender."); return; }
        setSession((await resp.json()) as AuditorSession);
      } catch { setError("Network error. Please check your connection and try again."); }
      finally { setLoading(false); }
    }
    void load();
  }, [sessionToken]);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }} aria-live="polite"><span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Verifying auditor link...</span></div>;
  if (error || !session) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-3)", background: "var(--bg)", padding: "var(--space-6)" }}>
      <Shield size={40} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
      <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>Auditor link unavailable</h1>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-2)", textAlign: "center", maxWidth: 360 }}>{error ?? "Session unavailable."}</p>
    </div>
  );

  const totalSpend = session.vendors.reduce((s, v) => s + v.annualSpendUsd, 0);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const orgLabel = session.orgId.replace("org_", "").replace(/^\w/, (c) => c.toUpperCase());

  return <>
    <style>{`@media print { .ab { display: none !important; } .aw { opacity: 0.08 !important; } }`}</style>

    {/* Diagonal watermark */}
    <div className="aw" aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50, overflow: "hidden", opacity: 0.14, userSelect: "none" }}>
      {Array.from({ length: WATERMARK_ROWS }).map((_, i) => (
        <span key={i} style={{ position: "absolute", top: `${i * 9 - 4}%`, left: "-10%", width: "120%", fontSize: "clamp(16px,2.5vw,28px)", fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.15em", color: "var(--warning)", transform: "rotate(-25deg)", transformOrigin: "left center", whiteSpace: "nowrap" }}>
          AUDITOR PREVIEW · AUDITOR PREVIEW · AUDITOR PREVIEW
        </span>
      ))}
    </div>

    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: "var(--space-9)", position: "relative", zIndex: 1 }}>
      {/* Banner */}
      <header className="ab" role="banner" style={{ background: "rgba(217,119,6,0.10)", borderBottom: "1px solid rgba(217,119,6,0.25)", padding: "var(--space-3) var(--space-6)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
          <div>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--warning)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>AUDITOR PREVIEW · {session.sessionId} · expires {fmtDate(session.expiresAt)}</span>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-2)" }}>Read-only · Watermark applied to all exports</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Clock size={14} style={{ color: "var(--warning)" }} aria-hidden="true" />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-2)" }}>Link expires {fmtDate(session.expiresAt)}</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-6)" }}>
        {/* Summary card */}
        <section aria-labelledby="bundle-heading" style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ ...CARD, padding: "var(--space-5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <Building2 size={20} style={{ color: "var(--accent)" }} aria-hidden="true" />
              <h1 id="bundle-heading" style={{ fontSize: "var(--text-lg)", fontWeight: 600, fontFamily: "var(--font-display)", margin: 0 }}>Unsyphn — {orgLabel} evidence bundle</h1>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: "var(--space-4)" }}>
              {[["Vendors", session.vendors.length], ["Changes", session.changes.length], ["Events", session.activityLog.length], ["Total Spend", fmtUsd(totalSpend)]].map(([label, value]) => (
                <div key={label as string} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                  <span style={{ fontSize: "var(--text-xl)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{value}</span>
                </div>
              ))}
            </div>
            <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "var(--space-3) 0 0" }}>Generated: {today}</p>
          </div>
        </section>

        {/* Vendors */}
        <section aria-labelledby="vendors-heading" style={{ marginBottom: "var(--space-6)" }}>
          <span id="vendors-heading" role="heading" aria-level={2} style={SECTION_LABEL}>Vendors</span>
          <div style={{ ...CARD, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }} aria-labelledby="vendors-heading">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                  {["Vendor", "Owner", "Spend", "Changes", "Posture"].map((h) => <th key={h} scope="col" style={TH}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {session.vendors.map((v, i) => (
                  <tr key={v.id} style={{ borderBottom: i < session.vendors.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <VendorLogo name={v.name} size={28} />
                        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{v.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-2)" }}>{v.ownerEmail}</td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>{fmtUsd(v.annualSpendUsd)}</td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>{v.changeCount}</td>
                    <td style={{ padding: "var(--space-3) var(--space-4)" }}><Dot posture={v.posture} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Change chronology */}
        {session.changes.length > 0 && (
          <section aria-labelledby="changes-heading" style={{ marginBottom: "var(--space-6)" }}>
            <span id="changes-heading" role="heading" aria-level={2} style={SECTION_LABEL}>Change Chronology</span>
            <div style={{ ...CARD, padding: "var(--space-4)" }}>
              <ol aria-labelledby="changes-heading" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {session.changes.map((ch, i) => (
                  <li key={ch.id} style={{ display: "flex", gap: "var(--space-4)", paddingBottom: i < session.changes.length - 1 ? "var(--space-4)" : 0, marginBottom: i < session.changes.length - 1 ? "var(--space-4)" : 0, borderBottom: i < session.changes.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ flexShrink: 0, paddingTop: 2 }}><VendorLogo name={ch.vendorName} size={28} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{ch.title}</span>
                        <SevBadge severity={ch.severity} />
                      </div>
                      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: 2 }}>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{ch.vendorName}</span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{fmtDate(ch.timestamp)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* Activity log */}
        {session.activityLog.length > 0 && (
          <section aria-labelledby="activity-heading" style={{ marginBottom: "var(--space-6)" }}>
            <span id="activity-heading" role="heading" aria-level={2} style={SECTION_LABEL}>Activity Log</span>
            <div style={{ ...CARD, overflow: "hidden" }}>
              <ol aria-labelledby="activity-heading" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {session.activityLog.map((ev, i) => (
                  <li key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)", padding: "var(--space-3) var(--space-4)", borderBottom: i < session.activityLog.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <span style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: "var(--radius-sm)", whiteSpace: "nowrap", flexShrink: 0 }}>{ev.kind}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "var(--text-sm)" }}>{ev.detail}</span>
                      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: 2 }}>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{ev.vendorName}</span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{fmtDate(ev.timestamp)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="ab" style={{ display: "flex", justifyContent: "center", gap: "var(--space-3)", paddingTop: "var(--space-4)" }}>
          <button type="button" onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-5)", fontSize: "var(--text-sm)", fontWeight: 500, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
            <Printer size={14} aria-hidden="true" /> Print this page
          </button>
          <button type="button" onClick={() => { const a = document.createElement("a"); a.href = `data:text/plain,Auditor session ${session.sessionId}`; a.download = `auditor-${session.sessionId}.txt`; a.click(); }} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-5)", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--surface)", background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
            <Download size={14} aria-hidden="true" /> Download PDF
          </button>
        </div>
      </main>

      <footer style={{ maxWidth: 960, margin: "0 auto", padding: "0 var(--space-6) var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--text-muted)" }}>
          <TrendingUp size={12} aria-hidden="true" />
          <span style={{ fontSize: "var(--text-xs)" }}>Total monitored spend: {fmtUsd(totalSpend)} · {session.vendors.length} vendors scoped</span>
        </div>
      </footer>
    </div>
  </>;
}
