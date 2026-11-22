# Reef fish thumbnail assets

<!-- AGENT_DOC_METADATA
Category: Evidence / Asset Provenance & Material Contract
Status: Active
Authority: Evidentiary Record & Rendering Specification
Backlog: AQ-40, AQ-33, AQ-66, AQ-70.8, AQ-70.9, AQ-70.10, AQ-72, AQ-74, AQ-91, AQ-106
Owner: @root
Updated: 2026-11-21
Upstream: docs/reef-fish-roster.md, docs/asset-contract.md
Downstream: docs/fish-art-provenance.json, public/fish/*, src/rendering/assets/splat-fish/*, src/rendering/scene/fish-flex-material.ts
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: 2D Asset Provenance, Thumbnail Catalog & 3D Fish Material Contract
> - **Status**: Active / Evidentiary & Normative Contract
> - **Authority**: Evidentiary Record & Rendering Specification
> - **Backlog Reference**: `AQ-40`, `AQ-33`, `AQ-66`, `AQ-70.8`, `AQ-70.9`, `AQ-70.10`, `AQ-72`, `AQ-74`, `AQ-91`, `AQ-106`
> - **Summary**: Provenance documentation and visual trait checks for the 16 standard service thumbnails plus the AQ-106 picker-only moray image, together with the 3D Fish Material & Part Contract (`AQ-70.8` / `AQ-72`).

Fish cutouts power the service fish picker and service list previews; most can also provide a temporary in-scene fallback, but the AQ-106 moray image is picker-only and is never a moving fish substitute. Static recognition art is not final production animation. The roster's anatomy and color notes guide documented project-original images; linked references are for species verification and were not copied as image sources.

Per-file hashes and provenance status are recorded in [`fish-art-provenance.json`](fish-art-provenance.json). It distinguishes the documented project-original WebPs, the four inherited WebPs removed after Root approved their replacements, the four project-original PNG sources preserved byte-for-byte under `docs/asset-evidence/aq66/originals/`, and the separately recorded AQ-106 user-supplied thumbnail whose creator/source/license is not recorded. The four approved PNG derivatives are alpha-preserving WebPs; none is a claim of final photorealistic or animated fish.

## Provenance and conversion

- The six new assets (`tailspot-blenny`, `six-line-wrasse`, `mccoskers-flasher-wrasse`, `lyretail-anthias`, `flame-angelfish`, and `copperband-butterflyfish`) were generated as original cutouts with the built-in OpenAI ImageGen tool on 2026-11-03, using the visual baselines recorded in [reef-fish-roster.md](reef-fish-roster.md). They were reviewed against those distinguishing traits before use.
- Four assets inherited from interrupted AQ-33 (`blue-green-chromis`, `firefish`, `yellow-watchman-goby`, and `mandarin-dragonet`) lacked recorded source/license/generation provenance. Root approved new original preview art for these species on 2026-11-04. Their old WebPs were removed from current distribution; their hashes and unresolved history remain in the provenance manifest.
- The first five assets were generated specifically for this project with OpenAI's built-in ImageGen on 2026-11-02, as recorded in [design.md](design.md). The initial royal-gramma and blue-tang outputs were swapped during export; their contents were checked and the filenames corrected before compression. These assets were retained and visually checked against the roster.
- The 16 standard fish thumbnails are WebP files under 75 KB each. The four generated source PNGs remain unchanged in the AQ-66 archive; their active derivatives were encoded with `cwebp` at 600 pixels wide, quality 90, and alpha quality 100. The manifest records measured alpha-visible width fractions for those standard catalog images. The AQ-106 moray thumbnail is separately hash-pinned as an existing picker-only asset and has no alpha-width sprite measurement. No linked species-reference photo is included in the assets.
- The six images generated for this continuation used separate prompts targeting the precise common/scientific name and adult appearance in the roster; the female lyretail anthias and male McCosker's flasher wrasse match the roster's sex-specific baselines.
- The AQ-106 moray thumbnail was already present in the repository and is used only in the service picker. Its file hash and dimensions are recorded, but no creator, generation prompt, or external-source/license evidence is available; Root provenance review remains required. The partial model and its exact-hash PNG exception are recorded separately in `src/rendering/assets/fish/manifest.json`.

## Catalog mapping and visual checks

| Stable ID | Common name and visual cue | Image | Reference used to check traits |
| --- | --- | --- | --- |
| `ocellaris-clownfish` | Ocellaris clownfish: orange body, three white bars | `public/fish/ocellaris-clownfish.webp` | [Monterey Bay Aquarium](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish) |
| `yellow-tang` | Yellow tang: saturated yellow, compressed oval body | `public/fish/yellow-tang.webp` | [Oregon Coast Aquarium](https://aquarium.org/animals/yellow-tang/) |
| `royal-gramma` | Royal gramma: purple front, yellow rear | `public/fish/royal-gramma.webp` | [Aquarium La Rochelle](https://www.aquarium-larochelle.com/en/species-encyclopedia/royal-gramma/) |
| `blue-tang` | Blue tang: royal blue, black markings, yellow caudal fin | `public/fish/blue-tang.webp` | [Australian Museum](https://australian.museum/learn/animals/fishes/blue-tang-paracanthurus-hepatus/) |
| `banggai-cardinalfish` | Banggai cardinalfish: silver, black bars, white spots, elongated fin rays | `public/fish/banggai-cardinalfish.webp` | [Oregon Coast Aquarium](https://aquarium.org/animals/banggai-cardinalfish/) |
| `blue-green-chromis` | Blue-green chromis: blue-green body, forked tail | `public/fish/blue-green-chromis.webp` | [Oregon Coast Aquarium](https://aquarium.org/animals/blue-green-chromis/) |
| `firefish` | Firefish: pale front, red rear, extended first dorsal fin | `public/fish/firefish.webp` | [FAO field guide](https://www.fao.org/fishery/docs/CDrom/bobp/cd1/Bobp/Publns/MAG/021.pdf) |
| `yellow-watchman-goby` | Yellow watchman goby: yellow body and pale blue-white spots | `public/fish/yellow-watchman-goby.webp` | [Australian Museum](https://australian.museum/learn/animals/fishes/yellow-shrimpgoby-cryptocentrus-cinctus/) |
| `mandarin-dragonet` | Mandarin dragonet: orange body with curved blue-green bands | `public/fish/mandarin-dragonet.webp` | [Oregon Coast Aquarium](https://aquarium.org/animals/mandarin-goby/) |
| `tailspot-blenny` | Tailspot blenny: beige-brown body with dark tail-base spot | `public/fish/tailspot-blenny.webp` | [Bali Wildlife](https://baliwildlife.com/encyclopedia/marine-life/ray-finned-fishes/blennies/tailspot-blenny-ecsenius-stigmatura/) |
| `six-line-wrasse` | Six-line wrasse: blue-mauve body with six yellow-orange stripes and green tail | `public/fish/six-line-wrasse.webp` | [Reef Life Survey](https://reeflife.org/species/pseudocheilinus-hexataenia/) |
| `mccoskers-flasher-wrasse` | Male McCosker's flasher wrasse: orange, blue lines, extended dorsal rays | `public/fish/mccoskers-flasher-wrasse.webp` | [Maldives fish guide](https://www.mrc.gov.mv/assets/Uploads/fishes-of-the-maldives.pdf) |
| `lyretail-anthias` | Female lyretail anthias: bright orange, purple stripe below eye | `public/fish/lyretail-anthias.webp` | [Oregon Coast Aquarium](https://aquarium.org/animals/lyretail-anthias/) |
| `flame-angelfish` | Flame angelfish: orange-red body, black bars, blue-violet fin edges | `public/fish/flame-angelfish.webp` | [USGS](https://nas.er.usgs.gov/queries/FactSheet.aspx?SpeciesID=2591) |
| `copperband-butterflyfish` | Copperband butterflyfish: silver-white body, copper bands, elongated snout, eyespot | `public/fish/copperband-butterflyfish.webp` | [Dallas World Aquarium](https://dwazoo.com/animal/copperband-butterflyfish/) |
| `desjardins-sailfin-tang` | Desjardins' sailfin tang: grey body with orange-edged bars, yellow tail | `public/fish/desjardins-sailfin-tang.webp` | [FishBase](https://www.fishbase.se/summary/Zebrasoma-desjardinii) |
| `snowflake-moray-eel` | Existing user-supplied snowflake moray recognition thumbnail; source not independently verified | `public/fish/snowflake-moray-eel.webp` | No image source or license recorded; AQ-106 picker-only use |
| `banded-trochus-snail` | Banded trochus snail: cream-and-burgundy conical shell over speckled fleshy foot ($0 original Blender studio render) | `public/fish/banded-trochus-snail.webp` | [SeaLifeBase](https://www.sealifebase.se/summary/Trochus-histrio) |
| `scarlet-reef-hermit-crab` | Scarlet reef hermit crab: scarlet legs/claws, yellow eyestalks, coralline Cerith shell ($0 original Blender studio render) | `public/fish/scarlet-reef-hermit-crab.webp` | [SeaLifeBase](https://www.sealifebase.se/summary/Paguristes-cadenati) |
| `emerald-mithrax-crab` | Emerald mithrax crab: glossy emerald carapace, spoon-tipped pincers, olive setose legs ($0 original Blender studio render) | `public/fish/emerald-mithrax-crab.webp` | [SeaLifeBase](https://www.sealifebase.se/summary/Mithraculus-sculptus) |
| `scarlet-skunk-cleaner-shrimp` | Scarlet skunk cleaner shrimp: white dorsal skunk stripe on crimson saddle, white antennae ($0 original Blender studio render) | `public/fish/scarlet-skunk-cleaner-shrimp.webp` | [SeaLifeBase](https://www.sealifebase.se/summary/Lysmata-amboinensis) |

## 3D Fish Material & Part Contract (`AQ-70.8` / `AQ-72`)

This contract connects the Blender fish modeling pipeline (`src/rendering/modeling/fish_*.py`, `src/rendering/assets/splat-fish/`) to the runtime Three.js shader and physical material binder (`src/rendering/scene/fish-flex-material.ts`).

### 1. Part & Primitive Naming Conventions

Fish GLBs may expose either a unified single-primitive `SkinnedMesh` (`<species_snake>_body`, with anatomical regions encoded in UVs and texture channels) or multi-part primitives classified by name:

| Canonical Part Role | Recognized Part / Material Name Tokens | Optical Behavior |
| --- | --- | --- |
| `body` | `body`, `torso`, `skin`, `flank`, or default unified `<species>_body` | Wet mucus clearcoat (`IOR = 1.35`, `clearcoat = 0.36`, `clearcoatRoughness = 0.12`), ctenoid scale & lateral-line normal relief, species-selective guanine iridescence (`iridescenceIOR = 1.83`), and backlit fin-margin sheen on unified meshes. |
| `fin` | `fin`, `dorsal`, `anal`, `caudal`, `pectoral`, `pelvic`, `tail` | Double-sided (`THREE.DoubleSide`) rayed fin membrane with backlit sheen/translucency (`sheen = 0.42`, `clearcoat = 0.24`), fin-ray normal relief, and stable depth writing so turning fish never sort-pop against coral. |
| `eye` / `cornea` | `eye`, `cornea`, `iris`, `pupil` | Ultra-glossy convex cornea dome (`roughness <= 0.04`, `clearcoat = 0.92`, `clearcoatRoughness = 0.03`, `IOR = 1.38`) producing crisp overhead fixture specular pinpoint highlights. |

### 2. Required & Optional Texture Maps

Every contract-validated 3D fish GLB in `src/rendering/assets/splat-fish/` embeds three `512×512` 24-bit RGB PNG textures (zero alpha-channel waste, meeting `AQ-70.3` budgets):

1. **BaseColor (`pbrMetallicRoughness.baseColorTexture`, sRGB)**:
   - Delit species coloration with soft organic pattern transitions, dark pupil + metallic iris ring on the eye dome, operculum crease shading, and subtle fin-ray contrast.
2. **Normal (`normalTexture`, linear tangent-space RGB)**:
   - Encodes overlapping ctenoid/cycloid scale micro-relief on the body core, the curved lateral-line sensory canal, radial fin-ray ridges across dorsal/anal/caudal/pectoral membranes, 3D orbital socket rim, curved operculum gill cover ridge + gill slit depression, and buccal mouth cleft relief.
3. **Packed ORM (`pbrMetallicRoughness.metallicRoughnessTexture` shared with `occlusionTexture`, linear RGB)**:
   - **R (Occlusion)**: Recessed AO in the gill slit (`~0.38`), mouth cleft (`~0.42`), orbital rim, and fin bases.
   - **G (Roughness)**: Spatial roughness map driving regional optical response on unified single-draw-call meshes — ultra-glossy cornea dome (`G ≈ 0.035`), wet mucus flank scales (`G ≈ 0.24–0.32`), and silky translucent fin membranes (`G ≈ 0.36–0.44`).
   - **B (Metallic / Guanine Specular Mask)**: Low dielectric baseline (`B ≈ 0.02–0.06`) with elevated metallic/iridescent reflection on iris rings and guanine-rich flank regions.
4. **Graceful Runtime Fallback**:
   - If an asset or test fixture omits optional textures (`normalMap`, `roughnessMap`, `metalnessMap`, `aoMap`), `upgradeFishMaterialForPhotorealism` in `src/rendering/scene/fish-flex-material.ts` preserves all present maps and scalar material properties without throwing or dropping the post-skinning `patchFishFlexShader` vertex deformation hook.

### 3. Physical Optical Parameters & Species Iridescence (`MeshPhysicalMaterial`)

At runtime, `bindFishFlexToModel` upgrades each fish's cloned `MeshStandardMaterial` to a `THREE.MeshPhysicalMaterial` (preserving `customProgramCacheKey` and the `AQ-12` / `AQ-49` / `AQ-74` post-skinning Lighthill + buccal-opercular vertex shader patch):

- **Wet Mucus Clearcoat (`AQ-72` AC #3)**:
  - All fish bodies receive a thin epidermal mucus clearcoat (`ior = 1.35`, `clearcoat = 0.36`, `clearcoatRoughness = 0.12`, `reflectivity = 0.55`) that catches sharp overhead reef-fixture highlights without washing out underlying sRGB base colors.
- **Species-Selective Guanine Iridescence (`AQ-72` AC #2)**:
  - Real teleost iridophores contain stacked guanine crystal platelets ($n \approx 1.83$) separated by cytoplasm ($n \approx 1.33$). Species with structural metallic/iridescent scales receive view-angle-dependent iridescence (`iridescenceIOR = 1.83`, thickness range configured within `160–380 nm` so shifts stay within natural blue-green/cyan/violet bands rather than a cartoon rainbow):
    - High iridescence (`0.42–0.48`): `blue-green-chromis`, `mandarin-dragonet`, `mccoskers-flasher-wrasse`, `lyretail-anthias`.
    - Moderate iridescence (`0.22–0.34`): `blue-tang`, `flame-angelfish`, `royal-gramma`, `six-line-wrasse`, `banggai-cardinalfish`, `copperband-butterflyfish`, `firefish`.
    - Low/subtle mucus-only interference (`0.06–0.12`): `ocellaris-clownfish`, `yellow-tang`, `desjardins-sailfin-tang`, `yellow-watchman-goby`, `tailspot-blenny`.
- **Supported glTF 2.0 Extensions**:
  - `GLTFLoader` natively ingests `KHR_materials_clearcoat`, `KHR_materials_iridescence`, `KHR_materials_sheen`, `KHR_materials_specular`, `KHR_materials_transmission`, and `KHR_materials_volume`; runtime material upgrading harmonizes both extension-authored and standard-ORM-authored fish GLBs under the same shader cache key.

