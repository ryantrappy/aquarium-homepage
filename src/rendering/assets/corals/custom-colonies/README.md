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
