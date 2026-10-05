# Release 21 integration unlock inventory

Captured 2026-10-05T03:09:01.710Z from the integrated working tree at commit `f29cb68d5c7fc9097518b793c9f2f29dcf3a7869`. Source hashes, every expanded grant ID, tier ID, option ID, and legacy reward placement are in [the JSON inventory](release21-unlock-inventory.json). This snapshot inventories implemented catalogs; it is not a published-build receipt.

The new cosmetic pass has 250 levels and 249 packs. Coaches, coach-shaped 64-bit bodies, golden variants, weapon progression and six ships use performance or tandem ownership. XP cosmetics have 175 collectible entries per coach (11,725 across all 67 coaches). The six-month benchmark covers XP cosmetics; achievement rewards are outside that deadline.

## Counts and source authority

| Category | Count | Current acquisition / source |
| --- | --- | --- |
| coaches | 67 | performance-catalog.mjs: COACHES |
| starterCoaches | 18 | STARTER_COACH_IDS |
| performanceCoaches | 49 | COACH_REQUIREMENTS |
| rejectedBodies | 4 | Expanded catalog in JSON |
| workouts | 57 | exercise-library.mjs: EXERCISES |
| textures | 50 | Expanded catalog in JSON |
| colors | 31 | Expanded catalog in JSON |
| palettes | 107 | Expanded catalog in JSON |
| xpCosmeticsPerCoach | 175 | Expanded catalog in JSON |
| xpCosmetics | 11725 | reward-packs.mjs: owned-coach pools |
| cosmeticLevels | 250 | progression-rules.mjs: COSMETIC_LEVEL_XP |
| XPpacks | 249 | battle-pass.mjs: syncBattlePass() |
| weaponFamilies | 20 | pod/gala-weapons.js |
| weaponTiers | 420 | 20 families x 21 tiers (tier 0 free) |
| weaponAbilities | 100 | pod/weapon-evolution.mjs: five abilities per family |
| ships | 6 | performance-catalog.mjs + modules/ships/ship-catalog.mjs |
| powers | 4 | pod/identity.mjs + server/domain.mjs |
| galaVisibleOptions | 340 | pod/gala-avatar.js: section.choices |
| galaCompatibleAdditional | 340 | saved recipe choices outside curated menus |
| legacyBosses | 38 | Expanded catalog in JSON |
| installedCreatureSkins | 48 | Expanded catalog in JSON |
| legacyUniqueRewards | 397 | deduplicated kind + id, legacy reward tables |

## Every coach, golden version and tandem 64-bit body

All IDs below are stable base IDs. For each row, the WarRoom 64-bit body uses that same ID and becomes selectable with the coach; no pack is needed. Golden variant inventory IDs are `golden:<base ID>` (descriptive IDs; saved gold ownership is keyed by base coach ID). A ten-minute uninterrupted active hold awards gold for matching coaches and the selected owned coach. Pauses do not add hold time. The coach-shaped body uses the existing mirror skin-color switcher and has no Gala clothing or replacement heads.

| Base ID | Coach | Gate |
| --- | --- | --- |
| myr5 | Original MYR5 | Starter |
| roster/01-seed-pearo--3d_character_model | Seed · Pearo 1 | Starter |
| roster/01-seed-pearo--cute_alien_figure_3d_model | Seed · Pearo 2 | Starter |
| roster/01-seed-pearo--blank_toy_figure_3d_model | Seed · Pearo 5 | Starter |
| roster/02-taper-tallstalk--3d_humanoid_figure | Taper · Tallstalk 1 | Starter |
| roster/02-taper-tallstalk--humanoid_robot_3d_model1 | Taper · Tallstalk 2 | easy; shoulders; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/02-taper-tallstalk--white_humanoid_doll_3d_model | Taper · Tallstalk 3 | Starter |
| roster/03-pearl-orb-ring--abstract_humanoid_3d_model | Pearl · Orb 1 | Starter |
| roster/03-pearl-orb-ring--circle_center | Pearl · Orb 2 | Starter |
| roster/03-pearl-orb-ring--ringed_humanoid_3d_model | Pearl · Orb 3 | easy; cardio; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/03-pearl-orb-ring--robot_3d_model | Pearl · Orb 4 | hard; cardio; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/03-pearl-orb-ring--stylized_3d_character1 | Pearl · Orb 5 | hard; hips; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/03-pearl-orb-ring--stylized_humanoid_figure_3d_model | Pearl · Orb 6 | expert; hips; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/04-crest-wedge--robot_creature_3d_model | Crest · Wedge 1 | hard; chest; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/04-crest-wedge--stylized_3d_character | Crest · Wedge 2 | Starter |
| roster/05-slope-bobble--clay_humanoid_figure_3d_model | Slope · Bobble 1 | medium; stances, boxing; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/06-ridge-triad--geometric_robot_3d_model1 | Ridge · Triad 1 | easy; chest; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/06-ridge-triad--robot_3d_model1 | Ridge · Triad 2 | medium; cardio; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/07-bulb-sphereling--cute_robot_3d_model | Bulb · Sphereling 1 | Starter |
| roster/07-bulb-sphereling--humanoid_robot_3d_model | Bulb · Sphereling 2 | easy; cardio; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/08-shard-asym--geometric_robot_3d_model | Shard · Asym 1 | easy; chest; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/08-shard-asym--robot_3d_model4 | Shard · Asym 2 | expert; shoulders; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/08-shard-asym--fantasy_creature_3d_model2 | Shard · Asym 3 | hard; stances, boxing; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/08-shard-asym--stylized_action_figure_3d_model | Shard · Asym 4 | medium; core, balance, yoga; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/09-monolith-tanka--3d_robot_model | Monolith · Tanka 1 | Starter |
| roster/09-monolith-tanka--boxy_humanoid_3d_model | Monolith · Tanka 2 | easy; stances, boxing; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/09-monolith-tanka--mini_robot_3d_model | Monolith · Tanka 3 | hard; stances, boxing; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/09-monolith-tanka--robot_3d_model3 | Monolith · Tanka 5 | expert; stances, boxing; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/09-monolith-tanka--white_horned_robot_3d_model | Monolith · Tanka 6 | Starter |
| roster/10-petal-wisp--stylized_creature_3d_model | Petal · Wisp 1 | hard; core, balance, yoga; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/10-petal-wisp--ghost_character_3d_model | Petal · Wisp 2 | medium; core, balance, yoga; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/10-petal-wisp--fantasy_creature_3d_model4 | Petal · Wisp 3 | easy; core, balance, yoga; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/11-anvil-cask--clay-style_robot_3d_model | Anvil · Cask 1 | easy; stances, boxing; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/12-seedpod-snailslug--stylized_slug_3d_model | Seedpod · Snailslug 1 | hard; meditation; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/12-seedpod-snailslug--stylized_worm_3d_model | Seedpod · Snailslug 2 | expert; meditation; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/13-fan-split--stylized_3d_character2 | Fan · Split 1 | medium; legs; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/13-fan-split--stylized_toy_3d_model | Fan · Split 2 | expert; stances, boxing; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/14-chisel-spire--cone_head_3d_model | Chisel · Spire 1 | medium; stances, boxing; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/14-chisel-spire--low_poly_robot_3d_model | Chisel · Spire 2 | expert; meditation; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/15-orbital-coili--robot_character_3d_model | Orbital · Coili 1 | easy; legs; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/16-spade-arch--pyramid_head_figure_3d_model | Spade · Arch 1 | medium; chest, stances, boxing; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/16-spade-arch--stylized_humanoid_3d_model | Spade · Arch 2 | expert; chest; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/17-shellcap-manyarm--3d_character_figurine | Shellcap · Manyarm 1 | Starter |
| roster/17-shellcap-manyarm--mushroom_creature_3d_model | Shellcap · Manyarm 2 | medium; shoulders; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/17-shellcap-manyarm--mushroom_robot_3d_model | Shellcap · Manyarm 3 | hard; shoulders; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/18-quad-all--dragon_creature_3d_model | Four-legged 1 | easy; meditation; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/18-quad-all--fantasy_creature_3d_model1 | Four-legged 2 | easy; meditation; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/18-quad-all--fantasy_creature_3d_model3 | Four-legged 3 | easy; meditation; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/18-quad-all--four-legged_robot_3d_model | Four-legged 4 | medium; meditation; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/18-quad-all--quadruped_robot_3d_model1 | Four-legged 5 | medium; meditation; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/18-quad-all--quadruped_robot_3d_model | Four-legged 6 | hard; meditation; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/18-quad-all--robotic_dog_3d_model | Four-legged 7 | hard; meditation; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/18-quad-all--wooden_four-legged_robot_3d_model | Four-legged 9 | Starter |
| roster/18-quad-all--wooden_robot_3d_model | Four-legged 10 | Starter |
| roster/19-genie-multi--fantasy_creature_3d_model | Genie · Multi 1 | easy; core, balance, yoga; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/19-genie-multi--multi-armed_humanoid_3d_model1 | Genie · Multi 2 | easy; shoulders; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/19-genie-multi--multi-armed_humanoid_3d_model | Genie · Multi 3 | medium; shoulders; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/19-genie-multi--stylized_octopus_3d_model | Genie · Multi 4 | expert; core, balance, yoga; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/20-lume--robotic_figure_3d_model | Lume 1 | expert; cardio; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/21-flyer--winged_humanoid_3d_model | Flyer 1 | Starter |
| roster/22-curve--stylized_alien_3d_model | Curve 1 | hard; core, balance, yoga; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/22-curve--stylized_cartoon_figure_3d_model | Curve 2 | hard; legs; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/23-blob-texture-bodies--blob_creature_3d_model | Blob 1 | Starter |
| roster/23-blob-texture-bodies--cute_blob_creature_3d_model | Blob 2 | Starter |
| roster/23-blob-texture-bodies--honeycomb_humanoid_3d_model | Blob 3 | easy; hips; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/23-blob-texture-bodies--patchwork_plush_figure_3d_model | Blob 4 | hard; shoulders; hold 300 continuous seconds / working reps 15; cadence exceptions below |
| roster/23-blob-texture-bodies--sand_creature_3d_model | Blob 5 | medium; hips; hold 300 continuous seconds / working reps 15; cadence exceptions below |

Meditation coaches use completed meditation-day thresholds 3 / 6 / 9 / 12 by difficulty. Sprint cadence is five completed rounds; gentle-cardio and pace cadence each require 300 active seconds. These cadence thresholds are provisional catalog defaults. Every matching coach at the achieved group and difficulty is unlocked.

Rejected model assets are present in the source roster but have no selectable/unlockable body: `roster/01-seed-pearo--white_3d_character_model`, `roster/01-seed-pearo--blank_humanoid_figure_3d_model`, `roster/09-monolith-tanka--robot_3d_model2`, `roster/18-quad-all--stylized_quadruped_3d_model`.

## Workout selections and difficulty levels

Exercise selections are already available; their difficulty controls rewards rather than requiring cosmetic levels. Preparation sets give no XP or training-history entry; only the working set counts. Difficulty is derived from each group/kind ordered list, not the exercise metadata label.

| Exercise ID | Name | Group | Kind | Progression difficulty |
| --- | --- | --- | --- | --- |
| knee-pushup | Knee push-up | chest | reps | easy |
| high-incline-pushup | High incline push-up | chest | reps | easy |
| low-incline-pushup | Low incline push-up | chest | reps | medium |
| pushup | Regular push-up | chest | reps | medium |
| wide-pushup | Wide push-up | chest | reps | hard |
| slow-pushup | Slow push-up | chest | reps | hard |
| diamond-pushup | Diamond push-up | chest | reps | expert |
| decline-pushup | Feet-elevated push-up | chest | reps | expert |
| shallow-squat | Shallow squat | legs | reps | easy |
| squat | Bodyweight squat | legs | reps | easy |
| wide-squat | Wide squat | legs | reps | medium |
| pause-squat | Pause squat | legs | reps | medium |
| slow-squat | Slow squat | legs | reps | hard |
| split-left | Split squat · left | legs | reps | hard |
| split-right | Split squat · right | legs | reps | expert |
| wall-sit | Wall sit | legs | hold | easy |
| small-hinge | Small hip hinge | hips | reps | easy |
| hip-hinge | Hip hinge | hips | reps | easy |
| good-morning | Bodyweight good morning | hips | reps | medium |
| glute-bridge | Glute bridge | hips | reps | hard |
| pause-bridge | Pause glute bridge | hips | reps | expert |
| knee-plank | Knee plank | core | hold | easy |
| high-plank | High plank | core | hold | easy |
| forearm-plank | Forearm plank | core | hold | medium |
| side-knee-left | Side knee plank · left | core | hold | medium |
| side-knee-right | Side knee plank · right | core | hold | hard |
| side-plank-left | Side plank · left | core | hold | hard |
| side-plank-right | Side plank · right | core | hold | expert |
| front-raise | Front arm raise | shoulders | reps | easy |
| lateral-raise | Lateral arm raise | shoulders | reps | easy |
| overhead-reach | Overhead reach | shoulders | reps | medium |
| standing-press | Standing arm press | shoulders | reps | hard |
| slow-press | Slow arm press | shoulders | reps | expert |
| knee-balance | Knee-lift balance | balance | hold | easy |
| low-tree | Low tree pose | balance | hold | medium |
| tree | Tree pose | balance | hold | hard |
| overhead-tree | Tree · arms overhead | balance | hold | expert |
| mountain | Mountain | yoga | hold | easy |
| salute | Upward salute | yoga | hold | easy |
| chair | Chair pose | yoga | hold | medium |
| warrior-one | Warrior I | yoga | hold | hard |
| warrior | Warrior II | yoga | hold | hard |
| goddess | Goddess pose | yoga | hold | expert |
| high-horse | High horse stance | stances | hold | easy |
| horse | Horse stance | stances | hold | easy |
| low-horse | Lower horse stance | stances | hold | medium |
| front-stance-left | Front stance · left | stances | hold | hard |
| front-stance-right | Front stance · right | stances | hold | expert |
| jab-left | Left straight practice | boxing | pace | easy |
| jab-right | Right straight practice | boxing | pace | medium |
| boxing | Alternating straights | boxing | pace | hard |
| double-jab | Double-jab practice | boxing | pace | expert |
| march | Easy march | cardio | steps | easy |
| high-march | High-knee march | cardio | steps | medium |
| jogging | Jog in place | cardio | steps | hard |
| step-jack | Step jack | cardio | reps | easy |
| jumping-jack | Jumping jack | cardio | reps | hard |

## XP collectible texture, color and palette IDs

Every collectible below belongs to an owned coach. The exact grant ID is `coach:<encodeURIComponent(base coach ID)>:<item ID>`. The JSON expands every eligible combination. Free textures and free hex channels remain free. The random 64-bit category grants a **Pixel Finish texture variant** (`coach-64-bit`, ownership item `<coach ID>-skin`), not the automatically unlocked coach-shaped character.

| Texture ID | Name | Acquisition |
| --- | --- | --- |
| flat | Flat | Free |
| clay | Clay | Free |
| legacy-0 | Original MYR5 | XP pack texture category / max-level completion |
| legacy-1 | Verdant | XP pack texture category / max-level completion |
| legacy-2 | Mycelial | XP pack texture category / max-level completion |
| legacy-3 | Chitin | XP pack texture category / max-level completion |
| legacy-4 | Reptilian | Free |
| legacy-5 | Abyssal | XP pack texture category / max-level completion |
| legacy-6 | Coral | XP pack texture category / max-level completion |
| legacy-7 | Skeletal | XP pack texture category / max-level completion |
| legacy-8 | Spectral | XP pack texture category / max-level completion |
| legacy-9 | Infernal | XP pack texture category / max-level completion |
| legacy-10 | Celestial | XP pack texture category / max-level completion |
| legacy-11 | Voidborn | XP pack texture category / max-level completion |
| legacy-12 | Eldritch | XP pack texture category / max-level completion |
| legacy-13 | Stone Golem | XP pack texture category / max-level completion |
| legacy-14 | Crystal | XP pack texture category / max-level completion |
| legacy-15 | Magma | XP pack texture category / max-level completion |
| legacy-16 | Glacial | XP pack texture category / max-level completion |
| legacy-17 | Stormcharged | XP pack texture category / max-level completion |
| legacy-18 | Clockwork Robot | XP pack texture category / max-level completion |
| legacy-19 | Neon Synth | XP pack texture category / max-level completion |
| legacy-20 | Fluffy | XP pack texture category / max-level completion |
| legacy-21 | Jelly | XP pack texture category / max-level completion |
| legacy-22 | Baby | Free |
| chest-plate-steel | Plate Steel | XP pack texture category / max-level completion |
| chest-rubber-grip | Rubber Grip | XP pack texture category / max-level completion |
| chest-chain-mail | Chain Mail | XP pack texture category / max-level completion |
| quads-track-rubber | Track Rubber | XP pack texture category / max-level completion |
| quads-denim | Denim | XP pack texture category / max-level completion |
| quads-hex-tread | Hex Tread | XP pack texture category / max-level completion |
| glutes-sweatshirt-fleece | Sweatshirt Fleece | XP pack texture category / max-level completion |
| glutes-quilted | Quilted | XP pack texture category / max-level completion |
| glutes-peach | Speckled | Free |
| arms-hammered-bronze | Hammered Bronze | XP pack texture category / max-level completion |
| arms-rope | Fine Stripe | Free |
| arms-leather | Snake Skin | Free |
| yoga-cork | Holey | Free |
| yoga-woven-mat | Woven Mat | XP pack texture category / max-level completion |
| yoga-petal | Petal | XP pack texture category / max-level completion |
| martial-arts-canvas-gi | Graph Paper | Free |
| martial-arts-bamboo | Bamboo | Free |
| martial-arts-dragon-scale | Dragon Scale | XP pack texture category / max-level completion |
| cardio-mesh | Cool Graph Paper | Free |
| cardio-terry-cloth | Terry Cloth | XP pack texture category / max-level completion |
| cardio-pebble-path | Pebble Path | XP pack texture category / max-level completion |
| meditation-sand-garden | Wiggles | Free |
| meditation-river-stone | River Stone | XP pack texture category / max-level completion |
| meditation-moss | Moss | Free |
| coach-64-bit | 64-bit Pixel Finish | XP pack 64-bit category / max-level completion |

| Color ID | Name | Primary / secondary / accent |
| --- | --- | --- |
| default-slate | Slate | #8b8f9a / #4a4d55 / #e7e9ee |
| default-clay | Warm Clay | #b7a68e / #7a6b57 / #ddcdb3 |
| default-ruby | Ruby | #a23b4a / #4f1620 / #f2a3ae |
| default-sapphire | Sapphire | #2d5aa0 / #122a4d / #a9c9f5 |
| default-moss | Moss | #4c7a3f / #20351a / #c3e6a8 |
| default-gold | Gold | #c9a13a / #5f4a15 / #ffe9a8 |
| default-charcoal | Charcoal | #333238 / #131318 / #8d8d96 |
| default-blush | Blush | #d98fa0 / #7a3d49 / #ffdbe4 |
| legacy-color-0 | Original MYR5 (original) | #7946aa / #351344 / #b373d4 |
| legacy-color-1 | Verdant (original) | #3f7448 / #1e3b2b / #b8dd6e |
| legacy-color-2 | Mycelial (original) | #d5c7ae / #776b82 / #f59ec4 |
| legacy-color-3 | Chitin (original) | #4f263d / #180f20 / #d17663 |
| legacy-color-4 | Reptilian (original) | #5f7a3f / #283621 / #cfb85c |
| legacy-color-5 | Abyssal (original) | #132a42 / #06111f / #4edfd3 |
| legacy-color-6 | Coral (original) | #e46867 / #70344c / #ffd27a |
| legacy-color-7 | Skeletal (original) | #d8d0af / #80785f / #fff7d1 |
| legacy-color-8 | Spectral (original) | #8ed9cd / #294c58 / #d5fff8 |
| legacy-color-9 | Infernal (original) | #7b211e / #260b0a / #ff8a2a |
| legacy-color-10 | Celestial (original) | #e6dca4 / #786da7 / #fffbd7 |
| legacy-color-11 | Voidborn (original) | #16101f / #060409 / #9f64ff |
| legacy-color-12 | Eldritch (original) | #6b426c / #252038 / #b6ef63 |
| legacy-color-13 | Stone Golem (original) | #6f7068 / #393b37 / #b7a37d |
| legacy-color-14 | Crystal (original) | #896bc2 / #302e66 / #e0c8ff |
| legacy-color-15 | Magma (original) | #4a1713 / #140706 / #ffb22f |
| legacy-color-16 | Glacial (original) | #93c9df / #315a76 / #ebfdff |
| legacy-color-17 | Stormcharged (original) | #48536e / #1a2236 / #c3f7ff |
| legacy-color-18 | Clockwork Robot (original) | #9a6a37 / #33251d / #efd08c |
| legacy-color-19 | Neon Synth (original) | #251d54 / #0b0921 / #ff5bd7 |
| legacy-color-20 | Fluffy (original) | #d6a987 / #bb8969 / #ffe4c3 |
| legacy-color-21 | Jelly (original) | #a7ec69 / #f1ffd4 / #c9ff90 |
| legacy-color-22 | Baby (original) | #efb398 / #d68e7c / #ffe2d5 |

| Palette IDs and names | Palette IDs and names |
| --- | --- |
| pal-01: Morning Mist | pal-02: River Clay |
| pal-03: Static Pop | pal-04: Night Shift |
| pal-05: Tin Star | pal-06: Meadow Line |
| pal-07: Campfire | pal-08: Signal Jam |
| pal-09: Deep Well | pal-10: Chrome Garden |
| pal-11: Sorbet Stand | pal-12: Foundry Floor |
| pal-13: Break Room Nebula | pal-14: Quarterly Peach |
| pal-15: Rust Protocol | pal-16: Hazard Brunch |
| pal-17: Polished Complaint | pal-18: Moon Mold |
| pal-19: Lobby Carpet 1987 | pal-20: Copper Memo |
| pal-21: Radioactive Lemonade | pal-22: Executive Void |
| pal-23: Gravity Optional | pal-24: Mud Season |
| pal-25: Alarm Clock Red | pal-26: Galvanized Nap |
| pal-27: Server Room Cold | pal-28: Fog Machine Mint |
| pal-29: Basement Terrarium | pal-30: Traffic Cone Theory |
| pal-31: Pewter Paperwork | pal-32: Eclipse Budget |
| pal-33: Deep Freeze Aisle | pal-34: Loaf Mode |
| pal-35: Checkered Finish | pal-36: Brass Compliance |
| pal-37: Midnight Snack Run | pal-38: Lab Coat Blush |
| pal-39: Swamp Receptionist | pal-40: Hot Sauce Warning |
| pal-41: Anodized Grudge | pal-42: Tar Pit Lounge |
| pal-43: Cushion Theory | pal-44: Terracotta Army Surplus |
| pal-45: Glowstick Aftermath | pal-46: Blushing Alloy |
| pal-47: Deep Sea Intern | pal-48: Strawberry Milk Incident |
| pal-49: Cardigan Weather | pal-50: Caution Tape Couture |
| pal-51: Gunmetal Lunchbox | pal-52: Cosmic Overtime |
| pal-53: Hologram Receipt | pal-54: Ochre Deadline |
| pal-55: Blueprint Tantrum | pal-56: Trophy Polish Pending |
| pal-57: Oxblood Minutes | pal-58: Butter Alert |
| pal-59: Sagebrush Voicemail | pal-60: Bad Idea Magenta |
| pal-61: Heat-Treated Feelings | pal-62: Marshmallow Tribunal |
| pal-63: Night Hike Protocol | pal-64: Warden's Paperweight |
| pal-65: Tribunal Velvet | pal-66: Aurora Parking Lot |
| pal-67: Iris Firmware | pal-68: Mushroom Middle Management |
| pal-69: Laser Pointer Lure | pal-70: Champagne Invoice |
| pal-71: Plum Tuesday | pal-72: Pool Noodle Diplomacy |
| pal-73: Oil Slick Optimism | pal-74: Cinnamon Filing Cabinet |
| pal-75: Night Vision Pickle | pal-76: Melon Ballot |
| pal-77: Dojo Fire Drill | pal-78: Sword Warranty Void |
| pal-79: Straw Hat Budget | pal-80: Sparring Bruise |
| pal-81: Rice Paper Memo | pal-82: Finish Line Panic |
| pal-83: Sweat-Proof Chrome | pal-84: Trail Mix Audit |
| pal-85: Treadmill at 3 AM | pal-86: Cotton Candy Cardio |
| pal-87: Emergency Jogging Vest | pal-88: Medal Ceremony Bronze |
| pal-89: Hiking Boot Liability | pal-90: Stadium Lights Off |
| pal-91: Quiet Hours Lemon | pal-92: Gong Show Teal |
| pal-93: Hum Frequency Gold | pal-94: Temple Step Sandstone |
| pal-95: Deep Breath Abyss | pal-96: Lotus Pending Approval |
| pal-97: Enlightenment Hi-Vis | pal-98: Lunar Silverware |
| pal-99: Lichen Standup Meeting | pal-100: Lume's Night Light |
| pal-101: Afterglow Alloy | pal-102: Final Boss Sunrise |
| pal-103: Kale Compliance | pal-104: Tomato Paperwork |
| pal-105: Oatmeal Standby | pal-106: Blueberry Audit |
| pal-107: Avocado Escrow |  |

Free color channels: `#060409`, `#ffffff`, `#7f7d78`, `#ff3b30`, `#ff8a2a`, `#ffd100`, `#2bd97c`, `#008c8c`, `#2454d6`, `#6a2bd9`, `#f59ec4`, `#7a5530`, `#c4a77d`, `#0b1a45`, `#9fe2bf`. Palette colors are contained in each palette JSON record; an owned palette maps its colors onto the selected texture?s existing dark, middle and light values on the Body, Head or Eyes part, leaving the other parts unchanged. No independent color pattern is added; Flat remains uniform. Palette colors are not distributed across different parts or granted as separate base colors. Historic `unlockRule`, `reward` and `unlockAtDay` metadata is retained in the registry, but the current cosmetic pack pool contains all 107 palettes.

## Cosmetic levels and packs

Level 1 is the initial free rank. Levels 2-250 each award one idempotent pack: `reward-pack:<tier>:cosmetic-pass-v2:L<level>`. Multiples of ten are legendary, other multiples of five rare, remaining levels uncommon. Uncommon contains one item with color/Pixel Finish/texture odds 90/7/3%; rare contains two at 80/15/5%; legendary contains three at 70/20/10%. Duplicates are prevented until the eligible owned-coach collection is complete. Level 250 completes the currently eligible collection, and revisiting max-level sync includes newly owned coaches.

Cumulative XP by level (all 250 exact thresholds; JSON also gives each incremental cost):

| Levels | Cumulative XP |
| --- | --- |
| 1-10 | L1=0; L2=40; L3=88; L4=144; L5=208; L6=281; L7=362; L8=451; L9=548; L10=653 |
| 11-20 | L11=766; L12=888; L13=1017; L14=1155; L15=1301; L16=1455; L17=1618; L18=1788; L19=1966; L20=2153 |
| 21-30 | L21=2348; L22=2551; L23=2762; L24=2981; L25=3209; L26=3445; L27=3688; L28=3940; L29=4200; L30=4468 |
| 31-40 | L31=4745; L32=5029; L33=5322; L34=5623; L35=5932; L36=6249; L37=6574; L38=6907; L39=7249; L40=7599 |
| 41-50 | L41=7957; L42=8323; L43=8697; L44=9079; L45=9469; L46=9868; L47=10275; L48=10690; L49=11113; L50=11544 |
| 51-60 | L51=11983; L52=12431; L53=12886; L54=13350; L55=13822; L56=14302; L57=14791; L58=15287; L59=15791; L60=16304 |
| 61-70 | L61=16825; L62=17354; L63=17891; L64=18436; L65=18990; L66=19552; L67=20121; L68=20699; L69=21285; L70=21879 |
| 71-80 | L71=22482; L72=23092; L73=23711; L74=24338; L75=24973; L76=25616; L77=26267; L78=26926; L79=27594; L80=28270 |
| 81-90 | L81=28954; L82=29646; L83=30346; L84=31054; L85=31770; L86=32495; L87=33228; L88=33969; L89=34718; L90=35475 |
| 91-100 | L91=36240; L92=37014; L93=37795; L94=38585; L95=39383; L96=40189; L97=41004; L98=41826; L99=42657; L100=43495 |
| 101-110 | L101=44342; L102=45197; L103=46060; L104=46932; L105=47811; L106=48699; L107=49594; L108=50498; L109=51410; L110=52331 |
| 111-120 | L111=53259; L112=54195; L113=55140; L114=56093; L115=57054; L116=58023; L117=59000; L118=59986; L119=60979; L120=61981 |
| 121-130 | L121=62991; L122=64009; L123=65035; L124=66069; L125=67112; L126=68162; L127=69221; L128=70288; L129=71363; L130=72446 |
| 131-140 | L131=73537; L132=74637; L133=75745; L134=76860; L135=77984; L136=79116; L137=80257; L138=81405; L139=82562; L140=83726 |
| 141-150 | L141=84899; L142=86080; L143=87269; L144=88467; L145=89672; L146=90886; L147=92107; L148=93337; L149=94575; L150=95822 |
| 151-160 | L151=97076; L152=98338; L153=99609; L154=100888; L155=102175; L156=103470; L157=104773; L158=106085; L159=107404; L160=108732 |
| 161-170 | L161=110068; L162=111412; L163=112764; L164=114124; L165=115493; L166=116869; L167=118254; L168=119647; L169=121048; L170=122457 |
| 171-180 | L171=123875; L172=125300; L173=126734; L174=128175; L175=129625; L176=131084; L177=132550; L178=134024; L179=135507; L180=136997 |
| 181-190 | L181=138496; L182=140003; L183=141518; L184=143042; L185=144573; L186=146113; L187=147661; L188=149216; L189=150781; L190=152353 |
| 191-200 | L191=153933; L192=155522; L193=157118; L194=158723; L195=160336; L196=161957; L197=163586; L198=165224; L199=166869; L200=168523 |
| 201-210 | L201=170185; L202=171855; L203=173533; L204=175219; L205=176914; L206=178616; L207=180327; L208=182046; L209=183773; L210=185508 |
| 211-220 | L211=187252; L212=189003; L213=190763; L214=192531; L215=194307; L216=196091; L217=197883; L218=199683; L219=201492; L220=203309 |
| 221-230 | L221=205133; L222=206966; L223=208808; L224=210657; L225=212514; L226=214380; L227=216254; L228=218136; L229=220026; L230=221924 |
| 231-240 | L231=223830; L232=225745; L233=227667; L234=229598; L235=231537; L236=233484; L237=235440; L238=237403; L239=239374; L240=241354 |
| 241-250 | L241=243342; L242=245338; L243=247342; L244=249355; L245=251375; L246=253404; L247=255440; L248=257485; L249=259538; L250=261600 |

The endpoint is 261,600 XP = 120 sessions x (30 expert active minutes x 28 XP/minute x meditation 2 + daily trio 500). This is a benchmark, not a forced elapsed-time unlock. Meditation doubles that day's workout XP; completing workout, meditation and food gives a separate 500 once that day. Each performance-earned coach adds 0.25 to the coach XP multiplier; starter coaches do not add a bonus.

## All weapon families, tiers and abilities

Each family has free tier 0 plus 20 performance tiers. Difficulties occupy five-tier blocks: easy 1-5, medium 6-10, hard 11-15, expert 16-20. The first hold minute / eight working reps awards block position 1; three hold minutes / 12 reps position 2; completing five hold minutes / 15 reps starts coach-completion upgrades, with repeated completions advancing inside the five-tier block. A ten-minute uninterrupted hold reaches the block's position 5. Cadence workouts advance their corresponding block on completion. Existing maximum tier is preserved when a lower milestone is completed.

| Family ID | Name | Workout group | Ability names at tiers 4 / 8 / 12 / 16 / 20 |
| --- | --- | --- | --- |
| rapier | Plasma blade | boxing | Crescent cut / Twin crescent / Sky sever / Rift ballet / Horizon split |
| greatsword | Ion cleaver | legs | Heavy arc / Fault line / Meteor cleave / World breaker / Heaven fall |
| dagger | Phase dagger | stances | Phase step / Double take / Ghost rush / Afterimage storm / Zero moment |
| sabre | Arc pistol | balance | Arc shot / Ricochet / Chain flash / Lightning fan / Thunder crown |
| axe | Pulse rifle | balance | Pulse burst / Split volley / Crossfire / Aurora barrage / Infinite salvo |
| hammer | Rail cannon | legs | Rail shot / Twin rail / Ion tunnel / Orbital piercer / Skyline erase |
| mace | Tesla emitter | core | Coil lash / Forked current / Tesla web / Storm cage / Living lightning |
| flail | Tether drone | cardio | Drone dive / Twin dive / Hunter spiral / Satellite rush / Constellation fall |
| spear | Particle lance | stances | Lance thrust / Triple pierce / Comet lance / Starfall spear / Event horizon |
| trident | Tri-beam fork | shoulders | Tri-beam / Prism fork / Ninefold light / Sky lattice / Prism cathedral |
| halberd | Rocket pod | hips | Rocket salvo / Cluster bloom / Meteor rain / Orbital garden / Supernova parade |
| scythe | Gravity reaper | hips | Gravity sweep / Twin moon / Orbit harvest / Rift scythe / Eclipse reaper |
| bow | Photon bow | shoulders | Photon arrow / Split star / Comet rain / Heaven string / Constellation arrow |
| crossbow | Gauss rifle | chest | Gauss bolt / Capacitor burst / Prism bolt / Warp volley / Luminous spearhead |
| chakram | Orbit disc | cardio | Orbit throw / Twin orbit / Solar wheel / Rift carousel / Galaxy return |
| gauntlets | Power gauntlets | boxing | Power rush / Twin impact / Meteor fists / Dragon engine / Thousand suns |
| staff | Gravity rod | yoga | Gravity well / Twin wells / Orbit crush / Singularity / Pocket universe |
| wand | Sonic disruptor | yoga | Sonic ring / Triple echo / Resonance wall / Aurora wave / Universe echo |
| tome | Nanite hive | core | Nanite rush / Split hive / Prism swarm / Astral flock / Living constellation |
| cannon | Plasma cannon | chest | Plasma bloom / Twin reactor / Solar lance / Supernova / Impossible sun |

| Tier | Name | Gate |
| --- | --- | --- |
| 0 | Field | Free |
| 1 | Charged | easy, block position 1 |
| 2 | Calibrated | easy, block position 2 |
| 3 | Overclocked | easy, block position 3 |
| 4 | Cryo-cooled | easy, block position 4 |
| 5 | Twin-core | easy, block position 5 |
| 6 | Ionized | medium, block position 1 |
| 7 | Supercharged | medium, block position 2 |
| 8 | Plasma-fed | medium, block position 3 |
| 9 | Phase-linked | medium, block position 4 |
| 10 | Quantum | medium, block position 5 |
| 11 | Antimatter | hard, block position 1 |
| 12 | Gravitic | hard, block position 2 |
| 13 | Drone-linked | hard, block position 3 |
| 14 | Neural | hard, block position 4 |
| 15 | Singularity | hard, block position 5 |
| 16 | Orbital | expert, block position 1 |
| 17 | Rift-tech | expert, block position 2 |
| 18 | Dark-matter | expert, block position 3 |
| 19 | Starbreaker | expert, block position 4 |
| 20 | MOM’s Impossible | expert, block position 5 |

All 420 weapon presentation IDs are `<family>:<tier>`. All 100 ability IDs are `<family>:<rank 1-5>`; JSON enumerates their unlock tier, cooldown, animation duration and damage multiplier. Special activation additionally requires a rest interval, owned weapon, cooldown readiness and combat kit level >=3 in SetFlow. Ability ranks are not separate XP purchases.

## Ships, powers and combat gates

| Ship ID | Name | Performance requirement |
| --- | --- | --- |
| supportive | Bubble shuttle | Expert legs hold: 300 continuous seconds |
| direct | Wing fighter | Expert legs reps: 15 working reps |
| analytical | Ring-engine scout | Expert chest reps: 15 working reps |
| playful | Fork interceptor | Expert stances hold: 300 continuous seconds |
| calm | Capsule pod | Expert yoga hold: 300 continuous seconds |
| mom | Cargo carrier | Expert hips reps: 15 working reps |

| Power / milestone ID | Name | Current gate |
| --- | --- | --- |
| shield | Shield | Free |
| ember | Ember | 4 verified workout completions; original level 2 |
| arc | Arc | 16 verified workout completions; original level 5 |
| frost | Frost | 36 verified workout completions; original level 10 |
| shieldBreak | Shield-break milestone | 196 verified workout completions; original level 50 |

These power gates retain their existing thresholds and now accept valid version-2 performance sessions as well as legacy server completions (`server/worker.mjs`, using `server/domain.mjs`, consumed in `pod/pod.mjs`). Legacy version-1 guest imports do not count. They remain distinct from the 250-level cosmetic curve. The older compatibility server rank is 1 + floor(saved sets / 4), with 25 XP per saved set. Combat kit has five damage stages (1, 2, 3, 4, 8 base tap damage), weapon bonuses at kit levels 1 and 3, pet DPS at 4, special at 3; these are combat tuning gates, not additional per-coach cosmetic assets. Login streak bonuses are 5 / 10 / 20 days at 1.1 / 1.25 / 1.5.

## Free Gala appearance choices, pads and companions

All 17 Gala sections have 20 curated visible choices and 20 additional save-compatible choices. Stable descriptive inventory IDs are `gala:<section>:<numeric recipe index>`. All 680 exact names/indexes are enumerated in JSON. The base section is the display-pad catalog; no XP-locked pad catalog exists in these sources. The pet section is free Gala appearance and is distinct from legacy combat-pet rewards and the nine quadruped coach sprites.

| Section | All 20 currently visible recipe IDs and names |
| --- | --- |
| body | 0: Zorbian; 11: Xyrr Vexling; 2: Orryx; 12: Xyrr Orryx; 32: Oth Orryx; 3: Mollu; 13: Xyrr Mollu; 33: Oth Mollu; 14: Xyrr Krell; 34: Oth Krell; 15: Xyrr Nymbi; 35: Oth Nymbi; 6: Quorlan; 16: Xyrr Quorlan; 36: Oth Quorlan; 37: Oth Xelith; 18: Xyrr Dravox; 28: Auv Dravox; 19: Xyrr Ulumi; 39: Oth Ulumi |
| skin | 0: Nebula lilac; 20: Auv Nebula lilac; 11: Xyrr Reactor mint; 12: Xyrr Solar coral; 32: Oth Solar coral; 23: Auv Lunar porcelain; 33: Oth Lunar porcelain; 14: Xyrr Void indigo; 34: Oth Void indigo; 5: Comet gold; 25: Auv Comet gold; 35: Oth Comet gold; 6: Plasma rose; 26: Auv Plasma rose; 36: Oth Plasma rose; 7: Tidal teal; 37: Oth Tidal teal; 38: Oth Martian ochre; 19: Xyrr Ghost ice; 39: Oth Ghost ice |
| face | 0: Vela gaze; 21: Auv Solo orb; 31: Oth Solo orb; 22: Auv Triune sight; 32: Oth Triune sight; 23: Auv Obsidian visor; 33: Oth Obsidian visor; 14: Xyrr Quasar quartet; 24: Auv Quasar quartet; 34: Oth Quasar quartet; 25: Auv Mothkin eyes; 35: Oth Mothkin eyes; 26: Auv Ziggy grin; 36: Oth Ziggy grin; 27: Auv Mollu blush; 28: Auv Starborn mask; 38: Oth Starborn mask; 19: Xyrr Oracle six; 29: Auv Oracle six; 39: Oth Oracle six |
| hair | 0: Vex wave; 11: Xyrr Quasar crest; 31: Oth Quasar crest; 12: Xyrr Nebula bob; 22: Auv Nebula bob; 32: Oth Nebula bob; 13: Xyrr Orbital knots; 33: Oth Orbital knots; 14: Xyrr Plasma cascade; 34: Oth Plasma cascade; 15: Xyrr Spore crown; 35: Oth Spore crown; 36: Oth Void slick; 17: Xyrr Comet braid; 27: Auv Comet braid; 37: Oth Comet braid; 18: Xyrr Prism spikes; 38: Oth Prism spikes; 19: Xyrr Lunar fringe; 29: Auv Lunar fringe |
| facial | 0: Vela bare; 11: Xyrr Zor whiskers; 21: Auv Zor whiskers; 31: Oth Zor whiskers; 12: Xyrr Krell beard; 32: Oth Krell beard; 13: Xyrr Mollu frill; 23: Auv Mollu frill; 33: Oth Mollu frill; 14: Xyrr Oracle dots; 34: Oth Oracle dots; 15: Xyrr Quor tendrils; 25: Auv Quor tendrils; 35: Oth Quor tendrils; 26: Auv Vex moustache; 17: Xyrr Dravox jaw; 27: Auv Dravox jaw; 18: Xyrr Nymbi veil; 38: Oth Nymbi veil; 39: Oth Ulumi sparkle |
| headwear | 0: Vela circlet; 11: Xyrr Orryx crown; 21: Auv Orryx crown; 12: Xyrr Quasar halo; 22: Auv Quasar halo; 32: Oth Quasar halo; 13: Xyrr Nymbi veil; 23: Auv Nymbi veil; 33: Oth Nymbi veil; 14: Xyrr Krell cap; 24: Auv Krell cap; 34: Oth Krell cap; 25: Auv Xelith horns; 16: Xyrr Mollu fascinator; 36: Oth Mollu fascinator; 37: Oth Dravox helm; 38: Oth Orbital rings; 19: Xyrr Comet antennae; 29: Auv Comet antennae; 39: Oth Comet antennae |
| neck | 0: Zor cravat; 20: Auv Zor cravat; 30: Oth Zor cravat; 11: Xyrr Vela bow; 2: Orryx pearls; 13: Xyrr Quasar ruff; 23: Auv Quasar ruff; 33: Oth Quasar ruff; 14: Xyrr Mollu scarf; 24: Auv Mollu scarf; 34: Oth Mollu scarf; 15: Xyrr Krell collar; 25: Auv Krell collar; 36: Oth Xelith pendant; 7: Nymbi ribbon; 27: Auv Nymbi ribbon; 37: Oth Nymbi ribbon; 28: Auv Dravox chain; 19: Xyrr Ulumi choker; 29: Auv Ulumi choker |
| torso | 0: Vex tuxedo; 11: Xyrr Mollu gown; 31: Oth Mollu gown; 12: Xyrr Orryx brocade; 22: Auv Orryx brocade; 32: Oth Orryx brocade; 13: Xyrr Quasar jumpsuit; 24: Auv Nymbi corset; 34: Oth Nymbi corset; 25: Auv Krell robe; 35: Oth Krell robe; 26: Auv Xelith doublet; 36: Oth Xelith doublet; 17: Xyrr Dravox tailcoat; 27: Auv Dravox tailcoat; 37: Oth Dravox tailcoat; 18: Xyrr Ulumi wrap; 28: Auv Ulumi wrap; 38: Oth Ulumi wrap; 9: Zor sequin suit |
| shoulders | 0: Vela epaulettes; 30: Oth Vela epaulettes; 11: Xyrr Quor petals; 12: Xyrr Krell spikes; 23: Auv Nymbi puffs; 33: Oth Nymbi puffs; 24: Auv Orryx mantle; 15: Xyrr Vex wings; 25: Auv Vex wings; 35: Oth Vex wings; 16: Xyrr Dravox plates; 36: Oth Dravox plates; 17: Xyrr Mollu fronds; 27: Auv Mollu fronds; 37: Oth Mollu fronds; 18: Xyrr Xelith orbitals; 38: Oth Xelith orbitals; 19: Xyrr Ulumi cape; 29: Auv Ulumi cape; 39: Oth Ulumi cape |
| arms | 0: Vela silk; 11: Xyrr Quasar flares; 12: Xyrr Krell cuffs; 13: Xyrr Mollu lace; 33: Oth Mollu lace; 14: Xyrr Orryx stripes; 15: Xyrr Vex sheer; 25: Auv Vex sheer; 6: Dravox panels; 26: Auv Dravox panels; 36: Oth Dravox panels; 7: Nymbi bells; 27: Auv Nymbi bells; 37: Oth Nymbi bells; 18: Xyrr Xelith rings; 28: Auv Xelith rings; 38: Oth Xelith rings; 19: Xyrr Ulumi ribbons; 29: Auv Ulumi ribbons; 39: Oth Ulumi ribbons |
| hands | 0: Vela gloves; 11: Xyrr Krell talons; 21: Auv Krell talons; 31: Oth Krell talons; 12: Xyrr Orryx cuffs; 22: Auv Orryx cuffs; 33: Oth Quasar mesh; 14: Xyrr Mollu mitts; 24: Auv Mollu mitts; 34: Oth Mollu mitts; 25: Auv Vex rings; 36: Oth Dravox gauntlets; 17: Xyrr Nymbi ruffles; 27: Auv Nymbi ruffles; 37: Oth Nymbi ruffles; 18: Xyrr Xelith claws; 28: Auv Xelith claws; 38: Oth Xelith claws; 9: Ulumi glow; 29: Auv Ulumi glow |
| legs | 0: Vex trousers; 11: Xyrr Mollu bell skirt; 21: Auv Mollu bell skirt; 31: Oth Mollu bell skirt; 22: Auv Orryx pleats; 32: Oth Orryx pleats; 23: Auv Quasar split; 24: Auv Nymbi bubble; 34: Oth Nymbi bubble; 15: Xyrr Krell drape; 25: Auv Krell drape; 35: Oth Krell drape; 16: Xyrr Xelith stripes; 36: Oth Xelith stripes; 27: Auv Dravox breeches; 37: Oth Dravox breeches; 18: Xyrr Ulumi train; 28: Auv Ulumi train; 38: Oth Ulumi train; 29: Auv Zor shimmer |
| feet | 0: Vela slippers; 11: Xyrr Krell platforms; 21: Auv Krell platforms; 31: Oth Krell platforms; 12: Xyrr Orryx curltoes; 32: Oth Orryx curltoes; 3: Quasar boots; 13: Xyrr Quasar boots; 14: Xyrr Mollu petals; 24: Auv Mollu petals; 34: Oth Mollu petals; 25: Auv Vex heels; 26: Auv Dravox greaves; 36: Oth Dravox greaves; 17: Xyrr Nymbi clouds; 37: Oth Nymbi clouds; 28: Auv Xelith skates; 38: Oth Xelith skates; 9: Ulumi moonsteps; 29: Auv Ulumi moonsteps |
| held | 0: Vela flute; 11: Xyrr Orryx fan; 21: Auv Orryx fan; 31: Oth Orryx fan; 32: Oth Quasar clutch; 23: Auv Mollu bouquet; 33: Oth Mollu bouquet; 14: Xyrr Krell cane; 24: Auv Krell cane; 34: Oth Krell cane; 25: Auv Nymbi lantern; 16: Xyrr Vex invitation; 17: Xyrr Dravox orb; 27: Auv Dravox orb; 37: Oth Dravox orb; 18: Xyrr Xelith parasol; 28: Auv Xelith parasol; 38: Oth Xelith parasol; 29: Auv Ulumi familiar; 39: Oth Ulumi familiar |
| back | 0: Vela ribbons; 11: Xyrr Orryx cape; 21: Auv Orryx cape; 31: Oth Orryx cape; 12: Xyrr Quasar fins; 22: Auv Quasar fins; 13: Xyrr Mollu spores; 23: Auv Mollu spores; 33: Oth Mollu spores; 14: Xyrr Krell spines; 34: Oth Krell spines; 15: Xyrr Nymbi wings; 35: Oth Nymbi wings; 16: Xyrr Vex sash; 26: Auv Vex sash; 17: Xyrr Dravox coils; 37: Oth Dravox coils; 38: Oth Xelith satellites; 19: Xyrr Ulumi starlight; 29: Auv Ulumi starlight |
| base | 0: Vela marble; 11: Xyrr Orryx dais; 2: Quasar moon; 22: Auv Quasar moon; 32: Oth Quasar moon; 23: Auv Mollu garden; 4: Krell obsidian; 34: Oth Krell obsidian; 5: Nymbi cloud; 25: Auv Nymbi cloud; 35: Oth Nymbi cloud; 16: Xyrr Vex carpet; 26: Auv Vex carpet; 36: Oth Vex carpet; 37: Oth Dravox grille; 18: Xyrr Xelith crystal; 28: Auv Xelith crystal; 38: Oth Xelith crystal; 19: Xyrr Ulumi orbit; 39: Oth Ulumi orbit |
| pet | 0: No companion; 10: Xyrr slug; 20: Auv slug; 30: Oth slug; 11: Xyrr Mollu pup; 12: Xyrr Vex moth; 32: Oth Vex moth; 3: Orryx beetle; 24: Auv Quasar cat; 15: Xyrr Nymbi jelly; 25: Auv Nymbi jelly; 35: Oth Nymbi jelly; 36: Oth Krell lizard; 27: Auv Xelith puff; 37: Oth Xelith puff; 28: Auv Dravox bot; 38: Oth Dravox bot; 19: Xyrr Ulumi sprout; 29: Auv Ulumi sprout; 39: Oth Ulumi sprout |

Free Gala dyes: gala:dye:0=#9762b6; gala:dye:1=#bd476e; gala:dye:2=#467f9e; gala:dye:3=#4b9478; gala:dye:4=#d39d46; gala:dye:5=#485aa0; gala:dye:6=#d17e52; gala:dye:7=#c7adba; gala:dye:8=#5f596d; gala:dye:9=#83b8b6.

## Legacy, compatibility-only and inactive reward tables

The old 38-boss board still defines five levels per boss. The new XP synchronization awards only `cosmetic-pass-v2` packs; it does not mint the following historic rewards from old board levels. Existing persisted ownership and rendering can remain compatible. Old board level/pack IDs below are not new XP-pass milestones. Installed creature skins retain their old collection/track placements; their existing renderer is separate from the current coach texture pack pool.

| Legacy row | Track | Boss IDs (each has levels 1-5) |
| --- | --- | --- |
| strider | chest | strider-1, strider-2, strider-3, strider-4, strider-5, strider-6 |
| ringer | quads | ringer-1, ringer-2, ringer-3, ringer-4, ringer-5 |
| manyarm | glutes | manyarm-1, manyarm-2, manyarm-3, manyarm-4, manyarm-5 |
| wedge | arms-shoulders | wedge-1, wedge-2, wedge-3, wedge-4, wedge-5 |
| warden | Shared | warden-1 |
| blob | yoga | blob-1, blob-2, blob-3, blob-4 |
| cap | martial-arts | cap-1, cap-2, cap-3 |
| stalk | cardio | stalk-1, stalk-2, stalk-3, stalk-4 |
| tanka | meditation | tanka-1, tanka-2, tanka-3, tanka-4 |
| lume | Shared | lume-1 |

| Legacy reward kind | Every defined unique ID |
| --- | --- |
| weapon | chest-w1; chest-w2; quads-w1; quads-w2; glutes-w1; glutes-w2; arms-w1; arms-w2; yoga-w1; yoga-w2; martial-arts-w1; martial-arts-w2; cardio-w1; cardio-w2; meditation-w1; meditation-w2 |
| reward-pack | reward-pack:legendary:strider-1:L1:chest-plate-steel; reward-pack:uncommon:strider-1:L2:pal-01; reward-pack:legendary:strider-1:L3:legacy-15; reward-pack:rare:strider-1:L4:64-bit; reward-pack:legendary:strider-1:L5:chest-chain-mail; reward-pack:uncommon:strider-2:L1:pal-13; reward-pack:uncommon:strider-2:L2:bonus; reward-pack:uncommon:strider-2:L3:pal-14; reward-pack:uncommon:strider-2:L4:pal-15; reward-pack:rare:strider-2:L4:64-bit; reward-pack:legendary:strider-2:L5:bonus; reward-pack:uncommon:strider-3:L1:pal-16; reward-pack:uncommon:strider-3:L2:bonus; reward-pack:uncommon:strider-3:L3:pal-17; reward-pack:uncommon:strider-3:L4:pal-18; reward-pack:rare:strider-3:L4:64-bit; reward-pack:legendary:strider-3:L5:bonus; reward-pack:uncommon:strider-4:L1:pal-19; reward-pack:uncommon:strider-4:L2:bonus; reward-pack:uncommon:strider-4:L3:pal-20; reward-pack:uncommon:strider-4:L4:pal-21; reward-pack:rare:strider-4:L4:64-bit; reward-pack:legendary:strider-4:L5:bonus; reward-pack:uncommon:strider-5:L1:pal-22; reward-pack:uncommon:strider-5:L2:bonus; reward-pack:uncommon:strider-5:L3:pal-23; reward-pack:uncommon:strider-5:L4:pal-24; reward-pack:rare:strider-5:L4:64-bit; reward-pack:legendary:strider-5:L5:bonus; reward-pack:uncommon:strider-6:L1:pal-25; reward-pack:uncommon:strider-6:L2:bonus; reward-pack:uncommon:strider-6:L3:pal-26; reward-pack:uncommon:strider-6:L4:pal-27; reward-pack:rare:strider-6:L4:64-bit; reward-pack:legendary:strider-6:L5:bonus; reward-pack:legendary:ringer-1:L1:quads-track-rubber; reward-pack:uncommon:ringer-1:L2:pal-02; reward-pack:legendary:ringer-1:L3:quads-denim; reward-pack:rare:ringer-1:L4:64-bit; reward-pack:legendary:ringer-1:L5:quads-hex-tread; reward-pack:uncommon:ringer-2:L1:pal-28; reward-pack:uncommon:ringer-2:L2:bonus; reward-pack:uncommon:ringer-2:L3:pal-29; reward-pack:uncommon:ringer-2:L4:pal-30; reward-pack:rare:ringer-2:L4:64-bit; reward-pack:legendary:ringer-2:L5:bonus; reward-pack:uncommon:ringer-3:L1:pal-31; reward-pack:uncommon:ringer-3:L2:bonus; reward-pack:uncommon:ringer-3:L3:pal-32; reward-pack:uncommon:ringer-3:L4:pal-33; reward-pack:rare:ringer-3:L4:64-bit; reward-pack:legendary:ringer-3:L5:bonus; reward-pack:uncommon:ringer-4:L1:pal-34; reward-pack:uncommon:ringer-4:L2:bonus; reward-pack:uncommon:ringer-4:L3:pal-35; reward-pack:uncommon:ringer-4:L4:pal-36; reward-pack:rare:ringer-4:L4:64-bit; reward-pack:legendary:ringer-4:L5:bonus; reward-pack:uncommon:ringer-5:L1:pal-37; reward-pack:uncommon:ringer-5:L2:bonus; reward-pack:uncommon:ringer-5:L3:pal-38; reward-pack:uncommon:ringer-5:L4:pal-39; reward-pack:rare:ringer-5:L4:64-bit; reward-pack:legendary:ringer-5:L5:bonus; reward-pack:legendary:manyarm-1:L1:legacy-13; reward-pack:uncommon:manyarm-1:L2:pal-03; reward-pack:legendary:manyarm-1:L3:glutes-quilted; reward-pack:rare:manyarm-1:L4:64-bit; reward-pack:legendary:manyarm-1:L5:glutes-peach; reward-pack:uncommon:manyarm-2:L1:pal-40; reward-pack:uncommon:manyarm-2:L2:bonus; reward-pack:uncommon:manyarm-2:L3:pal-41; reward-pack:uncommon:manyarm-2:L4:pal-42; reward-pack:rare:manyarm-2:L4:64-bit; reward-pack:legendary:manyarm-2:L5:bonus; reward-pack:uncommon:manyarm-3:L1:pal-43; reward-pack:uncommon:manyarm-3:L2:bonus; reward-pack:uncommon:manyarm-3:L3:pal-44; reward-pack:uncommon:manyarm-3:L4:pal-45; reward-pack:rare:manyarm-3:L4:64-bit; reward-pack:legendary:manyarm-3:L5:bonus; reward-pack:uncommon:manyarm-4:L1:pal-46; reward-pack:uncommon:manyarm-4:L2:bonus; reward-pack:uncommon:manyarm-4:L3:pal-47; reward-pack:uncommon:manyarm-4:L4:pal-48; reward-pack:rare:manyarm-4:L4:64-bit; reward-pack:legendary:manyarm-4:L5:bonus; reward-pack:uncommon:manyarm-5:L1:pal-49; reward-pack:uncommon:manyarm-5:L2:bonus; reward-pack:uncommon:manyarm-5:L3:pal-50; reward-pack:uncommon:manyarm-5:L4:pal-51; reward-pack:rare:manyarm-5:L4:64-bit; reward-pack:legendary:manyarm-5:L5:bonus; reward-pack:legendary:wedge-1:L1:arms-hammered-bronze; reward-pack:uncommon:wedge-1:L2:pal-04; reward-pack:legendary:wedge-1:L3:legacy-14; reward-pack:rare:wedge-1:L4:64-bit; reward-pack:legendary:wedge-1:L5:legacy-8; reward-pack:uncommon:wedge-2:L1:pal-52; reward-pack:uncommon:wedge-2:L2:bonus; reward-pack:uncommon:wedge-2:L3:pal-53; reward-pack:uncommon:wedge-2:L4:pal-54; reward-pack:rare:wedge-2:L4:64-bit; reward-pack:legendary:wedge-2:L5:bonus; reward-pack:uncommon:wedge-3:L1:pal-55; reward-pack:uncommon:wedge-3:L2:bonus; reward-pack:uncommon:wedge-3:L3:pal-56; reward-pack:uncommon:wedge-3:L4:pal-57; reward-pack:rare:wedge-3:L4:64-bit; reward-pack:legendary:wedge-3:L5:bonus; reward-pack:uncommon:wedge-4:L1:pal-58; reward-pack:uncommon:wedge-4:L2:bonus; reward-pack:uncommon:wedge-4:L3:pal-59; reward-pack:uncommon:wedge-4:L4:pal-60; reward-pack:rare:wedge-4:L4:64-bit; reward-pack:legendary:wedge-4:L5:bonus; reward-pack:uncommon:wedge-5:L1:pal-61; reward-pack:uncommon:wedge-5:L2:bonus; reward-pack:uncommon:wedge-5:L3:pal-62; reward-pack:uncommon:wedge-5:L4:pal-63; reward-pack:rare:wedge-5:L4:64-bit; reward-pack:legendary:wedge-5:L5:bonus; reward-pack:uncommon:warden-1:L1:pal-64; reward-pack:uncommon:warden-1:L2:bonus; reward-pack:uncommon:warden-1:L3:pal-65; reward-pack:uncommon:warden-1:L4:pal-66; reward-pack:rare:warden-1:L4:64-bit; reward-pack:legendary:warden-1:L5:bonus; reward-pack:legendary:blob-1:L1:legacy-20; reward-pack:uncommon:blob-1:L2:pal-05; reward-pack:legendary:blob-1:L3:legacy-21; reward-pack:rare:blob-1:L4:64-bit; reward-pack:legendary:blob-1:L5:yoga-petal; reward-pack:uncommon:blob-2:L1:pal-67; reward-pack:uncommon:blob-2:L2:bonus; reward-pack:uncommon:blob-2:L3:pal-68; reward-pack:uncommon:blob-2:L4:pal-69; reward-pack:rare:blob-2:L4:64-bit; reward-pack:legendary:blob-2:L5:bonus; reward-pack:uncommon:blob-3:L1:pal-70; reward-pack:uncommon:blob-3:L2:bonus; reward-pack:uncommon:blob-3:L3:pal-71; reward-pack:uncommon:blob-3:L4:pal-72; reward-pack:rare:blob-3:L4:64-bit; reward-pack:legendary:blob-3:L5:bonus; reward-pack:uncommon:blob-4:L1:pal-73; reward-pack:uncommon:blob-4:L2:bonus; reward-pack:uncommon:blob-4:L3:pal-74; reward-pack:uncommon:blob-4:L4:pal-75; reward-pack:rare:blob-4:L4:64-bit; reward-pack:legendary:blob-4:L5:bonus; reward-pack:legendary:cap-1:L1:martial-arts-canvas-gi; reward-pack:uncommon:cap-1:L2:pal-06; reward-pack:legendary:cap-1:L3:martial-arts-bamboo; reward-pack:rare:cap-1:L4:64-bit; reward-pack:legendary:cap-1:L5:martial-arts-dragon-scale; reward-pack:uncommon:cap-2:L1:pal-76; reward-pack:uncommon:cap-2:L2:bonus; reward-pack:uncommon:cap-2:L3:pal-77; reward-pack:uncommon:cap-2:L4:pal-78; reward-pack:rare:cap-2:L4:64-bit; reward-pack:legendary:cap-2:L5:bonus; reward-pack:uncommon:cap-3:L1:pal-79; reward-pack:uncommon:cap-3:L2:bonus; reward-pack:uncommon:cap-3:L3:pal-80; reward-pack:uncommon:cap-3:L4:pal-81; reward-pack:rare:cap-3:L4:64-bit; reward-pack:legendary:cap-3:L5:bonus; reward-pack:legendary:stalk-1:L1:cardio-mesh; reward-pack:uncommon:stalk-1:L2:pal-07; reward-pack:legendary:stalk-1:L3:legacy-16; reward-pack:rare:stalk-1:L4:64-bit; reward-pack:legendary:stalk-1:L5:cardio-pebble-path; reward-pack:uncommon:stalk-2:L1:pal-82; reward-pack:uncommon:stalk-2:L2:bonus; reward-pack:uncommon:stalk-2:L3:pal-83; reward-pack:uncommon:stalk-2:L4:pal-84; reward-pack:rare:stalk-2:L4:64-bit; reward-pack:legendary:stalk-2:L5:bonus; reward-pack:uncommon:stalk-3:L1:pal-85; reward-pack:uncommon:stalk-3:L2:bonus; reward-pack:uncommon:stalk-3:L3:pal-86; reward-pack:uncommon:stalk-3:L4:pal-87; reward-pack:rare:stalk-3:L4:64-bit; reward-pack:legendary:stalk-3:L5:bonus; reward-pack:uncommon:stalk-4:L1:pal-88; reward-pack:uncommon:stalk-4:L2:bonus; reward-pack:uncommon:stalk-4:L3:pal-89; reward-pack:uncommon:stalk-4:L4:pal-90; reward-pack:rare:stalk-4:L4:64-bit; reward-pack:legendary:stalk-4:L5:bonus; reward-pack:legendary:tanka-1:L1:meditation-sand-garden; reward-pack:uncommon:tanka-1:L2:pal-08; reward-pack:legendary:tanka-1:L3:meditation-river-stone; reward-pack:rare:tanka-1:L4:64-bit; reward-pack:legendary:tanka-1:L5:meditation-moss; reward-pack:uncommon:tanka-2:L1:pal-91; reward-pack:uncommon:tanka-2:L2:bonus; reward-pack:uncommon:tanka-2:L3:pal-92; reward-pack:uncommon:tanka-2:L4:pal-93; reward-pack:rare:tanka-2:L4:64-bit; reward-pack:legendary:tanka-2:L5:bonus; reward-pack:uncommon:tanka-3:L1:pal-94; reward-pack:uncommon:tanka-3:L2:bonus; reward-pack:uncommon:tanka-3:L3:pal-95; reward-pack:uncommon:tanka-3:L4:pal-96; reward-pack:rare:tanka-3:L4:64-bit; reward-pack:legendary:tanka-3:L5:bonus; reward-pack:uncommon:tanka-4:L1:pal-97; reward-pack:uncommon:tanka-4:L2:bonus; reward-pack:uncommon:tanka-4:L3:pal-98; reward-pack:uncommon:tanka-4:L4:pal-99; reward-pack:rare:tanka-4:L4:64-bit; reward-pack:legendary:tanka-4:L5:bonus; reward-pack:uncommon:lume-1:L1:pal-100; reward-pack:uncommon:lume-1:L2:bonus; reward-pack:uncommon:lume-1:L3:pal-101; reward-pack:uncommon:lume-1:L4:pal-102; reward-pack:rare:lume-1:L4:64-bit; reward-pack:legendary:lume-1:L5:bonus; reward-pack:uncommon:food:L1:pal-103; reward-pack:uncommon:food:L2:pal-104; reward-pack:uncommon:food:L3:pal-105; reward-pack:uncommon:food:L4:pal-106; reward-pack:uncommon:food:L5:pal-107 |
| creature-skin | creature-starforged-plate; creature-mirror-knight; creature-obsidian-carapace; creature-tarnished-crown; creature-hive-armor; creature-golden-scarab; creature-magma-scale; creature-emberflow; creature-frost-veins; creature-volcanic-heart; creature-storm-carbon; creature-aurora-ice; creature-ancient-bark; creature-ironbark; creature-mossback; creature-oakscale; creature-rootbound; creature-mosswood; creature-hammered-bronze; creature-blood-onyx; creature-rope-sinew; creature-honey-crystal; creature-runic-leather; creature-void-mirror; creature-crystal-core; creature-snow-wraith; creature-moon-marble; creature-moon-drift; creature-fae-petal; creature-pearl-spirit; creature-dragon-scale; creature-red-desert-scale; creature-bamboo-hide; creature-cave-drake; creature-ivory-chitin; creature-sandstone-titan; creature-circuit-hide; creature-neon-mainframe; creature-reactor-rust; creature-reactor-grid; creature-aero-mesh; creature-quantum-core; creature-zen-sand; creature-celestial-mosaic; creature-river-stone; creature-shellborn; creature-biolume-moss; creature-cracked-starlight |
| boss-texture | strider-1-texture; strider-2-texture; strider-3-texture; strider-4-texture; strider-5-texture; strider-6-texture; ringer-1-texture; ringer-2-texture; ringer-3-texture; ringer-4-texture; ringer-5-texture; manyarm-1-texture; manyarm-2-texture; manyarm-3-texture; manyarm-4-texture; manyarm-5-texture; wedge-1-texture; wedge-2-texture; wedge-3-texture; wedge-4-texture; wedge-5-texture; warden-1-texture; blob-1-texture; blob-2-texture; blob-3-texture; blob-4-texture; cap-1-texture; cap-2-texture; cap-3-texture; stalk-1-texture; stalk-2-texture; stalk-3-texture; stalk-4-texture; tanka-1-texture; tanka-2-texture; tanka-3-texture; tanka-4-texture; lume-1-texture |
| special | chest-special; quads-special; glutes-special; arms-special; yoga-special; martial-arts-special; cardio-special; meditation-special |
| ship | ship-supportive; ship-direct; ship-analytical; ship-playful; ship-calm; ship-mom |
| pet | push-pet; legs-pet; flow-pet; motion-pet; meditation-pet |
| aura | chest-aura; quads-aura; glutes-aura; arms-aura; yoga-aura; martial-arts-aura; cardio-aura; meditation-aura |
| boss-unlock | strider-1; strider-2; strider-3; strider-4; strider-5; strider-6; ringer-1; ringer-2; ringer-3; ringer-4; ringer-5; manyarm-1; manyarm-2; manyarm-3; manyarm-4; manyarm-5; wedge-1; wedge-2; wedge-3; wedge-4; wedge-5; warden-1; blob-1; blob-2; blob-3; blob-4; cap-1; cap-2; cap-3; stalk-1; stalk-2; stalk-3; stalk-4; tanka-1; tanka-2; tanka-3; tanka-4; lume-1 |
| bonus | food-bonus-1; food-bonus-2; food-bonus-3; food-bonus-4; food-bonus-5 |

The JSON includes all 190 old boss-level placements, food-level placements, all 397 unique kind/ID rewards, and the 16 legacy ship placements (which reuse the six ships above). The ungranted food weapon placeholders `food-w1` / `food-w2` are explicitly excluded by the source catalog comment; no current unlock route exists. Legacy `boss-texture` entries and family aura/special names are descriptor entries, not extra registered 3D material textures. Food no longer earns these old second-helping damage bonuses through the new daily trio XP rule.

## Limits and verification

This inventory deliberately distinguishes selectable/free content, implemented performance gates, current XP collectible pools, and retained old tables. A source asset, old reward descriptor or rejected model is not counted as a currently earnable XP collectible. Workout detector descriptions include camera-validation limits in JSON; this inventory does not claim clinical validation of the workout philosophy. The cadence defaults and the legacy power gates are explicit integration behavior rather than new user-confirmed progression decisions.

Verification: catalogs were bundled directly from the integration worktree using esbuild; Gala indexes were read by executing the source catalog in a VM without drawing. Checked unique coach IDs, equality with approved body picker, exact scoped cosmetic cross product, level curve monotonicity and endpoint, pack counts/sizes, full 20 x 21 weapon tier product, 100 unique ability IDs, 57 unique workout IDs and all 680 Gala option indexes. Source SHA-256 hashes are recorded in JSON.


## Post-snapshot integration addendum

Commit `8d9fc5b` retains power thresholds 4 / 16 / 36 / 196 while including validated account-owned performance sessions, as described above. Historical snapshot source hashes remain unchanged. Commit `c20ef6c` adds rest-boss pack rewards: the first distinct boss defeated that day grants one uncommon pack; the fifth grants one legendary pack, once each day. Pack IDs are `reward-pack:<tier>:rest-boss-v1:<YYYY-MM-DD>`. Each real workout has stable preparation-1, preparation-2 and working boss encounter IDs. Reopening/replaying an encounter, including the next day, cannot count it twice; practice earns no pack. These optional packs supplement the 249 XP-level packs and accelerate cosmetic collection. Defeating a rest boss never unlocks a coach. The daily tap allowance is five boss budgets; streak and weapon damage math stays unchanged.
