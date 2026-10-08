# 005 — Tasks

- [x] R1 Extract `mayReadChannel` → `channelAccess.ts` (snipe uses it, green)
- [x] R2 Extract `truncate`/`contentOrPlaceholder` → `rendering.ts` (snipe uses it, green)
- [x] R3 Move chat-input fake → `helpers/interactions.ts` (snipe.test uses it, green)
- [x] T1 Repo: `listEditedMessages` + `getRevisions` (integration)
- [x] T2 Command: `/edits [index]` latest-first + index (unit)
- [x] T3 Auth: denied + untouched query; DM allowed; unconfigured closed (unit)
- [x] T4 Render: before/after, count, relative timestamp, truncation (unit)
- [x] T5 Registry: deploy body + map contain `edits`
- [ ] T6 Live acceptance (checklists/acceptance.md) — needs token

Notes: channel scoping of `listEditedMessages` bite-checked via mutant
(dropped filter → fail, restored → green). `sql<string | null>` max() over
ISO text orders chronologically.
