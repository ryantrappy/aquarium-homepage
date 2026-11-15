---
id: AQ-107
title: Refine blue-green chromis silhouette and fin-edge quality
status: In Progress
assignee:
  - '@root'
created_date: '2026-11-14 21:01'
updated_date: '2026-11-14 21:12'
labels:
  - modeling
  - rendering
dependencies: []
references:
  - src/rendering/assets/splat-fish/blue-green-chromis.glb
  - scripts/build-splat-fish-glbs.mjs
priority: '2'
type: bug
ordinal: 144000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User screenshot dated 2026-11-14 14:58 shows visibly stepped edges on the blue-green chromis dorsal fin, tail and body compared with other fish. Diagnose the actual rendered asset and distinguish source silhouette/alpha sampling from renderer aliasing before refinement. Preserve Gemini visual work and other concurrent species; route native model authoring through the modeling workflow. User confirms ownership and redistribution rights for all supplied fish references and derivatives.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Record the exact runtime asset/material path and objective evidence identifying the source of the chromis edge stepping.
- [ ] #2 The chromis body, dorsal fin and tail have smooth intentional contours at normal and close laptop viewing sizes, with before/after captures accepted by Root against the supplied screenshot and peer fish.
- [ ] #3 Preserve species appearance, rig/swim animation, scale, picking and clearance behavior; verify relevant integration and asset checks.
- [ ] #4 Asset refinements retain reproducible source, updated runtime GLB, inspection/manifest and provenance; any Blender edits additionally save packed native .blend, export override and run the required sync workflow. Commit and push only the Root-reviewed scoped task to the shared rolling PR, without deployment.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Inspect runtime mapping, embedded GLB geometry/texture/filtering and supplied screenshot first; obtain independent subagent diagnosis. Select a targeted renderer/asset correction from evidence, preserving all concurrent work and coordinating model ownership before editing native assets. Laptop-only visual verification per user.

Root-approved contour implementation: preserve byte-identical c53ea07f base GLB under sources/blue-green-chromis-contour-base.glb with source/generator/manifest hash guards. Add standalone chromis-only refinement command reconstructing the existing alpha/SDF field; subdivide only incidence-2 outer silhouette edges and their two incident triangles with max1.5px edge at350px plus bounded chord error. Preserve winding, UV, normalized skin weights, rig, animation and texture bytes; regenerate normals and measured accessors/bounds. Validate actual output topology/contract/budgets before atomic writes of chromis runtime GLB, inspection and only its manifest row. Add allowlisted per-entry generator/provenance support and meaningful deterministic/no-write/topology/preserved-buffer/manifest-invariance checks. No shared all-species regeneration, no Blender edits, no other supplied asset changes. Root must verify exact laptop normal/close-up before/after and relevant runtime behavior before acceptance/commit/push.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-14 21:05
---
Root policy clarification: the existing chromis has no Blender source or override; it is generated from the owned WebP. The original task-created AC4 overstated the project rule. AGENTS mandates packed native persistence for edits performed in Blender and explicitly permits supporting-pipeline changes for functionality. A reproducible, chromis-only contour pipeline refinement preserving Gemini art can be reviewed without creating or editing a live Blender model. No acceptance yet: the coarse-grid spacing is consistent with the screenshot but exact exported contour error and before/after native evidence still need verification.
---
<!-- COMMENTS:END -->
