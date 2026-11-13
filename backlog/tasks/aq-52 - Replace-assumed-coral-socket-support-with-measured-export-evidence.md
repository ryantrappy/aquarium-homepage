---
id: AQ-52
title: Replace assumed coral socket support with measured export evidence
status: Done
assignee:
  - '@gemini'
  - '@asset-validation'
created_date: '2026-11-04 19:04'
updated_date: '2026-11-05 04:22'
labels:
  - modeling
dependencies:
  - AQ-40
  - AQ-50
references:
  - AQ-14.3
  - src/rendering/modeling/package_modular_corals.mjs
documentation:
  - docs/asset-contract.md
priority: high
type: bug
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The supplied packager copies socket transforms as support points and calculates supportedRadiusM=footprint+0.012 and freeRadiusM=clearance+0.025, labeling these surface-probes-v1 without performing geometric measurements. This does not prove attachment, footprint or colony clearance. Generator sockets use nearby qualifying vertices plus fixed rotations. Reinspect current Gemini exports; these are audit-snapshot findings. Gemini owns visual changes; Codex may make necessary functional integration changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Available sockets have reproducible support, footprint and clearance measurements against exact exported geometry, with an external report pinned to its hash.
- [x] #2 Socket positions meet contact tolerance and local up matches measured normal; unsupported sockets are unavailable rather than given passing measurements.
- [x] #3 Metadata no longer labels synthetic allowances as performed probes, and verified records pass the asset contract without implying fish habitat from socket names.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-read scratch and current exact export; mark scratch entries reviewed. Keep Gemini model/generator/packager paths untouched because they are concurrently staged user work.
2. Implement independent functional inspection tooling under src/rendering/assets that decodes exported mesh geometry/transforms and measures socket contact, orientation, footprint support and clear volume. Write hash-pinned external reports without modifying GLBs.
3. Fail closed: rejected or unmeasured sockets are explicitly unavailable; never copy claimed support radii as geometry evidence. Add meaningful synthetic geometry regressions including gaps and obstructed clearance.
4. Run tooling on current supplied rocks; record exact source hashes and supported/rejected sockets. Root reviews functional findings before deciding any isolated packaging/consumer change; no visual modeling.
5. Complete task only when actual measurement replaces synthetic evidence in the active pipeline and all criteria are objectively verified. Independent tooling alone is a partial milestone, not Done.

Root owns the standalone CLI and documentation; @focus_review owns the pure inspection API and geometry/parser regressions. No shared file edits.

2026-11-04 independent completion review: rerun reviewed inspectRockSockets on pinned current exports, compare regenerated measurements to packaged records/reports, exercise meaningful parser/geometry regressions, inspect active packager fail-closed adoption, then report verified AC evidence to Root without editing models or packaging.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root accepted the independent inspector/CLI slice after reviewing code, fixing a degenerate rotation regression to tilt an offset socket and its shelf, and passing all 9 geometry/parser tests. The exact supplied left/right GLBs were rerun with the reviewed CLI: 0/12 and 0/11 supported under the explicit planar-footprint settings; 2383 and 2164 footprint samples respectively. All centers contact geometry (distance 0), but all up-normal/footprint checks reject; clearance rejects 11 per island. Geometric normals are facet-sensitive at shared-vertex ties, so this is conservative readiness evidence, not visual model rejection or a whole-colony certificate. Hashes remain left bc055e316fd131cfd8d777e5eaed297507a37d76a6dd72d800485b2661d8a449 and right bd7df7adaa1fd5792846813648acca15990b27d9ee43d01375cb8990bcf5b034. Reviewed reports: /tmp/aq52-root-left-reviewed.json and /tmp/aq52-root-right-reviewed.json. CLI help/invalid-argument/refused-overwrite checks behaved correctly. No GLB/generator/packager edits, no acceptance criteria checked, no scene promotion. Active packaging still uses synthetic allowances; AQ52 remains In Progress pending measured pipeline adoption and model/intent readiness.

Reviewed exact-export evidence is now preserved in docs/asset-evidence/aq52-left-socket-report.json and aq52-right-socket-report.json, with portable report references and source hashes. docs/socket-verification.md documents command exit behavior, sample/cylinder settings, facet sensitivity, whole-colony limits and current rejections. This is a reviewed functional tooling milestone only; no AC or Done because packaging adoption/model-intent readiness remains outstanding.

2026-11-04 (@gemini):
- Sculpted coplanar horizontal mounting pads (r_pad = footprintRadiusM + 0.016 m) and clear cylinders (r_clear = clearanceRadiusM + 0.018 m) into both live-rock-island-left.glb and live-rock-island-right.glb in src/rendering/modeling/build_live_rock_islands.py, and placed each socket_* Empty at the interior centroid of the center flat pad triangle with identity rotation (up = [0, 1, 0] in glTF).
- Updated src/rendering/modeling/package_modular_corals.mjs to replace synthetic surface-probes-v1 allowances with real measured geometry inspection via inspectRockSockets() from src/rendering/assets/socket-inspector.ts.
- Packaging now writes hash-pinned external socket reports (src/rendering/assets/corals/live-rock-island-{left,right}-socket-report.json), populates inspectionRecord.sockets exclusively from socketReport.supportedSockets, and fails closed if any socket is rejected.
- Regenerated docs/asset-evidence/aq52-left-socket-report.json and docs/asset-evidence/aq52-right-socket-report.json using node src/rendering/assets/inspect-rock-sockets.ts:
  * live-rock-island-left.glb (sha256: 2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c): 12 supported, 0 rejected (all 12 sockets achieve socketToSurfaceDistanceM = 0, upNormalVectorDifference = 0, footprintFailedSamples = 0, blockerTriangleCount = 0).
  * live-rock-island-right.glb (sha256: 68337f7733b782f374efa0ea051138344a17fe6139be14ab4efa95f34eb2d4d6): 11 supported, 0 rejected (all 11 sockets achieve socketToSurfaceDistanceM = 0, upNormalVectorDifference = 0, footprintFailedSamples = 0, blockerTriangleCount = 0).
- Verified npx vitest run src/rendering/assets/contract.test.ts src/rendering/assets/socket-inspector.test.ts passes (2 files, 19 tests passed).

Root final support review2026-11-04: independently reran read-only checker against current exact left2f90be.../right68337f... exports and both packaged/docs reports;12left/11right supported,0rejected, all exact report data reproduce after report-path normalization only. Read packager: synthetic allowances removed; actualinspectRockSockets measurements consumed and rejection fails packaging. All16inspection records passcontract. Support/normal/contact/cylinder results are finite-resolution measurements with documented limits, not proof of final colonyfit or fishhabitat. Prior19inspector/contract and6freshness tests are covered in reviewed176-test checkpoint. Root reviewed technicalrepair; assets/coralpipeline nowread-only for the user-managed otheragent. No scene promotion; art/collision remainseparategates.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: root
created: 2026-11-04 19:11
---
Resuming highest-priority eligible functional slice while AQ51 visual cave work remains assigned Gemini. @focus_review owns independent exact-export socket verification only; no edits to concurrently staged model/generator/packaging files or existing index. Root owns review and finalization. Startup scratch has been fully read and all ten entries have dated review dispositions.
---

author: root
created: 2026-11-04 19:24
---
Root incremental review of first socket-inspector slice: (1) cylinderIntersectsTriangle projected point-in-polygon currently treats an all-collinear radial projection as inside because every cross sign is zero; a far vertical radial triangle can falsely block. Require nonzero projected polygon area before inside classification and cover this case. (2) supported measurement details are discarded, and footprintSampleCount currently reads nonexistent sampleCount so becomes zero; retain actual per-socket samples/results with declared settings. (3) enforce meter/+Y metadata and reject unsupported socket scale/shear or document radius transform semantics rather than silently stripping scale in quaternion extraction; reject normalized float POSITION and unsupported deformed meshes. (4) ensure supported records use actual rock primitive IDs and allowed socket name/archetype mapping, with duplicate names rejected. Remove unused d variable. Root has not accepted this slice yet; model/pipeline files remain untouched.
---

author: root
created: 2026-11-04 19:33
---
Root regression review: current farWall fixture at fixed x=5 with z spanning +/-0.3 does not reproduce the old all-zero-cross bug. Use a vertical triangle in a radial plane with projected points all on one ray, e.g. positions [5,.01,0, 6,.3,0, 5,.3,0]; the original inside test would falsely block it. Add one genuinely internal gap footprint case and one parent rotation case (current transform test only translates/scales) to verify the actual geometry contracts. Keep geometric normals and document facet tie sensitivity; do not reinterpret shading normals as support proof. Other first-round fixes look aligned; final tests and actual rerun remain.
---

author: @focus_review
created: 2026-11-04 19:33
---
Independent functional slice ready for Root review; no acceptance criteria/status changed. Added  and ; Root owns  CLI/docs. API  parses GLB v2 embedded buffers, default-scene transforms, indexed/non-indexed TRIANGLES, real POSITION/index data and exported reefSocket intents; it rejects malformed bounds/accessors, sparse/compressed/deformed/non-triangle geometry, unsupported transforms, wrong units/up axis, role/name/archetype mismatch and duplicate names. Contact uses 2 mm tolerance; measured normal uses nearest geometric triangle face with the facet/shared-vertex tie limitation documented. Footprint uses radial samples at 5 mm spacing, max 30° sample face slope; output labels this finite lattice, not continuous proof. Clearance is exact triangle intersection with explicit cylinder radius/height equal requested clearance and 2 mm base offset; only coplanar support skin within the offset is excluded. Supported contract-shaped records carry exact GLB SHA/report path; unavailable nodes retain intent/local transform and reasons separately. Synthetic tests: flat supported shelf, edge/gap, floating/wrong normal, blocker and far collinear false-positive, transformed mesh/non-indexed triangles, invalid quaternion/scale, duplicate/mismatched socket, bounds/normalized float/unit/mode failures. 
 RUN  v5.1.0 /Users/ryantrapp/Desktop/Code/aquarium-homepage

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  13:33:57
   Duration  138ms (tests 49%, import 32%, transform 12%, worker 7%): 7 passed; 
> typecheck
> tsc --noEmit: passed. Read-only exact rock exports wrote  and ; SHA matched manifests. Left 0/12 available (2383 footprint samples), right 0/11 (2164); all 23 centers contact at 0 m, all 23 fail up-vs-nearest-face vector tolerance and sampled footprint, and 22/23 intersect the tested clearance cylinder. One left socket clears the cylinder but fails orientation/footprint. These are fail-closed geometric preflight results only, not visual rejection or whole-colony-fit proof. All 23 remain unavailable; no model, generator, packager, existing report, package script, staged file, index or source integration was changed.
---

author: @focus_review
created: 2026-11-04 19:35
---
Correction to #4 plus requested regressions: fixed the far-wall fixture to the exact radial-plane case [5,.01,0, 6,.3,0, 5,.3,0]; added an internal unsupported annulus while the socket center remains supported; added parent Y-rotation coverage. Targeted suite: 1 file, 9 tests passed. npm run typecheck currently fails in staged src/simulation/fish-extensions.test.ts lines 88-89 because test operation is inferred as string instead of add/replace; errors are outside this slice. No status or AC changes.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Accepted measured socket evidence replacing synthetic allowances. Root reproduced12left/11right supports, exact-hash report freshness and contract validity; unsupported exports failclosed. Colonyfit, art and fish/navigation approval remain separate.
<!-- SECTION:FINAL_SUMMARY:END -->
