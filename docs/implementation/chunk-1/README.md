# Chunk 1 — Durable local coach domain

Status: implementation and local regression gates complete; Grok's bounded adversarial retest passed, Astra's first final gate found one migration-marker collision that was corrected, and Astra's second and final exact-artifact verdict is `PASS`. Opus/Muse hand-delivery packets are ready for the owner's supplemental review.

Base commit: `a2d524bc84d688a81f094ba3bd8f0f98ce46b3f0`

## Scope and decisions

This chunk adds a browser-local repository boundary without changing the active account flow, server APIs, service worker, UI, copy, art, lore, or pack lifecycle. Chunk 2 will integrate anonymous UI flows; Chunk 3 will add account reconciliation.

The repository owns only intake, settings, workout sessions, workout events, history, and the completion outbox. `PackLifecycle` continues to own pack metadata, and Cache Storage continues to own pack bytes.

Dependencies:

- `dexie@4.4.6`, Apache-2.0: IndexedDB transactions and schema ownership.
- `zod@4.6.5`, MIT: validation of inputs and every stored record read/write boundary.
- `fake-indexeddb@6.2.5`, Apache-2.0, development only: deterministic IndexedDB regression tests.

The locked install still reports the pre-existing unresolved advisory total: 4 moderate and 8 high. This chunk did not run an automatic or breaking audit fix.

## Repository contract

`openLocalCoach()` creates schema version 1 and returns a stable device ID, a stable `guest:<uuid>` owner ID, and `forOwner(ownerId)` scopes. Account scopes must begin with `account:`. Every workout includes its owner ID, device ID, immutable client workout ID, timestamps, status, goal, rest setting, progress, and metadata.

Owner scopes provide validated operations for:

- intake and settings save/read;
- workout start, update, pause, resume, completion, recovery, and history;
- append-only workout events;
- pending/sent/rejected completion outbox state;
- local export and owner-only deletion;
- explicit, idempotent legacy import.

Workout completion updates history, appends the completion event, and creates the outbox row in one IndexedDB transaction. A repeated completion returns the existing completed workout and outbox instead of creating another record. Storage quota, migration, validation, interruption, and generic storage failures produce typed recoverable errors rather than success.

Guest deletion preserves the stable guest/device identity while deleting that owner's intake, settings, workouts, events, outbox records, and migration markers. It does not inspect or delete pack storage.

## Verification

- Focused repository suite: 17/17 pass.
- Full repository suite: 322/322 pass. The pre-existing pack-browser timing test failed once in the first post-correction run, then passed its isolated 4/4 suite and the complete clean rerun.
- Canonical Sites build: pass; 79 server modules transformed, `dist/server/index.js` 123.62 kB (40.02 kB gzip), existing offline report 298 files / 167.3 MiB.
- Diff check: pass with `core.whitespace=cr-at-eol`, matching the repository's CRLF package manifests.

Focused tests cover database reopen, simultaneous-tab identity initialization, validated intake/settings persistence, workout lifecycle and outbox idempotency, owner isolation, interrupted-session recovery, export/deletion, explicit legacy migration, forced multi-table rollback, error classification, and malformed persisted rows.

This module is not imported by the shell yet, so the measured initial-transfer and installed-cache byte deltas are both zero for Chunk 1. Web Vitals and device UI behavior are unchanged. Real installed-device anonymous-flow evidence belongs to Chunk 2, when this repository becomes reachable from the application.

## Judgment disposition

GPT-OSS returned `REVISE`. Two major findings were disproved:

- It interpreted Dexie's `&ownerId,deviceId,updatedAt` schema as a compound primary key. In Dexie syntax the ampersand marks `ownerId` as the unique primary key; the executed reopen test proves `get(ownerId)` reads both intake and settings.
- It claimed identity initialization lacked a transaction, although `ensureIdentity()` already performs both reads and conditional writes inside `db.transaction('rw', db.meta, ...)`. A simultaneous-open test was added and passes.

Two low-severity clarity findings were accepted: the client workout ID/primary-key equivalence is now documented in code, and the legacy payload field is named `legacyId` so it cannot be confused with the outbox record ID. A 128 KiB JSON-object boundary and a malformed-row regression were also added during the bounded correction pass.

The independent read-only adversarial pass returned `PASS`. It additionally exercised concurrent event sequencing and closed-handle/reopen behavior, and found no pack, UI, auth, server, or Cache Storage coupling.

Grok's first source-free attack returned `HOLD` with no reproduced defect and five missing proofs. Those exact proofs were added without changing product source: concurrent two-handle completion; corrupted outbox validation during duplicate completion; oversized JSON rejection on write and read; quota failure during completion with three-store rollback; and the complete account/guest recovery-export-delete matrix. The focused suite then passed 16/16 and the clean full rerun passed 321/321. Grok's second and final attempt returned `PASS` with no remaining required test for those reviewed hashes.

Astra's first exact-artifact final gate returned `HOLD` with one confirmed defect: the legacy migration marker used delimiter concatenation, so owner/source tuples such as `account:a` + `b:c` and `account:a:b` + `c` collided. The bounded correction now encodes the marker payload as a JSON tuple, and a two-owner regression proves both imports remain independent and idempotent. The corrected focused suite passes 17/17 and the complete regression suite passes 322/322.

Astra verified the corrected hashes without modifying them and returned `PASS` on its second and final permitted attempt.

## Artifact hashes before commit

- `package.json`: `a304931cdd973af979cc5656b256a6148ec9504101d8d45d31637e5efa979747`
- `package-lock.json`: `80c9ab539419652cbbcbb2aef237ac83e64d3039adfee576ee4c5d556e5dd5dc`
- `local-coach/repository.mjs`: `d1b6abfc2fdc782ac41bf570d46fdc764eddd2e7f6db11a06e1b65e3e35f24f6`
- `tests/local-coach-repository.test.mjs`: `7dc6a7371fb310104b8b9e4f9f28c8c0e8938dba67209a503b4458f51fd08b5f`

## Rollback

Revert the single Chunk 1 commit. No D1 migration, deployment, service-worker change, or production browser database has occurred. Because the repository is not yet imported by the shell, rollback removes only the unused source boundary, its tests/evidence, and the three dependency entries.
