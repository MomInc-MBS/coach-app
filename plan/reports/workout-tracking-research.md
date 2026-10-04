# Workout tracking research: rep counting + partial-body holds (browser, mobile)

Date: 2026-10-03. Scope: external research only, no app code read. Items marked [src] come from a fetched or searched source; items marked [judgment] are my engineering inference and need device testing.

## 0. Likely root causes in the current app (inferred, verify in code)
- Holds only work with the full body in frame: almost certainly a "all required landmarks visible" gate, or a landmark list that includes ankles/feet for every exercise. MediaPipe still emits all 33 landmarks when the body is cropped; unseen ones get coordinates outside the image and low visibility [src: ML Kit pose docs, https://developers.google.com/ml-kit/vision/pose-detection]. The engine must gate per-landmark on visibility, not on "pose found".
- Rep counting flaky: usual culprits are single-threshold angle checks (jitter flips state), angle taken from a joint pair that is occluded or foreshortened for the camera view, and EMA lag at low fps. The unused k-NN is not the fix by itself.
- Check that `visibility` is actually populated in your tasks-vision version. A closed GitHub issue reports it missing in 0.10.0 [src: https://github.com/google-ai-edge/mediapipe/issues/4479]. Log it on a real device. If it is absent or constant, every visibility gate silently passes or fails.

## 1. Rep counting techniques

### 1a. Angle hysteresis state machine (the baseline everyone converges on)
- Google's k-NN colab counts reps with enter/exit thresholds: state "entered" when target-pose probability passes a high threshold, "exited" when it drops below a slightly lower one, so values hovering at the boundary do not create phantom counts [src: https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/pose_classification.md ; https://developers.google.com/ml-kit/vision/pose-detection/classifying-poses].
- Concrete open-source example (Bibas41/exercise-rep-counter, MediaPipe, joint angles): EMA alpha 0.4 (about 2 frames lag at 30 fps), two-threshold hysteresis requiring full cycle extended -> flexed -> extended, min rep duration 0.5-0.6 s, partial-rep band (reached "attempt" threshold but not "flexed" = not counted), frames with any tracked landmark visibility < 0.3 skipped without touching the state machine, smoothing reset after a >1 s gap. Author reports hysteresis was the biggest improvement (38 false positives removed). Example thresholds: curl >=150 / <=60, squat >=160 / <=100, push-up >=150 / <=90 [src: https://github.com/Bibas41/exercise-rep-counter].
- Another four-state hysteresis machine (extended, descending, flexed, ascending): https://github.com/Rebello16/ai-gym-exercise-form-analyzer [src].
- Practical rules [judgment, consistent with the above]:
  - Count only on a completed cycle (start zone -> end zone -> start zone), never on a single crossing.
  - Thresholds in data as extended/flexed/attempt bands with a dead-zone >= 15-20 degrees between them.
  - Min rep duration per exercise (0.4 s fast moves, 1 s+ slow tempo) and a refractory period after each count.
  - Skip, do not zero, invalid frames; hold state through gaps < ~0.5-1 s; reset the machine on longer gaps.
  - Min amplitude: peak-to-peak in the cycle must exceed a % of calibrated range so fidgets do not count.

### 1b. Signal-based counting (peak detection / autocorrelation)
- Treat a 1-D signal (a joint angle, or normalized y of hip/shoulder/wrist) as a time series; count peaks/troughs with prominence + min-distance constraints. Papers describe angle peak/trough segmentation [src: https://pmc.ncbi.nlm.nih.gov/articles/PMC12749503/ ; Sci Rep 2025 live counter using autocorrelation plus action recognition, https://www.nature.com/articles/s41598-025-25674-1].
- Autocorrelation estimates the period, which gives a rolling tempo estimate to set min-rep-duration/refractory adaptively and a sanity check on counts. Better as a validator than as the primary counter at low fps [judgment].
- RepNet (Google) is class-agnostic periodicity counting from a temporal self-similarity matrix of per-frame embeddings [src: https://research.google/blog/repnet-counting-repetitions-in-videos/ ; https://arxiv.org/pdf/2006.15418]. It is a video model, not practical on-device in-browser next to pose. The transferable idea: self-similarity of a pose-feature vector over time reveals periodicity independent of exercise. A cheap version over a 60-90 frame window is O(n^2) and fine in JS [judgment].
- Google's "Viewpoint-Invariant Exercise Repetition Counting" (https://arxiv.org/pdf/2107.13760) targets exactly the camera-angle problem; I could not parse the PDF, so its details are unverified.
- PoseRAC (BlazePose + small transformer classifying salient poses, then counting transitions) is the learned route [src: https://arxiv.org/pdf/2303.08450]. Overkill for a rules-based app unless rules prove insufficient.

### 1c. k-NN / embedding classifiers
- Google pipeline: normalize pose (torso size and orientation), pairwise-distance features, two-pass k-NN (min per-coordinate distance, then mean), EMA over class probabilities, then enter/exit threshold counting [src: pose_classification.md].
- Caveat in the docs: accuracy depends on training samples covering camera angles; better z would reduce angles needed [src, same]. For a rules-as-data app, k-NN is useful as a fallback start/end-pose detector where no single angle works (burpees, jumping jacks) and as a corroborator. Not needed for curl/squat/push-up style moves. Keep unused until a specific exercise fails with rules.

### 1d. Choosing the dominant signal automatically [judgment, no canonical source]
- Per exercise, declare 2-4 candidate signals in the rules data (squat: knee angle L/R, hip-y / torso length, shoulder-y). At runtime score each over a sliding ~3-4 s window by: mean visibility of its landmarks, peak-to-peak amplitude normalized by torso length, and periodicity strength. Switch only if better for >1 s, and re-baseline thresholds as percentages of the user's observed range after the first 1-2 reps.
- Side vs front: for bilateral signals use the side with higher visibility (side-on hides the far limb). Front views foreshorten sagittal angles (2D knee angle barely changes in a squat), so prefer vertical-displacement signals there. World landmarks (3D, metres) reduce foreshortening but monocular z is the least reliable axis; validate on device [world landmarks exist: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker].
- Normalize displacement signals by torso length (shoulder-mid to hip-mid) for distance invariance, as Google's k-NN does.

### 1e. Defaults to start from
Smooth with One Euro on landmarks (or EMA alpha 0.3-0.4 on the signal); hysteresis dead-zone 15-20 deg or 10-15% of range; min rep 0.4-0.6 s; refractory 0.2-0.3 s; min amplitude 60-70% of calibrated range; required landmark visibility >= 0.5 (Bibas uses 0.3 to skip; tune on device).

## 2. Partial-body tracking
- Do not gate on "whole body visible". Gate on the exercise's minimal landmark subset, declared in rules data as OR-groups of sufficient subsets.
- MediaPipe gives per-landmark `visibility` and `presence` [src: Pose Landmarker guide]. Config has min detection / presence / tracking confidence (default 0.5 each); consider 0.3-0.4 for presence/tracking on floor-propped phones so tracking does not drop and re-run detection when legs leave frame [judgment].
- Caveat: the model guesses plausible positions for cropped joints. Visibility is lowered but not always enough, so also require the landmark to be inside [0,1] image bounds with a margin [src: ML Kit says unrecognized landmarks get out-of-image coordinates].
- Suggested minimal subsets [judgment]:
  - Plank / push-up hold: one side shoulder + hip + (ankle OR knee). Body-line angle shoulder-hip-knee is a small-error substitute if feet are cropped. Fallback: shoulder + hip with horizontal torso (torso angle vs horizon < ~25 deg) and wrists/elbows near under shoulder.
  - Wall sit: hip + knee + ankle ideally; fallback hip + knee with thigh near horizontal and shoulder-hip near vertical (no ankle needed).
  - Squat: hip-knee-ankle; fallback hip-y vs knee-y normalized by torso length.
  - Torso-only fallback: hip-mid y / torso length and shoulder-mid y as the movement signal (squat, lunge, sit-up via torso angle) with a "reduced tracking" indicator.
- Side selection: choose the side whose required landmarks have higher min-visibility, sticky ~1 s.
- Hold detection: accumulate time only while the form predicate is true for N consecutive valid frames (a plank repo uses 24 frames to start [src: https://github.com/Haimantika/plank-posture]; ~0.5 s is reasonable). Grace: if the predicate is unknown (not enough visible landmarks), keep the timer running up to ~1.5-2 s, pause (not reset) beyond that, reset only on a confirmed form break or a long loss (>5-8 s). Distinguish "unknown" from "false"; this is the key fix for holds where parts drift out of frame [judgment].
- Lost-tracking UX: after ~1 s unknown show a non-blocking hint naming the missing part and direction ("tilt phone up, need your hips"); keep the clock honest (paused); never hard-block start on full body.
- View detection: plank hip-sag checks need a side view; front-facing is poor [src: plank-posture repo]. Estimate view from shoulder-width vs torso-length ratio in image space and pick the rule variant [judgment].

## 3. Model and runtime tradeoffs
- Pose Landmarker lite/full/heavy share input shapes (detector 224x224, landmarker 256x256, float16); the docs give no latency table [src: Pose Landmarker guide]. A web-guide result says GPU delegate with Lite is preferred on slower Android phones where inference can exceed 150 ms [src: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js].
- A 2026 benchmark (TF.js WebGL, posetracker.com, vendor source, indicative only): iPhone 12 MoveNet Lightning 51 fps, Thunder 43, BlazePose Lite 34, Full 30; Pixel 5 MoveNet Lightning 34, Thunder 12, BlazePose Lite 12, Full 11, Heavy 5 [src: https://www.posetracker.com/news/best-pose-estimation-model-in-2026-the-real-time-mobile-guide]. It is TF.js, not the MediaPipe Tasks WASM/GPU runtime, so MediaPipe may do better.
- MoveNet: 17 keypoints, single pose, no feet or z; Lightning 192x192, Thunder 256x256 [src: https://blog.tensorflow.org/2021/05/next-generation-pose-detection-with-movenet-and-tensorflowjs.html]. Cropped-leg behaviour is similar (it guesses). The rep-count problem is logic, not model, so migration is not justified yet.
- Recommendation [judgment]: stay on Pose Landmarker; Lite (or Full on fast devices) chosen by a ~2 s startup benchmark of ms/frame; GPU delegate with CPU fallback; target 20-30 fps; use `detectForVideo` in a throttled loop and drop frames rather than queue. Rep counting at >= 15 fps is fine for normal tempo.
- Smoothing: MediaPipe's own pose pipeline ends with a One Euro filter per landmark [src: https://github.com/google-ai-edge/mediapipe/blob/63e679d99ca45b30514a9d84c9351a2d77bb9ba0/mediapipe/modules/pose_landmark/pose_landmark_filtering.pbtxt]. One Euro raises its cutoff with speed: strong smoothing when still (stable holds), little lag when moving (rep timing). A fixed EMA must choose one. Use One Euro per landmark (min cutoff ~1 Hz, beta tuned, scaled by torso length), light EMA on derived angles, reset on tracking gaps. Guide: https://medium.com/@debasishraut.dev/setting-up-smoothing-filters-for-mediapipe-pose-estimation-pipeline-a-practical-guide-fcc03f462196
- Image vs world landmarks: image landmarks are normalized by width and height separately, so compute angles in pixel space (x*W, y*H) or world space, never raw normalized x/y (common bug). World landmarks avoid aspect distortion and some perspective error but z is noisy [judgment]. Also make sure mirroring does not swap left/right in the visibility-based side choice.

## 4. UX patterns in commercial apps
- Kemtai: session starts by moving back and forth until the whole body is in frame, about 8 ft from the webcam; workout does not start until the whole body is identified [src: https://www.t3.com/reviews/kemtai ; https://www.laptopmag.com/reviews/kemtai-adaptive-home-exercise-platform]. This is the behaviour your app currently mimics and what hurts on floor-propped phones.
- Peloton Guide keeps the user centered in frame and offers picture-in-picture self view [src: https://www.trustedreviews.com/news/peloton-guide-is-a-450-camera-thats-gunning-for-apple-fitness-plus-4178576]. Tempo Move uses a fixed dock with a Face ID iPhone. Both rely on controlled placement; a PWA cannot, so partial-body tolerance is a differentiator.
- Sency/Kemtai public material is marketing and does not detail partial-body logic [src: https://www.sency.ai/post/the-secrets-of-body-movement-tracking-revealed-by-sencys-cto ; https://kemtai.com/]. I found nothing public on Zenia or Apple Fitness framing logic; do not assume details.
- Patterns worth adopting [judgment]: draw only the joints the exercise needs (green when visible); one-line placement tip per exercise ("phone on floor, side-on, 6 ft away"); a get-in-position check requiring only the minimal subset; audio/haptic tick plus an animated counter on each rep; a subtle "paused: can't see hips" overlay rather than a modal; manual +1/-1 correction.

## 5. Ranked recommendations
1. Replace "full body visible" gates with per-exercise minimal landmark subsets (OR-groups, per-landmark visibility >= ~0.5 plus in-frame check) in the rules data; separate "unknown" from "form broken". Biggest fix for holds.
2. Hold timer with grace: accumulate while true; ride through <= 1.5-2 s unknown; pause up to ~5-8 s; reset only on confirmed break. Plank via shoulder-hip-ankle OR shoulder-hip-knee on the more visible side; wall sit via thigh-horizontal + torso-vertical.
3. Rep counter: two-threshold hysteresis with full cycle, min duration, refractory, min amplitude vs calibrated range, partial-rep band, skip invalid frames, reset after long gaps; thresholds per exercise in data.
4. Auto signal selection (2-4 candidates, sticky side by visibility, torso-normalized vertical displacement for front view) with self-calibrated range after the first reps.
5. One Euro on landmarks instead of EMA; light EMA on angles; angles in pixel or world space.
6. Instrument first: log visibility, signal, state, fps on a real mid-range Android and an iPhone; confirm `visibility`/`presence` are populated (issue 4479); build a landmark-recording replay harness to tune thresholds offline.
7. Runtime: stay on Pose Landmarker, Lite/Full via startup benchmark, GPU with CPU fallback, throttled 20-30 fps. No MoveNet migration unless benchmarks on target phones demand it.
8. UX: per-exercise framing tip and joint overlay, non-blocking "can't see X" prompt, never block start on full body, manual rep correction.
9. Later: autocorrelation tempo validator; k-NN only for exercises with no single angle (burpees, jacks) using Google's normalize + two-pass k-NN + probability EMA + enter/exit thresholds.

## Source index
- Pose classification/rep counting: https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/pose_classification.md ; https://developers.google.com/ml-kit/vision/pose-detection/classifying-poses
- Pose Landmarker: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker ; web: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- Visibility issue: https://github.com/google-ai-edge/mediapipe/issues/4479
- Rep counters: https://github.com/Bibas41/exercise-rep-counter ; https://github.com/Rebello16/ai-gym-exercise-form-analyzer
- RepNet: https://research.google/blog/repnet-counting-repetitions-in-videos/ ; https://arxiv.org/pdf/2006.15418
- Viewpoint-invariant: https://arxiv.org/pdf/2107.13760 (not parsed)
- PoseRAC: https://arxiv.org/pdf/2303.08450
- Autocorrelation/peaks: https://www.nature.com/articles/s41598-025-25674-1 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC12749503/
- Benchmarks: https://www.posetracker.com/news/best-pose-estimation-model-in-2026-the-real-time-mobile-guide ; https://blog.tensorflow.org/2021/05/next-generation-pose-detection-with-movenet-and-tensorflowjs.html
- One Euro: https://github.com/google-ai-edge/mediapipe/blob/63e679d99ca45b30514a9d84c9351a2d77bb9ba0/mediapipe/modules/pose_landmark/pose_landmark_filtering.pbtxt
- Plank example: https://github.com/Haimantika/plank-posture
- Commercial UX: https://www.t3.com/reviews/kemtai ; https://www.laptopmag.com/reviews/kemtai-adaptive-home-exercise-platform ; https://www.trustedreviews.com/news/peloton-guide-is-a-450-camera-thats-gunning-for-apple-fitness-plus-4178576
