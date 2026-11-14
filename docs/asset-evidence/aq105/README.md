# AQ-105 mounted-anemone hosting review

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-105, AQ-82, AQ-18
Owner: @root
Updated: 2026-11-14
Upstream: AGENTS.md, docs/behavior-runtime-contract.md, docs/habitat-navigation-core-contract.md
Downstream: src/rendering/scene/anemone-host.ts, src/rendering/scene/motion.ts, src/rendering/scene/reef-mesh-navigation.ts
-->

> [!NOTE]
> **Agent Context & Authority** — Root technical handoff for AQ-105. The task remains In Progress until current-source native hosting, articulation and control review. This does not accept all AQ-82 interactions, final species art, physical size calibration or full animated body clearance.

The production host point is measured from the actual mounted `anemone_tentacle_crown` vertices with all reef/mount transforms applied. It lies in the upper viewer-facing crown rather than on the old detached front plane. Missing or invalid crown geometry is unavailable; it is never clamped into a fabricated host point. A geometry-derived soft home radius feeds the existing artistic interaction cycle.

Only the ocellaris clownfish gets the resident query. Both explicitly tagged soft anemone meshes are permeable to it; rock colliders, unrelated coral geometry and all work budgets remain. Generic fish queries and the fallback obstacle source retain their prior sphere envelopes. The resident query uses each other coral's actual world vertex box plus its full assembly-measured shader displacement margin. The local margin is the expanded sphere radius minus the maximum raw-vertex radius about that same center; each world-axis pad uses the corresponding matrix-row length, a Cauchy–Schwarz bound valid under shear. Separate tests cover transformed vertices plus the full margin under nonuniform, rotated ancestors. No envelope radius is shrunk to force passage.

The host-only fixture initially passed. The complete mounted left assembly then exposed a neighboring hammer-coral sphere envelope covering the home point in both layouts ([failure](initial-neighbor-failure.log)). Tight measured resident bounds resolve this while retaining unrelated coral exclusion. A second phone fixture reached the host but became stationary during interaction ([failure](phone-stationary-failure.log)). Full interaction-chord checks now reject obstructed offsets and fall back toward a safe host point; every actual substep is also checked. The cycle uses continuous active simulation time across idle/swim transitions, and gentle rate-limited yaw drives the turning rig. A fish returning from open water uses its existing swim pace rather than the at-home idle pace.

[Host/mesh checks](host-safety.log) pass24tests, including both current viewport layouts with actual runtime foundation and every left mounted coral template, the current service clownfish ID, current depth-frustum bounds,60seconds of movement, settled residence after30seconds, nonzero bobbing, finite poses and a real resident-query check on every swept segment. Scatter is not included in this fixture; the laptop right island/central arch and other inhabitants are outside its scope. Separate query tests retain rigid-rock/unrelated-coral blocking, other-species exclusion and indeterminate exhausted-budget handling. No Blender, model, source asset or original service-configuration changes.

Source candidate hashes are in [candidate-source-pins.json](candidate-source-pins.json); [asset-pins.json](asset-pins.json) pins the inputs. Full-suite, typecheck/build and native evidence are added after final validation. Distances remain legacy world units. The supplied bubble-tip anemone is reused; this behavior implementation does not establish that asset as a documented wild host species for ocellaris. Species-reference and broader art gates remain under AQ-18/AQ-70.

Concurrent-source review: while isolated hosting validation passed870tests/74files, the original checkout received additional motion/spawn edits. Root preserved the complete [incoming patch](concurrent-input.patch) and [hashes](concurrent-input-pins.json), then applied it only to an isolated snapshot. It caused two existing distribution failures ([combined failure](combined-distribution-failure.log)): the forced anthias side plus front-only targets reduced left fish-time to9.63%; restoring only seeded sides still left right share16.76% ([second case](seeded-side-only-failure.log)). No thresholds were weakened. Root retains the reviewed identity-seeded school sides and mostly-front depth mixture, while preserving the new spawn priority and transactional anchor preemption. Both AABB and actual-mesh [blocked-anchor counterexamples](blocked-anchor-before.log) fail on the earlier source and [pass after](blocked-anchor-after.log). All [115 focused checks](combined-focused.log) pass on the combined correction. [Reviewed source pins](reviewed-source-pins.json) supersede the initial hosting-only candidate hashes. Current full-suite validation and native review follow; the original concurrent files remain untouched until hash-checked adoption.

Final technical handoff: corrected combined source passes all872tests/75files with two workers, TypeScript plus16script syntax checks, and productionbuild ([suite](full-suite.log), [types](typecheck.log), [build](build.log)). Root verified that original concurrent files retained their snapshot hashes and every other destination was unchanged before scoped adoption; copied bytes match reviewed-source-pins exactly. Source models and user screenshots are preserved. Native current-source review remains pending; no acceptance criteria or Done from this technical handoff alone.
