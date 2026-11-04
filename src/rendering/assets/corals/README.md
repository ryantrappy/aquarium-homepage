# Modular Coral & Live-Rock Asset Library (`reef-asset-v1`)

> **Project Integration Note (`AQ-42`, `AQ-14.3`, `AQ-14.4`):**
> All **8 modular coral colonies** and **2 bare live-rock island foundations** in this directory are finished, visually verified in headless Blender 5.0.1 Cycles, stamped with in-band `extras.reefAsset` / `extras.reefPrimitive` / `extras.reefSocket` metadata per [`docs/asset-contract.md`](../../../../docs/asset-contract.md) and [`docs/modular-coral-and-live-rock-spec.md`](../../../../docs/modular-coral-and-live-rock-spec.md), and validated with `validateAssetContract` from [`src/rendering/assets/contract.ts`](../contract.ts). **They should be used directly in the project's modular reef assembly (`AQ-14.3`, `AQ-14.4`, `AQ-42`).**

## Packaged Assets (`src/rendering/assets/corals/`)

See [`manifest.json`](manifest.json) for machine-readable metadata, bounding boxes, primitive roles, socket counts, generator SHA-256 digests, and build commands. Every `.glb` has a paired `<id>-inspection.json` that passes `validateAssetContract(record)`.

| Asset ID | Kind / Archetype | Species / Description | File | Size (Bytes) | Triangles | Primitives (`role`) | Sockets | SHA-256 (`.glb`) |
| --- | --- | --- | --- | ---: | ---: | --- | ---: | --- |
| `coral-euphyllia-torch` | `coral` (`tentaculate-lps`) | *Euphyllia glabrescens* (Gold / Neon-Green Tip Torch Coral, 3 phaceloid heads, 168 tentacles) | [`coral-euphyllia-torch.glb`](coral-euphyllia-torch.glb) | `2,175,012` | `26,232` | `euphyllia_skeleton` (`coral-rigid`), `euphyllia_polyp_crown` (`coral-soft`) | `0` | `6bc38ed7c54e...` |
| `coral-euphyllia-hammer` | `coral` (`tentaculate-lps`) | *Euphyllia ancora / parancora* (Bi-Color Anchor / Hammer Coral, 3 heads, 144 T-anchor tips) | [`coral-euphyllia-hammer.glb`](coral-euphyllia-hammer.glb) | `1,741,436` | `24,112` | `euphyllia_hammer_skeleton` (`coral-rigid`), `euphyllia_hammer_polyp_crown` (`coral-soft`) | `0` | `fd125b739103...` |
| `coral-acropora-table` | `coral` (`branching-sps`) | *Acropora hyacinthus / millepora* (Corymbose Table SPS Colony, 42 branchlets, radial corallite cups) | [`coral-acropora-table.glb`](coral-acropora-table.glb) | `2,236,728` | `34,176` | `acropora_table_colony` (`coral-rigid`) | `0` | `4d527743036e...` |
| `coral-acropora-staghorn` | `coral` (`branching-sps`) | *Acropora formosa / cervicornis* (Upright Arborescent Staghorn SPS Colony with tubular radial corallites) | [`coral-acropora-staghorn.glb`](coral-acropora-staghorn.glb) | `1,582,656` | `23,648` | `acropora_staghorn_colony` (`coral-rigid`) | `0` | `0a4d8c3007c8...` |
| `coral-montipora-plate` | `coral` (`plating-sps`) | *Montipora capricornis* (3-Tier Logarithmic Helical Scrolling Whorl Plate SPS Colony) | [`coral-montipora-plate.glb`](coral-montipora-plate.glb) | `666,680` | `4,560` | `montipora_plate_colony` (`coral-rigid`) | `0` | `c34ef2dc59cf...` |
| `coral-brain-diploria` | `coral` (`mounded-lps`) | *Diploria / Symphyllia* (Meandroid Labyrinth Brain Coral with colline walls & recessed valley floor) | [`coral-brain-diploria.glb`](coral-brain-diploria.glb) | `1,408,776` | `12,544` | `diploria_brain_colony` (`coral-soft`, `R <= 0.045`) | `0` | `90cd837a1272...` |
| `coral-anemone-bta` | `coral` (`host-anemone`) | *Entacmaea quadricolor* (Rose / Sunburst Bubble-Tip Host Anemone, pedal column + 62 bulb-tipped tentacles) | [`coral-anemone-bta.glb`](coral-anemone-bta.glb) | `1,160,328` | `17,800` | `anemone_column_disc` (`coral-soft`), `anemone_tentacle_crown` (`coral-soft`) | `0` | `aa350c4f9ad9...` |
| `coral-zoanthid-mat` | `coral` (`zoanthid-mat`) | *Zoanthus sp.* (Encrusting Colonial Button Polyp Cluster, 19 non-overlapping polyps × 24 marginal tentacles) | [`coral-zoanthid-mat.glb`](coral-zoanthid-mat.glb) | `874,704` | `18,600` | `zoanthid_button_cluster` (`coral-soft`) | `0` | `4cbe8c1e0626...` |
| `live-rock-island-left` | `rock` (`rock-foundation`) | Left Arched Carbonate Reef Bommie (`0.83 m × 0.51 m × 0.40 m`) with 12 `socket_*` coral mounts | [`live-rock-island-left.glb`](live-rock-island-left.glb) | `1,693,520` | `16,384` | `live_rock_island_left` (`rock`, `aoSource: "texture"`) | `12` | `bc055e316fd1...` |
| `live-rock-island-right` | `rock` (`rock-foundation`) | Right Terraced Shelf Reef Island (`0.78 m × 0.39 m × 0.35 m`) with 11 `socket_*` coral mounts | [`live-rock-island-right.glb`](live-rock-island-right.glb) | `1,693,156` | `16,384` | `live_rock_island_right` (`rock`, `aoSource: "texture"`) | `11` | `bd7df7adaa1f...` |

## Contract Guarantees (`reef-asset-v1` & `coral-raw-masks-v1`)

1. **Canonical Units & Orientation**:
   - All assets are authored in **meters** (`units: "meter"`), glTF `+Y` up (`upAxis: "+Y"`), local holdfast/base origin (`origin: "local"`), and uniform `[1, 1, 1]` root node scale.
2. **Coral Vertex Attributes (`COLOR_0` = `coral-raw-masks-v1`)**:
   - `R = flexibilityMask`: `0.0` on all `coral-rigid` primitives (`euphyllia_skeleton`, `euphyllia_hammer_skeleton`, `acropora_table_colony`, `acropora_staghorn_colony`, `montipora_plate_colony`) and holdfast bases; `0.0 -> 1.0` smoothly along soft polyp/tentacle crowns (`euphyllia_polyp_crown`, `euphyllia_hammer_polyp_crown`, `anemone_tentacle_crown`, `zoanthid_button_cluster`) and `0.0 -> 0.045` on fleshy brain colline ridges (`diploria_brain_colony`).
   - `G = growthTipOrPolypMask`: `0.0 -> 1.0` at calcifying axial/peristome tips, bulb swellings, and valley floors for actinic fluorescence and specular differentiation.
   - `B = phaseSeed`: Deterministic per-head/per-branch/per-polyp phase seed in `[0, 1]` so neighboring polyps and tentacles sway out of phase in water current.
   - `A = contactAO`: Pre-baked self-shadowing (`0.12–0.28` in basal holdfasts, underside ledges, and interior crevices; `1.0` at exposed tips). Runtime shaders must bind a white vertex-color override texture or strip `COLOR_0` before standard `MeshStandardMaterial` compilation and read `COLOR_0` explicitly as raw scalar masks.
3. **Bare Live-Rock Foundations (`live-rock-island-left`, `live-rock-island-right`)**:
   - Exported **without** `COLOR_0` (`aoSource: "texture"` via `glTF Material Output -> Occlusion` R-channel).
   - Expose 12 (`left`) and 11 (`right`) child Empty nodes (`socket_sps_crest_*`, `socket_plate_ledge_*`, `socket_lps_mid_*`, `socket_brain_apron_*`, `socket_anemone_crevice_*`, `socket_soft_mat_*`) whose local `+Y` axis matches the rock surface normal and whose `extras.reefSocket` metadata specifies `archetype`, `normal`, `Tangent`, `footprintRadiusM`, and `clearanceRadiusM`.

## Rebuilding & Re-Validating

```sh
# 1. Regenerate any coral or rock .glb in /tmp/coral-models using Blender 5.0 (--threads 4 -b)
/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_euphyllia_torch.py -- /tmp/coral-models/coral-euphyllia-torch
/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_euphyllia_hammer.py -- /tmp/coral-models/coral-euphyllia-hammer
/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_acropora_table.py -- /tmp/coral-models/coral-acropora-table
/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_acropora_staghorn.py -- /tmp/coral-models/coral-acropora-staghorn
/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_montipora_plate.py -- /tmp/coral-models/coral-montipora-plate
/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_brain_coral.py -- /tmp/coral-models/coral-brain-diploria
/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_bubble_tip_anemone.py -- /tmp/coral-models/coral-anemone-bta
/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_zoanthid_mat.py -- /tmp/coral-models/coral-zoanthid-mat
/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_live_rock_islands.py -- /tmp/coral-models both

# 2. Stamp in-band reefAsset/reefPrimitive/reefSocket extras, write src/rendering/assets/corals/*, and validate against src/rendering/assets/contract.ts
node --experimental-strip-types src/rendering/modeling/package_modular_corals.mjs
```
