---
id: AQ-67
title: >-
  Cache clearance obstacles in navigation and prevent search lock on narrow
  viewports
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-05 18:32'
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
- [ ] #1 Clearance-inflated obstacle bounds are cached per fish clearance radius rather than re-allocated on every collision substep
- [ ] #2 When all destination attempts fail in plan(), fish apply a backoff wait before re-attempting pathfinding instead of searching every frame
- [ ] #3 Adult fish on the 402px viewport proxy maintain navigable swimming room without permanently freezing or wedging between obstacles
- [ ] #4 Hardcoded vertical clearance offset (.53m) in habitat.ts derives dynamically from the species clearance radius
- [ ] #5 Navigation and motion test suites verify allocation reduction and narrow-viewport recovery
<!-- AC:END -->
