# 018 — Acceptance checklist (needs Docker + a token)

- [ ] `docker compose up -d --build` → healthy in `docker ps`, logs show login
- [ ] Stop, `docker compose up -d` → migrations re-run harmlessly, data intact
- [ ] Point `DATABASE_PATH` at an empty dir → healthcheck names migrations
- [ ] `docker compose down -v` on scratch data → clean slate rebuild works
- [ ] Direct-Node path still works per `docs/development.md`
