import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1).optional(),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  DATABASE_PATH: z.string().min(1).default('./data/snipebot.db'),
  MEDIA_STORAGE_PATH: z.string().min(1).default('./data/media'),
  MEDIA_MAX_BYTES: z.coerce.number().int().positive().default(100_000_000),
  ARCHIVE_DMS: z.string().optional().default('false'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type AppConfig = {
  discordToken: string;
  clientId: string | undefined;
  guildId: string | undefined;
  databasePath: string;
  mediaStoragePath: string;
  maxMediaBytes: number;
  /** Archive DM snapshots too. Explicit 'true' only — never coerced. */
  archiveDMs: boolean;
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
};

/** Load + validate env. Throws with readable message on failure (fail fast). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }
  const d = parsed.data;
  return {
    discordToken: d.DISCORD_TOKEN,
    clientId: d.DISCORD_CLIENT_ID,
    guildId: d.DISCORD_GUILD_ID,
    databasePath: d.DATABASE_PATH,
    mediaStoragePath: d.MEDIA_STORAGE_PATH,
    maxMediaBytes: d.MEDIA_MAX_BYTES,
    archiveDMs: d.ARCHIVE_DMS === 'true',
    nodeEnv: d.NODE_ENV,
    logLevel: d.LOG_LEVEL,
  };
}
