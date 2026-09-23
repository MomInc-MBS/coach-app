# Portal boards prototype snapshot

This directory preserves the latest round-three portal-board source found in `D:\coach-merge` as of 2026-09-22. It is an isolated prototype snapshot under `plan/`; it is not wired into `pose.html`, the production build, the offline inventory, or release packaging. The small `achievements-board.mjs` module and stand-in panels are only for this local demo; production already has its own achievements view and real app panels.

The demo page was adapted from the Claude portal test page so Three.js resolves through the repository's existing local vendor build and all model paths resolve inside this snapshot. The previously running Claude preview at `http://localhost:8831` is a separate served snapshot. Changes here do not update that page or establish that it is still running.

## Run locally

From the repository root, run `npm run dev`, then open `http://127.0.0.1:5195/plan/prototypes/portal-boards/prototype.html`. The development server builds the local Three.js vendor files. The root package already supplies Three.js 0.169.

Run the focused pure/unit tests from the repository root with:

```powershell
node --test plan/prototypes/portal-boards/tests/*.test.mjs
```

The tests import the prototype modules with paths relative to this directory. They cover shape matching, polygon cuts, orientation/face mapping, board-specific helpers, crack lifecycle, and the gear train. A bounded-fit ranking fix keeps shifted/jittered ovals working while preventing an off-template rectangle from being identified as an oval. The tests do not cover browser interaction, full scene rendering, scanner interaction, entry lifecycle, or offline/pack delivery.

## Included

- Quilt cloth, GLB board loader, portal/shape logic, and ice, grass, jelly, wood, and cogs effects.
- Cracked-glass fracture core.
- Binary board assets and quilt texture needed by the local demo, including `cog-kit.glb`.
- `portal-*.test.mjs` tests and applicable license texts.

The 113-part `parts-kit.glb` is deliberately excluded: it was an authoring/reference sheet, not a runtime dependency. The smaller `cog-kit.glb` is the named-mesh runtime asset used by the cogs effect.

## Current prototype scope and gaps

The source includes finger-following portal traces, board-specific touch effects, full-face grass blades and flowers, crack/glass loading visuals, basic line/cross/X recognition, and gears driven by taps or drags. The looser shape recognizer has regression coverage for shifted/sloppy traces.

The requested half/quarter line cuts and brown-backed falling pieces are not implemented in this snapshot. A line trace currently enters the all-menu sequence, and the cut-piece geometry uses the board material without a separate brown back.

## Production blockers

- The prototype mounts on its demo page. Production needs a deliberate entry point, lazy mount/disposal, and visibility coordination with workouts, rest, dialogs, and account changes. The demo's forced War Room unlock and destination stand-ins must not ship.
- Production assets must be served via an integrity-checked optional-art pack. Hard-coded prototype paths currently point inside this snapshot.
- The required runtime board GLBs, quilt texture, and cog kit total roughly 6.5 MB before code. That exceeds the release's approximately 5 MB Sites headroom, so these assets cannot simply be copied into the production deploy. Keep `parts-kit.glb` out of deploys as well.
- The fracture core has an MIT license; the grass flower asset is covered by Kenney's CC0 text; Three.js uses its existing MIT license. The source comments identify board models as Tripo-to-Blender, but this snapshot has no asset-specific provenance/license record for the board GLBs or cog kit. Resolve redistribution provenance before publishing them.
- Production needs browser tests for trace and multi-touch behavior, dialog close/re-entry, reduced motion, missing/offline packs, WebGL fallback and disposal, plus a release-size/package check.
