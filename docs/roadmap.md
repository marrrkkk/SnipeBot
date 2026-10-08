# Roadmap — all phases complete as of v1.0.0

Each phase below shipped its own Spec Kit spec → plan → tasks →
implement → converge cycle (see `specs/`). Per-phase interactive
acceptance items that need a human in Discord/Docker remain open in
their `checklists/`; everything agent-verifiable is green.

1. **Discord connection + command infra** — login, deploy script, router
   proven by `/ping`. (Mostly done in bootstrap; harden + guild config.)
2. **Message ingestion + snapshot normalization** — `messageCreate` →
   `MessageSnapshot` mapper with unit tests over fixtures.
3. **Persistent archive (SQLite/Drizzle)** — schema (§data-model),
   migrations, repositories, revision append.
4. **Deleted-message recovery** — `messageDelete` → marker + `/snipe`
   (channel-scoped, auth-checked).
5. **Edit history** — `messageUpdate` revisions + `/edits` + revision paging.
6. **Bulk deletion** — `messageDeleteBulk` + multi-snipe view.
7. **Attachments/media** — async downloader, local store, dedupe, retention.
8. **Reactions + rich metadata** — reaction snapshots, embeds/stickers views.
9. **Polls + voice messages** — poll snapshots/votes, duration/waveform UI.
10. **Threads/forum/media channels** — thread-aware archive + scoping.
11. **Archive search** — FTS5 + filters (`author:`, `has:`, `after:` …).
12. **Advanced snipe/history UI** — context commands, buttons/pages, V2 opt-in.
13. **Permissions + authorization** — model from security.md enforced + tested.
14. **Retention + storage management** — policies, cleanup jobs.
    (`/stats` landed in Phase 17.)
15. **Audit-log correlation** — best-effort executor hints (never ground truth).
16. **Backfill/history import** — paged `before` import with rate-limit care.
17. **Observability/resilience/performance** — metrics, backpressure, load tests.
18. **Docker/self-host packaging** — hardened image + compose + restore docs.
19. **Security hardening** — audit, secret handling, permission review.
20. **Release readiness** — final docs, changelog, versioned release.

Carried future work lives in `specs/020-release/triage.md`.

21. **Components V2-first UI** — V2 browser foundation + `/snipe`
    proof of concept (see `specs/021-components-v2/`); supersedes the
    Phase-12 "V2 opt-in" line above (D11/D18 → D26). Existing
    embed surfaces keep working during the additive migration.
22. **V2 migration of read surfaces** — `/snipe`, `/edits`, `/search` +
    context menus V2-native; POC + classic paths retired
    (see `specs/022-migration/`, D27).
23. **Modern archive UI** — detail-first snipe, select lists, section
    cards with avatars/galleries on all three surfaces
    (see `specs/023-snipe-ui/`, D28).
