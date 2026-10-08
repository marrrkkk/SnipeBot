import { Collection } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  backfillCommand,
  configureBackfillQuery,
  resetBackfillQueryForTests,
} from '../../src/commands/backfill.js';
import type { BackfillPort } from '../../src/repositories/drizzleMessageRepository.js';
import { fakeMessage } from './helpers/fakes.js';
import { isEphemeral } from './helpers/interactions.js';

function pageMessages(ids: string[]): Collection<string, ReturnType<typeof fakeMessage>> {
  return new Collection(
    ids.map((id) => [id, fakeMessage({ id, channelId: 'c1', content: `msg ${id}` })]),
  );
}

function fakeChannel(
  pages: string[][],
  calls: { before?: string }[] = [],
  failWith: Error | null = null,
): unknown {
  const byBefore = new Map<string, string[]>();
  pages.forEach((ids, i) => {
    if (i === 0) {
      byBefore.set('start', ids);
      return;
    }
    const prev = pages[i - 1];
    const last = prev === undefined ? undefined : prev[prev.length - 1];
    byBefore.set(last ?? 'start', ids);
  });
  return {
    id: 'c1',
    messages: {
      fetch: (opts: { limit: number; before?: string }): Promise<Collection<string, unknown>> => {
        calls.push({ ...opts });
        if (failWith !== null) return Promise.reject(failWith);
        const ids = byBefore.get(opts.before ?? 'start') ?? [];
        return Promise.resolve(pageMessages(ids) as unknown as Collection<string, unknown>);
      },
    },
  };
}

function ids(count: number, start: number): string[][] {
  const all = Array.from({ length: count }, (_, i) => String(start - i).padStart(4, '0'));
  const pages: string[][] = [];
  for (let i = 0; i < all.length; i += 100) {
    pages.push(all.slice(i, i + 100));
  }
  return pages;
}

function fakeBackfill(overrides: Record<string, unknown> = {}): {
  interaction: ChatInputCommandInteraction;
  deferred: boolean;
  edits: unknown[];
  replies: unknown[];
} {
  let deferred = false;
  const edits: unknown[] = [];
  const replies: unknown[] = [];
  const base = {
    commandName: 'backfill',
    channelId: 'c1',
    guildId: 'g1',
    memberPermissions: { has: () => true },
    client: { channels: { fetch: () => Promise.resolve(fakeChannel([[]])) } },
    options: { getInteger: (_name: string): number | null => null },
    deferReply: (_opts: unknown): Promise<void> => {
      deferred = true;
      return Promise.resolve();
    },
    editReply: (args: unknown): Promise<void> => {
      edits.push(args);
      return Promise.resolve();
    },
    reply: (args: unknown): Promise<void> => {
      replies.push(args);
      return Promise.resolve();
    },
    ...overrides,
  };
  return {
    interaction: base as unknown as ChatInputCommandInteraction,
    get deferred() {
      return deferred;
    },
    edits,
    replies,
  };
}

function fakePort(
  behavior: (snaps: { id: string }[]) => { imported: number; skipped: number } = (snaps) => ({
    imported: snaps.length,
    skipped: 0,
  }),
): BackfillPort {
  return {
    importSnapshots: (snaps) => Promise.resolve(behavior(snaps.map((s) => ({ id: s.id })))),
  };
}

beforeEach(() => {
  resetBackfillQueryForTests();
});

describe('backfill command', () => {
  it('imports across pages sliced exactly to the limit', async () => {
    configureBackfillQuery(fakePort());
    const fetchCalls: { before?: string }[] = [];
    const { interaction, edits } = fakeBackfill({
      client: {
        channels: { fetch: () => Promise.resolve(fakeChannel(ids(300, 9999), fetchCalls)) },
      },
      options: { getInteger: () => 250 },
    });

    await backfillCommand.execute(interaction);

    expect(fetchCalls).toHaveLength(3);
    expect(JSON.stringify(edits[0])).toContain('Imported 250 new');
    expect(JSON.stringify(edits[0])).toContain('3 pages');
  });

  it('stops at exhaustion below the limit', async () => {
    configureBackfillQuery(fakePort());
    const { interaction, edits } = fakeBackfill({
      client: { channels: { fetch: () => Promise.resolve(fakeChannel(ids(30, 9999))) } },
    });

    await backfillCommand.execute(interaction);

    expect(JSON.stringify(edits[0])).toContain('Imported 30 new');
  });

  it('counts known messages as skipped', async () => {
    configureBackfillQuery(fakePort((snaps) => ({ imported: 0, skipped: snaps.length })));
    const { interaction, edits } = fakeBackfill({
      client: { channels: { fetch: () => Promise.resolve(fakeChannel(ids(100, 9999))) } },
    });

    await backfillCommand.execute(interaction);

    expect(JSON.stringify(edits[0])).toContain('skipped 100 known');
  });

  it('skips unmappable messages without aborting', async () => {
    configureBackfillQuery(fakePort());
    const bad = { notAnId: true };
    const { interaction, edits } = fakeBackfill({
      client: {
        channels: {
          fetch: () =>
            Promise.resolve({
              id: 'c1',
              messages: {
                fetch: () =>
                  Promise.resolve(
                    new Collection<string, unknown>([
                      ['1', fakeMessage({ id: '0001', channelId: 'c1', content: 'ok' })],
                      ['x', bad],
                    ]) as unknown as Collection<string, ReturnType<typeof fakeMessage>>,
                  ),
              },
            }),
        },
      },
    });

    await backfillCommand.execute(interaction);

    expect(JSON.stringify(edits[0])).toContain('Imported 1 new');
    expect(JSON.stringify(edits[0])).toContain('skipped 1 known');
  });

  it('reports partial progress when fetching fails', async () => {
    configureBackfillQuery(fakePort());
    const { interaction, edits } = fakeBackfill({
      client: {
        channels: {
          fetch: () =>
            Promise.resolve({
              id: 'c1',
              messages: {
                fetch: (): Promise<never> => Promise.reject(new Error('Missing Access')),
              },
            }),
        },
      },
    });

    await backfillCommand.execute(interaction);

    expect(JSON.stringify(edits[0])).toContain('before failing');
  });

  it('reports when the channel cannot be opened', async () => {
    configureBackfillQuery(fakePort());
    const { interaction, edits } = fakeBackfill({
      client: {
        channels: {
          fetch: () => Promise.reject(new Error('Missing Access')),
        },
      },
    });

    await backfillCommand.execute(interaction);

    expect(JSON.stringify(edits[0])).toContain('Could not open');
  });

  it('denies members without Manage Server', async () => {
    let fetched = false;
    configureBackfillQuery(fakePort());
    const { interaction, replies } = fakeBackfill({
      memberPermissions: { has: () => false },
      client: {
        channels: {
          fetch: () => {
            fetched = true;
            return Promise.resolve(fakeChannel([[]]));
          },
        },
      },
    });

    await backfillCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
    expect(fetched).toBe(false);
  });

  it('denies use outside servers', async () => {
    configureBackfillQuery(fakePort());
    const { interaction, replies } = fakeBackfill({ guildId: null });

    await backfillCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });

  it('fails closed when the query is not configured', async () => {
    const { interaction, replies } = fakeBackfill();

    await backfillCommand.execute(interaction);

    expect(isEphemeral(replies[0])).toBe(true);
  });
});
