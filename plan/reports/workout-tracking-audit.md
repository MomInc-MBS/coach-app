# Camera workout tracking audit (reps + holds)

Date: 3 Oct 2026. Worktree `D:/myr5-work/workout-tracking`, branch `w/workout-tracking` @ 5bc228f (= live Release 20). App source was read only. Scratch simulations live outside the repo in `D:/tmp/wt-audit/` (`sim.mjs`, `holds.mjs`, `fix1.mjs`). They import the real engine and test fixtures.

Labels: **PROVEN** means reproduced or read directly in the code. **SUSPECTED** means it fits the evidence but needs a phone measurement.

---

## TL;DR

- **Nothing is disconnected.** The live bundle runs the same engine as source. The engine has not changed since R9 (`0965a46`), apart from adding `need` to the side-plank row in R18. Every frame reaches `MovementSession.update`, and the counter on screen reads `count`/`totalHold`.
- **Reps (PROVEN in simulation):** the engine needs **at least 2 consecutive samples in each phase** (`repetition()` dwell, `movement-engine.mjs:109-118`). The legacy squat also has a narrow "up" window (`drop<=.10`, `:173`). On a phone, the CPU `pose_landmarker_lite` tracker runs at **about 1.4–2.5 updates/s** (measured in hotfix `9919c65`; `coach-overlay.mjs:11` notes phones stall in the 2–8/s band). At those rates, normal-speed reps are mostly dropped. For 10 squats at 2 s/rep the engine counts **1** at 1.4–2/s, 2.1 at 2.5/s, 8.3 at 4/s, and 10 at 6/s or more. The unit tests miss this because their "1.6 updates/s" case holds every phase for 1.5 s (`tests/rep-counting.test.mjs:30`).
- **Holds (PROVEN):** every hold reads knee landmarks. The data-driven rules require them at **visibility ≥ 0.6**: `movement-rules.mjs:79` (`clear …`) and `:105` (`need`). Standing holds require **both** knees and, for arm poses, both arms (`LEGS`/`UPPER`, `:32`, `:39`). That holds even for the **side-view** poses chair, warrior-one and front-stance, where the far side is naturally occluded. Lower legs and feet out of frame is fine. A knee at 0.55 visibility, or slightly out of frame, gives **0 s** of hold. The legacy tree/warrior/horse path uses 0.45 and still works at 0.55.
- The camera-workout screen hides every status line (`camera-workout.css:3`). The user never sees "Setting start" or "Counting paused: left knee unclear (52%)", so failures look silent.

---

## A. Live flow (end to end)

| Step | Where | What |
|---|---|---|
| Entry | `pose.html:159` loads `/app-runtime.mjs` | `app-runtime.mjs` is the esbuild bundle of `app.mjs` (`scripts/build.mjs:39`). No `dist/` in this worktree. The bundle matches source: it contains `recipeMetric`, `knnDown`, `"s e w h k"`, `visibility>=.6` ×2, `pose_landmarker_lite` ×2, and no `full`/`heavy`. |
| Start | BEGIN → `library.introduce()` → hologram Begin → `start()` (`app.mjs:171`, `:200`, `:101-144`) | `resetMovement()` builds a new `MovementSession(mode)` (`:73`). `pod.beginSet()` opens the local workout row. |
| Camera | `camera.mjs:4-7`, `:16` | `getUserMedia` with 640×480 ideal, `frameRate {ideal:30,max:30}`, `facingMode` or exact deviceId. Widest zoom is applied (`app.mjs:122`). |
| Model | `app.mjs:34`, `:124-135` | MediaPipe Tasks Vision **0.10.14**, same-origin `/vendor/mediapipe/0.10.14`. **`pose_landmarker_lite.task`**, **`delegate:'CPU'`** ("This Pixel's GPU path lost its WebGL context", `:128`), **`runningMode:'VIDEO'`**, `numPoses:1`, default confidences (0.5). The model is BlazePose GHUM lite with 33 landmarks plus world landmarks. `visibility` is populated in this version (checked in the vendored `vision_bundle.mjs`). |
| Loop | `app.mjs:145-169` | Runs on rAF, only when the video has a new frame. `detectForVideo(v, performance.now())` runs **synchronously on the main thread** (`:152`). There is no fixed fps; the rate equals inference throughput. `state.rate` and `state.inferenceMs` are measured every second (`:163`). |
| Landmarks → engine | `app.mjs:154-156` | `landmarks[0].slice(0,27)` (ankles/feet dropped), timestamp in ms, aspect `videoWidth/videoHeight`, `worldLandmarks[0]`. |
| Engine | `movement-engine.mjs:250-271` | `features()` (`:32-62`) builds aspect-corrected points and visibility gates. Routing (`:263-269`): k-NN if a samples file exists (**none**: `pose-samples.mjs` is `export default {}`) → legacy `repUpdate` for `squat`/`pushup` → legacy `holdUpdate` for `tree`/`warrior`/`horse` → boxing → march → data rules `recipeUpdate` (`:119-141`, via `evaluateMovement`, `movement-rules.mjs:97-111`) → legacy `jumpUpdate`. |
| AR coach | `app.mjs:158` dispatches `myr5:pose` → `coach-overlay.mjs:100-113` | Runs inline in the tracking call stack. The coach stays offstage (`display:none`, `:44`) until `count>0 \|\| totalHold>0`. After that it walks in and its WebGL viewer renders, capped to 10 fps only when rate < 4/s (`:13`). |
| UI | `app.mjs:164` → `renderMotion` (`:78-91`) | Every 160 ms: the `#primary` flip counter shows `count`, or `totalHold`/`active` as a clock. `camera-workout.mjs:22` moves `#primary` into the stop button. **Everything else is `display:none`** (`camera-workout.css:3`), including `#status`, `#countState`, `#measurement`, `#jointReadings`, `#detail` and the landmark canvas. |
| Voice | `coach.mjs:15-37` `CueEvents` | Says "Ready. Begin." when ready, the setup message after 6 s, "tracking lost" after 2 s, and each count. |
| Storage | `app.mjs:162` → `pod.consume` (`pod/pod.mjs:103`) → `workoutOwner.complete` → local coach DB | `valueOf` (`pod/set-flow.mjs:10`) is `totalHold` for holds and `count` for reps. |

Unused in the live path: the k-NN (no samples), `RULES.squat/pushup/warrior` for ids `squat`/`pushup`/`warrior` (those ids take the legacy paths), and `gesture-controls.mjs` (a second pose+hand tracker, only in the library dialog when gestures are on, `menu.mjs:58`).

---

## B. Root cause: reps not counting

### B1 (PROVEN): the engine needs 2+ samples per phase, and the phone gives ~1.4–2.5 samples/s

`repetition()` (`movement-engine.mjs:109-118`):
- top→bottom needs `down` on the first sample (sets `phaseSince`) **and** again ≥ `dwell` (0.10 s) later. That means 2 consecutive "down" samples.
- bottom→count needs 2 consecutive "up" samples (`t-phaseSince>=.10`), `t-downAt>=minDuration`, and `t-lastRep>=.45`.

At 1.6/s the samples are 0.625 s apart, so each phase must last more than ~0.6–1.2 s. A normal squat spends ~0.3–0.5 s near the top. The legacy squat "up" zone is `drop<=.10` torso lengths (`:173`), about the top 12% of travel, roughly 0.45 s of a 2 s rep. The rule-based travel squats use `travel<=.09` (`:135`).

Reproduction (`node D:/tmp/wt-audit/sim.mjs`): smooth cosine reps with no pauses, ±0.003 jitter, averaged over 8 phase/seed offsets, using the repo's own start/end fixtures.

| 10 reps @ 2 s/rep | 1.4/s | 1.6/s | 2/s | 2.5/s | 3/s | 4/s | 6/s+ |
|---|---|---|---|---|---|---|---|
| squat (legacy) | 1.0 | 1.0 | 1.0 | 2.1 | 4.6 | 8.3 | 10 |
| pushup (legacy) | 1.0 | 1.5 | 4.3 | 6.4 | 9.0 | 10 | 10 |
| wide-squat (rule) | 1.0 | 1.0 | 1.0 | 3.3 | 6.0 | 9.8 | 10 |
| lateral-raise | 0.0 | 0.0 | 1.3 | 5.4 | 8.5 | 10 | 10 |
| jumping-jack | 1.0 | 1.0 | 0.9 | 2.1 | 3.8 | 7.6 | 10 |
| hip-hinge | 1.3 | 2.1 | 6.0 | 9.4 | 10 | 10 | 10 |

At 3 s/rep the squat counts 2.0 at 1.6/s and 4.1 at 2/s. The "1" count at low rates is the final rep, credited only because the user stands still at the end.

Why tests pass: `tests/rep-counting.test.mjs:26-31` holds each pose for `phase=fps<3?1.5:.7` seconds. The browser test (`tests/camera-counting.browser.test.mjs:23`, `half:1.5`) does the same: 3 s reps with flat holds. **121/121** related unit tests pass (`node --test tests/rep-counting.test.mjs tests/movement-engine.test.mjs tests/exercise-library.test.mjs tests/r18-required-joints.test.mjs tests/coach.test.mjs`).

### B2 (PROVEN by code, rate SUSPECTED): the tracker rate is the real bottleneck, and more competes for it after the first rep

- Inference is CPU lite on the main thread (`app.mjs:130`, `:152`). Hotfix `9919c65` measured 1.4–1.9/s on Ian's phone. That commit blamed the AR coach's WebGL loop (321k triangles, MSAA, 30 fps) competing with the CPU tracker and MediaPipe's per-frame readback.
- The coach is offstage until the first count, then shown. It renders uncapped unless rate < 4/s, and even then at 10 fps (`coach-overlay.mjs:13`, `:87-99`). It also runs `CoachMotion.update` and DOM writes inline per pose (`:100-111`). So the tracker rate is **expected to drop right after the first rep or held second**, which is when counting needs it most. The pattern would be "first rep counts, then nothing". SUSPECTED; compare `myr5TestState.rate` before and after the first count.
- `MAX_FRAME_GAP=.75` (`movement-engine.mjs:21`, `:253`, `:260`): any stall over 0.75 s (GC, coach asset load, housing CSS load at start) calls `lose()`, resets the phase to `ready`, and zeroes `dt`. Below 1.33/s, nothing ever counts or accrues.

### B3 (PROVEN): the user can't see why it isn't counting

`camera-workout.css:3` hides all of `body>*` except the stage. The stage holds only video, counter, housing and coach. The engine's messages ("Setting start: 40%", "Counting paused: right elbow unclear (41%)") are written to hidden nodes (`app.mjs:164`, `:88`). On the rules path, a failed gate returns only the generic `m.hint` (`movement-rules.mjs:101`, `:105`), not the joint that failed. Voice speaks the setup message only after 6 s (`coach.mjs:25`). `CueEvents` also says "Ready. Begin." for rule-based reps before the start pose has been calibrated (`coach.mjs:21`: only squat/pushup/jumping check `calibrated`).

### Ruled out (PROVEN)
- Engine disconnected: no. `app.mjs:156` calls `session.update` every frame; the bundle matches source; `renderMotion` reads `count` and `totalHold`.
- k-NN silently no-op: it is **off by design**. `pose-samples.mjs` is empty, so `this.knn=null` (`movement-engine.mjs:73-74`) and the rules run. It cannot block counting.
- Engine regression since R9: `movement-engine.mjs`, `exercise-library.mjs` and `camera.mjs` are byte-identical to `D:/myr5-work/r9-reps`. The only rule change is `sideplank` gaining `need:'s e h k'` (`d3e9496`). The plank `need` change was reverted (`4412424`).
- Missing `visibility` in MediaPipe output: not in 0.10.14 (`visibility:Gn(n,4)??0` in the vendored bundle).

### Minor (SUSPECTED)
- Rule angles use **world** landmarks whenever present (`movement-rules.mjs:22` `a3`). In live use that is every frame; the tests mostly pass no world data or z=0. Lite-model z noise could shift `s-e-w`, `h-s-w` and `s-h-k` past thresholds (for example, never reaching `s-e-w > 150` "up" on rule push-ups). The legacy squat and pushup use image-space angles only. A real recording would confirm or rule this out.
- `coach-profile.mjs:37` dispatches a `change` on `#movement` the first time a profile applies. If that lands mid-set, `app.mjs:174` resets the session and reopens the library. This is a rare race.

---

## C. Root cause: holds need the whole body

### Gates (PROVEN)

| Gate | Where | Threshold |
|---|---|---|
| In-frame | `movement-engine.mjs:41` | raw x,y within [-0.03, 1.03] |
| `visible()` | `movement-engine.mjs:42` | in frame **and** visibility ≥ **0.45** |
| Legacy hold gate (`tree`/`warrior`/`horse`) | `movement-engine.mjs:180` `f.knees` (`:61`) | 11,12,23,24,25,26 all ≥ 0.45, torso > 0.035 |
| Rule `need` side pick | `movement-rules.mjs:99` | `need` joints on that side ≥ 0.45 |
| Rule `need` re-check | `movement-rules.mjs:105` | same joints ≥ **0.6** |
| Rule `clear …` | `movement-rules.mjs:79` | each listed joint ≥ **0.6** |
| `LEGS` | `movement-rules.mjs:32` | `clear 11 12 23 24 25 26`: both shoulders, hips and **knees** |
| `UPPER` | `movement-rules.mjs:32` | `clear 11 12 13 14 15 16 23 24`: **both** arms |
| Any invalid frame | `recipeUpdate` `:122` → `lose()` `:78-82` | clears `previousMatch`/`candidate`. A non-matching frame sets `hold=0` immediately (`:130`; the legacy path has a 0.35 s grace). Restarting needs 0.45 s plus one more matching frame (`:128`). |

Ankles and feet are already discarded (`movement-engine.mjs:35`, `:37`), so "feet in frame" is not the requirement. The requirement is: **both knees clearly in frame at ≥ 0.6**, plus both arms for arm poses, plus wrist and knee on one side for planks.

Simulation (`node D:/tmp/wt-audit/holds.mjs`): 10 s held at 2 updates/s; value is totalHold.

| Exercise | full | ankles/feet off | knees vis .55 | knees vis .40 | knees just off frame | far side vis .5 | 1-in-4 frames knee .5 |
|---|---|---|---|---|---|---|---|
| high-plank / knee-plank | 9.5 | 9.5 | **0** | 0 | 0 | 9.5 | 5.0 |
| low-tree, overhead-tree | 9.5 | 9.5 | **0** | 0 | 0 | **0** | 5.0 |
| mountain, salute | 9.5 | 9.5 | **0** | 0 | 0 | **0** | 5.0 |
| high-horse | 9.5 | 9.5 | **0** | 0 | 0 | **0** | 5.0 |
| tree, horse (legacy) | 9.5 | 9.5 | 9.5 | 0 | 0 | 9.5 | 9.5 |

How this matches Ian's report: MediaPipe gives knees near the bottom edge, or with the shins cropped, mid-range visibility. It gives far-side limbs in side views ~0.3–0.6 (SUSPECTED; confirm with a `?recordPose=1` recording, which stores per-landmark visibility). The rules' 0.6 bar and both-sides requirement mean the user must step back until the whole body is in frame. **Side-view holds contradict their own camera cue.** `chair` and `warrior-one` (`view:'side'`) and `front-stance-left/right` (side) require both knees and, for overhead poses, both arms at 0.6. `front-raise` (side-view reps) requires `UPPER` (both arms) too.

There is no "wall sit" in the library (`exercise-library.mjs`). The closest is `chair`, which also requires both arms overhead (`OVERHEAD`, `movement-rules.mjs:58`).

---

## D. Per-exercise table

s/e/w/h/k = counted-side shoulder/elbow/wrist/hip/knee. "Both" = left and right. Visibility ≥0.45 = engine `visible`; ≥0.6 = rules `need`/`clear`. Angles are EMA-smoothed (τ 85 ms, `movement-engine.mjs:77`) and use world coordinates when available.

| Exercise ids | Path | Type | Joints read by the count/match | Thresholds | Required by gate (vis) |
|---|---|---|---|---|---|
| `squat` | legacy `repUpdate` | rep | s,h (hip y travel) | upright (h.y-s.y)/torso>.65 to calibrate (≥3 samples, ≥0.7 s, hipY range ≤.025); down drop≥.25, up drop≤.10 torso; dwell .10, min .18 s | s,h one side ≥.45 |
| `pushup` | legacy `repUpdate` | rep | s,e,w,h (2D elbow) | horizontal≥.5; calibrate elbow>145°; down bend≥35°, up bend≤14° from base | s,e,w,h one side ≥.45 |
| `shallow-squat`, `wide-squat`, `pause-squat` (dwell .8), `slow-squat` (min 1.2) | rule `squat` (travel) | rep | s,h | gate `core`, hipDrop≥.55; down travel≥.25 (.18 shallow), up ≤.09 | s,h ≥.45 |
| `knee-`,`wide-`,`slow-`,`diamond-`,`decline-pushup` | rule `push` | rep | s,e,w,h | horizontal≥.5, wristDrop≥.12; up s-e-w>150, down <112 | s,e,w,h ≥.6 |
| `high-`/`low-incline-pushup` | rule `incline` | rep | s,e,w,h | horizontal≥.28, wristDrop≥.12; same angles | s,e,w,h ≥.6 |
| `split-left/right` | rule `split` (fixed side) | rep | s,h,k | upright, kneeDrop≥0; up s-h-k>155, down <135 | s,h,k ≥.6 on fixed side |
| `hip-hinge`, `good-morning` | rule `hinge` | rep | s,h,k | kneeDrop≥.35; up s-h-k>158, down <135 | s,h,k ≥.6 |
| `small-hinge` | rule | rep | s,h,k | down <155 | s,h,k ≥.6 |
| `glute-bridge`, `pause-bridge` (dwell .8) | rule `bridge` | rep | s,h,k | horizontal≥.5, kneeDrop<.2, shoulderDrop≥.1; up s-h-k<145, down >162 | s,h,k ≥.6 |
| `front-raise` (side view), `lateral-raise` | rule `raise` | rep | both s,e,w,h | up both h-s-w<30; down both h-s-w>75 and s-e-w>145 | **UPPER both arms ≥.6** + upright |
| `overhead-reach` | rule | rep | both | down both h-s-w>150 | UPPER ≥.6 |
| `standing-press`, `slow-press` | rule `press` | rep | both s,e,w | up both s-e-w<115 and wristY<.2; down wristY<-.65 and s-e-w>155 | UPPER ≥.6 |
| `jumping-jack`, `step-jack` | rule `jack` | rep | both arms + both knees | up spread<1.2 and h-s-w<35; down spread>1.5 (1.3 step) and h-s-w>130 | **UPPER + LEGS ≥.6** |
| `knee-plank`, `high-plank` | rule `plank` | hold | s,e,w,h,k | horizontal>.65; s-h-k>155, wristDrop>.2, s-e-w>145 | s,e,w,h,**k** ≥.6 |
| `forearm-plank` | rule | hold | s,e,w,h,k | s-e-w 60–120 | s,e,w,h,k ≥.6 |
| `side-knee-*`, `side-plank-*` | rule `sideplank` (fixed side) | hold | both s,h; side e,k | shoulderStackY>.3, StackX<.5, horizontal>.7, s-h-k>153, elbowY>.15 | s,e,h,k + 11,12,23,24 ≥.6 |
| `knee-balance`, `low-tree`, `overhead-tree` | rule `balance` (either leg) | hold | both h,k (+arms for overhead) | otherKneeOut<.55, otherKneeY>.5, kneeGap>.15 (.08 low, .35 knee-balance), kneeOut>.4 (.2 low) | **LEGS ≥.6** + upright (+UPPER) |
| `tree` | legacy `holdUpdate` | hold | both h,k | raisedOut>.4, supportOut<.55, gap>.15 | 6 joints ≥.45 |
| `mountain` | rule | hold | both k, both w | straight legs + wristY>.5 | LEGS + UPPER ≥.6 |
| `salute` | rule | hold | both k, both w | straight legs + both wristY<-.65 | LEGS + UPPER ≥.6 |
| `chair` (side view) | rule | hold | both k, both arms | both kneeY .08–.8, spread<1.2, overhead | **LEGS + UPPER ≥.6 (both sides in a side view)** |
| `warrior-one` (side view) | rule `front`+overhead | hold | both k, both arms | spread>1.1, kneeY<.85, otherKneeY>.85 | LEGS + UPPER ≥.6 |
| `warrior` | legacy `holdUpdate` (RULES.warrior unused) | hold | both arms + knees | elbows>140, wrists level, span>2.2, spread>1.15 | 6 joints ≥.45, arms 11-16 ≥.45 |
| `goddess` | rule | hold | both k, both arms | horse(1) + elbows<120, wrists above elbows | LEGS + UPPER ≥.6 |
| `high-horse`, `low-horse` | rule `horse(n)` | hold | both h,k | spread>1.4, kneeOut>.5, kneeY .08–1.25/.6 | LEGS ≥.6 |
| `horse` | legacy | hold | both h,k | spread>1.5, kneeOut>.5, kneeY<1 | 6 joints ≥.45 |
| `front-stance-left/right` (side view) | rule `front` | hold | both k | spread>1.1, kneeY<.85, otherKneeY>.85 | LEGS ≥.6 |
| `boxing`, `jab-*`, `double-jab` | `boxingUpdate` | pace | s,w,h | hand speed EMA >.7 torso/s | s,e,w,h ≥.45 |
| `march`, `high-march`, `jogging` | `jogUpdate` | steps | both k | lift>.13 (.4 high), arm <.05 | 6 joints ≥.45 |
| `jumping` (legacy only) | `jumpUpdate` | jumps | s,h | lift>.16 and shoulder>.12, land <.07 | s,h ≥.45 |

---

## E. Tests and debug hooks

Tests (run 3 Oct; all node, no browser):
- `tests/rep-counting.test.mjs`, `tests/movement-engine.test.mjs`, `tests/exercise-library.test.mjs`, `tests/r18-required-joints.test.mjs`, `tests/coach.test.mjs`: **121 pass, 0 fail**. All fixtures use `visibility:1`, joints well inside the frame, no world z, and long flat holds per phase. None cover real rep speed at phone rates, mid-range visibility, or knees near the frame edge.
- `tests/camera-counting.browser.test.mjs` (needs `dist/client`, not built here). In R20 runs: ✔ in `r20-trial-tests.txt:178`, ✖ in `r20-full-tests.txt:1632` (local-coach-runtime import failed, an environment problem) and ✖ in `r20-rerun.txt:9` (no detail). Its fake rate is 1.6/s with `half:1.5` (3 s reps), so it would not catch B1 even when green.

Debug hooks:
- `pose.html?recordPose=1` → `camera-workout.mjs:9` → `pose-recorder.mjs` adds Down/Up/Save buttons on the camera stage. Save downloads JSON with each frame's timestamp, 27 landmarks (x, y, visibility) and world landmarks. This is the fastest way to get the real rate (timestamp deltas) and real knee/far-side visibility.
- `node scripts/pose-samples.mjs <recording.json> [--reps N] [--use]` turns a recording into `tests/fixtures/pose-replay/*.replay.json` (auto-tested by `rep-counting.test.mjs:76-84`), plus k-NN samples. `--use` turns on k-NN for that exercise.
- `window.myr5TestState`: `.rate` (updates/s), `.inferenceMs`, `.poses`, `.motion` (full snapshot: `tracking`, `calibrated`, `phase`, `message`, `jointReadings`, `progress`). Readable via remote DevTools (chrome://inspect).
- `#detail`, `#countState`, `#measurement`, `#jointReadings` show the same values but are hidden during a camera workout.
- `window.myr5CoachOverlay` (start/begin/pose/stop/state) for the AR coach.

---

## F. Fix options (ranked; smallest root-cause fix first; not implemented)

1. **Measure first (no code).** On Ian's phone: `pose.html?recordPose=1`, do 10 normal squats and a plank with shins cropped, Save. Read `myr5TestState.rate` before and after the first count. This confirms B1/B2 (rate, and whether it drops when the coach walks in) and C (actual knee and far-side visibility). Convert with `scripts/pose-samples.mjs` to get two real replay fixtures that lock in the fixes below.

2. **Reps: make the dwell rate-aware.** In `MovementSession.repetition()` (`movement-engine.mjs:109-118`), credit the time since the previous sample when a phase is first seen. For example, set `phaseSince = t - Math.min(gap, .10)`, with `gap` passed from `update()` or kept on `this`, so one sample satisfies the default 0.10 s dwell. Pause-squat/bridge (dwell .8) keep their long dwell. This changes one function, and every rep path routes through it (legacy squat/pushup, rules, k-NN). Simulated (`D:/tmp/wt-audit/fix1.mjs`, 2 s/rep): squat 1.0→3.3 at 1.6/s and 2.1→4.8 at 2.5/s; pushup 1.5→4.3; jumping-jack 1.0→3.0; at 3 s/rep squat 2.0→6.5. It helps but cannot fix 1.6/s on its own; see 4.
   - Same change set: widen the narrow "up" zones, legacy squat `drop<=.10` (`:173`) and travel `travel<=.09` (`:135`), to about .15 so the top is sampled.
   - Replace the 1.5 s flat-hold "1.6/s" case in `tests/rep-counting.test.mjs:26-31` with smooth 2 s reps at 1.6, 2.5 and 4/s. Do the same for `half` in the browser test.

3. **Holds: stop demanding a perfect full body.**
   a. Use one visibility bar. Change the rules' `>=.6` (`movement-rules.mjs:79` and `:105`) to the engine's 0.45 (`movement-engine.mjs:42`). That is two constants, and it matches the legacy holds that work at 0.55.
   b. Add a grace period: in `recipeUpdate` (`movement-engine.mjs:122`, `:130`), keep the hold running through invalid or non-matching frames under ~0.75 s (`MAX_FRAME_GAP`) instead of zeroing at once, as `holdUpdate` already does at `:197`/`:203`.
   c. Side-view holds should gate on the near side only. For `chair`, `warrior-one` and `front-stance-*` (and the `front-raise` rep), replace `LEGS`/`UPPER` (both sides) with the picked side's `need`. Rewrite the matches that read `both …`/`other…` against a single side.
   d. Product choice: a knee-free plank fallback (s-h line horizontal plus wrist under shoulder, no `s-h-k`) when the knee is not visible. Standing holds (tree/mountain/horse) are defined by knee geometry, so they cannot be checked without knees. For those, offer the existing manual timer, or say clearly "keep your knees in the picture". Add a real `wall-sit` row if Ian wants one: side view, `need:'s h k'`, s-h-k around 80–110°, upright torso.

4. **Raise the tracker rate (the actual bottleneck).**
   a. During a counted set, keep the AR coach off when rate < 4/s (`shown(false)`/`setMaxFps(0)` in `coach-overlay.mjs` `updateCap`, `:87-99`) instead of rendering at 10 fps.
   b. Retry `delegate:'GPU'` with CPU fallback on error or context loss (`app.mjs:130`).
   c. Bigger change: move `detectForVideo` into a Worker (ImageBitmap transfer) so the main thread, coach and DOM stop competing.
   Above roughly 4/s, B1 disappears even without fix 2 (table in B1).

5. **Show why it is paused.** Add one status line inside `#cameraWorkout` (`camera-workout.mjs`, `camera-workout.css`) that shows `state.motion.message`. Have `evaluateMovement` return `f.issues(...)` for the failed `need`/`clear` joints instead of the bare hint (`movement-rules.mjs:101`, `:105`). Fix `CueEvents` "ready" so it waits for `calibrated` on every rep exercise (`coach.mjs:21`).
