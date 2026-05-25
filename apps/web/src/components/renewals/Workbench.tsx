import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Renewal } from "@unsyphn/shared";
import { VendorLogo } from "../VendorLogo.js";
import { RenegotiationPacket } from "../RenegotiationPacket.js";
import { BlockersPanel } from "./BlockersPanel.js";

interface WorkbenchProps {
  renewal: Renewal;
  onClose: () => void;
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function useFocusTrap(
  open: boolean,
  ref: React.RefObject<HTMLDivElement | null>,
  onClose: () => void,
): void {
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      const first = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
      first?.focus();
    } else {
      const el = openerRef.current;
      if (el instanceof HTMLElement) el.focus();
      openerRef.current = null;
    }
  }, [open, ref]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
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
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
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
            <div
              style={{
                height: "100%",
                width: `${marketPct}%`,
                background: "var(--text-muted)",
                borderRadius: 4,
              }}
            />
          </div>
        </div>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color }}>{label}</span>
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
          <span>
            {active} of {total} seats active
          </span>
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

function RecommendedPanel({ renewal }: { renewal: Renewal }): JSX.Element {
  const delta = renewal.benchmarkDelta;
  const negotiatePct = delta !== null && delta > 0 ? delta : 22;
  const seatReduction = Math.round((renewal.annualValueUsd / 1200) * 0.42);
  const counterAt = Math.round(renewal.annualValueUsd * (1 - negotiatePct / 100));
  const walkAway = Math.round(renewal.annualValueUsd * 0.85);

  return (
    <section aria-labelledby="wb-recommend">
      <SectionHead label="Recommended action" />
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-2)", lineHeight: 1.6 }}>
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

export function Workbench({ renewal, onClose }: WorkbenchProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [packetOpen, setPacketOpen] = useState(false);

  useFocusTrap(true, panelRef, onClose);

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
        ref={panelRef}
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
            className="btn btn-ghost button-pop"
            style={{ width: 36, height: 36, padding: 0, flexShrink: 0 }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

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
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {formatUsd(renewal.annualValueUsd)}/yr
            </span>
          </div>

          <BenchmarkPanel renewal={renewal} />
          <UsagePanel renewal={renewal} />
          <BlockersPanel vendorId={renewal.vendorId} />
          <RecommendedPanel renewal={renewal} />
          <section aria-label="Renegotiation packet">
            <SectionHead label="Renegotiation packet" />
            <button
              type="button"
              className="btn btn-primary button-pop"
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
