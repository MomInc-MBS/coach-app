# Muse exact-artifact code-check packet

Role: final read-only code checker. Review the supplied artifact or diff against these hashes. Do not edit. Return `PASS` or `HOLD`; every `HOLD` needs a concrete file/operation/failing scenario.

Base: `a2d524bc84d688a81f094ba3bd8f0f98ce46b3f0`

Artifacts:

- `local-coach/repository.mjs` — SHA-256 `d1b6abfc2fdc782ac41bf570d46fdc764eddd2e7f6db11a06e1b65e3e35f24f6`
- `tests/local-coach-repository.test.mjs` — SHA-256 `7dc6a7371fb310104b8b9e4f9f28c8c0e8938dba67209a503b4458f51fd08b5f`
- `package.json` — SHA-256 `a304931cdd973af979cc5656b256a6148ec9504101d8d45d31637e5efa979747`
- `package-lock.json` — SHA-256 `80c9ab539419652cbbcbb2aef237ac83e64d3039adfee576ee4c5d556e5dd5dc`

Review questions:

1. Does every read path parse persisted rows before returning success?
2. Can any owner read, mutate, recover, export, or delete another owner's row?
3. Can any start or completion transaction partially commit?
4. Can concurrent completion create duplicate events or outbox records?
5. Can malformed or oversized data, quota failure, closed handles, or version failure report success?
6. Does local deletion preserve identity and avoid pack storage?
7. Is legacy import transactional, explicit, and marker-idempotent?
8. Do dependencies and licenses match their single stated jobs?
9. Can any owner/source tuple collide with another legacy migration marker?

Evidence:

- focused tests 17/17;
- complete regression suite 322/322 after an unrelated timing flake passed isolated 4/4;
- canonical Sites build pass;
- Grok final `PASS` after all requested proofs on the preceding hashes; Astra then found the marker collision, which the current hashes correct;
- no runtime import, initial-transfer increase, service-worker change, D1 migration, or deployment.

Reject style preferences and hypothetical future requirements as blockers. Report them separately as optional notes.
