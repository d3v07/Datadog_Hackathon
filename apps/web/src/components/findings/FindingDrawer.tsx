import { ExternalLink, AlertCircle, Eye, CheckCircle2 } from "lucide-react";
import type { Finding, FindingState } from "../../lib/api.js";
import { Drawer } from "../Drawer.js";

interface Props {
  finding: Finding | null;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onChangeState: (next: FindingState) => void;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function sourceLinkLabel(type: Finding["type"]): string {
  if (type === "change") return "Open ChangeReport";
  if (type === "subprocessor") return "Open sub-processor heatmap";
  if (type === "spend") return "Open vendor spend tab";
  if (type === "compliance") return "Open vendor detail";
  return "Open source";
}

function Section({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <section style={{ marginBottom: "var(--space-4)" }}>
      <p
        style={{
          margin: "0 0 6px",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </p>
      {children}
    </section>
  );
}

export function FindingDrawer({ finding, open, busy, onClose, onChangeState }: Props): JSX.Element | null {
  if (!finding) return null;
  const severityClass =
    finding.severity === "P1"
      ? "badge badge-danger"
      : finding.severity === "P2"
        ? "badge badge-warning"
        : "badge badge-neutral";

  return (
    <Drawer open={open} onClose={onClose} title={`Finding · ${finding.severity}`}>
      <div className="fade-in">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span className={severityClass}>{finding.severity}</span>
          <span className="badge badge-neutral" style={{ textTransform: "capitalize" }}>
            {finding.type}
          </span>
          <span
            className="badge badge-neutral"
            style={{ textTransform: "capitalize", marginLeft: "auto" }}
          >
            {finding.state.replace("-", " ")}
          </span>
        </div>

        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            color: "var(--text-strong)",
            lineHeight: 1.3,
          }}
        >
          {finding.title}
        </h2>
        <p
          style={{
            margin: "0 0 var(--space-5)",
            fontSize: "var(--text-sm)",
            color: "var(--text-2)",
            lineHeight: 1.5,
          }}
        >
          {finding.summary}
        </p>

        <Section label="Vendor">
          <a
            href={`/app/vendors/${encodeURIComponent(finding.vendorId)}`}
            style={{
              color: "var(--text-strong)",
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {finding.vendorName}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </Section>

        <Section label="Detected">
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
            {fmtDate(finding.detectedAt)}
          </span>
        </Section>

        {finding.lensTags.length > 0 && (
          <Section label="Lens">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {finding.lensTags.map((tag) => (
                <span key={tag} className="badge badge-neutral" style={{ textTransform: "capitalize" }}>
                  {tag}
                </span>
              ))}
            </div>
          </Section>
        )}

        {finding.sourceUrl && (
          <Section label="Source">
            <a
              href={finding.sourceUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "var(--text-sm)",
                color: "var(--accent)",
                textDecoration: "none",
              }}
            >
              {sourceLinkLabel(finding.type)}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </Section>
        )}

        <hr style={{ margin: "var(--space-5) 0", border: 0, borderTop: "1px solid var(--border)" }} />

        <Section label="Actions">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || finding.state === "under-review"}
              onClick={() => onChangeState("under-review")}
              style={{ justifyContent: "flex-start" }}
            >
              <AlertCircle size={14} aria-hidden="true" />
              Acknowledge
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || finding.state === "under-review"}
              onClick={() => onChangeState("under-review")}
              style={{ justifyContent: "flex-start" }}
            >
              <Eye size={14} aria-hidden="true" />
              Mark under review
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || finding.state === "resolved"}
              onClick={() => onChangeState("resolved")}
              style={{ justifyContent: "flex-start" }}
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              Resolve
            </button>
          </div>
        </Section>
      </div>
    </Drawer>
  );
}
