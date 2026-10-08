# 012 — Advanced snipe/history UI

## Goal

Walk edit history instead of only seeing before/after, and act on
messages directly from context menus — without new data plumbing.

## Requirements

- Revision walker: `/edits` replies gain Older/Newer buttons;
  `edits:rev:<messageId>:<pos>` customIds re-render that revision
  in place (`interaction.update()`), stale tokens fall back to ephemeral
  follow-up, then silence. Position (not revNo) based — gap-proof.
- `renderRevisionPage` (pure, exported): single-revision embed (author,
  content ≤2000, footer `Revision N of M · edited <t:R> | original`)
  - nav row (both buttons always present, disabled at ends).
- Button routing table (`src/interactions/buttons.ts`): `<prefix>:…`
  dispatch, per-route validation; unknown prefixes debug-logged.
  Auth per press: snapshot must be filed under the interaction channel,
  else ephemeral denial (null channel → denial).
- Message context commands (no user commands — no user-scoped surface
  justified): **View Edit History** (targetId → latest revision view +
  nav, `No archived history` when absent) and **Search User Messages**
  (target author → channel-scoped author search rendered like `/search`;
  partial-without-author → ephemeral). Same `mayReadChannel` gate;
  interaction-bound targeting needs no extra check.
- Registry: `MessageContextModule` (separate type/map — no churn to chat
  modules), deploy body includes context JSON, router dispatches
  message-context; user-context/buttons-unknown stay ignored.
- Mention suppression on every content-bearing reply (shared paths).

## Components V2 evaluation (SUPERSEDED by specs/021-components-v2 + D26, 2026-10-08)

Stay classic embeds. Reasons: universal client support; V2 flag disables
content/embeds/poll/sticker fields we display and forces full component
trees for simple read surfaces; our buttons already work in both systems.
Recorded as D18. Revisit only for a layout that embeds cannot express.

> Superseded: the browsable-archive direction IS the layout embeds
> cannot express. V2-first is now the architecture (D26); the 021 phase
> ships the browser foundation + `/snipe` POC. This section kept for history.

## Explicitly out

- Search paging (customIds cap at 100 chars — full queries don't fit;
  needs a server-side state store; carried).
- "View Related Messages" (undefined semantics) and "Archive Message"
  (everything is already archived) — noted, not overlooked.

## Constraints

- No new intents/permissions/dependencies/tables. Strict TS, no `any`.
- `customId` scheme documented in `docs/architecture.md`.

## Tests / completion

- Unit: walker render + nav states; button flow (render, invalid id,
  wrong-channel denied, gone → ephemeral); stale-update fallback;
  context commands (history, user search, partial author, unconfigured,
  denied); router (unknown context name, unknown button prefix,
  edits-button delegation).
- `typecheck + lint + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
