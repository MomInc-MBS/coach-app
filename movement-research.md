# MYR5 Coach movement library

56 variations in 10 focus groups. The dial selects the group, and a single slider selects a suggested progression within it. Left/right choices occupy adjacent positions at the same practical difficulty. Difficulty is a suggested ordering, not a personalized assessment.

## What is actually tracked

The existing on-device MediaPipe Pose Landmarker estimates image and world coordinates. Coach uses shoulders, elbows, wrists, hips and knees. All ankle, heel and toe points are discarded before feature extraction, including old saved workout modes. Camera overlays stop at the knees. The underlying general-purpose model still estimates its complete pose internally; the app never uses or displays its foot output.

Rules count coarse movement cycles, estimate broad held shapes, or time visible hand activity. A chosen variation describes what the user intends to do; support height, floor contact, hand shape, force, balance and safe technique are not verified. No claim of validated accuracy across all variations is made. The new rules need real-camera evaluation on varied bodies, clothing, lighting and camera placements before they can be called confidently validated.

## Open-source foundations and candidates

| Project | Role and license | Decision |
|---|---|---|
| [MediaPipe](https://github.com/google-ai-edge/mediapipe) | Apache-2.0 code; [Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker) supplies image and 3D world estimates | Retained existing lightweight on-device model; original AGPL movement recipes added |
| [TensorFlow.js pose detection](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection) | Apache-2.0 repository; browser pose APIs | Alternative runtime, not an independent exercise accuracy guarantee |
| [MMPose](https://github.com/open-mmlab/mmpose) | Apache-2.0 code; broad pose research toolbox | Research/evaluation candidate; model and dataset terms must be checked separately |
| [Yoga Pose Classification and Skeletonization](https://github.com/shub-garg/Yoga-Pose-Classification-and-Skeletonization) | MIT example code | Yoga research candidate; its published examples do not validate this app |
| [CustomPose Classification Mediapipe](https://github.com/naseemap47/CustomPose-Classification-Mediapipe) | MIT example code | Classification workflow candidate, not imported |
| [Sports2D](https://github.com/davidpagnon/Sports2D) | BSD-3-Clause; 2D kinematic analysis | Offline evaluation candidate, not a 3D browser exercise classifier |
| [FreeMoCap](https://github.com/freemocap/freemocap) | AGPL-3.0; multi-camera motion capture | Possible reference capture for validation, requires more hardware |
| [OpenPose license](https://github.com/CMU-Perceptual-Computing-Lab/openpose/blob/master/LICENSE) | Noncommercial/research restrictions | Not treated as unrestricted open source for incorporation |

The original recipes borrow no exercise implementation from those candidate repositories. Open-source code availability does not establish safe exercise technique or tracking accuracy. [MediaPipe’s classification guidance](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/pose_classification.md) supports evaluating terminal poses across varied viewpoints and using temporal smoothing; robust data collection remains necessary here.

## Included library

### Chest

1. **Knee push-up** — Repetitions. Counts elbow bend and return. Hand shape, support stability and chest depth are not verified.
2. **High incline push-up** — Repetitions. Counts elbow bend and return. Hand shape, support stability and chest depth are not verified.
3. **Low incline push-up** — Repetitions. Counts elbow bend and return. Hand shape, support stability and chest depth are not verified.
4. **Regular push-up** — Repetitions. Counts elbow bend and return. Hand shape, support stability and chest depth are not verified.
5. **Wide push-up** — Repetitions. Counts elbow bend and return. Hand shape, support stability and chest depth are not verified.
6. **Slow push-up** — Repetitions. Counts elbow bend and return. Hand shape, support stability and chest depth are not verified.
7. **Diamond push-up** — Repetitions. Counts elbow bend and return. Hand shape, support stability and chest depth are not verified.
8. **Feet-elevated push-up** — Repetitions. Counts elbow bend and return. Hand shape, support stability and chest depth are not verified.

### Legs

1. **Shallow squat** — Repetitions. Counts the visible movement; does not grade technique.
2. **Bodyweight squat** — Repetitions. Counts the visible movement; does not grade technique.
3. **Wide squat** — Repetitions. Counts the visible movement; does not grade technique.
4. **Pause squat** — Repetitions. Counts the visible movement; does not grade technique.
5. **Slow squat** — Repetitions. Counts the visible movement; does not grade technique.
6. **Split squat · left** — Repetitions. Counts the visible movement; does not grade technique.
7. **Split squat · right** — Repetitions. Counts the visible movement; does not grade technique.

### Hips & glutes

1. **Small hip hinge** — Repetitions. Tracks hip movement. Back curvature and muscle engagement are not verified.
2. **Hip hinge** — Repetitions. Tracks hip movement. Back curvature and muscle engagement are not verified.
3. **Bodyweight good morning** — Repetitions. Tracks hip movement. Back curvature and muscle engagement are not verified.
4. **Glute bridge** — Repetitions. Tracks hip movement. Back curvature and muscle engagement are not verified.
5. **Pause glute bridge** — Repetitions. Tracks hip movement. Back curvature and muscle engagement are not verified.

### Core

1. **Knee plank** — Pose hold. Times the shoulder–hip–knee line. Feet, floor contact and loading are not tracked.
2. **High plank** — Pose hold. Times the shoulder–hip–knee line. Feet, floor contact and loading are not tracked.
3. **Forearm plank** — Pose hold. Times the shoulder–hip–knee line. Feet, floor contact and loading are not tracked.
4. **Side knee plank · left** — Pose hold. Times the shoulder–hip–knee line. Feet, floor contact and loading are not tracked.
5. **Side knee plank · right** — Pose hold. Times the shoulder–hip–knee line. Feet, floor contact and loading are not tracked.
6. **Side plank · left** — Pose hold. Times the shoulder–hip–knee line. Feet, floor contact and loading are not tracked.
7. **Side plank · right** — Pose hold. Times the shoulder–hip–knee line. Feet, floor contact and loading are not tracked.

### Shoulders

1. **Front arm raise** — Repetitions. Counts the visible movement; does not grade technique.
2. **Lateral arm raise** — Repetitions. Counts the visible movement; does not grade technique.
3. **Overhead reach** — Repetitions. Counts the visible movement; does not grade technique.
4. **Standing arm press** — Repetitions. Counts the visible movement; does not grade technique.
5. **Slow arm press** — Repetitions. Counts the visible movement; does not grade technique.

### Balance

1. **Knee-lift balance** — Pose hold. Times the visible leg shape. Balance, foot pressure and support use are not verified.
2. **Low tree pose** — Pose hold. Times the visible leg shape. Balance, foot pressure and support use are not verified.
3. **Tree pose** — Pose hold. Times the visible leg shape. Balance, foot pressure and support use are not verified.
4. **Tree · arms overhead** — Pose hold. Times the visible leg shape. Balance, foot pressure and support use are not verified.

### Yoga

1. **Mountain** — Pose hold. Times broad pose shape. Foot rotation and joint alignment are not graded.
2. **Upward salute** — Pose hold. Times broad pose shape. Foot rotation and joint alignment are not graded.
3. **Chair pose** — Pose hold. Times broad pose shape. Foot rotation and joint alignment are not graded.
4. **Warrior I** — Pose hold. Times broad pose shape. Foot rotation and joint alignment are not graded.
5. **Warrior II** — Pose hold. Times broad pose shape. Foot rotation and joint alignment are not graded.
6. **Goddess pose** — Pose hold. Times broad pose shape. Foot rotation and joint alignment are not graded.

### Martial stances

1. **High horse stance** — Pose hold. Times stance shape only. This is not martial-arts technique instruction.
2. **Horse stance** — Pose hold. Times stance shape only. This is not martial-arts technique instruction.
3. **Lower horse stance** — Pose hold. Times stance shape only. This is not martial-arts technique instruction.
4. **Front stance · left** — Pose hold. Times stance shape only. This is not martial-arts technique instruction.
5. **Front stance · right** — Pose hold. Times stance shape only. This is not martial-arts technique instruction.

### Boxing

1. **Left straight practice** — Active hand time. Tracks active hand time and relative pace. Punch type, power, accuracy and guard are not verified.
2. **Right straight practice** — Active hand time. Tracks active hand time and relative pace. Punch type, power, accuracy and guard are not verified.
3. **Alternating straights** — Active hand time. Tracks active hand time and relative pace. Punch type, power, accuracy and guard are not verified.
4. **Double-jab practice** — Active hand time. Tracks active hand time and relative pace. Punch type, power, accuracy and guard are not verified.

### Cardio

1. **Easy march** — Knee lifts. Counts knee lifts. Footfalls and impact are not verified.
2. **High-knee march** — Knee lifts. Counts knee lifts. Footfalls and impact are not verified.
3. **Jog in place** — Knee lifts. Counts knee lifts. Footfalls and impact are not verified.
4. **Step jack** — Repetitions. Counts arm-and-knee opening cycles. Feet, airtime and landings are not tracked.
5. **Jumping jack** — Repetitions. Counts arm-and-knee opening cycles. Feet, airtime and landings are not tracked.

## Validation completed

Automated tests cover repetition cycles, hold pauses, visibility and frame gaps, account isolation, duration guards, and identical outputs with absent/hidden/moving feet across all 56 recipes. Existing app checks also pass. Synthetic fixtures establish rule behavior, not real-camera accuracy or medical safety. The schematic examples are illustrations, not motion-capture reference instruction.

## Not included

Kicks, footwork, pivots, jump/landing technique, inversions, acrobatics, loaded lifting and sparring are excluded from the new catalogue because the app cannot verify their critical contact or technique with this setup. Jumping-jack mode counts arm/knee opening cycles only. Boxing times hand activity and never claims to recognize a jab combination or punch quality.
