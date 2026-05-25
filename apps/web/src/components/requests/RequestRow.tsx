import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, MessageSquare, ShieldAlert } from "lucide-react";
import { VendorLogo } from "../VendorLogo.js";
import { ApprovalChain } from "./ApprovalChain.js";
import { SlaChip } from "./SlaChip.js";
import { CommentThread } from "./CommentThread.js";
import { RouteForReviewPanel } from "./RouteForReviewPanel.js";
import type { RequestDto, RouteTarget } from "./types.js";

interface Props {
  request: RequestDto;
  busy: boolean;
  onApprove: (id: string, originEl?: HTMLElement) => void;
  onReject: (id: string) => void;
  onRoute: (id: string, target: RouteTarget, note?: string) => void;
  onReopen: (id: string) => void;
  onRecall: (id: string) => void;
  onConvert: (req: RequestDto) => void;
  onComment: (id: string, text: string) => Promise<void> | void;
  defaultExpanded?: boolean;
}

function relativeDays(iso: string): string {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  return `${d}d ago`;
}

function spendLabel(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}k/yr`;
  return `$${n}/yr`;
}

function statusBadge(status: RequestDto["status"]): { className: string; label: string } {
  if (status === "approved") return { className: "badge badge-success", label: "Approved" };
  if (status === "rejected") return { className: "badge badge-danger", label: "Rejected" };
  if (status === "routed") return { className: "badge badge-neutral", label: "Routed for review" };
  return { className: "badge badge-warning", label: "Pending" };
}

export function RequestRow({
  request,
  busy,
  onApprove,
  onReject,
  onRoute,
  onReopen,
  onRecall,
  onConvert,
  onComment,
  defaultExpanded = false,
}: Props): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);

  const status = statusBadge(request.status);
  const showChain =
    request.status === "pending" || request.status === "routed";

  const handleSubmitComment = async (text: string) => {
    setCommentBusy(true);
    try {
      await onComment(request.id, text);
    } finally {
      setCommentBusy(false);
    }
  };

  return (
    <article
      className="card glass-soft row-hover"
      style={{
        padding: "var(--space-4) var(--space-5)",
        marginBottom: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
        <VendorLogo name={request.vendorName} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-3)",
              marginBottom: "var(--space-1)",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "var(--text-base)",
                color: "var(--text-strong)",
              }}
            >
              {request.vendorName}
            </span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
              {request.autoEscalated && (
                <span
                  className="badge badge-danger"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, textTransform: "none", letterSpacing: 0 }}
                >
                  <ShieldAlert size={11} aria-hidden="true" />
                  Auto-escalated
                </span>
              )}
              <SlaChip request={request} />
              <span className={status.className}>{status.label}</span>
            </div>
          </div>

          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-2)",
              marginBottom: "var(--space-1)",
            }}
          >
            Requested by {request.requesterName} ({request.requesterEmail}) ·{" "}
            {relativeDays(request.createdAt)} · {request.category}
          </div>
          <div
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: "var(--space-1)",
            }}
          >
            {spendLabel(request.expectedSpendUsd)}
          </div>
          {request.justification && (
            <div
              style={{
                fontSize: "var(--text-sm)",
                fontStyle: "italic",
                color: "var(--text-muted)",
                marginBottom: "var(--space-2)",
              }}
            >
              &ldquo;{request.justification}&rdquo;
            </div>
          )}
          {request.similarTools.length > 0 && (
            <div
              className="badge badge-warning"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-1)",
                height: "auto",
                padding: "var(--space-1) var(--space-2)",
                marginBottom: "var(--space-3)",
                textTransform: "none",
                letterSpacing: 0,
                fontSize: "var(--text-xs)",
              }}
            >
              <AlertTriangle size={12} aria-hidden="true" />
              Similar tools you own: {request.similarTools.join(", ")}
            </div>
          )}

          {showChain && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <ApprovalChain request={request} />
            </div>
          )}

          {/* Action row */}
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
            {request.status === "pending" && (
              <>
                <button
                  type="button"
                  className="btn btn-primary button-pop"
                  onClick={(e) => onApprove(request.id, e.currentTarget)}
                  disabled={busy}
                  style={{ height: 32 }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn btn-secondary button-pop"
                  onClick={() => onReject(request.id)}
                  disabled={busy}
                  style={{ height: 32 }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="btn btn-ghost button-pop"
                  onClick={() => setRoutePanelOpen((v) => !v)}
                  disabled={busy}
                  style={{ height: 32 }}
                >
                  Route for review
                </button>
              </>
            )}
            {request.status === "approved" && (
              <button
                type="button"
                className="btn btn-secondary button-pop"
                onClick={() => onConvert(request)}
                disabled={busy}
                style={{ height: 32 }}
              >
                Convert to vendor
              </button>
            )}
            {request.status === "rejected" && (
              <button
                type="button"
                className="btn btn-secondary button-pop"
                onClick={() => onReopen(request.id)}
                disabled={busy}
                style={{ height: 32 }}
              >
                Re-open
              </button>
            )}
            {request.status === "routed" && (
              <button
                type="button"
                className="btn btn-secondary button-pop"
                onClick={() => onRecall(request.id)}
                disabled={busy}
                style={{ height: 32 }}
              >
                Recall
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost button-pop"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={`comments-${request.id}`}
              style={{ height: 32, marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <MessageSquare size={14} aria-hidden="true" />
              {request.comments.length}
              {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
            </button>
          </div>

          {routePanelOpen && request.status === "pending" && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <RouteForReviewPanel
                busy={busy}
                onSubmit={async (target, note) => {
                  await onRoute(request.id, target, note);
                  setRoutePanelOpen(false);
                }}
                onCancel={() => setRoutePanelOpen(false)}
              />
            </div>
          )}

          {expanded && (
            <div
              id={`comments-${request.id}`}
              style={{
                marginTop: "var(--space-3)",
                paddingTop: "var(--space-3)",
                borderTop: "1px solid var(--border)",
              }}
            >
              <CommentThread
                comments={request.comments}
                busy={commentBusy}
                onSubmit={handleSubmitComment}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
