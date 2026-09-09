# MYR5 training pod

Refresh http://localhost:8816/pose.html in Chrome on the Pixel. The page now opens to **PERSONAL CONTAINMENT**, with your animated coach in the pod. The local server and Wi-Fi forwarding must stay running. Front camera is the default so you can see the screen.

## The new app loop

1. Choose a movement below your coach. Open the top-right **Pod controls** button to change the set goal, rest duration, camera, voice or coach ability.
2. **Begin set** plays that movement's hologram introduction, then opens the camera. The main counter shows progress toward the selected goal.
3. Reaching the goal closes the camera and tracker, awards workout progress and opens the full-screen rest chamber. The same custom coach becomes large, with your Gala character on the floating platform in front.
4. Tap the coach to animate attacks during rest. At early levels they cause **zero damage**. These taps never award workout XP.
5. When recovery finishes, **Next set** opens the next demonstration. You can add 30 seconds or return to the pod at any time.

**Try the rest screen immediately:** Pod controls → Visit rest chamber. This preview does not award workout progress.

The current defaults are 10 squats, 10 push-ups, 30 seconds of matched yoga hold, a 60-second boxing round, 40 jogging steps, or 10 jumps. Yoga accumulates recognized hold time across pauses. Boxing awards XP only if some hand movement was observed. These are adjustable prototype targets.

Completed sets award 25 XP; 100 XP advances one level. Damage currently unlocks at **workout level 50**, starting at one point per attack. This is an initial game balance value, not a fitness assessment. Progress is saved in this browser on this device. Account synchronization, game-based access, referral unlocks and tamper-resistant progression are not implemented in this local prototype.

## Your finished coach and Gala character

The pod uses the completed creature renderer and saved custom recipe. **Customize** opens the existing creature editor. The same renderer moves between the pod and rest scene, so both use the same appearance. Ready, counting, tracking corrections, encouragement, speech and completed sets trigger the installed animations. No duplicate coach renderer is created for the rest screen.

The rest chamber currently offers Shield, Ember, Arc and Frost in Pod controls. They change the barrier effect and attack feedback. This first ability choice is saved separately from the creature's appearance recipe; it is not yet an ability editor inside the creature creator.

The character renderer is copied from the current Join Gala build and preserves all 17 wardrobe categories. To bring your actual character into the local phone test:

1. Open your live **Join Gala** game and choose **Export look**.
2. In the pod, tap **Bring your Gala character** → **Import Gala look** and choose that JSON file.

The live website and localhost use separate browser storage, so the local app cannot automatically read the live game's saved character. It automatically recognizes the Gala appearance if the same `mominc-avatar-v1` record is already present on its own origin. Until then, it explicitly shows a guest preview. Importing an appearance cannot import workout XP or levels.

## What is ready to try

Feet are optional in all eight modes. This removes the previous foot-visibility gate; it does not expand the camera's real field of view. Keep the phone propped still, particularly for squat and jump estimates.

| Movement | What must be visible | What is counted |
|---|---|---|
| Squats | A shoulder and hip on one side | Hip down/up cycles; optional knee readings never block the counter |
| Push-ups | Shoulder, elbow, hand and hip on one side; camera beside you | Arm down/up cycles from an extended start |
| Tree pose | Shoulders, hips and knees | Estimated hold from the raised upper-leg shape |
| Warrior II | Arms, hips and knees | Estimated hold from arm and upper-leg shape |
| Horse stance | Shoulders, hips and knees | Estimated hold from the wide upper-leg shape |
| Air boxing | Shoulder, elbow, hand and hip on one side | Round time and relative hand pace; no accuracy score |
| Jogging in place | Shoulders, hips and both knees | Alternating knee lifts and cadence |
| Jumping | Shoulder and hip on one side | Estimated body-rise/return cycles; foot contact is not verified |

The tracker still pauses if the joints actually needed for that movement are missing or unclear. A visible skeleton can include uncertain inferred positions. Green points meet the visibility gate; orange points are uncertain. Squats, push-ups and jumping establish a steady starting position before counting. Calibration works with continuous tracking at two, three and five updates per second in simulated tests. Rapid real motion still needs adequate frame sampling.

## Hologram introductions

Every Start opens an animated example, speaks its instructions and then starts camera tracking. The introduction stays for at least eight seconds and waits for narration to finish. Start now skips the remainder after the example has loaded. Back, Close, pausing the animation, or hiding the page cancels the automatic start.

All eight movements have View hologram buttons. Squat and push-up use your existing animated GLBs. The other six use small procedural 3D teaching figures. Drag inside the model frame to rotate it; use touch zoom or the +/− buttons. Menu cards remain fixed and readable. The examples illustrate the intended motion; they are not individualized technique assessments.

## Spoken controls

Voice defaults on with a deliberately basic robot sound. The existing eSpeak NG engine on the PC produces English speech at about **125 words per minute**, with moderate pitch variation to restore sentence stress and shorter gaps between words. This September 9 adjustment targets easier understanding while retaining the synthetic timbre. Open Pod controls → **Test voice** to judge the result on your phone. Every selection, introduction, count and timer call uses this profile. The existing MOM INC. Isabella/Lewis voice mix remains separate.

Only the phrase being spoken is generated. Repeated phrases are cached in memory on the PC and phone, up to 12 MB on each. No language model, GPU or paid voice service is used. If the local speech endpoint is unavailable, the app uses a moderately slower phone voice at its normal pitch and labels it as a fallback. That fallback's sound and offline availability depend on the phone's speech engine. New robot phrases require the local PC connection. Refresh an already-open app after a voice update to clear its old phrase cache.

Selections, introductions, ready/stop/reset, rep counts, tracking interruptions and recovery, hold milestones, and timed-round milestones are spoken. Fixed rounds announce 60, 30, 10 and the final five seconds when those boundaries are crossed. Long open sessions get periodic time cues. Speech is event-driven. Old queued numbers are replaced with the current count if motion is faster than speech, to avoid calling stale reps long afterward. Captions remain visible when Voice is off.

Live encouragement uses short lines such as “Steady work,” “Find your rhythm” and “Halfway. Keep your own pace.” It responds to set progress and recurs about every 20 seconds during recognized activity. It stays quiet when required joints are missing, calibration is incomplete, or a yoga pose is unmatched. Counts, timer calls and tracking guidance take priority over encouragement. Yoga set countdowns use accumulated matched time; recovery announces when its timer finishes. This uses small event rules and the existing robot voice, with no language model or GPU inference.

## Exercise gestures

Open Movement library, then Enable exercise gestures. Gesture recognition is a prototype to tune on the Pixel. Touch selection remains available.

| Exercise proposal | Gesture |
|---|---|
| Push-ups | Raise one arm and point at its upper arm with your other index finger |
| Squats | Hands on hips |
| Tree | Hands together overhead |
| Warrior II | Arms stretched out in a T |
| Horse | Hands together at your chest |
| Boxing | Two fists near your shoulders |
| Jogging | Alternate arm pumps four times |
| Jumping | Hands raised apart |

Hold the exercise gesture briefly until the coach proposes it. Then hold a thumbs-up continuously for **1.4 seconds**. A progress bar shows confirmation. Releasing or losing the hand resets that hold. An unconfirmed suggestion expires after 12 seconds. Thumbs-up by itself cannot start an exercise. Confirmation leads to its hologram introduction and then camera tracking.

This replaces cursor pointing and pinching in the active menu. The optional menu loads a small body tracker and a two-hand tracker; both close before the workout tracker starts. Workout gestures do not change exercise selection during a set. Stopping an open-ended workout or reopening the library still uses touch.

## First phone check

1. Refresh the page and confirm the containment pod appears. Leave Front camera selected. Set a five-rep squat goal in Pod controls.
2. Begin set. Watch the example and listen for the setup and Ready cues.
3. Keep shoulders and hips visible with your feet outside the picture. Stand still briefly, then do five comfortable squats. Compare the displayed/spoken count with your count.
4. Confirm the fifth recognized squat opens the rest chamber, the camera closes and +25 XP appears. Try tapping the coach and confirm zero damage at level 1.
5. Add 30 seconds of rest, or wait for Next set to become available. Confirm it opens the hologram introduction.
6. Check one 60-second boxing round for encouragement, the 30-second call and final countdown. Check that moving out of view pauses appropriate counting and cues. Do not alter your movement to chase prototype thresholds.
7. Open Examples and try the arm-pointing proposal followed by a held thumbs-up.

The latest pass has **50 passing movement, spoken-cue, set-flow and Gala integration checks**. It includes cropped-feet squat sequences reaching the rest phase, exactly-once XP, the level-50 damage boundary, rest extensions, voice priority and timed yoga cues. The pod, rest encounter, zero-damage attack, timer completion, next-set demonstration and Gala import screen were checked in the browser at 412 × 840. All eight holograms were verified in the earlier pass. Actual exercise accuracy, encouragement timing on your Pixel, sustained performance and battery usage still need the live phone check.

## Local connection and resources

The server serves this folder at PC localhost port 8816. Android wireless debugging forwards phone localhost:8816 to it. Both devices use the same Wi-Fi. If forwarding drops, enable Wireless debugging on the Pixel and reconnect; pairing and connection ports can differ. The private Platform Tools copy in this task uses PC ADB port 5041. USB debugging plus Chrome port forwarding is also supported. [Android Wi-Fi debugging](https://developer.android.com/tools/adb#connect-to-a-device-over-wi-fi), [Chrome port forwarding](https://developer.chrome.com/docs/devtools/remote-debugging/local-server).

The browser downloads pinned MediaPipe and Three.js dependencies on first use; this is not yet an offline-installed app. Pose inference runs on the phone's CPU. The finished coach uses the phone's graphics renderer and pauses rendering when hidden, including while the movement library covers the pod. Exercise holograms load only when viewed and are disposed on exit. Stop, set completion and page hiding close the exercise tracker and camera. No language model or RTX GPU is needed for these counting and menu functions.

The finished creature bundle and existing exercise holograms currently include different Three.js versions. They use separate scenes and both rendered in browser checks, but opening a hologram can produce a duplicate-library warning. Consolidating those dependencies is a remaining phone memory optimization.

Camera frames and body coordinates stay in the browser. Spoken cue text, including exercise names and count numbers, is sent to the local PC's /speech endpoint to generate robot audio; phrases/audio are cached in memory and are not written to disk or sent to a cloud service. The local /camera-info diagnostic receives camera labels, dimensions and zoom settings, keeps the latest report in server memory for up to five minutes, and writes nothing to disk. The allowlisted local server does not expose the vault or write to the ship board.

Front-camera video was verified at 480 × 640 in the prior live check. Chrome exposes front and back cameras at minimum zoom 1× on this Pixel. Native Android metadata advertises a rear minimum near 0.556×, but a native ultrawide implementation has not been built. Feet-optional counting lets the current front-camera test proceed without it. Camera warping cannot create scene content beyond the lens's captured picture.

The app adaptation retains Barehands' AGPL-3.0-or-later license. Robot speech calls the separately installed eSpeak NG executable; the speech engine is not bundled here. Your original D:\MOM Rig\barehands-myr5-ship files remain unchanged. The two existing GLB assets are not relicensed here; their production redistribution provenance still needs verification.
