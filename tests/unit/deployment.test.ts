import { describe, expect, it } from 'vitest';
import { buildCommandBody, resolveDeployTarget } from '../../src/commands/deployment.js';

describe('resolveDeployTarget', () => {
  it('selects the guild route when a guild id is given', () => {
    const target = resolveDeployTarget('client1', 'guild1');
    expect(target.kind).toBe('guild');
    expect(target.route).toBe('/applications/client1/guilds/guild1/commands');
  });

  it('selects the global route otherwise', () => {
    const target = resolveDeployTarget('client1', undefined);
    expect(target.kind).toBe('global');
    expect(target.route).toBe('/applications/client1/commands');
  });
});

describe('buildCommandBody', () => {
  it('includes all command payloads', () => {
    const names = buildCommandBody().map((item) => (item as { name?: unknown }).name);
    expect(names).toContain('ping');
    expect(names).toContain('snipe');
    expect(names).toContain('edits');
    expect(names).toContain('search');
    expect(names).toContain('settings');
    expect(names).toContain('backfill');
    expect(names).toContain('stats');
  });
});
