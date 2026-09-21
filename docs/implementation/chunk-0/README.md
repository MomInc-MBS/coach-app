# Chunk 0 — Release basis and deployment authority

Status: **PASS — accepted by the independent Opus final gate**

Release basis: `49d25e5cb82deef2a73c731032ad8446ea80b8c1`
Implementation branch: `codex/myr5-foundation-49d25e5`

## Authority and boundaries

The canonical application is the full-stack OpenAI Sites project
`appgprj_6aa19ed33c4081918b379713cb7fa21c`. Its hosting manifest declares
logical D1 binding `DB` and no R2 binding. The separately deployed static
Cloudflare Worker remains a recovery/reference artifact; it is not a valid
replacement for the API, identity, D1, entitlement, or reminder-backed
application.

This chunk changes no product behavior and performs no deployment, remote
migration inspection, secret read, or remote configuration change. All tracked
source at the release basis is protected. Copy, art, lore, HTML, onboarding
domains, coach behavior, and creative material under `pod/`, `creature/`,
`handborne/`, `arcade/`, `icons/`, `models/`, and `voice/` require explicit
approval before modification.

## Fresh exact-source baseline

| Check | Result |
| --- | --- |
| Initial working tree | Clean; `dist` absent |
| Node / npm | `v24.19.0` / `11.17.0` |
| Locked install | 131 packages; 12 advisories (4 moderate, 8 high) |
| Untouched `npm test` | **FAIL**: 301 reported, 300 pass, 1 failed test file; 12,344 ms wall |
| Corrected pack test | PASS: 5/5; 778.126 ms |
| Corrected full `npm test` | PASS: 305/305; 11,359.9383 ms |
| `npm run build` | PASS; 8,108 ms wall |
| Client output | 1,703 files; 292,849,239 bytes |
| Server output | 1 file; 123,623 bytes |
| Service-worker precache | 298 files; 175,466,400 bytes |
| Tracked source basis | 3,353 files; 417,577,987 Git-blob bytes |
| Database history | 18 SQL migrations; 18 journal entries; 27 schema declarations |

The original exact-source baseline failed: 300 of 301 reported tests passed
because `tests/packs/p13h-chunk-delivery.test.mjs` imported an untracked external
pack builder. The subsequent harness-only correction removes that
repository-external dependency and pins the client wire format with an
independent golden vector. Record the corrected suite separately as
“`49d25e5` plus the documented test-harness patch”; it does not retroactively
make the untouched baseline green. External builder/client parity remains
deferred and unverified.

The build reports that `inlineDynamicImports` is deprecated. The locked install
also reports pending install-script review for multiple esbuild versions,
`onnxruntime-node`, `protobufjs`, `sharp`, and `workerd`. No dependency or
configuration remediation is part of the freeze. Dependency advisory
disposition is **recorded and deferred, unresolved**: no vulnerability
applicability assessment occurred, and successful tests/build do not constitute
a clean dependency audit. Production-readiness approval must address the
deferred dependency/security review.

These byte counts are uncompressed files and declared precache bytes. They are
not network transfer, Cache Storage overhead, runtime memory, or mobile
performance measurements. They establish comparison baselines rather than
invented targets.

| Audit group | Client files / bytes | Precache files / bytes |
| --- | ---: | ---: |
| Base-shell candidates | 143 / 7,459,913 | 135 / 7,355,924 |
| Optional/heavy candidates | 1,433 / 264,482,546 | 163 / 168,110,476 |
| Source/build support | 127 / 20,906,780 | 0 / 0 |

The groups are path-based audit candidates, not a verified runtime dependency
graph. The actual precache includes optional/heavy assets despite JavaScript
import boundaries.

The measured cold build completed successfully before evidence generation.
Artifact hashes bind this report to that observed build; matching embedded
source and release identifiers provide additional consistency checks. The
release identifier is a content fingerprint, not a Git revision or build
attestation, and the embedded source set is incomplete as a full provenance
record.

## Deployment and data map

`drizzle.config.ts` points to `db/schema.ts` and `drizzle/`. Migrations cover
profiles, workouts, meals, reminders, deliveries, onboarding, install drafts,
nutrition, identity, release messaging, Gala, scoreboard, breathing/login
history, Coach Army, pack ownership, authenticated runs/events/outbox, goals,
war-room state, and DJ Scratch verification. Migration `0012` creates
`coach_army_bindings`, but `db/schema.ts` does not declare that table; migration
history and source schema are therefore not fully equivalent.

The reminder Worker is `myr5-coach-reminders`, runs `service.mjs` each minute,
and declares its own `DB` binding. The coach contacts it through
`REMINDER_SERVICE_ORIGIN`, authenticates with `REMINDER_SERVICE_TOKEN`, rejects
redirects, and uses a 25-second timeout. Account retrieval currently waits for
reminder and training-status work, so optional service readiness can delay the
account path.

Referenced sensitive/configuration names include:

- `REMINDER_SERVICE_TOKEN`, `COACH_ARMY_COMPLETION_SECRET`,
  `COACH_ARMY_ENTITLEMENT_TOKEN`, `CRON_SECRET`, `RESEND_API_KEY`, and
  `VAPID_PRIVATE_KEY`.
- `CLERK_JWT_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_FRONTEND_URL`, and
  `CLERK_AUTHORIZED_PARTIES`.
- Public/runtime configuration includes `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`,
  `PUBLIC_EXPANSION_SIGNING_JWK`, `COACH_ARMY_ENTITLEMENT_URL`,
  `REMINDER_SERVICE_ORIGIN`, `RELEASE_ORIGIN`, and `RELEASE_EMAIL_FROM`.

Only names were inspected. Local declarations do not prove remote availability,
and no values are recorded in this evidence.

## Routes and API surface

The source provides pose, install, onboarding, sign-in, privacy, recovery,
creature, Handborne, Tub Flight, weapon review, and war-room HTML routes. The
Worker redirects `/` to `/pose.html` and also handles `/health` and
`/repair-coach`.

API families include identity/account, workouts and achievements, meals and
goals, reminders/push/releases, scoreboard, war room, Coach Army runs and
trusted integrations, Gala, export, and authenticated reminder-service internal
routes. The machine-readable source manifest is the authority for exact files;
`server/worker.mjs` and `scheduler/worker.mjs` remain the authority for route
and authorization behavior.

## Service worker and rollback

The build emits content identities into `ASSETS`. Installation reuses matching
old assets or fetches with four concurrent workers; non-HTML assets are
integrity checked. An incomplete installation is deleted. Activation deletes
prior shell and voice cache generations and claims clients. Normal activation
asks open windows for a safe update state; a direct `SKIP_WAITING` message path
also exists. API, auth, recovery, and source routes bypass caching. Pack bytes
remain separately owned by `myr5-pack-assets-v1`.

A failed install leaves the previous active cache available, but successful
activation deletes prior shell caches. There is no guaranteed on-device
rollback after activation. Operational rollback therefore requires preserving
a known-good full Sites artifact and deployment metadata, checking API/schema
compatibility, republishing through the Sites owner, and allowing clients to
install the replacement. The static-only Worker is not a full rollback target,
and D1 migrations must not be blindly reversed.

## Reproduce the evidence

From the exact worktree, with locked dependencies present:

```powershell
npm test
npm run build
node docs/implementation/chunk-0/evidence.mjs --self-test
node docs/implementation/chunk-0/evidence.mjs --self-test
node docs/implementation/chunk-0/evidence.mjs --write
git diff --check
git status --short
```

Generated evidence:

- `source-manifest.json`: immutable Git source paths, sizes, and blob IDs.
- `build-manifest.json`: built client/server files and declared precache assets.
- `inventory.json`: summarized source, hosting, scheduler, migration, environment
  name, and byte evidence.

The build may regenerate tracked runtime bundles and source maps. Those known
build products must be restored to the release-basis bytes before accepting the
Chunk 0 commit; only this evidence directory is intended to remain changed.
