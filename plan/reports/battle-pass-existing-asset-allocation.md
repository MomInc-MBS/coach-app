# Battle-pass art and texture allocation from existing assets

Inventory only; no art or production code was changed. This takes the user's direction literally: distribute assets already present across the board levels and do not commission or generate new art in this pass.

## What is already present

| Existing source | What is usable now | State / limit |
|---|---|---|
| `creature/source/creator/materials-registry.ts` in the materials and visual worktrees | 23 legacy procedural surface families, Flat/Clay, 8 default color swatches, and 24 named battle-pass texture entries (3 for each of 8 exercise tracks). | The 24 battle-pass texture entries are metadata only: `familyId: -1`; the registry comment explicitly says no texture files exist yet. They can be allocated to levels, but cannot render as the named patterns until art/material definitions are made. Existing legacy families are renderable and can provide varied interim looks. |
| `creature/source/creator/palettes.json` in the visual worktree (and the same battle-pass palette data copied in the integration tree) | 12 aura-milestone palettes plus board reward palettes and Food palettes. Palette colors are triads, consistent with D32. | These are usable cosmetic rewards now. Reward IDs map to boss-level slots. |
| `achievements-board.mjs` and `pod/worlds/achievements.jpg` in `D:\myr5-work\visual` | Existing board/menu visual. D33 records the board image at 463 KB and kept it out of core install. | Board art is available/cached with the menu; it is not individual weapon/boss/pet art. |
| `creature/styles/00.png`–`22.png` in `D:\myr5-work\materials` | 23 thumbnails corresponding to the legacy surface families. | Useful as existing previews/swatch art; they are not the 24 new named texture maps. |
| `battle-pass-rewards.mjs` in the integration worktree | 24 texture names, 16 weapon concepts for workout styles, boss-look placeholders, 5 family pet concepts, and current reward-slot logic. | Names and descriptions are data, not image/model assets. Food weapon concepts are intentionally not granted. |

The full plan inventories **60 future art items** (24 workout textures, 18 weapons, 6 boss textures, 6 boss skins, 6 pets). In the inspected materials worktree there are no corresponding pass art files; the registry itself labels the named textures as not yet present. Existing exercise preview art and roster creature models are unrelated assets and should not be counted as battle-pass weapon, boss, or pet art.

## Recommended allocation using the current reward ladder

This keeps D16/D22/D32 slots and fills levels with the cosmetics already in data. Apply the per-style items to the first boss of that style's row; where a family shares a boss/pet, the second style row receives its existing substitute palette instead of a duplicate shared item (D21). Current code already follows that rule for its rendered ladder.

| Level | Existing material to place there | Allocation in current data | Art coverage |
|---|---|---|---|
| L1 | Weapon 1 concept + texture 1; palette on later bosses / shared-row substitute | Texture slot 1 is present as metadata for each of the 8 workout tracks. Weapons are present as concepts for the 8 workout tracks. | No weapon art or named texture map exists. Preview an existing legacy procedural family until maps are made. |
| L2 | Track palette + boss texture | One existing track palette; one boss-texture reward entry for each board boss. | Palettes are renderable. Boss texture is a placeholder/data label; no distinct texture art found. |
| L3 | Weapon 2 concept + special + texture 2 | Texture slot 2 and weapon 2 concepts are present for each workout track; special reward is represented in reward logic. | No dedicated weapon/special art or named texture map found. Reuse existing weapon display treatment and legacy material preview. |
| L4 | Family pet + filler palette | One pet concept per family; the board has palette rewards in the other L4 slots, and a substitute palette for repeated family rewards. | Pet art is absent; palettes are usable. |
| L5 | First aura + boss skin + texture 3 | Existing aura reward, boss-skin reward entry, and texture slot 3. | Aura can use the existing aura treatment; boss skin art and named texture maps are absent. |
| L3 | Midway ship reward (new user direction) | Unlock one ship type at the midpoint of the five-level ladder, alongside the existing L3 content unless the owner chooses a replacement. | Exact assignment of ship IDs to tracks/rows remains open; ship type assignment is independent of D21 family/grouping. L3 is already dense (weapon 2, special, texture 2, and some board rows also have a palette). |
| L5 | Final ship reward (new user direction) | Unlock one ship type at the end of the ladder, alongside the existing L5 content unless the owner chooses a replacement. | Ship asset/reveal work is owned by the other bot; no ship-specific art/scene has been found in the inspected worktrees yet. L5 already holds aura, boss skin, texture 3, plus any palette fill. |
| Food track | Existing Food palettes + one bonus per Food level | Food palette rewards and bonus entries are already represented; no weapons/pets/boss art are allocated to Food. | Palettes are usable; no new art required. |

The reward table's 10 board rows are `strider`, `ringer`, `manyarm`, `wedge`, `warden`, `blob`, `cap`, `stalk`, `tanka`, and `lume`; their boss counts are 6/5/5/5/1/4/3/4/4/1. D32 palette fillers currently cover repeated bosses and the shared Warden/Lume rows. This is a good place to spread the large existing palette set instead of repeating art or inventing duplicate weapons.

## Gaps and duplication to avoid

- Do not count the 24 named texture registry rows as finished textures. They are slot assignments with no renderable pattern/file yet.
- Do not create one boss or pet image per exercise track: D21 shares those by family (6 each), while style-specific weapons/textures remain separate.
- Do not duplicate a shared boss texture, skin, or pet in the second style row of a family; use the already-authored palette substitute.
- The 12 aura milestone palettes are a separate unlock route from board/Food palettes. Avoid assigning those same IDs again as pass rewards.
- `battle-pass-rewards.mjs` carries 16 granted weapon concepts across the 8 workout/meditation tracks. The broader item plan's 18 includes Food's two catalog concepts; D32 explicitly excludes Food weapons from pass rewards.

## Ship rewards and integration contract (new direction)

### Recolorable ship cosmetics palette source

The reusable palette source at `plan/assets-inbox/palettes/top-100-three-color-combinations.json` preserves all 100 ranked combinations from the source visualization. Each entry retains its exact name and hex triad as `dominant` / `support` / `accent`, intended for the source's 60/30/10 ratio. Use this as a design/reference pool for recolorable ship finishes, coach/editor cosmetics, and future reward-palette curation. It is reference data only: do not wire all 100 into production unlock UI or replace existing `pal-*` reward IDs without review. The source labels its ranking approximate popularity order.

The owner clarified that another bot is building each ship's intro/reveal scene. Allocate a ship type at **L3 (midpoint)** and another at **L5 (end)** of a five-level ladder. Ship types may be assigned across any rows/tracks; the D21 family-sharing rule does not govern them. Every ship must be recolorable. After its flash/reveal completes, a **Ship** section becomes available in the coach editor.

Recommended handoff boundary, pending the scene worker's actual API/artifact:

1. **Ship-scene producer owns:** stable `shipId`; model/asset path and license/owner metadata; intro scene entry point; recolorable material contract (surface/material names or masks and neutral base values); and a completion callback/event fired only after the reveal flash finishes. Do not let the scene directly award a second item or mutate battle-pass level progress.
2. **Battle-pass integration owns:** two stable ship reward IDs assigned at L3 and L5. The reward is granted idempotently with the existing level reward; persist ownership before presentation so reloads cannot lose it. Trigger the intro scene for a newly earned/unseen ship, then mark the reveal seen on its completion. The Ship editor section is visible once a ship is owned and its reveal has completed; allow replay after an interrupted reveal.
3. **Coach-editor integration owns:** read owned ship IDs and reveal state; show the Ship section when at least one owned ship has a completed reveal; list only owned ships; and persist selected ship plus its recolor choices using stable IDs. Reuse the editor's existing `colorTriad()` / material-color approach where compatible, but ship model materials must expose tintable surfaces and the editor must not assume a creature `textureId` is a valid ship model.
4. **Pack/build integration:** use optional-pack manifest metadata for each model/scene asset (the current optional-pack test exercises a `shared-ship` pack using stand-in bytes only). Real assets should be indexed by stable `shipId`; do not treat the fixture path `ship/ship.glb` or `shared-ship` as an agreed production schema.

### Evidence and open handoff points

- Searched available worktrees (`D:\myr5-work\portal`, `integrate`, `visual`, `materials`, `customizer`) for ship-named assets and ship/reveal implementation. No actual ship model, intro scene, or ship editor section was found. The only ship-specific code found is a stand-in in `tests/packs/build-optional-packs.test.mjs` (`ship/ship.glb`, `pack: 'shared-ship'`, test-only bytes); it verifies generic optional-pack packaging and is not production implementation.
- Current portal branch history contained the food-scanner work when inspected; no ship intro commit appeared in `git log --all` for the inspected repository. This does not rule out work in the separate task the user says is building the ship intros.
- The persistent unlock ledger already supports `weapon`, `pet`, `boss-texture`, `boss-skin`, `special`, `aura`, and `bonus`; the material store separately handles `texture`, `color`, and `palette`. Ships still need an explicit ownership plus reveal-seen representation and editor/model API rather than masquerading as an existing reward kind.
- Current editor only has the texture dropdown and color/palette swatches; there is no ship section. The scene worker should publish its proposed stable `shipId`, model path, recolorable surface mapping, completion callback/event, and current commit before integration begins.
- Still ambiguous: whether L3/L5 are two unique ships globally or each selected track/row gets its own type; how many ship types exist; whether ship unlocks are track-gated or shared across all user paths; how to represent ownership vs. reveal-seen state; and whether a completed reveal is required per account or merely before first editor access. The user specified the two ladder milestones and editor timing, but not those details. Default proposal: one distinct ship at L3 and one at L5 per overall pass, grant against the shared pass state, and gate first Ship-section visibility on the corresponding reveal completion.
- The current L3/L5 reward stacks are already dense under D16/D22/D32; adding ships in those slots increases that density. The user's instruction clearly sets the milestone levels, but does not say whether ship rewards replace another item in those slots or are additional.

## Evidence checked

- `plan/DECISIONS.md`: D14, D16, D21, D22, D26, D32, D33 in the consolidated plan worktree under `C:\Users\ianmy\Documents\Codex\2026-09-20\myr5-consolidated-implementation-and-stack-plan\worktrees\myr5-foundation\plan`.
- `plan/PLAN.md` §6.2–6.5 and art-import row: target item counts and art specs.
- `D:\myr5-work\materials\creature\source\creator\materials-registry.ts`: confirms placeholder texture metadata and legacy procedural families.
- `D:\myr5-work\visual\creature\source\creator\palettes.json`, `achievements-board.mjs`, and `pod/worlds/achievements.jpg`: current palette/board sources.
- `battle-pass-rewards.mjs` and `achievements-board.mjs` in the integration worktree: active reward labels and board row schedule.
