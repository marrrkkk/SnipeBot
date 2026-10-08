import 'dotenv/config';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { loadConfig } from '../config/env.js';
import { closeDb, getDb } from '../database/connection.js';
import { ensureSearchIndex } from '../database/searchIndex.js';
import { restrictFileCreation } from '../security/files.js';
import { logger } from '../utils/logger.js';

/** Apply ./drizzle migrations to DATABASE_PATH (getDb also ensures the FTS index). */
function main(): void {
  restrictFileCreation();
  const config = loadConfig();
  const db = getDb(config.databasePath);
  migrate(db, { migrationsFolder: './drizzle' });
  ensureSearchIndex(db);
  logger.info('Migrations applied', { databasePath: config.databasePath });
  closeDb();
}

main();
