import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toSnapshot } from '../../src/discord/mappers.js';
import { __resetDbForTests, closeDb, getDb, type Db } from '../../src/database/connection.js';
import { ensureSearchIndex } from '../../src/database/searchIndex.js';
import { DrizzleMessageRepository } from '../../src/repositories/drizzleMessageRepository.js';
import { createDrizzleArchiveService } from '../../src/services/drizzleArchiveService.js';
import { fakeMessage } from '../unit/helpers/fakes.js';

let dir: string;
let db: Db;

const D = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

function msg(
  id: string,
  content: string,
  overrides: Record<string, unknown> = {},
): ReturnType<typeof toSnapshot> {
  return toSnapshot(fakeMessage({ id, content, ...overrides }));
}

async function seed(): Promise<void> {
  const service = createDrizzleArchiveService(db);
  await service.ingestMessage(
    msg('m1', 'docker compose setup guide', {
      channelId: 'c1',
      author: { id: 'u1', username: 'alice', discriminator: '0', bot: false },
      createdAt: D('2026-01-10'),
    }),
  );
  await service.recordEdit(
    toSnapshot(
      fakeMessage({
        id: 'm1',
        channelId: 'c1',
        content: 'docker compose setup guide v2',
        author: { id: 'u1', username: 'alice', discriminator: '0', bot: false },
        createdAt: D('2026-01-10'),
        editedAt: D('2026-01-11'),
      }),
    ),
  );
  await service.ingestMessage(
    msg('m2', 'docker swarm vs kubernetes', {
      channelId: 'c1',
      author: { id: 'u2', username: 'bob', discriminator: '0', bot: false },
      createdAt: D('2026-02-20'),
    }),
  );
  await service.ingestMessage(
    msg('m3', 'docker networking deep dive', {
      channelId: 'c2',
      author: { id: 'u1', username: 'alice', discriminator: '0', bot: false },
      createdAt: D('2026-03-05'),
    }),
  );
  await service.ingestMessage(
    msg('m4', 'unrelated cooking recipes', {
      channelId: 'c1',
      author: { id: 'u1', username: 'alice', discriminator: '0', bot: false },
      createdAt: D('2026-01-15'),
    }),
  );
  await service.ingestMessage(
    msg('m5', 'dockerfile for the app', {
      channelId: 'c1',
      author: { id: 'u1', username: 'alice', discriminator: '0', bot: false },
      createdAt: D('2026-02-01'),
      attachments: [
        {
          id: 'a1',
          name: 'Dockerfile',
          contentType: 'text/plain',
          size: 100,
          url: 'https://cdn/x/Dockerfile',
          proxyURL: 'https://media/y/Dockerfile',
          height: null,
          width: null,
          duration: null,
          waveform: null,
        },
      ],
    }),
  );
  await service.ingestMessage(
    msg('m6', 'lunch poll', {
      channelId: 'c1',
      author: { id: 'u2', username: 'bob', discriminator: '0', bot: false },
      createdAt: D('2026-02-02'),
      poll: { toJSON: () => ({ question: { text: 'lunch?' }, answers: [] }) },
    }),
  );
  await service.ingestMessage(
    msg('m7', 'docker deleted note', {
      channelId: 'c1',
      author: { id: 'u1', username: 'alice', discriminator: '0', bot: false },
      createdAt: D('2026-01-20'),
    }),
  );
  await service.recordDelete('m7', 'c1', D('2026-01-21'));
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'snipebot-search-'));
  __resetDbForTests();
  db = getDb(join(dir, 'test.db'));
  migrate(db, { migrationsFolder: './drizzle' });
  ensureSearchIndex(db);
  await seed();
});

afterEach(async () => {
  closeDb();
  __resetDbForTests();
  await rm(dir, { recursive: true, force: true });
});

describe('archive search', () => {
  it('matches text within the channel', async () => {
    const repo = new DrizzleMessageRepository(db);
    const hits = await repo.searchMessages({ text: 'docker', channelId: 'c1' });
    expect(hits.map((h) => h.messageId)).toEqual(expect.arrayContaining(['m1', 'm2', 'm5']));
    expect(hits.map((h) => h.messageId)).not.toContain('m3');
    expect(hits.map((h) => h.messageId)).not.toContain('m4');
  });

  it('returns nothing without a match', async () => {
    const repo = new DrizzleMessageRepository(db);
    await expect(repo.searchMessages({ text: 'zookeeper', channelId: 'c1' })).resolves.toEqual([]);
  });

  it('dedupes multiple matching revisions per message', async () => {
    const repo = new DrizzleMessageRepository(db);
    const hits = await repo.searchMessages({ text: 'docker compose', channelId: 'c1' });
    expect(hits.filter((h) => h.messageId === 'm1')).toHaveLength(1);
  });

  it('filters by author', async () => {
    const repo = new DrizzleMessageRepository(db);
    const hits = await repo.searchMessages({ text: 'docker', channelId: 'c1', authorId: 'u2' });
    expect(hits.map((h) => h.messageId)).toEqual(['m2']);
  });

  it('scopes to the channel', async () => {
    const repo = new DrizzleMessageRepository(db);
    const hits = await repo.searchMessages({ text: 'docker', channelId: 'c2' });
    expect(hits.map((h) => h.messageId)).toEqual(['m3']);
  });

  it('filters by date range', async () => {
    const repo = new DrizzleMessageRepository(db);
    const after = await repo.searchMessages({ channelId: 'c1', after: D('2026-02-01') });
    expect(after.map((h) => h.messageId).sort()).toEqual(['m2', 'm5', 'm6']);
    const before = await repo.searchMessages({ channelId: 'c1', before: D('2026-02-01') });
    expect(before.map((h) => h.messageId).sort()).toEqual(['m1', 'm4', 'm5', 'm7']);
  });

  it('filters by attachments and polls without text', async () => {
    const repo = new DrizzleMessageRepository(db);
    const files = await repo.searchMessages({ channelId: 'c1', hasAttachment: true });
    expect(files.map((h) => h.messageId)).toEqual(['m5']);
    const polls = await repo.searchMessages({ channelId: 'c1', hasPoll: true });
    expect(polls.map((h) => h.messageId)).toEqual(['m6']);
  });

  it('filters by deletion state', async () => {
    const repo = new DrizzleMessageRepository(db);
    const gone = await repo.searchMessages({ text: 'docker', channelId: 'c1', deleted: true });
    expect(gone.map((h) => h.messageId)).toEqual(['m7']);
    const kept = await repo.searchMessages({ text: 'docker', channelId: 'c1', deleted: false });
    expect(kept.map((h) => h.messageId)).toEqual(expect.arrayContaining(['m1', 'm2']));
    expect(kept.map((h) => h.messageId)).not.toContain('m7');
  });

  it('treats special characters literally without MATCH errors', async () => {
    const repo = new DrizzleMessageRepository(db);
    await expect(
      repo.searchMessages({ text: 'kuber*netes (test) "quoted"', channelId: 'c1' }),
    ).resolves.toEqual([]);
  });

  it('rejects empty queries', () => {
    const repo = new DrizzleMessageRepository(db);
    expect(() => repo.searchMessages({ channelId: 'c1' })).toThrow(/requires/);
  });
});
