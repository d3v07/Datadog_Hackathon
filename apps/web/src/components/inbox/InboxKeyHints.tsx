const HINTS: Array<[string, string]> = [
  ["J/K", "navigate"],
  ["Enter", "open"],
  ["R", "open"],
  ["E", "resolve"],
  ["S", "snooze 48h"],
  ["X", "select"],
];

export function InboxKeyHints(): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        marginTop: 16,
        fontSize: 11,
        color: "#94a3b8",
        fontFamily: "var(--font-mono)",
        flexWrap: "wrap",
      }}
      aria-hidden="true"
    >
      {HINTS.map(([key, desc]) => (
        <span key={key}>
          <kbd
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "1px 5px",
              fontSize: 11,
              color: "#475569",
            }}
          >
            {key}
          </kbd>{" "}
          {desc}
        </span>
      ))}
    </div>
  );
}
