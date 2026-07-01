// tests/ai-safety/ai-safety-validator.test.js
// PR-062: AI Safety Layer — BD-031 / BD-038 / Phase D capstone
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AISafetyValidator,
  AISafetyViolation,
} from '../../src/domains/ai-safety/ai-safety-validator.js';
import {
  AUDIT_RESULT,
  VIOLATION_SEVERITY,
  PHASE_D_SERVICE_IDS,
  AI_SAFETY_SCHEMA_VERSION,
} from '../../src/domains/ai-safety/ai-safety-types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SAFE_TEXT    = '痛みが先週より低下傾向にあります。これは医療アドバイスではありません。';
const DIAGNOSE_TEXT = 'あなたは子宮内膜症病です。今すぐ治療してください。';
const CAUSAL_TEXT   = '月経痛の原因です。';
const URGENT_TEXT   = '緊急の対応が必要です。';
const TREATMENT_TEXT = '薬を飲んでください。';

/** All 5 Phase D service status objects with required BD fields. */
const COMPLIANT_STATUSES = Object.fromEntries(
  PHASE_D_SERVICE_IDS.map(id => [
    id,
    Object.freeze({ ready: true, bd031: 'rule-based only', bd038: 'isMedicalAdvice:false enforced', access: 'admin:research' }),
  ])
);

function makeValidator(deps = {}) {
  return new AISafetyValidator(deps);
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('AISafetyValidator', () => {

  // ── Construction ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('instantiates without deps', () => {
      expect(() => new AISafetyValidator()).not.toThrow();
    });

    it('accepts eventPublisher', () => {
      expect(() => new AISafetyValidator({ eventPublisher: { publish: vi.fn() } })).not.toThrow();
    });
  });

  // ── getStatus ─────────────────────────────────────────────────────────────

  describe('getStatus()', () => {
    it('returns frozen object', () => {
      const v = makeValidator();
      expect(Object.isFrozen(v.getStatus())).toBe(true);
    });

    it('exposes bd031 and bd038 fields', () => {
      const v = makeValidator();
      const st = v.getStatus();
      expect(st.bd031).toBeDefined();
      expect(st.bd038).toBeDefined();
    });

    it('exposes phaseDServices list', () => {
      const v = makeValidator();
      expect(v.getStatus().phaseDServices).toEqual(PHASE_D_SERVICE_IDS);
    });

    it('exposes canonicalPatternCount > 0', () => {
      const v = makeValidator();
      expect(v.getStatus().canonicalPatternCount).toBeGreaterThan(0);
    });
  });

  // ── getForbiddenPatterns ───────────────────────────────────────────────────

  describe('getForbiddenPatterns()', () => {
    it('returns frozen array', () => {
      const v = makeValidator();
      expect(Object.isFrozen(v.getForbiddenPatterns())).toBe(true);
    });

    it('includes core forbidden words from PR-057', () => {
      const v = makeValidator();
      const patterns = v.getForbiddenPatterns();
      expect(patterns).toContain('飲んでください');
      expect(patterns).toContain('緊急');
    });

    it('includes extended patterns from PR-062', () => {
      const v = makeValidator();
      const patterns = v.getForbiddenPatterns();
      expect(patterns).toContain('命に関わる');
      expect(patterns).toContain('完治します');
    });

    it('has no duplicate patterns', () => {
      const v = makeValidator();
      const patterns = v.getForbiddenPatterns();
      const unique = new Set(patterns);
      expect(unique.size).toBe(patterns.length);
    });
  });

  // ── validate() ────────────────────────────────────────────────────────────

  describe('validate()', () => {
    it('throws when text is not a string', () => {
      const v = makeValidator();
      expect(() => v.validate({ text: null, isMedicalAdvice: false }))
        .toThrow('text must be a string');
    });

    it('returns frozen result', () => {
      const v = makeValidator();
      const r = v.validate({ text: SAFE_TEXT, isMedicalAdvice: false });
      expect(Object.isFrozen(r)).toBe(true);
    });

    it('PASS for safe text with isMedicalAdvice:false', () => {
      const v = makeValidator();
      const r = v.validate({ text: SAFE_TEXT, isMedicalAdvice: false });
      expect(r.result).toBe(AUDIT_RESULT.PASS);
      expect(r.violations).toHaveLength(0);
    });

    it('FAIL when isMedicalAdvice is true', () => {
      const v = makeValidator();
      const r = v.validate({ text: SAFE_TEXT, isMedicalAdvice: true });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
      expect(r.violations.length).toBeGreaterThan(0);
    });

    it('FAIL when isMedicalAdvice is not boolean false (undefined)', () => {
      const v = makeValidator();
      const r = v.validate({ text: SAFE_TEXT, isMedicalAdvice: undefined });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
    });

    it('result has checkedAt ISO string', () => {
      const v = makeValidator();
      const r = v.validate({ text: SAFE_TEXT, isMedicalAdvice: false });
      expect(r.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('result has serviceId', () => {
      const v = makeValidator();
      const r = v.validate({ text: SAFE_TEXT, isMedicalAdvice: false, serviceId: 'TestService' });
      expect(r.serviceId).toBe('TestService');
    });

    it('violations array is frozen', () => {
      const v = makeValidator();
      const r = v.validate({ text: DIAGNOSE_TEXT, isMedicalAdvice: false });
      expect(Object.isFrozen(r.violations)).toBe(true);
    });
  });

  // ── 完了条件②: 禁止ワード含む出力がブロックされる ────────────────────────

  describe('Completion Condition ②: forbidden words detected and blocked', () => {
    it('FAIL for text containing 診断系 "〜病です" (tilde prefix pattern)', () => {
      const v = makeValidator();
      const r = v.validate({ text: 'あなたは〜病ですか', isMedicalAdvice: false });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
    });

    it('FAIL for text containing 治療指示 "飲んでください"', () => {
      const v = makeValidator();
      const r = v.validate({ text: TREATMENT_TEXT, isMedicalAdvice: false });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
    });

    it('FAIL for text containing 緊急度 "緊急"', () => {
      const v = makeValidator();
      const r = v.validate({ text: URGENT_TEXT, isMedicalAdvice: false });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
    });

    it('FAIL for text containing 因果断定 "の原因です"', () => {
      const v = makeValidator();
      const r = v.validate({ text: CAUSAL_TEXT, isMedicalAdvice: false });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
    });

    it('FAIL for text containing extended pattern "完治します"', () => {
      const v = makeValidator();
      const r = v.validate({ text: '安静にすれば完治します', isMedicalAdvice: false });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
    });

    it('FAIL for text containing extended pattern "命に関わる"', () => {
      const v = makeValidator();
      const r = v.validate({ text: 'これは命に関わる症状です', isMedicalAdvice: false });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
    });

    it('FAIL for text containing "今すぐ病院"', () => {
      const v = makeValidator();
      const r = v.validate({ text: '今すぐ病院に行ってください', isMedicalAdvice: false });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
    });

    it('FAIL for text containing "処方"', () => {
      const v = makeValidator();
      const r = v.validate({ text: '医師に処方してもらってください', isMedicalAdvice: false });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
    });

    it('each violation entry has severity, pattern, excerpt', () => {
      const v = makeValidator();
      const r = v.validate({ text: DIAGNOSE_TEXT, isMedicalAdvice: false });
      for (const viol of r.violations) {
        expect(viol.severity).toBeDefined();
        expect(viol.pattern).toBeDefined();
        expect(viol.excerpt).toBeDefined();
      }
    });

    it('CRITICAL severity for forbidden word match', () => {
      const v = makeValidator();
      const r = v.validate({ text: TREATMENT_TEXT, isMedicalAdvice: false });
      const critical = r.violations.find(viol => viol.severity === VIOLATION_SEVERITY.CRITICAL);
      expect(critical).toBeDefined();
    });
  });

  // ── validateStrict() ──────────────────────────────────────────────────────

  describe('validateStrict()', () => {
    it('does not throw for safe text', () => {
      const v = makeValidator();
      expect(() => v.validateStrict({ text: SAFE_TEXT, isMedicalAdvice: false })).not.toThrow();
    });

    it('throws AISafetyViolation for forbidden text', () => {
      const v = makeValidator();
      expect(() => v.validateStrict({ text: TREATMENT_TEXT, isMedicalAdvice: false }))
        .toThrow(AISafetyViolation);
    });

    it('AISafetyViolation has serviceId and pattern', () => {
      const v = makeValidator();
      try {
        v.validateStrict({ text: TREATMENT_TEXT, isMedicalAdvice: false, serviceId: 'MyService' });
      } catch (e) {
        expect(e.serviceId).toBe('MyService');
        expect(e.pattern).toBeDefined();
        expect(e.name).toBe('AISafetyViolation');
      }
    });

    it('throws AISafetyViolation when isMedicalAdvice is true', () => {
      const v = makeValidator();
      expect(() => v.validateStrict({ text: SAFE_TEXT, isMedicalAdvice: true }))
        .toThrow(AISafetyViolation);
    });
  });

  // ── validateBatch() ───────────────────────────────────────────────────────

  describe('validateBatch()', () => {
    it('throws when outputs is not array', () => {
      const v = makeValidator();
      expect(() => v.validateBatch('bad')).toThrow('outputs must be an array');
    });

    it('returns frozen result', () => {
      const v = makeValidator();
      const r = v.validateBatch([{ text: SAFE_TEXT, isMedicalAdvice: false }]);
      expect(Object.isFrozen(r)).toBe(true);
    });

    it('PASS when all outputs are safe', () => {
      const v = makeValidator();
      const r = v.validateBatch([
        { text: SAFE_TEXT, isMedicalAdvice: false, serviceId: 'A' },
        { text: SAFE_TEXT, isMedicalAdvice: false, serviceId: 'B' },
      ]);
      expect(r.result).toBe(AUDIT_RESULT.PASS);
      expect(r.totalViolations).toBe(0);
    });

    it('FAIL when any output contains forbidden word', () => {
      const v = makeValidator();
      const r = v.validateBatch([
        { text: SAFE_TEXT,     isMedicalAdvice: false },
        { text: DIAGNOSE_TEXT, isMedicalAdvice: false },
      ]);
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
      expect(r.totalViolations).toBeGreaterThan(0);
    });

    it('totalChecked matches input length', () => {
      const v = makeValidator();
      const r = v.validateBatch([
        { text: SAFE_TEXT, isMedicalAdvice: false },
        { text: SAFE_TEXT, isMedicalAdvice: false },
        { text: SAFE_TEXT, isMedicalAdvice: false },
      ]);
      expect(r.totalChecked).toBe(3);
    });

    it('results array is frozen', () => {
      const v = makeValidator();
      const r = v.validateBatch([{ text: SAFE_TEXT, isMedicalAdvice: false }]);
      expect(Object.isFrozen(r.results)).toBe(true);
    });

    it('empty batch returns PASS', () => {
      const v = makeValidator();
      const r = v.validateBatch([]);
      expect(r.result).toBe(AUDIT_RESULT.PASS);
      expect(r.totalChecked).toBe(0);
    });
  });

  // ── auditServiceStatus() ──────────────────────────────────────────────────

  describe('auditServiceStatus()', () => {
    it('throws when statusObject is not an object', () => {
      const v = makeValidator();
      expect(() => v.auditServiceStatus('Svc', null)).toThrow();
    });

    it('PASS when status has bd031 and bd038 fields', () => {
      const v = makeValidator();
      const r = v.auditServiceStatus('SignalInsightService', {
        bd031: 'rule-based', bd038: 'isMedicalAdvice:false', ready: true,
      });
      expect(r.result).toBe(AUDIT_RESULT.PASS);
      expect(r.missingFields).toHaveLength(0);
    });

    it('FAIL when bd038 is missing', () => {
      const v = makeValidator();
      const r = v.auditServiceStatus('MyService', { bd031: 'ok', ready: true });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
      expect(r.missingFields).toContain('bd038');
    });

    it('FAIL when bd031 is missing', () => {
      const v = makeValidator();
      const r = v.auditServiceStatus('MyService', { bd038: 'ok', ready: true });
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
      expect(r.missingFields).toContain('bd031');
    });

    it('result is frozen', () => {
      const v = makeValidator();
      const r = v.auditServiceStatus('Svc', { bd031: 'ok', bd038: 'ok' });
      expect(Object.isFrozen(r)).toBe(true);
    });

    it('result has serviceId', () => {
      const v = makeValidator();
      const r = v.auditServiceStatus('ResearchAssistanceService', { bd031: 'ok', bd038: 'ok' });
      expect(r.serviceId).toBe('ResearchAssistanceService');
    });
  });

  // ── 完了条件①③: getAuditReport() — 全 AI 出力 AISafetyValidator を通過 / Phase D 完了 ──

  describe('getAuditReport()', () => {
    it('throws when serviceStatuses is not an object', () => {
      const v = makeValidator();
      expect(() => v.getAuditReport(['bad'])).toThrow();
    });

    it('returns frozen report', () => {
      const v = makeValidator();
      const r = v.getAuditReport(COMPLIANT_STATUSES);
      expect(Object.isFrozen(r)).toBe(true);
    });

    it('phaseDComplete:true when all 5 Phase D services pass', () => {
      const v = makeValidator();
      const r = v.getAuditReport(COMPLIANT_STATUSES);
      expect(r.phaseDComplete).toBe(true);
      expect(r.result).toBe(AUDIT_RESULT.PASS);
    });

    it('phaseDComplete:false when some services are missing', () => {
      const v = makeValidator();
      const partial = { SignalInsightService: COMPLIANT_STATUSES.SignalInsightService };
      const r = v.getAuditReport(partial);
      expect(r.phaseDComplete).toBe(false);
    });

    it('phaseDComplete:false when any service fails compliance', () => {
      const v = makeValidator();
      const broken = {
        ...COMPLIANT_STATUSES,
        SignalInsightService: { ready: true }, // missing bd031 / bd038
      };
      const r = v.getAuditReport(broken);
      expect(r.phaseDComplete).toBe(false);
      expect(r.result).toBe(AUDIT_RESULT.FAIL);
    });

    it('report has schemaVersion', () => {
      const v = makeValidator();
      const r = v.getAuditReport(COMPLIANT_STATUSES);
      expect(r.schemaVersion).toBe(AI_SAFETY_SCHEMA_VERSION);
    });

    it('report has generatedAt ISO string', () => {
      const v = makeValidator();
      const r = v.getAuditReport(COMPLIANT_STATUSES);
      expect(r.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('report has coveredServices and missingServices', () => {
      const v = makeValidator();
      const r = v.getAuditReport(COMPLIANT_STATUSES);
      expect(r.coveredServices).toHaveLength(PHASE_D_SERVICE_IDS.length);
      expect(r.missingServices).toHaveLength(0);
    });

    it('report has bd031 and bd038 summary fields', () => {
      const v = makeValidator();
      const r = v.getAuditReport(COMPLIANT_STATUSES);
      expect(r.bd031).toBeDefined();
      expect(r.bd038).toBeDefined();
    });

    it('empty serviceStatuses → phaseDComplete:false', () => {
      const v = makeValidator();
      const r = v.getAuditReport({});
      expect(r.phaseDComplete).toBe(false);
    });

    it('serviceAudits contains an entry per provided service', () => {
      const v = makeValidator();
      const r = v.getAuditReport(COMPLIANT_STATUSES);
      expect(Object.keys(r.serviceAudits)).toHaveLength(PHASE_D_SERVICE_IDS.length);
    });
  });

  // ── Violation log ─────────────────────────────────────────────────────────

  describe('violation log', () => {
    it('getViolationLog() returns frozen array', () => {
      const v = makeValidator();
      expect(Object.isFrozen(v.getViolationLog())).toBe(true);
    });

    it('empty log initially', () => {
      const v = makeValidator();
      expect(v.getViolationLog()).toHaveLength(0);
    });

    it('violations accumulate across validate() calls', () => {
      const v = makeValidator();
      v.validate({ text: TREATMENT_TEXT, isMedicalAdvice: false });
      v.validate({ text: CAUSAL_TEXT,    isMedicalAdvice: false });
      expect(v.getViolationLog().length).toBeGreaterThan(0);
    });

    it('clearViolationLog() resets the log', () => {
      const v = makeValidator();
      v.validate({ text: TREATMENT_TEXT, isMedicalAdvice: false });
      expect(v.getViolationLog().length).toBeGreaterThan(0);
      v.clearViolationLog();
      expect(v.getViolationLog()).toHaveLength(0);
    });

    it('getViolationLog() returns copies (not references)', () => {
      const v = makeValidator();
      v.validate({ text: CAUSAL_TEXT, isMedicalAdvice: false });
      const log1 = v.getViolationLog();
      const log2 = v.getViolationLog();
      expect(log1).not.toBe(log2);
    });
  });

  // ── Event publishing ───────────────────────────────────────────────────────

  describe('event publishing', () => {
    it('publishes AI_SAFETY_AUDIT_COMPLETED on getAuditReport()', () => {
      const publish = vi.fn();
      const v = makeValidator({ eventPublisher: { publish } });
      v.getAuditReport(COMPLIANT_STATUSES);
      expect(publish).toHaveBeenCalledTimes(1);
      const event = publish.mock.calls[0][0];
      expect(event.eventType).toBe('AI_SAFETY_AUDIT_COMPLETED');
      expect(event.aggregateType).toBe('AI_SAFETY');
    });

    it('payload includes phaseDComplete and violationCount', () => {
      const publish = vi.fn();
      const v = makeValidator({ eventPublisher: { publish } });
      v.getAuditReport(COMPLIANT_STATUSES);
      const payload = publish.mock.calls[0][0].payload;
      expect(typeof payload.phaseDComplete).toBe('boolean');
      expect(typeof payload.violationCount).toBe('number');
    });

    it('publish failure does not propagate', () => {
      const v = makeValidator({ eventPublisher: { publish: () => { throw new Error('bus down'); } } });
      expect(() => v.getAuditReport(COMPLIANT_STATUSES)).not.toThrow();
    });

    it('works without eventPublisher', () => {
      const v = makeValidator();
      expect(() => v.getAuditReport(COMPLIANT_STATUSES)).not.toThrow();
    });
  });

  // ── BD-031: rule-based only ────────────────────────────────────────────────

  describe('BD-031 compliance', () => {
    it('getStatus reports bd031 field', () => {
      expect(makeValidator().getStatus().bd031).toBeDefined();
    });

    it('validate() is deterministic for same input', () => {
      const v = makeValidator();
      const r1 = v.validate({ text: SAFE_TEXT, isMedicalAdvice: false });
      const r2 = v.validate({ text: SAFE_TEXT, isMedicalAdvice: false });
      expect(r1.result).toBe(r2.result);
    });
  });

  // ── Integration: Phase D services comply ──────────────────────────────────

  describe('Integration: Phase D service status compliance', () => {
    it('SignalInsightService status passes audit', async () => {
      const { SignalInsightService } = await import('../../src/domains/signal-insight/signal-insight-service.js');
      const svc = new SignalInsightService({ featureStoreService: { compute: () => ({}) } });
      const status = svc.getStatus();
      const v = makeValidator();
      const r = v.auditServiceStatus('SignalInsightService', status);
      expect(r.result).toBe(AUDIT_RESULT.PASS);
    });

    it('PatternDiscoveryService status passes audit', async () => {
      const { PatternDiscoveryService } = await import('../../src/domains/pattern-discovery/pattern-discovery-service.js');
      const svc = new PatternDiscoveryService();
      const status = svc.getStatus();
      const v = makeValidator();
      const r = v.auditServiceStatus('PatternDiscoveryService', status);
      expect(r.result).toBe(AUDIT_RESULT.PASS);
    });

    it('CaseRecommendationService status passes audit', async () => {
      const { CaseRecommendationService } = await import('../../src/domains/case-recommendation/case-recommendation-service.js');
      const svc = new CaseRecommendationService();
      const status = svc.getStatus();
      const v = makeValidator();
      const r = v.auditServiceStatus('CaseRecommendationService', status);
      expect(r.result).toBe(AUDIT_RESULT.PASS);
    });

    it('SimilarCaseSearchService status passes audit', async () => {
      const { SimilarCaseSearchService } = await import('../../src/domains/similar-case-search/similar-case-search-service.js');
      const svc = new SimilarCaseSearchService();
      const status = svc.getStatus();
      const v = makeValidator();
      const r = v.auditServiceStatus('SimilarCaseSearchService', status);
      expect(r.result).toBe(AUDIT_RESULT.PASS);
    });

    it('ResearchAssistanceService status passes audit', async () => {
      const { ResearchAssistanceService } = await import('../../src/domains/research-assistance/research-assistance-service.js');
      const svc = new ResearchAssistanceService();
      const status = svc.getStatus();
      const v = makeValidator();
      const r = v.auditServiceStatus('ResearchAssistanceService', status);
      expect(r.result).toBe(AUDIT_RESULT.PASS);
    });

    it('all 5 Phase D services together → phaseDComplete:true', async () => {
      const { SignalInsightService }      = await import('../../src/domains/signal-insight/signal-insight-service.js');
      const { PatternDiscoveryService }   = await import('../../src/domains/pattern-discovery/pattern-discovery-service.js');
      const { CaseRecommendationService } = await import('../../src/domains/case-recommendation/case-recommendation-service.js');
      const { SimilarCaseSearchService }  = await import('../../src/domains/similar-case-search/similar-case-search-service.js');
      const { ResearchAssistanceService } = await import('../../src/domains/research-assistance/research-assistance-service.js');

      const statuses = {
        SignalInsightService:      new SignalInsightService({ featureStoreService: { compute: () => ({}) } }).getStatus(),
        PatternDiscoveryService:   new PatternDiscoveryService().getStatus(),
        CaseRecommendationService: new CaseRecommendationService().getStatus(),
        SimilarCaseSearchService:  new SimilarCaseSearchService().getStatus(),
        ResearchAssistanceService: new ResearchAssistanceService().getStatus(),
      };

      const v = makeValidator();
      const report = v.getAuditReport(statuses);
      expect(report.phaseDComplete).toBe(true);
      expect(report.result).toBe(AUDIT_RESULT.PASS);
    });
  });
});
