# V66-FALLBACK: the portal stays on screen when 3D fails

Lane: V66-FALLBACK. Worktree `D:/myr5-work/v66-fallback`, branch `w/v66-fallback`, base v65 `7662d76`.
Commit: see `git log -1 w/v66-fallback` (sha in the conductor hand-off).

## What was reproduced on v65

Chromium (Edge channel, SwiftShader WebGL), 375×812, Android Chrome UA, production-like: `dist/client` served as plain
static files, `/api/*` stubbed signed-out, seeded guest coach. Harness: a scratch Playwright script (not committed).
Frames: `.frames/before-*-375x812.png` and `.frames/after-*-375x812.png`; raw probes in `.frames/before-results.json`,
`.frames/before-tex-results.json` (texture cases) and `.frames/after-results.json`.

| Case | v65 | v66 |
|---|---|---|
| (a) `getContext('webgl*')` null from the start | 2D Quilt, frame OK. Picking Cogs swaps to Quilt and saves Quilt | Cogs shows its poster (identity kept, saved), routes work |
| (b) context lost after 3 switches | stage OK, but the board is replaced by the GL Quilt and the choice is overwritten | the same board's flat art takes over at once, 3D comes back after one retry |
| (b) lost, then WebGL refused | 2D Quilt | the same board, flat, status line says so |
| (b) lost mid-switch | Jelly falls to Quilt, plus pageerror `Cannot access 'cutting' before initialization` | Jelly stays, on its poster (a context lost before the first frame counts as a failed build), no pageerror |
| (c) board GLB hangs | **blank face**: "Loading Jelly board…" forever, old board already disposed, `board===null` so traces are dead, idle outlines drawn screen-size, and every later pick queues behind it (Wood never loads). The stuck board holds a WebGL context | Jelly's poster at once; 3D gives up after 20 s; picking Wood works immediately; no context held by the stalled load |
| (c) board GLB 404 / HTML | falls to Quilt (saved as Quilt) | Jelly's poster, "its 3D didn't load" |
| (c) quilt texture hangs at start | **portal never mounts**: the app stays on the pod, the Portal key does nothing (mount awaits the texture forever) | plain stitched quilt at once, real art when it arrives |
| (c) quilt texture is HTML | plain stitched quilt | same |
| (d) live WebGL contexts, 6 boards + Food + Records + ship + War Room | peak **4** | peak **4** |
| (e) `--disable-gpu --disable-webgl` | 2D Quilt | same (flat quilt), trace works |

Also at baseline: v65's own `portal-webgl-fallback` test fails with pageerror `Cannot read properties of null (reading
'heal')` (a closing destination's `board.heal()` racing a board reload that had set `board=null`).

The v64 phone picture (m4_0: frame, rails, plate and portal gone, one line of text) is the `.no-board` path: when the
pick and the Quilt both failed, `.no-board` hid `#portalBoardHost`, which holds the frame and plate. v65 made that path
rarer (2D Quilt) but kept it. It did not reproduce in Chromium on v65.

## Root causes

1. **`board` was null during every load, and forever if a load stalled.** `loadBoardNow` disposed the old board before
   the new one existed; loads had no timeout and are serialised. Everything that assumes a board (pointer handlers,
   `toNorm`/`patternRect`, `diveBack`/`fizzleBack` `board.heal()`, idle outlines) then throws or misplaces: dead routes,
   stuck sequences, an empty face, and a queue no pick can get past.
2. **One failure could hide the whole stage.** The frame, rails and MOM INC plate live in `#portalBoardHost`, and
   `.no-board` hid it. `wirePointerEvents()` was skipped for the session if the first load failed.
3. **Renderers were created before their downloads**, so a stalled GLB or texture held a WebGL context indefinitely.
4. **Failure policy was global-ish:** any failure or loss swapped to Quilt and overwrote the saved choice.

Ruled out as the cause: **context leaks.** Boards, the Food pyramid, the Records classroom and the ship intro all
release their contexts (`dispose` + `forceContextLoss`) on switch/close. The measured peak is 4 (wormhole tunnel,
board, coach capsule, ship intro), and the count is back to 3 after the ship closes. It stays far below Chrome's
active-context cap. The only surface that holds a context after its scene closes is the coach capsule
(`creature/assets/phone.js` viewer, kept for the pod); that is outside this lane (see below).

## What changed

- `modules/portal/portal.mjs`: every board is two layers. `flat` is a still picture on a 2D canvas (poster, or the
  quilt art). It is mounted first, always, never needs WebGL, and can't fail for Quilt. `create` is the 3D board. It is
  built while the portal is on screen (or mounting), shown only after it has drawn a frame on a live context and no cut
  is open, and then it takes over (the flat layer is hidden underneath). A throw, a 20 s timeout or a lost context drops
  only the 3D layer, and the flat layer is back at once. After a loss there is one retry; a second loss in the session
  leaves the board flat until it is picked again. There is per-board status (`art` map, `#portalHome[data-art]`) and a
  per-board status line, with no global flag. `.no-board` and `boardFailed` are gone; pointers are always wired; `board`
  is never null after mount. If a poster doesn't load within 6 s, the board already showing stays (last good), else the
  Quilt. The saved choice is always the board on screen. While a 3D build runs, a hidden portal is kept laid out
  (`data-building`, invisible) so effects measure a real host. The first mount waits ≤4 s for 3D, so it doesn't flash
  the poster when 3D is quick. Context losses are caught by a capture listener on the board host, so a loss mid-build
  is seen too.
- `modules/portal/portal-board.mjs`: `createQuiltBoard2D` is now the general flat board (from Codex's WIP): poster, face
  ratio, shape frame and guides. Quilt draws its plain stitched quilt at once and its art when that arrives. The GL
  quilt loads its texture before creating its renderer, and a failed build stops its frame loop.
- `modules/portal/portal-board-glb.mjs`: the renderer is created only after every download and `effect.init`. A failed
  build stops its loop, undoes its effect and releases its context. The `cutting` TDZ pageerror is fixed.
- `modules/portal/portal.css`: the `.no-board` rules are removed, and the `data-building` rule is added.
- `pod/worlds/boards/{cogs,grass,ice,jelly,wood}-poster.webp`: Codex's posters, re-encoded. Cogs is 600 px wide; the
  ice/jelly/wood atlases are centre-cropped to their face ratio. 174,290 B total. Each is in its grimoire download
  group (`scripts/offline-assets.mjs`).
- Service worker: verified, no change needed. Through the real built SW, with the host answering HTML for
  `jelly.glb`, `jelly-poster.webp`, `quilt.webp` and `cogs/door.glb`, every one came back **503 text/plain**: listed
  assets are integrity-checked, so an HTML body fails. The SW has no navigation fallback. `assetPath` maps only `/`,
  `/index*` and extension-less paths to `.html`, so it never answers an image/GLB with HTML. An unlisted path (a file
  not in the deploy) passes through to the host untouched; the loaders reject HTML there and the portal falls back.

## Tests

- Baseline (v65 + its build): **1304 tests, 1265 pass, 39 fail.**
- After (v66, build from empty `dist/`): **1305 tests, 1266 pass, 38 fail.**
  - Fixed: v65's `portal-webgl-fallback` (null-board pageerror) and `portal-look` (stale regex left by 10d1cd0).
  - Five failed only in the after run, all load/timing. Four pass when run on their own: #20 double-tap,
    release-smoke 4, SATCOM Downloads, and the update-hotfix redirect. `camera-workout fills phone…` also fails on its
    own with the **v65** portal modules, so it isn't this change.
  - Every portal test still failing also fails on v65 run on its own, at the same assertion: idle-flash ×2, lifecycle
    focus and Back to Coach, #24, idle-labels menu name, line-up Menu, physical dock.
- New: `tests/portal-context-loss.browser.test.mjs` (one test, real app, Android UA, 375×812). It cycles all six
  boards and forces a context loss on each, loses one mid-switch, then refuses WebGL. It asserts that the portal,
  frame, plate and dock stay visible with board art, that the board keeps its identity, that Food opens (by id and by
  a real finger trace), that live contexts stay ≤3, and that there are no pageerrors. It passes on v66. On v65 it fails at its first check, because v65 has no per-board
  3D status and a loss swaps the board to Quilt.
- Updated for the intended behaviour: `portal-webgl-fallback` (Cogs stays as its poster), `portal-redesign` ×2 (a
  failed GLB shows its poster; "missing" now means GLB and poster; a failed pick keeps the last good board),
  `portal-lifecycle` and `portal-board-idle-labels` (count WebGL renderers, not canvases), `portal-look` (regex).

## Sites headroom

v65: 1,386,496 B. v66: **1,202,176 B** (built from an empty `dist/`). The posters, tar headers and code cost 184 KB.

## Still needs a real Android check

- On Ian's phone: whether contexts are lost or refused, and whether the flat board takes over instantly with no blank
  frame (the 3D canvas is revealed via opacity, so its first frame is composited).
- If Chrome blocks WebGL page-wide after a GPU reset, every 3D surface stays flat until the app restarts. That is
  expected, and it's now visible per surface instead of blank.
- How the posters look at phone DPR, especially the ice/jelly/wood atlas crops.
- The 4 s mount wait and the 20 s 3D give-up on T-Mobile 5G.
- The coach capsule keeps its WebGL context and the 20 MB coach model after the ship view closes. It's the one
  lingering context and a GPU-memory suspect, but it's outside this lane.
- Records: the classroom offers "Download classroom" even when the cause is WebGL (per-surface, unchanged).
- The SW voice cache stores any 200, so a host HTML 200 for a missing clip would be cached (audio only, unchanged).

## Not committed

Build outputs from `npm run build` are left modified in the working tree and unstaged: `app-runtime.mjs`,
`launch-runtime.mjs`, `local-coach-runtime.mjs`, `release-build.mjs`, `workout-tracks.js`, `creature/assets/*`,
`vendor/three/*`, plus the untracked `war-room/gala-bay.js`. `git checkout --` on them was refused by this session's
permission guard; restore them before building a release.
