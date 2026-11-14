---
id: AQ-104
title: 'Distribute fish across left, center, and right tank sectors'
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-14 04:01'
updated_date: '2026-11-14 05:48'
labels:
  - behavior
  - rendering
  - navigation
dependencies: []
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/fish-spawn.ts
  - src/rendering/scene/motion.ts
  - src/simulation/habitat-navigation.ts
  - src/lib/fish-behavior.ts
priority: '2'
type: bug
ordinal: 141000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
At 1440×900, the configured 11-fish tank was simulated for 60 seconds: despite spawning across the tank, 9 fish converged into |x| ≤ 1.26m, mean |x| fell from 1.37m to 0.94m, and only one fish remained beyond ±1.5m on each side. Improve lateral range and side dwell without weakening collision-safe routing or changing species behavior contracts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The 60-second multi-fish regression demonstrates sustained left, center, and right occupancy and broad lateral utilization rather than convergence into the center corridor.
- [ ] #2 Spawn placement and route targets use available lateral tank width while keeping fish within the perspective frustum at their current depth and inside glass clearances.
- [ ] #3 Unavailable anchor requests do not interrupt active cross-tank routes; idle fish without valid anchors can loiter locally, and failed mesh-anchor requests still receive a safe free-water fallback.
- [ ] #4 Lateral route choices and habitat-anchor choices are repeatable per fish/request and balanced across left and right sectors; mesh-search retries respect the per-search lattice cap and cumulative work budgets.
- [ ] #5 Focused regression tests, the full npm test suite, typecheck/build, and local browser verification at 1440×900 and 402×874 pass without weakening existing obstacle or fish-spacing checks.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Widen overview habitat and spawn bounds; constrain X by the camera frustum at each depth.
2. Preserve active routes when a new state requests an unavailable anchor, add local idle loiter, and fall through to free-water planning on mesh-anchor failure.
3. Sample left/center/right sectors with outer-side weighting and side persistence.
4. Treat lattice-node capacity as a per-search cap; deterministically balance anchor selection by fish and request generation.
5. Add route, spawn, mesh-budget, anchor-balance, and 60-second distribution regressions; run focused tests, npm test, typecheck/build, and verify at 1440×900 and 402×874.

2026-11-13 Root review: preserve f0844cf implementation while strengthening AC1 evidence. Run a 60-second time-series with the configured eight-species/eleven-inhabitant mix and default species states, including anthias schooling, in both AABB and bounded real mesh-query reef fixtures. Record per-second occupancy after a 10-second settling interval, movement, depth-frustum safety and deterministic replay. Define sustained occupancy before inspecting results: all three sectors occupied in at least80percent of post-settle samples; left/right each at least20percent aggregate fish-time, center at least10percent; no more than3consecutive samples missing an outer sector. Keep exact native staged captures separate from moving-fixture evidence and retain existing collision/spacing budgets/tests. Any failure remains Root feedback on this task, not a relaxed threshold.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root exact-f084 mixed-regression evidence2026-11-13: current8-species/11-inhabitant roster, including3extraanthias, retains default species behavior and stepSwimmingSchool. After10s settling, sampled every1s through60s: all3sectors occupied100percent AABB /98.04percent bounded mesh; outer fish-time shares28.16/35.47percent AABB and26.20/29.59percent mesh; max missing-outer run0/1samples. All11move, with3.97m-plus accumulated path in this controlled fixture, and zero unsafe segments. Repeat runs match exactly in the new assertion-bearing aq104-distribution.test.ts. These are controlled two-box geometry fixtures, not actual assembled-reef/animated-envelope certification. Native frozen staging at exactf084 separately shows ready11inhabitants/no failedassets and all8phone links/modal access. Phone Ombi proxy rectangle extends0.618CSSpx past edge; no claim of fully-contained proxy rectangles. Full72-file default run:859pass/2old5000ms packaging timeouts underparallel load; no test deadlines/assertions weakened. Typecheck16scripts passes. Re-running full suite with2workers to distinguish contention; current concurrent original-source changes remain preserved/unaccepted.

Unit correction to the preceding Root note: the minimum accumulated path was3.968legacy scene/world units (not a calibrated meter measurement). Physical size/unit calibration is separately open; do not treat this distribution fixture as metric-body clearance proof.

Root exact-f084 full validation: npm test -- --maxWorkers=2 passes all861tests across72files; typecheck passes, including16tracked script syntax checks. The earlier default-concurrency run had only two pre-existing5000ms packaging timeouts; no deadlines/assertions were changed. The new mixed-roster test repeats each AABB/mesh simulation and asserts identical results, sustained sector shares, actual movement, finite coordinates and unchanged collision safety. Source-pinned frozen staging is separate from this controlled temporal fixture. Production build is running; current original-checkout concurrent motion/spawn/test edits still need their own source review before full task acceptance.

Root verified handoff complete for exactf084source plus new mixed-roster fixture: all861tests/72files pass with2workers; typecheck16scripts and productionbuild pass. Durable reports, full validation logs and true exact-size staged PNGs are in docs/asset-evidence/aq104/. New assertions reject stationary-staging false positives and verify deterministic repeated60s runs. This preserves currentconcurrent motion/spawn/test source changes without accepting them; AQ104 stays In Progress and ACs are not checked from old-source evidence alone.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: root
created: 2026-11-14 05:36
---
Root native staged review of exactf0844cf at both requiredDPR1sizes is captured under /tmp/aq104-root-native/: both ready,11inhabitants,no failedassets; phone all8namedlinks available and completeServicesmodal. This is frozen staging evidence, NOT sustainedmovement proof. Root is strengthening mixed-species temporal evidence in an isolated f084 worktree. Original checkout now has concurrent edits to motion.ts/fish-spawn.ts not made by this review; they are preserved and not included in exactf084claims. Initial exploratory mixed fixture omitted the explicit mesh probe radius, making mesh fish stationary; that fixture error is corrected before conclusions, with accumulated movement now recorded. No ACs/Done yet.
---
<!-- COMMENTS:END -->
