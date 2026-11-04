---
id: AQ-40
title: Create a verified real-time biological asset pipeline
status: In Progress
assignee:
  - '@render-integration'
created_date: 2026-11-03 12:33
updated_date: '2026-11-04T07:18:00Z'
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
  - docs/asset-pipeline-proof.md
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

Observed bake result is a bounded capability proof, not a production acceptance. A singular UV loop produced one zero tangent on initial tangent export; review export omitted TANGENT and yields the Khronos warning recorded in comment #15. Selected Three.js must be reviewed to confirm generated TBN behavior before use. Source coordinates have no documented physical calibration; report them as source-coordinate units only. Normal bake did not materially remove facets at 30k triangles.
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

author: @catalog
created: 2026-11-04T06:39:00Z

---

## Original procedural rock bake proof (2026-11-04)

Built an original porous-rock high/low proof with Blender 5.0.1 using `src/rendering/proof/build-original-rock-bake.py` (`--threads 4`). It demonstrates UV unwrap, 1024px Cycles DIFFUSE color-only base-color bake, EMIT roughness bake, AO bake, and GLB ORM channel packing. Roughness emission ramp is copied from the procedural source ramp. No external model was used.

Review files are outside git in `/tmp/aq40-pipeline-review/`: low GLB, saved source `.blend`, `provenance.json`, Khronos report, and rebuild README. Generator SHA-256 `51a93421db94cad48f54f35dd14566cfe04dd15cf27044895ea77c31f447082d`; source blend SHA-256 `96884463c712155a1bd664ef46a2378163876fd16ee7f546ac323e2893a6a7f8`; GLB SHA-256 `279464c29f93b6ba50257a4ec53a08a8c0ba46b8e52df7a63a8bac134e057b86` (1,295,124 bytes).

Parsed export evidence: 320 triangles, 281 POSITION vertices after UV seam splits, measured bounds dimensions 0.408800 × 0.243664 × 0.299843 m, root translation zero/rotation identity/scale one, primitive extras `porous-rock`/`rock`. BaseColor references image 1 (1024² PNG). Both metallicRoughness and occlusion reference image 0 (1024² PNG); exporter packed AO in R, roughness in G, metallic in B with metallicFactor 0. No normalTexture and no COLOR_0. Khronos glTF Validator 2.0.0-dev.3.10: 0 errors, warnings, infos, or hints. Shared `validateAssetContract` accepted the actual inspection record.

Limitations: procedural test geometry is not production live-rock art; no sockets, collision proxies, coral masks, or normal map are claimed. Blender logged a multiple-image sampler warning during ORM export; the final GLB pointers and channels were parsed and validated. Root/renderer still need the selected-Three visual checks at 402×874 and 1440×900 before this bake evidence can close its acceptance criterion.

---

author: @storage
created: 2026-11-04T06:42:00Z

---

Bounded PixForge staghorn bake proof, Blender 5.0.1, four threads; review-only outputs remain in /tmp. Pinned high input SHA-256 96a57944bc5c68b6e2a8244b10a83d16aff1a761cdabbf5379e2a36169ccda55, 1,945,640 triangles, 93,766,820 bytes; existing smooth LOD SHA-256 6f90a78ddf5df726f9fd466df4e709eb3eca6780fde2c0a5891f1560263eaec2, 30,000 triangles, 13,257,016 bytes. Selected-to-active tangent-space NORMAL bake at 2048², 8px EXTEND margin, no cage, max ray distance 0.007835694 source-coordinate units (0.8% of 0.97946 max AABB extent); source high normal-map node remained connected, low UVMap/baseColor/geometry preserved. Bake PNG /tmp/aq40-pixforge-staghorn-30k-normal.png: SHA-256 59b86363e6e60078418aa6728f3695f90106e83d571eb6bf404c7aea19afb4bd, 4,531,641 bytes, Non-Color. Initial export with tangents had one zero-length tangent at one singular UV loop; the input smooth LOD itself validates clean. Per root review, one re-export omitted TANGENT so selected Three.js may derive tangent space from UVs. Candidate /tmp/aq40-pixforge-staghorn-30k-normal-baked-no-tangents.glb: SHA-256 30b1faa77617c0ddd3c6eea4f233ddbb3f100cb553cd3fe79c323add5132ea6e, 13,340,520 bytes, 30,000 triangles, attrs NORMAL/POSITION/TEXCOORD_0, normalTexture index 0/baseColorTexture index 1. Khronos Validator 2.0.0-dev.3.10: 0 errors, 1 warning (MESH_PRIMITIVE_GENERATED_TANGENT_SPACE: runtime-generated tangent space may be non-portable). Matched neutral outputs: /tmp/aq40-high-side.png, /tmp/aq40-low-side.png, /tmp/aq40-baked-side.png and corresponding -oblique.png. The bake preserves appearance/map roles but does not materially improve observed branch faceting or silhouette; no verified physical calibration exists, so bounds/ray are source-coordinate units, not meters. Source normal-map remained connected during bake but bake input from material normal is not independently established. This is pipeline capability evidence only; no modular COLOR_0, contract validation, production promotion, AQ AC check, or final visual acceptance.

---

author: @render-integration
created: 2026-11-04 06:43

---

Selected-Three browser fixture source is ready for root server/QA: src/rendering/proof/pipeline-study.html + pipeline-study.ts, explicit proof Vite entry. No server/build started by worker. Dev-only /pipeline-review mount serves only manifest.json and lowercase GLB basenames from the realpath-confined /tmp/aq40-pipeline-review directory; no outside symlink targets or source .blend files, and no temporary artifacts copied into builds. Explicit ?review=local enables temporary review; curated default remains empty until approved durable assets exist. Validated canonical-meter original rock bake is staged. Matched neutral room environment/lights/camera/exposure, front/oblique and Pause light sweep, normal/AO toggles on baked side, actual loaded role counts and raw glTF map pointers. Typecheck/config syntax/whitespace checks pass. No main renderer/rig/GLB promotion. Source-coordinate coral normal proof is awaiting root choice of an explicit review design scale or source-unit labels; physical scale is unverified.

---

author: @render-integration
created: 2026-11-04 06:45

---

Both validated review specimens are staged for root-owned browser QA at pipeline-study.html?review=local. Rock is canonical-meter original bake; coral is repaired no-TANGENT normal proof paired with matching unbaked low mesh only. Coral source units are uncalibrated: approved uniform REVIEW multiplier 0.2556040430654893 gives a chosen 0.25m longest display dimension on both, with actual raw source bounds separately reported. Coral baked SHA256 30b1faa77617c0ddd3c6eea4f233ddbb3f100cb553cd3fe79c323add5132ea6e; reference 6f90a78ddf5df726f9fd466df4e709eb3eca6780fde2c0a5891f1560263eaec2. Expected generated-tangent-space portability warning disclosed; no full coral unit/mask/asset-contract/art claim. Typecheck/config syntax/diff checks pass; worker started no server/build. Fixture curated default remains empty until durable artifacts are root-approved; no production/main edits.

---

author: root
created: 2026-11-04T06:54:00Z

---

Root review continuation: browser access host is unavailable and native Chrome reports cgWindowNotFound; two-viewport selected-Three acceptance remains pending, not waived. HTTP review fixture serves expected HTML/manifest/GLB and rejects source blend, arbitrary JSON and POST requests. Root independently parsed coral GLBs: embedded base-color payload is byte-identical, normal payload equals the recorded baked PNG, and 30k triangle POSITION/UV multisets match at 1e-6 source-coordinate rounding. Exported vertex counts differ 43122→43125 and some NORMAL values change, so storage is quantifying shading-basis differences before a preservation claim. Catalog is correcting the high-rock polygon-vs-triangle measurement and repeating the corrected recipe. Preserve final study specimens/reports as durable technical-review artifacts, without main promotion or AQ40 completion. Foundations stay behind the pipeline gate.

---

author: @catalog
created: 2026-11-04T06:55:00Z

---

## Rock bake reproducibility and triangle-count correction (2026-11-04)

Repeated the pinned recipe in fresh directories with Blender 5.0.1 and `--threads 4`. The pre-correction repeat `/tmp/aq40-repeat-20261104/original-rock-bake.glb` was byte-identical to the original review GLB: SHA-256 `279464c29f93b6ba50257a4ec53a08a8c0ba46b8e52df7a63a8bac134e057b86`, 1,295,124 bytes. This exposed a metric-labeling error: Blender `len(mesh.polygons)` for the subdivided high source is 3,840 quad faces, which triangulate to 7,680 loop triangles. The prior comment/report’s 3,840 “high source triangles” was incorrect.

Corrected `build-original-rock-bake.py` to use `calc_loop_triangles()` for high and low triangle counts and record polygon counts separately. High source is 7,680 triangles / 3,840 quads; low target is 320 triangles / 320 faces; exported GLB is 320 triangles / 281 POSITION vertices. Corrected generator SHA-256 `525f445620b5b6b1d754820674aaacdfebe7c7e602047952b4ca2b36311d5a7b`. Corrected output at `/tmp/aq40-corrected-repeat-20261104/original-rock-bake.glb` is 1,295,156 bytes, SHA-256 `a2b599bd97be2603e7f03c540f3343322b3bfc41c1b7280dab4e4347a28485f6`. A second corrected rerun in `/tmp/aq40-corrected-repeat-check-20261104/` produced the exact same GLB hash and byte count.

Compared with the earlier review GLB, corrected output geometry (positions, indices, 320 triangles), both embedded PNGs, bounds/root transform, map bindings and material channel roles are unchanged; both PNG SHA-256 values match exactly. The GLB hash/size changed because extras now pin the corrected generator SHA and recipe text. BaseColor remains image 1; metallicRoughness and occlusion remain image 0 (AO R, roughness G, metallic B); no normal texture or COLOR_0. Corrected inspection passes shared `validateAssetContract`; Khronos Validator 2.0.0-dev.3.10 reports zero issues.

The saved `.blend` byte hash varies between output paths/runs, so only the GLB was byte-reproducibility-checked. Existing review-directory artifacts were left untouched. The corrected GLB/report/validator are under `/tmp/aq40-corrected-repeat-20261104/`. No viewport claims or AC checks are added; root visual review remains pending.

---

author: @catalog
created: 2026-11-04T07:01:00Z

---

## Final seed-pinned rock bake and neutral views (2026-11-04)

Applied root’s determinism correction: the previous script recorded `SEED=7319` without assigning it to Cycles. It now sets `scene.cycles.seed = 7319`, `scene.cycles.use_animated_seed = false`, and records `samples=16` in the recipe/report. A fresh final build and a second fresh rerun both produced the same GLB SHA-256 `9959640beeae110ade6dca6a858ca87c568c62458139592ebeee342d1f1936b9` (1,295,952 bytes). Generator SHA-256 `39036ed42bd7968985f21399f1e15b8516a17e4b72c8d0b381b7168e5fa3e636`.

Final task directory `/tmp/aq40-final-repro-20261104/` contains the GLB, exact source `.blend`, provenance JSON and Khronos validator report. Correct counts: high source 7,680 loop triangles / 3,840 quad polygons; low and exported 320 triangles / 320 polygons; exported 281 POSITION vertices. Dimensions remain 0.408800 × 0.243664 × 0.299843 m; root is identity. Final embedded images: packed ORM image 0, 529,229 bytes, SHA-256 `0d5be0fcb9f828a527419c185850cd9c547b7bd92b1592d6fc1e758d928c8952`; baseColor image 1, 753,273 bytes, SHA-256 `798944b076a43164cb089aa76dfb412260b8187c67b1b90c611d1ba87e7cbef3`. AO uses R, roughness G, metallic B with metallicFactor 0; no normalTexture or COLOR_0. Inspection contract passes; Khronos Validator 2.0.0-dev.3.10 reports zero issues.

Neutral Blender views rendered with the existing `render-model-views.py` at 800×600, 24 Cycles samples, four threads: `/tmp/aq40-final-repro-20261104/corrected-rock-front.png` and `corrected-rock-oblique.png`. Matching procedural high-source views using the same neutral camera/lights: `procedural-source-front.png` and `procedural-source-oblique.png`. Root’s offline front review accepts this as a material-bake specimen only and notes its rounded pebble silhouette lacks pore openings, so it is unsuitable as final bare live-rock art. This source quality limit is recorded; no art iteration or browser claim added. Browser QA remains pending.

---

author: @render-integration
created: 2026-11-04 07:05

---

Durable TECHNICAL REVIEW checkpoint ready for root-owned build, with browser QA pending: pipeline-study HTML/TS, explicit proof Vite entry, direct ?url imports of exactly 3 GLBs plus notices/provenance/validator reports under pipeline-assets. Final seed-pinned rock hash9959640beeae110ade6dca6a858ca87c568c62458139592ebeee342d1f1936b9; coral unbaked6f90a78ddf5df726f9fd466df4e709eb3eca6780fde2c0a5891f1560263eaec2; normal-baked30b1faa77617c0ddd3c6eea4f233ddbb3f100cb553cd3fe79c323add5132ea6e. Source review fixed marked-only raw-mask bypass, preservation of imported display COLOR_0, detached material retirement, optional-map/mixer/image/skeleton/shadow disposal, bfcache/reload handling and honest unit labels. Typecheck/config syntax/whitespace checks pass; no server/build run. Coral reference includes its source normalTexture and TANGENT; baked omits TANGENT and has 3 additional seam vertices. Expanded triangle POSITION/UV values match exactly; NORMAL max component difference0.003201901912689209 is recorded, so no sole-normal-bake attribution claim. Direct HIGH-to-smooth preparation now verified byte-identical by storage; current baked artifact still comes from the observed checkpoint re-export, pending requested fresh full-bake comparison. No main content/art promotion, AC checks or Done.

---

author: @render-integration
created: 2026-11-04 07:11

---

Root-selected fresh direct-recipe coral candidate now replaces the historical checkpoint re-export under the same curated filename staghorn-normal-baked.glb. SHA256576aea21f0f2e8d191f6c5e1d572e9a1e5d82de87188dd4d6224403ac7519be7, 13,340,472 bytes, 30,000 triangles, 43,124 accessor vertices; attrs POSITION/NORMAL/TEXCOORD_0. Matching combined validator copied: reference0issues, fresh candidate0errors/1generated-tangent-space portability warning. Embedded image payloads match the superseded artifact byte-for-byte; expanded triangle positions/UVs match reference exactly, normal max component difference0.0032113194465637207 recorded. Provenance now records actual fresh full-script method from pinned high+directly reproduced low; one full direct execution observed, no second full-bake determinism repeat claimed. Historical30b1 checkpoint hash explicitly superseded. Only baked GLB plus its provenance/validation changed; reference/rock hashes verified unchanged. Typecheck and diff checks pass. No server/build/main changes, no AC/Done; browser QA pending.

---

author: @render-integration
created: 2026-11-04 07:11

---

Validator packaging clarification: the supplied fresh validation.json compared fresh output against the historical checkpoint, despite its handoff description. Curated staghorn-validation.json now explicitly contains the existing official unbaked-reference report (6f90..., zero issues) and the fresh-output report (576aea..., zero errors/one expected warning), preserving report contents. No historical checkpoint report remains in the curated validation set.

---

author: root
created: 2026-11-04T07:14:00Z

---

Root accepts this as a durable technical-review checkpoint only. Independently inspected final rock/source front+oblique offline renders: baked material survives export, but rounded faceted pebble is unsuitable final live rock. Corrected high count7680 loop triangles and actual Cycles seed7319 are now reproducible; contract inspection passes. Independently parsed fresh coral576aea21 export:13340472B,30000triangles,43124POSITIONvertices, NORMAL/POSITION/TEXCOORD0 and normalTexture present. Reference6f90 and rock995964 unchanged. Full typecheck and isolated two-entry proof build pass; all three review GLBs emit byte-identically to curated originals. Default curated /pipeline-study.html is authoritative; ?review=local remains historical/temporary opt-in. Browser host remains unavailable and native Chrome has no controllable window, so 1440x900/402x874 Three review and portability/appearance remain unverified. No AC checked or Done; no main asset/scene promotion or deployment. AQ14.3 plan now explicitly starts after this gate and retains rejected scan cleanup only as history.

---

author: root
created: 2026-11-04T07:16:00Z

---

Final storage handoff synchronized by root after the worker CLI append hit a shell parse error: the fresh direct script export supersedes the older 30b1 checkpoint re-export. Curated output SHA-256 is 576aea21f0f2e8d191f6c5e1d572e9a1e5d82de87188dd4d6224403ac7519be7, 13,340,472 bytes, 30,000 triangles and 43,124 exported vertices. One full fresh bake succeeded using the directly reproduced 6f90 smooth LOD; this is not a repeated fresh-bake byte-determinism claim. Embedded base-color and baked-normal payloads match the earlier proof exactly; actual fresh Khronos report has zero errors and one generated-tangent-space warning. The bundled reference and fresh reports match their actual GLBs. Durable commands, measurements and limits are in docs/asset-pipeline-proof.md. Browser review remains pending; all workers have stopped writing and no acceptance criterion or task status was changed.

---

author: root
created: 2026-11-04T07:18:00Z

---

Root clean-source verification passed: exported the exact staged Git tree into an isolated directory and built the proof using only archived source plus the existing installed dependencies. Both HTML entries and all three curated GLBs emitted; each emitted GLB is byte-identical to its archived source. No untracked prototype, external source model or /tmp review specimen was needed. This verifies bundling, not browser rendering. Typecheck passed separately. Commit remains a pending-browser-review technical checkpoint; no deployment.

---
<!-- COMMENTS:END -->
