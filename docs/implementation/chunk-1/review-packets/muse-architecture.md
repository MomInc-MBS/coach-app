# Muse high-level architecture packet

Role: independent principal-level thinker. Do not write code. Return `PASS` or `HOLD`, then the three highest-value observations only. Distinguish a current defect from later integration work.

MyR5 is an existing vanilla-ESM offline-capable coach with a full-stack Sites deployment, D1 identity/account state, a separate reminder Worker, and an established Cache Storage `PackLifecycle`. Chunk 1 intentionally adds only a dormant device-local repository; UI integration is Chunk 2 and account synchronization is Chunk 3.

Chunk 1 boundary:

- Dexie stores intake, settings, workouts, append-only workout events, and a completion outbox.
- Zod validates inputs and every persisted row on read/write.
- Every workout has immutable client ID plus explicit guest/account owner and device scope.
- Complete is one transaction across workout, event, and outbox.
- Duplicate completion is idempotent and validates the existing outbox.
- Export, deletion, recovery, and legacy import are owner scoped.
- Legacy migration markers encode the owner/source tuple without delimiter collisions.
- Pack bytes and pack metadata remain entirely outside Dexie.
- No UI, auth flow, server API, service worker, copy, art, lore, or production deployment changed.

Questions:

1. Is this boundary the right foundation for anonymous offline workouts followed by optional account import?
2. Which invariant must Chunk 2 preserve when adapting the current server-first workout facade?
3. Which invariant must Chunk 3 enforce to prevent cross-account queue upload?
4. Does any Chunk 1 decision prematurely constrain the PWA update or feature-pack architecture?
5. What single failure mode deserves the conductor's attention before continuing?

Evidence summary: focused 17/17, full 322/322, build pass, GPT-OSS reviewed, independent attack pass, Grok final `PASS` on the preceding artifact, and Astra's confirmed marker-collision finding corrected with a regression. No model should infer production readiness for anonymous UI or sync from this storage-only chunk.
