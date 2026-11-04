---
id: AQ-49
title: Implement biomechanical fish turning and curvilinear spine bending
status: To Do
assignee:
  - '@render-integration'
created_date: '2026-11-04T19:20:00Z'
updated_date: '2026-11-04T19:20:00Z'
labels: []
dependencies:
  - AQ-35
  - AQ-44
  - AQ-48
references:
  - docs/fish-turning-and-maneuvering-plan.md
  - src/rendering/scene/motion.ts
  - src/rendering/scene/aquarium.ts
documentation:
  - docs/fish-turning-and-maneuvering-plan.md
  - docs/fish-behavior-design.md
parent_task_id: AQ-12
priority: high
type: enhancement
ordinal: 19500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fish turning and direction changes currently look artificial because `integrateSwimmingFish()` in `src/rendering/scene/motion.ts` translates the fish along the waypoint vector `(dx, dy, dz)` while `yaw` rotates separately (causing sideways/backward "crab-sliding" on sharp turns), switches waypoints without lookahead corner filleting, uses linear clamped yaw steps instead of two-stage braking/pivot dynamics, and rotates the 3D mesh as a rigid block in `src/rendering/scene/aquarium.ts` without bending the spine or asymmetrically braking with the pectoral fins.

Implement the biomechanical turning and curvilinear spine-bending plan documented in `docs/fish-turning-and-maneuvering-plan.md`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Forward translation in `src/rendering/scene/motion.ts` is locked to the fish's actual heading axis (`yaw`/`pitch`) rather than sliding sideways along `(dx, dy, dz)` during direction changes, while preserving obstacle-safe routing (`isWaterSegmentSafe`), tank-bound margins, and exact habitat-anchor arrival.
- [ ] #2 Waypoint transitions use lookahead corner filleting for smooth arcs, and large direction changes (`|delta| >= 65°` or startle turns) execute a two-stage maneuver (`brake-pivot` deceleration + rapid yaw rotation followed by an `exit-stroke` propulsive tail pulse and acceleration).
- [ ] #3 `src/rendering/scene/aquarium.ts` applies a post-mixer procedural turn overlay on rigged 3D fish bones: archetype-appropriate curvilinear spine bending (`spine_mid`/`tail_base`/`tail_tip` ramp for `subcarangiform_schooler`; peduncle/tail-only bend for `labriform_rigid_disc` so tang sails never shear) with a delayed traveling tail wave, plus asymmetric inside-pectoral braking flare and outside-pectoral rowing boost.
- [ ] #4 Fallback 2D sprite planes replace the single-frame `scale.x` binary flip with a smoothed foreshortening turn transition, and all turn states freeze deterministically when `paused`, hidden, or under `prefers-reduced-motion`.
- [ ] #5 Unit tests verify zero backward/sideways crab-sliding on 180° reversals, two-stage turn curvature progression, obstacle clearance, and 1440x900 / 402x874 browser responsiveness.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root reviews both numerical trajectory/bone metrics and visual turning behavior in the main scene before marking Done.
- [ ] #2 All existing and new motion, navigation, and accessibility tests pass (`npm test` and `npm run typecheck`).
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend `SwimmingFish` in `src/rendering/scene/motion.ts` with `yawRate`, `turnCurvature`, `turnCurvatureDelayed`, and `turnPhase` (`none` | `brake-pivot` | `exit-stroke`).
2. Refactor `integrateSwimmingFish()` so translation advances along the heading vector `(sin(yaw)*cos(pitch), -sin(pitch), cos(yaw)*cos(pitch))`, add lookahead waypoint blending within `0.45` units of intermediate waypoints, and implement the two-stage brake-pivot / exit-stroke controller for `|delta| >= 65°`.
3. In `src/rendering/scene/aquarium.ts`, cache rig bones on load and apply the post-mixer procedural spine bend (`turnCurvature` + `turnCurvatureDelayed`) and asymmetric left/right pectoral fin braking/rowing offsets per rig archetype (`subcarangiform_schooler` vs. `labriform_rigid_disc`), plus smooth cosine foreshortening for 2D fallback sprites.
4. Add unit tests covering 180° reversal heading-velocity alignment, `turnCurvature` sign/decay, and collision safety.
<!-- SECTION:PLAN:END -->
