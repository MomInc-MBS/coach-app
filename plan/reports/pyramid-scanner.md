# Food pyramid scanner

The Food panel now mounts the prepared 3D pyramid only while the panel is open. Its six screens show the on-device food guess, calories, protein, fat, carbs, and the two positive vitamins with the highest share of the fixed adult daily values. The dials and camera lens respond to taps; dragging rotates the model. The lens invokes the existing `foodCamera` button, preserving the current photo-selection and recognition flow. Scan results update the pyramid through the existing `myr5:food-selected` / `myr5:food-reset` events.

Three.js and the scanner stay outside the launch bundle until the panel is opened. The build creates the vendored Three.js runtime files and stages them with the model; the same assets are included in the offline asset catalog. Closing the Food panel or leaving the page disposes the scene. Reduced-motion preference disables the floating, tilt, steam, and drag inertia animations.

Nutrition is looked up from the existing local nutrition data using the selected food name and shown per 100 g. A scan with no clear match leaves the nutrition fields blank. Camera-only workout behavior is unchanged.

## Verification

- `node --test tests/pyramid-scanner.test.mjs`: 5/5 passed.
- `node --test tests/camera-workout.browser.test.mjs`: 1/1 passed; camera-only screen remains video plus counter.
- `node --test tests/pyramid-scanner.browser.test.mjs`: 1/1 passed; opening Food fetched the scanner module and model from their deployed paths.
- `npm run build`: passed; generated the static deployment build and offline catalog (2.6 MiB core, 249.3 MiB post-download package).
