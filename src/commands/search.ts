import { SlashCommandBuilder } from 'discord.js';
import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import type {
  MessageSearchPort,
  SearchHit,
  SearchQuery,
} from '../repositories/drizzleMessageRepository.js';
import { clampPage, DEFAULT_PAGE_SIZE, totalPages } from '../ui/browser.js';
import {
  renderClosed,
  renderDenied,
  renderError,
  renderExpired,
  renderGone,
} from '../ui/renderers/snipeBrowserV2.js';
import {
  searchBackAction,
  renderSearchDetail,
  renderSearchPage,
} from '../ui/renderers/searchBrowserV2.js';
import { searchSessions, type StoredSearchQuery } from '../ui/sessions.js';
import { toMessageViewModel, toSearchHitViewModel } from '../ui/viewModels.js';
import type { V2Reply } from '../ui/renderers/browserShell.js';
import { logger } from '../utils/logger.js';
import { isFiledUnder, mayReadChannel } from './channelAccess.js';
import { checkCommandAccess, getPolicyQuery } from './policy.js';
import type { CommandModule } from './types.js';

/**
 * `/search` — Components V2 session browser over FTS results.
 * Full queries don't fit the 100-char customId budget, so buttons carry
 * a short session id + page cursor; the query lives server-side.
 */

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const builder = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Search the message archive in this channel');
builder.addStringOption((option) =>
  option.setName('text').setDescription('Words to find (all must match)'),
);
builder.addUserOption((option) => option.setName('author').setDescription('Only this author'));
builder.addStringOption((option) =>
  option.setName('after').setDescription('Only messages on/after YYYY-MM-DD'),
);
builder.addStringOption((option) =>
  option
    .setName('has')
    .setDescription('Only messages with…')
    .addChoices({ name: 'attachment', value: 'attachment' }, { name: 'poll', value: 'poll' }),
);
builder.addBooleanOption((option) =>
  option.setName('deleted').setDescription('True: only deleted. False: only kept.'),
);

export const searchData: SlashCommandBuilder = builder;

// Write-once composition binding (set in index.ts; precedent: getDb).
let query: MessageSearchPort | null = null;

export function configureSearchQuery(port: MessageSearchPort): void {
  query = port;
}

/** Test/support hook: drop the binding so the unconfigured path is testable. */
export function resetSearchQueryForTests(): void {
  query = null;
}

/** Read access to the binding for sibling surfaces (context menu). */
export function getSearchQuery(): MessageSearchPort | null {
  return query;
}

function parseDate(raw: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (match === null) return null;
  const [, year, month, day] = match;
  if (year === undefined || month === undefined || day === undefined) return null;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return date;
}

type UserCache = {
  client: { users: { cache: { get(id: string): { username: string } | undefined } } };
};

function authorName(interaction: UserCache, authorId: string | null): string {
  if (authorId === null) return 'unknown';
  return interaction.client.users.cache.get(authorId)?.username ?? authorId;
}

type AvatarCache = {
  client: {
    users: {
      cache: {
        get(id: string): { displayAvatarURL?: () => string } | undefined;
      };
    };
  };
};

/** Live-resolved avatar; null when the author is not currently cached. */
function avatarUrl(interaction: AvatarCache, authorId: string): string | null {
  return interaction.client.users.cache.get(authorId)?.displayAvatarURL?.() ?? null;
}

export type SearchOptions = {
  text: string | null;
  authorId: string | null;
  after: Date | null;
  hasAttachment: boolean;
  hasPoll: boolean;
  deleted: boolean | null;
};

export function toStoredQuery(opts: SearchOptions): StoredSearchQuery {
  const stored: StoredSearchQuery = {};
  if (opts.text !== null) stored.text = opts.text;
  if (opts.authorId !== null) stored.authorId = opts.authorId;
  if (opts.after !== null) stored.afterIso = opts.after.toISOString();
  if (opts.hasAttachment) stored.hasAttachment = true;
  if (opts.hasPoll) stored.hasPoll = true;
  if (opts.deleted !== null) stored.deleted = opts.deleted;
  return stored;
}

export function toSearchQuery(channelId: string, stored: StoredSearchQuery): SearchQuery {
  const args: SearchQuery = { channelId };
  if (stored.text !== undefined) args.text = stored.text;
  if (stored.authorId !== undefined) args.authorId = stored.authorId;
  if (stored.afterIso !== undefined) args.after = new Date(stored.afterIso);
  if (stored.hasAttachment === true) args.hasAttachment = true;
  if (stored.hasPoll === true) args.hasPoll = true;
  if (stored.deleted !== undefined && stored.deleted !== null) args.deleted = stored.deleted;
  return args;
}

function queryLabel(stored: StoredSearchQuery): string {
  if (stored.text !== undefined) {
    const text = stored.text.length > 60 ? `${stored.text.slice(0, 60)}…` : stored.text;
    return `“${text}”`;
  }
  return 'results';
}

function channelLabel(channelId: string | null, fallback: string): string {
  return `<#${channelId ?? fallback}>`;
}

/** Pure payload builder shared by the command, buttons, and context menu. */
export function buildSearchPage(
  interaction: UserCache & { channelId: string },
  hits: SearchHit[],
  sessionId: string,
  stored: StoredSearchQuery,
  page: number,
): V2Reply {
  const pages = totalPages(hits.length, PAGE_SIZE);
  const safe = clampPage(page, pages);
  const slice = hits.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE);
  return renderSearchPage(
    slice.map((hit) =>
      toSearchHitViewModel(
        hit,
        authorName(interaction, hit.authorId),
        channelLabel(hit.channelId, interaction.channelId),
      ),
    ),
    sessionId,
    safe,
    PAGE_SIZE,
    hits.length,
    pages,
    queryLabel(stored),
  );
}

export const searchCommand: CommandModule = {
  data: searchData,
  execute: async (interaction) => {
    if (query === null) {
      await interaction.reply({ content: 'Search is not configured yet.', ephemeral: true });
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
    const rawText = interaction.options.getString('text');
    const text = rawText === null || rawText.trim() === '' ? null : rawText;
    const author = interaction.options.getUser('author');
    const rawAfter = interaction.options.getString('after');
    const has = interaction.options.getString('has');
    const deleted = interaction.options.getBoolean('deleted');
    let after: Date | null = null;
    if (rawAfter !== null) {
      const parsed = parseDate(rawAfter);
      if (parsed === null) {
        await interaction.reply({
          content: `"${rawAfter}" is not a date. Use YYYY-MM-DD.`,
          ephemeral: true,
        });
        return;
      }
      after = parsed;
    }
    const constrained =
      text !== null ||
      author !== null ||
      after !== null ||
      has === 'attachment' ||
      has === 'poll' ||
      deleted !== null;
    if (!constrained) {
      await interaction.reply({
        content: 'Give me something to search: text, author, after, has, or deleted.',
        ephemeral: true,
      });
      return;
    }
    const stored = toStoredQuery({
      text,
      authorId: author?.id ?? null,
      after,
      hasAttachment: has === 'attachment',
      hasPoll: has === 'poll',
      deleted,
    });
    try {
      const hits = await query.searchMessages(toSearchQuery(interaction.channelId, stored));
      if (hits.length === 0) {
        await interaction.reply({ content: 'No matches here.', ephemeral: true });
        return;
      }
      const session = searchSessions.create(interaction.channelId, stored);
      await interaction.reply({
        ...buildSearchPage(interaction, hits, session.id, stored, 1),
        allowedMentions: { parse: [] },
      });
    } catch {
      await interaction.reply({ ...renderError() });
    }
  },
};

type SearchParts =
  | { kind: 'page'; sessionId: string; page: number }
  | { kind: 'detail'; sessionId: string; messageId: string; page: number }
  | { kind: 'back'; sessionId: string; page: number }
  | { kind: 'close' };

function parseParts(parts: string[]): SearchParts | null {
  const [action, ...rest] = parts;
  const num = (raw: string | undefined): number | null => {
    const n = Number(raw);
    return raw !== undefined && Number.isInteger(n) && n >= 1 ? n : null;
  };
  if (action === 'pg' && rest.length === 2) {
    const [sessionId, rawPage] = rest;
    const page = num(rawPage);
    if (sessionId === undefined || sessionId === '' || page === null) return null;
    return { kind: 'page', sessionId, page };
  }
  if (action === 'dt' && rest.length === 3) {
    const [sessionId, messageId, rawPage] = rest;
    const page = num(rawPage);
    if (
      sessionId === undefined ||
      sessionId === '' ||
      messageId === undefined ||
      messageId === '' ||
      page === null
    ) {
      return null;
    }
    return { kind: 'detail', sessionId, messageId, page };
  }
  if (action === 'bk' && rest.length === 2) {
    const [sessionId, rawPage] = rest;
    const page = num(rawPage);
    if (sessionId === undefined || sessionId === '' || page === null) return null;
    return { kind: 'back', sessionId, page };
  }
  if (action === 'cl' && rest.length === 0) return { kind: 'close' };
  return null;
}

/** `seb:…` button handler: session-backed pagination, per-press auth. */
export async function handleSearchButton(
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
      logger.debug('Stale search close ignored', { customId: interaction.customId });
    }
    return;
  }
  if (query === null) {
    await interaction.reply({ content: 'Search is not configured yet.', ephemeral: true });
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
    if (action.kind === 'detail') {
      const snap = await query.findById(action.messageId);
      if (snap === null || !isFiledUnder(snap, interaction.channelId)) {
        await interaction.reply({ ...renderGone() });
        return;
      }
      const vm = toMessageViewModel(snap, {
        status: 'archived',
        avatarUrl: avatarUrl(interaction, snap.author.id),
      });
      await interaction.update({
        ...renderSearchDetail(vm, searchBackAction(action.sessionId, action.page)),
      });
      return;
    }
    const session = searchSessions.get(action.sessionId, interaction.channelId);
    if (session === null) {
      try {
        await interaction.update({ ...renderExpired() });
      } catch {
        await interaction.reply({ ...renderExpired() });
      }
      return;
    }
    const hits = await query.searchMessages(toSearchQuery(interaction.channelId, session.query));
    if (hits.length === 0) {
      await interaction.update({ ...renderExpired() });
      return;
    }
    await interaction.update({
      ...buildSearchPage(interaction, hits, session.id, session.query, action.page),
    });
  } catch {
    try {
      await interaction.followUp({ ...renderExpired(), ephemeral: true });
    } catch {
      logger.debug('Stale search button ignored', { customId: interaction.customId });
    }
  }
}

/** `seb:jp:…` jump-select handler: value carries the picked message id. */
export async function handleSearchSelect(
  interaction: StringSelectMenuInteraction,
  parts: string[],
  value: string,
): Promise<void> {
  const [action, sessionId, rawPage] = parts;
  const page = Number(rawPage);
  if (
    action !== 'jp' ||
    parts.length !== 3 ||
    sessionId === undefined ||
    sessionId === '' ||
    !Number.isInteger(page) ||
    page < 1
  ) {
    await interaction.reply({ ...renderError() });
    return;
  }
  if (query === null) {
    await interaction.reply({ content: 'Search is not configured yet.', ephemeral: true });
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
    const snap = await query.findById(value);
    if (snap === null || !isFiledUnder(snap, interaction.channelId)) {
      await interaction.reply({ ...renderGone() });
      return;
    }
    const vm = toMessageViewModel(snap, {
      status: 'archived',
      avatarUrl: avatarUrl(interaction, snap.author.id),
    });
    await interaction.update({
      ...renderSearchDetail(vm, searchBackAction(sessionId, page)),
    });
  } catch {
    try {
      await interaction.followUp({ ...renderExpired(), ephemeral: true });
    } catch {
      logger.debug('Stale search select ignored', { customId: interaction.customId });
    }
  }
}

// `seb:…` buttons/selects are routed via handleSearchButton/handleSearchSelect.
