import { EVENTS } from "../../shared/events";
import type { ID, Timestamp } from "../../shared/types/base";
import type { ConsentLevel } from "../../policies";

export interface ConsentGrantedPayload {
  userId: ID;
  level: ConsentLevel;
  timestamp: Timestamp;
}

export interface ConsentUpdatedPayload {
  userId: ID;
  previousLevel: ConsentLevel;
  newLevel: ConsentLevel;
  timestamp: Timestamp;
}

export interface ConsentRevokedPayload {
  userId: ID;
  previousLevel: ConsentLevel;
  timestamp: Timestamp;
}

export interface ConsentViolationBlockedPayload {
  userId: ID;
  category: string;
  requiredLevel: ConsentLevel;
  currentLevel: ConsentLevel;
  timestamp: Timestamp;
}

export interface ConsentDomainEvent<P = unknown> {
  type: string;
  payload: P;
}

export function buildConsentGrantedEvent(
  payload: ConsentGrantedPayload,
): ConsentDomainEvent<ConsentGrantedPayload> {
  return { type: EVENTS.CONSENT_GRANTED, payload };
}

export function buildConsentUpdatedEvent(
  payload: ConsentUpdatedPayload,
): ConsentDomainEvent<ConsentUpdatedPayload> {
  return { type: EVENTS.CONSENT_UPDATED, payload };
}

export function buildConsentRevokedEvent(
  payload: ConsentRevokedPayload,
): ConsentDomainEvent<ConsentRevokedPayload> {
  return { type: EVENTS.CONSENT_REVOKED, payload };
}

export function buildConsentViolationBlockedEvent(
  payload: ConsentViolationBlockedPayload,
): ConsentDomainEvent<ConsentViolationBlockedPayload> {
  return { type: EVENTS.CONSENT_VIOLATION_BLOCKED, payload };
}
