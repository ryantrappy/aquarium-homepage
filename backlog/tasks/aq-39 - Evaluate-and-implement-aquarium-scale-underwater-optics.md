---
id: AQ-39
title: Evaluate and implement aquarium-scale underwater optics
status: To Do
assignee:
  - '@Luna'
created_date: 2026-11-03 12:33
updated_date: '2026-11-13T06:06:00Z'
labels: []
dependencies:
  - AQ-5
  - AQ-34
references:
  - docs/gemini_planning.md
  - docs/reef_aquarium_all_code.md
  - docs/open-source-asset-and-motion-research.md
  - src/rendering/scene/aquarium.ts
  - src/rendering/scene/underwater-optics.ts
  - src/rendering/scene/coral-material.ts
  - https://pubmed.ncbi.nlm.nih.gov/18264420/
  - https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0002680
  - https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0128697
  - >-
    https://research.engr.oregonstate.edu/parrish/index-refraction-seawater-and-freshwater-function-wavelength-and-temperature
  - AQ-103
documentation:
  - docs/modular-coral-and-live-rock-spec.md
  - docs/open-source-asset-and-motion-research.md
priority: '15'
type: enhancement
ordinal: 15
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Gemini reference suggests wavelength-dependent attenuation, fluorescence and glass effects, but its coefficients and code are unverified. A small front-on home aquarium needs calibrated, restrained optics that preserve the crisp reference composition.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Research and document which attenuation, fluorescence and glass effects are visually justified at aquarium scale, including sources and approximations.
- [x] #2 Implement selected effects with tunable parameters in the chosen renderer without obscuring fish or adding an artificial blue veil.
- [ ] #3 Verify visual behavior and performance at 402x874 and 1440x900, including paused and reduced-motion modes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
### 1. Source-Bounded Optical Evaluation at Home-Aquarium Scale (AC #1)
Per `docs/open-source-asset-and-motion-research.md` §6.2:
1. **Wavelength-Dependent Water Absorption (`evaluateDepthTransmittance`)**:
   - **Scientific Input**: Pope & Fry (1997) measured pure-water absorption across the visible spectrum (`alpha_R ≈ 0.43 m^-1` near 650 nm, `alpha_G ≈ 0.055 m^-1` near 530 nm, `alpha_B ≈ 0.015 m^-1` near 460 nm).
   - **Aquarium-Scale Boundary**: In a front-on home aquarium (`0..3.5 m` effective camera-to-backdrop path length), pure-water absorption removes ~45–60% of red light across the rear tank depth while leaving green (>85%) and blue (>95%) almost completely clear. Open-ocean turbidity fog (`scene.fog = new THREE.Fog('#155c73', 15, 32)` currently on line 37 of `src/rendering/scene/aquarium.ts`) is physically inappropriate if pulled into the foreground and leaves the tank flat if pushed behind the rear wall (`z = -5.5`).
   - **Selected Approximation**: Use `evaluateDepthTransmittance(depthMeters)` in `src/rendering/scene/underwater-optics.ts`, which clamps Beer–Lambert transmittance `T(d) = exp(-alpha * d)` to explicit aquarium visibility floors (`R >= 0.35`, `G >= 0.78`, `B >= 0.90`). This preserves 100% crisp foreground fish colors while gently cooling the rear live-rock island and background water column.
2. **Coral Fluorescence (`COLOR_0.g` Tip Mask + Actinic Blue Fill)**:
   - **Scientific Input**: Alieva et al. (2008) and Eyal et al. (2015) show coral fluorescent proteins (CFP ~485–495 nm, GFP ~505–520 nm, RFP ~580+ nm) vary substantially by species and protein family; there is no universal single emission color or mandatory time-of-day Kelvin cycle.
   - **Selected Approximation**: Treat coral fluorescence as a restrained, tunable artistic accent driven by the vertex-color growth-tip mask (`COLOR_0.g`) in `applyCoralRawMaskMaterial` (`src/rendering/scene/coral-material.ts`, default `tipGlowIntensity = 0.25`) paired with a static royal-blue actinic fill light (`#4f9cff`, intensity `1.15`). Omit unverified time-of-day Kelvin animations so the tank stays readable at all hours.
3. **Glass / Water-Air Interface Effects**:
   - **Scientific Input**: Seawater refractive index is `n ≈ 1.34` (Oregon State reference), and the `~48.2°` total internal reflection (Snell's window) critical angle applies at the top water-to-air boundary when viewed from below. Through a flat front viewing pane viewed head-on, Snell's law across parallel air-glass-water interfaces produces negligible chromatic dispersion or barrel distortion.
   - **Selected Approximation**: Omit screen-space barrel distortion, chromatic aberration, and heavy glass reflections on the front pane (which degrade fish readability and violate `AQ-14.6` AC #3). Represent the upper water-to-air interface purely via the subtle translucent meniscus/ripple plane at `y = +2.72` (`AQ-14.2` AC #1).

### 2. Concrete Code Changes Required in `src/rendering/scene/aquarium.ts` (AC #2)
1. **Replace Uniform Flat Rear Wall & Scene Fog (Lines 37 & 47 of `src/rendering/scene/aquarium.ts`)**:
   - Currently, line 37 sets a flat `scene.background = new THREE.Color('#155c73')` and `scene.fog = new THREE.Fog('#155c73', 15, 32)`, and line 47 creates a flat single-color `MeshStandardMaterial({ color: '#115469', roughness: 1 })` plane at `z = -5.5`.
   - Replace the flat rear plane material with a vertical depth-graded water-column shader (or vertex-colored `PlaneGeometry(24, 10, 1, 24)`) that blends from sunlit shallow reef cyan (`#267c99`) near the top surface (`y = +2.8`) down to deeper reef teal-blue (`#0d3f54`) above the sand bed (`y = -2.8`), modulated by `evaluateDepthTransmittance(depthMeters)` from `src/rendering/scene/underwater-optics.ts`.
   - Calibrate `DEFAULT_AQUARIUM_OPTICS_CONFIG` (`src/rendering/scene/underwater-optics.ts`) so any depth cue starts behind the primary fish swimming volume (`z < -1.5`), ensuring foreground and mid-tank fish have zero blue veil.
2. **Apply Coral Raw-Mask Optics (`src/rendering/scene/coral-material.ts`)**:
   - When loading modular coral assets (`AQ-14.4`), wrap each coral mesh with `applyCoralRawMaskMaterial(material, { tipGlowIntensity: 0.25, aoStrength: 0.65 })` so `COLOR_0.g` provides restrained actinic tip luminescence and `COLOR_0.a` grounds basal crevices in contact ambient occlusion without overwriting authored PBR baseColor textures.

### 3. Responsive & Mode Verification (AC #3)
- Inspect the rendered scene at `1440x900` and `402x874` CSS pixels in both active, paused, and `prefers-reduced-motion` states to confirm:
  - Fish textures remain vivid and un-veiled across the swimming volume.
  - Coral tips and basal crevices show clean depth separation without bloom/halo artifacts.
  - Frame times remain smooth with zero console errors or WebGL warnings.

2026-11-12 AQ-80 decision update: retain the §1.3 omission of heavy front-pane reflections, screen-space distortion, and chromatic aberration. Clarify that this does not prohibit an optically clear physical enclosure, edge/grazing Fresnel highlight, or faint diagonal sheen. AQ-102 may add only those restrained front cues plus faint genuine mirrored outer-reef/sand content on side panes; no full-frame blur/refraction/color veil or scene-blocking glare. Glass raycasts stay disabled and glass/caustic motion follows the existing pause/reduced-motion/page-hidden clock. This update supersedes the 2026-11-08 conflict note's unresolved go/no-go; AQ-80 records GO and AQ-102 owns implementation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 (@gemini):
- Implemented src/rendering/scene/underwater-optics.ts and unit tests in src/rendering/scene/underwater-optics.test.ts:
  * evaluateDepthTransmittance(depthMeters) applies Pope & Fry (1997) pure-water absorption coefficients (alpha_R=0.43, alpha_G=0.055, alpha_B=0.015 m^-1) bounded to home aquarium path lengths (0..3.5 m) with visibility floors (R>=0.35, G>=0.78, B>=0.90) so foreground fish are never obscured by an open-ocean blue veil.
  * Added full source-bounded Implementation Plan detailing the optical justification (Pope & Fry 1997, Alieva et al. 2008, Eyal et al. 2015, OSU refractive index) and exact lines to update in src/rendering/scene/aquarium.ts (lines 37-47).
  * Verified with vitest and tsc --noEmit.

2026-11-08 (backlog mapping, PR 10) — glass-pane conflict note: AQ-39 §1.3 omits heavy front-pane reflections (they degrade fish readability and violate AQ-14.6 AC #3). Tracker item #13 proposes a glass pane, which would introduce front-pane reflections and therefore conflicts with this omission. Before implementing heavy front-pane reflections or a glass pane, resolve the conflict explicitly: either keep the AQ-39 omission and defer/reject the glass pane, or update AQ-39 to specify the intended reflection behaviour. Do not implement both the omission and the glass pane silently. This note changes no implementation scope.

2026-11-08 audit: PR #7 merged DEFAULT_AQUARIUM_OPTICS_CONFIG and evaluateDepthTintedColor in src/rendering/scene/underwater-optics.ts (9 passing tests in underwater-optics.test.ts) and wired Beer-Lambert depth-tinted water column (#082d50), fog (18..36), and LED intensities into src/rendering/scene/aquarium.ts. Moved to In Progress (ready-for-review / gemini approved) awaiting Root 2-viewport visual sign-off (AC #3).

2026-11-12 AQ-80 conflict resolved GO with restrained enclosure cues; heavy front-pane reflections remain prohibited. Searched docs and Backlog references for a canonical standalone tracker item #13 file and found none; no such tracker record was edited or inferred. The decision is recorded here and in AQ-80; AQ-102 carries implementation.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @Luna
created: 2026-11-04T02:32:00Z

---

Research doc updated with source-bounded optics notes: Pope & Fry is pure-water absorption, coral FP spectra vary, and the ~48° critical angle applies at a water-air interface. Earlier tank RGB/PAR and fixed fluorescence claims are marked unverified or removed; no rendering values are claimed as measured.

---

author: @root
created: 2026-11-12 05:37

---

Root review 2026-11-11: Returned to To Do. AC3 remains unverified: current two-viewport active/paused/reduced-motion visual and performance evidence is incomplete. Live review is exploratory only: browser zoom prevented exact CSS viewport dimensions, so it cannot close this criterion.

---

author: @Junie
created: 2026-11-13 05:41

---

2026-11-12 user direction update: AQ-103 replaces only the earlier §1.3 surface-interface recommendation to use a subtle plane at y=+2.72. The surface must instead be level at configured surfaceY, bounded by the current enclosure, and use the softened Snell-window/TIR, rear fade, and front meniscus described in AQ-103. AQ-39’s broader attenuation, fluorescence, and glass-optics scope remains unchanged.

---

author: @Luna
created: 2026-11-13T06:06:00Z

---

AQ-103 supersedes only this task’s water-surface-interface proposal: the surface stays horizontal at configured optics.surfaceY, matches glassEnclosureLayout, uses continuous shared-wave facets with softened Snell-window/TIR, bounded fixture transmission, restrained rear/mid coral bounce, rear fade, and a front meniscus. Do not treat this focused work as completion of AQ-39’s broader attenuation, coral fluorescence, side-glass optics, or visual/performance gates.

---
<!-- COMMENTS:END -->
