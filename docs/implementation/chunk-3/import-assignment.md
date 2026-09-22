# Import assignment policy foundation

Owner decision, 2026-09-21: **Allow another import after deletion.**

This pure policy library models the local assignment history. It is not imported by production entrypoints and does not enable uploads. D1 deletion epochs were accepted separately in commit 7545050.

## Contract

A guest/workout has one current head and immutable historical assignment items. A matching authenticated deletion proof releases that head; a deliberate later choice creates a new generation, possibly targeting a different account. Old import callbacks cannot reverse the tombstone or change the successor. Historical exact retries return the original item. Retry identity includes guest, decision and workout; claim/item IDs remain globally unique within the state.

Keep-local is terminal. Deletion evidence applies inclusively through deletedThroughEpoch for its target account. Stronger later evidence advances that watermark without duplicating the original tombstone. Authentic old evidence remains usable; it does not need a freshness deadline.

Inputs from storage must already be validated by the adapter. Rehydrated state is cloned before a transition; the module preserves caller-owned mutability and returns detached, deeply frozen results. States produced by this module may share immutable objects. Snapshot normalization enforces canonical bounded JSON, not the eventual workout privacy schema or hash correctness. Proof shape validation is not authentication.

## Verification and review

23 policy tests pass, including repeated delete/reimport generations, late callbacks, stronger evidence, keep-local, retry conflicts and guest isolation, detached rehydrated state, and bounded shared-reference snapshot expansion. The combined policy and ledger candidate passes the full repository suite, 380/380, zero skipped (chunk-3-ledger-full-tests.txt). Ledger acceptance is recorded separately.

The combined candidate builds successfully: 79 server modules, 123.62 kB server bundle /40.02 kB gzip; offline report 299 files/167.9 MiB. The Sites wrapper fails before building because its local npm-cli path is absent; the existing project build script succeeds. Generated build files are not included in this source commit.

Claude's initial HOLD findings were corrected with regression coverage. Its full corrected source review passed (chunk-3-policy-final-opus-review.json), with one low-severity nested Proxy exception concern. Descriptor snapshots and typed error normalization address that concern; the focused final correction review passed (chunk-3-policy-validation-closure.json). GPT-OSS passed the corrected policy before those last validation-only refinements (chunk-3-policy-final-local-review.md). These are source reviews; reviewers did not execute the tests. Conductor test runs are the execution evidence.

The owner explicitly authorized continuing confirmed corrections and focused reviews without pausing solely on review count. Prior HOLD records and adjudications remain historical evidence. The current invariant is account-wide deletion watermark dominance for status/outcomes, with exact claim/generation matching required to release a head.

## Remaining integration

Persist the assignment ledger transactionally in Dexie with real concurrency tests. Wire authenticated epoch and deletion routes, import validation and atomic epoch-fenced writes, stale-response guards, ordinary outbox fencing and remote-reminder reconciliation. Finish privacy and installed-device acceptance. Production import flags remain disabled. This foundation does not claim complete Chunk 3 or user-facing reimport behavior. No deployment was performed.
