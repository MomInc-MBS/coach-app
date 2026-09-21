# Chunk 1 independent judgment packet

Base: `a2d524bc84d688a81f094ba3bd8f0f98ce46b3f0`

Objective: judge the new device-local coach repository. Do not edit. Return `PASS` or `HOLD`, then only confirmed findings with severity and a concrete failing scenario.

Scope:

- Runtime dependencies: Dexie 4.4.6 (Apache-2.0), Zod 4.6.5 (MIT).
- Test dependency: fake-indexeddb 6.2.5 (Apache-2.0).
- New source: `local-coach/repository.mjs` (provided as the draft).
- New tests use the repository's canonical onboarding fixture.
- No UI, server API, service worker, or pack-lifecycle integration is allowed in this chunk.

Acceptance:

- Stable device and guest identity.
- Zod validation on stored-record read/write boundaries.
- Owner-isolated intake, settings, workout, event, and outbox records.
- Transactional start/update/complete/recovery/export/deletion/explicit legacy migration.
- A stable client workout ID and explicit owner/device scope on every workout.
- Quota, migration, and interrupted-write errors are surfaced; no false success.
- Atomic completion retains local history regardless of later sync state.
- Existing `PackLifecycle` and Cache Storage remain untouched.

Evidence:

- Focused suite: 7/7 pass.
- Full suite: 312/312 pass.
- Canonical Sites build: pass.
- Atomic rollback test forces an event-key collision after workout insertion and verifies the workout insert rolls back.
- Reload test closes and reopens fake IndexedDB and verifies intake, settings, completed history, events, and outbox.

Review especially for transaction gaps, cross-owner reads or deletes, malformed stored rows, guest identity loss, queue loss, false idempotency, schema upgrade hazards, and unbounded data. Ignore formatting preferences.
