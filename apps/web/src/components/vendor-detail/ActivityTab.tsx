import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckSquare, Clock, FileDown, FileText, Plug, RefreshCw, Send, Share2, Shield } from "lucide-react";
import type { Vendor } from "@unsyphn/shared";
import { ApiError, getVendorActivity, type VendorActivityEvent, type TeamMember } from "../../lib/api.js";
import { relTime } from "./utils.js";

interface Props {
  vendor: Vendor;
  members: TeamMember[];
  onError: (msg: string) => void;
}

type FilterKey = "all" | "changes" | "approvals" | "contracts" | "integrations";

const FILTERS: ReadonlyArray<{ id: FilterKey; label: string }> = [
  { id: "all", label: "All" },
  { id: "changes", label: "Changes" },
  { id: "approvals", label: "Approvals" },
  { id: "contracts", label: "Contracts" },
  { id: "integrations", label: "Integrations" },
];

function bucketFor(kind: string): FilterKey {
  if (kind.startsWith("change.")) return "changes";
  if (kind === "change.escalated" || kind === "vendor.patch") return "approvals";
  if (kind.startsWith("contract.")) return "contracts";
  if (kind === "scan.triggered") return "integrations";
  return "all";
}

function iconFor(kind: string): React.ElementType {
  if (kind === "change.detected") return AlertCircle;
  if (kind === "change.acknowledged") return CheckSquare;
  if (kind === "change.resolved") return CheckSquare;
  if (kind === "change.snoozed") return Clock;
  if (kind === "change.escalated") return Shield;
  if (kind === "contract.upload") return FileText;
  if (kind === "vendor.patch") return RefreshCw;
  if (kind === "packet.generated") return Send;
  if (kind === "scan.triggered") return Plug;
  return AlertCircle;
}

export function ActivityTab({ vendor, members, onError }: Props): JSX.Element {
  const [events, setEvents] = useState<VendorActivityEvent[] | null>(null);
  const [latestChangeId, setLatestChangeId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let cancelled = false;
    getVendorActivity(vendor.id)
      .then((r) => {
        if (cancelled) return;
        setEvents(r.events);
        setLatestChangeId(r.latestChangeId);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setEvents([]);
        if (err instanceof ApiError) onError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [vendor.id, onError]);

  const memberById = useMemo(() => {
    const m = new Map<string, TeamMember>();
    for (const u of members) m.set(u.id, u);
    return m;
  }, [members]);

  const filtered = useMemo(() => {
    if (!events) return [];
    if (filter === "all") return events;
    return events.filter((e) => bucketFor(e.kind) === filter);
  }, [events, filter]);

  function actorLabel(actor: string): string {
    if (actor === "system") return "system";
    return memberById.get(actor)?.name ?? actor;
  }

  function exportBundle(): void {
    if (!latestChangeId) {
      onError("No change report yet — nothing to bundle.");
      return;
    }
    window.open(`/v1/evidence/${encodeURIComponent(latestChangeId)}/bundle.html`, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
        <div role="tablist" aria-label="Activity filter" style={{ display: "flex", gap: "var(--space-1)" }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={filter === f.id ? "badge badge-accent" : "badge badge-neutral"}
              style={{ cursor: "pointer", border: filter === f.id ? "none" : "1px solid var(--border)" }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={exportBundle}
          disabled={!latestChangeId}
          style={{ marginLeft: "auto", fontSize: "var(--text-xs)" }}
        >
          <FileDown size={13} aria-hidden="true" /> Export evidence bundle
        </button>
      </div>

      {events === null ? (
        <div style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }} aria-live="polite" aria-busy>
          Loading activity…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: "var(--space-7)", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No activity in this view yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {filtered.map((e, idx) => {
            const Icon = iconFor(e.kind);
            return (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) var(--space-1)",
                  borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-full)",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={13} aria-hidden="true" style={{ color: "var(--text-2)" }} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text)", fontWeight: 500 }}>{e.title}</span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    {e.actor !== "system" ? `${actorLabel(e.actor)} · ` : ""}
                    {relTime(e.occurredAt)}
                  </span>
                  {e.detail && e.kind === "change.escalated" && (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-2)" }}>
                      Jira: {String((e.detail as { jiraKey?: string }).jiraKey ?? "—")} · Slack: {String((e.detail as { slackChannel?: string }).slackChannel ?? "—")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
