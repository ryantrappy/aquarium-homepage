---
id: AQ-105
title: >-
  Make the clownfish interact/host in the anemone as if it would in the natural
  world
status: Done
assignee:
  - '@root'
created_date: '2026-11-14 05:06'
updated_date: '2026-11-14 14:51'
labels: []
dependencies: []
documentation:
  - docs/asset-evidence/aq105/README.md
  - docs/asset-evidence/aq105/final-4df19de/README.md
priority: '3'
type: feature
ordinal: 142000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use the supplied mounted anemone as the clownfish home. Replace detached stand-off targeting with a point derived from the visible tentacle crown; allow the resident clownfish through its soft host envelope while retaining rigid-rock, glass and unrelated coral checks. Make local bobbing/peeks and short returns visible without changing other species or rebuilding Gemini models. Animation distances are artistic parameters, not universal biological measurements.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The clownfish home target follows the actual mounted anemone tentacle crown in both current layouts, rather than a detached front-plane or clamped socket point; missing or invalid geometry remains unavailable.
- [x] #2 A compatible clownfish can enter its soft anemone region and remain near the same host across idle/swim transitions, with bobbing and brief peeks/returns; an absent or blocked host never causes teleportation or fabricated contact.
- [x] #3 Planning and every interaction movement retain rigid-rock, glass, unrelated-coral and query-budget checks; other fish retain the conservative anemone envelope and existing species behavior.
- [x] #4 Root reviews focused and full tests, typecheck/build and exact1440x900/402x874 native evidence for visible hosting, articulated motion, working service links and pause/reduced-motion behavior before completion.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Measure current mounted anemone and diagnose detached targeting/collision. 2. Add a source-derived host target and narrowly species-scoped soft-host query retaining all rigid geometry and budgets. 3. Keep a resident clownfish on local interaction cycles across state changes, preserving safe approach/fallback. 4. Add counterexamples and actual-source two-layout integration checks, run full validation and native review; leave any unverified art/body gates open.

5. Root full-assembly counterexample: only the resident clownfish query uses actual transformed coral vertex boxes plus the complete assembly-measured shader displacement margin; generic queries and AABB fallback keep historical sphere envelopes. Prove transformed vertex-plus-margin exclusion independently. Check full interaction chords and use a safe home return when an offset is blocked. Travel toward home uses the existing swim pace even if the FSM enters idle before arrival.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root startup read AQ105 (initially title-only), AQ18/AQ82 and current contracts. Current mesh query conservatively blocks every coral mesh including both soft anemone meshes, so existing reduced-clearance logic alone cannot produce real host entry. Existing host anchor also uses a fixed front-proud plane rather than visible crown geometry. Prior subagents remain usage-limited after bounded audits; Root continues integration/review without competing model edits.

Isolated current-candidate progress: actual runtime left foundation plus all mounted coral templates tested in both current layouts and perspective water bounds. Host-only fixture initially passed but complete assembly exposed neighbor sphere-envelope blockage; this was preserved as a failing investigation before correction. Generic species queries and fallback retain prior envelopes. Resident query tightens unrelated coral to measured vertex bounds plus the full assembly-proven shader displacement margin; no rock/budget bypass. A second phone case reached the host but stalled at a neighboring envelope during local interaction; full-chord checks and safe-home fallback fix it. Source-based60second tests now approach from open water, remain within0.8legacyunits after30seconds, bob visibly in position samples, and hold when stopped, with every swept segment checked by actual resident mesh query.24focused host/mesh tests pass; current full suite/typecheck/build running. Native art/service/reduced-motion acceptance pending; no AC checks or Done. Models/live Blender/original runtime source remain preserved while candidate is isolated.

Combined review correction: keep original reviewed identity-seeded school flanks and mostly-front depth mixture, because forced anthias-right plus front-only targets caused9.63percent left utilization; restoring only seeded sides still left16.76percent right. Retain incoming fore-reef spawn priority and transactional blocked-anchor preemption. Two new AABB/real-mesh crossing regressions fail on earlier snapshot dc8fbac and pass after preemption changes. All115focused checks pass with no weakened gates. Full incoming patch/pins/failures preserved under docs/asset-evidence/aq105; reviewed-source-pins supersedes initial candidate pins. Current full suite is running before adoption; native acceptance remains pending.

Root verified combined technical handoff: all872tests/75files with2workers, typecheck16scripts and productionbuild pass. Every original concurrent file still matched its captured hash; other destination files were unchanged/absent before copying the reviewed9-file source snapshot. No overwritten later work. Models/user screenshots preserved. Durable reviewed-source-pins and full logs under docs/asset-evidence/aq105/. Native current-source hosting/articulation/control review follows; all criteria remain unchecked and task In Progress.

Native cycle review correction at7842bd6: initial12rAF endpoints caught a hold phase; a500step settled laptop trace from29.48to37.80active seconds shows same-host idle/swim motion spans0.3253X/0.06722Y/0.1676Zlegacyunits, so the laptop stall suspicion is superseded. Phone after resize remains genuinely blocked: repeated resident point queries at the actual in-water host return blocked/coral-envelope. Source root cause reproduced by matching installed Three GLTFLoader.computeBounds: its base sphere uses the accessor-box diagonal, while the first fixture recomputed a tighter vertex sphere. Subtracting raw max-vertex radius therefore misclassified importer slack as shader displacement. Updated loader-faithful fixture fails3cases before correction. New isolated fix reads the actual maxMargin measured by assembly, with conservative historical sphere fallback when no measurement exists;54focused host/mesh/assembly checks pass, including sheared transforms, preserved full margin and oversized importer-sphere regression. Typecheck/full suite/build running after correcting an inferred-array fixture type. All task criteria remain unchecked pending final current-source native verification. Chrome3 disconnected; Chrome4 recovered; only owned review group/tab closed through native UI without deleting its saved group. Other user tabs preserved.

Loader-margin correction full run with2workers:872pass/3socket-report-freshness cases hit pre-existing30000ms limits; one10000ms cleanup hook also times out. Their unchanged isolated file passes all6tests with1worker in54.36s. Typecheck16scripts passes. Running the entire875test suite with1worker, retaining all existing deadlines/assertions, before productionbuild/adoption. Both raw timeout and isolated-pass logs are preserved; this is not a runtime performance-budget claim. Concurrent docs-only6a2e3ea is present/pushed and preserved; application source still7842bd6 until reviewed adoption.

Root loader-margin handoff verified: all875tests/75files pass with1worker; typecheck including16scripts and productionbuild pass. No deadlines/assertions changed; initial2worker timeouts and isolated6test pass retained. Four original destination files still match7842bd6 and all pinned coral assets unchanged before adoption; copied bytes match loader-margin-fix/source-pins. The corrected fixture mirrors actual GLTFLoader accessor-box spheres and includes left/right current layouts, shared-template laptop-to-phone rebuild, no lost authored cycle and unknown-margin conservative fallback. All criteria remain unchecked until native exact-correction verification. Concurrent6a2e3ea docs preserved.

Root final acceptance at4df19de:395runtime inputs match the proof checkout. Exact1440x900/402x874DPR1 native same-host idle/swim bobbing and finite eight-bone articulation pass. Visible60rAF controls: normal8of8move, Pause/reduced0of8 at both sizes; settled phone Pause PNG pair identical. Both Services/Settings8entries fit; actual clownfish service opens expected localhost destination. Captured final warning/error window0.54focused and875tests/75files pass, typecheck16scripts/build pass; prior unchanged socket timeouts retained. Evidence docs/asset-evidence/aq105/final-4df19de/README.md and reproducible summary. All4AC satisfied; no DoD items. No model/Blender/original-config edits or deployment. Broader art/physical scale/animated-body/runtime gates remain open in existing tasks.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-14 06:47
---
Root combined-source review found new distribution regressions in concurrent motion/spawn snapshot (motion SHA3bbd26d3, spawn7026d60d), which remains preserved in the original checkout. Applying it cleanly to verified hosting snapshot dc8fbac makes two existing tests fail: AQ104 mixed temporal left share9.63percent against20percent minimum, and existing eight-service whole-tank left share19.70percent against20percent.111otherfocused checks pass. No assertion threshold will be relaxed; current-source acceptance/adoption stays pending while Root isolates the side/fore-reef policy interaction. Raw log /tmp/aq105-combined-focused.log.
---

author: @root
created: 2026-11-14 07:08
---
Root exact7842bd6 native review keeps AQ105 open: laptop clownfish was position-stationary in two normal-mode12rAF samples while five other service transforms moved. Pause holds all8in both views; phone reduced-motion holds all8, normal phone8move; Services/Settings both8entries fit, captured warnings/errors0. Actual live VM diagnosis (read-only locals with temporary debugger pause, removed/resumed/disabled after capture) shows no focus/startle/reduced-motion cause, valid right host, and a blocked full interaction chord during approach. Later sampled offsets can be clear; an independently loaded right reef fixture passes. Therefore no root-cause claim or native hosting acceptance yet. Extend regression to full-cycle/actual combined scene and resolve intermittent stationarity; retain all ACs unchecked. Raw native and debugger records: docs/asset-evidence/aq105/native-7842bd6/.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented actual mounted-crown hosting with narrowly scoped soft access, safe approach/interaction chords and continuous local bobbing across idle/swim. Corrected importer-sphere slack without reducing measured shader margin or rigid checks. Root verified54focused checks,875tests, typecheck/build and exact two-size native hosting/articulation/links/Pause/reduced-motion evidence at4df19de. See docs/asset-evidence/aq105/final-4df19de/README.md. Broader art/body/budget tasks remain open.
<!-- SECTION:FINAL_SUMMARY:END -->
