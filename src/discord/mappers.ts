import type {
  Attachment,
  Collection,
  Message,
  MessageSnapshot as DiscordForwardSnapshot,
} from 'discord.js';
import type {
  AttachmentSnapshot,
  AuthorSnapshot,
  ChannelSnapshot,
  MessageSnapshot,
  ReactionSnapshot,
} from '../domain/messageSnapshot.js';
import type { ThreadResolution } from './threads.js';

/** Thrown when a message lacks the identity fields a snapshot requires. */
export class SnapshotError extends Error {
  constructor(reason: string) {
    super(`Cannot snapshot message: ${reason}`);
    this.name = 'SnapshotError';
  }
}

/**
 * Forwarded snapshots exclude the author (Discord provides a minimal field
 * subset). A sentinel marks that absence instead of fabricating attribution.
 */
const UNKNOWN_AUTHOR: AuthorSnapshot = {
  id: 'unknown',
  username: 'Unknown author',
  discriminator: null,
  bot: false,
  webhookId: null,
};

// All helpers below take `unknown`: at the Discord boundary runtime shapes
// (partials, uncached relations, version drift) legitimately violate the
// static types, so every guard here is load-bearing.

function requireString(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new SnapshotError(`missing ${what}`);
  return value;
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function requireDate(value: unknown): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new SnapshotError('invalid created timestamp');
  }
  return value;
}

function asDateOrEpoch(value: unknown): Date {
  return typeof value === 'number' ? new Date(value) : new Date(0);
}

function asDateOrNull(value: unknown): Date | null {
  return typeof value === 'number' ? new Date(value) : null;
}

function asArray<T>(value: Collection<unknown, T> | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return [...value.values()];
}

function rawJson(value: { toJSON: () => unknown }, what: string): Record<string, unknown> {
  const raw: unknown = value.toJSON();
  if (typeof raw !== 'object' || raw === null) {
    throw new SnapshotError(`unserializable ${what}`);
  }
  return raw as unknown as Record<string, unknown>;
}

function isAuthorLike(value: unknown): value is { id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string'
  );
}

function toAuthorSnapshot(author: unknown, webhookId: string | null): AuthorSnapshot {
  if (!isAuthorLike(author)) throw new SnapshotError('missing author');
  const record = author as { username?: unknown; discriminator?: unknown; bot?: unknown };
  return {
    id: author.id,
    username: typeof record.username === 'string' ? record.username : UNKNOWN_AUTHOR.username,
    discriminator: typeof record.discriminator === 'string' ? record.discriminator : null,
    bot: record.bot === true,
    webhookId,
  };
}

/** Point-in-time reaction set for refresh paths (no revision implied). */
export function toReactionSnapshots(message: Message): ReactionSnapshot[] {
  return asArray(message.reactions.cache).map((reaction) => ({
    emojiId: reaction.emoji.id,
    emojiName: reaction.emoji.name,
    count: reaction.count,
  }));
}

function toAttachmentSnapshot(attachment: Attachment): AttachmentSnapshot {
  return {
    id: attachment.id,
    filename: attachment.name,
    contentType: attachment.contentType,
    sizeBytes: attachment.size,
    url: attachment.url,
    proxyUrl: attachment.proxyURL,
    height: attachment.height,
    width: attachment.width,
    durationSecs: attachment.duration,
    waveform: attachment.waveform,
    localPath: null,
  };
}

function resolveChannel(message: Message): {
  channelId: string;
  threadId: string | null;
  channel: ChannelSnapshot | null;
} {
  const channel = message.channel as unknown as {
    isThread?: () => boolean;
    parentId?: unknown;
    type?: unknown;
    name?: unknown;
  } | null;
  if (channel === null) return { channelId: message.channelId, threadId: null, channel: null };
  const kind = typeof channel.type === 'number' ? channel.type : null;
  const name = typeof channel.name === 'string' ? channel.name : null;
  if (typeof channel.isThread === 'function' && channel.isThread()) {
    // Inside a thread the channel id IS the thread; the parent is the channel.
    // Uncached channels fall through below (the resolver refines via API lookup).
    const parentId = typeof channel.parentId === 'string' ? channel.parentId : message.channelId;
    return {
      channelId: parentId,
      threadId: message.channelId,
      channel: { id: message.channelId, kind, name, parentId },
    };
  }
  const parentId = typeof channel.parentId === 'string' ? channel.parentId : null;
  return {
    channelId: message.channelId,
    threadId: null,
    channel: { id: message.channelId, kind, name, parentId },
  };
}

function toForwardSnapshot(
  parent: Message,
  id: string,
  snapshot: DiscordForwardSnapshot,
): MessageSnapshot {
  return {
    id,
    guildId: parent.guildId ?? null,
    channelId: parent.channelId,
    threadId: null,
    channel: null,
    author: isAuthorLike(snapshot.author)
      ? toAuthorSnapshot(snapshot.author, null)
      : UNKNOWN_AUTHOR,
    content: optionalString(snapshot.content),
    createdAt: asDateOrEpoch(snapshot.createdTimestamp),
    editedAt: asDateOrNull(snapshot.editedTimestamp),
    attachments: asArray(snapshot.attachments).map(toAttachmentSnapshot),
    embeds: snapshot.embeds.map((e) => ({
      raw: rawJson(e as unknown as { toJSON: () => unknown }, 'forward embed'),
    })),
    reactions: [],
    stickerIds: asArray(snapshot.stickers).map((s) => s.id),
    componentsRaw: snapshot.components.map((c) =>
      rawJson(c as unknown as { toJSON: () => unknown }, 'forward component'),
    ),
    poll: null,
    reference: null,
    // Discord caps forward nesting at depth 1: never recurse.
    snapshotOfForwarded: null,
    flags: snapshot.flags.bitfield,
    messageType: snapshot.type,
    tts: snapshot.tts === true,
    pinned: snapshot.pinned === true,
  };
}

/**
 * Normalize a discord.js Message into an application-owned snapshot.
 * Throws SnapshotError when identity fields are missing (partial input);
 * callers record an id-only deletion marker in that case (Phase 3).
 */
export function toSnapshot(message: Message, thread?: ThreadResolution | null): MessageSnapshot {
  const id = requireString(message.id, 'message id');
  requireString(message.channelId, 'channel id');
  const resolved =
    thread === undefined || thread === null
      ? resolveChannel(message)
      : {
          channelId: thread.channelId,
          threadId: thread.threadId,
          channel: thread.channel,
        };
  const { channelId, threadId, channel } = resolved;

  let snapshotOfForwarded: MessageSnapshot | null = null;
  for (const [snapId, snap] of message.messageSnapshots.entries()) {
    snapshotOfForwarded = toForwardSnapshot(message, snapId, snap);
    break;
  }

  const reference = message.reference;
  return {
    id,
    guildId: message.guildId ?? null,
    channelId,
    threadId,
    channel,
    author: toAuthorSnapshot(message.author, message.webhookId),
    content: optionalString(message.content),
    createdAt: requireDate(message.createdAt),
    editedAt: message.editedAt,
    attachments: asArray(message.attachments).map(toAttachmentSnapshot),
    embeds: message.embeds.map((e) => ({
      raw: rawJson(e as unknown as { toJSON: () => unknown }, 'embed'),
    })),
    reactions: toReactionSnapshots(message),
    stickerIds: asArray(message.stickers).map((sticker) => sticker.id),
    componentsRaw: message.components.map((c) =>
      rawJson(c as unknown as { toJSON: () => unknown }, 'component'),
    ),
    poll: message.poll === null ? null : { raw: rawJson(message.poll, 'poll') },
    reference:
      reference === null
        ? null
        : {
            messageId: reference.messageId ?? null,
            channelId: reference.channelId,
            guildId: reference.guildId ?? null,
            refType: asNumberOrNull(reference.type),
          },
    snapshotOfForwarded,
    flags: message.flags.bitfield,
    messageType: message.type,
    tts: message.tts,
    pinned: message.pinned,
  };
}
