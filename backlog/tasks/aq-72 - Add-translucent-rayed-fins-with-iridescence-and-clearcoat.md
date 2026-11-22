---
id: AQ-72
title: Add translucent rayed fins with iridescence and clearcoat
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-08 00:30'
updated_date: '2026-11-21 18:47'
labels:
  - modeling
  - photorealism
  - rendering
dependencies:
  - AQ-12
  - AQ-70
  - AQ-70.8
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/alpha-picking.ts
  - scripts/build-splat-fish-glbs.mjs
  - scripts/sync-blender-override.mjs
  - AQ-70.8
documentation:
  - docs/rendering.md
  - docs/fish-assets.md
priority: '2'
type: feature
ordinal: 72
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Upgrade fish fin and body materials so pectoral, dorsal, anal, and caudal fins exhibit backlit translucency and visible fin-ray structure while body scales show subtle view-dependent guanine iridescence (n ~ 1.83) and wet mucus clearcoat (n ~ 1.35). Coordinate with the renderer contract in AQ-70.8 and ensure any Blender material/UV edits are saved to src/rendering/assets/splat-fish/blend/<species>.blend, exported to src/rendering/assets/splat-fish/overrides/<species>.glb, synced via node scripts/sync-blender-override.mjs --learn-guide, and committed to Git.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pectoral, dorsal, anal and caudal fins are translucent with visible ray structure on the promoted fish models
- [x] #2 Iridescence is visible and angle-dependent on species that have it, without looking like a rainbow overlay
- [x] #3 Clearcoat mucus sheen is present on fish bodies and does not wash out base colours
- [ ] #4 Fin materials are verified at 1440x900 and 402x874, with click targets and occlusion unchanged
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-21 Species-Selective Guanine Iridescence & Wet Mucus Clearcoat (AQ-72 AC #2, AC #3): Added SPECIES_OPTICAL_PROFILES and upgradeFishMaterialForPhotorealism in src/rendering/scene/fish-flex-material.ts configuring view-dependent guanine iridescence (iridescenceIOR = 1.83, thickness 175-360 nm, species-tuned intensities 0.08-0.48 across all 16 species), wet mucus clearcoat (ior = 1.35, clearcoat 0.34-0.46, clearcoatRoughness 0.09-0.13 wired to ORM roughnessMap and micro-normalMap when present), and backlit fin sheen. Verified with src/rendering/scene/fish-flex-material.test.ts (7/7), verify-fish-clip-player.mjs --runtime, typecheck, and build. AC #1 and AC #4 remain open for Root viewport review.
<!-- SECTION:NOTES:END -->
