import { useEffect, useRef, useState } from "react";
import { ALL_ROLES, ROLE_LABELS, useRole } from "../lib/role.js";
import type { Role } from "../lib/role.js";

export function RoleSwitcher(): JSX.Element {
  const [role, setRole] = useRole();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const close = () => {
    setOpen(false);
    setFocusedIndex(-1);
    triggerRef.current?.focus();
  };

  const select = (r: Role) => {
    setRole(r);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) return;
      close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex(i => Math.min(i + 1, ALL_ROLES.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && focusedIndex >= 0) {
        e.preventDefault();
        const picked: Role | undefined = ALL_ROLES[focusedIndex];
        if (picked !== undefined) select(picked);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, focusedIndex]);

  useEffect(() => {
    if (!open) return;
    const idx = ALL_ROLES.indexOf(role);
    setFocusedIndex(idx >= 0 ? idx : 0);
  }, [open]);

  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const item = menuRef.current?.children[focusedIndex] as HTMLElement | undefined;
    item?.focus();
  }, [focusedIndex, open]);

  const optionId = (r: Role) => `role-option-${r}`;
  const menuId = "role-switcher-listbox";

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-ghost"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(o => !o)}
        style={{
          height: 32,
          padding: "0 var(--space-3)",
          gap: "var(--space-1)",
          color: open ? "var(--accent)" : undefined,
        }}
      >
        <span style={{ fontWeight: 400, fontSize: "var(--text-sm)" }}>
          {ROLE_LABELS[role]}
        </span>
        <span
          aria-hidden="true"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--muted)",
            display: "inline-block",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--dur-fast) var(--ease-out)",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <ul
          id={menuId}
          ref={menuRef}
          role="listbox"
          aria-label="Switch role"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            width: 180,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2)",
            margin: 0,
            listStyle: "none",
            zIndex: 200,
          }}
        >
          {ALL_ROLES.map((r, idx) => {
            const isCurrent = r === role;
            const isFocused = idx === focusedIndex;
            return (
              <li
                key={r}
                id={optionId(r)}
                role="option"
                aria-selected={isCurrent}
                tabIndex={isFocused ? 0 : -1}
                onClick={() => select(r)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select(r);
                  }
                }}
                style={{
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: "var(--text-sm)",
                  fontWeight: 400,
                  color: isCurrent ? "var(--accent)" : "var(--text-2)",
                  background: isFocused ? "var(--accent-soft)" : "transparent",
                  transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
                }}
                onMouseEnter={() => setFocusedIndex(idx)}
              >
                <span>{ROLE_LABELS[r]}</span>
                {isCurrent && (
                  <span aria-hidden="true" style={{ fontSize: "var(--text-xs)", color: "var(--accent)" }}>
                    ✓
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
