import { and, asc, count, desc, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import type { Db } from '../database/connection.js';
import {
  attachments,
  channels,
  deletionEvents,
  embeds,
  forwardSnapshots,
  guildSettings,
  guilds,
  messageRevisions,
  messages,
  polls,
  reactions,
  retentionPolicies,
  users,
} from '../database/schema.js';
import type {
  AuthorSnapshot,
  ChannelSnapshot,
  MessageSnapshot,
  ReactionSnapshot,
} from '../domain/messageSnapshot.js';
import type { DeleteKind } from '../services/archiveService.js';

const UNKNOWN_AUTHOR: AuthorSnapshot = {
  id: 'unknown',
  username: 'Unknown author',
  discriminator: null,
  bot: false,
  webhookId: null,
};

export type ChannelInfo = {
  id: string;
  guildId: string | null;
  kind: number | null;
  name: string | null;
  parentId: string | null;
  archivedAt: string | null;
};

export type GuildPolicy = {
  snipeRoleIds: string[];
  archivingEnabled: boolean;
};

export type RetentionPolicy = {
  scope: string;
  keepDays: number | null;
  keepRevisions: number | null;
  mediaKeepDays: number | null;
};

export type ArchiveStats = {
  messages: number;
  revisions: number;
  attachmentsPending: number;
  deletions: number;
};

/** Read contract for the stats surface. Satisfied structurally. */
export type StatsPort = {
  getArchiveStats(): Promise<ArchiveStats>;
};

export type SearchQuery = {
  text?: string;
  authorId?: string;
  channelId: string;
  after?: Date;
  before?: Date;
  hasAttachment?: boolean;
  hasPoll?: boolean;
  deleted?: boolean | null;
  limit?: number;
};

export type SearchHit = {
  messageId: string;
  channelId: string | null;
  authorId: string | null;
  content: string;
  revNo: number;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  rank: number;
};

/** Read contract for the search surface. Satisfied structurally. */
export type MessageSearchPort = {
  searchMessages(query: SearchQuery): Promise<SearchHit[]>;
  /** Message detail views (structurally satisfied; same row read as other ports). */
  findById(id: string): Promise<MessageSnapshot | null>;
};

export type ChannelDeletion = {
  messageId: string;
  kind: string;
  observedAt: Date;
  executorId: string | null;
};

/** Read contract for snipe/history surfaces. Satisfied structurally. */
export type SnipeQueryPort = {
  listDeletionsForChannel(channelId: string, limit: number): Promise<ChannelDeletion[]>;
  findById(id: string): Promise<MessageSnapshot | null>;
};

/** Gap-fill contract for history import. Satisfied structurally. */
export type BackfillPort = {
  importSnapshots(snapshots: MessageSnapshot[]): Promise<{ imported: number; skipped: number }>;
};

export type EditedMessage = { messageId: string; editedAt: Date };

export type UnarchivedAttachment = {
  rowId: number;
  messageId: string;
  attachmentId: string;
  url: string | null;
  filename: string;
  guildId: string | null;
  channelId: string | null;
};

export type RevisionView = {
  revNo: number;
  content: string;
  editedAt: Date | null;
  capturedAt: Date;
  flags: number;
  tts: boolean;
  pinned: boolean;
};

/** Read contract for edit-history surfaces. Satisfied structurally. */
export type EditHistoryPort = {
  listEditedMessages(channelId: string, limit: number): Promise<EditedMessage[]>;
  getRevisions(messageId: string): Promise<RevisionView[]>;
  findById(id: string): Promise<MessageSnapshot | null>;
};

function parseJsonObject(raw: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  return parsed as unknown as Record<string, unknown>;
}

function parseStringArray(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: string[] = [];
  for (const item of parsed) {
    if (typeof item === 'string') out.push(item);
  }
  return out;
}

/** Canonical observed-state fingerprint: any content-bearing change bumps it. */
function fingerprintOf(snap: MessageSnapshot, editedIso: string | null): string {
  return JSON.stringify({
    c: snap.content,
    e: editedIso,
    f: snap.flags,
    t: snap.tts,
    p: snap.pinned,
    s: snap.stickerIds,
    a: snap.attachments,
    e2: snap.embeds.map((e) => e.raw),
    p2: snap.poll === null ? null : snap.poll.raw,
  });
}

/** Drizzle/SQLite persistence for the message archive. Sync driver: methods
 * stay non-async and return resolved promises to satisfy the async ports. */
export class DrizzleMessageRepository {
  constructor(private readonly db: Db) {}

  /** Insert shells + append a revision when observed state changed. */
  saveSnapshot(snap: MessageSnapshot): Promise<void> {
    this.db.transaction((tx) => {
      if (snap.guildId !== null) {
        tx.insert(guilds).values({ id: snap.guildId }).onConflictDoNothing().run();
      }
      tx.insert(channels)
        .values({ id: snap.channelId, guildId: snap.guildId })
        .onConflictDoNothing()
        .run();
      if (snap.threadId !== null) {
        tx.insert(channels)
          .values({ id: snap.threadId, guildId: snap.guildId, parentId: snap.channelId })
          .onConflictDoNothing()
          .run();
      }
      if (snap.channel !== null) {
        // Enriched observation wins: refresh mutable shell fields.
        tx.insert(channels)
          .values({
            id: snap.channel.id,
            guildId: snap.guildId,
            kind: snap.channel.kind,
            name: snap.channel.name,
            parentId: snap.channel.parentId,
          })
          .onConflictDoUpdate({
            target: channels.id,
            set: {
              guildId: snap.guildId,
              kind: snap.channel.kind,
              name: snap.channel.name,
              parentId: snap.channel.parentId,
            },
          })
          .run();
      }
      tx.insert(users)
        .values({
          id: snap.author.id,
          username: snap.author.username,
          discriminator: snap.author.discriminator,
          bot: snap.author.bot ? 1 : 0,
          webhookId: snap.author.webhookId,
        })
        .onConflictDoNothing()
        .run();
      tx.insert(messages)
        .values({
          id: snap.id,
          guildId: snap.guildId,
          channelId: snap.channelId,
          threadId: snap.threadId,
          authorId: snap.author.id,
          messageType: snap.messageType,
          createdAt: snap.createdAt.toISOString(),
          refMessageId: snap.reference?.messageId ?? null,
          refChannelId: snap.reference?.channelId ?? null,
          refGuildId: snap.reference?.guildId ?? null,
          refType: snap.reference?.refType ?? null,
        })
        .onConflictDoNothing()
        .run();

      const prev = tx
        .select()
        .from(messageRevisions)
        .where(eq(messageRevisions.messageId, snap.id))
        .orderBy(desc(messageRevisions.revNo))
        .limit(1)
        .get();
      const editedIso = snap.editedAt?.toISOString() ?? null;
      const fingerprint = fingerprintOf(snap, editedIso);
      const unchanged = prev !== undefined && prev.fingerprint === fingerprint;

      if (!unchanged) {
        const revNo = prev === undefined ? 1 : prev.revNo + 1;
        const now = new Date().toISOString();
        // Same attachment id = same bytes: inherit archived paths, so edits
        // don't redownload unchanged files.
        const carried = new Map<string, string | null>();
        if (prev !== undefined && snap.attachments.length > 0) {
          const prevRows = tx
            .select()
            .from(attachments)
            .where(and(eq(attachments.messageId, snap.id), eq(attachments.revNo, prev.revNo)))
            .all();
          for (const row of prevRows) {
            carried.set(row.attachmentId, row.localPath);
          }
        }
        tx.insert(messageRevisions)
          .values({
            messageId: snap.id,
            revNo,
            editedAt: editedIso,
            content: snap.content,
            flags: snap.flags,
            tts: snap.tts ? 1 : 0,
            pinned: snap.pinned ? 1 : 0,
            stickerIds: JSON.stringify(snap.stickerIds),
            fingerprint,
            capturedAt: now,
          })
          .run();
        for (const a of snap.attachments) {
          tx.insert(attachments)
            .values({
              messageId: snap.id,
              revNo,
              attachmentId: a.id,
              filename: a.filename,
              contentType: a.contentType,
              sizeBytes: a.sizeBytes,
              remoteUrl: a.url,
              proxyUrl: a.proxyUrl,
              localPath: carried.get(a.id) ?? null,
              height: a.height,
              width: a.width,
              durationSecs: a.durationSecs,
              waveform: a.waveform,
            })
            .run();
        }
        snap.embeds.forEach((e, idx) => {
          tx.insert(embeds)
            .values({ messageId: snap.id, revNo, idx, rawJson: JSON.stringify(e.raw) })
            .run();
        });
        if (snap.poll !== null) {
          tx.insert(polls)
            .values({ messageId: snap.id, revNo, rawJson: JSON.stringify(snap.poll.raw) })
            .run();
        }
        if (snap.snapshotOfForwarded !== null) {
          tx.insert(forwardSnapshots)
            .values({
              messageId: snap.id,
              rawJson: JSON.stringify(snap.snapshotOfForwarded),
            })
            .run();
        }
      }

      // Reactions are point-in-time: always refresh to the latest observed set.
      const now = new Date().toISOString();
      tx.delete(reactions).where(eq(reactions.messageId, snap.id)).run();
      if (snap.reactions.length > 0) {
        tx.insert(reactions)
          .values(
            snap.reactions.map((r) => ({
              messageId: snap.id,
              emojiId: r.emojiId,
              emojiName: r.emojiName,
              count: r.count,
              capturedAt: now,
            })),
          )
          .run();
      }
    });
    return Promise.resolve();
  }

  /**
   * Gap-fill batch for history import: snapshots for unknown messages are
   * stored as-is; known messages are never rewritten (live observation
   * owns their future). Reruns are safe by construction.
   */
  async importSnapshots(
    snapshots: MessageSnapshot[],
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;
    for (const snap of snapshots) {
      if ((await this.countRevisions(snap.id)) === 0) {
        await this.saveSnapshot(snap);
        imported += 1;
      } else {
        skipped += 1;
      }
    }
    return { imported, skipped };
  }

  /** Mark deleted (shell-only when never observed) + record the event. */
  recordDeletion(
    messageId: string,
    channelId: string | null,
    at: Date,
    kind: DeleteKind,
  ): Promise<void> {
    return this.recordDeletions([{ messageId, channelId, at, kind }]);
  }

  /** Bulk path: all markers in one transaction. */
  recordDeletions(
    entries: { messageId: string; channelId: string | null; at: Date; kind: DeleteKind }[],
  ): Promise<void> {
    this.db.transaction((tx) => {
      for (const e of entries) {
        tx.insert(messages)
          .values({ id: e.messageId, channelId: e.channelId })
          .onConflictDoNothing()
          .run();
        // First observed deletion wins; later sightings stay in deletion_events.
        tx.update(messages)
          .set({ deletedAt: e.at.toISOString(), deleteKind: e.kind })
          .where(and(eq(messages.id, e.messageId), isNull(messages.deletedAt)))
          .run();
        tx.insert(deletionEvents)
          .values({
            messageId: e.messageId,
            channelId: e.channelId,
            kind: e.kind,
            observedAt: e.at.toISOString(),
          })
          .run();
      }
    });
    return Promise.resolve();
  }

  /**
   * Upsert a channel shell (single statement: atomic without a transaction).
   * Enriched observations overwrite mutable fields; sparse ones must use
   * the bare insert in saveSnapshot instead, never this.
   */
  upsertChannel(info: ChannelInfo): Promise<void> {
    this.db
      .insert(channels)
      .values({
        id: info.id,
        guildId: info.guildId,
        kind: info.kind,
        name: info.name,
        parentId: info.parentId,
        archivedAt: info.archivedAt,
      })
      .onConflictDoUpdate({
        target: channels.id,
        set: {
          guildId: info.guildId,
          kind: info.kind,
          name: info.name,
          parentId: info.parentId,
          archivedAt: info.archivedAt,
        },
      })
      .run();
    return Promise.resolve();
  }

  /** Remove a channel shell (deleted threads). Message rows are unaffected. */
  deleteChannel(id: string): Promise<void> {
    this.db.delete(channels).where(eq(channels.id, id)).run();
    return Promise.resolve();
  }

  getPolicy(guildId: string): Promise<GuildPolicy | null> {
    const row = this.db
      .select()
      .from(guildSettings)
      .where(eq(guildSettings.guildId, guildId))
      .limit(1)
      .get();
    if (row === undefined) return Promise.resolve(null);
    let ids: unknown;
    try {
      ids = JSON.parse(row.snipeRoleIds);
    } catch {
      throw new Error(`corrupt guild policy for ${guildId}`);
    }
    if (!Array.isArray(ids) || !ids.every((id): id is string => typeof id === 'string')) {
      throw new Error(`corrupt guild policy for ${guildId}`);
    }
    return Promise.resolve({ snipeRoleIds: ids, archivingEnabled: row.archivingEnabled === 1 });
  }

  savePolicy(guildId: string, policy: GuildPolicy): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .insert(guildSettings)
      .values({
        guildId,
        snipeRoleIds: JSON.stringify(policy.snipeRoleIds),
        archivingEnabled: policy.archivingEnabled ? 1 : 0,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: guildSettings.guildId,
        set: {
          snipeRoleIds: JSON.stringify(policy.snipeRoleIds),
          archivingEnabled: policy.archivingEnabled ? 1 : 0,
          updatedAt: now,
        },
      })
      .run();
    return Promise.resolve();
  }

  /**
   * Replace the point-in-time reaction set (shell-if-missing). Never touches
   * revisions: reaction traffic must not rewrite edit history.
   */
  replaceReactions(messageId: string, next: ReactionSnapshot[], at: Date): Promise<void> {
    this.db.transaction((tx) => {
      tx.insert(messages).values({ id: messageId }).onConflictDoNothing().run();
      tx.delete(reactions).where(eq(reactions.messageId, messageId)).run();
      if (next.length > 0) {
        const capturedAt = at.toISOString();
        tx.insert(reactions)
          .values(
            next.map((r) => ({
              messageId,
              emojiId: r.emojiId,
              emojiName: r.emojiName,
              count: r.count,
              capturedAt,
            })),
          )
          .run();
      }
    });
    return Promise.resolve();
  }

  /**
   * Swap the current-state poll row. Vote counts are live data, not history:
   * one row per message, no revision implied.
   */
  refreshPoll(messageId: string, raw: Record<string, unknown>): Promise<void> {
    this.db.transaction((tx) => {
      tx.insert(messages).values({ id: messageId }).onConflictDoNothing().run();
      tx.delete(polls).where(eq(polls.messageId, messageId)).run();
      tx.insert(polls)
        .values({ messageId, revNo: null, rawJson: JSON.stringify(raw) })
        .run();
    });
    return Promise.resolve();
  }

  /** Reassemble the latest snapshot, or null when never observed with content. */
  findById(id: string): Promise<MessageSnapshot | null> {
    const msg = this.db.select().from(messages).where(eq(messages.id, id)).limit(1).get();
    if (msg === undefined) return Promise.resolve(null);
    const rev = this.db
      .select()
      .from(messageRevisions)
      .where(eq(messageRevisions.messageId, id))
      .orderBy(desc(messageRevisions.revNo))
      .limit(1)
      .get();
    if (rev === undefined) return Promise.resolve(null);

    const userRow =
      msg.authorId === null
        ? undefined
        : this.db.select().from(users).where(eq(users.id, msg.authorId)).limit(1).get();
    const author: AuthorSnapshot =
      userRow === undefined
        ? { ...UNKNOWN_AUTHOR, id: msg.authorId ?? UNKNOWN_AUTHOR.id }
        : {
            id: userRow.id,
            username: userRow.username,
            discriminator: userRow.discriminator,
            bot: userRow.bot === 1,
            webhookId: userRow.webhookId,
          };

    const revNo = rev.revNo;
    const attachmentRows = this.db
      .select()
      .from(attachments)
      .where(eq(attachments.messageId, id))
      .all();
    const embedRows = this.db.select().from(embeds).where(eq(embeds.messageId, id)).all();
    const reactionRows = this.db.select().from(reactions).where(eq(reactions.messageId, id)).all();
    const pollRow = this.db
      .select()
      .from(polls)
      .where(eq(polls.messageId, id))
      .orderBy(desc(polls.id))
      .limit(1)
      .get();
    const forwardRow = this.db
      .select()
      .from(forwardSnapshots)
      .where(eq(forwardSnapshots.messageId, id))
      .orderBy(desc(forwardSnapshots.id))
      .limit(1)
      .get();

    const stickerIds = parseStringArray(rev.stickerIds);

    const pollRaw = pollRow === undefined ? null : parseJsonObject(pollRow.rawJson);
    const forwardRaw = forwardRow === undefined ? null : parseJsonObject(forwardRow.rawJson);
    const snapshotOfForwarded =
      forwardRaw !== null && typeof forwardRaw['id'] === 'string'
        ? (forwardRaw as unknown as MessageSnapshot)
        : null;

    const reference =
      msg.refMessageId === null &&
      msg.refChannelId === null &&
      msg.refGuildId === null &&
      msg.refType === null
        ? null
        : {
            messageId: msg.refMessageId,
            channelId: msg.refChannelId,
            guildId: msg.refGuildId,
            refType: msg.refType,
          };

    const ownChannelId = msg.threadId ?? msg.channelId;
    const channelRow =
      ownChannelId === null
        ? undefined
        : this.db.select().from(channels).where(eq(channels.id, ownChannelId)).limit(1).get();
    const channel: ChannelSnapshot | null =
      channelRow === undefined
        ? null
        : {
            id: channelRow.id,
            kind: channelRow.kind,
            name: channelRow.name,
            parentId: channelRow.parentId,
          };

    return Promise.resolve({
      id: msg.id,
      guildId: msg.guildId,
      channelId: msg.channelId ?? '',
      threadId: msg.threadId,
      channel,
      author,
      content: rev.content,
      createdAt: msg.createdAt === null ? new Date(0) : new Date(msg.createdAt),
      editedAt: rev.editedAt === null ? null : new Date(rev.editedAt),
      attachments: attachmentRows
        .filter((a) => a.revNo === revNo)
        .map((a) => ({
          id: a.attachmentId,
          filename: a.filename,
          contentType: a.contentType,
          sizeBytes: a.sizeBytes ?? 0,
          url: a.remoteUrl ?? '',
          proxyUrl: a.proxyUrl ?? '',
          height: a.height,
          width: a.width,
          durationSecs: a.durationSecs,
          waveform: a.waveform,
          localPath: a.localPath,
        })),
      embeds: embedRows
        .filter((e) => e.revNo === revNo)
        .sort((a, b) => a.idx - b.idx)
        .map((e) => ({ raw: parseJsonObject(e.rawJson) ?? {} })),
      reactions: reactionRows.map((r) => ({
        emojiId: r.emojiId,
        emojiName: r.emojiName,
        count: r.count,
      })),
      stickerIds,
      componentsRaw: [],
      poll: pollRaw === null ? null : { raw: pollRaw },
      reference,
      snapshotOfForwarded,
      flags: rev.flags,
      messageType: msg.messageType ?? 0,
      tts: rev.tts === 1,
      pinned: rev.pinned === 1,
    });
  }

  countRevisions(messageId: string): Promise<number> {
    const rows = this.db
      .select({ id: messageRevisions.id })
      .from(messageRevisions)
      .where(eq(messageRevisions.messageId, messageId))
      .all();
    return Promise.resolve(rows.length);
  }

  getDeletion(
    messageId: string,
  ): Promise<{ kind: string; observedAt: Date; executorId: string | null } | null> {
    const row = this.db
      .select()
      .from(deletionEvents)
      .where(eq(deletionEvents.messageId, messageId))
      .orderBy(desc(deletionEvents.id))
      .limit(1)
      .get();
    if (row === undefined) return Promise.resolve(null);
    return Promise.resolve({
      kind: row.kind,
      observedAt: new Date(row.observedAt),
      executorId: row.executorId,
    });
  }

  /**
   * Fill attribution onto rows that have none. Pre-attributed rows are
   * never overwritten: first sighting wins, like deletions themselves.
   */
  annotateDeletionEvents(
    messageId: string,
    attribution: { executorId: string; auditEntryId: string },
  ): Promise<void> {
    this.db
      .update(deletionEvents)
      .set({ executorId: attribution.executorId, auditEntryId: attribution.auditEntryId })
      .where(and(eq(deletionEvents.messageId, messageId), isNull(deletionEvents.auditEntryId)))
      .run();
    return Promise.resolve();
  }

  listDeletionsForChannel(channelId: string, limit: number): Promise<ChannelDeletion[]> {
    const rows = this.db
      .select()
      .from(deletionEvents)
      .where(eq(deletionEvents.channelId, channelId))
      .orderBy(desc(deletionEvents.id))
      .limit(limit)
      .all();
    return Promise.resolve(
      rows.map((r) => ({
        messageId: r.messageId,
        kind: r.kind,
        observedAt: new Date(r.observedAt),
        executorId: r.executorId,
      })),
    );
  }

  listEditedMessages(channelId: string, limit: number): Promise<EditedMessage[]> {
    const rows = this.db
      .select({
        messageId: messageRevisions.messageId,
        editedAt: sql<string | null>`max(${messageRevisions.editedAt})`,
      })
      .from(messageRevisions)
      .innerJoin(messages, eq(messages.id, messageRevisions.messageId))
      .where(and(eq(messages.channelId, channelId), isNotNull(messageRevisions.editedAt)))
      .groupBy(messageRevisions.messageId)
      .orderBy(desc(sql`max(${messageRevisions.editedAt})`))
      .limit(limit)
      .all();
    const out: EditedMessage[] = [];
    for (const row of rows) {
      if (typeof row.editedAt !== 'string') continue;
      out.push({ messageId: row.messageId, editedAt: new Date(row.editedAt) });
    }
    return Promise.resolve(out);
  }

  getRevisions(messageId: string): Promise<RevisionView[]> {
    const rows = this.db
      .select()
      .from(messageRevisions)
      .where(eq(messageRevisions.messageId, messageId))
      .orderBy(asc(messageRevisions.revNo))
      .all();
    return Promise.resolve(
      rows.map((r) => ({
        revNo: r.revNo,
        content: r.content,
        editedAt: r.editedAt === null ? null : new Date(r.editedAt),
        capturedAt: new Date(r.capturedAt),
        flags: r.flags,
        tts: r.tts === 1,
        pinned: r.pinned === 1,
      })),
    );
  }

  listUnarchivedAttachments(limit: number): Promise<UnarchivedAttachment[]> {
    const rows = this.db
      .select({
        rowId: attachments.id,
        messageId: attachments.messageId,
        attachmentId: attachments.attachmentId,
        url: attachments.remoteUrl,
        filename: attachments.filename,
        guildId: messages.guildId,
        channelId: messages.channelId,
      })
      .from(attachments)
      .innerJoin(messages, eq(messages.id, attachments.messageId))
      .where(isNull(attachments.localPath))
      .orderBy(asc(attachments.id))
      .limit(limit)
      .all();
    return Promise.resolve(rows);
  }

  setAttachmentLocalPath(rowId: number, key: string): Promise<void> {
    this.db.update(attachments).set({ localPath: key }).where(eq(attachments.id, rowId)).run();
    return Promise.resolve();
  }

  listRetentionPolicies(): Promise<RetentionPolicy[]> {
    const rows = this.db.select().from(retentionPolicies).all();
    return Promise.resolve(
      rows.map((r) => ({
        scope: r.scope,
        keepDays: r.keepDays,
        keepRevisions: r.keepRevisions,
        mediaKeepDays: r.mediaKeepDays,
      })),
    );
  }

  getRetention(scope: string): Promise<RetentionPolicy | null> {
    const row = this.db
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.scope, scope))
      .limit(1)
      .get();
    if (row === undefined) return Promise.resolve(null);
    return Promise.resolve({
      scope: row.scope,
      keepDays: row.keepDays,
      keepRevisions: row.keepRevisions,
      mediaKeepDays: row.mediaKeepDays,
    });
  }

  saveRetention(
    scope: string,
    policy: { keepDays: number | null; keepRevisions: number | null; mediaKeepDays: number | null },
  ): Promise<void> {
    this.db
      .insert(retentionPolicies)
      .values({
        scope,
        keepDays: policy.keepDays,
        keepRevisions: policy.keepRevisions,
        mediaKeepDays: policy.mediaKeepDays,
      })
      .onConflictDoUpdate({
        target: retentionPolicies.scope,
        set: {
          keepDays: policy.keepDays,
          keepRevisions: policy.keepRevisions,
          mediaKeepDays: policy.mediaKeepDays,
        },
      })
      .run();
    return Promise.resolve();
  }

  clearRetention(scope: string): Promise<void> {
    this.db.delete(retentionPolicies).where(eq(retentionPolicies.scope, scope)).run();
    return Promise.resolve();
  }

  listActiveGuildIds(): Promise<(string | null)[]> {
    const rows = this.db.selectDistinct({ guildId: messages.guildId }).from(messages).all();
    return Promise.resolve(rows.map((r) => r.guildId));
  }

  listLocalPaths(): Promise<string[]> {
    const rows = this.db
      .selectDistinct({ path: attachments.localPath })
      .from(attachments)
      .where(isNotNull(attachments.localPath))
      .all();
    return Promise.resolve(rows.map((r) => r.path).filter((p): p is string => p !== null));
  }

  getArchiveStats(): Promise<ArchiveStats> {
    const countRows = (
      table: typeof messages | typeof messageRevisions | typeof deletionEvents,
    ): number => {
      const row = this.db.select({ n: count() }).from(table).limit(1).get();
      return row?.n ?? 0;
    };
    const pending = this.db
      .select({ n: count() })
      .from(attachments)
      .where(isNull(attachments.localPath))
      .limit(1)
      .get();
    return Promise.resolve({
      messages: countRows(messages),
      revisions: countRows(messageRevisions),
      attachmentsPending: pending?.n ?? 0,
      deletions: countRows(deletionEvents),
    });
  }

  pruneRevisions(
    guildId: string | null,
    keep: number,
  ): Promise<{ revisions: number; files: string[] }> {
    const keepN = Math.max(1, Math.floor(keep));
    let pruned = 0;
    const released: string[] = [];
    this.db.transaction((tx) => {
      const scope =
        guildId === null
          ? tx.select({ id: messages.id }).from(messages).where(isNull(messages.guildId)).all()
          : tx
              .select({ id: messages.id })
              .from(messages)
              .where(eq(messages.guildId, guildId))
              .all();
      for (const { id } of scope) {
        const revs = tx
          .select({ revNo: messageRevisions.revNo })
          .from(messageRevisions)
          .where(eq(messageRevisions.messageId, id))
          .orderBy(desc(messageRevisions.revNo))
          .all();
        if (revs.length <= keepN) continue;
        const cutoff = revs[keepN - 1]?.revNo;
        if (cutoff === undefined) continue;
        const older = and(eq(attachments.messageId, id), lt(attachments.revNo, cutoff));
        const doomed = tx
          .select({ path: attachments.localPath })
          .from(attachments)
          .where(older)
          .all();
        const oldRevs = and(eq(messageRevisions.messageId, id), lt(messageRevisions.revNo, cutoff));
        tx.delete(messageRevisions).where(oldRevs).run();
        tx.delete(attachments).where(older).run();
        tx.delete(embeds)
          .where(and(eq(embeds.messageId, id), lt(embeds.revNo, cutoff)))
          .run();
        tx.delete(polls)
          .where(and(eq(polls.messageId, id), lt(polls.revNo, cutoff)))
          .run();
        // Vote-refresh rows carry null rev_no: untouched (current state kept).
        const fwd = tx
          .select({ rowId: forwardSnapshots.id })
          .from(forwardSnapshots)
          .where(eq(forwardSnapshots.messageId, id))
          .orderBy(desc(forwardSnapshots.id))
          .all();
        for (const row of fwd.slice(1)) {
          tx.delete(forwardSnapshots).where(eq(forwardSnapshots.id, row.rowId)).run();
        }
        pruned += revs.length - keepN;
        const live = new Set(
          tx
            .select({ path: attachments.localPath })
            .from(attachments)
            .where(eq(attachments.messageId, id))
            .all()
            .map((r) => r.path)
            .filter((p): p is string => p !== null),
        );
        for (const d of doomed) {
          if (d.path !== null && !live.has(d.path)) released.push(d.path);
        }
      }
    });
    return Promise.resolve({ revisions: pruned, files: released });
  }

  expireMessages(
    guildId: string | null,
    olderThan: Date,
  ): Promise<{ messages: string[]; files: string[] }> {
    const iso = olderThan.toISOString();
    const expired: string[] = [];
    // No survivor check needed: storage keys embed the message id, so an
    // expired message's files are never referenced elsewhere.
    const files = new Set<string>();
    this.db.transaction((tx) => {
      const scope = guildId === null ? isNull(messages.guildId) : eq(messages.guildId, guildId);
      const targets = tx
        .select({ id: messages.id })
        .from(messages)
        .where(and(scope, isNotNull(messages.createdAt), lt(messages.createdAt, iso)))
        .all();
      for (const { id } of targets) {
        const paths = tx
          .select({ path: attachments.localPath })
          .from(attachments)
          .where(eq(attachments.messageId, id))
          .all();
        for (const p of paths) {
          if (p.path !== null) files.add(p.path);
        }
        tx.delete(deletionEvents).where(eq(deletionEvents.messageId, id)).run();
        tx.delete(messages).where(eq(messages.id, id)).run();
        expired.push(id);
      }
    });
    return Promise.resolve({ messages: expired, files: [...files] });
  }

  expireMedia(guildId: string | null, olderThan: Date): Promise<{ rows: number; files: string[] }> {
    const iso = olderThan.toISOString();
    let rows = 0;
    const files: string[] = [];
    this.db.transaction((tx) => {
      const scope = guildId === null ? isNull(messages.guildId) : eq(messages.guildId, guildId);
      const targets = tx
        .select({ rowId: attachments.id, path: attachments.localPath })
        .from(attachments)
        .innerJoin(messages, eq(messages.id, attachments.messageId))
        .where(
          and(
            scope,
            isNotNull(messages.createdAt),
            lt(messages.createdAt, iso),
            isNotNull(attachments.localPath),
          ),
        )
        .all();
      for (const t of targets) {
        tx.update(attachments).set({ localPath: null }).where(eq(attachments.id, t.rowId)).run();
      }
      rows = targets.length;
      const live = new Set(
        tx
          .select({ path: attachments.localPath })
          .from(attachments)
          .where(isNotNull(attachments.localPath))
          .all()
          .map((r) => r.path)
          .filter((p): p is string => p !== null),
      );
      for (const t of targets) {
        if (t.path !== null && !live.has(t.path)) files.push(t.path);
      }
    });
    return Promise.resolve({ rows, files });
  }

  /**
   * Full-text + filtered search. Raw SQL is contained here: drizzle's
   * builder cannot express MATCH, window functions, or FTS rank. Channel
   * scope matches filed-under semantics (channel_id OR thread_id).
   */
  searchMessages(query: SearchQuery): Promise<SearchHit[]> {
    const text = typeof query.text === 'string' ? query.text.trim() : '';
    const useText = text !== '';
    const useAuthor = query.authorId !== undefined;
    const useAfter = query.after instanceof Date;
    const useBefore = query.before instanceof Date;
    const useFiles = query.hasAttachment === true;
    const usePoll = query.hasPoll === true;
    const deleted = query.deleted ?? null;
    if (
      !useText &&
      !useAuthor &&
      !useAfter &&
      !useBefore &&
      !useFiles &&
      !usePoll &&
      deleted === null
    ) {
      throw new Error('searchMessages requires text or at least one filter');
    }
    const limit = Math.min(25, Math.max(1, query.limit ?? 25));
    const params: (string | number)[] = [];
    const filters: string[] = ['(m.channel_id = ? OR m.thread_id = ?)'];
    params.push(query.channelId, query.channelId);
    if (useAuthor) {
      filters.push('m.author_id = ?');
      params.push(query.authorId as string);
    }
    if (useAfter && query.after !== undefined) {
      filters.push('m.created_at >= ?');
      params.push(query.after.toISOString());
    }
    if (useBefore && query.before !== undefined) {
      filters.push('m.created_at <= ?');
      params.push(query.before.toISOString());
    }
    if (useFiles) filters.push('EXISTS (SELECT 1 FROM attachments a WHERE a.message_id = m.id)');
    if (usePoll) filters.push('EXISTS (SELECT 1 FROM polls p WHERE p.message_id = m.id)');
    if (deleted === true) filters.push('m.deleted_at IS NOT NULL');
    if (deleted === false) filters.push('m.deleted_at IS NULL');
    const where = filters.join(' AND ');

    let statement: string;
    if (useText) {
      params.unshift(toMatchQuery(text));
      statement = `SELECT m.id AS message_id, m.channel_id AS channel_id,
          m.author_id AS author_id, r.content AS content, r.rev_no AS rev_no,
          m.created_at AS created_at, r.edited_at AS edited_at,
          m.deleted_at AS deleted_at, rank AS rank
        FROM (
          SELECT m.id AS mid, r.rev_no AS match_rev,
            ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY rank) AS rn,
            rank AS rank
          FROM message_fts
          JOIN message_revisions r ON r.id = message_fts.rowid
          JOIN messages m ON m.id = r.message_id
          WHERE message_fts MATCH ? AND ${where}
        )
        JOIN messages m ON m.id = mid
        JOIN message_revisions r ON r.message_id = m.id AND r.rev_no = match_rev
        WHERE rn = 1 ORDER BY rank LIMIT ?`;
      params.push(limit);
    } else {
      statement = `SELECT m.id AS message_id, m.channel_id AS channel_id,
          m.author_id AS author_id, r.content AS content, r.rev_no AS rev_no,
          m.created_at AS created_at, r.edited_at AS edited_at,
          m.deleted_at AS deleted_at, 0.0 AS rank
        FROM messages m
        JOIN message_revisions r ON r.message_id = m.id
        WHERE r.rev_no = (SELECT MAX(rev_no) FROM message_revisions WHERE message_id = m.id)
          AND ${where}
        ORDER BY m.created_at DESC LIMIT ?`;
      params.push(limit);
    }
    const rows: unknown = this.db.$client.prepare(statement).all(...params);
    if (!Array.isArray(rows)) throw new Error('search returned an unexpected shape');
    return Promise.resolve(rows.map(toSearchHit));
  }
}

function toMatchQuery(text: string): string {
  return text
    .split(/\s+/)
    .filter((term) => term.length > 0)
    .map((term) => `"${term.replace(/"/g, '""')}"*`)
    .join(' ');
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new Error(`corrupt search row: ${what}`);
  return value;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toSearchHit(row: unknown): SearchHit {
  if (typeof row !== 'object' || row === null) throw new Error('corrupt search row');
  const r = row as Record<string, unknown>;
  const createdRaw = requiredString(r['created_at'], 'created_at');
  const editedRaw = r['edited_at'];
  const deletedRaw = r['deleted_at'];
  const rankRaw = r['rank'];
  if (typeof rankRaw !== 'number') throw new Error('corrupt search row: rank');
  const revRaw = r['rev_no'];
  if (typeof revRaw !== 'number') throw new Error('corrupt search row: rev_no');
  return {
    messageId: requiredString(r['message_id'], 'message_id'),
    channelId: optionalString(r['channel_id']),
    authorId: optionalString(r['author_id']),
    content: requiredString(r['content'], 'content'),
    revNo: revRaw,
    createdAt: new Date(createdRaw),
    editedAt: typeof editedRaw === 'string' ? new Date(editedRaw) : null,
    deletedAt: typeof deletedRaw === 'string' ? new Date(deletedRaw) : null,
    rank: rankRaw,
  };
}
