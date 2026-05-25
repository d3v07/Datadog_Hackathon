import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  anchor: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  labelledBy?: string;
  width?: number;
}

// Small click-outside / Escape-aware popover anchored beneath an element.
// Focus is moved to the first interactive child on open and cycled with Tab.
export function Popover({ open, onClose, anchor, children, labelledBy, width = 200 }: Props): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    focusables[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.from(focusables).filter((n) => !n.hasAttribute("disabled"));
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const onClickAway = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panel.contains(t)) return;
      if (anchor.current && anchor.current.contains(t)) return;
      onClose();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickAway);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickAway);
    };
  }, [open, onClose, anchor]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-labelledby={labelledBy}
      className="glass-strong scale-in"
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        minWidth: width,
        borderRadius: 8,
        boxShadow: "var(--shadow-3)",
        padding: 4,
        zIndex: 100,
      }}
    >
      {children}
    </div>
  );
}

export function PopoverItem({
  children,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  onClick: () => void;
  selected?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected ?? false}
      onClick={onClick}
      className="button-pop"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        background: selected ? "var(--accent-soft)" : "transparent",
        border: "none",
        borderRadius: 6,
        fontSize: "var(--text-sm)",
        cursor: "pointer",
        color: "var(--text)",
        fontFamily: "var(--font-text)",
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}
