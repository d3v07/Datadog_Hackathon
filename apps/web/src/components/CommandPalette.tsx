import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRole } from "../lib/role.js";
import { useGlobalShortcut } from "../lib/keyboard.js";

type Role = "procurement" | "legal" | "security" | "finance";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  disabled?: boolean;
  action: () => void;
}

const SEED_VENDORS = [
  { name: "Notion", slug: "notion" },
  { name: "Stripe", slug: "stripe" },
  { name: "Figma", slug: "figma" },
  { name: "Vercel", slug: "vercel" },
  { name: "Linear", slug: "linear" },
  { name: "GitHub", slug: "github" },
  { name: "Slack", slug: "slack" },
  { name: "Salesforce", slug: "salesforce" },
];

const SEED_CHANGES = [
  { id: "chg_seed_notion", label: "Notion — data retention change" },
  { id: "chg_seed_stripe_subprocessor", label: "Stripe — subprocessor update" },
];

const ROLES: Role[] = ["procurement", "legal", "security", "finance"];

function navigate(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function useVendorList(): { name: string; slug: string }[] {
  const [vendors, setVendors] = useState(SEED_VENDORS);

  useEffect(() => {
    fetch("/v1/dashboard/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (!data || typeof data !== "object") return;
        const d = data as Record<string, unknown>;
        const list = d.vendors ?? d.data;
        if (!Array.isArray(list)) return;
        const mapped = list
          .filter((v): v is { name?: unknown; id?: unknown; slug?: unknown } =>
            typeof v === "object" && v !== null
          )
          .map((v) => ({
            name: String(v.name ?? v.id ?? ""),
            slug: String(v.slug ?? v.id ?? ""),
          }))
          .filter((v) => v.name && v.slug);
        if (mapped.length > 0) setVendors(mapped);
      })
      .catch(() => {
        // fall back to seed vendors already in state
      });
  }, []);

  return vendors;
}

function substrMatch(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

interface PaletteProps {
  open: boolean;
  onClose: () => void;
}

function Palette({ open, onClose }: PaletteProps): JSX.Element | null {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const vendors = useVendorList();
  const [, setRole] = useRole();
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/app";

  const isChangePage = /^\/app\/(change|evidence)\/([^/?#]+)/.test(pathname);
  const changeIdMatch = pathname.match(
    /^\/app\/(change|evidence)\/([^/?#]+)/
  );
  const currentChangeId = changeIdMatch?.[2];

  const buildItems = useCallback((): PaletteItem[] => {
    const items: PaletteItem[] = [];

    vendors.forEach((v) => {
      items.push({
        id: `vendor-${v.slug}`,
        label: v.name,
        group: "Jump to vendor",
        action: () => navigate(`/app/vendor/${v.slug}`),
      });
    });

    SEED_CHANGES.forEach((c) => {
      items.push({
        id: `change-${c.id}`,
        label: c.label,
        group: "Open recent change",
        action: () => navigate(`/app/change/${c.id}`),
      });
    });

    ROLES.forEach((r) => {
      const label = r.charAt(0).toUpperCase() + r.slice(1);
      items.push({
        id: `role-${r}`,
        label: `Switch to ${label}`,
        group: "Switch role",
        action: () => {
          setRole(r);
          onClose();
        },
      });
    });

    SEED_CHANGES.forEach((c) => {
      items.push({
        id: `brief-${c.id}`,
        label: `Senso brief — ${c.label}`,
        group: "Open Senso brief",
        action: () => navigate(`/app/evidence/${c.id}`),
      });
    });

    if (isChangePage && currentChangeId) {
      items.push({
        id: "bundle",
        label: "Generate Compliance Bundle",
        hint: "Opens printable HTML",
        group: "Actions",
        action: () =>
          window.open(`/v1/evidence/${currentChangeId}/bundle.html`, "_blank"),
      });
    } else {
      items.push({
        id: "bundle",
        label: "Generate Compliance Bundle",
        hint: "Open a change first",
        group: "Actions",
        disabled: true,
        action: () => {},
      });
    }

    return items;
  }, [vendors, isChangePage, currentChangeId, setRole, onClose]);

  const filtered = buildItems().filter(
    (item) => !query || substrMatch(item.label, query)
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Tab") {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled"),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIdx];
      if (item && !item.disabled) {
        item.action();
        onClose();
      }
    } else if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  };

  if (!open) return null;

  let lastGroup = "";

  return createPortal(
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          width: 560,
          maxHeight: 480,
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onKeyDown={handleKeyDown}
      >
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <input
            ref={inputRef}
            className="input"
            type="search"
            placeholder="Jump to vendor, switch role, or run action…"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            style={{ width: "100%", border: "none", background: "transparent" }}
            aria-label="Search commands"
            autoComplete="off"
          />
        </div>

        <ul
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          style={{
            listStyle: "none",
            margin: 0,
            padding: "var(--space-2) 0",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {filtered.length === 0 && (
            <li
              style={{
                padding: "var(--space-4) var(--space-5)",
                color: "var(--muted)",
                fontSize: "var(--text-sm)",
              }}
            >
              No results
            </li>
          )}
          {filtered.map((item, idx) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <li key={item.id}>
                {showGroup && (
                  <div
                    aria-hidden="true"
                    style={{
                      padding: "var(--space-2) var(--space-5) var(--space-1)",
                      fontSize: "var(--text-xs)",
                      fontWeight: 400,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    {item.group}
                  </div>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === activeIdx}
                  data-idx={idx}
                  className={idx === activeIdx ? "is-active" : ""}
                  disabled={item.disabled}
                  onClick={() => {
                    if (!item.disabled) {
                      item.action();
                      onClose();
                    }
                  }}
                  onMouseEnter={() => setActiveIdx(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "var(--space-2) var(--space-5)",
                    background:
                      idx === activeIdx
                        ? "var(--accent-soft)"
                        : "transparent",
                    border: "none",
                    cursor: item.disabled ? "default" : "pointer",
                    color: item.disabled
                      ? "var(--muted)"
                      : "var(--text)",
                    fontSize: "var(--text-sm)",
                    textAlign: "left",
                    fontFamily: "var(--font-text)",
                    transition: "background var(--dur-fast)",
                  }}
                >
                  <span>{item.label}</span>
                  {item.hint && (
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--muted)",
                        marginLeft: "var(--space-3)",
                        flexShrink: 0,
                      }}
                    >
                      {item.hint}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body
  );
}

export function CommandPalette(): JSX.Element {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openPalette = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement;
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => {
      if (triggerRef.current && triggerRef.current !== document.body) {
        triggerRef.current.focus();
      }
    });
  }, []);

  useGlobalShortcut("Meta+K", openPalette);
  useGlobalShortcut("Control+K", openPalette);

  useEffect(() => {
    const onOpen = (): void => openPalette();
    window.addEventListener("redline:openPalette", onOpen);
    return () => window.removeEventListener("redline:openPalette", onOpen);
  }, [openPalette]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") closePalette();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, closePalette]);

  return <Palette open={open} onClose={closePalette} />;
}
