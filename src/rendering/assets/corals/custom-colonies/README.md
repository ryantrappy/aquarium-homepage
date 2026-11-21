# Custom coral colonies

<!-- AGENT_DOC_METADATA
Category: Evidence / Asset Provenance
Status: Active
Authority: Evidentiary
Backlog: AQ-70.11
Owner: @root
Updated: 2026-11-13
Upstream: docs/asset-contract.md, docs/modular-coral-and-live-rock-spec.md
Downstream: manifest.json, src/rendering/scene/reef-assembly.ts
-->

`reef-acropora-antler` is original project geometry and procedural tissue maps.
It uses no imported visual assets ($0). It is an Acropora-like morphology pilot,
not an exact taxonomic or measured specimen claim. Its0.218m canonical height
is a chosen comparison scale matching the previous colony's framing.

The main left crest uses this colony in both layouts. The supplied canonical
coral models and fixed ten-entry manifest remain unchanged. The separate registry
pins the native Blender source, generator, raw export and installed GLB hashes.
Its inspection validates actual POSITION/COLOR_0 buffers, bounds and rigid role.

The native file retains the245319-triangle high source with1235small corallite
cups, plus the28099-triangle runtime mesh with32growth tips and124small cup
silhouettes. Three512px runtime images (tissue, normal, roughness) are packed.
Contact AO is baked separately, sampled into raw mask A with a0.18floor, and its
PNG is retained beside the source. Raw R=0 is rigid, G marks growth tips/polyp
rims, B is the nearest-tip phase, and A is contact AO. Masks never become display
RGB or opacity. The GLB has one opaque non-emissive PBR material and three maps.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_acropora_antler.py
node scripts/sync-blender-override.mjs --coral reef-acropora-antler --learn-guide
```

Save packed native in `splat-fish/blend/reef-acropora-antler.blend`, export raw
`splat-fish/overrides/reef-acropora-antler.glb`, sync/install, verify actual scene
use, and commit native/export/package/reports/generator together. The installer
is for original colonies only; imported assets need their own exact-license
and derivative-provenance workflow. Coral mode dispatches before fish side effects
and rejects mixed flags. Fish discovery skips the reserved `reef-` namespace.

The explicit `baked-pbr` material mode preserves normal and roughness maps,
applies contact AO to indirect light, uses real fixture shadows and G-masked
fluorescence, and defaults to no added subsurface emission. Legacy procedural
normal/contrast/roughness replacements stay disabled for this mode. The primary
mount's legacy scatter palette is separate so the new mode does not leak into
other coral templates. Pause/depth displacement and conservative bounds retain
the existing raw-mask contract.

This is one reviewed morphology/PBR step. All-archetype realism, two variants per
archetype, whole-colony support and animated fish clearance, physical scene scale
and controlled runtime budgets remain separate open requirements.

## Bushy branching colony

`reef-acropora-corymbose` is a second original branching morphology used at the
right island's crest05. It has112growth tips,109runtime cups and2170high-source
cups. Its435218-triangle hidden source bakes to a25725-triangle runtime mesh and
three packed512px PBR maps. The installed package is2,284,116bytes. Native,
raw export, generator and registry use the same reserved paths/contract as above:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_acropora_corymbose.py
node scripts/sync-blender-override.mjs --coral reef-acropora-corymbose --learn-guide
```

The generator uses narrow UV padding, explicit EXTEND bake margins and safe
initial tissue/normal/roughness/AO texels with `use_clear=False`; subpixel UV
faces therefore do not sample black gutters. A read-only final audit finds zero
zero-area UV triangles and zero black nearest-texel triangle-centroid albedo
samples, without claiming exhaustive GPU filtering coverage. The neutral tissue
is muted green/tan; the mounted palette explicitly grades it toward warm rose.
This palette does not add blanket emission. Legacy scatter remains separately
graded. A single-island phone view uses the left colony, so final phone captures
prove compatibility, not visual review of the new right colony there. Dedicated
runtime macros for this colony at both sizes and full rubric acceptance remain
open. Root's bounded pre-promotion art gate is recorded in
`docs/asset-evidence/aq70-11/corymbose-20261113/trial/approval.json`.

## Flowing torch tissue and skeleton

`reef-euphyllia-flowing-torch` is an original five-head colony with165curved,
rounded-tip tentacles and rigid fluted calyces. It replaces the main left torch
at `socket_lps_mid_01`; supplied canonical torch geometry remains preserved.
Packed native, raw export, generator, six PNG maps and installed package use the
same reserved persistence paths. The installed GLB is1,462,704bytes/27,870triangles.
Native source contains six packed images: three512px tissue maps and three256px
skeleton maps. Chosen0.177m height is comparison framing, not specimen calibration.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_euphyllia_flowing_torch.py
node scripts/sync-blender-override.mjs --coral reef-euphyllia-flowing-torch --learn-guide
```

The installer now also accepts one static canonical mesh with two explicitly
identified primitive/material roles: one coral-soft crown and one coral-rigid
skeleton. Each has independent finite POSITION/NORMAL/UV/COLOR_0 buffers and
measured bounds. Soft R has pinned zero bases and positive arc flexibility;
rigid R remains zero. IDs are unique valid identifiers, not a species whitelist.
Unknown roles, duplicate IDs, missing metadata, invalid masks, transforms,
opacity and emission fail before output writes. Single rigid packages retain
their previous bytes. GLTFLoader retains role declarations on materials; binding
copies them onto generated meshes and honors those explicit roles before name
heuristics. Actual-loader assembly tests verify physical tissue and rigid shape.

Tissue retains transmission0.12/IOR1.36/coat0.12 and authored maps. The skeleton
has its own opaque mineral palette with zero fluorescence. Baked mode uses raw G
for restrained fluorescence; raw A is analytic contact shading, never opacity.
A native diagnostic found nine nonfinite opaque HDR pixels contaminating coarse
transmission mips. Baked tissue keeps stock bicubic refraction whenever finite;
only invalid samples fall back to the nearest finite lower mip. Transmission is
not disabled and unrelated materials keep their previous shading. An attempted
global output guard was rejected and removed. This is robust sampling, not a
claim that all underlying legacy HDR singularities or rendering budgets are fixed.

Root reviewed neutral and native views before default promotion. The taller reef
uses undistorted colonies seated at root-space socket poses; this torch removes
its old outward stand-off offsets and preserves its authored skeleton transform.
Full tissue/rubric accuracy, all-archetype variants, comprehensive contact/support,
self-intersection, metric scale and animated fish clearance remain open.

## Anchor hammer colony (`reef-euphyllia-anchor-hammer`)

`reef-euphyllia-anchor-hammer` is an original five-head *Euphyllia*-like hammer
colony with 145 curved tentacles ending in bilobed T-shaped / crescent anchor
tips and fluted phaceloid skeletal calyces. It mounts at `socket_lps_mid_03` on
the left island (`28,116` triangles, `1,507,832` bytes), preserving the supplied
canonical `coral-euphyllia-hammer` GLB. Native packed `.blend` holds six packed
images (three 512px tissue maps and three 256px skeleton maps), explicit
`coral-soft` / `coral-rigid` primitive roles, `transmission=0.12`, `ior=1.36`,
`coat=0.12`, raw R flex on soft tissue only, and raw G crescent-tip fluorescence.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_euphyllia_anchor_hammer.py
node scripts/sync-blender-override.mjs --coral reef-euphyllia-anchor-hammer --learn-guide
```

## Whorled Montipora plate (`reef-montipora-whorled-plate`)

`reef-montipora-whorled-plate` is an original three-tier scrolling *Montipora
capricornis*-like plate colony with undulating ruffled lobes, 820 high-source
verrucose corallites, and pale growing margins. It mounts at `socket_plate_ledge_01`
on the left island (`21,950` triangles, `1,744,376` bytes), baked from a
326,700-triangle high-poly source into three 512px PBR maps (`tissue`, `normal`,
`roughness`) plus `contact-ao` PNG sampled into raw mask `A` (floored 0.18).
Raw `R=0` (rigid), `G` marks growing margins and polyp rims, and `B` stores
continuous whorl phase.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_montipora_whorled_plate.py
node scripts/sync-blender-override.mjs --coral reef-montipora-whorled-plate --learn-guide
```

## Meandroid brain coral (`reef-brain-meandroid-diploria`)

`reef-brain-meandroid-diploria` is an original *Diploria*-like hemispherical
meandroid labyrinth dome with isotropic meandering valleys, double-crested
ambulacral colline walls, and transverse septal costae. It mounts at
`socket_brain_apron_01` on the left island (`24,000` triangles, `2,273,252` bytes),
baked from a 122,880-triangle high-poly source into three 512px PBR maps plus
`contact-ao` PNG sampled into raw mask `A`. Raw `R=0` (rigid) and `G` masks
only the recessed valley floors for actinic fluorescence (zero blanket emission).

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_brain_meandroid_diploria.py
node scripts/sync-blender-override.mjs --coral reef-brain-meandroid-diploria --learn-guide
```

## Colonial zoanthid mat (`reef-zoanthid-colonial-mat`)

`reef-zoanthid-colonial-mat` is an original 26-polyp size-varied colonial
zoanthid mat (`572` recurved marginal tentacles, patterned sunburst oral discs,
and a rigid stoloniferous coenenchyme base) mounted at `socket_soft_mat_01` on
the left island (`28,452` triangles, `1,851,136` bytes). Native packed `.blend`
holds six packed images (three 512px polyp crown maps and three 256px base
maps) with explicit `coral-soft` / `coral-rigid` primitive roles, raw `R` flex
pinned to `0` on the base mat and oral attachment center, and raw `G` marking
radiating oral-disc sunburst rings and tentacle tips.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_zoanthid_colonial_mat.py
node scripts/sync-blender-override.mjs --coral reef-zoanthid-colonial-mat --learn-guide
```

## `reef-acropora-tabular-plate`

- **Archetype / Socket**: `branching-sps` (`socket_sps_crest_04` on Right Island)
- **Builder script**: `src/rendering/modeling/build_reef_acropora_tabular_plate.py`
- **Source `.blend`**: `src/rendering/assets/splat-fish/blend/reef-acropora-tabular-plate.blend`
- **Synced package**: `reef-acropora-tabular-plate.glb` (`24,821` triangles, `2,382,948` bytes, `dimensionsM: [0.1989, 0.1327, 0.1478]`)
- **Primitives**: `reef_acropora_tabular_plate` (`coral-rigid`)
- **Morphology**: Horizontal *Acropora hyacinthus* anastomosing tabular coral lattice with stout central pedicel and pale upturned axial corallite tips.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_acropora_tabular_plate.py
node scripts/sync-blender-override.mjs --coral reef-acropora-tabular-plate --learn-guide
```

## `reef-montipora-tier-shelf`

- **Archetype / Socket**: `plating-sps` Variant #2 (`socket_plate_ledge_04` on Right Island)
- **Builder script**: `src/rendering/modeling/build_reef_montipora_tier_shelf.py`
- **Source `.blend`**: `src/rendering/assets/splat-fish/blend/reef-montipora-tier-shelf.blend`
- **Synced package**: `reef-montipora-tier-shelf.glb` (`21,324` triangles, `1,607,356` bytes, `dimensionsM: [0.2052, 0.0638, 0.1562]`)
- **Primitives**: `reef_montipora_tier_shelf` (`coral-rigid`)
- **Morphology**: Four staggered plum-magenta cantilevered bracket shelves with scalloped ivory growth rims and pale carbonate undersides.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_montipora_tier_shelf.py
node scripts/sync-blender-override.mjs --coral reef-montipora-tier-shelf --learn-guide
```

## `reef-brain-fleshy-lobophyllia`

- **Archetype / Socket**: `mounded-lps` Variant #2 (`socket_brain_apron_04` on Right Island)
- **Builder script**: `src/rendering/modeling/build_reef_brain_fleshy_lobophyllia.py`
- **Source `.blend`**: `src/rendering/assets/splat-fish/blend/reef-brain-fleshy-lobophyllia.blend`
- **Synced package**: `reef-brain-fleshy-lobophyllia.glb` (`24,000` triangles, `2,218,308` bytes, `dimensionsM: [0.1997, 0.0780, 0.1669]`)
- **Primitives**: `reef_brain_fleshy_lobophyllia` (`coral-rigid`)
- **Morphology**: Broad cobalt-slate fleshy *Lobophyllia* lobes with turquoise oral valleys and transverse septal costae (`0` non-manifold, `0` boundary edges).

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_brain_fleshy_lobophyllia.py
node scripts/sync-blender-override.mjs --coral reef-brain-fleshy-lobophyllia --learn-guide
```

## `reef-zoanthid-palythoa-cluster`

- **Archetype / Socket**: `zoanthid-mat` Variant #2 (`socket_soft_mat_02` on Right Island)
- **Builder script**: `src/rendering/modeling/build_reef_zoanthid_palythoa_cluster.py`
- **Source `.blend`**: `src/rendering/assets/splat-fish/blend/reef-zoanthid-palythoa-cluster.blend`
- **Synced package**: `reef-zoanthid-palythoa-cluster.glb` (`27,812` triangles, `1,751,772` bytes, `dimensionsM: [0.1853, 0.0470, 0.1589]`)
- **Primitives**: `zoanthid_palythoa_polyp_crowns` (`coral-soft`) + `zoanthid_palythoa_mat_base` (`coral-rigid`)
- **Morphology**: Eighteen tall-stalked varied-size *Palythoa* polyps with cupped emerald-teal oral discs, peach-gold mouths, `468` long wispy lime-tipped tentacles, and a rocky leathery coenenchyme mat base.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_zoanthid_palythoa_cluster.py
node scripts/sync-blender-override.mjs --coral reef-zoanthid-palythoa-cluster --learn-guide
```
