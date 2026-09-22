# Account data epoch foundation

Owner decision, 2026-09-21: **Allow another import after deletion.**

This source-only slice implements the primary-D1 prerequisite. It does not change the account routes or enable imports. The pre-development contract was reviewed by Claude and reconciled; the exact helper/migration/test candidate then passed separate GPT-OSS and Opus reviews. Base: 3f946ee38851458e98179e275bceaefd6ce54c17.

## Contract

- Canonical authenticated owner IDs are opaque server IDs, not local `guest:` or `account:` identifiers.
- An untouched account has epoch 1 and no deletion evidence (`deletedThroughEpoch: 0`).
- The deletion helper takes `expectedDataEpoch`, time in integer milliseconds, and the trusted route's already-bound deletion statements.
- Receipt insertion is a constraint-aborting guard in the SAME D1 batch as epoch increment and all primary data deletion. A stale preflight cannot bypass it.
- A retry after deletion returns existing proof without deleting newly created data or advancing again.
- Evidence is inclusive: deleting epoch 1 yields current epoch 2 and deleted-through epoch 1. Read both from a single SQL snapshot.
- Epochs advance only through committed deletion; receipts/tombstones remain. A receipt is an internal consistency record, not a transferable authentication token.
- Runtime schema creation is prohibited. Migration 0018 creates the two tables.

`inspectAccountDataEpoch` is read-only. `readAccountDataEpoch` provisions epoch 1 if needed. `deleteAccountDataAtEpoch` owns the atomic primary-D1 batch. The route must authenticate/target-check the owner, bind every statement to that owner, and exclude epoch/receipt tables from deletion. Do not pass arbitrary user SQL.

## Migration provenance

Drizzle generated 0018 SQL, 0018_snapshot.json and the new journal entry from db/schema.ts. Historical SQL continues through 0017 while snapshots stop at 0010. The generated SQL therefore also proposed pre-existing tables. Those redundant statements were removed from the NEW, unapplied 0018 migration. It contains exactly the two new tables; prior SQL and snapshots were preserved. The generated 0018 snapshot records the current schema for subsequent generation. The tests apply the complete existing migration chain followed by 0018.

## Verification

- 11 new tests pass in Miniflare 4.20260515.0, including 20 concurrent deletes, stale preflight, lost-response retries, forced runtime-constraint rollback, same-account newer data, cross-account isolation, missing/future epochs, and both serial orders of a simulated epoch-guarded write versus deletion.
- Focused regression: 92/92 pass.
- Full repository suite of the combined foundation candidate (including the concurrent 14-test policy slice): 363/363 pass, zero skipped.
- Normal project build (`node scripts/build.mjs`) passes: 79 server modules, 123.62 kB server output / 40.02 kB gzip; offline report 299 files / 167.9 MiB. The Sites wrapper failed on a missing local npm-cli path before building; the unchanged project build script was used successfully.
- Both new foundation libraries are currently unreferenced by production entrypoints. No new initial-runtime import was added; generated build artifacts were restored after verification. No new device-performance claim is made.

Exact review records and full logs are in the conductor's adjacent review-packets/results directory: chunk-3-epoch-local-review.md, chunk-3-epoch-opus-review.json, chunk-3-foundation-full-tests.txt, chunk-3-foundation-direct-build.txt. Fable was unavailable without usage credits; it did not review this candidate.

## Still required before live use

Wire authenticated account GET/DELETE with expected-generation and target assertions. Fence import writes in their transaction and check affected rows (a zero-row write is not success). Provision an untouched account before such guarded writes. Reconcile remote reminders with their own epoch protection; primary D1 cannot make cross-service deletion atomic. Fence old ordinary outbox writes, add local Dexie ledger persistence, and finish import/privacy/device acceptance. Keep production import flags off.

No deployment was performed. This foundation is not full Chunk 3 acceptance. The additive migration can remain unused while callers are developed; do not drop retained epochs or receipts once they become authoritative.
