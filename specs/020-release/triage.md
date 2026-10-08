# 020 — Backlog triage (2026-10-08)

Every deferred/carried item harvested from phase reports and specs.
Verdicts: FIXED (done this phase), CARRIED (named future work with a
home), DROPPED (with reasons — not silent).

## Fixed in 020

- Stale docstrings: domain header ("preliminary"), embed/poll
  "normalized in Phase X" (kept raw by decision), schema "Phase 10
  fills them" (filled). Code now describes itself.

## Carried (future work, with homes)

- Cross-channel `channel:` search syntax → needs per-channel authZ;
  home: a future search phase (auth model extension in `security.md`).
- Search paging → needs server-side state (100-char customId cap);
  home: same future phase as above.
- Components V2 migration → only if a layout demands it (D18 holds);
  home: any UI phase that outgrows embeds.
- Dev-only audit chains (esbuild via drizzle-kit, tinypool via vitest)
  → recheck at dependency upgrades; never ships (`--omit=dev`).
- Reconnect-flood behavior → observe in production; no queue system
  without evidence (D23 holds).
- Global retention-row UI (SQL-only today) → trivial `/settings`
  addition when an operator asks for it.
- All per-phase T7 interactive checklists → their checklists/ files
  ARE the home; they await a human with Discord + Docker.

## Dropped (reasons recorded)

- N+1 scans in snipe/edits (≤200 rows, local SQLite, tens of ms):
  bounded and measured — not a problem to solve.
- Shell first-wins gaps: unreachable via gateway ordering.
- Poll `undefined`-vs-`null`: defensive narrowing covers all shapes.
- `findById` JS-side attachment filter: O(history), local, measured fine.
- Vote-race extra revision: truthful append-only history, harmless.
- Cache staleness after downtime: inherent, documented tradeoff (008).
- Media retry log spam: bounded (3 attempts then silent skip).
- Coalescing tuning: already parameterized at call sites.
- stubArchiveService: kept deliberately as the no-DB seam (tested).
- Boot auto-migrate for direct-Node: explicit `db:migrate` is the
  design (Docker does it via CMD); documented.
- Waveform bars, sticker names, Related/Archive menu items: evaluated
  and declined in their phases (no user value / undefined semantics).
- ThreadId-null-uncached, orphan files, empty-content flags: resolved
  by Phases 10, 14, and display handling respectively.

## Resolved earlier (re-verified, not reworked)

- `db:migrate` path, media storage wiring, live login, slash-command
  harness mapping — all closed in their phases; see phase task files.
