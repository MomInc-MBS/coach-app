# Portal board art

The Grass, Ice, Jelly, Wood, Cogs door and parts kit GLBs came from Ian's own Tripo generations and Blender work. The Cogs door texture came from Ian's painted image. `flower.glb` is Kenney CC0 art. `modules/portal/cracked-glass-core.mjs` is MIT licensed; its license travels beside it.

The source handoff was the 24 September 2026 portal boards packet. The compressed GLBs use WebP textures and Meshopt compression. The Cogs kit was further simplified with glTF Transform CLI 4.5.0 to fit the optional Boards download group in the app archive:

```sh
gltf-transform simplify parts-kit.glb parts-kit-30.glb --ratio 0.30 --error 1
gltf-transform meshopt parts-kit-30.glb parts-kit-30-optimized.glb --level high --quantize-position 14 --quantize-normal 10 --quantize-texcoord 12
```

The final kit retains all 113 named parts referenced by `door-layout.json` and was compared with the original at a 375 × 812 viewport. It has less surface detail on the large hub gears; the board keeps their silhouette and painted backdrop.

Ice's WebP textures were re-encoded at quality 70 and recompressed with Meshopt at the same quantization settings shown above. The resulting 537,700-byte GLB was compared with its original in Chromium at 375 × 812; its surface and shape guides remained visually consistent at that size.
