---
id: AQ-67
title: >-
  Cache clearance obstacles in navigation and prevent search lock on narrow
  viewports
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-05 18:32'
updated_date: '2026-11-05 21:05'
labels: []
dependencies: []
references:
  - src/simulation/habitat-navigation.ts
  - src/rendering/scene/motion.ts
  - src/rendering/scene/habitat.ts
documentation:
  - docs/code-review-findings.md
priority: high
type: bug
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In habitat-navigation.ts, isWaterSegmentSafe allocates new arrays and inflated bounding box objects on every call, executing up to 600 times per second across active fish substeps and generating high GC pressure. On narrow viewports (402px mobile proxy), adult fish clearances leave virtually zero clearance between central rock obstacles and tank walls, causing all 12 destination attempts in plan() to fail. Because targetWait is not set on total failure, the planner runs 12 failed Dijkstra searches every frame (720 searches/sec), freezing the fish and pegging CPU.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clearance-inflated obstacle bounds are cached per fish clearance radius rather than re-allocated on every collision substep
- [x] #2 When all destination attempts fail in plan(), fish apply a backoff wait before re-attempting pathfinding instead of searching every frame
- [x] #3 Adult fish on the 402px viewport proxy maintain navigable swimming room without permanently freezing or wedging between obstacles
- [x] #4 Hardcoded vertical clearance offset (.53m) in habitat.ts derives dynamically from the species clearance radius
- [x] #5 Navigation and motion test suites verify allocation reduction and narrow-viewport recovery
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify the flagged narrow-viewport, failed-plan, grazing-clearance, and per-substep allocation behavior against current scoped files and established tests. 2. Cache clearance-inflated obstacle geometry with correct invalidation when obstacle geometry or radius changes, retaining navigation semantics. 3. Add deterministic regression coverage for cache reuse/invalidation, bounded retry backoff and recovery on the 402×874 proxy dimensions, and species-derived grazing-anchor clearance. 4. Run the focused navigation and motion suites plus typecheck and record only proven acceptance checks; hand off the scoped diff to Root for final review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Startup review 2026-11-05: Read AGENTS.md, agent_scratch.md, AGENT_TASKS.md, docs/README.md, docs/framework/DOCUMENTATION_FRAMEWORK.md, docs/requirements.md, navigation contract, Backlog overview, and execution/finalization guides. Root owns scratch/handoff; no shared scratch edit. Initial git status showed concurrent aquarium.ts, fish-scale.ts, and splat-fish asset files; preserve those changes.

Verification 2026-11-05: Added and tested clearance expansion cache reuse per obstacle-array identity/radius, invalidation on in-place geometry updates, and invalid-radius rejection. Repeated isWaterSegmentSafe calls reuse expanded boxes; rebuild allocations occur only when geometry/radius changes. Existing legacy plan() sets targetWait=.7 after all 12 free-water candidates fail; regression confirms no random/search attempts during the wait and a later retry. Existing habitat.ts computes grazing offset as max compatible species clearance + .03; regression confirms yellow-tang .57 + .03 and a valid mobile grazing route.

Exact mobile scene trace, read-only values from current aquarium.ts: CSS 402×874 gives halfWidth=(9-2.8)*tan(21°)*(402/874)*.96; bounds y[-2.25,2.8], z[-4.6,2.8]; one left modular island scale 3.4 at (-.15,-2.70,-1.35), yaw .06. Test reuses those inputs and EXAMPLE_SERVICES spawn formulas. All five configured species get safe spawns and complete 1200 frames with each motion segment collision-safe and >.5 total travel. `npm test -- --run --maxWorkers=1 src/simulation/habitat-navigation.test.ts src/rendering/scene/motion.test.ts src/rendering/scene/habitat.test.ts`: 3 files, 28 tests passed. `npm run typecheck`: passed. `git diff --check`: passed. Root review remains required; no staging/commit performed. No production build claimed.

Root review iteration 2026-11-05: Corrected the cache invalidation regression to use a valid changed AABB (min.x 2.2, max.x 3) and added same-length array replacement coverage. The cache now freezes the returned array and nested expanded bounds because those shared bounds feed all fish collision checks. Added a malformed source-box assertion through isWaterSegmentSafe to confirm caller-side geometry validation still fails closed. Re-ran bounded focused suites: 3 files/28 tests passed; typecheck and diff-check passed.

2026-11-05 Root final review accepted the cache and safety iteration. Independent navigation/motion/habitat run:28 tests/3files pass. Cache returns identical inflated objects for stable array/radius, invalidates primitive changes and same-length object replacement, and freezes reused geometry; public route checks retain malformed-box rejection. Existing .7s failed-target backoff and species-derived anchor height were verified rather than redundantly rewritten. Exact current402x874 modular placement plus all5 starter species completed1200frames each with every segment safe and distance>0.5; native phone browser showed working movement/pause/resume. This verifies the current conservative habitat, not final true3D mesh/art/envelope acceptance.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Cached clearance-inflated obstacles without per-substep rebuilds, with mutation/replacement invalidation and immutable shared bounds. Added regression evidence for existing bounded retries, dynamic anchor offset and all5 adult starter fish moving safely through the exact402x874 habitat. Root independently verified28 tests and scoped source/typecheck evidence; final3D scene acceptance remains separate.
<!-- SECTION:FINAL_SUMMARY:END -->
