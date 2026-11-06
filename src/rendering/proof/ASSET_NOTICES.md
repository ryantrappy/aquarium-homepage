# Licensed rendering-study assets

<!-- AGENT_DOC_METADATA
Category: Evidence / Asset Attribution
Status: Active
Authority: Evidentiary
Backlog: AQ-12, AQ-40, AQ-70.10, AQ-70.12
Owner: @root
Updated: 2026-11-06
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
