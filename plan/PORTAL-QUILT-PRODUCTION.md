# Quilt portal production slice

The Quilt is the sole production portal and the fixed starter. It is opened from Coach Settings → Portal; its modules and stylesheet load on first open. The portal sits above the existing app and has an explicit Back to Coach control. It pauses while hidden, survives close/re-entry without duplicate canvases, honors `prefers-reduced-motion`, and degrades to its no-WebGL menu state if renderer creation fails. The shape menu delegates achievements to the existing `window.myr5Menus.achievements` flow; it does not force-unlock anything or bundle the prototype's achievements stand-in.

Only `modules/portal/{portal,portal-entry,portal-board,portal-cut,portal-shapes}.mjs`, its stylesheet, and `pod/worlds/quilt.webp` are production runtime portal assets. Ice, Grass, Cogs, Jelly and Wood implementations and every board/cog GLB remain under `plan/prototypes/portal-boards/`. The offline core includes the 370,794-byte quilt texture and its shared vendored Three.js renderer; the food-only GLTF loader and other `pod/worlds` art remain deferred. Experimental GLBs are not in the deploy tree or offline package.

The portal exposes `window.myr5Portal.flashTransition()` and emits `myr5:portal-transition` phase events (`flash`, then `complete`) for a connected Coach/ship transition. This is a neutral visual hook only; no ship-scene implementation or 61 MB ship models are imported here. The ship integration worker should call the hook at the handoff point and own the destination/lifecycle event.

## Verification and release margin

`node --test tests/portal-production.test.mjs tests/offline-roster.test.mjs` checks the one-board catalog and built deploy/offline inventory. `tests/portal-lifecycle.browser.test.mjs` exercises actual WebGL rendering, focus containment, fallback navigation, cancellation, reduced motion, disposal and flash completion. The build counts every file under `dist` (client, server and hidden metadata), then streams a local uncompressed tar so headers and padding count toward the 268,435,456-byte guard. The supported Sites packager remains the final authority after staging/normalizing hosting metadata and migrations; the build measurement is not a substitute for validating that final archive.

The original portal build's **266,503,984 bytes** was file payload, so its reported **1,931,472 bytes** of headroom excluded tar overhead. During review of the later background build, a local tar measured **267,847,680 bytes**, leaving **587,776 bytes** at that snapshot. Rebuild and validate the final archive after concurrent code/assets changes; this margin is shared with all production work.

## Provenance gate

The texture was copied from `D:\coach-merge\pod\worlds\quilt.webp` (SHA-256 `98f561c67e5aa7fbb25b067daddcadf3f6f1f75e228dbc99f2f1aee60681e279`, 370,794 bytes). No source/license/provenance record for this particular art was found in the repository or prototype notes. Treat redistribution clearance as **unverified**: the commit preserves it for integration/testing, but do not publish/deploy the artwork until its ownership/license is confirmed and recorded. The source implementation files carry AGPL-3.0-or-later headers; the extracted cloth solver includes its upstream MIT notice in source comments.
