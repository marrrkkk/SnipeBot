import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Dates are ISO-8601 text; booleans are 0/1 integers. Nullable created_at /
// channel_id represent genuinely unknown values (never-observed deletes).

export const guilds = sqliteTable('guilds', {
  id: text('id').primaryKey(),
  // Name/kind fill in as channels are observed (resolver, lifecycle events).
  name: text('name'),
  iconHash: text('icon_hash'),
});

export const channels = sqliteTable(
  'channels',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id').references(() => guilds.id),
    kind: integer('kind'),
    name: text('name'),
    parentId: text('parent_id'),
    archivedAt: text('archived_at'),
  },
  (t) => [index('channels_guild_idx').on(t.guildId)],
);

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  discriminator: text('discriminator'),
  bot: integer('bot').notNull().default(0),
  avatarHash: text('avatar_hash'),
  webhookId: text('webhook_id'),
});

export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id'),
    channelId: text('channel_id'),
    threadId: text('thread_id'),
    authorId: text('author_id').references(() => users.id),
    messageType: integer('message_type'),
    createdAt: text('created_at'),
    deletedAt: text('deleted_at'),
    deleteKind: text('delete_kind'),
    refMessageId: text('ref_message_id'),
    refChannelId: text('ref_channel_id'),
    refGuildId: text('ref_guild_id'),
    refType: integer('ref_type'),
  },
  (t) => [
    index('messages_channel_created_idx').on(t.channelId, t.createdAt),
    index('messages_author_created_idx').on(t.authorId, t.createdAt),
    index('messages_deleted_idx').on(t.deletedAt),
  ],
);

export const messageRevisions = sqliteTable(
  'message_revisions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    revNo: integer('rev_no').notNull(),
    editedAt: text('edited_at'),
    content: text('content').notNull().default(''),
    flags: integer('flags').notNull().default(0),
    tts: integer('tts').notNull().default(0),
    pinned: integer('pinned').notNull().default(0),
    stickerIds: text('sticker_ids').notNull().default('[]'),
    fingerprint: text('fingerprint').notNull().default(''),
    capturedAt: text('captured_at').notNull(),
  },
  (t) => [index('revisions_message_rev_idx').on(t.messageId, t.revNo)],
);

export const attachments = sqliteTable(
  'attachments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    revNo: integer('rev_no').notNull(),
    attachmentId: text('attachment_id').notNull(),
    filename: text('filename').notNull(),
    contentType: text('content_type'),
    sizeBytes: integer('size_bytes'),
    remoteUrl: text('remote_url'),
    proxyUrl: text('proxy_url'),
    localPath: text('local_path'),
    height: integer('height'),
    width: integer('width'),
    durationSecs: real('duration_secs'),
    waveform: text('waveform'),
  },
  (t) => [index('attachments_message_rev_idx').on(t.messageId, t.revNo)],
);

export const embeds = sqliteTable(
  'embeds',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    revNo: integer('rev_no').notNull(),
    idx: integer('idx').notNull(),
    rawJson: text('raw_json').notNull(),
  },
  (t) => [index('embeds_message_rev_idx').on(t.messageId, t.revNo)],
);

export const reactions = sqliteTable(
  'reactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    emojiId: text('emoji_id'),
    emojiName: text('emoji_name'),
    count: integer('count').notNull().default(0),
    capturedAt: text('captured_at').notNull(),
  },
  (t) => [index('reactions_message_idx').on(t.messageId)],
);

export const polls = sqliteTable('polls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  messageId: text('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  revNo: integer('rev_no'),
  rawJson: text('raw_json').notNull(),
});

export const forwardSnapshots = sqliteTable('forward_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  messageId: text('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  rawJson: text('raw_json').notNull(),
});

export const deletionEvents = sqliteTable(
  'deletion_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    messageId: text('message_id').notNull(),
    channelId: text('channel_id'),
    kind: text('kind').notNull(),
    observedAt: text('observed_at').notNull(),
    auditEntryId: text('audit_entry_id'),
    executorId: text('executor_id'),
  },
  (t) => [index('deletion_events_message_idx').on(t.messageId)],
);

export const retentionPolicies = sqliteTable('retention_policies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scope: text('scope').notNull().unique(),
  keepDays: integer('keep_days'),
  keepRevisions: integer('keep_revisions'),
  mediaKeepDays: integer('media_keep_days'),
});

export const guildSettings = sqliteTable('guild_settings', {
  guildId: text('guild_id').primaryKey(),
  snipeRoleIds: text('snipe_role_ids').notNull().default('[]'),
  archivingEnabled: integer('archiving_enabled').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
