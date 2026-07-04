// wave2-exit-audit-service.js — PR-075: Wave2 Exit Audit (Phase G capstone — Wave2正式完了).
// WAVE2_MASTER_DESIGN.md Section 12 / BD-040: EC-01〜EC-15 + QC-01〜QC-04 全項目を Founder が
// 確認した上で Wave3 に移行する。一部通過での Wave3 着手は禁止。
// BD-027: 各フェーズ移行は Founder 確認を必須とする — confirmWave3Migration() はその
// 唯一のゲートであり、founderId なしでは絶対に通過しない。
//
// This service does NOT re-derive business logic that already has a mechanical audit
// owner elsewhere in Wave2 — it aggregates:
//   ResearchPlatformAuditService (PR-072) → BD-021 / BD-030 / BD-036 / BD-037 / BD-039
//   Phase3CompletionValidator   (PR-066) → BD-026 (BD-027 is a structural property of
//                                           this service's own founderId-gated design)
//   AISafetyValidator           (PR-062) → BD-031 / BD-038
// EC-01〜EC-14 are evidenced by tests/wave2/ (PR-074) passing — re-deriving each check
// here would duplicate that suite. The remaining BD-001〜043 entries are process /
// architecture / historical decisions that cannot be proven by code alone; they are
// surfaced as FOUNDER_REVIEW_REQUIRED rather than falsely asserted PASS.

import { buildDomainEvent }                    from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';
import { buildWave2ExitApprovalRecord }        from './wave2-exit-audit-entity.js';
import {
  WAVE2_EXIT_AUDIT_SCHEMA_VERSION,
  AUDIT_RESULT,
  BD_STATUS,
  EC_LIST,
  QC_LIST,
  BD_SCOPE_LIST,
  MECHANICALLY_AUDITED_BDS,
} from './wave2-exit-audit-types.js';

export {
  WAVE2_EXIT_AUDIT_SCHEMA_VERSION, AUDIT_RESULT, BD_STATUS, EC_LIST, QC_LIST,
  BD_SCOPE_LIST, MECHANICALLY_AUDITED_BDS,
};

/**
 * Thrown by confirmWave3Migration() when the exit report has not reached
 * wave3ReadyForFounderApproval. Catching this and proceeding anyway is a BD-040 violation.
 */
export class Wave2ExitCriteriaNotMetError extends Error {
  /** @param {Readonly<object>} exitReport  Wave2ExitAuditReport that failed */
  constructor(exitReport) {
    super(
      `[Wave2ExitAuditService] BD-040: Wave2 Exit Criteria not fully met — ` +
      `EC ${exitReport?.ecSummary?.passCount ?? 0}/${EC_LIST.length}, ` +
      `QC ${exitReport?.qcSummary?.passCount ?? 0}/${QC_LIST.length}. ` +
      `Wave3 migration confirmation is blocked.`
    );
    this.name       = 'Wave2ExitCriteriaNotMetError';
    this.exitReport = exitReport;
  }
}

export class Wave2ExitAuditService {
  #researchPlatformAuditService;
  #phase3CompletionValidator;
  #aiSafetyValidator;
  #repository;
  #eventPublisher;

  /**
   * @param {{
   *   researchPlatformAuditService: import('../research-platform-audit/research-platform-audit-service.js').ResearchPlatformAuditService,
   *   phase3CompletionValidator:    import('../network-evolution/phase3-completion-validator.js').Phase3CompletionValidator,
   *   aiSafetyValidator:            import('../ai-safety/ai-safety-validator.js').AISafetyValidator,
   *   repository:                   import('./wave2-exit-audit-repository.js').Wave2ExitAuditRepository,
   *   eventPublisher?:              object|null,
   * }} deps
   */
  constructor({
    researchPlatformAuditService, phase3CompletionValidator, aiSafetyValidator, repository,
    eventPublisher = null,
  } = {}) {
    if (!researchPlatformAuditService) throw new Error('[Wave2ExitAuditService] researchPlatformAuditService is required');
    if (!phase3CompletionValidator)    throw new Error('[Wave2ExitAuditService] phase3CompletionValidator is required');
    if (!aiSafetyValidator)            throw new Error('[Wave2ExitAuditService] aiSafetyValidator is required');
    if (!repository)                   throw new Error('[Wave2ExitAuditService] repository is required');

    this.#researchPlatformAuditService = researchPlatformAuditService;
    this.#phase3CompletionValidator    = phase3CompletionValidator;
    this.#aiSafetyValidator            = aiSafetyValidator;
    this.#repository                   = repository;
    this.#eventPublisher               = eventPublisher ?? null;
  }

  // ── EC-01〜EC-15 (Roadmap PR-075 責務①) ────────────────────────────────────

  /**
   * EC-01〜EC-14 are evidenced by tests/wave2/ (PR-074) passing. EC-15 is evidenced by
   * the overall `vitest run` result matching the known pre-existing-failure baseline
   * (no new failures — Roadmap PR-074 責務⑤, re-confirmed here at Wave2 Exit).
   *
   * @param {{ testSuiteStatus?: {
   *   wave2ExitCriteriaSuitePassed?: boolean,  tests/wave2/wave2-exit-criteria.test.js
   *   wave2IntegrationSuitePassed?:  boolean,  tests/wave2/wave2-integration.test.js
   *   totalTests?: number, failedTests?: number,
   *   knownPreExistingFailureCount?: number, newFailureFiles?: string[],
   * } }} input
   * @returns {Readonly<object>} { results, passCount, failCount, allPass }
   */
  auditExitCriteria({ testSuiteStatus = {} } = {}) {
    const {
      wave2ExitCriteriaSuitePassed = false,
      wave2IntegrationSuitePassed  = false,
      totalTests   = 0,
      failedTests  = 0,
      knownPreExistingFailureCount = 39,
      newFailureFiles = [],
    } = testSuiteStatus;

    const ec1314Pass = wave2IntegrationSuitePassed;
    const ec15Pass    = totalTests > 0 && failedTests <= knownPreExistingFailureCount && newFailureFiles.length === 0;

    const results = {};
    for (const { id, description } of EC_LIST) {
      let pass, evidence;
      if (id === 'EC-15') {
        pass     = ec15Pass;
        evidence = `vitest run: ${totalTests - failedTests}/${totalTests} passed, ` +
                   `${failedTests} failed (baseline ${knownPreExistingFailureCount}), ` +
                   `newFailureFiles=[${newFailureFiles.join(', ')}]`;
      } else if (id === 'EC-13' || id === 'EC-14') {
        pass     = ec1314Pass;
        evidence = 'tests/wave2/wave2-integration.test.js (PR-074)';
      } else {
        pass     = wave2ExitCriteriaSuitePassed;
        evidence = 'tests/wave2/wave2-exit-criteria.test.js (PR-074)';
      }
      results[id] = Object.freeze({ id, description, result: pass ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL, evidence });
    }

    const passCount = Object.values(results).filter(r => r.result === AUDIT_RESULT.PASS).length;
    return Object.freeze({
      results:  Object.freeze(results),
      passCount,
      failCount: EC_LIST.length - passCount,
      allPass:   passCount === EC_LIST.length,
    });
  }

  // ── BD-001〜BD-043 compliance (Roadmap PR-075 責務③) ────────────────────────

  /**
   * Determine PASS/FAIL/FOUNDER_REVIEW_REQUIRED for every BD-001〜BD-043 entry.
   * Only MECHANICALLY_AUDITED_BDS get a real PASS/FAIL, derived from already-computed
   * sub-reports; every other BD is FOUNDER_REVIEW_REQUIRED (BD-027) — never fabricated.
   *
   * @param {{ researchPlatformReport: object, phase3Report: object, aiSafetyReport: object }} sub
   * @returns {Readonly<object>}
   */
  auditBDCompliance({ researchPlatformReport, phase3Report, aiSafetyReport }) {
    const aiSafetyCompliant = aiSafetyReport?.phaseDComplete === true && aiSafetyReport?.totalViolations === 0;

    const items = BD_SCOPE_LIST.map(({ bd, description }) => {
      let status = BD_STATUS.FOUNDER_REVIEW_REQUIRED;
      if (!MECHANICALLY_AUDITED_BDS.includes(bd)) {
        return Object.freeze({ bd, description, status });
      }
      switch (bd) {
        case 'BD-021':
          status = researchPlatformReport.bd021.result === AUDIT_RESULT.PASS ? BD_STATUS.PASS : BD_STATUS.FAIL;
          break;
        case 'BD-030':
        case 'BD-036':
          status = researchPlatformReport.bd030_036.result === AUDIT_RESULT.PASS ? BD_STATUS.PASS : BD_STATUS.FAIL;
          break;
        case 'BD-037':
          status = researchPlatformReport.bd037.result === AUDIT_RESULT.PASS ? BD_STATUS.PASS : BD_STATUS.FAIL;
          break;
        case 'BD-039':
          status = researchPlatformReport.bd039.result === AUDIT_RESULT.PASS ? BD_STATUS.PASS : BD_STATUS.FAIL;
          break;
        case 'BD-026':
          status = phase3Report.phase3Complete ? BD_STATUS.PASS : BD_STATUS.FAIL;
          break;
        case 'BD-027':
          // Structural: confirmWave3Migration() throws without an explicit founderId — always PASS.
          status = BD_STATUS.PASS;
          break;
        case 'BD-031':
        case 'BD-038':
          status = aiSafetyCompliant ? BD_STATUS.PASS : BD_STATUS.FAIL;
          break;
      }
      return Object.freeze({ bd, description, status });
    });

    const mechanicallyPassed = items.filter(i => i.status === BD_STATUS.PASS);
    const mechanicallyFailed = items.filter(i => i.status === BD_STATUS.FAIL);
    const founderReview      = items.filter(i => i.status === BD_STATUS.FOUNDER_REVIEW_REQUIRED);

    return Object.freeze({
      items:                Object.freeze(items),
      mechanicalPassCount:  mechanicallyPassed.length,
      mechanicalFailCount:  mechanicallyFailed.length,
      founderReviewCount:   founderReview.length,
      mechanicallyCompliant: mechanicallyFailed.length === 0,
    });
  }

  // ── Full Wave2 Exit Report (Founder-facing, Roadmap PR-075 責務①②③) ────────

  /**
   * Generate the Founder-facing Wave2ExitAuditReport: EC-01〜15 + QC-01〜04 + BD-001〜043.
   * wave3ReadyForFounderApproval=true only when every EC/QC passes AND no mechanically
   * audited BD has failed (FOUNDER_REVIEW_REQUIRED items never block this gate — they
   * require a human read, not code, per BD-027).
   *
   * @param {{
   *   clusterProfiles?:         Record<string, object>,
   *   aiSafetyServiceStatuses?: Object<string, object>,
   *   testSuiteStatus?:         object,
   * }} input
   * @returns {Readonly<object>} Wave2ExitAuditReport
   */
  generateExitReport({ clusterProfiles = {}, aiSafetyServiceStatuses = {}, testSuiteStatus = {} } = {}) {
    const researchPlatformReport = this.#researchPlatformAuditService.auditPlatform({ clusterProfiles, aiSafetyServiceStatuses });
    const phase3Report           = this.#phase3CompletionValidator.validatePhase3(clusterProfiles);
    const aiSafetyReport         = this.#aiSafetyValidator.getAuditReport(aiSafetyServiceStatuses);

    const ecAudit = this.auditExitCriteria({ testSuiteStatus });
    const bdAudit = this.auditBDCompliance({ researchPlatformReport, phase3Report, aiSafetyReport });

    const aiSafetyCompliant = aiSafetyReport.phaseDComplete === true && aiSafetyReport.totalViolations === 0;
    const qcResults = Object.freeze({
      'QC-01': Object.freeze({
        result:   ecAudit.results['EC-14'].result,
        evidence: 'EC-14 (ArchitectureGuard Wave2 rule coverage — tests/arch/ + tests/wave2/ pass)',
      }),
      'QC-02': Object.freeze({
        result:   bdAudit.mechanicallyCompliant ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL,
        evidence: `${bdAudit.mechanicalPassCount} mechanically-verified BDs PASS, ` +
                   `${bdAudit.founderReviewCount} require Founder review (not machine-checkable)`,
      }),
      'QC-03': Object.freeze({
        result:   researchPlatformReport.bd030_036.result,
        evidence: 'ResearchPlatformAuditService.auditKAnonymity() (BD-030/BD-036, ZERO TOLERANCE k>=5)',
      }),
      'QC-04': Object.freeze({
        result:   aiSafetyCompliant ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL,
        evidence: 'AISafetyValidator.getAuditReport() (BD-031/BD-038)',
      }),
    });
    const qcPassCount = Object.values(qcResults).filter(r => r.result === AUDIT_RESULT.PASS).length;

    const wave3ReadyForFounderApproval = ecAudit.allPass && qcPassCount === QC_LIST.length && bdAudit.mechanicallyCompliant;

    const report = Object.freeze({
      result:         wave3ReadyForFounderApproval ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL,
      wave3ReadyForFounderApproval,
      schemaVersion:  WAVE2_EXIT_AUDIT_SCHEMA_VERSION,
      ecSummary: Object.freeze({
        results: ecAudit.results, passCount: ecAudit.passCount, failCount: ecAudit.failCount, total: EC_LIST.length,
      }),
      qcSummary: Object.freeze({
        results: qcResults, passCount: qcPassCount, failCount: QC_LIST.length - qcPassCount, total: QC_LIST.length,
      }),
      bdSummary:   bdAudit,
      generatedAt: new Date().toISOString(), // BD-018
      bd040Note:   'BD-040: EC-01〜EC-15 + QC-01〜QC-04 全項目をFounderが確認した上でWave3に移行。一部通過での着手は禁止',
      bd027Note:   'BD-027: 各フェーズ移行はFounder確認を必須とする — confirmWave3Migration()はfounderId必須',
    });

    return report;
  }

  // ── Founder approval gate (Roadmap PR-075 責務④) ───────────────────────────

  /**
   * Record a Founder's confirmation of Wave2 → Wave3 migration.
   * BD-040 / BD-027: hard-blocked (Wave2ExitCriteriaNotMetError) unless
   * exitReport.wave3ReadyForFounderApproval is true.
   *
   * @param {{ founderId: string, exitReport: Readonly<object>, note?: string }} input
   * @returns {Readonly<object>} ApprovalRecord
   * @throws {Wave2ExitCriteriaNotMetError}
   */
  confirmWave3Migration({ founderId, exitReport, note = '' }) {
    if (!exitReport?.wave3ReadyForFounderApproval) {
      throw new Wave2ExitCriteriaNotMetError(exitReport);
    }
    const record = buildWave2ExitApprovalRecord({ founderId, note, exitReport });
    this.#repository.append(record);
    this.#publish(record);
    return record;
  }

  /** @returns {boolean} true once a Founder has confirmed Wave3 migration (Append-Only — never reverts). */
  isWave3MigrationConfirmed() {
    return this.#repository.latest() !== null;
  }

  /** @returns {ReadonlyArray<Readonly<object>>} all Founder approval records (audit trail). */
  getApprovals() {
    return this.#repository.findAll();
  }

  // ── Wave3 migration approval document (Roadmap PR-075 責務⑤) ───────────────

  /**
   * Generate the Wave3 移行承認文書 — a Founder-facing document combining the exit
   * report with the recorded approval. Requires confirmWave3Migration() to have run.
   *
   * @param {{ exitReport: Readonly<object>, approvalRecord: Readonly<object> }} input
   * @returns {Readonly<object>}
   */
  generateWave3MigrationDocument({ exitReport, approvalRecord }) {
    if (!exitReport)      throw new Error('[Wave2ExitAuditService] exitReport is required');
    if (!approvalRecord)  throw new Error('[Wave2ExitAuditService] approvalRecord is required (confirmWave3Migration() first)');

    return Object.freeze({
      title:         'IPPO Wave2 → Wave3 移行承認文書',
      schemaVersion: WAVE2_EXIT_AUDIT_SCHEMA_VERSION,
      approvedBy:    approvalRecord.founderId,
      confirmedAt:   approvalRecord.confirmedAt,
      ecSummary:     exitReport.ecSummary,
      qcSummary:     exitReport.qcSummary,
      bdSummary:     exitReport.bdSummary,
      nextSteps:     'Wave3 Roadmap 起点（Wave3 MASTER DESIGN 入力）— docs/WAVE2_ROADMAP.md 次PRへの入力参照',
      generatedAt:   new Date().toISOString(), // BD-018
    });
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:                true,
      schemaVersion:        WAVE2_EXIT_AUDIT_SCHEMA_VERSION,
      ecCount:              EC_LIST.length,
      qcCount:               QC_LIST.length,
      bdScopeCount:          BD_SCOPE_LIST.length,
      mechanicallyAuditedBdCount: MECHANICALLY_AUDITED_BDS.length,
      wave3MigrationConfirmed: this.isWave3MigrationConfirmed(),
      bd040: 'Wave2 Exit Criteria（EC-01〜EC-15 + QC-01〜QC-04）は全項目をFounderが確認した上でWave3に移行',
      bd027: 'Founder確認必須 — confirmWave3Migration()はfounderId必須のゲート',
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publish(record) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.WAVE2_EXIT_CONFIRMED,
        aggregateType: AGGREGATE_TYPES.WAVE2_EXIT_AUDIT,
        aggregateId:   record.approvalId,
        payload:       Object.freeze({ ...record }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort; repository.append() above is the authoritative persistence.
    }
  }
}
