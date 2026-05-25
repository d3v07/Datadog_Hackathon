import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { NewRequestDrawer } from "../components/requests/NewRequestDrawer.js";
import { RequestRow } from "../components/requests/RequestRow.js";
import { Toast, type ToastState } from "../components/requests/Toast.js";
import {
  addRequestComment,
  decideRequest,
  listRequests,
  RequestsApiError,
} from "../components/requests/api.js";
import type {
  RequestDto,
  RouteTarget,
  StatusFilter,
} from "../components/requests/types.js";
import { useRole } from "../lib/role.js";

const STATUS_FILTERS: ReadonlyArray<{ key: StatusFilter; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "routed", label: "Routed for review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

function buildLead(items: RequestDto[]): string {
  const pending = items.filter((r) => r.status === "pending").length;
  const approved = items.filter((r) => r.status === "approved").length;
  const total = items.reduce((s, r) => s + r.expectedSpendUsd, 0);
  const usd =
    total >= 1_000_000
      ? `$${(total / 1_000_000).toFixed(1)}M`
      : total >= 1000
      ? `$${Math.round(total / 1000)}k`
      : `$${total}`;
  return `${pending} pending · ${approved} approved this quarter · ${usd} requested`;
}

export function Requests(): JSX.Element {
  const [role] = useRole();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [items, setItems] = useState<RequestDto[]>([]);
  const [allItems, setAllItems] = useState<RequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const showToast = useCallback((msg: string, variant: ToastState["variant"] = "success") => {
    setToast({ message: msg, variant });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [filtered, all] = await Promise.all([
        listRequests({ status: filter, lens: role }),
        listRequests({ status: "all", lens: role }),
      ]);
      setItems(filtered);
      setAllItems(all);
    } catch {
      setItems([]);
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter, role]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listRequests({ status: filter, lens: role }),
      listRequests({ status: "all", lens: role }),
    ])
      .then(([filtered, all]) => {
        if (cancelled) return;
        setItems(filtered);
        setAllItems(all);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setAllItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, role]);

  const applyUpdated = useCallback((updated: RequestDto) => {
    setItems((prev) => {
      const idx = prev.findIndex((r) => r.id === updated.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
    setAllItems((prev) => {
      const idx = prev.findIndex((r) => r.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  }, []);

  const runDecision = useCallback(
    async (id: string, body: Parameters<typeof decideRequest>[1], successMsg: string) => {
      setBusyId(id);
      try {
        const updated = await decideRequest(id, body);
        applyUpdated(updated);
        showToast(successMsg);
        // The tab the row was in may no longer match — refresh in background.
        void refresh();
      } catch (err) {
        const msg =
          err instanceof RequestsApiError ? err.message : "Action failed. Try again.";
        showToast(msg, "error");
      } finally {
        setBusyId(null);
      }
    },
    [applyUpdated, refresh, showToast],
  );

  const onApprove = useCallback(
    (id: string) => runDecision(id, { status: "approved" }, "Request approved"),
    [runDecision],
  );
  const onReject = useCallback(
    (id: string) => runDecision(id, { status: "rejected" }, "Request rejected"),
    [runDecision],
  );
  const onRoute = useCallback(
    (id: string, target: RouteTarget, note?: string) =>
      runDecision(
        id,
        note ? { status: "routed", routeTo: target, note } : { status: "routed", routeTo: target },
        `Routed to ${target}`,
      ),
    [runDecision],
  );
  const onReopen = useCallback(
    (id: string) => runDecision(id, { status: "pending" }, "Request re-opened"),
    [runDecision],
  );
  const onRecall = useCallback(
    (id: string) => runDecision(id, { status: "pending" }, "Request recalled"),
    [runDecision],
  );
  // TODO: stretch. Portfolio doesn't yet read `?vendorName=&fromRequest=` to
  // prefill the New Vendor drawer (apps/web/src/screens/Portfolio.tsx). For now
  // we toast the user with a hint instead of routing them to a dead-end form.
  const onConvert = useCallback(
    (req: RequestDto) => {
      showToast(`Open Vendors → New vendor and paste "${req.vendorName}" to convert.`);
    },
    [showToast],
  );
  const onComment = useCallback(
    async (id: string, text: string) => {
      try {
        const updated = await addRequestComment(id, text);
        applyUpdated(updated);
        showToast("Comment posted");
      } catch (err) {
        const msg =
          err instanceof RequestsApiError ? err.message : "Could not post comment.";
        showToast(msg, "error");
        throw err;
      }
    },
    [applyUpdated, showToast],
  );

  const handleCreated = useCallback(
    (created: RequestDto) => {
      setItems((prev) => [created, ...prev]);
      setAllItems((prev) => [created, ...prev]);
      showToast("Request submitted — routed to your manager");
    },
    [showToast],
  );

  const tabCount = useCallback(
    (key: StatusFilter): number => {
      if (key === "all") return allItems.length;
      return allItems.filter((r) => r.status === key).length;
    },
    [allItems],
  );

  return (
    <main
      className="page"
      style={{ padding: "var(--space-7) var(--space-6)", maxWidth: 1000, margin: "0 auto" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-2)",
        }}
      >
        <h1 className="h1">Requests</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open new request form"
        >
          <Plus size={14} aria-hidden="true" />
          New request
        </button>
      </div>

      {allItems.length > 0 && (
        <p className="lead" style={{ marginBottom: "var(--space-5)" }}>{buildLead(allItems)}</p>
      )}

      <div
        role="tablist"
        aria-label="Filter requests by status"
        style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}
      >
        {STATUS_FILTERS.map(({ key, label }) => {
          const active = filter === key;
          const count = tabCount(key);
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              style={{
                padding: "4px var(--space-3)",
                fontSize: "var(--text-sm)",
                fontFamily: "var(--font-text)",
                borderRadius: "var(--radius-full)",
                border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: active ? "var(--accent-soft)" : "var(--surface)",
                color: active ? "var(--accent)" : "var(--text-2)",
                cursor: "pointer",
                transition: "all var(--dur-fast) var(--ease-out)",
                fontWeight: active ? 500 : 400,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {label}
              <span
                aria-hidden="true"
                style={{
                  fontSize: "var(--text-xs)",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  background: active ? "transparent" : "var(--surface-2)",
                  padding: "0 6px",
                  borderRadius: "var(--radius-full)",
                  minWidth: 18,
                  textAlign: "center",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading && (
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }} aria-live="polite">
          Loading requests...
        </p>
      )}
      {!loading && items.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          No {filter !== "all" ? filter : ""} requests for the {role} lens.
        </p>
      )}
      {!loading &&
        items.map((req) => (
          <RequestRow
            key={req.id}
            request={req}
            busy={busyId === req.id}
            onApprove={onApprove}
            onReject={onReject}
            onRoute={onRoute}
            onReopen={onReopen}
            onRecall={onRecall}
            onConvert={onConvert}
            onComment={onComment}
          />
        ))}

      <NewRequestDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
      />
      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </main>
  );
}
