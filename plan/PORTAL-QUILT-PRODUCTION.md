# Quilt portal production slice

The Quilt is the sole production portal and the fixed starter. It is opened from Coach Settings → Portal; its modules and stylesheet load on first open. The portal sits above the existing app and has an explicit Back to Coach control. It pauses while hidden, survives close/re-entry without duplicate canvases, honors `prefers-reduced-motion`, and degrades to its no-WebGL menu state if renderer creation fails. The shape menu delegates achievements to the existing `window.myr5Menus.achievements` flow; it does not force-unlock anything or bundle the prototype's achievements stand-in.

Only `modules/portal/{portal,portal-entry,portal-board,portal-cut,portal-shapes}.mjs`, its stylesheet, and `pod/worlds/quilt.webp` are production runtime portal assets. Ice, Grass, Cogs, Jelly and Wood implementations and every board/cog GLB remain under `plan/prototypes/portal-boards/`. The existing offline worker now includes the 370,794-byte quilt texture in the core cache, while other `pod/worlds` art stays deferred. Experimental GLBs are not in the deploy tree or offline package.

The portal exposes `window.myr5Portal.flashTransition()` and emits `myr5:portal-transition` phase events (`flash`, then `complete`) for a connected Coach/ship transition. This is a neutral visual hook only; no ship-scene implementation or 61 MB ship models are imported here. The ship integration worker should call the hook at the handoff point and own the destination/lifecycle event.

## Verification and release margin

`node --test tests/portal-production.test.mjs tests/offline-roster.test.mjs` checks the one-board catalog and the built deploy/offline inventory. `node --test tests/portal-production.browser.spec.mjs` checks lazy open, close, re-entry, and that non-quilt GLBs are never requested. `npm run build` counts every file under `dist` (client and server) and fails if the exact uncompressed Sites archive reaches 268,435,456 bytes.

The 2026-09-22 local build measured **266,503,984 bytes** total and **1,931,472 bytes** of Sites headroom. The quilt texture (370,794 bytes) is included in that total and in the 3,284,442-byte core offline shell. Re-run the build after any concurrent code/assets changes; the headroom is shared with all other production work.

## Provenance gate

The texture was copied from `D:\coach-merge\pod\worlds\quilt.webp` (SHA-256 `98f561c67e5aa7fbb25b067daddcadf3f6f1f75e228dbc99f2f1aee60681e279`, 370,794 bytes). No source/license/provenance record for this particular art was found in the repository or prototype notes. Treat redistribution clearance as **unverified**: the commit preserves it for integration/testing, but do not publish/deploy the artwork until its ownership/license is confirmed and recorded. The source implementation files carry AGPL-3.0-or-later headers; the extracted cloth solver includes its upstream MIT notice in source comments.
