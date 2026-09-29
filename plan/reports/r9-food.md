# R9-FOOD: real USDA nutrition numbers for the food scanner

## Where the old numbers came from

Both apps' Food-101 scanner (`food-worker.mjs`, model `onnx-community/swin-finetuned-food101-ONNX`) turns a photo into one of the model's 101 dish labels (`apple_pie` … `waffles`, `_` replaced with spaces). That label — or any text typed into the meal form — went through the *same* path: `meal-nutrition.mjs`'s `search(query)` called `findFoods()` (`nutrition.mjs`) against `nutrition-data.mjs`, a bundled copy of **USDA SR28 (revised May 2016)**, 8,790 foods. `findFoods` is a fuzzy word-token matcher (a 12-entry hand alias table plus substring/word overlap scoring) that returns the best-guess SR28 row; `portionNutrition()` then scaled it to whatever gram amount was in the "Portion (g)" field (100 g by default). So there was no separate "guessed table" to delete — the guess *was* a fuzzy text search over a decade-old reference database, reused for both the AI label and manual typing, with the portion size never coming from real serving data.

## What changed

`scripts/build-food-fdc.mjs` (new, both repos) builds `food/nutrition-fdc.json`: one real USDA FoodData Central match per Food-101 label, `{fdcId, description, servingName, servingG, kcal, proteinG, fatG, carbsG, vitamins:[{name,amount,unit}]}` (top 2 vitamins by %DV, mirroring `food/pyramid-tiles.mjs`'s own `VITAMIN_DV` table).

- **Data source**: FDC's bulk CSV downloads (Survey/FNDDS 2024-10-31, SR Legacy 2018-04, Foundation 2026-04-30) instead of the DEMO_KEY search API — which turned out to be rate-limited to **10 requests per window**, far too few for 101 lookups × several calls each. The bulk zips are 3–6 MB each, no key required, cached under `FDC_CACHE_DIR` (an OS temp folder) so re-runs are instant. Two real data quirks the script works around (each with a `ponytail:`-style comment in the source): one Foundation row has a literal embedded newline in its description (corrupts a CSV line split — dropped, it's an irrelevant lab sample); and FNDDS's `food_nutrient.csv` keys nutrients by the raw USDA nutrient *number* while SR Legacy/Foundation key by the internal nutrient *id* — the script matches either.
- **Matching**: FNDDS ("as eaten" dishes) tried first, then SR Legacy, then Foundation, by word-overlap coverage against a query (defaults to the label text; 33 labels needed an override query to land on the right entry — reusing the 12 aliases `nutrition.mjs` already had for its own fuzzy search, plus 21 new ones found by inspecting two review passes over the real output).
- **Portions**: real FDC portion data (`food_portion.csv`), first usable row by `seq_num`. All 101 labels resolved to a real portion — none fell back to 100 g.
- **Runtime**: `meal-nutrition.mjs`'s `search()` now checks `food/nutrition-fdc.json` for an exact match (trimmed, lower-cased) on the query *before* the SR28 fuzzy path. A hit is reshaped into `portionNutrition()`'s existing per-100g "food" shape (so the existing grams input/scaler/renderer needs no changes) and only sets the two vitamins FDC gave us; a miss falls through to the unchanged SR28 search. Typed text that exactly matches a label (e.g. typing "pizza") gets the same FDC numbers as a scan; anything else still uses SR28, unchanged, exactly as the brief asked. `nutritionSource` now reads `USDA FDC <id>` vs `USDA SR28 <id>` depending on which path served it.
- **Credit line**: the food dialog's existing SR28 attribution line (`launch-shell.mjs`, both apps) now reads *"Nutrition: USDA FoodData Central (public domain) for recognized dishes, USDA SR28 estimates otherwise."*
- Simple app's `scripts/build.mjs` didn't copy any `food/` folder (it has no pyramid scanner) — added one line so `food/nutrition-fdc.json` reaches `dist/client/food/` there too, same as the full app already did for `food/pyramid-scanner.glb`.

`food/nutrition-fdc.json` is byte-identical in both repos (generated once, copied across; confirmed with `diff`).

## 10 hand-checked labels (against known/typical values)

| Label | FDC match | Serving | kcal | Sanity check |
|---|---|---|---|---|
| apple pie | Pie, apple (2707995) | 1 mini/small slice, 75 g | 222 | ~296 kcal/100g matches published USDA apple pie figures |
| pizza | Pizza, cheese, from restaurant or fast food (2708614) | 1 piece, 119 g | 317 | in line with a typical cheese slice (~260 kcal/100g) |
| sushi | Sushi, NFS (2708959) | 1 piece, 30 g | 28 | ~93 kcal/100g, reasonable for a nigiri/maki piece |
| hamburger | Hamburger, NFS (2706920) | 1 hamburger, 145 g | 418 | matches typical fast-food-style burger range |
| caesar salad | Caesar salad, no dressing (2709591) | 1 cup, 79 g | 61 | correctly low since dressing is excluded |
| ice cream | Ice cream, NFS (2705629) | 1 cup, 135 g | 298 | matches USDA's ~221 kcal/100g vanilla ice cream figure |
| chicken wings | Chicken wing, rotisserie (2706060) | 1 wing, 35 g | 90 | ~90 kcal/wing matches commonly cited figures |
| tacos | Taco, NFS (2708514) | 1 miniature, 50 g | 123 | reasonable for a small taco |
| edamame | Edamame, cooked (2707436) | 1 pod, 2 g | 3 | scales correctly from FDC's ~120 kcal/cup |
| donuts | Doughnut, NFS (2708062) | 1 doughnut, 75 g | 320 | matches typical ~300–350 kcal cake doughnut |

## Approximate matches (no exact FDC entry, closest defensible proxy used, noted in the build log)

`baby back ribs` (Pork, ribs), `beef carpaccio` (Beef, NFS — no raw-carpaccio entry anywhere in Survey/SR Legacy/Foundation), `cannoli` (Cream puff/eclair, custard filled), `croque madame` (Egg white sandwich with cheese), `fish and chips` (Fish, cod, fried — no fries), `macarons` (Cookie, meringue), `poutine` (Potato, french fries — no cheese curds/gravy entry exists), `risotto` (Rice, white, cooked), `shrimp and grits` (Shrimp, NFS — no grits), `takoyaki` (Octopus). All 10 still resolve to finite, real USDA per-serving numbers; `cannoli`/`macarons`/`poutine`/`risotto`/`takoyaki` have genuinely no FDC entry for the dish itself in any of the three free datasets, confirmed by direct grep of all three `food.csv` files.

## Tests

New: `tests/nutrition-fdc.test.mjs` (both repos) — asserts all 101 Food-101 labels resolve to a present entry with finite, non-negative `kcal`/`proteinG`/`fatG`/`carbsG`/`servingG` and at most 2 well-formed vitamins; also asserts the JSON has exactly 101 keys (no stragglers, no gaps).

No existing test asserted the old SR28-guessed values for these labels (checked `tests/nutrition.test.mjs`, `tests/pyramid-scanner.test.mjs`, `tests/backend.test.mjs`, the browser food tests), so none needed updating — `nutrition.mjs`/`nutrition-data.mjs` and their tests are untouched; the SR28 path is still exactly as it was for text that doesn't match a label.

**Full app** (`node --test`, real `npm install`, before = `f851b1a` clean worktree, after = this branch):
- Before: 1302 tests, 1182 pass, 114 fail
- After: 1303 tests, 1184 pass, 114 fail
- Diffed the two failing-test-name sets directly: 114 pre-existing fails are the same set (dist/client-dependent browser tests, per COMMON.md); 3 test names differ between runs (`repair waits for a legacy client…`, `no navigation the worker answers is redirected…`, `the update notice clears with one tap…`) — all unrelated to food/nutrition (service-worker/update-notice tests), consistent with this suite's own real-timer flakiness across separate runs, not a regression. `node --test tests/nutrition-fdc.test.mjs tests/nutrition.test.mjs tests/pyramid-scanner.test.mjs` re-run clean after reverting build outputs: 13/13 pass.
- `npm run build`: passed. Workers limits: 1730 / 20000 files; largest 22,911,224 / 26,214,400 bytes (`handborne/models/family-20.glb`, unrelated to this change); 265,963,456 total bytes.

**Simple app** (before = `w/simple-self-host` @ `9bc2458` clean worktree, after = this branch):
- Before: 171 tests, 171 pass, 0 fail
- After: 172 tests, 172 pass, 0 fail (the +1 is the new nutrition-fdc test; zero regressions)
- `npm run build`: passed; `food/nutrition-fdc.json` confirmed present at `dist/client/food/nutrition-fdc.json`.

Build outputs (`app-runtime.mjs`, `launch-runtime.mjs`, `local-coach-runtime.mjs`, `release-build.mjs`, `workout-tracks.js`, `training-runtime.mjs`, `creature/assets/*`, `vendor/three/*`, `dist/`) were reverted/removed before committing, per COMMON.md.

## Files changed

Full app (`D:/myr5-work/r9-food`, branch `w/r9-food` from `f851b1a`):
- `scripts/build-food-fdc.mjs` (new) — the one-off FDC mapping script
- `food/nutrition-fdc.json` (new) — 101-label USDA FDC data
- `meal-nutrition.mjs` — exact-label FDC lookup ahead of the SR28 fuzzy search
- `launch-shell.mjs` — credit line
- `tests/nutrition-fdc.test.mjs` (new)

Simple app (`D:/myr5-work/r9-food-simple`, branch `w/r9-food-simple` from `w/simple-self-host` @ `9bc2458`):
- Same five, plus `scripts/build.mjs` — one line to copy `food/` into `dist/client/food/` (it previously only copied `icons`/`models`; the full app already copied `food/` for its pyramid scanner GLB).

Pyramid visuals (`food/pyramid-scanner.mjs`, `food/pyramid-tiles.mjs`) are untouched — only the numbers feeding them changed.
