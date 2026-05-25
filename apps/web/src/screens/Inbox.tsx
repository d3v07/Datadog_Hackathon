import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { InboxItem } from "@unsyphn/shared";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";
import { useKeyOnce } from "../lib/keyboard.js";
import { useRole, ROLE_LABELS } from "../lib/role.js";
import { groupByDay } from "../lib/dayGroups.js";
import { MaterialChangeCard } from "../components/MaterialChangeCard.js";
import { BulkActionBar } from "../components/BulkActionBar.js";
import { ChangeDrawer } from "../components/ChangeDrawer.js";

type FilterKind = "all" | "changes" | "renewals" | "unused-seats";
type SeverityFilter = "all" | "P1" | "P2";

interface InboxResponse {
  items: InboxItem[];
  total: number;
}

async function postLifecycle(
  id: string,
  action: "acknowledge" | "snooze" | "resolve",
  body: Record<string, unknown>,
): Promise<void> {
  const resp = await fetch(`/v1/changes/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEMO_BEARER_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`Request failed (${resp.status})`);
  }
}

function SkeletonRow(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 68,
        borderBottom: "1px solid rgba(15,23,42,0.06)",
        background: "var(--surface-2)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 24px",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border-strong)" }} />
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--border-strong)" }} />
      <div style={{ flex: 1, height: 10, borderRadius: 4, background: "var(--border-strong)", maxWidth: 320 }} />
    </div>
  );
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

  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const searchRef = useRef<HTMLInputElement>(null);

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
        if (!cancelled) {
          setAllItems(items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't load inbox. Retry.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [filter, severity, role]);

  const visibleItems = useMemo(
    () =>
      allItems.filter((item) => {
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
  const flat = useMemo(
    () => dayGroups.flatMap((g) => g.items),
    [dayGroups],
  );

  function openDrawer(item: InboxItem): void {
    setDrawerItem(item);
    setDrawerOpen(true);
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
  }

  function closeDrawer(): void {
    setDrawerOpen(false);
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEMO_BEARER_TOKEN}`,
        },
        body: JSON.stringify({ toRole: "legal" }),
      });
      setEscalatedIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
    } catch { /* ignore */ }
  }

  function toggleSelect(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection(): void {
    setSelectedIds(new Set());
  }

  async function bulkMarkRead(): Promise<void> {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) next.add(id);
      return next;
    });
    clearSelection();
  }

  async function bulkSnooze(untilIso: string): Promise<void> {
    const ids = [...selectedIds];
    await Promise.all(
      ids.map((id) =>
        postLifecycle(id, "snooze", { untilAt: untilIso }).catch(() => undefined),
      ),
    );
    setAllItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    clearSelection();
  }

  async function bulkResolve(): Promise<void> {
    const ids = [...selectedIds];
    await Promise.all(
      ids.map((id) =>
        postLifecycle(id, "resolve", { resolution: "accepted" }).catch(() => undefined),
      ),
    );
    setAllItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    clearSelection();
  }

  async function bulkEscalate(): Promise<void> {
    const ids = [...selectedIds];
    await Promise.all(
      ids.map((id) =>
        fetch(`/v1/changes/${encodeURIComponent(id)}/escalate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEMO_BEARER_TOKEN}`,
          },
          body: JSON.stringify({ toRole: "legal" }),
        }).catch(() => undefined),
      ),
    );
    setEscalatedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
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

  useKeyOnce("e", useCallback(() => {
    if (drawerOpen || focusedIndex < 0) return;
    const item = flat[focusedIndex];
    if (item) void handleResolveOne(item);
  }, [drawerOpen, focusedIndex, flat])); // eslint-disable-line react-hooks/exhaustive-deps

  useKeyOnce("s", useCallback(() => {
    if (drawerOpen || focusedIndex < 0) return;
    const item = flat[focusedIndex];
    if (item) void handleSnoozeOne(item);
  }, [drawerOpen, focusedIndex, flat])); // eslint-disable-line react-hooks/exhaustive-deps

  useKeyOnce("r", useCallback(() => {
    if (drawerOpen || focusedIndex < 0) return;
    const item = flat[focusedIndex];
    if (item) openDrawer(item);
  }, [drawerOpen, focusedIndex, flat])); // eslint-disable-line react-hooks/exhaustive-deps

  useKeyOnce("x", useCallback(() => {
    if (drawerOpen || focusedIndex < 0) return;
    const item = flat[focusedIndex];
    if (item) toggleSelect(item.id);
  }, [drawerOpen, focusedIndex, flat])); // eslint-disable-line react-hooks/exhaustive-deps

  useKeyOnce("Enter", useCallback(() => {
    if (drawerOpen || focusedIndex < 0) return;
    const item = flat[focusedIndex];
    if (item) openDrawer(item);
  }, [drawerOpen, focusedIndex, flat])); // eslint-disable-line react-hooks/exhaustive-deps

  const FILTER_CHIPS: Array<{ label: string; value: FilterKind }> = [
    { label: "All", value: "all" },
    { label: "Changes", value: "changes" },
    { label: "Renewals", value: "renewals" },
    { label: "Unused seats", value: "unused-seats" },
  ];

  let flatIndex = -1;
  const emptyCopy = `Nothing for ${ROLE_LABELS[role]} today — try a different lens or J to switch.`;

  return (
    <main
      className="page"
      style={{ padding: "var(--space-7) var(--space-6)", maxWidth: 1000, margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <h1 className="h1" style={{ marginBottom: "var(--space-2)" }}>Inbox</h1>
        <p className="lead" style={{ margin: 0, color: "#64748b" }}>
          Material vendor changes for your active lens. Reviewed once a day keeps you ahead of renewal cliffs.
        </p>
      </div>

      {/* Filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {FILTER_CHIPS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={filter === value ? "badge badge-accent" : "badge badge-neutral"}
            style={{ cursor: "pointer", border: "none" }}
          >
            {label}
          </button>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <select
            className="input"
            style={{ width: "auto", height: 28, fontSize: "var(--text-xs)" }}
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
            aria-label="Filter by severity"
          >
            <option value="all">All severities</option>
            <option value="P1">P1 only</option>
            <option value="P2">P2+ only</option>
          </select>

          <div style={{ position: "relative", width: 220 }}>
            <Search
              size={13}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              ref={searchRef}
              className="input"
              type="search"
              placeholder="Search vendor, title, summary…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ height: 28, paddingLeft: 26, fontSize: "var(--text-xs)" }}
              aria-label="Search inbox"
            />
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onMarkRead={bulkMarkRead}
          onSnooze={bulkSnooze}
          onResolve={bulkResolve}
          onEscalate={bulkEscalate}
          onClear={clearSelection}
        />
      )}

      {/* Loading / error / empty states */}
      {loading && (
        <div
          className="card"
          style={{ padding: 0, overflow: "hidden" }}
          aria-busy="true"
          aria-label="Loading inbox"
        >
          {Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{ padding: 16 }}>
          <span className="badge badge-danger">{error}</span>
        </div>
      )}

      {!loading && !error && visibleItems.length === 0 && (
        <div
          className="card"
          style={{
            padding: 56,
            textAlign: "center",
            color: "#64748b",
            fontSize: 14,
          }}
        >
          <p style={{ margin: "0 0 8px" }}>
            {query ? "Nothing matches your search. Try a different query." : emptyCopy}
          </p>
          <a
            href="/app/findings"
            style={{
              fontSize: 13,
              color: "var(--accent)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            View in Findings →
          </a>
        </div>
      )}

      {/* Grouped feed */}
      {!loading && !error && dayGroups.map((group) => (
        <section key={group.bucket} aria-label={group.label} style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#64748b",
              fontWeight: 600,
              marginBottom: 8,
              marginTop: 8,
              paddingLeft: 8,
            }}
          >
            {group.label} · {group.items.length}
          </div>
          <div
            className="card"
            style={{ padding: 0, overflow: "hidden" }}
            role="list"
            aria-label={`${group.label} items`}
          >
            {group.items.map((item, idxInGroup) => {
              flatIndex += 1;
              const idx = flatIndex;
              const unread = item.state === "new" && !readIds.has(item.id);
              const isFirst = idxInGroup === 0;
              const isLast = idxInGroup === group.items.length - 1;
              return (
                <div
                  key={item.id}
                  role="listitem"
                  ref={(el) => { rowRefs.current[idx] = el as HTMLDivElement | null; }}
                >
                  <MaterialChangeCard
                    item={item}
                    focused={focusedIndex === idx}
                    selected={selectedIds.has(item.id)}
                    unread={unread}
                    escalated={escalatedIds.has(item.id)}
                    showCheckbox={selectedIds.size > 0}
                    isFirst={isFirst}
                    isLast={isLast}
                    onClick={() => openDrawer(item)}
                    onFocus={() => setFocusedIndex(idx)}
                    onToggleSelect={() => toggleSelect(item.id)}
                    onSnooze={() => void handleSnoozeOne(item)}
                    onArchive={() => void handleAcknowledge(item)}
                    onEscalate={() => void handleEscalateOne(item)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Keyboard hint bar */}
      {visibleItems.length > 0 && !loading && (
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 16,
            fontSize: 11,
            color: "#94a3b8",
            fontFamily: "var(--font-mono)",
            flexWrap: "wrap",
          }}
          aria-hidden="true"
        >
          {[
            ["J/K", "navigate"],
            ["Enter", "open"],
            ["R", "open"],
            ["E", "resolve"],
            ["S", "snooze 48h"],
            ["X", "select"],
          ].map(([key, desc]) => (
            <span key={key}>
              <kbd
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  fontSize: 11,
                  color: "#475569",
                }}
              >
                {key}
              </kbd>{" "}
              {desc}
            </span>
          ))}
        </div>
      )}

      {/* Drawer */}
      <ChangeDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        item={drawerItem}
        onEscalated={(id) => {
          setEscalatedIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </main>
  );
}
