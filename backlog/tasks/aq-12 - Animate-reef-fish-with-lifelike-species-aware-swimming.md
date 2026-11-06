---
id: AQ-12
title: 'Animate reef fish with photorealistic, species-aware swimming'
status: In Progress
assignee:
  - '@render-integration'
created_date: '2026-11-03T04:15:00Z'
updated_date: '2026-11-06 02:40'
labels: []
dependencies:
  - AQ-5
references:
  - 'https://www.fisheries.noaa.gov/species/banggai-cardinalfish/resources'
  - >-
    https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish
  - AQ-34
  - AQ-35
  - AQ-36
documentation:
  - docs/fish-turning-and-maneuvering-plan.md
  - docs/requirements.md
  - docs/design-principles.md
  - docs/fish-behavior-design.md
priority: high
type: enhancement
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The aquarium will succeed when fish look like living reef animals swimming through water, not cutouts sliding through a background. Build on the licensed asset and rendering direction in AQ-5. The current translating cutouts are scaffold only and do not satisfy this goal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At least two supported reef species show visible body deformation and coordinated fin and tail propulsion while swimming; rigid still-sprite translation alone does not count as completion.
- [ ] #2 Species have distinct swimming speed, body motion, turning and banking behavior, and acceleration that fit their real-fish references.
- [ ] #3 Fish integrate with tank lighting and apparent depth through believable scale, color, shading, and occlusion rather than looking pasted over the water.
- [ ] #4 During turns and depth changes, the fish remains inside the aquarium and its service label and clickable target remain readable and correctly associated.
- [ ] #5 Motion can be paused, stops when the page is hidden, honors reduced-motion preferences, and remains responsive with the supported fish count.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Root approved Three.js production integration after controlled engine review. Create one browser-only renderer with mounted-effect ownership, cancellation, disposal, preserved native links and exact-ID asset selection. 2. Derive conservative bounded solid volumes and real grazing surfaces from the actual reef mesh; reuse AQ-34 generic 3D routes, with no fabricated habitat types. 3. Drive independent per-service travel, acceleration, turns/banking and gait-scaled clips from AQ-35 profiles and AQ-44 state/events; stop paths and deformation for pause/reduced-motion/hidden state. 4. Bind occlusion-aware labels/native links and single-fish startle; preserve correct-species image fallback for unmodeled species and graceful GPU/load failure. 5. Test movement/clearance/bounds/pause/independent activation, typecheck/build and SSR, then request root main-page review at402x874 and1440x900. Fish source fidelity remains technical baseline pending AQ-40; no Done claim.

2026-11-05 bounded supplied-fish visual review (read-only): hash-pin the exact canonical clown, yellow tang, blue tang, royal gramma, and Banggai GLBs under `src/rendering/assets/fish`; verify manifest/inspection provenance, meter units, +Y up, and +Z swim extent. Use existing Blender 5.0.1 glTF import only in `/tmp/aq12-fish-review-20261105`. Render all five under one neutral studio setup at side and oblique views at two selected points in each active clip, using explicit target adult lengths from AQ-60/`docs/fish-scale-reference.md` in meters. Compare old active clown/tang candidates at matching target physical lengths if import is practical. Return actual visible shape/fin differences and limits; no asset edits, scene integration, visual acceptance, or task closure.

6. Bounded read-only provenance audit of the nine untracked splat-fish GLBs and build-splat-fish-glbs.mjs: hash exact donor/script/outputs, trace reused donor JSON/binary blocks (especially skin and animation), compare geometry/material/units/axes/clip data with the asset contract and verified CC BY 4.0 notice, and save an evidence JSON under /tmp for Root review. Do not regenerate, package, promote, or edit model/source assets; propose only the minimum required provenance packet.

### Specific Code Changes & Locations

1. **Runtime 3D Model Registry & Scaling (`src/rendering/scene/aquarium.ts` lines 25–41 & `src/rendering/scene/fish-scale.ts` lines 12–49)**:
   - `modelUrls` binds all 15 roster species to rigged 3D `.glb` assets (`candidate-real-clown.glb`, `candidate-real-tang.glb`, the 4 Blender code-driven models in `src/rendering/assets/fish/fish-*.glb`, and the 9 code-driven 3D models in `src/rendering/assets/splat-fish/*.glb`).
   - `fishModelScale(speciesId)` scales each cloned `GLTF.scene` in `rebuildFish()` (`aquarium.ts` line 284) so its bind-space `+Z` extent equals `fishRenderLength(speciesId)`.
2. **Clean Pose Restore & Post-Mixer Spine/Pectoral Overlay (`src/rendering/scene/fish-animation.ts`, `src/rendering/scene/fish-turning.ts`, & `src/rendering/scene/aquarium.ts` lines 322–335)**:
   - In `render()`, each non-stopped simulation substep advances `stepSwimmingFish(item.motion, habitat, SIMULATION_STEP_SECONDS, stopped)`, updates the `AnimationMixer` with gait-modulated playback rate `SIMULATION_STEP_SECONDS * (0.55 + Math.min(1.7, item.motion.speed * 2.2)) * item.motion.animationPlaybackRate`, and applies `applyFishTurningRigOverlay(item.turningRig, item.motion.turnKinematics, stopped)`.
3. **Pre-Promotion Provenance & Buffer Cleanup for Code-Driven Splat-Fish GLBs (`scripts/build-splat-fish-glbs.mjs`, `packageSinglePrimitiveGlb()`)**:
   - Strip unreferenced donor primitive 1 accessors (`6..11`) and bufferViews (`9..14`) so only donor skin `inverseBindMatrices` (accessor 12 / bv 15) and animation keyframes (accessors `13..32` / bvs `16..35`) are retained.
   - Stamp `rootNode.extras.reefAsset` with `schema: 'reef-asset-v1'`, `units: 'meter'`, `upAxis: '+Y'`, and explicit CC BY 4.0 attribution for the donor rig/clip (`zixisun02`, Sketchfab `47ba2679d91a4f14b3fc0bf8e3805af5`).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 Root preservation audit: current uncommitted nine splat-fish GLBs/script and13modelURL/axis additions are preserved and excluded from reviewed commits. No per-asset manifest/notices accompany the nine-file folder at this checkpoint; generator references candidate-real-clown.glb as a donor. Before any production promotion, document exactly which donor data is reused and carry applicable derivative attribution/provenance plus objective source/art/rig validation. Finite player-load compatibility cannot establish license/art/realistic-animation acceptance. Do not replace or regenerate these supplied candidates from Codex.

2026-11-05 @thumbnail_loading started Root-assigned AQ-12 read-only provenance audit of current untracked splat-fish outputs. Scope is provenance/technical inventory only; no source, asset, packaging, promotion, or acceptance changes.

2026-11-05 @thumbnail_loading read-only AQ-12 candidate provenance audit complete. Objective evidence packet: `/tmp/aq12-splat-fish-provenance-audit-20261105.json`, SHA-256 `2cf1b297c751a033dc17b46745d34881ebe120edfd3c6559d3a2b42736cdb88a`. Confirmed all nine outputs copied donor clown skeleton/animation data and the previous second primitive payload, while replacing primary mesh and all imagery/materials. Source reference hashes/licenses for the Gaussian-splat inputs remain unpinned. No repository files/assets changed, ACs unchecked, no promotion.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @root
created: 2026-11-03T04:47:00Z
---
New follow-ups: AQ-34 tracks true 3D reef depth/occlusion; AQ-35 tracks typed per-species behavior profiles across the 15-species roster; AQ-36 tracks a separate animation-reference review. AQ-12 status, assignee, and plan are unchanged.
---

author: @root
created: 2026-11-03T12:39:00Z
---
The reviewed behavior brief at docs/fish-behavior-design.md separates per-instance behavior state from species profiles and fish deformation/animation. Use it as guidance for AQ-12's shared swimming behavior; state runtime and anchor interaction work are tracked separately in AQ-44/AQ-45.
---

author: @behavior-profiles
created: 2026-11-05 14:15
---
2026-11-05 bounded read-only visual packet rendered in `/tmp/aq12-fish-review-20261105/` using Blender 5.0.1 glTF import/Eevee. Exact supplied starter GLBs hash-pinned and checked against embedded `reef-asset-v1` units=meter, upAxis=+Y, with source swim axis +Z: clown `af02b28c…48fad29f` (.107098m +Z → explicit 3in/.0762m adult target); yellow tang `a1a1ae02…26d815d2` (.144611m → 6.5in/.1651m); blue tang `41eabfb7…fc60ba4` (.152686m → 9in/.2286m); royal gramma `1d629137…57d2e87d` (.082187m → 2.75in/.06985m); Banggai `f927e8f1…dcab1fe` (.082699m → 2.75in/.06985m). Each uses one uniform target/source +Z scale and active clip frames 1/25 (0s/1s), side and oblique with matched neutral studio lighting. Full hashes, actual bounds, scales, action names and selected-time pose deltas are in `source-and-scale-evidence.json`; the row/column index and visual findings are in `review-notes.md`; contact sheets are `starter-contact-sheet.png` and `old-active-compare-sheet.png`.
---

author: @behavior-profiles
created: 2026-11-05 14:15
---
Read-only visual findings: canonical yellow tang is more diamond-shaped with taller/rayed dorsal and anal sails than the rounder old active candidate; blue tang's palette marking and yellow tail are clear; gramma is compact purple-to-yellow; Banggai's black bars, high banners, forked tail and spotted rays read clearly; clown's bands and fins are clear. At frame 1→25 (0→1s), posterior spine changes are visible but generally modest; full-loop samples show largest single-spine deltas from frame 1 of .260rad clown, .193rad yellow tang, .209rad blue tang, .249rad gramma, .137rad Banggai, while pectoral deltas peak earlier (.421/.573/.543/.421/.497rad respectively). Old active clown/tang show larger max bone rotation deltas than canonical at the selected interval (.429 vs .260rad; .264 vs .184rad). These are isolated clip pose comparisons only, not propulsion/photorealism/reef-lighting or anatomical acceptance. Assets remain candidates. No scene/assets were edited and no AQ12/AQ60 criteria were checked.
---

author: thumbnail_loading
created: 2026-11-05 23:28
---
2026-11-05 read-only provenance audit of nine untracked splat-fish outputs: `/tmp/aq12-splat-fish-provenance-audit-20261105.json` (SHA-256 `2cf1b297c751a033dc17b46745d34881ebe120edfd3c6559d3a2b42736cdb88a`). Generator SHA-256 `2c5630be191068366b2dfde160bd13e41f88b8406255214ebcc0a45eb7a9d946`; donor `candidate-real-clown.glb` SHA-256 `9beebbfe33e9e4459702e1aba6ad2df6f7309aca854f3bb5d1b88a36ca9444a6`; donor notice SHA-256 `c22474620923c52af00a2093394d4a9bba6bfd0639791ef368efe54055892704`. The notice identifies Sketchfab creator zixisun02, source model `https://sketchfab.com/3d-models/47ba2679d91a4f14b3fc0bf8e3805af5`, CC BY 4.0, and source asset SHA `fe29d2a82a62bd5a92d2669332c7a157810d063972a5124f7ccada6d998af547`. The indexed official Sketchfab result confirmed creator/license; direct page/API requests were unavailable (403), so no additional source-page detail is claimed.

Code path inspection plus all-nine GLB JSON/binary comparison confirms the generator replaces donor primitive 0 with freshly generated mesh attributes/indices and replaces donor images/textures/materials with generated per-species 512×512 PNG/PBR material. It preserves donor scene/nodes/skin (8 joints `spine_0..spine_5`, `pectoral_L/R`), inverse bind matrices, full 24-channel `Experimental swim` animation (17 STEP, 7 LINEAR; 49-key timelines spanning 0.0417–2.0417s plus two-key channels), accessor tail, extensions, and donor binary bufferViews 9+. These copied rig/animation data are derivative donor content, not project-original claims. Donor second primitive/accessors 6–11 and views 9–14 also remain byte-copied but unreferenced after the primitive list is replaced. Donor texture payloads/views 6–8 are replaced. Script cites Gaussian-splat references and roster but the reviewed generator header does not pin reference hashes or licenses; that provenance remains unresolved.

The outputs have one generated primitive, 4,272 or 4,440 vertices, normalized Z bounds `[-1,+1]` (2.0 model units), positive Y-up by generator convention, and no `reefAsset` metadata or meter declaration; they do not currently establish the `reef-asset-v1` meter contract. Nine output bytes/SHA256 and per-output equality results are in the JSON packet. Minimum pre-promotion packet: exact source/license/creator/source hash and visible CC-BY attribution + modification statement; generator revision/hash, command and donor hash; explicit per-component provenance separating generated mesh/texture from copied donor rig/clip/IBMs; hashes/licenses for each cited splat reference (or evidence it was not used as a source); axis/units/bounds and skin/clip inventory; plus separate source, rig, visual, and runtime acceptance evidence. No files in the repository were edited by this audit; no AC checked and no asset promoted.
---

author: @root
created: 2026-11-06 02:40
---
Photorealism audit 2026-11-05 (AQ-70): AC #3 (fish integrate with lighting, shading and depth) depends on AQ-70.8 (fish runtime materials) and AQ-70.9/AQ-70.10 (photoreal fish assets). The baseline blue tang reads as a vector cartoon regardless of motion quality.
---
<!-- COMMENTS:END -->
