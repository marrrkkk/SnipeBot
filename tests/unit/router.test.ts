import type { Interaction } from 'discord.js';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  configureEditHistoryQuery,
  resetEditHistoryQueryForTests,
} from '../../src/commands/edits.js';
import { toSnapshot } from '../../src/discord/mappers.js';
import { routeInteraction } from '../../src/interactions/router.js';
import { resetMetrics, snapshotMetrics } from '../../src/observability/metrics.js';
import { fakeMessage } from './helpers/fakes.js';

type ReplyArgs = { content: string; ephemeral?: boolean };

function fakeInteraction(overrides: Record<string, unknown> = {}): {
  interaction: Interaction;
  replies: ReplyArgs[];
} {
  const replies: ReplyArgs[] = [];
  const base = {
    type: 2,
    commandName: 'nope',
    replied: false,
    deferred: false,
    isChatInputCommand: () => true,
    isAutocomplete: () => false,
    isMessageContextMenuCommand: () => false,
    isUserContextMenuCommand: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isAnySelectMenu: () => false,
    isModalSubmit: () => false,
    isCommand: () => true,
    isRepliable: () => true,
    reply: (args: ReplyArgs): Promise<void> => {
      replies.push(args);
      return Promise.resolve();
    },
    ...overrides,
  };
  return { interaction: base as unknown as Interaction, replies };
}

describe('routeInteraction', () => {
  beforeEach(() => {
    resetEditHistoryQueryForTests();
    resetMetrics();
  });

  function configureHistory(): void {
    configureEditHistoryQuery({
      listEditedMessages: () => Promise.resolve([]),
      getRevisions: () =>
        Promise.resolve([
          {
            revNo: 1,
            content: 'v1',
            editedAt: null,
            capturedAt: new Date(),
            flags: 0,
            tts: false,
            pinned: false,
          },
        ]),
      findById: () => Promise.resolve(toSnapshot(fakeMessage({ id: 'm1', content: 'v1' }))),
    });
  }
  it('replies ephemerally on unknown command', async () => {
    const { interaction, replies } = fakeInteraction();
    await routeInteraction(interaction);
    expect(replies).toEqual([{ content: 'Unknown command.', ephemeral: true }]);
  });

  it('does not throw when execute rejects; attempts error reply', async () => {
    // 'ping' exists, but its reply rejects -> execute() rejects -> router
    // catch path. Second reply attempt succeeds.
    let calls = 0;
    const { interaction, replies } = fakeInteraction({
      commandName: 'ping',
      reply: (args: ReplyArgs): Promise<void> => {
        calls += 1;
        if (calls === 1) return Promise.reject(new Error('reply failed'));
        replies.push(args);
        return Promise.resolve();
      },
    });
    await expect(routeInteraction(interaction)).resolves.toBeUndefined();
    expect(replies).toEqual([
      { content: 'Something went wrong handling that command.', ephemeral: true },
    ]);
  });

  it('swallows reply failure in the error path without throwing', async () => {
    const { interaction } = fakeInteraction({
      reply: (): Promise<void> => Promise.reject(new Error('nope')),
    });
    await expect(routeInteraction(interaction)).resolves.toBeUndefined();
  });

  it('ignores unknown button prefixes without replying', async () => {
    const { interaction, replies } = fakeInteraction({
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isButton: () => true,
      customId: 'nope:x',
    });
    await routeInteraction(interaction);
    expect(replies).toEqual([]);
  });

  it('dispatches V2 browser buttons to the surface handler', async () => {
    configureHistory();
    const updated: unknown[] = [];
    const { interaction } = fakeInteraction({
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isButton: () => true,
      customId: 'edb:pg:1',
      channelId: 'c1',
      guildId: 'g1',
      memberPermissions: { has: () => true },
      member: null,
      client: { users: { cache: new Map() } },
      update: (args: unknown): Promise<void> => {
        updated.push(args);
        return Promise.resolve();
      },
      followUp: (): Promise<void> => Promise.resolve(),
      reply: (): Promise<void> => Promise.resolve(),
    });
    await routeInteraction(interaction);
    expect(updated).toHaveLength(1);
  });

  it('dispatches jump selects to the surface handler', async () => {
    configureHistory();
    const updated: unknown[] = [];
    const { interaction } = fakeInteraction({
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isStringSelectMenu: () => true,
      customId: 'edb:jp:1',
      values: ['m1'],
      channelId: 'c1',
      guildId: 'g1',
      memberPermissions: { has: () => true },
      member: null,
      client: { users: { cache: new Map() } },
      update: (args: unknown): Promise<void> => {
        updated.push(args);
        return Promise.resolve();
      },
      followUp: (): Promise<void> => Promise.resolve(),
      reply: (): Promise<void> => Promise.resolve(),
    });
    await routeInteraction(interaction);
    expect(updated).toHaveLength(1);
  });

  it('ignores unknown select prefixes without replying', async () => {
    const { interaction, replies } = fakeInteraction({
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isStringSelectMenu: () => true,
      customId: 'nope:jp:1',
      values: ['m1'],
    });
    await routeInteraction(interaction);
    expect(replies).toEqual([]);
  });

  it('routes message context commands by name', async () => {
    const { interaction, replies } = fakeInteraction({
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isMessageContextMenuCommand: () => true,
      commandName: 'nope',
      targetId: 'm1',
    });
    await routeInteraction(interaction);
    expect(replies).toEqual([{ content: 'Unknown command.', ephemeral: true }]);
  });

  it('dispatches known message context commands', async () => {
    configureHistory();
    const { interaction, replies } = fakeInteraction({
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isMessageContextMenuCommand: () => true,
      commandName: 'View Edit History',
      targetId: 'm1',
      channelId: 'c1',
      guildId: 'g1',
      memberPermissions: { has: () => true },
    });
    await routeInteraction(interaction);
    expect(replies).toHaveLength(1);
  });

  it('ignores user context commands without replying', async () => {
    const { interaction, replies } = fakeInteraction({
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isUserContextMenuCommand: () => true,
      commandName: 'nope',
    });
    await routeInteraction(interaction);
    expect(replies).toEqual([]);
  });

  it('counts executed, unknown and failed interactions', async () => {
    const ping = fakeInteraction({ commandName: 'ping' });
    await routeInteraction(ping.interaction);
    const unknown = fakeInteraction({ commandName: 'nope' });
    await routeInteraction(unknown.interaction);
    const failing = fakeInteraction({
      commandName: 'ping',
      reply: (): Promise<void> => Promise.reject(new Error('nope')),
    });
    await routeInteraction(failing.interaction);
    const counters = snapshotMetrics().counters;
    expect(counters['commands.ping']).toBe(2);
    expect(counters['commands.unknown']).toBe(1);
    expect(counters['interactions.errors']).toBe(1);
  });
});
