# Photorealism rubric — measurable pass/fail criteria (AQ-70.1)

<!-- AGENT_DOC_METADATA
Category: Research
Status: Active
Authority: Informational
Backlog: AQ-70.1
Owner: @gemini
Updated: 2026-11-21
Upstream: docs/requirements.md, docs/photorealism-reference.md, backlog/tasks/aq-70.1 - Research-a-photoreal-reef-tank-reference-set-and-define-a-measurable-realism-rubric.md
Downstream: docs/baked-lighting-spike.md, docs/photorealism-budgets.md
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Research / Realism Rubric
> - **Status**: Active
> - **Authority**: Informational
> - **Backlog Reference**: `AQ-70.1`
> - **Summary**: Defines observable visual pass/fail criteria across fish, coral, rock, sand, water/glass, lighting, and composition, repeatable histogram and caustic spatial-frequency measurement methods (`scripts/measure-capture-histograms.mjs`), and the scored baseline gap table.

"Realistic" was repeatedly self-asserted by authoring notes while the render
looked cartoonish. This rubric is the objective target every later look-dev
task is judged against. A capture passes a category only when it meets every
criterion in that category: the visual checks (a reviewer comparing against
`docs/photorealism-reference.md`) **and** the numeric checks (the script
below). Nothing here is a vibe.

## 1. Measurement method (repeatable)

**Tool:** `scripts/measure-capture-histograms.mjs` (dependency-free Node;
decodes PNG, reports luminance / saturation / hue statistics).

```sh
# Whole frame (desktop 1440x900 and mobile 402x874 captures)
node scripts/measure-capture-histograms.mjs capture-desktop.png
node scripts/measure-capture-histograms.mjs capture-mobile.png

# One element at a time — crop to the element's bounding box in the capture
node scripts/measure-capture-histograms.mjs capture-desktop.png --crop x,y,w,h
node scripts/measure-capture-histograms.mjs capture-desktop.png --json > capture-stats.json
```

**Capture protocol.** Same scene, same camera, both viewports (1440×900 and
402×874). PNG (Playwright screenshots are PNG already). JPEG captures must
be converted to PNG first (e.g. `python3 -c "from PIL import Image;
Image.open('capture.jpg').convert('RGB').save('capture.png')"`). Do not
compare a JPEG against a PNG without converting — compression changes the
histogram. Do not measure a capture that has a debug overlay, FPS badge, or
label UI in the frame; hide UI first, or crop it out.

**Definitions.** Luminance is Rec. 709 on the sRGB bytes
(display-referred, comparable across captures taken the same way — not
linear light). Saturation is HSV saturation per pixel. "Highly saturated"
means saturation > 0.6. Hue is reported in six buckets (red, yellow, green,
cyan, blue, magenta). All numeric targets below are whole-frame unless a
criterion says "region".

**Caustic spatial frequency & local contrast measurement (`computeCausticSpatialMetrics`).**
`scripts/measure-capture-histograms.mjs` computes a local box-smoothed luminance
baseline (`R = max(3, round(16 / sampleStep))`) along horizontal scanlines and
evaluates the high-pass residual `hp(x, y) = L(x, y) - L_local(x, y)`:
- `caustics.localRmsContrast`: root-mean-square amplitude of `hp(x, y)` across
  the measured region (measures local caustic ridge intensity modulation
  independent of macro lighting gradients).
- `caustics.cyclesPer1000Px` and `caustics.meanCellSpacingPx`: upward
  zero-crossing spatial frequency of `hp(x, y)` with a noise-floor hysteresis
  threshold `max(0.004, 0.35 * localRmsContrast)`.
- Calibrated on the project goal visual (`docs/more-realistic-reef-guide.png`
  sand bed crop `--crop 520,440,560,160`): `40.01 cycles/1000px` (`25.0 px`
  mean ridge spacing) and `localRmsContrast = 0.0864`.

**Calibration (measured with `scripts/measure-capture-histograms.mjs`).** Two
public-domain references from `docs/photorealism-reference.md` plus the primary
goal visual (`docs/more-realistic-reef-guide.png`):

| Reference | Luminance mean / p10 / p50 / p90 | Saturation mean / p50 / p90 | > 0.6 | > 0.8 | Caustics (freq / contrast) |
|---|---|---|---|---|---|
| Berlin reef tank, front-on (ref 18) | 0.34 / 0.11 / 0.28 / 0.65 | 0.33 / 0.31 / 0.56 | 7.8% | 1.8% | — (even display light) |
| Clownfish in anemone (ref 1) | 0.55 / 0.25 / 0.55 / 0.82 | 0.41 / 0.35 / 0.81 | 20.8% | 10.1% | — (macro subject) |
| Goal visual sand bed (`more-realistic-reef-guide.png` `--crop 520,440,560,160`) | 0.389 / 0.123 / 0.330 / 0.723 | 0.485 / 0.471 / 0.816 | 31.4% | 11.0% | `40.01 cycles/1000px` (`25.0 px`), RMS `0.0864` |

Read the two rows together: a real reef-tank frame is *moderately*
saturated overall (mean ~0.33, under 8% highly saturated) even though its
saturated subject (the clownfish) is locally very saturated (21% > 0.6 in
the close-up). The failure mode is a frame that is saturated *everywhere* —
that is what "uniformly saturated pastels" measures as.

## 2. Numeric targets (whole frame, both viewports)

| Metric | Pass | Fail | Why |
|---|---|---|---|
| Saturation mean | 0.25 – 0.45 | < 0.25 (washed out) or > 0.45 (cartoon) | Real tank frame: 0.33. Baseline audit: "hues uniformly saturated pastels". |
| Fraction of pixels saturation > 0.6 | ≤ 0.15 | > 0.15 | Real tank frame: 0.078. The subject may be saturated; the frame may not be. |
| Fraction of pixels saturation > 0.8 | ≤ 0.05 | > 0.05 | Real tank frame: 0.018. > 0.8 is neon/plastic territory. |
| Luminance p10 (shadow floor) | ≥ 0.08 | < 0.08 | Crushed blacks hide rock/coral detail; real frame: 0.11. |
| Luminance p90 (highlight ceiling) | ≤ 0.85 | > 0.85 | Blown highlights (white sand, pale tips) lose detail; real frame: 0.65. |
| Luminance mean | 0.25 – 0.55 | outside | Real tank frame: 0.34; clownfish close-up: 0.55. Below 0.25 the tank reads as a cave; above 0.55 as a lit stage. |
| Hue: no single bucket | ≤ 0.60 of measured pixels | > 0.60 | One hue dominating the frame is a tint, not a reef. (Berlin tank: cyan 0.54 — near the cap, because water is cyan; the cap is deliberately set just above a real tank's water-dominated frame.) |

**Per-region targets** (crop with `--crop`; the region must be the element,
not the whole frame):

| Region | Saturation mean | Notes |
|---|---|---|
| Sand bed | 0.05 – 0.20 | Aragonite is cream/white; the baseline's "flat grey-white floor" fails on texture, not saturation — pair with R-S4. |
| Live rock | 0.10 – 0.35 | Carbonate beige/tan with patchy coralline pink/purple; the baseline's indigo/violet rock reads ~0.5+ in the blue/magenta buckets. |
| Coral tissue (one colony) | 0.20 – 0.55 | Muted tissue with localized bright tips/polyps; a colony averaging > 0.55 is a pastel. |
| Fish body (one fish, side-on) | species-dependent; ≤ 0.60 | Blue tang royal blue and yellow tang yellow are legitimately saturated; the check is that the *pattern edges are soft* and the *fins are translucent* (visual criteria F-3/F-4), not that the body is desaturated. |
| Caustic-lit sand bed (`--crop 360,640,720,220` at `1440×900`) | `15.0 – 48.0 cycles/1000px` (`21 – 67 px` spacing), `localRmsContrast 0.035 – 0.150` | Goal visual sand crop measures `40.01 cycles/1000px` (`25.0 px` spacing) and `localRmsContrast 0.0864`. Values `< 12 cycles/1000px` read as broad sine bands; `> 55 cycles/1000px` read as high-frequency static/noise. |

## 3. Visual pass/fail criteria

### F — Fish

| # | Criterion | Pass | Fail (baseline behavior) |
|---|---|---|---|
| F-1 | Skin: wet specular highlight visible on the body at the default camera | A moving highlight follows the body as it turns | Matte/flat color (baseline blue tang: "flat saturated royal blue, no wet specular highlight") |
| F-2 | Pattern edges | Soft, slightly irregular edges on bands/spots | Hard vector outline (baseline: "hard-edged black palette band") |
| F-3 | Fins | Translucent membrane with visible rays; light passes through | Opaque fins without rays (baseline: "opaque fins without rays or translucency") |
| F-4 | Eye | Glossy cornea with a highlight; iris distinct from pupil | Flat dark dot (baseline: "eye without a cornea highlight") |
| F-5 | Scale / micro-detail | Scales or lateral-line micro-detail visible at the 1440×900 zoom (AQ-62 focal zoom) | Smooth plastic body (baseline: "no visible scale micro-detail, overly smooth bulbous silhouette") |
| F-6 | Silhouette | Body reads as a fish from edge-on, not a disc | Edge-on tang reads as a flat disc (baseline: "reads as a flat yellow disc with spiky fins") |
| F-7 | Iridescence (species-appropriate only) | Guanine shimmer on blue tang / chromis where the species has it; absent where it does not | Uniform iridescence on every species, or none where the species has it |

### C — Coral

| # | Criterion | Pass | Fail (baseline behavior) |
|---|---|---|---|
| C-1 | Tissue color | Muted tans/browns/olives with localized bright tips or polyps (refs 14, 17) | Uniformly saturated pastels across every colony (baseline: "lavender, cyan, mint, pink") |
| C-2 | Polyp / corallite detail | Polyp-scale texture visible at focal zoom | Smooth featureless branches (baseline: "no polyp-scale surface detail") |
| C-3 | Branch tips | Pale axial tips, slightly translucent, distinct from the branch | "Cotton swab" tips (baseline) |
| C-4 | Euphyllia | Individual tentacles with distinct tips, not fused blobs | "Lollipop clusters" (baseline) |
| C-5 | Fluorescence | Localized, driven by the actinic channel; off or faint under white light | Blanket emissive / glowing plastic (baseline brain coral: "glowing neon-green plastic") |
| C-6 | Repetition | No two colonies read as the same instance at a glance | "Identical branch instances repeat" (baseline) |
| C-7 | Tissue translucency | Light scatters through thin tissue at the tips/edges | Fully opaque waxy tissue |

### R — Live rock

| # | Criterion | Pass | Fail (baseline behavior) |
|---|---|---|---|
| R-1 | Base color | Carbonate beige/tan/grey (region saturation 0.10–0.35) | Indigo/violet "blue foam" (baseline) |
| R-2 | Coralline algae | Patchy purple/pink, up-facing surfaces only, irregular edges | Uniform purple wash or none |
| R-3 | Porosity / encrusting life | Pores, small encrusting shapes, rubble at the base | Smooth featureless mound |
| R-4 | Repeat | Rock does not read as the same asset stamped repeatedly | "Premade asset stamped on the rocks repeatedly" (baseline audit) |

### S — Sand

| # | Criterion | Pass | Fail (baseline behavior) |
|---|---|---|---|
| S-1 | Grain | Individual grains / shell and rubble fragments visible at focal zoom | Flat floor (baseline: 256px noise tiled 38×24) |
| S-2 | Color | Cream/white with warm detritus variation (region saturation 0.05–0.20) | Flat grey-white |
| S-3 | Contact shading | Soft darkening where rock meets sand, fading with distance | Hard-coded AO blobs, or none |
| S-4 | Ripples / bedform | Gentle natural bedform, not a sine grid | Regular sine ripples |

### W — Water, glass, lighting

| # | Criterion | Pass | Fail (baseline behavior) |
|---|---|---|---|
| W-1 | Water clarity | Clear at tank scale; very slight blue shift only at the back | Murky or uniformly tinted |
| W-2 | Caustics | Irregular network (branching cells), animated, visible on rock/coral/sand | Soft sine stripes (baseline: "sine-wave bands ... read as soft stripes, not a caustic network") |
| W-3 | Surface | Underside-of-surface reflection and Snell window visible from below; no flat opaque band at the top | "Flat band at the top" (baseline water-surface plane) |
| W-4 | Shadows | Soft multi-emitter shadows under LED fixtures (diffuse edges) | Sharp single-sun silhouettes from one shadow map (baseline) |
| W-5 | Image-based lighting | Surfaces show specular reflections from an environment map (AQ-71) | Matte/plastic: "no scene.environment / PMREM, so MeshStandardMaterial surfaces have no specular reflections" (baseline) |
| W-6 | Glass | Edges, silicone seams, faint reflections present (or a documented go/no-go per AQ-80) | No glass at all with no decision recorded |
| W-7 | Background | Reads as water depth, not a solid color or a gradient with drawn sunbeams | Solid #183654 + shader-gradient "sunbeams" (baseline) |

### L — Lighting and composition

| # | Criterion | Pass | Fail (baseline behavior) |
|---|---|---|---|
| L-1 | Fixture | 14,000–20,000 K LED look: white + royal-blue/actinic balance, fluorescence localized under actinic | Single-color key light |
| L-2 | Exposure | No crushed blacks (p10 ≥ 0.08) and no blown highlights (p90 ≤ 0.85) — see §2 | — |
| L-3 | Composition | Reef occupies the frame with depth layering; fish distributed through the water, not only at the top | "Two near-symmetric mounds on an empty sand plain; reef occupies only the lower half; large empty upper water" (baseline) |
| L-4 | Labels | Service labels unobtrusive (AQ-70.14); no game-HUD pill dominating the frame | "Always-on dark pill labels read as a game HUD" (baseline) |
| L-5 | No forbidden veils | No fog, veil, vignette, or blur used to hide defects (forbidden by AQ-39 §1.1, AQ-14.6 AC #3, AQ-14.2 AC #4) | Any of those present |

## 4. Baseline gap table (AQ-70.1 AC#3)

Scores the initial 2026-11-05 qualitative baseline audit AND the committed
deterministic `AQ-70.2` baseline captures (`docs/asset-evidence/aq70-2/baseline-before/laptop-full-scene-run1.png`
at `1440×900` and `phone-full-scene-run1.png` at `402×874`) measured with
`node scripts/measure-capture-histograms.mjs`:

- **Measured `AQ-70.2` deterministic laptop baseline (`laptop-full-scene-run1.png`, `1440×900`)**:
  - `luminance`: mean `0.231` (Fail: `< 0.25`), `p10 = 0.050` (Fail: `< 0.08` shadow floor), `p50 = 0.120`, `p90 = 0.676` (Pass: `<= 0.85`).
  - `saturation`: mean `0.623` (Fail: `> 0.45`), `p50 = 0.795`, `p90 = 0.866`, `> 0.6 = 64.9%` (Fail: `> 15%`), `> 0.8 = 48.5%` (Fail: `> 5%`).
  - `hue`: `cyan = 89.3%` (Fail: `> 60%` single-bucket cap), `blue = 3.6%`, `red = 2.4%`, `magenta = 2.1%`, `yellow = 1.6%`, `green = 1.1%`.
  - `caustics`: whole-frame `17.20 cycles/1000px` (`58.1 px` spacing, `localRmsContrast = 0.0671`); sand crop (`--crop 360,640,720,220`) `39.85 cycles/1000px` (`25.1 px` spacing, `localRmsContrast = 0.0936`).
- **Measured `AQ-70.2` deterministic phone baseline (`phone-full-scene-run1.png`, `402×874`)**:
  - `luminance`: mean `0.241` (Fail: `< 0.25`), `p10 = 0.062` (Fail: `< 0.08`), `p50 = 0.128`, `p90 = 0.685`.
  - `saturation`: mean `0.623` (Fail: `> 0.45`), `> 0.6 = 62.6%` (Fail: `> 15%`), `> 0.8 = 49.8%` (Fail: `> 5%`), `hue cyan = 86.2%` (Fail: `> 60%`).

| Item | Baseline score | Mapped task(s) |
|---|---|---|
| F-1 wet specular | Fail — matte, no highlight | AQ-70.10, AQ-72 |
| F-2 pattern edges | Fail — hard-edged palette band | AQ-70.10, AQ-72 |
| F-3 translucent fins | Fail — opaque, no rays | AQ-70.10, AQ-72, AQ-74 |
| F-4 cornea highlight | Fail — no cornea highlight | AQ-70.10, AQ-72 |
| F-5 scale micro-detail | Fail — none visible | AQ-70.10, AQ-70.15 |
| F-6 silhouette | Fail — edge-on tang is a flat disc | AQ-79 (Root review), AQ-70.10 |
| F-7 iridescence | Fail — absent where appropriate | AQ-70.10 |
| C-1 tissue color | Fail — uniformly saturated pastels | AQ-70.11, AQ-70.9 |
| C-2 polyp detail | Fail — none | AQ-70.11 |
| C-3 branch tips | Fail — cotton-swab tips | AQ-70.11 |
| C-4 Euphyllia | Fail — lollipop clusters | AQ-70.11 |
| C-5 fluorescence | Fail — blanket emissive (brain coral neon green) | AQ-70.11, AQ-70.6 |
| C-6 repetition | Fail — identical instances repeat | AQ-70.11, AQ-70.13 |
| C-7 translucency | Fail — opaque waxy tissue | AQ-70.11 |
| R-1 rock color | Fail — indigo/violet blue foam | AQ-59, AQ-70.12 |
| R-2 coralline algae | Fail — none (uniform violet) | AQ-59, AQ-70.12 |
| R-3 porosity | Fail — smooth mounds | AQ-59, AQ-70.12 |
| R-4 repeat | Fail — stamped-asset read | AQ-59, AQ-70.13 |
| S-1 grain | Fail — 256px noise, no grains | AQ-70.12, AQ-73 |
| S-2 sand color | Fail — flat grey-white | AQ-70.12, AQ-73 |
| S-3 contact shading | Fail — hard-coded AO blobs | AQ-73 |
| S-4 bedform | Fail — sine ripples | AQ-73 |
| W-1 clarity | Fail — (tinted by the indigo palette; re-measure after AQ-71) | AQ-71 |
| W-2 caustics | Fail — sine stripes, not a network | AQ-70.4 (done — re-verify visually), AQ-70.6 |
| W-3 surface | Fail — flat opaque band at the top | AQ-70.4, AQ-86 |
| W-4 shadows | Fail — sharp single-sun silhouettes | AQ-70.6, AQ-70.7 |
| W-5 IBL | Fail — no environment map, matte/plastic | AQ-71, AQ-70.4 |
| W-6 glass | Fail — no glass, no decision | AQ-80 (decision), AQ-39 |
| W-7 background | Fail — solid #183654 + drawn sunbeams | AQ-70.4, AQ-86 |
| L-1 fixture | Fail — no actinic/white balance | AQ-70.6 |
| L-2 exposure | Fail — `AQ-70.2` baseline `p10 = 0.050 < 0.08` (crushed shadow floor) and `mean = 0.231 < 0.25` (laptop `1440×900`) | AQ-70.4, AQ-71, AQ-70.6 |
| L-3 composition | Fail — diorama, empty upper water | AQ-70.13 |
| L-4 labels | Fail — game-HUD pills | AQ-70.14 |
| L-5 no veils | Pass — no fog/veil/vignette/blur was used | — (keep it passing) |
| §2 numeric targets | Fail — `AQ-70.2` baseline saturation mean `0.623 > 0.45`, `>0.6 = 64.9% > 15%`, `>0.8 = 48.5% > 5%`, `cyan = 89.3% > 60%` | AQ-88, AQ-70.4, AQ-70.6, AQ-70.11, AQ-70.12 |

Every failing item already has an owning task — that is the point of the
table: it is a scoring sheet, not a source of new tasks. The only items
without a measurement are the ones that need the missing file.

## 5. Lighting approach recommendation (AQ-70.1 AC#5)

**Short answer: real-time-only can reach this rubric for the fish and the
water, but the static reef (rock + coral skeletons) will not reach it
without baked lighting — so the answer is the hybrid: bake the static
reef, keep everything else real-time.** The reasoning, the integration
strategy, and the follow-up breakdown are the subject of
`docs/baked-lighting-spike.md` (AQ-70.7); the one-paragraph version is:

- The rubric items a real-time renderer already handles or is close on:
  fish skin/fins/eyes (F-1–F-7, via better assets + PMREM/IBL), water
  clarity and caustics (W-1–W-3, via the AQ-70.4/AQ-70.6 work), and the
  fixture balance (L-1, via AQ-70.6). None of these needs baking.
- The items real-time struggles with at this scene's budget: soft
  multi-emitter shadows (W-4), micro-cavity ambient occlusion on rock and
  coral skeletons (R-3, C-2), and color bleeding between rock/coral/sand
  (C-1, R-1). Screen-space AO approximates the first poorly at 1440×900
  and costs more than the baked alternative; the other two are what
  path tracing is for.
- Baking does not help the fish (they move), the soft corals (they sway),
  the anemone (it pulses), or the caustics (they animate) — those stay
  real-time, lit by the same fixture model so the two halves match. The
  seam risk is at the coral mounting skirts and is handled by matching
  ambient levels and a transition mask (see the spike doc).
- Therefore: do not bake the whole scene (the "pre-rendered reef plate"
  option in AQ-70.7), and do not stay pure real-time either. Bake diffuse
  GI + AO into the static rock/skeleton geometry via a second UV set, keep
  the dynamic elements real-time, and verify the blend against this rubric
  — especially W-4, R-3, and the §2 numeric targets, which are the items a
  bad bake would break first.
