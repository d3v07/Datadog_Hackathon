import { useState } from "react";
import { CheckCircle, Circle, Download } from "lucide-react";
import { VendorLogo } from "../components/VendorLogo.js";
import { Drawer } from "../components/Drawer.js";
import { StripeModal } from "./StripeModal.js";

type Tab = "connections" | "team" | "billing";

// --- Data ---

interface Connector {
  id: string;
  name: string;
  domain: string;
  section: "inbound" | "outbound";
  connected: boolean;
  meta?: string;
  email?: string;
  syncAgo?: string;
  vendorCount?: number;
  url?: string;
}

const INITIAL_CONNECTORS: Connector[] = [
  { id: "google", name: "Google Workspace", domain: "google.com", section: "inbound", connected: true, email: "priya@acme.dev", syncAgo: "12 min ago", vendorCount: 247 },
  { id: "microsoft365", name: "Microsoft 365", domain: "microsoft.com", section: "inbound", connected: false, meta: "OAuth: directory.read · email.read.metadata" },
  { id: "okta", name: "Okta", domain: "okta.com", section: "inbound", connected: false },
  { id: "brex", name: "Brex", domain: "brex.com", section: "inbound", connected: false },
  { id: "ramp", name: "Ramp", domain: "ramp.com", section: "inbound", connected: false },
  { id: "netsuite", name: "NetSuite", domain: "netsuite.com", section: "inbound", connected: false },
  { id: "quickbooks", name: "QuickBooks", domain: "quickbooks.com", section: "inbound", connected: false },
  { id: "slack", name: "Slack", domain: "slack.com", section: "outbound", connected: true, url: "acme.slack.com" },
  { id: "jira", name: "Jira", domain: "atlassian.com", section: "outbound", connected: true, url: "acme.atlassian.net" },
  { id: "teams", name: "Microsoft Teams", domain: "microsoft.com", section: "outbound", connected: false },
  { id: "linear", name: "Linear", domain: "linear.app", section: "outbound", connected: false },
  { id: "vanta", name: "Vanta", domain: "vanta.com", section: "outbound", connected: false },
];

const TEAM_MEMBERS = [
  { initials: "PS", name: "Priya Shah", email: "priya@acme.dev", role: "Owner" },
  { initials: "ML", name: "Marcus Lee", email: "marcus@acme.dev", role: "Admin" },
  { initials: "AL", name: "Alex Lin", email: "alex@acme.dev", role: "Procurement" },
  { initials: "AC", name: "Ada Chen", email: "ada@acme.dev", role: "Security" },
];

const ROLES = ["Owner", "Admin", "Procurement", "Legal", "Security", "Finance", "IT", "Audit"];

const INVOICES = [
  { id: "INV-2026-05", period: "May 2026", amount: "$18,999", status: "Paid" },
  { id: "INV-2026-04", period: "Apr 2026", amount: "$18,999", status: "Paid" },
  { id: "INV-2026-03", period: "Mar 2026", amount: "$1,500", status: "Paid" },
];

// --- Styles ---

const S = {
  page: { padding: "var(--space-7) var(--space-6)", maxWidth: 780, margin: "0 auto" } as React.CSSProperties,
  h1: { fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 600, color: "var(--text)", margin: "0 0 var(--space-5)" } as React.CSSProperties,
  tabBar: { display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: "var(--space-6)" } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    padding: "8px var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 400, color: active ? "var(--accent)" : "var(--text-2)", background: "none", border: "none", borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer", marginBottom: -1,
  }),
  section: { marginBottom: "var(--space-7)" } as React.CSSProperties,
  sectionLabel: { fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: "var(--space-3)" } as React.CSSProperties,
  card: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" } as React.CSSProperties,
  row: { display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  rowLast: { display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) var(--space-5)" } as React.CSSProperties,
  rowInfo: { flex: 1, minWidth: 0 } as React.CSSProperties,
  rowName: { fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)", display: "flex", alignItems: "center", gap: "var(--space-2)" } as React.CSSProperties,
  rowMeta: { fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 } as React.CSSProperties,
  badge: (ok: boolean): React.CSSProperties => ({ fontSize: "var(--text-xs)", fontWeight: 500, color: ok ? "var(--success)" : "var(--text-muted)", background: ok ? "rgba(22,163,74,0.08)" : "var(--surface-2)", borderRadius: "var(--radius-pill)", padding: "2px 8px" }),
  btnOutline: { fontSize: "var(--text-xs)", fontWeight: 500, padding: "5px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", color: "var(--text-2)", cursor: "pointer", whiteSpace: "nowrap" as const },
  btnAccent: { fontSize: "var(--text-xs)", fontWeight: 500, padding: "5px 12px", border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)", background: "var(--accent)", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" as const },
  btnDanger: { fontSize: "var(--text-xs)", fontWeight: 500, padding: "5px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", color: "var(--danger)", cursor: "pointer", whiteSpace: "nowrap" as const },
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
} as const;

// --- Connections Tab ---

function ConnectionsTab(): JSX.Element {
  const [connectors, setConnectors] = useState<Connector[]>(INITIAL_CONNECTORS);
  const [connecting, setConnecting] = useState<Set<string>>(new Set());

  function handleConnect(id: string): void {
    setConnecting((prev) => new Set(prev).add(id));
    setTimeout(() => {
      const count = Math.floor(Math.random() * 150) + 50;
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, connected: true, vendorCount: count, syncAgo: "just now" } : c
        )
      );
      setConnecting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      alert(`Connected. Discovered ${count} vendors. (demo mode)`);
    }, 1200);
  }

  function handleDisconnect(id: string): void {
    setConnectors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, connected: false, vendorCount: undefined, syncAgo: undefined } : c))
    );
    alert("Disconnected. (demo mode)");
  }

  function renderRow(c: Connector, isLast: boolean): JSX.Element {
    const busy = connecting.has(c.id);
    const rowStyle = isLast ? S.rowLast : S.row;
    return (
      <div key={c.id} style={rowStyle}>
        <VendorLogo name={c.name} domain={c.domain} size={28} />
        <div style={S.rowInfo}>
          <div style={S.rowName}>
            {c.name}
            {c.connected && (
              <span style={S.badge(true)}>
                <CheckCircle size={10} aria-hidden="true" style={{ display: "inline", marginRight: 3 }} />
                Connected{c.vendorCount != null ? ` · ${c.vendorCount} vendors` : ""}
              </span>
            )}
            {!c.connected && <span style={S.badge(false)}>Not connected</span>}
          </div>
          {c.connected && (c.email ?? c.url) && (
            <div style={S.rowMeta}>{c.email ?? c.url}{c.syncAgo ? ` · Last sync ${c.syncAgo}` : ""}</div>
          )}
          {!c.connected && c.meta && <div style={S.rowMeta}>{c.meta}</div>}
        </div>
        {c.connected ? (
          c.section === "inbound" ? (
            <button type="button" style={S.btnOutline} onClick={() => handleConnect(c.id)} disabled={busy}>
              {busy ? "Reconnecting…" : "Reconnect"}
            </button>
          ) : (
            <button type="button" style={S.btnDanger} onClick={() => handleDisconnect(c.id)}>
              Disconnect
            </button>
          )
        ) : (
          <button type="button" style={busy ? { ...S.btnAccent, opacity: 0.6 } : S.btnAccent} onClick={() => handleConnect(c.id)} disabled={busy}>
            {busy ? "Connecting…" : "Connect"}
          </button>
        )}
      </div>
    );
  }

  const inbound = connectors.filter((c) => c.section === "inbound");
  const outbound = connectors.filter((c) => c.section === "outbound");

  return (
    <>
      <div style={S.section}>
        <div style={S.sectionLabel}>Inbound (data sources)</div>
        <div style={S.card}>
          {inbound.map((c, i) => renderRow(c, i === inbound.length - 1))}
        </div>
      </div>
      <div style={S.section}>
        <div style={S.sectionLabel}>Outbound (action sinks)</div>
        <div style={S.card}>
          {outbound.map((c, i) => renderRow(c, i === outbound.length - 1))}
        </div>
      </div>
    </>
  );
}

// --- Team Tab ---

function TeamTab(): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Procurement");

  function handleInvite(e: React.FormEvent): void {
    e.preventDefault();
    alert(`Invite sent to ${email} as ${role}. (demo mode)`);
    setEmail("");
    setRole("Procurement");
    setDrawerOpen(false);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <div style={S.sectionLabel}>Members ({TEAM_MEMBERS.length})</div>
        <button type="button" style={S.btnAccent} onClick={() => setDrawerOpen(true)}>
          Invite member
        </button>
      </div>
      <div style={{ ...S.card, marginBottom: "var(--space-5)" }}>
        {TEAM_MEMBERS.map((m, i) => (
          <div key={m.email} style={i < TEAM_MEMBERS.length - 1 ? S.row : S.rowLast}>
            <div style={S.avatar}>{m.initials}</div>
            <div style={S.rowInfo}>
              <div style={S.rowName}>{m.name}</div>
              <div style={S.rowMeta}>{m.email}</div>
            </div>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-2)" }}>{m.role}</span>
            <span style={S.badge(true)}>Active</span>
          </div>
        ))}
      </div>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Invite member">
        <form onSubmit={handleInvite}>
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
          <button type="submit" style={S.inviteBtn}>Send invitation</button>
        </form>
      </Drawer>
    </>
  );
}

// --- Billing Tab ---

function BillingTab(): JSX.Element {
  const [stripeOpen, setStripeOpen] = useState(false);

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
          {INVOICES.map((inv, i) => (
            <div key={inv.id} style={i < INVOICES.length - 1 ? S.row : S.rowLast}>
              <div style={S.rowInfo}>
                <div style={S.rowName}>{inv.id}</div>
                <div style={S.rowMeta}>{inv.period} · {inv.amount}</div>
              </div>
              <span style={S.badge(true)}>{inv.status}</span>
              <button type="button" style={S.btnOutline} aria-label={`Download ${inv.id}`} onClick={() => alert("PDF coming")}>
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

  return (
    <main style={S.page}>
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
      {tab === "connections" && <ConnectionsTab />}
      {tab === "team" && <TeamTab />}
      {tab === "billing" && <BillingTab />}
    </main>
  );
}
