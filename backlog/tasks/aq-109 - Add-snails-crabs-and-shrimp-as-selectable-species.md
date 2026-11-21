---
id: AQ-109
title: 'Add snails, crabs and shrimp as selectable species'
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-18 04:36'
updated_date: '2026-11-21 05:05'
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
- [ ] #1 Author 4 original rigged & animated invertebrate GLBs (banded-trochus-snail, scarlet-reef-hermit-crab, emerald-mithrax-crab, scarlet-skunk-cleaner-shrimp) in Blender 5.2.3 LTS with Cycles PBR materials, substrate grounding, and multi-angle + animation inspection via Blender MCP.
- [ ] #2 Persist packed .blend sources + PNG textures, export overrides, sync via sync-blender-override.mjs --invertebrate into src/rendering/assets/invertebrates/manifest.json, generate 600x400 WebP thumbnails in public/fish/, document zsh provenance in ASSET_NOTICES.md, and pass unit/contract/typecheck/build verification.
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
