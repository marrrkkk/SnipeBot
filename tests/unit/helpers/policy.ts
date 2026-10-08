import type { PolicyPort } from '../../../src/commands/policy.js';

/** No-op policy port; override what the test needs. */
export function stubPolicyPort(overrides: Partial<PolicyPort> = {}): PolicyPort {
  return {
    getPolicy: () => Promise.resolve(null),
    savePolicy: () => Promise.resolve(),
    getRetention: () => Promise.resolve(null),
    saveRetention: () => Promise.resolve(),
    clearRetention: () => Promise.resolve(),
    ...overrides,
  };
}
