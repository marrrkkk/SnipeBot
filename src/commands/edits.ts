import { SlashCommandBuilder } from 'discord.js';
import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import type { MessageSnapshot } from '../domain/messageSnapshot.js';
import type { EditHistoryPort, RevisionView } from '../repositories/drizzleMessageRepository.js';
import { clampPage, DEFAULT_PAGE_SIZE, totalPages } from '../ui/browser.js';
import { renderEditsListPage, renderWalkerPage } from '../ui/renderers/editsBrowserV2.js';
import {
  renderClosed,
  renderDenied,
  renderError,
  renderExpired,
} from '../ui/renderers/snipeBrowserV2.js';
import { renderStatePage } from '../ui/renderers/browserShell.js';
import {
  toMessageViewModel,
  toRevisionViewModel,
  type EditWalkerViewModel,
  type MessageViewModel,
} from '../ui/viewModels.js';
import { logger } from '../utils/logger.js';
import { isFiledUnder, mayReadChannel } from './channelAccess.js';
import { checkCommandAccess, getPolicyQuery } from './policy.js';
import type { CommandModule } from './types.js';

/**
 * `/edits` — Components V2 browser over edited messages + revision walker.
 * Thin Discord boundary: auth → query → view model → V2 renderer.
 */

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const builder = new SlashCommandBuilder()
  .setName('edits')
  .setDescription('Show the edit history of a recently edited message in this channel');
builder.addIntegerOption((option) =>
  option
    .setName('index')
    .setDescription('Which edited message (1 = latest)')
    .setMinValue(1)
    .setMaxValue(10),
);

export const editsData: SlashCommandBuilder = builder;

// Write-once composition binding (set in index.ts; precedent: getDb).
let history: EditHistoryPort | null = null;

export function configureEditHistoryQuery(port: EditHistoryPort): void {
  history = port;
}

/** Test/support hook: drop the binding so the unconfigured path is testable. */
export function resetEditHistoryQueryForTests(): void {
  history = null;
}

/** Read access to the binding for sibling surfaces (context menu). */
export function getEditHistoryQuery(): EditHistoryPort | null {
  return history;
}

export type EditedEntry = {
  messageId: string;
  snap: MessageSnapshot;
  revs: RevisionView[];
  editCount: number;
  lastEdit: Date;
};

function lastEditAt(revs: RevisionView[]): Date {
  for (let i = revs.length - 1; i >= 0; i -= 1) {
    const editedAt = revs[i]?.editedAt;
    if (editedAt !== null && editedAt !== undefined) return editedAt;
  }
  const first = revs[0];
  return first === undefined ? new Date(0) : first.capturedAt;
}

/** Re-query + resolve the edited entries for this channel (newest first). */
export async function resolveEditedEntries(
  port: EditHistoryPort,
  channelId: string,
): Promise<EditedEntry[]> {
  const edited = await port.listEditedMessages(channelId, 25);
  const out: EditedEntry[] = [];
  for (const entry of edited) {
    const revs = await port.getRevisions(entry.messageId);
    const snap = await port.findById(entry.messageId);
    if (snap === null || revs.length === 0) continue;
    out.push({
      messageId: entry.messageId,
      snap,
      revs,
      editCount: revs.filter((r) => r.editedAt !== null).length,
      lastEdit: lastEditAt(revs),
    });
  }
  return out;
}

/** Latest-or-position revision view for walkers (shared with the context menu). */
export function toWalker(
  entry: EditedEntry,
  position: number,
  channelName: string,
  avatarUrl: string | null = null,
): EditWalkerViewModel | null {
  const pos = clampPage(position, entry.revs.length);
  const rev = entry.revs[pos - 1];
  if (rev === undefined) return null;
  const message: MessageViewModel = {
    ...toMessageViewModel(entry.snap, { channelName, status: 'edited', avatarUrl }),
    revisionCount: entry.revs.length,
  };
  return {
    message,
    revision: toRevisionViewModel(
      rev.content,
      rev.editedAt,
      rev.capturedAt,
      pos,
      entry.revs.length,
    ),
  };
}

function renderEmptyEdits(): ReturnType<typeof renderStatePage> {
  return renderStatePage('✏️ Edited Messages', 'No edited messages here.');
}

async function replyEditsList(
  interaction: Parameters<CommandModule['execute']>[0],
  entries: EditedEntry[],
  page: number,
): Promise<void> {
  if (entries.length === 0) {
    await interaction.reply({ ...renderEmptyEdits(), allowedMentions: { parse: [] } });
    return;
  }
  const pages = totalPages(entries.length, PAGE_SIZE);
  const safe = clampPage(page, pages);
  await interaction.reply({
    ...renderEditsListPage(
      entries.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE).map((entry) => ({
        message: {
          ...toMessageViewModel(entry.snap, { status: 'edited' }),
          revisionCount: entry.revs.length,
        },
        editCount: entry.editCount,
        lastEdit: entry.lastEdit,
      })),
      safe,
      PAGE_SIZE,
      entries.length,
      pages,
    ),
    allowedMentions: { parse: [] },
  });
}

export const editsCommand: CommandModule = {
  data: editsData,
  execute: async (interaction) => {
    if (history === null) {
      await interaction.reply({ content: 'Edit history is not configured yet.', ephemeral: true });
      return;
    }
    if (!mayReadChannel(interaction)) {
      await interaction.reply({ ...renderDenied('You cannot read this channel.') });
      return;
    }
    const access = await checkCommandAccess(getPolicyQuery(), interaction);
    if (!access.ok) {
      await interaction.reply({ ...renderDenied(access.reason) });
      return;
    }
    try {
      const entries = await resolveEditedEntries(history, interaction.channelId);
      const rawIndex = interaction.options.getInteger('index');
      if (rawIndex !== null) {
        const index = Math.min(10, Math.max(1, rawIndex));
        const entry = entries[index - 1] ?? null;
        if (entry === null) {
          await interaction.reply({
            content:
              entries.length === 0
                ? 'No edited messages here.'
                : `Only ${String(entries.length)} edited message${entries.length === 1 ? ' is' : 's are'} available here.`,
            ephemeral: true,
          });
          return;
        }
        const walker = toWalker(
          entry,
          entry.revs.length,
          `#${interaction.channelId}`,
          avatarUrl(interaction, entry.snap.author.id),
        );
        if (walker === null) {
          await interaction.reply({ ...renderError() });
          return;
        }
        await interaction.reply({
          ...renderWalkerPage(walker, Math.ceil(index / PAGE_SIZE)),
          allowedMentions: { parse: [] },
        });
        return;
      }
      await replyEditsList(interaction, entries, 1);
    } catch {
      await interaction.reply({ ...renderError() });
    }
  },
};

type WalkerParts =
  | { kind: 'page'; page: number }
  | { kind: 'detail'; messageId: string; page: number }
  | { kind: 'revision'; messageId: string; pos: number; ret: number }
  | { kind: 'back'; page: number }
  | { kind: 'close' };

function parseParts(parts: string[]): WalkerParts | null {
  const [action, ...rest] = parts;
  const num = (raw: string | undefined): number | null => {
    const n = Number(raw);
    return raw !== undefined && Number.isInteger(n) && n >= 1 ? n : null;
  };
  if (action === 'pg' && rest.length === 1) {
    const page = num(rest[0]);
    return page === null ? null : { kind: 'page', page };
  }
  if (action === 'dt' && rest.length === 2) {
    const [messageId, rawPage] = rest;
    const page = num(rawPage);
    if (messageId === undefined || messageId === '' || page === null) return null;
    return { kind: 'detail', messageId, page };
  }
  if (action === 'rv' && rest.length === 3) {
    const [messageId, rawPos, rawRet] = rest;
    const pos = num(rawPos);
    const ret = num(rawRet);
    if (messageId === undefined || messageId === '' || pos === null || ret === null) return null;
    return { kind: 'revision', messageId, pos, ret };
  }
  if (action === 'bk' && rest.length === 1) {
    const page = num(rest[0]);
    return page === null ? null : { kind: 'back', page };
  }
  if (action === 'cl' && rest.length === 0) return { kind: 'close' };
  return null;
}

/** `edb:…` button handler: re-check auth, reconstruct state by re-querying. */
export async function handleEditsButton(
  interaction: ButtonInteraction,
  parts: string[],
): Promise<void> {
  const action = parseParts(parts);
  if (action === null) {
    await interaction.reply({ ...renderError() });
    return;
  }
  if (action.kind === 'close') {
    try {
      await interaction.update({ ...renderClosed() });
    } catch {
      logger.debug('Stale edits close ignored', { customId: interaction.customId });
    }
    return;
  }
  if (history === null) {
    await interaction.reply({ content: 'Edit history is not configured yet.', ephemeral: true });
    return;
  }
  if (!mayReadChannel(interaction)) {
    await interaction.reply({ ...renderDenied('You cannot read this channel.') });
    return;
  }
  const access = await checkCommandAccess(getPolicyQuery(), interaction);
  if (!access.ok) {
    await interaction.reply({ ...renderDenied(access.reason) });
    return;
  }
  try {
    if (action.kind === 'page' || action.kind === 'back') {
      const entries = await resolveEditedEntries(history, interaction.channelId);
      if (entries.length === 0) {
        await interaction.update({ ...renderExpired() });
        return;
      }
      const pages = totalPages(entries.length, PAGE_SIZE);
      const safe = clampPage(action.page, pages);
      await interaction.update({
        ...renderEditsListPage(
          entries.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE).map((entry) => ({
            message: {
              ...toMessageViewModel(entry.snap, { status: 'edited' }),
              revisionCount: entry.revs.length,
            },
            editCount: entry.editCount,
            lastEdit: entry.lastEdit,
          })),
          safe,
          PAGE_SIZE,
          entries.length,
          pages,
        ),
      });
      return;
    }
    const revs = await history.getRevisions(action.messageId);
    const snap = await history.findById(action.messageId);
    if (snap === null || revs.length === 0 || !isFiledUnder(snap, interaction.channelId)) {
      await interaction.reply({
        content: 'That history is no longer available here.',
        ephemeral: true,
      });
      return;
    }
    const entry: EditedEntry = {
      messageId: action.messageId,
      snap,
      revs,
      editCount: revs.filter((r) => r.editedAt !== null).length,
      lastEdit: lastEditAt(revs),
    };
    const pos = action.kind === 'revision' ? action.pos : revs.length;
    const ret = action.kind === 'revision' ? action.ret : action.page;
    const walker = toWalker(
      entry,
      pos,
      `#${interaction.channelId}`,
      avatarUrl(interaction, snap.author.id),
    );
    if (walker === null) {
      await interaction.reply({
        content: 'That history is no longer available here.',
        ephemeral: true,
      });
      return;
    }
    await interaction.update({ ...renderWalkerPage(walker, ret) });
  } catch {
    try {
      await interaction.followUp({ ...renderExpired(), ephemeral: true });
    } catch {
      logger.debug('Stale edits button ignored', { customId: interaction.customId });
    }
  }
}

type EditsComponent = ButtonInteraction | StringSelectMenuInteraction;

type UserCache = {
  client: {
    users: {
      cache: {
        get(id: string): { displayAvatarURL?: () => string } | undefined;
      };
    };
  };
};

/** Live-resolved avatar; null when the author is not currently cached. */
function avatarUrl(interaction: UserCache, authorId: string): string | null {
  return interaction.client.users.cache.get(authorId)?.displayAvatarURL?.() ?? null;
}

/** Shared gate for component presses: unconfigured/auth, else the live port. */
async function editsPort(interaction: EditsComponent): Promise<EditHistoryPort | null> {
  if (history === null) {
    await interaction.reply({ content: 'Edit history is not configured yet.', ephemeral: true });
    return null;
  }
  if (!mayReadChannel(interaction)) {
    await interaction.reply({ ...renderDenied('You cannot read this channel.') });
    return null;
  }
  const access = await checkCommandAccess(getPolicyQuery(), interaction);
  if (!access.ok) {
    await interaction.reply({ ...renderDenied(access.reason) });
    return null;
  }
  return history;
}

/** `edb:jp:<page>` jump-select handler: value carries the picked message id. */
export async function handleEditsSelect(
  interaction: StringSelectMenuInteraction,
  parts: string[],
  value: string,
): Promise<void> {
  const [action, rawPage] = parts;
  const page = Number(rawPage);
  if (action !== 'jp' || parts.length !== 2 || !Number.isInteger(page) || page < 1) {
    await interaction.reply({ ...renderError() });
    return;
  }
  const port = await editsPort(interaction);
  if (port === null) return;
  try {
    const revs = await port.getRevisions(value);
    const snap = await port.findById(value);
    if (snap === null || revs.length === 0 || !isFiledUnder(snap, interaction.channelId)) {
      await interaction.reply({
        content: 'That history is no longer available here.',
        ephemeral: true,
      });
      return;
    }
    const walker = toWalker(
      {
        messageId: value,
        snap,
        revs,
        editCount: revs.filter((r) => r.editedAt !== null).length,
        lastEdit: lastEditAt(revs),
      },
      revs.length,
      `#${interaction.channelId}`,
      avatarUrl(interaction, snap.author.id),
    );
    if (walker === null) {
      await interaction.reply({
        content: 'That history is no longer available here.',
        ephemeral: true,
      });
      return;
    }
    await interaction.update({ ...renderWalkerPage(walker, page) });
  } catch {
    try {
      await interaction.followUp({ ...renderExpired(), ephemeral: true });
    } catch {
      logger.debug('Stale edits select ignored', { customId: interaction.customId });
    }
  }
}
