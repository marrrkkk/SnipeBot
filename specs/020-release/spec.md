# 020 — Final integration, documentation, and release readiness

## Goal

Close the project loop honestly: every deferred item gets a verdict
(fixed now, carried as future work, or dropped with reasons), the docs
describe the code as built, and the release is cut and verifiable.

## Requirements

- Backlog harvest: grep `TODO|FIXME|XXX|HACK|ponytail:|Phase \d|future|
carried|deferred` across `src/`, `specs/`, `docs/`; every hit triaged
  in `specs/020-release/triage.md` as FIXED (done this phase), CARRIED
  (named future work with a home), or DROPPED (with reasons).
- Spec cross-check: `specs/ANALYSIS.md` conflicts re-verified resolved;
  `docs/roadmap.md` phase statuses truthful; per-phase T7 acceptance
  items either live-verified or explicitly human-gated.
- `npm audit` re-run; determinate outcome (fix green or defer recorded).
- Live verification where credentials allow: login, guild deploy (schema
  unchanged since last deploy counts as verified — redeploy only if the
  command surface changed), migrate idempotence, healthcheck, boot.
- `CHANGELOG.md` (concise, user-facing) + version `1.0.0`.
  Release cut = version + changelog + tag _iff_ version control exists;
  otherwise the exact commands for the human, no improvisation.
- No new features. No behavior change except triaged fixes. Strict TS,
  full gate green at the end.

## Constraints

- Do not gold-plate: converge means finishing, not extending.
- Every claim in README/docs re-verified against the code or labeled.
- The T7 human-gated items stay human-gated; agent-verifiable items get
  verified, not assumed.
