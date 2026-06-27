// tests/arch/architecture-guard-pr037.test.js
// PR-037 Architecture Guard — forbidden rules for Event Sourcing layer
import { describe, it, expect } from 'vitest';
import { runArchitectureGuard } from '../../src/application/architecture-guard.js';

function withWindow(fn) {
  const win = { __ippoArchGuard: null };
  const orig = globalThis.window;
  globalThis.window = win;
  try {
    runArchitectureGuard();
    fn(win.__ippoArchGuard);
  } finally {
    globalThis.window = orig;
  }
}

describe('ArchGuard PR-037 — EventStore', () => {
  it('flags screen → event-store', () => {
    withWindow((g) => {
      g.check('/screens/home/', '/domains/events/event-store.js');
      expect(g.violations.some(v => v.label === 'screen→EventStore')).toBe(true);
    });
  });

  it('flags feature → event-store', () => {
    withWindow((g) => {
      g.check('/features/timeline/', '/domains/events/event-store.js');
      expect(g.violations.some(v => v.label === 'feature→EventStore')).toBe(true);
    });
  });

  it('does NOT flag application → event-store', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/events/event-store.js');
      expect(g.violations.some(v => v.label === 'screen→EventStore')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→EventStore')).toBe(false);
    });
  });
});

describe('ArchGuard PR-037 — EventBus', () => {
  it('flags screen → event-bus', () => {
    withWindow((g) => {
      g.check('/screens/dashboard/', '/domains/events/event-bus.js');
      expect(g.violations.some(v => v.label === 'screen→EventBus')).toBe(true);
    });
  });

  it('flags feature → event-bus', () => {
    withWindow((g) => {
      g.check('/features/signal/', '/domains/events/event-bus.js');
      expect(g.violations.some(v => v.label === 'feature→EventBus')).toBe(true);
    });
  });
});

describe('ArchGuard PR-037 — EventReplayService', () => {
  it('flags screen → event-replay-service', () => {
    withWindow((g) => {
      g.check('/screens/record/', '/domains/events/event-replay-service.js');
      expect(g.violations.some(v => v.label === 'screen→EventReplayService')).toBe(true);
    });
  });

  it('flags feature → event-replay-service', () => {
    withWindow((g) => {
      g.check('/features/admin/', '/domains/events/event-replay-service.js');
      expect(g.violations.some(v => v.label === 'feature→EventReplayService')).toBe(true);
    });
  });

  it('does NOT flag application → event-replay-service', () => {
    withWindow((g) => {
      g.check('/application/api-gateway.js', '/domains/events/event-replay-service.js');
      expect(g.violations.some(v => v.label === 'screen→EventReplayService')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→EventReplayService')).toBe(false);
    });
  });
});

describe('ArchGuard PR-037 — AuditTimelineService', () => {
  it('flags screen → audit-timeline-service', () => {
    withWindow((g) => {
      g.check('/screens/audit/', '/domains/events/audit-timeline-service.js');
      expect(g.violations.some(v => v.label === 'screen→AuditTimelineService')).toBe(true);
    });
  });

  it('flags feature → audit-timeline-service', () => {
    withWindow((g) => {
      g.check('/features/ops/', '/domains/events/audit-timeline-service.js');
      expect(g.violations.some(v => v.label === 'feature→AuditTimelineService')).toBe(true);
    });
  });

  it('does NOT flag application → audit-timeline-service', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/events/audit-timeline-service.js');
      expect(g.violations.some(v => v.label === 'screen→AuditTimelineService')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→AuditTimelineService')).toBe(false);
    });
  });
});
