# 015 — Audit-log correlation and deletion attribution

## Goal

Sniped messages can name a _possible_ deleter — honestly hedged, never
presented as ground truth.

## Requirements

- Single-message deletes only. Bulk entries cannot map to individual
  messages (count + channel only) — documented out, not attempted.
- `findDeleteAttribution(guild, channelId, authorId)`: fetch ≤5
  `MESSAGE_DELETE` entries; accept first with same channel,
  created-within-30s, and target absent-or-matching author; executor id
  required. Fetch failure (no `VIEW_AUDIT_LOG`, API error) → null.
  No new intent (REST, not gateway); DMs skipped (no audit log).
- Handler: record the marker first (never delayed by attribution), then
  attribute async; one retry after 5s on miss (configurable, unref'd
  timer); failures isolated and silent-ish (debug/warn, never crash).
- Repo `annotateDeletionEvents(messageId, …)`: fills only unattributed
  rows. Service `annotateDeletion` (+ stub).
- `/snipe` single view appends `· possibly deleted by <name-or-id>` to
  the footer when known (username from client cache, id fallback — never
  mention syntax). Bulk view unchanged. `ChannelDeletion` gains
  `executorId` (zero extra queries).
- Wording always hedges ("possibly"). Attribution is a hint for humans
  who could check the audit log themselves.

## Constraints

- No new intents/dependencies/tables (columns exist since bootstrap).
  Strict TS, no `any`. No REST call per message beyond ≤2 per
  single-delete; bulk path untouched.

## Tests / completion

- Unit (`auditLog.test.ts`): match, wrong channel, stale, target
  mismatch, missing executor, fetch failure.
- Unit (handlers): attributed flow, DM skip, fetch-failure skip, retry
  hit, partial/unfetchable unaffected (existing suites stay green).
- Integration: annotate fills only unattributed rows; `getDeletion`
  surfaces the executor.
- Unit: snipe footer with/without attribution, id fallback.
- `typecheck + lint + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
