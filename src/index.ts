import 'dotenv/config';
import { loadConfig } from './config/env.js';
import { configureBackfillQuery } from './commands/backfill.js';
import { configureStatsQuery } from './commands/stats.js';
import { configureEditHistoryQuery } from './commands/edits.js';
import { configurePolicyQuery } from './commands/policy.js';
import { configureSearchQuery } from './commands/search.js';
import { configureSnipeQuery } from './commands/snipe.js';
import { closeDb, getDb } from './database/connection.js';
import { createClient } from './discord/client.js';
import { registerEvents } from './events/index.js';
import { DrizzleMessageRepository } from './repositories/drizzleMessageRepository.js';
import { createDrizzleArchiveService } from './services/drizzleArchiveService.js';
import { createMediaArchiver } from './services/mediaArchiver.js';
import { createRetentionRunner } from './services/retention.js';
import { increment } from './observability/metrics.js';
import { restrictFileCreation } from './security/files.js';
import { LocalMediaStorage } from './storage/localStorage.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  restrictFileCreation();
  const config = loadConfig();
  const db = getDb(config.databasePath);
  const client = createClient();
  const repo = new DrizzleMessageRepository(db);
  configureSnipeQuery(repo);
  configureEditHistoryQuery(repo);
  configureSearchQuery(repo);
  configureBackfillQuery(repo);
  configureStatsQuery(repo);
  configurePolicyQuery(repo);
  registerEvents(client, createDrizzleArchiveService(db, { archiveDMs: config.archiveDMs }));
  const storage = new LocalMediaStorage(config.mediaStoragePath);
  const media = createMediaArchiver({
    store: repo,
    storage,
    maxBytes: config.maxMediaBytes,
  });
  media.start();
  const retention = createRetentionRunner({ store: repo, storage });
  retention.start();

  client.on('error', (err: Error) => {
    increment('gateway.errors');
    logger.error({ err: String(err) }, 'Discord client error');
  });
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ reason: String(reason) }, 'Unhandled rejection');
  });
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, destroying client');
    void client.destroy();
    media.stop();
    retention.stop();
    closeDb();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, destroying client');
    void client.destroy();
    media.stop();
    retention.stop();
    closeDb();
    process.exit(0);
  });

  logger.info('Starting SnipeBot', {
    nodeEnv: config.nodeEnv,
    logLevel: config.logLevel,
  });
  await client.login(config.discordToken);
}

await main();
