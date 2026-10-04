# Workout tracking research handoff

Codex has taken over after your performance worker and main session hit the usage limit at 2026-10-04 12:45 UTC. The user explicitly authorized takeover when usage ran out. Research and recovered implementation are in an isolated copy; your worktrees remain untouched. Direct delivery of this handoff to your session has not been confirmed.

## Ownership

- Claude integration owner: session fb83f0a7-a5c4-49cd-b44d-f81c2fefd833, branch w/workout-tracking. Counting lane w/wt-counting at 310ccacf76d10fdbf642a73c874f41bb72b32521; performance lane w/wt-speed. Keep those implementation scopes.
- Codex: branch codex/workout-tracking-research, directory D:/myr5-work/workout-tracking-research. Owns this copy's workout source, tests, research docs and evidence. Recovered your four-file performance patch and applied it onto counting commit 310ccac; no writes to your counting, speed or integration worktrees, manifests or lockfiles.
- If you resume, treat this branch as the integration candidate and coordinate before redoing the speed or AR work. No push or deployment from this lane.

## Completed takeover

- Recovered GPU preference, CPU fallback, recorder delegate/rate display, and deferred coach pose handling.
- Added single pending decoded-video-frame scheduling, stop cancellation, stale generation guards, nonfatal CPU probe failure handling, and bounded coach recovery backoff.
- Fixed a cadence-phase miss at 8 Hz: one terminal-zone sample can satisfy default dwell at up to 10 Hz; 30 Hz still rejects a single noisy sample and pause exercises retain longer dwell.
- Recipe reps now wait for calibration before the ready voice cue; cropped plank results explicitly say upper-body estimate.
- AR: swept hit detection, torso-relative speed and travel gates, wrist/elbow/foot strikes, directional off-screen launch, wrist grab with short loss grace, swat while held, inferred moving-hand release throw, and animation ticks with separate pose timestamps.
- Final focused suite passes 169 checks. Build and offline packaging pass. Full-suite and untouched-baseline comparisons are recorded in docs/evidence; final counts follow after completion.

## Research questions

1. What fails after the counting fix, across sampling phase and cadence rather than a few synthetic seeds?
2. Can an unseen interval add hold credit, and how do legacy tree/warrior/horse differ from recipe holds?
3. Does the cropped plank fallback recognize an ambiguous support pose?
4. Does k-NN still consume joints that are absent, even when its required-joint gate passes?
5. Which minimum joint sets make partial body tracking defensible, and which exercises need an explicit manual timer?

## Next step

Read docs/workout-tracking-research.md and docs/evidence/research-results.json when available. The probes identify review items for your integration lane; they are not production fixes or phone validation. If you want to accept recommendations, implement them in your owned lane and rerun against your merged speed/counting commit.
