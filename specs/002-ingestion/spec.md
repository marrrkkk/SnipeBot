# 002 — Ingestion + snapshot normalization

## Goal

Every observed `MESSAGE_CREATE` becomes a validated `MessageSnapshot`
without touching the DB directly from the handler.

## Requirements

- `toSnapshot(message: Message): MessageSnapshot` mapper in
  `src/discord/mappers.ts` (new): id/guild/channel/thread, author, content,
  timestamps, attachments (all metadata incl. duration/waveform), embeds
  (raw), reactions (if cached), stickers, components (raw), poll (raw),
  reference (incl. forward type), `message_snapshots[0]` (depth-capped),
  flags, type, tts, pinned.
- Partial/uncached inputs → explicit error or id-only marker, never silent
  wrong data. Missing MessageContent fields stored as empty + flagged.
- Handler: `messageCreate` → map → `archiveService.ingestMessage` →
  per-message catch; bots ignored; no content in logs.

## Constraints

- No discord.js imports below `src/discord/` + event adapters.
- Fixture-driven unit tests (normal, forward, poll, voice, V2, partial).

## Tests / completion

- ≥6 mapper fixtures green; handler failure test (service rejects →
  logged, process alive). `typecheck/lint/test/build` green.
