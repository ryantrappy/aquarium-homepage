> **Root review gate:** Supplied coral/rock/fish assets remain unpromoted candidates. AQ-58 blocks collision readiness and AQ-59 blocks current rock art acceptance. Do not infer approval from authoring claims below.

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
| [`coral-euphyllia-torch.glb`](../assets/corals/coral-euphyllia-torch.glb) | `tentaculate-lps` | [`build_euphyllia_torch.py`](build_euphyllia_torch.py) | `26,232` | `euphyllia_skeleton` (`coral-rigid`, `R=0.0`), `euphyllia_polyp_crown` (`coral-soft`, raw linear `R=0..1` height) |
| [`coral-euphyllia-hammer.glb`](../assets/corals/coral-euphyllia-hammer.glb) | `tentaculate-lps` | [`build_euphyllia_hammer.py`](build_euphyllia_hammer.py) | `24,112` | `euphyllia_hammer_skeleton` (`coral-rigid`, `R=0.0`), `euphyllia_hammer_polyp_crown` (`coral-soft`, raw linear `R=0..1` height) |
| [`coral-acropora-table.glb`](../assets/corals/coral-acropora-table.glb) | `branching-sps` | [`build_acropora_table.py`](build_acropora_table.py) | `34,176` | `acropora_table_colony` (`coral-rigid`, `R=0.0`, `G=0..1` axial tips) |
| [`coral-acropora-staghorn.glb`](../assets/corals/coral-acropora-staghorn.glb) | `branching-sps` | [`build_acropora_staghorn.py`](build_acropora_staghorn.py) | `23,648` | `acropora_staghorn_colony` (`coral-rigid`, `R=0.0`, `G=0..1` axial tips & radial corallites) |
| [`coral-montipora-plate.glb`](../assets/corals/coral-montipora-plate.glb) | `plating-sps` | [`build_montipora_plate.py`](build_montipora_plate.py) | `4,560` | `montipora_plate_colony` (`coral-rigid`, `R=0.0`, `G=0..1` pale lavender-white rim) |
| [`coral-brain-diploria.glb`](../assets/corals/coral-brain-diploria.glb) | `mounded-lps` | [`build_brain_coral.py`](build_brain_coral.py) | `12,544` | `diploria_brain_colony` (`coral-soft`, `R=0..0.045` subtle breathing on colline walls, `G=0..1` valley floor) |
| [`coral-anemone-bta.glb`](../assets/corals/coral-anemone-bta.glb) | `host-anemone` | [`build_bubble_tip_anemone.py`](build_bubble_tip_anemone.py) | `17,800` | `anemone_column_disc` (`coral-soft`, `R=0..0.14`), `anemone_tentacle_crown` (`coral-soft`, raw linear `R=0..1` height) |
| [`coral-zoanthid-mat.glb`](../assets/corals/coral-zoanthid-mat.glb) | `zoanthid-mat` | [`build_zoanthid_mat.py`](build_zoanthid_mat.py) | `18,600` | `zoanthid_button_cluster` (`coral-soft`, `R=0..0.65` marginal tentacles, `G=0..1` oral disc) |
| [`live-rock-island-left.glb`](../assets/corals/live-rock-island-left.glb) | `rock-foundation` | [`build_live_rock_islands.py`](build_live_rock_islands.py) | `24,572` | `live_rock_island_left` (`rock`, no `COLOR_0`, `aoSource: "texture"`, real cave (see exact measured report), collision metadata withdrawn pending AQ-58, `12/12` measured `socket_*` coral mounts) |
| [`live-rock-island-right.glb`](../assets/corals/live-rock-island-right.glb) | `rock-foundation` | [`build_live_rock_islands.py`](build_live_rock_islands.py) | `24,572` | `live_rock_island_right` (`rock`, no `COLOR_0`, `aoSource: "texture"`, watertight terraced formation, `11/11` measured `socket_*` coral mounts) |

See [`src/rendering/assets/corals/README.md`](../assets/corals/README.md) and [`src/rendering/assets/corals/manifest.json`](../assets/corals/manifest.json) for full contract details and reproduction commands.

---

# Supplied Rigged & Animated 3D Reef Fish Candidate Generators (`AQ-18`, `AQ-19`, `AQ-20`, `AQ-21`, `AQ-22`, `AQ-26`)

> **Root audit status — 2026-11-04:** Preserve the six supplied generators/exports as candidates. Contract checks and authoring renders do not authorize replacing active fish. Review exact anatomy, native clips, axes and procedural composition before integration; no main-scene promotion is approved by this handoff.

| Packaged Asset (`.glb` in `src/rendering/assets/fish/`) | `fishSpeciesId` | Rig Archetype | Generator Script | Triangles | Animation Clip (`48f @ 24fps`) |
| --- | --- | --- | --- | ---: | --- |
| [`fish-ocellaris-clownfish.glb`](../assets/fish/fish-ocellaris-clownfish.glb) | `ocellaris-clownfish` | `subcarangiform_schooler` | [`build_clownfish.py`](build_clownfish.py) | `16,534` | `clownfish_subcarangiform_swim` |
| [`fish-yellow-tang.glb`](../assets/fish/fish-yellow-tang.glb) | `yellow-tang` | `labriform_rigid_disc` | [`build_yellow_tang.py`](build_yellow_tang.py) | `17,226` | `yellow_tang_labriform_swim` |
| [`fish-blue-tang.glb`](../assets/fish/fish-blue-tang.glb) | `blue-tang` | `labriform_cruiser` | [`build_blue_tang.py`](build_blue_tang.py) | `16,866` | `blue_tang_labriform_swim` |
| [`fish-royal-gramma.glb`](../assets/fish/fish-royal-gramma.glb) | `royal-gramma` | `subcarangiform_schooler` | [`build_royal_gramma.py`](build_royal_gramma.py) | `15,118` | `royal_gramma_subcarangiform_swim` |
| [`fish-banggai-cardinalfish.glb`](../assets/fish/fish-banggai-cardinalfish.glb) | `banggai-cardinalfish` | `banner_hoverer` | [`build_banggai_cardinalfish.py`](build_banggai_cardinalfish.py) | `15,692` | `banggai_banner_hover_swim` |
| [`fish-mandarin-dragonet.glb`](../assets/fish/fish-mandarin-dragonet.glb) | `mandarin-dragonet` | `benthic_percher_dragonet` | [`build_mandarin_dragonet.py`](build_mandarin_dragonet.py) | `15,460` | `mandarin_dragonet_hover_swim` |

See [`src/rendering/assets/fish/README.md`](../assets/fish/README.md) and [`src/rendering/assets/fish/manifest.json`](../assets/fish/manifest.json) for full contract details and reproduction commands.
