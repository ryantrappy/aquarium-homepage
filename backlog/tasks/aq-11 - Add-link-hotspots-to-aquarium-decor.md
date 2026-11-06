---
id: AQ-11
title: Add link hotspots to aquarium decor
status: To Do
assignee:
  - '@Luna'
created_date: '2026-11-03T04:12:00Z'
updated_date: '2026-11-03T04:33:00Z'
labels: []
dependencies: []
documentation:
  - docs/requirements.md
priority: low
type: enhancement
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Beyond fish, selected aquarium decorations may serve as playful direct links to homelab destinations while preserving the main service catalog.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A user can activate a designated decor object to open its configured destination.
- [ ] #2 Decor hotspots have a visible or discoverable label that identifies their destination.
- [ ] #3 Decor hotspots do not cover or prevent selection of service fish.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent has reviewed the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### Specific Code Changes & Locations

1. **Extend Service/Decor Configuration Schema (`src/lib/services.ts`)**:
   - Add an optional `DecorHotspotConfig` type alongside `ServiceConfig`:
     ```ts
     export type DecorHotspotId = 'left-cave-arch' | 'torch-crest' | 'anemone-terrace' | 'clam-bed'
     export type DecorHotspotConfig = {
       id: DecorHotspotId
       name: string
       url: string
       worldAnchor: { x: number; y: number; z: number }
       boundingRadius: number
     }
     ```
2. **Prioritize Fish Raycast Hits Over Decor Hotspots (`src/rendering/scene/aquarium.ts`, `nearest()` at lines 183–187)**:
   - Tag designated decor meshes (e.g., `coral-anemone-bta`, `coral-euphyllia-torch`, or cave arch proxy) with `mesh.userData.decorId = hotspot.id` while fish meshes retain `mesh.userData.serviceId = service.id`.
   - In `nearest(x, y)`, resolve fish intersections first so a decor hotspot never blocks or steals clicks from a swimming fish (AC #3):
     ```ts
     function nearest(x: number, y: number): string | undefined {
       const box = canvas.getBoundingClientRect()
       ray.setFromCamera(new THREE.Vector2((x - box.left) / box.width * 2 - 1, 1 - (y - box.top) / box.height * 2), camera)
       const hit = nearestVisibleIntersection(ray.intersectObjects(hitMeshes, false), spriteMasks)
       return (hit?.object.userData.serviceId ?? hit?.object.userData.decorId) as string | undefined
     }
     ```
3. **Project Accessible Native `<a>` Overlays for Decor Hotspots (`src/rendering/scene/aquarium.ts`, `positionLabels()` at lines 281–294 & `src/components/AquariumScene.tsx` at lines 68–78)**:
   - Render native `<a data-decor-id={hotspot.id} className="aquarium-decor-link" href={hotspot.url} target="_blank" rel="noreferrer">` anchors in `.aquarium-link-layer` (`src/components/AquariumScene.tsx`) with a subtle pill badge (`.decor-name`) that becomes visible on hover/focus (AC #1, #2).
   - Project `hotspot.worldAnchor` via `projected.copy(hotspot.worldAnchor).project(camera)` inside `positionLabels()` and set `zIndex` lower than any overlapping fish link (`zIndex = String(Math.round((hotspot.worldAnchor.z + 8) * 100))`).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Current Codebase Context & Verification Parameters

- **Raycast & Overlay Architecture**:
  - `src/rendering/scene/aquarium.ts` currently populates `hitMeshes: THREE.Object3D[]` in `rebuildHabitat()` (lines 247, 250) and `rebuildFish()` (line 262, 307), setting `object.userData.serviceId = service.id` only on fish meshes.
  - Consequently, `nearest(x, y)` (lines 183–187) returns `undefined` when the nearest visible intersection is a rock, coral, or sand mesh, which blocks fish links behind solid reef geometry (AQ-34 AC #4).
  - Adding `object.userData.decorId` as a secondary fallback in `nearest()` after checking `serviceId` preserves fish occlusion while enabling clickable decor hotspots (e.g., the left-island BTA anemone on `socket_anemone_crevice_01` at local `[-0.16, 0.20, 0.11]` or top torch coral on `socket_lps_mid_01`).
- **Verification**:
  - Run `npx vitest run src/components/AquariumScene.test.tsx src/rendering/scene/alpha-picking.test.ts` to confirm fish link priority and occlusion remain intact.
<!-- SECTION:NOTES:END -->


