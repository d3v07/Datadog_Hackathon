export function InboxSkeletonRow(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 68,
        borderBottom: "1px solid rgba(15,23,42,0.06)",
        background: "var(--surface-2)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 24px",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border-strong)" }} />
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--border-strong)" }} />
      <div style={{ flex: 1, height: 10, borderRadius: 4, background: "var(--border-strong)", maxWidth: 320 }} />
    </div>
  );
}
