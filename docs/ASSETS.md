# Asset register

All runtime assets are self-hosted. No AI-generated raster images are used in this release: the free assets fit the cutaway house. The complete packs remain in the ignored `.release/` folder; only used files are shipped. `ASSET-MANIFEST.json` records byte counts and SHA-256 hashes of the shipped source assets.

| Material | Author and primary source | License | Included files |
|---|---|---|---|
| Blocky Characters 2.0 | [Kenney](https://kenney.nl/assets/blocky-characters) | CC0 | Characters a, b, e, i and matching textures; embedded idle/walk/sit/interact animations |
| Furniture Kit | [Kenney](https://kenney.nl/assets/furniture-kit) | CC0 | Books, coat rack, standing lamp, boxes and small plant |
| Impact Sounds 1.0 | [Kenney](https://kenney.nl/assets/impact-sounds) | CC0 | Five unmodified recordings, `assets/audio/wood-000.ogg` through `wood-004.ogg`, used for wooden footsteps |
| Noto Sans Thai | [Google Fonts / Noto](https://github.com/google/fonts/tree/main/ofl/notosansthai) | SIL OFL 1.1 | Variable TrueType font |
| DM Sans | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/dmsans) | SIL OFL 1.1 | Variable TrueType font |
| Playfair Display | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/playfairdisplay) | SIL OFL 1.1 | Variable TrueType font |
| Three.js 0.180.0 | [Three.js](https://github.com/mrdoob/three.js) | MIT | Bundled renderer and GLTFLoader |
| House, added floors, memories, story and UI | Created in this project | Project-owned source | Procedural geometry and text |
| Music motif and synthesized effects | Created in this project | Project-owned source | WebAudio stone/rug footsteps, wooden-step fallback, bag/paper, doors, puzzles and memory/story cues |

Original third-party license texts are included under `assets/licenses/` and served with the game. Attribution to Kenney is included even though CC0 does not require it. Fonts are distributed unmodified with their original licenses. The commercial reference *The Sexy Brutale* informs the cutaway theatrical atmosphere; none of its assets are used.

rc.4 adds original procedural second-floor and basement scenery in `house-expansion.js`. Three additional residents reuse existing character bases with tint variations. No new paid assets or AI-generated images were acquired.


rc.5 replaces the active house renderer with original modular geometry in `mansion-environment.js` and a shared `mansion-layout.js` blueprint. Three 1K PBR material sets were downloaded and self-hosted from [Poly Haven](https://polyhaven.com), licensed [CC0](https://polyhaven.com/license):

| Surface | Asset / author | Included maps | Download bytes |
|---|---|---|---:|
| Wood | [Wood Floor](https://polyhaven.com/a/wood_floor) / Dimitrios Savva | Diffuse, OpenGL normal, roughness | 1,685,550 |
| Plaster | [Beige Wall 001](https://polyhaven.com/a/beige_wall_001) / Dimitrios Savva, Rico Cilliers | Diffuse, OpenGL normal, roughness | 337,764 |
| Stone | [Stone Wall 02](https://polyhaven.com/a/stone_wall_02) / Charlotte Baglioni, Dario Barresi | Diffuse, OpenGL normal, roughness | 1,867,936 |

Source URL: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/{id}/{id}_{diff,nor_gl,rough}_1k.jpg`. Nine maps total 3,891,250 bytes. Base color is sRGB; normal and roughness are linear. No displacement, paid pack, Blender install, or runtime third-party texture request is required. Visible Poly Haven credit is included in the game. These materials improve the stylized architecture; the current character models remain prototype assets.

Wooden footsteps use five Ogg recordings from [Kenney's Impact Sounds](https://kenney.nl/assets/impact-sounds), totaling 29,779 bytes. The archive's `Audio/footstep_wood_000.ogg` through `footstep_wood_004.ogg` are renamed to `wood-000.ogg` through `wood-004.ogg`; their contents match the archive byte for byte. Runtime gain and playback-rate variation do not change the distributed recordings. The pack's original CC0 license is included as `assets/licenses/kenney-impact-sounds.txt`. All recordings are self-hosted; loading or decoding failure retains the original synthesized fallback.

Source archive: [kenney_impact-sounds.zip](https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip). Its verified SHA-256 is `029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8`. The archive remains in ignored `.release/`; the manifest records individual shipped-file hashes, including the license.
