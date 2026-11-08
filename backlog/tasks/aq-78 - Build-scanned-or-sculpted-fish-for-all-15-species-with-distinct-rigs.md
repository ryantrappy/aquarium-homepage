---
id: AQ-78
title: Build scanned or sculpted fish for all 15 species with distinct rigs
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T06:30:00Z'
labels:
  - modeling
dependencies:
  - AQ-5
  - AQ-40
  - AQ-70
documentation:
  - docs/rendering.md
  - docs/fish-assets.md
priority: '5'
type: feature
ordinal: 78
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Even the Blender-built fish are procedural sculptures; the photorealism ceiling is a scanned or reference-sculpted model per species with its own locomotion rig. AQ-37 established that one shark template cannot serve 15 distinct locomotion patterns (labriform tangs, hovering cardinalfish, benthic dragonet, burrow fish, and others). Build scanned or reference-sculpted fish for all 15 species, each with a species-correct rig, closed anatomy, proper UV/materials, and independent eyes/mouth/gills/fin attachments. Keep the $0 asset policy: only CC0 / CC-BY-4.0 or custom-made assets, with attribution and provenance recorded.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 15 species have a scanned or reference-sculpted model with species-correct anatomy, UVs, and materials
- [ ] #2 Each species has its own locomotion rig matched to its gait (labriform, subcarangiform, hovering, benthic, and others)
- [ ] #3 Models pass the asset contract (reef-asset-v1) with license, source, creator, hash, and attribution recorded
- [ ] #4 Models are Root-reviewed for visual acceptance before runtime promotion; no automatic swap
<!-- AC:END -->
