# Licensed rendering-study assets

<!-- AGENT_DOC_METADATA
Category: Evidence / Asset Attribution
Status: Active
Authority: Evidentiary
Backlog: AQ-12, AQ-40, AQ-70.10, AQ-70.11, AQ-70.12, AQ-94
Owner: @root
Updated: 2026-11-13
Upstream: docs/requirements.md, src/rendering/proof/asset-manifest.json
Downstream: Rendering study assets and candidate attribution
-->

> [!NOTE]
> Asset credit and provenance record. This does not approve final visual art or animation.

These notices cover the original three separately verified source models used
by the controlled engine study and current main technical baseline. Separate
AQ40 material-proof specimens have their own [review notices](pipeline-assets/ASSET_NOTICES.md);
they passed bounded technical browser QA, remain study-only, and are not main-aquarium art.
Neither set clears rights for the older, ignored LasquetiSpice/Microsoft/PixCap
investigation or implies creator endorsement.

The original three engine-study sources were obtained through Sketchfab's official signed-in download
flow. The listings and source API license records specify
[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
Retain creator credit, source and license links, and the modification notices
below with redistributed derivatives. The models remain technical-study assets,
not accepted final biological artwork.

## Clownfish

- Creator: **zixisun02**.
- Source: [Clownfish](https://sketchfab.com/3d-models/47ba2679d91a4f14b3fc0bf8e3805af5).
- Source GLB SHA-256: `fe29d2a82a62bd5a92d2669332c7a157810d063972a5124f7ccada6d998af547`.
- Checked-in study derivative: `candidate-real-clown.glb`; output hash, byte size,
  topology and validator record are in `asset-manifest.json`.
- Changes: normalized orientation/scale; added an approximate axial/pectoral
  skeleton, weights and swim clip; assigned provisional translucency to selected
  outer fin faces. Original texture pixels retained. See `rig-candidate.py`.
- Reproduction: Blender 5.0.1 and the exact pinned recipe in
  `asset-manifest.json`, using `rig-candidate.py` from revision `6545f60`.
  Verify the external source hash above first. The current experimental script
  is not the byte-reproducing baseline recipe.
- Limits: baked shading, absent exported tangents, coarse fin attachments and
  angular translucent inner triangles; no independent mouth/eye/gill animation.

## Oxidane - Yellow Tang

- Creator: **JayNmeGaming / JayNme**.
- Source: [Oxidane - Yellow Tang](https://sketchfab.com/3d-models/5750f70ac6734728b0eb3ed81de9bb2d).
- Source GLB SHA-256: `25723490457b49858bc167208229570bff793bced8f2ecfc94c4f9d5084a2720`.
- Checked-in study derivative: `candidate-real-tang.glb`; output hash, byte size,
  topology and validator record are in `asset-manifest.json`.
- Changes: normalized orientation/scale; smoothed body geometry; added an
  approximate axial/pectoral skeleton and swim clip, paired translucent pectoral
  membranes/rays and a static operculum outline. These additions are project
  experiments, not original creator geometry. Original texture pixels retained.
  See `rig-candidate.py`.
- Reproduction: Blender 5.0.1 and the exact pinned recipe in
  `asset-manifest.json`, using `rig-candidate.py` from revision `6545f60`.
  Verify the external source hash above first. The current experimental script
  is not the byte-reproducing baseline recipe.
- Limits: source baked shading, approximate fan shape/weights, no independent
  mouth/eye/gill articulation or validated species-specific locomotion.

## Underwater Coral Reef Photogrametry 3D Scan

- Creator: **VIVID REALITY (@vividrealitysolutions)**.
- Source: [Underwater Coral Reef Photogrametry 3D Scan](https://sketchfab.com/3d-models/ef94bf857d2a4af5b3691d19d57baaaa).
- [Exact source metadata](https://api.sketchfab.com/v3/models/ef94bf857d2a4af5b3691d19d57baaaa)
  identifies CC BY 4.0 and the creator above.
- Source GLB SHA-256: `91a6fd7f086b00b6e816ac46a4d702711bc7b430fffbb7ae53679bd72f48031f`.
- Creator describes reconstruction from 99 GoPro Hero 4 underwater photographs,
  Photoshop color correction, and AI denoising/sharpening/enhancement. This is the
  creator's source description, not a new processing step by this project.
- Changes: join source index/material chunks, weld coincident positions while
  preserving loop UVs, simplify geometry, normalize orientation/scale, and
  mechanically downsample the original atlases. No texture repainting. Tangent
  export is disabled because the materials use no normal textures. The tracked
  study derivative is `candidate-reef.glb`; source/output hashes, byte sizes,
  Blender version, geometric counts, atlas dimensions, sampled-error method,
  repair finding and validator results are recorded in `asset-manifest.json` and
  `validation-report.json`. Rebuild with `prepare-reef.py` and the exact source
  file matching the SHA-256 above.
- Limits: scan edges/open underside, baked underwater lighting and color,
  simplification/texture LOD loss. It is one scan patch for controlled engine
  tests, not the completed aquarium habitat or proof of close-up detail.

The large original models remain outside the repository; the compact CC BY 4.0
study derivatives are regular checked-in files so a clean checkout can load all
three engine fixtures without `/tmp` symlinks. Keep creator credit, source and
license links with redistributed derivatives. Revalidate and update the
manifest/report when exporting a new revision.

## Nine procedural fish candidates: retained Clownfish donor (AQ-12 / AQ-70.10)

The nine files listed in [the exact provenance inventory](../../../docs/asset-evidence/aq12/splat-candidate-provenance.json)
are preserved candidates under `src/rendering/assets/splat-fish/`, not approved production art.
Each contains material retained from **Clownfish by zixisun02**,
[source](https://sketchfab.com/3d-models/47ba2679d91a4f14b3fc0bf8e3805af5),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Keep this credit, source/license links and modification record with every redistributed derivative.
No creator endorsement is implied.

The generator replaces geometry, normals, UVs, skin weights, indices and the atlas/material
with procedural species outputs. It retains the donor node hierarchy, skins, inverse-bind data,
clips and buffer payloads (including unreferenced data). These include the project's earlier
orientation/scale, approximate rig/clip and fin changes documented under Clownfish above.
The inventory pins every output, the exact generator and donor, and independently verifies
retained JSON and all 27 retained donor buffer views for each of the nine outputs.

On 2026-11-06 the user explicitly confirmed all Gaussian-splat references mentioned for
these nine species are theirs to share. The generator does not read a raw splat file;
its species specifications and procedural atlas code supply the new geometry/colors.
Individual external reference files/capture hashes were not supplied; no identity is invented.
This records custom-owned reference permission and donor attribution, not species,
material, rig, animation or final scene acceptance. This metadata handoff does not
promote or copy the nine candidate binaries into the clean delivery branch.

## Sand functional-study scope clarification (AQ-70.12)

The experimental sand module generates seeded procedural PBR maps in code. The
[functional GPU report](../../../docs/asset-evidence/aq70-12/functional-review.json)
verifies source integration and temporal invariants only. No scanned/photo-derived
map, 1–2mm physical calibration, tiling quality, final sand art or budget criterion
has been accepted. Earlier reference/calibration descriptions are not evidence of
those gates. The clean delivery keeps the module separate from the main aquarium.

## Custom central limestone arch — AQ-94

`src/rendering/assets/corals/custom-rocks/reef-center-arch.glb` is original project
geometry and custom procedural carbonate/normal/roughness textures ($0, no
imported imagery). Packed Blender source and raw override are committed under
`splat-fish/blend/reef-center-arch.blend` and `splat-fish/overrides/reef-center-arch.glb`.
The separate custom-rock registry pins native, generator, raw export and installed
package hashes. This additive background module is used in the laptop reef;
phone retains the taller single island. It does not replace the supplied Gemini
foundations or claim completion of the modular library/final reef art.

## Custom Acropora-like antler colony — AQ-70.11

`src/rendering/assets/corals/custom-colonies/reef-acropora-antler.glb` is original
project geometry with original baked tissue/normal/roughness maps and raw coral
masks. No external imagery or paid assets. The selected main left crest uses this
colony; the supplied canonical models remain preserved. Packed Blender source,
raw override, original generator and PNG bake copies are committed under the
reserved `splat-fish/blend/reef-acropora-antler*` / `overrides/reef-acropora-antler.glb`
paths. The custom-colonies registry pins source/package hashes. Its morphology
and comparison scale are chosen art, without exact species/physical calibration
or whole-fish clearance claims. Root approved this bounded pilot before promotion;
full eight-archetype/two-variant photorealism acceptance remains open.

## Custom bushy Acropora-like colony — AQ-70.11

`src/rendering/assets/corals/custom-colonies/reef-acropora-corymbose.glb` uses
original project geometry and original procedural/baked PBR maps ($0). Its
self-contained authoring generator derives the existing original antler baking
workflow while building a different, wider branching graph. No external imagery
or model was imported. Packed native, raw override, PNG bakes, generator and
source-hashed separate registry are committed together; the main right crest05
uses the model. All canonical/supplied models and antler source remain preserved.
Root reviewed the matched neutral render and isolated laptop scene before
promotion. The chosen comparison height and morphology do not certify taxonomy,
physical scale, all-archetype realism, runtime budgets or animated clearance.

## Original flowing torch colony — AQ-70.11

`custom-colonies/reef-euphyllia-flowing-torch.glb` is original project geometry
and procedural PBR tissue/skeleton imagery ($0; no external visual asset).
`build_reef_euphyllia_flowing_torch.py` creates the packed native under
`splat-fish/blend/` and raw override under `splat-fish/overrides/`; the separate
registry pins native/export/generator/package hashes. The main left LPS-mid01
uses it. Explicit soft crown and rigid skeleton roles preserve raw coral masks,
restrained transmission and separate skeleton appearance. Root accepted a bounded
neutral/native morphology step before promotion; full physical scale, tissue
rubric, variant, support and rendering-budget requirements remain open.

## Additional custom coral colonies (anchor hammer, whorled Montipora, meandroid brain, colonial zoanthid) — AQ-70.11

- `custom-colonies/reef-euphyllia-anchor-hammer.glb` (`28,116` triangles, `1,507,832` bytes),
  `custom-colonies/reef-montipora-whorled-plate.glb` (`21,950` triangles, `1,744,376` bytes),
  `custom-colonies/reef-brain-meandroid-diploria.glb` (`24,000` triangles, `2,273,252` bytes),
  and `custom-colonies/reef-zoanthid-colonial-mat.glb` (`28,452` triangles, `1,851,136` bytes)
  are original project geometry and procedural/baked PBR maps ($0; no external
  visual assets).
- Packed native `.blend` sources, texture PNGs, and raw `.glb` overrides are
  persisted under `splat-fish/blend/` and `splat-fish/overrides/`, synced into
  `custom-colonies/manifest.json` with SHA-256 lineage, and mounted on the left
  island's primary sockets (`socket_lps_mid_03`, `socket_plate_ledge_01`,
  `socket_brain_apron_01`, `socket_soft_mat_01`). Canonical `corals/` assets
  remain preserved; full rubric, two-variant, physical scale, and budget
  acceptance remain open for Root review.

- **`AQ-70.11` Right-Island variant colonies (`reef-acropora-tabular-plate`, `reef-montipora-tier-shelf`, `reef-brain-fleshy-lobophyllia`, `reef-zoanthid-palythoa-cluster`)**:
  - Original **$0** procedural 3D geometry and baked PBR texture maps authored from scratch in Blender (`build_reef_acropora_tabular_plate.py`, `build_reef_montipora_tier_shelf.py`, `build_reef_brain_fleshy_lobophyllia.py`, `build_reef_zoanthid_palythoa_cluster.py`; packed sources under `src/rendering/assets/splat-fish/blend/`).
  - Synced into `src/rendering/assets/corals/custom-colonies/`:
    - `reef-acropora-tabular-plate.glb`: `24,821` triangles, `2,382,948` bytes (`branching-sps`, `socket_sps_crest_04`)
    - `reef-montipora-tier-shelf.glb`: `21,324` triangles, `1,607,356` bytes (`plating-sps`, `socket_plate_ledge_04`)
    - `reef-brain-fleshy-lobophyllia.glb`: `24,000` triangles, `2,218,308` bytes (`mounded-lps`, `socket_brain_apron_04`)
    - `reef-zoanthid-palythoa-cluster.glb`: `27,812` triangles, `1,751,772` bytes (`zoanthid-mat`, `socket_soft_mat_02`)
  - **`AQ-70.11` Host-Anemone two-variant BTA batch (`reef-anemone-rose-bta`, `reef-anemone-sunburst-bta`)**:
    - Original **$0** procedural 3D geometry and baked PBR texture maps authored from scratch in Blender (`build_reef_anemone_rose_bta.py`, `build_reef_anemone_sunburst_bta.py`; packed sources under `src/rendering/assets/splat-fish/blend/`).
    - `reef-anemone-rose-bta.glb`: `26,192` triangles, `1,679,172` bytes (`host-anemone`, `socket_anemone_crevice_01` on Left Island)
    - `reef-anemone-sunburst-bta.glb`: `27,120` triangles, `1,742,476` bytes (`host-anemone` Variant #2 mounted at `socket_lps_mid_05` on Right Island)
  - **`AQ-70.11` LPS & SPS 4-colony upgrade batch (`reef-euphyllia-gold-torch`, `reef-euphyllia-branching-frogspawn`, `reef-acropora-staghorn-thicket`, `reef-acanthastrea-lordhowensis`)**:
    - Original **$0** procedural 3D geometry and baked PBR texture maps authored from scratch in Blender (`build_reef_euphyllia_gold_torch.py`, `build_reef_euphyllia_branching_frogspawn.py`, `build_reef_acropora_staghorn_thicket.py`, `build_reef_acanthastrea_lordhowensis.py`; packed sources under `src/rendering/assets/splat-fish/blend/`).
    - `reef-euphyllia-gold-torch.glb`: `25,604` triangles, `1,610,836` bytes (`tentaculate-lps`, `socket_lps_mid_02`)
    - `reef-euphyllia-branching-frogspawn.glb`: `24,822` triangles, `1,672,372` bytes (`tentaculate-lps`, `socket_lps_mid_04`)
    - `reef-acropora-staghorn-thicket.glb`: `19,648` triangles, `1,841,052` bytes (`branching-sps`, `socket_sps_crest_03`)
    - `reef-acanthastrea-lordhowensis.glb`: `20,480` triangles, `1,503,816` bytes (`mounded-lps`, `socket_brain_apron_02`)
  - **`AQ-70.11` Final 6-colony socket-completion batch (`23/23` primary mounts custom Blender assets)**:
    - Original **$0** procedural 3D geometry and procedural/baked PBR texture maps authored from scratch in Blender (`build_reef_acropora_violet_millepora.py`, `build_reef_stylophora_magenta_club.py`, `build_reef_montipora_undata_cap.py`, `build_reef_montipora_sunset_shelf.py`, `build_reef_goniopora_flowerpot_lps.py`, `build_reef_favia_war_coral.py`; packed sources under `src/rendering/assets/splat-fish/blend/`).
    - `reef-acropora-violet-millepora.glb`: `25,096` triangles, `2,272,348` bytes (`branching-sps`, `socket_sps_crest_02`)
    - `reef-stylophora-magenta-club.glb`: `16,184` triangles, `1,764,308` bytes (`branching-sps`, `socket_sps_crest_06`)
    - `reef-montipora-undata-cap.glb`: `15,120` triangles, `1,555,064` bytes (`plating-sps`, `socket_plate_ledge_02`)
    - `reef-montipora-sunset-shelf.glb`: `14,236` triangles, `1,462,592` bytes (`plating-sps`, `socket_plate_ledge_03`)
    - `reef-goniopora-flowerpot-lps.glb`: `20,536` triangles, `1,660,916` bytes (`tentaculate-lps`, `socket_lps_mid_06`)
    - `reef-favia-war-coral.glb`: `20,480` triangles, `1,500,424` bytes (`mounded-lps`, `socket_brain_apron_03`)
  - Canonical `corals/` assets remain preserved; look-dev captures, physical scale/rubric evaluation, and Root approval remain pending.

## Clean-up-crew reef invertebrates (Trochus snail, scarlet hermit crab, emerald crab, cleaner shrimp) — `AQ-109` (Phase 1)

- Original **$0** rigged and animated 3D invertebrate geometry and `512×512` procedural PBR texture maps (BaseColor, Normal, packed ORM) authored from scratch in Blender (`invertebrate_common.py`, `build_invertebrate_banded_trochus_snail.py`, `build_invertebrate_scarlet_reef_hermit_crab.py`, `build_invertebrate_emerald_mithrax_crab.py`, `build_invertebrate_scarlet_skunk_cleaner_shrimp.py`). Packed sources and textures live under `src/rendering/assets/splat-fish/blend/` and overrides under `src/rendering/assets/splat-fish/overrides/`; `blue_crab.blend` and existing canonical `fish/`, `corals/`, and `splat-fish/` catalogs remain untouched.
- Synced into `src/rendering/assets/invertebrates/` with `600×400` studio Cycles transparent WebP thumbnails in `public/fish/`:
  - `invertebrate-banded-trochus-snail.glb`: `8,268` triangles, `1,126,348` bytes, `9` joints, clip `trochus_snail_glide`, thumbnail `public/fish/banded-trochus-snail.webp`
  - `invertebrate-scarlet-reef-hermit-crab.glb`: `7,104` triangles, `1,067,576` bytes, `12` joints, clip `hermit_crab_scurry`, thumbnail `public/fish/scarlet-reef-hermit-crab.webp`
  - `invertebrate-emerald-mithrax-crab.glb`: `4,192` triangles, `1,035,928` bytes, `13` joints, clip `emerald_crab_forage`, thumbnail `public/fish/emerald-mithrax-crab.webp`
  - `invertebrate-scarlet-skunk-cleaner-shrimp.glb`: `3,880` triangles, `511,932` bytes, `13` joints, clip `cleaner_shrimp_rock`, thumbnail `public/fish/scarlet-skunk-cleaner-shrimp.webp`
- Runtime species/locomotion/UI integration (`AQ-109` Phase 2) and Root visual review remain pending.

## Negative Space Aquascape (NSA) modular live-rock library — `AQ-94`

- Original **$0** procedural calcium-carbonate live-rock geometry and shared `2048×2048` 4-quadrant PBR trim sheet (`textures/reef-nsa-trim-2048-{albedo,normal,orm}.jpg`) authored from scratch in Blender (`reef_nsa_trim_sheet.py`, `build_reef_nsa_*.py`; packed sources in `src/rendering/assets/splat-fish/blend/` and overrides in `src/rendering/assets/splat-fish/overrides/`). Canonical `corals/`, `corals/manifest.json`, `splat-fish/manifest.json`, and `reef-center-arch.glb` remain untouched.
- Synced into `src/rendering/assets/corals/custom-rocks/` (`manifest.json`, `6` modules total including `reef-center-arch`), each grounded flush at `boundsM.min[1] = 0`, `aoSource: 'texture'`, zero rejected sockets, and byte-identical embedded `2048×2048` JPEG textures:
  - `reef-nsa-pinnacle-spire.glb`: `13,380` triangles, `1,553,272` bytes (`0.6440 × 0.7382 × 0.3454` m; sockets `socket_plate_ledge_21`, `socket_sps_crest_21`)
  - `reef-nsa-cantilever-shelf.glb`: `10,628` triangles, `1,439,016` bytes (`0.6669 × 0.3110 × 0.3331` m; sockets `socket_lps_mid_21`, `socket_plate_ledge_22`)
  - `reef-nsa-cave-buttress.glb`: `16,928` triangles, `1,678,664` bytes (`0.8098 × 0.5463 × 0.3171` m; socket `socket_lps_mid_22`)
  - `reef-nsa-bommie-mound.glb`: `12,500` triangles, `1,539,956` bytes (`0.5564 × 0.3925 × 0.3358` m; sockets `socket_brain_apron_21`, `socket_soft_mat_21`)
  - `reef-nsa-rubble-talus.glb`: `6,640` triangles, `1,299,896` bytes (`0.3883 × 0.0940 × 0.2687` m; substrate rubble apron, `0` sockets)
- Runtime pinnacle-canyon full-scape composition and Root visual/budget acceptance remain pending.

## Sculpted fish eye/gill/mouth anatomy & `512×512` biological PBR maps — `AQ-91` (Batch 1)

- Original **$0** 3D anatomical head sculpts (convex glossy cornea dome + orbital socket rim, curved operculum gill cover + recessed gill slit, species-matched buccal mouth lips/cleft) and `512×512` 24-bit RGB PNG PBR maps (BaseColor, biological Normal with scales/lateral line/fin rays/head anatomy, packed ORM with `0.035` cornea roughness) authored in Blender 5.2.3 LTS (`fish_head_sculpt_common.py`, `build_fish_*.py`; packed sources in `src/rendering/assets/splat-fish/blend/` and overrides in `src/rendering/assets/splat-fish/overrides/`). `blue-green-chromis.glb` (`AQ-107`) and `learned-shape-guide.json` remain untouched via `sync-blender-override.mjs --fish-overrides`.
- Batch 1 synced in `src/rendering/assets/splat-fish/`:
  - `flame-angelfish.glb`: `11,664` triangles, `999,592` bytes (`0.953` MiB)
  - `copperband-butterflyfish.glb`: `10,306` triangles, `966,924` bytes (`0.922` MiB)
  - `banggai-cardinalfish.glb`: `7,076` triangles, `886,908` bytes (`0.846` MiB)
- Remaining 8 species and Root visual/native review remain pending.
