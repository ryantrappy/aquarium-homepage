---
id: AQ-42
title: Develop coral assets and biologically varied polyp movement
status: In Progress
assignee:
  - '@gemini'
  - '@root'
  - '@Luna'
created_date: 2026-11-03 12:34
updated_date: '2026-11-08T04:47:00Z'
labels: []
dependencies:
  - AQ-14.3
  - AQ-40
  - AQ-53
references:
  - docs/gemini_planning.md
  - docs/reef_aquarium_all_code.md
  - docs/open-source-asset-and-motion-research.md
  - docs/modular-coral-and-live-rock-spec.md
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC7329047/
documentation:
  - docs/open-source-asset-and-motion-research.md
  - docs/modular-coral-and-live-rock-spec.md
priority: '5'
type: enhancement
ordinal: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The reference distinguishes hard branching SPS structure from soft LPS tissue and suggests different flow responses. AQ-14.2 covers restrained habitat motion; this task addresses asset authoring and biologically appropriate variety for 3D coral.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create or source licensed, visually credible coral assets with distinct rigid skeleton and soft tissue where appropriate, recording provenance.
- [ ] #2 Give soft tissue varied flow-driven motion while preserving rigid structures and integrating with the aquarium pause and reduced-motion controls.
- [ ] #3 Review believable appearance, habitat occlusion and responsive performance at both target viewports.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Prefer user-managed Gemini for visual modeling and consume supplied src/rendering assets. Codex may make necessary functional changes while preserving visual design and avoiding concurrent edits. Route model issues through modeling-tagged tasks.
2. AQ53 routes flexibility-mask encoding alignment to Gemini. Codex validates current exact exports and binds the documented encoding without applying the exponent twice.
3. After the foundation readiness gate, implement the Three.js raw-mask adapter with COLOR_0 separate from display color/opacity and explicit contact AO.
4. Integrate shared flow-driven tissue motion with stable rigid skeletons, bounded time, pause and reduced-motion behavior.
5. Root verifies actual appearance, occlusion and responsive performance at 1440x900 and 402x874 before completion or scene promotion.

### Specific Code Changes & Locations

- **8 Modular Coral Generators & Packaged GLBs (`src/rendering/modeling/build_*.py` & `src/rendering/assets/corals/coral-*.glb`)**:
  - Authors separate rigid skeleton (`R = 0.0`) and soft polyp/tentacle crown (`R = 0..1` raw linear height) primitives for *Euphyllia* Torch/Hammer, *Acropora* Staghorn/Table, *Montipora* Plate, *Diploria* Brain, Bubble-Tip Anemone, and *Zoanthid* mat colonies.
- **Raw-mask Flow and Material Adapter (`src/rendering/scene/coral-material.ts`, `applyCoralRawMaskMaterial()`)**:
  - Decodes `COLOR_0` without multiplying display albedo/alpha, applies `pow(coralRawR, 1.8)` in the vertex shader for dual-frequency surge + turbulence sway (`uTime`), adds procedural material detail and declared palette/roughness overrides, and freezes displacement when `paused || reducedMotion` is active.

2026-11-05 Root-approved bounded renderer fix: verify Three Mesh.frustumCulled default path and WebGLShadowMap both call Mesh.intersectsFrustum -> Frustum.intersectsObject -> geometry.boundingSphere; compare those source-space bounds with exact coral shader deformation. Preserve source GLBs and shared cached BufferGeometry. Add an idempotent WeakMap-backed per-geometry boundingSphere expansion in renderer assembly for the shader's static basal skirt tuck plus exact worst-case soft-flow displacement from the current amplitude/coefficients and actual position/color attributes; account for rigid parts' static tuck, cloned mesh transforms and repeated assembly without cloning or rewriting vertex data. Add focused tests for conservative bound coverage, shared-template geometry identity, repeated/rebuild idempotency, rigid/soft profiles, and a Frustum case where an original bound misses a possible shader-displaced vertex. Leave aquarium.ts, generators/assets/packager untouched; report bounds/art/scene limits separately.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Cross-reference the AQ-40 bounded 30k PixForge normal bake in comment #15. This does not close AQ-42; selected-Three proof, masks/contract and requested biological/visual criteria remain pending.

Root reviewed bounded culling handoff2026-11-06 UTC: final4source pins0c218745/84f71140/93db5d62/60371f9b accepted with independent14tests and Root14tests. Frozen default44files/408tests, typecheck and production build pass. Initial full run hit2existing5s exact-rock fixture timeouts under contention;30fixture tests pass in1.01s and unchangeddefaultfull408suite passes at rest. No timeouts/assertions weakened. Portable audit: node docs/asset-evidence/aq42/audit-coral-bounds.mjs /tmp/aq42-coral-bounds-audit.json; pinsall8GLBs/11primitives/111135vertices and reproduces22.897–58.166mm local sphere additions atA=.014. Report: docs/asset-evidence/aq42/displacement-bounds-review.json and coral-bounds-audit.json. Actual GLSL tail is byte-identical to d6767c2; only CPU reference parity changed. Visual assets remain untouched. Broad task ownership includes Gemini for visual work; Luna handled only the reviewed renderer slice. All parent ACs remainopen for actual art/flow/scene acceptance.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-03 20:52
---
Bounded primary-source coral screening (2026-11-03; no repo/source asset changes). One focused public Sketchfab Data API search for “Acropora branching coral” with downloadable=true returned a close branching candidate and a Smithsonian specimen.\n\nCandidate reviewed: [Staghorn Coral by PixForge](https://sketchfab.com/3d-models/staghorn-coral-ede640745c16457a9345ef1fa9e8d4d4). Official public API metadata at https://api.sketchfab.com/v3/models/ede640745c16457a9345ef1fa9e8d4d4 reports creator PixForge, downloadable=true, CC BY 4.0 (author credit; commercial use allowed), 1,945,640 faces / 972,814 vertices, 0 animations. The official Sketchfab page labels it “Generated with AI” and the viewer reports it is too heavy to render on this device. Its official still shows a dense, plausible antler-like staghorn colony with polyp-like surface texture, but the coloring is tan/cream with white branch tips, not convincingly vivid healthy tissue and not a useful palette contrast against the existing brown reef scan. Listing prose calls it Acropora sp. and PBR; no exact species, source capture, material maps, GLB archive size, or living-coral provenance was verified. I did not click the download control or derive it. This is a lead, not an approved biological asset.\n\nComparison: [Acropora valenciennesi by The Smithsonian Institution](https://sketchfab.com/3d-models/acropora-valenciennesi-ad2212f48b0047809101354d096a8302) is downloadable=true and CC0 Public Domain in official API metadata (https://api.sketchfab.com/v3/models/ad2212f48b0047809101354d096a8302), with 100,000 faces / 49,992 vertices. Smithsonian source description identifies a dry specimen (“PREPARATION: Dry”); the official preview is a white skeleton. Rights/taxonomy are much better documented, but it fails the living-color requirement and is specifically not the requested target.\n\nRecommendation: no derivative or source download yet. The focused search did not produce a candidate that combines credible living coloration, defensible provenance, and manageable preview/geometry. Keep the current reef scan as the technical backdrop while looking for a museum/university credited living-coral photogrammetry or a documented original artist asset later; do not treat either preview as evidence of final-quality coral or as a complete motion asset. AQ-42 remains open; no acceptance criteria or production choice are checked.
---

author: @root
created: 2026-11-03T20:54:00Z
---
Root review of bounded source screening: healthy Acropora can be tan/brown with pale growth tips; vivid color alone should not reject a usable branching form. AI-generated labeling is a provenance/biological-review limit, not an automatic exclusion. The existing scene needs a credible branching silhouette as well as color variety. For the already identified CC BY PixForge staghorn candidate only, inspect official download size/options and, if an original GLB fits the100MB cap, obtain it through the authorized signed-in flow for neutral front/oblique offline review. Do not call it a verified exact species, alter colors to imply observed biology, or ship it before root anatomy/material/geometry review. Reject the dry Smithsonian skeleton for this living-colony role as recorded. Keep source outsidegit, no new searches/purchases.
---

author: @Luna
created: 2026-11-04 01:52
---
Follow-up to root review #2: I read the latest agent_scratch.md and docs/open-source-asset-and-motion-research.md. I tried to resume the existing signed-in Sketchfab research tab to inspect the PixForge download dialog/GLB size, but CUA reports the Mac is locked and could not unlock it. The public API still confirms only downloadable=true; it does not expose the GLB archive size in this public response. I have not downloaded a source or made a derivative, and did not use an API download/viewer extraction workaround. The prior public still remains available in the research notes; no runtime asset decision follows until the official UI can be inspected and the <=100 MB limit confirmed.
---

author: @Luna
created: 2026-11-04 02:17
---
Bounded read-only check of the new fFish lead while Sketchfab UI is unavailable (2026-11-03). Using Sketchfab's public model-search API restricted to the documented ffishAsia-and-floraZia account and downloadable=true, exact roster-species searches for “Zebrasoma flavescens” and “Yellow Tang” returned 0 results. This only means no matching result surfaced from those two public searches; it does not prove the larger fFish corpus lacks the species. The document's example [CC0 Yellowfin Tuna](https://sketchfab.com/3d-models/cc0-yellowfin-tuna-thunnus-albacares-d4eeea976932414d91fc786ce6cec547) is verified in its primary API metadata (https://api.sketchfab.com/v3/models/d4eeea976932414d91fc786ce6cec547) as ffish.asia / floraZia, CC0 Public Domain, downloadable=true, 1,387,219 faces / 876,441 vertices, no animation; this confirms the source's CC0 offering but is not an exact species match for the supported reef roster. No restricted download endpoint was used and no source file was acquired.\n\nThe already identified PixForge Staghorn remains the only concrete branching-coral lead from this screen, but its official download-size check is still open because the Mac is locked. No acceptance criteria are checked and no source/derivative was added.
---

author: @Luna
created: 2026-11-04T02:32:00Z
---
Research doc corrects Malul et al. (2020) journal attribution and limits the reported quarter-period / 0.28 Hz example to its measured conditions. Prior universal frequency/phase and fixed shader values are not supported as general coral behavior.
---

created: 2026-11-04T02:47:00Z
---
Follow-up offline review (2026-11-04; source remains outside git). Found `/Users/ryantrapp/Downloads/staghorn_coral.glb` present at 93,766,820 bytes (89.4 MiB), within the authorized 100 MB limit. SHA-256: `96a57944bc5c68b6e2a8244b10a83d16aff1a761cdabbf5379e2a36169ccda55`. File signature and declared length validate as GLB 2; JSON identifies Sketchfab exporter, 18 meshes, 20 nodes, 1 material, and 2 textures. Size is consistent with the previously observed 4K download option; the current Chrome Sketchfab page rendered blank after one reload, so file origin was not independently re-confirmed from visible page UI in this follow-up.

Rendered `/tmp/aq42-staghorn-front.png` and `/tmp/aq42-staghorn-oblique-oblique.png` with `src/rendering/proof/render-model-views.py` using Blender 5.0.1 (neutral inspection setup, 800×600, 24 Cycles samples); import took about 9 seconds and each render about 50–64 seconds. Both views show a dense, distinctly branching staghorn-like colony, granular/polyp-like surface texture, brown/tan coloration, pale branch tips, and an attached dark substrate base. The oblique view confirms branching depth. This supports a silhouette/material study, not exact species identification, real-coral provenance, biological fidelity, or final production use. Existing official API review in comment #1 reports 1,945,640 faces / 972,814 vertices and zero animation; no animation was added.

The source page remained blank in Chrome after a single reload; I stopped further browser retries. No file was moved into the repository, no derivative was made, no color was altered, and no acceptance criteria or production choice was changed. Root review remains required.
---

author: root
created: 2026-11-04T02:49:00Z
---
Root inspected completed93,766,820-byte staghorn_coral.glb and neutral front/oblique renders. GLB asset.extras independently match exact PixForge listing ede640745c16457a9345ef1fa9e8d4d4, creator URL, title and CC-BY4.0; this closes the file-origin uncertainty after the signed-in official89MB4k download. Generic antler branching, brown tissue-like surface and pale tips are a useful reviewed candidate; AI-generated source is not evidence of exact species or biological accuracy. Approve bounded runtime-derivative experiment only: preserve source colors/UVs/materials, target roughly20k–40k triangles and<=2048 textures, retain useful normal maps, validate and compare front/oblique/close-up to source before any scene promotion. No recoloring/species assertion, no fullrig/coral-motion acceptance yet.
---

created: 2026-11-04T03:03:00Z
---
Root-approved review LOD (2026-11-04). Added `src/rendering/proof/prepare-staghorn.py`, pinned to source SHA-256 `96a57944bc5c68b6e2a8244b10a83d16aff1a761cdabbf5379e2a36169ccda55`; Blender ran with `--threads 4`. Command: `blender --threads 4 -b --python src/rendering/proof/prepare-staghorn.py -- /Users/ryantrapp/Downloads/staghorn_coral.glb /tmp/aq42-pixforge-staghorn-30k.glb --triangles 30000`.

Source: 1,945,640 triangles, 93,766,820 bytes, bounds extent `[0.8739014, 0.9794618, 0.7054444]`. Derivative: exactly 30,000 triangles, 13,259,176 bytes, SHA-256 `1917a4749c6356bdc6f5f6bf799ace58c02ba1b71466bec6acd1252ca2d3ee9f`, bounds extent `[0.8721748, 0.9780753, 0.7055510]`. AABB extent change is below 0.2% on all axes; no surface-distance error metric was computed. UVMap and material `mat0` remain; source baseColor/JPEG and normal/PNG map roles are both present in output, both mechanically resized to 2048×2048. No vertex color attributes were present in source or output. Khronos glTF Validator 2.0.0-dev.3.10 reports zero errors, warnings, and infos; report file `/tmp/aq42-pixforge-staghorn-30k-validation.json`.

Neutral derivative views: `/tmp/aq42-pixforge-staghorn-30k-render-front.png`, `/tmp/aq42-pixforge-staghorn-30k-render-oblique.png`; source/derivative close-up crops from the matched front renders are `/tmp/aq42-staghorn-front-closeup.png` and `/tmp/aq42-pixforge-staghorn-30k-render-front-closeup.png`. Visual comparison retains the overall branching mass and pale tips, but 30k decimation introduces conspicuous angular facets on branch surfaces and substrate. This is a bounded technical LOD for root review only; no runtime integration, promotion, production claim, or AC check.
---

author: root
created: 2026-11-04T03:05:00Z
---
Root source/30k full-front and closeup comparison: source form is useful; derivative has hard angular normals/facets across branches and base and is rejected for scene promotion. Before increasing polygon budget, inspect flat/custom normal handling after collapse: attempt one bounded smooth-normal pass on retained geometry (preserve UV/map roles and source colors) at30k or40k, validate and render same front/closeup. Do not repaint. Normal/tangent correctness and silhouette at intended colony scale matter more than arbitrary lowest triangle count; record actual tradeoff. Source original remains the review reference.
---

created: 2026-11-04T03:09:00Z
---
Inspection before the smooth-normal pass (Blender 5.0.1, read-only import): source carries custom normals and is essentially all smooth (only small seam-face exceptions); the 30k derivative retains a custom-normal layer, with 29,987 smooth faces and 13 flat faces. This makes a same-budget pass that clears carried custom split normals and rebuilds all-smooth normals a bounded test; it isolates normal handling from a triangle-budget increase. Geometry, colors, UVs, material/map roles, and target 30k count must remain unchanged.
---

---
author: @research
created: 2026-11-04T04:08:00Z
---

created: 2026-11-04T06:20:00Z
---
Same-budget smooth-normal candidate (2026-11-04; source unchanged; outside-git output). Before pass, Blender 5.0.1 inspection showed imported source carried custom normals and was almost entirely smooth; the hard-normal 30k derivative still had a custom-normal layer (29,987 smooth faces, 13 flat). Ran one 30k pass with `--smooth-normals`, which clears carried custom split normals, enables smooth shading on all faces, and regenerates tangent space from retained UVMap. No higher triangle budget or geometry smoothing was applied in this pass.

Output `/tmp/aq42-pixforge-staghorn-30k-smooth.glb`: 30,000 triangles, 13,257,016 bytes, SHA-256 `6f90a78ddf5df726f9fd466df4e709eb3eca6780fde2c0a5891f1560263eaec2`. UVMap and material `mat0` preserved; base-color and normal texture roles retained at 2048×2048; source has no vertex-color attributes, and the pass adds no `COLOR_0`. All 30,000 faces smooth, no custom normal layer remains. Generated normals and tangents are finite and unit length within 0.000001; maximum absolute normal/tangent dot is `3.86e-6`. GLB contains `NORMAL`, `TANGENT`, and `TEXCOORD_0`; Khronos glTF Validator 2.0.0-dev.3.10 reports 0 errors/warnings/infos. Report: `/tmp/aq42-pixforge-staghorn-30k-smooth-validation.json`.

Matched source and derivative renders are `/tmp/aq42-staghorn-smooth-reference-front.png`, `/tmp/aq42-pixforge-staghorn-30k-smooth-render-front.png`, `/tmp/aq42-staghorn-smooth-reference-front-closeup.png`, `/tmp/aq42-pixforge-staghorn-30k-smooth-render-front-closeup.png`, `/tmp/aq42-staghorn-smooth-reference-oblique.png`, and `/tmp/aq42-pixforge-staghorn-30k-smooth-render-oblique.png`. Rebuilding smooth normals does not materially remove the visible angular branch/surface facets at these views; the remaining issue appears geometric at this budget. No color or silhouette sculpting was attempted. Keep this candidate review-only pending root review; AQ-42 acceptance criteria remain unchecked and AQ-40 is still the strict first priority for the full asset pipeline. The modular COLOR_0 masks are not display RGB/alpha and require shader-specific handling before any future modular-coral promotion.
---

created: 2026-11-04T06:25:00Z
---
Normal-bake experiment handoff: this is a bounded research/provenance step for AQ-42 and AQ-40 only. Source and 30k LOD are the same already approved PixForge model; no model switch. This proof does not add a modular COLOR_0 mask, identify exact species, or complete AQ-42. Root review is required before runtime use.
---

author: root
created: 2026-11-04T06:25:00Z
---
Aligned with user priority order: standalone coral authoring follows the pipeline and bare foundation, then assembly. Removed broad AQ34 prerequisite to avoid requiring completed main habitat before its modular assets exist; its integration checks remain AQ14.4/AQ34.
---

author: @storage
created: 2026-11-04T06:43:00Z
---
AQ-42 step 6 also produced the bounded high-to-low normal-map review candidate described in AQ-40 comment #15; these are linked research outputs, not independent evidence of the coral asset acceptance criteria. Source and 30k smooth LOD are the same already reviewed PixForge staghorn. The baked 30k candidate preserves silhouette, UV/baseColor and normalTexture role; without a TANGENT accessor, Khronos reports 0 errors and the expected generated-tangent-space portability warning. Source/low/baked neutral side and oblique renders show no material silhouette/faceting improvement at this geometry budget. No calibrated physical units, exact-species claim, modular coral masks, runtime promotion, or AC check. Retain for selected-Three fixture review only.
---

author: root
created: 2026-11-04 18:57
---
New scratch supplies eight original modular coral GLBs and requests direct use; retain them as the active modular asset baseline. Read-only preflight is underway while AQ14.3 remains prerequisite, with no coral implementation or promotion yet. Root inspected supplied torch-v2-front, staghorn-v2-oblique and anemone-front render files: distinct branching/soft-crown forms and color variation are useful for the baseline, while regular tube-like structures, pointed/bulb surfaces and coarse faceting remain visible. These prior render files are not yet hash-matched exact packaged-GLB review and establish neither final photorealism nor biological fidelity. AQ42 still owns raw-mask renderer handling, flow motion, pause/reduced motion and selected-Three appearance/performance evidence.
---

author: root
created: 2026-11-04 18:59
---
User clarification: all modeling is owned by the user-managed Gemini agent. Use its supplied coral models directly; Codex agents must not create or modify model assets, modeling generators or packaging scripts. Codex owns renderer raw-mask handling, flow integration, pause/reduced motion and testing. Current preflight is read-only; readiness findings are integration constraints or feedback for Gemini, not instructions for Codex remodeling.
---

author: @focus_review
created: 2026-11-04 19:00
---
Read-only preflight (2026-11-04; dependency AQ-14.3 still In Progress; no AC/status/integration change): inspected all eight supplied coral GLBs, manifests/inspection records, raw COLOR_0 accessors and generators. GLB byte lengths/SHA-256 match manifest for all eight; generator SHA matches local generator and in-band sourceSha256; reported identity root transform, meter/+Y metadata and primitive role extras are present. COLOR_0 is normalized U16 VEC4 and count matches POSITION on every primitive; decoded masks are in [0,1], rigid R is 0, brain R max is 0.04518 (quantized). Concrete contract gap: torch, hammer and anemone crown generators store h^1.8 in R, although the contract requires raw flexibility height and runtime applies pow(R,1.8) once; these three would be exponentiated twice by that adapter. Modeling ownership stays with Gemini; this is a preflight finding, no asset/generator edits requested here. PBR baseColor/normal/MR slots are embedded (512px images); *_orm is wired as metallicRoughnessTexture but materials do not declare occlusionTexture, so its AO channel is not exposed to standard glTF consumers. COLOR_0 A remains the contract AO path but requires the custom raw-mask shader/vertex-color bypass before rendering. Khronos validator was unavailable on PATH or in local node modules, so I did not claim Khronos validation. No visual/art or scene acceptance; use only after AQ-14.3 foundation gate and later selected-Three review.
---

author: root
created: 2026-11-04 19:05
---
Latest user policy permits necessary functional model/pipeline edits by Codex while Gemini handles visual modeling. AQ53 is the new modeling-tagged task assigned @gemini for the identified flexibility-encoding mismatch. Existing AO-slot findings remain a renderer integration constraint; no unsupported claim that a model change is required.
---

author: @root
created: 2026-11-05 04:18
---
User steering2026-11-04: another agent is actively working on the coral portion. Root reserves coral assets/generators/materials/packager/manifests/README/rendering for that agent, holds coral changes out of commits and makes no further edits there during ownership. Codex workers continue independent telemetry/profile verification and read-only pinned ROCK collision tooling. New export hashes invalidate prior validation; recheck before any future integration. Root retains final review/Done.
---

author: @root
created: 2026-11-06 02:40
---
Photorealism audit 2026-11-05 (AQ-70): procedural colonies read as cartoon (uniform pastel saturation, repeated instances, cotton-swab Acropora tips, emissive neon brain coral). Detailed photoreal requirements per archetype are in AQ-70.11; fluorescence via masks in AQ-70.6.
---

created: 2026-11-06 04:23
---
Read-only implementation preflight (2026-11-05): Actual production path `aquarium.ts:rebuildHabitat()` clones cached coral templates, calls `assembleCoralsOnRockSockets`, then applies reef-scale 4.3–4.5; mount scales range about1.38–1.85. Cloned meshes share template BufferGeometry and retain default `frustumCulled=true`. Three 0.187 WebGLRenderer and WebGLShadowMap both filter meshes through `Mesh.intersectsFrustum()`, which tests the geometry's original POSITION-derived boundingSphere. Coral shaders deform vertex positions after that bound is computed: all roles have the basal skirt tuck; soft roles add flow displacement. The standalone AQ-53 proof disables frustum culling, so its pixel evidence cannot clear this issue. The defect is a possible false cull at camera or light-frustum boundaries, not a claim that every current view visibly clips. A local bound margin must cover static skirt tuck plus soft flow, be applied once to the shared geometry sphere, and be tested without editing cached position data or cloning geometry.
---

author: @Luna
created: 2026-11-06 04:32
---
2026-11-05 AQ-42 bounded renderer bounds iteration (no asset/generator/packager/aquarium.ts edits):

- Confirmed the real false-cull path: production clones shared coral template BufferGeometry, keeps Mesh.frustumCulled=true, and binds the raw-mask surface/custom-depth shader. In installed Three r187, WebGLRenderer and WebGLShadowMap both cull Mesh objects via Mesh.intersectsFrustum -> Frustum.intersectsObject -> geometry.boundingSphere, which is lazily computed from undeformed POSITION. The shader moves vertices after that bound. The standalone AQ-53 GPU proof explicitly sets frustumCulled=false, so it did not exercise this case. This establishes a real possible camera/light-frustum false negative, not a claim of visible clipping in every current camera view.
- Recorded exact position envelope: for soft flex in [0,1], x displacement magnitude <=1.38*abs(A)*flex; z <=1.10*abs(A)*flex; shader y sway magnitude <=0.18*(1.38+1.10)*abs(A)*flex^2. Both roles also receive skirt tuck: smoothstep(-.006,.018,y), x/z scale from .55 to1 and y drop up to .008m. The renderer now calculates a per-vertex Euclidean displacement margin from actual POSITION and normalized COLOR_0 attributes, adds a 10µm numerical pad, and expands the original local bounding sphere by that margin. This does not assume that the tuck reduces distance from a non-origin sphere center. Three transforms the expanded sphere through each clone/mount/island scale for both camera and shadow culls.
- Geometry remains shared and vertex buffers/assets remain unchanged. A WeakMap retains the original sphere and largest needed margin per geometry, so repeated cloned mounts/rebuilds do not accumulate expansion. Assembly checks the live amplitude uniform on binding and in assemble.update before the production render; increasing amplitude grows the sphere monotonically. Non-finite/malformed masks or a non-finite amplitude set the culling sphere radius to Infinity (fail-open for culling). Finite channel values use the same [0,1] clamps as the shader.
- Independent binary read of all eight exact coral exports using their current default amplitude .014m gives local expansion margins about22.9–58.2mm including the pad; rigid primitives' margin is from skirt tuck alone. These are local geometry units (meter assets), then transformed by assembly scales.
- Added regressions for a frustum miss before expansion and pass after expansion (rigid vertex x=1.01,y=0 tucks to x=.775), soft motion sampled across three vertices/times within the analytic sphere, actual shared geometry identity, repeated assembly idempotency, mutable amplitude growth, and non-finite mask/amplitude fail-open. Scoped command: `npm exec vitest -- run --maxWorkers=2 src/rendering/scene/reef-assembly.test.ts src/rendering/scene/coral-material.test.ts` — 2 files/12 tests pass. `git diff --check` passes. `npm run typecheck` is currently blocked only by unrelated concurrent fish-spawn.test.ts TS18048 errors at lines148-149 (`edge.expectedMinimum/Maximum` possibly undefined); the TypeScript pass reported no errors in these AQ-42 files.

Only src/rendering/scene/reef-assembly.ts and reef-assembly.test.ts changed for this lane. Full art acceptance, exact current-scene visual clipping/performance, normal quality, and Root's viewport review remain separate AQ-42 gates. No acceptance criteria/status were changed.
---

author: root
created: 2026-11-06 04:36
---
Root review of displacement-bound slice: static skirt plus per-vertex soft sway displacement and baseSphere+margin triangle inequality are conservative; shared geometry positions remain unchanged and monotone margin avoids rebuild accumulation. Actual installed Three camera and shadow renderers both call Mesh.intersectsFrustum -> Frustum.intersectsObject -> geometry.boundingSphere. One numeric follow-up before acceptance: finiteJS amplitude can overflow Float32 uniform input (e.g1e40), while currentCPU bound stays finite; fail-open on Float32 overflow and scale the numeric pad with position/displacement magnitude for large finite amplitudes. State immutablePOSITION/COLOR0, fixedroleuniform and assembly.update-owned motion-scale scope explicitly; this is not arbitraryshader-uniform support. Keep taskopen for art/scene criteria.
---

author: @link-interaction
created: 2026-11-06 04:37
---
Independent review findings for the bounded culling fix (no reviewer edits): production displacement margin matches current GLSL static skirt tuck, X/Z flow coefficients and the shader vertical term with flex squared. The new sampled coverage test currently uses evaluateCoralVertexDisplacement.dy, whose CPU reference has only one flexibility factor; actual GLSL multiplies coralFlex twice. Please compute the test vertical displacement from the actual shader equation (or multiply returned CPU dy by its flexibilityWeight) and add a partial-flex-only fixture so the full-flex vertex does not dominate the shared maximum and hide that mismatch. Keep coral-material.ts outside this two-file patch.

Please narrow the helper docstring from every shader-reachable vertex to the supported current contract: ordinary canonical coral Mesh geometry with unchanged position/color attributes, a conservative original sphere, fixed role uniform, finite supported shader inputs and controller-owned motion scale reset to 0/1 by assembly.update before rendering. Arbitrary external role/motion/geometry mutation is not covered. Root separately requested Float32 amplitude-overflow fail-open handling and magnitude-scaled numerical padding; those changes remain worker-owned. A useful final test improvement is comparing original versus expanded spheres under the same explicit updated parent transforms, and confirming an actual shader-deformed world point lies inside the test frustum; the current rigid example checks an unmounted baseline and does not exercise a refreshed mount transform chain. Camera and shadow source paths both use Mesh.intersectsFrustum -> Frustum.intersectsObject; ordinary supplied Mesh uses geometry.boundingSphere. External AQ70.12 sand edits in aquarium.ts are outside this review. AQ42 art/actual-scene acceptance remains open.
---

author: @Luna
created: 2026-11-06 04:40
---
AQ-42 bounds follow-up iteration (2026-11-06), addressing independent review:

- Corrected the CPU reference vertical displacement to use the same flexibility squared factor as GLSL and added an explicit partial-flex raw R=.44 equation regression. No shader or asset source changed.
- The rigid-frustum regression now uses a nondegenerate three-vertex triangle. It computes each shader-tucked point through the assembled mesh's fully updated mount/world transform, constructs a frustum containing those points, then compares the same assembled mesh's Mesh.intersectsFrustum result with its original geometry sphere (culled) and expanded sphere (visible). This exercises the actual Three culling entry point and clone transform chain.
- Bounds scope is now explicit: immutable POSITION/COLOR_0 data, fixed role uniform, assembly.update-owned motion scale (0/1), and finite amplitude. Arbitrary direct geometry/role/motion-uniform mutation is unsupported. The exposed amplitude is rechecked during assembly.update before the next production camera/shadow cull.
- Float32 overflow is fail-open: reject a JS amplitude whose Math.fround is non-finite and reject per-vertex displacement/output extrema that overflow Float32, setting radius Infinity. Numeric pad now scales as 1e-5 * max(1, per-vertex local output magnitude), while ordinary default/.05 amplitude retains the 10µm pad. Added regressions for amplitude1000 scale-aware padding and JS-finite 1e40 Float32 overflow.
- Current source hashes: reef-assembly.ts 00eea3069ff8014ace0aa424c6bd1dc0e71d704c4b3c9355f955733ebd5d34ca; reef-assembly.test.ts 2637ab1c1870fed15282d3e58453549690c4018eed9ccf2e260ccffa627255cb; coral-material.ts 93db5d62466824927872926ed53ea59a4ef5306bb8457ed8c04fbc80e2e21953; coral-material.test.ts 60371f9bcc81d665baf8b20aeffa716fd370617679418f10c3dc30af440da578.

Verification: `npm exec vitest -- run --maxWorkers=2 src/rendering/scene/reef-assembly.test.ts src/rendering/scene/coral-material.test.ts` — 2 files/14 tests passed. `npm run typecheck` and its 11 script syntax checks pass; scoped diff-check passes. No acceptance criteria/status changed. AQ-42 visual/art and scene gates remain open.
---

author: @link-interaction
created: 2026-11-06 04:41
---
Independent bounded culling review PASS after feedback, 2026-11-05. Reviewed pins: reef-assembly.ts 00eea3069ff8014ace0aa424c6bd1dc0e71d704c4b3c9355f955733ebd5d34ca; reef-assembly.test.ts 2637ab1c1870fed15282d3e58453549690c4018eed9ccf2e260ccffa627255cb; coral-material.ts 93db5d62466824927872926ed53ea59a4ef5306bb8457ed8c04fbc80e2e21953; coral-material.test.ts 60371f9bcc81d665baf8b20aeffa716fd370617679418f10c3dc30af440da578. Independently ran the two focused suites: 14 tests pass; scoped diff check passes. No blocking finding within the documented current assembly contract.

Margin math conservatively adds each vertex static skirt displacement and absolute soft-flow limits: X gain 1.38, Z gain 1.10, Y gain 0.18*(1.38+1.10) times amplitude*flex squared. A sphere covering source vertices enlarged by the maximum displacement norm covers deformed vertices and triangle interiors. Shared geometry keeps one original sphere and monotone maximum margin, so repeated clones/rebuilds and lower-amplitude bindings do not compound or shrink padding. Normal updates perform constant metadata/sphere work per binding; an amplitude increase or first role binding triggers a vertex scan. This is not a claim of constant work while a caller increases amplitude every frame.

Feedback resolved: CPU reference now matches shader dy*flex squared and has an explicit partial-mask equation regression; shader source itself is unchanged. The rigid frustum test compares the same fully updated assembled Mesh before/after restoring original versus expanded sphere, and verifies its shader-tucked world vertices are inside the frustum. Finite-JS/Float32-overflow amplitudes and overflowing local displacement fail open to an infinite culling sphere; padding scales with local magnitude. Supplied ordinary Mesh camera and WebGLShadowMap paths both call Mesh.intersectsFrustum -> Frustum.intersectsObject -> geometry.boundingSphere transformed by matrixWorld.

Scope is immutable POSITION/COLOR_0, a conservative original bound, ordinary canonical coral meshes/current mount transforms, fixed role uniform and controller-owned motion scale reset before render. Arbitrary external geometry/role/motion mutation, invalid shader output repair, biological appearance, actual assembled-scene performance/occlusion and GPU/art acceptance are not established. External AQ70.12 sand edits in aquarium.ts were excluded from this review. No reviewer source/model edits, acceptance checks, Done, commit or promotion.
---

author: @link-interaction
created: 2026-11-06 04:42
---
Correction to the preceding independent pass: Root identified a remaining Float32 intermediate overflow not covered by checking final algebraically simplified displacement components. At amplitude 2e38, individual X/Z sway envelopes can remain finite while abs(swayX)+abs(swayZ) overflows before multiplication by 0.18. The final pass is held pending the worker guard and explicit regression for that GLSL evaluation order. Earlier math, shared-geometry, transformed-frustum and CPU parity findings remain valid within supported finite intermediates; no full arbitrary-amplitude approval is implied.
---

author: @Luna
created: 2026-11-06 04:43
---
Final Float32 guard update (2026-11-06): Added an explicit check for the shader's `abs(coralSwayX) + abs(coralSwayZ)` intermediate, not just each individual sway product. A=2e38 has finite Float32 A, 1.38A and 1.10A but the conservative 2.48A sum overflows; the R=0 regression confirms the assembly fails open with an infinite sphere for this case. Final hashes: reef-assembly.ts 0c2187458fb7ff22159f5d0ce221eb9983d7186288633999b12bcdebca36538a; reef-assembly.test.ts 84f71140c0c34e9745a696f0fdced959fdce85e838144fb781de933c40fb1ea7; coral-material.ts 93db5d62466824927872926ed53ea59a4ef5306bb8457ed8c04fbc80e2e21953; coral-material.test.ts 60371f9bcc81d665baf8b20aeffa716fd370617679418f10c3dc30af440da578. Final scoped run: 14 focused tests passed, typecheck + 11 script checks passed, diff-check passed. Acceptance criteria and status remain unchanged.
---

author: @link-interaction
created: 2026-11-06 04:44
---
Final independent re-review PASS at the corrected pin: reef-assembly.ts 0c2187458fb7ff22159f5d0ce221eb9983d7186288633999b12bcdebca36538a; reef-assembly.test.ts 84f71140c0c34e9745a696f0fdced959fdce85e838144fb781de933c40fb1ea7. Coral-material source/test remain 93db5d62466824927872926ed53ea59a4ef5306bb8457ed8c04fbc80e2e21953 and 60371f9bcc81d665baf8b20aeffa716fd370617679418f10c3dc30af440da578. The missing Float32 intermediate guard is now present before role/flex attenuation: amplitude, each sway product and the absolute sway-sum envelope are checked, including the zero-flex A=2e38 regression. This supersedes the held pass in the preceding correction. Independently reran both focused suites: 14 tests pass.

No blocking finding within the supported current assembly contract. Static tuck plus continuous flow bounds, shared-geometry monotonic/idempotent expansion, dynamic-amplitude remeasurement, magnitude-scaled padding, fail-open overflow handling, exact dy*flex-squared CPU flow parity and the same-updated-mesh frustum regression are coherent. Existing source roles, geometry attributes and controller-owned time/motion inputs are assumed valid as documented; arbitrary external uniform/geometry mutation and invalid shader output repair remain outside the claim. Stable frames do not rescan vertices; increasing amplitude can trigger a scan. Camera and directional-shadow culling both consume the transformed ordinary Mesh geometry sphere. Tests establish this functional slice, not biological art, GPU/platform conformance, actual assembled-scene occlusion or viewport performance acceptance. AQ42 stays open. No reviewer source/model edits or staging/commit.
---

created: 2026-11-06 04:49
---
Read-only per-current-asset bound audit reproduced at /tmp/aq42-root-reviewed-bounds/. Script: audit-coral-bounds.mjs (SHA-256 e26d05f6f4d6a5e9aeb9521bd116472440d4195efcaa980ae6c9a5c1c463933d); deterministic JSON report: coral-bounds-audit.json (SHA-256 3434b1e70286890d328faf7fa8932b203ce8ab9e782c233ddb04729625231675). Run: node /tmp/aq42-root-reviewed-bounds/audit-coral-bounds.mjs. It verifies pinned reef-assembly.ts 0c2187458fb7ff22159f5d0ce221eb9983d7186288633999b12bcdebca36538a, coral-material.ts 93db5d62466824927872926ed53ea59a4ef5306bb8457ed8c04fbc80e2e21953, manifest 6cab6a72c3dedaee2824155ae452793de90ed7fda4e596f7ccdc767ade983af4, and each of the eight current GLB SHA-256 values against the manifest. It decoded all 11 scene primitives / 111,135 POSITION and normalized COLOR_0 vertices. At default A=0.014m, per-primitive local sphere radius additions are 22.897–58.166mm (per-asset maxima: torch 40.271mm; table 37.638mm; staghorn 33.592mm; montipora 36.136mm; brain 58.166mm; anemone 25.495mm; hammer 36.933mm; zoanthid 52.423mm). Method is analytic per-vertex absolute component envelope for static skirt tuck plus maximum sine/cosine sway, then adds scale-aware 1e-5 numeric pad; no temporal sampling is used. The GLB sweep covers current local asset coordinates; expansion is added to the original bound and Three transforms it through the mesh mount. Scope remains fixed role, immutable POSITION/COLOR_0, assembly-managed motion scale, and reported default amplitude; this evidence does not establish visible clipping in a target camera, GPU conformance, arbitrary direct uniform mutation, art/scene acceptance, or viewport performance. No acceptance criteria/status changed.
---
<!-- COMMENTS:END -->
