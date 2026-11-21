---
id: AQ-109
title: 'Add snails, crabs and shrimp as selectable species'
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-18 04:36'
updated_date: '2026-11-21 05:17'
labels: []
dependencies: []
priority: '22'
ordinal: 146000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add photoreal, rigged and animated reef clean-up-crew invertebrates (Banded Trochus Snail, Scarlet Reef Hermit Crab, Emerald Mithrax Crab, Scarlet Skunk Cleaner Shrimp) as $0 original Blender assets and selectable species in the aquarium and service picker.

Phase 1 builds, inspects via Blender MCP, persists, syncs, and generates studio WebP thumbnails for all 4 species in isolation while keeping existing fish, coral, rock, and blue_crab.blend untouched. Phase 2 wires them into the runtime catalog, benthic locomotion, and service picker.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Author 4 original rigged & animated invertebrate GLBs (banded-trochus-snail, scarlet-reef-hermit-crab, emerald-mithrax-crab, scarlet-skunk-cleaner-shrimp) in Blender 5.2.3 LTS with Cycles PBR materials, substrate grounding, and multi-angle + animation inspection via Blender MCP.
- [x] #2 Persist packed .blend sources + PNG textures, export overrides, sync via sync-blender-override.mjs --invertebrate into src/rendering/assets/invertebrates/manifest.json, generate 600x400 WebP thumbnails in public/fish/, document zsh provenance in ASSET_NOTICES.md, and pass unit/contract/typecheck/build verification.
- [ ] #3 Integrate the 4 invertebrate species into the selectable species catalog, benthic reef locomotion/scale system, and service picker UI (Phase 2).
- [ ] #4 Pass full test suite, typecheck, build, and 1440x900 visual review by Root before marking Done.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Phase 1: Add isolated invertebrate sync pipeline (scripts/sync-invertebrate-override.mjs + scripts/sync-blender-override.mjs --invertebrate dispatch + exclusions).
2. Author 4 original rigged & animated invertebrate builders in src/rendering/modeling/, run via Blender MCP, inspect multi-angle rendered views and animation frames, save packed .blend + textures, export overrides, sync to src/rendering/assets/invertebrates/, and render 600x400 transparent WebP thumbnails to public/fish/.
3. Add src/rendering/assets/invertebrate-assets.test.ts, README.md, and ASSET_NOTICES.md provenance.
4. Run targeted vitest suites, check-reef-asset-manifests.mjs, typecheck, and build; record evidence on AQ-109 (check AC #1 and AC #2, leave Done/AC #3-4 for Phase 2 & Root) and commit scoped files.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### 2026-11-20 Phase 1: Original Blender Invertebrate Assets & Thumbnails
- Built isolated invertebrate pipeline (`scripts/sync-invertebrate-override.mjs` + `scripts/sync-blender-override.mjs --invertebrate` dispatch + exclusions so canonical fish/coral/rock catalogs and `learned-shape-guide.json` remain untouched).
- Authored from scratch ($0 original procedural geometry, 512x512 BaseColor/Normal/ORM PBR textures with glTF Occlusion, substrate-grounded rigs, 49f @ 24fps looping animations) via `src/rendering/modeling/invertebrate_common.py` and four builder scripts, verified in live Blender 5.2.3 LTS (`get_scene_info`, multi-angle rendered `look`, frame-sequence `look`, and WebP visual checks), saved uncompressed packed `.blend` + textures under `src/rendering/assets/splat-fish/blend/`, exported overrides under `src/rendering/assets/splat-fish/overrides/`, synced into `src/rendering/assets/invertebrates/manifest.json`, and rendered `600x400` transparent Cycles WebP thumbnails to `public/fish/`:
  - `invertebrate-banded-trochus-snail` (*Trochus histrio*): 8,268 tris, 1,126,348 B, 9 joints, clip `trochus_snail_glide`, thumbnail `public/fish/banded-trochus-snail.webp`
  - `invertebrate-scarlet-reef-hermit-crab` (*Paguristes cadenati*): 7,104 tris, 1,067,576 B, 12 joints, clip `hermit_crab_scurry`, thumbnail `public/fish/scarlet-reef-hermit-crab.webp`
  - `invertebrate-emerald-mithrax-crab` (*Mithraculus sculptus*): 4,192 tris, 1,035,928 B, 13 joints, clip `emerald_crab_forage`, thumbnail `public/fish/emerald-mithrax-crab.webp`
  - `invertebrate-scarlet-skunk-cleaner-shrimp` (*Lysmata amboinensis*): 3,880 tris, 511,932 B, 13 joints, clip `cleaner_shrimp_rock`, thumbnail `public/fish/scarlet-skunk-cleaner-shrimp.webp`
- Pre-existing `src/rendering/assets/splat-fish/blend/blue_crab.blend` and all existing canonical manifests were left untouched.
- Verified:
  - `npx vitest run src/rendering/assets/invertebrate-assets.test.ts src/rendering/assets/sync-reef-override.test.ts src/rendering/assets/sync-coral-override.test.ts src/rendering/assets/splat-fish-contract.test.ts src/rendering/assets/budgets.test.ts src/rendering/assets/manifest-checker.test.ts`: **6 test files passed, 82/82 tests passed**.
  - `node scripts/check-reef-asset-manifests.mjs` (32 files), `npm run typecheck` (18 scripts checked), and `npm run build` all exited 0.
- Phase 2 (runtime selectable-species, benthic locomotion/scale, and service picker UI) and Root 1440x900 visual review remain pending; `AQ-109` stays `In Progress`.
<!-- SECTION:NOTES:END -->
