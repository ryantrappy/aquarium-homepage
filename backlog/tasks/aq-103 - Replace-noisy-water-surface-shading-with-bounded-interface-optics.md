---
id: AQ-103
title: Replace noisy water-surface shading with bounded interface optics
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-13 05:41'
updated_date: '2026-11-13 06:19'
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
- [x] #1 The water plane remains horizontal at the configured surfaceY and its geometry and shader bounds match the current glass front/rear/half-width in narrow and desktop layouts, including responsive layout changes.
- [ ] #2 The cellular-dot and high-frequency stripe surface pattern is replaced by continuous canonical wave/capillary facets, a softened Snell-window/TIR transition, restrained rear grazing-angle coral reflection, and overhead-fixture transmission.
- [ ] #3 Surface alpha blends into the rear background, fades at sides, and shows a thin meniscus inside the front-glass boundary without extending beyond the enclosure.
- [x] #4 Shared animation time still freezes for pause/reduced-motion/hidden states, and non-interactive raycast and resource disposal behavior are preserved.
- [x] #5 Requirements and active rendering documentation describe the revised interface; AQ-39’s conflicting older interface proposal is explicitly superseded for this focused surface work.
- [x] #6 Focused tests cover both enclosure layouts, shader structure, time/uniform behavior, and disposal; typecheck/build pass, with visual checks at 402×874 and 1440×900 when a usable browser is available.
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

2026-11-13 Junie implementation handoff:
- Extracted the water interface into createWaterSurface; aquarium.ts now supplies shared time, updates bounds with glassEnclosureLayout, retains the non-interactive mesh, and disposes its resources. The shader uses the canonical wave field, lower distance-filtered capillary/macro slopes, softened Snell-window/TIR, bounded fixture transmission, restrained rear/mid coral bounce, backdrop fade, and a thin front-edge meniscus.
- AC #1 evidence: water-surface.test.ts verifies exact desktop/narrow plane dimensions, level placement, shader bounds, and geometry replacement on setLayout; aquarium.ts updates the surface alongside glassEnclosure on layout changes.
- AC #4 evidence: aquarium-lifecycle.test.ts actual-controller test exercises active, pause, reduced-motion, and hidden behavior; water-surface.test.ts covers raycast exclusion, time updates, and idempotent disposal.
- AC #5 evidence: docs/requirements.md and docs/rendering.md describe the revised interface; AQ-39 received a CLI comment that supersedes only its surface-interface proposal while preserving broader optics work.
- AC #6 evidence: npm test -- src/rendering/scene/water-surface.test.ts src/rendering/scene/surface-waves.test.ts src/rendering/scene/glass-enclosure.test.ts src/rendering/scene/aquarium-lifecycle.test.ts (55 passed); npm run typecheck passed (14 scripts checked); npm run build passed. Headless Chrome captures were inspected at exact 402x874 and 1440x900 pixel sizes.
- Root review remains requested before completion. AC #2 and #3 are intentionally unchecked: the overview captures do not clearly expose the front meniscus, and the final visual surface/reflection balance still needs Root judgment. Chrome emitted macOS CVDisplayLink/GPU mailbox warnings and Vite logged a generic root-route notFound warning; screenshots rendered the aquarium, and no shader compilation error was visible in the captured output. Changes remain uncommitted per AGENT_TASKS.md; unrelated Blender, reef-navigation, AQ-58, and AQ-82 work was preserved.

Root exact-sourcea5e64a2 native1440x900/402x874DPR1 evidence under docs/asset-evidence/aq103/interface-20261113/: all assets ready, zero captured consolewarnings/errors, visible bounded smooth facets replacing static/dots/stripes, all service links retained.55focused tests/4files, finaltypecheck14scripts and productionbuild pass. Actualcontroller clock proves active/paused/reduced/hidden/resume behavior; disposedgeometry/material and noninteractive raycast tests pass. Root acceptsAC1/4/5/6. AC2retains fixture-transmission/finalcontrast art check; AC3frontmeniscus lies outside overview frustum and still needs targeted framing review. Do not markDone from a hidden meniscus or shader-marker tests. No Root Blender/asset edits; exactsource proof excludes ongoingAQ58fallback changes.

2026-11-13 Root review update: implementation commit a5e64a2 and native two-size review/evidence commit 1f25f9a are now in HEAD. Root accepts AC #1/#4/#5/#6; AC #2 still needs fixture-transmission/final-contrast review and AC #3 needs targeted front-meniscus framing. This supersedes the earlier Junie note that described the pre-review working-tree state. AQ-103 remains In Progress; do not mark Done until the open visual gates are reviewed.

Root2026-11-13 checkpoint: native final-sourcea5e64a2 evidence and later combinedd862bf9 source both load at the two exacttargetviewports without captured warnings/errors. Combined source passes748tests/66files/typecheck14scripts/build. Previous Junie/headless warnings remain historical environment observations, not present in Root native captures. OpenAC2/3 remain unchanged; no Done claim.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-13 06:01
---
Root review2026-11-13: initial native laptop/phone preview of extracted surface has no captured shader warnings/errors and visibly removes dense cellular/static pattern. Luna added actual-controller surface-clock regression in aquarium-lifecycle.test.ts;33lifecycle tests and isolated full740tests/66files/typecheck pass for first snapshot. Current shader/test have since been tuned by concurrent author; Root will refresh to final hashes before acceptance. Front-glass meniscus lies outside the normal overview frustum at current camera/surfaceY, so do not infer visible-front-line acceptance from overview screenshot alone. No Done/AC changes yet; native final-source evidence pending.
---
<!-- COMMENTS:END -->
