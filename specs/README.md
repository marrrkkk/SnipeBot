# Spec of specs

Phases are dependency-ordered; each directory is self-contained
(spec.md, plan.md, tasks.md, checklists/ where required). Work them in
numeric order; do not skip ahead past unmet dependencies.

| Phase                                | Dir                  | Depends on  |
| ------------------------------------ | -------------------- | ----------- |
| Product vision + boundaries          | specs/000-product    | —           |
| 1 connection + command infra         | specs/001-connection | 000         |
| 2 ingestion + snapshot normalization | specs/002-ingestion  | 001         |
| 3 persistent archive                 | specs/003-archive    | 002         |
| 4–20 (see docs/roadmap.md)           | future specs/*       | prior phase |

Constitution: `.specify/memory/constitution.md` (applies to all phases).
Cross-artifact analysis: `specs/ANALYSIS.md`.
