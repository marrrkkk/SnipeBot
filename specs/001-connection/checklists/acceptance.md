# 001 — Acceptance checklist

- [x] `.env` from `.env.example`, Message Content intent toggled in Portal
      (verified 2026-10-08: real `.env` present, bot logs in — intents accepted
      by the gateway, which rejects disallowed privileged intents)
- [x] `npm run deploy:commands` succeeds (guild or global)
      (verified 2026-10-08: 7 guild commands deployed via REST, no errors)
- [x] `npm run dev` logs `Logged in as <tag>`
      (verified 2026-10-08: `Logged in as Snipe-chan#5390`)
- [ ] `/ping` in server → ephemeral `Pong!` (needs a human in Discord)
- [ ] Kill + restart: no crash, clean login (needs a human watching;
      shutdown handlers + closeDb in place)
- [x] `npm run db:migrate` on the real DB (verified 2026-10-08: all
      tables + FTS present)
