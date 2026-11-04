# Original fish modeling studies

These scripts are original Blender 5 studies and are **not** production fish. They explore closed volume, UVs, independent appendages, and skeletal weights; anatomy, materials, fin ray motion, UV seams, head and mouth shaping, texture realism, and browser performance remain unfinished. The first clownfish render was visibly schematic. The projects currently write only to paths supplied on the command line and do not alter the homepage.

`clown-skin-study.png` is an original output from OpenAI's built-in ImageGen on 2026-11-03, prompted as a flat cylindrical ocellaris skin albedo with three white black-edged transverse bands, no eyes, fins, shadows, or fish silhouette. Its repetitive cellular texture is not convincing enough for production. `clown-skin-study-v2.png` is a second built-in ImageGen output prompted to avoid outlined scales and retain subtle pigmentation. Neither was verified to be seamless: measured mean absolute top-to-bottom color differences were 7.2 and 4.6 out of 255 respectively. The .blend packs the selected image so the authored file can be moved independently.

With Blender 5 installed, build drafts outside the repository:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python src/rendering/modeling/build_clownfish.py -- "$PWD/src/rendering/modeling/clown-skin-study-v2.png" /tmp/clown-study
/Applications/Blender.app/Contents/MacOS/Blender -b --python src/rendering/modeling/build_yellow_tang.py -- /tmp/tang-study
```

Each command creates a `.blend` and `.glb`. Both are proof-of-concept rather than validated export pipelines. Their shared structure is deliberately provisional: species differ substantially in shape and locomotion. Tang routine swimming in particular requires pectoral-focused motion and should not inherit a clownfish tail cycle. The models have no production integration or approved animation. The Blender scripts use Python because Blender's modeling API is Python; the browser proof is TypeScript.

---

# Finished Modular Coral & Live-Rock Asset Generators (`AQ-42`, `AQ-14.3`, `AQ-14.4`)

> **Use These Finished Assets in the Project:**
> All **8 modular coral colonies** and **2 bare live-rock island foundations** below have been generated, visually verified in headless Blender 5.0.1 Cycles (`render_coral_views.py`), stamped with in-band `reefAsset` / `reefPrimitive` / `reefSocket` glTF metadata (`package_modular_corals.mjs`), validated with `validateAssetContract` from [`src/rendering/assets/contract.ts`](../assets/contract.ts), and placed in [`src/rendering/assets/corals/`](../assets/corals/README.md) (`manifest.json` + `.glb` + `<id>-inspection.json`). **They are ready and should be used in the project's modular reef tank integration (`AQ-42`, `AQ-14.3`, `AQ-14.4`).**

| Packaged Asset (`.glb` in `src/rendering/assets/corals/`) | Archetype | Generator Script | Triangles | Primitive Roles & `COLOR_0` Contract |
| --- | --- | --- | ---: | --- |
| [`coral-euphyllia-torch.glb`](../assets/corals/coral-euphyllia-torch.glb) | `tentaculate-lps` | [`build_euphyllia_torch.py`](build_euphyllia_torch.py) | `26,232` | `euphyllia_skeleton` (`coral-rigid`, `R=0.0`), `euphyllia_polyp_crown` (`coral-soft`, `R=0..1`) |
| [`coral-euphyllia-hammer.glb`](../assets/corals/coral-euphyllia-hammer.glb) | `tentaculate-lps` | [`build_euphyllia_hammer.py`](build_euphyllia_hammer.py) | `24,112` | `euphyllia_hammer_skeleton` (`coral-rigid`, `R=0.0`), `euphyllia_hammer_polyp_crown` (`coral-soft`, `R=0..1`) |
| [`coral-acropora-table.glb`](../assets/corals/coral-acropora-table.glb) | `branching-sps` | [`build_acropora_table.py`](build_acropora_table.py) | `34,176` | `acropora_table_colony` (`coral-rigid`, `R=0.0`, `G=0..1` axial tips) |
| [`coral-acropora-staghorn.glb`](../assets/corals/coral-acropora-staghorn.glb) | `branching-sps` | [`build_acropora_staghorn.py`](build_acropora_staghorn.py) | `23,648` | `acropora_staghorn_colony` (`coral-rigid`, `R=0.0`, `G=0..1` axial tips & radial corallites) |
| [`coral-montipora-plate.glb`](../assets/corals/coral-montipora-plate.glb) | `plating-sps` | [`build_montipora_plate.py`](build_montipora_plate.py) | `4,560` | `montipora_plate_colony` (`coral-rigid`, `R=0.0`, `G=0..1` pale lavender-white rim) |
| [`coral-brain-diploria.glb`](../assets/corals/coral-brain-diploria.glb) | `mounded-lps` | [`build_brain_coral.py`](build_brain_coral.py) | `12,544` | `diploria_brain_colony` (`coral-soft`, `R=0..0.045` subtle breathing on colline walls, `G=0..1` valley floor) |
| [`coral-anemone-bta.glb`](../assets/corals/coral-anemone-bta.glb) | `host-anemone` | [`build_bubble_tip_anemone.py`](build_bubble_tip_anemone.py) | `17,800` | `anemone_column_disc` (`coral-soft`, `R=0..0.06`), `anemone_tentacle_crown` (`coral-soft`, `R=0..1`) |
| [`coral-zoanthid-mat.glb`](../assets/corals/coral-zoanthid-mat.glb) | `zoanthid-mat` | [`build_zoanthid_mat.py`](build_zoanthid_mat.py) | `18,600` | `zoanthid_button_cluster` (`coral-soft`, `R=0..0.65` marginal tentacles, `G=0..1` oral disc) |
| [`live-rock-island-left.glb`](../assets/corals/live-rock-island-left.glb) | `rock-foundation` | [`build_live_rock_islands.py`](build_live_rock_islands.py) | `16,384` | `live_rock_island_left` (`rock`, no `COLOR_0`, `aoSource: "texture"`, 12 `socket_*` coral mounts) |
| [`live-rock-island-right.glb`](../assets/corals/live-rock-island-right.glb) | `rock-foundation` | [`build_live_rock_islands.py`](build_live_rock_islands.py) | `16,384` | `live_rock_island_right` (`rock`, no `COLOR_0`, `aoSource: "texture"`, 11 `socket_*` coral mounts) |

See [`src/rendering/assets/corals/README.md`](../assets/corals/README.md) and [`src/rendering/assets/corals/manifest.json`](../assets/corals/manifest.json) for full contract details and reproduction commands.
