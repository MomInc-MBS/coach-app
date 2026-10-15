# Reused pixel effect assets

Source: https://opengameart.org/content/free-pixel-effects-pack

Creators: CodeManu and DavitMasia. License: CC0/public domain, verified on the asset page and included README.txt. Download: https://opengameart.org/sites/default/files/Free%20Pixel%20Effects%20Pack.zip

Original frames are 100x100 pixels in row-major sprite grids. The War Room aura picker ships the available magical effects from this pack (magic spell, magic-eight, blue flame, casting ring, magic hit, flame lash, fire spin, protection circle, weapon hit, nebula, vortex, phantom, loading ring, sunburn, felspell, midnight, magic bubbles), alongside the existing fire and brightfire sheets. The row and column counts are declared in `arcade/power/aura-options.mjs`; frames are normalized into cached 64x64 canvases using nearest-neighbor sampling. Source copies retain their original filenames.

Existing app Canvas2D sprite/particle patterns and PhysicalSound voice helpers are reused; no new rendering or audio dependency.

Lightning: pixelated_tilesheet.png, original 256x128 RGBA, 4x2 grid of 64x64 frames. Author 13rice, CC0. Source/license verified at https://opengameart.org/content/radial-lightning-effect and original download https://opengameart.org/sites/default/files/pixelated_tilesheet.png . Attribution appreciated (not required): 13rice from OpenGameArt. Suitable for sparse shoulder/wrist electric accents; reuse native pixel-art frames instead of redrawing a replacement.

The freezing sheet already used for Blizzard lives at `arcade/hold/assets/19_freezing_spritesheet.png` and is offered as a selectable aura as well.

