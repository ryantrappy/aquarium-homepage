# Aquarium Homepage — Agent Handoff

**Checkpoint:** 2026-11-05, Root reviewed portable3D collision + optional metric motion checkpoint; final scene/envelope acceptance remains open. Backlog is authoritative.

- Workspace: /Users/ryantrapp/Desktop/Code/aquarium-homepage; main; origin https://github.com/ryantrappy/aquarium-homepage.git.
- Renderer baseline:5031ca1. Reviewed services/profile/telemetry895c87b, audit069c1dd and3D mesh collision/navigation9b12a5a are pushed. Substantial supplied candidate assets and runtime changes remain dirty. Inspect status before edits; never blanket stage/reset/clean.
- Homelab: trappserv.er. Work locally; commit/push reviewed milestones, user handles deployment.

## Startup and ownership

Read all AGENTS.md, Backlog overview once per conversation, agent_scratch.md, this handoff, the central documentation hub `docs/README.md` (standards in `docs/framework/DOCUMENTATION_FRAMEWORK.md`), and `docs/requirements.md`. Read task guides before lifecycle changes; use CLI, never task Markdown edits. Root owns shared scratch/handoff and Done. Commit at the end of each task: every task must be committed upon completion, staging only scoped files with a message referencing the task ID (e.g. `docs(AQ-61): ...`), preserving clean Git history. Only responsive targets:1440×900 and402×874 CSS pixels at scale1.

The user confirmed on2026-11-05 that the other coral/scene agent finished. Root owns review and integration of the supplied work. Preserve candidate assets; scoped worker ownership prevents concurrent edits. No competing visual model creation. Gemini modeling issues remain labeled modeling.

## Reviewed facts

- At AQ57 audit, active scene/build script matched5031ca1. Subsequent external workflow now edits aquarium.ts/motion.ts and adds fish-turning/coral-material/reef-assembly modules. Root subagents made none of those changes; preserve and exclude from Root commits pending review. Historical baseline equality is no longer a current-source claim. Main model URLs still use candidate reef/clown/tang at last inspection. No final art/turning acceptance.
- AQ55 optional extension scaffold is Done and empty by default. AQ40 pipeline and AQ50 accessible-focus gates remain Done, without approving later art.
- AQ35 is Done:15 typed frozen profiles, actual adapter motion/depth/speed traces and independent deterministic instances verified. No lifelike turning/art/scene claim.
- AQ51/AQ52 are Done for real exported cave geometry and measured sockets (12left/11right). AQ59 rock silhouette/material art remains unaccepted; supplied assets remain candidates.
- AQ57 audit is Done: docs/agent-change-audit.md, durable evidence docs/asset-evidence/aq57/. Recovery archive/inventory/quarantine: /tmp/aquarium-agent-audit-20261104/. Unsafe collision declarations removed, candidate-ready claims corrected. No rejected source/textures remain served.

## Active priority lane

1. AQ16.2 adapter is Done after Root review (37 adapter+math tests); lower-priority telemetry work is parked.
2. High AQ58: true3D collision investigation and implementation within the existing task. @asset_validation owns exact arbitrary-direction mesh swept-volume query; @behavior_profiles proposes bounded3D planner integration. Root reviewed exact mesh/BVH query, bounded3D planner, shared query adapter and optional metric swimming integration. The clean checkpoint passes254tests/typecheck/build; new70mm actual-fixture detour regression passes too. Full-depth band boxes are comparison baseline only, not selected final architecture. Legacy sand-filled columns erase voids; preserve depth gaps, caves and overhangs. Fixed probe radii are not animated fish envelope certificates.
3. Collision/swimming integration is isolated in /tmp/aquarium-aq58-motion-20261104, branchcodex/aq58-motion-review at069c1dd, to avoid the external runtime edits. Both isolated motion and independent review are complete (64focusedtests). A surgical merged artifact is being reviewed against the other workflow’s shared turning changes; preserve those changes. Explicit meter-world mode and a separate per-fish metric radius are required, with shared plan budgets and no box fallback. Main Backlog remains authoritative; no duplicate task edits in worktree.
4. AQ59 modeling stays with Gemini/user. AQ14.3 waits58/59; then AQ42/AQ53, AQ14.4 assembly and AQ34 final scene. Do not bypass art/clearance/integration gates. AQ49 turning remains To Do; exact rig inventory is available.

User asks finish and iterate, avoiding many open tasks. Keep a small active lane and close verified slices instead of creating another collision spike. All Backlog tasks remain required before project completion.

## Completed bounded delegation

AQ49.1 exact rig inventory (8GLBs/174channels), AQ52.1 socket freshness, AQ42.1 manifest hash consistency, AQ8.1 source mapping sheet and AQ17.1 network API are all easy-labeled, Root-reviewed Done. AQ15.1 CPU method guard and AQ16.1 exact weighted disk math are also Done. Validators never imply art acceptance. AQ37 Mesh2Motion remains partial: tang file import blocked by Chrome file-URL permission; no successful transfer claimed. Prioritize High work rather than repeating that blocker.

## Services and runtime

AQ8 user-approved starter roster is implemented in defaults and actual local saved configuration, in order:
Komodo→yellow-tang https://komodo.ryantr.app; WatchMyBirds→banggai-cardinalfish https://watchmybirds.ryantr.app; Paperless→royal-gramma https://paperless.ryantr.app; Home Assistant→ocellaris-clownfish https://ha.ryantr.app; Ombi→blue-tang https://ombi.ryantr.app. All are confirmed mappings, not examples. Native destination observations: Komodo/Ombi login, Birds titled page, Paperless Authelia, HA connection error. No sign-ins or health claim. Source/evidence: docs/service-mapping-review.md. Config revision at verification:6f3e70b0f92ae8bb18254169b139c94342b9ffbb0b0edd247cfb2bc88ee5fc73. Preserve latest API revision; never restore an old config snapshot or expose secrets.

Network and CPU read-only routes return truthful unavailable when unconfigured; GET/HEAD and unsupported405 methods independently production-tested. Network config uses trusted environment sourceID/label/statsRoot, never a client path. Telemetry parents remain incomplete until real equipment UI/config integration. No fabricated values or service health monitoring.

Main production listener most recently PID23463 at127.0.0.1:5173 (exec51127); verify before use. Root isolated build copy:/tmp/aquarium-aq57-review-20261104, node_modules symlink. Avoid overwriting running output. No5191 listener should remain. No remote/auth/proxy/DNS/mount changes.

## Verification and limits

Audit baseline:142tests/23files,typecheck,isolatedbuild; native1440×900/402×874 atscale1 verified baseline motion,pause/dialogs,native links, no captured console errors. Latest clean portable collision+motion checkpoint:254tests/29files,typecheck,productionbuild and scoped diffcheck pass without WIP coral assets. This does not approve all additional shared-worktree changes. Earlier post-Btrfs adapter+math37tests passed. AQ35 actual adapter traces and comparison collision regressions passed. Rerun appropriate checks for the next reviewed milestone, record actual counts. Existing large-chunk build warning remains.

AQ58 comparison evidence:docs/asset-evidence/aq58/, left SHA2f90be064f3f5b15291dffd25a3ea00ec3ad3f212e8e232814daba8f456cfd6c, right68337f7733b782f374efa0ea051138344a17fe6139be14ab4efa95f34eb2d4d6. Sevenleft/oneright band boxes, .02/.04 fixed probes clear; .06 capsule clear but sweptcube blocked. No metadata installed. Those results do not establish arbitrary3D routing, fish-envelope or assembled scene acceptance. New architecture must get measured work/memory budgets rather than inheriting an arbitrary32box limit.

Keep pause/settings, native links, keyboard/reduced-motion, alpha-aware picking and honest unavailable/stale semantics. Offline habitat anchors must come from actual geometry; never infer fish refuge from coral socket names. Review all claims before committing.

Root standalone proof:src/rendering/proof/collision-study.{html,ts}; pinned historical exact geometry, neutral material and fixed technical probes. Fixture compressed SHA77fd00de0c9cceacd0d1219b101b12793619e53eef5b16a8430acfee23991612; decoded payloadSHA8c1d4c9c89f2bab90f6fda4f9d45c3d2c65e4f29ded3c70a552a4843c3c41a2b. Loader handles HTTP-decoded gzip honestly. Native Chrome2 proof now verified1440×900/402×874 scale1, no phoneoverflow or captured warning/errors.60mm passes cave;70mm direct blocked and3D detour succeeds (3389queries,58613visits,53850tritests;67.6ms single laptop observation, notFPS). Evidence:docs/asset-evidence/aq58/{detour-laptop,cave-phone}.png. Temporary viewport reset and proof tab closed. Root restarted proof Vite5189 exec96348 after verifying prior handles/listeners gone; no5173main listener observed at resume. Main output has not been rebuilt or deployed by Root.

New scratch audit docs/code-review-findings.md is candidate evidence. Root verified four claims:2.1 is false for currentsource (transforms run everyrender),2.2 nativecontext-menu failure conditional/unreproduced,3.4 blue-tang phone unsafe spawn confirmed with working.7s retrybackoff,4.8 compatible yellow-tang grazing clearance failure confirmed in legacy scene units. Routed confirmed issues to existingAQ60/AQ45; no extra task proliferation. Remaining claims pending. Long-form research37/46/47 now tagged gemini-research. AQ61 documentation framework/catalog exists locally but broader metadata/status claims remain subject to Root evidence review.

## Latest Root integration review,2026-11-05

Main motion has the surgical optional metric merge plus external turning preserved; main aquarium has not enabled metric collision or canonical fish/rock assets. Snapshot/tmp/aquarium-main-review-20261105 passes298tests/typecheck/build; final spawn fallback/loop correction subsequently passes9focusedtests/typecheck/build. Production review listener127.0.0.1:5191 (exec71213) exists; verify before reuse. Native1440×900/402×874,scale1: blue tang moves; pause stable/resume moves; native5links correct; phone Settings fits; no captured warning/errors. Screenshots/tmp/aquarium-review-evidence/. Override reset and own browser tab closed. These observations do not accept final scene/art/envelopes.

@asset_validation owns offline clip/overlay envelope analyzer+tests+CLI. Clip-only sphere proof for exact gramma is41.302mm at69.85mm adult length, but current procedural overlays remain excluded until next review. @behavior_profiles owns read-only supplied-fish render packet. @background_review owns functional rock UV/surface bake correction in generator only; temporary outputs/tmp/aq59-uv-fix-20261105, no package promotion before Root review. Approved generator snapshot3508cc39 preserved; interrupted6e94 source saved before narrow reconstruction. Exact vertex positions/triangles/sockets and original noise/color parameters must remain unchanged.
