import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Vendor } from "@unsyphn/shared";
import { Share2, AlertCircle } from "lucide-react";
import { useRole } from "../lib/role.js";
import {
  ApiError,
  getRenegotiationPacket,
  listTeamMembers,
  listVendors,
  patchVendor,
  type TeamMember,
} from "../lib/api.js";
import { PortfolioStats } from "../components/portfolio/PortfolioStats.js";
import { PortfolioFilters } from "../components/portfolio/PortfolioFilters.js";
import { PortfolioVendorCard } from "../components/portfolio/PortfolioVendorCard.js";
import { VendorTable } from "../components/portfolio/VendorTable.js";
import { BulkActionBar } from "../components/portfolio/BulkActionBar.js";
import { ShareAuditorDrawer } from "../components/portfolio/ShareAuditorDrawer.js";
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
      <RenegotiationResultsDrawer
        open={packetsOpen}
        onClose={() => setPacketsOpen(false)}
        results={packetResults}
      />
    </div>
  );
}
