---
id: AQ-91
title: >-
  Apply Blender eye, gill, and mouth articulation (AQ-74) to the remaining 14
  species once Blender models exist
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-09T03:04:00Z'
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
