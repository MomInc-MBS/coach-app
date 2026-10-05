# Mechanical safe-door grimoire — REBUILD plan (2026-10-04)

Worktree D:/myr5-work/mechanical-grimoire-rebuild, branch codex/mechanical-grimoire-rebuild @ 5bf9ac0 (Codex v1).
Preview: `node scripts/mechanical-grimoire-preview.cjs` → http://127.0.0.1:5198 (window.board, window.traceShape(), window.errors).
Tests: `node --test tests/portal-mechanical-layout.test.mjs tests/portal-board-cogs.test.mjs` (38 pass at start; keep them green, extend them).
Baseline screenshot: D:/.playwright-mcp/mech-codex-v1.png.

## Goal (Ian)
A mechanical SAFE DOOR with exactly the same eight portal shapes (rect, oval, up, down, vdiamond, hdiamond, cross, x — from SHAPES in portal-shapes.mjs
inside MECHANICAL_FRAME) but built of moving pistons, tubes, lights, gears and pulleys that are ALIGNED WITH the shape lines so tracing a shape
drives its machinery, and the shape itself is a LOCK the user is undoing / cutting through. Completing a shape releases the pre-sectioned
panels (existing cut()).

## What v1 already gives (KEEP)
- portal-mechanical-layout.mjs: mechanicalPaths() (shape polylines in face uv), sectionPanels() (planar faces = door plates), mechanicalLayout()
  (gear pairs at stations along each path + 4 corner hubs, one connected train), pointOnPath(), signedRailImpulse().
- portal-board-cogs.mjs: train physics (applyTorque/stepTrain/idleSpin), rails (batched boxes along every seam), shafts, bearings, backplate
  BatchedMesh panels, lights, valves, pipes wiggle, weld trail, cut()/heal() lifting panels, tints (mechanism + back wall).
- Kit: pod/worlds/boards/cogs/parts-kit.glb nodes g01..g63 m01..m50; kinds in D:/MYR5 Roster/tools/door_layout.py KINDS
  (gear: g07 g09 g10 g19 g22 g26 g33 g40 g41 g53 g54 g61 m05 m19 m40 m47; pipe: g11 g21 g30 g36 g44 g49 g51 g55 g58 m10 m13 m20..m23 m25 m27 m28 m30 m34 m36 m37 m39 m43;
  light: g01 g05 g12 g15 g17 g23 g24 g29 g34 g45 g47 g57 g62 m04 m08 m11 m16 m24 m26 m33 m35; valve: g16 g60 m18 m29 m31; screw/plate lists there too).

## What changes (the rebuild)
Each shape path becomes a LOCK RING: a chain of mechanisms along the line. Tracing progress p∈[0,1] along the path (fraction of the path
the finger has covered, from portal's existing recogniser progress — or, inside the board, the farthest pointOnPath segment reached while a
finger is down) drives the ring; the train omega drives the continuous motion.

New layout kinds (pure data from portal-mechanical-layout.mjs → `mechanismLayout(face, paths=mechanicalPaths())`), all in face uv with r as
face-width fraction and `rot` = path tangent angle (rad):
- `tube`   {u,v,len,rot,r,pathIndex,segment}: kit pipe laid ALONG the seam between stations (replaces bare rails on long spans). The shape
            silhouette must stay readable: tubes are centred on the line.
- `bolt`   {u,v,rot,r,pathIndex,station,throw}: a locking bar crossing the seam (perpendicular to rot). Retracted amount = clamp((p-station/n)*n,0,1):
            bolts slide OUT of the seam one after another as the trace advances (safe-door bolts withdrawing). 4–8 per shape.
- `piston` {u,v,rot,r,stroke,pathIndex,drives(gear index)}: cylinder (kit pipe) + rod (procedural cylinder) along the seam at junctions;
            rod extension = stroke*(.5+.5*sin(gear.angle)) of its driving gear (crank). 1 per path junction, ≥6 total.
- `pulley` {u,v,r,drives}: the 4 corner hubs (existing hub gears) become pulley wheels; `cable` {from:[u,v],to:[u,v],r}: thin cylinder from
            each hub to the nearest rect-frame corner, plus a `weight` {u,v,r,travel,drives} counterweight sliding along the cable by the hub angle.
- `lamp`   {u,v,r,pathIndex,station}: kit light at every station; OFF at rest; lamp k lights when p ≥ k/n (lock dial filling in); all flash
            at release; near-finger glow (existing light behaviour) stays.
- `dial`   {u,v,r,drives}: ONE big lock dial at the oval centre (kit m19 scaled ~.11), 12 tick notches, rotates with the oval train; when a
            shape is completed the dial spins a full turn before the panels release (cut()).
Gear pairs: keep, but make them slightly larger (r .029/.035) and stagger rot so teeth read as meshed.

3D (portal-board-cogs.mjs): build the above from layout (kit meshes via fitModel, procedural rod/cable/bolt = CylinderGeometry/BoxGeometry
batched), animate in step(): bolts by p, pistons/pulleys/weights/dial by gear angle, lamps by p and proximity. `release(id)` on a completed
shape: set p=1, flash lamps, dial full turn (300 ms) then existing cut(). heal() resets p=0 and everything to rest. Performance: one
BatchedMesh per procedural kind, ≤ 400 draw-free instances; mobile first (375×812).

2D poster: re-render pod/worlds/boards/cogs-poster.webp from the final 3D at rest (1024 wide, same FACE ratio .5715) so the flat fallback
matches.

## Workers
- Sonnet L (layout): portal-mechanical-layout.mjs `mechanismLayout` + tests (counts, alignment: every tube/bolt/piston centre within 1e-6 of
  its path; bolts perpendicular; lamps strictly ordered by station along the path; no two tubes overlapping on one segment).
- Sonnet M (3D): portal-board-cogs.mjs meshes + step + progress API (`cogs.progress(p, pathIndex)` or internal), preview harness button
  "Trace selected shape" must show bolts withdrawing, lamps lighting in order, pistons pumping, dial turning; then release.
- Haiku P (poster+docs): poster re-render script (scripts/mechanical-grimoire-poster.cjs using playwright screenshot of preview at rest),
  README note in .mech/.
- Opus S (supervisor): review the diff + screenshots against this plan; list defects; workers fix.
- Fable (me): unblock, final verify, commit.

## Status 2026-10-04

Progress API committed: `cogs.progress(pathIndex, p)` drives bolts, pistons, pulleys, lights, and dial by shape-trace fraction (pathIndex in mechanicalPaths order, p∈[0,1]). Review 1 fixes applied from .mech/REVIEW-1.md (high-priority: progress tracking by actual arc-length, cancel-on-release token, tube batching). Poster regenerated: scripts/mechanical-grimoire-poster.cjs screenshots the preview at rest, resizes to 1024×1581, saves as webp quality 82 to pod/worlds/boards/cogs-poster.webp.
