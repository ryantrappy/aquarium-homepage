---
id: AQ-40
title: Create a verified real-time biological asset pipeline
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03 12:33'
updated_date: '2026-11-03 19:03'
labels: []
dependencies:
  - AQ-5
references:
  - docs/gemini_planning.md
  - docs/reef_aquarium_all_code.md
documentation:
  - docs/gemini-research-links.md
priority: high
type: task
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fish and corals need anatomically credible, reusable assets with provenance and browser-size budgets. The reference suggests scanning, modeling, baking and glTF optimization, but source rights and individual tools must be assessed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Document source and license, attribution requirements, source files, and reproducible export process for every production biological asset.
- [ ] #2 Establish and demonstrate a Blender-to-glTF pipeline for geometry, materials, rigs and texture baking using an appropriately licensed or original specimen.
- [ ] #3 Measure before-and-after geometry, texture and transfer costs; test optimization choices and visual quality in the selected renderer at both target viewports.
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T18:33:00Z
---
Paid or unavailable listings may still serve as publicly viewable visual guidance; no purchase is required or authorized. The production asset pipeline must use accessible assets with verified sources and licenses; a reference listing does not grant reuse rights or count as an inspected/imported asset.
---

author: @root
created: 2026-11-03T18:34:00Z
---
Publicly accessible previews can guide asset research when cost or download access prevents testing. Record the listing as reference-only; use accessible assets with verified sources and licenses for implementation and tests. Viewing grants no reuse rights.
---

author: @Luna
created: 2026-11-03 19:03
---
Read-only pipeline audit (no renderer files changed). Good provenance is recorded for the two Sketchfab CC BY 4.0 fish and the reef scan: creator/source/license, source SHA-256, and modification notes are present in ASSET_NOTICES.md. Concrete reproducibility gaps: (1) candidate-real-clown.glb and candidate-real-tang.glb are ignored symlinks to /tmp/aq-authored-clown.glb and /tmp/aq-authored-tang.glb; they exist only on this machine, so a clean checkout cannot run the viewer or validator. The downloaded source GLBs are external as well: hashes and source links are recorded, but there is no checked-in acquisition/checksum step or durable source/output artifact location. (2) The fish rig script preserves the downloaded textures and adds approximate rigs/geometry, but does not bake textures. The original modeling scripts are separate prototypes: the clown uses a supplied raster skin and exports with animation disabled; the tang is solid-color material, also with animation disabled. This does not demonstrate the requested geometry/material/rig/texture-bake export pipeline. (3) Source triangle/texture metadata and validator results are documented, but output GLB byte sizes and before/after geometry/texture budgets are not preserved in the repo; validation reports live under /tmp. The reef notice says derivative counts/error/size are in docs/rendering.md, but that document currently has no reef derivative metrics. prepare-reef.py prints triangles, sampled geometric error, bounds, and texture dimensions but no output hash or file size. (4) Recorded technical risks remain: clown normal maps lack exported tangents and source shading is baked; the tang required authored pectoral geometry because the source has no discernible independent pectorals; the reef scan has baked underwater lighting, open edges/underside, and downsampled texture detail. Suggested repeatable checkpoint: a source/output manifest with exact acquisition hashes, Blender/tool versions, arguments, generated hashes/sizes/triangle and texture counts, and validation report stored with the licensed artifact outputs. AQ-5 engine selection and production selection remain pending.
---
<!-- COMMENTS:END -->
