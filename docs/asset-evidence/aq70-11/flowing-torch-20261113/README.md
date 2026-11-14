# Original flowing torch tissue and rigid skeleton

<!-- AGENT_DOC_METADATA
Category: Evidence / Asset Integration
Status: Active
Authority: Evidentiary
Backlog: AQ-70.11, AQ-70.13
Owner: @root
Updated: 2026-11-13
Upstream: AGENTS.md, docs/asset-contract.md, docs/modular-coral-and-live-rock-spec.md
Downstream: scripts/sync-coral-override.mjs, src/rendering/scene/reef-assembly.ts
-->

Root accepts a bounded original torch morphology/PBR step:165curved tentacles,
small rounded tips, five fluted skeletal calyces. Initial pointed grass-like tips
were rejected. Neutral clay compares the supplied model on the left and new
model on the right; the textured render shows the new source. Packed native,
raw export, generator, six PNG maps and hash-bound installed package are
committed together and used at left LPS-mid01. Supplied canonical models remain
preserved. Package1,462,704bytes/27,870triangles; chosen0.177m height is comparison
framing, not specimen or physical scene calibration. No external imagery/model
was imported ($0).

`native-source-review.json` records a read-only saved-source audit: one valid
14,462-vertex mesh, two material roles, six active images packed (three512px
tissue and three256px skeleton maps). Soft R has pinned bases and positive arc
flex, rigid R is zero, G marks tips, B phase and A analytic contact. The source
retains tissue transmission0.12, IOR1.36 and coat0.12; skeleton is opaque mineral
PBR with zero fluorescence. Raw masks never become display color or opacity.

The isolated installer validates two independent primitive streams and explicit
soft/rigid roles, rejects invalid inputs before writes and preserves the previous
single-rigid package bytes. Actual GLTFLoader tests exposed that roles stay on
materials, not generated child meshes. Binding now reads/copies those declarations
before legacy name heuristics. Actual loaded-asset assembly proves soft motion,
rigid shape, pause/resume, source hashes/maps and preserved physical transmission.

A controlled native diagnostic found nine nonfinite pixels in the opaque HDR
transmission source (no infinity; approximate finite peak RGB3.39). Coarse mip
levels8–10 at one probe were nonfinite while0–7 were finite. The new crown went
black with stock blurred sampling; sharp level0 worked. A global output guard
changed other surfaces and was rejected/removed. Final baked-PBR mode retains
stock bicubic refraction whenever finite, otherwise sampling the nearest finite
lower level. This keeps transmission enabled and leaves unrelated materials
unchanged. It does not claim all underlying legacy HDR singularities are fixed.

`pre-promotion-approval.json` records Root's native/package/generator/dirty-proof
hashes before default promotion. Review used native full views at both sizes;
portrait clips part of the left-side colony. Full-colony runtime macro/tissue
rubric and all-archetype/two-variant acceptance remain open. The new height layout
uses a uniformly proportioned colony at the real socket root-space pose, removes
its old outward stand-off offsets and preserves its authored skeleton transform.
No comprehensive support/self-intersection or animated-clearance certificate.

Final exact f95d68c views are in the accompanying [80%-height review](../../aq70-13/fill-80-20261113/README.md).
Both target sizes ready with eleven inhabitants, eight usable phone targets and
no captured warnings/errors.845tests/71files, typecheck16scripts and production
build pass;35installer cases,6legacy custom-artifact cases,4actual torch cases
and75layout/assembly/navigation/spawn checks cover the integration. No measured
GPU budget, whole-rubric art acceptance or deployment is claimed.
