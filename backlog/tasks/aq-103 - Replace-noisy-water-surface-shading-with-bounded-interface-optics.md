---
id: AQ-103
title: Replace noisy water-surface shading with bounded interface optics
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-13 05:41'
updated_date: '2026-11-13 06:04'
labels:
  - rendering
  - optics
dependencies: []
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/surface-waves.ts
  - src/rendering/scene/glass-enclosure.ts
documentation:
  - docs/requirements.md
  - docs/rendering.md
type: bug
ordinal: 140000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The water-surface plane in aquarium.ts reads as stretched static due to cellular highlights, high-frequency stripe interference, saturated reef colors across the ceiling, tilted extent, and abrupt clipping. The requested underwater-view air-water interface uses continuous wave facets with a softened Snell-window/TIR transition, overhead-fixture transmission through steeper facets, restrained coral bounce only in the grazing rear region, a seamless rear fade, and a thin front-glass meniscus. This is a focused surface-rendering slice, separate from AQ-39’s broader underwater attenuation, coral fluorescence, and glass-optics work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The water plane remains horizontal at the configured surfaceY and its geometry and shader bounds match the current glass front/rear/half-width in narrow and desktop layouts, including responsive layout changes.
- [ ] #2 The cellular-dot and high-frequency stripe surface pattern is replaced by continuous canonical wave/capillary facets, a softened Snell-window/TIR transition, restrained rear grazing-angle coral reflection, and overhead-fixture transmission.
- [ ] #3 Surface alpha blends into the rear background, fades at sides, and shows a thin meniscus inside the front-glass boundary without extending beyond the enclosure.
- [ ] #4 Shared animation time still freezes for pause/reduced-motion/hidden states, and non-interactive raycast and resource disposal behavior are preserved.
- [ ] #5 Requirements and active rendering documentation describe the revised interface; AQ-39’s conflicting older interface proposal is explicitly superseded for this focused surface work.
- [ ] #6 Focused tests cover both enclosure layouts, shader structure, time/uniform behavior, and disposal; typecheck/build pass, with visual checks at 402×874 and 1440×900 when a usable browser is available.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract a water-surface component that derives geometry and shader bounds from glassEnclosureLayout and uses the canonical SURFACE_WAVE_GLSL plus smooth, distance-filtered capillary slopes.
2. Replace the cellular/stripe material in aquarium.ts and retain the shared frozen environment time, responsive bounds, reflection/depth exclusions, raycast behavior, and disposal.
3. Add focused tests for shader behavior, narrow/desktop geometry bounds, layout updates, uniform time, and resource lifecycle.
4. Update requirements and active rendering documentation, and record the scoped supersession in AQ-39 through the Backlog CLI.
5. Run focused surface/wave/enclosure/lifecycle tests, typecheck, and production build; review the two required browser viewports if a usable local browser is available.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root reviewed Junie implementation and Luna read-only integration audit. Luna added actual-controller water-clock regression observing live mesh uniform across active/pause/reduced/hidden/resume;33lifecycle tests pass. Initial isolated snapshot full740tests/66files and typecheck14scripts pass. After subsequent shader-only tuning,55focused surface/wave/enclosure/lifecycle tests pass; final typecheck/build and native two-size source-pinned captures follow. No asset/Blender files changed by Root, and no final meniscus visibility/AC/Done claim yet. Preserve separate AQ58fallback helper work and dirty native reef source.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-13 06:01
---
Root review2026-11-13: initial native laptop/phone preview of extracted surface has no captured shader warnings/errors and visibly removes dense cellular/static pattern. Luna added actual-controller surface-clock regression in aquarium-lifecycle.test.ts;33lifecycle tests and isolated full740tests/66files/typecheck pass for first snapshot. Current shader/test have since been tuned by concurrent author; Root will refresh to final hashes before acceptance. Front-glass meniscus lies outside the normal overview frustum at current camera/surfaceY, so do not infer visible-front-line acceptance from overview screenshot alone. No Done/AC changes yet; native final-source evidence pending.
---
<!-- COMMENTS:END -->
