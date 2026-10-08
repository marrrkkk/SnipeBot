# 010 — Threads / forum / media channels

## Goal

Thread messages archive with correct thread attribution (not just a bare
thread id), channel shells carry kind/name/parent, and thread lifecycle
keeps shells honest. Sniping inside threads keeps working.

## Requirements

- `ThreadResolver` (discord layer): cache-first, fetch-once-per-unknown-
  channel (in-memory, negative TTL 60s), returns `{ channelId, threadId,
channel }`. Handlers resolve before mapping; mapper takes an optional
  override and otherwise keeps its cached-channel behavior.
- `MessageSnapshot.channel`: `{ id, kind, name, parentId } | null` —
  the channel the message was sent in (thread itself when in a thread).
  Repo upserts shells (insert + mutable-field update); thread shells link
  `parentId` to the parent channel.
- Thread lifecycle (`threadCreate/Update/Delete`, already covered by the
  `Guilds` intent — no new intents): create/update upsert the shell
  (incl. `archived_at` when archived, cleared on un-archive); delete
  removes the shell (message rows keep their ids; no FK).
- Service ports `recordChannel` / `removeChannel` (+ stub). Handlers stay
  thin; `recordDelete` path untouched (event channel ids already match).
- Forum/media channels and thread starter messages: no special handling —
  they arrive as normal messages/threads (verified in bootstrap R8).
  Documented as explicitly out, not overlooked.

## Constraints

- No new intents/permissions/dependencies/tables (one migration only if a
  column is added — none planned; shells already have the columns).
- No REST call per message: at most one fetch per unknown channel per
  process lifetime (plus 60s-negative-TTL retries).
- Strict TS, no `any`. Interface additions ripple to test fakes — accept.

## Tests / completion

- Unit (`threads.test.ts`, fake client cache/fetch): cached thread split,
  cached text passthrough + fields, miss fetches once then caches, fetch
  failure → null fallback.
- Unit (mapper): override applied; existing cache behavior unchanged.
- Unit (handlers): resolver-provided threadId reaches the service;
  omitted resolver keeps old behavior; thread create/update/delete call
  the right service ports.
- Integration: shells enriched + renamed on re-ingest; shell delete keeps
  message rows.
- `typecheck + lint + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
