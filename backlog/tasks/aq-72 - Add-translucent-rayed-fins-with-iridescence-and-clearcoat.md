---
id: AQ-72
title: Add translucent rayed fins with iridescence and clearcoat
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T06:30:00Z'
labels:
  - modeling
dependencies:
  - AQ-12
  - AQ-70
documentation:
  - docs/rendering.md
  - docs/fish-assets.md
priority: '2'
type: feature
ordinal: 72
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fish fins are currently opaque bone-flared membranes with no ray structure, and fish materials use stock GLTF PBR only. Add translucent, rayed fins and iridescent / clearcoat fish materials: KHR_materials_iridescence (guanine n approx 1.83), KHR_materials_transmission / volume for fins, and KHR_materials_clearcoat mucus (n approx 1.35). Fins should be translucent with visible rays; scales should shimmer with angle-dependent colour at close range.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pectoral, dorsal, anal and caudal fins are translucent with visible ray structure on the promoted fish models
- [ ] #2 Iridescence is visible and angle-dependent on species that have it, without looking like a rainbow overlay
- [ ] #3 Clearcoat mucus sheen is present on fish bodies and does not wash out base colours
- [ ] #4 Fin materials are verified at 1440x900 and 402x874, with click targets and occlusion unchanged
<!-- AC:END -->
