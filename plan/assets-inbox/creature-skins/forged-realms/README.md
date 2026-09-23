# Coach Creature Skins — Forged Realms

An **additional** 24-skin fantasy/science-fiction creature unlock collection for the Coach app. It does not replace the existing 24 fitness-material battle-pass textures.

## What is included

- 24 namespaced creature-skin IDs (`creature-*`), three for each Coach track.
- 512×512 game-sized WebP maps.
- OpenGL normal maps (`+Y`), appropriate for Three.js.
- A neutral grayscale `tint-mask.webp` for the Coach app's independent runtime palette system.
- Source-preserving `basecolor.webp`, `normal.webp`, `roughness.webp`, and available height/AO/metalness/emissive maps.
- A complete `manifest.json` containing source URLs, licenses, sizes, and SHA-256 checksums.
- `contact-sheet.png` for rapid art review.

Every individual texture directory is below the Coach pack system's current 512 KiB per-asset ceiling. Every three-skin track group is below the current 2 MiB pack ceiling.

## Unlock groups

| Track | Rare | Epic | Legendary |
|---|---|---|---|
| Chest | Starforged Plate | Obsidian Carapace | Hive Armor |
| Quads | Magma Scale | Frost Veins | Storm Carbon |
| Glutes | Ancient Bark | Mossback | Rootbound Hide |
| Arms | Hammered Bronze Golem | Rope Sinew | Runic Leather |
| Yoga | Crystal Core | Moon Marble | Fae Petal |
| Martial Arts | Dragon Scale | Bamboo Hide | Ivory Chitin |
| Cardio | Circuit Hide | Reactor Rust | Aero Mesh |
| Meditation | Zen Sand | River Stone | Biolume Moss |

## Recommended Coach integration

1. Treat this as a separate collection/season with packet ID `coach-creature-forged-realms-v1`.
2. Keep the existing fitness-material IDs untouched.
3. Extend the texture registry's imported-map path rather than assigning these a procedural `familyId`.
4. Multiply the selected Coach palette by `tint-mask.webp`; use `basecolor.webp` only for the source-authentic preview or an optional “natural color” mode.
5. Load non-color maps as linear data. Load base color, tint mask, and emissive maps as sRGB.
6. Use the normal convention noted in the manifest: OpenGL / `+Y`.
7. Consider giving Magma Scale and Circuit Hide an emissive intensity slider; all other appearance controls should remain runtime choices.

## License

The source materials are by ambientCG and released under Creative Commons CC0 1.0. Attribution is not required, but the packet intentionally retains source URLs and provenance. See `LICENSE-CC0.md` and `manifest.json`.
