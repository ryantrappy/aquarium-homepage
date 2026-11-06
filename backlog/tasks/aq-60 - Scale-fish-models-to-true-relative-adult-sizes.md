---
id: AQ-60
title: Scale fish models to true relative adult sizes
status: In Progress
assignee:
  - '@Antigravity'
created_date: '2026-11-05 05:14'
updated_date: '2026-11-06 04:34'
labels:
  - easy
  - rendering
dependencies: []
priority: high
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use docs/fish-scale-reference.md (clownfish ~3in vs royal gramma ~2.5-3in vs yellow tang ~6-7in vs blue tang ~8-10in, etc.) to size every fish so relative proportions are realistic.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Verify each size in docs/fish-scale-reference.md against its FishBase page and correct the table
- [ ] #2 One global tank-units-per-inch constant drives every fish's nose-to-tail length, measured from the GLB along the swim axis
- [ ] #3 Test asserts rendered length ratios match the reference within 10% (e.g. yellow tang ≈ 2x clownfish)
- [ ] #4 Visual check at 1440x900 and 402x874 confirms sensible proportions without breaking collision envelopes, hit targets or accessibility focus
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify docs/fish-scale-reference.md max lengths against FishBase species summaries; correct values and keep typical <= FishBase max.
2. Add src/rendering/scene/fish-scale.ts: one TANK_UNITS_PER_INCH constant, typical adult length per roster species (code mirrors the doc table; test parses doc to prevent drift), GLB swim-axis (+Z bind-space) lengths measured offline for the runtime candidate clown/tang GLBs, sprite artwork alpha-fill fraction for fallback sprites.
3. aquarium.ts minimal edit (file has concurrent unreviewed external edits; preserve them): replace hard-coded .42/.48 model scale with computed scale; scale fallback sprite meshes (not root, which carries turn flip); clearance = max(0.5, halfLength + 0.05) so collision envelope never shrinks below today and grows for larger fish; scale link anchor hit box by rendered length (min 44px kept).
4. Tests: GLB parse re-measures swim-axis extents and matches constants; rendered length ratios within 10% of reference; doc table parity.
5. Typecheck + vitest; browser check at 1440x900 and 402x874 via Chrome DevTools (127.0.0.1:9222).

Bounded Root iteration: inspect the current 402x874 width calculation and actual rebuildFish spawn ordering; add a deterministic safe-spawn selector that clamps each requested position to the fish's existing clearance-shrunk current habitat bounds, validates point occupancy using the existing legacy-unit isWaterSegmentSafe query (start=target), and searches a bounded ordered candidate set only when a solid blocks the clamped point. Reuse the same predicate in resize so a rebuild is triggered when any fish's current position is invalid for its actual radius/new bounds. Keep fish model scale and clearance unchanged; report unavailable instead of unsafe placement if no candidate exists. Add focused tests for all five approved starter mappings at phone and desktop widths, including the blue tang case, solid fallback, deterministic selection, and no-fit handling. The remaining fixed physical-tank/camera framing decision belongs to AQ34; this iteration preserves the current viewport-cropped bounds.

7. Add a FishBase summary link inside every existing maximum-size cell (preserve the five-column table and numeric render parser); add a parity assertion that all 15 roster rows link to their correct FishBase species summary.

8. For the adult-female lyretail baseline, record FishBase female max 7 cm TL and male/unsexed 15 cm TL, set only its render target to 2.5 in (6.35 cm), and mark that as a project-selected target rather than a biological typical size. Mark remaining unsourced Typical adult estimates explicitly uncited/unverified; preserve their values and leave AC #1 open pending real typical-size sources.

9. Root-priority spawn iteration (2026-11-05): replace fixed center-clustered defaults for only newly created/replaced fish with a deterministic identity/species-seeded candidate preference across current safe X/Z bounds and the species profile's declared normalized depthRange; choose finite safe candidates that maximize clearance from retained/already planned fish when a non-crowded placement exists, otherwise use the best safe candidate or preserve truthful no-fit fallback. Derive a small stable heading variation from the same seed and initialize fish plus extension snapshot together via an optional constructor option. Do not reposition retained fish for metadata/add/reorder changes, resize-invalid fish remain on current recovery path, and do not change model scales, radii, obstacle dimensions, or metric claims. Restrict edits to fish-spawn.ts/test and the aquarium reconcile/create spawn block; include a narrowly scoped motion constructor option only for consistent initial yaw. Verify deterministic seed/reconcile invariants, all 5 approved starter positions at 402x874 and 1440x900 against actual habitat clearance, and focused suites/typecheck.

Spawn-heading refinement after Root review: after selecting each safe point, test the deterministic seed yaw and seven 45-degree alternatives with a short segment through the same existing `isWaterSegmentSafe` obstacle/bounds predicate. Choose the first safe heading; if none is clear, retain the seeded finite heading so a single directional obstruction cannot make placement unavailable or trigger a planner expansion.

Policy clarification after Root review: among safe points, prefer the closest seeded species-depth target that is clear of combined existing/planned fish clearances; do not maximize distance once a non-crowded point exists. If no non-crowded point exists, use a soft least-overlap/least-penetration safe fallback. This preserves natural targets and never makes crowding alone a no-fit result.

10. Root native-review follow-up (2026-11-05): the current hash-only X targets still project too centrally. Before editing, adopt deterministic horizontal strata sorted by stable service ID: assign each configured service an even slot over its own clearance-safe x interval, add small identity-seeded jitter capped well within half a slot, keep species-profile depth and seeded safe heading, and keep z preference. For new/replaced entries, choose an available stratum against retained/planned positions using existing clearance occupancy; if all strata conflict, retain the nearest seeded stratum and let the bounded 3D safe selector use its non-crowding/soft fallback. Never move retained fish on metadata/reorder/add; do not change fish radii, scales, units, or equalize y/z into rows. Verify projected screen-center spread against previous two-row phone/laptop baseline at exact 402x874 and1440x900, plus all-five safe geometry, headings, movement, and retained lifecycle.

Rank/fallback clarification: assign strata with a codepoint-stable comparator over service ID then fish ID. Resolve occupied strata by the existing actual 3D candidate distance against retained/planned points, not x-only screening: near-equal X can remain valid when Y/Z separate fish. Keep one ≤216-point geometry query per new fish, not one full search per alternate stratum. Compare projected link center spans through the actual 42° PerspectiveCamera, not world X alone.

### Specific Code Changes & Locations

1. **Global Scale Constants & Swim-Axis Extents (`src/rendering/scene/fish-scale.ts` lines 9–82)**:
   - `TANK_UNITS_PER_INCH = 0.16` converts `FISH_RENDER_LENGTH_INCHES[speciesId]` (mirrored from `docs/fish-scale-reference.md` and verified by `src/rendering/scene/fish-scale.test.ts`) into world units via `fishRenderLength(speciesId)`.
   - `fishModelScale(speciesId) = fishRenderLength(speciesId) / MODEL_SWIM_AXIS_LENGTH[speciesId]` scales 3D GLBs uniformly; `fishClearanceRadius(speciesId) = Math.max(0.5, fishRenderLength(speciesId) / 2 + 0.05)` scales collision envelopes.
2. **Stratified Safe Initial Spawn & Heading Selection (`src/rendering/scene/fish-spawn.ts` & `src/rendering/scene/aquarium.ts` lines 259–315)**:
   - `findSafeFishSpawn()` and `fishSpawnPreference()` in `src/rendering/scene/fish-spawn.ts` clamp and search a bounded `<= 216`-candidate 3D grid inside clearance-shrunk camera bounds (`halfWidth` at line 354 of `aquarium.ts`), using identity-stratified horizontal X slots, profile `depthRange` Y targets, and an 8-direction `isWaterSegmentSafe` initial heading check.

Projected composition correction plan before edits (Root requested): keep deterministic identity-ranked slots and 3D occupancy; remove the additional 4%/8%-range X inset for slotted fish because slot centers/jitter already stay interior. Bias only the outer horizontal strata toward the safe front-depth interval: map outer-slotness to a deterministic Z fraction around .92-.98, while center strata stay around .55-.61; retain species-profile Y and seeded yaw. Unsotted callers keep existing X/Z preferences. Then compare actual 42° camera-projected fish-link centers against both the two-row and hash-only baselines on phone/laptop, and rerun modular-geometry safety plus movement tests. This changes no camera, dimensions, scales, or clearance.

Revised projected-composition policy after Root/reviewer coordination request, before code edits: use edge-normalized X ranks (`rank/(count-1)`) over each fish's own clearance-safe range with small deterministic inward jitter (<=10% of one stratum width), so outer slots use near-safe lateral space. Bias only the two outermost strata toward separate near-front Z lanes, left fraction .82-.90 and right .90-.98; interior strata retain the current seeded Z range and all species keep `depthRange` Y. Use one existing 3D occupancy search per newly spawned fish; actual 3D clearance decides if an outer slot can be retained, never x-only rejection. Validate using `projectFishLinkBounds` projected centers vs both prior hash-only and old two-row starts, with the existing phone/laptop thresholds; reviewer is quantifying before implementation.

Exact ranges approved by Root after the independent current-geometry projection probe: slotted X fraction `.02 + .96 * jitteredEdgeRank`, where rank is index/(count-1) with small symmetric deterministic jitter of `.08/(count-1)`; for count 1 keep hash-based X. For only first/last ranks when count >= 2, use separate Z fractions `.80 + .05 * seededUnit` and `.91 + .04 * seededUnit`; inner ranks retain the existing `.40 + .60 * seededUnit` Z fraction. Probe estimate on all-five starter mapping: projected span 158.42px/39.4% phone and 934.45px/64.9% laptop; repository tests will recalculate with actual link-projection bounds.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-04 progress (Antigravity): FishBase maxima verified via fishbase.se species summaries; docs/fish-scale-reference.md corrected (banggai 8.6cm, mandarin 7cm, tailspot blenny 6cm, McCosker's 8cm, anthias 15cm, flame angel 15cm; goby max is SL) and gained a Render length column. Added src/rendering/scene/fish-scale.ts (TANK_UNITS_PER_INCH=0.16; GLB +Z swim-axis lengths clown 2.0 / tang 1.985423 measured from runtime candidate GLB accessors; sprite alpha-fill fractions from public/fish webp) + fish-scale.test.ts (doc parity, GLB re-measure, ratio within 10%, clearance). aquarium.ts minimal edits only (model scale, sprite mesh scale, clearance=max(0.5, half-length+0.05), link hit box scaled by body length, min 44px). External unreviewed edits in aquarium.ts preserved. Next: full tests/typecheck, browser check at 1440x900 and 402x874.

2026-11-05 Root bounded spawn iteration: reproduced the phone case using the actual camera-bound formula: at 402x874, halfWidth=1.050884; the fifth starter blue tang prefers x=0.3 while its existing AQ60 clearance is 0.77 legacy aquarium scene units, so the old placement exceeds the safe x range ±0.280884. Added fish-spawn.ts to clamp and validate with existing isWaterSegmentSafe point checks and a deterministic max-216-candidate fallback; aquarium.ts preflights all placements, preserves radius/model scale, uses visible native-link fallback if no safe placement exists, and validates each current fish on resize. Tests: fish-spawn.test.ts + fish-scale.test.ts: 8 passed; npm run typecheck passed; git diff --check scoped to aquarium.ts and fish-spawn files passed. No visual viewport check performed; AQ60 AC4 remains unchecked for this iteration. Fixed physical tank/camera treatment remains AQ34.

AQ60 review-feedback iteration: `rebuildFish` now returns success/unavailable, and initialize reports status from that result instead of unconditionally marking ready; update and resize use the same result. An unavailable spawn stops the renderer loop and leaves the React-owned fallback anchors visible. A later successful resize/config rebuild restores ready and restarts the loop. Added controller-state contract tests for failed/ready status and loop gating; direct WebGL initialization is not instantiated in the node test harness. Verification: focused fish-spawn/fish-scale suites 9 passed, typecheck and scoped diff-check passed. No build/server/browser run.

2026-11-05 Root native-browser review of production snapshot /tmp/aquarium-main-review-20261105: 1440x900 and402x874 CSS pixels, scale1. All five approved native links have correct href and target=_blank; phone Settings dialog fits374x846 within402x874 with no horizontal overflow. Blue tang target visibly changed position after the spawn fix. Pause kept every fish target transform stable while Services opened; resume changed all five positions. Captured browser warnings/errors: none. Screenshots /tmp/aquarium-review-evidence/aq60-phone-paused.png and aq60-laptop-resumed.png. Snapshot full suite298tests before final fallback-state tweak; final focused9tests/typecheck/build pass. This checks the current two-GLB/three-artwork baseline, not canonical model promotion, animated-envelope coverage, final focus audit or assembled-scene acceptance; AC4 remains open.

2026-11-05 Root approved source/doc follow-up after direct FishBase verification: Pseudanthias squamipinnis summary line 96 reports 15.0 cm TL male/unsexed and 7.0 cm TL female; roster/art baseline is female, so existing 10–13 cm typical and 4.5 in render are mismatched. Authorized edits: all 15 max-column FishBase links, only the lyretail FISH_RENDER_LENGTH/table render target change to 2.5 in, row-specific female/male maximum labeling, and source-status clarifications. Keep other typical values marked uncited/unverified and AC #1 unchecked; do not alter model/asset maps or promote models.

2026-11-05 source/doc iteration implemented per Root approval: added exact FishBase summary links inside all 15 maximum cells while retaining the five-column table. The fish-scale parser still reads the render value as column four; added a test asserting all 15 stable IDs map to their correct FishBase page.

Corrected the adult-female lyretail row: max cell distinguishes male/unsexed 15 cm TL from female 7 cm TL; typical cell no longer claims 10–13 cm and states female typical remains unverified; render target is 2.5 in (6.35 cm), explicitly a project target below the FishBase female maximum. Relative-to-clown render ratio updated to ~0.8x. Other typical estimates and values are retained but clearly labeled uncited/unverified; AC #1 remains unchecked until they are independently sourced.

Validation after this iteration: `npx vitest run src/rendering/scene/fish-scale.test.ts` passes 6/6, `npm run typecheck` passes including syntax checks for 11 scripts, and scoped `git diff --check` passes. Only the lyretail entry in FISH_RENDER_LENGTH_INCHES changed; Root's concurrent MODEL_SWIM_AXIS_LENGTH entries were preserved untouched. No model maps/art changed and no completion status or commit.

2026-11-05 test-quality follow-up: FishBase URL expectation now derives its species slug from each existing REEF_FISH scientificName; the lyretail regression confirms the roster row's female baseline and compares rendered centimeters against the female TL bound parsed from that linked maximum cell (no hardcoded slug list or 2.5-in expected-value assertion). Table/code render parity remains active.

2026-11-05 verification note now distinguishes direct page retrieval from FishBase-indexed primary content: 10 summary pages were directly accessible; five (blue tang, royal gramma, blue-green chromis, flame angelfish, copperband) returned direct-retrieval errors, and their values were checked only from FishBase's indexed summary content. No third-party source substitution. Focused test passes 6/6; `npm run typecheck` passes, including the 11-script syntax check; scoped diff-check passes. AC #1 stays unchecked while typical-size estimates remain unsourced.

2026-11-05 Root verified bounded scale/source handoff: independently read exact FishBase Pseudanthias squamipinnis summary, which distinguishes female7cmTL from male/unsexed15cmTL; existing roster explicitly requires adult female. Approved2.5in(6.35cm) project target replaces4.5in, preservesall otheradulttargets and usermodel-axis work. All15maximum cells now link toprimaryFishBase pages; indexed-versus-direct access limits and uncited typical-size estimates are explicit. Tests derive source slugs fromcatalog and compare rendercm againstparsedfemale bound ratherthan mirroringchosenvalue. Frozen reviewed snapshot:6focusedscale tests, default44files/392tests, typecheck and build pass. AC1 remainsopen forunverified typicaladult claims; actual15model/envelope/visual gates remainopen. Newuserrequest for natural initialspawn spread continues separately in this same task; noDone ormodelpromotion.

2026-11-05 @thumbnail_loading root-priority AQ-60 initial-spawn iteration implemented in working tree; awaiting independent/native Root review. Code/tests scoped to `src/rendering/scene/fish-spawn.ts`, its focused test, `motion.ts` optional initial yaw, aquarium create/reconcile spawn-selection lines, and aquarium lifecycle test. 40 focused tests pass across fish-spawn/lifecycle/motion suites; typecheck passes; scoped diff-check passes. No files outside the authorized scope touched by this iteration; aquarium.ts still contains Root's existing 13 candidate model URL additions, which must remain preserved and be excluded from any spawn-only commit. No acceptance criteria checked or task marked Done.

Root continues initial-spawn refinement after worker usage limits. Applying stable identity-sorted horizontal strata with bounded12%-of-slot jitter to new/replaced fish only, retaining profile depth and seeded heading. A single preferred stratum feeds the existing216candidate search; geometry-safe crowding fallback already considers actual3D positions, so no additional N-strata search multiplier. Native first iteration was rejected for central phone composition; actual42degree camera projection comparisons and fresh native review will decide acceptance. Concurrent AQ70 planning tasks and all visual assets/maps remain untouched.

2026-11-06 @thumbnail_loading follow-up applied Root-approved edge-ranked X and outer-lane forward-Z preference. Current source/tests pass44focused spawn/lifecycle/motion tests, typecheck (11script syntax scans), and scoped diff-check. Actual link-projection test passes phone/laptop thresholds against both hash-only and old two-row baselines; full geometry/movement assertions pass. Root native review pending. No AC/status/commit.

2026-11-05 root-review boundary regression: preserved the existing implementation clamp, whose edge-ranked preference X fraction remains in [0.02, 0.98]. Added explicit two-fish endpoint IDs `edge-review-1` (slot 0/count 2) and `edge-review-5` (slot 1/count 2), plus finite clearance-safe bounds coverage for cohort sizes 1, 2, 3, 5, 15, and 64. Focused fish-spawn suite passes 15/15; source implementation hash unchanged.

2026-11-06 Root final-typecheck follow-up: added explicit optional bound typing and `!== undefined` narrowing in the two edge-regression assertions only. No production changes. Focused fish-spawn suite passes 15/15; `npm run typecheck` passes (`tsc --noEmit` plus syntax validation of 11 scripts); scoped diff-check passes. Updated test SHA: e64912aaaf455fa218ae2d6c67a34c02da704b0723f1c5ac4209754069d00976.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Antigravity
created: 2026-11-05 05:54
---
Picked up by Antigravity (Claude) at user request 2026-11-04. Starting research on current fish scale code (aquarium.ts L118) and GLB inspection data.
---

author: root
created: 2026-11-05 13:09
---
Root independent validation of scratch audit3.4 confirms current-source phone freeze:402x874 halfWidth1.050884; fifth starter blue tang spawns atx.3 but configured legacy radius.77 permits only±.280884. Zero movement over600steps/10s in asserted temporary reproduction. Existing.7s backoff works (15planningbatches), so the audit claim of every-frame/unbounded search is incorrect. Fix safe initial placement and radius/viewport consistency under AC4; coordinate true3D integrationAQ34/AQ58. Do not mislabel current legacy radius as meters. Repro:/tmp/aq58-audit-claims.test.ts.
---

created: 2026-11-05 13:41
---
Addressed Root review: initialization status now comes from the spawn rebuild result, so an infeasible placement cannot be overwritten to ready; unavailable spawn state disables the render loop, and successful resize/config recovery reenables it. Added fallback/status/loop gate regression. Direct WebGL initialization is not exercised in the Node harness. Focused suites: 9 tests pass; typecheck and scoped diff-check pass. AQ60 remains In Progress; no ACs checked.
---

author: @thumbnail_loading
created: 2026-11-05 23:12
---
2026-11-05 read-only FishBase verification for AC #1 (no doc/code edits): current maximum-length numbers and TL/SL labels all match FishBase. Verified species summary values (cm and length type): Ocellaris clownfish 11 TL; yellow tang 20 TL; blue tang 31 TL; royal gramma 8 TL; Banggai cardinalfish 8.6 TL (female); blue-green chromis 10 TL; firefish 9 TL; yellow watchman goby 10 SL; mandarin dragonet 7 TL; tailspot blenny 6 TL; six-line wrasse 10 TL; McCosker’s flasher 8 TL; lyretail anthias 15 TL male/unsexed (FishBase separately gives 7 TL female); flame angelfish 15 TL; copperband butterflyfish 20 TL. Existing inch conversions round correctly to one decimal.
---

author: @thumbnail_loading
created: 2026-11-05 23:12
---
FishBase primary summary pages checked: [Amphiprion ocellaris](https://www.fishbase.se/summary/Amphiprion-ocellaris), [Zebrasoma flavescens](https://www.fishbase.se/summary/Zebrasoma-flavescens), [Paracanthurus hepatus](https://www.fishbase.se/summary/Paracanthurus-hepatus), [Gramma loreto](https://www.fishbase.se/summary/Gramma-loreto), [Pterapogon kauderni](https://www.fishbase.se/summary/Pterapogon-kauderni), [Chromis viridis](https://www.fishbase.se/summary/Chromis-viridis), [Nemateleotris magnifica](https://www.fishbase.se/summary/Nemateleotris-magnifica), [Cryptocentrus cinctus](https://www.fishbase.se/summary/Cryptocentrus-cinctus), [Synchiropus splendidus](https://www.fishbase.se/summary/Synchiropus-splendidus), [Ecsenius stigmatura](https://www.fishbase.se/summary/Ecsenius-stigmatura), [Pseudocheilinus hexataenia](https://www.fishbase.se/summary/Pseudocheilinus-hexataenia), [Paracheilinus mccoskeri](https://www.fishbase.se/summary/Paracheilinus-mccoskeri), [Pseudanthias squamipinnis](https://www.fishbase.se/summary/Pseudanthias-squamipinnis), [Centropyge loricula](https://www.fishbase.se/summary/Centropyge-loricula), [Chelmon rostratus](https://www.fishbase.se/summary/Chelmon-rostratus). Five direct-open attempts returned a FishBase-site access error (blue tang, royal gramma, blue-green chromis, flame angelfish, copperband); FishBase’s own indexed summary content returned their exact Max length values, so no substitute source was used.
---

author: @thumbnail_loading
created: 2026-11-05 23:12
---
Proposed documentation follow-up before any edits: no FishBase maximum correction is needed. Add per-row FishBase source links so the maxima are auditable, retain the explicit yellow-watchman goby SL label, and source the “typical adult” column separately: FishBase species summaries provide maxima, not the table’s typical aquarium-kept adult values. The typical-size claims currently have no row-level husbandry citations in docs/fish-scale-reference.md.
---

author: thumbnail_loading
created: 2026-11-05 23:43
---
2026-11-05 root-priority initial-spawn implementation ready for review. Only new/initial/replaced fish receive deterministic `fishSpawnPreference` targets keyed by service and species: X/Z spread through current safe bounds; Y samples the species profile's declared normalized depth range from the water surface. The existing max-216 candidate search uses current modular reef solid volumes and clearance-shrunk camera bounds; closest seeded target among non-overlapping safe candidates wins, with least-penetration safe fallback if spacing cannot fit. Eight bounded yaw options test a short segment against the same habitat/bounds predicate. Optional constructor `initialYaw` defaults to the previous pi/2 and feeds both motion state and extension's initial snapshot. Metadata edits/reorders retain exact existing fish instances/poses; added fish treat retained and planned positions as occupied. No model scale, clearance, metric-unit, source-art or Backlog acceptance changes.

Verification: `npx vitest run src/rendering/scene/fish-spawn.test.ts src/rendering/scene/aquarium-lifecycle.test.ts src/rendering/scene/motion.test.ts` passed 40 tests; `npm run typecheck` passed and syntax-checked 11 scripts; scoped `git diff --check` passed. Five configured starter fish are tested against the current modular reef geometry/current camera-bound formula at 402x874 and 1440x900: safe bounds/solids, pairwise combined-clearance separation when feasible, profile depth staging, spread across x/y/z vs previous two-row front plane, deterministic positions/headings, and safe initial headings. A 5-second legacy-scene movement trace confirms each starter moves more than .01 scene unit while remaining safe. Lifecycle tests confirm metadata/reorder retain existing motion, and that the new yaw initializes both the fish and extension snapshot identically. Root owns native visual review and commit; no AC checked.
---

author: @link-interaction
created: 2026-11-05 23:44
---
2026-11-05 independent @link-interaction final spawn review PASS for frozen source: spawn SHAe72557569317d15a21b5eb29b9ce9d98fd0d24bb75d9ce65e8bd83511b045a5d, motion3e138d4e5bb88ae9e6c446d4e775d5b1ca730be44227d2dc17b02529cf755c43, spawn-test1c90f944cb7947c89bf000ea46cd659d74c27e9877fea360aa2f58c96c53d886, lifecycle697bf95cc60388244de1ea46e55fc9c4975e8574c2757d9361d2726f45a74b69; sanitized aquariumdd576dce150757c3d15622f1056fb943ae2122541eb9481d8fea7de4de921d78 excludes only13concurrent model URL additions. Read candidate generation/scoring, heading, constructor/extension snapshot and reconcile changes. Candidate generation has <=6 values/axis, <=216 solid point checks per new/replaced fish and8 forward heading sweeps; no random rejection loop or unbounded placement retry. Nearest seeded preference among nonoverlapping points and least-penetration safe fallback match Root-approved policy; invalid numeric crowding hints are ignored and fish crowding alone never means no fit. Exact current modular placements/camera bounds tested at only402x874 and1440x900; actual5starter points/forward segments remain safe under existing legacy habitat queries, pairwise clearance is feasible and all5 move in5s traces. Seeded normalized depth maps from tank top; selected default/profile pose preferences are deterministic. Constructor accepts yaw0, rejects nonfinite yaw, preserves default pi/2 and sets fish/extension initial snapshot to identical heading. AQ64 retained root/motion/player/route/phase, delta ownership, no-fit recovery and stale/current texture regressions pass unchanged. Independently ran spawn/motion/lifecycle/scale4suites:46tests pass. No blocking finding; Root native visual distribution/final scale/focus/animated-envelope criteria remain separate and open. No source/art edits or Done/commit by reviewer.
---

author: root
created: 2026-11-05 23:45
---
Root native composition review: first seeded-XYZ iteration is safe and frozen full399 tests/typecheck/build pass, but its five initial fish projected centers on402px phone are approximately230,160,214,177,183px. This still looks centrally bunched. Requested deliberate stable identity-stratified horizontal preferences with small jitter while retaining varied species depth/headings, full geometry clearance and AQ64 survivor state. World-space separation alone is insufficient evidence for this user request; first iteration is not committed or accepted yet.
---

author: @root
created: 2026-11-06 02:41
---
Photorealism audit 2026-11-05 (AQ-70): AQ-70.13 will define a single metric tank scale shared by fish, coral and rock; the global units-per-inch constant here should be compatible with it.
---

author: @link-interaction
created: 2026-11-06 04:25
---
Independent composition proposal review after Root native rejection: world-space safety/separation did not establish visible distribution. Current identity-centered strata still project to a 102.60px phone span (25.5%) and 605.21px laptop span (42.0%). A read-only temporary probe at /tmp/aq60-projection-review-20261105/ uses the actual perspective camera and current modular habitat. Edge-normalized X ranks alone reach132.10px/779.19px and still miss the unchanged35%/55% targets. Giving only the two outer lanes distinct forward depth bands, while preserving inner depth preferences, reaches158.42px(39.4%) phone and934.45px(64.9%) laptop with3.014 scene units of depth spread. Both viewports pass initial short-heading geometry checks, combined-radius initial separation and5-second safe movement traces. Tightest phone pair gap is0.00247 legacy scene units beyond combined radii. This establishes a feasible narrow composition proposal without lowering visual targets, changing camera/clearances/models or moving all fish to one plane. Root policy/native approval and final worker-source verification remain required. No repository source/art edits by this reviewer.
---

author: thumbnail_loading
created: 2026-11-06 04:27
---
2026-11-06 projected-composition follow-up ready for Root native review. Updated slotted X to edge-normalized ranks with small deterministic jitter, clamped the resulting preference inside each species' clearance-safe range, and placed only the outermost left/right slots in distinct seeded forward-Z bands (.80–.85 and .91–.95); interior Z sampling remains the prior seeded .40–1.00 range, and per-species normalized depth Y plus seeded safe heading are unchanged. The existing single bounded 216-point safe selector resolves true 3D spacing against retained/planned fish. Metadata/reorder/add preservation, fish radii/scales, camera bounds, and model URL additions remain unchanged.

Evidence: focused spawn/lifecycle/motion tests pass 44/44; projected centers via `projectFishLinkBounds` exceed prior hash-only and two-row baselines and pass >35% phone / >55% laptop span thresholds at exact 402x874 and1440x900; source safety checks pass against current modular reef obstacles, pairwise spacing, headings and five-second movement; slot targets remain finite/in safe X for counts1,2,5,15. `npm run typecheck` passes and syntax-checks11scripts; scoped diff-check passes. Independent geometry probe predicted 158.42px phone and934.45px laptop; repository tests recalculate actual projected bounds. No acceptance criteria checked; Root owns native review and commit.
---

author: @link-interaction
created: 2026-11-06 04:30
---
Independent revised-composition review PASS, 2026-11-05: production spawn SHA cac77679a69ce9f726a58c8b7ebb4cde719a935944ab13bb618ed04e54c18035; updated test SHA c87cab5031a56f8b130111734070c0e380b3ddf9dc3732d8ca3be988e1d2c91b. Sanitized aquarium SHA 85c772f7a9f812cce45fcaf81bcb515b08fb38666ca2fef186b94b7faa448328 differs from working source only by the 13 preserved model URL additions. Edge-normalized ID slots and bounded jitter now clamp the preference itself, not only the later selector. Confirmed the original two-fish fixture missed overshoot; requested explicit seeds edge-review-1 and edge-review-5. An exact temporary source copy with only the clamp removed places those X targets outside the safe range (-0.482401 and +0.492825 versus ±0.480884); current source stays inside. Those seeds and finite safe bounds for cohorts 1, 2, 3, 5, 15 and 64 are now in the worker test. No production source edits by reviewer.

Independent final-source projection/motion probe: phone center span 159.499 px (39.68%), laptop 940.835 px (65.34%), retaining 2.949 scene units of depth variation. Both exceed the unchanged 35%/55% camera-projection targets; only outer lanes move forward, while inner depths/profile staging remain varied. Initial heading segments, current modular solid/bound clearance and pairwise combined-radius separation pass. Every starter moves safely over five seconds (minimum displacement 0.0791 phone, 0.2649 laptop in legacy scene units). Probe files/results: /tmp/aq60-projection-review-20261105/final-composition.test.ts and final-results.json; clamp counterfactual proof is boundary.test.ts/boundary-results.json. Independently reran spawn, motion, lifecycle and scale suites: 50 tests pass. AQ64 identity, clock, disposal and stale-texture cases remain intact. No blocking source finding; Root native composition acceptance and broader AQ60 model/scale/envelope/accessibility gates remain separate. No Done, commit or asset promotion.
---

author: root
created: 2026-11-06 04:34
---
Root accepted requested initial-spread slice after native fresh-load review at402x874 and1440x900 CSS DPR1. Actual phone center span159.50px(39.68%) and laptop940.84px(65.34%); all5visible initially and all5move afterresume. Pause preserves all5poses over30rAF. Source also preserves AQ64 existing inhabitants and clearance/radius; independent50tests and frozen default44files/403tests pass, finaltypecheck/build pass. Endpoint assertions were strengthened afterfullrun and pass15focusedtests; onlyTypeScript narrowing thenchanged. Durable source-pinned report/screenshots: docs/asset-evidence/aq60/spawn-review.json. Parent remainsopen for broader scale/source/animated-envelope criteria. Commit will use reviewed frozen aquarium blob85c772f7...; new external AQ70.12sand work and13candidate URLs are preserved in worktree and excluded. Combined concurrent Backlog planning changes are not staged with the spawn code.
---
<!-- COMMENTS:END -->
