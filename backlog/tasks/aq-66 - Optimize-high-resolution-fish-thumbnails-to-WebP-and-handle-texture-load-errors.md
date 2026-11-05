---
id: AQ-66
title: >-
  Optimize high-resolution fish thumbnails to WebP and handle texture load
  errors
status: Done
assignee:
  - '@Luna'
created_date: '2026-11-05 18:32'
updated_date: '2026-11-05 21:18'
labels: []
dependencies: []
references:
  - src/lib/fish.ts
  - src/rendering/scene/fish-scale.ts
  - src/rendering/scene/alpha-picking.ts
  - src/rendering/scene/alpha-picking.test.ts
  - src/rendering/scene/fish-scale.test.ts
  - src/lib/fish.test.ts
  - src/components/ServiceManager.test.tsx
documentation:
  - docs/asset-evidence/aq66/review.json
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
- [x] #1 All 15 fish thumbnails in public/fish/ are optimized WebP images under 75 KB each
- [x] #2 Thumbnail references in REEF_FISH use consistent .webp file extensions
- [x] #3 readArtworkAlpha memory footprint is bounded by downscaled image dimensions
- [x] #4 SPRITE_ARTWORK_LENGTH_FRACTION in fish-scale.ts contains measured values for all catalog species
- [x] #5 TextureLoader in aquarium.ts includes an onError callback that handles missing or failed textures gracefully
- [x] #6 Existing asset-contract and catalog tests pass with the optimized thumbnails
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Convert the four 2048px PNG thumbnails to optimized, alpha-preserving WebP and update catalog references plus asset provenance hashes. 2. Bound alpha-mask decoding to a documented maximum dimension and update focused tests. 3. Add measured alpha-visible fractions for all 15 catalog species in fish-scale.ts, preserving concurrent model-axis entries. 4. Add graceful artwork texture load failure handling in aquarium.ts, preserving concurrent model URL entries. 5. Run focused asset/catalog and alpha-picking checks; report only acceptance criteria supported by objective evidence for Root review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05: Began AQ-66 under scoped ownership. Root approved only a narrow alpha-fraction map insertion in fish-scale.ts and artwork TextureLoader callback/error fallback in aquarium.ts; preserve concurrent splat model changes. Root review and commit required; do not mark Done.

2026-11-05 progress: converted the four source PNGs to alpha-preserving 600px WebP (24,990–57,184 bytes each), archived originals byte-for-byte at docs/asset-evidence/aq66/originals/, updated hashes/catalog/docs, and recorded all 15 measured alpha-visible width fractions in the provenance manifest. Alpha masks are proportionally downscaled to a maximum 512px dimension (worst-case canvas 1 MiB RGBA plus 256 KiB retained alpha). Failed texture recovery removes the sprite from scene and hit list, releases its mask/texture, and exposes the native label; focused test covers helper behavior. Verified: 6 files / 33 tests passed (asset contract, manifest checker, catalog, scale, alpha picking, ServiceManager); npm run typecheck and git diff --check pass. Criteria 1,2,3,4,6 have objective evidence. Criterion 5 remains unchecked pending Root review of TextureLoader callback integration; no task completion, staging, or commit by this worker.

2026-11-05 Root independent acceptance: dwebp PAM decoding reproduces all15 alpha-visible width fractions; every WebP under75000bytes (max65764), total630998bytes. Four archived PNGs match Git original SHA256 byte-for-byte. Isolated reviewed snapshot excluding concurrent modelURL/axis and later player/shader work passes43files/372tests with bounded2workers and30second geometry/CLI fixture allowance, typecheck and production build. Native production5194 at402x874 scale1: blocking blue-tang.webp leaves scene ready and exposes Ombi native label/tabIndex0/aria-hiddenfalse with explicit thumbnail-unavailable accessible name/title; Enter opens real Ombi login. Unblocking/reload yields decoded positive-width images for all15 picker species. Temporary block/cache/viewport restored and tabs closed. Evidence:docs/asset-evidence/aq66/review.json and thumbnail-failure-phone.png. Root required iteration fixed initially hidden failed-image link; no final fish-art/animation acceptance.

Root screenshot correction2026-11-05: replaced clipped JPEG returned by generic screenshot API with actual402x874 PNG (signature and IHDR verified), captured via CDP exact clip/metric scale1 after awaiting the real failed-thumbnail label. Temporary block/cache/metrics cleared and own tab closed. Runtime keyboard activation evidence unchanged; captureCorrection documents the replacement.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Optimized four oversized thumbnails to WebP while archiving original PNG bytes, measured all15 artwork fractions, bounded alpha buffers to512px and kept failed-texture service labels usable. Root verified independent decode/hash measurements,372tests/typecheck/build and real blocked-image native keyboard activation; all15 picker thumbnails load after recovery. Evidence:docs/asset-evidence/aq66/review.json.
<!-- SECTION:FINAL_SUMMARY:END -->
