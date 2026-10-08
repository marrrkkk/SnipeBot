# Contributing to SnipeBot

Thanks for helping. SnipeBot is self-hosted, local-first, and small on
purpose — contributions that keep it that way are most welcome.

## Ground rules

1. Read [AGENTS.md](AGENTS.md) first — it is the operating manual
   (TypeScript strict, no `any`, architecture boundaries, Spec Kit
   workflow). It binds contributors as well as agents.
2. New behavior needs a spec first: `specs/<nnn>-<phase>/spec.md → plan.md
→ tasks.md` before code for anything beyond a trivial fix. Keep phases
   independently understandable.
3. Never commit secrets (`.env`, `data/`, `*.db`). Token handling rules:
   [docs/security.md](docs/security.md).
4. Never invent Discord API behavior — verify against the links in
   [docs/discord.md](docs/discord.md) and record findings in
   `docs/research.md`.

## Quick start

```sh
cp .env.example .env   # needs a test-bot DISCORD_TOKEN
npm ci
npm run db:migrate
npm run dev
```

Full setup, troubleshooting, and script reference:
[docs/development.md](docs/development.md).

## Before you push

```sh
npm run typecheck && npm run lint && npm test && npm run build
```

Integration suite (`npm run test:integration`) touches a temp SQLite DB —
safe to run locally. Keep diffs focused; no unrelated refactors.

## Pull requests

- One change per PR. Describe what/why, link the spec or issue.
- Update docs + spec artifacts when behavior or architecture changes
  (`docs/`, `specs/`, `docs/decisions.md` when the stack changes).
- Commands stay `CommandModule`s routed by `src/interactions/router.ts`;
  event handlers stay thin; `src/domain`, `src/services`,
  `src/repositories` never import `discord.js`.
- New Discord UI must use Components V2 (see
  [docs/components-v2.md](docs/components-v2.md)); no new dependency
  without the one-line justification the phase plan requires.

## Issues

Check existing issues first. Bug reports: what you did, what you
expected, logs with ids only (never paste message content or tokens).
Feature requests: the self-hosting use case it serves, not just the API.

## License

By contributing you agree your work is released under the repo's
[MIT License](LICENSE).
