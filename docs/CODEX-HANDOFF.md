# Workout lane handoff to R21 Codex integration

Updated 2026-10-04. Delivery/receipt by the other session is not yet confirmed; this runtime has no cross-thread messaging API.

## Ownership and integration

- Workout owner: `codex/workout-tracking-research`, `D:/myr5-work/workout-tracking-research`, implementation commit `3a092abc32c71d46d6aaa1ec068db3e479ebd82b`.
- Other app integration observed: `codex/r21-takeover-integration`, `D:/myr5-work/r21-codex-integration`, HEAD `49bf69bb8baa7052ab1ef0046db61bd335630296`.
- Keep the workout implementation in its own worktree. The R21 agent owns integration, release/build manifests, generated assets, portal/creature/UI changes and broad app-test repairs. No workout-lane writes to those files or that worktree.
- R21 had active edits to `release-build.mjs`, runtime outputs, creature/War Room code and app tests when checked. Do not carry generated workout build outputs into R21. Rebuild after source integration.
- `git merge-tree --write-tree codex/r21-takeover-integration codex/workout-tracking-research` succeeded with no conflicts at the heads above, resulting tree `775fdf101f0e390e0408e45a97f94cbd1673ada8`. This checks committed trees only; recheck after either head changes and after committing the R21 working edits.
- No merge, push or deployment was performed. The shared base is R20 `5bc228f`. Merge the branch once to include Claude's counting commit `310ccac` plus the Codex takeover commit. Cherry-picking only `3a092ab` would omit its counting dependency. Do not also apply the frozen speed patch: it is already included.

## Workout source scope

Claude counting changes: `app.mjs`, `camera-workout.css`, `camera-workout.mjs`, `exercise-demo.mjs`, `exercise-library.mjs`, `movement-engine.mjs`, `movement-rules.mjs`, `workout-import-codec.mjs`, workout audit/research reports and counting/overlay tests.

Codex takeover changes: `app.mjs`, `coach-hit.mjs`, `coach-overlay.mjs`, `coach.mjs`, `movement-engine.mjs`, `movement-rules.mjs`, `pose-frame.mjs`, `pose-recorder.mjs`, related tests, research script and `docs/` evidence. These source paths do not overlap the R21 committed change list observed at `49bf69b`.

Recovered Claude's GPU preference/CPU fallback and inference-rate display. Added decoded-frame scheduling and cancellation, low-rate rep debounce fix, calibration-aware cues, explicit upper-body estimate for cropped plank, and swept limb strikes/grab/release/off-screen coach animation. See `workout-tracking-research.md` for evidence and remaining accuracy questions.

## Validation and limits

- Final focused tests: 169 passed, zero failed. Final camera/counting/coach browser tests: 4 passed, zero failed. Build/offline packaging passed.
- Mocked browser probes verify GPU-to-CPU fallback and cancellation while initialization is pending. They do not measure actual phone inference speed.
- Broad suite has app-test failures and is not a release gate pass. A targeted untouched counting-baseline run reproduced 7 failures among 11 selected checks; other failures need the integration owner's solo reruns and comparison. Evidence logs are in `docs/evidence/` (ignored local logs).
- Actual phone testing remains required. Very low sampling rates miss unobserved rep endpoints. Cropped upper-body plank can be ambiguous; lower-body holds still need visible knees. Hold credit/grace policies remain inconsistent and documented, rather than silently changed.

Please acknowledge this handoff in a shared coordination file/channel before simultaneous edits to any workout source. Until then, this lane leaves R21 integration files and its active worktree untouched.
