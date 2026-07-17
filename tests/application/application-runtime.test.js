// tests/application/application-runtime.test.js
// PR-APP-BOOT-01: ApplicationRuntime is the only object UI code may hold to
// reach the Application layer. It exposes `.api` and nothing else (no
// container, no resolve()).
import { describe, it, expect } from 'vitest';
import { ApplicationRuntime } from '../../src/application/application-runtime.js';

describe('ApplicationRuntime', () => {
  it('exposes the given ApiGateway as .api', () => {
    const fakeGateway = { getExperiments: () => [] };
    const runtime = new ApplicationRuntime(fakeGateway);
    expect(runtime.api).toBe(fakeGateway);
  });

  it('does not expose a container or resolve() method', () => {
    const runtime = new ApplicationRuntime({});
    expect(runtime.container).toBeUndefined();
    expect(runtime.resolve).toBeUndefined();
  });
});
