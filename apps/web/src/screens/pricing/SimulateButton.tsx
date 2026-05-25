const S = {
  muted: {
    fontSize: "var(--text-xs)",
    color: "var(--muted)",
    margin: "var(--space-3) 0 0",
    textAlign: "center" as const,
  },
} as const;

// Dev-mode hint — actual simulation is triggered via Shift+Enter global keydown handler.
export function SimulateHint(): JSX.Element {
  return (
    <p style={S.muted}>
      On-stage fallback: press <kbd>Shift</kbd> + <kbd>Enter</kbd> to simulate success.
    </p>
  );
}
