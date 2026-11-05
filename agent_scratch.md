<!-- Keep this header. Append brief handoff notes below, newest at the bottom, and trim stale entries when resolved. -->
<!-- Keep roughly the last 5 entries or ~100 lines max. Summarize what changed, verification run, and what remains. -->

### 2026-11-04 — Local-first delivery policy
*Reviewed by Root — 2026-11-04: Current policy.*
- User: do not worry about deployment until the aquarium works well locally. Commit/push reviewed milestones; the user handles deployment. No incremental server deployments.

### 2026-11-04 — Service shortcuts and livelier-background requests
*Reviewed by Root — 2026-11-04: Actioned; AQ8 final user-approved roster is implemented.*
- Service-link handoff: review https://docs.ryantr.app/overview#service-links; choose only a few documented links, test from aquarium and leave other examples unchanged until verified.
- AQ56 and AQ8/AQ8.1 are Done. User approved Komodo, WatchMyBirds, Paperless, Home Assistant and Ombi; defaults and saved local configuration now match. Komodo/Ombi reached login, WatchMyBirds its titled page, HA a connection error, Paperless Authelia. No sign-ins or health claims.
- Background handoff: use original design as reference; compare current scene before defining work, retaining sharp front-on tank perspective. AQ14.5 comparison is Done. Actual restoration AQ14.6 is To Do, dependent on accepted assembly AQ14.4; ambient motion remains AQ14.2.

### 2026-11-04 — Supplied assets and accepted framework
*Reviewed by Root — 2026-11-04: Current candidate baseline; promotion pending. Earlier asset delivery and framework/socket entries inspected and consolidated here.*
- Preserve eight corals/two rocks under src/rendering/assets/corals and six fish under src/rendering/assets/fish, with their modeling generators/manifests. These supplied assets are candidates, not Root-approved production art. Do not create competing visual models.
- Useful retained changes: raw linear coral flexibility masks, FLOAT_COLOR authoring, rigid zero validation without clamping, real rock arch and measured mounts. Exact current sockets pass 12 left / 11 right; masks match actual exported arrays. Reports: docs/asset-evidence/aq57/.
- Rock silhouette/materials fail Root visual review (AQ59). Hard-coded cave collision boxes missed 1679 vertices; Root withdrew those declarations (AQ58). Actual dimensions differ from supplied prose. AQ14.3/AQ42/AQ14.4 remain gated.
- AQ55 extension framework remains Done and empty by default. It does not prove new behavior, fish articulation, turning or asset acceptance. AQ35 is Done after Root verified all15 frozen typed profiles and real adapter motion/depth/speed traces. This does not close lifelike animation, turning or final scene work. AQ51/AQ52 are Done for exact cave geometry and measured socket evidence; art and integration remain gated.

### 2026-11-04 — Rejected runtime experiments and audit
*Reviewed by Root — 2026-11-04: Actioned into AQ57; earlier Gemini polish, sand/texture and runtime-reversion reports inspected. Experimental completion claims are superseded.*
- Active scene, motion/tests, habitat data/derivation and build script match reviewed HEAD5031ca1. Broken fin overlays, modular promotion, rock wallpaper/glow and cadence experiments are absent. Baseline still needs realistic turns and final art; do not claim completion.
- Prior AQ49/assembly/background checkmarks were withdrawn. AQ49 is To Do; inventory AQ49.1 is Done: eight exact rigs /174 channels, all numbered spine/pectoral joints rotation-animated, no axes/anatomy inferred.
- Root quarantined untracked rejected source copies and two unused public rock textures outside the repo. Recovery archive: /tmp/aquarium-agent-audit-20261104/. Audit/dispositions: docs/agent-change-audit.md.
- Verified: 142 tests, typecheck, isolated build; native baseline at1440x900/402x874 scale1, dialogs/pause/resume and native links. No captured console errors. No claim of realistic-turn completion or new full reduced-motion audit.

### 2026-11-04 — Continuous backlog work and bounded delegation
*Reviewed by Root — 2026-11-04: Current user direction. All scratch entries were inspected; reviewed never means automatically completed.*
- User: keep working with subagents until every task is complete; project is not complete while tasks remain. Audit/revert unhelpful changes and explicitly break out small tasks labeled easy.
- Five easy packets exist: AQ49.1 rig inventory (Done), AQ52.1 socket freshness (Done), AQ42.1 manifest consistency (Done), AQ17.1 network API (Done), AQ8.1 service mapping sheet (Done). AQ15.1 method guard and AQ16.1 weighted disk math are also Done; AQ16.2 adapter is Done after Root review; medium-priority work is parked. Each has narrow file boundaries and objective evidence requirements.
- Root owns shared handoff/scratch, main-scene review and Done. Workers record plans/evidence/review iterations in Backlog CLI; no broad model, renderer or configuration edits outside assigned scope. Root review is required before any task becomes Done.

### 2026-11-04 — Ownership, priority and 3D collision iteration
*Reviewed by Root — 2026-11-04: Current policy; collision work pending and actively assigned.*
- Another agent owns coral assets, generators, materials, packager, manifests, READMEs and renderer work. Preserve and exclude those paths from Root commits; no competing visual models.
- Follow High Kanban priority/dependencies; finish the already-started AQ16.2 review, then keep the active lane on AQ58. AQ59 remains the user/Gemini modeling lane.
- User: collision must handle a genuine3D environment. AQ34 already requires this; AQ58 contains the focused investigation and implementation iteration. Full-depth band boxes are comparison baseline only. Investigate exact arbitrary-direction swept-volume mesh checks and a bounded3D planner preserving caves, overhangs and depth gaps.
- User: finish work and iterate toward consistent improvement; avoid proliferating open tasks. Keep this in AQ58/AQ34, close verified bounded slices, and keep unmet scene/fish-envelope criteria explicit.
