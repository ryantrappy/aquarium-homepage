# Self-Contained Procedural 3D Reef Fish Assets (`reef-asset-v1`)

All 9 rigged and animated 3D reef fish `.glb` assets in this directory are **100% project-original (`license: "original"`)**, built from first principles by [`scripts/build-splat-fish-glbs.mjs`](../../../../scripts/build-splat-fish-glbs.mjs) with **zero external donor `.glb` or `.ply` binary copying** and **zero unreferenced `bufferViews` or `accessors`**.

Each asset is stamped in-band with `reefAsset` and `reefPrimitive` glTF extras, verified against `validateAssetContract` from [`src/rendering/assets/contract.ts`](../contract.ts), and paired with an offline inspection report (`fish-<id>-inspection.json`) and [`manifest.json`](manifest.json).

## Packaged Inventory (`manifest.json`)

| Asset ID | `fishSpeciesId` | File | Species | Animation Clip (`49f @ 24fps`) | Dimensions (`[X, Y, Z]` m) | Tris |
| :--- | :--- | :--- | :--- | :--- | :--- | ---: |
| `fish-blue-green-chromis` | `blue-green-chromis` | `blue-green-chromis.glb` | *Chromis viridis* (Blue-Green Chromis) | `chromis_subcarangiform_swim` | `[0.382, 0.760, 2.000]` | 8,090 |
| `fish-firefish` | `firefish` | `firefish.glb` | *Nemateleotris magnifica* (Firefish) | `firefish_hover_dart_swim` | `[0.305, 0.929, 2.000]` | 8,396 |
| `fish-yellow-watchman-goby` | `yellow-watchman-goby` | `yellow-watchman-goby.glb` | *Cryptocentrus cinctus* (Yellow Watchman Goby) | `watchman_goby_benthic_swim` | `[0.383, 0.729, 2.000]` | 8,396 |
| `fish-tailspot-blenny` | `tailspot-blenny` | `tailspot-blenny.glb` | *Ecsenius stigmatura* (Tailspot Blenny) | `tailspot_blenny_sinuate_swim` | `[0.362, 0.635, 2.000]` | 8,090 |
| `fish-six-line-wrasse` | `six-line-wrasse` | `six-line-wrasse.glb` | *Pseudocheilinus hexataenia* (Six-Line Wrasse) | `six_line_wrasse_labriform_swim` | `[0.369, 0.779, 2.000]` | 8,090 |
| `fish-mccoskers-flasher-wrasse` | `mccoskers-flasher-wrasse` | `mccoskers-flasher-wrasse.glb` | *Paracheilinus mccoskeri* (McCosker's Flasher Wrasse) | `mccoskers_flasher_wrasse_swim` | `[0.359, 0.996, 2.000]` | 8,396 |
| `fish-lyretail-anthias` | `lyretail-anthias` | `lyretail-anthias.glb` | *Pseudanthias squamipinnis* (Lyretail Anthias) | `lyretail_anthias_school_swim` | `[0.382, 0.996, 2.000]` | 8,396 |
| `fish-flame-angelfish` | `flame-angelfish` | `flame-angelfish.glb` | *Centropyge loricula* (Flame Angelfish) | `flame_angelfish_reef_swim` | `[0.360, 1.325, 2.000]` | 8,090 |
| `fish-copperband-butterflyfish` | `copperband-butterflyfish` | `copperband-butterflyfish.glb` | *Chelmon rostratus* (Copperband Butterflyfish) | `copperband_butterflyfish_glide_swim` | `[0.312, 1.547, 2.000]` | 8,090 |

## Technical & Contract Highlights

1. **Zero External Donor Dependency (`AQ-12` Provenance Resolution)**:
   - Every mesh attribute (`POSITION`, `NORMAL`, `TEXCOORD_0`, `JOINTS_0`, `WEIGHTS_0`, `indices`), 8-joint skeleton (`spine_0..spine_5`, `pectoral_L`, `pectoral_R`), `inverseBindMatrices`, and 49-frame (`2.0s @ 24fps`) looping animation clip is generated mathematically in [`scripts/build-splat-fish-glbs.mjs`](../../../../scripts/build-splat-fish-glbs.mjs).
   - Every `bufferView` and `accessor` in the `.glb` is actively referenced by the mesh, skin, material textures, or animation samplers.
2. **Embedded 3-Map `512×512` PBR Textures**:
   - Each `.glb` embeds `BaseColor` (`sRGB`), tangent-space `Normal` (`Linear`), and packed `ORM` (`R=Occlusion`, `G=Roughness`, `B=Metallic` wired to both `pbrMetallicRoughness.metallicRoughnessTexture` and `material.occlusionTexture` so `aoSource: "texture"` is satisfied natively).
3. **Rebuilding & Validating**:
   ```bash
   node --experimental-strip-types scripts/build-splat-fish-glbs.mjs
   npx vitest run src/rendering/assets/splat-fish-contract.test.ts
   ```
