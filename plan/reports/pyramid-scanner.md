# Food pyramid scanner

The Food panel now mounts the prepared 3D pyramid only while the panel is open. Its six screens show the on-device food guess, calories, protein, fat, carbs, and the two positive vitamins with the highest share of the fixed adult daily values. The dials and camera lens respond to taps; dragging rotates the model. The lens invokes the existing `foodCamera` button, preserving the current photo-selection and recognition flow. Scan results update the pyramid through the existing `myr5:food-selected` / `myr5:food-reset` events.

The scanner backdrop reuses the actual game's lightweight Dr. Girlfriend paper-room treatment from `C:/Users/ianmy/Documents/Codex/2026-09-22/co/work/mominc-girlfriend-fix/tv/channels/girlfriend.html`: its striped `.dg-paper-wall` CSS and the two original text notices (“CARED FOR. / CORRECTED. / PROVIDED FOR. / A MOM INC. WORKPLACE” and “READ THE SOURCE. / KEEP THE LABEL.”). It is mounted and removed with the scanner, behind the transparent 3D canvas. This reuses CSS/DOM rather than copying the 3.6 MB character SVG, and makes no image/network request or change to offline inventory.

Three.js and the scanner stay outside the launch bundle until the panel is opened. The build creates the vendored Three.js runtime files and stages them with the model; the same assets are included in the offline asset catalog. Closing the Food panel or leaving the page disposes the scene. Reduced-motion preference disables the floating, tilt, steam, and drag inertia animations.

Nutrition is looked up from the existing local nutrition data using the selected food name and shown per 100 g. A scan with no clear match leaves the nutrition fields blank. Camera-only workout behavior is unchanged.

## Verification

- `node --test tests/pyramid-scanner.test.mjs`: 6/6 passed.
- `node --test tests/camera-workout.browser.test.mjs`: 1/1 passed; camera-only screen remains video plus counter.
- `node --test tests/pyramid-scanner.browser.test.mjs`: 1/1 passed; opening Food fetched the scanner module and model from their deployed paths.
- `node --test tests/pyramid-lifecycle.browser.test.mjs`: 3/3 passed; pending-load close/re-entry, late model cancellation, and reduced motion remain correct.
- `node --test tests/offline-roster.test.mjs`: 2/2 passed.
- The scanner browser test also checks the reused wall pattern and poster text, canvas layering, cleanup on close and WebGL failure, and absence of background-art or cross-origin requests.
- `npm run build`: passed. Full uncompressed Sites archive measured 266,543,141 / 268,435,456 bytes, leaving 1,892,315 bytes. Core offline install measured 3,278,714 / 8,388,608 bytes. The room adds no binary or separately inventoried asset; its CSS/DOM is 2,881 bytes of source inside the existing lazy scanner module.
- `npm run build`: passed; generated the static deployment build and offline catalog (2.6 MiB core, 249.3 MiB post-download package).
