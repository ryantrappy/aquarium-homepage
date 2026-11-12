---
id: AQ-60
title: Scale fish models to true relative adult sizes
status: In Progress
assignee:
  - '@Antigravity'
created_date: '2026-11-05 05:14'
updated_date: '2026-11-12 05:37'
labels:
  - easy
  - rendering
  - waiting-for-answers
dependencies: []
priority: '3'
ordinal: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use docs/fish-scale-reference.md (clownfish ~3in vs royal gramma ~2.5-3in vs yellow tang ~6-7in vs blue tang ~8-10in, etc.) to size every fish so relative proportions are realistic.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Verify each size in docs/fish-scale-reference.md against its FishBase page and correct the table
- [x] #2 One global tank-units-per-inch constant drives every fish's nose-to-tail length, measured from the GLB along the swim axis
- [x] #3 Test asserts rendered length ratios match the reference within 10% (e.g. yellow tang ≈ 2x clownfish)
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

2026-11-08 audit: FishBase adult sizes in docs/fish-scale-reference.md, single global TANK_UNITS_PER_INCH scale in src/rendering/scene/fish-scale.ts, and 10% relative ratio assertions in src/rendering/scene/fish-scale.test.ts (6 passing tests) satisfy ACs #1-#3. Marked ready-for-review / gemini approved awaiting Root 2-viewport visual sign-off (AC #4).
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

author: @root
created: 2026-11-12 05:37
---
Root review 2026-11-11: HOLD for user clarification. Clarify whether sourced typical adult lengths are still required, or whether sourced maxima plus explicit artistic render targets suffice. docs/fish-scale-reference.md still marks typical estimates unverified; AC1 cannot currently be accepted.
---
<!-- COMMENTS:END -->
