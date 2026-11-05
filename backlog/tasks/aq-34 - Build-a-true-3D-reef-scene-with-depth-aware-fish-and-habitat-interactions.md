---
id: AQ-34
title: Build a true 3D reef scene with depth-aware fish and habitat interactions
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-03T04:46:00Z'
updated_date: '2026-11-05 04:39'
labels: []
dependencies:
  - AQ-5
  - AQ-14.4
documentation:
  - docs/requirements.md
  - docs/design-principles.md
  - docs/reef-fish-roster.md
  - docs/fish-behavior-design.md
  - docs/habitat-navigation-core-contract.md
priority: high
type: feature
ordinal: 15000
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

Production integration approved by root after Three.js selection. Derive bounded conservative columns from real reef triangles rather than one global AABB, expose only observed upward-facing lower substrate as grazingSurface, route free-water targets through the same validated graph without fabricated anchors, and bind nearest actual mesh occlusion to native service anchors/labels. Verify main scene with root at the two target viewports.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User direction: The reef should be 3D so fish realistically swim behind things and interact with appropriate coral as behaviors grow. Keep the front-on contained reef tank. Fish must not swim through solid geometry; provide usable crevices, hideouts, perches, and anemone/coral interaction locations tagged with relevant types. Labels and click targets respect occluders. Preserve existing pause and link behavior. AQ-34 may depend on AQ-5 rendering direction; AQ-5 remains unchanged and must not depend on AQ-34.

Staged engine-independent AQ-34 navigation slice only. AQ-5 engine choice is still In Progress. New core will consume actual anchor locations supplied by a future scene adapter; it will not synthesize reef anchors, touch renderers, or claim AQ-34 scene acceptance criteria.

Implemented the staged pure navigation core in src/simulation/habitat-navigation.ts. It accepts only supplied typed anchor locations that match both species and current profile-state target, applies fish-clearance inflation and tank inset, and resolves bounded shortest paths around axis-aligned solid volumes. Missing anchors return unavailable; unsafe starts/targets and disconnected routes return blocked; results preserve instance and navigation generation for caller-side stale-result rejection. Added contract documentation and tests for 3D clearance/routing, full-depth disconnected wall, bounds, compatibility/missing locations, deterministic target choice, malformed/work-limit inputs, and same-instance async generation handoff. Verified targeted suite 6/6 and npm run typecheck. AQ-5 engine selection and production scene integration remain pending; no renderer/browser changes or acceptance criteria checked.

Boundary-spanning obstacle review fix: graph candidate generation now clips out-of-water obstacle corners to the nearest fish-safe tank face, allowing safe edge/face waypoints on a remaining open axis. Added the exact review counterexample and segment-clearance sampling; route is found with a z-depth detour while y is spanned by the obstacle. Existing full-depth wall case remains blocked. Verified targeted navigation tests 7/7 and typecheck. No scene integration or AC checks.

First integration is implemented under src/rendering/scene plus AquariumScene. Shared route core now exposes generic free-water point routes and segment safety, reusing clipped obstacle corners and visibility graph. Targeted tests17/17 pass including movement/turning with per-step clearance, pause/resume, isolated startle, depth detour, actual triangle-envelope coverage, and Settings preservation. Browser-only main renderer builds and isolated production SSR returnedHTTP200. Root main-page visual/interaction review requested; scene criteria and Done remain unchecked.

Root first-main visual feedback prompted a new asymmetric taller/lower reef composition with overlapping/buried scan bases and textured undulating sand, plus vertically staggered phone fish. Critical startup fix: static extraction measured23.46s in an offline actual-mesh benchmark; scripts/build-reef-habitat.mjs now generates7.8KB reef-habitat.json pinned to source GLB SHA256b8ad404d0caca115f22153d7d97642415412f4527391a7285da7fba190001a86. Browser only transforms those real triangle-derived columns/substrate positions (no mesh extraction at mount), using bounded rotations/scales/placement. Current typecheck and targeted12tests pass. Root repeat composition/functional review requested; no deployment/Done.
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

author: @root
created: 2026-11-03T20:23:00Z
---
Root first main-page review: fresh1440x900 scene renders and native service-link overlays move, but do NOT deploy this visual composition yet. /tmp/aq-moving-first-laptop.png shows ~two-thirds flat empty teal water, identical duplicated reef mounds with cut rectangular substrate edges/gap and a flat beige floor. This regresses the primary sharp, full-frame contained reef goal. Recompose an asymmetric mature aquascape reaching roughly50–70% of frame height with open swim lanes, bury scan footprints/open underside beneath credible sand, vary source placements/scale/angles without exposing unreconstructed backs, and keep front-on tank perspective/deep focus. Fish should be spread naturally and legible, including phone crop; no new headers/cards or artificial blue veil. Static source processing blocked the main thread ~23.46s (worker measured), matching root24s focus timeout: precompute source-hash-pinned geometry habitat offline with reproducible script/manifest and apply bounded fast placement transforms. Actual positions must still derive from the real reef. Root will repeat functional/visual review after stable fixes; current source not accepted as finished realism.
---

author: @Luna
created: 2026-11-03T20:30:00Z
---
Focused read-only source review (2026-11-03) of AquariumScene, scene/aquarium.ts, motion.ts, and aquarium.css found no concrete native-link, keyboard, focus/occlusion, or fallback-lifecycle regression. Loading/failure/context-loss states keep real anchors and switch them into the visible fallback layout; failed-state clicks bypass raycast prevention and retain native href behavior. In ready state only pointer activation outside the fish hit target is prevented. Focused fish pause while labels recompute visibility; user pause, system reduced-motion preference, and document hidden state stop the motion loop. Async GLTF completions after disposal are disposed; context loss transitions to fallback. No source changes made and no scene acceptance criteria checked.
---

author: @Luna
created: 2026-11-03T20:36:00Z
---
Vite cache isolation prep (2026-11-03): root Vite now uses node_modules/.vite-main; proof Vite uses the repo-absolute node_modules/.vite-reef-study path. This separates the main app/proof optimizer caches from older shared-cache users. The stale optimizer cache is a plausible explanation for the client module failures, not yet a proven cause; root will restart the main server with --force and verify the browser before attributing the issue. No plugin, port, package, deployment, or renderer source changes.
---

author: @root
created: 2026-11-03T20:46:00Z
---
Root production-build review now loads Three successfully at1440x900 and sees the revised taller asymmetric reef; /tmp/aq-moving-production-laptop.png. BLOCKER: console RangeError: Elapsed simulation time must be finite and non-negative (compiled stack aquariumDSJ8TmXf at stepSwimmingFish/frame), which can stop the animation loop while is-rendered stays true. Fix renderer frame-clock initialization/resize/manual-draw/resume so first rAF timestamp can never generate negative/NaN elapsed or reset last inconsistently; add regression covering first frame timestamp preceding performance.now, viewport resize and resume. Also motion currently advances AQ44 behavior with full elapsed while position/startle use min(elapsed,.05), so long frames desynchronize state and locomotion: use one bounded simulation time/substep strategy. Native activation itself is cheap/scoped; keep heavy routing after native navigation. Root will rebuild with dev stopped and verify actual moving transforms, pause freezes, visibility suspension and click/startle. Do not claim animation completed while this error remains.
---

author: @render-integration
created: 2026-11-04 02:17
---
Production-review clock blocker fixed in source. Added scene/clock.ts and regression tests: RAF timestamps alone establish the baseline; first/backward/nonfinite timestamps advance zero; manual resize draws advance zero; pause/hidden drops wall-clock gaps while retaining fish state and simulation fraction. Behavior, locomotion, startle and clips now consume bounded1/60-second substeps capped0.1s/frame; direct pure-motion callers use the same bounded substeps. Overlapping transparent native targets select the nearest visible fish URL before the same default anchor action; label/keyboard activation refreshes visibility. Covered body/context actions are blocked, middle-click retained, and activation releases only the selected focus hold. Targeted12tests pass, typecheck and git diff --check pass. Root rebuilding/QA; source held. Fallback image-plane alpha picking and native context-menu URL capture remain explicit browser QA boundaries; no further unobserved fixes, no acceptance checks, commit or deployment.
---

author: root
created: 2026-11-04T02:22:00Z
---
Root rebuilt and verified all89 tests/typecheck/build; main laptop now changes fish transforms over time, pause holds positions exactly, no new console errors. Concrete picking blocker: paused /tmp/aq-main-fixed-paused.png has empty-water pixel(887,302) RGB45,78,94 (same as background), inside Jellyfin preview plane. Native pointer click there emits Page.windowOpen to http://trappserv.er:8096/ and acknowledges Jellyfin. CPU Mesh raycast ignores WebP alpha despite GPU alphaTest. Filter sprite intersections by sampled texture alpha (same cutoff/UV transforms) so transparent points neither activate nor occlude fish behind; preserve normal geometry reef occlusion and native blank-target behavior. Add focused mask tests. Root retains current source/build for remaining QA; coordinate before rebuilding.
---

author: @render-integration
created: 2026-11-04 02:28
---
Addressed concrete alpha-picking review #10. Added alpha-picking.ts: decode same-origin artwork alpha once per loaded preview; sample with map UV matrix, wrap modes, flipY, texel-center linear/nearest sampling, opacity and material alphaTest; skip transparent sorted intersections to select actual fish/reef behind. Pending/failed masks do not claim opaque pixels. Aquarium nearest-hit path uses this filter for all body/label/context picking; ordinary reef/GLB geometry unchanged. Five focused tests cover empty-water corners, fish behind a transparent plane, opaque reef ordering, alpha-cutoff equality/opacity, UV transforms, linear sampling and pending decode. Tests5/5, typecheck and git diff --check pass. docs/rendering.md now separates standalone-fixture limits from main technical integration and current root QA/fidelity gaps. Source ready for root rebuild/browser recheck; no builds, server changes, rig/material changes, commits or deployments by worker.
---

author: root
created: 2026-11-04T02:43:00Z
---
Root final functional baseline review: repaired production build passes94tests/typecheck/build; main fish travel and pause freezes positions, reduced-motion freezes positions with one selected non-spatial acknowledgment and native_blank event, exact Settings temporary-add/reload/remove restores original3exampleconfig and ETag0778042fed0e2065e9657b7209832a6b4820e7b4610b1e0e95d5dcd3e0e382b3. Empty preview margin(670,271) now produces no navigation; visiblebody(720,235) requests correct JellyfinURL. Contextloss exposes usable native fallback; phoneSettings fits374x846at(14,14) in402x874. Hidden-state behavior is source+clocktested, not a deliberate browser visibility transition. Normal isolated-cache Vite dev restart now hydrates and renders without console errors; this does not establish the old cache conflict as sole prior cause. Main geometry remains a technical rough/dead scan and only2riggedfish; actual habitat interaction demonstration, fullrosterrealism and finalgeometryquality remain open. Accept this as reviewed functional milestone only, no deployment.
---

author: root
created: 2026-11-04T06:25:00Z
---
Existing navigation core remains valid staged work. Final modular scene/depth/anchor acceptance follows AQ14.4 assembly per the user sequence.
---

author: root
created: 2026-11-05 04:39
---
Latest user collision feedback is being handled in active prerequisite AQ58 as a focused investigation and implementation iteration, avoiding an additional open task. Existing AQ34 explicitly requires true3D obstacle-aware paths but its legacy height columns overfill caves/overhangs. Final integration must consume the reviewed volumetric collision result and demonstrate depth gaps, behind/in-front routes, real cave clearance and actual mesh occlusion. A full-depth box baseline alone cannot satisfy this.
---
<!-- COMMENTS:END -->
