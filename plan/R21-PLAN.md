# Release 21 plan

Base: R20 live @ 5bc228f. Branch: w/release-21 (D:/myr5-work/release-21).
Each lane works on its own branch off 5bc228f, then merges into w/release-21.
After the merge: `npm run build`, run the gate with concurrency 4 and solo re-runs of failures, run the e2e army on staging, and deploy only on Ian's go.

## Agent tiers

| Tier | Used for |
|---|---|
| **Haiku** | Mechanical edits, test updates, screenshot sweeps, coordination posts |
| **Sonnet** | Contained feature work in one or two files |
| **Opus** | Hard geometry, shaders and physics, and new boards |
| **Fable** | Design calls, merge, final review, visual QA judgement |
| **Kimi K3 (NVIDIA)** | Heavy read-only reasoning (root cause, algorithm design) and the e2e overseer. It keeps LM Studio free for the workout-tracking lane. |
| **Claude (conductor)** | Writes the briefs, reviews the diffs, checks the work at 375×812, and runs the deploy. It does not write feature code. |

## Lanes

### L1 Coach parts stay attached (Opus, with Kimi diagnosis first)
- **Root cause:**
  - Parts are rigid meshes on pivot groups (`creature/source/rig.ts:32-74`).
  - The head pivots at its own lowest point (`creator/assemble.ts:146-150`), or at a fixed .75 for MYR5.
  - The collar and neck stay on BodyMotion.
  - `motionSettings.amount=1.5` (`profile.ts:21`) multiplies every lean, so the head's bottom edge swings off the neck.
- **Fix:**
  - Put the head pivot at the real neck joint, which is the top of the body where it meets the head.
  - Sink the head 2–4% into the body, or grow a neck skirt that is welded to both parts.
  - Do the same for the feet.
  - If needed, clamp the head angles.
- **Check (Haiku):** a screenshot sweep of all 71 bodies at max lean (`listening`, `thinking`, `laugh`) proves there is no visible gap.

### L2 Portal feather on every screen (Sonnet)
- **Corners:** `rimMask`/`showAura` (`modules/portal/portal.mjs:771-835`) strokes a glow up to 66 px that spills over the 15 px rail and the corner bolts, because `.portal-aura` sits at z-index 2 over the frame. Clamp it to the board face the way the full-screen path already does (`:787`).
- **Feather:** make the inward vignette wider (it fades across about 25–35% of the face, not 36 px) and lower its opacity, so the portal reads as a portal but doesn't block the view.
- **Scope:** the home oval, the full-screen faces, the War Room/standalone housing (`portal-look.mjs`), Meditation and the Menu sheet.

### L3 Cogs board: gears spin again, plus a two-tone tint (Sonnet)
- **Spin:**
  - Find why the idle motor stopped (`portal-board-cogs.mjs:596`, `hubIdleAccel` at `:81`; render only continues while `step()` returns true in `portal-board-glb.mjs:209`).
  - Add a test that the hub angles advance with no touch.
- **Colour:**
  - `portal-board-glb.mjs:260-265` sets `uBoardTint` to the same hex that `setCogsTint` uses, which is why the door and the cogs are both red.
  - Give the cogs board a derived second tone: the door in a darker, desaturated complement and the parts in the picked colour. The welding trail and lights stay as they are.

### L4 Water grimoire (Opus builds; Fable signs off the design; Kimi drafts the fish algorithm)
- **New board `pond`**, registered in every place a board id appears:
  - `portal.mjs` imports and BOARDS/PRODUCTION_PORTALS/FACE/WAIT
  - `portal-look.mjs` BOARD_CHOICES
  - `portal-board-pond.mjs`, `portal-tunnel-pond.mjs` and its palette
  - the poster webp
  - `offline-assets.mjs` TUNNELS/GRIMOIRE_ART
  - `post-download.mjs` sections
  - `sw.js` / `release-build.mjs` asset lists
- **Water:**
  - A square pond of murky, brackish blue-green water with a dark depth.
  - The surface uses the existing Apple glass refraction (`GLASS`/`lensMap`/`tunnelFragment`, `portal.mjs:27,1397,1412`) plus a ripple height-field that responds to the finger.
- **Lilies and pads:**
  - Small instanced 3D pads; 50–100 laid side by side would fill the screen.
  - Lily flowers sit on some of the pads.
  - **Anchor lilies** sit on every base and apex of every template in `portal-shapes.mjs` (the rect corners, the oval's points, the triangle and diamond vertices, the line ends), so the shapes read from the lilies. They stay still.
  - Free pads and lilies drift gently and get pushed aside by the finger and by ripples.
- **Koi shadows:**
  - Dark, blurred koi silhouettes under the surface.
  - With no touch they wander in random boid paths.
  - On touch they are slowly drawn toward the finger and arrive face first, underneath it.
  - While you draw, they follow the trail as a snaking school that grows as more fish join.
  - **15 s with no touch:** every fish scatters off-screen, then one huge koi shadow drifts slowly across in a random direction, and then the fish return.
- **Rules carried over:** marks fade and the board resets after 7 s, the hint shapes glow faintly, and `cut`/`heal` behave like the other boards.
- **Assets:** lilies and pads are procedural low-poly meshes (no Tripo wait). The koi is a 2D silhouette texture.

### L5 Portal timings ×⅔ (Haiku)
- `PORTAL` at `portal.mjs:23` changes as follows:

  | Knob | R20 | R21 |
  |---|---|---|
  | cutMs | 1300 | 867 |
  | loadMinMs | 3500 | 2333 |
  | revealMs | 1100 | 733 |
  | healMs | 400 | 267 |
  | rippleMs | 900 | 600 |

- `short` stays a ratio.
- Update `tests/portal-glass.test.mjs:34`.

### L6 Remove the around-the-head eye layouts (Haiku)
- Remove `frontBack` (2 eyes, front and back) and `around` (3-eye ring) from `EYE_LAYOUTS` (`creator/eye-layouts.ts`).
- There is no 4-eye ring today, so there is nothing to remove for 4.
- **Migration:** add a key map in `parseRecipe` (`design.ts:43`) **before** the validity check, so saved coaches aren't rejected: `around`→`triangle`, `frontBack`→`horizontal`.
- Rebuild `creature/assets`.

### L7 64-bit coaches for the War Room (Sonnet pipeline; Fable art review; Haiku wiring)
- **Pipeline:** Blender headless renders each of the 71 coach GLBs (`creature/models/myr5.glb` plus `roster/*.glb`) front-on and orthographic at 64×96. Then it reduces the palette, adds a 1 px outline, and writes a sprite sheet and a JSON manifest.
- **Recolour:** sprites are drawn in grey ramps so the coach's body/head/eyes colours can recolour them.
- **War Room:** add a "Coach" body category to the Gala creator (`pod/gala-avatar.js`, `creature/source/war-room-gala.ts`).
  - Each coach shape is locked until that coach body is unlocked. It reuses the body unlock store (`track-placements.ts` / `unlock-ledger.mjs`).
  - A locked shape shows as a silhouette.
- **Four-legged coaches become pets (Ian, 3 Oct):** the 10 coaches in the Four-legged family do not become body shapes. Their 64-bit sprites go into the War Room `pet` section (`pod/gala-avatar.js`, pets drawn beside the avatar), in a new "Coach pets" group.
  - Each one unlocks with its coach body, like the other shapes.
  - They are drawn at pet scale. The pipeline renders them side-on, not front-on, so the four legs read.
  - The other 61 coaches stay body shapes.
- **Review:** Fable rejects any sprite that doesn't read at 1×, and the pipeline re-renders those with tuned camera and lighting.

### L8 Coach ship can be swapped and coloured in the Species menu (Sonnet)
- **Ships:** there are 6 GLBs (analytical, calm, direct, mom, playful, supportive). Today the ship follows the coach's personality (`modules/ships/*`, `creature/source/ship-preview.ts`).
- **Species tab:** add a ship row with a picker of the 6 and a colour toggle that uses the R20 grouped colour grid.
- **Saving:** save `shipId` and `shipColor` in the recipe, with defaults equal to today's behaviour; `parseRecipe` gets the default.
- **Where the choice applies:** the home portal ship, the summon scene and ship-view all read the saved choice.

### L9 XP: abilities unlock by level (decided with Ian, 3 Oct)
- **One global player level.** Every workout feeds one XP bar.
- **XP earned:** a day bonus plus XP per set. The defaults are 100 XP per active day and 10 XP per logged set. Kimi tunes these against the curve.
- **21 levels.** Level N unlocks weapon tier N (Field … Antimatter) for **all** weapons. This replaces the per-muscle days/XP gate in `pod/gala-weapons.js:5-10`.
- **Curve:** fast at the start, slow later.
  - Level 2 within the first one or two sessions.
  - Level 21 after roughly a year of steady training.
  - Kimi drafts the XP table; Fable checks it against real session data.
- **Reset everyone** to level 1. There is no grandfathering, the same as R18.
- **Unchanged:**
  - Specials stay at weapon tier 4/8/12/16/20 (`weapon-evolution.mjs:26`), so they now follow level indirectly.
  - Second weapon and pet stay on the battle-pass combat level (`combat-config.mjs`).
- **UI:** the War Room upgrade list shows "Charged · Level 2" instead of "200 Shoulders XP" (`pod/rest-arena.mjs:29-32`). It also gets a level/XP bar.
- **Work split:** Sonnet implements it (one `player-level.mjs` with the XP table and the level function, used by `gala-weapons.js`). Haiku updates the strings and tests.

## Order and parallelism
1. **First wave, in parallel:** L5 and L6 (Haiku); L2, L3 and L8 (Sonnet); L1 (Kimi diagnosis, then Opus); L7 pipeline (Sonnet).
2. **Second wave:** L4. Opus starts at once and is the longest lane; Fable reviews the first build at 375×812.
3. **Third wave:** L9 after the interview, then L7 War Room wiring.
4. **Release:** Fable merges into w/release-21, then `npm run build`, the gate, e2e on staging, and Ian's go.

## Open questions for Ian
- **L7:** should coach shapes unlock in the War Room when that coach body is unlocked in the customizer (the default), or on their own schedule?


## Codex integration checkpoint (2026-10-04)

Candidate owner: `codex/r21-takeover-integration` in `D:/myr5-work/r21-codex-integration`. Original lane worktrees remain separate.

- L2 approval retained at `4325c4e`; War Room and Menu were recaptured at 375x812 after the final glow change.
- All nine R21 lanes are integrated. L1 source and all-71-body seam coverage were recovered in `49bf69b`; functional War Room coach/pet sprites and the manufactured Cogs return seam fix landed in `f244e36`.
- Ian's expanded mechanical brief supersedes the earlier derived-tone L3 scope: reuse existing gear models, one interconnected drive along every shared shape, sectioned metal apertures, a weld cooling in half the prior time, and independently selectable mechanism and back wall colors. Mechanical source: `5bf9ac0`.
- War Room coach and pet choices follow existing coach-body ownership; accepted atlas contents are 58 bodies and nine pets. Four rejected sprites stay unavailable.
- Workout branch merged once as `8d35a5c`, including counting dependency `310ccac`, implementation `3a092ab`, and documentation follow-ups through `70697b1`. No generated workout outputs were copied. Shared acknowledgement: `D:/myr5-work/R21-WORKOUT-COORDINATION.md`.
- Post-merge focused workout checks: 124/124 passed. Combined gate: 1,564 passed, 17 failed, two skipped. All 17 failures subsequently passed in focused reruns after test-fixture/expectation repairs; this is not a fresh zero-failure concurrent run. Repairs cover approved console geometry, completed transitions, verified account state, deterministic partial download, current mechanical materials/bearings, and thin glow sampling.
- Clean production rebuild passed: 191 core files, 7,369,472 bytes within the 8 MiB budget; 1,775 static files within Workers limits. Build ID: `cc149ce6c316b8dbced0`.
- Actual phone inference throughput, low-sampling accuracy and ambiguous cropped holds still require device testing. Preserve the workout research limitations and hold-policy questions.
- Staging review follows this checkpoint. Production deployment still requires Ian's go.
