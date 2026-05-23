import type { ChangeReport, ChangeReportId, OrgId } from "@redline/shared";

export interface ChangeReportRepository {
  getLatest(orgId: OrgId, id: ChangeReportId): Promise<ChangeReport | null>;
  insertVersion(report: ChangeReport): Promise<void>;
  listVersions(orgId: OrgId, id: ChangeReportId): Promise<ChangeReport[]>;
}

function copyReport(report: ChangeReport): ChangeReport {
  return structuredClone(report);
}

function key(orgId: OrgId, id: ChangeReportId): string {
  return `${orgId}:${id}`;
}

export class InMemoryChangeReportRepository implements ChangeReportRepository {
  private readonly rows = new Map<string, ChangeReport[]>();

  constructor(seed: ChangeReport[] = []) {
    for (const report of seed) {
      this.seed(report);
    }
  }

  seed(report: ChangeReport): void {
    const reportKey = key(report.orgId, report.id);
    const versions = this.rows.get(reportKey) ?? [];
    this.rows.set(reportKey, [...versions, copyReport(report)]);
  }

  async getLatest(orgId: OrgId, id: ChangeReportId): Promise<ChangeReport | null> {
    const versions = this.rows.get(key(orgId, id)) ?? [];
    if (versions.length === 0) {
      return null;
    }

    const latest = [...versions].sort((a: ChangeReport, b: ChangeReport) => {
      const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      return updatedDiff || b.version - a.version;
    })[0];

    if (!latest) {
      return null;
    }

    return copyReport(latest);
  }

  async insertVersion(report: ChangeReport): Promise<void> {
    this.seed(report);
  }

  async listVersions(orgId: OrgId, id: ChangeReportId): Promise<ChangeReport[]> {
    return (this.rows.get(key(orgId, id)) ?? []).map(copyReport);
  }
}
