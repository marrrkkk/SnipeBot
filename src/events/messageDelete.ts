import type { Message, PartialMessage, ReadonlyCollection, Snowflake } from 'discord.js';
import { Events, type Client, type Guild } from 'discord.js';
import { findDeleteAttribution } from '../discord/auditLog.js';
import type { ArchiveService } from '../services/archiveService.js';
import { logger } from '../utils/logger.js';

export type DeleteHandlerOptions = {
  /** Delay before one attribution retry on miss. Default 5000. */
  retryDelayMs?: number;
};

function channelIdOf(message: unknown): string | null {
  const channelId = (message as { channelId?: unknown }).channelId;
  return typeof channelId === 'string' ? channelId : null;
}

async function tryAttributeDeletion(
  messageId: string,
  message: Message | PartialMessage,
  service: ArchiveService,
): Promise<boolean> {
  const guild = (message as unknown as { guild?: unknown }).guild;
  if (typeof guild !== 'object' || guild === null) return false;
  const author = (message as unknown as { author?: unknown }).author;
  const authorId =
    typeof author === 'object' && author !== null
      ? ((author as { id?: unknown }).id ?? null)
      : null;
  const channelId = channelIdOf(message);
  if (typeof authorId !== 'string' || channelId === null) return false;
  const found = await findDeleteAttribution(guild as unknown as Guild, channelId, authorId);
  if (found === null) return false;
  const result = await service.annotateDeletion(messageId, found);
  if (!result.ok) {
    logger.error({ error: result.error, id: messageId }, 'Archive attribution failed');
    return false;
  }
  return true;
}

async function handleDelete(
  message: Message | PartialMessage,
  service: ArchiveService,
  options?: DeleteHandlerOptions,
): Promise<void> {
  try {
    const rawId = (message as unknown as { id?: unknown }).id;
    if (typeof rawId !== 'string') {
      logger.warn('Skipping delete without message id');
      return;
    }
    const result = await service.recordDelete(rawId, channelIdOf(message), new Date());
    if (!result.ok) {
      logger.error({ error: result.error, id: rawId }, 'Archive delete failed');
    }
    void attributeSoon(rawId, message, service, options?.retryDelayMs ?? 5000);
  } catch (err) {
    logger.error({ err: String(err) }, 'messageDelete handling failed');
  }
}

async function attributeSoon(
  messageId: string,
  message: Message | PartialMessage,
  service: ArchiveService,
  retryDelayMs: number,
): Promise<void> {
  try {
    if (await tryAttributeDeletion(messageId, message, service)) return;
  } catch (err) {
    logger.error({ err: String(err), id: messageId }, 'messageDelete attribution failed');
    return;
  }
  const timer = setTimeout(() => {
    void tryAttributeDeletion(messageId, message, service).catch((err: unknown) => {
      logger.error({ err: String(err), id: messageId }, 'messageDelete attribution retry failed');
    });
  }, retryDelayMs);
  timer.unref();
}

async function handleDeleteBulk(
  messages: ReadonlyCollection<Snowflake, Message | PartialMessage>,
  service: ArchiveService,
): Promise<void> {
  try {
    const ids: string[] = [];
    let channelId: string | null = null;
    for (const message of messages.values()) {
      const rawId = (message as unknown as { id?: unknown }).id;
      if (typeof rawId === 'string') ids.push(rawId);
      if (channelId === null) channelId = channelIdOf(message);
    }
    if (ids.length === 0) return;
    const result = await service.recordDeleteBulk(ids, channelId, new Date());
    if (!result.ok) {
      logger.error({ error: result.error, count: ids.length }, 'Archive bulk delete failed');
    }
  } catch (err) {
    logger.error({ err: String(err) }, 'messageDeleteBulk handling failed');
  }
}

/** Record deletion markers (id-only when never observed). Thin by design. */
export function registerMessageDelete(
  client: Client,
  service: ArchiveService,
  options?: DeleteHandlerOptions,
): void {
  client.on(Events.MessageDelete, (message) => {
    void handleDelete(message, service, options);
  });
}

export function registerMessageDeleteBulk(client: Client, service: ArchiveService): void {
  client.on(Events.MessageBulkDelete, (messages) => {
    void handleDeleteBulk(messages, service);
  });
}
