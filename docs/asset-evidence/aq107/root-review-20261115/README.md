# AQ-107 Root chromis refinement acceptance

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-107
Owner: @root
Updated: 2026-11-15
Upstream: AGENTS.md, docs/asset-contract.md, docs/asset-evidence/aq107/diagnosis-20261114/README.md
Downstream: scripts/refine-chromis-contour.mjs, src/rendering/assets/splat-fish/blue-green-chromis.glb
-->

> **Agent Context & Authority** — Root accepts the original-recipe 139×83 chromis refinement. Rejected global remeshes remain historical evidence; their numerical success did not establish visual quality. No Blender edit or competing visual model was created.

## Actual source and correction

The [diagnosis](../diagnosis-20261114/README.md) identifies the loaded opaque splat-fish GLB, existing mipmapped linear texture filtering and MSAA, and measured coarse contour chords. The user screenshot remains preserved there. Global remeshing failed native appearance review twice; [rejected evidence](../rejected-remesh-20261114/README.md) records the failure.

The accepted pipeline preserves the exact owned image, learned shape guide, species recipe, PBR textures, material definitions, eight-joint rig and animation. It changes the original sampled grid from 84×50 to 139×83. The standalone wrapper pins the shared generator hash, removes its all-species entrypoint using unique anchored substitutions, and executes only the selected recipe in a disposable directory. Before building the denser model it must reproduce the immutable original GLB byte-for-byte. It never executes the shared all-species writer, refuses changed/unrecognized source/output hashes, validates final encoded budgets, and checks concurrent input changes before writing only the chromis GLB, inspection and manifest row. Dry-run leaves workspace inputs/outputs untouched; temporary recipe files are cleaned in `finally`.

Root independently repeated the [deterministic dry-run](deterministic-rebuild.json). Final GLB SHA-256 is `ca69aa9d99b62afc930b9724af2f5714431513a56bd7536df2166bdc9802519f`, 1,242,656 bytes, 24,220 triangles and 12,175 vertices, below the 25,000-triangle / 4 MiB background-fish caps. The visually reviewed raw recipe trial is `3b59e775e6ad4dcb62974633097d7acbff31bbb8a3a60510305c1615717923b1`. Root compared the complete BIN payload and glTF JSON: final runtime differs only in embedded provenance metadata. [Source pins](source-pins.json) and [other-species invariance](other-species-invariance.json) record all 12 untouched rows and 24 byte-identical GLB/report files against d118dca.

Root reran the actual exported-geometry [contour audit](contour-audit.txt), summarized in [metrics](contour-metrics.json). At a 350-pixel fish length, sampled maximum source-SDF chord deviation improves from 1.8652 to 0.5894 pixels; p95 improves from 0.4014 to 0.1022 pixels. This is a finite sample, not an analytic bound or a universal anti-aliasing guarantee. Long straight contour edges are not themselves defects. The source's thin fin topology is preserved rather than globally remeshed to satisfy an arbitrary edge-length target.

## Native visual and integration review

Root reviewed [profile comparison](grid139-profile.png) at normal (~130-pixel) and close (~350-pixel) sizes against the immutable base and royal gramma peer, then [articulated pose/yaw](grid139-posed-yaw35.png). Dorsal and tail contours are visibly smoother, species appearance remains intact, and the rejected triangular shredding is absent. The [fixture source](fixture.js) and [HTML](index.html) disclose orthographic framing and omitted runtime PMREM/flex/fog/caustics/habitat. These are isolated loader comparisons, supplemented by the actual aquarium below.

The private production-source pin c5c10bc loaded the exact final GLB with no pending/failed assets or unresolved fish IDs in [runtime state](final-runtime-state.json), at 1440×900 CSS pixels / DPR 1. Root accepted the [actual macro](final-runtime-macro.png), [half-second pose](final-runtime-pose-half-second.png), and [normal overview](final-runtime-overview.png). The exact 2-unit swim-axis extent and 0.48-unit physical render length remain unchanged; conservative scale/clearance, clip envelope, skin/body-flex and alpha-picking checks pass. [Native body click](body-picking-event.json) at (777,379) opened only the configured Google URL in `_blank` with a user gesture. [Empty water](empty-water-picking.json) at (100,450) emitted no window-open event. The temporary opened Google tab was closed.

[Root integration](root-integration.log): 89 tests across seven suites pass, including deterministic/no-write/base-identity pipeline checks, material/texture/rig preservation, encoded triangle area, manifest contract, clip envelopes, scale, animation, body flex and alpha picking. [Typecheck](root-typecheck.log), all 17 script syntax checks and [production build](root-build.log) pass. The earlier broad suite had two separate AQ-87 spawning failures; this task does not claim whole-scene performance or completion of those gates. The denser chromis costs more triangles per school member; AQ-76's full-scene performance review remains open.

Screenshots use native browser CDP capture with `fromSurface: true`, `captureBeyondViewport: true` and an explicit 1440×900 CSS clip after DPR-1 emulation. Earlier convenience JPEGs cropped/scaled the backing surface and are retained only as rejected-trial observations. No phone checks, deployment, real user configuration changes, Blender edits or other species regeneration occurred. Committed logs trim whitespace/EOF only; raw logs remain under `/tmp`.
