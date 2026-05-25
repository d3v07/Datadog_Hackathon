import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import type { Renewal, RenewalStatus } from "@unsyphn/shared";
import { listTeamMembers, type TeamMember } from "../lib/api.js";
import { useRole } from "../lib/role.js";
import {
  fetchRenewals,
  patchRenewal,
  postRenewalStatus,
  type RenewalPatchBody,
} from "../components/renewals/api.js";
import { RenewalsKanban } from "../components/renewals/RenewalsKanban.js";
import { ClosedSection } from "../components/renewals/ClosedSection.js";
import { Workbench } from "../components/renewals/Workbench.js";
import { downloadIcs } from "../components/renewals/ics.js";
import { RenegotiationPacket } from "../components/RenegotiationPacket.js";

type Window = 30 | 60 | 90 | 365;

const TIME_CHIPS: ReadonlyArray<{ label: string; days: Window }> = [
  { label: "Next 30d", days: 30 },
  { label: "Next 60d", days: 60 },
  { label: "Next 90d", days: 90 },
  { label: "All", days: 365 },
];

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function buildLead(renewals: ReadonlyArray<Renewal>, days: number): string {
  const active = renewals.filter((r) => !r.declined && !r.autoRenewed);
  const total = active.length;
  const atRisk = active.reduce((s, r) => s + r.annualValueUsd, 0);
  const urgent = active.filter((r) => r.daysOut <= 30).length;
  const win = days === 365 ? "all" : `next ${days}d`;
  const parts: string[] = [];
  if (total > 0) parts.push(`${total} in ${win}`);
  if (atRisk > 0) parts.push(`${formatUsd(atRisk)} at-risk value`);
  if (urgent > 0) parts.push(`${urgent} within 30 days`);
  return parts.join(" · ") || "No renewals in this window";
}

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

export function Renewals(): JSX.Element {
  const [role] = useRole();
  const [days, setDays] = useState<Window>(90);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selected, setSelected] = useState<Renewal | null>(null);
  const [packetFor, setPacketFor] = useState<Renewal | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRenewals(days)
      .then((r) => {
        if (!cancelled) {
          setRenewals(r);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't load renewals.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  useEffect(() => {
    let cancelled = false;
    listTeamMembers()
      .then((r) => {
        if (!cancelled) setMembers(r.members);
      })
      .catch(() => {
        // Owner picker shows email-based initials when fetch fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Lens filter: keep renewals whose lensTags include the role, fall back
  // to the full list if zero match (so the board never blanks).
  const lensFiltered = useMemo(() => {
    const tagged = renewals.filter((r) => (r.lensTags ?? []).includes(role));
    return tagged.length > 0 ? tagged : renewals;
  }, [renewals, role]);

  const openCards = useMemo(
    () => lensFiltered.filter((r) => !r.declined && !r.autoRenewed),
    [lensFiltered],
  );
  const closedCards = useMemo(
    () => lensFiltered.filter((r) => r.declined || r.autoRenewed),
    [lensFiltered],
  );

  const handleMoveColumn = useCallback(
    (id: string, column: RenewalStatus) => {
      const prev = renewals;
      const next = prev.map((r) => (r.id === id ? { ...r, status: column } : r));
      setRenewals(next);
      postRenewalStatus(id, column)
        .then((updated) => {
          setRenewals((curr) => curr.map((r) => (r.id === id ? updated : r)));
        })
        .catch(() => {
          setRenewals(prev);
          flashToast("Couldn't move card. Reverted.");
        });
    },
    [renewals, flashToast],
  );

  const applyPatch = useCallback(
    (id: string, patch: RenewalPatchBody, onError: string) => {
      const prev = renewals;
      const optimistic = prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...(patch.column ? { status: patch.column } : {}),
              ...(patch.ownerId
                ? {
                    ownerId: patch.ownerId,
                    ownerEmail:
                      members.find((m) => m.id === patch.ownerId)?.email ?? r.ownerEmail,
                  }
                : {}),
              ...(patch.declined !== undefined ? { declined: patch.declined } : {}),
              ...(patch.autoRenewed !== undefined ? { autoRenewed: patch.autoRenewed } : {}),
            }
          : r,
      );
      setRenewals(optimistic);
      patchRenewal(id, patch)
        .then((updated) => {
          setRenewals((curr) => curr.map((r) => (r.id === id ? updated : r)));
        })
        .catch(() => {
          setRenewals(prev);
          flashToast(onError);
        });
    },
    [renewals, members, flashToast],
  );

  const handleAssignOwner = useCallback(
    (id: string, ownerId: string) => applyPatch(id, { ownerId }, "Couldn't reassign owner."),
    [applyPatch],
  );
  const handleMarkDeclined = useCallback(
    (id: string) => applyPatch(id, { declined: true, autoRenewed: false }, "Couldn't update."),
    [applyPatch],
  );
  const handleMarkAutoRenewed = useCallback(
    (id: string) => applyPatch(id, { autoRenewed: true, declined: false }, "Couldn't update."),
    [applyPatch],
  );
  const handleReopen = useCallback(
    (id: string) =>
      applyPatch(id, { declined: false, autoRenewed: false }, "Couldn't re-open."),
    [applyPatch],
  );
  const handleGeneratePacket = useCallback((r: Renewal) => {
    setPacketFor(r);
  }, []);
  const handleExportOne = useCallback(
    (r: Renewal) => {
      downloadIcs([r], `renewal-${r.vendorName.toLowerCase().replace(/\s+/g, "-")}.ics`);
      flashToast(`Exported ${r.vendorName}.ics`);
    },
    [flashToast],
  );
  const handleExportAll = useCallback(() => {
    const list = openCards;
    if (list.length === 0) {
      flashToast("Nothing visible to export.");
      return;
    }
    downloadIcs(list, "renewals.ics");
    flashToast(`Exported ${list.length} renewal${list.length === 1 ? "" : "s"}.ics`);
  }, [openCards, flashToast]);

  return (
    <main
      className="page"
      style={{ padding: "var(--space-7) var(--space-6)", maxWidth: 1280, margin: "0 auto" }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: "var(--space-5)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 className="h1" style={{ marginBottom: "var(--space-2)" }}>
            Renewals
          </h1>
          {!loading && !error && (
            <p className="lead" style={{ margin: 0 }}>
              {buildLead(lensFiltered, days)}
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleExportAll}
          disabled={loading || openCards.length === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 36,
            fontSize: "var(--text-sm)",
          }}
        >
          <CalendarPlus size={14} aria-hidden="true" />
          Export to calendar
        </button>
      </header>

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

      {loading && (
        <div
          aria-live="polite"
          aria-busy={true}
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-5)" }}
        >
          {["triage", "negotiate", "sign"].map((col) => (
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
                    height: 140,
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

      {!loading && !error && lensFiltered.length > 0 && (
        <RenewalsKanban
          renewals={openCards}
          members={members}
          onMoveColumn={handleMoveColumn}
          onOpen={setSelected}
          onAssignOwner={handleAssignOwner}
          onMarkDeclined={handleMarkDeclined}
          onMarkAutoRenewed={handleMarkAutoRenewed}
          onReopen={handleReopen}
          onGeneratePacket={handleGeneratePacket}
          onExportIcs={handleExportOne}
        />
      )}

      <ClosedSection
        renewals={closedCards}
        members={members}
        onOpen={setSelected}
        onAssignOwner={handleAssignOwner}
        onMarkDeclined={handleMarkDeclined}
        onMarkAutoRenewed={handleMarkAutoRenewed}
        onReopen={handleReopen}
        onGeneratePacket={handleGeneratePacket}
        onExportIcs={handleExportOne}
      />

      {selected && <Workbench renewal={selected} onClose={() => setSelected(null)} />}
      <RenegotiationPacket
        vendorId={packetFor?.vendorId ?? ""}
        open={packetFor !== null}
        onClose={() => setPacketFor(null)}
      />

      {toast && <Toast message={toast} />}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </main>
  );
}
