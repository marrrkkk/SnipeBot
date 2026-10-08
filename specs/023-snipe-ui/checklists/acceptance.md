# 023 — Live acceptance (token + dev guild present)

## Verified live 2026-10-08 (agent, real API + gateway)

- [x] `npm run deploy:commands` → 9 guild commands deployed.
- [x] REST GET confirms the live surface unchanged: `snipe [index,bulk]`,
      `edits [index]`, `search [text,author,after,has,deleted]`, both context
      menus, plus `ping`/`settings`/`backfill`/`stats`.
- [x] Bot boots against the real gateway (`Logged in as Snipe-chan#5390`)
      with the 023 router (buttons + selects), shuts down cleanly on
      SIGTERM (exit 0).

## Needs a human in the Discord client

Unit tests cover logic; the items below need eyes and fingers (the agent
cannot observe renders or press buttons/selects).

- [ ] `/snipe` opens the latest deletion as a detail card (avatar,
      accent, relative timestamps, facts, gallery if images).
- [ ] Older/Newer walk between deletions; disabled at the ends; List
      returns to the right page; Close ends.
- [ ] Lists show Previous/Next/Close + one jump select (no Details
      buttons); picking an option opens its detail; Back returns.
- [ ] `/edits` walker and `/search` detail share the same card language;
      thumbnails appear for cached users, absent cleanly otherwise.
- [ ] Image attachments render in a gallery; filenames always listed.
- [ ] Denied/stale/expired/empty states still read cleanly.
- [ ] Mobile client renders cards and selects readably.
