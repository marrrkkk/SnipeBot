import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { ensureSearchIndex } from './searchIndex.js';

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

let db: Db | null = null;
let sqlite: Database.Database | null = null;

/** Open (or reuse) the SQLite DB with self-host-safe pragmas. */
export function getDb(path: string): Db {
  if (db !== null) return db;
  sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite, { schema });
  ensureSearchIndex(db);
  return db;
}

/** Flush + close the DB. Used on shutdown and between integration tests. */
export function closeDb(): void {
  sqlite?.close();
  sqlite = null;
  db = null;
}

/** Test hook: reset singleton between tests. */
export function __resetDbForTests(): void {
  db = null;
  sqlite = null;
}
