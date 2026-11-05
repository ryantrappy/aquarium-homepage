---
id: AQ-66
title: >-
  Optimize high-resolution fish thumbnails to WebP and handle texture load
  errors
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-05 18:32'
labels: []
dependencies: []
references:
  - src/lib/fish.ts
  - src/rendering/scene/fish-scale.ts
  - src/rendering/scene/alpha-picking.ts
documentation:
  - docs/code-review-findings.md
priority: high
type: enhancement
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Four species in public/fish/ (blue-green chromis, firefish, mandarin dragonet, and yellow watchman goby) are uncompressed 2048x2048 PNG files totaling 6.44 MB, compared to ~30-50 KB WebP files for the remaining species. In alpha-picking.ts, readArtworkAlpha allocates 16.7 MB in canvas buffers and 4.2 MB in typed arrays per high-res sprite. Furthermore, TextureLoader.load lacks an onError handler, leaving failed textures as silent untextured materials, and fish-scale.ts is missing length fractions for 12 species.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 15 fish thumbnails in public/fish/ are optimized WebP images under 75 KB each
- [ ] #2 Thumbnail references in REEF_FISH use consistent .webp file extensions
- [ ] #3 readArtworkAlpha memory footprint is bounded by downscaled image dimensions
- [ ] #4 SPRITE_ARTWORK_LENGTH_FRACTION in fish-scale.ts contains measured values for all catalog species
- [ ] #5 TextureLoader in aquarium.ts includes an onError callback that handles missing or failed textures gracefully
- [ ] #6 Existing asset-contract and catalog tests pass with the optimized thumbnails
<!-- AC:END -->
