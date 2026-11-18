# AQ-106 Root Fix & 1440×900 Visual Review (2026-11-17)

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-106
Owner: @root
Updated: 2026-11-17
Upstream: AGENTS.md, docs/requirements.md, backlog/tasks/aq-106 - Add-a-Moray-Eel.md
Downstream: src/rendering/scene/moray-residence.ts, src/rendering/scene/aquarium.ts, src/rendering/assets/fish/manifest.json
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Evidence
> - **Status**: Active
> - **Authority**: Evidentiary
> - **Backlog Reference**: `AQ-106`
> - **Summary**: Root cause diagnosis, fix, automated regression verification, and live `1440×900` DPR 1 visual review completing `AQ-106` (`snowflake-moray-eel` scene integration).

## Root Cause

Although `snowflake-moray-eel` was selectable in Settings and saved to `.data/reef-config.json` (`"Eel test"`), two runtime bugs prevented it from appearing in the scene:

1. **Coral-envelope collision at `x: -0.04`**: `SNOWFLAKE_MORAY_CAVE_CENTER_LOCAL` in [`src/rendering/scene/moray-residence.ts`](../../../src/rendering/scene/moray-residence.ts) was `{ x: -0.04, y: 0.02, z: 0.18 }`. In the assembled right island (`DEFAULT_RIGHT_ISLAND_MOUNTS`), `socket_brain_apron_03` (`coral-brain-diploria`) produces a conservative sphere box (`x: [0.504, 2.915]`) and tight shader-margin box (`x: [0.852, 2.677]`) that overlapped the inflated moray head capsule (`minX = 2.639`), causing `meshNavigation.queryCapsule` to return `{ status: 'blocked', reason: 'coral-envelope' }` and `resolveAvailableSnowflakeMorayResidence` to omit the eel in `reconcileFish()`. The prior `reef-mesh-navigation.test.ts` test only mounted `socket_soft_mat_02` instead of all 11 right-island corals.
2. **Pre-`loaded` lazy-load queue race**: In [`src/rendering/scene/aquarium.ts`](../../../src/rendering/scene/aquarium.ts), `pumpLazyLoads()` lacked a `!loaded` guard, so an asynchronous `/api/config` update arriving while `initialize()` was still awaiting assets could allow `requestIdleCallback` to drop queued non-Phase-0 species while `fish` was still `[]`. Additionally, `initialize()` enqueued the pre-await `configuredFishIds` snapshot rather than the live `services` list.

## Fix & Verification

- Moved `SNOWFLAKE_MORAY_CAVE_CENTER_LOCAL` to `{ x: 0.02, y: 0.02, z: 0.18 }` in `src/rendering/scene/moray-residence.ts` and updated `rightIslandLocalBodyCenterMeters` in [`src/rendering/assets/fish/manifest.json`](../../../src/rendering/assets/fish/manifest.json). At `x: 0.02`, rock clearance on the exposed head is `0.205 m` (`> 0.10 m`), all 11 mounted right-island coral boxes are `clear`, sand margin is `0.153 m` (`> 0.13 m`), and the default camera ray has `0` reef/sand intersections across all sampled frames of `crevice_idle`.
- Added the `!loaded` guard in `pumpLazyLoads()` and switched `initialize()` to `enqueueLazyFishLoads(services.map(service => service.fishId))` in `src/rendering/scene/aquarium.ts`.
- Updated [`src/rendering/scene/moray-residence.test.ts`](../../../src/rendering/scene/moray-residence.test.ts) and strengthened [`src/rendering/scene/reef-mesh-navigation.test.ts`](../../../src/rendering/scene/reef-mesh-navigation.test.ts) to mount all 11 `DEFAULT_RIGHT_ISLAND_MOUNTS` on `reef-full-model-right.glb` via `GLTFLoader` and `assembleCoralsOnRockSockets`.
- **Automated checks**:
  - `npx vitest run src/rendering/scene/moray-residence.test.ts src/rendering/scene/reef-mesh-navigation.test.ts src/rendering/scene/aquarium-lifecycle.test.ts src/rendering/scene/fish-scale.test.ts src/rendering/assets/budgets.test.ts`: 5 files, 98/98 tests passed.
  - `npm run typecheck && npm run build`: passed (`tsc --noEmit`, 17 scripts syntax-checked, Vite client/SSR/Nitro production build succeeded).
- **Live `1440×900` DPR 1 browser review (`http://127.0.0.1:3000/`)**:
  - [Full-scene overview (`1440×900`)](full-scene-overview-1440x900.png): all 9 configured services rendered (`aquarium-scene aquarium-three is-rendered`), `"Eel test"` visible in the bottom-right cave (`visibility: visible`, `data-occluded="false"`, `aria-hidden="false"`, `deconflicted: false`, `captionOpacity: 0.65`), `0` console errors/warnings after reload.
  - Live `crevice_idle` animation verified (`6` distinct `style.transform` positions over ~2.1 s).
  - [Focused moray view (`1440×900`)](moray-focused-1440x900.png): pausing and clicking the `"Eel test"` link focuses the moray head bone cleanly inside the bottom-right cave and shows the `"Inspecting Eel test"` (`Snowflake moray eel`) card with `"Open Eel test"` and `"Reset view"`.
  - Settings modal confirms `"Snowflake moray eel"` is disabled for duplicate selection (`"Already assigned to another service"`).
