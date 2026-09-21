# Astra final gate

Role: non-authoring exact-artifact final gate. Astra may not edit accepted bytes.

Base: `a2d524bc84d688a81f094ba3bd8f0f98ce46b3f0`

## Attempt 1 — HOLD

Astra verified the supplied hashes and found one concrete owner-isolation defect in `importLegacyLocalState()`. The marker key used colon-delimited concatenation, allowing distinct tuples to collide: owner `account:a`, source `b:c`; and owner `account:a:b`, source `c`.

## Bounded correction

The marker now encodes `[ownerId, sourceKey]` as a JSON tuple. A regression imports both collision candidates, verifies separate owner settings, and confirms a repeated first import remains idempotent.

Corrected artifacts:

- `local-coach/repository.mjs`: `d1b6abfc2fdc782ac41bf570d46fdc764eddd2e7f6db11a06e1b65e3e35f24f6`
- `tests/local-coach-repository.test.mjs`: `7dc6a7371fb310104b8b9e4f9f28c8c0e8938dba67209a503b4458f51fd08b5f`
- `package.json`: `a304931cdd973af979cc5656b256a6148ec9504101d8d45d31637e5efa979747`
- `package-lock.json`: `80c9ab539419652cbbcbb2aef237ac83e64d3039adfee576ee4c5d556e5dd5dc`

Evidence: focused 17/17; isolated known-flake file 4/4 after one full-run timing failure; final full regression 322/322; canonical Sites build pass; diff check pass.

## Attempt 2 — PASS

Astra verified the corrected hashes without changing the reviewed product/test/package bytes and returned `PASS`. This closes the two-attempt final-gate window.
