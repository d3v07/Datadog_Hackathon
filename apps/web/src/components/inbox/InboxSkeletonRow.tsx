export function InboxSkeletonRow(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 68,
        borderBottom: "1px solid rgba(15,23,42,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 24px",
      }}
    >
      <div
        className="skeleton"
        style={{ width: 8, height: 8, borderRadius: "50%" }}
      />
      <div
        className="skeleton"
        style={{ width: 24, height: 24, borderRadius: "50%" }}
      />
      <div
        className="skeleton"
        style={{ flex: 1, height: 10, borderRadius: 4, maxWidth: 320 }}
      />
    </div>
  );
}
