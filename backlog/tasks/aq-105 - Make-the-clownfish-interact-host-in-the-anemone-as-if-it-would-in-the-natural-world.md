---
id: AQ-105
title: >-
  Make the clownfish interact/host in the anemone as if it would in the natural
  world
status: In Progress
assignee:
  - '@root'
created_date: '2026-11-14 05:06'
updated_date: '2026-11-14 07:08'
labels: []
dependencies: []
documentation:
  - docs/asset-evidence/aq105/README.md
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
- [ ] #1 The clownfish home target follows the actual mounted anemone tentacle crown in both current layouts, rather than a detached front-plane or clamped socket point; missing or invalid geometry remains unavailable.
- [ ] #2 A compatible clownfish can enter its soft anemone region and remain near the same host across idle/swim transitions, with bobbing and brief peeks/returns; an absent or blocked host never causes teleportation or fabricated contact.
- [ ] #3 Planning and every interaction movement retain rigid-rock, glass, unrelated-coral and query-budget checks; other fish retain the conservative anemone envelope and existing species behavior.
- [ ] #4 Root reviews focused and full tests, typecheck/build and exact1440x900/402x874 native evidence for visible hosting, articulated motion, working service links and pause/reduced-motion behavior before completion.
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
