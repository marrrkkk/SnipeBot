# 019 — Audit record (2026-10-08, evidence)

## Secrets

- `DISCORD_TOKEN` touchpoints (grep, 4 total): `env.ts` schema read +
  mapping, `index.ts` login, `deploy-commands.ts` REST `setToken`. None
  logged, none in tests (fakes use `'x'.repeat`), none in images
  (`.dockerignore` covers `.env`; compose uses `env_file`).
- Stale-LSP noise aside, no token-shaped values anywhere outside `.env`
  (600 perms, gitignored; no git repo exists yet to leak through).

## Logs

- All `logger.*` call args reviewed: ids, counts, paths, errors, channel/
  guild ids only. No `message.content`, no tokens, no URLs, no PII.
- `allowedMentions: { parse: [] }` on all content-bearing replies
  (Phases 4–6); settings role mentions are ephemeral (no notify).

## Permissions

- Bot-side: `ManageGuild` appears only as caller-side checks
  (`settings.ts`, `backfill.ts`); no `Administrator`/`ManageMessages`/
  `BanMembers` requested anywhere in `src/`.
- Invite bitfield computed from discord.js (`PermissionsBitField`):
  `ViewChannel + ReadMessageHistory + SendMessages` = **68608**.

## Files

- `restrictFileCreation()` (umask `0o077`) at `index.ts` + `migrate.ts`
  entry; pre-existing files = operator duty (documented).
- Fixed: `scripts/migrate.ts` ran `main()` twice (double "Migrations
  applied" log seen in Phase 13) — harmless (idempotent) but sloppy;
  removed the duplicate.

## Dependencies (`npm audit`, 2026-10-08)

| Finding                                                | Severity    | Action                                                                                                                                 |
| ------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| drizzle-orm SQLi via identifiers (GHSA-gpj5-g38j-94v9) | high        | FIXED: `0.44.7` → `0.45.4`, full gate green. (Not exploitable here in any case: identifiers static, user input bound or MATCH-quoted.) |
| esbuild chain via drizzle-kit (dev-only)               | 5× moderate | DEFERRED: fix is a breaking major; never ships (`--omit=dev`).                                                                         |
| tinypool via vitest (dev-only)                         | 2× critical | DEFERRED: fix is vitest 5 breaking; never ships. Recheck at release (Phase 20).                                                        |

## Abuse / ReDoS

- No cooldowns: single-guild self-host scale; bulk ops are ManageGuild-gated.
- Regexes (`YYYY-MM-DD`, `\s+`, filename sanitize, badge patterns):
  linear, no nested quantifiers.
- `JSON.parse` only on own-DB content.
