# 006 — Tasks

- [x] T1 Grouping: adjacent bulk rows ≤60s group together; singles never
      join; 61s+ gap splits (unit, pure function)
- [x] T2 Command: `bulk:True` lists newest group (10 lines, count, footer)
- [x] T3 Command: index 2 selects second group; cap + "more" count
- [x] T4 Content: contentless skipped; empty → ephemeral
- [x] T5 Mentions: `allowedMentions: { parse: [] }` on snipe/edits success
      replies (unit-asserted)
- [x] T6 Registry: `snipe` options `[index, bulk]`
- [ ] T7 Live acceptance (checklists/acceptance.md) — needs token

Note: mention suppression was a live security finding (archived
`@everyone` would ping on render) applied to all three content-bearing
replies, not just the new one.
