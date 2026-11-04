---
id: AQ-42
title: Develop coral assets and biologically varied polyp movement
status: In Progress
assignee:
  - '@Luna'
created_date: 2026-11-03 12:34
updated_date: '2026-11-04T06:43:00Z'
labels: []
dependencies:
  - AQ-40
  - AQ-14.3
references:
  - docs/gemini_planning.md
  - docs/reef_aquarium_all_code.md
  - docs/open-source-asset-and-motion-research.md
  - docs/modular-coral-and-live-rock-spec.md
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC7329047/
documentation:
  - docs/open-source-asset-and-motion-research.md
  - docs/modular-coral-and-live-rock-spec.md
priority: high
type: enhancement
ordinal: 13000
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
1. Use the signed-in official Sketchfab download choice approved by root; keep the GLB outside git and within the 100 MB review limit. 2. Verify the downloaded GLB header, exact file size, SHA-256, and source identity. 3. Render neutral front and oblique views with the existing offline Blender inspection script; record bounded visual observations and keep production choice/acceptance criteria open.

4. Make a 30k-triangle review-only LOD with the pinned source hash; retain UV/material/map roles, cap embedded image dimensions at 2048, and validate/render front, oblique, and close-up comparisons outside git.

5. Inspect the source/30k normal state; make one 30k smooth-normal variant by clearing carried custom split normals and rebuilding smooth shading without changing vertex positions. Verify normal/tangent units, retained UV/maps/colors, zero validator issues, and matched front/close-up renders.

6. Evaluate whether high-to-low tangent-space normal reprojection from the approved 1.95M-face source to the existing 30k smooth LOD improves surface shading without enlarging geometry. Preserve source color/UV/material map roles, use a conservative bounds-derived cage/ray distance, check adjacent-branch bleed and validator, and keep the result review-only.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Cross-reference the AQ-40 bounded 30k PixForge normal bake in comment #15. This does not close AQ-42; selected-Three proof, masks/contract and requested biological/visual criteria remain pending.
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
<!-- COMMENTS:END -->
