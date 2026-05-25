import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "lucide-react";
import type { Renewal, RenewalStatus } from "@unsyphn/shared";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";
import { VendorLogo } from "../components/VendorLogo.js";
import { RenegotiationPacket } from "../components/RenegotiationPacket.js";

type Window = 30 | 60 | 90 | 365;

interface RenewalsResponse {
  renewals: Renewal[];
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildLead(renewals: Renewal[], days: number): string {
  const total = renewals.length;
  const atRisk = renewals.reduce((s, r) => s + r.annualValueUsd, 0);
  const urgent = renewals.filter((r) => r.daysOut <= 30).length;
  const window = days === 365 ? "all" : `next ${days}d`;
  const parts: string[] = [];
  if (total > 0) parts.push(`${total} in ${window}`);
  if (atRisk > 0) parts.push(`${formatUsd(atRisk)} at-risk value`);
  if (urgent > 0) parts.push(`${urgent} within 30 days`);
  return parts.join(" · ") || "No renewals in this window";
}

// ── Workbench drawer ──────────────────────────────────────────────────────────

interface ChangeBlocker {
  id: string;
  title: string;
  severity: string;
}

interface WorkbenchProps {
  renewal: Renewal;
  onClose: () => void;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function useFocusTrap(
  open: boolean,
  ref: React.RefObject<HTMLDivElement | null>,
  onClose: () => void,
): void {
  const openerEl = { current: null as Element | null };

  useEffect(() => {
    if (open) {
      openerEl.current = document.activeElement;
      const first = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
      first?.focus();
    } else {
      const el = openerEl.current;
      if (el instanceof HTMLElement) el.focus();
      openerEl.current = null;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const panel = ref.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled"),
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, ref, onClose]);
}

function SectionHead({ label }: { label: string }): JSX.Element {
  return (
    <span
      style={{
        display: "block",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "var(--text-2)",
        marginBottom: "var(--space-2)",
      }}
    >
      {label}
    </span>
  );
}

function BenchmarkPanel({ renewal }: { renewal: Renewal }): JSX.Element {
  const delta = renewal.benchmarkDelta;
  const market = renewal.annualValueUsd;
  const you = delta !== null ? Math.round(market * (1 + delta / 100)) : market;
  const color = delta === null ? "var(--text-muted)" : delta > 0 ? "var(--danger)" : "var(--success)";
  const label = delta === null ? "No data" : `${delta > 0 ? "+" : ""}${delta}% vs market`;

  const maxVal = Math.max(you, market) || 1;
  const youPct = Math.round((you / maxVal) * 100);
  const marketPct = Math.round((market / maxVal) * 100);

  return (
    <section aria-labelledby="wb-benchmark">
      <SectionHead label="Benchmark delta" />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "var(--text-xs)",
              color: "var(--text-2)",
              marginBottom: 4,
            }}
          >
            <span>You</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}>{formatUsd(you)}</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "var(--surface-3)",
              overflow: "hidden",
            }}
          >
            <div style={{ height: "100%", width: `${youPct}%`, background: color, borderRadius: 4 }} />
          </div>
        </div>
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "var(--text-xs)",
              color: "var(--text-2)",
              marginBottom: 4,
            }}
          >
            <span>Market</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}>{formatUsd(market)}</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "var(--surface-3)",
              overflow: "hidden",
            }}
          >
            <div style={{ height: "100%", width: `${marketPct}%`, background: "var(--text-muted)", borderRadius: 4 }} />
          </div>
        </div>
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color,
          }}
        >
          {label}
        </span>
      </div>
    </section>
  );
}

function UsagePanel({ renewal }: { renewal: Renewal }): JSX.Element {
  const total = Math.round(renewal.annualValueUsd / 1200);
  const active = Math.round(total * 0.58);
  const unused = total - active;
  const recoverable = Math.round((unused / total) * renewal.annualValueUsd);
  const pct = Math.round((active / Math.max(total, 1)) * 100);

  return (
    <section aria-labelledby="wb-usage">
      <SectionHead label="Usage & waste" />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "var(--text-xs)",
            color: "var(--text-2)",
            marginBottom: 4,
          }}
        >
          <span>{active} of {total} seats active</span>
          <span>{pct}%</span>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: "var(--surface-3)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: pct < 60 ? "var(--warning)" : "var(--success)",
              borderRadius: 4,
            }}
          />
        </div>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
          Recoverable:{" "}
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--success)", fontWeight: 600 }}>
            {formatUsd(recoverable)}
          </span>{" "}
          if you cancel {unused} unused seats
        </p>
      </div>
    </section>
  );
}

function BlockersPanel({ vendorId }: { vendorId: string }): JSX.Element {
  const [blockers, setBlockers] = useState<ChangeBlocker[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/v1/changes/feed?vendorId=${encodeURIComponent(vendorId)}`, {
      headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: ChangeBlocker[] } | null) => {
        if (!cancelled) {
          const items = (d?.items ?? []).filter(
            (i: ChangeBlocker) => i.severity === "P1",
          ) as ChangeBlocker[];
          setBlockers(items);
        }
      })
      .catch(() => {
        if (!cancelled) setBlockers([]);
      });
    return () => { cancelled = true; };
  }, [vendorId]);

  return (
    <section aria-labelledby="wb-blockers">
      <SectionHead label="Legal / Risk blockers" />
      {blockers === null ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Checking…</p>
      ) : blockers.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-sm)",
            color: "var(--success)",
            fontWeight: 500,
          }}
        >
          No blockers. Clear to negotiate.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {blockers.map((b) => (
            <li
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--surface-2)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-sm)",
                color: "var(--text-2)",
              }}
            >
              <AlertCircle size={14} color="var(--danger)" aria-hidden="true" />
              {b.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecommendedPanel({ renewal }: { renewal: Renewal }): JSX.Element {
  const delta = renewal.benchmarkDelta;
  const negotiatePct = delta !== null && delta > 0 ? delta : 22;
  const seatReduction = Math.round((renewal.annualValueUsd / 1200) * 0.42);
  const counterAt = Math.round(renewal.annualValueUsd * (1 - negotiatePct / 100));
  const walkAway = Math.round(renewal.annualValueUsd * 0.85);

  return (
    <section aria-labelledby="wb-recommend">
      <SectionHead label="Recommended action" />
      <p
        style={{
          margin: 0,
          fontSize: "var(--text-sm)",
          color: "var(--text-2)",
          lineHeight: 1.6,
        }}
      >
        Negotiate{" "}
        <span style={{ fontWeight: 600, color: "var(--success)" }}>-{negotiatePct}%</span> with{" "}
        {seatReduction}-seat reduction. Counter at{" "}
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatUsd(counterAt)}</span>.
        Walk-away at{" "}
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatUsd(walkAway)}</span>.
      </p>
    </section>
  );
}


function WorkbenchDrawer({ renewal, onClose }: WorkbenchProps): JSX.Element {
  const panelRef = { current: null as HTMLDivElement | null };
  const open = true;
  const [packetOpen, setPacketOpen] = useState(false);

  useFocusTrap(open, panelRef as React.RefObject<HTMLDivElement | null>, onClose);

  const delta = renewal.benchmarkDelta;
  const deltaColor = delta === null ? "var(--text-muted)" : delta > 0 ? "var(--danger)" : "var(--success)";
  const deltaLabel = delta === null ? null : `${delta > 0 ? "+" : ""}${delta}% vs market`;

  const portal = createPortal(
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.4)",
          zIndex: 300,
        }}
      />
      <div
        ref={(el) => { panelRef.current = el; }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workbench-title"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 301,
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-3)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "0 var(--space-5)",
            height: 56,
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <VendorLogo name={renewal.vendorName} size={28} />
          <h2
            id="workbench-title"
            style={{
              flex: 1,
              margin: 0,
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {renewal.vendorName} — Workbench
          </h2>
          {deltaLabel && (
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: deltaColor,
                fontFamily: "var(--font-mono)",
              }}
            >
              {deltaLabel}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close workbench"
            className="btn btn-ghost"
            style={{ width: 36, height: 36, padding: 0, flexShrink: 0 }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: "var(--space-5)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          <div
            style={{
              background: "var(--surface-2)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-3) var(--space-4)",
              fontSize: "var(--text-sm)",
              color: "var(--text-2)",
            }}
          >
            Renews {formatDate(renewal.renewsAt)} · {renewal.daysOut}d out ·{" "}
            <span style={{ fontFamily: "var(--font-mono)" }}>{formatUsd(renewal.annualValueUsd)}/yr</span>
          </div>

          <BenchmarkPanel renewal={renewal} />
          <UsagePanel renewal={renewal} />
          <BlockersPanel vendorId={renewal.vendorId} />
          <RecommendedPanel renewal={renewal} />
          <section aria-label="Renegotiation packet">
            <span
              style={{
                display: "block",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "var(--text-2)",
                marginBottom: "var(--space-2)",
              }}
            >
              Renegotiation packet
            </span>
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: 32, fontSize: "var(--text-xs)" }}
              onClick={() => setPacketOpen(true)}
            >
              Open Renegotiation Packet
            </button>
          </section>
        </div>
      </div>
    </>,
    document.body,
  );

  return (
    <>
      {portal}
      <RenegotiationPacket
        vendorId={renewal.vendorId}
        open={packetOpen}
        onClose={() => setPacketOpen(false)}
      />
    </>
  );
}

// ── Kanban card ───────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<RenewalStatus, string> = {
  triage: "badge badge-warning",
  negotiate: "badge badge-accent",
  sign: "badge badge-success",
};

interface CardProps {
  renewal: Renewal;
  onOpen: (r: Renewal) => void;
}

function RenewalCard({ renewal, onOpen }: CardProps): JSX.Element {
  const delta = renewal.benchmarkDelta;
  const deltaColor =
    delta === null ? "var(--text-muted)" : delta > 0 ? "var(--danger)" : "var(--success)";
  const deltaLabel =
    delta === null ? "+0% vs market" : `${delta > 0 ? "+" : ""}${delta}% vs market`;

  const initials = renewal.ownerEmail.charAt(0).toUpperCase();

  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <VendorLogo name={renewal.vendorName} size={24} />
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--text)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {renewal.vendorName}
        </span>
        <span className={STATUS_BADGE[renewal.status]} style={{ fontSize: "var(--text-xs)" }}>
          {renewal.status}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: "var(--text-xs)",
          color: "var(--text-2)",
        }}
      >
        Renews in {renewal.daysOut}d · {formatDate(renewal.renewsAt)}
      </p>

      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--text)",
        }}
      >
        {formatUsd(renewal.annualValueUsd)}
      </p>

      <p
        style={{
          margin: 0,
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          color: deltaColor,
        }}
      >
        {deltaLabel}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "var(--space-1)",
        }}
      >
        <span
          aria-label={`Owner: ${renewal.ownerEmail}`}
          title={renewal.ownerEmail}
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-full)",
            background: "var(--accent-soft)",
            border: "1px solid var(--border)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: "var(--accent)",
            flexShrink: 0,
          }}
        >
          {initials}
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ height: 28, fontSize: "var(--text-xs)" }}
          onClick={() => onOpen(renewal)}
        >
          Open
        </button>
      </div>
    </article>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

const COLUMN_LABELS: Record<RenewalStatus, string> = {
  triage: "Triage",
  negotiate: "Negotiate",
  sign: "Sign",
};

const COLUMNS: RenewalStatus[] = ["triage", "negotiate", "sign"];

interface ColumnProps {
  status: RenewalStatus;
  renewals: Renewal[];
  onOpen: (r: Renewal) => void;
}

function KanbanColumn({ status, renewals, onOpen }: ColumnProps): JSX.Element {
  return (
    <section
      aria-label={`${COLUMN_LABELS[status]} column`}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          paddingBottom: "var(--space-2)",
          borderBottom: "2px solid var(--border)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-2)",
          }}
        >
          {COLUMN_LABELS[status]}
        </h2>
        {renewals.length > 0 && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            {renewals.length}
          </span>
        )}
      </div>

      {renewals.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            textAlign: "center",
            paddingTop: "var(--space-4)",
          }}
        >
          None
        </p>
      ) : (
        renewals.map((r) => <RenewalCard key={r.id} renewal={r} onOpen={onOpen} />)
      )}
    </section>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

const TIME_CHIPS: Array<{ label: string; days: Window }> = [
  { label: "Next 30d", days: 30 },
  { label: "Next 60d", days: 60 },
  { label: "Next 90d", days: 90 },
  { label: "All", days: 365 },
];

export function Renewals(): JSX.Element {
  const [days, setDays] = useState<Window>(90);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Renewal | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const bearer = localStorage.getItem("unsyphn:bearer") ?? DEMO_BEARER_TOKEN;
    fetch(`/v1/renewals?days=${days}`, { headers: { Authorization: `Bearer ${bearer}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: RenewalsResponse) => { if (!cancelled) { setRenewals(d.renewals); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError("Couldn't load renewals."); setLoading(false); } });

    return () => { cancelled = true; };
  }, [days]);

  const byStatus = (status: RenewalStatus): Renewal[] =>
    renewals.filter((r) => r.status === status).sort((a, b) => a.daysOut - b.daysOut);

  return (
    <main
      className="page"
      style={{ padding: "var(--space-7) var(--space-6)", maxWidth: 1100, margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <h1 className="h1" style={{ marginBottom: "var(--space-2)" }}>Renewals</h1>
        {!loading && !error && (
          <p className="lead" style={{ margin: 0 }}>
            {buildLead(renewals, days)}
          </p>
        )}
      </div>

      {/* Time window chips */}
      <div
        role="group"
        aria-label="Time window"
        style={{
          display: "flex",
          gap: "var(--space-2)",
          marginBottom: "var(--space-6)",
          flexWrap: "wrap",
        }}
      >
        {TIME_CHIPS.map(({ label, days: d }) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={days === d ? "badge badge-accent" : "badge badge-neutral"}
            style={{ cursor: "pointer", border: "none" }}
            aria-pressed={days === d}
          >
            {label}
          </button>
        ))}
      </div>

      {/* States */}
      {loading && (
        <div
          aria-live="polite"
          aria-busy={true}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-5)",
          }}
        >
          {COLUMNS.map((col) => (
            <div key={col} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div
                style={{
                  height: 20,
                  borderRadius: 4,
                  background: "var(--surface-3)",
                  width: 80,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              {[1, 2].map((i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  style={{
                    height: 120,
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-2)",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: "var(--space-4)" }}>
          <span className="badge badge-danger">{error}</span>
        </div>
      )}

      {!loading && !error && renewals.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-9)",
            color: "var(--text-2)",
            fontSize: "var(--text-sm)",
          }}
        >
          No renewals found in this window.
        </div>
      )}

      {/* Kanban board */}
      {!loading && !error && renewals.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-5)",
            alignItems: "start",
          }}
        >
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col}
              status={col}
              renewals={byStatus(col)}
              onOpen={setSelected}
            />
          ))}
        </div>
      )}

      {/* Workbench drawer */}
      {selected && <WorkbenchDrawer renewal={selected} onClose={() => setSelected(null)} />}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </main>
  );
}
