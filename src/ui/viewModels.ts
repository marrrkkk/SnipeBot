import type { MessageSnapshot } from '../domain/messageSnapshot.js';
import type { SearchHit } from '../repositories/drizzleMessageRepository.js';

/**
 * Discord-free view models for the Components V2 UI.
 * Domain → view model here → `src/ui/renderers/` owns all discord.js builders.
 */

export type MessageStatus = 'deleted' | 'edited' | 'archived';

export type AuthorViewModel = {
  id: string;
  name: string;
};

export type AttachmentViewModel = {
  filename: string;
  sizeBytes: number;
  durationSecs: number | null;
  contentType: string | null;
  /** Ephemeral CDN links (gallery use); filenames always render regardless. */
  url: string;
  proxyUrl: string;
};

export type MessageViewModel = {
  id: string;
  author: AuthorViewModel;
  /** Live-resolved avatar URL, if the author is currently cached. */
  avatarUrl: string | null;
  channelId: string;
  channelName: string;
  /** Pre-formatted for display (`8 Oct 2026 · 20:43` style comes from the renderer). */
  createdAt: Date;
  deletedAt: Date | null;
  executorLabel: string | null;
  content: string;
  attachments: AttachmentViewModel[];
  reactionCount: number;
  embedCount: number;
  stickerCount: number;
  pollSummary: string | null;
  revisionCount: number | null;
  status: MessageStatus;
};

export type SnipeBrowserViewModel = {
  title: string;
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  rangeText: string;
  items: MessageViewModel[];
};

export type MessageDetailViewModel = {
  message: MessageViewModel;
};

export type BrowserQuery = {
  channelId: string;
  channelName: string;
  page: number;
  pageSize: number;
};

const MAX_CONTENT = 1500;

function excerpt(content: string, max: number = MAX_CONTENT): string {
  const text = content.trim() === '' ? '*no text content*' : content;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Truncated display text for excerpts outside full message views. */
export function excerptText(content: string, max = 300): string {
  return excerpt(content, max);
}

function pollSummaryOf(raw: Record<string, unknown>): string | null {
  const question = raw['question'];
  const title =
    typeof question === 'object' && question !== null
      ? ((question as { text?: unknown }).text ?? null)
      : null;
  if (typeof title !== 'string') return null;
  return title;
}

/** A snapshot is worth showing when it carries any recoverable substance. */
export function isRecoverableSnapshot(snap: MessageSnapshot): boolean {
  return (
    snap.content.trim() !== '' ||
    snap.attachments.length > 0 ||
    snap.embeds.length > 0 ||
    snap.poll !== null ||
    snap.snapshotOfForwarded !== null
  );
}

export function toMessageViewModel(
  snap: MessageSnapshot,
  opts: {
    channelName?: string;
    deletedAt?: Date | null;
    executorLabel?: string | null;
    revisionCount?: number | null;
    status?: MessageStatus;
    avatarUrl?: string | null;
  } = {},
): MessageViewModel {
  return {
    id: snap.id,
    author: { id: snap.author.id, name: snap.author.username },
    avatarUrl: opts.avatarUrl ?? null,
    channelId: snap.channelId,
    channelName: opts.channelName ?? `#${snap.channelId}`,
    createdAt: snap.createdAt,
    deletedAt: opts.deletedAt ?? null,
    executorLabel: opts.executorLabel ?? null,
    content: excerpt(snap.content),
    attachments: snap.attachments.map((a) => ({
      filename: a.filename,
      sizeBytes: a.sizeBytes,
      durationSecs: a.durationSecs,
      contentType: a.contentType,
      url: a.url,
      proxyUrl: a.proxyUrl,
    })),
    reactionCount: snap.reactions.reduce((sum, r) => sum + r.count, 0),
    embedCount: snap.embeds.length,
    stickerCount: snap.stickerIds.length,
    pollSummary: snap.poll === null ? null : pollSummaryOf(snap.poll.raw),
    revisionCount: opts.revisionCount ?? null,
    status: opts.status ?? 'deleted',
  };
}

export function toBrowserViewModel(
  items: MessageViewModel[],
  totalResults: number,
  query: BrowserQuery,
  totalPages: number,
  rangeText: string,
): SnipeBrowserViewModel {
  return {
    title: '🗑 Deleted Messages',
    totalResults,
    page: query.page,
    pageSize: query.pageSize,
    totalPages,
    rangeText,
    items,
  };
}

export type RevisionViewModel = {
  content: string;
  position: number;
  total: number;
  editedAt: Date | null;
  capturedAt: Date;
};

export type EditWalkerViewModel = {
  message: MessageViewModel;
  revision: RevisionViewModel;
};

export function toRevisionViewModel(
  content: string,
  editedAt: Date | null,
  capturedAt: Date,
  position: number,
  total: number,
): RevisionViewModel {
  return { content: excerpt(content), position, total, editedAt, capturedAt };
}

export type SearchHitViewModel = {
  messageId: string;
  authorName: string;
  channelLabel: string;
  createdAt: Date;
  excerpt: string;
  deleted: boolean;
  edited: boolean;
};

export function toSearchHitViewModel(
  hit: SearchHit,
  authorName: string,
  channelLabel: string,
): SearchHitViewModel {
  return {
    messageId: hit.messageId,
    authorName,
    channelLabel,
    createdAt: hit.createdAt,
    excerpt: excerpt(hit.content, 300),
    deleted: hit.deletedAt !== null,
    edited: hit.editedAt !== null,
  };
}

export type BulkGroupViewModel = {
  /** 1-based group position (stable newest-first ordering). */
  position: number;
  totalGroups: number;
  observedAt: Date;
  members: MessageViewModel[];
  totalMembers: number;
};
