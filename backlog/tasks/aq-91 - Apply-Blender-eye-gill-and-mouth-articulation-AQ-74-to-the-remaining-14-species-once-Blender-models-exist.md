---
id: AQ-91
title: >-
  Apply Blender eye, gill, and mouth articulation (AQ-74) to the remaining 14
  species once Blender models exist
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-09T03:04:00Z'
updated_date: '2026-11-21 14:54'
labels:
  - modeling
  - photorealism
  - animation
dependencies:
  - AQ-74
  - AQ-78
references:
  - scripts/build-splat-fish-glbs.mjs
  - scripts/sync-blender-override.mjs
  - src/rendering/scene/fish-flex-material.ts
  - src/rendering/assets/splat-fish/blend/blue-tang.blend
  - AQ-74
  - AQ-78
documentation:
  - docs/rendering.md
  - docs/fish-assets.md
priority: '3'
type: enhancement
ordinal: 97000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AQ-74 implements 3D convex cornea eyes, sculpted operculum (gill-cover) relief, mouth contour/articulation, and swim-synchronized buccal-opercular ventilation on the Regal Blue Tang (blue-tang, which currently has a dedicated Blender workfile in src/rendering/assets/splat-fish/blend/blue-tang.blend and override in overrides/blue-tang.glb). Once the remaining 14 reef fish species receive dedicated Blender models (AQ-78 / AQ-70.9 / AQ-70.10), apply species-accurate Blender eye domes, operculum relief, and mouth articulation to each of those 14 species, save their packed .blend files to src/rendering/assets/splat-fish/blend/<species>.blend, export their overrides/<species>.glb files, sync via node scripts/sync-blender-override.mjs --learn-guide, and commit all artifacts to Git.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each of the remaining 14 species has a saved .blend workfile in src/rendering/assets/splat-fish/blend/<species>.blend and exported override in src/rendering/assets/splat-fish/overrides/<species>.glb with sculpted convex cornea eyes, operculum relief, and species-appropriate mouth geometry.
- [ ] #2 Close-up studio renders verify eye shine/pupil clarity, operculum contour relief, and natural mouth proportions for each species.
- [ ] #3 Swim-synchronized gill and mouth ventilation works across all 15 species without breaking scripts/verify-fish-clip-player.mjs, splat-fish-contract.test.ts, or pause/reduced-motion behavior.
- [ ] #4 All .blend workfiles, overrides/*.glb, src/rendering/assets/splat-fish/*.glb, inspection reports, and manifest.json are synced and committed to Git.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-21 Batch 1 Fish Eye/Gill/Mouth Sculpting & Biological PBR Pipeline (AQ-91): Added safe --fish-overrides sync dispatch in scripts/sync-blender-override.mjs (preserving AQ-107 blue-green-chromis and learned-shape-guide.json byte-for-byte) and reusable Blender 5.2.3 LTS anatomical sculpting & 512x512 24-bit RGB PNG PBR map generator in src/rendering/modeling/fish_head_sculpt_common.py (convex glossy cornea dome + orbital rim, curved operculum gill cover + recessed gill slit, species-specific buccal mouth lips/cleft, fine ctenoid scales, lateral line, and fin rays). Authored, rendered in Cycles, synced, and verified Batch 1 (3 species): flame-angelfish (999,592 B, 11,664 tris), copperband-butterflyfish (966,924 B, 10,306 tris), and banggai-cardinalfish (886,908 B, 7,076 tris). Saved uncompressed .blend files + textures under src/rendering/assets/splat-fish/blend/ and overrides under src/rendering/assets/splat-fish/overrides/. Verified verify-fish-clip-player.mjs, check-reef-asset-manifests.mjs, typecheck, build, and full vitest (81/81 files, 1051/1051 tests including budgets.test.ts and chromis-contour.test.ts). Remaining 8 species queued in Batches 2-3; Root review pending.

2026-11-21 Batch 2 Fish Eye/Gill/Mouth Sculpting & 512x512 Biological PBR Maps (AQ-91): Authored, Cycles-rendered, saved uncompressed .blend + textures under src/rendering/assets/splat-fish/blend/, exported overrides/*.glb, and synced via --fish-overrides (blue-green-chromis & learned-shape-guide preserved): royal-gramma (925,256 B, 10,484 tris), firefish (788,460 B, 8,403 tris), lyretail-anthias (840,420 B, 9,739 tris), and six-line-wrasse (963,144 B, 12,107 tris). Verified verify-fish-clip-player.mjs, check-reef-asset-manifests.mjs, typecheck, build, and full vitest (81/81 files, 1051/1051 tests passed including budgets.test.ts and chromis-contour.test.ts). Remaining 4 species queued in Batch 3; Root review pending.

Batch 3 (final 4 un-modeled splat-fish species, 11/11 complete; 12/13 total overridden + AQ-107 blue-green-chromis preserved):
- Authored build_fish_{mccoskers_flasher_wrasse,mandarin_dragonet,yellow_watchman_goby,tailspot_blenny}.py in Blender 5.2.3 LTS with 3D eye domes/orbital sockets, curved operculum plates/gill slits, species-matched buccal mouth lips/clefts, and 512x512 24-bit RGB PNG PBR maps (BaseColor, biological Normal, ORM with 0.035 cornea roughness).
- Inspected 8 studio Cycles renders (profile + head-closeup) before syncing via node scripts/sync-blender-override.mjs --fish-overrides:
  - mccoskers-flasher-wrasse: 9,639 tris, 937,420 bytes
  - mandarin-dragonet: 9,279 tris, 1,026,052 bytes
  - yellow-watchman-goby: 10,405 tris, 886,676 bytes
  - tailspot-blenny: 11,140 tris, 936,936 bytes
- Verified verify-fish-clip-player.mjs, check-reef-asset-manifests.mjs (32 files), npm run typecheck (18 scripts), npm run build, and npx vitest run --maxWorkers=3 (81/81 test files, 1051/1051 tests passing). Status remains In Progress pending starter-fish triage (AQ-70.9) and Root visual review.
<!-- SECTION:NOTES:END -->
