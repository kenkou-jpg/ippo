// research-platform-audit-service.js — PR-072: Research Platform Audit (Phase F capstone).
// Wave2 Research Platform（PR-051〜071）の完全性・安全性を機械的に監査する。
// BD-021: 全 DatasetVersion に Founder attribution（createdBy）があることを再確認する。
// BD-030: 全 Dataset / Cohort が k-anonymity（k>=5）を満たすことを再検証する（ZERO TOLERANCE）。
// BD-036: Disease Cluster統計はk>=50を目標とし、k>=5未満のクラスタが混入していないか再検出する。
// BD-037: Knowledge Graph の Append-Only 強制（deleteNode/deleteEdge が必ず例外を投げること）を構造的に確認する。
// BD-039: AISafetyValidator（PR-062）が全AI出力の必須ゲートキーパーとして機能していること
//         （phaseDComplete=true かつ累積違反ゼロ）を確認する。
// BD-031 / BD-038: 監査自体はルールベースの機械的検証のみ — AI/LLM不使用、最終判断はFounderに委ねる。

import { buildDomainEvent }                    from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';
import {
  K_ANONYMITY_MIN,
  DISEASE_CLUSTER_TARGET_K,
  RESEARCH_PLATFORM_AUDIT_SCHEMA_VERSION,
  AUDIT_RESULT,
  AUDITED_BD_LIST,
} from './research-platform-audit-types.js';

export { K_ANONYMITY_MIN, DISEASE_CLUSTER_TARGET_K, AUDIT_RESULT, AUDITED_BD_LIST };

export class ResearchPlatformAuditService {
  #datasetVersionService;
  #cohortBuilderService;
  #knowledgeGraphRepository;
  #aiSafetyValidator;
  #eventPublisher;

  /**
   * @param {{
   *   datasetVersionService:    import('../dataset-version/dataset-version-service.js').DatasetVersionService,
   *   cohortBuilderService:     import('../cohort/cohort-builder-service.js').CohortBuilderService,
   *   knowledgeGraphRepository: import('../knowledge/knowledge-graph-repository.js').KnowledgeGraphRepository,
   *   aiSafetyValidator:        import('../ai-safety/ai-safety-validator.js').AISafetyValidator,
   *   eventPublisher?:          object|null,
   * }} deps
   */
  constructor({
    datasetVersionService,
    cohortBuilderService,
    knowledgeGraphRepository,
    aiSafetyValidator,
    eventPublisher = null,
  } = {}) {
    if (!datasetVersionService)    throw new Error('[ResearchPlatformAuditService] datasetVersionService is required');
    if (!cohortBuilderService)     throw new Error('[ResearchPlatformAuditService] cohortBuilderService is required');
    if (!knowledgeGraphRepository) throw new Error('[ResearchPlatformAuditService] knowledgeGraphRepository is required');
    if (!aiSafetyValidator)        throw new Error('[ResearchPlatformAuditService] aiSafetyValidator is required');

    this.#datasetVersionService    = datasetVersionService;
    this.#cohortBuilderService     = cohortBuilderService;
    this.#knowledgeGraphRepository = knowledgeGraphRepository;
    this.#aiSafetyValidator        = aiSafetyValidator;
    this.#eventPublisher           = eventPublisher ?? null;
  }

  // ── BD-021: Dataset Founder attribution ──────────────────────────────────

  /**
   * Re-verify every published DatasetVersion carries explicit Founder attribution.
   * @returns {Readonly<{ result: string, checkedCount: number, violations: object[] }>}
   */
  auditDatasetAttribution() {
    const versions   = this.#datasetVersionService.getVersions();
    const violations = [];
    for (const v of versions) {
      if (!v?.createdBy || typeof v.createdBy !== 'string') {
        violations.push({ versionId: v?.versionId ?? null, reason: 'missing Founder attribution (createdBy) — BD-021' });
      }
    }
    return Object.freeze({
      result:       violations.length === 0 ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL,
      checkedCount: versions.length,
      violations:   Object.freeze(violations),
    });
  }

  // ── BD-030 / BD-036: k-anonymity re-verification ─────────────────────────

  /**
   * Re-verify k-anonymity across all provided Disease Cluster profiles and all
   * published Cohorts. ZERO TOLERANCE (BD-030): any caseCount/verifiedCount < 5 fails.
   *
   * @param {Record<string, object>} clusterProfiles  keyed by diseaseKey → { caseCount }
   * @returns {Readonly<object>}
   */
  auditKAnonymity(clusterProfiles = {}) {
    if (typeof clusterProfiles !== 'object' || clusterProfiles === null || Array.isArray(clusterProfiles)) {
      throw new TypeError('[ResearchPlatformAuditService] clusterProfiles must be a keyed object');
    }

    const clusterViolations = [];
    let clustersMeetingTargetK = 0;
    for (const [diseaseKey, profile] of Object.entries(clusterProfiles)) {
      const caseCount = profile?.caseCount ?? 0;
      if (caseCount < K_ANONYMITY_MIN) {
        clusterViolations.push({
          diseaseKey, caseCount,
          reason: `caseCount < ${K_ANONYMITY_MIN} (BD-030 ZERO TOLERANCE)`,
        });
      }
      if (caseCount >= DISEASE_CLUSTER_TARGET_K) clustersMeetingTargetK++;
    }

    const cohorts = this.#cohortBuilderService.getCohorts();
    const cohortViolations = [];
    for (const cohort of cohorts) {
      const verifiedCount = cohort?.verifiedCount ?? 0;
      if (!cohort?.kAnonymityVerified || verifiedCount < K_ANONYMITY_MIN) {
        cohortViolations.push({
          cohortId:           cohort?.cohortId ?? null,
          verifiedCount,
          kAnonymityVerified: !!cohort?.kAnonymityVerified,
          reason:             `cohort not verified or verifiedCount < ${K_ANONYMITY_MIN} (BD-030 ZERO TOLERANCE)`,
        });
      }
    }

    const violations = [...clusterViolations, ...cohortViolations];
    return Object.freeze({
      result:                 violations.length === 0 ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL,
      kAnonymityMin:          K_ANONYMITY_MIN,
      clusterTargetK:         DISEASE_CLUSTER_TARGET_K,
      checkedClusterCount:    Object.keys(clusterProfiles).length,
      clustersMeetingTargetK,
      checkedCohortCount:     cohorts.length,
      clusterViolations:      Object.freeze(clusterViolations),
      cohortViolations:       Object.freeze(cohortViolations),
    });
  }

  // ── BD-037: Knowledge Graph Append-Only structural check ─────────────────

  /**
   * Structurally confirm the Knowledge Graph repository rejects all delete attempts.
   * Calling deleteNode()/deleteEdge() with no args is always safe — both throw
   * before any mutation is attempted (KgRepo contract, PR-051).
   *
   * @returns {Readonly<object>}
   */
  auditKnowledgeGraphAppendOnly() {
    let nodeDeleteBlocked = false;
    let edgeDeleteBlocked = false;
    try { this.#knowledgeGraphRepository.deleteNode(); } catch { nodeDeleteBlocked = true; }
    try { this.#knowledgeGraphRepository.deleteEdge(); } catch { edgeDeleteBlocked = true; }

    const stats = this.#knowledgeGraphRepository.getStats();
    return Object.freeze({
      result: nodeDeleteBlocked && edgeDeleteBlocked ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL,
      nodeDeleteBlocked,
      edgeDeleteBlocked,
      nodeCount: stats.nodeCount,
      edgeCount: stats.edgeCount,
    });
  }

  // ── BD-039: AI Safety Layer alignment ─────────────────────────────────────

  /**
   * Confirm AISafetyValidator (PR-062) is functioning as the mandatory gatekeeper
   * for all AI output — Phase D complete and zero accumulated violations.
   *
   * @param {Object<string, object>} aiSafetyServiceStatuses  keyed by serviceId → status object
   * @returns {Readonly<object>}
   */
  auditAiSafetyAlignment(aiSafetyServiceStatuses = {}) {
    const report  = this.#aiSafetyValidator.getAuditReport(aiSafetyServiceStatuses);
    const aligned = report.phaseDComplete === true && report.totalViolations === 0;
    return Object.freeze({
      result:          aligned ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL,
      phaseDComplete:  report.phaseDComplete,
      totalViolations: report.totalViolations,
      coveredServices: report.coveredServices,
      missingServices: report.missingServices,
    });
  }

  // ── Full Audit Report (Founder-facing) ────────────────────────────────────

  /**
   * Run the full Research Platform Audit and generate the Founder-facing report.
   * phaseFComplete = true only when BD-021 / BD-030 / BD-036 / BD-037 / BD-039 all PASS.
   *
   * @param {{
   *   clusterProfiles?:         Record<string, object>,
   *   aiSafetyServiceStatuses?: Object<string, object>,
   * }} input
   * @returns {Readonly<object>} ResearchPlatformAuditReport
   */
  auditPlatform({ clusterProfiles = {}, aiSafetyServiceStatuses = {} } = {}) {
    const bd021    = this.auditDatasetAttribution();
    const bd030036 = this.auditKAnonymity(clusterProfiles);
    const bd037    = this.auditKnowledgeGraphAppendOnly();
    const bd039    = this.auditAiSafetyAlignment(aiSafetyServiceStatuses);

    const allPass = [bd021, bd030036, bd037, bd039].every(c => c.result === AUDIT_RESULT.PASS);

    const report = Object.freeze({
      result:         allPass ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL,
      phaseFComplete: allPass,
      schemaVersion:  RESEARCH_PLATFORM_AUDIT_SCHEMA_VERSION,
      auditedBDs:     AUDITED_BD_LIST,
      bd021,
      bd030_036: bd030036,
      bd037,
      bd039,
      generatedAt: new Date().toISOString(), // BD-018
      bd021Note: 'BD-021: Research Dataset作成・公開はFounder承認 + k-anonymity(k>=5)',
      bd030Note: 'BD-030: Research Dataset利用者の個人特定試行はZERO TOLERANCE',
      bd036Note: `BD-036: Disease Cluster統計はk>=${DISEASE_CLUSTER_TARGET_K}目標、k>=${K_ANONYMITY_MIN}未満は公開しない`,
      bd037Note: 'BD-037: Knowledge GraphノードはAppend-Only（削除禁止）',
      bd039Note: 'BD-039: AISafetyValidatorは全AI出力の必須ゲートキーパー',
    });

    this.#publish(report);
    return report;
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:         true,
      schemaVersion: RESEARCH_PLATFORM_AUDIT_SCHEMA_VERSION,
      auditedBDs:    AUDITED_BD_LIST,
      kAnonymityMin: K_ANONYMITY_MIN,
      clusterTargetK: DISEASE_CLUSTER_TARGET_K,
      bd021: 'Founder attribution (createdBy) required on every published DatasetVersion',
      bd030: 'k-anonymity ZERO TOLERANCE re-verified across all clusters/cohorts (k>=5)',
      bd036: `Disease Cluster target k>=${DISEASE_CLUSTER_TARGET_K}, hard minimum k>=${K_ANONYMITY_MIN}`,
      bd037: 'Knowledge Graph Append-Only structurally verified (deleteNode/deleteEdge always throw)',
      bd039: 'AI Safety Layer (PR-062) phaseDComplete + zero accumulated violations required',
    });
  }

  // ── Internal ────────────────────────────────────────────────────────────

  #publish(report) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.RESEARCH_PLATFORM_AUDIT_COMPLETED,
        aggregateType: AGGREGATE_TYPES.RESEARCH_PLATFORM_AUDIT,
        aggregateId:   'research-platform-audit',
        payload:       Object.freeze({
          result:         report.result,
          phaseFComplete: report.phaseFComplete,
          generatedAt:    report.generatedAt,
        }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort.
    }
  }
}
