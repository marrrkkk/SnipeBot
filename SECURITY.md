# Security Policy

SnipeBot archives other people's Discord messages. The archive is
sensitive by design — please handle vulnerabilities accordingly.

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a vulnerability

**Do not open a public issue for security reports.** Use GitHub's
[private vulnerability reporting](../../security/advisories/new) on this
repository (Security tab → Report a vulnerability).

Include: affected version/commit, what an attacker can do, and steps to
reproduce with ids only (no message content, no tokens). We will confirm
receipt, investigate, and coordinate a fix and disclosure timeline with
you.

## Background

Threat model, authorization rules, token hygiene, and retention semantics
that reporters and reviewers should know:

- [docs/security.md](docs/security.md) (binding authorization model)
- [docs/deployment.md](docs/deployment.md) (backups, file permissions)
