---
id: AQ-38
title: Evaluate Babylon.js for photorealistic reef and animated fish rendering
status: In Progress
assignee:
  - '@fish-renderer'
created_date: '2026-11-03T04:49:00Z'
updated_date: '2026-11-03 19:01'
labels: []
dependencies: []
references:
  - 'https://www.babylonjs.com/'
  - >-
    https://doc.babylonjs.com/features/featuresDeepDive/animation/animationRetargeting
  - >-
    https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/IBLShadowsRenderingPipeline/
  - 'https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF'
  - 'https://doc.babylonjs.com/lite/typedoc/functions/createNavMesh'
  - AQ-5
  - AQ-34
  - AQ-35
  - AQ-37
  - 'https://playcanvas.com/'
  - 'https://threejs.org/'
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
- [ ] #1 Babylon.js is evaluated against AQ-5's renderer candidate and the existing implementation using the same controlled fish and reef assets, with an inspectable isolated proof/review artifact.
- [ ] #2 The review records evidence and limits for reef PBR materials, lighting, caustics, water clarity, depth occlusion, and fish realism; engine feature claims are not treated as proof that the output is photorealistic.
- [ ] #3 The proof evaluates full body, fin, and caudal motion using skeletal/skinned animation, morph targets, or procedural deformation as appropriate; glTF/GLB loading and Mesh2Motion export compatibility; and integration with AQ-35 species behavior profiles without conflating behavior paths with deformation clips.
- [ ] #4 Fish obstacle avoidance and navigation to typed habitat anchors are tested or bounded with explicit evidence; the review does not presume that surface navmesh navigation solves free-swimming 3D movement.
- [ ] #5 Service link picking respects occluders, and React/TanStack Start TypeScript integration addresses component lifecycle, SSR, and browser-only canvas creation.
- [ ] #6 Performance evidence is reported at only 402x874 and 1440x900, and the final recommendation says adopt, adapt, reject, or keep the current approach with rationale and limitations.
- [ ] #7 The task makes a candidate-engine recommendation only; no production renderer migration is performed as part of this investigation.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Build an isolated loader experiment using the same CC0-derived Mesh2Motion clownfish GLB and swim clip in Three.js, Babylon.js and PlayCanvas, with comparable camera and lighting. 2. Verify loading, pause and clip playback and document visible differences and integration limits; label this stylized sample a technical proxy, not the required realistic fish and reef comparison. 3. Continue the full candidate comparison only when suitable licensed realistic fish and habitat are available; measure performance at the two specified viewports before any recommendation.

4. Preserve the two current licensed rigged candidates pending root anatomy review; load those identical GLBs in all three engines with fixed camera, pixel ratio, pause and 45-degree turns. Add an explicitly primitive depth/picking test and document light/color calibration limits; resolve loader failures before visual or performance conclusions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Controlled technical baseline now loads the same licensed two-species rigs in all three engines; source GLBs unchanged. Actual IAB1440x900/402x874 checks pass loading, motion, 45-degree turns, pause freezes and primitive nearest-occluder picking. Repeat Babylon pause after unexpected page reset passed. Current direct-light gray-PBR fixture matches Three/Babylon mean linear0.23974; PlayCanvas exposure0.30 measures0.23717 (~1.1% lower), upper/lower fixture patches within~5%. Added explicit client-only React/TanStack Start lifecycle and independent behavior/navigation plan in docs/rendering.md. Actual CC BY4.0 VIVID REALITY reef scan downloaded officially by root;100k/1K shared LOD processing underway. Mac locked: no further browser work until user confirms unlock. No engine fidelity winner, final performance result or production migration claimed.
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
<!-- COMMENTS:END -->
