import type { MessageContextMenuCommandInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { userMessagesCommand, viewHistoryCommand } from '../../src/commands/contextMenu.js';
import { configurePolicyQuery, resetPolicyQueryForTests } from '../../src/commands/policy.js';
import {
  configureEditHistoryQuery,
  resetEditHistoryQueryForTests,
} from '../../src/commands/edits.js';
import { configureSearchQuery, resetSearchQueryForTests } from '../../src/commands/search.js';
import { toSnapshot } from '../../src/discord/mappers.js';
import type { MessageSnapshot } from '../../src/domain/messageSnapshot.js';
import type {
  MessageSearchPort,
  RevisionView,
  SearchHit,
  SearchQuery,
} from '../../src/repositories/drizzleMessageRepository.js';
import { fakeMessage } from './helpers/fakes.js';
import { isEphemeral, replyButtonIds, replyFlags, replyV2Text } from './helpers/interactions.js';

const V2 = MessageFlags.IsComponentsV2;

function fakeContext(overrides: Record<string, unknown> = {}): {
  interaction: MessageContextMenuCommandInteraction;
  replies: unknown[];
} {
  const replies: unknown[] = [];
  const base = {
    commandName: 'View Edit History',
    targetId: 'm1',
    targetMessage: {
      id: 'm1',
      author: { id: 'u9', username: 'carol', discriminator: '0', bot: false },
    },
    channelId: 'c1',
    guildId: 'g1',
    memberPermissions: { has: () => true },
    client: {
      users: { cache: new Map<string, { username: string }>([['u9', { username: 'carol' }]]) },
    },
    reply: (args: unknown): Promise<void> => {
      replies.push(args);
      return Promise.resolve();
    },
    ...overrides,
  };
  return { interaction: base as unknown as MessageContextMenuCommandInteraction, replies };
}

function rev(revNo: number, content: string, editedAt: Date | null): RevisionView {
  return { revNo, content, editedAt, capturedAt: new Date(), flags: 0, tts: false, pinned: false };
}

function historyPort(
  revs: Record<string, RevisionView[]>,
  snaps: Record<string, MessageSnapshot | null>,
): Parameters<typeof configureEditHistoryQuery>[0] {
  return {
    listEditedMessages: () => Promise.resolve([]),
    getRevisions: (messageId: string) => Promise.resolve(revs[messageId] ?? []),
    findById: (id: string) => Promise.resolve(snaps[id] ?? null),
  };
}

function searchPort(hits: SearchHit[], onQuery?: (query: SearchQuery) => void): MessageSearchPort {
  return {
    searchMessages: (query: SearchQuery) => {
      onQuery?.(query);
      return Promise.resolve(hits);
    },
    findById: () => Promise.resolve(null),
  };
}

function hit(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    messageId: 'm1',
    channelId: 'c1',
    authorId: 'u9',
    content: 'hello there',
    revNo: 1,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    editedAt: null,
    deletedAt: null,
    rank: -1,
    ...overrides,
  };
}

beforeEach(() => {
  resetEditHistoryQueryForTests();
  resetSearchQueryForTests();
  resetPolicyQueryForTests();
});

describe('view history context command (V2 walker)', () => {
  it('shows the latest revision with walker nav', async () => {
    const snap = toSnapshot(fakeMessage({ id: 'm1', content: 'v2' }));
    configureEditHistoryQuery(
      historyPort({ m1: [rev(1, 'v1', null), rev(2, 'v2', new Date())] }, { m1: snap }),
    );
    const { interaction, replies } = fakeContext();

    await viewHistoryCommand.execute(interaction);

    expect(replyFlags(replies[0])).toBe(V2);
    expect(replyV2Text(replies[0])).toContain('alice');
    expect(replyV2Text(replies[0])).toContain('v2');
    expect(replyV2Text(replies[0])).toContain('Revision 2 of 2');
    // No list context: Older/Newer + Close, but no Back.
    expect(replyButtonIds(replies[0])).toHaveLength(3);
    expect(isEphemeral(replies[0])).toBe(false);
  });

  it('replies ephemerally when no history exists', async () => {
    configureEditHistoryQuery(historyPort({}, {}));
    const { interaction, replies } = fakeContext();

    await viewHistoryCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('denies members lacking the allowlisted role without querying', async () => {
    let queried = false;
    configurePolicyQuery({
      getPolicy: () => Promise.resolve({ snipeRoleIds: ['r-mod'], archivingEnabled: true }),
      savePolicy: () => Promise.resolve(),
      getRetention: () => Promise.resolve(null),
      saveRetention: () => Promise.resolve(),
      clearRetention: () => Promise.resolve(),
    });
    configureEditHistoryQuery({
      ...historyPort({}, {}),
      getRevisions: () => {
        queried = true;
        return Promise.resolve([]);
      },
    });
    const { interaction, replies } = fakeContext();

    await viewHistoryCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(JSON.stringify(replies[0])).toContain('specific roles');
    expect(queried).toBe(false);
  });

  it('denies without ViewChannel and never queries', async () => {
    let queried = false;
    configureEditHistoryQuery({
      ...historyPort({}, {}),
      getRevisions: () => {
        queried = true;
        return Promise.resolve([]);
      },
    });
    const { interaction, replies } = fakeContext({
      memberPermissions: { has: () => false },
    });

    await viewHistoryCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(queried).toBe(false);
  });

  it('fails closed when the query is not configured', async () => {
    const { interaction, replies } = fakeContext();

    await viewHistoryCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });
});

describe('user messages context command (V2 search browser)', () => {
  it('searches the target author in this channel', async () => {
    let seen: SearchQuery | null = null;
    configureSearchQuery(
      searchPort([hit(), hit({ messageId: 'm2', content: 'second' })], (query) => {
        seen = query;
      }),
    );
    const { interaction, replies } = fakeContext({ commandName: 'Search User Messages' });

    await userMessagesCommand.execute(interaction);

    expect(seen).toMatchObject({ authorId: 'u9', channelId: 'c1' });
    expect(replyFlags(replies[0])).toBe(V2);
    expect(replyV2Text(replies[0])).toContain('hello there');
    expect(isEphemeral(replies[0])).toBe(false);
  });

  it('replies ephemerally when the user has nothing archived', async () => {
    configureSearchQuery(searchPort([]));
    const { interaction, replies } = fakeContext({ commandName: 'Search User Messages' });

    await userMessagesCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('replies ephemerally when the author is indeterminable', async () => {
    let queried = false;
    configureSearchQuery(
      searchPort([hit()], () => {
        queried = true;
      }),
    );
    const { interaction, replies } = fakeContext({
      commandName: 'Search User Messages',
      targetMessage: { id: 'm1', author: null },
    });

    await userMessagesCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(queried).toBe(false);
  });

  it('denies without ViewChannel and never queries', async () => {
    let queried = false;
    configureSearchQuery(
      searchPort([hit()], () => {
        queried = true;
      }),
    );
    const { interaction, replies } = fakeContext({
      commandName: 'Search User Messages',
      memberPermissions: { has: () => false },
    });

    await userMessagesCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(queried).toBe(false);
  });

  it('denies members lacking the allowlisted role without querying', async () => {
    let queried = false;
    configurePolicyQuery({
      getPolicy: () => Promise.resolve({ snipeRoleIds: ['r-mod'], archivingEnabled: true }),
      savePolicy: () => Promise.resolve(),
      getRetention: () => Promise.resolve(null),
      saveRetention: () => Promise.resolve(),
      clearRetention: () => Promise.resolve(),
    });
    configureSearchQuery(
      searchPort([hit()], () => {
        queried = true;
      }),
    );
    const { interaction, replies } = fakeContext({ commandName: 'Search User Messages' });

    await userMessagesCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(JSON.stringify(replies[0])).toContain('specific roles');
    expect(queried).toBe(false);
  });

  it('fails closed when the query is not configured', async () => {
    const { interaction, replies } = fakeContext({ commandName: 'Search User Messages' });

    await userMessagesCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });
});
