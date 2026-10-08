# 021 — Live acceptance (needs a Discord token + guild)

Manual gate: agent-verifiable items are covered by unit tests; the items
below need a human in the Discord client.

- [ ] `/snipebrowse` in a channel with deletions renders a V2 container
      (header, `1–5 of N`, rows, Previous/Next/Details/Close) — no
      "interaction failed".
- [ ] Next/Previous page through results; buttons disable at the ends.
- [ ] Details opens the message-detail view (author, channel, timestamp,
      content, attachment/reaction/edit counts); Back returns to the list.
- [ ] Empty channel shows the clean empty state; denied user (no
      ViewChannel / missing role) gets an ephemeral denial.
- [ ] Stale browser (wait >15 min or restart bot, then press a button)
      shows the expired state, not a silent failure.
- [ ] Mobile client renders the container readably.
- [ ] No live verification performed in this environment (no token) —
      check this box only after a human runs the above.
