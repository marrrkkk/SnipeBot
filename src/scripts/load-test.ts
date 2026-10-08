import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { closeDb, getDb } from '../database/connection.js';
import { ensureSearchIndex } from '../database/searchIndex.js';
import { DrizzleMessageRepository } from '../repositories/drizzleMessageRepository.js';
import type { MessageSnapshot } from '../domain/messageSnapshot.js';

/**
 * Load characterization: ingest N synthetic snapshots into a temp DB and
 * report throughput + size. Usage: npm run load:test [count] (default 10000).
 * A tool, not a test — but it must run.
 */
function synthetic(id: number): MessageSnapshot {
  return {
    id: `load-${String(id)}`,
    guildId: 'g-load',
    channelId: 'c-load',
    threadId: null,
    channel: { id: 'c-load', kind: 0, name: 'load', parentId: null },
    author: { id: 'u-load', username: 'loader', discriminator: '0', bot: false, webhookId: null },
    createdAt: new Date(),
    messageType: 0,
    content: `load test message ${String(id)} with some searchable words docker archive`,
    editedAt: null,
    attachments: [],
    embeds: [],
    reactions: [],
    stickerIds: [],
    componentsRaw: [],
    poll: null,
    reference: null,
    snapshotOfForwarded: null,
    flags: 0,
    tts: false,
    pinned: false,
  };
}

async function main(): Promise<void> {
  const count = Math.min(100_000, Math.max(1, Number(process.argv[2] ?? 10_000)));
  if (!Number.isInteger(count)) throw new Error('count must be an integer');
  const dir = await mkdtemp(join(tmpdir(), 'snipebot-load-'));
  const path = join(dir, 'load.db');
  const db = getDb(path);
  migrate(db, { migrationsFolder: './drizzle' });
  ensureSearchIndex(db);
  const repo = new DrizzleMessageRepository(db);
  const start = Date.now();
  for (let i = 0; i < count; i += 1) {
    await repo.saveSnapshot(synthetic(i));
  }
  const seconds = (Date.now() - start) / 1000;
  const bytes = (await stat(path)).size;
  const revisions = await repo.countRevisions('load-0');
  console.log(
    `ingested=${String(count)} seconds=${seconds.toFixed(1)} ` +
      `perSecond=${String(Math.round(count / Math.max(seconds, 0.001)))} ` +
      `dbMB=${(bytes / 1_048_576).toFixed(1)} revisionsSample=${String(revisions)}`,
  );
  closeDb();
  await rm(dir, { recursive: true, force: true });
}

await main();
