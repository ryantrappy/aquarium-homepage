---
id: AQ-87
title: Distribute fish across the full water column and multiple depth planes
status: In Progress
assignee:
  - '@root'
created_date: '2026-11-08'
updated_date: '2026-11-21 01:47'
labels:
  - behavior
  - photorealism
  - rendering
dependencies:
  - AQ-34
  - AQ-60
  - AQ-12
references:
  - src/rendering/scene/fish-spawn.ts
  - src/lib/fish-behavior.ts
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/motion.ts
  - AQ-34
  - AQ-60
  - AQ-12
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 94000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stop fish clustering in the top half of the tank on a single depth plane by enforcing per-species depth/height ranges in spawn placement and route targets, so the school uses the full tank height and at least two distinct depth planes. Scale and depth behaviour are covered by AQ-79 (Blender promotion, per-species Root approval, no automatic swap), AQ-78, AQ-60 (true scale, In Progress), and AQ-34; this task adds only the missing full-water-column distribution requirement. (Video-review finding, 2026-11-08: fish cluster in the top half on what reads as a single plane.)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each species' declared depthRange / height band is honoured by spawn placement and route targets — no species is confined to the top half by default
- [x] #2 Look-dev captures at 1440x900 and 402x874 show fish spread through the full water column and on at least two visibly distinct depth planes, with fish still prominent and legible
- [ ] #3 Fish still pass in front of / behind reef without intersecting solid geometry, and labels / hit targets stay correct at all depths
- [x] #4 Existing schooling, startle, pause / reduced-motion behaviour is unchanged; tests cover the new distribution
- [x] #5 Root accepts the distribution against reference captures before Done
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Root distribution iteration: preserve each species existing declared vertical band during safety fallback/mesh relocation rather than searching the entire water height when a preferred reef position is blocked. Extend bounded spawn search with an optional safe world-height interval and constrain current service/schoolmate/relocation callers using the existing ecological range helper. Do not reduce collision clearances, reset retained fish after unrelated settings edits, change school/startle/pause contracts or invent habitat targets. Reproduce blocked lower-band fallback in tests and verify actual-controller spawns plus native exact-size captures. Inspect cruise targets/anchor-state exceptions separately; do not claim the whole distribution task accepted from spawn changes alone.

Native diagnostic showed a second cause: height strata reused horizontal ID order, placing a gramma whose ID sorted first at the very top of its own band. Root now assigns independent heightIndex by ecological depth preference, preserving stable horizontal identity lanes and input-order independence. A constrained search also prioritizes keeping intended Y over a shorter upward escape, while preserving collision/crowding checks. Both cruise planners share the same range helper; explicit anchor-state/startle behavior is preserved and remains an acceptance consideration. DEV capture sidecars gain copied inhabitant positions and allowedY bands for objective review.

Next iteration: clamp the free-water startle target Y to the same clearance-safe species depth band as cruise, while preserving horizontal escape and startle FSM behavior. Reproduce at the upper band edge, then run fish-spawn and motion suites.

Measure actual mounted anchor depths against free-water bands, then keep general shelter and forage targets inside species depth preferences while preserving anatomy-bound hosts and burrows. Verify both route adapters, in-band alternatives, automatic fallback, and the current modeled habitat.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root reviewed two-size native trial: independent ecological height order plus height-preserving safe search restores low foreground fish (gramma aroundY-1.51, butterfly aroundY-1.10) while clown/cardinal remain upper water and tangs span farther depth. DEV snapshots now copy positions/allowedY for objective checks. Root accepts the visible spread for current eight-service roster, but not full-task completion: explicit anchor/startle state targets may leave general cruise bands, clown profile currently ends at normalizedDepth0.48, and exact animated-body solid-clearance gates remain with AQ58/AQ60. Do not infer AC1/AC3 from point-safe snapshots.130focused spawn/scale/controller/motion/schooling/runtime tests and typecheck14scripts pass. Existing spawn test fixtures now consume actual shared reef placements and physical-spacing arguments instead of obsolete hardcoded layout values.

Root exact-source review at 8b2d7cc: docs/asset-evidence/aq87/distribution-20261112/ contains native 1440x900 and 402x874 PNGs, ready sidecars and phone target bounds. All eleven inhabitants remain within declared staging bands; eight service fish span Y3.35655 and visibly multiple depth planes. Eight phone targets exceed44px. Root accepts this saved-roster distribution against the taller reef reference direction. Isolated full732tests/65files, typecheck14scripts and production build pass; prior behavior regression scope retained. AC2/4/5 accepted. AC1/3 remain explicitly open: clown profile is upper-half and anchor/startle targets are separate; animated-body/solid clearance is not proven by point snapshots. Initial proof-server403 infrastructure errors were corrected before final ready captures; no clean-console certification is claimed.

2026-11-15 Junie iteration: found the non-school startle branch in selectFreeWaterAttemptTarget used fish.position.y + 0.15 clamped only to tank bounds. Added a regression that failed with target y=1.829 above the allowed y=1.689, then constrained the vertical escape coordinate to the existing clearance-safe depthRange. Horizontal evasive direction and startle behavior remain unchanged. After the fix, motion.test.ts and fish-spawn.test.ts pass 90/90. No acceptance criteria changed or checked; all-species route coverage, AC3 all-depth animated clearance/occlusion/labels, and Root review remain open.

Additional validation for this iteration: `npm run typecheck` passed, syntax-checking 17 scripts; `npm run build` passed with the existing >500 kB aquarium chunk advisory. `git diff --check` passed. The implementation is handed off for Root review; keep the task In Progress because AC #1 is not complete across all species/routes and AC #3 visual/clearance/label evidence is still open.

Root review 2026-11-20. The current laptop exports placed some generic shelters at normalized depth 0.022 and some forage patches as low as 0.911. Both mesh and fallback planners now select in-band anchors for ordinary anchoring behavior or resume free-water planning when none qualify. Held pose targets use the same band. The firefish band extends to 0.98 to include the authored sand burrow at 0.976. The clownfish cruise band extends to 0.54 to reach below midpoint. Both built-in anemone hosts are in band at 0.344 and 0.348. A host remains usable when a custom layout places it beyond the cruise band. The moray keeps its separate fixed residence. All three new regressions fail before the change and pass after it. Current actual GLB assembly confirms every mobile profile reaches below midpoint and has an in-band alternative for each anchor type the reef emits for it. Seven focused suites passed 181 tests, including live asset host/collision and all-species free-water motion, plus typecheck and 17 script checks. The 1440×900 DPR 1 working-tree capture at docs/asset-evidence/aq87/anchor-depth-review/laptop.png staged 12 inhabitants with zero band misses among those with a band, zero asset failures, and no console warnings or errors. The capture includes concurrent sand and enclosure styling. AC1 checked for shipped depth bands and route destinations. Animated-body clearance, labels and hit-target verification remain open under AC3.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-15 14:42
---
Root partial review 2026-11-15: accepted the fresh public-default native view at 1440x900 CSS pixels, DPR 1, with reduced motion emulated before app navigation and no look-dev seed prefix. After settled reload, all five default fish bodies and captions remained visible with aria-hidden=false. Capture/state: docs/asset-evidence/aq87/front-cutoff-20261115/accepted-native-1440x900.jpg and accepted-native-state.json. Pinned planner comparison records five-starter Z span 0.7898077073 to 2.2418077073 scene units; this unit-planner measurement is separate from the native visual review. Focused fish-spawn suite 31/31 and Root combined full suite 934/934 across 78 files pass. AQ-87 AC #1 remains open for full-species depth bands and route targets; AC #3 remains open for all-depth animated-body clearance, reef occlusion, and labels/hit targets. No AC newly checked; task remains In Progress.
---

created: 2026-11-15 14:46
---
Root reviewed partial milestone2026-11-15: addfront-watercutoff Zcandidate without changing visibilityranking, biologicheight, clearance, spacing, mesh-query orfrustumfilters. PlannerdefaultfiveZspan0.7898to2.2418; Rootnative1440x900DPR1freshdefaults (reducedmotionbeforeappnavigation, noloodevseedprefix) showsall5bodies/captions andunhiddenlinks. Root30focusedtests/934full78files passprivatef03b551. Combined31caseauditandseparateAQ104concurrenttimeout retained transparently; notAQ106acceptance. Removedpartialdebugconsoleexternallycommitted273583c. Evidence docs/asset-evidence/aq87/front-cutoff-20261115/. No newAC checked; fullspeciesbands andall-depthanimatedclearance remainopen. ConcurrentAQ106hunks excluded fromselectedindex/sourcecommit.
---
<!-- COMMENTS:END -->
