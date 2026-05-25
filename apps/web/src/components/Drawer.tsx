import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Drawer({ open, onClose, children, title }: Props): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const titleId = "drawer-title";

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      const first = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
      first?.focus();
    } else {
      const opener = openerRef.current;
      if (opener instanceof HTMLElement) opener.focus();
      openerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled"),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (first === undefined || last === undefined) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          display: open ? "block" : "none",
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 200,
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: `transform var(--dur-base) var(--ease-out)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 var(--space-5)",
            height: 52,
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {title && (
            <span
              id={titleId}
              style={{
                fontWeight: 400,
                fontSize: "var(--text-sm)",
                color: "var(--text-strong)",
              }}
            >
              {title}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "var(--text-2)",
              cursor: "pointer",
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-md)",
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "var(--space-5)",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
