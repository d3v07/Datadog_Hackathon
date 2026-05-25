import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import type { Vendor } from "@unsyphn/shared";
import {
  ApiError,
  listVendorContracts,
  uploadVendorContract,
  type ContractSummary,
} from "../../lib/api.js";
import { hashSeed, relTime } from "./utils.js";

interface Props {
  vendor: Vendor;
  onUploadComplete: () => void;
  onError: (msg: string) => void;
}

const CLAUSE_TEMPLATES: ReadonlyArray<{ title: string; body: string }> = [
  { title: "Auto-renewal", body: "Auto-renews for successive 12-month terms unless cancelled 60 days before period end." },
  { title: "Termination notice", body: "Either party may terminate with 30 days written notice for material breach." },
  { title: "Indemnification cap", body: "Each party's liability is capped at fees paid in the trailing 12 months ($50K floor)." },
  { title: "Most-favored-nation", body: "Vendor warrants that pricing is no less favorable than any comparable customer of similar size." },
  { title: "Data residency", body: "Customer data is processed in US-East and EU-West regions with no cross-region replication." },
  { title: "Sub-processor changes", body: "Vendor provides 30 days advance notice of any new sub-processor with a right to object." },
  { title: "Security audit", body: "Customer may audit vendor SOC 2 controls annually with 14 days notice." },
  { title: "Service credits", body: "<99.9% uptime triggers credits up to 25% of monthly fee, applied to next invoice." },
  { title: "Price hike notice", body: "Renewal price increases require 90 days advance written notice." },
  { title: "Data deletion", body: "On termination, vendor purges all customer data within 30 days and certifies in writing." },
];

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1_048_576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1_048_576).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("Unexpected reader result"));
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function pickClauses(vendorId: string): typeof CLAUSE_TEMPLATES {
  const rand = hashSeed(vendorId);
  const pool = [...CLAUSE_TEMPLATES];
  const picked: typeof CLAUSE_TEMPLATES = [] as unknown as typeof CLAUSE_TEMPLATES;
  const count = 4;
  while ((picked as unknown[]).length < count && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    (picked as unknown as Array<{ title: string; body: string }>).push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return picked;
}

export function ContractsTab({ vendor, onUploadComplete, onError }: Props): JSX.Element {
  const [contracts, setContracts] = useState<ContractSummary[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clauseDrawerFor, setClauseDrawerFor] = useState<ContractSummary | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { contracts: list } = await listVendorContracts(vendor.id);
      setContracts(list);
    } catch (err) {
      setContracts([]);
      if (err instanceof ApiError) onError(err.message);
    }
  }, [vendor.id, onError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleFile(file: File): Promise<void> {
    setUploading(true);
    try {
      const contentBase64 = await fileToBase64(file);
      await uploadVendorContract(vendor.id, {
        filename: file.name,
        sizeBytes: file.size,
        contentBase64,
      });
      await refresh();
      onUploadComplete();
    } catch (err) {
      if (err instanceof ApiError) onError(err.message);
      else onError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  }

  const clauses = clauseDrawerFor ? pickClauses(vendor.id + clauseDrawerFor.id) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {contracts === null ? (
        <div style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }} aria-live="polite" aria-busy>
          Loading contracts…
        </div>
      ) : contracts.length === 0 ? (
        <div className="card" style={{ padding: "var(--space-7)", textAlign: "center" }}>
          <FileText size={28} aria-hidden="true" style={{ color: "var(--text-muted)", display: "block", margin: "0 auto var(--space-3)" }} />
          <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text)" }}>
            No contracts uploaded yet
          </h3>
          <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-2)" }}>
            Upload an MSA or DPA to track terms, auto-renew dates, and key clauses.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            <Upload size={13} aria-hidden="true" /> {uploading ? "Uploading…" : "Upload your first contract"}
          </button>
        </div>
      ) : (
        <>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {contracts.map((c) => (
              <li
                key={c.id}
                className="card"
                style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}
              >
                <FileText size={18} aria-hidden="true" style={{ color: "var(--accent)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.filename}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    {fmtBytes(c.sizeBytes)} · uploaded {fmtDate(c.uploadedAt)} ({relTime(c.uploadedAt)}) by {c.uploadedBy}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => setClauseDrawerFor(c)} style={{ fontSize: "var(--text-xs)" }}>
                  View clauses
                </button>
                <a
                  className="btn btn-ghost"
                  href={`/v1/vendors/${encodeURIComponent(vendor.id)}/contracts`}
                  style={{ fontSize: "var(--text-xs)", pointerEvents: "none", opacity: 0.5 }}
                  aria-disabled
                  title="Download stubbed for the demo"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            style={{ alignSelf: "flex-start" }}
          >
            <Upload size={13} aria-hidden="true" /> {uploading ? "Uploading…" : "Upload contract"}
          </button>
        </>
      )}

      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onChange}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      {clauseDrawerFor && (
        <ClauseDrawer
          contract={clauseDrawerFor}
          clauses={clauses}
          onClose={() => setClauseDrawerFor(null)}
        />
      )}
    </div>
  );
}

interface DrawerProps {
  contract: ContractSummary;
  clauses: ReadonlyArray<{ title: string; body: string }>;
  onClose: () => void;
}

function ClauseDrawer({ contract, clauses, onClose }: DrawerProps): JSX.Element {
  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 400 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clause-drawer-title"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(440px,100vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 401,
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "0 var(--space-5)", height: 56, borderBottom: "1px solid var(--border)" }}>
          <h2 id="clause-drawer-title" style={{ flex: 1, margin: 0, fontSize: "var(--text-sm)", fontWeight: 600 }}>
            Extracted clauses · {contract.filename}
          </h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close clause drawer" style={{ width: 32, height: 32, padding: 0 }}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {clauses.map((c) => (
            <div key={c.title} style={{ borderLeft: "3px solid var(--accent)", paddingLeft: "var(--space-3)" }}>
              <div style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 600 }}>
                {c.title}
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text)", lineHeight: 1.5, marginTop: 4 }}>{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
