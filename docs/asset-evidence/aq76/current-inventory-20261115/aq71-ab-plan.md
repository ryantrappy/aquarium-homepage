# AQ-71 laptop PMREM A/B candidate plan

**Status: plan only; awaiting Root review.** No production source is changed, no private worktree has been created, and no server/browser was started.

## Question

At 1440×900 CSS pixels, does the accepted PMREM environment map cause a measurable steady-state presentation-rate or JavaScript render-submission regression versus the same scene with PMREM creation and assignment disabled?

This is a laptop-only comparison under the current user verification scope. It does not claim phone results or a full adaptive-quality budget pass.

## Matched setup

- Use a disposable worktree pinned to the Root-selected accepted fixture source `f03b551763a9a7307b1a3598a8ed421f92ca23db`; do not assume this is a descendant of current `v1-finalization` HEAD. Retain the exact fixture service configuration, geometry, random seed, camera, frozen pose/time, shadow state, and quality setting for both conditions. Current committed head `1f6e1f4` remains the separate inventory source snapshot.
- Add a temporary development-only query option in that private worktree, such as `pmrem=off`, that toggles only the call to `createAquariumEnvironmentMap()` and the resulting PMREM assignments. Keep it absent from production builds and user-facing UI. With the flag absent, the condition must use the accepted PMREM map. The on/off runs should use the same compiled build and differ only by the query flag.
- Use the existing `window.__AQUARIUM_LOOKDEV__` bridge and full-scene preset. Hold the fixture's exact accepted query values fixed except for the private PMREM flag. At each run: wait for `ready()`, confirm identical viewport/seed/time/preset/inhabitant roster/camera and scene state, then call `renderFrozen()` once per animation frame.
- Hold the laptop at 1440×900 CSS px and the fixture DPR fixed. Do not resize, change browser zoom, background the tab, interact with controls, or allow settings/preset changes during a run. Allow the machine/browser to settle between runs.
- Compare **A = PMREM off** and **B = accepted PMREM on** in ABBA order; repeat the ABBA block at least twice if the Root-operated native session stays stable. Each run has 120 warmup RAF samples followed by 180 measured samples. Record each run independently rather than combining runs before quality checks.

## Recorded values and limits

Retain raw timestamped RAF deltas and `renderFrozen()` `cpuRenderCall` durations plus the bridge snapshots before/after each run. Report p50/p95 per run and the ABBA ordering. `renderer.info.render` may be retained as a renderer-submission diagnostic, but it is multipass work, not unique triangles. RAF cadence is browser presentation interval and CPU-call duration is JS submission time; neither is GPU time. This procedure does not read GPU timer queries, and does not certify total GPU memory.

PMREM is built once at initialization and has no per-frame map-generation pass, so distinguish startup work from steady-state shading. Capture initialization/resource timing separately only if the Root reviewer wants it; do not blend it into steady-state frames. A measurable steady-state difference may still arise from fragment shading/reflection sampling of the map, but the test does not assign causality to a GPU stage without GPU timer instrumentation.

## Isolation and build hygiene

- Keep all edits, output, and build state outside the shared worktree. Use a new disposable worktree/copy, do not stash or clean the shared branch.
- Configure Nitro with a private build directory such as `nitro({ buildDir: '/tmp/aq71-private-nitro-variant' })`, plus a dedicated temporary cache directory; do not use shared `node_modules/.nitro`. If externalized dependencies require it, create only the needed `node_modules` lookup symlink inside that disposable build directory.
- Use an isolated Vite cache directory and a dedicated localhost port with strict port binding. **Do not start the server until Root coordinates the native session.** Record the final worktree path, source commit, private diff hash, build/cache directories, URL/port, and exact ready/config snapshots before capture.
- Do not change PMREM intensities, environment-map roles, exposure, shadows, or visual materials. Dispose each aquarium instance and stop its server when Root completes the capture; preserve any user-owned browser/session.

## Acceptance boundary

The result can inform AQ-71 AC4 for the authorized 1440×900 laptop condition only. A reported parity result must show the raw per-run spread and state whether observed frame intervals were refresh-rate capped. Do not promote the result to “no GPU cost”, “full budget pass”, or an unmeasured viewport claim. Root reviews the plan and eventual private patch/capture before any result is treated as AQ acceptance evidence.
