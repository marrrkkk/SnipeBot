import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env.js';

describe('loadConfig', () => {
  it('rejects missing token', () => {
    expect(() =>
      loadConfig({
        DISCORD_TOKEN: '',
        DATABASE_PATH: './data/snipebot.db',
        MEDIA_STORAGE_PATH: './data/media',
      }),
    ).toThrow(/DISCORD_TOKEN/);
  });

  it('applies defaults', () => {
    const cfg = loadConfig({ DISCORD_TOKEN: 'x'.repeat(10) });
    expect(cfg.databasePath).toBe('./data/snipebot.db');
    expect(cfg.nodeEnv).toBe('development');
    expect(cfg.maxMediaBytes).toBe(100_000_000);
    expect(cfg.archiveDMs).toBe(false);
  });

  it('opts into DM archiving only on exact true', () => {
    const on = loadConfig({ DISCORD_TOKEN: 'x'.repeat(10), ARCHIVE_DMS: 'true' });
    expect(on.archiveDMs).toBe(true);
    for (const value of ['1', 'yes', 'TRUE', ' true']) {
      expect(loadConfig({ DISCORD_TOKEN: 'x'.repeat(10), ARCHIVE_DMS: value }).archiveDMs).toBe(
        false,
      );
    }
  });

  it('parses MEDIA_MAX_BYTES', () => {
    const cfg = loadConfig({ DISCORD_TOKEN: 'x'.repeat(10), MEDIA_MAX_BYTES: '10' });
    expect(cfg.maxMediaBytes).toBe(10);
  });
});
