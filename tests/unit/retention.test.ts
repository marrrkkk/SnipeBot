import { describe, expect, it } from 'vitest';
import { createRetentionRunner } from '../../src/services/retention.js';
import type { RetentionPolicy } from '../../src/repositories/drizzleMessageRepository.js';
import type { MediaStorage } from '../../src/storage/types.js';

type StoreCalls = {
  prune: { guildId: string | null; keep: number }[];
  expireMessages: { guildId: string | null; at: Date }[];
  expireMedia: { guildId: string | null; at: Date }[];
};

function fakeStore(
  policies: RetentionPolicy[],
  guildIds: (string | null)[],
  failPruneFor?: string,
): { store: Parameters<typeof createRetentionRunner>[0]['store']; calls: StoreCalls } {
  const calls: StoreCalls = { prune: [], expireMessages: [], expireMedia: [] };
  return {
    calls,
    store: {
      listRetentionPolicies: () => Promise.resolve(policies),
      listActiveGuildIds: () => Promise.resolve(guildIds),
      pruneRevisions: (guildId, keep) => {
        if (guildId === failPruneFor) return Promise.reject(new Error('db locked'));
        calls.prune.push({ guildId, keep });
        return Promise.resolve({ revisions: 2, files: [`${guildId ?? 'dm'}/old.bin`] });
      },
      expireMessages: (guildId, olderThan) => {
        calls.expireMessages.push({ guildId, at: olderThan });
        return Promise.resolve({ messages: ['m1'], files: [] });
      },
      expireMedia: (guildId, olderThan) => {
        calls.expireMedia.push({ guildId, at: olderThan });
        return Promise.resolve({ rows: 0, files: [] });
      },
      listLocalPaths: () => Promise.resolve(['g1/c1/m1/kept.bin']),
    },
  };
}

function fakeStorage(entries: { key: string; mtimeMs: number }[] = []): {
  storage: MediaStorage;
  deleted: string[];
} {
  const deleted: string[] = [];
  return {
    deleted,
    storage: {
      put: () => Promise.resolve({ path: '', sizeBytes: 0, contentType: null }),
      get: () => Promise.resolve(null),
      exists: () => Promise.resolve(false),
      delete: (key: string) => {
        deleted.push(key);
        return Promise.resolve();
      },
      listEntries: () => Promise.resolve(entries),
    },
  };
}

const OLD = 0;
const FRESH = Date.now();

describe('retention runner', () => {
  it('applies guild policies over global and unlinks phase files', async () => {
    const { store, calls } = fakeStore(
      [
        { scope: 'global', keepDays: null, keepRevisions: 5, mediaKeepDays: null },
        { scope: 'g1', keepDays: 30, keepRevisions: null, mediaKeepDays: 7 },
      ],
      ['g1', null],
    );
    const { storage, deleted } = fakeStorage();
    const runner = createRetentionRunner({ store, storage });

    const summary = await runner.runOnce();

    expect(calls.prune).toEqual([
      { guildId: 'g1', keep: 5 },
      { guildId: null, keep: 5 },
    ]);
    expect(calls.expireMessages).toHaveLength(1);
    expect(calls.expireMessages[0]?.guildId).toBe('g1');
    const thirtyDays = 30 * 86400_000;
    expect(
      Math.abs((calls.expireMessages[0]?.at.getTime() ?? 0) - (Date.now() - thirtyDays)),
    ).toBeLessThan(60_000);
    expect(calls.expireMedia.map((c) => c.guildId)).toEqual(['g1']);
    expect(deleted).toContain('g1/old.bin');
    expect(summary).toMatchObject({
      guilds: 2,
      revisionsPruned: 4,
      messagesExpired: 1,
    });
  });

  it('skips scopes with no applicable policy', async () => {
    const { store, calls } = fakeStore([], ['g9']);
    const { storage } = fakeStorage();
    const runner = createRetentionRunner({ store, storage });

    const summary = await runner.runOnce();

    expect(calls.prune).toEqual([]);
    expect(calls.expireMessages).toEqual([]);
    expect(summary.guilds).toBe(0);
  });

  it('deletes only old unreferenced orphans', async () => {
    const { store } = fakeStore([], []);
    const { storage, deleted } = fakeStorage([
      { key: 'g1/c1/m1/kept.bin', mtimeMs: OLD },
      { key: 'stale.bin', mtimeMs: OLD },
      { key: 'fresh.bin', mtimeMs: FRESH },
    ]);
    const runner = createRetentionRunner({ store, storage });

    const summary = await runner.runOnce();

    expect(deleted).toEqual(['stale.bin']);
    expect(summary.orphansRemoved).toBe(1);
  });

  it('skips the orphan pass without listing support', async () => {
    const { store } = fakeStore([], []);
    const { storage } = fakeStorage();
    const bare = { ...storage };
    delete (bare as { listEntries?: unknown }).listEntries;
    const runner = createRetentionRunner({ store, storage: bare });

    const summary = await runner.runOnce();

    expect(summary.orphansRemoved).toBe(0);
  });

  it('isolates per-scope failures', async () => {
    const { store, calls } = fakeStore(
      [{ scope: 'global', keepDays: null, keepRevisions: 5, mediaKeepDays: null }],
      ['g1', 'g2'],
      'g1',
    );
    const { storage } = fakeStorage();
    const runner = createRetentionRunner({ store, storage });

    const summary = await runner.runOnce();

    expect(calls.prune.map((c) => c.guildId)).toEqual(['g2']);
    expect(summary.guilds).toBe(1);
    expect(summary.revisionsPruned).toBe(2);
  });
});
