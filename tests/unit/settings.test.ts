import { beforeEach, describe, expect, it } from 'vitest';
import { settingsCommand } from '../../src/commands/settings.js';
import type {
  GuildPolicy,
  RetentionPolicy,
} from '../../src/repositories/drizzleMessageRepository.js';
import { configurePolicyQuery, resetPolicyQueryForTests } from '../../src/commands/policy.js';
import { fakeChatInput, isEphemeral } from './helpers/interactions.js';

function fakePolicy(initial: Record<string, GuildPolicy> = {}): {
  saved: { guildId: string; policy: GuildPolicy }[];
  store: Record<string, GuildPolicy>;
  retention: Map<string, RetentionPolicy>;
} {
  const saved: { guildId: string; policy: GuildPolicy }[] = [];
  const store: Record<string, GuildPolicy> = { ...initial };
  const retention = new Map<string, RetentionPolicy>();
  configurePolicyQuery({
    getPolicy: (guildId: string) => Promise.resolve(store[guildId] ?? null),
    savePolicy: (guildId: string, policy: GuildPolicy) => {
      saved.push({ guildId, policy });
      store[guildId] = policy;
      return Promise.resolve();
    },
    getRetention: (guildId: string) => Promise.resolve(retention.get(guildId) ?? null),
    saveRetention: (guildId: string, policy: RetentionPolicy) => {
      retention.set(guildId, policy);
      return Promise.resolve();
    },
    clearRetention: (guildId: string) => {
      retention.delete(guildId);
      return Promise.resolve();
    },
  });
  return { saved, store, retention };
}

function settingsInteraction(
  subcommand: string,
  options: Record<string, unknown> = {},
  interactionOverrides: Record<string, unknown> = {},
): ReturnType<typeof fakeChatInput> {
  return fakeChatInput({
    commandName: 'settings',
    memberPermissions: { has: (flag: bigint) => flag === 32n },
    options: {
      getSubcommand: (): string => subcommand,
      getString: (_name: string): string | null => null,
      getRole: (_name: string): { id: string; name: string } | null => null,
      getBoolean: (_name: string): boolean | null => null,
      getInteger: (_name: string): number | null => null,
      ...options,
    },
    ...interactionOverrides,
  });
}

beforeEach(() => {
  resetPolicyQueryForTests();
});

describe('settings command', () => {
  it('denies members without Manage Server and never writes', async () => {
    const { saved } = fakePolicy();
    const { interaction, replies } = settingsInteraction(
      'snipe-roles',
      {},
      { memberPermissions: { has: () => false } },
    );

    await settingsCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(saved).toEqual([]);
  });

  it('denies use outside servers', async () => {
    const { saved } = fakePolicy();
    const { interaction, replies } = settingsInteraction('snipe-roles', {}, { guildId: null });

    await settingsCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(saved).toEqual([]);
  });

  it('fails closed when the policy store is not configured', async () => {
    const { interaction, replies } = settingsInteraction('snipe-roles');

    await settingsCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('adds a role to the allowlist', async () => {
    const { saved } = fakePolicy();
    const { interaction, replies } = settingsInteraction('snipe-roles', {
      getString: (name: string): string | null => (name === 'action' ? 'add' : null),
      getRole: () => ({ id: 'r1', name: 'Mods' }),
    });

    await settingsCommand.execute(interaction);

    expect(saved).toEqual([
      { guildId: 'g1', policy: { snipeRoleIds: ['r1'], archivingEnabled: true } },
    ]);
    expect(JSON.stringify(replies[0])).toContain('Mods');
  });

  it('removes a role and lists the remainder', async () => {
    const { saved } = fakePolicy({ g1: { snipeRoleIds: ['r1', 'r2'], archivingEnabled: true } });
    const removing = settingsInteraction('snipe-roles', {
      getString: (name: string): string | null => (name === 'action' ? 'remove' : null),
      getRole: () => ({ id: 'r1', name: 'Mods' }),
    });
    await settingsCommand.execute(removing.interaction);
    expect(saved[0]?.policy.snipeRoleIds).toEqual(['r2']);

    const listing = settingsInteraction('snipe-roles', {
      getString: (name: string): string | null => (name === 'action' ? 'list' : null),
    });
    await settingsCommand.execute(listing.interaction);
    expect(JSON.stringify(listing.replies[0])).toContain('r2');
  });

  it('clears the allowlist', async () => {
    const { saved } = fakePolicy({ g1: { snipeRoleIds: ['r1'], archivingEnabled: true } });
    const { interaction } = settingsInteraction('snipe-roles', {
      getString: (name: string): string | null => (name === 'action' ? 'clear' : null),
    });

    await settingsCommand.execute(interaction);

    expect(saved[0]?.policy.snipeRoleIds).toEqual([]);
  });

  it('toggles archiving', async () => {
    const { saved } = fakePolicy();
    const { interaction, replies } = settingsInteraction('archiving', {
      getBoolean: (_name: string): boolean | null => false,
    });

    await settingsCommand.execute(interaction);

    expect(saved[0]?.policy.archivingEnabled).toBe(false);
    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('sets retention windows merging over stored values', async () => {
    const { retention } = fakePolicy();
    retention.set('g1', { scope: 'g1', keepDays: 30, keepRevisions: null, mediaKeepDays: null });
    const { interaction, replies } = settingsInteraction('retention-set', {
      getInteger: (name: string): number | null => (name === 'media-days' ? 7 : null),
    });

    await settingsCommand.execute(interaction);

    expect(retention.get('g1')).toMatchObject({ keepDays: 30, mediaKeepDays: 7 });
    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('rejects retention-set with nothing to change', async () => {
    const { retention } = fakePolicy();
    const { interaction, replies } = settingsInteraction('retention-set');

    await settingsCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(retention.get('g1')).toBeUndefined();
  });

  it('shows the effective retention policy', async () => {
    const { retention } = fakePolicy();
    retention.set('g1', { scope: 'g1', keepDays: 30, keepRevisions: 5, mediaKeepDays: null });
    const { interaction, replies } = settingsInteraction('retention-show');

    await settingsCommand.execute(interaction);

    expect(JSON.stringify(replies[0])).toContain('30');
    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('shows keep-everything when unconfigured', async () => {
    fakePolicy();
    const { interaction, replies } = settingsInteraction('retention-show');

    await settingsCommand.execute(interaction);

    expect(JSON.stringify(replies[0])).toContain('everything');
  });

  it('clears retention overrides', async () => {
    const { retention } = fakePolicy();
    retention.set('g1', { scope: 'g1', keepDays: 30, keepRevisions: null, mediaKeepDays: null });
    const { interaction, replies } = settingsInteraction('retention-clear');

    await settingsCommand.execute(interaction);

    expect(retention.get('g1')).toBeUndefined();
    expect(isEphemeral(replies[0])).toBe(true);
  });
});
