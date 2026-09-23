# Coach Creature Skins — Celestial Rift

This is a second, non-overlapping set of 24 creature-skin battle-pass unlocks for the Coach app. It is additive to **Forged Realms** and to the original fitness-material collection.

## Runtime use

- Every skin has a 512 × 512 `basecolor.webp`, OpenGL `normal.webp`, `roughness.webp`, and `tint-mask.webp`.
- Additional maps are included when the source provides them: height, ambient occlusion, metalness, opacity, or emissive.
- Treat base color, tint mask, and emissive maps as sRGB. Treat the other maps as linear data.
- Multiply `tint-mask.webp` by the creature palette for seasonal variants without changing the licensed source record.
- `manifest.json` contains stable unlock IDs, tracks, rarity, source links, byte sizes, and SHA-256 hashes.

## License

All source textures are by ambientCG and released under CC0 1.0. The derived, optimized maps in this packet may be copied, modified, and used commercially without attribution. Source links are retained for provenance and auditability.

- ambientCG license: https://ambientcg.com/index.php?content=license
- CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/
