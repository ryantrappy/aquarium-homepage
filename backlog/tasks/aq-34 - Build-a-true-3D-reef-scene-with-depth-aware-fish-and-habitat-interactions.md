---
id: AQ-34
title: Build a true 3D reef scene with depth-aware fish and habitat interactions
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T04:46:00Z'
updated_date: '2026-11-03T19:02:00Z'
labels: []
dependencies:
  - AQ-5
documentation:
  - docs/requirements.md
  - docs/design-principles.md
  - docs/reef-fish-roster.md
  - docs/fish-behavior-design.md
  - docs/habitat-navigation-core-contract.md
priority: high
type: feature
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The aquarium needs genuine spatial depth so fish can naturally pass behind and around reef structures as their species behaviors grow. Preserve the established sharp, front-on contained tank and working service links, pause controls, and settings. Build on the rendering direction selected in AQ-5. Habitat interaction locations should support appropriate per-species refuge, perching, hovering, and foraging behaviors without fish appearing to pass through solid rock or coral.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The scene uses a spatial 3D reef tank while preserving the sharp, front-on contained reef composition.
- [ ] #2 Fish pass naturally in front of and behind rock and coral, and solid reef geometry prevents fish paths from visibly intersecting it.
- [ ] #3 Reef geometry exposes typed usable interaction locations such as crevices, hideouts, perches, host anemones, and foraging surfaces; locations can be associated with compatible behavior or species.
- [ ] #4 Fish labels and click hit targets respect scene occlusion so hidden fish are not visually clickable through foreground solid geometry, while visible fish remain correctly linked.
- [ ] #5 Existing service link assignments, pause and settings behavior, and the two target viewport layouts continue to work.
- [ ] #6 A browser demonstration shows depth ordering, obstacle-aware movement, and at least one appropriate habitat interaction.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Treat AQ-34 as staged because its AQ-5 rendering-engine decision remains In Progress; implement only a pure, engine-independent 3D navigation core in src/simulation/habitat-navigation.ts and its tests/contract docs. 2. Define finite Vec3 tank-water bounds and typed, caller-supplied anchor positions; resolve targets only when anchor kind and optional species allowlist agree with the selected stable-ID profile, without assuming all profile anchors exist in the reef. 3. Model hard obstacles as bounded AABB volumes inflated by each fish clearance radius and route with a deterministic, bounded 3D visibility graph; reject unsafe start/target points and report disconnected/blocked routes without changing positions. 4. Carry NavigationRequest generation through every result so callers can reject stale completions; missing compatible locations return unavailable, obstructed/disconnected routes return blocked, and no fallback uses a different anchor meaning. 5. Add focused tests for 3D clearance/routing, tank bounds, disconnection, invalid and work-limit inputs, profile/anchor compatibility, and asynchronous request-generation handoff. 6. Record the adapter contract and staged limitations; leave renderer, reef mesh, production anchors, and browser integration pending AQ-5 selection and root review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User direction: The reef should be 3D so fish realistically swim behind things and interact with appropriate coral as behaviors grow. Keep the front-on contained reef tank. Fish must not swim through solid geometry; provide usable crevices, hideouts, perches, and anemone/coral interaction locations tagged with relevant types. Labels and click targets respect occluders. Preserve existing pause and link behavior. AQ-34 may depend on AQ-5 rendering direction; AQ-5 remains unchanged and must not depend on AQ-34.

Staged engine-independent AQ-34 navigation slice only. AQ-5 engine choice is still In Progress. New core will consume actual anchor locations supplied by a future scene adapter; it will not synthesize reef anchors, touch renderers, or claim AQ-34 scene acceptance criteria.

Implemented the staged pure navigation core in src/simulation/habitat-navigation.ts. It accepts only supplied typed anchor locations that match both species and current profile-state target, applies fish-clearance inflation and tank inset, and resolves bounded shortest paths around axis-aligned solid volumes. Missing anchors return unavailable; unsafe starts/targets and disconnected routes return blocked; results preserve instance and navigation generation for caller-side stale-result rejection. Added contract documentation and tests for 3D clearance/routing, full-depth disconnected wall, bounds, compatibility/missing locations, deterministic target choice, malformed/work-limit inputs, and same-instance async generation handoff. Verified targeted suite 6/6 and npm run typecheck. AQ-5 engine selection and production scene integration remain pending; no renderer/browser changes or acceptance criteria checked.

Boundary-spanning obstacle review fix: graph candidate generation now clips out-of-water obstacle corners to the nearest fish-safe tank face, allowing safe edge/face waypoints on a remaining open axis. Added the exact review counterexample and segment-clearance sampling; route is found with a z-depth detour while y is spanned by the obstacle. Existing full-depth wall case remains blocked. Verified targeted navigation tests 7/7 and typecheck. No scene integration or AC checks.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T12:39:00Z

---

The behavior brief clarifies typed, compatible anchors and collision-safe paths: anemone is soft host habitat, distinct from Acropora/hard coral; sand burrows differ from rock perches and foraging surfaces. AQ-45 tracks the reusable interactions separately from scene geometry.

---

author: @root
created: 2026-11-03T18:59:00Z

---

Root navigation-core review round 1: the corner-only graph loses valid routes when an obstacle spans a tank axis. Reproduce water 0..10, start (1,5,5), target (9,5,5), obstacle x4..6 y0..10 z4..6, clearance0.2. All eight obstacle corners lie outside safe y bounds, so no detour nodes survive, although a route through open depth z<3.8 exists. Include water-boundary-clipped candidate waypoints or another bounded method, and add a regression requiring a depth detour while y is blocked. Preserve clearance and fully separating wall tests. Document conservative approximation limits; no scene ACs checked yet.

---

author: @Luna
created: 2026-11-03 19:01

---

Addressed navigation review: visibility-graph obstacle corners now clip each coordinate to the nearest fish-safe water bound, with duplicate candidates removed. The supplied counterexample (water 0..10, start 1,5,5, target 9,5,5, obstacle x4..6/y0..10/z4..6, clearance 0.2) now returns a collision-free route with a depth-axis detour. The full-depth separating wall regression still returns blocked. Targeted navigation suite 7/7 and typecheck pass; scene integration remains pending.

---

author: @root
created: 2026-11-03T19:02:00Z

---

Root core review round 2 accepted the clipped/deduplicated water-boundary candidates and independently ran the 7-test navigation suite. The forced depth detour and fully separating wall behave correctly with fish clearance. This is a bounded conservative AABB routing foundation; actual reef mesh volumes, semantic anchor placement, fish movement, occlusion and browser demonstration remain unimplemented and all scene ACs remain pending.

---
<!-- COMMENTS:END -->
