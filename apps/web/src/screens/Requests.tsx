import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import type { IntakeRequest } from "@unsyphn/shared";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";
import { VendorLogo } from "../components/VendorLogo.js";
import { Drawer } from "../components/Drawer.js";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const SIMILAR_TOOLS: Record<string, Array<{ name: string; category: string }>> = {
  linear: [{ name: "Asana", category: "Productivity" }],
  monday: [{ name: "Asana", category: "Productivity" }, { name: "Jira", category: "Engineering" }],
  vercel: [{ name: "Netlify", category: "Hosting" }, { name: "AWS Amplify", category: "Hosting" }],
};

interface FormState {
  vendorName: string;
  expectedSpendUsd: string;
  justification: string;
  dataClassification: "PII" | "Confidential" | "Public";
}
const DEFAULT_FORM: FormState = { vendorName: "", expectedSpendUsd: "", justification: "", dataClassification: "Confidential" };

const labelStyle: React.CSSProperties = { display: "block", fontSize: "var(--text-sm)", color: "var(--text-2)", marginBottom: "var(--space-1)" };

function relativeTime(iso: string): string {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d === 0 ? "today" : d === 1 ? "1d ago" : `${d}d ago`;
}

function buildLead(items: IntakeRequest[]): string {
  const pending = items.filter((r) => r.status === "pending").length;
  const approved = items.filter((r) => r.status === "approved").length;
  const total = items.reduce((s, r) => s + r.expectedSpendUsd, 0);
  const usd = total >= 1_000_000 ? `$${(total / 1_000_000).toFixed(1)}M` : total >= 1000 ? `$${Math.round(total / 1000)}k` : `$${total}`;
  return `${pending} pending · ${approved} approved this quarter · ${usd} requested`;
}

function spendLabel(n: number): string {
  return n >= 1000 ? `$${Math.round(n / 1000)}k/yr` : `$${n}/yr`;
}

function RequestRow({ req }: { req: IntakeRequest }): JSX.Element {
  const statusCls = req.status === "approved" ? "badge badge-success" : req.status === "rejected" ? "badge badge-danger" : "badge badge-warning";
  const statusLabel = req.status === "approved" ? "Approved" : req.status === "rejected" ? "Rejected" : "Pending";
  return (
    <article className="card" style={{ padding: "var(--space-4) var(--space-5)", marginBottom: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
        <VendorLogo name={req.vendorName} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", marginBottom: "var(--space-1)" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "var(--text-base)", color: "var(--text-strong)" }}>
              {req.vendorName}
            </span>
            <span className={statusCls}>{statusLabel}</span>
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-2)", marginBottom: "var(--space-1)" }}>
            Requested by {req.requesterEmail} &middot; {relativeTime(req.createdAt)}
          </div>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)", marginBottom: "var(--space-1)" }}>
            {spendLabel(req.expectedSpendUsd)}
          </div>
          {req.justification && (
            <div style={{ fontSize: "var(--text-sm)", fontStyle: "italic", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
              &ldquo;{req.justification}&rdquo;
            </div>
          )}
          {req.similarTools.length > 0 && (
            <div
              className="badge badge-warning"
              style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", height: "auto", padding: "var(--space-1) var(--space-2)", marginBottom: "var(--space-3)", textTransform: "none", letterSpacing: 0, fontSize: "var(--text-xs)" }}
            >
              <AlertTriangle size={12} aria-hidden="true" />
              Similar tools you own: {req.similarTools.join(", ")}
            </div>
          )}
          {req.status === "pending" && (
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={() => alert(`Approved ${req.vendorName}. Would POST /v1/requests/${req.id}/approve.`)}>Approve</button>
              <button type="button" className="btn btn-secondary" onClick={() => alert(`Rejected ${req.vendorName}.`)}>Reject</button>
              <button type="button" className="btn btn-ghost" onClick={() => alert("Routed to Legal + Security review.")}>Send for review</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function NewRequestDrawer({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [matches, setMatches] = useState<Array<{ name: string; category: string }>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onVendorChange = useCallback((v: string) => {
    setForm((p) => ({ ...p, vendorName: v }));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMatches(SIMILAR_TOOLS[v.trim().toLowerCase()] ?? []), 300);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleClose = useCallback(() => { setForm(DEFAULT_FORM); setMatches([]); onClose(); }, [onClose]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    alert("Request submitted (demo mode — would POST to /v1/requests in production)");
    handleClose();
  }, [handleClose]);

  const field = (id: string, label: string, el: React.ReactNode) => (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      {el}
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="New request">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {field("req-vendor", "Vendor name",
          <>
            <input id="req-vendor" className="input" type="text" value={form.vendorName} onChange={(e) => onVendorChange(e.target.value)} placeholder="e.g. Linear" required />
            {matches.length > 0 && (
              <div style={{ marginTop: "var(--space-2)", padding: "var(--space-3)", background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.20)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
                <div style={{ fontWeight: 500, color: "var(--warning)", marginBottom: "var(--space-1)" }}>Similar tools you may already own:</div>
                <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
                  {matches.map((t) => <li key={t.name}>{t.name} ({t.category})</li>)}
                </ul>
                <div style={{ marginTop: "var(--space-1)", color: "var(--text-muted)", fontStyle: "italic" }}>Consider consolidating before approving.</div>
              </div>
            )}
          </>
        )}
        {field("req-spend", "Expected annual spend ($)",
          <input id="req-spend" className="input" type="number" min={0} value={form.expectedSpendUsd} onChange={(e) => setForm((p) => ({ ...p, expectedSpendUsd: e.target.value }))} placeholder="12000" required />
        )}
        {field("req-justification", "Business justification",
          <textarea id="req-justification" className="input" value={form.justification} onChange={(e) => setForm((p) => ({ ...p, justification: e.target.value }))} placeholder="Describe why this tool is needed..." rows={3} style={{ height: "auto", resize: "vertical" }} required />
        )}
        {field("req-classification", "Data classification",
          <select id="req-classification" className="input" value={form.dataClassification} onChange={(e) => setForm((p) => ({ ...p, dataClassification: e.target.value as FormState["dataClassification"] }))}>
            <option value="PII">PII</option>
            <option value="Confidential">Confidential</option>
            <option value="Public">Public</option>
          </select>
        )}
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Submit request</button>
      </form>
    </Drawer>
  );
}

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

export function Requests(): JSX.Element {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [items, setItems] = useState<IntakeRequest[]>([]);
  const [allItems, setAllItems] = useState<IntakeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = filter === "all" ? "" : `?status=${filter}`;
    fetch(`/v1/requests${qs}`, { headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` } })
      .then((r) => r.json())
      .then((data: IntakeRequest[]) => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter]);

  useEffect(() => {
    fetch("/v1/requests", { headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` } })
      .then((r) => r.json())
      .then((data: IntakeRequest[]) => setAllItems(data))
      .catch(() => setAllItems([]));
  }, []);

  return (
    <main className="page" style={{ padding: "var(--space-7) var(--space-6)", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h1 className="h1">Requests</h1>
        <button type="button" className="btn btn-primary" onClick={() => setDrawerOpen(true)} aria-label="Open new request form">
          <Plus size={14} aria-hidden="true" />
          New request
        </button>
      </div>

      {allItems.length > 0 && (
        <p className="lead" style={{ marginBottom: "var(--space-5)" }}>{buildLead(allItems)}</p>
      )}

      <div role="tablist" aria-label="Filter requests by status" style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
        {STATUS_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            style={{
              padding: "4px var(--space-3)",
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-text)",
              borderRadius: "var(--radius-full)",
              border: filter === key ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: filter === key ? "var(--accent-soft)" : "var(--surface)",
              color: filter === key ? "var(--accent)" : "var(--text-2)",
              cursor: "pointer",
              transition: "all var(--dur-fast) var(--ease-out)",
              fontWeight: filter === key ? 500 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }} aria-live="polite">Loading requests...</p>}
      {!loading && items.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>No {filter !== "all" ? filter : ""} requests.</p>}
      {!loading && items.map((req) => <RequestRow key={req.id} req={req} />)}

      <NewRequestDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  );
}
