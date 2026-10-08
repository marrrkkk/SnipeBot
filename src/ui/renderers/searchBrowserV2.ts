import { ButtonStyle } from 'discord.js';
import { discordTimestamp } from '../../commands/rendering.js';
import type { MessageViewModel, SearchHitViewModel } from '../viewModels.js';
import { renderListPage, renderSectionPage, type V2Reply } from './browserShell.js';

/**
 * Components V2 renderer for the search browser.
 * Section detail cards with avatar thumbnail; lists navigate via
 * Previous/Next/Close plus a single jump select. No embeds here.
 * Pagination cursors reference a server-side session (see sessions.ts).
 */

export const SEARCH_ACCENT = 0xed4245;

export function searchPageAction(sessionId: string, page: number): string {
  return `seb:pg:${sessionId}:${String(page)}`;
}

export function searchDetailAction(sessionId: string, messageId: string, page: number): string {
  return `seb:dt:${sessionId}:${messageId}:${String(page)}`;
}

export function searchBackAction(sessionId: string, page: number): string {
  return `seb:bk:${sessionId}:${String(page)}`;
}

export function searchJumpAction(sessionId: string, page: number): string {
  return `seb:jp:${sessionId}:${String(page)}`;
}

export function searchCloseAction(): string {
  return 'seb:cl';
}

function rowText(index: number, hit: SearchHitViewModel): string {
  const marker = hit.deleted ? '🗑️ ' : '';
  const edited = hit.edited ? ' · edited' : '';
  return `${marker}**${String(index)}. ${hit.authorName}** · ${hit.channelLabel} · ${discordTimestamp(hit.createdAt)}${edited}\n> ${hit.excerpt}`;
}

/** Paged search results with a jump select. */
export function renderSearchPage(
  items: SearchHitViewModel[],
  sessionId: string,
  page: number,
  pageSize: number,
  totalResults: number,
  totalPages: number,
  queryLabel: string,
): V2Reply {
  const start = (page - 1) * pageSize;
  return renderListPage({
    title: `🔍 Search — ${queryLabel}`,
    range: `${String(totalResults === 0 ? 0 : start + 1)}–${String(Math.min(totalResults, page * pageSize))} of ${String(totalResults)}`,
    rows: items.map((item, i) => rowText(start + i + 1, item)),
    page,
    totalPages,
    prevId: searchPageAction(sessionId, page - 1),
    nextId: searchPageAction(sessionId, page + 1),
    jump: {
      customId: searchJumpAction(sessionId, page),
      placeholder: 'Jump to a result…',
      options: items.map((item, i) => ({
        label: `#${String(start + i + 1)} ${item.authorName}`,
        value: item.messageId,
        description: item.excerpt.replace(/\s+/g, ' ').trim().slice(0, 100),
      })),
    },
    closeId: searchCloseAction(),
  });
}

/** Search hit detail (message fetched by id; Back returns to the session page). */
export function renderSearchDetail(vm: MessageViewModel, backId: string): V2Reply {
  const facts = [
    `Attachments: ${String(vm.attachments.length)}`,
    `Reactions: ${String(vm.reactionCount)}`,
  ];
  const gallery = vm.attachments
    .filter((a) => a.contentType !== null && a.contentType.startsWith('image/'))
    .map((a) => a.proxyUrl)
    .filter((url) => url !== '')
    .slice(0, 4);
  const fileLine =
    vm.attachments.length > 0 ? `📎 ${vm.attachments.map((a) => a.filename).join(', ')}` : null;
  return renderSectionPage({
    accent: SEARCH_ACCENT,
    title: vm.author.name,
    meta: `<#${vm.channelId}> · ${discordTimestamp(vm.createdAt)}`,
    avatarUrl: vm.avatarUrl,
    avatarAlt: `${vm.author.name}'s avatar`,
    body: vm.content.slice(0, 3500),
    galleryUrls: gallery,
    facts: facts.join(' · '),
    extras: fileLine === null ? [] : [fileLine],
    buttons: [
      { id: backId, label: '◀ Back', style: ButtonStyle.Secondary },
      { id: searchCloseAction(), label: 'Close', style: ButtonStyle.Danger },
    ],
  });
}
