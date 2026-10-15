# Hold effect art: source and license manifest

The selected image files below are used by `../render.mjs`. Each linked OpenGameArt page labels its asset CC0. CC0 permits modification and commercial use without required attribution; these credits preserve provenance. Downloaded source archives and unused extracts are kept outside the app tree in `D:/myr5-work/hold-ecosystem-review/source-archives/`.

| App files | Source and credited author | Page-stated license | Selected use |
|---|---|---|---|
| `flowers-plants_2.png` | [Flowers](https://opengameart.org/content/flowers), SpiderDave | CC0 | 936×24 RGB atlas. Cells 1, 14 and 48 (12×24 each) supply fern, vine and flower; the renderer keys the uniform RGB(34,32,52) background to transparency in its cached canvases. |
| `rabbit/Rabbit/Rabbit_Idle.png`, `rabbit/Rabbit/Rabbit_Run.png` | [Animated Wild Animals](https://opengameart.org/content/animated-wild-animals), ScratchIO | CC0 | 32×26 frames: 10 idle and 6 run. |
| `fox/Fox/Fox_Idle.png`, `fox/Fox/Fox_Run.png` | [Animated Wild Animals](https://opengameart.org/content/animated-wild-animals), ScratchIO | CC0 | 64×36 frames: 6 idle and 6 run. |
| `rocks-original.png` | [Rocks (Rework)](https://opengameart.org/content/rocks-rework), patvanmackelberg and AntumDeluge | CC0 | 96×64 RGBA atlas. The renderer crops 32×32 cells 0, 2 and 4. |
| `crystals/PNG/32x32/crystal-blue.png`, `crystal-icy.png`, `crystal-red-small.png`, `crystal-green-alt.png` | [Crystals](https://opengameart.org/content/crystals-0), Chris Fiedler, Iwan Gabovitch, and Jordan Irwin (AntumDeluge) | CC0; source archive also contains its license/readme | Renderer uses inspected transparent sprite bounds and aspect-fits them into cached 64×64 canvases. |
| `19_freezing_spritesheet.png` | [Free Pixel Effects Pack](https://opengameart.org/content/free-pixel-effects-pack), CodeManu and DavitMasia | CC0/public domain; confirmed by the original pack README and source page | 1000×1000 RGBA, 10×10 row-major grid of 100×100 frames. Used for small icy contact accents; frozen skeleton geometry remains pose-derived. |

Only selected source PNGs and this provenance manifest remain in the app asset tree. Original ZIPs and unused atlas files remain available in the review archive; no external art or code dependency was added.
