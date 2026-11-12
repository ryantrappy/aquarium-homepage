---
id: AQ-85
title: >-
  Scale fish-to-fish personal space separation to physical body radius to
  prevent whole-school collision envelopes
status: In Progress
assignee:
  - '@Codex'
created_date: '2026-11-08 21:33'
updated_date: '2026-11-12 05:55'
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
- [ ] #1 Fish-to-fish personal-space separation uses species-proportional physical body radius (collisionRadiusM ~0.04m-0.08m) rather than legacy 0.5m habitat obstacle clearance.
- [ ] #2 Non-schooling and approaching fish can swim near and pass between schooling fish without encountering an amplified cumulative repulsion wall.
- [ ] #3 Schoolmates maintain natural close grouping without separation blowup or interpenetration.
- [ ] #4 Vitest unit and simulation tests verify individual fish separation distances and multi-neighbor repulsion caps.
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
<!-- SECTION:NOTES:END -->
