import { ROLE_LABELS, type Role } from "../../lib/role.js";

interface InboxEmptyStateProps {
  role: Role;
  query: string;
}

export function InboxEmptyState({ role, query }: InboxEmptyStateProps): JSX.Element {
  const emptyCopy = `Nothing for ${ROLE_LABELS[role]} today — try a different lens or J to switch.`;

  return (
    <div
      className="card glass-soft fade-up"
      style={{
        padding: 56,
        textAlign: "center",
        color: "#64748b",
        fontSize: 14,
      }}
    >
      <p style={{ margin: "0 0 8px" }}>
        {query ? "Nothing matches your search. Try a different query." : emptyCopy}
      </p>
      <a
        href="/app/findings"
        style={{
          fontSize: 13,
          color: "var(--accent)",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        View in Findings →
      </a>
    </div>
  );
}
