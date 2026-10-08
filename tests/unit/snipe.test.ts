import { Collection, MessageFlags } from 'discord.js';
import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { toSnapshot } from '../../src/discord/mappers.js';
import type { MessageSnapshot } from '../../src/domain/messageSnapshot.js';
import {
  BULK_WINDOW_MS,
  configureSnipeQuery,
  groupBulkDeletions,
  handleSnipeButton,
  handleSnipeSelect,
  resetSnipeQueryForTests,
  snipeCommand,
} from '../../src/commands/snipe.js';
import type { SnipeQueryPort } from '../../src/repositories/drizzleMessageRepository.js';
import { configurePolicyQuery, resetPolicyQueryForTests } from '../../src/commands/policy.js';
import { stubPolicyPort } from './helpers/policy.js';
import { fakeMessage } from './helpers/fakes.js';
import {
  fakeChatInput,
  isEphemeral,
  replyButtonIds,
  replyFlags,
  replyV2Text,
} from './helpers/interactions.js';

const V2 = MessageFlags.IsComponentsV2;

function snap(id: string, content: string): MessageSnapshot {
  return toSnapshot(fakeMessage({ id, content }));
}

function fakeQuery(
  deletions: string[],
  snaps: Record<string, MessageSnapshot | null>,
  onList?: () => void,
  kinds: Record<string, string> = {},
  ats: Record<string, Date> = {},
  executors: Record<string, string | null> = {},
): SnipeQueryPort {
  return {
    listDeletionsForChannel: (_channelId: string, _limit: number) => {
      onList?.();
      return Promise.resolve(
        deletions.map((messageId) => ({
          messageId,
          kind: kinds[messageId] ?? 'single',
          observedAt: ats[messageId] ?? new Date(),
          executorId: executors[messageId] ?? null,
        })),
      );
    },
    findById: (id: string) => Promise.resolve(snaps[id] ?? null),
  };
}

function singleOptions(index: number | null = null): Record<string, unknown> {
  return {
    options: {
      getInteger: (_name: string): number | null => index,
      getBoolean: (_name: string): boolean | null => null,
    },
  };
}

function bulkOptions(index: number | null = null): Record<string, unknown> {
  return {
    options: {
      getInteger: (_name: string): number | null => index,
      getBoolean: (_name: string): boolean | null => true,
    },
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

beforeEach(() => {
  resetSnipeQueryForTests();
  resetPolicyQueryForTests();
});

describe('snipe command (detail-first)', () => {
  it('opens the latest deletion as a detail card', async () => {
    configureSnipeQuery(
      fakeQuery(['m-new', 'm-old'], {
        'm-old': snap('m-old', 'old content'),
        'm-new': snap('m-new', 'new content'),
      }),
    );
    const { interaction, replies } = fakeChatInput({ commandName: 'snipe' });

    await snipeCommand.execute(interaction);

    expect(replies).toHaveLength(1);
    expect(replyFlags(replies[0])).toBe(V2);
    expect(replyV2Text(replies[0])).toContain('new content');
    expect(replyV2Text(replies[0])).toContain('#1 of 2');
    expect(replyButtonIds(replies[0])).toEqual([
      'snb:np:2',
      'snb:np:0 (disabled)',
      'snb:pg:1',
      'snb:cl',
    ]);
    expect(isEphemeral(replies[0])).toBe(false);
    expect(JSON.stringify(replies[0])).toContain('"parse":[]');
  });

  it('opens the nth deletion detail directly via index', async () => {
    configureSnipeQuery(
      fakeQuery(['m1', 'm2'], { m1: snap('m1', 'first'), m2: snap('m2', 'second') }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      ...singleOptions(2),
    });

    await snipeCommand.execute(interaction);

    expect(replyFlags(replies[0])).toBe(V2);
    expect(replyV2Text(replies[0])).toContain('second');
    expect(replyV2Text(replies[0])).toContain('#2 of 2');
    expect(replyButtonIds(replies[0])).toEqual([
      'snb:np:3 (disabled)',
      'snb:np:1',
      'snb:pg:1',
      'snb:cl',
    ]);
  });

  it('shows the empty state when nothing was deleted', async () => {
    configureSnipeQuery(fakeQuery([], {}));
    const { interaction, replies } = fakeChatInput({ commandName: 'snipe' });

    await snipeCommand.execute(interaction);

    expect(replyFlags(replies[0])).toBe(V2);
    expect(replyV2Text(replies[0])).toContain('Nothing to snipe here.');
  });

  it('denies guild members without ViewChannel and never queries', async () => {
    let listed = false;
    configureSnipeQuery(
      fakeQuery(['m1'], { m1: snap('m1', 'x') }, () => {
        listed = true;
      }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      memberPermissions: { has: () => false },
    });

    await snipeCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(listed).toBe(false);
  });

  it('allows DMs where member permissions are absent', async () => {
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'dm content') }));
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      guildId: null,
      memberPermissions: null,
    });

    await snipeCommand.execute(interaction);

    expect(replyV2Text(replies[0])).toContain('dm content');
  });

  it('skips contentless markers in the detail', async () => {
    configureSnipeQuery(
      fakeQuery(['ghost', 'empty', 'full'], {
        ghost: null,
        empty: snap('empty', '   '),
        full: snap('full', 'real content'),
      }),
    );
    const { interaction, replies } = fakeChatInput({ commandName: 'snipe' });

    await snipeCommand.execute(interaction);

    expect(replyV2Text(replies[0])).toContain('real content');
    expect(replyV2Text(replies[0])).toContain('#1 of 1');
  });

  it('reports how many are recoverable when index exceeds them', async () => {
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'only one') }));
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      ...singleOptions(5),
    });

    await snipeCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(JSON.stringify(replies[0])).toContain('Only 1');
  });

  it('fails closed when the query is not configured', async () => {
    const { interaction, replies } = fakeChatInput({ commandName: 'snipe' });

    await snipeCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('denies members lacking the allowlisted role without querying', async () => {
    let queried = false;
    configurePolicyQuery(
      stubPolicyPort({
        getPolicy: () => Promise.resolve({ snipeRoleIds: ['r-mod'], archivingEnabled: true }),
      }),
    );
    configureSnipeQuery({
      listDeletionsForChannel: () => {
        queried = true;
        return Promise.resolve([]);
      },
      findById: () => Promise.resolve(null),
    });
    const { interaction, replies } = fakeChatInput({ commandName: 'snipe' });

    await snipeCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(JSON.stringify(replies[0])).toContain('specific roles');
    expect(queried).toBe(false);
  });

  it('names a possible deleter in the detail view', async () => {
    configureSnipeQuery(
      fakeQuery(['m1'], { m1: snap('m1', 'gone') }, undefined, {}, {}, { m1: 'mod1' }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      client: { users: { cache: new Map([['mod1', { username: 'Moddy' }]]) } },
      ...singleOptions(1),
    });

    await snipeCommand.execute(interaction);

    expect(replyV2Text(replies[0])).toContain('possibly deleted by Moddy');
  });

  it('falls back to the executor id without a cached user', async () => {
    configureSnipeQuery(
      fakeQuery(['m1'], { m1: snap('m1', 'gone') }, undefined, {}, {}, { m1: 'mod1' }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      ...singleOptions(1),
    });

    await snipeCommand.execute(interaction);

    expect(replyV2Text(replies[0])).toContain('possibly deleted by mod1');
  });

  it('shows the author thumbnail when cached, else a text header', async () => {
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'ava test') }));
    const cached = fakeChatInput({
      commandName: 'snipe',
      client: {
        users: {
          cache: new Map([
            ['u1', { username: 'alice', displayAvatarURL: () => 'https://cdn/ava.png' }],
          ]),
        },
      },
    });
    await snipeCommand.execute(cached.interaction);
    expect(JSON.stringify(cached.replies[0])).toContain('https://cdn/ava.png');

    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'ava test') }));
    const { interaction, replies } = fakeChatInput({ commandName: 'snipe' });
    await snipeCommand.execute(interaction);
    expect(JSON.stringify(replies[0])).not.toContain('"type":9');
  });

  it('lists attachment filenames in the detail view', async () => {
    const withFile = toSnapshot(
      fakeMessage({
        id: 'm1',
        content: '',
        attachments: [
          {
            id: 'v1',
            name: 'voice-message.ogg',
            contentType: 'audio/ogg',
            size: 999,
            url: 'https://cdn/x/v.ogg',
            proxyURL: 'https://media/y/v.ogg',
            height: null,
            width: null,
            duration: 75,
            waveform: 'aGVsbG8=',
          },
        ],
      }),
    );
    configureSnipeQuery(fakeQuery(['m1'], { m1: withFile }));
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      ...singleOptions(1),
    });

    await snipeCommand.execute(interaction);

    expect(replyV2Text(replies[0])).toContain('voice-message.ogg');
  });

  it('summarizes reactions, embeds, stickers and polls in detail facts', async () => {
    const rich = toSnapshot(
      fakeMessage({
        id: 'm1',
        content: 'rich',
        reactions: {
          cache: new Collection([['👍', { emoji: { id: null, name: '👍' }, count: 3 }]]),
        },
        embeds: [{ toJSON: () => ({ title: 'Cool link' }) }],
        stickers: new Collection([['s1', { id: 's1' }]]),
        poll: {
          toJSON: () => ({
            question: { text: 'Best?' },
            answers: [{ id: 1, text: 'yes', vote_count: 7 }],
          }),
        },
      }),
    );
    configureSnipeQuery(fakeQuery(['m1'], { m1: rich }));
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      ...singleOptions(1),
    });

    await snipeCommand.execute(interaction);

    const text = replyV2Text(replies[0]);
    expect(text).toContain('Reactions: 3');
    expect(text).toContain('Embeds: 1');
    expect(text).toContain('Stickers: 1');
    expect(text).toContain('Poll: Best?');
  });
});

describe('snipe bulk browser', () => {
  const T0 = new Date('2026-05-01T00:00:00.000Z').getTime();
  const at = (sec: number): Date => new Date(T0 + sec * 1000);

  it('lists bulk groups with a jump select', async () => {
    configureSnipeQuery(
      fakeQuery(
        ['b1', 'b2'],
        { b1: snap('b1', 'first purged'), b2: snap('b2', 'second purged') },
        undefined,
        { b1: 'bulk', b2: 'bulk' },
        { b1: at(0), b2: at(0) },
      ),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      ...bulkOptions(),
    });

    await snipeCommand.execute(interaction);

    expect(replyFlags(replies[0])).toBe(V2);
    const text = replyV2Text(replies[0]);
    expect(text).toContain('Bulk Deletions');
    expect(text).toContain('first purged');
    expect(JSON.stringify(replies[0])).toContain('"custom_id":"snb:jb:1"');
    expect(isEphemeral(replies[0])).toBe(false);
    expect(JSON.stringify(replies[0])).toContain('"parse":[]');
  });

  it('opens the nth group directly via index', async () => {
    configureSnipeQuery(
      fakeQuery(
        ['n1', 's1', 'o1'],
        { n1: snap('n1', 'new purge'), s1: snap('s1', 'single'), o1: snap('o1', 'old purge') },
        undefined,
        { n1: 'bulk', s1: 'single', o1: 'bulk' },
        { n1: at(120), s1: at(60), o1: at(0) },
      ),
    );
    const second = fakeChatInput({ commandName: 'snipe', ...bulkOptions(2) });

    await snipeCommand.execute(second.interaction);

    expect(replyV2Text(second.replies[0])).toContain('old purge');
    expect(replyV2Text(second.replies[0])).toContain('group 2 of 2');
  });

  it('skips contentless members while counting the group', async () => {
    configureSnipeQuery(
      fakeQuery(['g1', 'ok1'], { g1: null, ok1: snap('ok1', 'kept') }, undefined, {
        g1: 'bulk',
        ok1: 'bulk',
      }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      ...bulkOptions(),
    });

    await snipeCommand.execute(interaction);

    expect(replyV2Text(replies[0])).toContain('1 message');
    expect(replyV2Text(replies[0])).toContain('kept');
  });

  it('caps the group detail at ten with a more-count', async () => {
    const ids = Array.from({ length: 12 }, (_, i) => `b${String(i)}`);
    const snaps: Record<string, MessageSnapshot | null> = {};
    const kinds: Record<string, string> = {};
    for (const [i, id] of ids.entries()) {
      snaps[id] = snap(id, `message ${String(i)}`);
      kinds[id] = 'bulk';
    }
    configureSnipeQuery(fakeQuery(ids, snaps, undefined, kinds));
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      ...bulkOptions(1),
    });

    await snipeCommand.execute(interaction);

    expect(replyV2Text(replies[0])).toContain('and 2 more');
  });

  it('shows the bulk empty state when no bulk deletions exist', async () => {
    configureSnipeQuery(fakeQuery(['s1'], { s1: snap('s1', 'single') }));
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      ...bulkOptions(),
    });

    await snipeCommand.execute(interaction);

    expect(replyFlags(replies[0])).toBe(V2);
    expect(replyV2Text(replies[0])).toContain('No bulk deletions here.');
  });

  it('reports group count when index exceeds groups', async () => {
    configureSnipeQuery(
      fakeQuery(['b1'], { b1: snap('b1', 'only group') }, undefined, { b1: 'bulk' }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'snipe',
      ...bulkOptions(4),
    });

    await snipeCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(JSON.stringify(replies[0])).toContain('Only 1');
  });
});

describe('groupBulkDeletions', () => {
  it('groups adjacent bulk rows within the window', () => {
    const at = (sec: number): Date =>
      new Date(new Date('2026-05-01T00:00:00.000Z').getTime() + sec * 1000);
    const rows = [
      { messageId: 'a', kind: 'bulk', observedAt: at(0), executorId: null },
      { messageId: 'b', kind: 'bulk', observedAt: at(30), executorId: null },
    ];
    expect(groupBulkDeletions(rows, BULK_WINDOW_MS)).toHaveLength(1);
  });

  it('ignores singles and splits gaps over the window', () => {
    const at = (sec: number): Date =>
      new Date(new Date('2026-05-01T00:00:00.000Z').getTime() + sec * 1000);
    const rows = [
      { messageId: 'n', kind: 'bulk', observedAt: at(120), executorId: null },
      { messageId: 's', kind: 'single', observedAt: at(60), executorId: null },
      { messageId: 'o', kind: 'bulk', observedAt: at(0), executorId: null },
    ];
    expect(groupBulkDeletions(rows, BULK_WINDOW_MS)).toHaveLength(2);
  });
});

describe('snb buttons', () => {
  it('pages the list in place with a jump select', async () => {
    const ids = Array.from({ length: 7 }, (_, i) => `m${String(i)}`);
    const snaps: Record<string, MessageSnapshot> = {};
    for (const [i, id] of ids.entries()) snaps[id] = snap(id, `msg ${String(i)}`);
    configureSnipeQuery(fakeQuery(ids, snaps));
    const { interaction, updated } = fakeButton('snb:pg:2');

    await handleSnipeButton(interaction, ['pg', '2']);

    expect(updated).toHaveLength(1);
    expect(replyV2Text(updated[0])).toContain('6–7 of 7');
    expect(JSON.stringify(updated[0])).toContain('"custom_id":"snb:jp:2"');
  });

  it('opens details from dt and returns to the list', async () => {
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'secret') }));
    const open = fakeButton('snb:dt:m1:1');
    await handleSnipeButton(open.interaction, ['dt', 'm1', '1']);
    expect(replyV2Text(open.updated[0])).toContain('secret');
    expect(replyButtonIds(open.updated[0])).toContain('snb:pg:1');

    const back = fakeButton('snb:bk:1');
    await handleSnipeButton(back.interaction, ['bk', '1']);
    expect(replyV2Text(back.updated[0])).toContain('Deleted Messages');
  });

  it('walks Older/Newer between details', async () => {
    configureSnipeQuery(
      fakeQuery(['m1', 'm2', 'm3'], {
        m1: snap('m1', 'first'),
        m2: snap('m2', 'second'),
        m3: snap('m3', 'third'),
      }),
    );
    const older = fakeButton('snb:np:2');
    await handleSnipeButton(older.interaction, ['np', '2']);
    expect(replyV2Text(older.updated[0])).toContain('second');
    expect(replyV2Text(older.updated[0])).toContain('#2 of 3');

    const newest = fakeButton('snb:np:1');
    await handleSnipeButton(newest.interaction, ['np', '1']);
    expect(replyV2Text(newest.updated[0])).toContain('first');

    const clamped = fakeButton('snb:np:99');
    await handleSnipeButton(clamped.interaction, ['np', '99']);
    expect(replyV2Text(clamped.updated[0])).toContain('third');
  });

  it('closes the browser', async () => {
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'x') }));
    const { interaction, updated } = fakeButton('snb:cl');

    await handleSnipeButton(interaction, ['cl']);

    expect(replyV2Text(updated[0])).toContain('closed');
  });

  it('pages bulk groups and opens group detail', async () => {
    const T0 = new Date('2026-05-01T00:00:00.000Z').getTime();
    const stamp = (sec: number): Date => new Date(T0 + sec * 1000);
    configureSnipeQuery(
      fakeQuery(
        ['n1', 'o1'],
        { n1: snap('n1', 'new purge'), o1: snap('o1', 'old purge') },
        undefined,
        { n1: 'bulk', o1: 'bulk' },
        { n1: stamp(120), o1: stamp(0) },
      ),
    );
    const list = fakeButton('snb:bg:1');
    await handleSnipeButton(list.interaction, ['bg', '1']);
    expect(replyV2Text(list.updated[0])).toContain('Bulk Deletions');

    const detail = fakeButton('snb:bd:2:1');
    await handleSnipeButton(detail.interaction, ['bd', '2', '1']);
    expect(replyV2Text(detail.updated[0])).toContain('old purge');
    expect(replyButtonIds(detail.updated[0])).toContain('snb:bg:1');
  });

  it('denies snapshots filed under another channel', async () => {
    const other = toSnapshot(fakeMessage({ id: 'm9', channelId: 'c9', content: 'v1' }));
    configureSnipeQuery(fakeQuery(['m9'], { m9: other }));
    const { interaction, replies } = fakeButton('snb:dt:m9:1');

    await handleSnipeButton(interaction, ['dt', 'm9', '1']);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('denies members lacking the allowlisted role', async () => {
    configurePolicyQuery(
      stubPolicyPort({
        getPolicy: () => Promise.resolve({ snipeRoleIds: ['r-mod'], archivingEnabled: true }),
      }),
    );
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'x') }));
    const { interaction, replies, updated } = fakeButton('snb:pg:1', { guildId: 'g1' });

    await handleSnipeButton(interaction, ['pg', '1']);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(updated).toHaveLength(0);
  });

  it('falls back to follow-up when update goes stale', async () => {
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'x') }));
    const { interaction, followedUp } = fakeButton('snb:pg:1', {
      update: () => Promise.reject(new Error('stale token')),
    });

    await handleSnipeButton(interaction, ['pg', '1']);

    expect(followedUp).toHaveLength(1);
  });

  it('rejects malformed actions with an error state', async () => {
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'x') }));
    const { interaction, replies } = fakeButton('snb:nope');

    await handleSnipeButton(interaction, ['nope']);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('fails closed when the query is not configured', async () => {
    const { interaction, replies } = fakeButton('snb:pg:1');

    await handleSnipeButton(interaction, ['pg', '1']);

    expect(isEphemeral(replies[0])).toBe(true);
  });
});

describe('snb jump selects', () => {
  it('jumps to the picked message detail', async () => {
    configureSnipeQuery(
      fakeQuery(['m1', 'm2', 'm3'], {
        m1: snap('m1', 'first'),
        m2: snap('m2', 'second'),
        m3: snap('m3', 'third'),
      }),
    );
    const { interaction, updated } = fakeSelect('snb:jp:1', 'm3');

    await handleSnipeSelect(interaction, ['jp', '1'], 'm3');

    expect(updated).toHaveLength(1);
    expect(replyV2Text(updated[0])).toContain('third');
    expect(replyV2Text(updated[0])).toContain('#3 of 3');
    expect(replyButtonIds(updated[0])).toContain('snb:pg:1');
  });

  it('jumps to the picked bulk group', async () => {
    const T0 = new Date('2026-05-01T00:00:00.000Z').getTime();
    const stamp = (sec: number): Date => new Date(T0 + sec * 1000);
    configureSnipeQuery(
      fakeQuery(
        ['n1', 'o1'],
        { n1: snap('n1', 'new purge'), o1: snap('o1', 'old purge') },
        undefined,
        { n1: 'bulk', o1: 'bulk' },
        { n1: stamp(120), o1: stamp(0) },
      ),
    );
    const { interaction, updated } = fakeSelect('snb:jb:1', '2');

    await handleSnipeSelect(interaction, ['jb', '1'], '2');

    expect(replyV2Text(updated[0])).toContain('old purge');
  });

  it('reports gone picks ephemerally', async () => {
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'x') }));
    const { interaction, replies } = fakeSelect('snb:jp:1', 'missing');

    await handleSnipeSelect(interaction, ['jp', '1'], 'missing');

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('rejects malformed select cursors', async () => {
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'x') }));
    const { interaction, replies } = fakeSelect('snb:jp:0', 'm1');

    await handleSnipeSelect(interaction, ['jp', '0'], 'm1');

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('denies picks without the allowlisted role', async () => {
    configurePolicyQuery(
      stubPolicyPort({
        getPolicy: () => Promise.resolve({ snipeRoleIds: ['r-mod'], archivingEnabled: true }),
      }),
    );
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'x') }));
    const { interaction, replies, updated } = fakeSelect('snb:jp:1', 'm1', { guildId: 'g1' });

    await handleSnipeSelect(interaction, ['jp', '1'], 'm1');

    expect(isEphemeral(replies[0])).toBe(true);
    expect(updated).toHaveLength(0);
  });

  it('falls back to follow-up when a select update goes stale', async () => {
    configureSnipeQuery(fakeQuery(['m1'], { m1: snap('m1', 'x') }));
    const { interaction, followedUp } = fakeSelect('snb:jp:1', 'm1', {
      update: () => Promise.reject(new Error('stale token')),
    });

    await handleSnipeSelect(interaction, ['jp', '1'], 'm1');

    expect(followedUp).toHaveLength(1);
  });
});
