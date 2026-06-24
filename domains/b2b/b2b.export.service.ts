import type { B2BRequester } from "./b2b.policy";
import { assertScope, B2BAccessDeniedError } from "./b2b.policy";
import type { B2BQueryEngine, B2BQueryFilter } from "./b2b.query.engine";
import type { B2BCohortBuilder } from "./b2b.cohort.builder";
import type { B2BCohort } from "./b2b.cohort.builder";
import type { B2BAudit } from "./b2b.audit";
import type { AnonymizedCaseRecord } from "./b2b.anonymizer";
import { anonymizeCase } from "./b2b.anonymizer";

export interface DatasetExport {
  generatedAt: string;
  organizationId: string;
  filter: B2BQueryFilter;
  records: AnonymizedCaseRecord[];
  recordCount: number;
}

export interface Report {
  generatedAt: string;
  organizationId: string;
  cohorts: B2BCohort[];
  summary: {
    totalCohorts: number;
    totalCases: number;
    diseaseKeys: string[];
  };
}

export class B2BExportService {
  constructor(
    private readonly queryEngine: B2BQueryEngine,
    private readonly cohortBuilder: B2BCohortBuilder,
    private readonly audit: B2BAudit,
  ) {}

  async queryCohort(requester: B2BRequester, diseaseKey: string): Promise<B2BCohort> {
    try {
      assertScope(requester, "cohort_read");
    } catch (err) {
      await this.audit.logDenied(requester, "queryCohort", (err as Error).message);
      throw err;
    }

    try {
      const cohort = await this.cohortBuilder.buildCohort(diseaseKey);
      await this.audit.logQuery(requester, "queryCohort", { diseaseKey, recordCount: cohort.recordCount });
      return cohort;
    } catch (err) {
      if (!(err instanceof B2BAccessDeniedError)) {
        await this.audit.logDenied(requester, "queryCohort", (err as Error).message);
      }
      throw err;
    }
  }

  async exportDataset(requester: B2BRequester, filter: B2BQueryFilter = {}): Promise<DatasetExport> {
    try {
      assertScope(requester, "dataset_export");
    } catch (err) {
      await this.audit.logDenied(requester, "exportDataset", (err as Error).message);
      throw err;
    }

    const rawCases = await this.queryEngine.query(filter);
    const records = rawCases.map((r) => anonymizeCase(r));

    const result: DatasetExport = {
      generatedAt: new Date().toISOString(),
      organizationId: requester.organizationId,
      filter,
      records,
      recordCount: records.length,
    };

    await this.audit.logExport(requester, "exportDataset", {
      filter,
      recordCount: records.length,
    });

    return result;
  }

  async generateReport(requester: B2BRequester, edgeCountByDisease?: Map<string, number>): Promise<Report> {
    try {
      assertScope(requester, "report_read");
    } catch (err) {
      await this.audit.logDenied(requester, "generateReport", (err as Error).message);
      throw err;
    }

    const cohorts = await this.cohortBuilder.buildAllCohorts(edgeCountByDisease);
    const totalCases = cohorts.reduce((s, c) => s + c.recordCount, 0);

    const report: Report = {
      generatedAt: new Date().toISOString(),
      organizationId: requester.organizationId,
      cohorts,
      summary: {
        totalCohorts: cohorts.length,
        totalCases,
        diseaseKeys: cohorts.map((c) => c.diseaseKey),
      },
    };

    await this.audit.logExport(requester, "generateReport", {
      totalCohorts: cohorts.length,
      totalCases,
    });

    return report;
  }
}
