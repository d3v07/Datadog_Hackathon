import { useRef } from "react";
import { ROLES, ROLE_LABELS, useRole } from "../lib/role.js";
import type { Role } from "../lib/role.js";

const CHIP_STYLES = `
.lens-chip {
  height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 var(--space-3);
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  font-family: var(--font-text);
  font-size: var(--text-sm);
  font-weight: 500;
  background: transparent;
  color: var(--text-2);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}
.lens-chip:hover {
  background: var(--surface-2);
}
.lens-chip:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}
.lens-chip-active {
  background: var(--accent);
  color: #fff;
}
.lens-chip-active:hover {
  background: var(--accent-hover);
}
`;

export function LensChips(): JSX.Element {
  const [role, setRole] = useRole();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (index + dir + ROLES.length) % ROLES.length;
      const nextRole = ROLES[next] as Role;
      setRole(nextRole);
      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']");
      buttons?.[next]?.focus();
    }
  };

  return (
    <>
      <style>{CHIP_STYLES}</style>
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Role lens"
        style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}
      >
        {ROLES.map((r, index) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={r === role}
            tabIndex={r === role ? 0 : -1}
            onClick={() => setRole(r)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={r === role ? "lens-chip lens-chip-active" : "lens-chip"}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
    </>
  );
}
