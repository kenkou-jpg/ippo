import type { ID, Timestamp } from "../../shared/types/base";
import type { ConsentLevel } from "../../policies";

export type AuditResult = "allowed" | "denied";

export interface AuditLogEntry {
  id: string;
  userId: ID;
  category: string;
  consentLevelAtAccess: ConsentLevel;
  result: AuditResult;
  reason: string | null;
  occurredAt: Timestamp;
}

export interface AuditLogStore {
  append(entry: AuditLogEntry): Promise<void>;
}

let _seq = 0;
function generateAuditId(): string {
  return `audit_${Date.now()}_${++_seq}`;
}

export class AuditLogger {
  constructor(private readonly store: AuditLogStore) {}

  async log(
    userId: ID,
    category: string,
    consentLevelAtAccess: ConsentLevel,
    result: AuditResult,
    reason: string | null = null,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: generateAuditId(),
      userId,
      category,
      consentLevelAtAccess,
      result,
      reason,
      occurredAt: new Date().toISOString(),
    };
    await this.store.append(entry);
  }
}

// In-memory stub for testing / development
export class InMemoryAuditLogStore implements AuditLogStore {
  readonly entries: AuditLogEntry[] = [];

  async append(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }
}
