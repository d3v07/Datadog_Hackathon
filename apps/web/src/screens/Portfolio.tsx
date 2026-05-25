import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Vendor } from "@unsyphn/shared";
import { Share2, AlertCircle, Plus } from "lucide-react";
import { useRole } from "../lib/role.js";
import {
  ApiError,
  getRenegotiationPacket,
  listTeamMembers,
  listVendors,
  patchVendor,
  type TeamMember,
} from "../lib/api.js";
import { getRequest } from "../components/requests/api.js";
import { PortfolioStats } from "../components/portfolio/PortfolioStats.js";
import { PortfolioFilters } from "../components/portfolio/PortfolioFilters.js";
import { PortfolioVendorCard } from "../components/portfolio/PortfolioVendorCard.js";
import { VendorTable } from "../components/portfolio/VendorTable.js";
import { BulkActionBar } from "../components/portfolio/BulkActionBar.js";
import { ShareAuditorDrawer } from "../components/portfolio/ShareAuditorDrawer.js";
import {
  NewVendorDrawer,
  type NewVendorDrawerInitial,
} from "../components/portfolio/NewVendorDrawer.js";
import { Toast, type ToastState } from "../components/requests/Toast.js";
import {
  RenegotiationResultsDrawer,
  type PacketResult,
} from "../components/portfolio/RenegotiationResultsDrawer.js";
import {
  EmptyState,
  LoadingGrid,
  ViewToggle,
} from "../components/portfolio/ViewToggle.js";
import {
  initialFilters,
  writeFiltersToUrl,
} from "../components/portfolio/url-state.js";
import {
  applyFilters,
  type PortfolioFilterState,
} from "../components/portfolio/types.js";
import { LensChips } from "../components/LensChips.js";

const REQUEST_CATEGORY_TO_VENDOR: Record<string, string> = {
  productivity: "productivity",
  communication: "communication",
  analytics: "analytics",
  security: "security",
  observability: "observability",
  devtools: "devtools",
  infrastructure: "infrastructure",
  data: "database",
  compliance: "security",
  contracts: "productivity",
  dpa: "security",
  payments: "payments",
  spend: "productivity",
};

function mapRequestCategory(category: string): string {
  return REQUEST_CATEGORY_TO_VENDOR[category.toLowerCase()] ?? "productivity";
}

function stripDrawerQueryParams(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("newVendor");
  url.searchParams.delete("fromRequest");
  window.history.replaceState({}, "", url.toString());
}

const PAGE_STYLE = `
  .portfolio-card:hover .portfolio-card-check { opacity: 1; }
  .portfolio-card:focus-visible { outline: 2px solid #5E6AD2; outline-offset: 2px; }
  @keyframes portfolio-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .spin { animation: portfolio-spin 1s linear infinite; }
`;

export function Portfolio(): JSX.Element {
  const [role] = useRole();
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filters, setFilters] = useState<PortfolioFilterState>(initialFilters);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [shareOpen, setShareOpen] = useState(false);
  const [shareInitial, setShareInitial] = useState<ReadonlyArray<string>>([]);
  const [packetsOpen, setPacketsOpen] = useState(false);
  const [packetResults, setPacketResults] = useState<PacketResult[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [addInitial, setAddInitial] = useState<NewVendorDrawerInitial | undefined>(undefined);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Debounced URL sync (200ms) — deep links work, navigation feels instant.
  const writeRef = useRef<number | null>(null);
  useEffect(() => {
    if (writeRef.current !== null) window.clearTimeout(writeRef.current);
    writeRef.current = window.setTimeout(() => writeFiltersToUrl(filters), 200);
    return () => {
      if (writeRef.current !== null) window.clearTimeout(writeRef.current);
    };
  }, [filters]);

  // Fetch vendors when role (lens) changes — backend filters server-side.
  useEffect(() => {
    let cancelled = false;
    setError(null);
    listVendors(role)
      .then((r) => {
        if (!cancelled) setVendors(r.vendors);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setVendors([]);
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load vendors",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    listTeamMembers()
      .then((r) => {
        if (!cancelled) setMembers(r.members);
      })
      .catch(() => {
        // Owner names will fall back to the userId — not fatal.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Parse ?newVendor / ?fromRequest on mount to open the drawer with prefill.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromRequestId = params.get("fromRequest");
    const wantsNew = params.get("newVendor") === "true";
    if (fromRequestId) {
      let cancelled = false;
      getRequest(fromRequestId)
        .then((req) => {
          if (cancelled) return;
          setAddInitial({
            name: req.vendorName,
            category: mapRequestCategory(req.category),
            annualSpendUsd: req.expectedSpendUsd,
            notes: req.justification,
          });
          setAddOpen(true);
        })
        .catch(() => {
          if (cancelled) return;
          // Request not found — still open the drawer empty so the user can
          // proceed instead of getting stranded with a stale URL.
          setAddInitial(undefined);
          setAddOpen(true);
        });
      return () => {
        cancelled = true;
      };
    }
    if (wantsNew) {
      setAddInitial(undefined);
      setAddOpen(true);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const handleAddClose = useCallback(() => {
    setAddOpen(false);
    setAddInitial(undefined);
    stripDrawerQueryParams();
  }, []);

  const handleVendorCreated = useCallback((vendorId: string) => {
    setAddOpen(false);
    setAddInitial(undefined);
    stripDrawerQueryParams();
    setToast({ message: "Vendor added", variant: "success" });
    window.setTimeout(() => {
      window.location.href = `/app/vendors/${encodeURIComponent(vendorId)}`;
    }, 250);
  }, []);

  const ownerMap = useMemo(() => {
    const m = new Map<string, TeamMember>();
    for (const u of members) m.set(u.id, u);
    return m;
  }, [members]);

  const categoryOptions = useMemo(() => {
    if (!vendors) return [];
    const set = new Set<string>();
    for (const v of vendors) if (v.category) set.add(v.category);
    return [...set].sort();
  }, [vendors]);

  const filteredVendors = useMemo(
    () => (vendors ? applyFilters(vendors, filters) : []),
    [vendors, filters],
  );

  const allSelected =
    filteredVendors.length > 0 && filteredVendors.every((v) => selected.has(v.id));

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const allOn = filteredVendors.every((v) => prev.has(v.id));
      const next = new Set(prev);
      for (const v of filteredVendors) {
        if (allOn) next.delete(v.id);
        else next.add(v.id);
      }
      return next;
    });
  }, [filteredVendors]);

  const applyPatch = async (patch: { ownerId?: string; tier?: 1 | 2 | 3 }) => {
    const ids = [...selected];
    const results = await Promise.allSettled(ids.map((id) => patchVendor(id, patch)));
    setVendors((prev) => {
      if (!prev) return prev;
      const updated = new Map<string, Vendor>();
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          const id = ids[i];
          if (id) updated.set(id, r.value);
        }
      });
      return prev.map((v) => updated.get(v.id) ?? v);
    });
  };

  const handleShareWithAuditor = (preselected?: ReadonlyArray<string>) => {
    setShareInitial(preselected ?? [...selected]);
    setShareOpen(true);
  };

  const handleGeneratePackets = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const initial: PacketResult[] = ids.map((id) => {
      const v = vendors?.find((x) => x.id === id);
      return { status: "pending", vendorId: id, vendorName: v?.name ?? id };
    });
    setPacketResults(initial);
    setPacketsOpen(true);

    await Promise.all(
      ids.map(async (id, idx) => {
        try {
          const packet = await getRenegotiationPacket(id);
          setPacketResults((prev) => {
            const next = [...prev];
            next[idx] = { status: "ok", vendorId: id, packet };
            return next;
          });
        } catch (err) {
          setPacketResults((prev) => {
            const next = [...prev];
            const entry = initial[idx];
            const name = entry && entry.status === "pending" ? entry.vendorName : id;
            next[idx] = {
              status: "error",
              vendorId: id,
              vendorName: name,
              error:
                err instanceof ApiError
                  ? err.message
                  : err instanceof Error
                    ? err.message
                    : "Failed",
            };
            return next;
          });
        }
      }),
    );
  };

  const isLoading = vendors === null;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 64px" }}>
      <style>{PAGE_STYLE}</style>

      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 600,
              color: "#0f172a",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Vendors
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: "6px 0 0" }}>
            All vendors monitored for posture, renewals, and material change.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ViewToggle view={filters.view} onChange={(v) => setFilters({ ...filters, view: v })} />
          <button
            type="button"
            onClick={() => {
              setAddInitial(undefined);
              setAddOpen(true);
            }}
            aria-label="Add a new vendor"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: "#ffffff",
              color: "#0f172a",
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <Plus size={14} aria-hidden="true" /> Add vendor
          </button>
          <button
            type="button"
            onClick={() => handleShareWithAuditor([])}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: "#5E6AD2",
              color: "#ffffff",
              border: "1px solid #5E6AD2",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(94,106,210,0.25)",
            }}
          >
            <Share2 size={14} aria-hidden="true" /> Share with auditor →
          </button>
        </div>
      </header>

      <LensChips />

      <PortfolioStats vendors={vendors ?? []} />

      <PortfolioFilters
        state={filters}
        onChange={setFilters}
        categoryOptions={categoryOptions}
        ownerOptions={members}
      />

      <BulkActionBar
        count={selected.size}
        owners={members}
        onAssignOwner={(ownerId) => applyPatch({ ownerId })}
        onChangeTier={(tier) => applyPatch({ tier })}
        onGeneratePackets={() => void handleGeneratePackets()}
        onShareWithAuditor={() => handleShareWithAuditor()}
        onClear={() => setSelected(new Set())}
      />

      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            background: "rgba(220,38,38,0.06)",
            border: "1px solid rgba(220,38,38,0.16)",
            borderRadius: 10,
            color: "#dc2626",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <LoadingGrid />
      ) : filters.view === "table" ? (
        <VendorTable
          vendors={filteredVendors}
          owners={ownerMap}
          selectedIds={selected}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleSelectAll}
          allSelected={allSelected}
        />
      ) : filteredVendors.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {filteredVendors.map((v) => (
            <PortfolioVendorCard
              key={v.id}
              vendor={v}
              owner={v.ownerId ? ownerMap.get(v.ownerId) : undefined}
              selected={selected.has(v.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      <ShareAuditorDrawer
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        vendors={vendors ?? []}
        initiallySelected={shareInitial}
      />
      <NewVendorDrawer
        open={addOpen}
        onClose={handleAddClose}
        onCreated={handleVendorCreated}
        members={members}
        categoryOptions={categoryOptions}
        initial={addInitial}
      />
      <RenegotiationResultsDrawer
        open={packetsOpen}
        onClose={() => setPacketsOpen(false)}
        results={packetResults}
      />
      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </div>
  );
}
