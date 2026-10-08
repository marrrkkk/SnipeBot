# 001 — Connection + command infrastructure

## Goal

Bot logs in with validated config; `/ping` deploys and replies; event/
interaction plumbing is proven. (Bootstrap implements the skeleton; this
phase hardens it.)

## Requirements

- `loadConfig()` rejects bad env with readable errors (tested).
- Client uses intents `Guilds + GuildMessages + MessageContent`, partials
  Message/Channel/Reaction, message sweeper; rationale in docs/discord.md.
- `deploy:commands` supports guild (dev) + global (prod) deploys.
- `routeInteraction` dispatches chat-input + autocomplete; unknown commands
  get ephemeral errors; per-interaction try/catch, never crashes.
- `ready` + `interactionCreate` + `messageCreate` (stub) wired via
  `registerEvents`; handlers log ids only.

## Constraints

- No archive DB I/O yet; no new intents/permissions without justification.
- Strict TS, no `any`, eslint + prettier clean.

## Discord API deps

Gateway identify (intents), application-command REST (`PUT .../commands`).
Sources: docs/discord.md.

## Tests / completion

- Unit: env validation, command registry JSON, router unknown-command path.
- Manual: `deploy:commands` + `dev` with real token shows login + `/ping` → Pong.
- `typecheck + lint + test + build` green.
