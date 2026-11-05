# Modular asset contract

<!-- AGENT_DOC_METADATA
Category: Specification / Contract
Status: Canonical / Active
Authority: Binding Technical Contract
Backlog: AQ-40, AQ-14.3, AQ-42, AQ-14.4
Owner: @asset_validation
Updated: 2026-11-05
Upstream: docs/requirements.md, docs/modular-coral-and-live-rock-spec.md
Downstream: src/rendering/assets/contract.ts, src/rendering/modeling/*.py, src/rendering/modeling/package_modular_corals.mjs
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Technical Specification / Asset Contract
> - **Status**: Canonical / Active
> - **Authority**: Binding Contract
> - **Backlog Reference**: `AQ-40`
> - **Summary**: Canonical coordinate system (+Y up, meters, applied unit roots), `COLOR_0` raw linear vertex flexibility masks, and glTF extras inspection metadata contract (`reef-asset-v1`).

AQ-40 defines the inspection/export contract below. It is separate from visual acceptance and does not promote the rejected fused reef scan or its cleanup variants. The existing main renderer keeps its legacy coordinates until AQ-14.4 assembles the modular tank.

## Coordinates and scale

New modular assets use **meters**, local asset origins and applied root transforms: translation `[0,0,0]`, quaternion `[0,0,0,1]`, scale `[1,1,1]`. Author in Blender Z-up; the glTF exporter converts once to **+Y-up**: Blender `(x,y,z)` becomes glTF `(x,z,-y)`. Authoring floor/ledge normal tests use Blender Z; runtime tests use Y. A socket's authoring +Z becomes exported local +Y. Do not add a second runtime axis conversion or bake the island's scene placement into its geometry.

The chosen tank is a **design** size of 1.8 m wide × 0.75 m high × 0.6 m deep, not a measurement of the current scene. AQ-14.4 will migrate world bounds, camera, sand, fish sizes, clearance and navigation together. Approximately 0.15 m per legacy unit is only a migration aid; it is not the new asset unit or proof that current fish/tank dimensions are calibrated. Avoid nonuniform scaling. Author rock geometry at its intended dimensions; coral assembly may use an explicitly recorded uniform size variation.

## Metadata and inspection data

The TypeScript schema and pure validator are [contract.ts](../src/rendering/assets/contract.ts). Put `reefAsset` in the exported asset root object's glTF `extras` (Blender custom property, `export_extras=True`):

```json
{
  "reefAsset": {
    "schema": "reef-asset-v1",
    "id": "original-rock-proof",
    "kind": "rock",
    "units": "meter",
    "upAxis": "+Y",
    "origin": "local",
    "dimensionsM": [0.4, 0.25, 0.3],
    "provenance": {
      "license": "original",
      "creator": "Aquarium project",
      "sourceSha256": "<64 lowercase hex characters>",
      "recipe": "<versioned generator/export command and inputs>",
      "attribution": "Original project geometry and baked materials"
    }
  }
}
```

Imported assets use `CC0` or `CC-BY-4.0` and require the exact licensed `sourceUrl`, creator, source hash and attribution/modification notice. An original asset's source hash identifies its reproducible generator/source artifact. Store the derivative GLB hash externally, not inside the file whose hash it would change. Keep license evidence and before/after triangles, texture dimensions, transfer bytes, map roles, tool versions and export arguments in the provenance report.

Coral root `reefAsset` extras additionally declare `maskSchema:"coral-raw-masks-v1"`; rock/fish roots must omit it. On exported mesh-object extras, use `reefPrimitive:{id,role,maskSchema}` (omit `maskSchema` outside coral). This identifies each rigid/soft material primitive's mask role when expanding the inspection record. Socket Empty extras use `reefSocket` for the placement-intent fields below; their measured exported transforms and external support evidence become the inspection socket record. Keep report hashes external so they do not create GLB self-hash dependencies. The later loader/inspector must read these actual exported extras rather than inventing them from file names.

`validateAssetContract(unknown)` consumes an **offline inspection record** with `extras`, measured `rootTransform`, `boundsM`, `primitives`, `sockets` and `collisionParts`. It returns `{valid:true,value}` or `{valid:false,issues:[{path,message}]}`. Dimensions must match measured meter bounds. Primitive identifiers are unique. Bounds must be finite with positive thickness; all primitive/proxy bounds fit inside the asset envelope. Inspection arrays are ordinary JSON arrays; decode normalized glTF accessor values to `[0,1]` before validation.

Use each exported primitive's `POSITION` accessor count for `vertexCount`, including UV/normal seam splits, rather than the welded Blender vertex count. Raw-mask count is checked against that exported count.

An inspection primitive contains `id`, `role` (`rock`, `coral-rigid`, `coral-soft`, `fish`), `vertexCount`, measured `boundsM`, and material handling `{vertexColors:false,vertexAlpha:false,aoSource:"texture"|"none"|"coral-mask-a"}`. Coral also requires `maskSchema:"coral-raw-masks-v1"` and `color0:{itemSize:4,values:[R,G,B,A,...]}`. These material fields describe the intended adapter/inspection handling; they are not standard glTF material properties and do not themselves disable Three.js behavior.

The validator checks metadata/array consistency. It does **not** read a GLB, raycast geometry, certify that a reported probe was performed, find self-intersections, prove anatomy, or judge photorealism. Pair it with exported accessor inspection, Khronos validation, actual geometry/probe reports and root visual review. No renderer adapter is installed by this slice.

## Coral raw masks

`COLOR_0` is reserved for **coral-only raw scalar masks** under `coral-raw-masks-v1`, not display color:

| Channel | Meaning | Handling |
| --- | --- | --- |
| R | Raw flexibility height, 0–1 | Calcified skeleton/stalk R is exactly 0. Runtime applies `pow(R,1.8)` **once**. Do not pre-bake that exponent. |
| G | Artist-authored growth-tip/polyp mask | An art control, not evidence of fluorescence or tissue physiology. |
| B | Per-element phase seed, 0–1 | Stable within an authored branch/tentacle; not a measured biological frequency. |
| A | Contact AO, 0–1 | Occlusion only; never opacity. |

Every vertex needs four finite values in range; the count must equal `vertexCount × 4`. Use Blender linear float color values, not an sRGB paint conversion, for raw mask authoring. Installed `GLTFLoader` enables material vertex colors when it sees `COLOR_0`; a later coral adapter must explicitly prevent default RGB/alpha multiplication and bind the raw attribute in its custom shader. Otherwise rigid R=0 tints tissue and AO alpha can change visibility. The adapter must also handle displaced normals, bounds and depth/shadow consistency before soft motion is accepted. The validator cannot make a generic glTF viewer render these custom masks correctly.

Rock AO stays in its separate material/texture contract (`aoSource:"texture"` or `"none"`), with no coral mask schema or `COLOR_0`. AO baking for an exported glTF `occlusionTexture` must be inspected as an actual map role; a texture name alone is insufficient. Do not reinterpret rock red-channel AO as coral flexibility. Legacy proof assets are not automatically migrated to this contract.

## Placement sockets

Sockets are **coral mount intent**, never fish habitat anchors. Export named Empty nodes and record their measured transforms/support in the inspection report. Required fields are `name`, `role:"coral-mount"`, `parentMesh`, `archetype`, `positionM`, unit `normal`, unit quaternion `rotation`, `footprintRadiusM`, `clearanceRadiusM`, and `support`.

| Socket prefix | Archetype |
| --- | --- |
| `socket_sps_crest_01` | `branching-sps` |
| `socket_plate_ledge_01` | `plating-sps` |
| `socket_lps_mid_01` | `tentaculate-lps` |
| `socket_brain_apron_01` | `mounded-lps` |
| `socket_anemone_crevice_01` | `host-anemone` |
| `socket_soft_mat_01` | `zoanthid-mat` |

Use two-digit unique suffixes. Local +Y must match the measured support normal. `support` records `pointM`, `normal`, `supportedRadiusM`, `freeRadiusM`, and `evidence:{method:"surface-probes-v1",geometrySha256,report}`. The mount lies within 2 mm of the recorded support; its footprint and clearance fit the reported supported/free radii. The report must identify the exact geometry hash used for actual surface/footprint/clearance probes. Metadata acceptance is not an independent geometric test.

The later assembly must verify the real attachment surface and coral basal contact, check the whole occupied colony envelope, and keep sockets unavailable if support/clearance is not established. A name such as `anemone_crevice` does not create a host: only an actual accepted host colony and species-compatible, collision-safe approach can produce that semantic fish anchor. Ledge position does not prove high PAR or measured flow. Cave, grazing and perch anchors require their own real geometry and clearance evidence.

## Cave-preserving collision parts

`collisionParts` contains unique `id`, actual `sourceMesh`, `boundsM`, and `evidence:{method:"closed-mesh-proxies-v1",geometrySha256,report}`. Author conservative parts around real closed pillars and shelves, preserving the open void; verify proxies against the actual mesh and record clearance routes in the report. An asset may declare no proxies while unreviewed, but cannot then be promoted as navigation-ready.

The first core budget remains **32 AABBs for the complete assembled habitat**, not 32 per island plus 32 more per coral. The validator caps each inspection record; assembly must enforce the combined count. It does not prove that boxes conservatively cover a mesh or preserve a cave. Current `deriveReefHabitat()` fills height columns down to sand, so simply rerunning it cannot produce cave routes. AQ-34/AQ-14.4 must consume verified parts, regenerate hash-pinned assembled habitat data offline, and test fish clearance, approach/exit, reef occlusion and native targets before integration. Keep fish inflated clearance separate from the authored solid geometry.

Pipeline/bake proof, asset visual approval and scene integration remain separate gates. Root reviews the actual assets at 1440×900 and 402×874 before promotion; this contract alone completes none of the realism or roster goals.
