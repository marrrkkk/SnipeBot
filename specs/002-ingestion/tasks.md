# 002 — Tasks

- [x] T1 Mapper: text message w/ attachments + embeds + reply ref
- [x] T2 Mapper: forward w/ `message_snapshots[0]`, nested depth capped
- [x] T3 Mapper: poll + voice (`duration_secs`, `waveform`, `IS_VOICE_MESSAGE`)
- [x] T4 Mapper: Components-V2 message (raw components preserved, flags kept)
- [x] T5 Handler: service rejection isolated (logged, no throw, no content logged)
- [x] T6 Handler: bot messages skipped

Implementation: `src/discord/mappers.ts` (`toSnapshot`, `SnapshotError`),
`src/services/stubArchiveService.ts`, handler wired in
`src/events/messageCreate.ts` via `registerEvents(client, service).
Verified runtime fact (discord.js `Message.js` `_patch`): forwarded snapshots
are real `Message`instances with reference id/channel merged in, but`author`genuinely absent → sentinel author. Thread resolution falls back to`threadId: null` when the channel is uncached (Phase 10 refines).
