# 021 — Components V2-first UI

## Goal

Migrate SnipeBot's interactive Discord UX to Components V2 as the
primary presentation architecture (D26), superseding the Phase-12
"classic embeds, V2 opt-in" decision (D11/D18). Ship the reusable
browser foundation plus a real `/snipe` V2 proof of concept; keep
existing embed surfaces working during the additive migration.

## Requirements

### FR-UI-1

Interactive archive views MUST use Discord Components V2 by default
(`MessageFlags.IsComponentsV2`, irreversible per message).

### FR-UI-2

The SnipeBot browser MUST support navigation between result pages
(Previous/Next; First/Last/Filter/Search/Sort are future extensions
the architecture must admit without redesign).

### FR-UI-3

The SnipeBot browser MUST support opening an individual message detail
view (results → detail → back) with progressive disclosure.

### FR-UI-4

The UI MUST separate message data/view models from Discord component
construction: domain/services/view-models never import `discord.js`;
only `src/ui/renderers/` constructs builders.

### FR-UI-5

Classic embeds MUST NOT be the default UI architecture. They may only
be used with a documented technical limitation, compatibility
requirement, or trivial non-interactive reason. No fake V2 (embeds
stuffed into containers).

### FR-UI-6

The archive MUST NOT impose the historical 20-message limitation.

### FR-UI-7

The UI page size MAY be limited for usability (default 5 rows/page)
without limiting archive storage or query result size.

### FR-UI-8

All Components V2 interactions MUST respect the application's
authorization model (`mayReadChannel` at read time + policy role gate,
enforced in the application layer on every press, not just by hiding
buttons).

### FR-UI-9

Expired/stale interactions MUST produce an understandable UI state
(clean "browser expired → run the command again", stale `update()`
falls back to ephemeral `followUp()` then drops).

### FR-UI-10

Components V2 limitations MUST be documented (`docs/components-v2.md`)
and considered when designing new screens (no `content`/`embeds`/
`poll`/`stickers` on V2 messages, attachments exposed via components,
≤40 components, 100-char `customId` budget, deferred ACKs set the flag
on the edit).

## Browser scope (foundation, reusable)

State: query, result set, current page, page size, filters, sort,
selected item, view mode (`results` | `detail`), navigation,
interaction state (guild/channel/query/page/filters/selection).
Reusable across `/snipe`, `/edits`, `/history`, `/search` — not coupled
to deleted messages.

## Proof of concept (this phase)

`/snipe` (fixture/archive records) → Components V2 browser →
`[Previous] [Next] [Details] [Close]` minimum; Details opens the
message-detail view with Back. Demonstrates V2 creation, structured
layout, pagination, button interaction, view-model rendering,
interaction routing, authorization boundary, stale/error states.

## Explicit states

loading, empty, error, permission denied, message unavailable,
attachment unavailable, database error, expired interaction, no search
results, filter returns no results — happy path alone is not done.

## Constraints

- No new intents/permissions/dependencies/tables. Strict TS, no `any`.
- `customId` scheme `snb:<action>:<args…>` documented in
  `docs/architecture.md`; ≤100 chars.
- Preserve Phases 1–20 behavior; V2 is additive until follow-up phases
  migrate each surface.

## Tests / completion

- Unit: view-model generation, pagination state, navigation,
  authorization boundary, empty/error/stale states, V2 renderer output
  (flags + component tree), button flow incl. wrong-channel denial.
- `typecheck + lint + format:check + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
