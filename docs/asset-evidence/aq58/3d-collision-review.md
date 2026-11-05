# AQ58 iteration — true 3D mesh collision

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-58
Owner: @collision-validation
Updated: 2026-11-05
Upstream: docs/requirements.md, docs/asset-contract.md, AQ-58
Downstream: src/simulation/mesh-collision.ts, src/simulation/mesh-collision.test.ts, src/simulation/mesh-habitat.ts, src/rendering/proof/collision-study.ts
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Evidence
> - **Status**: Active
> - **Authority**: Evidentiary
> - **Backlog Reference**: `AQ-58`
> - **Summary**: Reproducible technical collision evidence from a historical exact-geometry fixture. This does not approve current artwork, animated fish envelopes or scene integration.

<!-- AGENT_DOC_METADATA
Category: Evidence / Collision Review
Status: Active
Authority: Evidentiary Record & Architectural Spike
Backlog: AQ-58, AQ-34
Owner: @asset_validation
Updated: 2026-11-05
Upstream: docs/habitat-navigation-core-contract.md
Downstream: src/simulation/mesh-collision.ts, src/simulation/mesh-collision.test.ts, docs/asset-evidence/aq58/*
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: 3D Mesh Collision Verification & Architecture
> - **Status**: Active / Evidentiary
> - **Authority**: Evidentiary Record
> - **Backlog Reference**: `AQ-58`
> - **Summary**: True 3D swept-volume mesh query architecture, BVH acceleration, cave clearance measurements (20/40/60mm clear, 70mm blocked), and deterministic planner budgets.

**Selected implementation direction for this iteration: exact triangle geometry with a BVH, continuous capsule queries and solid-interior checks.** Full-depth band boxes remain a comparison baseline only. No visual assets, models, coral code, packager, inspection collision metadata or main-scene files were changed by this query iteration. Root owns planner integration, the separate browser proof and final acceptance.

## Why this direction

| Representation | Depth/void behavior | Main cost or limit | Decision |
| --- | --- | --- | --- |
| Triangle BVH + capsule/solid query | Keeps actual XYZ geometry, depth gaps, overhang water and open caves; no voxel discretization | Requires valid closed component surfaces for solid interpretation; bounded queries can be indeterminate | Implemented reusable query |
| True 3D occupied voxel grid | Retains depth at a declared resolution | Needs conservative triangle/solid occupancy and fish-radius inflation; coarse cells close narrow openings, fine grids cost memory | Possible planning aid, not the collision authority in this slice |
| Sampled SDF | Can represent smooth 3D clearance | Sampling/interpolation needs an explicit error bound before declaring space clear; a sampled sign alone is insufficient | Deferred alternative, not silently substituted |
| Conservative convex decomposition | Supports efficient convex swept-volume checks | Decomposition/coverage needs proof; coarse unions can erase caves or overhangs | Not selected here |
| Full-depth bands / sand-filled height columns | Cover some source solids conservatively | Erase real front/back gaps or water below overhangs | Benchmark only; cannot satisfy the user's true-3D request |

The old 32-AABB habitat cap belongs to the legacy box representation. It is not a constraint on the new mesh architecture. Query and planner work limits replace an unbounded triangle scan; final assembled-scene budgets still need Root review.

## API and safety contract

Implementation: [mesh-collision.ts](../../../src/simulation/mesh-collision.ts), with [direct tests](../../../src/simulation/mesh-collision.test.ts).

```ts
buildMeshCollider({
  id, sourceSha256,
  units: 'meter', upAxis: '+Y', coordinateSpace: 'world',
  triangles: [{ a: { x, y, z }, b: { x, y, z }, c: { x, y, z } }],
})
// { status: 'ready', collider, diagnostics }
// or { status: 'unavailable', reason, diagnostics }

queryMeshCapsule(collider, {
  start: { x, y, z }, end: { x, y, z }, radiusM,
  budget: { maxNodeVisits, maxTriangleTests }, // optional
})
// { status: 'clear' | 'blocked' | 'indeterminate', reason,
//   sourceId, sourceSha256, work: { nodeVisits, triangleTests } }
```

Only `clear` permits a path edge or point. A point query uses `start === end` coordinates. Invalid inputs, unresolved numerical/inside ambiguity and exhausted work return `indeterminate`, never fabricated empty water. The planner adapter forwards its remaining shared budget:

```ts
(start, end, radiusM, remaining) => queryMeshCapsule(collider, {
  start, end, radiusM,
  budget: {
    maxNodeVisits: Math.min(remaining.maxNodeVisits, 100_000),
    maxTriangleTests: Math.min(remaining.maxTriangleTests, 100_000),
  },
})
```

The caller must apply world transforms and make units explicit before building. This module does not infer a legacy-unit conversion, rotate axes or read models. A provided source hash is **caller provenance only**, not proof that the triangle array hashes to that label. The benchmarks below independently read/hash the pinned GLB bytes through the existing geometry wrapper. Runtime adapters must preserve that lineage themselves.

Collider geometry is copied into private state; public bounds/metadata are frozen. Mutating the original triangle objects after building cannot change queries. Query coordinates and limits are snapshotted before work. Forging a public-looking collider object does not create a valid private index.

## Geometry and work handling

- Build validates finite coordinates within 1,000 m, nondegenerate faces, exact-position welds, edge incidence/orientation, vertex-link manifoldness and duplicate faces. Open or invalid inputs return unavailable. It supports at most 100,000 triangles and 64 closed connected components.
- **Closed oriented manifold is a conditional solid interpretation. No exhaustive self-intersection certificate is claimed.** Disconnected components use conservative union semantics. Nested closed shells do not create an inferred hollow cavity; an outer solid still blocks its enclosed region.
- Topology work is linear in mesh incidence. Three initial axis sorts and balanced partitions construct the BVH in `O(n log n)` work without repeated per-node sorting. A hard 20,000,000-step build budget fails unavailable. Builds belong to initialization/offline preparation, not the animation-frame loop.
- Boundary queries use arbitrary-direction continuous segment/triangle feature distance: face intersection, endpoint/face distance and segment/edge distance. They do not sample positions along a motion segment. Contact at or within `radius + 1 μm` is blocked, including tangency. Nonfinite distance arithmetic is indeterminate.
- No boundary crossing is not enough: a path can lie wholly inside rock. For a boundary-free segment, the start is classified against each component using BVH-accelerated ray parity. Two nonambiguous agreeing rays are required from three fixed non-axis directions. Edge/vertex/coplanar ambiguity retries; disagreement or insufficient valid rays is indeterminate. A boundary-free continuous segment cannot switch inside/outside state.
- The same counter spans boundary checks and **all** component/parity retries. Defaults are 4,096 node visits and 8,192 triangle tests; explicit positive safe-integer limits must be at most 100,000 each. Null, negative, fractional or nonfinite limits are rejected. No query can reset its budget during inside tests.
- Double precision, a 1 μm contact margin, `1e-9 m` ray-plane tolerance and `1e-9` barycentric ambiguity tolerance are explicit numerical limits, not formal exact arithmetic. The supplied radius is a technical envelope input, not an inferred fish anatomy measurement.

## Historical exact-geometry fixture

Clean-checkout regressions use [left-collision-geometry.fixture.json.gz](left-collision-geometry.fixture.json.gz), copied from the original pinned custom-project rock geometry. It contains no textures, materials, visual-model changes or live-source approval. The current modeling workflow has changed its generator, and the committed artwork may differ from this snapshot. Fixture integrity and live-source freshness are separate checks.

| Fixture fact | Value |
| --- | --- |
| Compressed bytes | 337,391 |
| Compressed SHA-256, also used for browser WebCrypto pinning | `77fd00de0c9cceacd0d1219b101b12793619e53eef5b16a8430acfee23991612` |
| Source GLB SHA-256 | `2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c` |
| Original generator SHA-256 | `e725024a01c07e09267258a1c9a3e2f28b6fbd07f03eef8cadb84a68c8437eed` |
| Canonical geometry payload SHA-256 | `a67176d33ebd8b12cbdc8786b15d9ba726204001dfcad44533a02cb94bbce8e2` |
| Exact positions / triangle index triples | 12,288 / 24,572 |

Schema `rock-collision-geometry-fixture-v1` records `assetId`, `primitiveId`, the three source/generator/geometry hashes, original-project provenance, `units: meter`, `upAxis: +Y`, `coordinateSpace: world`, identity `rootTransform`, measured `boundsM`, `positions: Array<[x,y,z]>` and `triangles: Array<[i,j,k]>`. Only numerically identical exported positions are indexed together. Every reconstructed coordinate passed `Object.is` after JSON roundtrip; no quantization was applied. `geometrySha256` covers `JSON.stringify({positions,triangles})`, while the compressed-byte hash pins the complete file.

[capture-rock-collision-fixture.mjs](../../../scripts/capture-rock-collision-fixture.mjs) requires an expected GLB hash and a generator whose bytes match embedded provenance. It re-reads source/generator bytes before writing and refuses overwrite. Fixture checking bounds compressed/decompressed sizes, validates finite coordinates, canonical identity scope, indices, provenance, exact bounds and the geometry digest. Optional source/generator checks are explicit; no flags means **fixture integrity only**.

Capture/check guard verification on 2026-11-05 passed: repeat capture from the original pair produced identical compressed bytes; existing output was rejected with `EEXIST` and remained unchanged; wrong expected source hash and mismatched generator were rejected before output creation. Check mode accepted the original pair and rejected the older committed GLB, changed current generator, corrupted geometry digest, invalid triangle index, noncanonical units, invalid gzip and unknown arguments. The fixture hash remained unchanged throughout. These negative CLI checks supplement the collision unit suite; they do not simulate a concurrent source rewrite during the re-read window.

## Historical source benchmarks

Both measured rock snapshots have 24,572 triangles, 12,288 exact-welded vertices, one closed component and 8,191 BVH nodes. Files matched the immutable `/tmp/aq58-pinned-20261104/` snapshots at measurement time; this is historical evidence, not an assertion about a later clean checkout or current modeling export:

| Rock | Exact source SHA-256 | Build work | Local Node build time |
| --- | --- | ---: | ---: |
| Left | `2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c` | 2,215,793 | 268.1 ms |
| Right | `68337f7733b782f374efa0ea051138344a17fe6139be14ab4efa95f34eb2d4d6` | 2,185,549 | 240.4 ms |

The table uses fixed radii, never shrunk to force clearance. Times are medians of 20 repeated, identical read-only queries in one local Node process; work counts/results were identical across repetitions. These timings do not establish browser frame rate, phone performance or a final habitat budget.

| Case | Radius | Mesh result | Node / triangle tests | Median time | Band baseline |
| --- | ---: | --- | ---: | ---: | --- |
| Left cave, `(0,.08,-.36) → (0,.08,.36)` | .02 m | Clear | 93 / 0 | .027 ms | Clear |
| Same | .04 m | Clear | 181 / 18 | .049 ms | Clear |
| Same | .06 m | Clear | 561 / 894 | .529 ms | Blocked by cube/band approximation |
| Left front-depth water, `(-.56,.30,.24) → (.56,.30,.24)` | .02 m | Clear | 7 / 0 | .004 ms | Blocked by full-depth bands |
| Left diagonal `(-.5,.05,-.3) → (.3,.14,.2)` | .02 m | Blocked: surface | 19 / 11 | .028 ms | Blocked |
| Known sloped-wall point | 0 | Blocked: surface | 20 / 3 | .006 ms | Blocked by repaired baseline |
| Left pillar point `(-.3,.05,0)` | .005 m | Blocked: **inside solid** | 325 / 150 | .100 ms | Blocked |
| Right center through-path | .02/.04/.06 m | Blocked: surface | 20–28 / 3–7 | .005–.007 ms | Blocked |
| Right front-depth water, same XYZ endpoints | .02 m | Clear | 7 / 0 | .002 ms | Blocked by full-depth box |

The .06 m capsule result legitimately differs from the old cube envelope. The front-depth water lane demonstrates the important volumetric difference on the captured exact rock: its Y and Z are inside the source's global envelope, yet the water is empty at that depth. The fixture regression exercises this lane and a deliberately flattened global-box rejection through the existing navigation predicate, without reading current GLBs or old band-report JSON.

Synthetic regressions cover two separate solids with an open Z gap, water below a roof, all-axis diagonal crossings, Euclidean edge/corner clearance, exact face/edge/vertex tangency, rotated world geometry, enclosed and zero-length points, nested/disconnected union, invalid topology, input mutation, budget exhaustion shared with parity, and deliberate ambiguity at all three ray directions. They verify explicit unavailable/indeterminate outcomes rather than treating unsupported data as clear.

## Reproduction

From the repository root:

```sh
npx vitest run src/simulation/mesh-collision.test.ts
npm run typecheck
node scripts/capture-rock-collision-fixture.mjs --check docs/asset-evidence/aq58/left-collision-geometry.fixture.json.gz
```

A clean-checkout read-only fixture benchmark:

```sh
node --input-type=module - <<'JS'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { buildMeshCollider, queryMeshCapsule } from './src/simulation/mesh-collision.ts'
const bytes = readFileSync('docs/asset-evidence/aq58/left-collision-geometry.fixture.json.gz')
if (bytes.length > 8 * 1024 * 1024 || createHash('sha256').update(bytes).digest('hex') !== '77fd00de0c9cceacd0d1219b101b12793619e53eef5b16a8430acfee23991612') throw Error('Fixture changed; stop and review')
const fixture = JSON.parse(gunzipSync(bytes, { maxOutputLength: 32 * 1024 * 1024 }).toString('utf8'))
const point = v => ({ x: v[0], y: v[1], z: v[2] })
const began = performance.now(), built = buildMeshCollider({
  id: fixture.assetId, sourceSha256: fixture.sourceSha256,
  units: 'meter', upAxis: '+Y', coordinateSpace: 'world',
  triangles: fixture.triangles.map(t => ({ a: point(fixture.positions[t[0]]), b: point(fixture.positions[t[1]]), c: point(fixture.positions[t[2]]) })),
})
if (built.status !== 'ready') throw Error(built.reason)
console.log('historical fixture build ms', performance.now() - began, built.diagnostics)
for (const radiusM of [.02, .04, .06]) console.log(queryMeshCapsule(built.collider, {
  start: point([0,.08,-.36]), end: point([0,.08,.36]), radiusM,
}))
console.log('front-depth water', queryMeshCapsule(built.collider, {
  start: point([-.56,.30,.24]), end: point([.56,.30,.24]), radiusM: .02,
}))
JS
```

**Separate live-source freshness check:** this command reads the current GLB and exits nonzero if it differs from the historical fixture. A clean checkout with older committed art can legitimately fail this check while fixture unit tests pass. A mismatch invalidates a claim that this fixture describes current artwork; it does not invalidate the historical regression or request an artwork rollback. Do not overwrite or restore artwork to make it pass.

```sh
node scripts/capture-rock-collision-fixture.mjs --check docs/asset-evidence/aq58/left-collision-geometry.fixture.json.gz --source src/rendering/assets/corals/live-rock-island-left.glb
```

Add `--generator src/rendering/modeling/build_live_rock_islands.py` to independently check the current generator too. The fixture uses the original `e725…` generator; the other modeling workflow changed the current generator, so that additional check may correctly reject it. Neither fixture-only checking nor a GLB-only check claims generator freshness.

The original guarded capture command used the immutable historical pair, not current WIP:

```sh
node scripts/capture-rock-collision-fixture.mjs /tmp/aq58-pinned-20261104/live-rock-island-left.glb /tmp/new-left-collision.fixture.json.gz --expected-source-sha256 2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c --generator /tmp/aq-asset-review-20261104/src/rendering/modeling/build_live_rock_islands.py
```

## Root browser and swimming review — 2026-11-05

Root verified the neutral exact-geometry proof at 1440×900 and 402×874 CSS pixels, both at scale 1. The 40/60 mm probes use the direct cave route; a 70 mm probe is blocked on that segment and finds a verified detour over the rock. The phone view had no horizontal overflow and no captured warning/error logs. The route line respects opaque rock depth. This is technical fixture evidence, not a completed aquarium or animated fish envelope.

The observed 70 mm detour used 3,389 queries, 58,613 BVH visits and 53,850 triangle tests, taking 67.6 ms in that laptop check. The straight 60 mm query used three planner queries and took 0.9 ms. These single observations do not establish frame rate or phone performance. Index construction and larger searches must stay outside an animation-frame hot path.

The browser exposed a loader bug: HTTP `Content-Encoding: gzip` can decode fixture bytes before `fetch` returns them. The proof now verifies either the pinned compressed bytes or the exact decoded payload before parsing. Decoded payload SHA-256 is `8c1d4c9c89f2bab90f6fda4f9d45c3d2c65e4f29ded3c70a552a4843c3c41a2b`.

Evidence: [laptop detour](detour-laptop.png), [phone cave route](cave-phone.png). Root and an independent reviewer also verified the isolated optional metric swimming adapter: 64 focused tests and typecheck pass, with continuous movement/final-arrival checks, separate metric radius, tank bounds, shared planning budgets, generation invalidation and paused immobility. A clean checkpoint without WIP coral assets passes 254 tests, typecheck and the production build.

## Remaining acceptance

The deterministic [3D planner](../../../src/simulation/mesh-navigation.ts) and [shared-budget adapter](../../../src/simulation/mesh-habitat.ts) are now implemented and tested. `createMeshClearanceQuery` clamps each query to 4,096 node visits / 8,192 triangle tests while accounting cumulative work. Planner hard ceilings are 16,384 lattice/expanded nodes, 100,000 queries, 2,000,000 node visits and 10,000,000 triangle tests. Only clear points/edges are usable; indeterminate work is not presented as proven disconnection.

This is still not AQ58/AQ34 scene completion. The optional metric adapter is reviewed and surgically merged into the working source, preserving the other workflow’s turning edits. The portable checkpoint retains the reviewed baseline turning implementation; the additional shared turning work remains separately unreviewed. Main-scene configuration, current-source freshness, calibrated animated fish envelopes, assembled habitat interactions, native links and both aquarium viewport reviews remain explicit acceptance work. No fish species, habitat anchor, coral interaction or finished reef art is inferred from these historical technical probes.
