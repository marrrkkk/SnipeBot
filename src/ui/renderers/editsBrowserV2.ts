import { ButtonStyle } from 'discord.js';
import { discordTimestamp } from '../../commands/rendering.js';
import type { EditWalkerViewModel, MessageViewModel } from '../viewModels.js';
import { formatDateTime, renderListPage, renderSectionPage, type V2Reply } from './browserShell.js';

/**
 * Components V2 renderer for the edits browser + revision walker.
 * Section walker cards with avatar thumbnail; lists navigate via
 * Previous/Next/Close plus a single jump select. No embeds here.
 */

export const EDITS_ACCENT = 0xfee75c;

export function editListAction(
  kind: 'page' | 'detail' | 'back' | 'jump',
  page: number,
  id?: string,
): string {
  if (kind === 'detail') return `edb:dt:${id ?? ''}:${String(page)}`;
  if (kind === 'back') return `edb:bk:${String(page)}`;
  if (kind === 'jump') return `edb:jp:${String(page)}`;
  return `edb:pg:${String(page)}`;
}

export function walkerAction(messageId: string, pos: number, retPage: number): string {
  return `edb:rv:${messageId}:${String(pos)}:${String(retPage)}`;
}

export function closeAction(): string {
  return 'edb:cl';
}

function listRow(index: number, m: MessageViewModel, editCount: number, lastEdit: Date): string {
  const head = `**${String(index)}. ${m.author.name}** · ${m.channelName} · edited ${discordTimestamp(lastEdit)}`;
  return `${head}\n> ${m.content.slice(0, 300)}\n_${String(editCount)} edit${editCount === 1 ? '' : 's'}_`;
}

/** Paged edited-messages list with a jump select. */
export function renderEditsListPage(
  items: { message: MessageViewModel; editCount: number; lastEdit: Date }[],
  page: number,
  pageSize: number,
  totalResults: number,
  totalPages: number,
): V2Reply {
  const start = (page - 1) * pageSize;
  return renderListPage({
    title: '✏️ Edited Messages',
    range: `${String(totalResults === 0 ? 0 : start + 1)}–${String(Math.min(totalResults, page * pageSize))} of ${String(totalResults)}`,
    rows: items.map((item, i) =>
      listRow(start + i + 1, item.message, item.editCount, item.lastEdit),
    ),
    page,
    totalPages,
    prevId: editListAction('page', page - 1),
    nextId: editListAction('page', page + 1),
    jump: {
      customId: editListAction('jump', page),
      placeholder: 'Jump to an edited message…',
      options: items.map((item, i) => ({
        label: `#${String(start + i + 1)} ${item.message.author.name}`,
        value: item.message.id,
        description: `${String(item.editCount)} edit${item.editCount === 1 ? '' : 's'}`,
      })),
    },
    closeId: closeAction(),
  });
}

/** One revision as a section card with Older/Newer (disabled at ends). */
export function renderWalkerPage(view: EditWalkerViewModel, retPage: number): V2Reply {
  const { message, revision } = view;
  const state =
    revision.editedAt !== null ? `edited ${discordTimestamp(revision.editedAt)}` : 'original';
  return renderSectionPage({
    accent: EDITS_ACCENT,
    title: message.author.name,
    meta: `${message.channelName} · Revision ${String(revision.position)} of ${String(revision.total)} · ${state}`,
    avatarUrl: message.avatarUrl,
    avatarAlt: `${message.author.name}'s avatar`,
    body: revision.content.slice(0, 3500),
    facts: `First captured ${formatDateTime(revision.capturedAt)} · ${message.id}`,
    buttons: [
      {
        id: walkerAction(message.id, revision.position - 1, retPage),
        label: '◀ Older',
        style: ButtonStyle.Secondary,
        disabled: revision.position <= 1,
      },
      {
        id: walkerAction(message.id, revision.position + 1, retPage),
        label: 'Newer ▶',
        style: ButtonStyle.Secondary,
        disabled: revision.position >= revision.total,
      },
      ...(retPage > 0
        ? [
            {
              id: editListAction('back', retPage),
              label: '◀ Back',
              style: ButtonStyle.Secondary as const,
            },
          ]
        : []),
      { id: closeAction(), label: 'Close', style: ButtonStyle.Danger },
    ],
  });
}
