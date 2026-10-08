# 006 — Bulk deletion handling (`/snipe bulk:True`)

## Goal

One purge should not require fifty `/snipe index:N` calls: `/snipe` gains a
`bulk` flag showing the nth most recent bulk-deletion group as one list.

## Requirements

- `/snipe bulk:True [index]` (index 1–10, default 1): nth bulk group in
  this channel, newest first. `bulk:False`/omitted = unchanged Phase-4 path.
- Group heuristic (documented, best-effort): consecutive `kind='bulk'`
  rows (newest-first) whose adjacent `observed_at` differ by ≤60s form one
  group; `kind='single'` rows never join. The bulk handler stamps one
  timestamp per purge, so a purge normally arrives as one group.
- Listing: up to 10 recoverable messages as `**user**: text` lines
  (150 chars each), title with recoverable count, purge timestamp,
  position footer; `…and N more` when capped. Groups with zero recoverable
  messages are skipped while counting (same rule as singles).
- Empty → ephemeral "No bulk deletions here."; index exceeds →
  ephemeral "Only N bulk deletion(s)…". Success public, rest ephemeral.
- Scan bound: ≤200 deletion rows per invocation (local SQLite; N+1 reads
  consistent with Phases 4–5).

## Authorization

Unchanged from 004 (same command, same check): interaction-channel scope,
live `ViewChannel`, DMs allowed.

## Mention safety (applies to all rendered replies)

Sniped content is untrusted user text: every content-bearing reply sets
`allowedMentions: { parse: [] }` so `@everyone`/role/user pings inside
archived content render literally and never notify. Pinned by test.

## Constraints

- No new intents/permissions/dependencies/tables. Strict TS, no `any`.
- No repo changes: `listDeletionsForChannel` + `findById` suffice.

## Tests / completion

- Unit (`snipe.test.ts`): group display, index 2, singles ignored, window
  split (61s+ apart = two groups), contentless skipped, 10-cap + more
  count, empty → ephemeral, mention suppression asserted on a success
  reply, existing single-path suites stay green.
- Registry: `snipe` options now `[index, bulk]`.
- `typecheck + lint + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
