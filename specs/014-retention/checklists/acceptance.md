# 014 — Acceptance checklist (needs a real token + a test guild)

- [ ] `/settings retention-set keep-days:1` → tomorrow, old messages gone
      from `/snipe` and `/search`, files removed from disk
- [ ] `/settings retention-show` → prints effective policy
- [ ] `/settings retention-clear` → back to keep-everything
- [ ] Non-admin `/settings retention-set …` → ephemeral denial
- [ ] Restart bot → sweeps resume on schedule
