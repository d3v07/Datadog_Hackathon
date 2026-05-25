import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { InboxItem } from "@unsyphn/shared";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";
import { useKeyOnce } from "../lib/keyboard.js";
import { MaterialChangeCard } from "../components/MaterialChangeCard.js";
import { ChangeDrawer } from "../components/ChangeDrawer.js";
import { VendorLogo } from "../components/VendorLogo.js";

// ChangeDrawer will be provided by Agent I (Wave 3). Until that file exists, we
// render inline detail inside the generic Drawer to keep typecheck and build green.

type FilterKind = "all" | "changes" | "renewals" | "unused-seats";
type SeverityFilter = "all" | "P1" | "P2";

interface InboxResponse {
  items: InboxItem[];
  total: number;
}

function formatImpact(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d ago";
  return `${diffDays}d ago`;
}

function buildSummary(items: InboxItem[]): string {
  const alerts = items.filter((i) => i.severity === "P1").length;
  const renewals = items.filter((i) => i.kind === "renewal").length;
  const unused = items.filter((i) => i.kind === "unused-seats").length;
  const parts: string[] = [];
  if (alerts > 0) parts.push(`${alerts} unresolved alert${alerts !== 1 ? "s" : ""}`);
  if (renewals > 0) parts.push(`${renewals} renewal${renewals !== 1 ? "s" : ""} in window`);
  if (unused > 0) parts.push(`${unused} unused seat${unused !== 1 ? "s" : ""} flagged`);
  return parts.join(" · ") || "Inbox clear";
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
        height: 44,
        borderBottom: "1px solid var(--border)",
        background: "var(--surface-2)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "0 var(--space-4)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border-strong)" }} />
      <div style={{ width: 24, height: 8, borderRadius: 4, background: "var(--border-strong)" }} />
      <div style={{ width: 24, height: 24, borderRadius: "var(--radius-sm)", background: "var(--border-strong)" }} />
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--border-strong)", maxWidth: 240 }} />
    </div>
  );
}

function InboxDrawerContent({ item }: { item: InboxItem }): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <VendorLogo name={item.vendorName} size={40} />
        <div>
          <div style={{ fontWeight: 500, fontSize: "var(--text-base)", color: "var(--text-strong)" }}>
            {item.vendorName}
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-2)" }}>{item.title}</div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-2)", lineHeight: 1.6 }}>
          {item.summary}
        </p>
      </div>
      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <div>
          <dt style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Impact</dt>
          <dd style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-strong)" }}>
            {formatImpact(item.dollarImpact)}
          </dd>
        </div>
        <div>
          <dt style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Severity</dt>
          <dd style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-strong)" }}>{item.severity}</dd>
        </div>
        <div>
          <dt style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Owner</dt>
          <dd style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-strong)" }}>{item.ownerEmail}</dd>
        </div>
        <div>
          <dt style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Occurred</dt>
          <dd style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-strong)" }}>{relativeTime(item.occurredAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function Inbox(): JSX.Element {
  const [allItems, setAllItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKind>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [query, setQuery] = useState("");

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<InboxItem | null>(null);

  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const bearer = localStorage.getItem("unsyphn:bearer") ?? DEMO_BEARER_TOKEN;
    const params = new URLSearchParams({ filter, severity, lens: "procurement" });

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
  }, [filter, severity]);

  const visibleItems = allItems.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return item.vendorName.toLowerCase().includes(q) || item.title.toLowerCase().includes(q);
  });

  function openDrawer(item: InboxItem): void {
    setDrawerItem(item);
    setDrawerOpen(true);
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

  async function handleSnooze(item: InboxItem): Promise<void> {
    const until = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    try {
      await postLifecycle(item.id, "snooze", { snoozedUntil: until });
      setAllItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch { /* ignore */ }
  }

  async function handleResolve(item: InboxItem): Promise<void> {
    try {
      await postLifecycle(item.id, "resolve", { resolution: "accepted" });
      setAllItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch { /* ignore */ }
  }

  const moveFocus = useCallback((delta: number) => {
    if (drawerOpen) return;
    setFocusedIndex((prev) => {
      const next = Math.max(0, Math.min(visibleItems.length - 1, prev + delta));
      rowRefs.current[next]?.focus();
      return next;
    });
  }, [drawerOpen, visibleItems.length]);

  useKeyOnce("j", useCallback(() => moveFocus(1), [moveFocus]));
  useKeyOnce("k", useCallback(() => moveFocus(-1), [moveFocus]));

  useKeyOnce("e", useCallback(() => {
    if (drawerOpen || focusedIndex < 0) return;
    const item = visibleItems[focusedIndex];
    if (item) void handleAcknowledge(item);
  }, [drawerOpen, focusedIndex, visibleItems])); // eslint-disable-line react-hooks/exhaustive-deps

  useKeyOnce("s", useCallback(() => {
    if (drawerOpen || focusedIndex < 0) return;
    const item = visibleItems[focusedIndex];
    if (item) void handleSnooze(item);
  }, [drawerOpen, focusedIndex, visibleItems])); // eslint-disable-line react-hooks/exhaustive-deps

  useKeyOnce("r", useCallback(() => {
    if (drawerOpen || focusedIndex < 0) return;
    const item = visibleItems[focusedIndex];
    if (item) void handleResolve(item);
  }, [drawerOpen, focusedIndex, visibleItems])); // eslint-disable-line react-hooks/exhaustive-deps

  useKeyOnce("x", useCallback(() => {
    if (drawerOpen || focusedIndex < 0) return;
    const item = visibleItems[focusedIndex];
    if (item) openDrawer(item);
  }, [drawerOpen, focusedIndex, visibleItems])); // eslint-disable-line react-hooks/exhaustive-deps

  const FILTER_CHIPS: Array<{ label: string; value: FilterKind }> = [
    { label: "All", value: "all" },
    { label: "Changes", value: "changes" },
    { label: "Renewals", value: "renewals" },
    { label: "Unused seats", value: "unused-seats" },
  ];

  return (
    <main
      className="page"
      style={{ padding: "var(--space-7) var(--space-6)", maxWidth: 900, margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <h1 className="h1" style={{ marginBottom: "var(--space-2)" }}>Inbox</h1>
        {!loading && !error && (
          <p className="lead" style={{ margin: 0 }}>
            {allItems.length === 0 ? "Inbox zero. Last cleared 14 minutes ago. Nice work." : buildSummary(allItems)}
          </p>
        )}
      </div>

      {/* Filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        {FILTER_CHIPS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
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

          <div style={{ position: "relative", width: 180 }}>
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
              placeholder="Search vendors…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ height: 28, paddingLeft: 26, fontSize: "var(--text-xs)" }}
              aria-label="Search inbox"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div
        className="card"
        style={{ padding: 0, overflow: "hidden" }}
        role="list"
        aria-label="Inbox items"
        aria-live="polite"
        aria-busy={loading}
      >
        {loading && Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)}

        {!loading && error && (
          <div style={{ padding: "var(--space-4)" }}>
            <span className="badge badge-danger">{error}</span>
          </div>
        )}

        {!loading && !error && visibleItems.length === 0 && allItems.length > 0 && (
          <div
            style={{
              padding: "var(--space-7)",
              textAlign: "center",
              color: "var(--text-2)",
              fontSize: "var(--text-sm)",
            }}
          >
            Nothing here. Try changing the filter.
          </div>
        )}

        {!loading && !error && allItems.length === 0 && (
          <div
            style={{
              padding: "var(--space-7)",
              textAlign: "center",
              color: "var(--text-2)",
              fontSize: "var(--text-sm)",
            }}
          >
            Inbox zero. Last cleared 14 minutes ago. Nice work.
          </div>
        )}

        {!loading && !error && visibleItems.map((item, idx) => (
          <div
            key={item.id}
            role="listitem"
            ref={(el) => { rowRefs.current[idx] = el as HTMLDivElement | null; }}
          >
            <MaterialChangeCard
              item={item}
              focused={focusedIndex === idx}
              selected={false}
              onClick={() => openDrawer(item)}
              onFocus={() => setFocusedIndex(idx)}
            />
          </div>
        ))}
      </div>

      {/* Keyboard hint bar */}
      {visibleItems.length > 0 && !loading && (
        <div
          style={{
            display: "flex",
            gap: "var(--space-4)",
            marginTop: "var(--space-4)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
          aria-hidden="true"
        >
          {[["J/K", "navigate"], ["↵", "open"], ["E", "ack"], ["S", "snooze 48h"], ["R", "resolve"], ["X", "escalate"]].map(([key, desc]) => (
            <span key={key}>
              <kbd
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "1px 4px",
                  fontSize: "var(--text-xs)",
                }}
              >
                {key}
              </kbd>{" "}
              {desc}
            </span>
          ))}
        </div>
      )}

      {/* Material Change drawer (Wave 3 Agent I) */}
      <ChangeDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        item={drawerItem}
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
