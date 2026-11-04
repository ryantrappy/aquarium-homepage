---
id: AQ-40
title: Create a verified real-time biological asset pipeline
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-03 12:33
updated_date: '2026-11-04T02:45:00Z'
labels: []
dependencies:
  - AQ-5
references:
  - docs/gemini_planning.md
  - docs/reef_aquarium_all_code.md
documentation:
  - docs/gemini-research-links.md
  - docs/open-source-asset-and-motion-research.md
priority: high
type: task
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fish and corals need anatomically credible, reusable assets with provenance and browser-size budgets. The reference suggests scanning, modeling, baking and glTF optimization, but source rights and individual tools must be assessed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Document source and license, attribution requirements, source files, and reproducible export process for every production biological asset.
- [ ] #2 Establish and demonstrate a Blender-to-glTF pipeline for geometry, materials, rigs and texture baking using an appropriately licensed or original specimen.
- [ ] #3 Measure before-and-after geometry, texture and transfer costs; test optimization choices and visual quality in the selected renderer at both target viewports.
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T18:33:00Z

---

Paid or unavailable listings may still serve as publicly viewable visual guidance; no purchase is required or authorized. The production asset pipeline must use accessible assets with verified sources and licenses; a reference listing does not grant reuse rights or count as an inspected/imported asset.

---

author: @root
created: 2026-11-03T18:34:00Z

---

Publicly accessible previews can guide asset research when cost or download access prevents testing. Record the listing as reference-only; use accessible assets with verified sources and licenses for implementation and tests. Viewing grants no reuse rights.

---

author: @Luna
created: 2026-11-03 19:03

---

Read-only pipeline audit (no renderer files changed). Good provenance is recorded for the two Sketchfab CC BY 4.0 fish and the reef scan: creator/source/license, source SHA-256, and modification notes are present in ASSET_NOTICES.md. Concrete reproducibility gaps: (1) candidate-real-clown.glb and candidate-real-tang.glb are ignored symlinks to /tmp/aq-authored-clown.glb and /tmp/aq-authored-tang.glb; they exist only on this machine, so a clean checkout cannot run the viewer or validator. The downloaded source GLBs are external as well: hashes and source links are recorded, but there is no checked-in acquisition/checksum step or durable source/output artifact location. (2) The fish rig script preserves the downloaded textures and adds approximate rigs/geometry, but does not bake textures. The original modeling scripts are separate prototypes: the clown uses a supplied raster skin and exports with animation disabled; the tang is solid-color material, also with animation disabled. This does not demonstrate the requested geometry/material/rig/texture-bake export pipeline. (3) Source triangle/texture metadata and validator results are documented, but output GLB byte sizes and before/after geometry/texture budgets are not preserved in the repo; validation reports live under /tmp. The reef notice says derivative counts/error/size are in docs/rendering.md, but that document currently has no reef derivative metrics. prepare-reef.py prints triangles, sampled geometric error, bounds, and texture dimensions but no output hash or file size. (4) Recorded technical risks remain: clown normal maps lack exported tangents and source shading is baked; the tang required authored pectoral geometry because the source has no discernible independent pectorals; the reef scan has baked underwater lighting, open edges/underside, and downsampled texture detail. Suggested repeatable checkpoint: a source/output manifest with exact acquisition hashes, Blender/tool versions, arguments, generated hashes/sizes/triangle and texture counts, and validation report stored with the licensed artifact outputs. AQ-5 engine selection and production selection remain pending.

---

author: @Luna
created: 2026-11-03 19:20

---

Durable asset checkpoint: tracked CC BY 4.0 fish and reef derivatives are regular files; source/output SHA-256, byte sizes, geometry/image counts, reef recipe and Khronos validator report are in src/rendering/proof/asset-manifest.json and validation-report.json. Reef export repair omitted unused tangents after diagnosis found zero tangent vectors (not normals); checkpoint mesh had no zero-area faces and no topology, normal, UV or material changes were made. Root reviewed offline front/oblique views and accepts the scan only for technical comparison. The 244 MB originals remain external; the committed-size derivatives let the fixtures load without source acquisition. Corrected reef browser review at 402×874/1440×900 is pending Mac unlock. Texture baking pipeline and production asset quality are not established; task remains open.

---

author: @Luna
created: 2026-11-03 20:09

---

Bounded blue-tang source screening (no asset downloaded/added): exact roster-referenced listing is Regal tang by Zacxophone, https://sketchfab.com/3d-models/regal-tang-b959a0cbeb4542bab2d9bc54e6e0780a. Official public metadata at https://api.sketchfab.com/v3/models/b959a0cbeb4542bab2d9bc54e6e0780a reports license={} and isDownloadable=false, so rights and source access are not established; we must not use/distribute it. Listing claims 3,882 triangles, 80-bone hand-made armature, one cycled swim animation, and four 4096px textures (base, normal, roughness, alpha); source format listed as FBX. Sketchfab viewer says this model is too heavy for this device and cannot render properly, so all-angle/species anatomy review is incomplete. Poster silhouette looks tang-like but noticeably stylized; tags include clownfish, so species identity also needs caution. One bounded official Sketchfab search for “Paracanthurus hepatus rigged animated” yielded a collection item “Paracanthurus Hepatus Rigged” by Alves.cg, but the collection was not fetchable (403); no individual license/download/model details were verified, so it is not a usable replacement. Stop this search rather than broaden candidates. No source was downloaded; no derivative or manifest change. AQ-40 remains To Do with dependencies and acceptance criteria unchanged.

---

author: @Luna
created: 2026-11-03 20:17

---

Bounded public CGTrader review (2026-11-03; no account, purchase, download, or terms acceptance). Exact listings: Clownfish Realistic Animated by JosKata — .00, “Royalty Free License,” 1 review; seller description names Maya original plus OBJ/FBX/3ds Max, the format table also lists MA and textures, with no GLTF. Listing claims Animated/Rigged/PBR; CGTrader verification applies to the FBX file. Metadata says 1,634 polygons / 1,557 vertices and 2048² PNG texture. Yellow tang by JosKata — .00, same license label, no reviews; OBJ, MAX, textures, FBX, MA listed, no GLTF; same Animated/Rigged/PBR claims and FBX verification. Metadata says 458 polygons / 466 vertices and 2048² PNG. Current prices and listing metadata can change. Sources: https://www.cgtrader.com/3d-models/animal/fish/clownfish-329350f1-57d9-4bf7-8522-9c7fdb5e5280 and https://www.cgtrader.com/3d-models/animal/fish/yellow-tang-3d5cfc5c-4ece-40aa-88e3-34a42ab2ce4e\n\nPack 8 by JosKata currently lists .00 and “Royalty Free License,” with 30 items and 1 review. Coverage shown by the pack roster includes Clownfish, Blue Tang, Flame Angelfish, and Chelmon rostratus (Copperband butterflyfish), which are common-name matches for four entries in the 15-species roster; it also includes Discus (freshwater), so it is not a saltwater-only pack. Yellow Tang is not in the 30-item list; it is only a separate listing. Pack formats: OBJ 30/30, MA 30/30, MAX 30/30, FBX 29/30, GLTF 1/30, BLEND 1/30, PNG 4/30. Listed feature counts: Animated/Rigged/Low Poly 30/30, PBR 26/30. The pack page does not identify which specific fish is GLTF, nor does the listing give clip names/rig details per model. Source: https://www.cgtrader.com/3d-model-packs/coral-reef-fish-collection-animated-game-ready-pack-8\n\nPreview evidence: I loaded the official still image for each single listing. The clownfish one-view render is overtly stylized with chunky, angular fins and strong black outlines; the tang render has a smooth recognizable side silhouette, a visible pectoral fin and broad tail. These are stills only, not all-angle inspection. CGTrader's media element did not play in the public-page view, so motion is unverified; Animated/Rigged are listing claims, not observed results. Neither view proves a better anatomical asset than our technical specimens. The tang's 458-polygon count especially merits inspection before treating “realistic” as a quality upgrade. Our current licensed study specimens remain the reproducible baseline (clown 1,685 triangles/3×2048² images; tang 8,796 triangles/1×1024² image); their known shortcomings and provenance are in the committed manifest/notices.\n\nRecommendation for root review: do not spend yet. The two  single listings target the exact common names and are cheaper to inspect than the  pack, but lack listed GLTF and the preview provides no verified motion/all-angle quality. The pack has broader roster coverage but is not a targeted Yellow Tang replacement, is mixed fresh/saltwater, and only 1/30 GLTF; before any spend, ask the seller which species file is GLTF and for a representative animation/rig demonstration, then import one selected candidate and compare in the chosen renderer. No purchase or production-asset claim follows from this review.

---

author: root
created: 2026-11-04T02:45:00Z

---

Processed agent_scratch user policy: visual asset budget is0dollars; bundle only exact verifiedCC0, CC-BY4.0 or custom-made assets. No paid/NC/ND assets. Past marketplace previews remain reference-only; no purchase is authorized. Policy is durable in AGENTS.md and requirements. New research guide records candidates separately from verification; collection labels alone do not license exact assets. Rig improvements are AQ48, with original-source hashes and no automatic promotion of study candidates.

---
<!-- COMMENTS:END -->
