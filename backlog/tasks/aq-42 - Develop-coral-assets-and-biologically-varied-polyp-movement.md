---
id: AQ-42
title: Develop coral assets and biologically varied polyp movement
status: In Progress
assignee:
  - '@Luna'
created_date: 2026-11-03 12:34
updated_date: '2026-11-04T02:46:00Z'
labels: []
dependencies:
  - AQ-34
  - AQ-40
references:
  - docs/gemini_planning.md
  - docs/reef_aquarium_all_code.md
  - docs/open-source-asset-and-motion-research.md
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC7329047/
documentation:
  - docs/open-source-asset-and-motion-research.md
priority: medium
type: enhancement
ordinal: 44000
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
<!-- SECTION:PLAN:END -->

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
<!-- COMMENTS:END -->
