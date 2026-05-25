import { useRef } from "react";
import { ROLES, ROLE_LABELS, useRole } from "../lib/role.js";
import type { Role } from "../lib/role.js";

const CHIP_STYLES = `
.lens-chips-bar {
  display: flex;
  gap: 4px;
  align-items: center;
  margin: 16px 0 24px;
  flex-wrap: wrap;
}
.lens-chip {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  font-family: var(--font-text);
  font-size: 13.5px;
  font-weight: 500;
  background: transparent;
  color: #475569;
  transition:
    background var(--dur-sm) var(--ease-out),
    color var(--dur-sm) var(--ease-out),
    transform var(--dur-sm) var(--ease-spring),
    box-shadow var(--dur-sm) var(--ease-out);
  white-space: nowrap;
  line-height: 1;
}
.lens-chip:hover {
  background: #f1f5f9;
  transform: translateY(-1px);
}
.lens-chip:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}
.lens-chip-active {
  background: #5E6AD2;
  color: #ffffff;
  box-shadow: 0 0 0 4px rgba(94,106,210,0.15), 0 2px 8px rgba(94,106,210,0.28);
}
.lens-chip-active:hover {
  background: #5E6AD2;
  transform: translateY(-1px);
}
@media (max-width: 640px) {
  .lens-chips-bar {
    margin: 12px 0 20px;
  }
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
        className="lens-chips-bar"
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
