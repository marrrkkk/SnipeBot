import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { checkHealth } from '../../src/healthcheck.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'snipebot-health-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function migratedDb(): string {
  const path = join(dir, 'test.db');
  const db = drizzle(new Database(path));
  migrate(db, { migrationsFolder: './drizzle' });
  db.$client.close();
  return path;
}

describe('healthcheck', () => {
  it('passes on a migrated database', () => {
    expect(checkHealth(migratedDb())).toEqual({ ok: true, message: 'ok' });
  });

  it('names migrations on an empty database', () => {
    const path = join(dir, 'empty.db');
    new Database(path).close();
    const status = checkHealth(path);
    expect(status.ok).toBe(false);
    expect(status.message).toContain('migrat');
  });

  it('fails on a missing file', () => {
    const status = checkHealth(join(dir, 'nope.db'));
    expect(status.ok).toBe(false);
    expect(status.message).toContain('cannot open');
  });
});
