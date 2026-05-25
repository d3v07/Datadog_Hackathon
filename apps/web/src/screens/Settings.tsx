import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Circle, Download } from "lucide-react";
import { Drawer } from "../components/Drawer.js";
import { StripeModal } from "./StripeModal.js";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";
import { ConnectDrawer, type IntegrationDto } from "../components/ConnectDrawer.js";
import { ManageDrawer } from "../components/ManageDrawer.js";
import { IntegrationCard } from "../components/IntegrationCard.js";

type Tab = "connections" | "team" | "billing";

const ROLES = ["Owner", "Admin", "Procurement", "Legal", "Security", "Finance", "IT", "Audit"];

// --- Styles ---

const S = {
  page: { padding: "var(--space-7) var(--space-6)", maxWidth: 1200, margin: "0 auto" } as React.CSSProperties,
  pageNarrow: { padding: "var(--space-7) var(--space-6)", maxWidth: 780, margin: "0 auto" } as React.CSSProperties,
  h1: { fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 600, color: "var(--text)", margin: "0 0 var(--space-5)" } as React.CSSProperties,
  tabBar: { display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: "var(--space-6)" } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    padding: "8px var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 400, color: active ? "var(--accent)" : "var(--text-2)", background: "none", border: "none", borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer", marginBottom: -1,
  }),
  section: { marginBottom: "var(--space-7)" } as React.CSSProperties,
  sectionHeader: { display: "flex", alignItems: "baseline", gap: "var(--space-2)", marginBottom: "var(--space-3)" } as React.CSSProperties,
  sectionLabel: { fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.07em" } as React.CSSProperties,
  sectionCount: { fontSize: "var(--text-xs)", color: "var(--text-muted)" } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-3)" } as React.CSSProperties,
  card: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" } as React.CSSProperties,
  row: { display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  rowLast: { display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) var(--space-5)" } as React.CSSProperties,
  rowInfo: { flex: 1, minWidth: 0 } as React.CSSProperties,
  rowName: { fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)", display: "flex", alignItems: "center", gap: "var(--space-2)" } as React.CSSProperties,
  rowMeta: { fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 } as React.CSSProperties,
  badge: (ok: boolean): React.CSSProperties => ({ fontSize: "var(--text-xs)", fontWeight: 500, color: ok ? "var(--success)" : "var(--text-muted)", background: ok ? "rgba(22,163,74,0.08)" : "var(--surface-2)", borderRadius: "var(--radius-pill)", padding: "2px 8px" }),
  btnOutline: { fontSize: "var(--text-xs)", fontWeight: 500, padding: "5px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", color: "var(--text-2)", cursor: "pointer", whiteSpace: "nowrap" as const },
  btnAccent: { fontSize: "var(--text-xs)", fontWeight: 500, padding: "5px 12px", border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)", background: "var(--accent)", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" as const },
  avatar: { width: 32, height: 32, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: 600, flexShrink: 0 } as React.CSSProperties,
  billingBlock: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-5)", marginBottom: "var(--space-5)" } as React.CSSProperties,
  billingTitle: { fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text)", marginBottom: "var(--space-2)" } as React.CSSProperties,
  billingMeta: { fontSize: "var(--text-sm)", color: "var(--text-2)", marginBottom: "var(--space-4)", lineHeight: 1.6 } as React.CSSProperties,
  btnRow: { display: "flex", gap: "var(--space-3)", flexWrap: "wrap" as const } as React.CSSProperties,
  formGroup: { marginBottom: "var(--space-4)" } as React.CSSProperties,
  label: { display: "block", fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-2)", marginBottom: "var(--space-2)" } as React.CSSProperties,
  input: { width: "100%", padding: "8px var(--space-3)", fontSize: "var(--text-sm)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", background: "var(--surface)", color: "var(--text)", boxSizing: "border-box" as const },
  select: { width: "100%", padding: "8px var(--space-3)", fontSize: "var(--text-sm)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", background: "var(--surface)", color: "var(--text)" },
  inviteBtn: { marginTop: "var(--space-5)", width: "100%", padding: "10px", fontSize: "var(--text-sm)", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer" } as React.CSSProperties,
  toast: { position: "fixed" as const, bottom: 24, right: 24, background: "var(--text)", color: "#fff", padding: "10px 16px", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 300, maxWidth: 360 },
} as const;

// --- Toast helper ---

interface Toast { id: number; message: string }

function useToast(): { toast: Toast | null; show: (msg: string) => void } {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function show(message: string): void {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = setTimeout(() => setToast(null), 3200);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { toast, show };
}

// --- Connections Tab ---

function ConnectionsTab({ showToast }: { showToast: (msg: string) => void }): JSX.Element {
  const [integrations, setIntegrations] = useState<IntegrationDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connectTarget, setConnectTarget] = useState<IntegrationDto | null>(null);
  const [manageTarget, setManageTarget] = useState<IntegrationDto | null>(null);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch("/v1/integrations", { headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ integrations: IntegrationDto[] }>;
      })
      .then(({ integrations: list }) => { if (!cancelled) setIntegrations(list); })
      .catch(() => { if (!cancelled) setLoadError("Couldn't load integrations."); });
    return () => { cancelled = true; };
  }, []);

  function replace(next: IntegrationDto): void {
    setIntegrations((prev) => prev.map((i) => (i.id === next.id ? next : i)));
  }

  function handleConnected(next: IntegrationDto): void {
    replace(next);
    showToast(`Connected to ${next.name} — syncing now…`);
  }

  function handleDisconnected(next: IntegrationDto): void {
    replace(next);
    showToast(`Disconnected ${next.name}.`);
  }

  function handleSyncNow(it: IntegrationDto): void {
    setSyncing((p) => new Set(p).add(it.id));
    fetch(`/v1/integrations/${encodeURIComponent(it.id)}/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ synced: boolean; recordsScanned: number }>;
      })
      .then(({ recordsScanned }) => {
        replace({ ...it, lastSyncedAt: new Date().toISOString() });
        showToast(`${it.name}: synced ${recordsScanned.toLocaleString()} records.`);
      })
      .catch(() => showToast(`${it.name}: sync failed.`))
      .finally(() => setSyncing((p) => { const n = new Set(p); n.delete(it.id); return n; }));
  }

  const inbound = integrations.filter((i) => i.category === "inbound");
  const outbound = integrations.filter((i) => i.category === "outbound");

  const renderGrid = (items: IntegrationDto[]): JSX.Element => (
    <div style={S.grid}>
      {items.map((it) => (
        <IntegrationCard
          key={it.id}
          integration={it}
          onConnect={setConnectTarget}
          onManage={setManageTarget}
          onSyncNow={handleSyncNow}
          syncBusy={syncing.has(it.id)}
        />
      ))}
    </div>
  );

  return (
    <>
      {loadError && (
        <div style={{ ...S.section, color: "var(--danger)", fontSize: "var(--text-sm)" }}>{loadError}</div>
      )}
      <div style={S.section}>
        <div style={S.sectionHeader}>
          <span style={S.sectionLabel}>Inbound · data sources</span>
          <span style={S.sectionCount}>{inbound.length} connectors</span>
        </div>
        {inbound.length === 0 && !loadError ? (
          <div style={{ ...S.card, padding: "var(--space-5)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Loading integrations…
          </div>
        ) : (
          renderGrid(inbound)
        )}
      </div>
      <div style={S.section}>
        <div style={S.sectionHeader}>
          <span style={S.sectionLabel}>Outbound · action sinks</span>
          <span style={S.sectionCount}>{outbound.length} connectors</span>
        </div>
        {outbound.length === 0 && !loadError ? (
          <div style={{ ...S.card, padding: "var(--space-5)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Loading integrations…
          </div>
        ) : (
          renderGrid(outbound)
        )}
      </div>

      {connectTarget && (
        <ConnectDrawer
          integration={connectTarget}
          open
          onClose={() => setConnectTarget(null)}
          onConnected={handleConnected}
        />
      )}
      {manageTarget && (
        <ManageDrawer
          integration={manageTarget}
          open
          onClose={() => setManageTarget(null)}
          onDisconnected={handleDisconnected}
        />
      )}
    </>
  );
}

// --- Team Tab ---

interface TeamMember { id: string; name: string; email: string; role: string; avatarLetter: string }

function TeamTab({ showToast }: { showToast: (msg: string) => void }): JSX.Element {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Procurement");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/v1/team/members", { headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ members: TeamMember[] }>;
      })
      .then(({ members: list }) => { if (!cancelled) setMembers(list); })
      .catch(() => { if (!cancelled) setLoadError("Couldn't load team."); });
    return () => { cancelled = true; };
  }, []);

  async function handleInvite(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const resp = await fetch("/v1/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
        body: JSON.stringify({ email, role }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      showToast(`Invite sent to ${email}.`);
      setEmail("");
      setRole("Procurement");
      setDrawerOpen(false);
    } catch {
      showToast("Invite failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <div style={S.sectionLabel}>Members ({members.length})</div>
        <button type="button" style={S.btnAccent} onClick={() => setDrawerOpen(true)}>
          Invite member
        </button>
      </div>
      {loadError && <div style={{ color: "var(--danger)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>{loadError}</div>}
      <div style={{ ...S.card, marginBottom: "var(--space-5)" }}>
        {members.map((m, i) => (
          <div key={m.id} style={i < members.length - 1 ? S.row : S.rowLast}>
            <div style={S.avatar}>{m.avatarLetter}</div>
            <div style={S.rowInfo}>
              <div style={S.rowName}>{m.name}</div>
              <div style={S.rowMeta}>{m.email}</div>
            </div>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-2)", textTransform: "capitalize" }}>
              {m.role}
            </span>
            <span style={S.badge(true)}>Active</span>
          </div>
        ))}
      </div>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Invite member">
        <form onSubmit={(e) => void handleInvite(e)}>
          <div style={S.formGroup}>
            <label htmlFor="invite-email" style={S.label}>Email address</label>
            <input id="invite-email" type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={S.input} />
          </div>
          <div style={S.formGroup}>
            <label htmlFor="invite-role" style={S.label}>Role</label>
            <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)} style={S.select}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button type="submit" disabled={submitting} style={{ ...S.inviteBtn, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Sending…" : "Send invitation"}
          </button>
        </form>
      </Drawer>
    </>
  );
}

// --- Billing Tab ---

interface InvoiceDto { id: string; period: string; amountUsdCents: number; status: string; pdfUrl: string }

function BillingTab({ showToast }: { showToast: (msg: string) => void }): JSX.Element {
  const [stripeOpen, setStripeOpen] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);

  useEffect(() => {
    fetch("/v1/billing/invoices", { headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP"))))
      .then((j: { invoices: InvoiceDto[] }) => setInvoices(j.invoices))
      .catch(() => setInvoices([]));
  }, []);

  function handleDownload(inv: InvoiceDto): void {
    showToast(`Generating ${inv.id}.pdf — check your email shortly.`);
  }

  return (
    <>
      <div style={S.section}>
        <div style={S.sectionLabel}>Current plan</div>
        <div style={S.billingBlock}>
          <div style={S.billingTitle}>Growth · $1,500/mo · Billed annually</div>
          <div style={S.billingMeta}>
            Next charge: Jun 24, 2026 · $18,000<br />
            Card: •••• 4242
          </div>
          <div style={S.btnRow}>
            <button type="button" style={S.btnOutline} onClick={() => setStripeOpen(true)}>Manage subscription</button>
            <button type="button" style={S.btnOutline} onClick={() => setStripeOpen(true)}>Update payment method</button>
          </div>
        </div>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
          <a href="/pricing" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
            Upgrade to Scale or Enterprise
          </a>
        </p>
      </div>

      <div style={S.section}>
        <div style={S.sectionLabel}>Add-ons (active)</div>
        <div style={S.card}>
          <div style={S.rowLast}>
            <CheckCircle size={16} color="var(--success)" aria-hidden="true" />
            <div style={S.rowInfo}>
              <div style={S.rowName}>Compliance Pack</div>
              <div style={S.rowMeta}>$999/mo</div>
            </div>
          </div>
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionLabel}>Available add-ons</div>
        <div style={S.card}>
          {[
            { name: "Negotiation Concierge", price: "$10K/quarter" },
            { name: "GRC Bridge (Vanta + Drata)", price: "$1,000/mo" },
          ].map((addon, i, arr) => (
            <div key={addon.name} style={i < arr.length - 1 ? S.row : S.rowLast}>
              <Circle size={16} color="var(--text-muted)" aria-hidden="true" />
              <div style={S.rowInfo}>
                <div style={S.rowName}>{addon.name}</div>
                <div style={S.rowMeta}>{addon.price}</div>
              </div>
              <button type="button" style={S.btnAccent} onClick={() => setStripeOpen(true)}>Add</button>
            </div>
          ))}
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionLabel}>Recent invoices</div>
        <div style={S.card}>
          {invoices.length === 0 && (
            <div style={{ padding: "var(--space-5)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              No invoices yet.
            </div>
          )}
          {invoices.map((inv, i) => (
            <div key={inv.id} style={i < invoices.length - 1 ? S.row : S.rowLast}>
              <div style={S.rowInfo}>
                <div style={S.rowName}>{inv.id}</div>
                <div style={S.rowMeta}>
                  {inv.period} · ${(inv.amountUsdCents / 100).toLocaleString()}
                </div>
              </div>
              <span style={S.badge(true)}>{inv.status}</span>
              <button type="button" style={S.btnOutline} aria-label={`Download ${inv.id}`} onClick={() => handleDownload(inv)}>
                <Download size={12} aria-hidden="true" style={{ display: "inline", marginRight: 4 }} />
                Download
              </button>
            </div>
          ))}
        </div>
      </div>

      {stripeOpen && <StripeModal onClose={() => setStripeOpen(false)} />}
    </>
  );
}

// --- Main ---

export function Settings(): JSX.Element {
  const [tab, setTab] = useState<Tab>("connections");
  const { toast, show } = useToast();
  const pageStyle = useMemo(() => (tab === "connections" ? S.page : S.pageNarrow), [tab]);

  return (
    <main style={pageStyle}>
      <h1 style={S.h1}>Settings</h1>
      <div style={S.tabBar} role="tablist" aria-label="Settings sections">
        {(["connections", "team", "billing"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={S.tab(tab === t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === "connections" && <ConnectionsTab showToast={show} />}
      {tab === "team" && <TeamTab showToast={show} />}
      {tab === "billing" && <BillingTab showToast={show} />}
      {toast && <div role="status" aria-live="polite" style={S.toast}>{toast.message}</div>}
    </main>
  );
}
