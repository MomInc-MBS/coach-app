# Release 18 plan: meditation waterfall, pixel heads, customizer trim, catalog locks

Base: `w/release-18` @ 03284b2 (= R17 live). Worktree: `D:/myr5-work/release-18`. No deploy until Ian says go.
Reference images: `assets-inbox/r18/` (waterfall-reference.png is the meditation art direction and the starting background asset).

## Who does what

| Role | Model | Used for |
|---|---|---|
| Conductor | Claude (Opus) | briefs, diff review, pane checks at 375×812, integrate, coordination log |
| Coders (all lanes) | LM Studio local: qwen3.8-27b (big lanes A/F/G), devstral-small-2 (code), qwen3.6-35b-a3b, gpt-oss-20b (review) | each job is one small card with the source excerpt pasted in, sent to /v1/chat/completions; the model returns exact replace blocks |
| Runner | one Haiku agent | queues local jobs one at a time, applies the replace blocks, runs the lane's tests, and sends failures back to the model |
| Heavy reasoning | NVIDIA NIM (Kimi K2.6 / DeepSeek) | design and review of lanes A and G as soon as the key is reachable. The key is in Codex's MOM Inc station (part8, "NVIDIA NIM"), which is offline; the hub StarNet (:8787) has no NVIDIA provider |
| Problem solving only | Sonnet, then Fable | a lane that fails twice locally. The fixer writes a "Harness notes" lesson onto the card so the local models improve |

Local lanes run only when LM Studio is idle (no Codex/GPT jobs holding it).

## Lanes

### A. Meditation becomes a pixel waterfall scene (LOCAL)
Files: `meditation.mjs`, `breathing.mjs`, `breathing-modes.mjs`, `meditation.css`, `combat.mjs` (BREATHING_MS)
1. Full-screen pixel scene. A waterfall fills most of the frame (asset from the reference, upscaled with `image-rendering:pixelated`). The user's pixel (GalaAvatar) character sits on the rock in the bottom sixth, with water falling behind them.
2. The four-legged coach is a dark silhouette behind the waterfall. Water opacity is lowered so it shows through gently.
3. Remove the breathing circle. The scene starts desaturated, and colour spreads outward from the character in a circle (`clip-path: circle()` over a full-colour copy). Radius = completed breaths ÷ total breaths in the 3:00 script, so full colour arrives only with the last breath. Every breath counts.
4. Ending early: the four-legged monster leaps out through the waterfall (replaces `coach-lunge`/`smacked`), then the dialog closes.
5. Remove the standing pose: delete `.pose-choice`, `stagePose` and `meditationStanding`.
6. The seated warning becomes a full-scene overlay with an Accept button, and fades out on accept. After that the scene is clear apart from the guidance/encouragement speech bubbles, which also fade out after each line.
7. Move the counter lower.
8. Tests: update `meditation-*.test.mjs`. Add one unit check that the radius reaches 100% only at the final breath.

### B. Front camera uses the widest lens (LOCAL)
File: `camera.mjs`. Apply `widestZoom` (zoom = range.min) to the front camera too, not just the back. On iPhone Safari the front camera exposes a single lens, so this sets the widest zoom and keeps 640×480. Meditation adds no camera.

### C. Pixel heads show the real face, look at the user, and blink (LOCAL)
Files: `scoreboard.mjs` (`drawHead`, `renderCrew`), `modules/rooms/classroom.mjs` + `.css`
1. Bug: in the classroom chairs and on the whiteboard squares, "You" and the connected friend show "?" instead of their GalaAvatar head. Fix `drawHead` so a saved look always renders. "?" stays only for a friend with no avatar data.
2. Heads in the classroom face the user (front view).
3. Blink every 3–6 s (randomised per head), done by redrawing the eye rows closed for about 120 ms.

### D. Dock neon bar (LOCAL)
File: `modules/portal/portal.css` (+ `standalone-housing.css`). Put the neon bar along the top edge of the dock buttons, inside the metal housing, with higher opacity and a soft feather (layered box-shadow/blur). Same look on portal and standalone pages.

### E. Achievements level text (LOCAL)
File: `achievements-board.mjs` `showBoss` (L160–173). Each level line becomes exactly `Level N · <weapon name> · <pack type> Pack`. No status sentence, no `item.line` descriptions, no other rewards.

### F. Coach customizer trim (LOCAL)
Files: `creature/index.html`, `creature/source/editor-workbench.ts`, `viewer.ts`, `cage.ts`
1. Lock the coach in much closer (raise the camera target and shorten the distance; the coach fills about 80% of the preview height).
2. Add a zoom in/out slider bound to camera distance, within clamped limits.
3. Remove the Sparkle and Metallic sliders (keep stored values at 0 so old saves still load).
4. Remove the Motion tab.
5. Move the Coach (personality) tab into Reminders (`coach-hub.mjs`, next to Coach tone) and remove it from the customizer.
6. Files tab: replace the big download buttons with small download icon buttons.
7. Remove the war-room cage background and its bay buttons (Cage/Coach/Pets/Weapons/Mirror/Clothes, `cage.ts`) from the customizer. The customizer shows only the close-up coach on a plain backdrop (Ian, 2 Oct: the menu is the War Room's). The War Room page keeps its cage.
8. Remove all "unlocks at …" / "Preview only · unlocks at …" hint text. Locked items show only a lock.
9. Dropped: previewing the coach into the portal (not worth it).

### G. Catalog: free items, renames, colours, pack odds (LOCAL)
Files: `creator/materials-registry.ts`, `palettes.json`, `battle-pass-rewards.mjs` (`TEXTURE_SWAP`), `reward-packs.mjs`, `unlock-store.ts`, `assemble.ts`, `design.ts`
1. **Free textures (exactly these, plus Flat):** Reptilian, Baby, Clay, Speckled (was Peach), Fine Stripe (was Rope), Snake Skin (was Leather), Holey (was Cork; confirmed by Ian), Graph Paper (was Canvas Gi), Cool Graph Paper (was Mesh), Bamboo, Wiggles (was Sand Garden), Moss. Every other texture is pack-only.
2. **Free colours:** count every hex across `palettes.json`, `SIMPLE_COLORS` and `LEGACY_COLORS`. The 15 most frequent are free. Every other colour and palette is pack-only. The list is written into the registry as a literal array, so it never drifts.
3. **Three colour channels:** body (body, arms, feet, collar), head and eyes. The Colour tab shows three swatch rows. Unlocking a colour combo fills all three channels, which is what makes combos worth chasing.
4. **Pack odds (pinned by a test so they can't change silently):**

   | Pack | Colour | 64-bit | Texture |
   |---|---|---|---|
   | Uncommon | 90% | 7% | 3% |
   | Rare | 80% | 15% | 5% |
   | Legendary | 70% | 20% | 10% |

   Within a category the pick is uniform over items you don't own yet, then over everything if you own them all. Creature-skin collections stay 16 rare / 16 epic / 16 legendary.

### H. Grimoire CRT + 64 menu terminal (LOCAL)
Files: `modules/portal/portal.mjs` (L325, L360–363), `portal.css` (`.portal-menu*`), `creature/source/war-room-gala.ts` (LABELS L19–26)
1. The Grimoire settings sheet becomes an old CRT screen: dark curved glass, scanlines, slight glow, orange monospace text, titled "GRIMOIRE SETTINGS" (confirmed by Ian). Reuse the `settings-crt.*` scanline styles.
2. In the War Room bay menu (`war-room/`, screenshot assets-inbox/r18/war-room-now.png), remove the Room and Gala options. The remaining options render as orange terminal lines (`> PETS_`) inside a translucent hologram window.

### I. Camera: show the full picture, fewer joints per exercise (LOCAL)
Files: `camera-workout.css` (L5), `movement-rules.mjs`, `movement-engine.mjs` (L86 `required`)
1. Show the whole camera frame: `#cameraWorkout>video` uses `object-fit:contain` instead of `cover`. The MOM Inc housing and a dark backdrop fill the edges. The pose overlay must still line up with the video, so check the drawing code that maps landmarks to the screen.
2. Audit every exercise's required joints (`need` in movement-rules, `required` in movement-engine). Upper-body moves never require knees or ankles. Lower-body moves never require wrists or elbows. Core moves require only the shoulder and hip, plus the knee where the angle needs it. Keep the minimum set that still counts reps correctly, and add one test that pins each exercise's joint list.

Ian, 2 Oct: the War Room stays visually as it is. Only lane H's change applies there (Room and Gala removed, terminal/hologram menu style).

## Order
1. Post the R18 claim to `t3-coordination.ndjson` (no deploy).
2. The Haiku runner works the local queue in this order: E, D, B, H (small, builds confidence), then C, G, F, A (big; NVIDIA reviews A and G once reachable).
3. Sonnet, then Fable, on any lane that fails twice.
4. Integrate on w/release-18, run `npm test` plus the browser tests touched, and do a pane pass at 375×812.
5. Show Ian the screenshots. Deploy only on his go, then tell T3 the new base.
