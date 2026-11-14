---
id: AQ-76
title: 'Add runtime LOD, lazy loading, and adaptive quality'
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-08 00:30'
updated_date: '2026-11-14 15:39'
labels:
  - performance
  - rendering
dependencies:
  - AQ-41
  - AQ-38
  - AQ-70.3
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/assets/manifest-checker.test.ts
  - AQ-70.3
documentation:
  - docs/rendering.md
  - docs/asset-evidence/aq76/native-20261112/review.json
  - docs/asset-evidence/aq76/recovery-20261114/README.md
  - docs/photorealism-budgets.md
priority: '4'
type: feature
ordinal: 134000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Coordinate with AQ-70.3 (photoreal asset-delivery and frame-time budgets) to implement runtime distance-based geometry/material LOD, progressive/lazy loading for non-active species so initial scene startup stays fast, and adaptive pixel-ratio / shadow-map scaling under GPU load across 1440x900 desktop and 402x874 mobile proxy viewports.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Distance-based LOD reduces geometry / texture cost for far fish without visible popping
- [ ] #2 Off-screen species are lazy-loaded instead of all loading up front
- [ ] #3 Adaptive quality lowers pixel ratio / shadows under load and restores them when headroom returns
- [x] #4 Performance is measured at 1440x900 and 402x874 before and after, with results recorded
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a pure runtime-quality helper that accrues fixed simulation deltas for clip and flex updates across LOD cadence, emitting the full elapsed simulation delta only when due. 2. Make pause/resume and LOD transitions deterministic by resetting or re-basing the cadence accumulator at those boundaries so paused time is never applied and changing tiers does not create a burst or lose elapsed active time. 3. Add focused unit tests for LOD0/LOD1 total animation time, odd/even skipped-step sequences, pause/resume, and LOD changes; leave aquarium.ts integration to Root after the capture agent finishes.

Add a 2,000 ms adaptive-quality window alternative requiring at least 30 valid frame samples, while preserving the 120-sample path, thresholds, slow/fast window counts and cooldown. Start the elapsed window at the first valid sample and reset it on evaluation or excluded samples. Add low-FPS and exclusion-reset regressions.

Root2026-11-14 adaptive restoration correction: current recovery EMA13ms cannot be reached by a healthy60Hz vsynced browser whose observed intervals are16.7ms. Delegate a narrow pure-policy/test iteration to default Luna/high: inspect current measurement semantics, define documented reachable recovery headroom with hysteresis and existing sustained-window/cooldown rules, add a failed-before60Hz restore regression and retain overloaded/noise/exclusion safeguards. Root reviews thresholds and native control evidence separately; do not alter LOD geometry, asset/model maps, aquarium integration or claim whole-task performance acceptance.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-08 PR #18 review findings to address before merging origin/perf/lod-adaptive-aq76:
1. Rebase onto current branch to resolve conflicts in src/rendering/scene/aquarium.ts and docs/rendering.md, and include schoolmates (AQ-41) in evaluateFishLod(), pumpLazyLoads(), and the animation loop.
2. In pumpLazyLoads(), replace fish.find(...) with a loop over all inhabitants ([...fish, ...schoolmates].filter(...)) so every instance sharing a speciesId (including schoolmates) upgrades from fallback sprite to GLB, and continue past off-screen species in lazyQueue instead of breaking out of the while loop.
3. Lower LOD_SPRITE_PROJECTED_PX from 70px (which forces tailspot-blenny to a 2D sprite at all depths and drops 10 other species to 2D sprites in mid-tank) and add hysteresis to the projected-pixel threshold.
4. Pass 2 * SIMULATION_STEP_SECONDS when advancing clipPlayer and updateFishFlex on even steps at LOD1 (so LOD1 does not halve animation speed to 0.5x) and retain applyFishTurningRigOverlay.

2026-11-09 — LOD2 sprite tier removed (Ryan's direction): Ryan reported that a fish getting far away visibly snapped from its lifelike 3D model to a really flat model. That was the LOD2 thumbnail-sprite tier (beyond ~11 m, plus the <70 px projected-length override). It was deliberate (performance) but unrealistic, so it was removed in a single PR: `selectFishLod` now has one band only (LOD0 < ~8.5 m, LOD1 beyond, ±0.75 m hysteresis, ≥140 px stays LOD0) and fish keep their full GLB at every depth; LOD1 (half clip rate) is kept as the only distance LOD since it has no visible effect. `applyFishLod`, the `lodSprite` path in `aquarium.ts`, and the `LOD_FAR_DEPTH_M` / `LOD_SPRITE_PROJECTED_PX` constants are gone; the thumbnail sprite survives only as the no-GLB fallback before a lazy load lands. Perf tradeoff: distant fish now render full 3D, but the scene is ~133k triangles so the cost is small, and the AQ-70.3 budget tests still pass. Note for Root review: AC #1's "reduces geometry / texture cost for far fish" wording is now only partly true — distance LOD reduces animation rate, not geometry — the AC itself is left unchecked, not reworded, pending Root's call.

2026-11-10 — Rendering FPS profiling and major optimization:
Live profiling diagnosed severe frame rate collapse down to 21 FPS (47.3 ms average frame time, p95 249.4 ms, and periodic 80 ms label refresh stutters).
Implemented 5 major rendering optimizations in src/rendering/scene/aquarium.ts:
1. VSM shadow map tuning: 1024x1024 with 8 blur samples and radius 4 (maintains exact ~2.5 cm world penumbra while cutting blur texture lookups by 88% and fragment fill by 75%).
2. Avoided full scene graph traversal: replaced scene.updateMatrixWorld(true) on every frame with targeted item.root.updateMatrix() / updateMatrixWorld() on moving fish.
3. Bounded visibility raycasts: removed getBoundingClientRect() forced reflows, converted to direct NDC coordinates, and bounded reef occlusion checks with ray.far = distToFish - 0.05 so Three.js bounding-sphere culls all background rock/coral/sand instantly.
4. Gated CPU loops: water surface displacement (1029 vertices) and mote/bubble loops skipped when tank is paused or prefers-reduced-motion.
5. DOM style write guards: prevented style/attribute thrashing on fish label anchors when properties do not change.

Measurements:
- Frame time average improved from 47.3 ms to 18.3–20.0 ms (effective FPS increased from 21.1 to 50–55 FPS).
- Median (p50) frame time improved to 16.7 ms (solid 60 FPS).
- p95 frame time dropped from 249.4 ms to 33.3–34.0 ms.
- refreshLabels overhead dropped from 79.2 ms to 13.4 ms.

2026-11-12 runtime animation dt helper: added per-fish delta state and consumeLodAnimationDelta() in src/rendering/scene/runtime-quality.ts. It returns accumulated active fixed-step seconds at each LOD cadence, preserves active time across deterministic LOD changes and pause boundaries, and ignores invalid deltas. Added five focused cases for alternating LOD1 timing, LOD0 timing, pause/resume, tier changes and invalid deltas. Verification: npm test -- src/rendering/scene/runtime-quality.test.ts — 22 tests passed. aquarium.ts integration remains for Root after the capture agent handoff.

Root2026-11-12 functional correction: replaced the global LOD skip counter with per-fish accrued active animation time, so LOD1 samples at half cadence without halving clip/flex speed; turning overlays apply to every sampled pose. Lazy integration now upgrades every matching service fish and schoolmate. Queue selection checks actual viewport intersection and skips past off-screen entries without discarding them or starving later visible species. New actual-controller regression reproduced4 players for9 inhabitants before the all-instance fix; now all9 receive models. Actual-controller tests also prove distant animation consumes0.1s across6steps and an off-screen queued species does not block a later visible species.49 lifecycle/runtime-quality tests pass; typecheck and14 script checks pass. Formal before/after native performance review and the geometry-vs-animation-only LOD criterion remain open.

Root native production comparison recorded underdocs/asset-evidence/aq76/native-20261112/review.json. Same8-service local config, exactDPR1 two-viewports,120warmup/180measured rAF samples. Before cf5703e: laptopp50/p95=49.8/67.0ms,phone33.3/51.7ms; after01f1403: laptop66.1/150.9ms,phone33.3/65.5ms. These fail16.7/22ms budgets, and the short warmup may not settle original adaptive windows at lowFPS. Do not claim performance acceptance or isolate causation from one animated run. All schoolmates remain3D; next work reduces redundant rock shader math and shortens low-FPS adaptive response. Raw samples, PNGs and limited CPU diagnostic are retained.

2026-11-12 adaptive-quality correction: retained the 120-sample window and added a 2,000 ms elapsed-time alternative requiring at least 30 valid samples. Window timing begins at the first valid record and resets after evaluation or excluded samples; p95/EMA thresholds, 2/3 sustained-window counts and 5,000 ms cooldown are unchanged. Added 15 FPS two-window step-down and excluded-window restart regressions. Verification: npm test -- src/rendering/scene/runtime-quality.test.ts — 24 tests passed; git diff --check passed.

Root review2026-11-12 accepted elapsed-time adaptive windows: evaluate after120 valid samples or at least30 samples spanning2s, retaining p95/EMA thresholds,2/3 slow/fast windows and5s cooldown. At15FPS the tested first fallback now occurs around4.1s instead of waiting for240 frames (~16s). Exclusion resets elapsed window and slow/fast counters.24 focused policy tests pass. Native settled budget acceptance still requires repeat measurement after this source change.

2026-11-14 recovery-policy implementation (verified subset only; no AC/DoD/status changes): raised recovery EMA threshold to 17.5 ms, retaining 1.5 ms hysteresis under the unchanged 19 ms step-down EMA; recovery now also requires p95 <= the existing 22 ms slow-frame bound. Comments document the bounded nature of 60 Hz RAF recovery: a vsync-capped stream cannot establish additional GPU headroom, and overload still causes the unchanged step-down. Added regressions for fail-before/fixed steady 60 Hz restoration from Low through Balanced to High, an 18 ms deadband, p95-spiky intervals with recovered EMA, exclusion-reset recovery streaks, and overload after recovery/cooldown. Existing 120-sample/elapsed-window, slow-threshold, sustained-count, and general cooldown tests remain unchanged. Evidence: baseline focused run 24/24 passed; pre-fix regression run 26 passed/2 failed at the expected 60 Hz restoration and exclusion-separated restoration assertions; post-fix `npm test -- src/rendering/scene/runtime-quality.test.ts` passed 28/28; `git diff --check` passed. Logs and source hashes: `/tmp/aq76-recovery-review/`. This validates only the pure policy/helper tests; no native performance claim, aquarium integration review, AQ-76 acceptance check, or task completion.

2026-11-14 Root-reviewed budget metadata iteration (verified subset; no AC/DoD/status changes): synchronized FRAME_TIME_BUDGET.stepUpEmaMs to the 17.5 ms recovery-probe threshold while preserving the independent 16.7 ms frame target and unchanged 19 ms step-down EMA / 22 ms p95 overload gates. Replaced target>recovery assertion with explicit reachable steady-60-Hz RAF bound, recovery<slow hysteresis, and exact target/p95/step-down assertions; runtime constants remain cross-checked against metadata. Existing asset, scene, and performance budget checks are untouched. Focused reproduction before fix: runtime-quality + budgets tests had 41 pass / 1 expected stale-metadata failure. After final assertions: `npm test -- src/rendering/scene/runtime-quality.test.ts src/rendering/assets/budgets.test.ts` passed 42/42; `git diff --check` passed. Fail/pass logs and updated SHA256/Git blob pins (all four policy/runtime-quality files) are in `/tmp/aq76-recovery-review/`. No performance-budget pass is inferred from recovery at 17.5 ms; no AC/Done/task status change.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-14 15:34
---
Root combined full suite901pass/1failure catches a second old13ms declaration in assets/budgets.ts and its target>recoveryEMA invariant. Healthy60Hz RAF cannot meet that invariant at a16.7ms budget. Next iteration must reconcile recovery-observation policy with budget metadata/docs while retaining actual frame targets16.7ms andp95limit22ms, slow19/22 thresholds, cooldown/window counts and existing runtime performance gates. This is an explicit policy correction, not a claim that17.5ms meets the16.7ms frame target; retain the full failure log. Root expands agent scope to budgets.ts/.test.ts only; Root handles documentation. NoAC/Done.
---
<!-- COMMENTS:END -->
