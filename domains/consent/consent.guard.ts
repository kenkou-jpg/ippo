import type { ConsentLevel } from "../../policies";
import { ConsentRequiredError } from "./consent.entity";
import { isAllowed, requiredLevelFor, type DataUseCategory } from "./consent.policy";
import { AuditLogger } from "./audit.logger";
import {
  buildConsentViolationBlockedEvent,
  type ConsentDomainEvent,
} from "./consent.events";
import type { ID } from "../../shared/types/base";

export interface ConsentState {
  level: ConsentLevel;
  isRevoked: boolean;
}

export type ConsentEventEmitter = (event: ConsentDomainEvent) => void;

export class ConsentGuard {
  constructor(
    private readonly auditLogger: AuditLogger,
    private readonly emit: ConsentEventEmitter,
  ) {}

  /**
   * Asserts that the given consent state permits access to the requested
   * data-use category. Logs the attempt always; throws ConsentRequiredError
   * and emits a violation event when denied.
   */
  async assert(
    userId: ID,
    category: DataUseCategory,
    state: ConsentState,
  ): Promise<void> {
    const allowed = isAllowed(category, state.level, state.isRevoked);

    await this.auditLogger.log(
      userId,
      category,
      state.level,
      allowed ? "allowed" : "denied",
      allowed ? null : state.isRevoked ? "consent revoked" : "insufficient consent level",
    );

    if (!allowed) {
      const required = requiredLevelFor(category);

      this.emit(
        buildConsentViolationBlockedEvent({
          userId,
          category,
          requiredLevel: required,
          currentLevel: state.level,
          timestamp: new Date().toISOString(),
        }),
      );

      throw new ConsentRequiredError(required, state.level);
    }
  }

  /**
   * Non-throwing check — useful for filtering collections without exceptions.
   */
  async check(
    userId: ID,
    category: DataUseCategory,
    state: ConsentState,
  ): Promise<boolean> {
    const allowed = isAllowed(category, state.level, state.isRevoked);

    await this.auditLogger.log(
      userId,
      category,
      state.level,
      allowed ? "allowed" : "denied",
      allowed ? null : state.isRevoked ? "consent revoked" : "insufficient consent level",
    );

    if (!allowed) {
      const required = requiredLevelFor(category);
      this.emit(
        buildConsentViolationBlockedEvent({
          userId,
          category,
          requiredLevel: required,
          currentLevel: state.level,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    return allowed;
  }
}
