/**
 * Application-owned message snapshot. Never persist discord.js Message
 * objects directly — normalize at the Discord boundary into this shape.
 * See docs/data-model.md for field semantics.
 */
export type AuthorSnapshot = {
  id: string;
  username: string;
  discriminator: string | null; // legacy; null on new username system
  bot: boolean;
  webhookId: string | null; // set when author is a webhook
};

export type AttachmentSnapshot = {
  id: string;
  filename: string;
  contentType: string | null;
  sizeBytes: number;
  url: string; // ephemeral CDN URL — do not treat as permanent storage
  proxyUrl: string;
  height: number | null;
  width: number | null;
  durationSecs: number | null; // voice messages / audio
  waveform: string | null; // base64 sampled waveform, voice messages
  localPath: string | null; // filled by media archiver (Phase 7)
};

export type EmbedSnapshot = {
  /** Raw embed JSON; rendered selectively (title/count), never fully normalized. */
  raw: Record<string, unknown>;
};

export type ReactionSnapshot = {
  emojiId: string | null;
  emojiName: string | null;
  count: number;
};

export type MessageReferenceSnapshot = {
  messageId: string | null;
  channelId: string | null;
  guildId: string | null;
  /** 0 = reply/default, 1 = forward. See Discord message_reference.type. */
  refType: number | null;
};

export type PollSnapshot = {
  /** Raw poll JSON, read defensively across shapes. Requires MessageContent intent. */
  raw: Record<string, unknown>;
};

/** Best-effort deletion attribution (Phase 15). Never ground truth. */
export type DeletionAttribution = {
  executorId: string;
  auditEntryId: string;
};

export type ChannelSnapshot = {
  id: string;
  kind: number | null;
  name: string | null;
  /** Parent channel for threads, category for guild channels, else null. */
  parentId: string | null;
};

export type MessageSnapshot = {
  // Immutable identity
  id: string;
  guildId: string | null; // null in DMs
  channelId: string;
  threadId: string | null; // set when sent inside a thread
  /** The channel the message was sent in (the thread itself, when threaded). */
  channel: ChannelSnapshot | null;
  author: AuthorSnapshot;
  createdAt: Date;
  messageType: number;
  // Revisioned content (one row per edit in message_revisions)
  content: string; // empty without MessageContent intent
  editedAt: Date | null;
  attachments: AttachmentSnapshot[];
  embeds: EmbedSnapshot[];
  reactions: ReactionSnapshot[];
  stickerIds: string[];
  componentsRaw: unknown[]; // raw component JSON; V2-aware rendering later
  poll: PollSnapshot | null;
  reference: MessageReferenceSnapshot | null;
  snapshotOfForwarded: MessageSnapshot | null; // depth capped at 1 by Discord
  flags: number;
  tts: boolean;
  pinned: boolean;
};
