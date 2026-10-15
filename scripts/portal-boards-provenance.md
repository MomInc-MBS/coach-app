# Portal board art

The Grass, Ice, Jelly, Wood, Cogs door and parts kit GLBs came from Ian's own Tripo generations and Blender work. The Cogs door texture came from Ian's painted image. `flower.glb` is Kenney CC0 art. `modules/portal/cracked-glass-core.mjs` is MIT licensed; its license travels beside it.

The source handoff was the 24 September 2026 portal boards packet. The compressed GLBs use WebP textures and Meshopt compression. The Cogs kit was further simplified with glTF Transform CLI 4.5.0 to fit the optional Boards download group in the app archive:

```sh
gltf-transform simplify parts-kit.glb parts-kit-30.glb --ratio 0.30 --error 1
gltf-transform meshopt parts-kit-30.glb parts-kit-30-optimized.glb --level high --quantize-position 14 --quantize-normal 10 --quantize-texcoord 12
```

The final kit retains all 113 named parts referenced by `door-layout.json` and was compared with the original at a 375 × 812 viewport. It has less surface detail on the large hub gears; the board keeps their silhouette and painted backdrop.

Ice's WebP textures were re-encoded at quality 70 and recompressed with Meshopt at the same quantization settings shown above. The resulting 537,700-byte GLB was compared with its original in Chromium at 375 × 812; its surface and shape guides remained visually consistent at that size.

## Quality-preserving assets (15 October 2026)

The retained authored GLBs under `plan/prototypes/portal-boards/pod/worlds/boards/` are the source of truth for the Ice, Jelly, and Wood boards. Their production copies had quantized positions and WebP-reencoded textures. The current runtime uses each as one generic board mesh; its interaction code does not address internal node names, so restoring the source preserves the mesh/material identity and authored vertices without changing code:

| Board | Authored source = restored runtime file | Size | SHA-256 | Position entries |
|---|---|---:|---|---:|
| Ice | `plan/prototypes/portal-boards/pod/worlds/boards/ice.glb` -> `pod/worlds/boards/ice.glb` | 1,075,472 B | `F8C8ED42F044FAB52437FD07E6F64566FF53136F4C7704C5D80E6134E2893C95` | 12,712 |
| Jelly | `plan/prototypes/portal-boards/pod/worlds/boards/jelly.glb` -> `pod/worlds/boards/jelly.glb` | 809,492 B | `721CD43AB081636280ED812E7663041A98E692B1FA750BB4555F323EC0ED089E` | 10,516 |
| Wood | `plan/prototypes/portal-boards/pod/worlds/boards/wood.glb` -> `pod/worlds/boards/wood.glb` | 1,532,040 B | `AD801EF0C3BA7CCF845C9617D4D0AF3EB5B97ACF4A20D8AF9C4283F27582079F` | 15,325 |

The original pyramid scanner input was verified at `C:/Users/ianmy/Downloads/pyramid+nutrition+robot+3d+model.glb`: 10,581,492 bytes, SHA-256 `872DE8EC39405F315F4B4AF05E9E19EC289BFFA667E287982090D73296FF7A41`, 183,108 authored body positions. `scripts/build-pyramid-scanner.py` regenerates the display planes, three knobs, lens, and original control anchors from that input. Its quality-preserving mode is now ratio `1.0` (the prior `0.2` mode decimated the body); output has 185,151 positions including generated display/control meshes and preserves the names `body`, `screen_name`, `screen_calories`, `screen_protein`, `screen_fat`, `screen_carbs`, `screen_vitamins`, `lens`, and `knob_0..2`. The generated full-geometry GLB was passed through `scripts/optimize-glb.mjs`; its Meshopt encode/decode check confirmed byte-exact accessors. The resulting source asset is 6,850,052 bytes, SHA-256 `8482BE70BF58D421FAA7B54D193705962242A99F1AD1AC23C82DB95C373A28D6`; it uses Meshopt compression only, with no quantization.

Grass was not replaced: its retained prototype has 11,858 positions and a different authored material name, while runtime has 11,985 positions and material `face`, indicating a later product edit. The Cogs source pair was not replaced: its older prototype kit has 22 named nodes, while the runtime parts kit has 113 animated/individually addressable parts; substituting it would break the door's part layout. These require source-specific review before any restoration.

`tests/model-quality-preservation.test.mjs` guards the restored board vertex counts, original JPEG materials/no quantization, and the scanner's full geometry and named controls.
