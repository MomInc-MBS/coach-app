# Foundation release readiness - 2026-09-22

Current release candidate: chunks 3, 4 and 5 are implemented and integrated; chunk 6 has local privacy/export, migration, dependency and build evidence. Physical Pixel 10 acceptance and backup/restore rehearsal remain external release checks. Live workout import remains disabled.

## Account and guest history

Explicit selected-history choices are persisted transactionally. Authenticated account reads supply deletion evidence; covered old claims are released without rewriting guest workouts or old import identities. A new choice targets the new account epoch. Crashed attempts consume a persistent retry budget; expired exhausted attempts appear paused and require explicit resume. Default browser manifest and server configuration keep uploads disabled.

Primary and reminder-service writes are owner/epoch fenced. Account deletion commits its primary tombstone and remote reconciliation marker together. Remote failure remains pending; already-dispatched messages cannot be recalled. Ordinary workouts and CoachArmy callbacks retain producer epochs. Deployment must update external CoachArmy producers to send captured epochs; their adoption has not been verified.

Export includes account-owned workout/import/trust records, deletion receipts, entitlement and CoachArmy records. Claim credentials are excluded. Anonymous Gala runs and login identities have separate handling explained by the privacy page. Local deletion, account deletion and optional pack-byte removal are separate operations.

## Offline shell and updates

Build enforces an 8 MiB core cache budget; current build is 143 files, 7.7 MiB. Optional assets use a separate bounded cache, and pack bytes retain their existing storage owner. Installation failure discards only the incomplete candidate. Runtime integrity failure returns 503 rather than accepting unverified code. One prior complete shell is retained.

Updates use native service-worker waiting: users close all controlled Coach windows and reopen. There is no forced activation. This avoids expiring idle-reservation and newly-opened-window races. Real headless Edge cold-offline reopening preserves completed guest history and does not show recovery failure.

## Pack lifecycle and production catalog

Exact saved signed metadata is verified offline against application trust. Restore and activation hold the workout owner's idle lease. Account transitions and revocation invalidate asynchronous work; abandoned runtimes are disposed. HTTP 200 replaces partial bytes; 206 ranges and complete cached hashes are checked. Failed newer candidates do not prevent restoring the last good material.

Owner-scoped last-confirmed grants survive offline reopen without crossing identities. Confirmed empty grants revoke access, sign-out deactivates the local owner, and deletion removes only that owner's retained grant. Signed catalogs promote monotonically, preserve a verified last-good catalog, use higher-generation rollback, reference-count exact dependency identities, and aggregate installed-pack licenses in Settings. All pack adapters use `account.entitlements.ownedPacks`; achievements and global-owner fallbacks grant no pack bytes.

The application ships separate public release and recovery Ed25519 trust anchors. The active private signer is held as a GitHub Actions secret; the recovery signer is encrypted with Windows DPAPI outside the repository. The hosted Range probe returned HTTP 200 with the complete 15,080,128-byte object for a one-megabyte range request, so current hosting does not provide usable resume. Catalog validation therefore caps dependencies at 512 KiB and complete packs at 2 MiB; pack publication remains blocked until the Pixel 10 accepts whole-file retry behavior.

## Validation evidence

The 2026-09-22 candidate passed 690/690 integrated Node tests, including actual D1 migration/API tests, grant retention/revocation, signed catalog rotation/rollback, dependency/license handling and Edge pack/material browser tests. Production build passed at 143 offline files and 7.7 MiB. Prior built offline cold-reopening browser evidence remains valid.

Dependency audit remains 12 pre-existing advisories (8 high, 4 moderate). No automatic breaking audit fixes were applied. The scoped assessment and tested update sequence are recorded in `docs/implementation/chunk-6/dependency-assessment.md`; a passing functional suite is not a security clearance.

## Rollout and rollback

1. Back up configured databases and record deployed worker/build identifiers.
2. Apply additive migrations 0019 and 0020 before deploying epoch-aware workers, and deploy the compatible remote reminder protocol.
3. Keep imports disabled while checking canonical account identity, old-epoch write rejection, delete/retry, queued remote reconciliation and external producer epochs.
4. Verify the same build and disabled flags at all canonical origins. Run physical desktop/mobile online/offline, quota/interruption, update waiting and account-transition checks.
5. Enable uploads or publish signed packs only under the separately authorized release configuration after their acceptance evidence is complete.

Rollback must preserve epoch/deletion receipts and reject obsolete writes. Do not revert to a worker that trusts guest imports for rewards or accepts unfenced writes. Prefer disabling the affected feature while retaining additive schema and the compatible protocol. Hosted convergence, database backup/restore rehearsal and physical-device evidence have not been performed in this local run.
