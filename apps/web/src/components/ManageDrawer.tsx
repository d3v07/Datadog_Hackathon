import { useEffect, useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Drawer } from "./Drawer.js";
import { VendorLogo } from "./VendorLogo.js";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";
import type { IntegrationDto } from "./ConnectDrawer.js";

interface SyncRecord {
  id: string;
  startedAt: string;
  durationMs: number;
  recordsScanned: number;
  status: "success" | "partial";
}

interface Props {
  integration: IntegrationDto;
  open: boolean;
  onClose: () => void;
  onDisconnected: (next: IntegrationDto) => void;
}

const S = {
  header: { display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" } as React.CSSProperties,
  name: { fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text)", margin: 0 } as React.CSSProperties,
  meta: { fontSize: "var(--text-xs)", color: "var(--text-muted)" } as React.CSSProperties,
  sectionLabel: { fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: "var(--space-2)" } as React.CSSProperties,
  section: { marginBottom: "var(--space-5)" } as React.CSSProperties,
  scopeRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px var(--space-3)", borderBottom: "1px solid var(--border)", fontSize: "var(--text-sm)" } as React.CSSProperties,
  scopeCode: { fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)" } as React.CSSProperties,
  revokeBtn: { fontSize: 11, padding: "3px 8px", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", background: "var(--surface)", color: "var(--danger)", cursor: "pointer" } as React.CSSProperties,
  syncRow: { display: "flex", justifyContent: "space-between", gap: "var(--space-3)", padding: "6px 0", fontSize: "var(--text-xs)", color: "var(--text-2)", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  syncStatusOk: { color: "var(--success)" } as React.CSSProperties,
  syncStatusPartial: { color: "#A87900" } as React.CSSProperties,
  block: { border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", background: "var(--surface-2)" } as React.CSSProperties,
  disconnectBtn: { width: "100%", padding: "10px var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 500, background: "var(--surface)", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: "var(--radius-md)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 } as React.CSSProperties,
  confirm: { background: "rgba(244,113,116,0.08)", border: "1px solid rgba(244,113,116,0.25)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", marginTop: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text)" } as React.CSSProperties,
  confirmRow: { display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" } as React.CSSProperties,
  confirmYes: { flex: 1, padding: "8px var(--space-3)", fontSize: "var(--text-sm)", background: "var(--danger)", color: "#fff", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)", cursor: "pointer" } as React.CSSProperties,
  confirmNo: { padding: "8px var(--space-3)", fontSize: "var(--text-sm)", background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", cursor: "pointer" } as React.CSSProperties,
} as const;

function domainFor(slug: string): string {
  const map: Record<string, string> = {
    "google-workspace": "google.com",
    "microsoft-365": "microsoft.com",
    "okta-saml": "okta.com",
    "azure-ad": "microsoft.com",
    "microsoft-teams": "microsoft.com",
    "aws-cost-explorer": "aws.amazon.com",
    "gcp-billing": "cloud.google.com",
  };
  return map[slug] ?? `${slug.replace(/-/g, "")}.com`;
}

function formatSyncTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ManageDrawer({ integration, open, onClose, onDisconnected }: Props): JSX.Element {
  const [scopes, setScopes] = useState<string[]>(integration.scopes ?? integration.defaultScopes);
  const [history, setHistory] = useState<SyncRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (open) {
      setScopes(integration.scopes ?? integration.defaultScopes);
      setConfirming(false);
    }
  }, [open, integration.id, integration.scopes, integration.defaultScopes]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`/v1/integrations/${encodeURIComponent(integration.id)}/syncs`, {
      headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ syncs: SyncRecord[] }>;
      })
      .then(({ syncs }) => {
        if (!cancelled) {
          setHistory(syncs);
          setHistoryError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setHistoryError(err instanceof Error ? err.message : "Couldn't load");
      });
    return () => {
      cancelled = true;
    };
  }, [open, integration.id]);

  function revokeScope(scope: string): void {
    setScopes((prev) => prev.filter((s) => s !== scope));
  }

  async function confirmDisconnect(): Promise<void> {
    try {
      const resp = await fetch(
        `/v1/integrations/${encodeURIComponent(integration.id)}/disconnect`,
        { method: "POST", headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` } },
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = (await resp.json()) as { integration: IntegrationDto };
      onDisconnected(json.integration);
      onClose();
    } catch {
      setConfirming(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Manage integration">
      <div style={S.header}>
        <VendorLogo name={integration.name} domain={domainFor(integration.slug)} size={36} />
        <div>
          <h3 style={S.name}>{integration.name}</h3>
          {integration.connectedAs && <div style={S.meta}>Connected as {integration.connectedAs}</div>}
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionLabel}>Permissions ({scopes.length})</div>
        <div style={S.block}>
          {scopes.length === 0 ? (
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", padding: "4px 0" }}>
              No scopes granted. Reconnect to restore access.
            </div>
          ) : (
            scopes.map((scope, i) => (
              <div
                key={scope}
                style={{ ...S.scopeRow, borderBottom: i === scopes.length - 1 ? "none" : "1px solid var(--border)" }}
              >
                <code style={S.scopeCode}>{scope}</code>
                <button type="button" className="button-pop" style={S.revokeBtn} onClick={() => revokeScope(scope)}>
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionLabel}>Sync history</div>
        <div className="stagger-children" style={S.block}>
          {historyError && (
            <div style={{ fontSize: "var(--text-xs)", color: "var(--danger)" }}>{historyError}</div>
          )}
          {!historyError && history.length === 0 && (
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>No syncs yet.</div>
          )}
          {history.map((s, i) => (
            <div
              key={s.id}
              className="glass-soft row-hover"
              style={{ ...S.syncRow, borderBottom: i === history.length - 1 ? "none" : "1px solid var(--border)" }}
            >
              <span>{formatSyncTime(s.startedAt)}</span>
              <span>Synced {s.recordsScanned.toLocaleString()} records</span>
              <span style={s.status === "success" ? S.syncStatusOk : S.syncStatusPartial}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionLabel}>Danger zone</div>
        <button type="button" className="button-pop" style={S.disconnectBtn} onClick={() => setConfirming(true)}>
          <Trash2 size={13} aria-hidden="true" />
          Disconnect {integration.name}
        </button>
        {confirming && (
          <div className="fade-up" style={S.confirm}>
            <AlertTriangle size={14} aria-hidden="true" style={{ display: "inline", marginRight: 6, color: "var(--danger)" }} />
            Disconnecting stops syncs and drops cached credentials. Records already
            ingested are kept.
            <div style={S.confirmRow}>
              <button type="button" className="button-pop" style={S.confirmYes} onClick={() => void confirmDisconnect()}>
                Yes, disconnect
              </button>
              <button type="button" className="button-pop" style={S.confirmNo} onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
