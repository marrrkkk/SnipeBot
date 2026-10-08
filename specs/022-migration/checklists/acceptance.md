# 022 — Live acceptance (token + dev guild present)

## Verified live 2026-10-08 (agent, real API + gateway)

- [x] `npm run deploy:commands` → 9 guild commands deployed.
- [x] REST GET confirms the live surface: `snipe [index,bulk]`,
      `edits [index]`, `search [text,author,after,has,deleted]`,
      `View Edit History`, `Search User Messages`, `backfill`, `stats`,
      `ping`, `settings` — and `snipebrowse` is gone.
- [x] Bot boots against the real gateway (`Logged in as Snipe-chan#5390`),
      idles with the migrated router (`snb`/`edb`/`seb`), shuts down cleanly
      on SIGTERM (exit 0).

## Needs a human in the Discord client

Unit tests cover logic; the items below need eyes and fingers (the agent
cannot observe renders or press buttons).

- [ ] `/snipe` renders a V2 browser (header, range, rows, nav,
      per-row Details, Close); Details → message detail; Back returns.
- [ ] `/snipe index:2` opens the 2nd deletion's detail directly.
- [ ] `/snipe bulk:true` renders the bulk-groups browser; group detail
      lists members; Prev/Next moves between groups.
- [ ] `/edits` renders the edited-messages browser; Details opens the
      V2 revision walker; Older/Newer walk with end-disabling; Back/Close.
- [ ] `/search text:…` renders the V2 results browser across pages;
      Details opens the hit; stale session (15+ min) shows expired state.
- [ ] Context menus: View Edit History → V2 walker; Search User
      Messages → V2 browser.
- [ ] Denied user (no ViewChannel / missing role) gets ephemeral denial
      on command and on button press.
- [ ] Mobile client renders all three browsers readably.
- [ ] No live verification performed in this environment (no token) —
      check only after a human runs the above.
