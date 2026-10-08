import { PermissionFlagsBits } from 'discord.js';

/**
 * Filed-under check for id-addressed surfaces (buttons): the snapshot must
 * belong to the interaction channel, either directly or as a thread child.
 */
export function isFiledUnder(
  snap: { channelId: string; threadId: string | null },
  channelId: string | null,
): boolean {
  if (channelId === null) return false;
  return snap.channelId === channelId || snap.threadId === channelId;
}

/**
 * Live permission check against unknown-shaped permission holders
 * (discord.js bitfields and test fakes alike).
 */
export function hasGuildPermission(
  interaction: { guildId: string | null; memberPermissions: unknown },
  flag: bigint,
): boolean {
  if (interaction.guildId === null) return false;
  const perms = interaction.memberPermissions;
  return (
    typeof perms === 'object' &&
    perms !== null &&
    (perms as { has: (checked: bigint) => boolean }).has(flag)
  );
}

/**
 * Read-time channel visibility (docs/security.md is binding): in guilds the
 * caller needs live ViewChannel on the interaction channel; in DMs
 * (no member permissions) the caller reads their own DM.
 */
export function mayReadChannel(interaction: {
  guildId: string | null;
  memberPermissions: unknown;
}): boolean {
  if (interaction.guildId === null) return true;
  return hasGuildPermission(interaction, PermissionFlagsBits.ViewChannel);
}
