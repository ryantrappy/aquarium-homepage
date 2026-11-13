---
id: AQ-71
title: Add a PMREM IBL environment map
status: In Progress
assignee:
  - '@Luna'
created_date: '2026-11-08 00:30'
updated_date: '2026-11-13 14:41'
labels:
  - photorealism
  - rendering
  - optics
dependencies:
  - AQ-39
  - AQ-14.2
  - AQ-70.4
references:
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/underwater-optics.ts
  - AQ-70.4
documentation:
  - docs/rendering.md
priority: '2'
type: feature
ordinal: 71
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The main scene currently lacks a scene.environment PMREM texture, causing MeshStandardMaterial fish and coral surfaces to lack view-dependent specular reflections and read flat or plasticky. Coordinate with AQ-70.4 to generate and apply a custom or CC0/CC-BY-4.0 verified reef-tank PMREM environment map in src/rendering/scene/aquarium.ts, evaluate tone mapping (ACESFilmicToneMapping exposure 1.02 baseline vs AgX/Neutral per AQ-70.4), and re-tune key/fill/rim light intensities so wet, iridescent fish surfaces read naturally without over-exposing highlights.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A PMREM environment map is loaded and applied to the scene without breaking the existing 3-tier LED rig
- [x] #2 Fish materials show visible specular / iridescent response that changes with viewing angle
- [ ] #3 Exposure and light intensities are re-tuned so the scene is not over- or under-exposed at 1440x900 and 402x874
- [ ] #4 Performance is verified at both viewports with no regression in frame rate
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Root agent reviews the completed work before the task is marked Done.
- [ ] #2 Implementation follows project policy: default to Luna with high reasoning effort for routine work; root may choose a stronger model for demanding tasks.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Apply the existing declared sand environment-map intensity (0.2) to the full aragonite sand group immediately after group creation, preserving all numeric lighting, exposure, and shader values.
2. Clarify environment-map module comments against the current authoritative renderer/optics settings; mark waterSurface intensity as compatibility-only for the custom shader material.
3. Add an actual aquarium-controller lifecycle regression that inspects the created sand group's MeshStandardMaterials for the declared intensity, and retain focused environment-map tests.
4. Run the focused environment-map and aquarium-lifecycle suites plus typecheck; hand off for Root visual review without marking AQ-71 Done.

Native A/B at df6227e revealed identical foreground pixels despite changed material property. Root confirmed installed Three r187 WebGLRenderer overwrites envMapIntensity with scene.environmentIntensity when material.envMap is null. Bind the single shared PMREM texture explicitly to each PBR role (fish/reef/sand/backdrop) so declared strengths take effect, preserving no-IBL fallback. Borrowed target ownership must stay with scene; generic asset disposal receives the borrowed texture and skips it while disposing other asset textures. Verify real controller shared bindings/removal/teardown and then repeat native exposure review. No new maps or per-frame PMREM work.

Once explicit strengths took effect, backdrop0 made the rear water too dark relative to the goal reference. Root exposure trial rebalances only the backdrop role to0.65, retaining fish0.55/reef0.35/sand0.2, ACES0.80 and the same LED rig. Validate native two-size exposure with fixed-pose foreground measurements and no clipping; final art and cost remain separate.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-08 audit: PR #9 merged procedural PMREM environment map generation (src/rendering/scene/environment-map.ts, 6 passing tests in environment-map.test.ts) and wired scene.environment and per-role envMapIntensity into src/rendering/scene/aquarium.ts. Moved to In Progress (ready-for-review / gemini approved) awaiting Root 2-viewport exposure/performance sign-off (ACs #3-#4).

Luna/Root2026-11-13 read-only audit: procedural PMREM initialization/scene.environment and teardown are wired; fish/reef receiveexplicit intensities. Sand declaration0.2 is currentlynotapplied to sandBed.group (materials retain default1.0); evaluate a scoped integration fix against current warm foreground before acceptance. Water surface is customShaderMaterial, so its oldenvironmentintensity entry is compatibility-only and shouldnot be applied asPBR. Topmodulecomments reference stale exposure/hemi/backdrop values. Successful WebGL_PMREM and view-angle specular evidence still need explicitreview; no asset/license change. CI/FPSdisplay tasks remain excluded; no newframe-ratebenchmarkrun in this audit.

2026-11-13 bounded sand-intensity fix: applied ENVIRONMENT_MAP_INTENSITY.sand to the complete AragoniteSandGroup before rendering; corrected stale environment-map comments and marked waterSurface value compatibility-only for the custom shader. Added actual aquarium-controller lifecycle coverage asserting all five sand-group MeshStandardMaterials use the declared value. Focused environment-map + lifecycle suites pass 43 tests; typecheck and 14 script checks pass. Root visual review pending; no viewport/FPS acceptance claimed.

Root reviewed Luna sand-intensity integration: actual sand group now receives declared0.2 rather than default1.0, including floor/frontedge/scatter. Actualcontroller regression covers five PBRmaterials.43focused environment/controller tests and typecheck14scripts pass. Root also removes stale comments claiming visible backdrop and lighting-proxy gradients are identical, and obsolete fishasset counts; no numeric lights/exposure/shader colors changed. This is a verified code handoff; native A/B exposure review follows before acceptance. Water customShaderMaterial retains compatibility-only entry. No FPSdisplay work, model/asset edits or performance claim.

Root native diagnostic atdf6227e: laptop/phone foreground ROI statistics were exactly unchanged from6be5dcc baseline despite sand.envMapIntensity changing1.0->0.2. Installed Three r187 WebGLRenderer.js2747 explicitly substitutes scene.environmentIntensity while material.envMap isnull; WebGLMaterials refresh uses material.envMapIntensity only for an explicitmap. Root/Luna now explicitly bind the one shared PMREMtexture to all PBRroles and markchanged bindings forrefresh; numeric intensities remain unchanged. Generic asset disposal skips only that borrowed texture by identity; scene/render-target owner releasesonce. Real controller regression supplies actualshared map to sand/twofish/backdrop and asserts removal/teardowndoesnotdisposeitthroughmodels.45focusedtests/typecheck14scripts pass; final native review follows. No newenvironmentasset or perframePMREM work.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-12 05:37
---
Root review 2026-11-11: Returned to To Do. AC3/4 remain unverified: current two-viewport exposure acceptance and controlled no-regression performance comparison are missing. Six focused optics/environment/lifecycle suites pass 70 tests, but those do not establish visual quality or frame-rate parity.
---
<!-- COMMENTS:END -->
