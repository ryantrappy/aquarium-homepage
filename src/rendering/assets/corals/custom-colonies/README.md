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
is for original rigid colonies only; imported assets need their own exact-license
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
