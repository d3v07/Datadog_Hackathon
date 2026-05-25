import type { Renewal } from "@unsyphn/shared";

// Minimal RFC 5545 .ics generator. CRLF line endings are mandatory; some
// calendar clients reject LF-only feeds. Skips line folding (75-char limit)
// because hackathon entries fit comfortably.

const CRLF = "\r\n";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIcsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function toIcsDateTime(d: Date): string {
  return `${toIcsDate(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
    d.getUTCSeconds(),
  )}Z`;
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function renewalUid(r: Renewal): string {
  return `${r.id}@unsyphn.app`;
}

function renewalEvent(r: Renewal, dtStamp: string): string[] {
  const renews = new Date(r.renewsAt);
  if (!Number.isFinite(renews.getTime())) return [];
  const start = new Date(renews.getTime() - 30 * 86_400_000);
  const summary = `Renewal: ${r.vendorName} — ${formatUsd(r.annualValueUsd)}/yr`;
  const description = `Review terms, prep negotiation. Renews ${
    r.renewsAt
  }, ${r.daysOut}d out. ${formatUsd(r.annualValueUsd)}/yr.`;

  return [
    "BEGIN:VEVENT",
    `UID:${renewalUid(r)}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${toIcsDate(start)}`,
    `DTEND;VALUE=DATE:${toIcsDate(renews)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `ORGANIZER;CN=${escapeText(r.ownerEmail)}:mailto:${r.ownerEmail}`,
    `ATTENDEE;CN=${escapeText(r.ownerEmail)};RSVP=FALSE:mailto:${r.ownerEmail}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ];
}

export function buildIcs(renewals: ReadonlyArray<Renewal>, now: Date = new Date()): string {
  const dtStamp = toIcsDateTime(now);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UNSYPHN//Renewals//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const r of renewals) {
    lines.push(...renewalEvent(r, dtStamp));
  }
  lines.push("END:VCALENDAR");
  return lines.join(CRLF) + CRLF;
}

export function downloadIcs(
  renewals: ReadonlyArray<Renewal>,
  filename = "renewals.ics",
): void {
  if (typeof window === "undefined") return;
  const text = buildIcs(renewals);
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
