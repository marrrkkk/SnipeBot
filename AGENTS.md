# AGENTS.md — SnipeBot operating manual

## Project identity

SnipeBot is a **self-hosted** Discord message archive/recovery/inspection
system (primary UX: sniping deleted/edited messages). Single Node.js
process, local-first: SQLite (`data/snipebot.db`) + local media dir.
One installation may serve multiple guilds; there is no SaaS backend, no
shared database, no central bot. discord.js 14.27, Node ≥ 24.17, ESM,
TypeScript strict.

## Non-negotiable rules

1. TypeScript only; never reintroduce CommonJS (`"type": "module"`, `NodeNext`).
2. No `any` (lint error). Use `unknown` + narrowing.
3. Never persist discord.js objects. Normalize to `MessageSnapshot`
   (`src/domain/messageSnapshot.ts`) at the Discord boundary.
4. `src/domain`, `src/services`, `src/repositories` never import `discord.js`.
5. Event handlers stay thin (parse → service → catch). No DB logic in listeners.
6. Commands are `CommandModule`s routed by `src/interactions/router.ts` —
   no giant if-chain, no hardcoded command list in the router.
7. discord.js cache is sweepable ops cache; SQLite is the durable archive.
8. Request only needed Discord permissions/intents; justify each addition
   in `docs/discord.md` + the phase spec.
9. No new dependency without a one-line justification in the phase plan
   (prefer stdlib → installed dep → new dep, in that order).
10. Never invent Discord API behavior. Verify against
    `docs/discord.md` links (official docs) before implementing, and record
    findings in `docs/research.md`.
11. Components V2 is the default and preferred presentation architecture
    for SnipeBot's Discord UI. New interactive user-facing Discord
    interfaces must use Components V2 unless a documented platform
    limitation makes it unsuitable (see `docs/components-v2.md`, D26).
12. Classic embeds are not the default replacement for Components V2.
    They may only be used when a specific technical limitation,
    compatibility requirement, or non-interactive use case justifies them.
13. Domain/application services must never directly construct
    `ContainerBuilder`, `TextDisplayBuilder`, `EmbedBuilder`,
    `ActionRowBuilder`, or other Discord presentation objects. Flow is
    Domain → Application/View Model (`src/ui/viewModels.ts`,
    `src/ui/browser.ts`, discord.js-free) → Discord UI Renderer
    (`src/ui/renderers/`) → Components V2.

## Documentation map

- Start: `docs/README.md` → `docs/architecture.md`
- Discord truth: `docs/discord.md` (+ `docs/research.md` for decisions)
- Model/storage: `docs/data-model.md`, `docs/storage.md`
- Safety: `docs/security.md` (authorization model is binding)
- Workflow: `docs/development.md`, `docs/deployment.md`
- Choices: `docs/decisions.md` — update when changing the stack
- Order: `docs/roadmap.md`, per-phase specs in `specs/`

## Spec Kit workflow

This repo uses GitHub Spec Kit (docs: https://github.github.io/spec-kit/).
Source of truth per phase lives in `specs/<nnn>-<phase>/`:
`spec.md → plan.md → tasks.md (+ checklists/, research.md, data-model.md,
contracts/ as needed)`. Project-level constitution:
`.specify/memory/constitution.md`.

Conceptual sequence (adapt invocation to your harness; OpenCode here has
no `/speckit.*` slash commands, so work the files directly):

```text
constitution → specify → clarify → plan → checklist → tasks → analyze
→ implement → converge
```

Substantial features MUST have spec + plan + tasks before code. Keep phases
independently understandable (goal, requirements, constraints, DB + Discord
API deps, tests, completion criteria).

## Where to look first

1. This file (`AGENTS.md`)
2. `docs/README.md` + `docs/architecture.md`
3. Relevant spec (`specs/<phase>/spec.md`), `plan.md`, `tasks.md`
4. Source under `src/`
5. Official Discord/discord.js docs for API behavior (links in `docs/discord.md`)

## Change discipline

- Inspect before editing; preserve architectural decisions unless the task
  requires changing them (then update `docs/decisions.md` + affected docs).
- Update docs + spec/plan artifacts when behavior/architecture changes.
- Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`
  before claiming completion.
- Focused diffs; no unrelated refactors.

## Feature workflow

```text
Understand → inspect docs/code → specify → clarify → plan → checklist
→ tasks → analyze → implement in bounded phases → test (unit+integration)
→ typecheck/lint/build → review diff → update docs/specs → converge
```

Deletion attribution is best-effort; attachment URLs are not permanent;
channel visibility is enforced at read time (see `docs/security.md`).
When in doubt, capture the snapshot first and ask questions in the spec.
