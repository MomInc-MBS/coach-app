# Foundation release readiness — 2026-09-21

Current local integration: chunks 3 and 4 implemented and tested; chunk 5 lifecycle corrections implemented, production catalog work remains; chunk 6 has local privacy/export and migration evidence, with release acceptance still open. No deployment or live import enablement occurred.

## Account and guest history

Explicit selected-history choices are persisted transactionally. Authenticated account reads supply deletion evidence; covered old claims are released without rewriting guest workouts or old import identities. A new choice targets the new account epoch. Crashed attempts consume a persistent retry budget; expired exhausted attempts appear paused and require explicit resume. Default browser manifest and server configuration keep uploads disabled.

Primary and reminder-service writes are owner/epoch fenced. Account deletion commits its primary tombstone and remote reconciliation marker together. Remote failure remains pending; already-dispatched messages cannot be recalled. Ordinary workouts and CoachArmy callbacks retain producer epochs. Deployment must update external CoachArmy producers to send captured epochs; their adoption has not been verified.

Export includes account-owned workout/import/trust records, deletion receipts, entitlement and CoachArmy records. Claim credentials are excluded. Anonymous Gala runs and login identities have separate handling explained by the privacy page. Local deletion, account deletion and optional pack-byte removal are separate operations.

## Offline shell and updates

Build enforces an 8 MiB core cache budget; current build is 143 files, 7.7 MiB. Optional assets use a separate bounded cache, and pack bytes retain their existing storage owner. Installation failure discards only the incomplete candidate. Runtime integrity failure returns 503 rather than accepting unverified code. One prior complete shell is retained.

Updates use native service-worker waiting: users close all controlled Coach windows and reopen. There is no forced activation. This avoids expiring idle-reservation and newly-opened-window races. Real headless Edge cold-offline reopening preserves completed guest history and does not show recovery failure.

## Pack lifecycle and remaining production scope

Exact saved signed metadata is verified offline against application trust. Restore and activation hold the workout owner's idle lease. Account transitions and revocation invalidate asynchronous work; abandoned runtimes are disposed. HTTP 200 replaces partial bytes; 206 ranges and complete cached hashes are checked. Failed newer candidates do not prevent restoring the last good material.

This does not complete the production catalog contract. Remaining work includes sticky offline grant storage, signed catalog promotion/rollback, exact dependency reference counting, license/attribution aggregation, signing-key rotation/recovery, and measured hosted Range behavior. All pack adapters now use account.entitlements.ownedPacks scoped to the authenticated response owner; achievements and global-owner fallbacks grant no pack bytes. Production trust anchors remain null and fail closed. No production key was generated.

## Validation evidence

After the canonical-grant correction: 681/681 integrated Node tests passed, including actual D1 migration/API tests and Edge pack/material browser tests. Build passed. Built offline cold-reopening browser test passed. Logs are in the conductor's review-packets/results/final-canonical-integrated-tests.txt, final-canonical-build.txt and final-canonical-offline-browser.txt.

Dependency audit remains 12 pre-existing advisories (8 high, 4 moderate). No automatic breaking audit fixes were applied. Release needs an explicit dependency remediation assessment; a passing functional suite is not a security clearance.

## Rollout and rollback

1. Back up configured databases and record deployed worker/build identifiers.
2. Apply additive migrations 0019 and 0020 before deploying epoch-aware workers, and deploy the compatible remote reminder protocol.
3. Keep imports disabled while checking canonical account identity, old-epoch write rejection, delete/retry, queued remote reconciliation and external producer epochs.
4. Verify the same build and disabled flags at all canonical origins. Run physical desktop/mobile online/offline, quota/interruption, update waiting and account-transition checks.
5. Enable uploads or publish signed packs only under the separately authorized release configuration after their acceptance evidence is complete.

Rollback must preserve epoch/deletion receipts and reject obsolete writes. Do not revert to a worker that trusts guest imports for rewards or accepts unfenced writes. Prefer disabling the affected feature while retaining additive schema and the compatible protocol. Hosted convergence, database backup/restore rehearsal and physical-device evidence have not been performed in this local run.
