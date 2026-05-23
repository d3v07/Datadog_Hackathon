import type { ChangeReport } from "@redline/shared";

// ChangeReports are persisted to ClickHouse by the agent runner (Track A's
// work). For the public evidence brief fallback we additionally keep an
// in-memory cache seeded from seed/change-reports.json so /evidence/:id can
// render demo data without depending on a live agent run.

export class ChangeReportStore {
  private byId = new Map<string, ChangeReport>();

  load(reports: ChangeReport[]): void {
    this.byId.clear();
    for (const r of reports) this.byId.set(r.id, r);
  }

  add(report: ChangeReport): void {
    this.byId.set(report.id, report);
  }

  get(id: string): ChangeReport | undefined {
    return this.byId.get(id);
  }

  list(orgId: string): ChangeReport[] {
    return [...this.byId.values()].filter((r) => r.orgId === orgId);
  }
}

export const changeReportStore = new ChangeReportStore();
