import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { Vendor } from "@unsyphn/shared";
import {
  ApiError,
  DEMO_BEARER_TOKEN,
  getVendor,
  listTeamMembers,
  patchVendor,
  type TeamMember,
  type VendorPatch,
} from "../lib/api.js";
import { RenegotiationPacket } from "../components/RenegotiationPacket.js";
import { ShareAuditorDrawer } from "../components/portfolio/ShareAuditorDrawer.js";
import { SubprocessorHeatmap } from "./SubprocessorHeatmap.js";
import { Header } from "../components/vendor-detail/Header.js";
import { OverviewTab } from "../components/vendor-detail/OverviewTab.js";
import { SpendTab } from "../components/vendor-detail/SpendTab.js";
import { ContractsTab } from "../components/vendor-detail/ContractsTab.js";
import { ChangeFeedTab } from "../components/vendor-detail/ChangeFeedTab.js";
import { ActivityTab } from "../components/vendor-detail/ActivityTab.js";
import { NextActionCard, type TabId } from "../components/vendor-detail/NextActionCard.js";
import { VendorToast } from "../components/vendor-detail/Toast.js";

interface FeedChange {
  id: string;
  vendorId: string;
  title: string;
  summary: string;
  severity: string;
  occurredAt: string;
  category: string;
  diff?: { before: string; after: string };
  citations?: Array<{ url?: string; fetchedAt?: string }>;
}

const PAGE_STYLE = `
  @keyframes vd-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .spin { animation: vd-spin 1s linear infinite; }
`;

function readVendorIdFromUrl(): string {
  if (typeof window === "undefined") return "";
  const m = window.location.pathname.match(/^\/app\/vendors?\/([^/?#]+)/);
  return m?.[1] ?? "";
}

export function VendorDetail(): JSX.Element {
  const vendorId = readVendorIdFromUrl();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [feedChanges, setFeedChanges] = useState<FeedChange[]>([]);
  const [feedLoaded, setFeedLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [packetOpen, setPacketOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  // Fetch vendor.
  useEffect(() => {
    if (!vendorId) {
      setLoadState("not-found");
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    getVendor(vendorId)
      .then((v) => {
        if (cancelled) return;
        setVendor(v);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setLoadState("not-found");
        } else {
          setErrorMsg(err instanceof Error ? err.message : "Failed to load vendor");
          setLoadState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  // Team members (for owner picker + activity actor resolution).
  useEffect(() => {
    let cancelled = false;
    listTeamMembers()
      .then((r) => {
        if (!cancelled) setMembers(r.members);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Change feed.
  useEffect(() => {
    if (!vendor) return;
    let cancelled = false;
    fetch(`/v1/changes/feed?vendorId=${encodeURIComponent(vendor.id)}`, {
      headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
    })
      .then((r) => r.json() as Promise<{ changes: FeedChange[] }>)
      .then(({ changes }) => {
        if (cancelled) return;
        setFeedChanges(changes);
        setFeedLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setFeedLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [vendor]);

  const handlePatch = useCallback(
    async (patch: VendorPatch) => {
      if (!vendor) return;
      const prev = vendor;
      const optimistic = { ...vendor, ...patch } as Vendor;
      setVendor(optimistic);
      try {
        const updated = await patchVendor(vendor.id, patch);
        setVendor(updated);
        showToast("Vendor updated");
      } catch (err) {
        setVendor(prev);
        showToast(err instanceof ApiError ? err.message : "Update failed");
      }
    },
    [vendor, showToast],
  );

  if (loadState === "loading") {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "var(--space-6)" }}>
        <style>{PAGE_STYLE}</style>
        <div aria-live="polite" aria-busy style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          Loading vendor…
        </div>
      </main>
    );
  }

  if (loadState === "not-found") {
    return (
      <main style={{ maxWidth: 680, margin: "var(--space-9) auto", padding: "0 var(--space-6)", textAlign: "center" }}>
        <h1 className="h1" style={{ marginBottom: "var(--space-3)" }}>Vendor not found</h1>
        <p className="lead" style={{ marginBottom: "var(--space-5)" }}>
          No vendor with id &ldquo;{vendorId}&rdquo; exists in your portfolio.
        </p>
        <a href="/app/vendors" className="btn btn-secondary">
          <ArrowLeft size={14} aria-hidden="true" /> Back to portfolio
        </a>
      </main>
    );
  }

  if (loadState === "error" || !vendor) {
    return (
      <main style={{ maxWidth: 680, margin: "var(--space-9) auto", padding: "0 var(--space-6)", textAlign: "center" }}>
        <h1 className="h1" style={{ marginBottom: "var(--space-3)" }}>Couldn&rsquo;t load vendor</h1>
        <p className="lead" style={{ marginBottom: "var(--space-5)" }}>
          {errorMsg ?? "Try again in a moment."}
        </p>
        <a href="/app/vendors" className="btn btn-secondary">
          <ArrowLeft size={14} aria-hidden="true" /> Back to portfolio
        </a>
      </main>
    );
  }

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "spend", label: "Spend & Usage" },
    { id: "contracts", label: "Contracts" },
    { id: "changes", label: "Change Feed" },
    { id: "risk", label: "Risk" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "var(--space-6) var(--space-6) var(--space-8)" }}>
      <style>{PAGE_STYLE}</style>

      <Header vendor={vendor} members={members} onPatch={handlePatch} />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
        {feedLoaded && <NextActionCard vendor={vendor} changeCount={feedChanges.length} onTab={setActiveTab} />}
      </div>

      <div
        role="tablist"
        aria-label="Vendor detail sections"
        style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "var(--space-5)", overflowX: "auto" }}
      >
        {TABS.map(({ id, label }) => {
          const on = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${id}`}
              id={`tab-${id}`}
              onClick={() => setActiveTab(id)}
              style={{
                padding: "var(--space-3) var(--space-4)",
                background: "none",
                border: "none",
                borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent",
                color: on ? "var(--accent)" : "var(--text-2)",
                fontFamily: "var(--font-text)",
                fontSize: "var(--text-sm)",
                fontWeight: on ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color var(--dur-fast),border-color var(--dur-fast)",
                marginBottom: -1,
              }}
            >
              {label}
              {id === "changes" && feedChanges.length > 0 && (
                <span className="badge badge-danger" style={{ marginLeft: "var(--space-2)", fontSize: 10 }}>
                  {feedChanges.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "overview" && (
          <OverviewTab
            vendor={vendor}
            changes={feedChanges}
            onOpenPacket={() => setPacketOpen(true)}
            onOpenShareAuditor={() => setShareOpen(true)}
            onScan={showToast}
            onPostureChanged={setVendor}
          />
        )}
        {activeTab === "spend" && <SpendTab vendor={vendor} onOpenPacket={() => setPacketOpen(true)} />}
        {activeTab === "contracts" && (
          <ContractsTab
            vendor={vendor}
            onUploadComplete={() => showToast("Contract uploaded")}
            onError={showToast}
          />
        )}
        {activeTab === "changes" && <ChangeFeedTab vendorId={vendor.id} />}
        {activeTab === "risk" && <SubprocessorHeatmap vendorId={vendor.id} />}
        {activeTab === "activity" && <ActivityTab vendor={vendor} members={members} onError={showToast} />}
      </div>

      <RenegotiationPacket vendorId={vendor.id} open={packetOpen} onClose={() => setPacketOpen(false)} />
      <ShareAuditorDrawer
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        vendors={[vendor]}
        initiallySelected={[vendor.id]}
      />
      {toast && <VendorToast message={toast} />}
    </main>
  );
}
