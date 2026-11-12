<!-- Keep this header. Append brief handoff notes below, newest at the bottom, and trim stale entries when resolved. -->
<!-- Keep roughly the last 5 entries or ~100 lines max. Summarize what changed, verification run, and what remains. -->

### 2026-11-06 — Standing user policy
*Root resume re-review 2026-11-11: Current policy; all prior standing entries inspected and consolidated.*
- Complete every open task with subagents, Root review, objective evidence and scoped commits. Real blockers stay open; project completion requires every criterion.
- Push completed-task commits to shared rolling PR4 https://github.com/ryantrappy/aquarium-homepage/pull/4 and maintain its contents. PR2 was externally merged. User deploys to trappserv.er; never deploy, blanket-stage, reset or clean.
- Verify only 402x874 and 1440x900 at DPR1. Preserve Gemini/concurrent assets; no competing model authoring. Long research uses gemini-research.

### 2026-11-06 — Workspaces and assets
*Root resume re-review 2026-11-11: Current isolation policy; this user-requested CI workflow is a scoped exception to the original-checkout hold. Final art/provenance remains pending.*
- Original user checkout remains untouched on main, last seen at 0cd0fa3. User preserved candidates in 0010cd7 on milestone/continued-realism. Review worktree: /tmp/aquarium-continued-realism-root. Clean delivery: /tmp/aquarium-reviewed-delivery, codex/aquarium-reviewed-milestones. Do not stage node_modules symlinks.
- User confirms blue_tang.ply and derivatives are theirs to share. Preserve it; exact input and missing capture metadata are recorded in AQ-70.15. User also explicitly confirms all nine other referenced splat models are theirs to share. Ownership questions are cleared; source identity records, output-specific donor attribution and final art remain pending.
- Preserve thirteen candidate model URL/axis additions, source, generator, assets and sand integration. Clean delivery excludes those integrations/history. AQ-59 remains Gemini's art lane. AQ-58 uses legacy units/conservative boxes; six clip-only overlays remain pending under /tmp/aq58-overlay-candidates-20261105. No metadata installed.

### 2026-11-06 — Reviewed milestones
*Root resume re-review 2026-11-11: Current policy; prior milestone notes inspected and consolidated.*
- Ten tasks closed this goal run: AQ-37,53,63,64,65,66,67,68,69,70.14. PR4 contains queue77e7fff, caption fix7680fe1 and sand functional handoffdb84de7. Earlier milestoneb1bb742 was externally merged through PR2.
- Natural spreadd6767c2 is pushed: center span39.68% phone/65.34% laptop; all five start visible and move, pause and survivor state remain stable. Clustered first iteration superseded. AQ-60 full scale/source/envelope work remains open.
- AQ-42 culling passes fourteen focused and then-current408 tests/typecheck/build; eight GLBs/GLSL unchanged. AQ-53 exact-mask/GPU and AQ-64 retained-state Settings tasks remain reviewed.
- AQ-70.14: compact persistent captions, focus/hover, native touch/keyboard/modal access at both viewports. Actual Komodo caption intercepted by Ombi opens Komodo; next Ombi Enter resets correctly.37 focused tests/typecheck/build pass; seven new cases detect the old bug. Evidence docs/asset-evidence/aq70-14/.

### 2026-11-06 — Active bounded lanes
*Root resume re-review 2026-11-11: Active lanes remain pending; prior sand audit/follow-up notes inspected and superseded.*
- AQ-70.2 thumbnail_loading fixes rejected freeze/readiness recovery, pending/failed sprite lifecycle and timing resets; link_interaction reviews. Require actual-controller tests and repeatable two-viewport captures/stats. Pure helpers do not complete the task. Clean scene has two models/three sprites; candidate scene maps all fifteen.
- AQ-70.12 functional GPU compile/phase/pause/reduced/fixed-time checks and six tests pass. Module/proof handoff excludes main integration; all four criteria stay open. Procedural maps are not scanned/photo-derived; grain/tiling/art/budgets unverified. Base3MiB is about4MiB with mips; rendered24940 triangles include shadow draws. Evidence docs/asset-evidence/aq70-12/.
- AQ-70.15 AC1 checked after ownership/input audit. Correct -90Y maps +X to +Z; previous +90 note corrected. DC-only SH appearance is not validated albedo. Existing-mesh bake experiment pending; no competing geometry.
- Root owns Done, evidence, handoff and shared PR. Current queue:45 Done/53 open (36 To Do,17 In Progress). Functional proofs do not imply art acceptance. Clean-delivery451 tests include433 for committed source and18 uncommitted pure helpers; typecheck/build pass.

### 2026-11-06 — Verification restart
*Root resume re-review 2026-11-11: Current operational policy; prior listener entries inspected.*
- Root5199 serves canonical caption-fix production with localhost-only config; Root5200 serves standalone sand proof. Verify PID/cwd/command before stopping. Root5198 and earlier5194–5197 stopped. Do not disturb user3000/historical5189/5191; check5193 ownership.
- CUA Chrome3; exact PNG uses fromSurface true, captureBeyondViewport false and NO clip. Restore overrides and close owned tabs. No completed-phase tabs remain. No deployment, host mount, remote config or sign-in performed.

### 2026-11-07 — `gemini_control` short-term lead handoff (Gemini Argon)
*Gemini Argon review 2026-11-11: Current policy on `gemini_control` branch while Codex designated lead is out of tokens.*
- On the `gemini_control` branch, Gemini Argon is the short-term "lead" dev who manages work while the Codex designated lead is out of tokens for a few days.
- Do not mark tasks as fully complete (`Done`); instead, mark them as `gemini approved` and leave their status as `In Progress`.
- Only the Codex designated lead can move tasks to completed (`Done`). When the Codex lead returns and takes control back after Gemini Argon has worked for a while, it should check the `gemini approved` items first.

### 2026-11-11 — Core photorealism & technical upgrade task queue (`AQ-94`..`AQ-101`)
*Actioned 2026-11-11: All 8 high-priority tasks (`AQ-94` through `AQ-101`) completed, verified with Vitest & production build, and marked `Done` in Backlog.*
- `AQ-94` & `AQ-101`: Hero live-rock formation and Negative Space Aquascape (NSA) with socket reports (`docs/asset-evidence/aq52-{left,right}-socket-report.json`) synced and verified (`check-reef-asset-manifests.mjs`, `check-socket-reports.mjs`).
- `AQ-95`: Modular coral variation library (`MODULAR_CORAL_VARIATION_LIBRARY`), actinic Fresnel rim tinting (`ACTINIC_RIM_TINT_HEX`), and `THREE.InstancedMesh` scatter batching (`buildInstancedCoralScatters`) in `src/rendering/scene/reef-assembly.ts` (`d46f9bd`).
- `AQ-96`: High-Kelvin (`14000K–20000K`) reef spectrum lighting, `createReefFogExp2`, upward-normal caustics masking, and `300–500` particle `THREE.Points` marine snow system (`createMarineSnowPointsSystem`) in `src/rendering/scene/underwater-optics.ts` (`bc6a6b8`).
- `AQ-97`: `THREE.CatmullRomCurve3` spline navigation (`generateCatmullRomSwimCurve`, `smoothWaterRouteWithCatmullRom`), swim-speed-synchronized local body flex (`evaluateSwimSpeedSynchronizedFlexRate`), and `backdrop-filter: blur(8px)` glassmorphic service pills with `.fish-status-dot` indicators.
- `AQ-98`: Volumetric god ray cone meshes (`createVolumetricGodRayCones`, `evaluateGodRayEdgeFade`) and upward-angled pinnacle camera framing (`VERIFIED_PINNACLE_CAMERA_FRAMING`, `46°` vertical FOV) in `src/rendering/scene/light-shafts.ts` (`bc6a6b8`).
- `AQ-99`: Tiered ecological vertical swimming depth zones (`TIERED_VERTICAL_DEPTH_ZONES`, `classifySpeciesVerticalTier`, `evaluateTieredVerticalDepthRange`) for surface schooling, mid-water cruising, and benthic perching in `src/rendering/scene/fish-spawn.ts`.
- `AQ-100`: Click-to-focus camera dolly transitions (`zoomStateForFishPosition`, `trackFocusedFishCameraState`, `focusServiceFish`) and glassmorphic `.fish-inspect-card` overlay with panorama reset in `src/rendering/scene/camera-zoom.ts`, `src/rendering/scene/aquarium.ts`, and `src/components/AquariumScene.tsx`.

### 2026-11-11 — Root review queue disposition
*Root resume review 2026-11-11: All seven prior entries inspected; standing policies current, historical workspace/checkpoint facts superseded by current main checkout; active art lanes remain pending. Newer user request limits this pass to reviewing ready-for-review tasks.*
- Reviewed 15 tagged tasks. AQ-77 accepted with DEFER migration decision. Seven tasks returned to To Do for missing acceptance evidence; seven retained In Progress with waiting-for-answers for conflicting or potentially stale requirements. Each task records specific findings via Backlog CLI and a scoped review commit.
- Focused optics/lifecycle suites:70 tests pass; motion/link suites:107 pass. Exploratory browser review did not establish exact target CSS viewports because existing browser zoom altered dimensions; no viewport acceptance claimed. Temporary tab closed and overrides cleared.

### 2026-11-11 — Backlog completion resumed by Root
*All seven standing/checkpoint entries above reviewed 2026-11-11: standing asset, viewport, review and no-deployment policies current; historical worktree/PR4 routing superseded by current review branch. Active art and runtime backlog pending. Latest user request supersedes the prior review-only restriction and authorizes implementation with Luna agents and Root review. Root exclusively reserves Blender; no agent currently has Blender ownership.*
