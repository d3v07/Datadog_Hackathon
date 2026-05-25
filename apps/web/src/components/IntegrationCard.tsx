import { useEffect, useState } from "react";
import { CheckCircle, RefreshCcw, Settings as SettingsIcon } from "lucide-react";
import { VendorLogo } from "./VendorLogo.js";
import type { IntegrationDto } from "./ConnectDrawer.js";

interface Props {
  integration: IntegrationDto;
  onConnect: (i: IntegrationDto) => void;
  onManage: (i: IntegrationDto) => void;
  onSyncNow: (i: IntegrationDto) => void;
  syncBusy: boolean;
}

const S = {
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-4)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-3)",
    transition: "transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
    minHeight: 168,
  } as React.CSSProperties,
  cardHover: {
    transform: "translateY(-1px)",
    borderColor: "var(--border-strong)",
    boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
  } as React.CSSProperties,
  header: { display: "flex", alignItems: "flex-start", gap: "var(--space-3)" } as React.CSSProperties,
  name: {
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    color: "var(--text)",
    margin: 0,
    lineHeight: 1.3,
  } as React.CSSProperties,
  chip: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 500,
    color: "var(--text-2)",
    background: "var(--surface-2)",
    borderRadius: "var(--radius-pill)",
    padding: "1px 7px",
    marginTop: 4,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  } as React.CSSProperties,
  description: {
    fontSize: "var(--text-xs)",
    color: "var(--text-2)",
    lineHeight: 1.5,
    margin: 0,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
    minHeight: 36,
  } as React.CSSProperties,
  status: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    color: "var(--success)",
  } as React.CSSProperties,
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--success)",
    boxShadow: "0 0 0 0 rgba(63,207,142,0.6)",
    animation: "pulse-dot 2s infinite",
  } as React.CSSProperties,
  notConnected: {
    fontSize: "var(--text-xs)",
    fontWeight: 400,
    color: "var(--text-muted)",
  } as React.CSSProperties,
  lastSync: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
  } as React.CSSProperties,
  actions: {
    display: "flex",
    gap: "var(--space-2)",
    marginTop: "auto",
    paddingTop: "var(--space-2)",
  } as React.CSSProperties,
  btnPrimary: {
    flex: 1,
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    padding: "6px 12px",
    border: "1px solid var(--accent)",
    borderRadius: "var(--radius-sm)",
    background: "var(--accent)",
    color: "#fff",
    cursor: "pointer",
  } as React.CSSProperties,
  btnOutline: {
    flex: 1,
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    padding: "6px 12px",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-sm)",
    background: "var(--surface)",
    color: "var(--text-2)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  } as React.CSSProperties,
} as const;

function timeAgo(iso?: string, now: number = Date.now()): string {
  if (!iso) return "never";
  const diff = now - Date.parse(iso);
  if (Number.isNaN(diff) || diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

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

export function IntegrationCard({ integration, onConnect, onManage, onSyncNow, syncBusy }: Props): JSX.Element {
  const [now, setNow] = useState(Date.now());
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!integration.connected) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [integration.connected]);

  return (
    <div
      style={{ ...S.card, ...(hovered ? S.cardHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={S.header}>
        <VendorLogo name={integration.name} domain={domainFor(integration.slug)} size={28} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4 style={S.name}>{integration.name}</h4>
          <span style={S.chip}>{integration.category}</span>
        </div>
      </div>
      <p style={S.description}>{integration.description}</p>

      {integration.connected ? (
        <>
          <div style={S.status}>
            <span style={S.pulseDot} aria-hidden="true" />
            Connected
          </div>
          <div style={S.lastSync}>
            Last synced {timeAgo(integration.lastSyncedAt ?? integration.connectedAt, now)}
          </div>
          <div style={S.actions}>
            <button
              type="button"
              style={{ ...S.btnOutline, opacity: syncBusy ? 0.6 : 1 }}
              onClick={() => onSyncNow(integration)}
              disabled={syncBusy}
              aria-label={`Sync ${integration.name} now`}
            >
              <RefreshCcw size={11} aria-hidden="true" />
              {syncBusy ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              style={S.btnOutline}
              onClick={() => onManage(integration)}
              aria-label={`Manage ${integration.name}`}
            >
              <SettingsIcon size={11} aria-hidden="true" />
              Manage
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={S.status}>
            <CheckCircle size={12} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
            <span style={S.notConnected}>Not connected</span>
          </div>
          <div style={S.lastSync}>{integration.authType.toUpperCase()} auth</div>
          <div style={S.actions}>
            <button type="button" style={S.btnPrimary} onClick={() => onConnect(integration)}>
              Connect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
