import { Clock, AlertOctagon } from "lucide-react";
import type { RequestDto } from "./types.js";

interface Props {
  request: RequestDto;
  now?: number;
}

function formatHours(ms: number): string {
  const hours = Math.abs(Math.round(ms / 3_600_000));
  if (hours < 1) return "<1h";
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function SlaChip({ request, now = Date.now() }: Props): JSX.Element | null {
  if (request.status !== "pending" && request.status !== "routed") return null;
  const dueMs = Date.parse(request.slaDueAt);
  const diff = dueMs - now;
  const overdue = diff < 0;
  const urgent = !overdue && diff < 12 * 3_600_000;

  const bg = overdue
    ? "rgba(220,38,38,0.10)"
    : urgent
    ? "rgba(217,119,6,0.10)"
    : "rgba(100,116,139,0.10)";
  const color = overdue ? "var(--danger)" : urgent ? "var(--warning)" : "var(--text-2)";
  const border = overdue
    ? "1px solid rgba(220,38,38,0.25)"
    : urgent
    ? "1px solid rgba(217,119,6,0.25)"
    : "1px solid var(--border)";
  const Icon = overdue ? AlertOctagon : Clock;
  const label = overdue
    ? `Overdue by ${formatHours(diff)}`
    : `Decision in ${formatHours(diff)}`;

  return (
    <span
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: "var(--text-xs)",
        fontWeight: 500,
        color,
        background: bg,
        border,
        padding: "2px var(--space-2)",
        borderRadius: "var(--radius-full)",
        height: 22,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={11} aria-hidden="true" />
      {label}
    </span>
  );
}
