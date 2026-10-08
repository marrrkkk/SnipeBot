# SnipeBot Constitution

Ratified 2026-10-08. Amend by editing this file + noting the change in the
phase spec that motivated it.

1. **Correctness over cleverness.** Boring, explicit code. No speculative
   abstractions without a current use case.
2. **Official docs are ground truth.** Discord/discord.js behavior is verified
   against docs/discord.md links before implementation; findings go in
   docs/research.md. No tutorial folklore, no invented endpoints.
3. **Local-first, self-hosted.** One process, SQLite + local media.
   No SaaS, no shared DB, no Redis/Kafka/Postgres/ES/K8s without demonstrated need.
4. **Least privilege.** Minimal intents/permissions; every addition justified
   in the phase spec. Never `Administrator` for sniping.
5. **Privacy by design.** Archive is sensitive. No content in logs; channel
   visibility enforced at read time (docs/security.md is binding).
6. **Explicit boundaries.** discord.js stops at adapters; domain is pure.
   Handlers thin; commands modular; failures isolated per event/interaction.
7. **Durable persistence.** The DB is the archive; cache is sweepable.
   Migrations backwards-compatible where practical; retention honored.
8. **Testability + observability.** Snapshot/revision/auth logic has tests;
   structured logs with context; fail fast on bad config.
9. **Dependency minimalism.** stdlib → installed → new, each justified.
10. **Docs as implementation.** Behavior changes update docs + spec/plan
    artifacts in the same diff.
