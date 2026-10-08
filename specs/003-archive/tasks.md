# 003 — Tasks

- [x] T1 Schema + migration generation (review SQL, indexes present)
- [x] T2 Repositories: upsert/find + revision append (integration)
- [x] T3 Service: ingest/recordEdit/recordDelete with transactions
- [x] T4 Handlers: update/delete/bulk wired thin + isolated failures
- [x] T5 Restart durability test (reopen file DB)
- [x] T6 Docs: data-model.md finalized (uncertain fields resolved or carried)

Notes: drizzle sync driver requires `.run()` on writes and `.get()`/`.all()`
on reads (lazy builders otherwise — caught by tests, zero rows, no error);
initial migration squashed twice pre-release (no prod DBs exist).
`Events.MessageBulkDelete` is the delete-bulk event name (gateway
`MESSAGE_DELETE_BULK`). Boot does not auto-migrate (explicit `db:migrate`,
revisit in Phase 18 Docker work).
