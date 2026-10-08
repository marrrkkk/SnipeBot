# Cross-artifact analysis (bootstrap, 2026-10-08)

## Coverage

- Product boundaries (000) → roadmap phases 4–6 (recovery), 15 (attribution
  labeled best-effort), 16 (backfill limits): consistent, no phase promises
  what 000 declares impossible.
- Constitution least-privilege ↔ 001 intents, security.md auth model ↔
  Phase 13 slot, research R6 ↔ Phase 15 scope: aligned.
- Data-model uncertainties (stickers, V2 columns, voice fields) are carried
  explicitly into 002/003 tasks rather than silently assumed.

## Conflicts / gaps

1. `scripts/migrate.ts` requires `./drizzle` migrations which don't exist
   until Phase 3 — bootstrap `db:migrate` fails by design. Documented in
   development.md ("Phase 3+"). No code change; acceptable bootstrap gap.
2. `LocalMediaStorage` is implemented but unwired (no downloader until
   Phase 7) — intentional; interface stability is the deliverable.
3. Live Discord login not verified in this environment (no token).
   Covered by 001 acceptance checklist as the manual gate.
4. Spec Kit slash commands don't exist in this harness — AGENTS.md maps the
   conceptual sequence to direct file work. Revisit if harness gains them.

## Implementation order

000 (done) → 001 hardening → 002 ingestion → 003 archive → 004+ per roadmap.
No phase can usefully start before its dependency's `tasks.md` is green.

## Closure (Phase 20, v1.0.0)

All four bootstrap gaps closed: migrations exist and run (boot chain +
manual), media storage wired behind its worker, live login/deploy/migrate
verified against real Discord, and the harness mapping held for all 20
phases. No open cross-artifact conflicts remain; carried items live in
`specs/020-release/triage.md`.
