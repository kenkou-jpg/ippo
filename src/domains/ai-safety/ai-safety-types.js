// ai-safety-types.js — SSOT for AI Safety Layer domain.
// BD-031: All AI outputs must be rule-based; LLM zero.
// BD-038: ALL AI outputs must carry isMedicalAdvice:false and pass forbidden word check.
// PR-062: AI Safety Layer (Phase D capstone)

/**
 * Extended forbidden word list for AISafetyValidator.
 * Supersedes signal-insight-types.FORBIDDEN_WORDS — this is the canonical list
 * for all Phase D services (PR-057〜061). Both lists must be kept consistent.
 *
 * Categories: 診断 / 治療指示 / 緊急度 / 因果断定 / 医学的断定
 */
export const EXTENDED_FORBIDDEN_PATTERNS = Object.freeze([
  // ── 診断系 ──────────────────────────────────────────────────────────────
  '〜病です',
  'です（診断）',
  '診断されます',
  'と診断',
  'あなたは.*病',
  '疾患です',
  '症状から.*と考えられます',

  // ── 治療指示系 ───────────────────────────────────────────────────────────
  '飲んでください',
  '服用してください',
  '治療してください',
  '手術',
  '投薬',
  'このサプリ',
  'このサプリを',
  'を飲め',
  'を服用',
  '薬を',
  '処方',

  // ── 緊急度系 ─────────────────────────────────────────────────────────────
  '今すぐ病院',
  'すぐに受診',
  '緊急',
  '危険な状態',
  '重篤',
  '命に関わる',
  '救急',

  // ── 因果断定系 ───────────────────────────────────────────────────────────
  'の原因です',
  'が原因です',
  'のせいです',
  'によって引き起こされ',
  'が引き起こします',
  'が発症させ',

  // ── 医学的断定 ───────────────────────────────────────────────────────────
  'には効果があります',
  'で治ります',
  'が治癒',
  '完治します',
  '治癒率',
]);

/** BD-038 compliance field that every AI service status must expose. */
export const REQUIRED_STATUS_FIELDS_BD038 = Object.freeze(['bd038']);

/** BD-031 compliance field that every AI service status must expose. */
export const REQUIRED_STATUS_FIELDS_BD031 = Object.freeze(['bd031']);

/** Phase D AI service identifiers (PR-057〜061). */
export const PHASE_D_SERVICE_IDS = Object.freeze([
  'SignalInsightService',
  'PatternDiscoveryService',
  'CaseRecommendationService',
  'SimilarCaseSearchService',
  'ResearchAssistanceService',
]);

/** Audit result values. */
export const AUDIT_RESULT = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
});

/** Violation severity levels. */
export const VIOLATION_SEVERITY = Object.freeze({
  CRITICAL: 'CRITICAL', // forbidden word detected in output
  ERROR:    'ERROR',    // isMedicalAdvice not false
  WARNING:  'WARNING',  // compliance field missing from status
});

/** Schema version for AuditReport. */
export const AI_SAFETY_SCHEMA_VERSION = '1';
