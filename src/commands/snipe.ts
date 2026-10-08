import { SlashCommandBuilder } from 'discord.js';
import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import type { MessageSnapshot } from '../domain/messageSnapshot.js';
import type { ChannelDeletion, SnipeQueryPort } from '../repositories/drizzleMessageRepository.js';
import { clampPage, DEFAULT_PAGE_SIZE, rangeText, totalPages } from '../ui/browser.js';
import {
  renderBrowserPage,
  renderBulkGroupPage,
  renderBulkGroupsPage,
  renderClosed,
  renderDenied,
  renderEmpty,
  renderError,
  renderExpired,
  renderGone,
  renderSnipeDetail,
} from '../ui/renderers/snipeBrowserV2.js';
import { renderStatePage } from '../ui/renderers/browserShell.js';
import {
  isRecoverableSnapshot,
  toMessageViewModel,
  type BulkGroupViewModel,
  type MessageViewModel,
} from '../ui/viewModels.js';
import { logger } from '../utils/logger.js';
import { isFiledUnder, mayReadChannel } from './channelAccess.js';
import { checkCommandAccess, getPolicyQuery } from './policy.js';
import type { CommandModule } from './types.js';

/**
 * `/snipe` — Components V2 browser over deleted messages.
 * Detail-first singles flow (latest detail opens directly, Older/Newer
 * walk the list, List opens the paged browser) plus bulk-groups flow.
 * Thin Discord boundary: auth → query → view model → V2 renderer.
 */

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const builder = new SlashCommandBuilder()
  .setName('snipe')
  .setDescription('Show the most recently deleted message in this channel');
builder.addIntegerOption((option) =>
  option
    .setName('index')
    .setDescription('Which deleted message (1 = latest)')
    .setMinValue(1)
    .setMaxValue(10),
);
builder.addBooleanOption((option) =>
  option.setName('bulk').setDescription('Show a bulk deletion as one list'),
);

export const snipeData: SlashCommandBuilder = builder;

// Write-once composition binding (set in index.ts; precedent: getDb).
let query: SnipeQueryPort | null = null;

export function configureSnipeQuery(port: SnipeQueryPort): void {
  query = port;
}

/** Test/support hook: drop the binding so the unconfigured path is testable. */
export function resetSnipeQueryForTests(): void {
  query = null;
}

/** Adjacent bulk rows within the window form one purge group. */
export const BULK_WINDOW_MS = 60_000;

export function groupBulkDeletions(
  rows: ChannelDeletion[],
  windowMs: number = BULK_WINDOW_MS,
): ChannelDeletion[][] {
  const groups: ChannelDeletion[][] = [];
  for (const row of rows) {
    if (row.kind !== 'bulk') continue;
    const last = groups[groups.length - 1];
    const lastRow = last?.[last.length - 1];
    if (
      last !== undefined &&
      lastRow !== undefined &&
      Math.abs(row.observedAt.getTime() - lastRow.observedAt.getTime()) <= windowMs
    ) {
      last.push(row);
    } else {
      groups.push([row]);
    }
  }
  return groups;
}

type UserCache = {
  client: {
    users: {
      cache: {
        get(id: string): { username: string; displayAvatarURL?: () => string } | undefined;
      };
    };
  };
};

type ComponentInteraction = ButtonInteraction | StringSelectMenuInteraction;

function executorLabel(interaction: UserCache, executorId: string | null): string | null {
  if (executorId === null) return null;
  return interaction.client.users.cache.get(executorId)?.username ?? executorId;
}

/** Live-resolved avatar; null when the author is not currently cached. */
function avatarUrl(interaction: UserCache, authorId: string): string | null {
  return interaction.client.users.cache.get(authorId)?.displayAvatarURL?.() ?? null;
}

type RecoveredEntry = {
  snap: MessageSnapshot;
  observedAt: Date;
  executorId: string | null;
};

/** Re-query + filter to the recoverable entries for this channel (newest first). */
async function recoverChannel(q: SnipeQueryPort, channelId: string): Promise<RecoveredEntry[]> {
  const deletions = await q.listDeletionsForChannel(channelId, 200);
  const out: RecoveredEntry[] = [];
  for (const deletion of deletions) {
    const snap = await q.findById(deletion.messageId);
    if (snap === null || !isRecoverableSnapshot(snap)) continue;
    out.push({ snap, observedAt: deletion.observedAt, executorId: deletion.executorId });
  }
  return out;
}

function toItem(interaction: UserCache, entry: RecoveredEntry): MessageViewModel {
  return toMessageViewModel(entry.snap, {
    deletedAt: entry.observedAt,
    executorLabel: executorLabel(interaction, entry.executorId),
    avatarUrl: avatarUrl(interaction, entry.snap.author.id),
  });
}

/** Render the detail card at a 1-based position (clamped). False when empty. */
async function replySnipeDetail(
  interaction: { reply(args: unknown): Promise<unknown> },
  owner: UserCache,
  entries: RecoveredEntry[],
  position: number,
): Promise<boolean> {
  const pos = clampPage(position, entries.length);
  const entry = entries[pos - 1];
  if (entry === undefined) return false;
  await interaction.reply({
    ...renderSnipeDetail(toItem(owner, entry), pos, entries.length),
    allowedMentions: { parse: [] },
  });
  return true;
}

async function updateSnipeDetail(
  interaction: { update(args: unknown): Promise<unknown> },
  owner: UserCache,
  entries: RecoveredEntry[],
  position: number,
): Promise<boolean> {
  const pos = clampPage(position, entries.length);
  const entry = entries[pos - 1];
  if (entry === undefined) return false;
  await interaction.update({
    ...renderSnipeDetail(toItem(owner, entry), pos, entries.length),
  });
  return true;
}

/** Non-empty bulk groups with recovered members (newest first). */
export async function recoverBulkGroups(
  q: SnipeQueryPort,
  channelId: string,
  interaction: UserCache,
): Promise<BulkGroupViewModel[]> {
  const deletions = await q.listDeletionsForChannel(channelId, 200);
  const rawGroups = groupBulkDeletions(deletions);
  const groups: BulkGroupViewModel[] = [];
  for (const raw of rawGroups) {
    const members: MessageViewModel[] = [];
    for (const deletion of raw) {
      const snap = await q.findById(deletion.messageId);
      if (snap === null || !isRecoverableSnapshot(snap)) continue;
      members.push(
        toMessageViewModel(snap, {
          deletedAt: deletion.observedAt,
          executorLabel: executorLabel(interaction, deletion.executorId),
          avatarUrl: avatarUrl(interaction, snap.author.id),
        }),
      );
    }
    if (members.length === 0) continue;
    groups.push({
      position: groups.length + 1,
      totalGroups: 0, // filled below once empties are known
      observedAt: raw[0]?.observedAt ?? new Date(),
      members: members.slice(0, 10),
      totalMembers: members.length,
    });
  }
  for (const group of groups) group.totalGroups = groups.length;
  return groups;
}

function renderBulkEmpty(): ReturnType<typeof renderStatePage> {
  return renderStatePage('🗑 Bulk Deletions', 'No bulk deletions here.');
}

async function replyBulkGroupsList(
  interaction: ChatInputCommandInteraction,
  groups: BulkGroupViewModel[],
  page: number,
): Promise<void> {
  if (groups.length === 0) {
    await interaction.reply({ ...renderBulkEmpty(), allowedMentions: { parse: [] } });
    return;
  }
  const pages = totalPages(groups.length, PAGE_SIZE);
  const safe = clampPage(page, pages);
  await interaction.reply({
    ...renderBulkGroupsPage(
      groups.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE),
      safe,
      PAGE_SIZE,
      groups.length,
      pages,
    ),
    allowedMentions: { parse: [] },
  });
}

export const snipeCommand: CommandModule = {
  data: snipeData,
  execute: async (interaction) => {
    if (query === null) {
      await interaction.reply({ content: 'Snipe is not configured yet.', ephemeral: true });
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
    const rawIndex = interaction.options.getInteger('index');
    const bulkOnly = interaction.options.getBoolean('bulk') ?? false;
    try {
      if (bulkOnly) {
        const groups = await recoverBulkGroups(query, interaction.channelId, interaction);
        if (rawIndex !== null) {
          const index = Math.min(10, Math.max(1, rawIndex));
          const group = groups[index - 1] ?? null;
          if (group === null) {
            await interaction.reply({
              content:
                groups.length === 0
                  ? 'No bulk deletions here.'
                  : `Only ${String(groups.length)} bulk deletion${groups.length === 1 ? ' is' : 's are'} available here.`,
              ephemeral: true,
            });
            return;
          }
          await interaction.reply({
            ...renderBulkGroupPage(group, Math.ceil(index / PAGE_SIZE)),
            allowedMentions: { parse: [] },
          });
          return;
        }
        await replyBulkGroupsList(interaction, groups, 1);
        return;
      }
      const entries = await recoverChannel(query, interaction.channelId);
      if (entries.length === 0) {
        await interaction.reply({ ...renderEmpty(), allowedMentions: { parse: [] } });
        return;
      }
      // Detail-first: bare /snipe opens the latest deletion; index jumps.
      const position = rawIndex === null ? 1 : Math.min(10, Math.max(1, rawIndex));
      if (position > entries.length) {
        await interaction.reply({
          content: `Only ${String(entries.length)} deleted message${entries.length === 1 ? ' is' : 's are'} recoverable here.`,
          ephemeral: true,
        });
        return;
      }
      await replySnipeDetail(interaction, interaction, entries, position);
    } catch {
      await interaction.reply({ ...renderError() });
    }
  },
};

type BrowserParts =
  | { kind: 'page'; page: number }
  | { kind: 'detail'; messageId: string; page: number }
  | { kind: 'nav'; position: number }
  | { kind: 'back'; page: number }
  | { kind: 'bulkList'; page: number }
  | { kind: 'bulkDetail'; group: number; ret: number }
  | { kind: 'close' };

function parseParts(parts: string[]): BrowserParts | null {
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
  if (action === 'np' && rest.length === 1) {
    const position = num(rest[0]);
    return position === null ? null : { kind: 'nav', position };
  }
  if (action === 'bk' && rest.length === 1) {
    const page = num(rest[0]);
    return page === null ? null : { kind: 'back', page };
  }
  if (action === 'bg' && rest.length === 1) {
    const page = num(rest[0]);
    return page === null ? null : { kind: 'bulkList', page };
  }
  if (action === 'bd' && rest.length === 2) {
    const group = num(rest[0]);
    const ret = num(rest[1]);
    if (group === null || ret === null) return null;
    return { kind: 'bulkDetail', group, ret };
  }
  if (action === 'cl' && rest.length === 0) return { kind: 'close' };
  return null;
}

async function updateSinglesList(
  interaction: ButtonInteraction,
  entries: RecoveredEntry[],
  page: number,
): Promise<void> {
  const pages = totalPages(entries.length, PAGE_SIZE);
  const safe = clampPage(page, pages);
  await interaction.update({
    ...renderBrowserPage({
      title: '🗑 Deleted Messages',
      totalResults: entries.length,
      page: safe,
      pageSize: PAGE_SIZE,
      totalPages: pages,
      rangeText: rangeText(safe, PAGE_SIZE, entries.length),
      items: entries
        .slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE)
        .map((e) => toItem(interaction, e)),
    }),
  });
}

async function updateBulkGroupsList(
  interaction: ButtonInteraction,
  groups: BulkGroupViewModel[],
  page: number,
): Promise<void> {
  const pages = totalPages(groups.length, PAGE_SIZE);
  const safe = clampPage(page, pages);
  await interaction.update({
    ...renderBulkGroupsPage(
      groups.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE),
      safe,
      PAGE_SIZE,
      groups.length,
      pages,
    ),
  });
}

/** Shared gate for component presses: unconfigured/auth, else the live query. */
async function browserQuery(interaction: ComponentInteraction): Promise<SnipeQueryPort | null> {
  if (query === null) {
    await interaction.reply({ content: 'Snipe is not configured yet.', ephemeral: true });
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
  return query;
}

async function staleFallback(interaction: ComponentInteraction): Promise<void> {
  try {
    await interaction.followUp({ ...renderExpired(), ephemeral: true });
  } catch {
    logger.debug('Stale snipe interaction ignored', { customId: interaction.customId });
  }
}

/** Detail by id (jump select or legacy detail button); position resolved live. */
async function updateDetailById(
  interaction: ComponentInteraction,
  q: SnipeQueryPort,
  messageId: string,
): Promise<void> {
  const entries = await recoverChannel(q, interaction.channelId);
  const index = entries.findIndex((e) => e.snap.id === messageId);
  if (index >= 0) {
    const at = entries[index];
    if (at === undefined || !isFiledUnder(at.snap, interaction.channelId)) {
      await interaction.reply({ ...renderGone() });
      return;
    }
    const rendered = await updateSnipeDetail(interaction, interaction, entries, index + 1);
    if (!rendered) await interaction.reply({ ...renderGone() });
    return;
  }
  const snap = await q.findById(messageId);
  if (snap === null || !isFiledUnder(snap, interaction.channelId) || !isRecoverableSnapshot(snap)) {
    await interaction.reply({ ...renderGone() });
    return;
  }
  // Valid but absent from the fresh list (near-unreachable race): render
  // standalone at position 1 so Older/Newer still walk the live list.
  const vm = toMessageViewModel(snap, { avatarUrl: avatarUrl(interaction, snap.author.id) });
  await interaction.update({ ...renderSnipeDetail(vm, 1, Math.max(1, entries.length)) });
}

/** `snb:…` button handler: re-check auth, reconstruct state by re-querying. */
export async function handleSnipeButton(
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
      logger.debug('Stale snipe close ignored', { customId: interaction.customId });
    }
    return;
  }
  const q = await browserQuery(interaction);
  if (q === null) return;
  try {
    if (action.kind === 'page' || action.kind === 'back') {
      const entries = await recoverChannel(q, interaction.channelId);
      if (entries.length === 0) {
        await interaction.update({ ...renderExpired() });
        return;
      }
      await updateSinglesList(interaction, entries, action.page);
      return;
    }
    if (action.kind === 'bulkList') {
      const groups = await recoverBulkGroups(q, interaction.channelId, interaction);
      if (groups.length === 0) {
        await interaction.update({ ...renderExpired() });
        return;
      }
      await updateBulkGroupsList(interaction, groups, action.page);
      return;
    }
    if (action.kind === 'bulkDetail') {
      const groups = await recoverBulkGroups(q, interaction.channelId, interaction);
      const group = groups[action.group - 1] ?? null;
      if (group === null) {
        await interaction.reply({ ...renderGone() });
        return;
      }
      const pages = totalPages(groups.length, PAGE_SIZE);
      await interaction.update({
        ...renderBulkGroupPage(group, clampPage(action.ret, pages)),
      });
      return;
    }
    if (action.kind === 'nav') {
      const entries = await recoverChannel(q, interaction.channelId);
      if (entries.length === 0) {
        await interaction.update({ ...renderExpired() });
        return;
      }
      await updateSnipeDetail(interaction, interaction, entries, action.position);
      return;
    }
    await updateDetailById(interaction, q, action.messageId);
  } catch {
    await staleFallback(interaction);
  }
}

/** `snb:jp/jb:…` jump-select handler: value carries the picked id/position. */
export async function handleSnipeSelect(
  interaction: StringSelectMenuInteraction,
  parts: string[],
  value: string,
): Promise<void> {
  const [action, rawPage] = parts;
  const page = Number(rawPage);
  if (
    (action !== 'jp' && action !== 'jb') ||
    parts.length !== 2 ||
    !Number.isInteger(page) ||
    page < 1
  ) {
    await interaction.reply({ ...renderError() });
    return;
  }
  const q = await browserQuery(interaction);
  if (q === null) return;
  try {
    if (action === 'jb') {
      const position = Number(value);
      if (!Number.isInteger(position) || position < 1) {
        await interaction.reply({ ...renderGone() });
        return;
      }
      const groups = await recoverBulkGroups(q, interaction.channelId, interaction);
      const group = groups[position - 1] ?? null;
      if (group === null) {
        await interaction.reply({ ...renderGone() });
        return;
      }
      const pages = totalPages(groups.length, PAGE_SIZE);
      await interaction.update({
        ...renderBulkGroupPage(group, clampPage(page, pages)),
      });
      return;
    }
    await updateDetailById(interaction, q, value);
  } catch {
    await staleFallback(interaction);
  }
}

// `snb:…` buttons/selects are routed via handleSnipeButton/handleSnipeSelect.
