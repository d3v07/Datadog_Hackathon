import { useEffect, useRef, useState, type JSX } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, CheckCircle, Clock, ArrowUpRight } from "lucide-react";
import type { InboxItem, EvidenceBriefResponse, Severity } from "@unsyphn/shared";
import { ApiError, DEMO_BEARER_TOKEN } from "../lib/api.js";
import { ROLES, ROLE_LABELS, type Role } from "../lib/role.js";
import { DiffViewer } from "./DiffViewer.js";

export interface ChangeDrawerProps {
  open: boolean;
  onClose: () => void;
  item: InboxItem | null;
  onEscalated?: (id: string, toRole: Role) => void;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const SEV_BADGE: Record<Severity, string> = {
  P1: "badge badge-danger",
  P2: "badge badge-warning",
  P3: "badge badge-success",
};

type ToastVariant = "success" | "error";
type EscalateState = "idle" | "confirming";

async function postChange(path: string, body?: Record<string, unknown>): Promise<void> {
  const headers: Record<string, string> = { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` };
  if (body) headers["Content-Type"] = "application/json";
  const resp = await fetch(path, { method: "POST", headers, body: body ? JSON.stringify(body) : undefined });
  if (!resp.ok) {
    const text = await resp.text();
    const json = text ? (JSON.parse(text) as { error?: { message?: string } }) : undefined;
    throw new ApiError(resp.status, { error: { code: "request_failed", message: json?.error?.message ?? `HTTP ${resp.status}` } });
  }
}

function useFocusTrap(open: boolean, panelRef: React.RefObject<HTMLDivElement | null>, onClose: () => void): void {
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0]?.focus();
    } else {
      const opener = openerRef.current;
      if (opener instanceof HTMLElement) opener.focus();
      openerRef.current = null;
    }
  }, [open, panelRef]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, panelRef, onClose]);
}

function SectionLabel({ label, id }: { label: string; id?: string }): JSX.Element {
  return (
    <span id={id} style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-2)", marginBottom: "var(--space-1)" }}>
      {label}
    </span>
  );
}

function Toast({ message, variant }: { message: string; variant: ToastVariant }): JSX.Element {
  return (
    <div role="status" aria-live="polite" style={{ position: "fixed", bottom: "var(--space-6)", left: "50%", transform: "translateX(-50%)", background: variant === "success" ? "var(--success)" : "var(--danger)", color: "#fff", padding: "var(--space-2) var(--space-5)", borderRadius: "var(--radius-full)", fontSize: "var(--text-sm)", fontWeight: 500, zIndex: 500, whiteSpace: "nowrap", boxShadow: "var(--shadow-3)" }}>
      {message}
    </div>
  );
}

function DrawerBody({ item, evidence, escalate, onEscalate, onSubmitEscalate, escalateBusy, escalateError, escalateRole, escalateNote, onChangeRole, onChangeNote }: {
  item: InboxItem;
  evidence: EvidenceBriefResponse | null;
  escalate: EscalateState;
  onEscalate: (s: EscalateState) => void;
  onSubmitEscalate: () => void;
  escalateBusy: boolean;
  escalateError: string | null;
  escalateRole: Role;
  escalateNote: string;
  onChangeRole: (r: Role) => void;
  onChangeNote: (n: string) => void;
}): JSX.Element {
  const changes = evidence?.changeReport?.changes ?? [];
  const isChange = item.kind === "change";

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <section aria-labelledby="dw-what">
        <SectionLabel label="What Changed" id="dw-what" />
        <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>{item.title}</h3>
      </section>

      <section aria-labelledby="dw-why">
        <SectionLabel label="Why It Matters" id="dw-why" />
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-2)", lineHeight: 1.6 }}>
          {item.summary}
          {item.dollarImpact !== null && (
            <span style={{ color: "var(--danger)", fontWeight: 600 }}>{" "}${item.dollarImpact.toLocaleString()} estimated impact.</span>
          )}
        </p>
      </section>

      <section aria-labelledby="dw-who">
        <SectionLabel label="Who Owns" id="dw-who" />
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", background: "var(--accent-soft)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--accent)", flexShrink: 0 }}>
            {item.ownerEmail.charAt(0).toUpperCase()}
          </span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
            {item.ownerEmail} · <span style={{ color: "var(--text-muted)" }}>Vendor Owner</span>
          </span>
        </div>
      </section>

      <section aria-labelledby="dw-next">
        <SectionLabel label="What's Next" id="dw-next" />
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-2)", lineHeight: 1.6 }}>
          Acknowledge before EOD. Route to legal if data classification policy fires.
          {item.severity === "P1" && " Escalate immediately — P1 severity."}
        </p>
      </section>

      {isChange && (
        <section aria-labelledby="dw-proof">
          <SectionLabel label="Proof" id="dw-proof" />
          {changes.length > 0
            ? <DiffViewer changes={changes} />
            : <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Loading diff data...</p>
          }
        </section>
      )}

      {escalate === "confirming" && (
        <div
          role="region"
          aria-label="Escalation form"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text)", fontWeight: 600 }}>
            Escalate this change
          </p>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-2)", fontWeight: 500 }}>Route to</span>
            <select
              value={escalateRole}
              onChange={(e) => onChangeRole(e.target.value as Role)}
              className="input"
              style={{ height: 32, fontSize: "var(--text-sm)" }}
              aria-label="Escalation target role"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-2)", fontWeight: 500 }}>Note (optional)</span>
            <textarea
              value={escalateNote}
              onChange={(e) => onChangeNote(e.target.value)}
              className="input"
              rows={3}
              maxLength={500}
              placeholder="Context for the receiving team…"
              style={{ fontSize: "var(--text-sm)", resize: "vertical", padding: 8 }}
              aria-label="Escalation note"
            />
          </label>
          {escalateError && (
            <span className="badge badge-danger" style={{ alignSelf: "flex-start" }}>
              {escalateError}
            </span>
          )}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: 32 }}
              onClick={onSubmitEscalate}
              disabled={escalateBusy}
              aria-busy={escalateBusy}
            >
              Confirm Escalation
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ height: 32 }}
              onClick={() => onEscalate("idle")}
              disabled={escalateBusy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChangeDrawer({ open, onClose, item, onEscalated }: ChangeDrawerProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [evidence, setEvidence] = useState<EvidenceBriefResponse | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [escalate, setEscalate] = useState<EscalateState>("idle");
  const [escalateRole, setEscalateRole] = useState<Role>("legal");
  const [escalateNote, setEscalateNote] = useState<string>("");
  const [escalateBusy, setEscalateBusy] = useState(false);
  const [escalateError, setEscalateError] = useState<string | null>(null);

  useFocusTrap(open, panelRef, onClose);

  useEffect(() => {
    if (!open || !item || item.kind !== "change") { setEvidence(null); return; }
    let cancelled = false;
    fetch(`/v1/evidence/${encodeURIComponent(item.id)}`, { headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d: EvidenceBriefResponse | null) => { if (!cancelled) setEvidence(d); })
      .catch(() => { if (!cancelled) setEvidence(null); });
    return () => { cancelled = true; };
  }, [open, item]);

  useEffect(() => {
    if (!open) {
      setEscalate("idle");
      setEscalateRole("legal");
      setEscalateNote("");
      setEscalateError(null);
      setEscalateBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string, variant: ToastVariant = "success"): void => setToast({ message: msg, variant });

  const handleAction = async (key: string, body?: Record<string, unknown>, successMsg = "Done"): Promise<void> => {
    if (!item) return;
    setActionBusy(key);
    try {
      await postChange(`/v1/changes/${item.id}/${key}`, body);
      showToast(successMsg);
      onClose();
    } catch {
      showToast("Action failed", "error");
    } finally {
      setActionBusy(null);
    }
  };

  const handleSubmitEscalate = async (): Promise<void> => {
    if (!item) return;
    setEscalateBusy(true);
    setEscalateError(null);
    try {
      const trimmed = escalateNote.trim();
      const body: Record<string, unknown> = { toRole: escalateRole };
      if (trimmed.length > 0) body.note = trimmed;
      await postChange(`/v1/changes/${item.id}/escalate`, body);
      showToast(`Escalated to ${escalateRole} — Slack + Jira sent`);
      onEscalated?.(item.id, escalateRole);
      setEscalate("idle");
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Escalation failed";
      setEscalateError(msg);
    } finally {
      setEscalateBusy(false);
    }
  };

  if (!open && !item) return null;

  const sevBadgeClass = item ? SEV_BADGE[item.severity] : "badge badge-neutral";
  const SevIcon = item?.severity === "P3" ? CheckCircle : AlertCircle;

  return createPortal(
    <>
      <div aria-hidden="true" onClick={onClose} style={{ display: open ? "block" : "none", position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 300 }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-drawer-title"
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px, 100vw)", background: "var(--surface)", borderLeft: "1px solid var(--border)", zIndex: 301, display: "flex", flexDirection: "column", transform: open ? "translateX(0)" : "translateX(100%)", transition: `transform var(--dur-base) var(--ease-out)`, boxShadow: "var(--shadow-3)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "0 var(--space-5)", height: 56, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {item && (
            <span className={sevBadgeClass} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <SevIcon size={12} aria-hidden="true" />{item.severity}
            </span>
          )}
          <h2 id="change-drawer-title" style={{ flex: 1, margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item ? `${item.vendorName} · Material Change` : "Material Change"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close drawer" className="btn btn-ghost" style={{ width: 36, height: 36, padding: 0, flexShrink: 0 }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        {item && (
          <DrawerBody
            item={item}
            evidence={evidence}
            escalate={escalate}
            onEscalate={setEscalate}
            onSubmitEscalate={() => void handleSubmitEscalate()}
            escalateBusy={escalateBusy}
            escalateError={escalateError}
            escalateRole={escalateRole}
            escalateNote={escalateNote}
            onChangeRole={setEscalateRole}
            onChangeNote={setEscalateNote}
          />
        )}

        {/* Action row */}
        {item && (
          <div style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--border)", flexShrink: 0, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={() => handleAction("acknowledge", undefined, "Acknowledged")} aria-busy={actionBusy === "acknowledge"} disabled={actionBusy !== null}>
              <CheckCircle size={14} aria-hidden="true" />Acknowledge
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => handleAction("snooze", { untilAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString() }, "Snoozed 48h")} aria-busy={actionBusy === "snooze"} disabled={actionBusy !== null}>
              <Clock size={14} aria-hidden="true" />Snooze 48h
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => handleAction("resolve", { resolution: "accepted" }, "Resolved")} aria-busy={actionBusy === "resolve"} disabled={actionBusy !== null}>
              Resolve
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEscalate(escalate === "confirming" ? "idle" : "confirming")} disabled={actionBusy !== null} aria-expanded={escalate === "confirming"}>
              <ArrowUpRight size={14} aria-hidden="true" />Escalate
            </button>
          </div>
        )}
      </div>
      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </>,
    document.body,
  );
}
