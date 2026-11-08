---
id: AQ-74
title: Add eye, gill, and mouth articulation to fish
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-08 00:30
updated_date: '2026-11-08T20:08:00Z'
labels:
  - modeling
  - photorealism
  - animation
dependencies:
  - AQ-12
  - AQ-70
  - AQ-70.8
references:
  - scripts/build-splat-fish-glbs.mjs
  - scripts/sync-blender-override.mjs
  - src/rendering/scene/fish-animation.ts
  - scripts/verify-fish-clip-player.mjs
  - AQ-49.1
  - AQ-70.8
documentation:
  - docs/rendering.md
  - docs/fish-assets.md
priority: '3'
type: feature
ordinal: 74
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add anatomical head detail and subtle respiratory/buccal articulation to fish models: convex glossy cornea eyes (roughness ~0.08) with distinct iris/pupil and specular highlight, sculpted operculum (gill cover) relief with subtle breathing motion synchronized to the swim cycle, and gentle mouth contour/articulation. Any manual Blender sculpting or rig additions must be saved to src/rendering/assets/splat-fish/blend/<species>.blend, exported to src/rendering/assets/splat-fish/overrides/<species>.glb, synced via node scripts/sync-blender-override.mjs --learn-guide, verified with scripts/verify-fish-clip-player.mjs (freezing cleanly on pause and prefers-reduced-motion), and committed to Git.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Promoted fish have convex cornea eyes with shine and pupil, verified in renders
- [ ] #2 Operculum (gill cover) relief is present and gill movement is subtly tied to the swim cycle
- [ ] #3 Mouth movement is present and does not look like a separate animated sprite
- [ ] #4 Eye, gill, and mouth work is verified at 1440x900 and 402x874 without breaking click targets
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->
