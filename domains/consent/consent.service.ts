import type { ID } from "../../shared/types/base";
import type { ConsentLevel } from "../../policies";
import { CONSENT_LEVELS } from "../../policies";
import type { ConsentEntity, ConsentEvent } from "./consent.entity";
import { allowedUsesFor } from "./consent.policy";
import type { ConsentDomainEvent } from "./consent.events";
import {
  buildConsentGrantedEvent,
  buildConsentUpdatedEvent,
  buildConsentRevokedEvent,
} from "./consent.events";

export interface ConsentRepository {
  findByUserId(userId: ID): Promise<ConsentEntity | null>;
  save(consent: ConsentEntity): Promise<ConsentEntity>;
  // Event sourcing — append only
  appendEvent(event: ConsentEvent): Promise<void>;
}

export interface ConsentServiceState {
  entity: ConsentEntity;
  isRevoked: boolean;
  allowedUses: string[];
}

export type ConsentEventEmitter = (event: ConsentDomainEvent) => void;

let _idSeq = 0;
function generateId(): string {
  return `con_${Date.now()}_${++_idSeq}`;
}

function generateEventId(): string {
  return `cevt_${Date.now()}_${++_idSeq}`;
}

export class ConsentService {
  constructor(
    private readonly repo: ConsentRepository,
    private readonly emit: ConsentEventEmitter,
  ) {}

  async grant(userId: ID, level: ConsentLevel): Promise<ConsentServiceState> {
    this.assertValidLevel(level);

    const existing = await this.repo.findByUserId(userId);
    const now = new Date().toISOString();

    if (!existing) {
      // First-time grant
      const entity: ConsentEntity = {
        id: generateId(),
        userId,
        level,
        grantedAt: now,
      };
      const saved = await this.repo.save(entity);

      await this.repo.appendEvent({
        id: generateEventId(),
        userId,
        eventType: "GRANTED",
        fromLevel: 0 as ConsentLevel,
        toLevel: level,
        occurredAt: now,
        payload: {},
      });

      this.emit(buildConsentGrantedEvent({ userId, level, timestamp: now }));
      return this.toState(saved, false);
    }

    // Level update
    const previousLevel = existing.level;
    const updated: ConsentEntity = { ...existing, level, grantedAt: now };
    const saved = await this.repo.save(updated);

    await this.repo.appendEvent({
      id: generateEventId(),
      userId,
      eventType: "GRANTED",
      fromLevel: previousLevel,
      toLevel: level,
      occurredAt: now,
      payload: {},
    });

    this.emit(
      buildConsentUpdatedEvent({ userId, previousLevel, newLevel: level, timestamp: now }),
    );
    return this.toState(saved, false);
  }

  async revoke(userId: ID): Promise<void> {
    const existing = await this.repo.findByUserId(userId);
    if (!existing) throw new Error(`No consent record found for user: ${userId}`);

    const now = new Date().toISOString();
    const previousLevel = existing.level;

    // Downgrade to L0 (self-only) — hard delete is not done; record is kept for audit
    const updated: ConsentEntity = { ...existing, level: 0 as ConsentLevel };
    await this.repo.save(updated);

    await this.repo.appendEvent({
      id: generateEventId(),
      userId,
      eventType: "REVOKED",
      fromLevel: previousLevel,
      toLevel: 0 as ConsentLevel,
      occurredAt: now,
      payload: {},
    });

    this.emit(buildConsentRevokedEvent({ userId, previousLevel, timestamp: now }));
  }

  async getState(userId: ID): Promise<ConsentServiceState | null> {
    const entity = await this.repo.findByUserId(userId);
    if (!entity) return null;
    return this.toState(entity, false);
  }

  private toState(entity: ConsentEntity, isRevoked: boolean): ConsentServiceState {
    return {
      entity,
      isRevoked,
      allowedUses: allowedUsesFor(entity.level),
    };
  }

  private assertValidLevel(level: ConsentLevel): void {
    if (!(CONSENT_LEVELS as readonly number[]).includes(level)) {
      throw new Error(`Invalid consent level: ${level}`);
    }
  }
}
