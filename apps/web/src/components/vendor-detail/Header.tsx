import { useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Pencil } from "lucide-react";
import type { Vendor } from "@unsyphn/shared";
import { VendorLogo } from "../VendorLogo.js";
import { Popover, PopoverItem } from "./Popover.js";
import { daysUntil, displayPosture, postureClass, postureLabel } from "./utils.js";
import type { TeamMember, VendorPatch } from "../../lib/api.js";

interface Props {
  vendor: Vendor;
  members: TeamMember[];
  onPatch: (patch: VendorPatch) => Promise<void>;
}

const TIERS: ReadonlyArray<1 | 2 | 3> = [1, 2, 3];
const POSTURES: ReadonlyArray<"ok" | "watch" | "risk"> = ["ok", "watch", "risk"];

export function Header({ vendor, members, onPatch }: Props): JSX.Element {
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const [postureOpen, setPostureOpen] = useState(false);

  const ownerAnchor = useRef<HTMLButtonElement | null>(null);
  const tierAnchor = useRef<HTMLButtonElement | null>(null);
  const postureAnchor = useRef<HTMLButtonElement | null>(null);

  const owner = members.find((m) => m.id === vendor.ownerId);
  const ownerLabel = owner?.name ?? owner?.email ?? vendor.ownerId;
  const tier = vendor.tier ?? 3;
  const posture = displayPosture(vendor);
  const days = daysUntil(vendor.contract?.renewsAt ?? vendor.renewalDate);

  const homepage = vendor.urls?.homepage;
  const homepageHost = homepage ? new URL(homepage).hostname.replace(/^www\./, "") : "";

  async function pick<T>(field: keyof VendorPatch, value: T): Promise<void> {
    await onPatch({ [field]: value } as VendorPatch);
  }

  return (
    <>
      <a
        href="/app/vendors"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginBottom: "var(--space-4)",
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={12} aria-hidden="true" /> All vendors
      </a>

      <section
        className="glass-strong fade-up"
        style={{
          display: "flex",
          gap: "var(--space-5)",
          alignItems: "flex-start",
          marginBottom: "var(--space-5)",
          padding: "var(--space-5)",
          borderRadius: 12,
        }}
      >
        <VendorLogo name={vendor.name} domain={homepageHost} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="h1" style={{ fontWeight: 600, marginBottom: "var(--space-1)" }}>
            {vendor.name}
          </h1>
          <p style={{ margin: "0 0 var(--space-3) 0", fontSize: "var(--text-sm)", color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {homepage && (
              <a href={homepage} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-2)" }}>
                {homepageHost}
              </a>
            )}
            <span aria-hidden="true">·</span>
            <span>Owner:</span>
            <span style={{ position: "relative", display: "inline-flex" }}>
              <button
                ref={ownerAnchor}
                type="button"
                className="btn btn-ghost button-pop"
                onClick={() => setOwnerOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={ownerOpen}
                style={{ height: 26, padding: "0 6px", display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}
              >
                {ownerLabel}
                <Pencil size={11} aria-hidden="true" />
              </button>
              <Popover open={ownerOpen} onClose={() => setOwnerOpen(false)} anchor={ownerAnchor} width={220}>
                {members.length === 0 ? (
                  <div style={{ padding: "8px 10px", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No team members</div>
                ) : (
                  members.map((m) => (
                    <PopoverItem
                      key={m.id}
                      selected={m.id === vendor.ownerId}
                      onClick={() => {
                        setOwnerOpen(false);
                        if (m.id !== vendor.ownerId) void pick("ownerId", m.id);
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {m.avatarLetter}
                      </span>
                      <span style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 500 }}>{m.name}</span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{m.email}</span>
                      </span>
                    </PopoverItem>
                  ))
                )}
              </Popover>
            </span>
          </p>

          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ position: "relative", display: "inline-flex" }}>
              <button
                ref={tierAnchor}
                type="button"
                className="badge badge-neutral button-pop"
                onClick={() => setTierOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={tierOpen}
                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid var(--border)" }}
              >
                Tier {tier}
                <ChevronDown size={11} aria-hidden="true" />
              </button>
              <Popover open={tierOpen} onClose={() => setTierOpen(false)} anchor={tierAnchor} width={120}>
                {TIERS.map((t) => (
                  <PopoverItem
                    key={t}
                    selected={t === tier}
                    onClick={() => {
                      setTierOpen(false);
                      if (t !== tier) void pick("tier", t);
                    }}
                  >
                    Tier {t}
                  </PopoverItem>
                ))}
              </Popover>
            </span>
            <span style={{ position: "relative", display: "inline-flex" }}>
              <button
                ref={postureAnchor}
                type="button"
                className={`${postureClass(posture)} button-pop`}
                onClick={() => setPostureOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={postureOpen}
                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, border: "none" }}
              >
                {postureLabel(posture)}
                <ChevronDown size={11} aria-hidden="true" />
              </button>
              <Popover open={postureOpen} onClose={() => setPostureOpen(false)} anchor={postureAnchor} width={140}>
                {POSTURES.map((p) => (
                  <PopoverItem
                    key={p}
                    selected={p === vendor.posture}
                    onClick={() => {
                      setPostureOpen(false);
                      if (p !== vendor.posture) void pick("posture", p);
                    }}
                  >
                    {p}
                  </PopoverItem>
                ))}
              </Popover>
            </span>
            {days !== null && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                {days > 0 ? `Renews in ${days}d` : `Renewed ${Math.abs(days)}d ago`}
              </span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
