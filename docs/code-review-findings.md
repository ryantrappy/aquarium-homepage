# Code Review Findings: Defects, Architectural Gaps, and Optimization Opportunities

<!-- AGENT_DOC_METADATA
Category: Evidence / Code Audit
Status: Candidate / Partially Verified
Authority: Evidentiary Audit Record
Backlog: AQ-61
Owner: @documentation
Updated: 2026-11-05
Upstream: AGENTS.md, docs/requirements.md
Downstream: Backlog task queue
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Full Codebase Audit & Defect Inventory
> - **Status**: Active / Evidentiary
> - **Authority**: Evidentiary Record
> - **Summary**: Comprehensive codebase audit identifying runtime interaction bugs, picking desync, mobile memory allocations, narrow-viewport navigation locks, and telemetry gaps.

**Date:** 2026-11-05  
**Scope:** Full codebase audit (`src/`, `scripts/`, `deploy/`, `docs/`, `package.json`)  
**Context:** Cross-referenced against Backlog tasks AQ-1 through AQ-61 to document only items **not already tracked** in the active task log.

---

## 1. Executive Summary

### Root verification — 2026-11-05

The original findings below are candidate claims, not 24 independently proven, previously untracked defects. Check current code and Backlog before implementing a recommendation. The first bounded verification found:

| Claim | Verified disposition | Existing work |
| --- | --- | --- |
| 2.1 — link transforms update at 4 FPS | Incorrect for current source: `positionLabels()` runs every render and writes transforms; the 0.24-second gate controls visibility checks. | AQ34 picking/visibility review |
| 2.2 — context-menu destination race | The transient `href` swap exists; the native menu failure remains browser-conditional and unreproduced. | AQ34 already tracks native context-menu URL capture QA |
| 3.4 — phone navigation lock | Confirmed unsafe blue-tang spawn: at 402×874, `x=.3` exceeds the clearance-safe ±.280884 range. Existing 0.7-second retry backoff works: 15 planning batches over ten seconds, rather than every frame. | AQ60 AC4; AQ34/AQ58 integration |
| 4.8 — grazing anchor clearance | Confirmed for compatible yellow tang: `.57` clearance exceeds `.53` offset and all current grazing targets fail. Blue tang is not grazing-compatible. These values are legacy scene units, not meters. | AQ45 AC4/5; AQ34 AC3/6 |

An asserted temporary reproduction is `/tmp/aq58-audit-claims.test.ts`, with `/tmp/aq58-audit-vitest.config.ts`. Other claims remain pending verification; this table does not approve unrelated fixes, deployment, or deletion recommendations.

This comprehensive code review evaluated the Aquarium Homepage codebase across runtime rendering, mathematical simulation, user interaction, server-side telemetry APIs, build packaging, and deployment configuration.

While unit tests (`34/34` test suites, `266` tests) and TypeScript typechecks currently pass, this audit revealed several critical runtime defects, performance bottlenecks, and architectural gaps that affect usability, mobile performance, and deployment reliability:

1. **User Interaction & Picking Desync:** Click picking on swimming fish frequently fails because DOM anchor positioning is throttled to ~4 FPS (`240ms` intervals) while 3D fish move at 60 FPS. Clicks outside the visual mesh are cancelled by raycast validation.
2. **Context Menu Race Condition:** Right-clicking on an occluding fish temporarily swaps `href` to the visible fish but reverts it after `0ms`, causing browser context menu actions ("Copy Link Address") to target the wrong service.
3. **Severe Asset Bloat on Mobile:** Four fish species thumbnails are served as uncompressed `2048x2048` PNGs totaling over 6.4 MB (compared to ~30–50 KB WebP files for the others), triggering multi-megabyte canvas allocations during alpha mask extraction.
4. **Per-Substep Allocation in Motion Loop:** `isWaterSegmentSafe` allocates fresh arrays and bounding boxes up to 600 times per second per fish, creating heavy garbage collection pressure on mobile browsers.
5. **Narrow Screen Navigation Lock:** On 402px mobile viewports, larger fish (e.g. blue tang with clearance radius 0.85m) exceed available tank lanes between rock obstacles, causing 12 failed A* pathfinding attempts every frame and freezing the fish.
6. **Telemetry & Deployment Configuration Gaps:** `deploy/compose.yaml` lacks all environment variables and mounts for network traffic monitoring; network traffic polling automatically breaks if clients poll slower than 15 seconds; and CPU temperature monitoring is hardcoded exclusively to Intel `coretemp`.

---

## 2. High-Severity Functional Bugs

### 2.1 Interaction Desync: 4 FPS DOM Position Throttling vs 60 FPS WebGL Motion
- **Location:** [`src/rendering/scene/aquarium.ts:180`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/aquarium.ts#L180), [`src/components/AquariumScene.tsx:26-53`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/components/AquariumScene.tsx#L26-L53), [`src/styles/aquarium.css:197-201`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/styles/aquarium.css#L197-L201)
- **Root Cause:**
  In `aquarium.ts`, `positionLabels` updates the bounding box and `translate3d` transform of the DOM anchor `.aquarium-fish-link` only when `labelClock > 0.24` (~4.1 times per second). In `aquarium.css`, the Three.js canvas has `pointer-events: none;`, so all pointer clicks hit the DOM anchor layer. In `AquariumScene.tsx`, clicking an anchor executes:
  ```ts
  const picked = controller.current?.serviceAt(event.clientX, event.clientY)
  const visible = services.find(candidate => candidate.id === picked)
  if (!visible) { event.preventDefault(); return undefined }
  ```
  `serviceAt` performs a Three.js raycast into 3D space at `(clientX, clientY)`.
- **Failure Scenario:**
  Because the 3D fish swims at 60 FPS while the DOM anchor lags up to 240ms behind, clicking the visual fish often clicks empty space (misses the anchor entirely), while clicking the lagging anchor sends raycast coordinates that miss the fish's current 3D mesh position. The click is rejected via `event.preventDefault()`, leaving users unable to activate service links while fish are swimming briskly or startled.
- **Recommended Fix:**
  Sync the anchor transform on every frame (or use GPU CSS transforms synced in `render()`), or make the WebGL canvas capture pointer events directly and trigger activation based on exact raycast hits rather than relying on delayed DOM overlays.

---

### 2.2 Overlapping Fish Context Menu Href Restore Race Condition
- **Location:** [`src/components/AquariumScene.tsx:40-48`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/components/AquariumScene.tsx#L40-L48)
- **Root Cause:**
  When fish link boxes overlap and the user clicks on fish A whose anchor belongs to fish B, `AquariumScene.tsx` temporarily swaps the target URL:
  ```ts
  clickedAnchor.href = selected.url
  const restore = setTimeout(() => { clickedAnchor.href = service.url; acknowledgments.current.delete(restore) }, 0)
  acknowledgments.current.add(restore)
  ```
- **Failure Scenario:**
  On a `contextmenu` (right-click) event, `setTimeout(..., 0)` fires immediately on the next event loop tick, resetting `clickedAnchor.href` back to `service.url`. When the user right-clicks to copy the link or open in a new window/tab, the context menu clipboard action reads `clickedAnchor.href` after the 0ms timer has already reverted it. As a result, "Copy Link Address" copies the hidden fish's URL instead of the visibly selected fish.
- **Recommended Fix:**
  Do not mutate `anchor.href` on the fly with a 0ms restore timeout. Instead, set the native anchor's URL to match the currently occluding fish whenever picking detects a change, or dispatch navigation explicitly on click without transient DOM attribute mutation.

---

### 2.3 Unbounded Perspective Projection Behind Camera in `positionLabels`
- **Location:** [`src/rendering/scene/aquarium.ts:153-161`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/aquarium.ts#L153-L161)
- **Root Cause:**
  `positionLabels` projects the 3D fish position into NDC screen coordinates:
  ```ts
  projected.copy(item.root.position).project(camera)
  const x = (projected.x + 1) * width / 2, y = (1 - projected.y) * height / 2
  const pixels = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - item.root.position.z))
  const linkWidth = Math.max(44, pixels * bodyLength * 1.25), linkHeight = Math.max(44, pixels * bodyLength * .88)
  anchor.style.transform = `translate3d(${x - linkWidth / 2}px,${y - linkHeight / 2}px,0)`
  ```
- **Failure Scenario:**
  `updateVisibility` checks `sample.z > 1` (objects behind the camera far/near planes), but `positionLabels` does NOT check if `projected.z > 1` or if `camera.position.z <= item.root.position.z`. When an object crosses behind the camera plane, standard 4x4 perspective division causes `projected.x` and `projected.y` to invert signs (a point behind and to the left projects to the top-right), and `(camera.position.z - item.root.position.z)` becomes negative. The DOM anchor is violently thrown across the screen to inverted coordinates with massive or negative scale.
- **Recommended Fix:**
  Add an explicit guard `if (projected.z > 1.0 || item.root.position.z >= camera.position.z) { anchor.style.visibility = 'hidden'; continue; }` at the start of the projection calculation in `positionLabels`.

---

### 2.4 Destructive Inhabitant Rebuild & State Reset on Any Service Edit
- **Location:** [`src/rendering/scene/aquarium.ts:221`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/aquarium.ts#L221)
- **Root Cause:**
  ```ts
  update(next, stopped) {
    const changed = JSON.stringify(next) !== JSON.stringify(services)
    services = next
    paused = stopped
    if (changed) rebuildFish()
    syncLoop()
  }
  ```
  `rebuildFish()` completely disposes of all fish groups, animation mixers, and turning rigs, and re-instantiates them from scratch using `createSwimmingFish` at initial spawn positions.
- **Failure Scenario:**
  If the user edits a service name, updates a URL, or adds a new service in settings, all swimming fish in the tank instantly despawn and respawn at their starting coordinates with zero velocity and reset animation clocks.
- **Recommended Fix:**
  Perform a keyed diff of `services` by `id`: update URLs and titles on existing fish in place; add newly created services; remove only deleted services; and preserve the positions, velocities, routes, and mixer clocks of unchanged fish.

---

### 2.5 Double Ambient Occlusion Darkening in Coral Shaders vs CPU Specification
- **Location:** [`src/rendering/scene/coral-material.ts:64-67`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/coral-material.ts#L64-L67), [`189-199`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/coral-material.ts#L189-L199)
- **Root Cause:**
  In `coral-material.ts`, the CPU reference function defines AO as:
  ```ts
  export function evaluateCoralContactAoFactor(rawA: number): number {
    return 0.28 + 0.72 * clamp01(rawA)
  }
  ```
  However, in the GLSL fragment shader injection:
  1. In `#include <color_fragment>`, the base diffuse color is pre-multiplied by AO:
     ```glsl
     float coralContactAo = mix(0.28, 1.0, clamp(vCoralMask.a, 0.0, 1.0));
     diffuseColor.rgb *= mix(0.62, 1.0, clamp(vCoralMask.a, 0.0, 1.0));
     ```
  2. In `#include <aomap_fragment>`, the lighting terms are multiplied by `coralContactAo` AGAIN:
     ```glsl
     reflectedLight.indirectDiffuse *= coralContactAo;
     reflectedLight.indirectSpecular *= coralContactAo;
     reflectedLight.directDiffuse *= mix(0.75, 1.0, coralContactAo);
     ```
- **Failure Scenario:**
  Coral contact zones and crevices are darkened twice: once in `diffuseColor` and again in the light reflectance terms. Deep polyp crevices become unnaturally black, and the GPU visual output diverges from the verified mathematical contract in `evaluateCoralContactAoFactor`.
- **Recommended Fix:**
  Remove the `diffuseColor.rgb *= mix(0.62, 1.0, ...)` multiplier from `<color_fragment>` and let `<aomap_fragment>` solely govern ambient occlusion attenuation.

---

### 2.6 Pectoral Fin Overlay Early Exit & Animation Cutoff
- **Location:** [`src/rendering/scene/fish-turning.ts:393-413`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/fish-turning.ts#L393-L413)
- **Root Cause:**
  In `applyFishTurningRigOverlay`:
  ```ts
  const angles = evaluateSpineTurnAngles(rig.spineJoints.length, kinematics, rig.archetype)
  if (angles.spineBendRad.every(angle => Math.abs(angle) <= 1e-5)) return

  // ... spine rotations ...

  if (rig.pectoralLeft && Math.abs(angles.pectoralLeftFlareRad) > 1e-5) { ... }
  ```
- **Failure Scenario:**
  `evaluateSpineTurnAngles` computes both `spineBendRad` and pectoral angles (`pectoralLeftFlareRad`, `pectoralRightFlareRad`). Because spine joints have different damping and curvature delay than the pectoral brake release, a fish straightening out from a turn can have `spineBendRad` reach zero while the pectoral fins are still completing their flare or recovery stroke. The early return cuts off the pectoral update, causing the fins to freeze or jump back to the raw mixer animation without smooth recovery.
- **Recommended Fix:**
  Check both spine and pectoral thresholds before returning:
  ```ts
  const hasSpineBend = angles.spineBendRad.some(angle => Math.abs(angle) > 1e-5)
  const hasPectoralFlare = Math.abs(angles.pectoralLeftFlareRad) > 1e-5 || Math.abs(angles.pectoralRightFlareRad) > 1e-5
  if (!hasSpineBend && !hasPectoralFlare) return
  ```

---

### 2.7 Abrupt Single-Frame Angular Pop on Chord Motion Fallback
- **Location:** [`src/rendering/scene/motion.ts:149-153`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/motion.ts#L149-L153)
- **Root Cause:**
  ```ts
  if (isWaterSegmentSafe(routeInput(fish, habitat, headingNext))) fish.position = headingNext
  else if (isWaterSegmentSafe(routeInput(fish, habitat, chordNext))) {
    fish.yaw = heading
    fish.pitch = desiredPitch
    fish.position = chordNext
  } else { fish.route = []; fish.speed = 0; fish.targetWait = .2 }
  ```
- **Failure Scenario:**
  When `headingNext` (the smooth curvilinear step) touches a clearance boundary or corner, the motion engine falls back to `chordNext`. In doing so, it immediately snaps `fish.yaw = heading` and `fish.pitch = desiredPitch` in a single 16ms frame, bypassing `stepFishTurnKinematics` and turn rate limits. The fish visibly jerks and pops into the chord direction.
- **Recommended Fix:**
  Maintain smooth yaw rate integration even when falling back to chord translation, or clamp the angular change to `maxTurn` instead of setting `fish.yaw = heading` instantly.

---

## 3. Performance & Memory Bottlenecks

### 3.1 Uncompressed Multi-Megabyte PNG Assets Used as Thumbnails & Sprite Decodes
- **Location:** [`src/lib/fish.ts:50, 57, 64, 71`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/lib/fish.ts#L50), [`public/fish/`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/public/fish/)
- **Details:**
  While 11 of the 15 fish use WebP files (~28–65 KB), four species use raw high-resolution PNG files:
  - `blue-green-chromis-v2.png`: **1.81 MB**
  - `firefish-v2.png`: **1.18 MB**
  - `mandarin-dragonet-v2.png`: **1.77 MB**
  - `yellow-watchman-goby-v2.png`: **1.68 MB**
  Total uncompressed asset payload: **6.44 MB**.
- **Impact:**
  1. In `src/rendering/scene/alpha-picking.ts` (`readArtworkAlpha`), each fallback sprite creates a full-resolution `<canvas>` and calls `getImageData`. For a 2048x2048 image, `getImageData` allocates 16.7 MB of RGBA memory, and `new Uint8Array(width * height)` retains 4.2 MB permanently per sprite.
  2. Mobile data consumption and loading time on cell connections increase by over 10x compared to the WebP assets.
- **Recommended Fix:**
  Convert the four PNGs to optimized WebP images under 60 KB each, matching the rest of the catalog, and resize the source dimensions to max 512px.

---

### 3.2 High-Frequency Per-Substep Heap Allocations in Navigation (`isWaterSegmentSafe`)
- **Location:** [`src/simulation/habitat-navigation.ts:318-327`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/simulation/habitat-navigation.ts#L318-L327), [`src/rendering/scene/motion.ts:147-152`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/motion.ts#L147-L152)
- **Root Cause:**
  `isWaterSegmentSafe` is called up to two times per substep for every active fish:
  ```ts
  export function isWaterSegmentSafe(input: WaterRouteInput): boolean {
    // ...
    const expanded = input.obstacles.map(obstacle => inflate(obstacle.bounds, input.fishClearanceRadius))
    return safePoint(...) && safePoint(...) && segmentClear(input.start, input.target, expanded)
  }
  ```
  `input.obstacles.map(...)` and `inflate(...)` allocate a new Array and multiple new `{ min: { x, y, z }, max: { x, y, z } }` objects on every call.
- **Impact:**
  At 60 FPS with 5 fish testing 2 vectors, this executes up to **600 times per second**, generating **over 10,000 temporary objects per second** on the JavaScript heap. This causes observable garbage collection hitches and frame drops on lower-powered devices.
- **Recommended Fix:**
  Pre-expand and cache `expandedObstacles` per fish clearance radius whenever obstacles or species clearance change, rather than re-inflating boxes inside the per-frame motion step.

---

### 3.3 Heavy Unused 3D Engine Dependencies in Production Package
- **Location:** [`package.json:17-22`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/package.json#L17-L22)
- **Details:**
  ```json
  "dependencies": {
    "@babylonjs/core": "^9.33.2",
    "@babylonjs/loaders": "^9.33.2",
    "playcanvas": "^2.23.3",
    // ...
  }
  ```
  The production application runs exclusively on Three.js (`three: ^0.187.0`). Babylon.js and PlayCanvas were used solely for offline benchmark studies in `src/rendering/benchmark` and `src/rendering/proof`.
- **Impact:**
  Installing these dependencies in Docker containers (`npm ci`) downloads hundreds of megabytes of unused packages, significantly increasing container build and deployment times.
- **Recommended Fix:**
  Move `@babylonjs/*` and `playcanvas` to `devDependencies` or isolate them to benchmark tooling.

---

### 3.4 Unbounded A* Search Loop on Narrow Viewports When Fish Clearance Exceeds Tank Bounds
- **Location:** [`src/rendering/scene/motion.ts:77-89`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/motion.ts#L77-L89), [`aquarium.ts:197-200`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/aquarium.ts#L197-L200)
- **Root Cause:**
  On the 402px mobile viewport proxy, `halfWidth` evaluates to ~1.05m (total tank width ~2.10m).
  Under AQ-60, adult fish are scaled to true length; a Blue tang has a clearance radius of `0.77m`, making `r = clearance + 0.08 = 0.85m`.
  With `2 * r = 1.70m` and central rock obstacles occupying width in the center:
  1. `max.x - min.x - 2 * r` leaves less than 0.40m of navigable water.
  2. All 12 random destination attempts in `plan()` fail collision validation.
  3. Because `fish.route` remains empty, line 108 evaluates `(!fish.route.length) && fish.targetWait <= 0` as `true` on every single frame.
- **Impact:**
  The fish freezes completely and runs 12 full A* / visibility graph pathfinding searches every frame (720 Dijkstra searches per second), causing heavy CPU saturation while the fish remains motionless.
- **Recommended Fix:**
  When `plan()` fails all attempts, set `fish.targetWait = 1.5` to back off instead of hammering pathfinding every frame, and scale clearance bounds proportionally on narrow mobile viewports.

---

## 4. Architecture, Reliability & System Boundaries

### 4.1 Missing Telemetry Environment Variables & Mounts in Docker Compose
- **Location:** [`deploy/compose.yaml:16-31`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/deploy/compose.yaml#L16-L31), [`src/routes/api/telemetry/network-traffic.ts:4-10`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/routes/api/telemetry/network-traffic.ts#L4-L10)
- **Details:**
  `deploy/compose.yaml` only binds:
  ```yaml
  volumes:
    - ${REEF_DATA_DIR:-../data}:/var/lib/reef-control
    - type: bind
      source: ${REEF_CPU_SENSOR_HOST_PATH:-/sys/devices/platform/coretemp.0}
      target: /run/host-sensors/coretemp.0
  ```
  It does NOT bind `/sys/class/net/<interface>/statistics` or set `REEF_NETWORK_SOURCE_ID`, `REEF_NETWORK_SOURCE_LABEL`, or `REEF_NETWORK_STATS_ROOT`.
- **Impact:**
  When deployed via Docker on `trappserv.er`, the network traffic endpoint `/api/telemetry/network-traffic` is permanently unconfigured and returns status `unavailable` with `"No network traffic source is configured."`
- **Recommended Fix:**
  Add bind mount support for host network interface statistics in `deploy/compose.yaml` (e.g. mounting `/sys/class/net/eth0/statistics` to `/run/host-net/eth0`) and pass corresponding environment variables.

---

### 4.2 Traffic Counter Polling Trap: Strict 15-Second Staleness Window Breaks Slow Pollers
- **Location:** [`src/server/network-traffic.ts:79, 218-226`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/server/network-traffic.ts#L79)
- **Root Cause:**
  `createNetworkTrafficStore` defaults `staleAfterMs = 15_000` (15s).
  In `sample()`:
  ```ts
  const elapsedMs = elapsedAt - baseline.elapsedAt
  if (elapsedMs > staleAfterMs) {
    baselines.set(sourceId, { ...counters, elapsedAt })
    return staleOrUnavailable(sourceId, source, 'The traffic sample interval was too long; a new baseline was recorded.', elapsedAt)
  }
  ```
- **Failure Scenario:**
  If client UI polls every 20s or 30s to conserve background resources, or if a browser tab is inactive for 16 seconds and wakes up:
  - Every single request has `elapsedMs > 15_000`.
  - Every single request wipes the baseline and returns `staleOrUnavailable`.
  - A client polling at >15s intervals will **never** receive a valid rate reading.
- **Recommended Fix:**
  Use an independent background sampling interval (or sliding window of recent counter reads) rather than tying baseline validity directly to caller request timing, or increase `staleAfterMs` to 60s while allowing rate calculation over longer intervals.

---

### 4.3 Missing Multi-Interface Support in Network Telemetry API
- **Location:** [`src/routes/api/telemetry/network-traffic.ts:4-10`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/routes/api/telemetry/network-traffic.ts#L4-L10)
- **Details:**
  `network-traffic.ts` only parses a single set of environment variables:
  ```ts
  const sourceId = process.env.REEF_NETWORK_SOURCE_ID
  const sourceLabel = process.env.REEF_NETWORK_SOURCE_LABEL
  const statsRootPath = process.env.REEF_NETWORK_STATS_ROOT
  const configuredSources = sourceId && sourceLabel && statsRootPath
    ? [{ id: sourceId, label: sourceLabel, statsRootPath }]
    : []
  ```
- **Impact:**
  Homelab servers typically have multiple network interfaces (e.g. `eth0` physical uplink, `wg0` WireGuard VPN, `br0` container bridge). The API adapter cannot configure or query more than one interface.
- **Recommended Fix:**
  Support comma-separated or JSON-configured environment strings (e.g. `REEF_NETWORK_SOURCES='[{"id":"eth0","label":"WAN","statsRootPath":"/run/host-net/eth0"}]'`).

---

### 4.4 CPU Temperature Driver Incompatibility: Intel `coretemp` Hardcoded Without AMD Support
- **Location:** [`src/server/cpu-temperature.ts:8-10, 52, 80-82`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/server/cpu-temperature.ts#L8-L10)
- **Details:**
  ```ts
  chip = (await readFile(join(hwmonPath, 'name'), 'utf8')).trim()
  if (chip !== 'coretemp') continue
  ```
  And:
  ```ts
  const stableSensorId = /^coretemp\.0:(?:package-id-\d+|core-\d+)$/
  ```
- **Impact:**
  Any server running AMD processors utilizes the Linux `k10temp` or `zenpower` kernel module instead of `coretemp`. On AMD hardware, discovery finds 0 sensors and returns `unavailable`, with no configuration option to specify alternative drivers.
- **Recommended Fix:**
  Allow `k10temp` chip names (with `Tdie` / `Tctl` labels) alongside `coretemp`.

---

### 4.5 Missing Method Guard (`ANY` / HTTP 405) on Configuration API (`/api/config`)
- **Location:** [`src/routes/api/config.ts:4-79`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/routes/api/config.ts#L4-L79)
- **Details:**
  In `cpu-temperature.ts` and `network-traffic.ts`, handlers explicitly register `ANY` handlers returning HTTP 405 Method Not Allowed with standard `Allow: GET, HEAD` headers.
  In `config.ts`, only `GET`, `PUT`, and `POST` are registered.
- **Impact:**
  Requests with unsupported HTTP methods (e.g. `PATCH`, `DELETE`) do not receive a standard 405 response with an `Allow` header; behavior defaults to Nitro/TanStack router error fallbacks.
- **Recommended Fix:**
  Register an `ANY` handler on `/api/config` returning HTTP 405 with `Allow: GET, PUT, POST, HEAD`.

---

### 4.6 Origin Validation Bypass When Browser Origin Headers Are Absent
- **Location:** [`src/routes/api/config.ts:82-97`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/routes/api/config.ts#L82-L97)
- **Details:**
  ```ts
  export function validateWriteOrigin(request: Request, configuredPublicOrigin = process.env.REEF_PUBLIC_ORIGIN): string | undefined {
    const fetchSite = request.headers.get('Sec-Fetch-Site')?.toLowerCase()
    if (fetchSite === 'cross-site') return 'Cross-origin configuration writes are not allowed.'

    const origin = request.headers.get('Origin')
    if (origin) {
      // validates origin
    }
  }
  ```
- **Impact:**
  If both `Sec-Fetch-Site` and `Origin` are absent (which occurs with CLI clients, curl, or legacy user-agents), the function returns `undefined` (success), skipping origin validation entirely.
- **Recommended Fix:**
  In production environments where `REEF_PUBLIC_ORIGIN` is configured, require either `Sec-Fetch-Site: same-origin` or a matching `Origin` header for state-modifying requests (`PUT`, `POST`).

---

### 4.7 Broken LocalStorage Fallback & Dead Persistence Code in `src/lib/services.ts`
- **Location:** [`src/lib/services.ts:58-114`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/lib/services.ts#L58-L114), [`src/lib/useServices.ts:24-28`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/lib/useServices.ts#L24-L28)
- **Details:**
  `src/lib/services.ts` contains `readServices()`, `saveServices()`, `addService()`, etc., storing data in `localStorage` under `reef-control.services.v1`. However, `useServices.ts` was refactored to talk exclusively to `/api/config`.
- **Impact:**
  1. The localStorage functions are dead code in production.
  2. If the user is offline or the server `/api/config` fails to load, `ensureLoaded()` throws an error and disables editing entirely, rather than falling back to local client storage.
- **Recommended Fix:**
  Either integrate `localStorage` as an offline cache/fallback in `useServices.ts` or clean up the unused legacy functions in `services.ts`.

---

### 4.8 Hardcoded Habitat Clearance Magic Number (`.53`) Diverges from Adult Scale Reference
- **Location:** [`src/rendering/scene/habitat.ts:13, 55`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/habitat.ts#L13), [`scripts/build-reef-habitat.mjs:30`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/scripts/build-reef-habitat.mjs#L30)
- **Details:**
  `habitat.ts` applies a hardcoded vertical offset of `.53` to grazing anchors:
  ```ts
  anchors: source.anchors.map(anchor => ({ ...anchor, id: `${prefix}-${anchor.id}`, position: { ...transform(anchor.position), y: anchor.position.y * scale.y + position.y + .53 } }))
  ```
  This offset was derived when all fish shared an unscaled `0.42` / `0.50` clearance radius. Under AQ-60, fish clearance radii range from `0.50m` to `0.77m` (e.g. Yellow tang is `0.57m`, Blue tang is `0.77m`).
- **Impact:**
  For fish with clearance radii larger than `0.53m`, positioning grazing targets at `+ .53` causes their clearance envelope to overlap the substrate, causing `resolveHabitatRoute` to reject the target as blocked.
- **Recommended Fix:**
  Derive anchor height dynamically based on the interacting species' `fishClearanceRadius(speciesId)` rather than baking a constant `.53m` offset into the scene graph.

---

## 5. Hygiene & Repository Artifacts

### 5.1 Dangling Symlinks with Broken `/tmp/` Targets
- **Location:**
  - `src/rendering/proof/candidate-real-clown 2.glb` -> `/tmp/aq-authored-clown.glb`
  - `src/rendering/proof/candidate-real-tang 2.glb` -> `/tmp/aq-authored-tang.glb`
- **Impact:**
  These are broken symlinks pointing to non-existent `/tmp/` files. Any script or bundler attempting to resolve them will fail with `ENOENT`.
- **Action:** Delete these dangling symlinks.

---

### 5.2 Historical Deployment Draft Had a Filename with Spaces
- **Location:**
  - Former path: `docs/deployment 2.md`
- **Details:**
  Review confirmed this 113-line draft contains preliminary deployment and read-only discovery history that differs from the canonical `docs/deployment.md`; it is not a duplicate of the active runbook. The historical content is retained at `docs/archive/deployment-2.md` with archive metadata and a working successor link. The documentation catalog points to the archive path.
- **Action:** Keep the archived draft at the kebab-case path; do not delete its historical content.

---

### 5.3 Missing `scripts/` in `tsconfig.json` Includes
- **Location:** [`tsconfig.json:15`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/tsconfig.json#L15)
- **Details:**
  `tsconfig.json` specifies `"include": ["src", "vite.config.ts", "vitest.config.ts"]`. Scripts in `scripts/` (e.g. `build-reef-habitat.mjs`, `check-reef-asset-manifests.mjs`, `inspect-fish-rigs.mjs`) are excluded from compiler checks.
- **Action:** Add `"scripts"` to `"include"` or maintain a `scripts/tsconfig.json` to prevent type drift in utility tooling.

---

### 5.4 Missing Error Callback in TextureLoader
- **Location:** [`src/rendering/scene/aquarium.ts:122-132`](file:///Users/ryantrapp/Desktop/Code/aquarium-homepage/src/rendering/scene/aquarium.ts#L122-L132)
- **Details:**
  `new THREE.TextureLoader().load(species.thumbnail, onLoad)` is called with no `onError` handler.
- **Impact:**
  If a thumbnail fails to load (e.g. network glitch or missing asset), Three.js logs an unhandled error to console and the sprite remains an untextured default material with no recovery.
- **Action:** Provide an `onError` callback that sets a fallback texture or updates status cleanly.

---

## 6. Summary Matrix

| ID | Finding | Severity | Category | Recommended Action |
|---|---|---|---|---|
| 2.1 | Throttled click layer desyncs from 60 FPS 3D fish | **Critical** | Interaction / UX | Sync anchor transforms per frame or capture raycast clicks directly on canvas |
| 2.2 | Overlapping fish context menu href swap race condition | **High** | Bug / UX | Avoid 0ms temporary href mutation; maintain stable link anchors |
| 2.3 | Unchecked perspective Z projection behind camera | **High** | Bug / Rendering | Guard projection for `projected.z > 1` and `pos.z >= camera.z` |
| 2.4 | Destructive inhabitant rebuild on service edit | **Medium** | Bug / UX | Keyed inhabitant reconciliation instead of full `rebuildFish()` |
| 2.5 | Double AO darkening in coral shader vs CPU spec | **Medium** | Rendering / Art | Remove duplicate diffuse multiplier in `<color_fragment>` |
| 2.6 | Pectoral fin flare cutoff on zero spine bend | **Medium** | Animation / Rigging | Check both spine and pectoral thresholds in early return |
| 2.7 | Single-frame angular pop on chord motion fallback | **Low** | Animation / Motion | Smooth angular yaw interpolation during boundary avoidance |
| 3.1 | 6.4 MB uncompressed PNG thumbnails in catalog | **High** | Performance / Mobile | Convert 4 PNGs to optimized WebP (<60 KB each) |
| 3.2 | Per-substep object allocation in `isWaterSegmentSafe` | **Medium** | Performance / GC | Cache clearance-inflated obstacle boxes |
| 3.3 | Heavy unused 3D engine dependencies in production | **Medium** | Packaging / Build | Move Babylon.js & PlayCanvas to `devDependencies` |
| 3.4 | Unbounded pathfinding loop on narrow mobile viewports | **High** | Performance / Mobile | Add backoff wait on failed route attempts; adjust mobile clearance |
| 4.1 | Missing network telemetry envs & mounts in Compose | **High** | Deployment / DevOps | Add stats mounts and env vars to `deploy/compose.yaml` |
| 4.2 | 15s traffic counter staleness trap breaks slow pollers | **Medium** | Backend / API | Use background sampling or increase staleness window |
| 4.3 | Network telemetry limited to single interface | **Low** | Backend / API | Support multi-interface configuration arrays |
| 4.4 | CPU temperature driver hardcoded to Intel `coretemp` | **Medium** | Compatibility | Support AMD `k10temp` / `zenpower` chips |
| 4.5 | Missing `ANY` / HTTP 405 method guard on `/api/config` | **Low** | Backend / API | Register 405 handler on `/api/config` |
| 4.6 | Origin validation bypass when headers missing | **Low** | Security | Enforce origin headers for mutating requests in prod |
| 4.7 | Dead localStorage code & missing offline fallback | **Low** | Architecture | Clean up unused methods or use as offline cache |
| 4.8 | Hardcoded `.53` clearance offset diverges from fish scale | **Medium** | Navigation / Simulation | Scale anchor offsets dynamically by species clearance |
| 5.1 | Dangling symlinks pointing to `/tmp/` | **Low** | Hygiene | Delete dangling symlinks |
| 5.2 | Historical deployment draft had spaces in its filename | **Low** | Hygiene | Retain at `docs/archive/deployment-2.md` with catalog metadata |
| 5.3 | Scripts excluded from `tsconfig.json` | **Low** | Tooling | Include `scripts/` in typechecking |
| 5.4 | Missing `onError` callback in `TextureLoader` | **Low** | Robustness | Handle texture load failures gracefully |
