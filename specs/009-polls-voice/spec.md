# 009 — Polls + voice messages

## Goal

Polls stay live after archival, and `/snipe` shows poll results and voice
durations instead of hiding them.

## Requirements

- Enable the standard (non-privileged) `GuildMessagePolls` intent.
  Document; finalize decision D8.
- Handle `MessagePollVoteAdd/Remove` with one path: resolve the message
  (fetch when partial, skip on failure) → map to snapshot →
  `refreshPoll(snapshot)`. No revisions from votes, ever.
- Service `refreshPoll`: snapshot without poll → no-op success; message
  unknown (`countRevisions === 0`) → `saveSnapshot` baseline (current
  state, no history invented); otherwise `repo.refreshPoll` (single
  current-state row: delete existing + insert fresh, `rev_no` null).
  Rationale: vote counts are current-state by nature; intermediate-count
  history was never promised.
- Repo `refreshPoll(messageId, raw)`: one transaction, delete + insert.
- `/snipe` render adds, when present: Poll line
  (`<question> · N vote(s)[, top: …]`), voice duration on attachment lines
  (`🎙️ M:SS` when `durationSecs` present). Waveform bars explicitly out
  (delightful, unneeded — duration answers the UI need).
- Same `allowedMentions` suppression (shared reply path).

## Constraints

- No new privileged intents/permissions/dependencies/tables.
- Poll raw shape varies (djs `toJSON` vs API): extract defensively
  (`question.text`, answers with `vote_count`/`voteCount`/`votes`/`count`
  fallbacks); unparseable poll → line omitted, never a crash.
- Strict TS, no `any`.

## Tests / completion

- Integration: vote-refresh updates results with revision count unchanged;
  unknown message establishes a baseline.
- Unit (answer fakes, real `Client` emit): add/remove refresh with poll
  snapshot; partial-unfetchable skipped; poll-less fetched message skipped.
- Unit: client intents include `GuildMessagePolls`; snipe shows poll line
  and voice durations across representative raw shapes.
- `typecheck + lint + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
