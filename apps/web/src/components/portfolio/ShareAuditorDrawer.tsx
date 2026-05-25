import { useEffect, useMemo, useState } from "react";
import type { Vendor } from "@unsyphn/shared";
import { Drawer } from "../Drawer.js";
import { createAuditorSession } from "../../lib/api.js";
import { ExternalLink, Copy, Check } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  vendors: ReadonlyArray<Vendor>;
  initiallySelected: ReadonlyArray<string>;
}

const EXPIRY_OPTIONS = [7, 14, 30, 60] as const;

export function ShareAuditorDrawer({
  open,
  onClose,
  vendors,
  initiallySelected,
}: Props): JSX.Element {
  const [picked, setPicked] = useState<Set<string>>(new Set(initiallySelected));
  const [expiry, setExpiry] = useState<7 | 14 | 30 | 60>(14);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ shareUrl: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setPicked(new Set(initiallySelected.length > 0 ? initiallySelected : vendors.map((v) => v.id)));
      setExpiry(14);
      setNote("");
      setResult(null);
      setError(null);
      setCopied(false);
    }
  }, [open, initiallySelected, vendors]);

  const allChecked = picked.size === vendors.length && vendors.length > 0;
  const someChecked = picked.size > 0 && !allChecked;

  const sortedVendors = useMemo(
    () => [...vendors].sort((a, b) => a.name.localeCompare(b.name)),
    [vendors],
  );

  const toggleAll = () => {
    if (allChecked) setPicked(new Set());
    else setPicked(new Set(vendors.map((v) => v.id)));
  };

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (picked.size === 0) {
      setError("Pick at least one vendor.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const resp = await createAuditorSession({
        vendorIds: [...picked],
        expiresInDays: expiry,
      });
      setResult({ shareUrl: resp.shareUrl, expiresAt: resp.expiresAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create auditor link");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy. Select and copy manually.");
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Generate auditor share link">
      {!result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <Label>Vendors</Label>
            <div
              style={{
                marginTop: 8,
                border: "1px solid rgba(15,23,42,0.08)",
                borderRadius: 8,
                overflow: "hidden",
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  background: "#f8fafc",
                  borderBottom: "1px solid rgba(15,23,42,0.08)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={toggleAll}
                />
                Select all ({picked.size}/{vendors.length})
              </label>
              {sortedVendors.map((v) => (
                <label
                  key={v.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    fontSize: 13,
                    color: "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={picked.has(v.id)}
                    onChange={() => toggle(v.id)}
                  />
                  <span style={{ flex: 1 }}>{v.name}</span>
                  <span style={{ color: "#94a3b8", fontSize: 11, textTransform: "capitalize" }}>
                    {v.category ?? "—"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Expires in</Label>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {EXPIRY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExpiry(d)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: expiry === d ? "1px solid #5E6AD2" : "1px solid rgba(15,23,42,0.12)",
                    background: expiry === d ? "#5E6AD2" : "#ffffff",
                    color: expiry === d ? "#ffffff" : "#0f172a",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="auditor-note">Note (optional)</Label>
            <textarea
              id="auditor-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Context the auditor will see in the share link."
              rows={3}
              style={{
                width: "100%",
                marginTop: 6,
                padding: 10,
                fontSize: 13,
                border: "1px solid rgba(15,23,42,0.12)",
                borderRadius: 8,
                background: "#ffffff",
                color: "#0f172a",
                resize: "vertical",
                fontFamily: "var(--font-text)",
              }}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                fontSize: 13,
                color: "#dc2626",
                background: "rgba(220,38,38,0.08)",
                padding: "8px 10px",
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                border: "1px solid rgba(15,23,42,0.12)",
                borderRadius: 8,
                background: "#ffffff",
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={busy || picked.size === 0}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid #5E6AD2",
                borderRadius: 8,
                background: busy ? "#9298d6" : "#5E6AD2",
                color: "#ffffff",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {busy ? "Generating..." : "Generate link"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p
            style={{
              fontSize: 13,
              color: "#475569",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.24)",
              padding: "10px 12px",
              borderRadius: 8,
              margin: 0,
            }}
          >
            Auditor share link created. The viewer is watermarked and read-only.
          </p>

          <Label>Share URL</Label>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: 8,
              padding: 4,
              background: "#ffffff",
            }}
          >
            <input
              readOnly
              value={result.shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                padding: "6px 8px",
                border: "none",
                outline: "none",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                color: "#0f172a",
                background: "transparent",
              }}
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                background: copied ? "#10b981" : "#5E6AD2",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div style={{ fontSize: 12, color: "#64748b" }}>
            Expires {new Date(result.expiresAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </div>

          <a
            href={result.shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              color: "#5E6AD2",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Open auditor viewer <ExternalLink size={12} aria-hidden="true" />
          </a>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setResult(null)}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                border: "1px solid rgba(15,23,42,0.12)",
                borderRadius: 8,
                background: "#ffffff",
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Generate another
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid #5E6AD2",
                borderRadius: 8,
                background: "#5E6AD2",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }): JSX.Element {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "#64748b",
      }}
    >
      {children}
    </label>
  );
}
