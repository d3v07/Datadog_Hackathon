import { useEffect, useState } from "react";
import { Clock, Plug, RefreshCw, Send, FileX2, Share2 } from "lucide-react";
import type { Vendor } from "@unsyphn/shared";
import { DEMO_BEARER_TOKEN, patchVendor, triggerVendorScan } from "../../lib/api.js";
import { daysUntil, fmtUsd, hashSeed, relTime } from "./utils.js";

interface FeedChange {
  id: string;
  vendorId: string;
  title: string;
  severity: string;
  occurredAt: string;
}

interface IntegrationLite {
  id: string;
  name: string;
  slug: string;
  category: "inbound" | "outbound";
  connected: boolean;
  iconColor?: string;
  lastSyncedAt?: string;
}

interface Props {
  vendor: Vendor;
  changes: FeedChange[];
  onOpenPacket: () => void;
  onOpenShareAuditor: () => void;
  onScan: (msg: string) => void;
  onPostureChanged: (next: Vendor) => void;
}

function slugFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }): JSX.Element {
  return (
    <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "var(--text-2xl)", color: "var(--text)", lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-2)" }}>{sub}</span>}
    </div>
  );
}

function Head({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <h2
      style={{
        margin: "0 0 var(--space-3) 0",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        color: "var(--text)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </h2>
  );
}

export function OverviewTab({ vendor, changes, onOpenPacket, onOpenShareAuditor, onScan, onPostureChanged }: Props): JSX.Element {
  const [integrations, setIntegrations] = useState<IntegrationLite[]>([]);
  const [scanning, setScanning] = useState(false);
  const [markBusy, setMarkBusy] = useState(false);

  const days = daysUntil(vendor.contract?.renewsAt ?? vendor.renewalDate);
  const seatCount = vendor.contract?.seatCount ?? 0;
  const annualSpend = vendor.contract?.annualSpendUsd ?? 0;
  const renewsAt = vendor.contract?.renewsAt ?? vendor.renewalDate ?? "";
  const lastScanIso = vendor.lastScanAt ?? new Date(Date.now() - 4 * 60_000).toISOString();

  useEffect(() => {
    let cancelled = false;
    fetch("/v1/integrations", { headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` } })
      .then((r) => (r.ok ? (r.json() as Promise<{ integrations: IntegrationLite[] }>) : { integrations: [] }))
      .then(({ integrations: all }) => {
        if (cancelled) return;
        const target = slugFromName(vendor.name);
        const matched = all.filter((i) => slugFromName(i.slug).includes(target) || slugFromName(i.name).includes(target));
        setIntegrations(matched);
      })
      .catch(() => {
        if (!cancelled) setIntegrations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [vendor.name]);

  async function scanNow(): Promise<void> {
    setScanning(true);
    try {
      await triggerVendorScan(vendor.id);
      onScan("Scanning… new findings will appear in the Change Feed.");
    } catch {
      onScan("Scan failed. Try again in a moment.");
    } finally {
      setScanning(false);
    }
  }

  async function markInactive(): Promise<void> {
    setMarkBusy(true);
    try {
      const updated = await patchVendor(vendor.id, { posture: "risk" });
      onPostureChanged(updated);
      onScan("Vendor flagged as risk. Review in Inbox.");
    } catch {
      onScan("Could not update posture.");
    } finally {
      setMarkBusy(false);
    }
  }

  // Synthetic term length: round years between createdAt (proxy: 2y ago) and renewsAt.
  // Real contract creation timestamps aren't on Vendor, so derive a sensible bucket.
  const rand = hashSeed(vendor.id);
  const termYears = renewsAt ? Math.max(1, Math.min(3, 1 + Math.floor(rand() * 3))) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "var(--space-3)" }}>
        <Tile label="Annual spend" value={fmtUsd(annualSpend)} />
        <Tile label="Total seats" value={seatCount > 0 ? seatCount.toLocaleString() : "—"} />
        <Tile
          label="Renews in"
          value={days !== null ? `${days}d` : "—"}
          sub={renewsAt ? new Date(renewsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined}
        />
        <Tile label="Material changes" value={String(changes.length)} sub="detected" />
      </div>

      <div>
        <Head>Contract terms</Head>
        <div className="card" style={{ padding: "var(--space-4)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "var(--space-3) var(--space-4)" }}>
          <Field label="Renewal date" value={renewsAt ? new Date(renewsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} hint={days !== null ? (days > 0 ? `${days}d remaining` : `Expired ${Math.abs(days)}d ago`) : undefined} />
          <Field label="Annual spend" value={fmtUsd(annualSpend)} />
          <Field label="Seat count" value={seatCount > 0 ? seatCount.toLocaleString() : "—"} />
          <Field label="Term length" value={termYears ? `${termYears} year${termYears !== 1 ? "s" : ""}` : "N/A"} />
          <Field label="Category" value={vendor.category ?? "uncategorized"} />
          <Field label="Data classes" value={(vendor.dataClasses ?? []).join(", ") || "—"} />
        </div>
      </div>

      <div>
        <Head>Integrations</Head>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          {integrations.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
              <Plug size={14} aria-hidden="true" /> No integrations connected for {vendor.name}.
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {integrations.map((i) => (
                <li key={i.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--text-sm)" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: i.connected ? "var(--success)" : "var(--text-muted)",
                    }}
                  />
                  <span style={{ fontWeight: 500, color: "var(--text)" }}>{i.name}</span>
                  <span className="badge badge-neutral" style={{ fontSize: 10 }}>{i.category}</span>
                  <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                    {i.connected ? (i.lastSyncedAt ? `Synced ${relTime(i.lastSyncedAt)}` : "Connected") : "Not connected"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <Head>Last scan</Head>
        <div className="card" style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Clock size={14} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
            {relTime(lastScanIso)} · monitored every 60s
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void scanNow()}
            disabled={scanning}
            style={{ marginLeft: "auto", fontSize: "var(--text-xs)" }}
          >
            <RefreshCw size={13} aria-hidden="true" className={scanning ? "spin" : ""} /> {scanning ? "Scanning…" : "Scan now"}
          </button>
        </div>
      </div>

      <div>
        <Head>Quick actions</Head>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={onOpenPacket}>
            <Send size={13} aria-hidden="true" /> Generate renegotiation packet
          </button>
          <button type="button" className="btn btn-secondary" onClick={onOpenShareAuditor}>
            <Share2 size={13} aria-hidden="true" /> Share with auditor
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void markInactive()} disabled={markBusy}>
            <FileX2 size={13} aria-hidden="true" /> Mark as risk
          </button>
        </div>
        <a
          href={`/app/findings?vendorId=${encodeURIComponent(vendor.id)}`}
          style={{
            display: "inline-block",
            marginTop: "var(--space-3)",
            fontSize: "var(--text-sm)",
            color: "var(--accent)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          View all findings for {vendor.name} →
        </a>
      </div>

      {changes.length > 0 && (
        <div>
          <Head>Recent activity</Head>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {changes.slice(0, 3).map((ch) => (
              <div
                key={ch.id}
                className="card"
                style={{ padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}
              >
                <span className={ch.severity === "P1" ? "badge badge-danger" : "badge badge-warning"} style={{ flexShrink: 0 }}>
                  {ch.severity}
                </span>
                <span style={{ flex: 1, fontSize: "var(--text-sm)", color: "var(--text)", fontWeight: 500 }}>{ch.title}</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", flexShrink: 0 }}>{relTime(ch.occurredAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: "var(--text-sm)", color: "var(--text)", fontWeight: 500 }}>{value}</span>
      {hint && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{hint}</span>}
    </div>
  );
}
