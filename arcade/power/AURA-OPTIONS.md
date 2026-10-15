# War Room aura choices

The War Room stores a device-local effect choice for each exercise group in `myr5-exercise-effect-choices-v1`. Each group's **Random** choice resolves only within that group's pool; the 38 existing choices are partitioned by their exercise route instead of sharing one global selector. A legacy global choice migrates to its single compatible group and cannot override the other groups. Option IDs, labels, animation grids, and render layouts live in `aura-options.mjs`.

| Exercise group | Assigned choices | Default route effect |
|---|---|---|
| Yoga & mobility | All 19 ecology choices plus Magic bubbles, Nebula, Phantom, Midnight | Fern |
| Martial stances | Flame lash, Casting ring, Felspell | Casting ring |
| Legs & hips | Classic, Fire spin, Vortex, Sunburn | Classic |
| Arms & shoulders | Magic-eight trail, Weapon hit spark, Magic hit, Lightning arcs | Native lightning |
| Floor exercises | Blue flame, Magic spell burst, Floor sparks | Native floor sparks |
| Core & balance | Blizzard ice, Protection circle, Loading ring | Blizzard |

New installs start each group at **Random**. The defaults above are safe fallbacks and the renderer's native route styles. The group metadata also includes **Random**, which is resolved at the start of an exercise and stays stable for that exercise.

| Menu row | Asset and evidence | Status |
|---|---|---|
| Random · rotate effects | Resolves across all selectable rows in `aura-options.mjs`. | Implemented |
| Classic fire aura | Existing fire/brightfire assets and renderer in `power.mjs`. | Implemented |
| Blue flame | `assets/3_bluefire_spritesheet.png`; Free Pixel Effects Pack, CC0, 8×8 100px frames. | Implemented |
| Magic bubbles | `assets/20_magicbubbles_spritesheet.png`; same CC0 pack, 8×8. | Implemented |
| Protection circle | `assets/8_protectioncircle_spritesheet.png`; same CC0 pack, 8×8. | Implemented |
| Vortex | `assets/13_vortex_spritesheet.png`; same CC0 pack, 8×8. | Implemented |
| Fire spin | `assets/7_firespin_spritesheet.png`; same CC0 pack, 8×8. | Implemented |
| Flame lash | `assets/6_flamelash_spritesheet.png`; same CC0 pack, 7×7. | Implemented |
| Weapon hit spark | `assets/10_weaponhit_spritesheet.png`; same CC0 pack, 6×6. | Implemented |
| Casting ring | `assets/4_casting_spritesheet.png`; same CC0 pack, 9×9. | Implemented |
| Magic spell burst | `assets/1_magicspell_spritesheet.png`; same CC0 pack, 9×9. | Implemented |
| Magic-eight trail | `assets/2_magic8_spritesheet.png`; same CC0 pack, 8×8. | Implemented |
| Magic hit | `assets/5_magickahit_spritesheet.png`; same CC0 pack, 7×7. | Implemented |
| Nebula | `assets/12_nebula_spritesheet.png`; same CC0 pack, 8×8. | Implemented |
| Phantom | `assets/14_phantom_spritesheet.png`; same CC0 pack, 8×8. | Implemented |
| Sunburn | `assets/16_sunburn_spritesheet.png`; same CC0 pack, 8×8. | Implemented |
| Felspell | `assets/17_felspell_spritesheet.png`; same CC0 pack, 10×10. | Implemented |
| Midnight | `assets/18_midnight_spritesheet.png`; same CC0 pack, 8×8. | Implemented |
| Loading ring | `assets/15_loading_spritesheet.png`; same CC0 pack, 11×11. | Implemented |
| Blizzard ice | Existing `../hold/assets/19_freezing_spritesheet.png`; Free Pixel Effects Pack, CC0, 10×10. | Implemented |
| Lightning arcs | Native existing lightning renderer in `power.mjs`; no new asset. | Implemented |
| Floor sparks | Native existing floor-contact renderer in `power.mjs`; uses detected support contacts. | Implemented |
| Fern growth | Existing `../hold/assets/flowers-plants_2.png`, cell 1; Flowers by SpiderDave, CC0. | Implemented |
| Vine drift | Existing `../hold/assets/flowers-plants_2.png`, cell 14; same CC0 atlas. | Implemented |
| Flower bloom | Existing `../hold/assets/flowers-plants_2.png`, cell 48; same CC0 atlas. | Implemented |
| Fungi bloom | Existing `../hold/assets/flowers-plants_2.png`, cell 70; same CC0 atlas. | Implemented |
| Grass growth | Existing `../hold/assets/flowers-plants_2.png`, cell 0; same CC0 atlas. | Implemented |
| Reed growth | Existing `../hold/assets/flowers-plants_2.png`, cell 6; same CC0 atlas. | Implemented |
| Rabbit companion | Existing `../hold/assets/rabbit/Rabbit/Rabbit_Idle.png` and `Rabbit_Run.png`; Animated Wild Animals by ScratchIO, CC0. | Implemented |
| Fox companion | Existing `../hold/assets/fox/Fox/Fox_Idle.png` and `Fox_Run.png`; same CC0 collection. | Implemented |
| Bear companion | Added `../hold/assets/bear/Bear/Bear_Idle.png` and `Bear_Run.png` from the collection's `All.zip`; 12 idle and 5 run frames, each 64x33. | Implemented |
| Deer companion | Added `../hold/assets/deer/Deer/Deer_Idle.png` and `Deer_Run.png`; 15 idle and 9 run frames. | Implemented |
| Wolf companion | Added `../hold/assets/wolf/Wolf/Wolf_Walk.png` and `Wolf_Run.png`; 8 walk and 6 run frames, each 64x40, with walk used for idle. | Implemented |
| Boar companion | Added `../hold/assets/boar/Boar/Boar_Idle.png` and `Boar_Run.png`; 8 idle and 6 run frames, each 64x40. | Implemented |
| Stone chips | Existing `../hold/assets/rocks-original.png`; Rocks (Rework), CC0. | Implemented |
| Blue crystal shards | Existing `../hold/assets/crystals/PNG/32x32/crystal-blue.png`; Crystals collection, CC0. | Implemented |
| Ice crystal shards | Existing `../hold/assets/crystals/PNG/32x32/crystal-icy.png`; same CC0 collection. | Implemented |
| Red crystal shards | Existing `../hold/assets/crystals/PNG/32x32/crystal-red-small.png`; same CC0 collection. | Implemented |
| Green crystal shards | Existing `../hold/assets/crystals/PNG/32x32/crystal-green-alt.png`; same CC0 collection. | Implemented |
| Gold crystal shards | Added `../hold/assets/crystals/PNG/32x32/crystal-gold.png` from the archived CC0 Crystals pack. | Implemented |
| Purple crystal shards | Added `../hold/assets/crystals/PNG/32x32/crystal-purple.png` from the archived CC0 Crystals pack. | Implemented |

Fern, vine, flower, mushroom, grass, and reed options use the existing CC0 Flowers atlas. No art was added from the unlicensed `plan/assets-inbox/biomes/` collection. The CC0 animal source explicitly offers Bear.zip, Deer.zip, Wolf.zip, and Boar.zip; those four are included from its All.zip.

The effect pack source, author credits, and license evidence are recorded in `assets/SOURCE-LICENSES.md`; hold/ecology source evidence is in `../hold/assets/SOURCE-LICENSES.md`.
