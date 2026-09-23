# Battle-pass art and texture allocation from existing assets

This allocation now reflects the additive post-download implementation in the integration worktree. It uses existing handed-off files only; it does not commission or generate new art. Texture bytes and large ship/biome bytes are staged under `plan/assets-inbox/` and are excluded from the core/Sites build.

## What is already present

| Existing source | What is usable now | State / limit |
|---|---|---|
| `creature/source/creator/materials-registry.ts` in the materials and visual worktrees | 23 legacy procedural surface families, Flat/Clay, 8 default color swatches, and 24 named battle-pass texture entries (3 for each of 8 exercise tracks). | The 24 battle-pass texture entries are metadata only: `familyId: -1`; the registry comment explicitly says no texture files exist yet. They can be allocated to levels, but cannot render as the named patterns until art/material definitions are made. Existing legacy families are renderable and can provide varied interim looks. |
| `creature/source/creator/palettes.json` in the visual worktree (and the same battle-pass palette data copied in the integration tree) | 12 aura-milestone palettes plus board reward palettes and Food palettes. Palette colors are triads, consistent with D32. | These are usable cosmetic rewards now. Reward IDs map to boss-level slots. |
| `achievements-board.mjs` and `pod/worlds/achievements.jpg` in `D:\myr5-work\visual` | Existing board/menu visual. D33 records the board image at 463 KB and kept it out of core install. | Board art is available/cached with the menu; it is not individual weapon/boss/pet art. |
| `creature/styles/00.png`–`22.png` in `D:\myr5-work\materials` | 23 thumbnails corresponding to the legacy surface families. | Useful as existing previews/swatch art; they are not the 24 new named texture maps. |
| `battle-pass-rewards.mjs` in the integration worktree | 24 texture names, 16 weapon concepts for workout styles, boss-look placeholders, 5 family pet concepts, and current reward-slot logic. | Names and descriptions are data, not image/model assets. Food weapon concepts are intentionally not granted. |
| Two texture packets staged under `plan/assets-inbox/creature-skins/{forged-realms,celestial-rift}` | 48 unique `creature-*` skin IDs, 330 WebP maps, source URLs, CC0-1.0 metadata, source byte lengths and SHA-256 digests. | Additive to the original fitness materials. 16 resumable track bundles (8 tracks per collection) are emitted by the section builder. No packet bytes are added to core/Sites. |
| Ship handoff from `D:\coach-merge` staged under `plan/assets-inbox/{ships,biomes}` | Six real ship GLBs (`supportive`, `direct`, `analytical`, `playful`, `calm`, `mom`; 61,059,860 bytes total) plus 24 biome WebP plates (274,238 bytes). | The builder emits six independently verified ship assets and one indexed biome bundle under a single on-demand section. Source scene uses a single mesh/material per ship; uniform tinting is possible, but multi-region 60/30/10 palette mapping needs authoring support. |

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
| L3 | Midway ships (three types, distributed by track order) | `supportive` on Chest/Strider, `direct` on Quads/Ringer, `analytical` on Glutes/Manyarm. They are additive to existing L3 items and do not use D21 family sharing. | One ship reward per named track; if a user's selected paths omit that track, that ship remains locked. Existing L3 rows are already dense. |
| L5 | End-of-ladder ships (three types, distributed by track order) | `playful` on Arms/Wedge, `calm` on Yoga/Blob, `mom` on Martial Arts/Cap. | One ship reward per named track. Existing L5 rows are already dense. |
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

The owner clarified that a separate worker supplied the ship intro/reveal scene. There are six stable ship types, distributed three at **L3 (midpoint)** and three at **L5 (end)** of the five-level ladder. Ship types may be assigned across any rows/tracks; D21 family-sharing does not govern them. Every ship must be recolorable. After its flash/reveal completes, the **Ship** section becomes available in the coach editor.

Recommended handoff boundary, pending the scene worker's actual API/artifact:

1. **Producer API preserved/adapted:** `window.myr5ShipScene.swap({ship,background,coach})`, `setShip`, `setBackground`, `setCoach`, `play`, and `openCustomizer`; events `myr5:ship-scene-ready` and `myr5:coach-scene-swap`. Arrival choreography is approach/hover → gold beam → white/gold full-screen flash → coach. Ship layer stays above the coach layer. Reveal completion must be explicit and after the flash.
2. **Battle-pass mapping implemented:** six stable `ship-*` reward IDs are granted on the first boss of their listed tracks at L3/L5. This is deterministic by row/track order, not family. The existing idempotent ledger now has a `ship` kind.
3. **Ownership/reveal gate implemented as a domain:** editor availability is derived from owned ship IDs plus per-account persisted reveal-seen IDs. A scene completion event only marks seen when `revealComplete` is true and ownership exists. The Ship editor panel still needs UI wiring to this gate and a selection/recolor interaction.
4. **Post-download delivery:** eight resumable track packets (`track-chest`, `track-quads`, `track-glutes`, `track-arms`, `track-yoga`, `track-martial-arts`, `track-cardio`, `track-meditation`) each combine the track's Forged Realms and Celestial Rift maps into one indexed bundle. The starter set resolves from the user's selected workout styles plus Meditation; each remaining workout packet is separately addressable. The complete full-download aggregation includes all eight track packets and the independent `coach-ships-biomes` packet. Six ship GLBs remain individual assets and all 24 biome plates are one indexed asset. Existing chunk policy (1 MiB chunk, 64 MiB per asset, 128 MiB per section) is unchanged. Metadata is deliberately unsigned with activation marked `blocked-until-signed-and-hosted`; this branch has no production signer configured. Generated bytes and source binaries live under `plan/assets-inbox`, not core/Sites.

### Evidence and open handoff points

- The handoff source is present in `D:\coach-merge`: `ship-intro.mjs`, `ship-scene-domain.mjs`, `ship-scene.css`, `pose.html`, `app.mjs`, `tests/ship-scene-domain.test.mjs`, six GLBs, and 23 biome plates. The source handoff's model URLs were static paths; the integration uses a verified asset bridge backed by `ChunkDownloader` and Blob URLs instead, so raw models are not core files.
- `modules/ships/ship-access.mjs` requires both the persistent `ship-*` ownership ledger and a per-account reveal-seen record. It accepts only `myr5:ship-scene-ready` details with `revealComplete: true`.
- The new intro scene must be mounted only with an owned, signed chunk section. The source signing key is currently `null` (`productionMaterialTrust()`); until deployment provisions signing and publishes chunk-range URLs under `/materials/`, the post-download resolver fails closed and reveal activation is unavailable.
- Recolor QA found one mesh, one material, and no vertex-color channel in each of the six handoff GLBs. Current support multiplies the full ship's base color by one selected tint. The exact 60/30/10 triad cannot be separated across ship regions with these models as-is; a future model revision needs per-region surfaces or tint masks.
- The precise track assignments above are a deterministic distribution proposal now encoded in `battle-pass-rewards.mjs`. They add to existing L3/L5 rewards rather than replace one; the owner has not requested an existing item be removed. The assignments are track-gated, so selected paths that omit a mapped track do not unlock its ship.

## Evidence checked

- `plan/DECISIONS.md`: D14, D16, D21, D22, D26, D32, D33 in the consolidated plan worktree under `C:\Users\ianmy\Documents\Codex\2026-09-20\myr5-consolidated-implementation-and-stack-plan\worktrees\myr5-foundation\plan`.
- `plan/PLAN.md` §6.2–6.5 and art-import row: target item counts and art specs.
- `D:\myr5-work\materials\creature\source\creator\materials-registry.ts`: confirms placeholder texture metadata and legacy procedural families.
- Packet manifests and actual files staged at `plan/assets-inbox/creature-skins/`; ship handoff staged at `plan/assets-inbox/ships/` and `plan/assets-inbox/biomes/`.
- `D:\coach-merge\ship-intro.mjs`, `ship-scene-domain.mjs`, `ship-scene.css`, `tests/ship-scene-domain.test.mjs`, ship GLBs, and biome plates.
- `D:\myr5-work\visual\creature\source\creator\palettes.json`, `achievements-board.mjs`, and `pod/worlds/achievements.jpg`: current palette/board sources.
- `battle-pass-rewards.mjs` and `achievements-board.mjs` in the integration worktree: active reward labels and board row schedule.
