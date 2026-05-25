export function VendorToast({ message }: { message: string }): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--text)",
        color: "var(--surface)",
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
