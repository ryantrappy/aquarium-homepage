<!-- Keep this header. Append brief handoff notes below, newest at the bottom, and trim stale entries when resolved. -->
<!-- Keep roughly the last 5 entries or ~100 lines max. Summarize what changed, verification run, and what remains. -->

### 2026-11-04 — Local-first delivery policy
*2026-11-05 resume review — Root: Current policy; continue in Kanban order with bounded delegation, local-only delivery and Gemini research routing.*
*Reviewed by Root — 2026-11-04: Current policy.*
- User: do not worry about deployment until the aquarium works well locally. Commit/push reviewed milestones; the user handles deployment. No incremental server deployments.

### 2026-11-04 — Service shortcuts and livelier-background requests
*2026-11-05 resume review — Root: Actioned service roster; background implementation remains pending its existing gates.*
*Reviewed by Root — 2026-11-04: Actioned; AQ8 final user-approved roster is implemented.*
- Service-link handoff: review https://docs.ryantr.app/overview#service-links; choose only a few documented links, test from aquarium and leave other examples unchanged until verified.
- AQ56 and AQ8/AQ8.1 are Done. User approved Komodo, WatchMyBirds, Paperless, Home Assistant and Ombi; defaults and saved local configuration now match. Komodo/Ombi reached login, WatchMyBirds its titled page, HA a connection error, Paperless Authelia. No sign-ins or health claims.
- Background handoff: use original design as reference; compare current scene before defining work, retaining sharp front-on tank perspective. AQ14.5 comparison is Done. Actual restoration AQ14.6 is To Do, dependent on accepted assembly AQ14.4; ambient motion remains AQ14.2.

### 2026-11-04 — Supplied assets and accepted framework
*2026-11-05 resume review — Root: Pending remaining modeling, envelope and scene acceptance; isolated collision implementation continues without overwriting shared work.*
*Reviewed by Root — 2026-11-04: Current candidate baseline; promotion pending. Earlier asset delivery and framework/socket entries inspected and consolidated here.*
- Preserve eight corals/two rocks under src/rendering/assets/corals and six fish under src/rendering/assets/fish, with their modeling generators/manifests. These supplied assets are candidates, not Root-approved production art. Do not create competing visual models.
- Useful retained changes: raw linear coral flexibility masks, FLOAT_COLOR authoring, rigid zero validation without clamping, real rock arch and measured mounts. Exact current sockets pass 12 left / 11 right; masks match actual exported arrays. Reports: docs/asset-evidence/aq57/.
- Rock silhouette/materials fail Root visual review (AQ59). Hard-coded cave collision boxes missed 1679 vertices; Root withdrew those declarations (AQ58). Actual dimensions differ from supplied prose. AQ14.3/AQ42/AQ14.4 remain gated.
- AQ55 extension framework remains Done and empty by default. It does not prove new behavior, fish articulation, turning or asset acceptance. AQ35 is Done after Root verified all15 frozen typed profiles and real adapter motion/depth/speed traces. This does not close lifelike animation, turning or final scene work. AQ51/AQ52 are Done for exact cave geometry and measured socket evidence; art and integration remain gated.

### 2026-11-04 — Rejected runtime experiments and audit
*2026-11-05 resume review — Root: Superseded as a current-source claim; retained historical audit evidence. Subsequent shared runtime edits remain pending review.*
*Reviewed by Root — 2026-11-04: AQ57 audit actioned. Baseline equality below is historical; subsequent external runtime changes are pending review as recorded below.*
- Active scene, motion/tests, habitat data/derivation and build script match reviewed HEAD5031ca1. Broken fin overlays, modular promotion, rock wallpaper/glow and cadence experiments are absent. Baseline still needs realistic turns and final art; do not claim completion.
- Prior AQ49/assembly/background checkmarks were withdrawn. AQ49 is To Do; inventory AQ49.1 is Done: eight exact rigs /174 channels, all numbered spine/pectoral joints rotation-animated, no axes/anatomy inferred.
- Root quarantined untracked rejected source copies and two unused public rock textures outside the repo. Recovery archive: /tmp/aquarium-agent-audit-20261104/. Audit/dispositions: docs/agent-change-audit.md.
- Verified: 142 tests, typecheck, isolated build; native baseline at1440x900/402x874 scale1, dialogs/pause/resume and native links. No captured console errors. No claim of realistic-turn completion or new full reduced-motion audit.

### 2026-11-04 — Continuous backlog work and bounded delegation
*2026-11-05 resume review — Root: Current policy; continue in Kanban order with bounded delegation, local-only delivery and Gemini research routing.*
*Reviewed by Root — 2026-11-04: Current user direction. All scratch entries were inspected; reviewed never means automatically completed.*
- User: keep working with subagents until every task is complete; project is not complete while tasks remain. Audit/revert unhelpful changes and explicitly break out small tasks labeled easy.
- Five easy packets exist: AQ49.1 rig inventory (Done), AQ52.1 socket freshness (Done), AQ42.1 manifest consistency (Done), AQ17.1 network API (Done), AQ8.1 service mapping sheet (Done). AQ15.1 method guard and AQ16.1 weighted disk math are also Done; AQ16.2 adapter is Done after Root review; medium-priority work is parked. Each has narrow file boundaries and objective evidence requirements.
- Root owns shared handoff/scratch, main-scene review and Done. Workers record plans/evidence/review iterations in Backlog CLI; no broad model, renderer or configuration edits outside assigned scope. Root review is required before any task becomes Done.

### 2026-11-04 — Ownership, priority and 3D collision iteration
*2026-11-05 resume review — Root: Current policy; continue in Kanban order with bounded delegation, local-only delivery and Gemini research routing.*
*Reviewed by Root — 2026-11-04: Current policy; collision work pending and actively assigned.*
- Superseded ownership notice (2026-11-05): user confirmed the other coral/scene agent finished. Root now owns review and integration of supplied work; preserve candidates and avoid competing visual model creation. Scoped workers coordinate file ownership with Root.
- Follow High Kanban priority/dependencies; finish the already-started AQ16.2 review, then keep the active lane on AQ58. AQ59 remains the user/Gemini modeling lane.
- User: collision must handle a genuine3D environment. AQ34 already requires this; AQ58 contains the focused investigation and implementation iteration. Full-depth band boxes are comparison baseline only. Investigate exact arbitrary-direction swept-volume mesh checks and a bounded3D planner preserving caves, overhangs and depth gaps.
- User: finish work and iterate toward consistent improvement; avoid proliferating open tasks. Keep this in AQ58/AQ34, close verified bounded slices, and keep unmet scene/fish-envelope criteria explicit.

### 2026-11-04 — Completed checkpoint and isolated collision integration
*2026-11-05 resume review — Root: Pending remaining modeling, envelope and scene acceptance; isolated collision implementation continues without overwriting shared work.*
*Reviewed by Root — 2026-11-04: Actioned isolation; final scene/envelope acceptance pending.*
- Root committed/pushed895c87b (approved5services, profile evidence, read-only telemetry slices) and069c1dd (audit/evidence/handoff). AQ57 andAQ16.2 are Done. No deployment.
- AQ58 true3D query, deterministic bounded planner and shared budget adapter are implemented/tested. Exact pinned cave passes20/40/60mm probes;70mm direct path blocks. Actual front-depth lane remains open where bands block it. Probes are not animated fish envelopes.
- External workflow subsequently began changing aquarium.ts/motion.ts and adding fish-turning, coral-material and reef-assembly modules. Root subagents wrote none of these. Preserve these concurrent changes; they are unreviewed and excluded from Root commits. Earlier baseline equality is no longer a statement about current source.
- To finish collision/swimming integration without conflicts, @behavior_profiles owns ONLY /tmp/aquarium-aq58-motion-20261104 (codex/aq58-motion-review at069c1dd) for metric mesh-mode motion/tests. Main Backlog remains authoritative. Separate explicit metric fish radius/world units required; no legacy-unit inference or box fallback.
- Standalone collision-study proof bundles successfully in /tmp/aq58-collision-proof-build-20261104; new browser verification is unavailable because the Chrome connection times out. No viewport/occlusion acceptance claimed. Local proof Vite5189 is Root exec42641; main5173 listener unchanged by Root. Verify processes before use.

### 2026-11-04 — Planning-agent research routing
*2026-11-05 resume review — Root: Current policy; continue in Kanban order with bounded delegation, local-only delivery and Gemini research routing.*
*Reviewed by Root — 2026-11-04: Actioned; added to AGENTS.md.*
- Long-form research tasks should carry the `gemini-research` tag so the planning agent routes them to Gemini research.

### 2026-11-05 — Unified agent documentation framework and catalog
*2026-11-05 resume review — Root: Pending Root evidence review of the new framework/catalog; publication and metadata alone do not prove technical completion.*
*Reviewed by Root — 2026-11-05: Actioned; AQ-61 implemented.*
- Created single documentation entrypoint at `docs/README.md` and catalog index pointer `docs/INDEX.md`.
- Defined formal multi-agent documentation framework in `docs/framework/DOCUMENTATION_FRAMEWORK.md` (7 authority tiers, standardized `AGENT_DOC_METADATA` schema, lifecycle states, contribution protocols) and `docs/framework/TEMPLATE.md`.
- Categorized all 34 existing documents and evidence fixtures with zero file deletions. Standardized metadata headers across active specifications, runbooks, and audits; marked historical/superseded docs with warning alerts.
- Verified test suite (35 files, 270 tests pass); referenced from `AGENTS.md` and `AGENT_TASKS.md`.

### 2026-11-05 — Full codebase review and defect audit
*2026-11-05 resume review — Root: Pending verification/triage of all listed findings against current code and Backlog; do not apply recommendations blindly.*
*Reviewed by Root — 2026-11-05: Actioned; published to docs/code-review-findings.md.*
- Full codebase audit across runtime, simulation, picking, telemetry, packaging, and deployment completed.
- Identified 24 distinct bugs, performance issues, and architectural gaps not currently tracked in Backlog tasks AQ-1 through AQ-61. Detailed report output in docs/code-review-findings.md.

### 2026-11-05 — Resumed reviewed collision checkpoint
*Reviewed by Root — 2026-11-05: Actioned portable core/metric review and browser proof; main configuration and animated envelopes pending.*
- All3subagents resumed after reset. Clean portable snapshot passes254tests/29files,typecheck/build; isolatedmetricmotion63tests independently reviewed. Root is merging with sharedturning changes surgically, preserving user-agent work.
- Browser recovered; HTTPgzip proof-loading bug fixed with pinned encoded/decodedhashes. Native1440×900/402×874 scale1 verified60mm cave route and70mm over-rock detour, no phoneoverflow/capturedconsolewarnings/errors. Evidence and limits are in docs/asset-evidence/aq58/. No final fish/art/assembled-scene acceptance.
- New audit four-claim triage:2.1false,2.2conditional,3.4unsafe blue-tang phone spawn confirmed with workingbackoff,4.8yellow-tang anchorclearance failure confirmed (legacyunits). ExistingAQ60/AQ45 updated; remainingclaims pending. Research37/46/47 tagged gemini-research.
- AQ59nowcontains newly packagedrockhashesac2ed179…/ab7b7563…; @asset_validation independently pins/checks/renders them read-only forRootartreview. Never overwrite newart to match historicalAQ58fixture.

### 2026-11-05 — User confirms coral handoff finished
*Reviewed by Root — 2026-11-05: Actioned ownership handoff; remaining scene/art acceptance pending.*
- Reviewed collision/optional metric navigation milestone9b12a5a is committed and pushed. Main motion surgically retains external turning; actual main aquarium still uses legacy habitat and two candidate rigs plus three artwork previews.
- Current production snapshot passes298tests/typecheck/build before final spawn-state fix; final fix passes9focusedtests/typecheck/build. Native1440×900/402×874 review confirms blue-tang movement, pause/resume, fitted Settings, approved native links and no captured warning/errors. No final art or animated-envelope acceptance.
- AQ58 analyzer clip-only proof ready for Root review; bounded procedural-overlay proof iteration assigned @asset_validation. AQ12/AQ60 exact supplied-fish renders assigned @behavior_profiles. AQ59 UV/surface bake functional fix assigned @background_review; outputs restricted to/tmp until Root visual review; preserve geometry, sockets and original material fields.

### 2026-11-05 — Per-task Git commit instruction
*Reviewed by Root — 2026-11-05: Current policy.*
- User instruction: each task must be committed at the end of it so git history stays clean, granular, and traceable.
- Agents must stage only files relevant to the completed task (never blanket stage or commit unrelated concurrent work) and use descriptive commit messages referencing the Backlog task ID (e.g. `feat(AQ-12): ...`, `fix(AQ-58): ...`, `docs(AQ-61): ...`).
