import { Drawer } from "../Drawer.js";
import type { RenegotiationPacket } from "../../lib/api.js";
import { fmtUsd } from "./types.js";
import { CheckCircle2, AlertTriangle, Loader2, ExternalLink } from "lucide-react";

export type PacketResult =
  | { status: "pending"; vendorId: string; vendorName: string }
  | { status: "ok"; vendorId: string; packet: RenegotiationPacket }
  | { status: "error"; vendorId: string; vendorName: string; error: string };

interface Props {
  open: boolean;
  onClose: () => void;
  results: ReadonlyArray<PacketResult>;
}

export function RenegotiationResultsDrawer({ open, onClose, results }: Props): JSX.Element {
  const totalRecoverable = results.reduce(
    (sum, r) => (r.status === "ok" ? sum + r.packet.recoverableUsd : sum),
    0,
  );
  const completed = results.filter((r) => r.status !== "pending").length;
  const successes = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error").length;
  const total = results.length;

  return (
    <Drawer open={open} onClose={onClose} title="Renegotiation packets">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            padding: 12,
            background: "#f8fafc",
            borderRadius: 8,
            border: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          <Stat label="Progress" value={`${completed}/${total}`} />
          <Stat label="Errors" value={String(errors)} valueColor={errors > 0 ? "#dc2626" : undefined} />
          <Stat label="Recoverable" value={fmtUsd(totalRecoverable)} />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {results.map((r) => (
            <div
              key={r.vendorId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,0.08)",
                borderRadius: 8,
              }}
            >
              <StatusIcon status={r.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>
                  {r.status === "ok" ? r.packet.vendorName : r.vendorName}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {r.status === "pending" && "Generating packet..."}
                  {r.status === "ok" &&
                    `${fmtUsd(r.packet.recoverableUsd)} recoverable · ${r.packet.usagePct}% utilization`}
                  {r.status === "error" && r.error}
                </div>
              </div>
              {r.status === "ok" && (
                <a
                  href={`/app/vendors/${r.vendorId}`}
                  style={{
                    fontSize: 12,
                    color: "#5E6AD2",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  Open <ExternalLink size={11} aria-hidden="true" />
                </a>
              )}
            </div>
          ))}
        </div>

        {completed === total && (
          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
            {successes} packet{successes !== 1 ? "s" : ""} ready. Open a vendor to review the drafts and citations.
          </p>
        )}
      </div>
    </Drawer>
  );
}

function StatusIcon({ status }: { status: PacketResult["status"] }): JSX.Element {
  if (status === "pending") {
    return (
      <span
        style={{
          display: "inline-flex",
          width: 22,
          height: 22,
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
        }}
      >
        <Loader2 size={14} aria-hidden="true" className="spin" />
      </span>
    );
  }
  if (status === "ok") {
    return (
      <CheckCircle2
        size={18}
        aria-hidden="true"
        style={{ color: "#10b981", flexShrink: 0 }}
      />
    );
  }
  return (
    <AlertTriangle
      size={18}
      aria-hidden="true"
      style={{ color: "#dc2626", flexShrink: 0 }}
    />
  );
}

function Stat({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}): JSX.Element {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#94a3b8",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          color: valueColor ?? "#0f172a",
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}
