# Biomechanical Fish Turning & Direction-Change Plan (`AQ-49` / `AQ-12`)

_Date: 2026-11-04_  
_Scope: Root-cause analysis of current fish turning artifacts in `src/rendering/scene/motion.ts` and `src/rendering/scene/aquarium.ts`, peer-reviewed biomechanical turning models for reef fishes, and a concrete implementation plan (`AQ-49`)._

## 1. Root-Cause Diagnosis: Why Current Fish Turns Look Artificial

Inspecting [`src/rendering/scene/motion.ts`](../src/rendering/scene/motion.ts) (`lines 55–73`) and [`src/rendering/scene/aquarium.ts`](../src/rendering/scene/aquarium.ts) (`lines 111–122`) identifies five specific mechanical bugs that make direction changes look robotic:

1. **Position Translates Toward the Waypoint Vector Instead of Along `fish.yaw` ("Crab-Sliding")**:
   - In `integrateSwimmingFish()` ([`src/rendering/scene/motion.ts`](../src/rendering/scene/motion.ts), `line 70`):
     ```ts
     const next = { x: fish.position.x + dx / remaining * travel, y: fish.position.y + dy / remaining * travel, z: fish.position.z + dz / remaining * travel }
     ```
   - While `fish.yaw` rotates incrementally toward `heading`, translation steps directly along `(dx, dy, dz)` toward the new waypoint. When a fish chooses a new waypoint behind itself (`|delta| > 90°`), it immediately slides sideways or backward toward the new target while its body slowly rotates like a turret on rails.
2. **Rigid-Body Root Rotation Over a Straight-Line Animation Clip**:
   - In `render()` ([`src/rendering/scene/aquarium.ts`](../src/rendering/scene/aquarium.ts), `lines 114–120`), `item.mixer.update(...)` plays a symmetrical straight-ahead swim loop while `item.root.rotation.set(pose.pitch, pose.yaw, pose.bank, 'YXZ')` spins the entire rigid mesh. The fish's spine never bends into the curve (`turnCurvature = 0`), its tail never whips through a turn, and its left/right pectoral fins beat symmetrically even during a 180° pivot.
3. **Infinite Angular Acceleration (`clamp(delta, -maxTurn, maxTurn)`)**:
   - `fish.yaw += turn` (`line 62`) applies a constant angular velocity step that starts and stops instantaneously without angular momentum (`yawRate`), pre-turn braking, or post-turn recovery damping.
4. **Zero Waypoint Lookahead or Corner Filleting**:
   - The fish swims straight into a waypoint until `remaining < 0.025` (`line 55`) and then abruptly snaps to the next segment (`fish.waypoint++`), producing sharp polygonal corners instead of smooth anticipatory arcs.
5. **Instantaneous `scale.x` Flip on 2D Fallback Previews**:
   - For fallback sprite meshes (`aquarium.ts`, `line 118`), `item.root.scale.x = Math.sin(pose.yaw) < 0 ? -1 : 1` flips orientation in a single frame whenever `sin(yaw)` crosses zero.

## 2. Biomechanical Research Foundation

Peer-reviewed studies on teleost and coral-reef fish maneuvering establish four distinct physical mechanisms that govern realistic direction changes:

1. **Heading-Locked Forward Thrust & Centripetal Slip** ([Van Leeuwen et al. 2015 / Voesenek et al. 2018, *Journal of Experimental Biology*](https://journals.biologists.com/jeb/article/221/1/jeb149583/19527/Biomechanics-of-swimming-in-developing-larval-fish)):
   - Propulsion acts along the fish's instantaneous anterior body axis `(sin(yaw) * cos(pitch), -sin(pitch), cos(yaw) * cos(pitch))`, not along the vector to a distant waypoint. Turning radius $R = v / \omega$ is governed by forward speed $v$ and angular velocity $\omega$: to turn tightly without overshooting obstacles, a fish must first brake forward speed $v$ while ramping up yaw torque.
2. **Two-Stage Fast/Reversal Turns (Stage 1 Preparatory Bend → Stage 2 Propulsive Exit)** ([Fleuren et al. 2018, *J. Exp. Biol.* 221:jeb168609](https://journals.biologists.com/jeb/article/221/7/jeb168609/20677/Three-dimensional-analysis-of-the-fast-start); [Liu et al. 2011, *PubMed 22181503*](https://pubmed.ncbi.nlm.nih.gov/22181503/)):
   - For large heading changes (`|delta| >= 65°`), fish do not swim in a wide constant-speed circle. They execute a **two-stage maneuver**:
     - **Stage 1 (Braking & C-Bend / Pivot Initiation)**: Forward speed drops rapidly as the head yaws into the turn and the posterior spine bends into the turn direction (`C-shape` for subcarangiform swimmers; caudal peduncle cocking + pectoral flare for labriform swimmers).
     - **Stage 2 (Traveling Curvature Wave & Acceleration Exit)**: The bend propagates posteriorly down the peduncle and caudal fin as a propulsive stroke that straightens the body and accelerates the center of mass along the new heading.
3. **Asymmetric Pectoral Fin Braking & Rowing in Reef Fishes** ([Webb 1973, *J. Exp. Biol.*](https://journals.biologists.com/jeb/article/59/3/697/21925/Kinematics-of-Pectoral-Fin-Propulsion-in); [Hale et al. 2006](https://www.researchgate.net/publication/6809620_Pectoral_fin_coordination_and_gait_transitions_in_steadily_swimming_juvenile_reef_fishes); [Westneat et al., *Mechanics of Pectoral Fin Swimming*](https://www.researchgate.net/publication/237101604_Mechanics_of_Pectoral_Fin_Swimming_in_Fishes)):
   - Reef fishes that use labriform or mixed pectoral locomotion (`yellow-tang`, `blue-tang`, `flame-angelfish`, `copperband-butterflyfish`, wrasses, and hovering `ocellaris-clownfish`) initiate turns and stops by **abducting the inside pectoral fin forward as a hydrodynamic pivot brake** while sweeping the outside pectoral fin with higher amplitude to generate yaw torque—allowing near-zero turning radii (`R < 0.25 BL`) without bending their rigid discoid trunks.
4. **Median/Dorsal Fin Lateral Stabilizing Flick** ([Tytell & Lauder 2008, *Escaping Flatland*](https://www.researchgate.net/publication/5684842_Escaping_Flatland_Three-dimensional_kinematics_and_hydrodynamics_of_median_fins_in_fishes)):
   - During sharp turns and braking, laterally compressed reef fishes erect their dorsal and anal sails to resist roll sideslip and sharpen pivot torque.

## 3. Concrete Engineering Plan (`AQ-49`)

### Phase 1: Kinematics & Trajectory Reform in `src/rendering/scene/motion.ts`

1. **Extend `SwimmingFish` State with Continuous Turn Dynamics**:
   - Add `yawRate: number` (rad/s), `pitchRate: number` (rad/s), `turnCurvature: number` (normalized signed spine bend `[-1, 1]`), `turnPhase: 'none' | 'brake-pivot' | 'exit-stroke'`, and `turnPhaseSeconds: number`.
2. **Translate Along the Fish's Actual Heading Axis (Eliminate Crab-Sliding)**:
   - Compute forward unit vector from `fish.yaw` and `fish.pitch`:
     ```ts
     const dirX = Math.sin(fish.yaw) * Math.cos(fish.pitch)
     const dirY = -Math.sin(fish.pitch)
     const dirZ = Math.cos(fish.yaw) * Math.cos(fish.pitch)
     ```
   - Advance `fish.position` along `(dirX, dirY, dirZ) * travel` (with a small bounded centripetal alignment blend only when `remaining < 0.18` and `|delta| < 0.35` so the fish still hits exact anchor targets without orbiting them).
   - Before stepping forward along `dir`, verify `isWaterSegmentSafe()`; if a wide turn would clip an obstacle or tank wall, automatically trigger the **tight pivot brake (`brake-pivot`)** mode so the fish rotates in place (`speed <= 0.12 * cruise`) before accelerating forward.
3. **Lookahead Waypoint Blending (Corner Filleting)**:
   - When `remaining < lookaheadRadius` (e.g., `0.45` tank units) and `fish.waypoint + 1 < fish.route.length`, smoothly blend the target steering point between `fish.route[fish.waypoint]` and `fish.route[fish.waypoint + 1]` using `smoothstep(0.45, 0.05, remaining)`. This makes the fish anticipate corners and curve smoothly around live rock and coral colonies instead of hitting vertices and snapping.
4. **Two-Mode Guild-Aware Turn Controller**:
   - **Mode A — Smooth Cruising Arc (`|delta| < 65°`)**:
     - Drive `yawRate` with a critically damped angular spring-damper toward `clamp(delta * 2.8, -maxTurnRate, maxTurnRate)` with guild-specific angular acceleration limits.
     - Couple roll (`bank`) and subtle nose-dip (`pitch`) to `yawRate * speed` so the fish banks naturally into sweeping turns.
   - **Mode B — Two-Stage Reversal / Sharp Turn (`|delta| >= 65°` or Startle Turn)**:
     - **Stage 1 (`brake-pivot`, `0.18–0.32 s`)**: Pectoral braking drops `fish.speed` to `12–22%` of cruise speed while `yawRate` surges (`1.8x` normal turn rate, or `3.2x` on startle) and `turnCurvature` bends into the turn direction (`sign(delta)`).
     - **Stage 2 (`exit-stroke`, `0.20–0.30 s`)**: As `|delta|` drops below `28°`, `turnCurvature` whips through a brief opposite-sign propulsive tail pulse (`-0.45 * sign(delta) * exp(-t * 8)`) while `fish.speed` accelerates briskly (`1.35x` cruise pulse) out of the turn along the new heading.

### Phase 2: Post-Mixer Procedural Spine & Fin Turn Overlay in `src/rendering/scene/aquarium.ts`

Because baked GLB clips only encode a straight-ahead swim cycle, add a lightweight procedural bone-adjustment pass in `aquarium.ts` immediately after `item.mixer?.update(...)`:

1. **Cache Rig Bone References on Load**:
   - When cloning each rigged `GLTF` in `rebuildFish()`, inspect and cache bone references on `Inhabitant` (`head`, `spine_mid` / `spine`, `tail_base` / `peduncle`, `tail_tip` / `caudal`, `pectoral_L`, `pectoral_R`).
2. **Apply Archetype-Specific Curvilinear Spine Bending**:
   - Using `pose.turnCurvature` (`[-1, 1]` from `motion.ts`):
     - **`subcarangiform_schooler` (`ocellaris-clownfish`, `chromis`, `anthias`, `royal-gramma`)**: Distribute lateral turn bend progressively along the posterior chain (`spine_mid.rotation.y += 0.18 * turnCurvature`, `tail_base.rotation.y += 0.32 * turnCurvature`, `tail_tip.rotation.y += 0.42 * turnCurvature_delayed`), where `turnCurvature_delayed` lags `turnCurvature` by `~0.09 s` so the bend visibly travels from mid-body to tail tip!
     - **`labriform_rigid_disc` (`yellow-tang`, `blue-tang`, `flame-angelfish`, `copperband-butterflyfish`, wrasses)**: Keep the discoid trunk rigid (`spine_mid.rotation.y += 0.03 * turnCurvature` max) so dorsal/anal sails never shear, and concentrate all axial turn flexion into the caudal peduncle and tail fin (`tail_base.rotation.y += 0.38 * turnCurvature`, `tail_tip.rotation.y += 0.48 * turnCurvature_delayed`).
3. **Apply Asymmetric Pectoral Fin Braking & Pivot Strokes**:
   - When turning left (`turnCurvature > 0.08`):
     - **Inside fin (`pectoral_L`)**: Bias rotation forward into an abducted braking flare (`+0.35 * turnCurvature` rad) and dampen oscillatory stroke by `50%`.
     - **Outside fin (`pectoral_R`)**: Increase rowing sweep amplitude (`1.0 + 0.45 * |turnCurvature|`) to visually push the nose around the turn.
   - When turning right (`turnCurvature < -0.08`), mirror the inside/outside pectoral roles.
4. **Smooth Cosine Foreshortening for 2D Artwork Fallbacks**:
   - For species still using 2D sprite planes (`item.fallback === true`), replace the single-frame binary snap `item.root.scale.x = Math.sin(pose.yaw) < 0 ? -1 : 1` with a smoothed horizontal facing factor (`smoothFacing` damped over `~0.18 s`, clamped away from `0` at `±0.18` minimum width so the plane never vanishes edge-on) plus a gentle banking tilt (`pose.bank`), eliminating instant flip pops.

### Phase 3: Verification & Unit Test Suite (`src/rendering/scene/motion.test.ts`)

1. **No Crab-Sliding Regression Test**: Verify that when a fish is given a waypoint `150–180°` behind its initial `yaw`, its instantaneous velocity vector $\Delta \mathbf{x} / \Delta t$ stays aligned within `15°` of its current heading vector `yaw` rather than moving backward toward the target before turning.
2. **Two-Stage Reversal Metrics**: Verify that a `> 90°` direction change triggers pre-turn deceleration (`brake-pivot`), peaks `|turnCurvature| > 0.35`, and recovers to `|turnCurvature| < 0.05` once aligned with the new heading.
3. **Obstacle & Tank-Bound Safety**: Verify that curvilinear turns and lookahead corner filleting never violate `isWaterSegmentSafe()` or tank bounds across all existing `src/rendering/scene/` and `src/simulation/` test cases, and freeze cleanly under `paused` and `prefers-reduced-motion`.
