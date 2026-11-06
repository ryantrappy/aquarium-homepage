# Aquarium Homepage — Root Handoff

<!-- AGENT_DOC_METADATA
Category: Governance / Checkpoint
Status: Active
Authority: Binding Checkpoint; Backlog controls acceptance
Backlog: AQ-58, AQ-60, AQ-53, AQ-64, AQ-42, AQ-70.2, AQ-70.14
Owner: @root
Updated: 2026-11-06
Upstream: AGENTS.md, agent_scratch.md, docs/requirements.md
Downstream: Current implementation and review work
-->

> [!NOTE]
> Root verified this checkpoint. The goal remains active and incomplete. Backlog is authoritative; a passing technical slice never accepts final fish or reef art.

## Reviewed milestone

Workspace: /Users/ryantrapp/Desktop/Code/aquarium-homepage. Current branch: milestone/modular-reef-and-agent-framework. Origin: https://github.com/ryantrappy/aquarium-homepage.git. Reviewed milestone pushed through d6767c2. The AQ-42 bounds handoff described below passed Root review; its containing commit follows that milestone. Shared rolling draft PR: https://github.com/ryantrappy/aquarium-homepage/pull/2 (base main). Root pushes every task-completion commit to this branch and updates the PR running task list/evidence. PR1 was merged externally through b994682; Root performs no merges or deployments. Work locally; the user handles deployment on trappserv.er. Never deploy.

Nine tasks closed in this goal run, each Root-reviewed and committed:
- AQ-37: 4c5a09d, bounded Mesh2Motion assessment. Historical clown export/load is compatibility evidence; tang binding remains unperformed, not a failed or successful transfer.
- AQ-63: 663f84c, native context URL lifetime and camera-depth projection. The 240ms position-lag allegation was false; positions already update each render.
- AQ-67: a38c4f7, immutable clearance cache with invalidation and exact phone habitat regressions. Existing backoff/dynamic anchor heights were verified, not redundantly rewritten.
- AQ-66: be0fc4c, all15 thumbnails WebP under75KB, source PNG archive, measured alpha fractions, bounded masks and usable native labels on texture failure.
- AQ-68: b994682,90s polling window with jitter tests, AMD sensor discovery, config405 and production origin evidence.
- AQ-65:5879062, verified single AO GPU curve, residual pectoral recovery and bounded safe pivot/vertical metric navigation.
- AQ-69:eea80d1/b078c5b, runtime dependency hygiene, preserved archive, unused helper cleanup and dedicated script validation.
- AQ-64: e77346c, delta reconciliation preserves surviving fish roots, motion, clip phase, extensions and resources; real Settings metadata/add/remove/reorder checks pass at both target viewports.
- AQ-53: 3635208, eight exact raw coral binaries/source heights agree with the single-exponent runtime adapter. Actual GPU surface/shadow compile and temporal motion/pause/reduced/rigid comparisons pass at both sizes. This does not accept final coral art or production culling.
- Screenshot corrections:9ca488d/5d6fc47. Generic screenshot API returned clipped JPEGs despite .png names; replacement PNG signatures and exact1440x900/402x874 IHDR dimensions are verified.

## Preserve concurrent visual work

Initial uncommitted user work remains excluded from Root commits:
- 13 additional model URL entries in src/rendering/scene/aquarium.ts.
- 13 corresponding MODEL_SWIM_AXIS_LENGTH entries in fish-scale.ts.
- scripts/build-splat-fish-glbs.mjs and src/rendering/assets/splat-fish/.

Do not blanket stage/reset/clean, overwrite generators or create competing visual models. Existing supplied fish/coral/rock candidates and provenance remain intact. AQ-59 modeling remains open: geometry/silhouette art acceptance cannot be inferred from new runtime shading.

## Current bounded lanes

Root owns Done, final review, shared scratch/handoff, scoped staging, browser evidence and the shared PR running list.
- The user-requested natural starting spread is Root-reviewed and pushed as d6767c2. First hash-only positions were visually rejected; stable horizontal strata, distinct outer-lane forward depths and safe varied headings now span39.68% of phone width and65.34% of laptop width. All5 move after resume; actual pause is stable. Survivor state is retained. Evidence: docs/asset-evidence/aq60/spawn-review.json. AQ-60 remains open for broader scale/source/envelope criteria.
- AQ-42's bounded culling handoff passed independent and Root review: original shared geometry spheres expand for exact shader skirt/soft displacement; no cumulative growth, dynamic amplitude and Float32 overflow handled. CPU reference dy now matches existing GLSL flex-squared response; actual GLSL and8GLBs are unchanged. Evidence: docs/asset-evidence/aq42/. The parent art/scene task remains open.
- @thumbnail_loading implemented18-tested pure AQ-70.2 look-dev helpers; production gating/scene clocks/hero poses/macros/stats bridge and baseline captures remain unimplemented. Integration waits for the external AQ-70.12 aquarium source handoff. Root solved native lossless capture: Page.captureScreenshot with captureBeyondViewport=false and NO clip returns full PNG; two consecutive phone captures are byte-identical.
- @thumbnail_loading now implements AQ-70.14 caption CSS/tests for the recorded user choice (always visible, smaller/subtle, brighter on hover/focus). Root owns native review. Preserve44px link targets and fallback styling. @link_interaction reviews helpers/bounds; @navigation_recovery supplied the reproducible8GLB culling audit.
- AQ-60 source correction387be1a is pushed: female anthias target2.5in below female FishBase maximum; all15 maximum rows linked. FishBase common-length means commonly caught/marketed, not typical aquarium-adult size; accessible summaries do not support the typical column. Those claims remain unverified.
- Preserve concurrent external AQ-70 planning, its15subtasks, linked notes, photorealism files, and current AQ-70.12 sand integration (aragonite-sand module/maps plus aquarium edits). Root has not accepted or staged that work. Backlog now has54open tasks including expanded scope.

AQ-58 functional handoff e6d1ecc is committed/pushed: clean-pose player replaces unvalidated multi-clip mixing, rejects unsupported palettes, atomically validates quaternion poses, preserves them on retirement and isolates failures per fish. New read-only scripts/verify-fish-clip-player.mjs exercises8tracked candidates by default; --include-unreviewed-splats adds9local candidates explicitly. Materials are bypassed; this is finite reset compatibility evidence, not art or continuous envelope acceptance. Exact source/reset/producer hashes are recorded in docs/asset-evidence/aq58/fish-player-review.json.

## Evidence and limits

Reviewed isolated source copy: /tmp/aquarium-root-milestone-20261105, node_modules symlink. The spawn milestone passed default44files/403tests, finaltypecheck and build. The latest AQ-42 frozen handoff passes default44files/408tests,14focused tests, typecheck including10tracked scripts and production build. Initial full run hit two old exact-rock fixture5s timeouts under concurrent work; the30fixture tests pass in1.01s and the same default408suite passes at rest. No deadlines/assertions changed. Pure look-dev helpers are separate, reviewed18tests but not yet in that frozen snapshot. Current external sand/model work is excluded from Root's reviewed source.

Native browser evidence at1440x900 and402x874 CSS pixels, scale1: moving bounds, native body/context navigation, pause/resume, fitted Settings and all15 decoded picker images. A blocked blue-tang image leaves scene ready and an accessible native Ombi label; Enter opens Ombi. Network/cache/viewport overrides were restored and Root tabs closed. Durable reports/screenshots: docs/asset-evidence/aq42/, aq53/, aq60/, aq63/, aq64/ and aq66/. No captured runtime errors; preexisting PCFSoftShadowMap removal warning remains.

Local production5195 check: HEAD/api/config200 with no body; PATCH/DELETE/OPTIONS405 with correct Allow; headerless production PUT403 before mutation. No config save, source mount, server or remote changes.

AQ-58 core/query/planner evidence remains in docs/asset-evidence/aq58/. Six supplied clip-only spheres were independently reproduced, but are conditional on clip-only playback. Main reef still uses conservative band/canopy AABBs and legacy world units. Actual animated envelopes, explicit metric calibration, full assembled collision, occlusion and final art remain unaccepted. No mesh metadata should be installed from fixed probe or clip-only evidence alone.

## Restart path

Read AGENTS.md, Backlog overview once per conversation, agent_scratch.md, this file, docs/README.md, the documentation framework and requirements before choosing work. Read detailed lifecycle guides before mutations; use Backlog CLI only for its files. Verify live Git state, current workers and listeners before changing anything.

At this checkpoint Backlog reports44Done and54open tasks (38To Do,16In Progress), including concurrent AQ-70 planning. Final scene/art, species animation, habitat interactions, background/optics, telemetry equipment/live sources and remaining integration tasks are still required. Do not mark the goal complete, delete blockers or infer acceptance from commits.

Owned local verification listener:5193dev may remain; verify ownership before reuse/stop. Root stopped5194/5195, both earlier5196processes and the final5196/5197verification servers after checking command/cwd. The disposable5196config remains at /tmp/aq64-root-browser-20261105-v1/reef-config.json for future checks; normal user config is untouched. Historical5191/5189 and the user's3000listener are not owned by this run. Restart an owned isolated server from the intended frozen build before new browser evidence.
