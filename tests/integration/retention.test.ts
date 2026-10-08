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

const OLD = new Date('2026-01-01T00:00:00.000Z');
const NEW = new Date('2026-06-01T00:00:00.000Z');

function attachment(id: string): Record<string, unknown> {
  return {
    id,
    name: `${id}.png`,
    contentType: 'image/png',
    size: 10,
    url: `https://cdn/x/${id}.png`,
    proxyURL: `https://media/y/${id}.png`,
    height: null,
    width: null,
    duration: null,
    waveform: null,
  };
}

async function pathFor(repo: DrizzleMessageRepository, attachmentId: string): Promise<void> {
  const rows = await repo.listUnarchivedAttachments(100);
  const row = rows.find((r) => r.attachmentId === attachmentId);
  if (row === undefined) throw new Error(`no unarchived row for ${attachmentId}`);
  await repo.setAttachmentLocalPath(row.rowId, `g1/c1/m-old/${attachmentId}.png`);
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'snipebot-retention-'));
  __resetDbForTests();
  db = getDb(join(dir, 'test.db'));
  migrate(db, { migrationsFolder: './drizzle' });
  ensureSearchIndex(db);
});

afterEach(async () => {
  closeDb();
  __resetDbForTests();
  await rm(dir, { recursive: true, force: true });
});

describe('retention policies', () => {
  it('round-trips policies with null for unknown scopes', async () => {
    const repo = new DrizzleMessageRepository(db);
    await expect(repo.listRetentionPolicies()).resolves.toEqual([]);
    await repo.saveRetention('global', { keepDays: 30, keepRevisions: 5, mediaKeepDays: null });
    await repo.saveRetention('g1', {
      keepDays: null,
      keepRevisions: null,
      mediaKeepDays: 7,
    });
    expect(await repo.listRetentionPolicies()).toMatchObject([
      { scope: 'global', keepDays: 30 },
      { scope: 'g1', mediaKeepDays: 7 },
    ]);
    await repo.clearRetention('g1');
    expect((await repo.listRetentionPolicies()).map((p) => p.scope)).toEqual(['global']);
  });

  it('prunes old revisions and follows children without touching reactions', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    await service.ingestMessage(
      toSnapshot(
        fakeMessage({
          id: 'm-old',
          content: 'v1',
          createdAt: OLD,
          attachments: [attachment('a1')],
        }),
      ),
    );
    await service.recordEdit(
      toSnapshot(
        fakeMessage({
          id: 'm-old',
          content: 'v2',
          createdAt: OLD,
          editedAt: OLD,
          attachments: [attachment('a1')],
        }),
      ),
    );
    await service.recordEdit(
      toSnapshot(
        fakeMessage({
          id: 'm-old',
          content: 'v3',
          createdAt: OLD,
          editedAt: OLD,
          attachments: [attachment('a3')],
        }),
      ),
    );
    await pathFor(repo, 'a1');
    await pathFor(repo, 'a3');

    const result = await repo.pruneRevisions('g1', 1);

    expect(result.revisions).toBe(2);
    await expect(repo.countRevisions('m-old')).resolves.toBe(1);
    expect((await repo.findById('m-old'))?.content).toBe('v3');
    // Both a1 rows (rev1, rev2) are pruned while a3 (rev3) survives,
    // so only a1's file is released.
    expect(result.files).toEqual(['g1/c1/m-old/a1.png']);
  });

  it('expires old messages with cascades, events and file lists', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    await service.ingestMessage(
      toSnapshot(
        fakeMessage({
          id: 'm-old',
          content: 'old',
          createdAt: OLD,
          attachments: [attachment('a1')],
        }),
      ),
    );
    await service.recordDelete('m-old', 'c1', OLD);
    await service.ingestMessage(
      toSnapshot(fakeMessage({ id: 'm-new', content: 'new', createdAt: NEW })),
    );
    await pathFor(repo, 'a1');

    const result = await repo.expireMessages('g1', new Date('2026-03-01T00:00:00.000Z'));

    expect(result.messages).toEqual(['m-old']);
    expect(result.files).toEqual(['g1/c1/m-old/a1.png']);
    await expect(repo.findById('m-old')).resolves.toBeNull();
    await expect(repo.getDeletion('m-old')).resolves.toBeNull();
    expect((await repo.findById('m-new'))?.content).toBe('new');
  });

  it('expires media bytes while keeping metadata rows', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    await service.ingestMessage(
      toSnapshot(
        fakeMessage({
          id: 'm-old',
          content: 'old',
          createdAt: OLD,
          attachments: [attachment('a1')],
        }),
      ),
    );
    await pathFor(repo, 'a1');

    const result = await repo.expireMedia('g1', new Date('2026-03-01T00:00:00.000Z'));

    expect(result.rows).toBe(1);
    expect(result.files).toEqual(['g1/c1/m-old/a1.png']);
    expect((await repo.findById('m-old'))?.attachments[0]?.localPath).toBeNull();
  });

  it('lists active guild scopes including DMs', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    await service.ingestMessage(toSnapshot(fakeMessage({ id: 'm1', content: 'x' })));
    expect(await repo.listActiveGuildIds()).toEqual(['g1']);
  });
});
