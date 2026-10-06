# Color locks and asteroid flight score

Target: current Coach, https://myr5.mominc.online. Build `18520032b2cc293fcf15`.

Locked color/palette swatches and ship tints now have visible padlocks and accessible locked labels. Locked ship names have padlocks in the picker. Selecting an available color on an owned body discards incompatible locked draft materials and resumes saving. Locked body choices remain previews and do not change the saved recipe.

The battle-pass flight has a fixed top row showing asteroid hits, run-local score and multiplier. Each hit awards the current multiplier in points and raises it by one. An asteroid passing the bottom resets the multiplier to one, preserving earned points and hit count. Destroyed asteroids respawn above the field instead of becoming hittable again at the same position. A new menu opening starts a fresh score. Flight points do not change workout XP or unlock grants.

Validation: production build and Wrangler dry-run passed. Nineteen focused tests passed, including actual scene laser collision and bottom escape, continuous flight scrolling, and ownership/save guards. Mobile browser at 375×812 verified locked texture → available color exits preview, a locked body still cannot save, saved body/color persist after reload, 31 locked color icons and five locked ship names, and the score row fits above the space field. The shared T3 browser disconnected during checks; remaining browser checks used local headless Chromium after the explicit unsupported browser response.

Screenshot: `plan/reports/flight-score-mobile.png` (local review artifact).

Published to Worker `myr5-coach`, version `5c17943e-3836-4c92-a0c9-c93d28c90664`, preserving production variables. Nine live JavaScript/CSS/service-worker assets returned HTTP 200 and matched the build exactly; `/health` was healthy. Evidence: `color-locks-flight-live.json`. Active Coach source fast-forwarded to the implementation.
