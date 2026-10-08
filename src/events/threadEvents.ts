import { Events, type Client } from 'discord.js';
import type { ChannelInfo } from '../repositories/drizzleMessageRepository.js';
import type { ArchiveService } from '../services/archiveService.js';
import { logger } from '../utils/logger.js';

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toChannelInfo(thread: unknown): ChannelInfo | null {
  if (typeof thread !== 'object' || thread === null) return null;
  const t = thread as {
    id?: unknown;
    guildId?: unknown;
    guild?: unknown;
    type?: unknown;
    name?: unknown;
    parentId?: unknown;
    archived?: unknown;
    archivedAt?: unknown;
  };
  if (typeof t.id !== 'string') return null;
  const guild = t.guild;
  const guildId =
    asString(t.guildId) ??
    (typeof guild === 'object' && guild !== null ? asString((guild as { id?: unknown }).id) : null);
  const archivedAt = t.archivedAt instanceof Date ? t.archivedAt.toISOString() : null;
  return {
    id: t.id,
    guildId,
    kind: typeof t.type === 'number' ? t.type : null,
    name: asString(t.name),
    parentId: asString(t.parentId),
    archivedAt: t.archived === true ? archivedAt : null,
  };
}

async function handleUpsert(
  thread: unknown,
  service: ArchiveService,
  event: string,
): Promise<void> {
  try {
    const info = toChannelInfo(thread);
    if (info === null) {
      logger.warn('Skipping unidentifiable thread event', { event });
      return;
    }
    const result = await service.recordChannel(info);
    if (!result.ok) {
      logger.error({ error: result.error, id: info.id }, 'Archive channel failed');
    }
  } catch (err) {
    logger.error({ err: String(err) }, `${event} handling failed`);
  }
}

async function handleDelete(thread: unknown, service: ArchiveService): Promise<void> {
  try {
    const info = toChannelInfo(thread);
    if (info === null) {
      logger.warn('Skipping unidentifiable thread delete', {});
      return;
    }
    const result = await service.removeChannel(info.id);
    if (!result.ok) {
      logger.error({ error: result.error, id: info.id }, 'Archive channel delete failed');
    }
  } catch (err) {
    logger.error({ err: String(err) }, 'threadDelete handling failed');
  }
}

/**
 * Keep channel shells honest across thread lifecycle. Message rows are
 * unaffected (no FK from messages to channels). Thin by design.
 */
export function registerThreadCreate(client: Client, service: ArchiveService): void {
  client.on(Events.ThreadCreate, (thread) => {
    void handleUpsert(thread, service, 'threadCreate');
  });
}

export function registerThreadUpdate(client: Client, service: ArchiveService): void {
  client.on(Events.ThreadUpdate, (_old, thread) => {
    void handleUpsert(thread, service, 'threadUpdate');
  });
}

export function registerThreadDelete(client: Client, service: ArchiveService): void {
  client.on(Events.ThreadDelete, (thread) => {
    void handleDelete(thread, service);
  });
}
