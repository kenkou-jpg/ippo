// research-platform-audit-types.js — SSOT for Research Platform Audit.
// Wave2 Roadmap PR-072 (Phase F capstone).
// Audited Binding Decisions: BD-021 / BD-030 / BD-036 / BD-037 / BD-039.

/** k-anonymity hard minimum — below this, publication is ZERO TOLERANCE forbidden (BD-030). */
export const K_ANONYMITY_MIN = 5;

/** Disease Cluster statistics target k (BD-036) — informational, not blocking. */
export const DISEASE_CLUSTER_TARGET_K = 50;

/** Schema version for ResearchPlatformAuditReport. */
export const RESEARCH_PLATFORM_AUDIT_SCHEMA_VERSION = '1';

/** Audit result values. */
export const AUDIT_RESULT = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
});

/** Binding Decisions covered by this audit (Wave2 Roadmap PR-072 責務①). */
export const AUDITED_BD_LIST = Object.freeze(['BD-021', 'BD-030', 'BD-036', 'BD-037', 'BD-039']);
