# 001 — Plan

**Approach:** mostly implemented in bootstrap (`src/config`, `src/discord`,
`src/commands`, `src/interactions`, `src/events`, `scripts/deploy-commands`).
Harden: guild-vs-global deploy docs, router tests, reconnect/error logging.

**Files:** touch `src/interactions/router.ts`, `src/events/*`,
`scripts/deploy-commands.ts`, `tests/unit/*` only. No new deps.

**Steps:** 1) router unit tests (unknown command, autocomplete passthrough,
failure → ephemeral reply attempt), 2) README/dev-docs check, 3) live-login checklist (checklists/acceptance.md).
