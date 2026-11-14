# AQ-89 caption source review

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-89, AQ-76
Owner: @root
Updated: 2026-11-14
Upstream: AGENTS.md, docs/rendering.md
Downstream: src/rendering/scene/aquarium.ts, src/rendering/scene/fish-label-layout.ts, src/rendering/scene/fish-link-projection.ts, src/rendering/scene/fish-flex-material.ts
-->

> [!NOTE]
> **Agent Context & Authority** — Root reviewed source handoff. AQ-89 remains In Progress with all acceptance/DoD boxes unchecked pending exact two-size native visual/access/control review. No fish/coral/reef model, Blender source, asset map or original configuration changes.

## Behavior and verification

The previous helper deliberately kept captions visible after an impossible overlap, and it could leave a lone bottom-edge caption outside the frame. Its link-box quarter-height lift also did not measure the actual fish. The [same27new cases](helper/after-results.json) pass now; the [old helper fails24](helper/before-results.json). [Handoff/source pins](helper/handoff.json) retain the implementing agent's verified subset and exact counterfactual input.

Root's integration keeps native targets at least44px and gives captions a separate rectangle measured from the current mesh pose. Projection includes current morphs, bone/turn pose and a CPU counterpart of the live shader flex. It reserves one CSS pixel for the antialiased edge. DOM `offsetWidth/offsetHeight` include actual text, status dot, example badge, padding and font. The initial caption is one pixel below that body rectangle; a bounded32candidate near-first solver can move it horizontally beneath its own body, or immediately beside it at frame edges. It checks every foreign service/ambient body and earlier visible caption. No clear attached result means caption-only suppression, leaving the native link and Services access intact.

The duplicate rendered tooltip is suppressed so it cannot bypass the layout. The measured caption still brightens on hover/focus; native titles/accessible names remain. Faded caption ink has no pointer events. Existing occlusion/focus exposure remains the separate native-link policy.

Tests cover both target viewports, mixed-size clusters, ambient bodies, multi-obstacle escapes, bottom/side edges, stable near-first ties, measured caption origins and finite-offset cancellation. Projection tests independently compare20current poses against Three.js skinning with morphs, blended bones and nonidentity bind/ancestor transforms; normalized/interleaved attributes, groups, draw ranges, layers and clipping also have counterexamples. Actual-controller tests prove DOM measurement integration and inclusion of noninteractive schoolmates. Formula review and analytic shader-term tests support the CPU flex counterpart; this is not a mechanical GPU equivalence or animated navigation-envelope certificate.

The final combined snapshot passes [902tests/75files](combined-full-final.log), [typecheck plus16scripts](typecheck-final.log) and [productionbuild](build-final.log). [Validation](validation.json) and [13source pins](combined-source-pins.json) include the separate AQ-76 recovery correction. That first full run's stale budget-policy failure is preserved in the AQ-76 evidence; no asset/frame caps were relaxed. The focused interaction/access/quality selection passes170tests/8files. These source checks alone do not complete AQ-89.

## Projection cost investigation

Root rejected the first full-vertex pass because its CPU cost was too high. All iterations retain53,878vertices over the same11fish/8species input, with actual current runtime GLBs, clip advancement, nonzero turning overlay and live flex. Each viewport has20warmup frames and120measured passes, plus per-fish samples. [Baseline](cpu/results-baseline.json), [cached skin](cpu/results-cached-skin.json), [prepared flex](cpu/results-prepared.json) and [fast buffer](cpu/results-fast-buffer.json) retain all raw results, source/asset pins and script/log copies.

| Projection-only CPU milliseconds |1440×900 p50/p95|402×874 p50/p95|
|---|---:|---:|
|Initial full pass|26.545 /35.101|27.574 /43.564|
|Reuse bone transforms per mesh/frame|17.714 /22.837|18.075 /29.356|
|Prepare shader constants and camera matrices|9.624 /16.577|11.288 /14.721|
|Direct eligible buffer reads and only needed projection components|7.245 /9.695|9.317 /10.946|

These are desktop Node/Vitest CPU measurements using historical AQ-87 position fixtures, not current ecological acceptance, native browser/GPU timings, physical-phone measurements or whole-frame budget passes. They exclude loader/material decode, pose preparation, DOM/layout/writes and rendering. Later caller changes to include every body are outside the timed kernel. Current combined source pins identify the complete reviewed candidate separately.

The optimized path precomputes affine skin transforms once per mesh/frame, prepares live shader constants once per bound mesh, combines world/view/projection matrices, and directly reads only unnormalized noninterleaved buffers without morphs. Other attribute layouts retain Three.js accessors. It skips only exact zero shader-mask terms; it does not sample vertices or lower update cadence. Full scene performance remains open under AQ-76/AQ-70.3.

## Reproduction and limits

Normal suites run with `npm test -- --maxWorkers=1`. The archived counterfactual Vitest config records its original `/tmp` root; to rerun it, copy the helper folder to that root, provide the repository's existing node_modules and run the recorded config. CPU probe copies similarly record their original absolute source/proof paths and `AQ89_PROJECTION_OUTPUT` override; restore those paths or update only the harness paths before rerunning. Raw JSON and source files retain their bytes; archived log copies normalize trailing whitespace only. No current native acceptance is inferred from these diagnostic scripts.
