# Contract-Validated 3D Reef Fish Assets (`reef-asset-v1`)

> **Root review status — 2026-11-04 (`AQ-57`):** Preserve these six supplied rigged candidates and their provenance. Contract validation and authoring renders do not establish production visual or animation acceptance. The active scene retains its two reviewed candidate rigs; `AQ-49.1` inventories exact bones and animation tracks before future integration. Species identity, rendered anatomy, fin motion and performance require separate Root review. Do not replace active models automatically.

## Packaged Fish Inventory (`manifest.json`)

| Asset ID | `fishSpeciesId` (`src/lib/fish.ts`) | File | Species | Rig Archetype (`docs/reef-fish-roster.md`) | Animation Clip (`48f @ 24fps`) | Dimensions (`[X, Y, Z]` m) | Tris |
| --- | --- | --- | --- | --- | --- | --- | ---: |
| `fish-ocellaris-clownfish` | `ocellaris-clownfish` | `fish-ocellaris-clownfish.glb` | *Amphiprion ocellaris* (Ocellaris Clownfish) | `subcarangiform_schooler` | `clownfish_subcarangiform_swim` | `[0.036, 0.060, 0.111]` | 16,534 |
| `fish-yellow-tang` | `yellow-tang` | `fish-yellow-tang.glb` | *Zebrasoma flavescens* (Yellow Tang) | `labriform_rigid_disc` | `yellow_tang_labriform_swim` | `[0.036, 0.129, 0.148]` | 17,226 |
| `fish-blue-tang` | `blue-tang` | `fish-blue-tang.glb` | *Paracanthurus hepatus* (Regal Blue Tang) | `labriform_cruiser` | `blue_tang_labriform_swim` | `[0.035, 0.092, 0.159]` | 16,866 |
| `fish-royal-gramma` | `royal-gramma` | `fish-royal-gramma.glb` | *Gramma loreto* (Royal Gramma) | `subcarangiform_schooler` | `royal_gramma_subcarangiform_swim` | `[0.024, 0.044, 0.085]` | 15,118 |
| `fish-banggai-cardinalfish` | `banggai-cardinalfish` | `fish-banggai-cardinalfish.glb` | *Pterapogon kauderni* (Banggai Cardinalfish) | `banner_hoverer` | `banggai_banner_hover_swim` | `[0.026, 0.079, 0.087]` | 15,692 |
| `fish-mandarin-dragonet` | `mandarin-dragonet` | `fish-mandarin-dragonet.glb` | *Synchiropus splendidus* (Mandarin Dragonet) | `benthic_percher_dragonet` | `mandarin_dragonet_hover_swim` | `[0.034, 0.044, 0.075]` | 15,460 |

## Anatomical & Technical Highlights

1. **Canonical Coordinate Convention (`docs/asset-contract.md`)**:
   - Authored in canonical meters (`units: "meter"`), exported with `export_yup=True` (`upAxis: "+Y"` dorsal up, `+Z` snout forward), matching the runtime heading (`Math.atan2(dx, dz)`) in [`src/rendering/scene/motion.ts`](../../scene/motion.ts).
2. **Embedded 1024×1024 PBR Texture Atlases**:
   - Every `.glb` embeds packed `BaseColor` (`sRGB`), tangent-space `Normal` (`Non-Color`), and packed `ORM` (`R=Occlusion`, `G=Roughness`, `B=Metallic` wired to `glTF Material Output -> Occlusion` so `material.aoMap` exports natively).
3. **3D Anatomical Features & Species Fidelity**:
   - **Flush Convex Cornea Eyes**: Nested inside sculpted orbital rims with radial iris fibers, glossy black pupils, and wet corneal highlights (plus protruding dorsal turret eyes on `fish-mandarin-dragonet` and the vertical black ocular bar across the silver iris on `fish-banggai-cardinalfish`).
   - **Double-Sided Scalloped Rayed Fins**: Watertight double-sided 3D fin membranes with sculpted fin rays, species-accurate silhouettes (continuous notched anemonefish dorsal on `fish-ocellaris-clownfish`, tall *Zebrasoma* dorsal/anal sails and raised white caudal peduncle scalpel spine on `fish-yellow-tang`, canary-yellow wedge caudal and black painter's palette swirl on `fish-blue-tang`, anterior dorsal black ocellus spot and streaming pelvic fins on `fish-royal-gramma`, separate first spinous dorsal and tall streaming second dorsal/anal banners with white pearl spots and deeply forked caudal lobes on `fish-banggai-cardinalfish`, and tall male first dorsal spine pennant plus splayed benthic pelvic fans on `fish-mandarin-dragonet`).
4. **7-Bone Skeletal Armature & 48-Frame Looping Swim Cycles**:
   - Every asset is a single unified `SkinnedMesh` bound to 7 bones (`spine_0`, `spine_1`, `spine_2`, `spine_3`, `spine_4`, `pectoral_L`, `pectoral_R`) with a 48-frame (`24 fps`) looping swim animation tailored to its biological gait.

## Rebuilding & Re-Validating

```bash
node --experimental-strip-types src/rendering/modeling/package_modular_fish.mjs
```
