# AQ-71 / AQ-76 current renderer inventory — 2026-11-15

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-71, AQ-76
Owner: @root
Updated: 2026-11-15
Upstream: AGENTS.md, docs/rendering.md, docs/photorealism-budgets.md
Downstream: AQ-71 current PMREM performance review; AQ-76 runtime asset/LOD review
-->

> [!NOTE]
> This report is pinned to committed source `1f6e1f49e210b7e612c17cefbbedd8b7b4c2548f` on `v1-finalization`. It does not incorporate the concurrent dirty AQ-106 worktree. It records current source-derived inventory and acceptance gaps; it is not a native performance certification or total GPU-memory measurement.

`inventory.json` is reproducible from Git objects with [reproduce-asset-inventory.mjs](reproduce-asset-inventory.mjs). It reads only files at the pinned commit, so concurrent working-tree changes do not alter the calculation. [`source-pins.json`](source-pins.json) records Git blob IDs and SHA-256 values for the source, budget, documentation, asset-manifest, and sailfin provenance inputs. No Backlog status or acceptance criteria were changed.

## Acceptance status

**AQ-71 AC4 remains open.** The accepted shared PMREM look/configuration has no current, controlled laptop frame-rate comparison at 1440×900. Exposure and environment-map role acceptance establishes the rendered look, not a performance result. Root's supplied private lookdev snapshot `c5c10bc` reports 291 renderer calls and 6.26 million submitted triangles for the default five-service roster plus chromis school. These are not unique-scene counts and do not measure GPU time; see “Renderer counters” below. The private snapshot is not a committed source pin and is not independently reproduced here. A bounded, PMREM-on/off laptop comparison plan is recorded in [`aq71-ab-plan.md`](aq71-ab-plan.md). It is a candidate plan for Root review; no private code variant or server was created in this audit.

**AQ-76 AC1 remains unmet.** The current controller's distance LOD path changes fish animation cadence; it does not reduce fish geometry or texture resolution. The old flat-sprite transition was rejected because it visibly snapped. AC2’s configured-only lazy queue and offscreen checks remain implemented, but this inventory is not a whole-scene performance acceptance. AC3’s helper-policy coverage establishes tier transitions, not current native runtime behavior. AC4's measurements are historical: the recorded build comparison used 120 warmup and 180 measured samples, one run per build/size, and does not represent current source `1f6e1f4`.

The current recovery helper uses a 17.5 ms fast EMA threshold below the unchanged 19 ms slow EMA and 22 ms p95 limits. It retains two slow windows / three fast windows, 120-sample or 2-second windows (30-sample minimum), the 5-second cooldown and hidden/paused/reduced-motion exclusions. A healthy 60 Hz RAF stream can now restore tiers, but this is a bounded probe because vsync-capped intervals do not prove spare GPU capacity. Passing helper tests does not certify a native performance budget.

The user's latest verification scope is laptop-only. This report makes no phone performance claim and does not imply the existing phone-side AC has been rechecked.

## Runtime asset and geometry inventory

`aquarium.ts` maps the standard five services to five unique fish GLBs. The Root-provided six-service capture adds one chromis source GLB; five chromis schoolmates reuse that loaded source model. `initialize()` awaits the two rock models, eight coral templates, center arch, and phase-0 configured species before initial habitat assembly. This is 14 unique GLBs / 19,820,860 encoded bytes for the default-five case, including the 1,316,848-byte center arch even in narrow layout where the arch is not placed. Remaining configured fish enter the lazy queue; unconfigured species are not queued. Root's five schoolmates add runtime instances and repeated draw work, not five more GLB or embedded-image downloads.

| Committed-source scenario | Unique GLB files | Encoded source files | Unique source-file triangles | Embedded PNG/JPEG estimate |
| --- | ---: | ---: | ---: | ---: |
| Phase-0 three configured fish | 3 | 2,844,528 B | 26,424 | 13,981,011 B (13.33 MiB) |
| Standard default five services | 5 | 5,442,740 B | 44,704 | 32,855,379 B (31.33 MiB) |
| Default five plus chromis service | 6 | 6,685,396 B | 68,924 | 37,049,682 B (35.33 MiB) |
| Wide static reef: two rocks, eight corals, center arch | 11 | 16,976,332 B | 250,552 | 70,953,626 B (67.67 MiB) |
| Default five + chromis + wide static reef | 17 | 23,661,728 B | 319,476 | 108,003,308 B (103.00 MiB) |
| All 15 standard potential fish assets + wide reef | 26 | 31,275,848 B | 412,868 | 145,752,035 B (139.00 MiB) |

These triangle counts sum source primitives once per GLB file. They do **not** count clone instances or how many times a mesh is submitted across the main, shadow, shaft-depth, shaft-copy, and reflection passes. The embedded texture estimate assumes decoded RGBA8 PNG/JPEG maps and a 4/3 full mip-chain factor; it excludes geometry buffers, render/depth/shadow targets, PMREM, temporary decode memory, renderer/driver overhead, and any implementation-specific resource sharing. It is not an observed GPU allocation.

The possible fish set is explicitly **not** an all-loaded runtime state. It includes 13 splat species, the runtime clownfish copy, and proof yellow tang, and excludes the optional sailfin and concurrent AQ-106 moray. The optional sailfin is excluded because the committed source GLB's `asset.extras` records creator `ernielo18`, source Sketchfab model `61ead32801064cf583711dbfcf88af88`, and license `CC-BY-NC-4.0`; the aquarium source also marks it as optional and license-restricted. This is direct repository metadata, not an inference from the copied file. The copy itself carries no source attribution block. The file record and hashes are included in `source-pins.json`.

The budget test is a manifest/cap contract, not an exact loader inventory: it counts the 13 splat files and proof candidates `candidate-real-clown.glb` / `candidate-real-tang.glb`, while aquarium runtime loads `download_testing_copies/clownfish-copy.glb` and the center arch is not in the fish budget inventory. The current caps (24 MiB fish file bytes, 40 MiB scene file bytes, 512 MiB embedded-texture estimate) are useful broad caps, but they are not a measurement of a particular loaded scene or total GPU residency.

## PMREM and reflection-target allocation

Committed `environment-map.ts` calls `PMREMGenerator.fromScene()` once during scene creation and retains its returned render target until scene disposal. The generator and temporary source cube target are disposed after PMREM creation. The installed Three.js dependency is 0.187.0, pinned by the committed lockfile. Its `PMREMGenerator._allocateTarget()` uses `LOD_MIN = 3`, allocating only levels 256, 128, 64, 32, 16, and 8—not levels 4, 2, and 1. Six cube faces × these 87,360 texels × 8 bytes per half-float RGBA texel = **4,193,280 B (~3.999 MiB)** persistent PMREM color storage. This calculation excludes target/depth and driver overhead; no total GPU memory measurement is claimed.

The static AQ-103 water radiance probe uses a 128-face RGBA8 cube with a full mip chain. Its color mip data is 6 × 4 bytes × 21,845 texels = **524,280 B (~512 KiB)**, plus render/depth allocation overhead. It captures the static reef after initial assembly/layout revisions, excludes water, fish/schoolmates, glass and transient effects, and remains a frozen center probe with local-parallax limitations. It is not a per-frame capture or a full environment map of moving aquarium content.

Other derived targets not included in the GLB texture totals include procedural sand maps (~4 MiB), caustics (~0.33 MiB), low-resolution glass reflector color (~1.5 MiB total, plus depth), and high-tier shaft targets. At 2160×1350 drawing pixels (1440×900 CSS at DPR 1.5), the full-resolution shaft depth/color resources can consume roughly 22.25 MiB together before implementation/driver overhead; the half-resolution shaft color target adds roughly 2.78 MiB. These are nominal format-size calculations, not observed residency.

## Renderer counters and measurement scope

For lookdev captures, `aquarium.ts` resets `renderer.info`, disables its auto-reset, then renders the scene and auxiliary passes before restoring the setting. The collected `render.calls` and `render.triangles` can therefore aggregate main-scene submission with raymarched-shaft depth and composite submissions, shadow draws where enabled, and overview glass reflectors when their staggered update runs. The reported 291 calls / 6.26 million triangles is pass-submission volume, not unique scene geometry.

The lookdev timing fields separately report RAF presentation intervals, JS CPU time around the render function, and frozen-pose render-call time. These are not GPU timer-query measurements. Lookdev uses DPR 1 and does not exercise the adaptive controller's tier transitions. No source-based estimate should be presented as actual GPU time or total memory.

## Bounded next steps

Root selected a half-resolution shaft-depth trial as the next bounded renderer-cost experiment. It is not implemented or included in this audit. It should preserve the accepted art and scene behavior, compare occlusion edges, and use matched captures before any production adoption. For AQ-76 AC1, a separate rig-compatible background-fish geometry LOD remains needed; a repeated chromis model is a strong bounded candidate because its five school instances multiply draw work. The alternative of changing AQ-76 acceptance scope requires explicit Root/user direction.
