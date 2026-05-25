export type ToastVariant = "success" | "error";

export interface ToastState {
  message: string;
  variant: ToastVariant;
}

export function Toast({ message, variant }: ToastState): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "var(--space-6)",
        left: "50%",
        transform: "translateX(-50%)",
        background: variant === "success" ? "var(--success)" : "var(--danger)",
        color: "#fff",
        padding: "var(--space-2) var(--space-5)",
        borderRadius: "var(--radius-full)",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
        zIndex: 500,
        whiteSpace: "nowrap",
        boxShadow: "var(--shadow-3)",
      }}
    >
      {message}
    </div>
  );
}
