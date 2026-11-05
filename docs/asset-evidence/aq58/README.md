# AQ58 — conservative rock collision comparison baseline

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Historical / Comparison Baseline
Authority: Evidentiary
Backlog: AQ-58
Owner: @root
Updated: 2026-11-05
Upstream: docs/asset-contract.md, docs/asset-evidence/aq57/README.md
Downstream: src/rendering/assets/rock-collision.test.ts, docs/asset-evidence/aq58/3d-collision-review.md
-->

> [!NOTE]
> **Agent Context & Authority** — Measured comparison evidence. The selected 3D query iteration is documented below; these bands do not establish final scene or fish-envelope acceptance.

**Root direction, 2026-11-04:** these full-depth band boxes are a comparison baseline, not the selected final collision architecture. They preserve the measured front-to-back opening but can erase other depth gaps and overhangs. AQ58 is continuing with genuinely 3D collision queries and routing within the same task. The 32-AABB limit below describes the legacy planner; it does not constrain the replacement architecture.

The subsequent [3D query iteration](3d-collision-review.md) preserves actual XYZ geometry. Its exact-geometry regression fixture is an immutable capture of the source listed below, kept separate from the concurrent coral workflow. Unit regressions now use that capture; they do not certify current live exports or generator freshness. Use the explicit capture/check commands in the 3D review for those checks.

**Independent offline review only; collision metadata remains unavailable.** These reports do not approve fish envelopes, scene integration or the rock's visual appearance. The user-managed coral lane is untouched. Root must review this tooling and the eventual assembled routing/occlusion before promotion; AQ59 remains the separate rock art gate.

## Exact inputs and results

Runs used immutable copies under `/tmp/aq58-pinned-20261104/`. Live exports were hash-checked before and after; neither GLBs, generators, materials, packager nor existing inspection records were edited. Both existing inspection records still contain `collisionParts: []`.

| Export | SHA-256 | Candidate boxes / allowed cap | Surface coverage | Omitted prisms / boundary crossings |
| --- | --- | ---: | --- | ---: |
| [Left report](left-collision-report.json) | `2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c` | 7 / 16 | All 24,572 triangles | 3 / 0 |
| [Right report](right-collision-report.json) | `68337f7733b782f374efa0ea051138344a17fe6139be14ab4efa95f34eb2d4d6` | 1 / 1 | All 24,572 triangles | 0 / 0 |

Each source has 12,288 exact-position-welded vertices, one face-connected component, and zero boundary edges, nonmanifold edges/vertices, inconsistent edge orientations, duplicate faces or degenerate triangles. **No exhaustive self-intersection check was performed.**

The fixed through-path is glTF `x=0, y=0.08 m`, along Z from 0.10 m before the source minimum to 0.10 m beyond its maximum. Its left-rock continuous segment/triangle minimum distance is `0.06634181669905997 m`; the right path intersects rock. No floor, sand, coral colony, neighboring island or assembled tank boundary is included.

| Fixed radius | Left mesh/capsule | Left mesh/swept cube | Left candidate-AABB route | Right, all three predicates |
| --- | --- | --- | --- | --- |
| 0.02 m | Clear | Clear | Clear | Blocked |
| 0.04 m | Clear | Clear | Clear | Blocked |
| 0.06 m | Clear | Blocked | Blocked | Blocked |

These are **predeclared technical probes**, not approved species sizes or animated envelopes. No radius was reduced to force a pass. Current navigation inflates AABBs independently on all axes, producing a cube envelope; its result can legitimately differ from a Euclidean capsule. Its raw predicate also permits tangency. Offline swept-cube clearance instead treats closed face/edge/point contact as unsafe and additionally requires the capsule safety margin. A raw-navigation pass alone cannot certify passage. The direct test also evaluates the existing `isWaterSegmentSafe` implementation against these candidates in reference water bounds and confirms the reported AABB predicate. That is not a main-scene route test.

## Construction and independent checks

1. A narrow read-only wrapper reuses the unchanged GLB parser and transformed triangles in `socket-inspector.ts`. It requires one meter/+Y/local rock root, identity geometry transforms, one active mesh and one rock primitive identity. Multiple roots, active instances, GPU instancing and primitive extensions are unsupported. A mesh inside a socket-named hierarchy is rejected, preventing socket transforms from bypassing geometry identity checks. Expected triangle counts use only active-scene accessors; any face discarded by the original parser as degenerate makes the wrapper fail. Inactive meshes are excluded. This adds no parser, socket-math or socket-result behavior change.
2. The constructor clips every intersecting triangle to a horizontal band expanded by 1 μm at its Y boundaries. It computes the actual X extrema on either side of the selected axis. A triangle crossing the axis forces the entire band closed. Otherwise the left/right occupied regions become full-depth AABBs, with a further 1 μm inset into the proposed water gap. Adjacent boxes with identical X extents may merge vertically. There is no assumed rectangular cave or height-column fill to the floor.
3. The verifier independently subtracts the **complete box union from each triangle polygon** using six-plane clipping. A triangle with vertices covered by different boxes still fails if its interior crosses uncovered space. The known old miss `[-0.11637334525585175,0.08302615582942963,0.244855597615242]` is covered by the new left candidates and is exercised in the exact-export regression.
4. Solid coverage is not inferred from vertices alone. The verifier reconstructs the box union's complement between every distinct Y boundary. Every omitted component must be a full-depth rectangular prism. It extends that prism **1 μm past both exact Z bounds**, and requires no source boundary triangle to enter its open interior. The extension is essential: without it, a sealed entrance cap on the source bounding plane could be missed. A regression deliberately carves such a false gap from a closed cube and rejects it.
5. Under a bounded closed-solid interpretation of the reported oriented surface, each verified omitted prism connects to known exterior along Z without crossing a boundary. It therefore cannot contain solid interior. This is the solid-coverage argument; it is conditional on the reported topology and floating-point checks, not an exhaustive self-intersection or formal exact-arithmetic certificate.
6. Bands refine only while a geometrically clear fixed swept-cube probe is blocked by conservative candidate boxes. A required cave passage also needs its axis inside the source X/Y envelope; a trivially clear external path cannot count. Refinement stops unavailable at its part, resolution or iteration budget instead of inventing clearance. A one-part arch budget and an excessively coarse minimum band height are tested as unavailable. Right-rock coverage requires no claimed cave passage.

## Budgets and numerical limits

- The legacy planner has a **32-AABB cap**. This comparison used source caps of 16 left and 1 right. The current eight-box result does not promise that all eventual colonies fit that budget. The replacement 3D architecture needs its own measured work and memory limits.
- Minimum refined band height: 0.002 m; at most 64 refinement iterations. This is a lower subdivision limit, not a uniform 2 mm voxel resolution. Actual band boundaries are recorded in each report.
- Maximum source triangles: 100,000; coordinate magnitude at most 1,000 m from the local origin. Unsupported scopes fail clearly.
- Exact-position welding uses no distance tolerance. Polygon subtraction treats residual area at or below `1e-24 m²` as numerical zero; gap construction uses a 1 μm safety inset/overlap. Capsule clearance requires the computed distance to exceed the probe radius by 1 μm. These are double-precision computations, not rational arithmetic or an unconditional numerical proof at arbitrary scale.
- Continuous segment/triangle distance considers face intersection, endpoint/face distance and segment/edge distance; it does not sample animation frames or points along the path. Nearly parallel edge calculations use cross products to avoid subtractive cancellation.
- Root's independent tangent-cube regression is retained: a closed prism at `x=[0.02,0.22] m` touches the 0.02 m probe. Raw AABB navigation permits contact, but offline capsule/cube clearance rejects it and cannot produce a required-passage approval. Concave arches with tangent 0.02 m and 0.06 m inner walls are also tested; a larger blocked probe never becomes a smaller invented probe.
- “Validated offline” means the stated source/budget/probe checks passed. Every report separately retains `promotionStatus: unavailable-pending-root-and-scene-review`; no `collisionParts` field is emitted or installed.

## Reproduction and guards

From the repository root, create a new output directory because the CLI refuses to overwrite reports:

```sh
aq58_review_dir=$(mktemp -d /tmp/aq58-review.XXXXXX)
cp src/rendering/assets/corals/live-rock-island-left.glb "$aq58_review_dir/left.glb"
cp src/rendering/assets/corals/live-rock-island-right.glb "$aq58_review_dir/right.glb"
shasum -a 256 "$aq58_review_dir/left.glb" "$aq58_review_dir/right.glb"
node src/rendering/assets/inspect-rock-collision.ts "$aq58_review_dir/left.glb" "$aq58_review_dir/left-report.json" --max-parts 16 --require-passage
node src/rendering/assets/inspect-rock-collision.ts "$aq58_review_dir/right.glb" "$aq58_review_dir/right-report.json" --max-parts 1
npx vitest run src/rendering/assets/rock-collision.test.ts src/rendering/assets/socket-inspector.test.ts src/rendering/assets/contract.test.ts
npm run typecheck
node scripts/check-socket-reports.mjs
```

Compare source hashes before trusting old results. The CLI re-reads its input bytes before writing and fails if they changed during inspection. A changing live export requires a new pinned snapshot and full review; it must not be silently substituted into an existing report. Rerunning against an existing report path fails without changing its bytes. The CLI also rejects a report path equal to the source, invalid part budgets and malformed arguments.

## Remaining AQ58 acceptance

- **AC1 is partial:** exact source coverage and fixed-probe passage are demonstrated, including the old missed vertex. No physically calibrated species/animated-fish clearance envelope has been accepted, so these probes cannot satisfy that remaining part by themselves.
- **AC2 evidence is supplied:** source hashes, method, limits, full-surface/solid argument and clear/blocked probes are recorded; actual collision metadata stays unavailable pending review.
- **AC3 remains open:** Root review, assembled actual-mesh routing/occlusion and scene promotion are separate work. Existing visual geometry is unchanged, and the independent coral owner is unaffected.
