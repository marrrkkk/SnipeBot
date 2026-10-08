import type { Db } from './connection.js';

// FTS5 external-content index over message_revisions. Virtual tables and
// triggers can't be expressed in drizzle's schema builder, so this DDL
// lives beside it and runs idempotently on every open (see ensureSearchIndex).

const DDL: string[] = [
  `CREATE VIRTUAL TABLE IF NOT EXISTS message_fts USING fts5(
    content,
    message_id UNINDEXED,
    rev_no UNINDEXED,
    content='message_revisions',
    content_rowid='id'
  )`,
  `CREATE TRIGGER IF NOT EXISTS message_fts_ai AFTER INSERT ON message_revisions BEGIN
    INSERT INTO message_fts(rowid, content, message_id, rev_no)
    VALUES (new.id, new.content, new.message_id, new.rev_no);
  END`,
  `CREATE TRIGGER IF NOT EXISTS message_fts_ad AFTER DELETE ON message_revisions BEGIN
    INSERT INTO message_fts(message_fts, rowid, content, message_id, rev_no)
    VALUES ('delete', old.id, old.content, old.message_id, old.rev_no);
  END`,
  `CREATE TRIGGER IF NOT EXISTS message_fts_au AFTER UPDATE ON message_revisions BEGIN
    INSERT INTO message_fts(message_fts, rowid, content, message_id, rev_no)
    VALUES ('delete', old.id, old.content, old.message_id, old.rev_no);
    INSERT INTO message_fts(rowid, content, message_id, rev_no)
    VALUES (new.id, new.content, new.message_id, new.rev_no);
  END`,
];

function countRows(client: Db['$client'], table: string): number {
  const row: unknown = client.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
  if (typeof row !== 'object' || row === null) return 0;
  const count = (row as { count?: unknown }).count;
  return typeof count === 'number' ? count : 0;
}

function tableExists(client: Db['$client'], table: string): boolean {
  const row: unknown = client
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table);
  return typeof row === 'object' && row !== null;
}

/** Create the index + triggers; backfill once when the index is empty. */
export function ensureSearchIndex(db: Db): void {
  const client = db.$client;
  // getDb runs before migrations on fresh installs; the migrate step (and
  // test setups) call this again after migrating.
  if (!tableExists(client, 'message_revisions')) return;
  for (const statement of DDL) {
    client.exec(statement);
  }
  if (countRows(client, 'message_fts') === 0 && countRows(client, 'message_revisions') > 0) {
    client.exec(`INSERT INTO message_fts(message_fts) VALUES('rebuild')`);
  }
}
