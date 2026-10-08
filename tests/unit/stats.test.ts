import { beforeEach, describe, expect, it } from 'vitest';
import { configurePolicyQuery, resetPolicyQueryForTests } from '../../src/commands/policy.js';
import {
  resetStatsQueryForTests,
  configureStatsQuery,
  statsCommand,
} from '../../src/commands/stats.js';
import type { ArchiveStats } from '../../src/repositories/drizzleMessageRepository.js';
import { fakeChatInput, isEphemeral, replyEmbed } from './helpers/interactions.js';

function fakeStats(stats: ArchiveStats): void {
  configureStatsQuery({
    getArchiveStats: () => Promise.resolve(stats),
  });
}

beforeEach(() => {
  resetStatsQueryForTests();
  resetPolicyQueryForTests();
});

describe('stats command', () => {
  it('renders archive counts and uptime', async () => {
    fakeStats({ messages: 120, revisions: 150, attachmentsPending: 3, deletions: 9 });
    const { interaction, replies } = fakeChatInput({ commandName: 'stats' });

    await statsCommand.execute(interaction);

    const description = replyEmbed(replies[0])?.description ?? '';
    expect(description).toContain('120');
    expect(description).toContain('150');
    expect(description).toContain('<t:');
    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('denies members lacking the allowlisted role', async () => {
    configurePolicyQuery({
      getPolicy: () => Promise.resolve({ snipeRoleIds: ['r-mod'], archivingEnabled: true }),
      savePolicy: () => Promise.resolve(),
      getRetention: () => Promise.resolve(null),
      saveRetention: () => Promise.resolve(),
      clearRetention: () => Promise.resolve(),
    });
    fakeStats({ messages: 1, revisions: 1, attachmentsPending: 0, deletions: 0 });
    const { interaction, replies } = fakeChatInput({ commandName: 'stats' });

    await statsCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(JSON.stringify(replies[0])).toContain('specific roles');
  });

  it('fails closed when the query is not configured', async () => {
    const { interaction, replies } = fakeChatInput({ commandName: 'stats' });

    await statsCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });
});
