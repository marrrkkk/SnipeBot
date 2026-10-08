import type { Message, PartialMessage } from 'discord.js';
import { logger } from '../utils/logger.js';

/**
 * Resolve a possibly-partial message to a full one (single REST fetch when
 * needed). Returns null when unresolvable — callers skip quietly.
 */
export async function resolveFullMessage(
  message: Message | PartialMessage,
  what: string,
): Promise<Message | null> {
  if (!message.partial) return message;
  try {
    const fetched: unknown = await message.fetch();
    return fetched as Message;
  } catch (err) {
    logger.warn(`Skipping unfetchable partial ${what}`, { err: String(err) });
    return null;
  }
}
