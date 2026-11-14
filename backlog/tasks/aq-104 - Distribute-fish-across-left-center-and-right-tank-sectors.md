---
id: AQ-104
title: 'Distribute fish across left, center, and right tank sectors'
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-14 04:01'
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
<!-- SECTION:PLAN:END -->
