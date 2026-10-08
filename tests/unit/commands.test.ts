import { describe, expect, it } from 'vitest';
import { commandMap } from '../../src/commands/index.js';

describe('command registry', () => {
  it('exposes ping with deployable JSON', () => {
    const ping = commandMap.get('ping');
    expect(ping).toBeDefined();
    expect(ping?.data.toJSON()).toMatchObject({ name: 'ping' });
  });

  it('exposes snipe with index and bulk options', () => {
    const snipe = commandMap.get('snipe');
    expect(snipe).toBeDefined();
    expect(snipe?.data.toJSON()).toMatchObject({
      name: 'snipe',
      options: [
        expect.objectContaining({ name: 'index' }),
        expect.objectContaining({ name: 'bulk' }),
      ],
    });
  });

  it('exposes edits with an index option', () => {
    const edits = commandMap.get('edits');
    expect(edits).toBeDefined();
    expect(edits?.data.toJSON()).toMatchObject({
      name: 'edits',
      options: [expect.objectContaining({ name: 'index' })],
    });
  });

  it('exposes settings with subcommands', () => {
    const settings = commandMap.get('settings');
    expect(settings).toBeDefined();
    expect(settings?.data.toJSON()).toMatchObject({ name: 'settings' });
  });

  it('exposes backfill with a limit option', () => {
    const backfill = commandMap.get('backfill');
    expect(backfill).toBeDefined();
    expect(backfill?.data.toJSON()).toMatchObject({
      name: 'backfill',
      options: [expect.objectContaining({ name: 'limit' })],
    });
  });

  it('exposes stats', () => {
    const stats = commandMap.get('stats');
    expect(stats).toBeDefined();
    expect(stats?.data.toJSON()).toMatchObject({ name: 'stats' });
  });

  it('exposes search with text and filter options', () => {
    const search = commandMap.get('search');
    expect(search).toBeDefined();
    expect(search?.data.toJSON()).toMatchObject({
      name: 'search',
      options: [
        expect.objectContaining({ name: 'text' }),
        expect.objectContaining({ name: 'author' }),
        expect.objectContaining({ name: 'after' }),
        expect.objectContaining({ name: 'has' }),
        expect.objectContaining({ name: 'deleted' }),
      ],
    });
  });
});
