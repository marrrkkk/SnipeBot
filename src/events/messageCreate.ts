import type { Message } from 'discord.js';
import { Events, type Client } from 'discord.js';
import { isBotAuthor } from '../discord/guards.js';
import { SnapshotError, toSnapshot } from '../discord/mappers.js';
import type { ThreadResolver } from '../discord/threads.js';
import type { ArchiveService } from '../services/archiveService.js';
import { logger } from '../utils/logger.js';

async function handleMessage(
  message: Message,
  service: ArchiveService,
  resolver?: ThreadResolver,
): Promise<void> {
  try {
    if (isBotAuthor(message.author)) return;
    const thread = resolver === undefined ? null : await resolver.resolve(message.channelId);
    const snapshot = toSnapshot(message, thread);
    const result = await service.ingestMessage(snapshot);
    if (!result.ok) {
      // Never log message content here (privacy; see docs/security.md).
      logger.error({ error: result.error, id: snapshot.id }, 'Archive ingest failed');
    }
  } catch (err) {
    // One archival failure (partial input, DB error) must not crash the
    // process or break subsequent messages.
    const rawId = (message as unknown as { id?: unknown }).id;
    const id = typeof rawId === 'string' ? rawId : 'unknown';
    if (err instanceof SnapshotError) {
      logger.warn('Skipping unsnapshottable message', { id, reason: err.message });
      return;
    }
    logger.error({ err: String(err), id }, 'messageCreate handling failed');
  }
}

/**
 * Observe every message, normalize to a snapshot, hand to the archive
 * service. Thin by design: no DB logic here.
 */
export function registerMessageCreate(
  client: Client,
  service: ArchiveService,
  resolver?: ThreadResolver,
): void {
  client.on(Events.MessageCreate, (message: Message) => {
    void handleMessage(message, service, resolver);
  });
}
