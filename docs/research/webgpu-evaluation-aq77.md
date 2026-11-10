# WebGPU evaluation for the aquarium renderer (AQ-77, tracker #19)

**Status:** Recommendation only — **DEFER**. No production renderer change is made by this evaluation.
**Date:** 2026-11-08
**Author:** Luna (implementation agent); decision takes effect only on Root approval in PR review.
**Base:** `gemini_control` at `85e7623` (PR #15 merge; includes PR #16 caustics).
**Related:** AQ-38 (engine evaluation only; AC7 — no production renderer migration as part of an investigation), AQ-39 (underwater optics, Beer–Lambert depth colour), AQ-76 (LOD / adaptive quality, PR #18 open), AQ-78 (scanned/sculpted fish), AQ-72 (translucent fins / iridescence).

## Recommendation: DEFER

Do **not** migrate the aquarium from the Three.js `WebGLRenderer` baseline to
`WebGPURenderer` + TSL now. Re-evaluate when **both** of these triggers are met:

1. The in-flight realism work has landed — AQ-39 optics (merged), AQ-76 LOD/adaptive
   quality, and rigged/sculpted fish assets for the full roster (AQ-78) — so a
   renderer migration would be measured against finished assets, not placeholders.
2. Either (a) a Three.js release marks `WebGPURenderer` as no longer experimental,
   or (b) a measured GPU-side bottleneck appears in this scene (see §5).

A GO now would pay the full migration cost (§7) for visual gains that are mostly
gated on assets that do not exist yet (§§2–4). A NO-GO would be wrong too: the
technology is real, the pinned Three.js version already ships it, and the fallback
path makes the risk bounded. DEFER is the honest answer.

## 1. Feasibility / compatibility

**Current baseline (verified in source, `gemini_control` @ `85e7623`):**

- `src/rendering/scene/aquarium.ts:74` — `new THREE.WebGLRenderer({ canvas,
  antialias: true, alpha: false, powerPreference: 'high-performance' })`
- Line 75: `setPixelRatio(Math.min(devicePixelRatio, 1.5))`; line 76:
  `outputColorSpace = THREE.SRGBColorSpace`; lines 77–78: `ACESFilmicToneMapping`,
  exposure `1.02`; lines 79–80: shadow map on, `PCFSoftShadowMap`.
- Camera 42° at `(0, 0.15, 9)` (line 97); background/fog from the optics config.
- `package.json:23` — `"three": "^0.187.0"`.

**Three.js r187 (0.187.0, released 2026-10-30) already ships what the migration
needs.** `WebGPURenderer` is imported from `three/webgpu` and TSL from
`three/tsl`; both have existed since r171 (Nov 2024) with no extra build
configuration. `WebGPURenderer` falls back to WebGL 2 automatically where WebGPU
is unavailable, so one renderer covers both paths (`renderer.backend.isWebGPUBackend`
reports which backend is actually running). No dependency change is needed to
experiment — the pinned version is already the latest release.

Two hard constraints on feasibility:

- **The three.js manual still calls `WebGPURenderer` experimental** (as of the
  r186/r187 documentation): depending on the scene, features may be missing or
  `WebGLRenderer` may perform better. It is usable, not settled.
- **Custom GLSL is not supported by `WebGPURenderer` on either backend.**
  `ShaderMaterial`, `RawShaderMaterial`, and `onBeforeCompile` patches must all be
  ported to TSL. This scene has **30 `onBeforeCompile` references** across
  `aquarium.ts`, `caustics.ts`, `coral-material.ts`, `fish-flex-material.ts`, and
  `aragonite-sand.ts` — the caustic texture patch, the Lighthill body-flex
  displacement, the coral material, and the sand shader are all GLSL patches today.
  That is the single largest porting cost (§7).

**Browser support (checked 2026-11-08; caniuse data as of Aug 2026):** WebGPU is
fully supported by browsers accounting for ~84% of global page views, plus ~3%
partial. Chrome/Edge since 113 (2023); Safari 26 (Sep 2025) on macOS/iOS/iPadOS;
Firefox 141 (Jul 2025) on Windows and 147 (Jan 2026) on Apple Silicon Macs.
Remaining gaps: Firefox on Linux, Intel Macs, and Android; desktop Safari is
partial (WebGPU requires macOS 26); WebGPU requires a secure context (HTTPS or
localhost). A WebGL 2 fallback would therefore have to be maintained indefinitely
for a share of visitors — it is not a temporary shim.

**Build impact (estimate only, no build change in this PR):** none expected beyond
the import change (`three/webgpu` + `three/tsl`); the existing Vite setup needs no
new plugin for the renderer swap itself. Bundle size delta was not measured and is
*unresolved* — measure it in any migration spike.

## 2. Volumetric water

**What WebGPU/TSL would add:** compute shaders and storage buffers let light
shafts, scattering, and depth haze run on the GPU (the original Gemini planning
rationale: simulation data stays on the GPU instead of crossing the CPU/GPU
boundary every frame).

**What the current path already achieves:** AQ-39 Beer–Lambert depth-colour
wiring (PR #7, merged) tints background/fog by depth; PMREM/IBL (PR #9, merged)
adds image-based lighting; real animated caustics (PR #16, merged) put a moving
light web on sand, rock, and coral. The water already reads as a volume from the
two reviewed viewports.

**Verdict:** volumetric shafts would be visibly better than the current
approximation, but the payoff is capped by asset quality, not by the renderer:
the reef is a coarse scan with baked shading and the fish retain approximate
fins/materials (`docs/rendering.md`). True volumetric light over a coarse reef
still looks like light over a coarse reef. This is a real gain, gated on AQ-78
assets — not a reason to migrate first.

## 3. True refraction

**What WebGPU enables:** `MeshPhysicalMaterial.transmission` and render-target-based
refraction through the water surface and glass, plus refraction through the water
volume itself.

**Current state:** the scene uses **no transmission at all** — the water surface is
an opaque `MeshStandardMaterial` (`aquarium.ts:244`), there is no glass pane
(AQ-39 records a decision to omit heavy front-pane reflections), and refraction is
not simulated anywhere. WebGLRenderer *can* do transmission (it is a material
feature, not a WebGPU-exclusive one), so refraction is not, strictly, a WebGPU
gating question — but the TSL node-material path makes refractive water/glass
material authoring substantially easier than hand-written GLSL transmission
shaders on `WebGLRenderer`.

**Verdict:** real gain, but only visible once the water surface and glass are
reworked as refractive materials, which is itself a separate design task
(AQ-39 / AQ-14.6). At the two reviewed viewports, with the current opaque surface
and coarse reef, refraction would be a subtle effect. Gated, not blocking.

## 4. Subsurface scattering (SSS)

**Feasibility:** TSL/node materials can implement SSS for fish fins and bodies
(thickness-based translucency, wrapped diffuse). Cost is moderate per material
once the node-material pipeline exists; it is not free.

**Gate:** SSS is gated on assets that do not exist. Translucent fins and
iridescence are a separate item (AQ-72), and 13 of 15 roster species lack rigged
assets at all (`docs/rendering.md`). SSS on the current extruded-silhouette GLBs
would light up the wrong geometry. **Scoped out of any near-term migration:**
revisit when AQ-72 and AQ-78 land.

## 5. Performance

**Measured baseline (`docs/rendering.md:38`):** a 60-rAF-sample observation on a
desktop host measured median **33.3 ms**, p95 **35.0 ms**, max **35.4 ms** frame
intervals. These are **frame intervals, not GPU timings** — they do not separate
CPU/JS work from GPU work, are not physical-phone measurements, and are not
full-roster evidence.

**No performance claim is made here.** This scene is small — total fish geometry
is ~133k triangles (splat-fish manifest) — and the per-frame work is dominated by
JS-side motion, turning, routing, and label projection, none of which WebGPU
accelerates by itself. A WebGPU migration could plausibly *worsen* frame intervals
on the fallback path or during pipeline compilation (r187 improved
`compileAsync`, but first-render pipeline creation remains a cost). Before any
migration could be performance-justified, all of the following must be measured:
GPU timings (not frame intervals), the full 15-species roster, and a physical
phone at 402×874. **Unresolved until measured.**

## 6. Risks

- **API instability / TSL churn.** Recent releases removed or renamed TSL exports
  between versions (r186 removed `PCFSoftShadowMap` for `WebGPURenderer`,
  `rangeFog`, and `viewportResolution`; r187 changed custom-light registration and
  struct storage-buffer access). A migration pins the project to a fast-moving API
  surface; every Three.js upgrade becomes a shader-porting review.
- **Loss of verified alpha-picking.** Alpha-aware raycasting/picking is a verified,
  load-bearing behaviour: an empty-water corner must not open a service link, and
  a visible fish body must open its configured service. `Raycaster` behaviour
  under `WebGPURenderer` (including its WebGL 2 fallback backend) must be
  re-verified, not assumed.
- **Loss of the native-link fallback.** `AquariumScene.tsx` mounts the scene after
  React mount and falls back to native links on GPU/asset failure. Any renderer
  change must preserve that fallback exactly, including context-loss handling.
- **Safari/Firefox gaps** force the dual-renderer maintenance burden (§1) —
  effectively two backends to test at both viewports for every visual change.
- **Interaction with in-flight work:** AQ-39 optics, AQ-76 LOD/adaptive quality
  (PR #18, open), and the AQ-70–AQ-78 realism tasks all touch the same renderer
  setup and shader patches. A migration started now would collide with all of
  them; sequencing it after they land is strictly cheaper.
- **Shadow-map behaviour change:** r186 removed `PCFSoftShadowMap` under
  `WebGPURenderer` (use `PCFShadowMap`, now soft) — the current `aquarium.ts:80`
  setting would need a backend-conditional change.

## 7. Migration cost (estimate)

If Root later approves a migration, the concrete work is:

| Area | Change |
|---|---|
| `src/rendering/scene/aquarium.ts` | Renderer construction (lines 74–80), shadow-map setting, PMREM env-map path, disposal |
| `src/components/AquariumScene.tsx` | Renderer lifecycle, context-loss / GPU-failure fallback re-verification |
| `src/rendering/scene/caustics.ts` | `onBeforeCompile` caustic patch → TSL |
| `src/rendering/scene/fish-flex-material.ts` | `onBeforeCompile` Lighthill displacement → TSL |
| `src/rendering/scene/coral-material.ts` | `onBeforeCompile` coral patch → TSL |
| `src/rendering/scene/aragonite-sand.ts` | Sand shader patch → TSL |
| Materials / shaders | Any `MeshStandardMaterial` customisation reviewed against node materials; transmission work for water/glass |
| Tests | Full suite re-run (~500 tests); new tests for backend detection, fallback behaviour, and TSL shader injection; all renderer-dependent tests re-verified on both backends |
| Review | Browser review at 1440×900 and 402×874 on WebGPU **and** on the WebGL 2 fallback, active / paused / `prefers-reduced-motion` |

Estimated effort: a multi-day migration plus a full visual re-review, not a
one-line renderer swap. The WebGL 2 fallback would have to be maintained
indefinitely (§1), so this is a permanent two-backend testing cost, not a
one-off port.

## 8. Decision

**DEFER.** Stay on `WebGLRenderer`. Re-evaluate when:

- AQ-39 optics, AQ-76 LOD/adaptive quality, and AQ-78 rigged/sculpted fish assets
  have landed, **and**
- either Three.js marks `WebGPURenderer` as no longer experimental, or a measured
  GPU-side bottleneck appears in this scene (§5).

This decision is a recommendation; it takes effect only when Root approves it in
PR review. A future GO must not be read as approval to start migration — migration
would be a new task with its own branch, estimate, and review (AQ-38 AC7:
no production renderer migration is performed as part of this investigation).

## Must-preserve constraints for any future migration

- **Click-to-link / alpha-picking:** native HTML anchors (`<a target="_blank"
  rel="noreferrer">`) remain the only link mechanism — never canvas clicks, never
  `window.open`. Empty water must not open a service link; a visible fish body
  must open its configured service. Re-verify picking on both backends.
- **Native-link GPU-failure fallback:** if the GPU or an asset fails, the page
  must still offer the service links (current `AquariumScene.tsx` behaviour).
- **Pause / `prefers-reduced-motion` behaviour** unchanged.
- **No production renderer code is changed by this evaluation** (AQ-77 AC #4,
  AQ-38 AC7).

## Sources

- Current renderer setup: `src/rendering/scene/aquarium.ts:74–80, 94–97`
  (`gemini_control` @ `85e7623`); `package.json:23` (`three ^0.187.0`).
- Engine baseline and frame-interval measurements: `docs/rendering.md:34, 38, 97, 119`.
- Archived, non-binding WebGPURenderer + TSL recommendation:
  `docs/gemini_planning.md` §1.2 (header: "Archived Planning Log … non-binding
  exploratory reference material"; decision line §1.2: "Use Three.js with
  WebGPURenderer and TSL as the primary architecture"). Quoted here as a historical
  recommendation, **not** as a current decision.
- Three.js r187 release (2026-10-30) and WebGPURenderer status: three.js release
  notes / migration guide via web search 2026-11-08 (WebGPURenderer from
  `three/webgpu` since r171, automatic WebGL 2 fallback, still experimental per the
  three.js manual; `onBeforeCompile`/`ShaderMaterial` unsupported on
  `WebGPURenderer` on either backend).
- Browser support: caniuse data as of Aug 2026 (~84% full, ~3% partial); Chrome/
  Edge 113+, Safari 26 (Sep 2025), Firefox 141 Windows / 147 Apple Silicon macOS;
  gaps on Firefox Linux/Intel Macs/Android and desktop Safari (partial).
- AQ-38 AC7 (verified in `backlog/tasks/aq-38 - … .md`): "no production renderer
  migration is performed as part of this investigation."
- AQ-77 ACs: `backlog/tasks/aq-77 - Evaluate-WebGPU-TSL-renderer-with-volumetric-water-and-true-refraction.md`.
