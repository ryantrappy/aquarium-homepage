---
id: AQ-64
title: >-
  Reconcile aquarium inhabitants on service updates without resetting swimming
  state
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-05 18:32'
labels: []
dependencies: []
references:
  - src/rendering/scene/aquarium.ts
documentation:
  - docs/code-review-findings.md
priority: medium
type: bug
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Updating a service name or web address in settings triggers a full inhabitant rebuild via rebuildFish() in aquarium.ts. This disposes of all 3D fish and respawns them at their initial starting positions, resetting all velocities, waypoints, and swim animation cycles. The scene should reconcile changes incrementally so editing one service does not interrupt other swimming fish.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Editing an existing service name or URL updates its anchor label and target without despawning or resetting any fish
- [ ] #2 Adding a new service instantiates the new fish while leaving existing swimming fish at their current positions and velocities
- [ ] #3 Removing a service disposes only of that specific fish and its resources without resetting surviving fish
- [ ] #4 Re-ordering or updating services does not cause visual pop or animation clock resets for unchanged inhabitants
<!-- AC:END -->
