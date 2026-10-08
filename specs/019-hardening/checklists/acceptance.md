# 019 — Acceptance checklist (needs token, ideally Docker too)

- [ ] Fresh `docker compose up -d` → `data/*.db*` files mode 600 or tighter
- [ ] `npm audit` output reviewed in the last 30 days (record date)
- [ ] Rotate the bot token (Portal → `.env` → restart, no redeploy needed)
- [ ] Confirm no `Administrator` in the invite URL the docs recommend
