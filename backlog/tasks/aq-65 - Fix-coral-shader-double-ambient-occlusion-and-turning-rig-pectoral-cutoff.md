---
id: AQ-65
title: Fix coral shader double ambient occlusion and turning rig pectoral cutoff
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-05 18:32'
updated_date: '2026-11-05 21:39'
labels: []
dependencies: []
references:
  - src/rendering/scene/coral-material.ts
  - src/rendering/scene/fish-turning.ts
  - src/rendering/scene/motion.ts
documentation:
  - docs/asset-evidence/aq65/gpu-ao-review.json
priority: medium
type: bug
ordinal: 68000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The modular coral custom shader applies contact ambient occlusion twice: once in diffuseColor and again in reflectedLight terms, diverging from evaluateCoralContactAoFactor and causing unnaturally black crevice shading. Additionally, applyFishTurningRigOverlay exits early when spine bend reaches zero, cutting off active pectoral fin flare updates before recovery completes. Finally, falling back to chord motion on boundary collision snaps yaw instantly in a single frame.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Coral fragment shader applies contact AO only through aomap_fragment light attenuation without pre-multiplying diffuseColor
- [x] #2 GPU coral crevice shading visually matches the single-pass attenuation curve defined in evaluateCoralContactAoFactor
- [x] #3 applyFishTurningRigOverlay continues updating pectoral fin flare and pitch angles until pectoral offsets settle, even after spine bend reaches zero
- [x] #4 Falling back to chord navigation does not cause a single-frame instantaneous yaw angle snap
- [x] #5 Unit tests verify shader uniform bindings and pectoral recovery transitions
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify each audit allegation in the current scoped sources and coordinate with the AQ-58 link-interaction worker before touching overlapping turning behavior. 2. Remove any duplicate coral contact-AO application while preserving the canonical single-pass shader attenuation and uniform contract. 3. Keep turning overlays active through pectoral flare/pitch recovery after spine bend returns to zero, with regression coverage. 4. Replace any boundary fallback yaw snap with a rate-limited heading update while retaining movement bounds and collision checks. 5. Run bounded focused tests (maxWorkers 2), typecheck, and diff-check; record only verified criteria and hand off GPU/browser AC2 to Root.

6. After Root review observed the metric overhang route stall with body pitch clamped to ±0.28 rad, add the approved metric-only true-target pitch bound (±π/2) with a 1.2 rad/s per-substep limit; retain legacy pitch styling and verify vertical routes plus the existing overhang fixture.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 AQ-65 start: Read current agent_scratch.md, AGENT_TASKS.md, Backlog overview/execution/finalization guides, and AQ-65 task. Root owns shared scratch/handoff; current Root review notes are already present. Scope restricted to coral-material.ts/tests, fish-turning.ts/tests, motion.ts/tests. No aquarium/model/art/generator/fish-animation edits. Root owns visual GPU/browser acceptance for AC2; coordinate turning overlap with @link_interaction before editing.

2026-11-05 implementation evidence: AC1 removes alpha-based premultiplication from diffuseColor and applies evaluateCoralContactAoFactor-equivalent attenuation once to the final direct/indirect terms in aomap_fragment; test checks shader injection, analytic 0/.5/1 factor samples, absence of the duplicate multiplier, and uniform identity bindings. AC3 preserves residual pectoral flare/pitch updates while spine angles are below the spine cutoff; transition regression verifies those quaternions update. AC4 boundary fallback preserves the turn-rate-limited yaw already integrated before collision checks and follows only a collision-safe chord; regression checks per-step yaw bound, in-bounds movement and collision safety. AC5 uniform binding and pectoral transition regressions pass. Focused tests `npm test -- --run --maxWorkers=2 src/rendering/scene/coral-material.test.ts src/rendering/scene/fish-turning.test.ts src/rendering/scene/motion.test.ts`: 3 files, 32 tests passed. Scoped `npx tsc --ignoreConfig --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM --types node,vitest/globals src/rendering/scene/coral-material.ts src/rendering/scene/coral-material.test.ts src/rendering/scene/fish-turning.ts src/rendering/scene/fish-turning.test.ts src/rendering/scene/motion.ts src/rendering/scene/motion.test.ts`: passed. Full `npm run typecheck` currently fails in concurrent `src/routes/api/-config.test.ts:2` for missing `createConfigAnyHandler` export; unrelated AQ65 source. `git diff --check` passed. Root owns AC2 GPU/browser verification and final review. No staging or commit performed.

Root GPU/browser review 2026-11-05: Ambient-only float readback with white material, palette regrade 0, subsurface/fluorescence 0, paused motion and mask-alpha sweep [0,.25,.5,.75,1] produced linear factors [.28,.46,.64,.82,1] with maximum CPU-helper error 2.70e-8. This verifies AC2. Root then identified the metric overhang motion regression after replacing boundary chord translation with in-place pivot; AC4 remains open pending a bounded-pitch route-following iteration.

Root-approved motion iteration 2026-11-05: Exact overhang trace confirms current ±.28rad pitch clamp prevents following a valid 3D mesh route (required pitch≈.53rad while yaw is already aligned). Implement metric-mode true rawTarget pitch bounded to ±π/2, rate-limited at 1.2rad/s per substep; leave legacy ±.28rad style unchanged. Keep chord fallback as in-place pivot, never side-slip. AC4 unchecked until existing overhang and new vertical-route regressions pass.

2026-11-05 final AQ-65 motion verification: Root reported the metric vertical-down trace advancing only 0.041m after 6s at near-idle speed, so the test now exercises a stable supported swim state for up to 60s of simulated time and checks actual route completion, signed pitch, positive vertical progress, per-step pitch rate (≤1.2rad/s), and water-bound containment. Both upward and downward routes complete. The metric overhang route completes the existing x>0.4 progress check while preserving the exact capsule query and pitch-step bound; boundary recovery does not yaw-snap or crab-slide and its multi-frame collision-safe progress regression passes. Close intermediate waypoint acknowledgement now requires both a safe forward proposal and a separate safe node query and never snaps position; a blocked node remains pending. Final anchored short-waypoint regression still confirms bounded travel and no early arrival. Verification: focused motion selection 5 passed; `npm test -- --run --maxWorkers=2 src/rendering/scene/coral-material.test.ts src/rendering/scene/fish-turning.test.ts src/rendering/scene/motion.test.ts` passed 3 files/34 tests; scoped TypeScript command and `git diff --check` passed. Root's actual GPU alpha-sweep evidence verifies AC2. AC4 checked based on the complete bounded-pivot, overhang, vertical and waypoint safety regressions. No staging or commit performed; Root review/commit remains outstanding.

2026-11-05 Root follow-up: removed the test's explicit `fish.speed = .5`; vertical-route proof now uses the fish's seeded species cruising variation and the supported `swim` state, without an artificial speed boost. Both directions still complete within the 60s simulated-time bound; scoped 34-test suite passes.

2026-11-05 Root final review accepted all iterations. Independent isolated4-suite41-test run (34task tests plus7player), typecheck and production build pass. Actual unmodified shader float linear GPU readpixels matches CPU AO factors0.28/0.46/0.64/0.82/1 with maxerror2.70e-8; exact source hash and reproducible expression in docs/asset-evidence/aq65/. Pectoral residual flare/pitch continues independently of spine cutoff. Boundary recovery holds translation during bounded pivot rather than snapping yaw or adding sideways chord travel. Metric mode uses rate-limited true waypoint pitch up tovertical; deterministic overhang and up/down routes progress with capsule guards, and close intermediate nodes require separate node/forward checks without positional snaps. Existing final-anchor and substep arrival regressions remain intact. This is bounded functional/mathematical acceptance, not final fish art or lifelike swimming acceptance.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-05 21:19
---
Root GPU review passes: actual unmodified coral material under ambient-only diffuse, linear float render target, palette/fluorescence/subsurface/motion disabled. Alpha0/.25/.5/.75/1 yields attenuation .280000011/.459999998/.639999986/.819999973/1; maxCPU difference2.70e-8. Root motion review requests holding translation during bounded pivot rather than adding sideways chord travel. Initial strict-pivot iteration failed existing exact mesh overhang progress test (x=-.440 after2400steps vs>.4), so keep that regression intact and solve near-waypoint heading/pitch recovery before finalization. Current static graphics proof does not accept final lifelike fish/art.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed double contact AO, retained residual fin recovery and replaced yaw snapping with safe bounded pivots. Added metric vertical pitch recovery while preserving continuous movement queries and final-arrival bounds. Root verified34task tests plus7player tests, typecheck/build and actual GPU attenuation to2.70e-8. Evidence:docs/asset-evidence/aq65/gpu-ao-review.json.
<!-- SECTION:FINAL_SUMMARY:END -->
