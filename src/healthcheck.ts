import Database from 'better-sqlite3';

export type HealthStatus = { ok: boolean; message: string };

// Tables created by migrations (not by the FTS ensure step): their absence
// means migrations never ran.
const REQUIRED_TABLES = ['messages', 'message_revisions', 'guild_settings', 'retention_policies'];

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Probe config-independent database health. Never throws. */
export function checkHealth(databasePath: string): HealthStatus {
  let db: Database.Database | null = null;
  try {
    db = new Database(databasePath, { readonly: true });
  } catch (err) {
    return {
      ok: false,
      message: `cannot open database at ${databasePath} (${messageOf(err)}). Is the data volume mounted?`,
    };
  }
  try {
    const rows = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as {
      name?: unknown;
    }[];
    const names = new Set(rows.map((r) => (typeof r.name === 'string' ? r.name : '')));
    const missing = REQUIRED_TABLES.filter((t) => !names.has(t));
    if (missing.length > 0) {
      return {
        ok: false,
        message: `database missing tables (${missing.join(', ')}). Run migrations (npm run db:migrate).`,
      };
    }
    db.prepare('SELECT COUNT(*) AS n FROM messages').get();
    return { ok: true, message: 'ok' };
  } catch (err) {
    return { ok: false, message: `database probe failed (${messageOf(err)})` };
  } finally {
    db.close();
  }
}
