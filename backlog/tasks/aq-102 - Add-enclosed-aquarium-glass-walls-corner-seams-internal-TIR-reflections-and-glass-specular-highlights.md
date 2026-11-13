---
id: AQ-102
title: >-
  Add enclosed aquarium glass walls, corner seams, internal TIR reflections, and
  glass specular highlights
status: In Progress
assignee:
  - '@root'
created_date: '2026-11-12 05:15'
updated_date: '2026-11-13 00:44'
labels:
  - rendering
  - optics
  - photorealism
dependencies: []
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/aragonite-sand.ts
  - src/rendering/scene/underwater-optics.ts
  - AQ-80
  - AQ-39
  - AQ-70.12
  - docs/asset-evidence/aq70-13/taller-20261112/review.json
documentation:
  - docs/photorealism-reference.md
  - docs/photorealism-rubric.md
  - docs/rendering.md
  - docs/requirements.md
priority: high
type: enhancement
ordinal: 108000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Comparison between the photorealism reference images and the live WebGL build shows that the scene still reads as an unbounded underwater void rather than a physical, enclosed reef tank:

1. Physical tank boundaries and corner seams: The aragonite sand bed (`AragoniteSandBed` / `Aragonite_Sand_Bed`) and dark water backdrop currently appear to extend infinitely at the edges instead of being framed by front, left, right, and back glass planes with subtle vertical corner silicone/glass seams and a bottom glass lip framing the sand edge.
2. Side-wall internal reflections (TIR): Real viewing tanks exhibit faint mirrored total internal reflections of outer corals (such as the left Euphyllia/Acropora) and adjacent sand caustics along the interior left and right glass panes.
3. Front and side glass specular highlights: Subtle Fresnel grazing reflections and a faint diagonal glass sheen across the enclosure walls sell the physical glass barrier without introducing heavy front-pane glare that obscures fish or service links (keeping `AQ-39` / `AQ-80` readability constraints intact).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Front, left, right, and back glass planes visibly bound the aragonite sand bed and water volume with subtle vertical corner seams and a bottom glass lip framing the sand edge so neither sand nor dark backdrop extends infinitely
- [ ] #2 Interior left and right glass panels render faint mirrored total-internal-reflection (TIR) reflections of outer corals and sand caustics
- [ ] #3 Front and side glass walls layer subtle Fresnel grazing reflections and a faint diagonal glass sheen without obscuring fish, coral readability, or service pills/labels
- [ ] #4 Glass enclosure meshes disable pointer raycasting (`raycast = () => {}`) so fish hover, click-to-focus, and link activation are unaffected, and caustic/reflection motion freezes cleanly when paused or under `prefers-reduced-motion`
- [ ] #5 Verified visually at `402x874` and `1440x900` (DPR 1) alongside passing unit tests, typecheck, and production build
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implement the Root-approved GO as restrained tank enclosure only: (1) bound the water and aragonite bed with front/left/right/back planes, subtle corner seams, and a bottom glass lip; (2) add faint left/right interior reflections by mirroring actual outer reef and sand/caustic scene content, never painted silhouettes; (3) keep the front pane optically clear, using edge/grazing Fresnel highlight and faint diagonal sheen only—no full-frame blur, refraction, color veil, or scene-blocking glare; (4) set raycast to no-op on every glass mesh; (5) advance/freeze all glass reflection motion on the existing scene clock for active, pause, reduced-motion, and page-hidden states; (6) verify pointer/link behavior and the two required DPR1 viewports, plus scoped unit tests/typecheck/build.

Root next visual iteration after reviewed PR47: build a separate glass-enclosure scene module with clear front/back/side boundaries, corner seams and sand lip. Prototype real side-plane reflected scene content using the established Three reflector path at bounded resolution/tier/update cadence; compare against a no-reflection baseline before accepting costs or appearance. Exclude enclosure from reflection recursion, shaft depth occluders and picking; use shared paused/reduced/hidden scene clocks. Preserve all supplied models/Blender work. Verify both exact viewports and native link/focus controls; keep scene readability and overall reference fidelity as the acceptance gate, not mere mesh presence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12 Root product decision for AQ-80: GO for this restrained glass enclosure. AQ-102 is the implementation task. Preserve AQ-39's heavy-front-reflection prohibition and all fish/coral/link readability constraints. Side-pane reflection must be genuine mirrored outer reef/sand render content. No glass mesh may raycast. Follow the existing pause/reduced-motion/page-hidden scene clock. AQ-80 remains decision-only with no renderer edits.

Root first functional enclosure handoff: new glass-enclosure.ts builds clear front/back/side panes, four corner seams and bottom lip meshes, plus genuine Three Reflector side views sampling the current reef/sand scene. All enclosure meshes have no-op raycast and are excluded from shaft depth capture/reflection recursion. Front sheen is additive and extremely faint; no screen blur/refraction/color veil. Reflection targets256x384/noMSAA; High2Hz per side staggered, Balanced1Hz, Low off. Reflections are disabled while zoomed/tracking or in inspection macros to preserve focus readability and avoid camera-driven full-scene redraws. Cached clocks hold under pause/reduced/hidden; context restoration invalidates caches; exceptions restore target/XR/shadow/visibility and retain clear panes. Nine pass-level tests include real reflected camera callbacks, cache/camera/revision invalidation, stagger, picking suppression and resource cleanup;62 initial combined tests/typecheck14scripts pass. Native initial laptop/phone previews compile without warnings/errors, show seams and faint side content; bottom-lip framing, exact-source final controls/performance/reference review remain open. No models/Blender files changed.

Exact-source native enclosure/taller-colony handoff images at both target viewports are indexed by docs/asset-evidence/aq70-13/taller-20261112/review.json (sourcee5fd2e1). Full722tests/65files and productionbuild pass; no captured shader warnings/errors. Clear seams/panes render and links remain visible; do not mark Done yet: front bottom-lip framing and controlled moving-scene reflection cost/final art still require review.
<!-- SECTION:NOTES:END -->
