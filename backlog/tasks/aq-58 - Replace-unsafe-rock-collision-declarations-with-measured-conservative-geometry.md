---
id: AQ-58
title: Replace unsafe rock collision declarations with measured conservative geometry
status: In Progress
assignee:
  - '@collision-validation'
created_date: 2026-11-05 03:13
updated_date: '2026-11-05T04:43:00Z'
labels:
  - modeling
  - validation
dependencies: []
references:
  - /tmp/aq-asset-review-20261104/independent-asset-report.json
  - AQ-14.3
  - src/rendering/modeling/package_modular_corals.mjs
  - docs/asset-evidence/aq57/independent-asset-report.json
priority: high
type: bug
ordinal: 11925
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Independent exact-export audit of left rock SHA 2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c found 1679 vertices outside the three declared collision boxes; for example [-0.1163733453,0.0830261558,0.2448555976] lies on a cave wall inside the declared open gap. Root is withdrawing the unchecked collision metadata without changing visual GLBs. Future cave navigation must use actual geometry evidence rather than hard-coded empty rectangles.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Collision representation conservatively covers exact exported solid rock including sloped cave walls and exposes a measured safe passage with fish-radius clearance; tests include the known under-covered vertex.
- [ ] #2 Evidence pins source hash and documents method/resolution and both coverage and pass-through checks; metadata is absent/unavailable until validation passes.
- [ ] #3 Root reviews collision and actual-mesh routing/occlusion evidence before modular scene promotion, with original visual geometry preserved unless a coordinated functional change is required.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Research/approval stage only: inspect current exact exported mesh, existing32-AABB assembled-habitat budget, canonical units and current fish-clearance calibration. Compare exact-mesh-backed checks with a conservatively clipped band/AABB representation; propose an independently checkable triangle-and-solid coverage proof and a radius-specific through-cave test, source hashes and bounded module/test/CLI/report paths. Send algorithm/budgets to Root and wait for explicit approval before implementation or packager changes. Visual assets/generators/materials and scene/runtime remain read-only.

Researched proposal awaiting Root approval: use mesh-derived horizontal-band AABBs, not voxels or assumed cave rectangles. Decode actual canonical meter/+Y rock triangles and verify identity transforms, exact-position welded closed oriented topology and source hash. For each Y band, clip every intersecting triangle against its two horizontal planes; derive left/right support extrema only if the projected clipped geometry leaves an empty interval around an explicitly chosen cave X axis. Cover each band by left/right full-depth AABBs (or one full AABB if no gap), with numerical safety overlap/inset. Independently subtract the complete AABB union from each triangle via six-plane polygon subtraction; require no uncovered surface. Prove excluded volume is water by verifying every complement gap is a full-depth prism connected beyond the asset front/back without surface crossing. This covers bounded solid interiors, unlike vertex-only coverage. Adaptively split only bands obstructing a requested radius-specific route, stopping at explicit meter resolution/part budgets; return unavailable rather than inventing a passage. Preserve 32 AABBs for complete habitat; proposed per-asset cap16 left and1 right leaves15 for later colonies, with assembly still responsible for combined budget. Verify known missed vertex, triangles crossing gaps despite covered vertices, concave/closed/overlap surfaces, blocker/full bands, degenerate/open/invalid geometry, exact capsule-vs-mesh and actual existing cube-inflated AABB route checks. Current restored scene clearance .42 is uncalibrated legacy units; do not call it .42meters or infer a conversion. Exact supplied rest-AABB-corner radii: clown.063040m,gramma.051004m,mandarin.048918m; these are rest-pose envelopes only, not animated-envelope certificates. Proposed reports distinguish a radius-specific technical passage from actual animated-fish approval and may correctly block larger species. New files proposed: src/rendering/assets/rock-collision.ts, rock-collision.test.ts, inspect-rock-collision.ts; docs/asset-evidence/aq58/{left,right}-collision-report.json and README.md after approved checks. No existing parser/contract/nav/model/generator/packager/scene changes without further Root approval. Awaiting Root algorithm/budget/fish-probe approval before code.

Root approved independent implementation only: fixed probe radii0.02/0.04/0.06m, not species envelopes; maximum16 left/1 right parts and unchanged32 global assembly cap. Use one canonical identity rock root and single untransformed active mesh scope. Add a read-only socket-inspector wrapper reusing unchanged parseGlb; inspect only validated JSON metadata to reject ambiguous transforms/instances and skipped degenerate triangle counts. Separate exact segment/triangle capsule distance, exact swept-cube/mesh obstruction and current cube-inflated candidate-AABB route. Closed oriented edge/vertex topology required; no exhaustive self-intersection proof claimed. All omitted gaps must be full-depth exterior-connected prisms. Keep actual collision metadata empty pending Root/integration acceptance. No parser behavior/math/socket result changes; no visual asset/pipeline/runtime/nav edits.

Resume at existing implemented files/reports; preserve current seven-left/one-right candidates. Re-read current scratch/policies/task and verify live rock hashes still match pinned snapshots. Finish method/limitations/reproduction README, run scoped collision/socket/contract regressions, typecheck and read-only CLI guard/freshness checks, then provide Root a bounded evidence handoff with AC1/3 remaining open for approved fish envelope and actual-scene routing/occlusion. Coral ownership freeze remains active; no metadata installation.

Current iteration: @collision-validation proposes source-pinned exact arbitrary-direction mesh capsule queries with inside-solid handling and explicit work limits; @behavior-profiles proposes a bounded deterministic 3D planner integration. Root selects/reviews the interface before implementation. No concurrent visual asset or coral changes. Preserve all existing evidence and honest remaining scene/envelope criteria.

Proposed true3D iteration (await Root API feedback before implementation): buildMeshCollider consumes finite already-world-transformed meter/+Y triangles with source hash; no hidden axis/scale conversion. It builds a median-split triangle BVH after closed/oriented/nondegenerate/component topology validation, returning ready or explicit unavailable. queryMeshCapsule(index,{start,end,radiusM,budget}) returns clear/blocked/indeterminate with source ID/hash, reason and work counters. Boundary test is continuous arbitrary-direction segment/triangle feature distance, tangency plus1um safety margin unsafe. A boundary-free segment still needs start-inside classification: BVH-accelerated parity per closed connected component, deterministic retry rays on edge/vertex/coplanar ambiguity, fail indeterminate if unresolved/budget exhausted. Disconnected closed components use explicitly conservative union semantics, including nested shells (no inferred hollow volume). No exhaustive self-intersection certificate. Compare depth-gap/overhang/cave fixtures plus pinned rock against the band baseline; keep SDF/voxel/convex alternatives as concise tradeoff notes, not extra open tasks. New code scope only src/simulation/mesh-collision.ts and direct tests; no visual/scene/packager/parser/nav edits until Root agrees integration interface. Root owns selected architecture and later physical fish envelopes.

Approved true-3D planner slice (Root, 2026-11-05): add only src/simulation/mesh-navigation.ts and src/simulation/mesh-navigation.test.ts. Use the approved structural callback `(start,end,radiusM) -> clear|blocked|indeterminate`; do not import mesh-collision internals or modify habitat-navigation.ts/motion.ts yet. Build a deterministic bounded 3D lattice/A* graph: spherical-radius-shrunk water bounds, validate every node and arbitrary-direction edge, fixed neighbor order/tie ordering, no unchecked diagonals or path smoothing. Track cumulative query/search work for the whole request; accept only clear oracle replies. Distinguish `work-limit`, oracle/configuration `unavailable`, and `blocked` only for an exhausted finite lattice, documenting that result as resolution-limited rather than continuous-space completeness. Verify start and endpoint connections exactly; preserve request instance/generation/species/anchor metadata only if the wrapper is necessary. Test depth gaps/overhangs, symmetry under axis rotation/permutation, solid start/end, diagonal corner cutting, tangent callback, cumulative budget exhaustion, deterministic results, and metadata if used. Root reviews this pure module before any adapter/runtime wiring.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root AQ57 audit removed the unchecked hard-coded collisionParts-generation block and cleared both packaged inspection records. Contract checks pass with collision data unavailable; GLB and socket hashes unchanged. Durable independent coverage report and exact renders are under docs/asset-evidence/aq57. No collider may be promoted until this task passes.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @collision-validation
created: 2026-11-05 03:39

---

2026-11-04 startup scratch reviewed: candidate asset/art and collision gates remain pending; runtime baseline restored; local-first and bounded delegation are current policy. Root owns shared scratch. This task is demanding technical validation, not an easy packet.

---

author: @collision-validation
created: 2026-11-05 03:40

---

Research finding: navigation currently inflates AABBs by radius independently on all axes (cube envelope), more conservative than Euclidean sphere/triangle distance. Prior axis distance .063843m alone does not prove current navigation passage for a.063m sphere. Proposed evidence must report both predicates separately and use a Root-approved physically calibrated radius/pose scope. Rock GLB hashes unchanged; existing32-part global budget rules out unbounded voxel output.

---

author: @root
created: 2026-11-05 04:20

---

Root sequencing2026-11-04: this High prerequisite blocks AQ14.3, so its Kanban order is placed immediately after socket evidence and before foundation acceptance. Independent read-only collision tooling remains separate from the user-managed coral lane.

---

author: @collision-validation
created: 2026-11-05 04:32

---

Root independent adversarial review found a false-safe tangent case: closed prism x[.02,.22]m with axisX0,height.08m,radius.02m was capsule-unsafe but swept-cube/current-AABB-safe because strict interior overlap ignores contact. Correcting only offline clearance: retain open-prism boundary semantics for solid-complement coverage; add closed triangle/box intersection for swept-cube clearance, require swept-cube safety to imply the capsule safety margin, and add both the exact fixture and a true concave-arch tangency regression. Raw current navigation predicate remains reported unchanged and cannot alone certify passage.

---

author: root
created: 2026-11-05 04:39

---

User clarification 2026-11-04: collision must preserve genuinely three-dimensional water around and through geometry. Existing navigation has 3D coordinates, but legacy sand-filled height columns and the new full-depth band boxes erase real voids. Keep the bands as a measured comparison baseline only; do not promote them as the final solution. Finish the investigation and implementation as iterations within this active task instead of creating another open spike. Compare triangle/BVH swept-volume queries, volumetric grids/SDF and convex approximations on depth gaps, overhangs, caves, tangency and blocked interiors. Implement and review a bounded true-3D collision/query + route slice, then integrate the accepted scene when coral ownership permits. Probe radii remain technical fixtures until animated envelopes are calibrated. Prior 32-AABB cap is a legacy representation limit, not a requirement on the new architecture.

---

author: @behavior-profiles
created: 2026-11-05T04:43:00Z

---

Read current nav/motion path and asset-worker API. Root approved a pure generic-callback 3D lattice/A* module plus tests; actual scene integration remains gated on review. Existing box planner/runtime untouched. I am implementing as @behavior-profiles.

---
<!-- COMMENTS:END -->
