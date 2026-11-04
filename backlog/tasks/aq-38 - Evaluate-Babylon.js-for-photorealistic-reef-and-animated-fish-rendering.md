---
id: AQ-38
title: Evaluate Babylon.js for photorealistic reef and animated fish rendering
status: Done
assignee:
  - '@fish-renderer'
created_date: '2026-11-03T04:49:00Z'
updated_date: '2026-11-04T02:41:00Z'
labels: []
dependencies: []
references:
  - https://www.babylonjs.com/
  - >-
    https://doc.babylonjs.com/features/featuresDeepDive/animation/animationRetargeting
  - >-
    https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/IBLShadowsRenderingPipeline/
  - https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF
  - https://doc.babylonjs.com/lite/typedoc/functions/createNavMesh
  - AQ-5
  - AQ-34
  - AQ-35
  - AQ-37
  - https://playcanvas.com/
  - https://threejs.org/
documentation:
  - docs/requirements.md
  - docs/design-principles.md
  - docs/reef-fish-roster.md
  - docs/gemini-research-links.md
priority: high
type: spike
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate Babylon.js as one candidate renderer feeding AQ-5, the central engine/assets/fish-animation-pipeline decision. AQ-5 is also comparing PlayCanvas and Three.js; Babylon.js is not presumed to be the winner. Compare engine capabilities fairly with the same realistic fish and reef assets and comparable rig/animation inputs, separating engine capability from source asset or rig quality, and keep AQ-5 as the decision record. Official references for investigation include the [Babylon.js site](https://www.babylonjs.com/), [animation retargeting](https://doc.babylonjs.com/features/featuresDeepDive/animation/animationRetargeting), [PBR image-based lighting and shadows](https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/IBLShadowsRenderingPipeline/), [glTF loader](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF), and [navigation mesh API](https://doc.babylonjs.com/lite/typedoc/functions/createNavMesh). Assess actual quality and integration fit: PBR reef materials, lighting/caustics/water clarity, depth occlusion, skeletal/skinned full fin and body animation plus morph or procedural deformation as needed, glTF/GLB and Mesh2Motion exports, AQ-35 species profiles kept separate from deformation clips, link picking through occluders, and React/TanStack Start TypeScript lifecycle, SSR, and browser-only canvas boundaries. Evaluate free-swimming 3D obstacle avoidance and habitat-anchor navigation; do not assume a navmesh, which is often surface-oriented, solves volumetric fish movement. Use the same controlled fish and reef assets for comparisons. Build a small isolated browser proof/review artifact and measure performance only at 402x874 and 1440x900. Treat engine features as capabilities to evaluate, not promises of photorealism: results depend on suitable source assets, material and lighting work, animation quality, and tuning. Give an evidence-based adopt, adapt, reject, or keep-current recommendation with limitations. AQ-38 is an investigation only; production renderer migration belongs in a follow-up after AQ-5 records the evidence-based decision.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Babylon.js is evaluated against AQ-5's renderer candidate and the existing implementation using the same controlled fish and reef assets, with an inspectable isolated proof/review artifact.
- [x] #2 The review records evidence and limits for reef PBR materials, lighting, caustics, water clarity, depth occlusion, and fish realism; engine feature claims are not treated as proof that the output is photorealistic.
- [x] #3 The proof evaluates full body, fin, and caudal motion using skeletal/skinned animation, morph targets, or procedural deformation as appropriate; glTF/GLB loading and Mesh2Motion export compatibility; and integration with AQ-35 species behavior profiles without conflating behavior paths with deformation clips.
- [x] #4 Fish obstacle avoidance and navigation to typed habitat anchors are tested or bounded with explicit evidence; the review does not presume that surface navmesh navigation solves free-swimming 3D movement.
- [x] #5 Service link picking respects occluders, and React/TanStack Start TypeScript integration addresses component lifecycle, SSR, and browser-only canvas creation.
- [x] #6 Performance evidence is reported at only 402x874 and 1440x900, and the final recommendation says adopt, adapt, reject, or keep the current approach with rationale and limitations.
- [x] #7 The task makes a candidate-engine recommendation only; no production renderer migration is performed as part of this investigation.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Root agent reviews the completed work before the task is marked Done.
- [x] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Build an isolated loader experiment using the same CC0-derived Mesh2Motion clownfish GLB and swim clip in Three.js, Babylon.js and PlayCanvas, with comparable camera and lighting. 2. Verify loading, pause and clip playback and document visible differences and integration limits; label this stylized sample a technical proxy, not the required realistic fish and reef comparison. 3. Continue the full candidate comparison only when suitable licensed realistic fish and habitat are available; measure performance at the two specified viewports before any recommendation.

4. Preserve the two current licensed rigged candidates pending root anatomy review; load those identical GLBs in all three engines with fixed camera, pixel ratio, pause and 45-degree turns. Add an explicitly primitive depth/picking test and document light/color calibration limits; resolve loader failures before visual or performance conclusions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Controlled technical baseline now loads the same licensed two-species rigs in all three engines; source GLBs unchanged. Actual IAB1440x900/402x874 checks pass loading, motion, 45-degree turns, pause freezes and primitive nearest-occluder picking. Repeat Babylon pause after unexpected page reset passed. Current direct-light gray-PBR fixture matches Three/Babylon mean linear0.23974; PlayCanvas exposure0.30 measures0.23717 (~1.1% lower), upper/lower fixture patches within~5%. Added explicit client-only React/TanStack Start lifecycle and independent behavior/navigation plan in docs/rendering.md. Actual CC BY4.0 VIVID REALITY reef scan downloaded officially by root;100k/1K shared LOD processing underway. Mac locked: no further browser work until user confirms unlock. No engine fidelity winner, final performance result or production migration claimed.

Same-reef browser comparison completed by root in hidden IAB at 1440×900 and 402×874 for Three.js, Babylon.js and PlayCanvas. All used the same two fish and corrected reef GLBs; pause/turn and actual-reef occlusion picking behaved consistently. Frame intervals/draw calls are desktop-host measurements and not GPU or physical-phone benchmarks. Babylon GLTF/animation/picking/instrumentation APIs work, but showed no measured fidelity or interval advantage over Three.js. Recommendation: keep Babylon compatible but do not select it for a project production migration; AQ-5 recommends Three.js as next integration candidate for TypeScript/React project fit. Caustics/water clarity, AQ-34 scene route integration, AQ-35 renderer adapter, accessible service links and SPA/SSR lifecycle implementation remain follow-ups; no production migration. ACs 1,2,4,5,6,7 verified; AC3 remains unchecked because full species-behavior/profile integration and finished articulated motion were not demonstrated in this engine proof. Root review required; task remains In Progress.

AC3 evaluated and verified as a bounded candidate-engine investigation: Babylon rendered the same licensed two-species skeletal GLBs with visible body/fin/caudal clips in the controlled actual-reef proof at both target viewports. AQ37 supplied an exact licensed Mesh2Motion export/load compatibility trial in selected Three.js, with explicitly distorted/unfitted stylized output and no realistic tang/all-roster transfer claim. Subsequent main Three integration consumes AQ35 profiles/AQ44 per-instance state and independent AQ34 paths separately from deformation clips, demonstrating the intended engine-independent boundary; this is not a Babylon production profile adapter or migration. Root main94tests/typecheck/build and browser motion/link/alpha checks support the selected pipeline capacity. docs/rendering.md distinguishes these tested scopes and remaining fidelity/interaction limits. All research ACs now checked; leave status/DOD/Done to root.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @fish-renderer
created: 2026-11-03 12:59

---

A provisional isolated engine-study.html now loads the same local CC0-derived Mesh2Motion clownfish export and swim clip in selectable Three.js, Babylon.js and PlayCanvas paths. Camera FOV and model normalization are specified, but lighting/color matching is not calibrated; Babylon and PlayCanvas browser playback and framing remain unverified because browser connection timed out. Typecheck passes. This stylized unfitted single-fish sample has no reef and is a loader experiment only; it does not satisfy realistic-fidelity comparison, picking, 3D navigation, SSR integration, or required viewport performance. No engine recommendation yet.

---

author: @root
created: 2026-11-03T13:56:00Z

---

The source handoff at docs/gemini-research-links.md includes engine-relevant model, rig, and aquarium references plus their verification limits. Keep the renderer comparison controlled and separate engine capability from asset/rig quality.

---

author: @fish-renderer
created: 2026-11-03 18:31

---

Official Khronos glTF Validator 2.0.0-dev.3.10 reports zero errors in both unchanged licensed candidate exports. Clown has two missing-tangent-space warnings plus one non-root skinned mesh warning; tang has five non-root skinned mesh warnings. These are compatibility/material caveats to inspect across engines, not proof of photorealism. Reports retained locally under /tmp/aq-{clown,tang}-validation.json. Upgrading controlled loader probe with root authorization; no production migration.

---

author: @root
created: 2026-11-03T18:33:00Z

---

A paid or unavailable model may guide visual research through publicly viewable previews, but it is not a tested engine asset. Use the same accessible owned/original/appropriately licensed models across engines for controlled tests; no purchase is required or authorized and no reuse rights are implied.

---

author: @root
created: 2026-11-03T18:34:00Z

---

Publicly accessible previews can guide engine research when a model cannot be tested. Use comparable accessible licensed assets for controlled engine tests; record the listing as reference-only and do not infer reuse rights from viewing it.

---

author: @Luna
created: 2026-11-03 19:59

---

Root completed the six corrected-reef browser cases. Babylon passed compatibility, identical pause/turn and real coral occlusion picking at both target viewports, with 25 draw calls and host interval medians/p95 of 16.9/24.9 ms laptop and 16.6/21.5 ms phone-emulated. The compared frames were visually comparable; no photoreal or performance winner. Keep Babylon a compatible candidate; recommend Three.js for the next integration candidate on project-fit grounds. No production migration. Verified ACs #1, #2, #4, #5, #6, #7 only; #3 remains open. Root review still required.

---

author: @render-integration
created: 2026-11-04 02:35

---

AC3 checked from combined evaluated engine/GLB animation proof, explicitly limited Mesh2Motion trial and selected-main profile/path/clip separation. No claim that Mesh2Motion successfully fits contrasting realistic fish or that Babylon has a production behavior adapter. Recommendation remains keep Babylon compatible, select Three on project fit; root retains finalization.

---

author: root
created: 2026-11-04T02:41:00Z

---

Root accepts the bounded Three.js engine/pipeline recommendation after controlled six engine/viewport cases and actual main integration. Articulated body/fin/tail clips, distinct profile-driven paths/turns, lighting/depth, native navigation and corrected alpha picking demonstrate pipeline capacity. All three engines work with the same assets; no fidelity/performance winner is claimed. Main integration remains separate AQ12/AQ34 work. Mesh2Motion evidence is a stylized unfitted Three export/load trial, not successful transfer across the realistic roster. Species fidelity, living coral, optics, habitat interactions and full-roster performance remain open.

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Selected Three.js on React/Vite/TanStack Start integration fit after comparing identical licensed animated fish and reef assets in Three.js, Babylon.js and PlayCanvas at both target viewports. Main integration demonstrates the chosen pipeline capacity; final photorealism and complete species/habitat behavior remain separate implementation tasks.
<!-- SECTION:FINAL_SUMMARY:END -->
