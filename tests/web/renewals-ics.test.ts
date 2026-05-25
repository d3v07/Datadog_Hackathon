import { describe, expect, it } from "vitest";
import type { Renewal } from "@unsyphn/shared";
import { buildIcs } from "../../apps/web/src/components/renewals/ics.js";

function fixture(overrides: Partial<Renewal> = {}): Renewal {
  return {
    id: "ren_test",
    vendorId: "vnd_test",
    vendorName: "Acme; Inc",
    renewsAt: "2026-09-30",
    daysOut: 127,
    annualValueUsd: 120_000,
    ownerEmail: "devon@acme.dev",
    status: "triage",
    benchmarkDelta: 12,
    ...overrides,
  };
}

describe("buildIcs", () => {
  const NOW = new Date("2026-05-25T00:00:00Z");

  it("emits a valid VCALENDAR envelope with CRLF line endings", () => {
    const text = buildIcs([fixture()], NOW);
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(text.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(text.includes("\n") && !text.includes("\r\n")).toBe(false);
    expect(text).toContain("VERSION:2.0");
    expect(text).toContain("PRODID:-//UNSYPHN//Renewals//EN");
  });

  it("starts DTSTART exactly 30 days before DTEND", () => {
    const text = buildIcs([fixture({ renewsAt: "2026-09-30" })], NOW);
    // 30 days before 2026-09-30 = 2026-08-31
    expect(text).toContain("DTSTART;VALUE=DATE:20260831");
    expect(text).toContain("DTEND;VALUE=DATE:20260930");
  });

  it("escapes special characters in vendor names and summary text", () => {
    const text = buildIcs([fixture({ vendorName: "Acme; Inc, LLC" })], NOW);
    expect(text).toContain("Acme\\; Inc\\, LLC");
  });

  it("emits one VEVENT per renewal with mailto organizer + attendee", () => {
    const text = buildIcs(
      [
        fixture({ id: "ren_one", vendorName: "One" }),
        fixture({ id: "ren_two", vendorName: "Two" }),
      ],
      NOW,
    );
    expect((text.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect(text).toContain("ORGANIZER");
    expect(text).toContain("mailto:devon@acme.dev");
    expect(text).toContain("ATTENDEE");
  });

  it("skips renewals with an unparseable renewsAt", () => {
    const text = buildIcs([fixture({ renewsAt: "not-a-date" })], NOW);
    expect((text.match(/BEGIN:VEVENT/g) ?? []).length).toBe(0);
  });
});
