# Persistent import assignment ledger

This source slice adds Dexie layout 2 while preserving existing schema-version-1 rows. It does not add an uploader, network request, account route or choice UI. The local repository now includes ledger APIs; the guest workout/outbox flow stays unchanged.

## Stored state and transactions

Four separate stores retain immutable decision headers, immutable per-workout items, append-only outcome/deletion events, and one mutable assignment head per guest/workout. Unique indexes protect item/claim identity, guest/decision/workout retries and guest/workout/generation. Reads sort items by guest/workout/generation, heads by key and events by persisted sequence. Transitions assert immutable prefixes, retained heads and owner scope before writing.

prepareImportAssignment reads a completed same-guest/same-device workout and returns its validated source revision. A trusted future preparer derives the snapshot/digest outside IndexedDB. claimImportAssignment then rechecks the exact source revision inside the same transaction as the decision/item/head writes. This detects staleness; it does not by itself prove the snapshot or fingerprint corresponds to the source. The codec/preparation adapter must supply that binding.

Exact historical retries return the immutable existing claim even after a source edit/removal, without changing history. A changed retry rejects. New choices always require a present, completed source with matching owner, device and id/clientWorkoutId. Account deletion evidence is accepted only from a future authenticated adapter; local shape checks are not authentication.

The policy handles account-wide deletion watermarks and late callbacks. A proof releases only its exact matching head. A released workout can receive a deliberate later claim for another account or newer target epoch. Keep-local stays terminal. Claiming/import outcomes do not alter the source workout, its events or ordinary outbox.

## Export, deletion and upgrade

The v1 export gains an additive importAssignments member; existing members and their row schemas retain their meaning. There is no strict v1 restore consumer in this slice. Explicit owner-local deletion removes that owner's ledger and source data in one transaction; other owners remain. Guest identity metadata is retained. Removing local watermark history does not remove the server's responsibility to enforce retained account epochs on every upload.

Database opens have a configurable 3000ms deadline, including blocked upgrades and slow storage. Deadline failure is typed/recoverable and recommends retry; it is not a rollback claim. An additive upgrade may finish after the deadline, but late completion cannot provision identity or return a repository. A later open can succeed. Dexie 4.4.6 close({disableAutoOpen:true}) is used. No runtime schema-version-1 record rewrite occurs.

## Evidence

12 new persistence tests cover all six v1 stores surviving upgrade, two connections racing a claim, immutable A/deletion/B history and reopen, event/head rollback, source and outbox preservation, stale/incomplete/foreign-device source, owner export/delete isolation, insufficient proof, blocked and slow opens, unordered IDs and generation histories, exact capture keys and typed read failures. Combined policy/repository/Chunk2 regression: 68/68 pass.

Claude correction review PASS (chunk-3-ledger-correction-opus-review.json) and fresh GPT-OSS PASS (chunk-3-ledger-corrected-local-review.md). Pure policy constructors emit only explicit event fields, so the review's hypothetical policy-supplied sequence field is not reachable in this version. The exact policy retry comparison includes kind and target account/epoch.

Full suite including the shared codec: 394/394 pass, zero skipped (chunk-3-ledger-codec-full-tests.txt). Normal project build passes: 79 server modules,123.62 kB/40.02 kB gzip; offline300 files/167.9MiB (chunk-3-ledger-codec-build.txt). Sites wrapper fails on local npm-cli path resolution before building; the existing project build script is used. Generated output is restored before source commits. These tests use fake-indexeddb and do not claim installed-device evidence.

## Remaining

Bind the shared strict codec to preparation, support complete choice batches/attempt leases, wire authenticated epoch/import routes, add disabled drain and stale-response guards, and complete privacy/device acceptance before any live upload enablement. This is partial Chunk 3, with no deployment.
