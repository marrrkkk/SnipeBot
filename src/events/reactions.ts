import type { Message, PartialMessage } from 'discord.js';
import { Events, type Client } from 'discord.js';
import { toReactionSnapshots } from '../discord/mappers.js';
import type { ArchiveService } from '../services/archiveService.js';
import { createCoalescer, type CoalesceFn } from '../utils/coalesce.js';
import { logger } from '../utils/logger.js';

async function currentSnapshots(
  message: Message | PartialMessage,
): Promise<{ id: string; snapshots: ReturnType<typeof toReactionSnapshots> } | null> {
  if (!message.partial) {
    return { id: message.id, snapshots: toReactionSnapshots(message) };
  }
  try {
    const full = (await message.fetch()) as Message;
    return { id: full.id, snapshots: toReactionSnapshots(full) };
  } catch (err) {
    logger.warn('Skipping unfetchable partial reaction message', { err: String(err) });
    return null;
  }
}

async function refreshFromReaction(
  reaction: { message: Message | PartialMessage },
  service: ArchiveService,
  event: string,
): Promise<void> {
  try {
    const current = await currentSnapshots(reaction.message);
    if (current === null) return;
    const result = await service.recordReactions(current.id, current.snapshots, new Date());
    if (!result.ok) {
      logger.error({ error: result.error, id: current.id }, 'Archive reactions failed');
    }
  } catch (err) {
    logger.error({ err: String(err) }, `${event} handling failed`);
  }
}

async function refreshFromMessage(
  message: Message | PartialMessage,
  service: ArchiveService,
  event: string,
): Promise<void> {
  try {
    const current = await currentSnapshots(message);
    if (current === null) return;
    const result = await service.recordReactions(current.id, current.snapshots, new Date());
    if (!result.ok) {
      logger.error({ error: result.error, id: current.id }, 'Archive reactions failed');
    }
  } catch (err) {
    logger.error({ err: String(err) }, `${event} handling failed`);
  }
}

/**
 * Keep the point-in-time reaction set fresh. All four events share one
 * refresh path; none of them append revisions. Thin by design.
 * Refreshes coalesce per message (default 5s trailing window).
 */
const defaultCoalescer = createCoalescer(5000);

export function registerMessageReactionAdd(
  client: Client,
  service: ArchiveService,
  coalesce: CoalesceFn = defaultCoalescer,
): void {
  client.on(Events.MessageReactionAdd, (reaction) => {
    coalesce(reaction.message.id, () =>
      refreshFromReaction(reaction, service, 'messageReactionAdd'),
    );
  });
}

export function registerMessageReactionRemove(
  client: Client,
  service: ArchiveService,
  coalesce: CoalesceFn = defaultCoalescer,
): void {
  client.on(Events.MessageReactionRemove, (reaction) => {
    coalesce(reaction.message.id, () =>
      refreshFromReaction(reaction, service, 'messageReactionRemove'),
    );
  });
}

export function registerMessageReactionRemoveEmoji(
  client: Client,
  service: ArchiveService,
  coalesce: CoalesceFn = defaultCoalescer,
): void {
  client.on(Events.MessageReactionRemoveEmoji, (reaction) => {
    coalesce(reaction.message.id, () =>
      refreshFromReaction(reaction, service, 'messageReactionRemoveEmoji'),
    );
  });
}

export function registerMessageReactionRemoveAll(
  client: Client,
  service: ArchiveService,
  coalesce: CoalesceFn = defaultCoalescer,
): void {
  client.on(Events.MessageReactionRemoveAll, (message) => {
    coalesce(message.id, () => refreshFromMessage(message, service, 'messageReactionRemoveAll'));
  });
}
