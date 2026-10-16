# Cool Cardio — three worlds

Release candidate integrated into the actual Cool Cardio app on `codex/cardio-worlds-1016`, after merging the verified Release 34 base `codex/plank-flight-1016 @ 3c070b6`. Target: `https://myr5.mominc.online/pose`. Website Coach Armie has a separate Sakura update on `codex/armie-sakura-1016`, based on website main `cf0be546`, target `https://mominc.online/tv/?ch=armie`. Deployment is gated on Ian's requested independent Astra review.

Production runtime lives in `arcade/runner/worlds/` and uses the app's original MovementSession and pose input directly. It retains the actual canonical Coach Armie model, throw combat, stopping/catching behavior, workout ownership and XP finish path. The standalone remains a design sandbox, not a separate production game.

Current verification: 58 pure simulation/movement/regression tests pass; full production build and Wrangler dry run pass; actual-app Plank Flight regression passes after integration. Earlier treadmill and seven graphics-context/vault browser checks also passed. Final world portals, roof pickups, saved unlock and restart browser verification and independent review are recorded in the release handoff. Software-rendered desktop browser timings do not establish physical-phone camera accuracy or FPS.

Historical design revisions below describe the original isolated study; integrated behavior above supersedes older references to production being untouched.

## Revision 3: same jogging controls, traversable buses, working pickups

The standalone now uses `createPoseInput({Session:MovementSession})` from the other game's full app movement path, copied with its dependencies from R-1017 `fe7f124`. This includes alternating-knee jogging in place, head-bob treadmill fallback, lean left/right and the existing jump/slide/side-step recognizers with unchanged tuning. Source snapshots live under `tracking/app/`; the live app files are not edited.

Three authored metro bus routes have continuous approach ramps, roofs at 3.2 m, and descent ramps: centre lane 70?126 m, right lane 210?268 m, left lane 360?424 m. Run elevation follows these surfaces, raises the first-person camera, and filters ground hazards while on a roof. Side entry into a bus is blocked unless a high jump, phase or flight can reach it. Leaving a roof descends safely. Jump shoes support a high landing. The gold-edged ramps and coin trails show where to run up.

Buses have separate tyres/hubs, doors, window seals, lights, grille, trim, roof vents and roof-lane markings. Rendering also adds gradient skies, soft contact shadows, machinery gauges, deck markings, guardian carvings, fern clusters, sill/awning details and rooftop equipment. Sakura remains the shared ink and grading pipeline.

Pickups now live in the distance-crossing simulation instead of frame-dependent renderer hit tests. Every power in each area's kit appears on the authored course, with repeat opportunities and dedicated rooftop pickups. Powers have distinct 3D silhouettes and names: U-magnet, shield, winged relic, jetpack, shoes, hoverboard, phase rings, pogo stick, coins, score star and boost arrows. HUD timers plus first-person auras/board/shoes/jet/dash effects show active powers. There are no manual power activation buttons.

- Foundry kit: opening head start, magnet, shield, dash, jump shoes, recovery wings.
- Temple kit: magnet, phase, double coins, triple-value coins, recovery wings, shield, dash.
- Metro kit: jetpack, jump shoes, magnet, hoverboard, score multiplier, pogo launch.

Verification: 12 Node tests pass. This includes jogging with steady head/visible knees, the upper-body treadmill sequence, bus ascent/roof/descent, grounded side-entry prevention, jump-shoe roof landing, every area's pickup actually collected, effect activation and duplicate suppression, plus prior portal/unlock/power checks. Browser simulation from 69 m to 105 m reached roof height 3.2 m, collected 12 coins and activated jetpack. Renderer checked at desktop and 390 px mobile with no horizontal overflow or app errors. Camera capture remains unsupported in the collaborative browser; physical-phone tuning is not claimed.

## Revision 2: distinct architecture and motion-only play

Ian corrected the first study: the worlds read as the same level recoloured. Only the Sakura art treatment should be shared. This revision replaces the common corridor/arch geometry, adds procedural surface textures, and removes manual movement controls. Production code is still untouched.

- Foundry: curved gold ribs, cylindrical reactors, exposed pipes, giant toothed flywheels, elevated metal catwalk; spool and rotor hazards.
- Temple: irregular stone slabs over a ravine, stepped ziggurats, leaning carved guardian faces, exposed roots, branching canopy and rope edges; boulder and fallen-log hazards.
- Metro: six rails, gravel and wooden sleepers, a raised platform and curved canopy on one side, train storage and staggered urban buildings on the other; signal and track-barrier hazards.
- Original deterministic canvas textures cover brushed metal, engraved gold, cracked masonry, organic moss, bark/grain, chipped plaster and angular gravel. Textures remain inside the shared Sakura ink/grade pipeline.

## Visual direction

The requested Sakana/Sakura/Sacramento reference is Little Boyfriend's **Sakura Crossing** pipeline. Reuse `sakura/post.js`, `quad.js`, `palette.js`: depth-curvature ink, lilac shadows, warm sunlight, restrained saturation, soft distance haze and FXAA. MIT attribution is included. Vendored Three.js matches that pipeline. No remote asset or CDN dependency.

The reference games are Temple Run's jungle-temple atmosphere and Subway Surfers' rail-yard language, viewed in first person. This prototype builds original geometry and layouts rather than using their game assets or logos. It is an art and mechanics study, not a completed recreation of either game.

Apply the same renderer to the **coach game** as well: keep Armie's existing identity, rig, animations and game rules; shade skin in warm cream, costume in muted violet, trim in gold, and silhouette in lavender ink. Use neutral light so facial expressions read on a phone. The abandoned geometric coach study has been removed. Production applies Sakura to the existing Cool Cardio coach scene; the website update applies it to chase, maze, lab, intro and transparent coach overlays.

## Route and level design

Each area is 600 metres at the existing constant 12 m/s. About 50 seconds running per area; transitions pause course distance. Subsequent circuits remix patterns and narrow timing, never demand a faster physical running pace. Always preserve one reachable safe route and at least 2 seconds of readable warning. Coin trails demonstrate it. No obstacle/power-up spawn in the final 45 m before a portal. A missed jump is a stumble, never an instant run-ending death.

| Area | Look | First 150 m | 150–360 m | 360–555 m | Exit |
| --- | --- | --- | --- | --- | --- |
| Crown Foundry | Curved gold ribs, enamel cylinders, toothed flywheels, pipes and elevated catwalk | Single-lane blocks, generous gaps | Alternate jump bars and overhead slide beams | Lane–jump–slide combinations | Gold runway frames an enormous purple aperture |
| Verdant Ruins | Broken bridge slabs, stepped pyramids, guardian heads, branching canopy, rope and roots | Coins guide safe stone paths | Fallen lintels, roots, broken terraces | Alternating high/low routes and moving-stone timing | Temple iris opens onto violet space |
| Neon Transit | First-person subway, rails and sleepers, long turquoise cars, pastel buildings, wires and signage | Stationary cars establish lane silhouettes | Track barriers and overhead signals | Train gaps, ramps and rooftop coin arcs | Tunnel resolves into a suspended portal |

The playable study now demonstrates distinct architecture and themed hazard silhouettes, textured surfaces, coins, pickups and portals. Moving stones, moving train collision and animated machinery remain production additions. Bus ramps and rooftop traversal are implemented in revision 3. Decorative trains are not yet colliders. Final obstacle generation must join the existing runner's seeded safe-route generator instead of deploying the study's repeated layout.

## Portal choreography

At 470 m the portal becomes visible; clear the course by 555 m. At the end the player must jump to enter. Grounded contact waits at the gate; no auto-advance. A jump commits traversal and starts a 1.8-second violet wormhole. Keep camera direction stable, use depth rings and light streaks, then reveal the next world from its landing apron. Reduce motion to a static purple dissolve when requested. No shaking, rotating horizon or forced real-world forward jump. The gesture is the existing arms-up treadmill jump.

On **arrival**, persist the highest unlocked world and light its replay button. Start anywhere already unlocked, then continue the route. Reaching the metro exit loops into a harder foundry. Unlocking is permanent and never spends coins. This lab uses its own localStorage key; production must store the same maximum in the user's existing progression persistence and offline sync. Never grant workout completion from a debug shortcut or portal arrival.

## Abilities and character effects

| Ability | Gameplay | Character/readability |
| --- | --- | --- |
| Coin magnet · 12 s | Collect nearby lanes' coins | Teal magnetic arcs around hands; coins curve inward |
| Relic shield · 10 s | Absorb one hit | Gold/purple shell cracks once, then vanishes |
| Double coins · 15 s | Double coin value | Paired gold coin flashes; coin counter shows ×2 |
| Dash aura · 6 s | Auto-clear ordinary obstacles, keep constant physical pace | Violet streaks and forward light, no speed-dependent exercise demand |
| Jetpack · 8 s | Lift above hazards; gather an aerial coin line | Backpack jets, hands lower, gentle rise and landing |
| Jump shoes · 12 s | Longer floaty jump, 2.2 s hang time | Gold soles and a clear take-off pulse |
| Hoverboard · 15 s | Absorb one hit | Board under feet; shatters on contact |
| Head start · once at opening | Skip opening 150 m only | Portal glide; no exercise XP for skipped distance |
| Score ×2 · 15 s | Double arcade score only | Star above score counter |

The lab implements effects in course simulation, coin collection, jump height, flight and hazard protection, with first-person active-power art. The full character VFX listed here are production art direction; the geometric coach shading study remains a placeholder for the final coach asset. Powers share consistent icons/names across worlds, with temple relic shells and transit gadget shells. Stacking changes separate systems; collecting the same timed power refreshes its timer rather than multiplying indefinitely. Portal entry always needs a deliberate jump even during flight/dash. No power buys exercise completion or increases XP.

Reference inventory also includes Temple Run's invisibility/coin-value progression and consumable resurrection, plus Subway's pogo launch and opening boosters. Map invisibility to a phase aura (timed hazard bypass), coin-value progression to arcade coin tiers, and pogo to one automatic high launch. Resurrection should become a one-use stumble recovery because Cool Cardio hazards do not kill the run. These equivalents are included in the standalone state and try-power controls; production still needs their final character animation assets. The runnable set now also includes phase aura (8 s), pogo launch (one high jump plus a five-coin burst), recovery wings (30 s, absorbs one stumble) and triple-value coins (20 s). These use MYR5 timing and the same constant pace. Thematic variants such as mega head start use the same underlying opening-boost ability.

Sources checked: [Imangi's Temple Run description](https://imangistudios.com/thegames/temple-run/), [SYBO power-up support](https://sybo.helpshift.com/hc/en/5-subway-surfers/faq/209-power-ups/?p=android), [Temple Run reference inventory](https://templerun.fandom.com/wiki/Powerups). Durations and balance here are MYR5 design decisions.

## Merge contract

1. Merge/rebase onto the other chat's completed branch. Preserve R-1017 treadmill head-bob, arms-up floaty jump, lean steering, crouch and tuning knobs.
2. Move the pure world state into the existing runner. Adapt current lane indices (0/1/2) to lab lanes (-1/0/1). Feed existing pose actions; retain existing stop/catch behavior and XP ownership.
3. Let one active renderer own the scene. Apply Sakura post-processing inside that lifecycle; release depth targets, post materials and the WebGL context on exit. Current vault fixes must remain intact. Do not create a second renderer for the coach.
4. Replace repeated study obstacles with authored seeded chunks, including collider geometry for trains/ramps and verified safe routes. Retain the no-hazard portal runway.
5. Bridge coin/score state independently from `onXp`. Persist `max(oldUnlock,newUnlock)` through existing profile storage; resolve offline updates monotonically.
6. Verify start → steer → jump → slide → collect → portal → wormhole → next area → replay after reload, then runner exit → vault → runner restart. Check the same on Ian's physical phone before claiming phone verification.

Run locally: `python -m http.server 8876 --directory standalone/cardio-worlds`, then open `http://127.0.0.1:8876`. Run logic checks: `node --test standalone/cardio-worlds/worlds.test.mjs`.

## Motion-only standalone path

`tracking/app/` is copied from the app's R-1017 movement engine and runner pose module. `tracking/motion.mjs` calls the full shared input path, including knee steps, with its exported tuning unchanged. Enable motion tracking opens the front camera and runs the same locally vendored MediaPipe pose model (CPU delegate to avoid another graphics context).

- Natural head bob gates forward movement at constant 12 m/s.
- Both arms up plus shoulder lift trigger the floaty jump and portal entry.
- Crouch triggers slide; body lean changes lane.
- No head bob for the existing hold period pauses forward movement. Missing/stale landmarks stop movement; there is no automatic running fallback.
- The standalone removes keyboard/swipe listeners, directional/jump/slide buttons, debug action methods, power activation buttons and the portal shortcut. Camera start/stop and unlocked-world selection remain menu actions.
- Camera tracks and model close on stop, navigation, visibility change, error or startup cancellation. No frames upload to a service.
- In the eventual production merge, preserve the app's own pose event bus, stop/catch rules and workout XP; integrate the new art into that existing motion loop instead of adding a second camera pipeline.

## Verified standalone checks

- Twelve Node tests pass, including a landmark-driven treadmill integration sequence: standing stays at zero distance, head bob advances, lean steers, arms jump, crouch slides, stopping halts movement and missing landmarks invalidate tracking. Existing portal, unlock, power and constant-pace tests still pass.
- Real locally bundled MediaPipe WASM/model successfully created in the collaborative browser and processed a blank image (zero poses, as expected); the model closed afterward.
- Browser camera capture returned `Not supported` in this environment. Physical-camera recognition and phone tuning are NOT claimed. Camera failure leaves distance at zero with a retry message.
- All three revised worlds visually inspected. Mobile CSS viewport 390x844 has no horizontal overflow. There are zero manual movement buttons and zero power-activation buttons. No-keyboard/swipe source path verified.

Run locally: `python -m http.server 8876 --directory standalone/cardio-worlds`, then open `http://127.0.0.1:8876`. Phone camera requires an HTTPS origin (or localhost on that phone). Production integration will use the app's existing HTTPS camera path.
Run checks: `node --test standalone/cardio-worlds/worlds.test.mjs standalone/cardio-worlds/course.test.mjs standalone/cardio-worlds/tracking/motion.test.mjs`.
