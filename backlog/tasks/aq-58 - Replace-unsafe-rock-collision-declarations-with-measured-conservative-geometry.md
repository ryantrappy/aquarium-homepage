---
id: AQ-58
title: Replace unsafe rock collision declarations with measured conservative geometry
status: In Progress
assignee:
  - '@collision-validation'
created_date: '2026-11-05 03:13'
updated_date: '2026-11-05 13:24'
labels:
  - modeling
  - validation
dependencies: []
references:
  - /tmp/aq-asset-review-20261104/independent-asset-report.json
  - AQ-14.3
  - src/rendering/modeling/package_modular_corals.mjs
  - docs/asset-evidence/aq57/independent-asset-report.json
  - src/simulation/mesh-collision.ts
  - src/simulation/mesh-collision.test.ts
  - docs/asset-evidence/aq58/3d-collision-review.md
documentation:
  - docs/asset-evidence/aq58/3d-collision-review.md
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
- [x] #2 Evidence pins source hash and documents method/resolution and both coverage and pass-through checks; metadata is absent/unavailable until validation passes.
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

Root approved true3D API. Implement only new src/simulation/mesh-collision.ts and its tests: owned/frozen public collider with private geometry/BVH state; closed oriented manifold validation bounded to100k triangles/64 union components with linear topology work and three presorts plus balanced BVH partitions. Query arbitrary capsule segments with shared default4096-node/8192-triangle budget across boundary distance and every parity retry/component, zero-length support, strict tangency/1um margin, explicit invalid-query/ambiguous/exhausted indeterminate. Caller source hash is provenance only, not automatically verified triangle content. Geometry must already be world-space meter/+Y; no hidden transforms. Document alternatives and source-pinned synthetic/rock benchmarks in docs/asset-evidence/aq58/3d-collision-review.md. Coordinate callback signatures with nav worker and notify independent reviewer on code readiness. No model/coral/scene/packager/proof/nav edits from this lane; no Done.

Review feedback iteration: preflight lattice axis counts and their product before allocating coordinate arrays; attempt exact, bounded endpoint/direct-segment queries before lattice budget rejection; isolate callback inputs with snapshots; validate the full callback result/status/work shape inside the guarded call; distinguish callback invalidity, indeterminate geometry and cumulative work limits. Add huge-grid, direct-route, malformed-response and mutating-callback regressions. Defaults remain explicit offline planner budgets for Root review; runtime must additionally cap/request budget to meet frame-time constraints.

Review feedback iteration 2: snapshot all primitive configuration (radius, spacing, query callback reference) before the first callback; use only the snapshot throughout the request. Validate null/undefined runtime input before any property spread so malformed callers return unavailable. Add a callback-closure mutation regression.

Review feedback iteration 3: enforce non-overridable hard ceilings on every caller-supplied planner budget before any collision query or grid allocation; document the caps and add a regression using the largest safe-integer budget and tiny spacing.

Approved additive swimming-fish adapter iteration (Root, 2026-11-05): edit only src/rendering/scene/motion.ts and motion.test.ts. Add explicit mesh-navigation config with units=meters, query, lattice spacing, and bounded planning budget; add optional per-fish metric collision radius separately from the legacy uncalibrated clearance. When config is present, never route through legacy AABBs if query/radius is missing or invalid. Use one request ledger across compatible anchor candidates (sorted by ID) or the 12 free-target attempts; subtract actual planner queries/visits/triangle tests/expanded nodes/lattice allocation before retrying. Accept the first verified route, documenting it is not globally nearest. Check each proposed simulation substep through the same capsule oracle with a bounded per-step budget; only clear advances, blocked/indeterminate holds/backoffs. Preserve legacy behavior only when mesh config is absent; keep paused motion frozen and preserve behavior request generation/anchor reporting. Test with a real closed 3D mesh fixture for depth/overhang traversal and collision blocking, missing metric/query, indeterminate query, shared retry budget, pause immobility, and legacy regressions. No aquarium/coral/main-renderer changes or biological-clearance claim.

Clean-checkout checkpoint repair approved by Root: capture exact pinned left collision geometry into one small gzip JSON technical fixture with source/generator provenance, canonical meter/+Y identity scope, exact indexed positions/triangles and a geometry digest. Add only narrow capture/check CLI, guarded expected source hash, generator hash verification, byte re-reads and overwrite refusal. Change only source benchmark block/imports of mesh-collision.test.ts to bounded validated fixture loading, with a simple flattened global box comparison independent of artwork/report WIP. Document compressed-byte SHA for the proof and a separate explicit live-source freshness check. No query implementation, visual/model/GLB/generator/coral/packager writes; source fixture regression is not live freshness.

Isolated merge-artifact step (2026-11-05): capture current HEAD baseline and shared motion.ts hash; compose the reviewed metric mesh adapter into a /tmp copy of current shared motion.ts while retaining fish-turning imports/state/kinematics/lookahead logic. Route both heading and chord proposals plus near-waypoint/final-anchor resolution through movementSafety, preserve fail-closed mesh config and navigation generation reporting, then validate the artifact in a disposable temp checkout with the reviewed mesh motion tests/typecheck. Do not write shared motion.ts or commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root AQ57 audit removed the unchecked hard-coded collisionParts-generation block and cleared both packaged inspection records. Contract checks pass with collision data unavailable; GLB and socket hashes unchanged. Durable independent coverage report and exact renders are under docs/asset-evidence/aq57. No collider may be promoted until this task passes.

2026-11-04 true 3D query iteration ready for Root review. Added only src/simulation/mesh-collision.ts, its direct test and docs/asset-evidence/aq58/3d-collision-review.md in this iteration. Full-depth band boxes are comparison baseline only. The new browser-compatible, engine-independent API builds an owned private/frozen triangle BVH from already-world-transformed meter/+Y inputs, rejects invalid/open/nonmanifold/degenerate geometry, and uses conservative union semantics for closed components. Source hashes are caller provenance only unless the adapter independently verifies input bytes; no exhaustive self-intersection certificate is claimed. Three presorts plus balanced partitions avoid repeated per-node sorting, with bounded topology/build work. Arbitrary-direction continuous capsule distance and inside-solid parity use one shared query budget across every stage/retry/component. Tangency plus 1 micrometer margin is blocked; zero-length enclosed points are blocked; invalid budgets, numerical ambiguity, unresolved parity and exhausted work return indeterminate, never clear.
Verification: 24 direct mesh tests and typecheck pass. Source-pinned left/right indexes each contain 24,572 triangles and 8,191 BVH nodes; build work is 2,215,793 / 2,185,549 steps. Local Node builds measured approximately 268 / 240 ms; timings are not browser/FPS acceptance. Fixed left cave probes .02/.04/.06 m all clear; .06 uses 561 node visits / 894 triangle tests within defaults. Front-depth water lane (-.56,.30,.24) to (.56,.30,.24), radius .02, clears both exact meshes with 7 node visits / 0 triangle tests while old bands block it. Known sloped wall is surface-blocked and actual pillar point (-.3,.05,0) is inside-solid blocked. Twenty repeated benchmark queries returned identical statuses/work. Both source hashes still match the pinned reports and actual inspection collisionParts remain empty. The documented read-only benchmark command ran successfully; owned-file whitespace checks pass.
Remaining: AC1 is partial because fixed probes are not calibrated animated fish envelopes; AC3 still needs Root review and actual assembled scene routing/occlusion. Root and navigation worker own integration/browser proof. No model, coral, generator, material, packager, metadata installation, main scene, proof or nav files were edited by this query iteration; no build/commit/deploy.

2026-11-05 portable technical-fixture checkpoint ready for Root review. Final packet: scripts/capture-rock-collision-fixture.mjs; docs/asset-evidence/aq58/left-collision-geometry.fixture.json.gz; only actual-source benchmark imports/block in src/simulation/mesh-collision.test.ts; docs/asset-evidence/aq58/3d-collision-review.md. Fixture is unchanged at 337391 bytes, compressed SHA256 77fd00de0c9cceacd0d1219b101b12793619e53eef5b16a8430acfee23991612. Source GLB2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c and original generator e725024a01c07e09267258a1c9a3e2f28b6fbd07f03eef8cadb84a68c8437eed are historical pinned snapshots; no art/generator restoration or promotion. Exact JSON indexed positions/triangles retain exported coordinates and provenance; fixture-only tests/checks make no live freshness claim.
CLI negative/positive guard verification passed: deterministic recapture identical bytes; existing output EEXIST and unchanged; incorrect expected source hash and current mismatched generator reject before creating output; original source+generator check passes; older committed GLB/current generator reject separately; corrupted geometry digest, invalid index/units/gzip and unknown arguments reject. Source/generator byte rereads are implemented; concurrent mutation was not simulated. Documented fixture benchmark ran with 24572 triangles/12288 vertices/8191 BVH nodes; fixed .02/.04/.06 cave probes and .02 front-depth lane clear with unchanged work counts. Doc relative links/owned whitespace pass. Direct mesh24 tests passed earlier; Root independently reports portable clean069c1dd checkpoint full244 tests/29files, typecheck and appbuild pass. Metadata/context header now conforms to new documentation framework and existing catalog registration. AC1 and AC3 remain open for animated fish envelope/actual scene/browser Root review. No Done, model/coral/scene/proof edits or commits. Holding source after handoff.
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

author: root
created: 2026-11-05 04:48
---
Root early nav review found a bounded-work blocker: axisCoordinates currently allocates coordinate arrays before checking lattice dimensions/product. Tiny spacing or huge finite bounds can allocate enormous arrays or throw before work-limit. Precompute finite safe integer axis counts/product and enforce a hard ceiling before any allocation; even clear direct routes should be testable without constructing an excessive lattice. Add an extreme-spacing regression. Also snapshot/validate request coordinates and validate malformed callback result/work objects inside a guarded boundary so unknown query output cannot throw or become a false blocked/clear result.
---

author: @behavior-profiles
created: 2026-11-05T04:49:00Z
---
Plan refined from Root and read-only reviewer feedback before making corrections: prevent pathological spacing allocations, allow direct clear routes under small grid budgets, guard and isolate untrusted callback responses, and test cumulative limit semantics. Existing core changes stay limited to the two approved mesh-navigation files.
---

author: @behavior-profiles
created: 2026-11-05T04:55:00Z
---
Root review found that an oracle callback could mutate caller-owned radius/spacing through a closure between checks. I am snapshotting all primitive configuration at entry and adding a regression; tests currently pass before this correction.
---

author: root
created: 2026-11-05 04:56
---
Root independent iteration evidence: reviewed new mesh-collision/mesh-navigation source, then added small shared mesh-habitat query adapter with actual per-query and cumulative budget accounting. Six adapter tests pass, including independently hash-checked exact left rock and real planner routes through its cave for fixed20/40/60mm radii;70mm direct capsule blocks. These are technical probes, not approved animated fish envelopes. Standalone exact-mesh browser proof added without model/production/coral edits. Browser connection currently times out on tab creation/inventory, so no new browser depth/occlusion or viewport acceptance is claimed. Continue swimming-simulation integration and bounded route/search review within this task.
---

author: @behavior-profiles
created: 2026-11-05T04:59:00Z
---
Root found caller-controlled positive-safe-integer budgets could bypass the default lattice cap. Adding independent hard ceilings and a no-allocation/no-query regression before proceeding to motion adapter work.
---

author: @behavior-profiles
created: 2026-11-05T05:00:00Z
---
Planner fixes pass 55 focused tests and typecheck. Beginning Root-approved `motion.ts`/`motion.test.ts` integration. The legacy SwimmingFish.clearance (.42/.5) is not metric; mesh mode requires explicit `collisionRadiusM` in meter units and a world-meter configuration.
---

author: root
created: 2026-11-05 05:02
---
Ownership update: external workflow is now editing aquarium.ts/motion.ts and new fish-turning/coral-material/reef-assembly files; none of the three Root subagents made those edits. Preserve them and keep shared scene files out of Root commits. To continue the approved collision/swimming iteration without conflict, Root created isolated worktree /tmp/aquarium-aq58-motion-20261104 (branch codex/aq58-motion-review,069c1dd baseline) and copied only reviewed new pure mesh modules, read-only inspector and exact pinned rock dependencies. @behavior-profiles implements/tests optional explicit-metric mesh navigation there. Backlog updates remain in main queue via CLI; Root will review and integrate a surgical patch after shared ownership stabilizes. No visual/model changes or blanket reversion.
---

author: @collision-validation
created: 2026-11-05 05:02
---
Independent read-only @background-review reported clean combined collision/navigation/adapter tests and no false clears in 200 rotated inside/through/tangent/clear cases or 20,000 random cube segments (2,703 intersecting). Reproduction outside repo: node --experimental-strip-types /tmp/aq58-independent-probe.mjs. This finite probe evidence is not a formal geometry certificate. Module and direct tests are stable for Root review; no Done change.
---

author: root
created: 2026-11-05 05:16
---
Root and independent review iteration: planner now preflights lattice allocation, snapshots caller state, enforces hard request ceilings, rejects malformed oracle results and finite-coordinate overflow (19 planner tests pass). Isolated swimming review requires explicit metric world/radius, complete finite config, radius-shrunk tank bounds and guarded copied oracle arguments/work counts at each movement step. Invalid/stale routes must not report near-waypoint arrival or retain a stuck active request when the same installed generation loses collision availability. Anchor candidate attempts share one plan ledger; failed anchor planning may return with bounded wait rather than immediately spending a fresh free-water budget. Worker addresses these on existing AQ58, with no additional tasks.
---

author: @behavior-profiles
created: 2026-11-05T05:18:00Z
---
2026-11-05 isolated motion adapter is ready for Root review at /tmp/aquarium-aq58-motion-20261104, branch codex/aq58-motion-review. Changed only src/rendering/scene/motion.ts and motion.test.ts. Mesh mode requires explicit meter units, capsule query, complete bounded planner/movement budgets, finite ordered tank bounds, and per-fish collisionRadiusM; legacy clearance remains only for AABB mode. Mesh planning uses sorted compatible anchors and a cumulative ledger across attempts in that invocation, and free targets share a ledger across their 12 attempts. Each movement/final waypoint segment is checked against radius-shrunk water plus the capsule oracle; only clear moves/snaps, invalid/blocked/indeterminate holds, and invalidated active anchor routes report unavailable/blocked at the owning generation. Missing config never falls back to AABBs. Tests cover closed 3D overhang routing/surface block, missing/partial config, stale bounds, query mutation and over-budget replies, cumulative anchor retry/no same-frame retry, invalidated generation reporting, paused immobility, and legacy regressions. Focused 4-suite run: 63 passed; npm run typecheck and git diff --check passed. Independent review requested; no full build/server/browser proof, and technical probe radius is not an animated-fish envelope.
---

author: @behavior-profiles
created: 2026-11-05T13:02:00Z
---
2026-11-05 @background-review final isolated review is clean: metric config validation, complete budget validation, shared per-plan ledger, active-anchor invalidation, near-arrival capsule query, radius-shrunk water bounds, copied callback inputs and returned-work validation all meet the requested gates. Reviewer reran/confirmed 63 focused tests and typecheck pass; no changes requested. Remaining task acceptance is broader: calibrated animated-fish clearance and Root actual-scene route/occlusion review remain open. No AC/status changes from this worker.
---

author: root
created: 2026-11-05 13:09
---
2026-11-05 resume made concrete progress: all3subagents resumed; independent final isolated motion gate63tests/typecheck passes. Browser connection recovered. Root found/fixed proof-loader HTTPgzip handling (fetch may expose already-decompressed JSON), preserving exact compressed+payload hash checks. Native1440x900 and402x874 scale1 proofs render captured exact geometry with no consoleerrors/warnings or phoneoverflow.40/60mm directcave route clear;70mm direct blocked but bounded3D planner finds over-rock detour (3389queries/58613visits/53850tritests, observed67.6ms laptop check; notFPS/phone performance claim). Screenshots:/tmp/aquarium-review-evidence/aq58-3d-{detour-laptop,proof-phone}.png. Root preparing clean portable core+optional metricmotion checkpoint and surgical working-source merge preserving externalturning/coral changes. Animated fish envelopes and final assembledscene remainopen.
---

author: @behavior-profiles
created: 2026-11-05T13:12:00Z
---
2026-11-05 surgical shared-motion merge artifact prepared without changing shared source: /tmp/aq58-merged-motion-20261105.ts (SHA-1 3cc4d7b8a1de32d80fe681dd76020ad2dd3505b0), notes /tmp/aq58-merged-motion-20261105.notes.txt. Base motion SHA-1 610dcb1e5284d960baa5a40bb3992b70d8e8399f; captured and final current shared motion SHA-1 d601293e832d4364293761940df043fd03f700d0; motion.test.ts unchanged at d6b2594a2191e9c1ea94b6b7a9bbbf1fa03be0ee. Kept current fish-turning/curvilinear logic; mesh guard now covers heading and chord proposals plus near-waypoint/final arrival, with no AABB fallback in configured mesh mode. Disposable validation copy ran four focused suites (63 passing) and typecheck. Root may apply only while current shared hash remains d601293e832d4364293761940df043fd03f700d0. No shared source edits or commit.
---

author: @behavior-profiles
created: 2026-11-05T13:17:00Z
---
2026-11-05 merge-review correction for Root finding: mesh mode no longer inherits the external turn integrator 18cm intermediate-waypoint skip. Waypoint completion/snap is allowed only when remaining distance <= .015m/s * dt + epsilon, the guaranteed minimum physical substep; the entire final segment is checked first. Shorter motion continues through bounded heading/chord proposals. Close mesh waypoints prefer a clear, capsule-checked route chord to avoid curvilinear steering orbiting a waypoint. Added low-speed 10cm intermediate and 1cm anchored-final regressions with per-step displacement bounds and no early arrival. Both isolated metric baseline and /tmp/aq58-merged-motion-20261105.ts were updated. Isolated focused suites: 64 passed, typecheck/diff-check pass. Disposable merged artifact focused suites: 64 passed, typecheck passes. Artifact SHA-1 85efbaee688e0f699b722e1e55ac9527e1f51f6a; shared current motion hash remains d601293e832d4364293761940df043fd03f700d0. Notes updated in /tmp/aq58-merged-motion-20261105.notes.txt. No shared source writes.
---

author: root
created: 2026-11-05 13:24
---
Root reviewed final portable milestone: clean069c1dd + selectedcollisionfiles + optionalmetricmotion passes254tests/29files,typecheck,productionbuild and scopedwhitespace. Actual browser proof verified bothviewports; historical fixture and current-model freshness remain separate. Root caught/fixed 18cm inheritedlookahead snap (and smaller prematurearrival): meshmode now advances within guaranteedsubstepdistance; isolated and preservation-merge64focusedtests/typecheck pass. Applied merge to sharedworkingmotion only after matching sourceblobd601293e… and testsblobd6b2594a…; originals backed up outside repo. Both heading/chord fallback and finalarrival use the same mesh guard. Git index will contain ONLY reviewed baseline+mesh motion, preserving externalturning/coral edits in workingtree for separate review. AC2 evidence reviewed; AC1calibratedanimatedenvelopes and AC3actualassembledmain scene remainopen. No deployment.
---
<!-- COMMENTS:END -->
