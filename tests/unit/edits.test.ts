import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { toSnapshot } from '../../src/discord/mappers.js';
import type { MessageSnapshot } from '../../src/domain/messageSnapshot.js';
import {
  configureEditHistoryQuery,
  editsCommand,
  handleEditsButton,
  handleEditsSelect,
  resetEditHistoryQueryForTests,
  resolveEditedEntries,
  toWalker,
} from '../../src/commands/edits.js';
import type { RevisionView } from '../../src/repositories/drizzleMessageRepository.js';
import { renderWalkerPage } from '../../src/ui/renderers/editsBrowserV2.js';
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

function rev(revNo: number, content: string, editedAt: Date | null): RevisionView {
  return { revNo, content, editedAt, capturedAt: new Date(), flags: 0, tts: false, pinned: false };
}

function fakeHistory(
  entries: string[],
  revs: Record<string, RevisionView[]>,
  snaps: Record<string, MessageSnapshot | null>,
  onList?: () => void,
): Parameters<typeof configureEditHistoryQuery>[0] {
  return {
    listEditedMessages: (_channelId: string, _limit: number) => {
      onList?.();
      return Promise.resolve(entries.map((messageId) => ({ messageId, editedAt: new Date() })));
    },
    getRevisions: (messageId: string) => Promise.resolve(revs[messageId] ?? []),
    findById: (id: string) => Promise.resolve(snaps[id] ?? null),
  };
}

function snap(id: string, content: string): MessageSnapshot {
  return toSnapshot(fakeMessage({ id, content }));
}

function historyFor(
  id: string,
  versions: string[],
): { revs: RevisionView[]; snap: MessageSnapshot } {
  const base = new Date('2026-01-01T00:00:00.000Z').getTime();
  return {
    revs: versions.map((content, i) =>
      rev(i + 1, content, i === 0 ? null : new Date(base + i * 1000)),
    ),
    snap: snap(id, versions[versions.length - 1] ?? ''),
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
  resetEditHistoryQueryForTests();
  resetPolicyQueryForTests();
});

describe('edits command (V2 browser)', () => {
  it('opens the edited-messages browser on the happy path', async () => {
    const m1 = historyFor('m1', ['v1', 'v2']);
    const m2 = historyFor('m2', ['w1', 'w2', 'w3']);
    configureEditHistoryQuery(
      fakeHistory(['m2', 'm1'], { m1: m1.revs, m2: m2.revs }, { m1: m1.snap, m2: m2.snap }),
    );
    const { interaction, replies } = fakeChatInput({ commandName: 'edits' });

    await editsCommand.execute(interaction);

    expect(replies).toHaveLength(1);
    expect(replyFlags(replies[0])).toBe(V2);
    expect(replyV2Text(replies[0])).toContain('Edited Messages');
    expect(replyV2Text(replies[0])).toContain('w3');
    expect(replyV2Text(replies[0])).toContain('2 edits');
    expect(isEphemeral(replies[0])).toBe(false);
    expect(JSON.stringify(replies[0])).toContain('"parse":[]');
  });

  it('opens the nth walker directly via index', async () => {
    const m1 = historyFor('m1', ['v1', 'v2']);
    const m2 = historyFor('m2', ['w1', 'w2']);
    configureEditHistoryQuery(
      fakeHistory(['m1', 'm2'], { m1: m1.revs, m2: m2.revs }, { m1: m1.snap, m2: m2.snap }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'edits',
      options: { getInteger: (_name: string): number | null => 2 },
    });

    await editsCommand.execute(interaction);

    expect(replyFlags(replies[0])).toBe(V2);
    expect(replyV2Text(replies[0])).toContain('alice');
    expect(replyV2Text(replies[0])).toContain('w2');
    expect(replyV2Text(replies[0])).toContain('Revision 2 of 2');
  });

  it('shows the empty state when nothing was edited', async () => {
    configureEditHistoryQuery(fakeHistory([], {}, {}));
    const { interaction, replies } = fakeChatInput({ commandName: 'edits' });

    await editsCommand.execute(interaction);

    expect(replyFlags(replies[0])).toBe(V2);
    expect(replyV2Text(replies[0])).toContain('No edited messages here.');
  });

  it('denies guild members without ViewChannel and never queries', async () => {
    let listed = false;
    const m1 = historyFor('m1', ['v1', 'v2']);
    configureEditHistoryQuery(
      fakeHistory(['m1'], { m1: m1.revs }, { m1: m1.snap }, () => {
        listed = true;
      }),
    );
    const { interaction, replies } = fakeChatInput({
      commandName: 'edits',
      memberPermissions: { has: () => false },
    });

    await editsCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(listed).toBe(false);
  });

  it('allows DMs where member permissions are absent', async () => {
    const m1 = historyFor('m1', ['v1', 'v2']);
    configureEditHistoryQuery(fakeHistory(['m1'], { m1: m1.revs }, { m1: m1.snap }));
    const { interaction, replies } = fakeChatInput({
      commandName: 'edits',
      guildId: null,
      memberPermissions: null,
    });

    await editsCommand.execute(interaction);

    expect(replyV2Text(replies[0])).toContain('v2');
  });

  it('reports how many are available when index exceeds them', async () => {
    const m1 = historyFor('m1', ['v1', 'v2']);
    configureEditHistoryQuery(fakeHistory(['m1'], { m1: m1.revs }, { m1: m1.snap }));
    const { interaction, replies } = fakeChatInput({
      commandName: 'edits',
      options: { getInteger: (_name: string): number | null => 9 },
    });

    await editsCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(JSON.stringify(replies[0])).toContain('Only 1');
  });

  it('fails closed when the query is not configured', async () => {
    const { interaction, replies } = fakeChatInput({ commandName: 'edits' });

    await editsCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('denies members lacking the allowlisted role', async () => {
    configurePolicyQuery(
      stubPolicyPort({
        getPolicy: () => Promise.resolve({ snipeRoleIds: ['r-mod'], archivingEnabled: true }),
      }),
    );
    const m1 = historyFor('m1', ['v1', 'v2']);
    configureEditHistoryQuery(fakeHistory(['m1'], { m1: m1.revs }, { m1: m1.snap }));
    const { interaction, replies } = fakeChatInput({ commandName: 'edits' });

    await editsCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(JSON.stringify(replies[0])).toContain('specific roles');
  });
});

describe('revision walker (V2)', () => {
  it('renders pure walker pages with nav state', () => {
    const m1 = historyFor('m1', ['v1', 'v2', 'v3']);
    const walker = toWalker(
      { messageId: 'm1', snap: m1.snap, revs: m1.revs, editCount: 2, lastEdit: new Date() },
      2,
      '#general',
    );
    expect(walker).not.toBeNull();
    const reply = renderWalkerPage(walker ?? raise(), 1);
    expect(replyV2Text(reply)).toContain('v2');
    expect(replyV2Text(reply)).toContain('Revision 2 of 3');
    expect(replyButtonIds(reply)).toEqual(['edb:rv:m1:1:1', 'edb:rv:m1:3:1', 'edb:bk:1', 'edb:cl']);
    expect(
      toWalker(
        { messageId: 'm1', snap: m1.snap, revs: [], editCount: 0, lastEdit: new Date() },
        1,
        '#g',
      ),
    ).toBeNull();
  });

  it('disables Older on the first revision and Newer on the last', () => {
    const m1 = historyFor('m1', ['v1', 'v2']);
    const first = toWalker(
      { messageId: 'm1', snap: m1.snap, revs: m1.revs, editCount: 1, lastEdit: new Date() },
      1,
      '#g',
    );
    expect(replyButtonIds(renderWalkerPage(first ?? raise(), 1))).toEqual([
      'edb:rv:m1:0:1 (disabled)',
      'edb:rv:m1:2:1',
      'edb:bk:1',
      'edb:cl',
    ]);
  });

  it('resolves entries newest-first for the list', async () => {
    const m1 = historyFor('m1', ['v1', 'v2']);
    const port = fakeHistory(['m1'], { m1: m1.revs }, { m1: m1.snap });
    const entries = await resolveEditedEntries(port, 'c1');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.editCount).toBe(1);
  });
});

function raise(): never {
  throw new Error('expected non-null walker in test');
}

describe('edb buttons', () => {
  it('pages the list in place', async () => {
    const ids = Array.from({ length: 7 }, (_, i) => `e${String(i)}`);
    const revs: Record<string, RevisionView[]> = {};
    const snaps: Record<string, MessageSnapshot> = {};
    for (const [i, id] of ids.entries()) {
      const h = historyFor(id, [`v${String(i)}a`, `v${String(i)}b`]);
      revs[id] = h.revs;
      snaps[id] = h.snap;
    }
    configureEditHistoryQuery(fakeHistory(ids, revs, snaps));
    const { interaction, updated } = fakeButton('edb:pg:2');

    await handleEditsButton(interaction, ['pg', '2']);

    expect(updated).toHaveLength(1);
    expect(replyV2Text(updated[0])).toContain('6–7 of 7');
  });

  it('opens the walker and walks Older/Newer', async () => {
    const m1 = historyFor('m1', ['v1', 'v2', 'v3']);
    configureEditHistoryQuery(fakeHistory(['m1'], { m1: m1.revs }, { m1: m1.snap }));
    const open = fakeButton('edb:dt:m1:1');
    await handleEditsButton(open.interaction, ['dt', 'm1', '1']);
    expect(replyV2Text(open.updated[0])).toContain('Revision 3 of 3');

    const older = fakeButton('edb:rv:m1:2:1');
    await handleEditsButton(older.interaction, ['rv', 'm1', '2', '1']);
    expect(replyV2Text(older.updated[0])).toContain('Revision 2 of 3');
    expect(replyV2Text(older.updated[0])).toContain('v2');

    const back = fakeButton('edb:bk:1');
    await handleEditsButton(back.interaction, ['bk', '1']);
    expect(replyV2Text(back.updated[0])).toContain('Edited Messages');
  });

  it('jumps to the picked walker from the list select', async () => {
    const m1 = historyFor('m1', ['v1', 'v2']);
    configureEditHistoryQuery(fakeHistory(['m1'], { m1: m1.revs }, { m1: m1.snap }));
    const { interaction, updated } = fakeSelect('edb:jp:1', 'm1');

    await handleEditsSelect(interaction, ['jp', '1'], 'm1');

    expect(updated).toHaveLength(1);
    expect(replyV2Text(updated[0])).toContain('Revision 2 of 2');
    expect(replyButtonIds(updated[0])).toContain('edb:bk:1');
  });

  it('reports gone picks from the select ephemerally', async () => {
    configureEditHistoryQuery(fakeHistory([], {}, {}));
    const { interaction, replies } = fakeSelect('edb:jp:1', 'missing');

    await handleEditsSelect(interaction, ['jp', '1'], 'missing');

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('shows the author thumbnail when cached', async () => {
    const m1 = historyFor('m1', ['v1', 'v2']);
    configureEditHistoryQuery(fakeHistory(['m1'], { m1: m1.revs }, { m1: m1.snap }));
    const cached = fakeButton('edb:dt:m1:1', {
      client: {
        users: {
          cache: new Map([['u1', { displayAvatarURL: () => 'https://cdn/ava.png' }]]),
        },
      },
    });
    await handleEditsButton(cached.interaction, ['dt', 'm1', '1']);
    expect(JSON.stringify(cached.updated[0])).toContain('https://cdn/ava.png');

    const { interaction, updated } = fakeButton('edb:dt:m1:1');
    await handleEditsButton(interaction, ['dt', 'm1', '1']);
    expect(JSON.stringify(updated[0])).not.toContain('"type":9');
  });

  it('closes the browser', async () => {
    const m1 = historyFor('m1', ['v1', 'v2']);
    configureEditHistoryQuery(fakeHistory(['m1'], { m1: m1.revs }, { m1: m1.snap }));
    const { interaction, updated } = fakeButton('edb:cl');

    await handleEditsButton(interaction, ['cl']);

    expect(replyV2Text(updated[0])).toContain('closed');
  });

  it('rejects malformed button ids ephemerally', async () => {
    configureEditHistoryQuery(fakeHistory([], {}, {}));
    const { interaction, replies } = fakeButton('edb:nope');

    await handleEditsButton(interaction, ['nope']);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('denies snapshots filed under another channel', async () => {
    const other = toSnapshot(fakeMessage({ id: 'm9', channelId: 'c9', content: 'v1' }));
    configureEditHistoryQuery(fakeHistory(['m9'], { m9: [rev(1, 'v1', null)] }, { m9: other }));
    const { interaction, replies } = fakeButton('edb:dt:m9:1');

    await handleEditsButton(interaction, ['dt', 'm9', '1']);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('reports gone histories ephemerally', async () => {
    configureEditHistoryQuery(fakeHistory([], {}, {}));
    const { interaction, replies } = fakeButton('edb:dt:m1:1');

    await handleEditsButton(interaction, ['dt', 'm1', '1']);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('falls back to follow-up when update goes stale', async () => {
    const m1 = historyFor('m1', ['v1', 'v2']);
    configureEditHistoryQuery(fakeHistory(['m1'], { m1: m1.revs }, { m1: m1.snap }));
    const { interaction, updated, followedUp } = fakeButton('edb:pg:1', {
      update: (): Promise<void> => Promise.reject(new Error('stale token')),
    });

    await handleEditsButton(interaction, ['pg', '1']);

    expect(updated).toHaveLength(0);
    expect(followedUp).toHaveLength(1);
  });

  it('fails closed when the query is not configured', async () => {
    const { interaction, replies } = fakeButton('edb:pg:1');

    await handleEditsButton(interaction, ['pg', '1']);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('denies members lacking the allowlisted role', async () => {
    configurePolicyQuery(
      stubPolicyPort({
        getPolicy: () => Promise.resolve({ snipeRoleIds: ['r-mod'], archivingEnabled: true }),
      }),
    );
    const m1 = historyFor('m1', ['v1', 'v2']);
    configureEditHistoryQuery(fakeHistory(['m1'], { m1: m1.revs }, { m1: m1.snap }));
    const { interaction, replies, updated } = fakeButton('edb:pg:1', { guildId: 'g1' });

    await handleEditsButton(interaction, ['pg', '1']);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(updated).toHaveLength(0);
  });
});
