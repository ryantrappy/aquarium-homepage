# AQ-103 Root bounded-interface acceptance

<!-- AGENT_DOC_METADATA
Category: Evidence
Status: Active
Authority: Evidentiary
Backlog: AQ-103
Owner: @root
Updated: 2026-11-27
Upstream: AGENTS.md, docs/requirements.md, docs/rendering.md, docs/more-realistic-reef-guide.png
Downstream: src/rendering/scene/water-surface.ts, src/rendering/scene/water-radiance-probe.ts
-->

> **Agent Context & Authority** — Root accepts the focused water-interface task against its six criteria. This does not accept the whole scene’s photorealism, reference brightness, lighting, material, haze or performance gates; those remain in the other scoped showcase tasks. No deployment or phone checks occurred.

## Reviewed behavior

The [current laptop overview](native/current-overview.jpg) renders the exact final water module in private runtime f03b551 at 1440×900 CSS pixels / DPR 1. Root compared its broken, continuous reflected ripple structure against the [goal visual](../../../more-realistic-reef-guide.png) and the previously rejected oval/chip trials. The repeated cellular-dot pattern is absent. The overall scene is still darker and less photoreal than the goal; fixture/reef material calibration remains broader showcase work, not a reason to mislabel those tasks complete.

The surface derives its horizontal enclosure-aligned extent from the production glass layout and retains canonical shared waves. Smooth capillary height gradients use the warp chain rule and screen-footprint filtering. TIR uses a one-time 128-square static-reef cube, with an analytic failure fallback. Reef-colored contribution is explicitly masked to rear/mid-water and grazing NoV; outside that region it uses neutral deep-water radiance. Both analytic and captured paths obey the same mask. The corrected overview-visible samples (z≤−2.07 and NoV≤.471) remain at full mask weight. Numeric boundary tests cover independent/combined fades, cutoff and invalid-input behavior, supplemented by actual shader compilation.

The water-to-air refracted ray uses the actual `SUN_DIRECTION`, not an unrelated point-source direction. The .53–.76 softened transition and physical refraction validity guard are unchanged. Corrected finite sampling of the normal overview found no open Snell window in the sampled visible patch; slope was not increased to force fixture light into that view. This is a finite sample, not an analytic continuous or raster bound. Earlier incorrect sampler and rejected trials remain historical evidence in the AQ-103 task and prior evidence folders.

## Native bounded diagnostics

The preserved [fixture](interface-proof.html) imports the actual production water, glass and wave modules. It is explicitly a diagnostic camera/backdrop, not a reef look replacement. [Private Vite configuration](private-vite.config.mjs) records local filesystem aliases and allowlists; its temporary paths need adaptation when reproducing elsewhere. It freezes t=0 unless its ripple clock is deliberately played. Shader readiness requires compilation, a render and the named production program without a reported failure.

- [Front meniscus](native/front-meniscus.jpg), [state](native/front-meniscus.json): real production glass retained; camera (0,3.55,.95) toward (0,4.4,2.6) frames the thin silver-cyan line inside frontZ=2.84. The center ray lands 0.24 units inside the boundary. Lower rays are correctly outside the water plane, and no surface is extended to make the diagnostic visible. The normal overview cannot see this front line; the diagnostic does not claim otherwise. Geometry and alpha-side/rear/front containment are also covered by production-layout tests.
- [Production-key transmission](native/key-production.png), [state](native/key-production.json): only the glass group is hidden to isolate the water shader, with that omission and a bounds outline shown on the page. Reverse-Snell construction aligns the center transmitted ray to the production sun with zero flat-normal angular error and NoV≈.903. Wave normals still affect the actual shader; this flat-normal diagnostic is not a claim of perfect alignment at every pixel.
- [Reversed diagnostic key](native/key-reversed.png), [state](native/key-reversed.json): same frozen shader, camera and backdrop; only the diagnostic key direction is reversed. The large loss of visible light establishes that the actual transmitted-fixture branch contributes, rather than relying only on shader text markers. The production direction was restored before cleanup.

[Pixel measurement](display-response.json), reproducible with `python3 docs/asset-evidence/aq103/root-review-20261115/measure-display-pixels.py`, samples 270,000 pixels in the same UI-free rectangle. Mean encoded display luma is 107.15 with the actual key and 10.02 with the reversed diagnostic direction. These are display code values, not physical radiance, exposure calibration, GPU timings or a main-view lighting-budget pass.

## Lifecycle, cost and validation

Capture excludes water, fish/schoolmates, glass reflectors, haze/shafts and particles/bubbles. Existing shadows are frozen and reused during the six cube-face renders, and renderer state is restored. The probe is captured only at initialization/layout revision, never every frame. It owns 524,280 color bytes including mips, plus implementation-dependent depth/driver overhead. A center probe has parallax error and intentionally omits moving fish; it is not ray tracing. Setup/allocation/capture failure returns the analytic fallback and releases any allocated target. Root corrected the setup-exception path after a real lifecycle-suite failure; tests verify no leaked target or exclusion/state changes. Replaced layout targets and controller disposal release resources.

[Focused review](root-focused-tests.log): 74 tests across water, probe, optics and actual-controller lifecycle suites pass. Geometry/layout updates, frozen pause/reduced-motion/hidden clock, non-interactive raycast, failure and disposal remain covered. [Combined source](root-full-tests.log): 934 tests / 78 files pass at f03b551, including the separately reviewed AQ-87 spawn repair. [Typecheck and 17 script checks](root-typecheck.log) and [production build](root-build.log) pass. Build/dev infrastructure uses private cache and Nitro build directories for final verification; no deployment or host configuration changes occurred. Source hashes are in [pins](source-pins.json); the current water files match the private proof byte-for-byte. Concurrent AQ-106 work is excluded from this acceptance.

Native viewport handling was checked against both DOM dimensions/DPR and image dimensions. Convenience JPEGs taken before the viewport was correctly applied, and transient CDP screenshot failures, were not accepted as target-view evidence. Final overview and meniscus JPEGs are 1440×900; key PNGs use the same explicit CSS clip. Committed logs trim trailing whitespace/blank EOF lines only; raw output is retained under `/tmp`. User instruction stops additional phone checks; existing two-layout unit tests remain, without a claim of new phone visual verification.

## Current-source review — 2026-11-27

The current default reef shows continuous capillary facets with restrained color in the grazing rear strip. The rear fade blends into the blue backdrop and the side fades stay inside the glass. In the diagnostic camera, the thin meniscus is visible with the production glass and the front edge at Z=2.84. The targeted camera provides a direct view of the meniscus outside the framing of the full-reef overview.

The same diagnostic camera and frozen clock were used for the two lighting captures. Reversing the key in the fixture reduced mean encoded luma from 102.894 to 10.017 in the 600×450 pixel rectangle starting at (720, 200). The control was restored afterward. This measures display output from the transmission branch. The normal reef overview uses seed 2026 and time 1.25. The overview and diagnostics ran at 1440×900 CSS pixels and DPR 1 with no browser warnings or errors. The overview resolved 12 inhabitants and reported no failed assets.

- [Current reef](current-20261127/full-reef.png)
- [Front meniscus](current-20261127/front-meniscus.png) and [fixture state](current-20261127/front-meniscus.json)
- [Production key](current-20261127/key-production.png) and [fixture state](current-20261127/key-production.json)
- [Reversed diagnostic key](current-20261127/key-reversed.png) and [fixture state](current-20261127/key-reversed.json)
- [Current source pins](current-20261127/source-pins.json)

The five focused water, radiance, glass, optics and lifecycle suites passed all 91 tests. The same source passed all 1,100 tests, typecheck and the production build in the preceding milestone. AQ-103 is Done. Overall fixture brightness and wider reef appearance remain under their own tasks.
