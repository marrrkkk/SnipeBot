import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { StatsPort } from '../repositories/drizzleMessageRepository.js';
import { mayReadChannel } from './channelAccess.js';
import { checkCommandAccess, getPolicyQuery } from './policy.js';
import { discordTimestamp, truncate } from './rendering.js';
import { snapshotMetrics } from '../observability/metrics.js';
import type { CommandModule } from './types.js';

const builder = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Archive size and bot health');

export const statsData: SlashCommandBuilder = builder;

// Write-once composition binding (set in index.ts; precedent: getDb).
let query: StatsPort | null = null;

export function configureStatsQuery(port: StatsPort): void {
  query = port;
}

/** Test/support hook: drop the binding so the unconfigured path is testable. */
export function resetStatsQueryForTests(): void {
  query = null;
}

export const statsCommand: CommandModule = {
  data: statsData,
  execute: async (interaction) => {
    if (query === null) {
      await interaction.reply({ content: 'Stats are not configured yet.', ephemeral: true });
      return;
    }
    if (!mayReadChannel(interaction)) {
      await interaction.reply({
        content: 'You cannot read this channel, so there is nothing to show here.',
        ephemeral: true,
      });
      return;
    }
    const access = await checkCommandAccess(getPolicyQuery(), interaction);
    if (!access.ok) {
      await interaction.reply({ content: access.reason, ephemeral: true });
      return;
    }
    const stats = await query.getArchiveStats();
    const metrics = snapshotMetrics();
    const lines = [
      `**Messages:** ${String(stats.messages)}`,
      `**Revisions:** ${String(stats.revisions)}`,
      `**Pending media:** ${String(stats.attachmentsPending)}`,
      `**Deletions:** ${String(stats.deletions)}`,
      `**Uptime:** ${discordTimestamp(new Date(metrics.startedAt))}`,
    ];
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Archive stats')
          .setDescription(truncate(lines.join('\n'), 4000)),
      ],
      allowedMentions: { parse: [] },
      ephemeral: true,
    });
  },
};
