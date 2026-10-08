# 010 — Tasks

- [x] T1 Domain + resolver: `ChannelSnapshot`, `ThreadResolution`,
      cache-first/fetch-once/60s-negative-TTL (unit)
- [x] T2 Mapper: optional override + channel build from cached channel (unit)
- [x] T3 Repo/service: shell upsert from snapshot, `deleteChannel`,
      `recordChannel`/`removeChannel` ports (integration)
- [x] T4 Handlers: create/update take optional resolver; thread
      create/update/delete wired (unit)
- [x] T5 Docs: data-model shells populated, decisions entry
- [ ] T6 Live acceptance (checklists/acceptance.md) — needs token

Notes: channel upsert and both delete paths bite-checked via mutants.
`ChannelInfo` lives with the repo (type-only service import; single
implementation, precedent: `SnipeQueryPort`). Forum/media + starters
explicitly out (normal messages). Deletion path needs no resolver.
