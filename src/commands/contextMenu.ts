import { ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js';
import { getEditHistoryQuery, toWalker } from './edits.js';
import { buildSearchPage, getSearchQuery, toStoredQuery } from './search.js';
import { renderWalkerPage } from '../ui/renderers/editsBrowserV2.js';
import { renderDenied, renderError } from '../ui/renderers/snipeBrowserV2.js';
import { searchSessions } from '../ui/sessions.js';
import { isFiledUnder, mayReadChannel } from './channelAccess.js';
import { checkCommandAccess, getPolicyQuery } from './policy.js';
import type { MessageContextModule } from './types.js';

/**
 * Message context menus — Components V2 (same browsers as the slash surfaces).
 * View Edit History → revision walker (no list context, so no Back).
 * Search User Messages → session-backed search browser.
 */

export const viewHistoryCommand: MessageContextModule = {
  data: new ContextMenuCommandBuilder()
    .setName('View Edit History')
    .setType(ApplicationCommandType.Message),
  execute: async (interaction) => {
    const query = getEditHistoryQuery();
    if (query === null) {
      await interaction.reply({ content: 'Edit history is not configured yet.', ephemeral: true });
      return;
    }
    if (!mayReadChannel(interaction)) {
      await interaction.reply({ ...renderDenied('You cannot read this channel.') });
      return;
    }
    const historyAccess = await checkCommandAccess(getPolicyQuery(), interaction);
    if (!historyAccess.ok) {
      await interaction.reply({ content: historyAccess.reason, ephemeral: true });
      return;
    }
    try {
      const revs = await query.getRevisions(interaction.targetId);
      const snap = await query.findById(interaction.targetId);
      if (snap === null || revs.length === 0 || !isFiledUnder(snap, interaction.channelId)) {
        await interaction.reply({
          content: 'No archived history for that message.',
          ephemeral: true,
        });
        return;
      }
      const walker = toWalker(
        {
          messageId: interaction.targetId,
          snap,
          revs,
          editCount: revs.filter((r) => r.editedAt !== null).length,
          lastEdit: new Date(),
        },
        revs.length,
        `#${interaction.channelId}`,
        interaction.client.users.cache.get(snap.author.id)?.displayAvatarURL() ?? null,
      );
      if (walker === null) {
        await interaction.reply({ ...renderError() });
        return;
      }
      await interaction.reply({
        ...renderWalkerPage(walker, 0),
        allowedMentions: { parse: [] },
      });
    } catch {
      await interaction.reply({ ...renderError() });
    }
  },
};

export const userMessagesCommand: MessageContextModule = {
  data: new ContextMenuCommandBuilder()
    .setName('Search User Messages')
    .setType(ApplicationCommandType.Message),
  execute: async (interaction) => {
    const query = getSearchQuery();
    if (query === null) {
      await interaction.reply({ content: 'Search is not configured yet.', ephemeral: true });
      return;
    }
    if (!mayReadChannel(interaction)) {
      await interaction.reply({ ...renderDenied('You cannot read this channel.') });
      return;
    }
    const searchAccess = await checkCommandAccess(getPolicyQuery(), interaction);
    if (!searchAccess.ok) {
      await interaction.reply({ content: searchAccess.reason, ephemeral: true });
      return;
    }
    const author = targetAuthorId(interaction.targetMessage);
    if (author === null) {
      await interaction.reply({
        content: 'Could not determine that message’s author.',
        ephemeral: true,
      });
      return;
    }
    try {
      const stored = toStoredQuery({
        text: null,
        authorId: author,
        after: null,
        hasAttachment: false,
        hasPoll: false,
        deleted: null,
      });
      const hits = await query.searchMessages({
        authorId: author,
        channelId: interaction.channelId,
        limit: 25,
      });
      if (hits.length === 0) {
        await interaction.reply({
          content: 'No archived messages from that user here.',
          ephemeral: true,
        });
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

function targetAuthorId(target: unknown): string | null {
  if (typeof target !== 'object' || target === null) return null;
  const author = (target as { author?: unknown }).author;
  if (typeof author !== 'object' || author === null) return null;
  const id = (author as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}
