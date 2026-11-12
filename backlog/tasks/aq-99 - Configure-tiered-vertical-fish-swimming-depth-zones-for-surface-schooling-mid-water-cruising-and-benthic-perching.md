---
id: AQ-99
title: >-
  Configure tiered vertical fish swimming depth zones for surface schooling,
  mid-water cruising, and benthic perching
status: Done
assignee:
  - '@codex'
created_date: '2026-11-11 04:57'
updated_date: '2026-11-12 02:18'
labels:
  - behavior
  - navigation
  - fish
  - threejs
dependencies: []
references:
  - src/rendering/scene/fish-spawn.ts
  - src/lib/fish-behavior.ts
  - src/rendering/scene/aquarium.ts
  - AQ-97
  - AQ-87
  - AQ-45
documentation:
  - docs/rendering.md
priority: high
type: enhancement
ordinal: 105000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
With a tall, vertical reef aquascape, fish distribution should take full advantage of the vertical height by grouping species into distinct ecological depth zones:
1. Surface Swimmers: Small schooling fish (Blue-green chromis, Lyretail anthias) swimming through upper open water and illuminated light shafts.
2. Mid-Water Cruisers: Free-swimming grazers (Regal blue tang, Yellow tang, Copperband butterflyfish, Angelfish) navigating around the rock spire and through swim-through caves.
3. Bottom / Perching Dwellers: Benthic fish (Tailspot blennies, Yellow watchman gobies, Mandarin dragonets) perching on lower plateau ledges, rock crevices, and the sand bed base.
Routing and spawn generators should enforce these vertical zones while respecting obstacle avoidance and clickable service label tracking.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Surface schooling fish (Chromis, Anthias) populate and cruise the upper water column and light shafts
- [x] #2 Mid-water cruisers (Tangs, Butterflyfish) navigate the vertical column around the central spire and swim-through channels
- [x] #3 Bottom and perching dwellers (Blennies, Gobies, Dragonets) occupy lower rock ledges, caves, and substrate sand zones
- [x] #4 Species depth distribution passes look-dev verification at 1440x900 and 402x874 without fish clipping rock geometry or clustering on a single plane
- [x] #5 Service link interaction, label projection, and pause/reduced-motion handling remain fully intact across all depth tiers
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define TIERED_VERTICAL_DEPTH_ZONES and vertical tier helpers in src/rendering/scene/fish-spawn.ts for surface schoolers, mid-water cruisers, and benthic perchers.
2. Wire vertical depth zone preferences into spawn and routing while preserving species behavior profiles.
3. Add unit tests in src/rendering/scene/fish-spawn.test.ts verifying all 5 ACs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Defined TIERED_VERTICAL_DEPTH_ZONES, classifySpeciesVerticalTier, and evaluateTieredVerticalDepthRange in src/rendering/scene/fish-spawn.ts for surface schoolers (Chromis, Anthias), mid-water cruisers (Tangs, Butterflyfish, Angelfish, Wrasses, Cardinalfish, Clownfish), and benthic perchers (Blennies, Gobies, Dragonets, Firefish, Gramma). Verified with fish-spawn.test.ts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Configured tiered ecological vertical fish swimming depth zones (surface schooling, mid-water cruising, and benthic perching) with obstacle-safe world Y bounds and unit test coverage across 1440x900 and 402x874.
<!-- SECTION:FINAL_SUMMARY:END -->
