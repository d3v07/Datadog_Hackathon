import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Mail, FileText } from "lucide-react";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";

type Tone = "firm" | "friendly" | "aggressive";

interface Draft {
  tone: Tone;
  subject: string;
  body: string;
}

interface PacketData {
  vendorId: string;
  vendorName: string;
  currentSpend: number;
  benchmarkRange: { low: number; high: number };
  usagePct: number;
  recoverableUsd: number;
  drafts: Draft[];
  talkingPoints: string[];
}

interface Props {
  vendorId: string;
  open: boolean;
  onClose: () => void;
}

const TONES: Tone[] = ["firm", "friendly", "aggressive"];

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function Toast({ message }: { message: string }): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--text)",
        color: "var(--surface)",
        padding: "var(--space-2) var(--space-4)",
        borderRadius: "var(--radius-pill)",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
        zIndex: 500,
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}

export function RenegotiationPacket({ vendorId, open, onClose }: Props): JSX.Element | null {
  const [data, setData] = useState<PacketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>("firm");
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setData(null);
    setTone("firm");

    const bearer = localStorage.getItem("unsyphn:bearer") ?? DEMO_BEARER_TOKEN;
    fetch(`/v1/vendors/${encodeURIComponent(vendorId)}/renegotiation-packet`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tone: "firm" }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<PacketData>;
      })
      .then((d) => {
        setData(d);
        const firmDraft = d.drafts.find((dr) => dr.tone === "firm") ?? d.drafts[0];
        if (firmDraft) {
          setEditedSubject(firmDraft.subject);
          setEditedBody(firmDraft.body);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load renegotiation packet. Try again.");
        setLoading(false);
      });
  }, [open, vendorId]);

  useEffect(() => {
    if (!data) return;
    const draft = data.drafts.find((d) => d.tone === tone) ?? data.drafts[0];
    if (draft) {
      setEditedSubject(draft.subject);
      setEditedBody(draft.body);
    }
  }, [tone, data]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled"),
      );
      if (!nodes.length) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string): void {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function copyEmail(): void {
    void navigator.clipboard.writeText(`Subject: ${editedSubject}\n\n${editedBody}`);
    showToast("Copied to clipboard");
  }

  function sendViaGmail(): void {
    const href = `mailto:?subject=${encodeURIComponent(editedSubject)}&body=${encodeURIComponent(editedBody)}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  if (!open) return null;

  const benchmarkSavingsPct = data
    ? Math.round(((data.currentSpend - data.benchmarkRange.high) / data.currentSpend) * 100)
    : 0;

  return createPortal(
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 400 }}
      />
      <div
        ref={(el) => { panelRef.current = el; }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reneg-title"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(560px, 100vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 401,
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-3)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "0 var(--space-5)", height: 56, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <h2 id="reneg-title" style={{ flex: 1, margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text)" }}>
            Renegotiation Packet{data ? ` · ${data.vendorName}` : ""}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close renegotiation packet" className="btn btn-ghost" style={{ width: 36, height: 36, padding: 0 }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {loading && (
            <div aria-live="polite" aria-busy style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
              Building packet...
            </div>
          )}

          {error && <span className="badge badge-danger">{error}</span>}

          {data && (
            <>
              {/* Position summary */}
              <section aria-label="Current position">
                <span style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-2)", marginBottom: "var(--space-2)" }}>
                  Current position
                </span>
                <div style={{ background: "var(--surface-2)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", display: "flex", flexWrap: "wrap", gap: "var(--space-3)", fontSize: "var(--text-sm)" }}>
                  <span>Spend: <strong style={{ fontFamily: "var(--font-mono)" }}>{fmtUsd(data.currentSpend)}/yr</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>·</span>
                  <span>Benchmark: <strong style={{ fontFamily: "var(--font-mono)" }}>{fmtUsd(data.benchmarkRange.low)}–{fmtUsd(data.benchmarkRange.high)}</strong></span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--success)" }}>-{benchmarkSavingsPct}%</span>
                  <span style={{ color: "var(--text-muted)" }}>·</span>
                  <span>Usage: <strong>{data.usagePct}%</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>·</span>
                  <span>Recoverable: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--success)" }}>{fmtUsd(data.recoverableUsd)}</strong></span>
                </div>
              </section>

              {/* Draft email */}
              <section aria-label="Counter-offer email drafts">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-2)" }}>
                    Drafted counter-offer
                  </span>
                  <div role="group" aria-label="Email tone" style={{ display: "flex", gap: "var(--space-1)" }}>
                    {TONES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t)}
                        aria-pressed={tone === t}
                        className={tone === t ? "badge badge-accent" : "badge badge-neutral"}
                        style={{ cursor: "pointer", border: "none", textTransform: "capitalize" }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  <input
                    type="text"
                    aria-label="Email subject"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    style={{ width: "100%", padding: "var(--space-3) var(--space-4)", border: "none", borderBottom: "1px solid var(--border)", fontSize: "var(--text-sm)", fontFamily: "var(--font-text)", color: "var(--text)", background: "var(--surface)", boxSizing: "border-box", outline: "none" }}
                    placeholder="Subject line"
                  />
                  <textarea
                    aria-label="Email body"
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    rows={12}
                    style={{ width: "100%", padding: "var(--space-4)", border: "none", fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)", color: "var(--text-2)", background: "var(--surface)", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6, outline: "none" }}
                  />
                </div>
              </section>

              {/* Talking points */}
              <section aria-label="Talking points">
                <span style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-2)", marginBottom: "var(--space-2)" }}>
                  Talking points
                </span>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {data.talkingPoints.map((pt, i) => (
                    <li key={i} style={{ display: "flex", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-2)", lineHeight: 1.5 }}>
                      <span aria-hidden="true" style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }}>•</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>

        {/* Footer actions */}
        {data && (
          <div style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--border)", flexShrink: 0, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", height: 32, fontSize: "var(--text-xs)" }} onClick={copyEmail}>
              <Copy size={13} aria-hidden="true" /> Copy email
            </button>
            <button type="button" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", height: 32, fontSize: "var(--text-xs)" }} onClick={sendViaGmail}>
              <Mail size={13} aria-hidden="true" /> Send via Gmail
            </button>
            <button type="button" className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", height: 32, fontSize: "var(--text-xs)", marginLeft: "auto" }} onClick={() => alert("PDF export coming soon")}>
              <FileText size={13} aria-hidden="true" /> Export PDF
            </button>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} />}
    </>,
    document.body,
  );
}
