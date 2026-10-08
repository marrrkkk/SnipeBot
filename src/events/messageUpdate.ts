import type { Message, PartialMessage } from 'discord.js';
import { Events, type Client } from 'discord.js';
import { isBotAuthor } from '../discord/guards.js';
import { SnapshotError, toSnapshot } from '../discord/mappers.js';
import { resolveFullMessage } from '../discord/messages.js';
import type { ThreadResolver } from '../discord/threads.js';
import type { ArchiveService } from '../services/archiveService.js';
import { logger } from '../utils/logger.js';

async function handleUpdate(
  message: Message | PartialMessage,
  service: ArchiveService,
  resolver?: ThreadResolver,
): Promise<void> {
  try {
    const full = await resolveFullMessage(message, 'update');
    if (full === null) return;
    if (isBotAuthor(full.author)) return;
    const thread = resolver === undefined ? null : await resolver.resolve(full.channelId);
    const snapshot = toSnapshot(full, thread);
    const result = await service.recordEdit(snapshot);
    if (!result.ok) {
      logger.error({ error: result.error, id: snapshot.id }, 'Archive edit failed');
    }
  } catch (err) {
    if (err instanceof SnapshotError) {
      logger.warn('Skipping unsnapshottable update', { reason: err.message });
      return;
    }
    logger.error({ err: String(err) }, 'messageUpdate handling failed');
  }
}

/** Persist each observed edit as a new revision. Thin by design. */
export function registerMessageUpdate(
  client: Client,
  service: ArchiveService,
  resolver?: ThreadResolver,
): void {
  client.on(Events.MessageUpdate, (_old, updated) => {
    void handleUpdate(updated, service, resolver);
  });
}
