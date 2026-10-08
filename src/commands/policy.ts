import type { GuildPolicy, RetentionPolicy } from '../repositories/drizzleMessageRepository.js';

export type PolicyPort = {
  getPolicy(guildId: string): Promise<GuildPolicy | null>;
  savePolicy(guildId: string, policy: GuildPolicy): Promise<void>;
  getRetention(guildId: string): Promise<RetentionPolicy | null>;
  saveRetention(guildId: string, policy: Omit<RetentionPolicy, 'scope'>): Promise<void>;
  clearRetention(guildId: string): Promise<void>;
};

export type PolicyInteraction = {
  guildId: string | null;
  memberPermissions: unknown;
  member: unknown;
};

export type AccessVerdict = { ok: true } | { ok: false; reason: string };

const ROLE_DENIED = 'This server restricts that command to specific roles.';

// Write-once composition binding (set in index.ts; precedent: getDb).
// Absent in tests/dev: the role gate is skipped (documented passthrough).
let policy: PolicyPort | null = null;

export function configurePolicyQuery(port: PolicyPort): void {
  policy = port;
}

/** Test/support hook. */
export function resetPolicyQueryForTests(): void {
  policy = null;
}

export function getPolicyQuery(): PolicyPort | null {
  return policy;
}

function memberRoleIds(member: unknown): string[] | null {
  if (typeof member !== 'object' || member === null) return null;
  const roles = (member as { roles?: unknown }).roles;
  if (Array.isArray(roles)) {
    return roles.filter((id): id is string => typeof id === 'string');
  }
  if (typeof roles !== 'object' || roles === null) return null;
  const holder = roles as { cache?: unknown };
  const cache = holder.cache;
  if (typeof cache !== 'object' || cache === null) return null;
  const keyed = cache as { keys?: () => Iterable<unknown> };
  if (typeof keyed.keys !== 'function') return null;
  const out: string[] = [];
  for (const key of keyed.keys()) {
    if (typeof key === 'string') out.push(key);
  }
  return out;
}

/**
 * Role gate for recovery commands. Visibility stays with mayReadChannel;
 * this answers only "may this member run it". Throws on corrupt policy
 * (fail closed + loud via the router catch).
 */
export async function checkCommandAccess(
  port: PolicyPort | null,
  interaction: PolicyInteraction,
): Promise<AccessVerdict> {
  if (port === null) return { ok: true };
  if (interaction.guildId === null) return { ok: true };
  const policy = await port.getPolicy(interaction.guildId);
  if (policy === null || policy.snipeRoleIds.length === 0) return { ok: true };
  const roles = memberRoleIds(interaction.member);
  if (roles !== null && roles.some((id) => policy.snipeRoleIds.includes(id))) {
    return { ok: true };
  }
  return { ok: false, reason: ROLE_DENIED };
}
