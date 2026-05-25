import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InboxItem } from "@unsyphn/shared";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";
import { useKeyOnce } from "../lib/keyboard.js";
import { useRole } from "../lib/role.js";
import { groupByDay } from "../lib/dayGroups.js";
import { useEscalations } from "../lib/stream.js";
import { BulkActionBar } from "../components/BulkActionBar.js";
import { ChangeDrawer } from "../components/ChangeDrawer.js";
import { LensChips } from "../components/LensChips.js";
import { InboxFilterRow } from "../components/inbox/InboxFilterRow.js";
import { InboxList } from "../components/inbox/InboxList.js";
import { InboxEmptyState } from "../components/inbox/InboxEmptyState.js";
import { InboxSkeletonRow } from "../components/inbox/InboxSkeletonRow.js";
import { InboxKeyHints } from "../components/inbox/InboxKeyHints.js";
import { postLifecycle } from "../components/inbox/inboxApi.js";

const LOCAL_USER_ID = "usr_priya";

const ESCALATION_ROLE_LABELS: Record<string, string> = {
  procurement: "Procurement",
  legal: "Legal",
  security: "Security",
  finance: "Finance",
  it: "IT",
  audit: "Audit",
};

type FilterKind = "all" | "changes" | "renewals" | "unused-seats";
type SeverityFilter = "all" | "P1" | "P2";

interface InboxResponse {
  items: InboxItem[];
  total: number;
}

export function Inbox(): JSX.Element {
  const [role] = useRole();
  const [allItems, setAllItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKind>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [query, setQuery] = useState("");

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<InboxItem | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [escalatedIds, setEscalatedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const itemIdsRef = useRef<Set<string>>(new Set());
  itemIdsRef.current = useMemo(() => new Set(allItems.map((i) => i.id)), [allItems]);

  const handleEscalatedEvent = useCallback(
    (event: { id: string; toRole: string; byUserId: string }) => {
      if (!itemIdsRef.current.has(event.id)) return;
      setEscalatedIds((prev) => {
        if (prev.has(event.id)) return prev;
        const next = new Set(prev);
        next.add(event.id);
        return next;
      });
      if (event.byUserId !== LOCAL_USER_ID) {
        const item = allItems.find((i) => i.id === event.id);
        const vendor = item?.vendorName ?? "Change";
        const toRole = ESCALATION_ROLE_LABELS[event.toRole] ?? event.toRole;
        setToast(`${vendor} escalated to ${toRole}`);
        window.setTimeout(() => setToast(null), 2500);
      }
    },
    [allItems],
  );

  useEscalations({ active: true, onEscalated: handleEscalatedEvent });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());

    const bearer = localStorage.getItem("unsyphn:bearer") ?? DEMO_BEARER_TOKEN;
    const params = new URLSearchParams({ filter, severity, lens: role });

    fetch(`/v1/inbox?${params.toString()}`, {
      headers: { Authorization: `Bearer ${bearer}` },
    })
      .then(async (resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json() as Promise<InboxResponse>;
      })
      .then(({ items }) => {
        if (!cancelled) { setAllItems(items); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setError("Couldn't load inbox. Retry."); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [filter, severity, role]);

  const visibleItems = useMemo(
    () => allItems.filter((item) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        item.vendorName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q)
      );
    }),
    [allItems, query],
  );

  const dayGroups = useMemo(() => groupByDay(visibleItems), [visibleItems]);
  // Flattened order for keyboard nav matches render order (today -> older).
  const flat = useMemo(() => dayGroups.flatMap((g) => g.items), [dayGroups]);

  function openDrawer(item: InboxItem): void {
    setDrawerItem(item);
    setDrawerOpen(true);
    setReadIds((prev) => { const next = new Set(prev); next.add(item.id); return next; });
  }

  async function handleAcknowledge(item: InboxItem): Promise<void> {
    try {
      await postLifecycle(item.id, "acknowledge", {});
      setAllItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch { /* ignore */ }
  }

  async function handleSnoozeOne(item: InboxItem, untilIso?: string): Promise<void> {
    const until = untilIso ?? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    try {
      await postLifecycle(item.id, "snooze", { untilAt: until });
      setAllItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch { /* ignore */ }
  }

  async function handleResolveOne(item: InboxItem): Promise<void> {
    try {
      await postLifecycle(item.id, "resolve", { resolution: "accepted" });
      setAllItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch { /* ignore */ }
  }

  async function handleEscalateOne(item: InboxItem): Promise<void> {
    try {
      await fetch(`/v1/changes/${encodeURIComponent(item.id)}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
        body: JSON.stringify({ toRole: "legal" }),
      });
      setEscalatedIds((prev) => { const next = new Set(prev); next.add(item.id); return next; });
    } catch { /* ignore */ }
  }

  function toggleSelect(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function clearSelection(): void { setSelectedIds(new Set()); }

  async function bulkMarkRead(): Promise<void> {
    setReadIds((prev) => { const next = new Set(prev); for (const id of selectedIds) next.add(id); return next; });
    clearSelection();
  }

  async function bulkSnooze(untilIso: string): Promise<void> {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => postLifecycle(id, "snooze", { untilAt: untilIso }).catch(() => undefined)));
    setAllItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    clearSelection();
  }

  async function bulkResolve(): Promise<void> {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => postLifecycle(id, "resolve", { resolution: "accepted" }).catch(() => undefined)));
    setAllItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    clearSelection();
  }

  async function bulkEscalate(): Promise<void> {
    const ids = [...selectedIds];
    await Promise.all(
      ids.map((id) => fetch(`/v1/changes/${encodeURIComponent(id)}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
        body: JSON.stringify({ toRole: "legal" }),
      }).catch(() => undefined)),
    );
    setEscalatedIds((prev) => { const next = new Set(prev); for (const id of ids) next.add(id); return next; });
    clearSelection();
  }

  const moveFocus = useCallback((delta: number) => {
    if (drawerOpen) return;
    setFocusedIndex((prev) => {
      const next = Math.max(0, Math.min(flat.length - 1, prev + delta));
      rowRefs.current[next]?.focus();
      return next;
    });
  }, [drawerOpen, flat.length]);

  useKeyOnce("j", useCallback(() => moveFocus(1), [moveFocus]));
  useKeyOnce("k", useCallback(() => moveFocus(-1), [moveFocus]));
  useKeyOnce("e", useCallback(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (drawerOpen || focusedIndex < 0) return;
    const item = flat[focusedIndex]; if (item) void handleResolveOne(item);
  }, [drawerOpen, focusedIndex, flat]));
  useKeyOnce("s", useCallback(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (drawerOpen || focusedIndex < 0) return;
    const item = flat[focusedIndex]; if (item) void handleSnoozeOne(item);
  }, [drawerOpen, focusedIndex, flat]));
  useKeyOnce("r", useCallback(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (drawerOpen || focusedIndex < 0) return;
    const item = flat[focusedIndex]; if (item) openDrawer(item);
  }, [drawerOpen, focusedIndex, flat]));
  useKeyOnce("x", useCallback(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (drawerOpen || focusedIndex < 0) return;
    const item = flat[focusedIndex]; if (item) toggleSelect(item.id);
  }, [drawerOpen, focusedIndex, flat]));
  useKeyOnce("Enter", useCallback(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (drawerOpen || focusedIndex < 0) return;
    const item = flat[focusedIndex]; if (item) openDrawer(item);
  }, [drawerOpen, focusedIndex, flat]));

  return (
    <main
      className="page"
      style={{ padding: "var(--space-7) var(--space-6)", maxWidth: 1000, margin: "0 auto" }}
    >
      <header className="fade-up" style={{ marginBottom: "var(--space-5)" }}>
        <h1 className="h1" style={{ marginBottom: "var(--space-2)" }}>Inbox</h1>
        <p className="lead" style={{ margin: 0, color: "#64748b" }}>
          Material vendor changes for your active lens. Reviewed once a day keeps you ahead of renewal cliffs.
        </p>
      </header>

      <LensChips />

      <InboxFilterRow
        filter={filter} severity={severity} query={query}
        onFilterChange={setFilter} onSeverityChange={setSeverity} onQueryChange={setQuery}
      />

      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onMarkRead={bulkMarkRead} onSnooze={bulkSnooze}
          onResolve={bulkResolve} onEscalate={bulkEscalate} onClear={clearSelection}
        />
      )}

      {loading && (
        <div className="card glass-soft" style={{ padding: 0, overflow: "hidden" }} aria-busy="true" aria-label="Loading inbox">
          {Array.from({ length: 6 }, (_, i) => <InboxSkeletonRow key={i} />)}
        </div>
      )}

      {!loading && error && (
        <div className="card glass-soft fade-up" style={{ padding: 16 }}>
          <span className="badge badge-danger">{error}</span>
        </div>
      )}

      {!loading && !error && visibleItems.length === 0 && (
        <InboxEmptyState role={role} query={query} />
      )}

      {!loading && !error && (
        <InboxList
          dayGroups={dayGroups}
          focusedIndex={focusedIndex}
          selectedIds={selectedIds} readIds={readIds} escalatedIds={escalatedIds}
          registerRowRef={(idx, el) => { rowRefs.current[idx] = el; }}
          onFocus={setFocusedIndex} onClickItem={openDrawer}
          onToggleSelect={toggleSelect} onSnooze={handleSnoozeOne}
          onArchive={handleAcknowledge} onEscalate={handleEscalateOne}
          flatIndexOffset={0}
        />
      )}

      {visibleItems.length > 0 && !loading && <InboxKeyHints />}

      <ChangeDrawer
        open={drawerOpen} onClose={() => setDrawerOpen(false)} item={drawerItem}
        onEscalated={(id) => setEscalatedIds((prev) => { const next = new Set(prev); next.add(id); return next; })}
      />

      {toast && (
        <div role="status" aria-live="polite" style={{
          position: "fixed", bottom: 24, right: 24,
          background: "var(--surface-1)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "10px 14px", fontSize: 13,
          color: "var(--text-strong)", boxShadow: "0 8px 24px rgba(15,23,42,0.12)", zIndex: 50,
        }}>
          {toast}
        </div>
      )}

    </main>
  );
}
