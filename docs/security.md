# Security & privacy

SnipeBot stores other people's messages. Treat the archive as sensitive
by default.

## Secrets

- Token lives only in `.env` (never committed) / process env / container
  secret. `.env.example` documents shape, never values.
- File perms: `.env` and `data/` readable only by the bot user (`chmod 600/700`).
  New files arrive restricted via process umask `0o077`
  (`src/security/files.ts`, applied in `index.ts` + `migrate.ts`);
  pre-existing files are operator duty (`chmod -R u=rwX,go= data/`).
- Logs never include tokens, and never include message content —
  log ids/channel/guild only (`src/utils/logger.ts`). Metrics carry
  counters only (no content, no per-user labels); `/stats` shows counts.
- Token rotation: regenerate in the Portal → replace `DISCORD_TOKEN` →
  restart. No redeploy needed (commands belong to the application, not
  the token). If a token ever leaks, rotate first, then investigate.

## Discord least privilege

Request: `ViewChannel` + `ReadMessageHistory` (observe),
`SendMessages` (reply). Optional: `ViewAuditLog` (attribution, Phase 15).
Do NOT request `Administrator`, `ManageMessages`, `BanMembers` for the bot
— none are needed to read/archive/reply. (`ManageGuild` is required of
the _caller_ for `/settings`, never granted to the bot.)

## Authorization model (binding on all read surfaces)

A user who can run `/snipe` must NOT gain access to channels they cannot
see. Every read path enforces:

1. Resolve the caller's visible channel set: the bot checks the
   interaction member's `VIEW_CHANNEL` on the target channel at query time
   (Discord permission resolution, not a cached role list).
2. Scope every archive query to channels the caller can currently view.
3. Deleted/edited content follows the same rule: visibility is evaluated
   at read time against the live channel, not at capture time.
4. Role gate: `guild_settings.snipe_role_ids` (managed via `/settings`
   by `ManageGuild` holders). Non-empty ⇒ caller needs a listed role;
   empty/absent ⇒ everyone with visibility. Corrupt rows fail closed.
5. Ingest gates: DMs are NOT archived unless `ARCHIVE_DMS=true`
   (privacy by design); guilds may opt out entirely
   (`/settings archiving`). Deletion markers stay (inert without content);
   reaction/vote refreshes on unarchived messages likewise leave only
   rows no read path can reach.
6. Defaults deny cross-channel reads. Retention is operator-configured
   (`/settings retention-*`); unconfigured means keep everything.

NSFW/age-gated channels: inherit channel visibility; no separate bypass.

## Retention & deletion

- Retention policies per scope (`global` + per-guild, per-field merge);
  expired rows + unreferenced media hard-deleted by hourly sweeps.
- A user deleting their message does not purge the archive by itself
  (that would defeat recovery); server admins set retention, and future
  policy may honor Discord-level deletes on request. Document the choice
  per install; never silently keep data past the configured window.

## Backups

Encrypt off-host copies; restrict restore to the bot operator.
