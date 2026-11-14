---
id: AQ-53
title: Align supplied soft-coral flexibility masks with the runtime contract
status: Done
assignee:
  - '@gemini'
  - '@asset-validation'
created_date: '2026-11-04 19:05'
updated_date: '2026-11-05 23:47'
labels:
  - modeling
dependencies:
  - AQ-40
references:
  - AQ-42
  - src/rendering/modeling/build_euphyllia_torch.py
  - src/rendering/modeling/build_euphyllia_hammer.py
  - src/rendering/modeling/build_bubble_tip_anemone.py
  - docs/asset-evidence/aq57/README.md
documentation:
  - docs/asset-contract.md
priority: high
type: bug
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Read-only preflight found torch, hammer and anemone crowns authored with COLOR_0.R=h^1.8 while coral-raw-masks-v1 requires raw height and applies pow(R,1.8) once at runtime. Consuming these exports as declared would apply the exponent twice and distort flow response. Recheck latest Gemini exports before acting; preserve visual design and coordinate mask encoding with the Codex renderer adapter.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Exported mask encoding and declared contract agree, with the flexibility exponent applied exactly once across authoring and runtime.
- [x] #2 Rigid skeleton and pinned bases retain zero flexibility; masks remain finite, in range and matched to exported POSITION counts after quantization.
- [x] #3 Updated hashes, provenance and reproducible mask inspection identify the encoding consumed by the renderer without using mask RGB or AO alpha as display color or opacity.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect all 8 coral generators in src/rendering/modeling/build_*.py and verify COLOR_0 raw mask authoring against docs/asset-contract.md (coral-raw-masks-v1).
2. Remove the pre-baked h^1.8 exponent from COLOR_0.R in build_euphyllia_torch.py, build_euphyllia_hammer.py, and build_bubble_tip_anemone.py so exported COLOR_0.R stores raw normalized height h in [0, 1] (0.0 at pinned tentacle/column bases, 1.0 at distal tips) and the runtime shader applies pow(R, 1.8) exactly once.
3. Switch COLOR_0 attribute creation from BYTE_COLOR to FLOAT_COLOR across all 8 coral generators so Blender stores linear float masks directly without intermediate 8-bit quantization before glTF export.
4. Update decodeColor0Values in src/rendering/modeling/package_modular_corals.mjs to read raw exported COLOR_0 values without silently forcing rigid R to zero or clamping out-of-range values, and fail closed if any rigid vertex has R != 0 or any channel is non-finite or out of [0, 1].
5. Rebuild all 8 coral GLBs in Blender 5.0.1 (--threads 4 -b), run independent GLB binary attribute verification and validateAssetContract, and record updated SHA-256 hashes and mask statistics.

2026-11-04 independent completion review: decode actual GLB COLOR_0/POSITION arrays independently of packager, compare exact values to inspection records and source mask construction, verify counts/ranges/rigid zeros/pinned bases and source hashes; record quantization-aware linear-height evidence and identify renderer integration boundary. No generator or asset edits.

Independent pinned-base evidence: match actual exported indexed triangles by source proximal-cap UV signatures and verify R=0 without selecting by height or mask values; compare crown R values to literal generator h_stations within half normalized-U16 quantization. Document reproduction and preserve runtime exponent/adapter acceptance as a separate open criterion.

Root review iteration: add a local standalone WebGL raw-mask proof loading exact supplied torch, brain and rigid staghorn; compile surface and shadow-depth materials with actual COLOR_0 masks, compare deterministic render frames for motion and pause/reduced-motion, inspect at the two required viewports. Keep main scene/art acceptance separate and preserve supplied assets.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-04 (@gemini):
- Removed pre-baked h^1.8 exponent from COLOR_0.R in src/rendering/modeling/build_euphyllia_torch.py, src/rendering/modeling/build_euphyllia_hammer.py, and src/rendering/modeling/build_bubble_tip_anemone.py so exported COLOR_0.R stores raw linear normalized height h in [0, 1] and the runtime shader applies pow(R, 1.8) once.
- Switched COLOR_0 attribute creation from BYTE_COLOR to FLOAT_COLOR across all 8 coral generators (build_euphyllia_torch.py, build_euphyllia_hammer.py, build_bubble_tip_anemone.py, build_brain_coral.py, build_zoanthid_mat.py, build_acropora_table.py, build_acropora_staghorn.py, build_montipora_plate.py).
- Updated decodeColor0Values in src/rendering/modeling/package_modular_corals.mjs per Root Comment #1 so it reads raw exported COLOR_0 values without forcing rigid R to zero or clamping out-of-range values, and fails closed if any coral-rigid vertex has R !== 0 or any channel is outside [0, 1].
- Rebuilt all 8 coral GLBs in Blender 5.0.1 (--threads 4 -b) and verified exported COLOR_0 accessors and SHA-256 digests:
  * coral-euphyllia-torch.glb (sha256: e267292425df202d816b5f8a93336e2e5255962a87116f9cc8fd680ac260c022): euphyllia_polyp_crown (coral-soft, 16160 verts, R=[0.0000, 1.0000] linear s_frac=[0, 0.2, 0.44, 0.66, 0.78, 0.84, 0.9, 0.955, 0.988, 1]), euphyllia_skeleton (coral-rigid, 2037 verts, R=[0.0000, 0.0000]).
  * coral-euphyllia-hammer.glb (sha256: 6e1974d5f72ec3a898d84f559a5d4397a6002d8534387c47697452d6c2157fc8): euphyllia_hammer_polyp_crown (coral-soft, 15232 verts, R=[0.0000, 1.0000] linear s_frac=[0, 0.24, 0.5, 0.72, 0.8, 0.86, 0.92, 0.975, 1]), euphyllia_hammer_skeleton (coral-rigid, 1538 verts, R=[0.0000, 0.0000]).
  * coral-anemone-bta.glb (sha256: f587bdc3e94a75cefff1424abb250325d87f057cc9676daabfaef565bd6e81ef): anemone_column_disc (coral-soft, 376 verts, R=[0.0000, 0.1400]), anemone_tentacle_crown (coral-soft, 10452 verts, R=[0.0000, 1.0000] linear s_frac=[0, 0.2, 0.42, 0.58, 0.67, 0.73, 0.78, 0.83, 0.88, 0.94, 0.985, 1]).
  * coral-acropora-table.glb (sha256: ad4c0f5d74fe4efe06f0faa7d57af4e61d8756952b63a54d6424675c9face10d): acropora_table_colony (coral-rigid, 26665 verts, R=[0.0000, 0.0000]).
  * coral-acropora-staghorn.glb (sha256: 629781835efee49bea46f109cfdeeef0ba434d94a8dc3bf33d769eb31f99c0ea): acropora_staghorn_colony (coral-rigid, 18693 verts, R=[0.0000, 0.0000]).
  * coral-montipora-plate.glb (sha256: 87f4e1052e44f29b27b948f9c9f45cae42855c1948fdf8ee519ea7c70ae21252): montipora_plate_colony (coral-rigid, 2830 verts, R=[0.0000, 0.0000]).
  * coral-brain-diploria.glb (sha256: 904f471bb1a1094004b04294c4166ff309487f3333cea82e6105bf96ca1f100d): diploria_brain_colony (coral-soft, 6609 verts, R=[0.0000, 0.0450]).
  * coral-zoanthid-mat.glb (sha256: a60d91258fcf9a64d43a628dbe0f4027a91a1fce73104153d7f3ea424cc2463d): zoanthid_button_cluster (coral-soft, 10543 verts, R=[0.0000, 0.6500]).

Root AQ57 audit: preserve useful FLOAT_COLOR/raw-linear h export fixes and removal of report clamping/rigid overrides. Independent worker reports all eight actual exported arrays match inspection records, finite masks/counts/rigid zeros and current generator hashes. Renderer consumption is currently absent after runtime reversion; AC1 across authoring and runtime is reopened until an adapter is reviewed. Asset supply is not main-scene approval.

Independent AQ57 raw-mask evidence completion (2026-11-04): all8 current coral GLB/generator hashes match pinned audit report, actual decoded normalized-U16 COLOR_0 arrays match POSITION counts and inspection arrays exactly, all values finite[0,1], all5 rigid primitives R==0. Proximal bases selected by exported index triangles and source UV construction, not by R or minimumY: torch1280 cap triangles/1600 cap vertices,hammer1360/1632,anemone crown780/936,column40/44,zoanthid mat+19polyp roots948/1028,brain112/336; all selected R exactly0. Crown h0 side/cap-center rows also R0. Exported crown R levels match literal generator h_stations within half U16 quantization: max7.629511e-6 torch/hammer,6.866560e-6 anemone. Full reproducible cap/height-check snippet and per-primitive/source evidence in docs/asset-evidence/aq57/README.md; current hashes preserved in independent-asset-report.json/source-hashes.json. A curled distal torch tip can be the lowest point, so prior minimumY diagnostic is not a pinning test. No authoring exponent is baked into crown masks; actual runtime adapter/exponent/depth/shadow consistency remains unimplemented after reversion, so AC1 stays open. Mask RGB/AO alpha are documented scalar inputs, not approved display color/opacity. No assets/generators/packager/runtime changed.

Additional per-vertex check passes: all16160 torch crown,15232 hammer crown and10452 anemone crown exported vertices match their independently UV-identified source h values (including source-specific proximal/distal cap UV exceptions), within half U16 quantization; this is stronger than checking only distinct R levels. Both README Python reproduction snippets executed successfully; all25 pinned GLB/generator files remain unchanged. Root review and AC1 runtime boundary remain open.

Root leaves AC1 reopened pending actual GPU surface/depth consumption evidence after fixing conditional depth-shader scope. Authoring/raw-mask binary evidence and focused CPU/template tests remain valid. Prior all-checked state was not Root-finalized.

Root final verification2026-11-05: independently decoded all8 current coral GLBs, exact inspection masks and POSITION counts, finite[0,1] channels, all rigid R=0, and matching generator provenance hashes. Re-ran indexed-cap/linear-height reproduction: all six proximal selections R0 and all crown vertices linear within halfU16 quantum. Root and independent reviewer each pass6 coral-material tests using actual Three standard/depth templates; the same single pow(rawR,1.8) displacement path serves both. Actual standalone GPU proof compiles12programs and all four temporal comparisons pass at1440x900 and402x874 DPR1. Report/signed source hashes and exact PNGs: docs/asset-evidence/aq53/review.json. Pixel hashes are functional, not numeric exponent or isolated-shadow measurement. Production displaced culling/final art/assembly remain separate AQ42/AQ14.4 scope.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: root
created: 2026-11-04 19:23
---
Additional functional review note for acceptance evidence: package_modular_corals.mjs decodeColor0Values currently forces rigid R to zero in the inspection array and clamps/rounds channels without altering or re-reading actual exported values. Current independently read rigid values were zero, so this is not evidence that current rigid assets are wrong. When verifying AC2, inspect actual GLB attributes rather than trusting sanitized report arrays; do not let the report hide invalid future exports.
---

author: @asset-validation
created: 2026-11-05 03:23
---
Raw export evidence ready for Root; AC2/3 supported by independent binary/source/index checks. AC1 intentionally remains open until renderer consumption is reviewed.
---

author: root
created: 2026-11-05 14:20
---
Root found an actual depth-shader defect in the supplied adapter: coral sway declarations were injected at beginnormal_vertex, which Three depth.glsl wraps in USE_DISPLACEMENTMAP, while the adapter supplies no displacementMap. begin_vertex therefore referenced missing coralSway/coralFlex variables in shadow rendering. Moved shared calculations into main() before conditional chunks; surface-only normal adjustment remains at beginnormal_vertex. Replaced simplified mock templates in regression with actual Three standard/depth ShaderLib templates and verifies declaration scope. Five focused tests/typecheck pass. Added standalone exact-source GPU proof with surface/shadow materials and deterministic motion/pause/reduced/rigid pixel comparisons; native browser connection interrupted before GPU evidence, so no GPU success or final acceptance claimed.
---

author: @Luna
created: 2026-11-05 23:45
---
Independent read-only AQ-53 runtime-mask review (2026-11-05):

- Reproduced the focused CPU regression: `npm exec vitest -- run --maxWorkers=2 src/rendering/scene/coral-material.test.ts` — 1 file, 6 tests passed (432 ms). It checks the soft `R^1.8` CPU reference at R=.5/.44, rigid zero, pause/reduced motion, all 8 inspection records, raw RGBA is not used as display RGB/opacity, and shader injection against the installed Three `ShaderLib.standard` and `ShaderLib.depth` templates.
- Source semantics agree with coral-raw-masks-v1. The adapter reads `color.r` as raw/clamped R and has one `pow(coralRawR, 1.8)` in its shared vertex-injection path. It sets vertexColors=false, transparent=false, opacity=1; writes fragment alpha=1; and uses COLOR_0.a only for contact AO. The same begin-main declaration and begin_vertex displacement are injected into surface and depth shaders; only surface gets the approximate normal adjustment, and the depth branch returns before fragment edits. Moving shared declarations ahead of the depth template's conditional displacement-map normal block addresses the previously reported missing-variable compile defect. The test asserts one surface occurrence and checks the depth occurrence/placement; because both call the same injector, the depth path also receives that single expression.
- Recommendation on the probe question: a separate GPU numerical readback of R^1.8 is not necessary to establish AC #1's exact-once contract. The raw-mask export evidence plus the single shared source expression, CPU reference checks, actual Three-template mutation test, and real GPU compile/render establish the formula and its use. The existing pixel comparisons must not be described as numerical exponent validation; they test temporal behavior only. A numeric GPU probe would be appropriate only if claiming GPU-evaluated values match the CPU curve within an error tolerance.
- Root's two-viewport run is present in `/tmp/aq53-root-browser-20261105.json`. Both 1440x900 and 402x874 at DPR 1 report exact source hashes for torch/brain/staghorn, 12 compiled programs, `motionChangesPixels=true`, `pauseStable=true`, `reducedMotionStable=true`, `rigidStable=true`, and the same fixed 480x320 target hashes. Exact source hashes match the current GLBs. Reproduction: `npm exec vite -- --config /tmp/aq53-specific-vite.config.mjs --host 127.0.0.1 --port 5197 --strictPort`, open `http://127.0.0.1:5197/coral-mask-study.html`, wait for “Surface and shadow materials ready”, click “Run GPU comparisons”, then read the JSON from `output[role=status]`. Repeat at the two task viewports. The report is a hash-based functional comparison, not a numeric probe or a depth-only pixel assertion.
- Hashes reviewed: coral-material.ts `bf5f5162…`; coral-material.test.ts `9142ffc8…`; coral-mask-study.ts `41416820…`; study HTML `648defec…`; Three ShaderLib.js `6e7bd913…`; exact study GLBs torch `e2672924…`, brain `904f471b…`, staghorn `62978183…`. Focused checks and Root browser evidence agree with these exact sources.

Remaining scope: the standalone page disables frustum culling, while production reef assembly installs the material/depth pair without expanding displaced geometry bounds; bounds/culling and visual normal quality still need separate acceptance. The phone screenshot crops the isolated specimens at the sides; this is not full-scene responsive or art acceptance. I made no source edits and did not check acceptance criteria or change task status; Root retains the final AC decision.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Root accepted raw-mask export/runtime agreement after eight exact binary and source-height checks, shared actual-template/CPU tests, independent review and native GPU surface/shadow proof at both target sizes. All3criteria verified. No models/generators modified; art and assembled-scene gates remain open.
<!-- SECTION:FINAL_SUMMARY:END -->
