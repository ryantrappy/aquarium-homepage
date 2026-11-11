---
id: AQ-99
title: >-
  Configure tiered vertical fish swimming depth zones for surface schooling,
  mid-water cruising, and benthic perching
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-11 04:57'
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
- [ ] #1 Surface schooling fish (Chromis, Anthias) populate and cruise the upper water column and light shafts
- [ ] #2 Mid-water cruisers (Tangs, Butterflyfish) navigate the vertical column around the central spire and swim-through channels
- [ ] #3 Bottom and perching dwellers (Blennies, Gobies, Dragonets) occupy lower rock ledges, caves, and substrate sand zones
- [ ] #4 Species depth distribution passes look-dev verification at 1440x900 and 402x874 without fish clipping rock geometry or clustering on a single plane
- [ ] #5 Service link interaction, label projection, and pause/reduced-motion handling remain fully intact across all depth tiers
<!-- AC:END -->
