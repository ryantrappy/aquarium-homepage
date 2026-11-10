# Photorealism performance and asset-delivery budgets (AQ-70.3)

<!-- AGENT_DOC_METADATA
Category: Specification / Budgets
Status: Active
Authority: Active Specification
Backlog: AQ-70.3
Owner: @Luna
Updated: 2026-11-09
Upstream: docs/requirements.md, docs/asset-contract.md, docs/rendering.md
Downstream: src/rendering/assets/budgets.ts, src/rendering/assets/budgets.test.ts
-->

Photorealism raises texture resolution, geometry density and shading cost.
These budgets exist so each photoreal task can prove it fits — before the
renderer and asset upgrades land, not after. The machine-readable form of
this document is `src/rendering/assets/budgets.ts`; the automated check is
`src/rendering/assets/budgets.test.ts`, which runs as part of `npm test`
and fails the suite when any live manifest asset exceeds its class budget
or a non-grandfathered asset lacks compressed texture delivery.

**Scope note.** Budgets cover what the scene actually loads: the manifest
GLBs (6 Blender hero fish, 8 coral colonies, 2 rock islands, 13 splat-fish)
plus the two licensed proof-candidate fish that load at runtime. The sand
bed is procedural (AQ-73 aragonite bed, 512² pixel-gen cache) with no GLB
file, so it has a doc-only texture budget and no download budget. The
$0 asset budget (CC0 / CC-BY-4.0 / custom only) is unchanged and is not
restated here — see `docs/asset-contract.md`.

## 1. Per-asset-class budgets

| Class | Max file | Max tris | Max texture | Max maps | Max 1 texture | Max GPU / asset |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Hero fish (Blender, 6) | 2 MiB | 25,000 | 1024 px | 4 | 768 KiB | 16 MiB |
| Background fish (splat, 13) | 2.5 MiB | 25,000 | 1024 px | 4 | 2 MiB | 16 MiB |
| Coral colony (8) | 2.5 MiB | 40,000 | 512 px | 8 | 512 KiB | 10 MiB |
| Rock island (2) | 2.5 MiB | 30,000 | 512 px | 4 | 768 KiB | 5 MiB |

| Class | Max total file | Max total tris | Max total GPU |
| --- | ---: | ---: | ---: |
| Hero fish | 12 MiB | 150,000 | 96 MiB |
| Background fish | 32.5 MiB | 325,000 | 208 MiB |
| Coral colony | 20 MiB | 320,000 | 80 MiB |
| Rock island | 5 MiB | 60,000 | 10 MiB |

**Rationale.** Caps sit ~15–40% above the largest asset already in the
class, so the current scene passes with headroom for the photoreal rebuilds
(AQ-70.9/70.10 hero fish, AQ-70.11 coral) while still catching regressions.
The blue-tang splat-fish is the background-fish outlier on every axis
(2.36 MB file, 19,406 tris, 1.70 MB of textures at 1024 px while its
siblings are 512 px); the caps admit it, they do not bless it — a rebuild
should bring it in line with its siblings. Texture dimension is the
binding GPU constraint: a 1024 px RGBA8 map with mipmaps costs ~5.6 MiB,
so the 16 MiB per-fish GPU cap is exactly three 1024 px maps.

## 2. Download budgets

| Budget | Cap | Measured at `c38674f` |
| --- | ---: | ---: |
| Phase 0 blocking fish bytes (first paint) | 3.5 MiB | 2,786,052 B |
| Total runtime fish GLBs (15 species) | 24 MiB | 19,210,848 B |
| Total scene GLBs (fish + reef) | 40 MiB | 35,287,324 B |
| Runtime GPU texture memory | 256 MiB | 205,520,866 B (196.0 MiB) |

**Rationale.** Phase 0 is the AQ-76 lazy-load contract: only the first 3
configured species block first paint (yellow-tang, banggai-cardinalfish,
royal-gramma in service order). The 24 MiB fish cap holds today with ~25%
headroom and still fits the 15-species hero end state (AQ-78) at ~1.4 MB
per fish (~21 MB). The 40 MiB scene cap holds the reef (16.08 MB) plus
that fish end state. The 256 MiB GPU cap holds the current scene with ~30%
headroom — but see the promotion tension below.

**Known tension: full hero promotion does not fit the GPU cap.**
Promoting all 15 species to hero fish at the current 1024 px × 3-map
texture sizes would cost ~240 MiB of GPU texture memory for fish alone,
before the ~63 MiB reef — over the 256 MiB cap. So AQ-78 / AQ-70.9 /
AQ-70.10 must do at least one of: ship hero textures as KTX2 (BC7 is
~1 byte/px, so 15 hero fish cost ~60 MiB instead of ~240 MiB), drop hero
maps to 512 px, or raise this cap with a measured justification. This
budget does not silently absorb that growth; the promoting PR has to
choose and record the answer.

**Addendum 2026-11-09 — Desjardins' sailfin tang (Ryan's sailfin decision).**
The roster grows from 15 to 16 species. The sailfin is a visual-only
display fish: it is **not** a configured service species, so it loads
lazily in the background and Phase 0 is unchanged at 2,786,052 B. Its GLB
(`download_testing_copies/zebrasoma_desjardinii-copy.glb`, 1,488,244 B,
4,760 tris, three 768×768 PNG maps = 9,437,184 B GPU) moves the true
runtime totals to: total fish GLBs **20,699,092 B** (cap 24 MiB, ~18%
headroom), total scene GLBs **36,775,568 B** (cap 40 MiB), GPU texture
memory **214,958,050 B (~205.0 MiB)** (cap 256 MiB), scene triangles
365,839. All caps still hold. Note: `budgets.test.ts`'s "loaded scene"
test counts only the splat fish and the two proof files, so it does **not**
count the sailfin — the automated test stays green while the true totals
grow as recorded here. Any future test that recomputes the totals from the
live manifest must include the display fish.

## 3. Frame-time budgets (both viewports)

| Metric | Budget | Mechanism |
| --- | ---: | --- |
| Frame-time target (p50) | ≤ 16.7 ms (60 fps) | Target, not a tripwire |
| Sustained p95 | ≤ 22 ms | Above this, the quality tier steps down |
| Sustained EMA | > 19 ms steps down, < 13 ms steps back up | `AdaptiveQualityController` |
| Viewports | 1440×900 and 402×874, scale 1 | No broader device matrix |

The runtime quality-tier mechanism (AQ-70.3 AC #3) already exists and is
wired in: `AdaptiveQualityController` (`src/rendering/scene/runtime-quality.ts`)
records every frame interval in `aquarium.ts` `tick()`, evaluates ~2 s
windows, steps down High → Balanced → Low after 2 consecutive slow windows
(EMA > 19 ms or p95 > 22 ms), steps back up after 3 fast windows
(EMA < 13 ms), with a 5 s cooldown. Tiers lower cost automatically:
High caps pixel ratio at 1.5 with shadows on, Balanced caps it at 1.0,
Low additionally disables the key-light shadow pass and tightens the LOD
depth bands 15%. Hidden, paused and prefers-reduced-motion frames never
count as load. The controller's thresholds are asserted against
`FRAME_TIME_BUDGET` in `budgets.test.ts`, so the doc and the code cannot
drift apart silently. No runtime change was needed for this task — the
mechanism was delivered by PR #22 (AQ-76); this task documents it and
guards its thresholds.

## 4. Texture delivery: compressed textures required for new assets

**Rule.** Every photoreal asset created or rebuilt after this budget must
ship its textures as KTX2 / Basis Universal (`image/ktx2` in the GLB),
loaded via three.js `KTX2Loader`. Geometry compression (meshopt or Draco,
e.g. via glTF-Transform) is recommended for the same rebuilds but is not
yet a enforced requirement — no such tooling exists in the repo today, and
inventing a requirement nobody can run would make the check dishonest.
LODs follow the AQ-76 mechanism, which is animation-rate only: there is no
distance sprite swap (the LOD2 thumbnail-sprite tier was removed 2026-11-09
at Ryan's direction — fish keep their full GLB at every depth); no decimated
`*_lod1.glb` assets are generated.

**Grandfathering.** All 29 manifest assets predate this budget and ship
PNG textures — 0 of 29 use KTX2, 19,378,852 B of embedded PNG in total.
They are grandfathered by id in `GRANDFATHERED_UNCOMPRESSED_ASSET_IDS`
(`src/rendering/assets/budgets.ts`); that list is frozen at commit
`c38674f` and never grows. The automated check fails any asset id that is
not in that set unless its textures are all KTX2. That is the enforcement:
a new asset either ships compressed textures or the suite goes red.

**Why KTX2 pays.** The same 1024 px map costs ~5.6 MiB of GPU memory as
RGBA8 and ~1.4 MiB as BC7. The whole current scene's textures are
~196 MiB of GPU memory as PNG/JPEG; as KTX2 they would be ~50 MiB. That
headroom is what makes the hero-fish promotion (above) fit.

## 5. Baseline measurements at `c38674f` (AQ-70.3 AC #4)

Measured from the checked-in files at commit `c38674f` (PR #29 merged),
not from a browser session. Triangle counts come from the GLB index
accessors; texture dimensions from the PNG IHDR / JPEG SOF headers inside
each GLB; GPU memory is decoded RGBA8 + mipmaps (×1.33), BC7 where KTX2.
File bytes are the on-disk GLB sizes, which the manifest checker already
verifies against the manifest hashes.

| Asset class | Assets | File bytes | Triangles | Texture bytes | GPU memory |
| --- | ---: | ---: | ---: | ---: | ---: |
| Hero fish (Blender, not yet loaded) | 6 | 8,058,860 | 96,896 | 4,814,822 | 96.00 MiB |
| Background fish (splat) | 13 | 11,920,700 | 139,942 | 7,229,346 | 64.00 MiB |
| Coral colony | 8 | 11,846,320 | 161,672 | 4,621,107 | 54.67 MiB |
| Rock island | 2 | 4,230,156 | 49,144 | 2,713,577 | 8.00 MiB |
| Proof fish (not in a manifest) | 2 | 7,290,148 | 10,321 | 6,910,236 | 69.33 MiB |
| **Scene totals (loaded; hero fish excluded)** | **25** | **35,287,324** | **361,079** | **21,474,266** | **196.0 MiB** |

Per-asset maxima: hero fish 1,432,684 B / 17,226 tris; background fish
2,360,008 B / 19,406 tris (blue-tang, the outlier); coral 2,236,728 B /
34,176 tris (acropora-table); rock 2,125,240 B / 24,572 tris. Thumbnail
sprites (`public/fish/*.webp`, 15 files) add 630,998 B of download.
Total embedded texture bytes across all manifest GLBs: 19,378,852 B, all
PNG — KTX2 count is 0.

**Outlier to fix, not to budget around.** The proof-candidate clownfish
(`src/rendering/proof/candidate-real-clown.glb`, 5,973,300 B) carries
three 2048 px maps — 67,108,863 B (~64 MiB) of GPU texture memory for one
fish, a third of the whole scene's texture memory. It is not in any
manifest, so the automated check does not cover it; it is recorded here
so the AQ-79 / AQ-70.9 replacement is judged against it. The proof tang
(1,316,848 B, 1× 1024 px map, 5.33 MiB GPU) is already inside the
hero-fish caps.

**Frame-time baseline: partially recorded, capture still pending.** The
only current-scene frame observation on record is the 60-rAF-sample
main-page measurement in `docs/rendering.md`: median **33.3 ms**, p95
**35.0 ms** — a desktop-host frame interval, not a GPU timing, not a
full-roster measurement, and not a phone measurement. It is recorded here
as the starting point with those caveats, not as a passing grade: it is
above the 16.7 ms target, which is consistent with the adaptive tier
being the mechanism that keeps the scene usable rather than the scene
natively holding 60 fps. Proper per-viewport p50/p95 (plus
`renderer.info` draw calls / triangles and downloaded asset bytes) must
come from the look-dev capture statistics (AQ-70.2 AC #3) — and that
capture pipeline is not available yet: the pure-helper `lookdev.ts` the
AQ-70.2 notes describe is **not in the tree** at this commit, the main
integration is pending the AQ-70.12 handoff and Root approval, no baseline
capture set exists, and browser capture is Root-owned. Until AQ-70.2
lands, the frame-time rows below stay explicitly pending; the FPS counter
(AQ-83, merged PR #26) is the interim sampler — its smoothed FPS / frame
time is the same interval stream the adaptive controller consumes — but a
HUD readout is not a capture sidecar and is not recorded here as one.

| Viewport | Frame p50 | Frame p95 | Draw calls | Triangles | Asset bytes |
| --- | --- | --- | --- | --- | --- |
| 1440×900 | pending AQ-70.2 capture | pending | pending | 361,079 (static total) | 35,287,324 B GLB + 630,998 B sprites |
| 402×874 | pending AQ-70.2 capture | pending | pending | 361,079 (static total) | same assets |

## 6. How the automated check works

`src/rendering/assets/budgets.test.ts` runs inside `npm test` and:

1. **Unit-tests the policy** (`evaluateAssetBudget`, `evaluateSceneBudgets`):
   over-budget files, triangles, texture dimensions, map counts, single
   texture bytes and GPU memory all fail; uncompressed textures fail for
   non-grandfathered assets and pass for grandfathered ones; KTX2 assets
   pass; invalid measurements fail closed.
2. **Enforces the live manifests**: it reads the three real manifests,
   parses each GLB (triangle counts from index accessors, texture
   dimensions from PNG IHDR / JPEG SOF / KTX2 headers), and fails when
   any asset or any class total exceeds its budget, or when a
   non-grandfathered asset lacks KTX2 delivery. It also fails on stale
   grandfather entries, so the frozen list cannot silently rot.
3. **Enforces the scene totals**: Phase 0 fish bytes, total fish GLB
   bytes, total scene GLB bytes and runtime GPU texture memory (including
   the two unmanifested proof fish) against §2.
4. **Guards the frame-time mechanism**: it asserts the adaptive-quality
   controller's step-down/step-up thresholds equal `FRAME_TIME_BUDGET`
   (§3), so a threshold change in either place fails the suite.

Deliberate non-change: the hash checker
(`scripts/check-reef-asset-manifests.mjs`, exercised by
`manifest-checker.test.ts`) was **not** extended. It is a pure integrity
checker — file presence, byte sizes, SHA-256, inspection identity — and
budget evaluation needs GLB parsing (triangles, texture dimensions) that
does not belong in it. The budget check lives beside it in the same
`npm test` run, which is what AC #2 requires ("an automated check, part
of npm test"), without duplicating enforcement in two places that could
drift apart.

**When budgets change.** A budget change is a deliberate decision, not a
test fix: update the caps in `budgets.ts`, the tables in this document,
and the rationale for the change in the same PR. If a new asset cannot
fit a cap, the PR either shrinks the asset or raises the cap with a
measured justification — it must not silently edit the test to pass.
