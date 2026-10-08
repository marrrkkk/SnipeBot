# Decisions (ADRs)

## D1 — Node 24 LTS, ESM

discord.js 14.27 requires Node ≥ 24.17. ESM (`"type": "module"`,
`NodeNext`) — no CommonJS; old repo's CJS is not carried over.
Source: https://discord.js.org/docs/packages/discord.js/main

## D2 — discord.js 14.27 (stable, pinned minor)

Current stable major; full Gateway/REST/interaction coverage.
Pinned `^14.27.0` for reproducible installs.

## D3 — npm

Ubiquitous, zero extra tooling for self-hosters. `package-lock.json`
committed. (pnpm/bun work but are not the documented path.)

## D4 — TypeScript strict + exactOptionalPropertyTypes + noUncheckedIndexedAccess

Catches partial/cache nullability bugs at compile time. `any` banned
(eslint error) — use `unknown` + narrowing.

## D5 — eslint (typescript-eslint strictTypeChecked) + prettier + vitest

Standard flat-config lint, prettier formatting, vitest for ESM-native
tests without build-step friction.

## D6 — SQLite + Drizzle ORM + better-sqlite3

Single-file, WAL, sync driver, `drizzle-kit` migrations, FTS5 path for
search. Fits one-process self-host; Postgres/Redis/ES rejected (no need).
Source: https://orm.drizzle.team/docs/get-started-sqlite

## D7 — better-sqlite3 over node:sqlite/libsql

Mature prebuilds + Drizzle support today; `node:sqlite` is newer and
libsql/Turso remote is out of scope for local-first v1.

## D8 — Minimal intents: Guilds + GuildMessages + MessageContent + GuildMessageReactions + GuildMessagePolls (final)

Each justified in docs/discord.md. Reactions (Phase 8) and polls
(Phase 9) are both standard, non-privileged intents. No `GuildMembers`/
`Presences`, ever — nothing further planned.

## D9 — partials Message/Channel/Reaction + 30-min message sweeper

Receive uncached delete/update events; tolerate partials; DB is durable.

## D10 — MessageSnapshot domain type; no raw discord.js persistence

`src/domain/messageSnapshot.ts` is the archive contract.

## D11 — Classic embeds for bot output (SUPERSEDED by D26)

V2 is per-surface opt-in later (Phase 12); embeds maximize compat now.

> Superseded 2026-10-08 by D26: Components V2 is now the primary
> interactive UI architecture. Kept for history only.

## D12 — Local-fs MediaStorage behind an interface

`put/get/exists/delete`; S3-compatible later. No cloud in v1.

## D13 — Guild-command deploys in dev, global in prod

`DISCORD_GUILD_ID` set → instant; unset → global REST deploy.

## D14 — Zero-dep JSON logger, no content logging

Structured logs without a new dependency; ids only, never content/tokens.

## D15 — Docker optional, volumes for data

`Dockerfile` + `docker-compose.yml`; direct-Node remains first-class.

## D16 — Lazy thread resolution, enriched shells never clobbered

Thread attribution via `ThreadResolver`: cached-channel read (free) →
one REST fetch per unknown channel per process (in-flight deduped, 60s
negative TTL) → null fallback. Enriched channel shells overwrite mutable
fields; sparse observations insert-if-missing only. Deletion path needs
no resolver (event channel ids already match). Forum/media channels and
starter messages need no special handling (verified normal messages).

## D17 — FTS external-content index with triggers, ensured on open

`message_fts` mirrors `message_revisions` via triggers (virtual tables
escape drizzle's schema builder, so DDL lives in `searchIndex.ts`).
Ensured on every open (skipped pre-migration) and after migrations, with
a one-time rebuild when empty. Query terms are quoted literals, never
interpreted MATCH syntax.

## D18 — Classic embeds over Components V2 (SUPERSEDED by D26)

V2 was evaluated against our read surfaces and rejected for now: the flag
disables content/embeds/poll/sticker fields we display, forces full
component trees for simple lists, and buys no layout our embeds cannot
express — while classic embeds render on every client. Our ActionRow
buttons work in both systems. Revisit only for a layout embeds cannot do.

> Superseded 2026-10-08 by D26: the browsable-archive product direction
> is exactly the layout embeds cannot express. Kept for history only.

## D19 — Policy store + fail-closed gates, DM archiving off by default

`guild_settings` (first real migration, `0001`) holds role allowlists +
guild opt-out; absent row = open/defaults. Corrupt rows throw (loud via
router catch) rather than fail open. DM snapshots skip unless
`ARCHIVE_DMS` is exactly `'true'` (never boolean coercion) — privacy by
design per the constitution. Deletion markers stay ungated (inert). Role
checks read live member roles; binding absent (tests/dev) skips the gate.

## D20 — Retention keeps everything until configured, sweeps heal crashes

No expiry rows means no deletion (data-loss-by-default would betray the
recovery product). Effective policy merges per field (guild overrides
inherit the global baseline). DB deletes precede file unlinks so a crash
leaves orphans — not dangling references — and the orphan pass heals
them. File keys embed messageIds, so message-expiry files are never
shared; revision-prune files are reference-checked.

## D21 — Best-effort audit attribution, hedged in UI

Single deletes correlate to `MESSAGE_DELETE` entries (channel + 30s
recency + target-absent-or-equal, one 5s retry); bulk entries are
unmappable and never attempted. Markers record first, attribution fills
unattributed rows only. UI says "possibly deleted by X" (username from
cache, id fallback, never mention syntax). No new intent (REST path).

## D22 — Manual per-channel backfill; reruns safe, live owns the future

`/backfill` imports the interaction channel only (precedent holds), gated
by visibility then ManageGuild. Gap-fill only: unknown messages in, known
messages never rewritten; reruns dedupe to skips. No revision history is
reconstructed (the API has none). Backfilled attachments drain via the
media worker. Rate limits ride discord.js REST backoff, pages sequential.

## D23 — No metrics infra, no pacer, coalesce the hot spots

Prometheus/queues would serve nobody here: counters in-process, sweeps on
timers, REST paced by discord.js itself. The one measured risk (per-event
reaction/vote fetches) is coalesced per message. Load numbers come from
the runnable script, not estimates.

## D24 — Container runs migrations, healthchecks the volume

Boot chain `migrate && exec node` (idempotent journal-tracked migrations)
so upgrades can't boot stale; HEALTHCHECK probes config + table presence
with actionable messages. Non-root `node` user, no baked secrets, no
ports. Scripts live under `src/scripts/` so the single `tsc` program
compiles CLIs with the app.

## D26 — Components V2-first Discord UI

### Context

The bootstrap UI is embed-centric (D11, D18): `/snipe`, `/edits`,
and `/search` reply with classic embeds plus small button rows.

### Problem

SnipeBot is evolving from static command replies into a browsable
archive (results → detail → context → revisions → attachments).
Embeds cannot express paged result lists, progressive disclosure, or
reusable browser chrome without cramming everything into one response.

### Decision

Components V2 becomes the primary Discord presentation system for all
substantial interactive surfaces (message browsing, search, edit
history, message details, filters, pagination, context browsing).

### Reasons

- Richer structured layouts (containers, sections, text displays,
  separators, media galleries) over flat embed fields.
- Better browsing experience: paged results with native
  Previous/Next/Details/Back/Close controls.
- Native Discord interaction model (`custom_id` routing, 3s ACK,
  15-min tokens, stale-token fallback).
- Reusable browser UI: one `BrowserState` + renderer family serves
  `/snipe`, `/edits`, `/history`, `/search`.
- Progressive disclosure: one giant response becomes Results →
  Detail → Revisions/Attachments/Context.
- Aligns with the product direction (Discord-native archive browser).

### Tradeoffs

- Cannot freely mix traditional `content`/`embeds` on V2 messages;
  every surface must be designed V2-native.
- Newer component primitives to learn; 40-component cap bounds page size.
- Existing embed-oriented implementations must be redesigned (kept
  working during migration; V2 added additively first).
- Not every surface needs V2: trivial confirmations
  (`✅ Settings updated.`) stay plain text with a documented reason.

### Consequence

New interactive user-facing Discord interfaces must use Components V2
unless a documented platform limitation makes it unsuitable. Classic
embeds may only be used with a specific technical/compatibility reason.
Domain/application services never construct Discord builders directly —
view models flow into `src/ui/renderers/` (see `docs/components-v2.md`,
`docs/architecture.md`).

## D27 — V2 migration complete for archive read surfaces

`/snipe` (singles + bulk groups), `/edits` (list + walker), `/search`
(session browser), and both message context menus are V2-native;
classic embed paths for these surfaces were deleted, not kept in
parallel. The 021 `/snipebrowse` proof-of-concept command and the
`edits:rev:` button scheme retired with it (in-flight old buttons hit
the router's unknown-prefix path — harmless, tokens expire in 15 min).
Shared builders live in `renderers/browserShell.ts`; search pagination
state lives in the bounded server-side session store (`src/ui/sessions.ts`)
because full queries exceed the 100-char `customId` budget. Remaining
classic surfaces (`/stats`, `/settings`, `/backfill`, `/ping`, ephemeral
guidance texts) are documented §26 exceptions: non-interactive or
trivially small.

## D28 — Detail-first snipe, select lists, section cards

`/snipe` opens the latest deletion as a detail card (Older/Newer walk,
List, Close — one row); lists on all three surfaces use Previous/Next/
Close plus a single jump select instead of per-row Details buttons.
Cards use `Section` + avatar thumbnail (live-resolved, omitted when
uncached), container accent, and `MediaGallery` (≤4 CDN images) above
the filename list. Selects route via `interactions/selects.ts`
(`snb:jp/jb`, `edb:jp`, `seb:jp`) with the same per-press auth and
stale fallback as buttons. Avatars stay out of the archive and out of
`customId`s; no mapper, snapshot, schema, intent, or dependency
changes.

## D25 — Prove hardening, defer breaking upgrades, umask by default

Audit evidence over assertions: token touchpoints (4, none logged),
logger args (ids/counts only), invite bitfield computed from the library
(`68608` = ViewChannel + ReadMessageHistory + SendMessages), lockfile
committed and used by every install path. drizzle-orm HIGH fixed by a
minor upgrade verified green; esbuild/tinypool chains stay (dev-only,
breaking-only fixes — recheck at release). New files arrive `600`/`700`
via process umask; old files are operator duty. No cooldowns: single-guild
self-host scale doesn't need them; regexes are linear (no nested
quantifiers anywhere).
