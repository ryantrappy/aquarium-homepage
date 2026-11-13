---
id: AQ-86
title: Add restrained aquarium-scale depth haze and volumetric light shafts
status: In Progress
assignee:
  - '@root'
created_date: '2026-11-08'
updated_date: '2026-11-13 05:44'
labels:
  - optics
  - photorealism
  - rendering
dependencies:
  - AQ-39
  - AQ-14.6
  - AQ-70.6
references:
  - src/rendering/scene/underwater-optics.ts
  - src/rendering/scene/aquarium.ts
  - AQ-39
  - AQ-14.6
  - AQ-70.6
  - docs/asset-evidence/aq86/compositing-20261112/review.json
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 93000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Give the tank visible depth with a restrained haze that starts behind the primary fish swimming volume and soft volumetric light shafts descending from the surface, without open-ocean fog, a blue veil, or a dark vignette. The graded background and the background/sand seam are covered by AQ-39, AQ-14.6, and AQ-70.6; this task adds only the missing fog/vignette-adjacent depth cues, constrained by the standing forbids: AQ-39 §1.1 rejects open-ocean fog, AQ-14.6 AC #3 forbids an open-ocean vignette, and AQ-14.2 AC #4 forbids blur/vignette/dark overlay. Unless Ryan/Root explicitly amend AQ-39, AQ-14.6 AC #3, and AQ-14.2 AC #4, no open-ocean fog, blue veil, blur, or dark vignette may be added under this task. (Video-review finding, 2026-11-08: the tank reads flat, with no depth haze and a hard horizontal background/sand seam.)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Haze is visible in the rear water column / graded background, starts behind the primary fish volume (z < -1.5), and leaves foreground and mid-tank fish colours un-veiled at 1440x900 and 402x874
- [ ] #2 Soft volumetric shafts descend from the surface, weaken with depth, freeze under pause / reduced motion / page-hidden, and never flicker
- [ ] #3 No open-ocean fog, blue veil, blur, or dark vignette is added; any vignette decision is recorded with amended ACs in AQ-39, AQ-14.6, and AQ-14.2 first
- [ ] #4 The hard horizontal background/sand seam is gone at 1440x900 and 402x874, verified in look-dev captures
- [ ] #5 No frame-time regression at either viewport; Root reviews the captures before Done
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Root renderer correction: verify the existing shaft offscreen/additive blend path against Three WebGLState, remove repeated alpha attenuation so soft shaft radiance survives compositing, and preserve exact motion/depth/tier contracts. Cover the actual pass materials/render-state restoration, then compare native fixed-pose scenes at both target viewports before tuning intensity. Keep haze/seam and measured-budget acceptance open until separately demonstrated.

Root rear-seam iteration: compare settled native two-size views, then replace generic lateral sand darkening with bounded rear-wall contact illumination falloff. Preserve warm foreground, sharp grain geometry, water clarity and current substrate work. Verify actual shader compilation/captures before acceptance; no blur, full-frame vignette, model or navigation changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root renderer correction2026-11-12: Three WebGLState confirms normal offscreen blending and straight-alpha additive compositing were multiplying already-weighted shaft radiance by alpha again. Store shaft radiance with NoBlending, composite premultiplied ONE/ONE, and use the same premultiplied convention for the fallback plane. Raymarch now starts behind front glass z2.8 and stops at depth/rear glass z-5.5, skipping samples above the actual surface or below substrate rather than lighting the air before the tank. Restored shared surfaceY3.75 for rendered surface/shaft/caustic projection (visible surface had drifted from the old2.66 projection constant). Added pass-level material/state regressions covering depth and both shaft-draw exceptions.66 focused tests and typecheck14script checks pass. Native final-pose art/seam/budget gates remain open; no Done claim.

Root native review of35581ed at both exactDPR1 sizes saved under docs/asset-evidence/aq86/compositing-20261112/. All current assets ready, no captured shader warnings/errors. Soft overhead light now survives blending, foreground objects stay sharp; hard rear-sand seam remains visibly unresolved, and full reference-level shaft shape/freeze/budget acceptance is not claimed. Keep task open.

Root native trial softens the bright floor/rear-wall cut with substrate-only contact illumination over the final0.95display units, retaining sharp warm foreground grains. Removed the old arbitrary lateral sand vignette. No geometry, fish/navigation, full-frame overlay or blur changes.18sand/caustic tests pass; exact-source final captures and shader-log review follow. This is a functional/art iteration handoff, not full shaft/freeze/performance acceptance.
<!-- SECTION:NOTES:END -->
