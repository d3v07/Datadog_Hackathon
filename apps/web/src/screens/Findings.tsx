import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listFindings,
  patchFindingState,
  type Finding,
  type FindingState,
  type FindingType,
} from "../lib/api.js";
import { useRole } from "../lib/role.js";
import { FindingsFilters, type SeverityFilter } from "../components/findings/FindingsFilters.js";
import { FindingsStats } from "../components/findings/FindingsStats.js";
import { FindingsTable } from "../components/findings/FindingsTable.js";
import { FindingDrawer } from "../components/findings/FindingDrawer.js";
import { LensChips } from "../components/LensChips.js";

function readSearchParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

function syncUrl(updates: Record<string, string | null>): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  }
  window.history.replaceState({}, "", url.toString());
}

const TYPE_VALUES: ReadonlyArray<FindingType | "all"> = [
  "all",
  "change",
  "compliance",
  "subprocessor",
  "spend",
  "security",
];

const SEVERITY_VALUES: ReadonlyArray<SeverityFilter | "all"> = ["all", "P1", "P2", "P3"];
const STATE_VALUES: ReadonlyArray<FindingState | "all"> = [
  "all",
  "open",
  "under-review",
  "resolved",
];

function readType(): FindingType | "all" {
  const v = readSearchParam("type");
  return v && (TYPE_VALUES as ReadonlyArray<string>).includes(v)
    ? (v as FindingType | "all")
    : "all";
}

function readSeverity(): SeverityFilter | "all" {
  const v = readSearchParam("severity");
  return v && (SEVERITY_VALUES as ReadonlyArray<string>).includes(v)
    ? (v as SeverityFilter | "all")
    : "all";
}

function readState(): FindingState | "all" {
  const v = readSearchParam("state");
  return v && (STATE_VALUES as ReadonlyArray<string>).includes(v)
    ? (v as FindingState | "all")
    : "all";
}

export function Findings(): JSX.Element {
  const [role] = useRole();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<FindingType | "all">(readType());
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter | "all">(readSeverity());
  const [stateFilter, setStateFilter] = useState<FindingState | "all">(readState());
  const [vendorIdFilter] = useState<string | null>(() => readSearchParam("vendorId"));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFinding, setDrawerFinding] = useState<Finding | null>(null);
  const [mutating, setMutating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    const query: Parameters<typeof listFindings>[0] = { lens: role };
    if (vendorIdFilter) query.vendorId = vendorIdFilter;
    listFindings(query)
      .then((resp) => {
        setFindings(resp.findings);
        setLoading(false);
      })
      .catch(() => {
        setError("Couldn't load findings. Retry.");
        setLoading(false);
      });
  }, [role, vendorIdFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (typeFilter !== "all" && f.type !== typeFilter) return false;
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (stateFilter !== "all" && f.state !== stateFilter) return false;
      return true;
    });
  }, [findings, typeFilter, severityFilter, stateFilter]);

  function handleType(next: FindingType | "all"): void {
    setTypeFilter(next);
    syncUrl({ type: next === "all" ? null : next });
  }
  function handleSeverity(next: SeverityFilter | "all"): void {
    setSeverityFilter(next);
    syncUrl({ severity: next === "all" ? null : next });
  }
  function handleState(next: FindingState | "all"): void {
    setStateFilter(next);
    syncUrl({ state: next === "all" ? null : next });
  }

  function openDrawer(finding: Finding): void {
    setDrawerFinding(finding);
    setDrawerOpen(true);
  }
  function closeDrawer(): void {
    setDrawerOpen(false);
  }

  async function handleStateChange(next: FindingState): Promise<void> {
    if (!drawerFinding) return;
    const id = drawerFinding.id;
    const prev = findings;
    setMutating(true);
    setFindings((curr) => curr.map((f) => (f.id === id ? { ...f, state: next } : f)));
    setDrawerFinding((curr) => (curr ? { ...curr, state: next } : curr));
    try {
      await patchFindingState(id, next);
      setToast(`Marked ${next.replace("-", " ")}`);
      window.setTimeout(() => setToast(null), 2200);
    } catch {
      setFindings(prev);
      setToast("Couldn't update finding. Reverted.");
      window.setTimeout(() => setToast(null), 2500);
    } finally {
      setMutating(false);
    }
  }

  const vendorNote = vendorIdFilter && findings[0]?.vendorName;

  return (
    <main
      className="page"
      style={{ padding: "var(--space-7) var(--space-6)", maxWidth: 1200, margin: "0 auto" }}
    >
      <header style={{ marginBottom: "var(--space-5)" }}>
        <h1 className="h1" style={{ marginBottom: "var(--space-2)" }}>
          Findings
        </h1>
        <p className="lead" style={{ margin: 0, color: "var(--text-2)" }}>
          {vendorNote
            ? `Live issues for ${vendorNote}. `
            : "Live cross-fleet issue tracker. "}
          Every detected risk across vendors, in one place.
        </p>
      </header>

      <LensChips />

      {!loading && !error && <FindingsStats findings={findings} />}

      <FindingsFilters
        typeFilter={typeFilter}
        severityFilter={severityFilter}
        stateFilter={stateFilter}
        onTypeChange={handleType}
        onSeverityChange={handleSeverity}
        onStateChange={handleState}
      />

      {loading && (
        <div
          className="card"
          style={{ padding: "var(--space-7)", textAlign: "center", color: "var(--text-muted)" }}
          aria-busy="true"
        >
          Loading findings…
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{ padding: 16 }}>
          <span className="badge badge-danger">{error}</span>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div
          className="card"
          style={{
            padding: "var(--space-9)",
            textAlign: "center",
            color: "var(--text-2)",
          }}
        >
          <p style={{ margin: "0 0 8px", fontWeight: 500 }}>
            No findings match these filters.
          </p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Try clearing a filter or switching lens.
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <FindingsTable findings={filtered} onOpen={openDrawer} />
      )}

      <FindingDrawer
        finding={drawerFinding}
        open={drawerOpen}
        busy={mutating}
        onClose={closeDrawer}
        onChangeState={handleStateChange}
      />

      {toast && (
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
          {toast}
        </div>
      )}
    </main>
  );
}
