---
id: AQ-84
title: >-
  Fix outer schooling fish lateral drag by integrating steering into heading and
  turning kinematics
status: Done
assignee:
  - '@root'
created_date: '2026-11-08 20:43'
updated_date: '2026-11-12 06:07'
labels: []
dependencies:
  - AQ-41
references:
  - src/rendering/scene/motion.ts
  - src/rendering/scene/schooling-navigation.ts
priority: high
type: bug
ordinal: 91000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When fish swim in a school, fish on the outer edges receive strong cohesion and alignment forces from evaluateSchoolingSteering. In stepSwimmingSchool, these steering offsets are applied directly to fish.position as raw positional translations (fish.position = candidate), bypassing yaw and curvilinear kinematics. This causes outer fish to get visibly pulled sideways and dragged along with the school rather than smoothly banking, turning, and swimming forward into the school under their own locomotion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Outer schooling fish orient their heading and yaw towards the blended schooling trajectory rather than sliding laterally via raw position offsets.
- [x] #2 Schooling turns respect species-specific turning limits, banking angles, and turning rig kinematics so outer fish turn naturally with the school.
- [x] #3 Personal-space separation and collision safety with habitat obstacles and tank boundaries remain strictly enforced.
- [x] #4 Vitest unit and simulation tests verify that schooling steering updates fish heading and turning state without decoupled sideways drift.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit the existing heading-steering implementation against current AQ-84 criteria and actual controller tests. 2. Fix any demonstrated drift, turn-limit, or safety regression without changing models. 3. Run focused schooling/motion tests and review browser motion; record exact evidence and remaining art limitations.

Review the no-route case: a stationary pivot updates yaw turn kinematics but does not apply a traveling bank; keep that behavior if routed swimming tests prove bank and rig cues are correct while moving.

Add only motion.test.ts regressions for routed outer-fish school steering: bound combined yaw per 1/60s substep by the existing sharp/proximity turn boosts, verify yaw-rate and bank signs, check each route movement against habitat clearance, and confirm stopped/pause fish preserve their complete pose.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root Cause & Technical Fix Architecture:
1. Root Cause in src/rendering/scene/motion.ts (stepSwimmingSchool):
   Currently, stepSwimmingSchool calls integrateSwimmingFish(fish, habitat, dt) first (which moves fish along its own heading yaw). Then it computes evaluateSchoolingSteering(self, peers, ...) and directly sets fish.position = candidate (where candidate = fish.position + [dx, dy, dz]). This applies a pure Cartesian translation (up to 0.45 m/s) on the fish body without altering fish.yaw or feeding turn kinematics. Outer fish experiencing strong cohesion/alignment vectors are dragged sideways through the water column like sliding cutouts.

2. Architecture of the Fix:
   A. Convert Schooling Forces into Heading & Desired Velocity Influences:
      Instead of translating fish.position post-integration, schooling forces must influence the fish heading (yaw) and forward thrust during integration, or steer the lookahead navigation target:
      - Option 1 (Steering Target Blending): Blend the schooling steering vector (dx, dz) into the fish steerTarget in integrateSwimmingFish (or compute a blended target steerTarget = rawTarget + schoolingSteeringVector * lookaheadWeight). This causes the natural yaw turn code (heading = Math.atan2(dx, dz); delta = angleDiff(heading, fish.yaw); turn = clamp(delta, -maxTurn, maxTurn); fish.yaw += turn) to naturally rotate the fish towards the school cluster.
      - Option 2 (Dynamic Heading Nudge): If steering is evaluated per-substep, calculate the desired schooling heading desiredYaw = Math.atan2(steering.dx, steering.dz). When cohesion/alignment are active, smoothly rotate fish.yaw towards desiredYaw within fish.behavior.variation.turnDegreesPerSecond * dt, and drive fish.turnKinematics so the spine bending rig and body flex bank and curve into the turn. Forward motion along the updated yaw then closes the distance naturally instead of sideways teleportation.
      - For separation (repulsion when too close): Emergency separation can still provide small positional nudges if within minSep, but regular cohesion and alignment must be purely angular and forward thrust.

   B. Kinematics & Turning Rig Integration:
      - Ensure delta yaw updates stepFishTurnKinematics so applyFishTurningRigOverlay and Lighthill vertex flex reflect the active turn.
      - Adjust fish.speed towards schoolmates cruise speed so lagging outer fish accelerate forward along their heading to catch up rather than getting dragged.

   C. Verification:
      - Add unit tests in motion.test.ts asserting that a fish on the outer perimeter of a conspecific school turns its yaw towards the school center and advances curvilinearly rather than drifting laterally at constant yaw.
      - Verify habitat bounds and mesh collision safety checks pass.

AQ-84 bounded review plan (2026-11-12): Existing no-route pivot branch updates turnKinematics but not fish.bank. This may be correct for a fish turning in place with no forward travel; audit with routed-swimming evidence before any production change. Root owns production source review; this pass adds tests only in motion.test.ts. AquariumController pauses its scene loop, and stepSwimmingSchool supports per-fish stopped flags, so the pause regression will verify stopped fish keep the full motion pose frozen.

AQ-84 routed-turn review (2026-11-12): Added motion tests for mirrored routed outer-fish turns, asserting combined yaw rate stays within the existing 1.65 sharp-turn × 2.2 proximity boost, yaw-rate signs match turn direction, bank signs oppose the turn direction, and the movement segment remains safe at the habitat clearance. Added a stopped-school-step snapshot regression for position, yaw, pitch, bank, speed, turn kinematics, and behavior. Root added exponential bank leveling in the no-route branch after review of stale bank inherited from a traveling turn; the no-route regression now passes. Verified with `npx vitest run src/rendering/scene/motion.test.ts src/rendering/scene/schooling-navigation.test.ts`: 2 files, 55 tests passed. This pass adds tests only; acceptance checks and Done remain for Root.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-12 06:07
---
Root review 2026-11-12: accepted existing cohesion/alignment-to-heading integration, shared turn-rate budget and movement-safety checks. Additional routed tests verify both yaw directions, bank signs, turn-rate bounds and full stopped-pose preservation. Found and fixed stale roll after a route ends: bank now decays exponentially while a stationary fish pivots. Four focused suites pass 69 tests. This closes the bounded lateral-drift fix; overall schooling performance and final species art remain separate open tasks.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Schooling cohesion and alignment use heading and turning kinematics rather than Cartesian dragging. Root fixed stale stationary bank and reviewed mirrored routed-turn/safety/pause regressions. Motion, schooling, fish-turning and scale verification:69 tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
