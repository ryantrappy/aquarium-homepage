---
id: AQ-60
title: Scale fish models to true relative adult sizes
status: In Progress
assignee:
  - '@Antigravity'
created_date: '2026-11-05 05:14'
updated_date: '2026-11-05 14:10'
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
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-04 progress (Antigravity): FishBase maxima verified via fishbase.se species summaries; docs/fish-scale-reference.md corrected (banggai 8.6cm, mandarin 7cm, tailspot blenny 6cm, McCosker's 8cm, anthias 15cm, flame angel 15cm; goby max is SL) and gained a Render length column. Added src/rendering/scene/fish-scale.ts (TANK_UNITS_PER_INCH=0.16; GLB +Z swim-axis lengths clown 2.0 / tang 1.985423 measured from runtime candidate GLB accessors; sprite alpha-fill fractions from public/fish webp) + fish-scale.test.ts (doc parity, GLB re-measure, ratio within 10%, clearance). aquarium.ts minimal edits only (model scale, sprite mesh scale, clearance=max(0.5, half-length+0.05), link hit box scaled by body length, min 44px). External unreviewed edits in aquarium.ts preserved. Next: full tests/typecheck, browser check at 1440x900 and 402x874.

2026-11-05 Root bounded spawn iteration: reproduced the phone case using the actual camera-bound formula: at 402x874, halfWidth=1.050884; the fifth starter blue tang prefers x=0.3 while its existing AQ60 clearance is 0.77 legacy aquarium scene units, so the old placement exceeds the safe x range ±0.280884. Added fish-spawn.ts to clamp and validate with existing isWaterSegmentSafe point checks and a deterministic max-216-candidate fallback; aquarium.ts preflights all placements, preserves radius/model scale, uses visible native-link fallback if no safe placement exists, and validates each current fish on resize. Tests: fish-spawn.test.ts + fish-scale.test.ts: 8 passed; npm run typecheck passed; git diff --check scoped to aquarium.ts and fish-spawn files passed. No visual viewport check performed; AQ60 AC4 remains unchecked for this iteration. Fixed physical tank/camera treatment remains AQ34.

AQ60 review-feedback iteration: `rebuildFish` now returns success/unavailable, and initialize reports status from that result instead of unconditionally marking ready; update and resize use the same result. An unavailable spawn stops the renderer loop and leaves the React-owned fallback anchors visible. A later successful resize/config rebuild restores ready and restarts the loop. Added controller-state contract tests for failed/ready status and loop gating; direct WebGL initialization is not instantiated in the node test harness. Verification: focused fish-spawn/fish-scale suites 9 passed, typecheck and scoped diff-check passed. No build/server/browser run.

2026-11-05 Root native-browser review of production snapshot /tmp/aquarium-main-review-20261105: 1440x900 and402x874 CSS pixels, scale1. All five approved native links have correct href and target=_blank; phone Settings dialog fits374x846 within402x874 with no horizontal overflow. Blue tang target visibly changed position after the spawn fix. Pause kept every fish target transform stable while Services opened; resume changed all five positions. Captured browser warnings/errors: none. Screenshots /tmp/aquarium-review-evidence/aq60-phone-paused.png and aq60-laptop-resumed.png. Snapshot full suite298tests before final fallback-state tweak; final focused9tests/typecheck/build pass. This checks the current two-GLB/three-artwork baseline, not canonical model promotion, animated-envelope coverage, final focus audit or assembled-scene acceptance; AC4 remains open.
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
<!-- COMMENTS:END -->
