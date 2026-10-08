import { ButtonStyle } from 'discord.js';
import { DEFAULT_PAGE_SIZE } from '../browser.js';
import { discordTimestamp } from '../../commands/rendering.js';
import type { BulkGroupViewModel, MessageViewModel, SnipeBrowserViewModel } from '../viewModels.js';
import {
  formatDateTime,
  renderEphemeralState,
  renderListPage,
  renderSectionPage,
  renderStatePage,
  type V2Reply,
} from './browserShell.js';

export type { V2Reply };

/**
 * Components V2 renderer for the snipe browser (singles + bulk groups).
 * Section detail cards with avatar thumbnail, gallery, and one nav row;
 * lists navigate via Previous/Next/Close plus a single jump select.
 * View models in, `IsComponentsV2` payloads out. No embeds here.
 */

export const SNIPE_ACCENT = 0xed4245;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export function jumpToAction(page: number): string {
  return `snb:jp:${String(page)}`;
}

export function jumpBulkAction(page: number): string {
  return `snb:jb:${String(page)}`;
}

export function detailNavAction(position: number): string {
  return `snb:np:${String(position)}`;
}

export function listPageAction(page: number): string {
  return `snb:pg:${String(page)}`;
}

export function closeAction(): string {
  return 'snb:cl';
}

export function bulkGroupAction(kind: 'list' | 'detail', page: number, group?: number): string {
  return kind === 'list'
    ? `snb:bg:${String(page)}`
    : `snb:bd:${String(group ?? 1)}:${String(page)}`;
}

function rowText(index: number, m: SnipeBrowserViewModel['items'][number]): string {
  const head = `**${String(index)}. ${m.author.name}** · ${m.channelName} · ${formatDateTime(m.createdAt)}`;
  const attach =
    m.attachments.length > 0
      ? `\n📎 ${m.attachments
          .slice(0, 3)
          .map((a) => a.filename)
          .join(
            ', ',
          )}${m.attachments.length > 3 ? ` (+${String(m.attachments.length - 3)} more)` : ''}`
      : '';
  return `${head}\n> ${m.content.slice(0, 300)}${attach}`;
}

function jumpLabel(index: number, m: { author: { name: string }; content: string }): string {
  return `#${String(index)} ${m.author.name}`;
}

function jumpDescription(m: { content: string }): string {
  const flat = m.content.replace(/\s+/g, ' ').trim();
  return flat === '' ? '*no text content*' : flat;
}

/** Paged results list: header + rows + nav + one jump select. */
export function renderBrowserPage(view: SnipeBrowserViewModel): V2Reply {
  const start = (view.page - 1) * view.pageSize;
  return renderListPage({
    title: view.title,
    range: view.rangeText,
    rows: view.items.map((item, i) => rowText(start + i + 1, item)),
    page: view.page,
    totalPages: view.totalPages,
    prevId: listPageAction(view.page - 1),
    nextId: listPageAction(view.page + 1),
    jump: {
      customId: jumpToAction(view.page),
      placeholder: 'Jump to a message…',
      options: view.items.map((item, i) => ({
        label: jumpLabel(start + i + 1, item),
        value: item.id,
        description: jumpDescription(item),
      })),
    },
    closeId: closeAction(),
  });
}

function galleryUrls(m: MessageViewModel): string[] {
  return m.attachments
    .filter((a) => a.contentType !== null && a.contentType.startsWith('image/'))
    .map((a) => a.proxyUrl)
    .filter((url) => url !== '');
}

function factsOf(m: MessageViewModel): string {
  const facts = [
    `Attachments: ${String(m.attachments.length)}`,
    `Reactions: ${String(m.reactionCount)}`,
  ];
  if (m.revisionCount !== null) {
    facts.push(
      `Edit history: ${String(m.revisionCount)} revision${m.revisionCount === 1 ? '' : 's'}`,
    );
  }
  if (m.embedCount > 0) facts.push(`Embeds: ${String(m.embedCount)}`);
  if (m.stickerCount > 0) facts.push(`Stickers: ${String(m.stickerCount)}`);
  if (m.pollSummary !== null) facts.push(`Poll: ${m.pollSummary}`);
  return facts.join(' · ');
}

function attachmentLine(m: MessageViewModel): string | null {
  if (m.attachments.length === 0) return null;
  return `📎 ${m.attachments
    .slice(0, 5)
    .map((a) => a.filename)
    .join(', ')}${m.attachments.length > 5 ? ` (+${String(m.attachments.length - 5)} more)` : ''}`;
}

/** Detail card with Older/Newer message walk, List, Close. */
export function renderSnipeDetail(
  message: MessageViewModel,
  position: number,
  total: number,
): V2Reply {
  const meta = [
    message.channelName,
    `Deleted ${discordTimestamp(message.deletedAt ?? message.createdAt)}`,
  ];
  meta.push(`#${String(position)} of ${String(total)}`);
  if (message.executorLabel !== null) meta.push(`possibly deleted by ${message.executorLabel}`);
  const fileLine = attachmentLine(message);
  return renderSectionPage({
    accent: SNIPE_ACCENT,
    title: message.author.name,
    meta: meta.join(' · '),
    avatarUrl: message.avatarUrl,
    avatarAlt: `${message.author.name}'s avatar`,
    body: message.content.slice(0, 3500),
    galleryUrls: galleryUrls(message),
    facts: factsOf(message),
    extras: fileLine === null ? [] : [fileLine],
    buttons: [
      {
        id: detailNavAction(position + 1),
        label: '◀ Older',
        style: ButtonStyle.Secondary,
        disabled: position >= total,
      },
      {
        id: detailNavAction(position - 1),
        label: 'Newer ▶',
        style: ButtonStyle.Secondary,
        disabled: position <= 1,
      },
      {
        id: listPageAction(Math.ceil(position / PAGE_SIZE)),
        label: '☰ List',
        style: ButtonStyle.Secondary,
      },
      { id: closeAction(), label: 'Close', style: ButtonStyle.Danger },
    ],
  });
}

function groupRow(group: BulkGroupViewModel): string {
  const head = `**Bulk deletion — ${String(group.totalMembers)} message${group.totalMembers === 1 ? '' : 's'}** · ${formatDateTime(group.observedAt)}`;
  const lines = group.members
    .slice(0, 3)
    .map((m) => `**${m.author.name}**: ${m.content.slice(0, 150)}`);
  if (group.totalMembers > group.members.length) {
    lines.push(`…and ${String(group.totalMembers - group.members.length)} more`);
  }
  return `${head}\n${lines.join('\n')}`;
}

/** Paged bulk-groups list with a jump select. */
export function renderBulkGroupsPage(
  groups: BulkGroupViewModel[],
  page: number,
  pageSize: number,
  totalGroups: number,
  totalPages: number,
): V2Reply {
  return renderListPage({
    title: '🗑 Bulk Deletions',
    range: `${String((page - 1) * pageSize + 1)}–${String(Math.min(totalGroups, page * pageSize))} of ${String(totalGroups)}`,
    rows: groups.map((group) => groupRow(group)),
    page,
    totalPages,
    prevId: bulkGroupAction('list', page - 1),
    nextId: bulkGroupAction('list', page + 1),
    jump: {
      customId: jumpBulkAction(page),
      placeholder: 'Jump to a bulk deletion…',
      options: groups.map((group) => ({
        label: `Group ${String(group.position)} — ${String(group.totalMembers)} messages`,
        value: String(group.position),
      })),
    },
    closeId: closeAction(),
  });
}

/** One bulk group: member list with Prev/Next-group, Back, Close. */
export function renderBulkGroupPage(group: BulkGroupViewModel, retPage: number): V2Reply {
  const lines = group.members.map((m) => `**${m.author.name}**: ${m.content.slice(0, 150)}`);
  if (group.totalMembers > group.members.length) {
    lines.push(`…and ${String(group.totalMembers - group.members.length)} more`);
  }
  return renderSectionPage({
    accent: SNIPE_ACCENT,
    title: `Bulk deletion — ${String(group.totalMembers)} message${group.totalMembers === 1 ? '' : 's'}`,
    meta: `${formatDateTime(group.observedAt)} · group ${String(group.position)} of ${String(group.totalGroups)}`,
    body: lines.join('\n').slice(0, 3500),
    facts: `${String(group.totalMembers)} recoverable messages`,
    buttons: [
      {
        id: bulkGroupAction('detail', retPage, group.position - 1),
        label: '◀ Previous',
        style: ButtonStyle.Secondary,
        disabled: group.position <= 1,
      },
      {
        id: bulkGroupAction('detail', retPage, group.position + 1),
        label: 'Next ▶',
        style: ButtonStyle.Secondary,
        disabled: group.position >= group.totalGroups,
      },
      { id: bulkGroupAction('list', retPage), label: '◀ Back', style: ButtonStyle.Secondary },
      { id: closeAction(), label: 'Close', style: ButtonStyle.Danger },
    ],
  });
}

export function renderEmpty(): V2Reply {
  return renderStatePage('🗑 Deleted Messages', 'Nothing to snipe here.');
}

export function renderDenied(reason: string): ReturnType<typeof renderEphemeralState> {
  return renderEphemeralState('Permission denied', reason);
}

export function renderExpired(): V2Reply {
  return renderStatePage(
    'Browser expired',
    'This browser has expired. Run the command again to open a new one.',
  );
}

export function renderClosed(): V2Reply {
  return renderStatePage(
    'Browser closed',
    'This browser is closed. Run the command again for a new one.',
  );
}

export function renderError(): ReturnType<typeof renderEphemeralState> {
  return renderEphemeralState(
    'Something went wrong',
    'The archive could not be read. Try again in a moment.',
  );
}

export function renderGone(): ReturnType<typeof renderEphemeralState> {
  return renderEphemeralState('Message unavailable', 'That message is no longer available here.');
}
