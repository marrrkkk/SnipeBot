# 009 — Tasks

- [x] T1 Repo: `refreshPoll` single-row swap (integration: results update,
      revisions unchanged; unknown message stays invisible)
- [x] T2 Service: `refreshPoll` (baseline-if-new, skip-if-poll-less)
- [x] T3 Handlers: vote add/remove → one refresh path (unit: refreshes,
      partial-unfetchable skipped)
- [x] T4 Render: poll results line + voice durations (unit, several shapes)
- [x] T5 Intent: `GuildMessagePolls` + pinning test + docs finalize
- [ ] T6 Live acceptance (checklists/acceptance.md) — needs token

Notes: shared `resolveFullMessage` extracted (`src/discord/messages.ts`;
`messageUpdate` refactored onto it, green). Waveform bars out (duration
answers the UI need). Poll has no custom `toJSON` (inherits Base) —
extractor stays defensive across shapes.
