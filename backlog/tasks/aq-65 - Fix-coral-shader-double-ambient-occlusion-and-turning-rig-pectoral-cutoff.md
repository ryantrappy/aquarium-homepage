---
id: AQ-65
title: Fix coral shader double ambient occlusion and turning rig pectoral cutoff
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-05 18:32'
labels: []
dependencies: []
references:
  - src/rendering/scene/coral-material.ts
  - src/rendering/scene/fish-turning.ts
  - src/rendering/scene/motion.ts
documentation:
  - docs/code-review-findings.md
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
- [ ] #1 Coral fragment shader applies contact AO only through aomap_fragment light attenuation without pre-multiplying diffuseColor
- [ ] #2 GPU coral crevice shading visually matches the single-pass attenuation curve defined in evaluateCoralContactAoFactor
- [ ] #3 applyFishTurningRigOverlay continues updating pectoral fin flare and pitch angles until pectoral offsets settle, even after spine bend reaches zero
- [ ] #4 Falling back to chord navigation does not cause a single-frame instantaneous yaw angle snap
- [ ] #5 Unit tests verify shader uniform bindings and pectoral recovery transitions
<!-- AC:END -->
