# L7 inventory: old cogs door (9131e78) vs current mechanical door (portal-board-cogs.mjs, a0aac9b)

## Old door (9131e78, 661 lines)
- Painted slab `door.glb` (Ian's art, 1024x1792, neon portal lines + painted hubs baked in); `guide:null`, `frame` = painted-art rect
- Kit parts from `parts-kit.glb`, placed by `door-layout.json` (216 entries): 23 gears (trains via `drives`, lower-left cluster), 46 lights, 44 pipes, 61 screws, 36 plates, 6 valves; one Mesh per entry, z-stacked by `layer`
- Gear physics: `applyTorque/stepTrain/hitGear` (shared train momentum, friction, MAX_OMEGA), tap = TAP_IMPULSE
- Valves idle-follow the train while it or a finger is active (`valveAngle`)
- Lights dark until a finger is within `lightRadius`, ramp/hold/fade (`lightLevel`, flicker)
- Pipes: damped torsion-spring wiggle on finger pass/tap (`wiggleStep/wiggleKick/nearestPipe`) + z bob
- 5 HUBS: big kit gears (m19, 1.2x) over the painted hubs (top, bottom, left, right, small centre), each its own train, idle motor
- Weld trail instead of ink: torch bloom, sparks (`stepSpark`, bounce), hot streak (`heatColor`) on glow canvas, "stack of dimes" bead on paint canvas, 2.5 s total
- Metal tint (`metalFinish`) on kit materials

## Current door (a0aac9b, 900 lines): what it adds over the old
- Door slab rebuilt as sectioned opaque plates (ExtrudeGeometry per face of the 8 shape lines) on a brushed steel backplate; gold rail channels along every shape line
- Procedural mechanism (`mechanismLayout`): bolts (extend by trace progress), tubes, pistons (body+rod driven by gear angle), pulleys on corner hubs, cables, weights (driven by gear angle), shafts under gears, bearing lights
- Lamps: emissive sphere + two additive halos (tight glow, wide cast light), lit by trace progress / finger proximity / release flash
- Lock dial (12 notches) that spins on release
- Real shadows (sun shadow map, 512 on phones), studio env map on all metals
- Instanced/Batched meshes (gears, panels, dressing) instead of one Mesh per part
- Dressing keep-out placement (`dressingPlace`) for pipes/screws/plates/valves
- Cut/fall release of panels (NOT wanted)

## Vault door decisions
- Base = old painted slab (square crop y 700..1724 of the 1024x1792 art, so the lower neon "V", the plain gear strip and the bottom hub are in frame), duotone-retinted purple/gold in a shader
- Kept from old: kit gears/trains, valves, lights, pipes wiggle, screws/plates, bottom HUB gear, weld trail
- Added from new: pistons, bolts (retract with flywheel progress), tubes, pulleys+cables+weights, lamps+halos, shadow map only while touched/moving, 12-notch dial = the scroll knob
- Dropped: shape paths/lock progress/cut/fall, free-running hub idle motor (no free RAF; on-demand only)
