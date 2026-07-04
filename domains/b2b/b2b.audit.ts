import { EVENTS } from "../../shared/events";
import type { B2BRequester } from "./b2b.policy";

export interface AuditEntry {
  eventType: typeof EVENTS.B2B_QUERY_EXECUTED | typeof EVENTS.B2B_EXPORT_GENERATED | typeof EVENTS.B2B_ACCESS_DENIED;
  requesterId: string;
  organizationId: string;
  action: string;
  params: Record<string, unknown>;
  outcome: "allowed" | "denied";
  reason?: string;
  occurredAt: string;
}

export interface AuditLogger {
  log(entry: AuditEntry): Promise<void>;
  findByRequester(requesterId: string): Promise<AuditEntry[]>;
}

export class B2BAudit {
  constructor(private readonly logger: AuditLogger) {}

  async logQuery(requester: B2BRequester, action: string, params: Record<string, unknown>): Promise<void> {
    await this.logger.log({
      eventType: EVENTS.B2B_QUERY_EXECUTED,
      requesterId: requester.requesterId,
      organizationId: requester.organizationId,
      action,
      params,
      outcome: "allowed",
      occurredAt: new Date().toISOString(),
    });
  }

  async logExport(requester: B2BRequester, action: string, params: Record<string, unknown>): Promise<void> {
    await this.logger.log({
      eventType: EVENTS.B2B_EXPORT_GENERATED,
      requesterId: requester.requesterId,
      organizationId: requester.organizationId,
      action,
      params,
      outcome: "allowed",
      occurredAt: new Date().toISOString(),
    });
  }

  async logDenied(requester: B2BRequester, action: string, reason: string): Promise<void> {
    await this.logger.log({
      eventType: EVENTS.B2B_ACCESS_DENIED,
      requesterId: requester.requesterId,
      organizationId: requester.organizationId,
      action,
      params: {},
      outcome: "denied",
      reason,
      occurredAt: new Date().toISOString(),
    });
  }
}
