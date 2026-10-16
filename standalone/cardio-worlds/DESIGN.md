# Cool Cardio — three worlds

Standalone design and playable art study, 16 October 2026. Branch `codex/cardio-worlds-1016`, snapshot base `d45e7d8` from the in-progress R-1017 integration. Recorded production base: `w/r1016 @ 0c4d4b2`, `https://myr5.mominc.online`, production version `ec2acab5`. This package changes no production entry points, build scripts, pose controls, accounts or workout XP. Merge after the other chat finishes. Recheck the latest live base before integration.

## Visual direction

The requested Sakana/Sakura/Sacramento reference is Little Boyfriend's **Sakura Crossing** pipeline. Reuse `sakura/post.js`, `quad.js`, `palette.js`: depth-curvature ink, lilac shadows, warm sunlight, restrained saturation, soft distance haze and FXAA. MIT attribution is included. Vendored Three.js matches that pipeline. No remote asset or CDN dependency.

The reference games are Temple Run's jungle-temple atmosphere and Subway Surfers' rail-yard language, viewed in first person. This prototype builds original geometry and layouts rather than using their game assets or logos. It is an art and mechanics study, not a completed recreation of either game.

Apply the same renderer to the **coach game** as well: keep Armie's existing identity, rig, animations and game rules; shade skin in warm cream, costume in muted violet, trim in gold, and silhouette in lavender ink. Use neutral light so facial expressions read on a phone. The lab's Coach view is a small geometric material/lighting study, not the final coach model. At integration, apply the pipeline to the existing maze/chase coach scene; do not re-enable the retired workout coach overlay.

## Route and level design

Each area is 600 metres at the existing constant 12 m/s. About 50 seconds running per area; transitions pause course distance. Subsequent circuits remix patterns and narrow timing, never demand a faster physical running pace. Always preserve one reachable safe route and at least 2 seconds of readable warning. Coin trails demonstrate it. No obstacle/power-up spawn in the final 45 m before a portal. A missed jump is a stumble, never an instant run-ending death.

| Area | Look | First 150 m | 150–360 m | 360–555 m | Exit |
| --- | --- | --- | --- | --- | --- |
| Crown Foundry | Purple enamel and gold metal, segmented floor, gilded ribs, machinery silhouettes, observation windows | Single-lane blocks, generous gaps | Alternate jump bars and overhead slide beams | Lane–jump–slide combinations | Gold runway frames an enormous purple aperture |
| Verdant Ruins | Carved sandstone arches, teal canopy, moss, hanging roots, ravine fog | Coins guide safe stone paths | Fallen lintels, roots, broken terraces | Alternating high/low routes and moving-stone timing | Temple iris opens onto violet space |
| Neon Transit | First-person subway, rails and sleepers, long turquoise cars, pastel buildings, wires and signage | Stationary cars establish lane silhouettes | Track barriers and overhead signals | Train gaps, ramps and rooftop coin arcs | Tunnel resolves into a suspended portal |

The playable study demonstrates repeated arches/buildings, coins, jump/slide obstacles, pickups and portals. Ravines, moving stones, ramps, rooftop traversal, moving train collision and animated machinery are specified production additions, not implemented geometry in this study. Decorative trains are not yet colliders. Final obstacle generation must join the existing runner's seeded safe-route generator instead of deploying the study's repeated layout.

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

The lab implements effects in state, coin collision, jump height, flight and hazard protection. The full character VFX listed here are production art direction; only the geometric coach shading study is present. Powers share consistent icons/names across worlds, with temple relic shells and transit gadget shells. Stacking changes separate systems; collecting the same timed power refreshes its timer rather than multiplying indefinitely. Portal entry always needs a deliberate jump even during flight/dash. No power buys exercise completion or increases XP.

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

## Verified standalone checks

- Five Node logic checks pass: gated portal/arrival unlock/loop; constant speed and shields; separate coin/score boosts and opt-in headstart; invalid inputs and lane clamps; phase/pogo/recovery/coin-tier behavior.
- Collaborative browser: Run and right steer respond; actual Jump button enters portal; wormhole arrives in jungle, then metro; unlock 2 survives reload and all replay buttons enable. Test advanced distance at the portal through the explicit lab debug surface.
- Render inspected at desktop 1280x800 and mobile CSS viewport 390x844; no horizontal overflow. This is browser emulation, not a physical-phone performance check. Software-WebGL ReadPixels stall warnings appear during screenshots; no app runtime exception after loading the finished files.
