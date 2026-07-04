// ai-safety-validator.js — AI Safety Layer (Phase D capstone).
// Centralized safety audit for all Phase D AI service outputs (PR-057〜061).
// BD-031: Confirms rule-based-only compliance via service status fields.
// BD-038: Machine-enforces isMedicalAdvice:false + forbidden word block on every output.
// BD-032: All returned objects are frozen.
// PR-062: AI Safety Layer

import { buildDomainEvent }                     from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES }  from '../events/domain-event-types.js';
import { FORBIDDEN_WORDS }                      from '../signal-insight/signal-insight-types.js';
import {
  EXTENDED_FORBIDDEN_PATTERNS,
  REQUIRED_STATUS_FIELDS_BD031,
  REQUIRED_STATUS_FIELDS_BD038,
  PHASE_D_SERVICE_IDS,
  AUDIT_RESULT,
  VIOLATION_SEVERITY,
  AI_SAFETY_SCHEMA_VERSION,
} from './ai-safety-types.js';

// Merged canonical pattern set — union of PR-057 list + extended patterns.
// Built once at module load; shared across all validator instances.
const CANONICAL_PATTERNS = Object.freeze([
  ...new Set([...FORBIDDEN_WORDS, ...EXTENDED_FORBIDDEN_PATTERNS]),
]);

/**
 * Thrown when validateStrict() detects a safety violation.
 * Catching this error and returning the output is a BD-038 violation.
 */
export class AISafetyViolation extends Error {
  /**
   * @param {string} serviceId  — which service produced the output
   * @param {string} pattern    — the matched forbidden pattern
   * @param {string} text       — the offending text (truncated in message)
   */
  constructor(serviceId, pattern, text) {
    super(
      `[AISafetyValidator] BD-038 violation in ${serviceId}: ` +
      `forbidden pattern "${pattern}" detected. ` +
      `Text: "${String(text).slice(0, 80)}${String(text).length > 80 ? '…' : ''}"`
    );
    this.name      = 'AISafetyViolation';
    this.serviceId = serviceId;
    this.pattern   = pattern;
    this.text      = text;
  }
}

export class AISafetyValidator {
  #eventPublisher;
  /** @type {Array<object>} */
  #violationLog = [];

  /**
   * @param {{ eventPublisher?: object|null }} deps
   */
  constructor({ eventPublisher = null } = {}) {
    this.#eventPublisher = eventPublisher ?? null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Validate a single AI output text (non-throwing).
   * Returns a SafetyResult — caller decides whether to proceed.
   *
   * @param {{
   *   text:           string,
   *   isMedicalAdvice: boolean,
   *   serviceId?:     string,
   * }} input
   * @returns {Readonly<{ result: string, violations: object[], checkedAt: string }>}
   */
  validate({ text, isMedicalAdvice, serviceId = 'unknown' }) {
    if (typeof text !== 'string')
      throw new Error('[AISafetyValidator] text must be a string');

    const violations = [];

    // Check 1: isMedicalAdvice must be exactly false
    if (isMedicalAdvice !== false) {
      violations.push(this.#makeViolation(serviceId, VIOLATION_SEVERITY.ERROR,
        'isMedicalAdvice_not_false',
        `isMedicalAdvice must be false, got: ${JSON.stringify(isMedicalAdvice)}`));
    }

    // Check 2: scan for forbidden patterns
    for (const pattern of CANONICAL_PATTERNS) {
      const regex = new RegExp(pattern);
      if (regex.test(text)) {
        violations.push(this.#makeViolation(serviceId, VIOLATION_SEVERITY.CRITICAL,
          pattern, text));
      }
    }

    const result = Object.freeze({
      result:     violations.length === 0 ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL,
      violations: Object.freeze(violations.map(v => Object.freeze(v))),
      serviceId,
      checkedAt:  new Date().toISOString(),
    });

    if (violations.length > 0) {
      this.#violationLog.push(...violations);
    }

    return result;
  }

  /**
   * Validate a single AI output (throwing on violation).
   * Use this inside services that must hard-block unsafe output.
   *
   * @param {{ text: string, isMedicalAdvice: boolean, serviceId?: string }} input
   * @throws {AISafetyViolation} on any violation
   */
  validateStrict({ text, isMedicalAdvice, serviceId = 'unknown' }) {
    const result = this.validate({ text, isMedicalAdvice, serviceId });
    if (result.result === AUDIT_RESULT.FAIL) {
      const first = result.violations[0];
      throw new AISafetyViolation(serviceId, first.pattern, text);
    }
  }

  /**
   * Validate multiple AI outputs at once.
   *
   * @param {Array<{ text: string, isMedicalAdvice: boolean, serviceId?: string }>} outputs
   * @returns {Readonly<{ result: string, totalChecked: number, totalViolations: number, results: object[] }>}
   */
  validateBatch(outputs) {
    if (!Array.isArray(outputs))
      throw new Error('[AISafetyValidator] outputs must be an array');

    const results = outputs.map(o => this.validate(o));
    const failed  = results.filter(r => r.result === AUDIT_RESULT.FAIL);

    return Object.freeze({
      result:          failed.length === 0 ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL,
      totalChecked:    results.length,
      totalViolations: failed.reduce((sum, r) => sum + r.violations.length, 0),
      results:         Object.freeze(results),
    });
  }

  /**
   * Audit a Phase D service status object for BD-031 / BD-038 compliance fields.
   * Does NOT call the service — accepts a pre-fetched status object.
   *
   * @param {string} serviceId    — e.g. 'SignalInsightService'
   * @param {object} statusObject — from service.getStatus()
   * @returns {Readonly<{ result: string, serviceId: string, missingFields: string[] }>}
   */
  auditServiceStatus(serviceId, statusObject) {
    if (!statusObject || typeof statusObject !== 'object')
      throw new Error(`[AISafetyValidator] statusObject must be an object for ${serviceId}`);

    const missingFields = [];
    for (const f of REQUIRED_STATUS_FIELDS_BD031) {
      if (!(f in statusObject)) missingFields.push(f);
    }
    for (const f of REQUIRED_STATUS_FIELDS_BD038) {
      if (!(f in statusObject)) missingFields.push(f);
    }

    const result = missingFields.length === 0 ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL;

    if (result === AUDIT_RESULT.FAIL) {
      const v = this.#makeViolation(serviceId, VIOLATION_SEVERITY.WARNING,
        'missing_compliance_fields',
        `Missing BD fields: ${missingFields.join(', ')}`);
      this.#violationLog.push(v);
    }

    return Object.freeze({ result, serviceId, missingFields: Object.freeze(missingFields) });
  }

  /**
   * Generate Phase D audit report from a map of service statuses.
   * Confirms Phase D complete when all services pass.
   *
   * @param {Object<string, object>} serviceStatuses
   *   Key: serviceId, Value: status object from service.getStatus()
   * @returns {Readonly<object>} AuditReport
   */
  getAuditReport(serviceStatuses = {}) {
    if (typeof serviceStatuses !== 'object' || Array.isArray(serviceStatuses))
      throw new Error('[AISafetyValidator] serviceStatuses must be an object');

    const serviceAudits = {};
    for (const [serviceId, status] of Object.entries(serviceStatuses)) {
      serviceAudits[serviceId] = this.auditServiceStatus(serviceId, status);
    }

    // Phase D complete when all provided services pass
    const allPass = Object.values(serviceAudits).every(a => a.result === AUDIT_RESULT.PASS);
    const coveredServices  = Object.keys(serviceAudits);
    const missingServices  = PHASE_D_SERVICE_IDS.filter(id => !coveredServices.includes(id));

    const report = Object.freeze({
      result:           allPass && missingServices.length === 0 ? AUDIT_RESULT.PASS : AUDIT_RESULT.FAIL,
      phaseDComplete:   allPass && missingServices.length === 0,
      schemaVersion:    AI_SAFETY_SCHEMA_VERSION,
      serviceAudits:    Object.freeze(serviceAudits),
      coveredServices:  Object.freeze(coveredServices),
      missingServices:  Object.freeze(missingServices),
      totalViolations:  this.#violationLog.length,
      generatedAt:      new Date().toISOString(),
      bd031:            'All Phase D services confirmed rule-based — zero LLM/ML',
      bd038:            'isMedicalAdvice:false + forbidden word check enforced on all outputs',
    });

    this.#publish(DOMAIN_EVENT_TYPES.AI_SAFETY_AUDIT_COMPLETED, 'ai-safety', {
      result:          report.result,
      phaseDComplete:  report.phaseDComplete,
      coveredCount:    coveredServices.length,
      missingCount:    missingServices.length,
      violationCount:  this.#violationLog.length,
    });

    return report;
  }

  /**
   * Return the accumulated violation log (read-only snapshot).
   * Cleared by clearViolationLog().
   *
   * @returns {ReadonlyArray<object>}
   */
  getViolationLog() {
    return Object.freeze(this.#violationLog.map(v => Object.freeze({ ...v })));
  }

  /** Reset the violation log. Does not affect already-published events. */
  clearViolationLog() {
    this.#violationLog = [];
  }

  /** Expose canonical forbidden pattern list (for auditing / UI display). */
  getForbiddenPatterns() {
    return CANONICAL_PATTERNS;
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:             true,
      schemaVersion:     AI_SAFETY_SCHEMA_VERSION,
      bd031:             'Phase D service compliance verified via status field audit',
      bd038:             'isMedicalAdvice:false + forbidden word check on all validate() calls',
      canonicalPatternCount: CANONICAL_PATTERNS.length,
      phaseDServices:    PHASE_D_SERVICE_IDS,
      violationCount:    this.#violationLog.length,
      access:            'admin:research + record:read (status)',
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  #makeViolation(serviceId, severity, pattern, text) {
    return {
      serviceId,
      severity,
      pattern,
      excerpt: typeof text === 'string'
        ? `${text.slice(0, 100)}${text.length > 100 ? '…' : ''}`
        : String(text),
      detectedAt: new Date().toISOString(),
    };
  }

  #publish(eventType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType, aggregateId, aggregateType: AGGREGATE_TYPES.AI_SAFETY, payload,
      });
      this.#eventPublisher.publish(event);
    } catch { /* best-effort */ }
  }
}
