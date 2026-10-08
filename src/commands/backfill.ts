import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { hasGuildPermission, mayReadChannel } from './channelAccess.js';
import { fetchHistoryPage, type HistoryChannel } from '../discord/history.js';
import { SnapshotError, toSnapshot } from '../discord/mappers.js';
import type { BackfillPort } from '../repositories/drizzleMessageRepository.js';
import type { CommandModule } from './types.js';
import { logger } from '../utils/logger.js';

const builder = new SlashCommandBuilder()
  .setName('backfill')
  .setDescription('Import this channel’s history into the archive (admins only)');
builder.addIntegerOption((option) =>
  option
    .setName('limit')
    .setDescription('Max messages to import (default 100)')
    .setMinValue(1)
    .setMaxValue(1000),
);

export const backfillData: SlashCommandBuilder = builder;

// Write-once composition binding (set in index.ts; precedent: getDb).
let port: BackfillPort | null = null;

export function configureBackfillQuery(backfill: BackfillPort): void {
  port = backfill;
}

/** Test/support hook: drop the binding so the unconfigured path is testable. */
export function resetBackfillQueryForTests(): void {
  port = null;
}

function asHistoryChannel(value: unknown): HistoryChannel | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as { id?: unknown; messages?: unknown };
  if (typeof record.id !== 'string') return null;
  const messages = record.messages as { fetch?: unknown };
  if (typeof messages.fetch !== 'function') return null;
  return value as unknown as HistoryChannel;
}

function minId(ids: string[]): string | null {
  let min: { id: string; value: bigint } | null = null;
  for (const id of ids) {
    let value: bigint;
    try {
      value = BigInt(id);
    } catch {
      continue;
    }
    if (min === null || value < min.value) min = { id, value };
  }
  return min?.id ?? null;
}

export const backfillCommand: CommandModule = {
  data: backfillData,
  execute: async (interaction) => {
    if (port === null) {
      await interaction.reply({ content: 'Backfill is not configured yet.', ephemeral: true });
      return;
    }
    if (interaction.guildId === null) {
      await interaction.reply({
        content: 'Backfill runs in servers only.',
        ephemeral: true,
      });
      return;
    }
    if (!mayReadChannel(interaction)) {
      await interaction.reply({
        content: 'You cannot read this channel, so there is nothing to import here.',
        ephemeral: true,
      });
      return;
    }
    if (!hasGuildPermission(interaction, PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: 'You need the Manage Server permission to import history.',
        ephemeral: true,
      });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    await runBackfill(interaction, port);
  },
};

async function runBackfill(
  interaction: ChatInputCommandInteraction,
  query: BackfillPort,
): Promise<void> {
  const rawLimit = interaction.options.getInteger('limit') ?? 100;
  const target = Math.min(1000, Math.max(1, rawLimit));
  let fetchedChannel: unknown;
  try {
    fetchedChannel = await interaction.client.channels.fetch(interaction.channelId);
  } catch (err) {
    await interaction.editReply({
      content: `Could not open this channel for import: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }
  const channel = asHistoryChannel(fetchedChannel);
  if (channel === null) {
    await interaction.editReply({ content: 'This channel type cannot be imported.' });
    return;
  }
  let before: string | undefined;
  let pages = 0;
  let imported = 0;
  let skipped = 0;
  try {
    while (imported + skipped < target) {
      const batch = await fetchHistoryPage(channel, before);
      if (batch.length === 0) break;
      pages += 1;
      const remaining = target - imported - skipped;
      const snaps = [];
      for (const message of batch.slice(0, remaining)) {
        try {
          snaps.push(toSnapshot(message));
        } catch (err) {
          if (!(err instanceof SnapshotError)) throw err;
          logger.debug('Skipping unsnapshottable history message');
          skipped += 1;
        }
      }
      const result = await query.importSnapshots(snaps);
      imported += result.imported;
      skipped += result.skipped;
      const oldest = minId(batch.map((m) => m.id));
      if (batch.length < 100 || oldest === null) break;
      before = oldest;
    }
  } catch (err) {
    logger.error({ err: String(err), channelId: interaction.channelId }, 'Backfill failed mid-run');
    await interaction.editReply({
      content: `Imported ${String(imported)} new, skipped ${String(skipped)} known, across ${String(pages)} pages before failing: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }
  await interaction.editReply({
    content: `Imported ${String(imported)} new, skipped ${String(skipped)} known, across ${String(pages)} pages.`,
  });
}
