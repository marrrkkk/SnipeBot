import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSearchPage,
  configureSearchQuery,
  handleSearchButton,
  handleSearchSelect,
  resetSearchQueryForTests,
  searchCommand,
  toSearchQuery,
  toStoredQuery,
} from '../../src/commands/search.js';
import { toSnapshot } from '../../src/discord/mappers.js';
import type { MessageSnapshot } from '../../src/domain/messageSnapshot.js';
import type {
  MessageSearchPort,
  SearchHit,
  SearchQuery,
} from '../../src/repositories/drizzleMessageRepository.js';
import { configurePolicyQuery, resetPolicyQueryForTests } from '../../src/commands/policy.js';
import { stubPolicyPort } from './helpers/policy.js';
import { fakeMessage } from './helpers/fakes.js';
import {
  fakeChatInput,
  isEphemeral,
  replyButtonIds,
  replyFlags,
  replySelectIds,
  replyV2Text,
} from './helpers/interactions.js';

const V2 = MessageFlags.IsComponentsV2;

function hit(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    messageId: 'm1',
    channelId: 'c1',
    authorId: 'u1',
    content: 'docker compose guide',
    revNo: 1,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    editedAt: null,
    deletedAt: null,
    rank: -1,
    ...overrides,
  };
}

function fakePort(
  hits: SearchHit[],
  onQuery?: (query: SearchQuery) => void,
  snaps: Record<string, MessageSnapshot> = {},
): MessageSearchPort {
  return {
    searchMessages: (query: SearchQuery) => {
      onQuery?.(query);
      return Promise.resolve(hits);
    },
    findById: (id: string) => Promise.resolve(snaps[id] ?? null),
  };
}

function searchOptions(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    getString: (name: string): string | null => (name === 'text' ? 'docker' : null),
    getUser: (_name: string): { id: string } | null => null,
    getBoolean: (_name: string): boolean | null => null,
    ...overrides,
  };
}

function fakeButton(
  customId: string,
  overrides: Record<string, unknown> = {},
): {
  interaction: ButtonInteraction;
  updated: unknown[];
  followedUp: unknown[];
  replies: unknown[];
} {
  const updated: unknown[] = [];
  const followedUp: unknown[] = [];
  const replies: unknown[] = [];
  const base = {
    customId,
    channelId: 'c1',
    guildId: 'g1',
    memberPermissions: { has: () => true },
    member: null,
    client: { users: { cache: new Map<string, { username: string }>() } },
    update: (args: unknown): Promise<void> => {
      updated.push(args);
      return Promise.resolve();
    },
    followUp: (args: unknown): Promise<void> => {
      followedUp.push(args);
      return Promise.resolve();
    },
    reply: (args: unknown): Promise<void> => {
      replies.push(args);
      return Promise.resolve();
    },
    ...overrides,
  };
  return {
    interaction: base as unknown as ButtonInteraction,
    updated,
    followedUp,
    replies,
  };
}

function fakeSelect(
  customId: string,
  value: string,
  overrides: Record<string, unknown> = {},
): {
  interaction: StringSelectMenuInteraction;
  updated: unknown[];
  followedUp: unknown[];
  replies: unknown[];
} {
  const { interaction, updated, followedUp, replies } = fakeButton(customId, {
    values: [value],
    ...overrides,
  });
  return {
    interaction: interaction as unknown as StringSelectMenuInteraction,
    updated,
    followedUp,
    replies,
  };
}

function snap(id: string, content: string): MessageSnapshot {
  return toSnapshot(fakeMessage({ id, content }));
}

beforeEach(() => {
  resetSearchQueryForTests();
  resetPolicyQueryForTests();
});

describe('search command (V2 session browser)', () => {
  it('opens the results browser with authors, channels and timestamps', async () => {
    configureSearchQuery(
      fakePort([
        hit({ messageId: 'm1', content: 'docker compose guide' }),
        hit({ messageId: 'm2', authorId: 'u2', content: 'docker swarm', deletedAt: new Date() }),
      ]),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      client: { users: { cache: new Map([['u1', { username: 'alice' }]]) } },
      options: searchOptions(),
    });

    await searchCommand.execute(interaction);

    expect(replyFlags(replies[0])).toBe(V2);
    const text = replyV2Text(replies[0]);
    expect(text).toContain('docker compose guide');
    expect(text).toContain('alice');
    expect(text).toContain('<#c1>');
    expect(text).toContain('<t:');
    expect(text).toContain('🗑️');
    expect(text).toContain('1–2 of 2');
    expect(isEphemeral(replies[0])).toBe(false);
    expect(JSON.stringify(replies[0])).toContain('"parse":[]');
  });

  it('replies ephemerally when nothing matches', async () => {
    configureSearchQuery(fakePort([]));
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      options: searchOptions({ getString: () => 'zzz' }),
    });

    await searchCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('denies guild members without ViewChannel and never queries', async () => {
    let queried = false;
    configureSearchQuery(
      fakePort([hit()], () => {
        queried = true;
      }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      memberPermissions: { has: () => false },
      options: searchOptions(),
    });

    await searchCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(queried).toBe(false);
  });

  it('allows DMs where member permissions are absent', async () => {
    configureSearchQuery(fakePort([hit()]));
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      guildId: null,
      memberPermissions: null,
      options: searchOptions(),
    });

    await searchCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(false);
  });

  it('rejects invalid dates without querying', async () => {
    let queried = false;
    configureSearchQuery(
      fakePort([hit()], () => {
        queried = true;
      }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      options: {
        getString: (name: string): string | null =>
          name === 'after' ? 'not a date' : name === 'text' ? 'docker' : null,
        getUser: () => null,
        getBoolean: () => null,
      },
    });

    await searchCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(queried).toBe(false);
  });

  it('passes author, date, has and deleted options through', async () => {
    let seen: SearchQuery | null = null;
    configureSearchQuery(
      fakePort([hit()], (query) => {
        seen = query;
      }),
    );
    const { interaction } = fakeChatInput({
      commandName: 'search',
      options: {
        getString: (name: string): string | null => {
          if (name === 'text') return 'docker';
          if (name === 'after') return '2026-01-01';
          if (name === 'has') return 'attachment';
          return null;
        },
        getUser: (_name: string) => ({ id: 'u9' }),
        getBoolean: (_name: string): boolean | null => true,
      },
    });

    await searchCommand.execute(interaction);

    expect(seen).toMatchObject({
      channelId: 'c1',
      text: 'docker',
      authorId: 'u9',
      hasAttachment: true,
      deleted: true,
    });
    expect((seen as unknown as { after?: unknown }).after).toBeInstanceOf(Date);
  });

  it('asks for constraints when given none', async () => {
    let queried = false;
    configureSearchQuery(
      fakePort([hit()], () => {
        queried = true;
      }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      options: {
        getString: (_name: string): string | null => null,
        getUser: (_name: string): { id: string } | null => null,
        getBoolean: (_name: string): boolean | null => null,
      },
    });

    await searchCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(queried).toBe(false);
  });

  it('fails closed when the query is not configured', async () => {
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      options: searchOptions(),
    });

    await searchCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('denies members lacking the allowlisted role without querying', async () => {
    let queried = false;
    configurePolicyQuery(
      stubPolicyPort({
        getPolicy: () => Promise.resolve({ snipeRoleIds: ['r-mod'], archivingEnabled: true }),
      }),
    );
    configureSearchQuery(
      fakePort([hit()], () => {
        queried = true;
      }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      options: searchOptions(),
    });

    await searchCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(JSON.stringify(replies[0])).toContain('specific roles');
    expect(queried).toBe(false);
  });
});

describe('stored query round-trip', () => {
  it('survives the session store as JSON-safe params', () => {
    const stored = toStoredQuery({
      text: 'docker',
      authorId: 'u9',
      after: new Date('2026-01-01T00:00:00.000Z'),
      hasAttachment: true,
      hasPoll: false,
      deleted: true,
    });
    expect(() => JSON.stringify(stored)).not.toThrow();
    const back = toSearchQuery('c1', JSON.parse(JSON.stringify(stored)) as typeof stored);
    expect(back).toMatchObject({ channelId: 'c1', text: 'docker', authorId: 'u9' });
    expect(back.after).toBeInstanceOf(Date);
  });
});

describe('seb buttons', () => {
  function sessionIdFrom(reply: unknown, prefix: 'pg' | 'dt'): string {
    const id = replyButtonIds(reply).find((button) => button.startsWith(`seb:${prefix}:`));
    const parts = (id ?? '').split(':');
    return parts[2] ?? '';
  }

  it('pages through the session in place', async () => {
    const hits = Array.from({ length: 7 }, (_, i) =>
      hit({ messageId: `m${String(i)}`, content: `hit ${String(i)}` }),
    );
    configureSearchQuery(fakePort(hits));
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      options: searchOptions(),
    });
    await searchCommand.execute(interaction);
    const sessionId = sessionIdFrom(replies[0], 'pg');
    expect(sessionId).not.toBe('');

    const page = fakeButton(`seb:pg:${sessionId}:2`);
    await handleSearchButton(page.interaction, ['pg', sessionId, '2']);

    expect(page.updated).toHaveLength(1);
    expect(replyV2Text(page.updated[0])).toContain('6–7 of 7');
  });

  it('opens the hit detail and returns back', async () => {
    configureSearchQuery(
      fakePort([hit({ messageId: 'm1', content: 'found it' })], undefined, {
        m1: snap('m1', 'found it'),
      }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      options: searchOptions(),
    });
    await searchCommand.execute(interaction);
    const jump = replySelectIds(replies[0]).find((b) => b.startsWith('seb:jp:')) ?? '';
    const sessionId = jump.split(':')[2] ?? '';

    const open = fakeButton(`seb:dt:${sessionId}:m1:1`);
    await handleSearchButton(open.interaction, ['dt', sessionId, 'm1', '1']);
    expect(replyV2Text(open.updated[0])).toContain('found it');
    expect(replyButtonIds(open.updated[0])).toContain(`seb:bk:${sessionId}:1`);

    const back = fakeButton(`seb:bk:${sessionId}:1`);
    await handleSearchButton(back.interaction, ['bk', sessionId, '1']);
    expect(replyV2Text(back.updated[0])).toContain('Search');
  });

  it('jumps to the picked hit from the list select', async () => {
    configureSearchQuery(
      fakePort([hit({ messageId: 'm1', content: 'picked hit' })], undefined, {
        m1: snap('m1', 'picked hit'),
      }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      options: searchOptions(),
    });
    await searchCommand.execute(interaction);
    const jump = replySelectIds(replies[0]).find((b) => b.startsWith('seb:jp:')) ?? '';
    const sessionId = jump.split(':')[2] ?? '';
    const pick = fakeSelect(`seb:jp:${sessionId}:1`, 'm1');
    await handleSearchSelect(pick.interaction, ['jp', sessionId, '1'], 'm1');

    expect(pick.updated).toHaveLength(1);
    expect(replyV2Text(pick.updated[0])).toContain('picked hit');
  });

  it('closes the browser', async () => {
    configureSearchQuery(fakePort([hit()]));
    const close = fakeButton('seb:cl');
    await handleSearchButton(close.interaction, ['cl']);
    expect(replyV2Text(close.updated[0])).toContain('closed');
  });

  it('shows the expired state for unknown sessions', async () => {
    configureSearchQuery(fakePort([hit()]));
    const { interaction, updated, replies } = fakeButton('seb:pg:deadbeef:2');

    await handleSearchButton(interaction, ['pg', 'deadbeef', '2']);

    expect(updated).toHaveLength(1);
    expect(replyV2Text(updated[0])).toContain('expired');
    expect(replies).toHaveLength(0);
  });

  it('denies details filed under another channel', async () => {
    const other = toSnapshot(fakeMessage({ id: 'm9', channelId: 'c9', content: 'x' }));
    configureSearchQuery(fakePort([hit({ messageId: 'm9' })], undefined, { m9: other }));
    const { interaction, replies } = fakeButton('seb:dt:deadbeef:m9:1');

    await handleSearchButton(interaction, ['dt', 'deadbeef', 'm9', '1']);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('denies members lacking the allowlisted role', async () => {
    configurePolicyQuery(
      stubPolicyPort({
        getPolicy: () => Promise.resolve({ snipeRoleIds: ['r-mod'], archivingEnabled: true }),
      }),
    );
    configureSearchQuery(fakePort([hit()]));
    const { interaction, replies, updated } = fakeButton('seb:pg:deadbeef:1', { guildId: 'g1' });

    await handleSearchButton(interaction, ['pg', 'deadbeef', '1']);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(updated).toHaveLength(0);
  });

  it('falls back to follow-up when update goes stale', async () => {
    const hits = [hit({ messageId: 'm1' })];
    configureSearchQuery(fakePort(hits));
    const { interaction, replies } = fakeChatInput({
      commandName: 'search',
      options: searchOptions(),
    });
    await searchCommand.execute(interaction);
    const sessionId = sessionIdFrom(replies[0], 'pg');

    const { interaction: btn, followedUp } = fakeButton(`seb:pg:${sessionId}:1`, {
      update: () => Promise.reject(new Error('stale token')),
    });
    await handleSearchButton(btn, ['pg', sessionId, '1']);
    expect(followedUp).toHaveLength(1);
  });

  it('rejects malformed actions with an error state', async () => {
    configureSearchQuery(fakePort([hit()]));
    const { interaction, replies } = fakeButton('seb:nope');

    await handleSearchButton(interaction, ['nope']);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('builds pages purely for sibling surfaces', () => {
    const base = {
      client: { users: { cache: new Map<string, { username: string }>() } },
      channelId: 'c1',
    };
    const payload = buildSearchPage(base, [hit()], 'abc123', { text: 'docker' }, 1);
    expect(replyV2Text(payload)).toContain('docker compose guide');
  });
});
