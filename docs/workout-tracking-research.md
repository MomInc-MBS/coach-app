# Workout tracking research and takeover

The app already contains rep counters. The failures are primarily whether enough useful pose samples reach the counters, whether those samples enter both movement zones, and whether the required joints remain visible. The practical approach is to preserve the current detector, improve scheduling and exercise-specific visibility handling, and measure real phone recordings before considering a replacement model.

This investigation copied Claude's committed counting changes into an isolated worktree, ran new synthetic probes, reviewed primary technical sources, and then took over the unfinished performance and AR work after Claude hit its usage limit. Nothing has been pushed or deployed.

## Code and ownership evidence

- Copy: `D:/myr5-work/workout-tracking-research`, branch `codex/workout-tracking-research`.
- Copied commit: `310ccacf76d10fdbf642a73c874f41bb72b32521`, Claude's counting lane. Its parent includes the original audit and external research at `9298fd7`.
- Existing reports: `plan/reports/workout-tracking-audit.md` and `plan/reports/workout-tracking-research.md`. Claude's AR audit remains at `D:/myr5-work/workout-tracking/plan/reports/ar-coach-interactions-audit.md`.
- Observed handoff: Claude session `fb83f0a7-a5c4-49cd-b44d-f81c2fefd833` recorded the performance worker's rate-limit failure at 2026-10-04 12:45:07 UTC. The user explicitly authorized takeover when usage ran out.
- Recovered source patch: `docs/evidence/claude-speed.patch`; SHA256 `4d1dda5130d4b12fc8c07d27d3b8d7cee68bbfd9ba5b0553e66fc6fc004ab3c2`. Imported only app, overlay, recorder and the overlay cap test; excluded regenerated bundles and Claude's release receipt.
- Claude's original integration, counting and performance worktrees were read but not edited. Initial handoff delivery was not confirmed; the takeover avoids sharing a writable worktree.

## How the tracker works

`app.mjs` opens the camera, loads pinned MediaPipe Tasks Vision 0.10.14 and the Lite pose model, and supplies image and world landmarks to `MovementSession.update`. The camera requests 640 by 480 video, at up to 30 camera frames per second. Camera frame rate is separate from successful pose update rate. The old app used CPU inference on the main thread; the recovered performance change prefers GPU and can recreate the tracker on CPU.

`movement-engine.mjs:31` restores image aspect ratio, applies per-joint visibility and image-bound checks, and discards landmarks after index 26. Ankles and feet therefore cannot contribute to movement rules, although the AR overlay receives the full pose. Normalized image z is deliberately zeroed for 2D features. Selected recipe angles can use world landmarks, and boxing can use world-relative hand motion.

`movement-engine.mjs:112` counts completed down-to-up cycles with hysteresis, dwell, minimum duration and a refractory interval. The counting patch credits half the previous sample interval toward dwell on first entering a zone. That approximation helps slow streams; it does not recover movement that happened entirely between samples.

`movement-engine.mjs:273` routes squat and push-up to legacy rep logic, tree/warrior/horse to legacy hold logic, and other catalog movements to recipe rules. `pose-samples.mjs` exports an empty map in the copied code, so the optional k-NN classifier is not active for shipped exercises. A classifier already exists; collecting and validating representative samples would be required to activate it responsibly.

Google documents synchronous web inference and recommends a worker to prevent main-thread blocking. This supports investigating contention, but does not establish a specific phone speedup for this app. [MediaPipe web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js)

## What the new probes establish

Run `node scripts/workout-tracking-research.mjs` from the copy. The saved original run is `docs/evidence/research-results.json`, bound to commit `310ccac`. Its poses are synthetic and have no inference latency, real visibility noise or thermal throttling. It tests engine behavior, not end-to-end camera accuracy.

The cadence probe feeds 10 smooth squat cycles, with no pauses at either extreme, at 40 evenly spaced offsets relative to the sample clock. Each row shares a cadence; varying offsets catches sampling alignment failures that varying a few random seeds can miss.

| Pose updates per second | Seconds per rep | Count range out of 10 | Exact trials out of 40 |
| --- | --- | --- | --- |
| 1.4 | 1 | 2 to 5 | 0 |
| 1.4 | 2 | 6 to 9 | 0 |
| 1.4 | 3 | 10 | 40 |
| 1.5 | 2 | 1 to 10 | 33 |
| 2 | 1 | 1 to 10 | 21 |
| 2 | 2 | 10 | 40 |
| 4 | 1 | 10 | 40 |
| 8 | 1 | 1 to 10 | 39 |
| 30 | 1 | 10 | 40 |

Inference: faster tracking is necessary, but a rate target alone does not guarantee counting. The non-monotonic 8 Hz case was traced to a single return-zone sample receiving only 62.5 ms of dwell credit. The takeover now permits one terminal sample at rates up to 10 Hz while retaining multi-sample debounce at higher rates and longer pause dwell. The regression covers 40 offsets at 4, 8 and 10 Hz; all count 10/10. That does not make a single rate a certification threshold. Sustained real phone throughput, phase coverage, calibration and count accuracy must be measured together. Raising a confidence threshold or lowering dwell cannot repair an unobserved endpoint.

The hold probe feeds a five-second hold with a 400 ms interruption starting at two seconds:

| Exercise | Continuous input | Required joints hidden | No pose returned |
| --- | --- | --- | --- |
| Legacy tree | 4.60 s | 3.75 s total; continuous hold resets | 3.75 s total; continuous hold resets |
| Recipe high plank | 4.60 s | 4.60 s, including hidden time | 3.75 s total; continuous hold resets |

The initial qualification period explains why five seconds of input does not yield five seconds of credit. The important discrepancy is that recipe grace bridges missing landmarks and retroactively credits unseen time, while the generic no-pose path calls `lose` immediately. Legacy holds have a shorter reset path. The copied fix does not provide one consistent grace policy for all exercises or all kinds of tracking loss.

Recommendation: decide separately whether to preserve continuity and whether to award time. A short unknown interval can preserve the current hold without implying observed exercise. If retroactive credit is retained as an intentional estimate, label and log it separately. A known shape break should never receive that credit. Add null-pose, missing-joint, invalid-angle and background-tab cases to the same test matrix before changing this policy.

The ambiguity probe gives hands-and-knees geometry with a bent shoulder-hip-knee line. The full-joint plank rule rejects the shape; cropping the knees makes the upper-body fallback accept it. This is an information limit of the fallback, not proof of a camera detector bug. The takeover now calls the result an upper-body estimate on screen.

The optional classifier probe confirms the generated squat samples require all ten upper-body and knee landmarks. Cropping knees fails that gate. Switching to the existing k-NN path would therefore reintroduce a wider framing requirement. If future samples declare fewer required joints, the embedding must also stop consuming absent joints: `pose-classifier.mjs:11` currently includes pairwise knee, wrist and opposite-side coordinates regardless of sample metadata.

## Minimum framing by exercise

This table describes current observable signals, not exercise technique certification. Keep the required region visible; the rest of the body can be cropped only where the signal remains meaningful.

| Movement family | Useful minimum region | What cropping loses |
| --- | --- | --- |
| Squat hip-travel counter | One shoulder and hip, standing baseline | Camera motion or upper-body bobbing may resemble squat travel; knee flexion is not verified |
| Push-up counter | One shoulder, elbow, wrist and hip, side view | Chest depth, hand contact and lower-body support are not verified |
| Front raise | Near shoulder, elbow, wrist and hip | Opposite-side symmetry is not verified |
| Plank estimate | One support arm plus shoulder and hip | Cannot distinguish extended legs from bent legs out of frame |
| Plank shape check | Same side shoulder, hip and knee plus support arm | Foot support still cannot be verified because ankles are discarded |
| Chair and wall sit | Near shoulder, hip and knee; chair also needs arm | Thigh position requires a knee; wall contact cannot be inferred from hip angle |
| Tree and other balance holds | Hips and both knees, plus torso references | A torso-only view cannot distinguish which leg is raised |
| Warrior II and horse stance | Torso and both knees; Warrior II also arms | Removing the far side removes stance discrimination |
| Side plank | Both shoulders and hips plus supporting elbow and knee | Shoulder stacking and side orientation need cross-body evidence |

Recommendation: define named capability levels such as visible movement, upper-body estimate and manual timer. Do not silently substitute a different exercise signal. For a knee-dependent hold with knees outside the picture, an explicit manual timer already offers useful progress without pretending to recognize the pose. The app has a manual clock; this investigation did not add a new mode or broaden completion claims.

## Techniques and model choices

Google's legacy pose classification guidance uses labeled terminal poses, pairwise landmark features, smoothing and distinct enter/exit thresholds. It calls for varied viewpoints and conditions in training data. The current rules and optional classifier follow that general approach, so improving the existing path is a reasonable first step. [Google pose classification guide](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/pose_classification.md)

| Option | Assessment for this app | Evidence boundary |
| --- | --- | --- |
| Current Lite model and state machine | Best first candidate: existing offline assets and per-exercise logic; validate scheduling, grace and camera framing | Engine probes do not measure Lite inference quality |
| Full or Heavy pose model | Benchmark on the same clips if Lite produces poor joints even with adequate frame rate | A larger model can reduce throughput; no app-specific accuracy gain has been measured |
| Existing k-NN | Useful experiment for selected exercises after real samples and unknown-pose rejection | Empty shipped sample map; generated full-joint embeddings are not a partial-body solution |
| MoveNet Lightning or Thunder | Possible later A/B model; requires an adapter for 17 keypoints and changes to confidence/depth handling | Published speed claims are not this app's phone measurements |
| Native ML Kit | Relevant only if a native mobile layer is chosen | Android/iOS pose API is not a drop-in web runtime |
| Signal peaks or periodicity | Useful independent diagnostic over hip travel or elbow angle; compare against state-machine events | Periodicity can count camera movement and shallow bobbing; cannot manufacture missing pose evidence |
| RepNet | Research comparator for class-agnostic video repetition | Different input and inference pipeline; no measured mobile-web or partial-body advantage here |

MoveNet offers 17 keypoints and two speed/accuracy variants. That makes it a candidate benchmark, rather than evidence that it fixes cropped holds. [TensorFlow MoveNet tutorial](https://www.tensorflow.org/hub/tutorials/movenet)

ML Kit provides native pose detection, with its own framing and confidence assumptions. It would require a different integration strategy for this browser PWA. [ML Kit pose detection](https://developers.google.com/ml-kit/vision/pose-detection)

RepNet estimates repetition through temporal self-similarity in video. Its later evaluation note cautions about consistent benchmark methodology. Use those methods as comparisons on matched footage rather than transplanting reported scores. [RepNet paper](https://arxiv.org/abs/2006.15418), [evaluation note](https://arxiv.org/abs/2411.08878)

Two additional research leads are viewpoint-invariant skeleton counting and a smartphone pipeline combining pose, thresholds, optical flow and state-machine logic. Their abstracts support further investigation; this work did not reproduce their results or import their implementations. [Viewpoint-invariant counting](https://arxiv.org/abs/2107.13760), [Puioio smartphone counting](https://arxiv.org/abs/2308.02420)

World coordinates can reduce some projection problems, but they remain model estimates. Keep image confidence and image bounds as gates before using them. Benchmark image and world angle signals on identical clips. Do not mix coordinate systems within an angle, and do not treat plausible world coordinates for an unseen limb as an observation. Visibility and presence have different meanings; verify the fields actually emitted by the pinned 0.10.14 runtime before changing its visibility contract. [MediaPipe landmark definitions](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/components/containers/Landmark)

## Completed takeover changes

The inherited counting commit supplies time-based dwell, wider hysteresis zones, 0.45 joint visibility for rules, nearer-side recipe holds, cropped plank fallback, wall sit, visible pause status and manual rep correction.

The recovered performance patch adds GPU preference, CPU fallback on startup/detection failure, context-loss handling and a CPU probe for a GPU that has never found a person. It persists CPU selection after failure and exposes delegate and pose rate. A URL parameter allows explicit delegate A/B testing. GPU performance remains unmeasured on the user's phone.

The takeover adds a single pending camera callback using `requestVideoFrameCallback` when supported, with animation-frame fallback, cancellation and generation guards. CPU-probe failure no longer stops an otherwise usable tracker. AR work moves out of the synchronous pose event handler and receives only the latest queued pose. Below four measured pose updates per second, the coach hides and its interaction work pauses; it recovers after a stable rate window, with bounded backoff. This deliberately prioritizes workout tracking over AR play on a slow device.

Additional integration fixes make recipe rep readiness wait for calibration, label cropped plank timing as an upper-body estimate, and close the single-sample dwell gap at intermediate update rates.

AR interactions now use torso-relative speed, minimum observed travel, a maximum sample gap and swept collision against a padded coach box. Eligible limbs include elbows, wrists, knees, ankles and foot landmarks. A hit launches the coach along observed limb movement, including vertical movement. Wrist hover grabs use stable wrist landmarks, a short miss grace and a longer hold window. A fast held-hand movement or another limb can swat the coach away. A moderate recent hand movement followed by loss of that hand is interpreted as a throw; stillness followed by loss drops after grace. Pose alone cannot observe an open palm or prove deliberate release, so this is an inferred release gesture.

Launch and drop animation can advance between pose samples at up to 30 animation updates per second, while preserving the separate pose timestamps used for velocity. This is a directional off-screen throw using the existing spin phase; it is not a new ballistic bounce or finger-grip model. A fully unobserved kick still cannot be detected reliably. The sparse threshold is an interaction heuristic, not a reconstructed peak velocity.

## Phone validation plan

1. Capture the same squat, push-up, plank, tree, grab, kick, swat and throw sequences on a mid-range Android and an iPhone. Include portrait, landscape, near-side occlusion, cropped knees/feet and poor illumination. Include stillness, shallow bobbing, hands-and-knees and camera repositioning as negatives.
2. Use `?recordPose=1` to capture timestamps, visibility and world landmarks. Pair recordings with manually annotated rep completion times and hold-valid intervals. Landmark exports can replay counting, but model comparisons require matching video frames as well.
3. Compare CPU and GPU on matched input using `?poseDelegate=CPU` and `?poseDelegate=GPU`. Record actual delegate after fallback, successful pose rate, interval p50/p95, inference time, warm-up time and throughput after ten minutes. Run coach enabled and suppressed with the same movement.
4. Replay full-rate landmarks at controlled rates and offsets. Report missed reps, extra reps, count precision/recall, time-credit error, reset frequency and false activation on negative clips separately. Accuracy is per exercise and framing condition.
5. Proposed acceptance targets, not established results: at least 95 percent completion-event precision and recall on the chosen supported scenarios, no extra counts on the fixed negative suite, hold time error within one second per 30-second annotated interval, no credit during known shape breaks, and bounded recovery after a brief visibility loss. Set AR hit and accidental-launch targets after collecting a labeled interaction corpus.
6. Prefer a dedicated worker only after measuring the remaining main-thread cost and transfer overhead. Preserve one in-flight inference, latest-frame backpressure, frame timestamps, stop/restart cleanup and the same-origin offline manifest. Avoid parallel inference queues.

## Validation and remaining limits

Evidence logs are in `docs/evidence`. The build passes. Initial focused movement, counting, AR and scheduler checks passed 142 tests; subsequent AR coverage includes sparse sweeps, directional exit, sticky grip, swat while held, inferred throw, jitter rejection and separate animation timestamps. The final full-suite result and source receipt are recorded in the handoff after validation completes.

No real phone pose data or end-to-end phone throughput was collected. The cadence and hold tables describe the copied counting commit, not an accuracy guarantee for the final browser build. Grace-policy differences, classifier framing requirements remain identified research items. The demonstrated 8 Hz dwell failure is now fixed in the final source. Standing knee-dependent holds still require knees for pose recognition. Source changes and generated preview assets are kept separate for review; a release should regenerate its build and offline receipts from the accepted source commit.
