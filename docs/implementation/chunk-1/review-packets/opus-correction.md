# Opus correction acknowledgment packet

Role: original Chunk 1 author. Review only; do not edit or broaden scope. Return `PASS` or `HOLD` first. A `HOLD` must identify a concrete defect or a false acceptance claim.

Base: `a2d524bc84d688a81f094ba3bd8f0f98ce46b3f0`

Exact artifacts:

- `local-coach/repository.mjs`: `d1b6abfc2fdc782ac41bf570d46fdc764eddd2e7f6db11a06e1b65e3e35f24f6`
- `tests/local-coach-repository.test.mjs`: `7dc6a7371fb310104b8b9e4f9f28c8c0e8938dba67209a503b4458f51fd08b5f`
- `package.json`: `a304931cdd973af979cc5656b256a6148ec9504101d8d45d31637e5efa979747`
- `package-lock.json`: `80c9ab539419652cbbcbb2aef237ac83e64d3039adfee576ee4c5d556e5dd5dc`

Confirmed judgment changes applied after your author pass:

1. Preserve the existing onboarding validator and fixture rather than inventing a replacement shape.
2. Match current workout bounds: goal up to 100000, rest 15–180 seconds, active/elapsed up to 7200 seconds.
3. Validate every stored row on read and write.
4. Keep client workout ID as the immutable local primary key and document that decision.
5. Rename the imported legacy payload field to `legacyId`.
6. Bound JSON objects to 128 KiB.
7. Preserve guest identity during local data deletion.
8. Sort outbox and export records deterministically.
9. Validate an existing outbox row before returning duplicate-completion success.
10. Encode legacy migration-marker owner/source identity as a collision-free JSON tuple rather than delimiter concatenation.

Grok correction evidence added without product-source changes:

- concurrent complete from two Dexie handles produces one completion event and one outbox row;
- corrupted existing outbox makes duplicate complete fail with `invalid-record`;
- oversized JSON fails on both write and persisted-row read;
- outbox quota failure rolls back workout, event, and outbox and returns typed `quota`;
- account recovery/export/deletion cannot touch guest records;
- `VersionError` maps to a recoverable migration error.

Later final-gate correction: Astra demonstrated that `account:a` + `b:c` and `account:a:b` + `c` previously shared a marker. The current hashes include the tuple-encoding fix and an exact two-owner regression.

Evidence: focused 17/17; clean full rerun 322/322; canonical Sites build passed; Grok final `PASS` on the immediately preceding artifacts; no production deployment or runtime integration.

Questions:

1. Did the bounded corrections preserve the intended repository interface and transaction design?
2. Is any acceptance claim false for the exact hashes above?
3. Is any product-source correction still required before the Astra gate?
