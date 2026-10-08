import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { hasGuildPermission } from './channelAccess.js';
import type { PolicyPort } from './policy.js';
import { getPolicyQuery } from './policy.js';
import type { GuildPolicy } from '../repositories/drizzleMessageRepository.js';
import type { CommandModule } from './types.js';

const builder = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('Server archive settings (Manage Server only)');
builder.addSubcommand((sub) =>
  sub
    .setName('snipe-roles')
    .setDescription('Who may use recovery commands (empty = everyone)')
    .addStringOption((option) =>
      option
        .setName('action')
        .setDescription('What to do')
        .setRequired(true)
        .addChoices(
          { name: 'add', value: 'add' },
          { name: 'remove', value: 'remove' },
          { name: 'list', value: 'list' },
          { name: 'clear', value: 'clear' },
        ),
    )
    .addRoleOption((option) => option.setName('role').setDescription('Role for add/remove')),
);
builder.addSubcommand((sub) =>
  sub
    .setName('archiving')
    .setDescription('Turn message archiving on or off for this server')
    .addBooleanOption((option) =>
      option.setName('enabled').setDescription('Archive new messages?').setRequired(true),
    ),
);
builder.addSubcommand((sub) =>
  sub
    .setName('retention-set')
    .setDescription('Set retention windows in days/revisions (omit to leave unchanged)')
    .addIntegerOption((option) =>
      option
        .setName('keep-days')
        .setDescription('Delete messages older than N days')
        .setMinValue(1),
    )
    .addIntegerOption((option) =>
      option
        .setName('keep-revisions')
        .setDescription('Keep newest N revisions per message')
        .setMinValue(1),
    )
    .addIntegerOption((option) =>
      option
        .setName('media-days')
        .setDescription('Delete media bytes older than N days')
        .setMinValue(1),
    ),
);
builder.addSubcommand((sub) =>
  sub.setName('retention-show').setDescription('Show the effective retention policy'),
);
builder.addSubcommand((sub) =>
  sub.setName('retention-clear').setDescription('Remove server retention overrides'),
);

export const settingsData: SlashCommandBuilder = builder;

const DEFAULT_POLICY: GuildPolicy = { snipeRoleIds: [], archivingEnabled: true };

export const settingsCommand: CommandModule = {
  data: settingsData,
  execute: async (interaction) => {
    const query = getPolicyQuery();
    if (query === null) {
      await interaction.reply({ content: 'Settings are not configured yet.', ephemeral: true });
      return;
    }
    if (interaction.guildId === null) {
      await interaction.reply({
        content: 'Server settings can only be changed in a server.',
        ephemeral: true,
      });
      return;
    }
    if (!hasGuildPermission(interaction, PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: 'You need the Manage Server permission to change settings.',
        ephemeral: true,
      });
      return;
    }
    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'snipe-roles') {
      await handleRoles(interaction, guildId, query);
      return;
    }
    if (subcommand === 'archiving') {
      await handleArchiving(interaction, guildId, query);
      return;
    }
    if (subcommand === 'retention-set') {
      await handleRetentionSet(interaction, guildId, query);
      return;
    }
    if (subcommand === 'retention-show') {
      await handleRetentionShow(interaction, guildId, query);
      return;
    }
    if (subcommand === 'retention-clear') {
      await handleRetentionClear(interaction, guildId, query);
      return;
    }
    await interaction.reply({ content: 'Unknown settings page.', ephemeral: true });
  },
};

async function currentPolicy(query: PolicyPort, guildId: string): Promise<GuildPolicy> {
  const stored = await query.getPolicy(guildId);
  return stored ?? { ...DEFAULT_POLICY };
}

async function handleRoles(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  query: PolicyPort,
): Promise<void> {
  const policy = await currentPolicy(query, guildId);
  const action = interaction.options.getString('action');
  if (action === 'list') {
    await interaction.reply({
      content:
        policy.snipeRoleIds.length === 0
          ? 'No role restrictions: everyone who can read a channel may use recovery commands.'
          : `Allowed roles: ${policy.snipeRoleIds.map((id) => `<@&${id}>`).join(', ')}`,
      ephemeral: true,
    });
    return;
  }
  if (action === 'clear') {
    await query.savePolicy(guildId, { ...policy, snipeRoleIds: [] });
    await interaction.reply({
      content: 'Role restrictions cleared: everyone who can read a channel may use them again.',
      ephemeral: true,
    });
    return;
  }
  if (action === 'add' || action === 'remove') {
    const role = interaction.options.getRole('role');
    if (role === null) {
      await interaction.reply({
        content: 'Specify a role for add/remove.',
        ephemeral: true,
      });
      return;
    }
    const ids = new Set(policy.snipeRoleIds);
    if (action === 'add') ids.add(role.id);
    else ids.delete(role.id);
    await query.savePolicy(guildId, { ...policy, snipeRoleIds: [...ids] });
    const name = role.name;
    await interaction.reply({
      content:
        action === 'add'
          ? `Added ${name} to recovery access.`
          : `Removed ${name} from recovery access.`,
      ephemeral: true,
    });
    return;
  }
  await interaction.reply({ content: 'Unknown settings action.', ephemeral: true });
}

async function handleArchiving(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  query: PolicyPort,
): Promise<void> {
  const enabled = interaction.options.getBoolean('enabled');
  if (enabled === null) {
    await interaction.reply({ content: 'Specify enabled true or false.', ephemeral: true });
    return;
  }
  const policy = await currentPolicy(query, guildId);
  await query.savePolicy(guildId, { ...policy, archivingEnabled: enabled });
  await interaction.reply({
    content: enabled
      ? 'Message archiving is on for this server.'
      : 'Message archiving is off for this server. New messages will not be archived.',
    ephemeral: true,
  });
}

function describeRetention(policy: {
  keepDays: number | null;
  keepRevisions: number | null;
  mediaKeepDays: number | null;
}): string {
  const parts = [
    `messages: ${policy.keepDays === null ? 'keep everything' : `older than ${String(policy.keepDays)} days`}`,
    `revisions: ${policy.keepRevisions === null ? 'keep all' : `newest ${String(policy.keepRevisions)}`}`,
    `media: ${policy.mediaKeepDays === null ? 'keep all bytes' : `older than ${String(policy.mediaKeepDays)} days`}`,
  ];
  return parts.join(' · ');
}

async function handleRetentionSet(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  query: PolicyPort,
): Promise<void> {
  const keepDays = interaction.options.getInteger('keep-days');
  const keepRevisions = interaction.options.getInteger('keep-revisions');
  const mediaDays = interaction.options.getInteger('media-days');
  if (keepDays === null && keepRevisions === null && mediaDays === null) {
    await interaction.reply({
      content: 'Nothing to change: pass keep-days, keep-revisions, or media-days.',
      ephemeral: true,
    });
    return;
  }
  const current = await query.getRetention(guildId);
  const merged = {
    keepDays: keepDays ?? current?.keepDays ?? null,
    keepRevisions: keepRevisions ?? current?.keepRevisions ?? null,
    mediaKeepDays: mediaDays ?? current?.mediaKeepDays ?? null,
  };
  await query.saveRetention(guildId, merged);
  await interaction.reply({
    content: `Retention updated: ${describeRetention(merged)}.`,
    ephemeral: true,
  });
}

async function handleRetentionShow(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  query: PolicyPort,
): Promise<void> {
  const policy = await query.getRetention(guildId);
  await interaction.reply({
    content:
      policy === null
        ? 'No retention configured: keeping everything.'
        : `Retention for this server: ${describeRetention(policy)}.`,
    ephemeral: true,
  });
}

async function handleRetentionClear(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  query: PolicyPort,
): Promise<void> {
  await query.clearRetention(guildId);
  await interaction.reply({
    content: 'Server retention overrides cleared: keeping everything.',
    ephemeral: true,
  });
}
