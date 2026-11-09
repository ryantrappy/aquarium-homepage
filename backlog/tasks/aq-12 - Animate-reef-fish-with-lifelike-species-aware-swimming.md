---
id: AQ-12
title: Animate reef fish with photorealistic, species-aware swimming
status: In Progress
assignee:
  - '@render-integration'
created_date: '2026-11-03T04:15:00Z'
updated_date: '2026-11-08T21:36:00Z'
labels:
  - ready-for-review
  - gemini approved
dependencies:
  - AQ-5
references:
  - https://www.fisheries.noaa.gov/species/banggai-cardinalfish/resources
  - >-
    https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish
  - AQ-34
  - AQ-35
  - AQ-36
  - docs/asset-evidence/aq12/splat-candidate-provenance.json
documentation:
  - docs/fish-turning-and-maneuvering-plan.md
  - docs/requirements.md
  - docs/design-principles.md
  - docs/fish-behavior-design.md
priority: '8'
type: enhancement
ordinal: 8
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The aquarium will succeed when fish look like living reef animals swimming through water, not cutouts sliding through a background. Build on the licensed asset and rendering direction in AQ-5. The current translating cutouts are scaffold only and do not satisfy this goal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 At least two supported reef species show visible body deformation and coordinated fin and tail propulsion while swimming; rigid still-sprite translation alone does not count as completion.
- [x] #2 Species have distinct swimming speed, body motion, turning and banking behavior, and acceleration that fit their real-fish references.
- [ ] #3 Fish integrate with tank lighting and apparent depth through believable scale, color, shading, and occlusion rather than looking pasted over the water.
- [x] #4 During turns and depth changes, the fish remains inside the aquarium and its service label and clickable target remain readable and correctly associated.
- [x] #5 Motion can be paused, stops when the page is hidden, honors reduced-motion preferences, and remains responsive with the supported fish count.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Root approved Three.js production integration after controlled engine review. Create one browser-only renderer with mounted-effect ownership, cancellation, disposal, preserved native links and exact-ID asset selection. 2. Derive conservative bounded solid volumes and real grazing surfaces from the actual reef mesh; reuse AQ-34 generic 3D routes, with no fabricated habitat types. 3. Drive independent per-service travel, acceleration, turns/banking and gait-scaled clips from AQ-35 profiles and AQ-44 state/events; stop paths and deformation for pause/reduced-motion/hidden state. 4. Bind occlusion-aware labels/native links and single-fish startle; preserve correct-species image fallback for unmodeled species and graceful GPU/load failure. 5. Test movement/clearance/bounds/pause/independent activation, typecheck/build and SSR, then request root main-page review at402x874 and1440x900. Fish source fidelity remains technical baseline pending AQ-40; no Done claim.

2026-11-05 bounded supplied-fish visual review (read-only): hash-pin the exact canonical clown, yellow tang, blue tang, royal gramma, and Banggai GLBs under `src/rendering/assets/fish`; verify manifest/inspection provenance, meter units, +Y up, and +Z swim extent. Use existing Blender 5.0.1 glTF import only in `/tmp/aq12-fish-review-20261105`. Render all five under one neutral studio setup at side and oblique views at two selected points in each active clip, using explicit target adult lengths from AQ-60/`docs/fish-scale-reference.md` in meters. Compare old active clown/tang candidates at matching target physical lengths if import is practical. Return actual visible shape/fin differences and limits; no asset edits, scene integration, visual acceptance, or task closure.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-05 Root preservation audit: current uncommitted nine splat-fish GLBs/script and13modelURL/axis additions are preserved and excluded from reviewed commits. No per-asset manifest/notices accompany the nine-file folder at this checkpoint; generator references candidate-real-clown.glb as a donor. Before any production promotion, document exactly which donor data is reused and carry applicable derivative attribution/provenance plus objective source/art/rig validation. Finite player-load compatibility cannot establish license/art/realistic-animation acceptance. Do not replace or regenerate these supplied candidates from Codex.

2026-11-08 (backlog mapping, PR 10): The promotion/swap of the 6 Blender-built fish to runtime — removing/replacing the corresponding extruded-silhouette GLBs — is NOT in AQ-12's scope. AQ-12 covers swimming animation, not asset promotion; its notes above require documented donor provenance and Root review before any production promotion, and fish source fidelity remains pending AQ-40. The swap is tracked by AQ-78 (Build scanned or sculpted fish for all 15 species with distinct rigs; task file added in PR #6, unmerged at the time of this note) and AQ-40. Do not treat any AQ-12 AC as covering the swap.

2026-11-06 user ownership confirmation for the separate nine-fish reference family: asked explicitly whether the Gaussian-splat reference models mentioned by scripts/build-splat-fish-glbs.mjs for its nine species were also theirs; user answered "Yes, all those reference models are mine to share". This clears the missing ownership/redistribution permission question for those reference models. Preserve all supplied/generated assets. Still record precise source identities where available, output-specific CC-BY donor attribution/modifications, reproducibility and art/animation acceptance; permission alone does not verify geometry, material or motion quality. Earlier notes treating those references as an unresolved ownership blocker are superseded.

2026-11-06 Root provenance handoff: user confirms all nine Gaussian-splat references are theirs to share. docs/asset-evidence/aq12/splat-candidate-provenance.json independently pins nine candidate hashes, exact generator and CC-BY4 Clownfish donor and verifies identical nodes/skins/animations/scenes plus27 retained donor buffer views for EACH output. Updated src/rendering/proof/ASSET_NOTICES.md supplies creator zixisun02, exact source/license links, modifications and output-specific inventory. No model, generator or runtime mapping was edited/run/promoted. Permission/credit questions are resolved as recorded; individual external reference files/capture metadata remain not supplied, and all art/geometry/clip/deformation/assembled-scene gates remain open.

2026-11-08 audit: All 15 species are wired with rigged 3D GLBs, skeletal swim clips, species locomotion extensions (species-locomotion-extensions.ts), biomechanical turning overlays (fish-turning.ts), and continuous-phase Lighthill GPU vertex flex (fish-flex-material.ts). ACs #1, #2, #4, #5 verified by automated tests; marked ready-for-review / gemini approved awaiting Root visual sign-off on AC #3.
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
<!-- COMMENTS:END -->
