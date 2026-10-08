import { AuditLogEvent, type Guild } from 'discord.js';
import type { DeletionAttribution } from '../domain/messageSnapshot.js';

const MAX_AGE_MS = 30_000;
const FETCH_LIMIT = 5;

/**
 * Best-effort deletion attribution: the newest audit entry in the same
 * channel, created recently, whose target is absent or the message author.
 * Anything uncertain — permissions, shape, staleness — returns null.
 * Never ground truth; callers must hedge.
 */
export async function findDeleteAttribution(
  guild: Guild,
  channelId: string,
  authorId: string,
): Promise<DeletionAttribution | null> {
  let logs: unknown;
  try {
    logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: FETCH_LIMIT });
  } catch {
    return null;
  }
  if (typeof logs !== 'object' || logs === null) return null;
  const entries = (logs as { entries?: unknown }).entries;
  if (!(entries instanceof Map)) return null;
  const now = Date.now();
  for (const raw of entries.values()) {
    if (typeof raw !== 'object' || raw === null) continue;
    const entry = raw as {
      action?: unknown;
      targetId?: unknown;
      executorId?: unknown;
      extra?: unknown;
      createdTimestamp?: unknown;
      id?: unknown;
    };
    if (entry.action !== AuditLogEvent.MessageDelete) continue;
    if (typeof entry.targetId === 'string' && entry.targetId !== authorId) continue;
    if (typeof entry.executorId !== 'string') continue;
    if (typeof entry.id !== 'string') continue;
    const extra = entry.extra;
    const channel =
      typeof extra === 'object' && extra !== null ? (extra as { channel?: unknown }).channel : null;
    const entryChannelId =
      typeof channel === 'object' && channel !== null
        ? ((channel as { id?: unknown }).id ?? null)
        : null;
    if (entryChannelId !== channelId) continue;
    if (typeof entry.createdTimestamp !== 'number') continue;
    if (entry.createdTimestamp < now - MAX_AGE_MS || entry.createdTimestamp > now + 5000) continue;
    return { executorId: entry.executorId, auditEntryId: entry.id };
  }
  return null;
}
