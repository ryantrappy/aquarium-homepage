---
id: AQ-40
title: Create a verified real-time biological asset pipeline
status: In Progress
assignee:
  - '@render-integration'
created_date: 2026-11-03 12:33
updated_date: '2026-11-04T06:29:00Z'
labels: []
dependencies:
  - AQ-5
references:
  - docs/gemini_planning.md
  - docs/reef_aquarium_all_code.md
  - https://polyhaven.com/a/coast_rocks_05
documentation:
  - docs/gemini-research-links.md
  - docs/open-source-asset-and-motion-research.md
  - docs/asset-contract.md
priority: high
type: task
ordinal: 11000
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Contract slice (@render-integration): document canonical meters/glTF Y-up/local origins, identity roots, the coral-only raw COLOR_0 schema, placement-socket declarations and cave-preserving collision evidence; add pure metadata/array validation and malformed-input tests. Main stays in legacy coordinates until AQ14.4. 2. Original rock bake proof (@catalog): deterministic original high/low porous rock, UV-map and bake base color, roughness and separate glTF occlusion texture; emit conforming extras and record generator/seed/source/output hashes and actual map pointers. 3. Licensed coral normal proof (@storage): bake high-to-low Staghorn tangent normals, inspect exported normalTexture/tangents, retain exact CC BY4.0 provenance; do not claim completed coral masks/art from a normal proof. 4. Existing licensed fish rigs provide separate rig/animation export evidence; no fish art/rig promotion here. 5. Record before/after geometry, textures, bytes, tool versions, commands and Khronos validation; root inspects selected-Three proof at both agreed viewports. 6. Root reviews contract, bake evidence and visual limits before acceptance checks/Done or main integration.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The contract slice is a pure offline inspection validator, not a GLB loader or raycast/visual certificate. Probe-report declarations do not independently establish support, conservative proxy coverage or cave clearance. Main renderer and proof assets are unchanged by this slice.
<!-- SECTION:NOTES:END -->

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

author: root
created: 2026-11-04T03:01:00Z

---

Bounded alternative foundation lead if reef scan cleanup reaches its fidelity ceiling: official Poly Haven Coast Rocks05 page identifies a CC0 weathered coastal limestone boulder/ledge model. This is only a potential rock foundation, not living reef/coral or permission to call coastal vegetation reef life. Exact downloadable LOD/textures, bytes, creator/source metadata and marine-appropriate appearance still need verification before acquisition/promotion. One focused primary-site search only; current AQ14.3 final backing-mass experiment should finish first.

---

author: @Luna
created: 2026-11-04 06:20

---

## Bounded Coast Rocks 05 source review (2026-11-04; no model download)

Reviewed the official [asset page](https://polyhaven.com/a/coast_rocks_05), [info API](https://api.polyhaven.com/info/coast_rocks_05), and [files API](https://api.polyhaven.com/files/coast_rocks_05), plus the official primary, front, side, top, and clay gallery previews. The listing identifies author Rob Tuytel and CC0. The info API reports 1,446,981 triangles, metadata dimensions 3036.39 × 2817.33 × 1000.50 (unit interpretation not assumed), and `lods: true`.

Visual review: a weathered coastal limestone ledge/boulder has pronounced undercuts and crevices useful for a structural-rock role. The model also contains a broad pebble-like ground base and visible green/red plant patches along the lower surface, so it is not a bare, isolated boulder as delivered and is not living coral. It may suit a separately cleaned foundation only if the broad base/vegetation can be removed without damaging the rock silhouette. The lower geometry parts are not separable from metadata/gallery alone.

The public glTF options list 1K/2K/4K/8K texture sets. Calculated package payloads are about 25.28 MB/33.58 MB/62.22 MB/160.24 MB respectively, using each glTF JSON, shared binary and three image entries. All four texture variants point to the same 22,102,224-byte 8K-path `.bin`; the API gives no distinct triangle counts for a lower geometry LOD. Thus 1K is a texture resolution choice, not verified low-poly geometry. 1K is within the stated 100 MB acquisition ceiling, but the source geometry remains 1.447M triangles and would need a separately reviewed reduction.

No model files were downloaded: current previews show coastal plant patches and an integrated ground base, and the API does not establish a lower-poly GLTF mesh. This is a conditional foundation lead, not an accepted modular bare-rock asset. Per the user direction, the AQ40 bake pipeline gate remains first; no asset was changed or promoted.

---

author: root
created: 2026-11-04T06:24:00Z

---

Root AQ40 implementation decisions: new modular GLBs use canonical meters, glTF Y-up via one Blender Z-up export conversion, local-origin unit-scale roots. AQ14.4 will migrate the legacy uncalibrated scene to a chosen design tank1.8mW×0.75mH×0.6mD; these are design values, not measured user hardware. Coral COLOR0 raw-masks-v1 uses R raw flexibility-height, G growth-tip/polyp mask, B phase seed, A contactAO; runtime exponent1.8 exactly once and no automatic PBR vertex-color/alpha multiplication. Rock AO has separate explicit semantics. Sockets are support/placement intent only; real host/refuge anchors require actual asset/clearance evidence. Preserve cave voids with authored conservative collision parts/proxies and bounded route checks, not solid columns down to sand. Renderer worker owns contract/types/validation; catalog original material-bake proof and storage licensed high-to-low normal bake fill the concrete texture-baking gap before foundation/assembly implementation.

---

created: 2026-11-04T06:25:00Z

---

AQ-40 pipeline experiment (separate from the catalog agent’s original porous-rock color/roughness/AO bake): I am evaluating only high-to-low tangent-space normal reprojection from the licensed PixForge staghorn to its existing 30k smooth LOD. This is evidence for one texture-bake capability under the asset pipeline, not completion of AQ-40. The output stays outside git and is not promoted.

---

author: @render-integration
created: 2026-11-04 06:28

---

Contract foundation source ready for root review: docs/asset-contract.md and src/rendering/assets/contract.ts + contract.test.ts. Ten focused Vitest tests pass, full tsc --noEmit and git diff --check pass. Checks include canonical meter/Y-up extras, applied roots, dimensions vs measured finite bounds, provenance, coral-only root/primitive raw-mask schema, finite complete RGBA values, rigid R=0, disabled display vertex color/alpha, socket class/parent/orientation/support/clearance declarations, and bounded collision records. No main loader/shader, GLB parser, actual raycast/proxy certificate or production asset promotion is included. Catalog/storage coordinated on actual exported extras and accessor counts. Combined bake/rig/normal-proof plan retained. No acceptance criteria checked or Done claim.

---

author: root
created: 2026-11-04T06:29:00Z

---

Root reviewed the schema/docs/source and independently ran the full104-test suite successfully. Accept the typed meter/up-axis/material-mask/socket/proxy inspection foundation as a staged component. It deliberately does not read GLB truth, prove surface clearance, install a shader adapter or establish visual quality; actual exported bake examples, measured maps and browser review remain open before AQ40 Done.

---
<!-- COMMENTS:END -->
