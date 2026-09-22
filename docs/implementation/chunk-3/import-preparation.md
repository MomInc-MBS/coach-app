# Explicit local history decisions

The owner-scoped repository exposes prepareImportDecision(choice) and commitImportDecision(token). A choice contains a stable decisionId, import or keep_local kind, and up to 100 unique {clientWorkoutId, claimId, itemId} selections. Import choices additionally capture the authenticated account and its data epoch. No call site uploads or selects history automatically.

Preparation reads all completed, owner/device-matching sources and current assignment heads in one read transaction. After that transaction closes, the shared version-1 codec projects minimal snapshots and computes fingerprints and account/epoch-bound idempotency keys. The returned frozen token is process-local and held in a private WeakMap; callers cannot replace the source revisions or computed bytes.

Commit rechecks the entire selection, source revisions and head revisions in one write transaction. The immutable decision header, all items and all assignment heads commit together. A competing head or changed source aborts the whole choice. Exact historical retries return the original items without reading missing sources or recomputing hashes; membership, identities, kind, account and epoch cannot change under an existing decision ID.

Keep-local choices need no crypto and retain no target, snapshot or digest. They are terminal. A matching confirmed account-deletion proof releases an import head while retaining its historical item. A new explicit decision can then target the same account at its newer epoch or another account. Old callbacks and proof retries cannot replace that new head.

Legacy low-level claims remain readable. Their optional digest fields alone must never make them eligible for a future drain: drain eligibility also requires a complete version-1 prepared decision and fresh authenticated account/epoch checks. This slice contains no drain, consent UI or network request.

Validation includes real Dexie/fake-indexeddb atomic rollback, independent connection races, exact replay after reopening/source removal, crypto outside transactions, unchanged source/outbox rows, and integration through openLocalCoach export and owner deletion. Browser/device evidence remains separate.
