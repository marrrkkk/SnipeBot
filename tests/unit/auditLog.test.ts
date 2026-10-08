import { AuditLogEvent, Collection, type Guild } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { findDeleteAttribution } from '../../src/discord/auditLog.js';

function entry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'e1',
    action: AuditLogEvent.MessageDelete,
    targetId: 'u1',
    executorId: 'mod1',
    extra: { channel: { id: 'c1' } },
    createdTimestamp: Date.now(),
    ...overrides,
  };
}

function guildWith(entries: Record<string, unknown>[]): Guild {
  return {
    fetchAuditLogs: (_opts: unknown): Promise<unknown> =>
      Promise.resolve({
        entries: new Collection(entries.map((e, i) => [String(i), e])),
      }),
  } as unknown as Guild;
}

describe('findDeleteAttribution', () => {
  it('matches channel, author and recency', async () => {
    const found = await findDeleteAttribution(guildWith([entry()]), 'c1', 'u1');
    expect(found).toEqual({ executorId: 'mod1', auditEntryId: 'e1' });
  });

  it('ignores other channels', async () => {
    const found = await findDeleteAttribution(guildWith([entry()]), 'c9', 'u1');
    expect(found).toBeNull();
  });

  it('ignores stale entries', async () => {
    const old = entry({ createdTimestamp: Date.now() - 120_000 });
    const found = await findDeleteAttribution(guildWith([old]), 'c1', 'u1');
    expect(found).toBeNull();
  });

  it('ignores target mismatches but tolerates absent targets', async () => {
    const mismatch = await findDeleteAttribution(
      guildWith([entry({ targetId: 'u2' })]),
      'c1',
      'u1',
    );
    expect(mismatch).toBeNull();
    const absent = await findDeleteAttribution(guildWith([entry({ targetId: null })]), 'c1', 'u1');
    expect(absent).toEqual({ executorId: 'mod1', auditEntryId: 'e1' });
  });

  it('requires an executor', async () => {
    const found = await findDeleteAttribution(guildWith([entry({ executorId: null })]), 'c1', 'u1');
    expect(found).toBeNull();
  });

  it('returns null when the audit log is unreachable', async () => {
    const closed = { fetchAuditLogs: () => Promise.reject(new Error('Missing Access')) };
    const found = await findDeleteAttribution(closed as unknown as Guild, 'c1', 'u1');
    expect(found).toBeNull();
  });
});
