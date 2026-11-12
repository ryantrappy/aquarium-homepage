---
id: AQ-102
title: >-
  Add enclosed aquarium glass walls, corner seams, internal TIR reflections, and
  glass specular highlights
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-12 05:15'
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
