---
id: AQ-64
title: >-
  Reconcile aquarium inhabitants on service updates without resetting swimming
  state
status: Done
assignee:
  - '@link-interaction'
created_date: '2026-11-05 18:32'
updated_date: '2026-11-05 23:25'
labels: []
dependencies: []
references:
  - src/rendering/scene/aquarium.ts
documentation:
  - docs/asset-evidence/aq64/review.json
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
- [x] #1 Editing an existing service name or URL updates its anchor label and target without despawning or resetting any fish
- [x] #2 Adding a new service instantiates the new fish while leaving existing swimming fish at their current positions and velocities
- [x] #3 Removing a service disposes only of that specific fish and its resources without resetting surviving fish
- [x] #4 Re-ordering or updating services does not cause visual pop or animation clock resets for unchanged inhabitants
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Root-requested demanding review only; implementation waits for AQ-58 shared-aquarium commit. 1. Use stable service ID plus fish ID as the reuse key: preserve root, motion, clip player, turning rig and extension instance for name/URL/isExample edits and reorder; refresh current service/anchor references and title/error accessibility metadata. 2. Extract a small callback-based reconciliation function (create/update/dispose) used by the real controller, with identity/lifecycle tests; keep model loading, scene behavior and geometry ownership local to aquarium.ts. 3. Split creation/disposal per inhabitant: create only added/replaced species, dispose only removed/replaced entries and their owned skeleton/player/extension/sprite resources, retain shared model geometries/materials/textures, and rebuild only the raycast list after deltas. Guard stale texture callbacks by per-inhabitant ownership, avoiding stale service/anchor captures after edits. 4. Keep habitat/resize rebuild behavior separate; configuration updates do not rebuild habitat. Preflight spawn plans for new/replaced entries; preserve current full-fallback safety when a required spawn is unavailable, without destroying unaffected instances. Review exact unavailable-spawn status behavior with Root before implementation. 5. Verify name/URL edit, reorder, add, remove, fish-ID replacement, unchanged pose/velocity/route/clip identity, per-instance disposal, stale callbacks and focused/error-label anchor refresh in headless tests; Root verifies browser behavior at the two allowed viewports.

Root approval after AQ58 e6d1ecc and AQ65 5879062: implement the scoped reconciliation now. A true no-fit configuration preserves unaffected live instances/state while the existing full-native fallback is shown; recovery when configuration fits must reuse those instances. Roll back newly created entries on creation failure; do not leak partial resources. Root owns final browser review and Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 @link-interaction implementation handoff: same service ID+fish ID retains root/motion/clip player/turning rig/extensions/private resources across metadata edits and reorder; add/remove/species replacement is delta-only. Creation preflights only new/replaced fish, rolls back newly created resources if later creation fails, and retains unaffected instances during existing truthful full-native fallback; fitting config recovers those exact instances. Per-inhabitant artwork ownership guards stale load/error callbacks; delayed errors refresh the latest service and anchor metadata, keeping AQ66 native-label fallback. Cleanup disposes private player/extension/skeleton/sprite resources and leaves shared model geometries/materials/textures untouched. Source stable for independent reviewer @navigation_recovery. Tests use actual createAquarium controller, real Three scene/motion/clip players and disposal with only WebGL/asset IO mocked, rather than merely testing a copied reconciliation model. Six lifecycle tests cover identity/pose/speed/routes/random/clip phase, delta resource disposal, no-fit recovery, creation rollback, stale/current artwork callbacks and focused native-label refresh. Combined lifecycle/component/player/focus/alpha run34tests/5files passed; npm run typecheck passed including11script syntax checks; scoped diffcheck passed. Root native browser review remains pending; no Done/commit/stage,13concurrent model URL additions and all art preserved.

Independent review iteration: @navigation_recovery confirmed a stale artwork callback could still pass ownership during true no-fit replacement because old resources are deliberately retained. Added requested-generation id+fishId gating to both success and error callbacks, alongside resource/disposed/failed checks. New actual-controller regression invokes both old callbacks during a no-fit species replacement: current native title/URL/error state stay unchanged, and a later fitting configuration retires the old texture exactly once. Seven lifecycle tests and typecheck+11script syntax checks pass; updated stable source hashes sent to reviewer.

Independent test-strength review addressed: the metadata/reorder lifecycle test now proves nontrivial live state before comparing preservation, requiring positive speed, movement away from the original spawn and a changed actual bone quaternion before the edit. Seven lifecycle tests pass again; no production source change in this iteration.

Handoff criteria: AC1-3 checked from actual-controller DOM/lifecycle evidence. Test now proves the source fish has positive speed, moved from its spawn and advanced its real bone quaternion before metadata/reorder preservation. Rollback test additionally proves the newly created player/private skeleton/extension are each disposed once while shared geometry and surviving root remain intact. Seven lifecycle tests pass; typecheck including11script syntax checks and scoped diffcheck pass. AC4 remains pending Root native visual review despite headless clock/identity preservation evidence; no terminal status or final summary written. Current production aquarium SHA25644c331cf03e54fa1e97d39016bf273d0d7e516c0fb7535d5e9712b4ebb974a7b, helper5576c54028ceb10b6269f4cd8bd5a0176e997a30fdcaa1471dd607895bae1630, final lifecycle testf8ca4b4d2f494ab1cc59dfff3ee34e975c04bcf8fba5dbc64449359c23f221a7.

2026-11-05 Root final acceptance: frozen reviewed production source (excluding13uncommitted modelURL additions and AQ60 scale changes) passes default44files/391tests, typecheck and build. Seven actual-controller lifecycle tests first establish real movement/clip change, then prove root/motion/player/route/random continuity, exact delta cleanup, rollback player/skeleton/extension disposal, shared geometry survival, and stale load/error guard after no-fit replacement. Independent review found/fixed that callback race and approved final hashes. Native production5196 uses a separate temporary REEF_CONFIG_PATH: paused metadata/name+URL edit, add(6fish), remove(5fish) and reverse-order import preserve all survivor projected transforms/bounds exactly at1440x900; phone402x874 metadata/restored-order import also preserves all5, no overflow. Resume moves all5; no captured errors, only preexisting shadow-map warning. Screenshots are true full-size PNGs. User/main config untouched. Evidence:docs/asset-evidence/aq64/review.json. Root accepts all4AC; no final fish art/envelope acceptance implied.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @link-interaction
created: 2026-11-05 21:22
---
2026-11-05 @link-interaction review: update() currently JSON-compares services then calls rebuildFish(), which starts removeFish() and resets every instance, extension and clip. Shared model assets must stay owned by loadedAssets; cloned skeletons/player/extension are per fish, fallback sprites own their geometry/material/texture. Async texture callbacks currently capture a service snapshot and anchor map, requiring live per-entry metadata on reuse. Implementation remains unstarted while Root reviews/commits AQ58 and approves the scoped reconciliation plan.
---

author: @Luna
created: 2026-11-05 23:21
---
2026-11-05 independent review (source hashes pinned: aquarium.ts `44c331cf03e54fa1e97d39016bf273d0d7e516c0fb7535d5e9712b4ebb974a7b`, fish-inhabitants.ts `5576c54028ceb10b6269f4cd8bd5a0176e997a30fdcaa1471dd607895bae1630`, lifecycle test `f8ca4b4d2f494ab1cc59dfff3ee34e975c04bcf8fba5dbc64449359c23f221a7`). Initial review found a no-fit replacement race: retained old artwork callbacks could update a reused native anchor after requested service ID/fish ID had changed. The worker added current requested ID+fish ID gating to both texture success/error callbacks and a no-fit replacement regression; retested the final hash.

Reviewed all four AC headlessly. Name/URL edit and reorder preserve a nonzero-speed, moved fish's root, position, velocity, route/random state, clip player and noninitial bone pose while refreshing href/title/aria metadata. Add creates only the new fish and preserves existing live state; remove/species replacement disposes only the target extension/player/private skeleton while retaining shared geometry. Reorder keeps clip/player identity and pose. Focus/native link behavior is covered by controller helper plus AquariumScene tests, including href, target/rel, context-menu URL stability and focus handoff. No-fit status stops the scene loop while retaining fish, then a fitting update returns ready and reuses the prior root. Later creation failure rolls back the newly-created extension/player/skeleton and preserves shared geometry/survivors. Old-generation and no-fit stale callbacks are ignored.

Independent command: `npm test -- --run --maxWorkers=2 src/rendering/scene/aquarium-lifecycle.test.ts src/components/AquariumScene.test.tsx` passed 2 files / 16 tests; `git diff --check` passed. The implementer reports scoped typecheck plus 11-script syntax validation passing. Root owns isolated production browser verification and final AC decisions; no acceptance criteria checked by this review. No source changes made by reviewer; concurrent model URL entries in aquarium.ts were preserved.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reconciles service edits by stable ID/species, retaining surviving roots, motion, routes, clip players and extensions while creating/disposing only deltas. Fixed stale artwork callbacks and transactional rollback. Root and independent review verified391tests/typecheck/build, actual-controller ownership/phase checks and real Settings edits/add/remove/reorder at both target viewports with unchanged survivor poses. Evidence:docs/asset-evidence/aq64/review.json.
<!-- SECTION:FINAL_SUMMARY:END -->
