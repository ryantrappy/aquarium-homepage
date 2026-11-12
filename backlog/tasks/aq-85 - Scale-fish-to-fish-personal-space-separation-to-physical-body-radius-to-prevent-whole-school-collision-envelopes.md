---
id: AQ-85
title: >-
  Scale fish-to-fish personal space separation to physical body radius to
  prevent whole-school collision envelopes
status: Done
assignee:
  - '@Codex'
created_date: '2026-11-08 21:33'
updated_date: '2026-11-12 06:01'
labels: []
dependencies:
  - AQ-41
references:
  - src/rendering/scene/schooling-navigation.ts
  - src/rendering/scene/motion.ts
  - src/rendering/scene/fish-scale.ts
priority: high
type: bug
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In evaluateSchoolingSteering, personal-space separation uses minSep = self.clearanceRadius + peer.clearanceRadius + 0.12, where clearanceRadius is set to fish.clearance (enforcing MIN_FISH_CLEARANCE = 0.5m). Between any two fish, minSep is at least 1.12m. In a school of 4-6 fish spaced 0.3m-0.8m apart, these oversized 1.12m separation bubbles fuse into a massive 2.5m-3.5m collective exclusion zone. Other fish approaching the school experience accumulated repulsive forces from every school member simultaneously, deflecting around the entire school footprint as if it were a single solid obstacle rather than navigating near or between individual fish.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Fish-to-fish personal-space separation uses species-proportional physical body radius (collisionRadiusM ~0.04m-0.08m) rather than legacy 0.5m habitat obstacle clearance.
- [x] #2 Non-schooling and approaching fish can swim near and pass between schooling fish without encountering an amplified cumulative repulsion wall.
- [x] #3 Schoolmates maintain natural close grouping without separation blowup or interpenetration.
- [x] #4 Vitest unit and simulation tests verify individual fish separation distances and multi-neighbor repulsion caps.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the fish-to-fish radius independent from the legacy habitat-clearance radius, using the species-proportional fishBodyRadiusM adapter in schoolingPeer and preserving clearance for reef/tank segment safety.
2. Audit the existing AQ-85 steering logic and tests for measurable guarantees: close-range thresholds, passage between schoolmates, bounded total multi-peer separation, and no interpenetration in simulation.
3. Add or tighten only AQ-85 invariants in schooling-navigation.ts/tests and fish-scale.ts/tests; coordinate any change in the shared motion.ts with Root's AQ-84 review.
4. Run focused Vitest suites for schooling navigation, fish scale, and motion; record exact results and verified criteria for Root review. Keep AQ-41 open because its viewport benchmark acceptance remains unverified.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigation & Technical Fix Architecture:
1. Investigation of Whole-School Collision Footprint:
   - In src/rendering/scene/motion.ts (schoolingPeer), peer.clearanceRadius is assigned from fish.clearance.
   - fish.clearance is computed by fishClearanceRadius in src/rendering/scene/fish-scale.ts, which sets MIN_FISH_CLEARANCE = 0.5m.
   - In evaluateSchoolingSteering (src/rendering/scene/schooling-navigation.ts), separation is triggered whenever dist < minSep, where minSep = self.clearanceRadius + peer.clearanceRadius + 0.12. With clearanceRadius >= 0.5m, minSep is at minimum 1.12m for every fish in the tank.
   - Chromis and anthias schools cluster within a 1.5m - 2.2m neighborRadius. With 4 to 6 fish in the cluster, their 1.12m separation bubbles fuse into a continuous, impenetrable repulsion envelope spanning over 3 meters wide.
   - When an outside fish (e.g. yellow tang, clownfish, wrasse) approaches, it accumulates separation repulsion from all 6 schoolmates at once (sepX += ...; sepZ += ...). The other fish is bounced off the entire school perimeter before it can get anywhere near an individual fish.
   - Similarly, in findSafeFishSpawn (fish-spawn.ts), validOccupied checks distance >= clearance + other.clearance (>= 1.0m), causing spawning to treat the entire school region as blocked water.

2. Architecture of the Fix:
   - Decouple Fish-to-Fish Separation Radius from Habitat Obstacle Clearance:
     Fish obstacle clearance against rocks/tank walls stays fish.clearance, but fish-to-fish personal space separation must use fish.collisionRadiusM (default 0.04m, or species-proportional body half-width / half-length: length * 0.15).
   - Compute Physical minSep:
     minSep = (self.bodyRadiusM ?? 0.04) + (peer.bodyRadiusM ?? 0.04) + 0.06m buffer.
     This drops minSep from 1.12m down to ~0.14m - 0.22m, matching the real physical geometry of reef fish.
   - Cap Multi-Peer Separation Accumulation:
     Normalize or clamp the total separation vector across multiple neighbors so an approaching fish does not experience an artificially magnified repulsion force when swimming near a tight cluster.
   - Allow Independent Fish Passage:
     Other fish can swim close to school members and even weave between them without triggering early deflections across the whole school envelope.

Prerequisite reality: AQ-41 supplies the implemented schooling/navigation foundation used by this bounded fix, but AQ-41 remains To Do with acceptance still open (notably current rendered benchmarks at both target viewports). Proceeding on the existing implementation does not satisfy or close AQ-41.

AQ-85 bounded verification (2026-11-11): Existing implementation in fish-scale.ts computes species-proportional fishBodyRadiusM (clamped 0.04–0.08); motion.ts schoolingPeer passes that as bodyRadiusM while retaining fish.clearance for habitat safety; evaluateSchoolingSteering uses the body radii plus 0.06m and caps summed separation at magnitude 1. Focused tests added a simulation assertion that an initially 0.1m-separated chromis pair recovers to at least physicalMinSep - 0.01m, with each movement segment still checked against the 0.5m habitat clearance. Verified with `npx vitest run src/rendering/scene/schooling-navigation.test.ts src/rendering/scene/fish-scale.test.ts src/rendering/scene/motion.test.ts`: 3 files, 58 tests passed. This evidence verifies AC #1 and #4. AC #2 remains unchecked because pass-between is covered by static steering vectors, not a full moving-fish passage simulation; AC #3 remains unchecked pending stronger continuous simulation evidence.

AQ-85 verification update (2026-11-11): Added an actual stepSwimmingSchool passage simulation: a non-schooling yellow tang traverses the center of a 0.5m gap between two stopped chromis, and sampled pair distances remain at least the physical minimum separation (minus 1cm test tolerance). Strengthened the multi-frame chromis school test to assert final distance stays within the schooling range and above physicalMinSep - 0.01m. The earlier note saying AC #2/#3 were unchecked predates these added simulation assertions and is superseded. Reran `npx vitest run src/rendering/scene/schooling-navigation.test.ts src/rendering/scene/fish-scale.test.ts src/rendering/scene/motion.test.ts`: 3 files, 59 tests passed. All four AQ-85 acceptance criteria now have focused code and test evidence; task remains In Progress for Root review, and AQ-41 remains open.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-12 06:01
---
Root review 2026-11-12: accepted existing physical-radius implementation and strengthened live-integrator regressions. A tang crosses the plane between stopped chromis while sampled pair distances retain physical minimum; long-running chromis remain grouped without physical overlap. The separate habitat envelope remains tested. Focused motion/schooling/scale suite passes 59 tests. AQ-41 overall performance remains independently open and does not invalidate this bounded spacing fix.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Verified physical fish-to-fish spacing, capped multi-neighbor repulsion, safe close grouping and passage through a schoolmate gap. Existing runtime implementation retained; strengthened simulation regressions. Root-reviewed, 59 focused tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
