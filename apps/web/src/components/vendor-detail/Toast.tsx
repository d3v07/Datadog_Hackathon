export function VendorToast({ message }: { message: string }): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="glass-strong slide-in-right"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        color: "var(--text)",
        padding: "var(--space-2) var(--space-4)",
        borderRadius: "var(--radius-pill)",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
        zIndex: 500,
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}
