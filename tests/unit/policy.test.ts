import { describe, expect, it } from 'vitest';
import {
  checkCommandAccess,
  type PolicyInteraction,
  type PolicyPort,
} from '../../src/commands/policy.js';
import { stubPolicyPort } from './helpers/policy.js';

function interaction(overrides: Record<string, unknown> = {}): PolicyInteraction {
  return {
    guildId: 'g1',
    memberPermissions: { has: () => true },
    member: { roles: { cache: new Map([['r1', {}]]) } },
    ...overrides,
  };
}

function port(policy: { snipeRoleIds: string[]; archivingEnabled: boolean } | null): PolicyPort {
  return stubPolicyPort({ getPolicy: (_guildId: string) => Promise.resolve(policy) });
}

describe('command access', () => {
  it('passes open allowlists', async () => {
    await expect(
      checkCommandAccess(port({ snipeRoleIds: [], archivingEnabled: true }), interaction()),
    ).resolves.toEqual({ ok: true });
  });

  it('passes absent policies', async () => {
    await expect(checkCommandAccess(port(null), interaction())).resolves.toEqual({ ok: true });
  });

  it('passes without a binding (dev/test passthrough)', async () => {
    await expect(checkCommandAccess(null, interaction())).resolves.toEqual({ ok: true });
  });

  it('passes DMs without querying', async () => {
    let queried = false;
    const result = await checkCommandAccess(
      stubPolicyPort({
        getPolicy: () => {
          queried = true;
          return Promise.resolve(null);
        },
      }),
      interaction({ guildId: null, memberPermissions: null, member: null }),
    );
    expect(result).toEqual({ ok: true });
    expect(queried).toBe(false);
  });

  it('passes members holding a listed role', async () => {
    const result = await checkCommandAccess(
      port({ snipeRoleIds: ['r9', 'r1'], archivingEnabled: true }),
      interaction(),
    );
    expect(result).toEqual({ ok: true });
  });

  it('supports raw string-array role shapes', async () => {
    const result = await checkCommandAccess(
      port({ snipeRoleIds: ['r1'], archivingEnabled: true }),
      interaction({ member: { roles: ['r1', 'r2'] } }),
    );
    expect(result).toEqual({ ok: true });
  });

  it('denies members without a listed role', async () => {
    const result = await checkCommandAccess(
      port({ snipeRoleIds: ['r9'], archivingEnabled: true }),
      interaction(),
    );
    expect(result.ok).toBe(false);
  });

  it('denies unverifiable members when gated', async () => {
    const result = await checkCommandAccess(
      port({ snipeRoleIds: ['r1'], archivingEnabled: true }),
      interaction({ member: null }),
    );
    expect(result.ok).toBe(false);
  });

  it('propagates corrupt policy failures', async () => {
    const failing: PolicyPort = stubPolicyPort({
      getPolicy: () => Promise.reject(new Error('corrupt guild policy for g1')),
    });
    await expect(checkCommandAccess(failing, interaction())).rejects.toThrow(/corrupt/);
  });
});
