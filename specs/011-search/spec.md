# 011 — Archive search (`/search`)

## Goal

Search the local archive — full text plus filters — scoped so tightly
that visibility leaks are impossible by construction.

## Requirements

- FTS5 external-content index over `message_revisions`
  (`message_fts`, triggers on insert/delete, conditional rebuild),
  ensured idempotently in `getDb` (every opener, incl. tests) and via the
  migrate path. No new tables in `schema.ts` (index DDL lives beside it).
- Repo `searchMessages(q)`:
  - `text`: AND of double-quoted terms with prefix (`"term"*`);
    user metacharacters escaped (quotes doubled) — never a MATCH error.
  - With text: matching revision shown, deduped per message (best rank).
  - Without text: latest-revision browse (requires ≥1 filter).
  - Filters: `authorId`, `channelId` (matches `channel_id` OR `thread_id`),
    `after`/`before` (ISO, on `created_at`), `hasAttachment`, `hasPoll`,
    `deleted` (true/false/either). Empty query (no text, no filter) rejected.
  - Limit 25, rank-ordered.
- `/search text? author? after? has? deleted?` (+`index`? no — one list
  reply, ≤10 lines + more-count). `has`: choices attachment/poll.
  `after`: `YYYY-MM-DD`, invalid → ephemeral error.
- Scope = interaction channel only (filed-under semantics: `channel_id`
  OR `thread_id` equals it; inside a thread both filing styles match).
  No channel option — same precedent as snipe/edits. Deleted included by
  default, marked 🗑️.
- Render: `**name**: text… <#cid> · <t:unix:R>` lines (names from client
  cache, id fallback, never mention syntax), title with count,
  `allowedMentions: { parse: [] }`, success public / empties ephemeral.
- Binding `configureSearchQuery` (same pattern); router untouched.

## Authorization (binding)

Interaction-channel scope only; live `ViewChannel` (DMs allowed) checked
before any query — identical to 004/005. Cross-channel `channel:` syntax
is future work requiring per-channel authZ (carried, not this phase).

## Constraints

- No new intents/permissions/dependencies. FTS5 ships with SQLite.
- Strict TS, no `any`. Raw SQL contained in one repo method with manual
  narrowing (drizzle builder can't express MATCH).

## Tests / completion

- Integration (`search.test.ts`): match/no-match, dedupe across revs,
  author/channel/after/before/has/deleted filters, channel scoping,
  special-char safety, filters-only browse, empty-query rejection.
- Unit (`search.test.ts`): list render, empty → ephemeral, denied +
  untouched query, DM allowed, bad-date ephemeral, no-constraint usage
  ephemeral, mention suppression.
- `typecheck + lint + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
