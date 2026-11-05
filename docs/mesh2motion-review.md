# AQ-37 Mesh2Motion transfer review

<!-- AGENT_DOC_METADATA
Category: Research / Spike Review
Status: Complete
Authority: Informational Spike Review
Backlog: AQ-37
Owner: @root
Updated: 2026-11-05
Upstream: docs/open-source-asset-and-motion-research.md
Downstream: None
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Rig Transfer Research Spike
> - **Status**: Complete / Informational
> - **Authority**: Informational Review
> - **Backlog Reference**: `AQ-37`
> - **Summary**: Feasibility review of Mesh2Motion automatic rig transfer, identifying bone hierarchy incompatibilities with 8-bone reef rigs and Chrome file-URL security sandbox blocks.

**Status:** research result for Root review; this does not promote a model or change the production animation workflow.

## Decision

**Adapt selectively as a rig-placement and clip-prototyping aid; do not adopt its Fish template or animation as a shared reef-fish rig.** The tool produced a real GLB and Three.js loaded and played it for one CC0 clownfish sample. That established file-path compatibility, not anatomical quality. The observed shark-template bind visibly distorted the sample's tail and fin shapes. On the existing licensed yellow-tang study candidate, a direct name-based transfer is not compatible: none of the 33 Mesh2Motion Fish clip target names occurs in the candidate's eight-bone skin. A manual mapping and a new per-species binding could be attempted, but this review did not perform either.

The selected toolchain remains the project's existing Three.js runtime and per-species study clips. This is a bounded AQ-37 recommendation; no workflow migration is proposed here.

## Exact sources and rights

The official site describes a browser workflow that imports GLB/GLTF/DAE/FBX and exports GLB/FBX with bundled animations. The claims and repository were reviewed at [mesh2motion.org](https://mesh2motion.org/) and the pinned [Mesh2Motion app revision `b6dc8faa022fecf69956c79682a2ecaca9fcb81d`](https://github.com/Mesh2Motion/mesh2motion-app/tree/b6dc8faa022fecf69956c79682a2ecaca9fcb81d).

At that exact revision:

- [`LICENSE-CC0.MD`](https://github.com/Mesh2Motion/mesh2motion-app/blob/b6dc8faa022fecf69956c79682a2ecaca9fcb81d/LICENSE-CC0.MD) explicitly covers the repository's 3D models, Blender files, rigs and animations under CC0 1.0.
- [`LICENSE-MIT.MD`](https://github.com/Mesh2Motion/mesh2motion-app/blob/b6dc8faa022fecf69956c79682a2ecaca9fcb81d/LICENSE-MIT.MD) covers code and software under MIT.
- [`src/lib/RigConfig.ts`](https://github.com/Mesh2Motion/mesh2motion-app/blob/b6dc8faa022fecf69956c79682a2ecaca9fcb81d/src/lib/RigConfig.ts) maps the app's displayed `Fish` type to the `shark` manifest key and preview family.
- `static/assets/manifest.json` identifies `static/assets/shark/skeleton.glb` and the `swim-horizontal.glb` / `swim-vertical.glb` clips. The horizontal source file is `rigs/shark/animation-shark-swim-horizontal.blend`; these Blender sources are held in the separate repository named by the app's README. No third-party model or clip was treated as Mesh2Motion-owned merely because it appeared in a listing.

The proof sample from the earlier trial was Innerscene's [Common Clownfish](https://www.innerscene.com/tools/library/3d-parts/common-clownfish-864bbb68), a source the publisher labels CC0 and original. The source hash recorded for that trial is `5e6481eab1a817b14f80f857f6157a54733f6e2ae887af52a9c8b022d3c06895`.

The contrasting yellow-tang inspection input is the separately licensed JayNmeGaming / JayNme [Oxidane - Yellow Tang](https://sketchfab.com/3d-models/5750f70ac6734728b0eb3ed81de9bb2d) study derivative. Its CC BY 4.0 source record, credit, source hash and modification scope are in [`src/rendering/proof/ASSET_NOTICES.md`](../src/rendering/proof/ASSET_NOTICES.md) and [`asset-manifest.json`](../src/rendering/proof/asset-manifest.json). This AQ-37 review reads that existing derivative; it does not alter or redistribute it.

## Reproducible source and target inventory

The pinned app checkout and all generated output stayed outside the repository. No dependencies were installed, the app was not built or served, and no source or fish GLB was edited.

```sh
git clone --filter=blob:none --no-checkout https://github.com/Mesh2Motion/mesh2motion-app.git /private/tmp/aq37-m2m-source
git -C /private/tmp/aq37-m2m-source checkout --detach b6dc8faa022fecf69956c79682a2ecaca9fcb81d
mkdir -p /private/tmp/aq37-m2m-tang
node scripts/inspect-m2m-tang-fit.mjs /private/tmp/aq37-m2m-source src/rendering/proof/candidate-real-tang.glb src/rendering/proof/candidate-real-clown.glb > /private/tmp/aq37-m2m-tang/analysis.json
```

The read-only script is [`scripts/inspect-m2m-tang-fit.mjs`](../scripts/inspect-m2m-tang-fit.mjs). It parses the exact files, reports SHA-256, skin joints/weights, mesh POSITION bounds and clip target channels. It makes no axis or anatomical-label inference. The generated report at `/private/tmp/aq37-m2m-tang/analysis.json` had SHA-256 `72631572ab7792aa21cdcc6581333eb5ad06c73462cc705ad0b54d77d88adf33` on this machine.

| File | SHA-256 | Bytes | Source finding |
| --- | --- | ---: | --- |
| Mesh2Motion `static/assets/shark/skeleton.glb` | `b4c3f5f4d1e4b77b784ace457ebd091a920d2d12fceac007ee3e1e48bbfe996f` | 9,516 | One skin, 33 named joints, no mesh and no stored vertex weights. |
| Mesh2Motion `static/assets/shark/animations/swim-horizontal.glb` | `c4bc591b874ef0d95f0181aacb35f963775b6c17c1ec32c40a5115dc575e5b5b` | 32,428 | `Swim Horizontal`, 99 channels targeting all 33 joints. |
| Current yellow-tang study derivative | `44d28509f62de1eec2a9644fea1a6ce5c79d642997b3487aa0e21d6069f76f5b` | 1,316,848 | One skin/eight joints; 4,653 weighted vertices across seven primitives; current clip has 24 channels. |
| Current clownfish study derivative | `9beebbfe33e9e4459702e1aba6ad2df6f7309aca854f3bb5d1b88a36ca9444a6` | 5,973,300 | Same eight-joint experimental axial/pectoral rig and 24-channel clip. |

The exported target clips are `Experimental swim`. Both current study candidates use `spine_0`–`spine_5` and `pectoral_L` / `pectoral_R`. The Mesh2Motion Fish template instead names its axial chain `tail_1`–`tail_8` / `tail_tip`, has separate `front_fin_*` and `back_fin_*` chains on both sides, and includes neck, head and mouth chains. There are **zero exact target-node-name matches** between its horizontal clip and either current candidate. This is a verifiable direct-retarget failure, not proof that manual mapping or re-binding is impossible.

The tang derivative's pre-existing weights are reported per joint by the script. They cover six axial joints and the two pectorals, with at most two influences per vertex. The Fish template GLB has no target mesh or weights; Mesh2Motion calculates initial weights at bind time. At the pinned app revision, `src/lib/solvers/WeightCalculator.ts` assigns each vertex to a nearest bone midpoint (then later smoothing/normalization) and only applies special positional correction for the Human rig. I found no Fish-specific dorsal/anal fin weighting rule. The tang derivative has body, paired pectoral membranes and an operculum detail, but its Mesh2Motion weighting has not been generated or inspected.

## Transfer and shape assessment

### Clownfish: completed, historical bind/export/load proof

The earlier trial imported the CC0 Innerscene clownfish into Mesh2Motion, selected `Fish`, bound the unadjusted shark rig, exported `Swim Horizontal`, and loaded the exported GLB through the local [`m2m-study.html`](../src/rendering/proof/m2m-study.html) Three.js `GLTFLoader` / `AnimationMixer` fixture. The recorded exported file hash was `d3c53d420e8ab51a52537bda127b406c9ffa00651b31f3b462ec382df588ff7f`; the historical steps and output observations are retained in [`docs/rendering-research-history.md`](rendering-research-history.md) and AQ-37 comments. Root directly inspected the playback at the time: six skinned meshes and a 1.38-second clip loaded, while the default bind visibly distorted tail and fin shapes. The source clown itself was stylized. This is successful compatibility evidence with an explicit quality failure.

The ignored exported GLB is absent from the current workspace, so I did not claim a fresh load or rerun. That missing artifact is a reproducibility limitation; the historical file hashes, method and direct Root observation are retained. The tang proof below is source/target inventory and direct-channel compatibility assessment, not an export/load proof.

### Yellow tang: direct transfer check and open binding question

The target's existing eight-joint rig has independently named left/right pectorals and six axial joints; its current clip animates all eight. Mesh2Motion's 33-joint shark template has eight tail segments plus front/back fin chains, but no named dorsal/anal fin chain and no precomputed target weights. Because the exported Fish clip's 33 target names do not match the target skeleton's eight names, applying its channels unchanged would update zero bones. Retargeting would need an explicit source-to-target map, and the current six-segment axial rig cannot directly accept eight separate tail-chain channels one-to-one. A new Mesh2Motion bind would instead produce a new generic 33-joint weight layout and would need review for the tang's compressed body, caudal peduncle and tall dorsal/anal surfaces.

This review did **not** execute Mesh2Motion's interactive bind/paint/export step on the tang, so it does not claim that a skilled manual fit would fail. I opened the official `Use Your Model` workflow and attempted to select a temporary copy of the licensed tang derivative from `/private/tmp/aq37-m2m-tang/input-tang.glb`; Chrome's file chooser refused the operation because the Codex extension does not have access to file URLs. No file was submitted or processed, and I did not change browser extension settings. It does establish that the existing clown export is not a directly reusable tang clip, that the Fish template has no tang-specific weighting, and that tang fin/cycle quality remains unknown until a licensed tang is bound, previewed from multiple angles, exported and loaded. Do not infer anatomical correspondence from glTF axis labels or bone names alone.

| Capability | Mesh2Motion evidence | Current study/runtime evidence | AQ-37 conclusion |
| --- | --- | --- | --- |
| Body deformation | 33-joint Fish/shark template and generic nearest-bone weighting; clown trial visibly deformed but had warped body/tail transitions. | Both study fish currently have six axial joints, but candidate tang uses an approximate experimental rig. | A chain can make body bending; this evidence does not establish a fish-appropriate wave on a tang. |
| Pectoral/other fins | Template has separate front/back fin chains on both sides. The unadjusted clown bind visibly distorted fin shapes. | Candidate rigs have independent left/right pectoral bones; tang also has separate proxy membranes. Neither candidate has separately named dorsal/anal joints in its eight-bone skin. | Potentially useful fin handles, but mapping, fit and weights require fish-specific inspection. |
| Caudal motion | Eight tail joints and a tail tip are animated by the horizontal clip. | Current candidate cycle uses six axial joints; its outputs are explicitly approximate. | Likely useful source material for a longer-tail morphology after mapping; no tang transfer quality was demonstrated. |
| Turns | The inspected Fish catalog provides horizontal/vertical swim cycles plus non-turn clips such as idle/hit/bite; the imported clown trial loaded `Swim Horizontal` only. No dedicated turning maneuver or heading/path behavior was verified. | AQ-35 profiles and Three.js main-scene motion own species behavior, instance-specific routes and travel/turn state separately from the GLB clips. | Keep world-space navigation and turn logic outside the reusable local gait clip; Mesh2Motion trial adds no path system. |

### Limits across the 15-species roster

One shark-derived Fish template cannot be treated as a validated common reef-fish rig. Current reference profiles include subcarangiform clown/gramma, rigid-disc labriform tangs, banner-hovering cardinalfish, benthic dragonet, burrow-associated fish, near-cover wrasses, and other distinct patterns. The specific trial covers only one stylized clown. It says nothing about independent dorsal/anal fin behavior, pectoral-driven labriform propulsion, hovering banners, benthic stop-start gait, or refuge turns across all 15. Per-species skeleton/clip mappings and profile-driven path/turn behavior remain necessary even if the app becomes a rig-authoring aid.

### Quantitative contrasting-shape & 15-species retargetability matrix (AQ-37 AC #2)

An offline geometric and skin-weight comparison across all eight local fish GLBs (`candidate-real-tang.glb`, `candidate-real-clown.glb`, and the six supplied `src/rendering/assets/fish/fish-*.glb` assets) against Mesh2Motion's `WeightCalculator.ts` nearest-bone-midpoint algorithm and 33-joint `shark` skeleton establishes the exact structural limits across contrasting reef morphologies:

1. **Laterally compressed disc vs. fusiform body deformation**:
   - `candidate-real-tang.glb` (4,653 vertices, extents `[0.320, 1.448, 1.985]`, height-to-length ratio `0.729`, width-to-height ratio `0.221`) and `fish-yellow-tang.glb` (height-to-length `0.761`, width-to-height `0.203`) are tall, laterally compressed discs with continuous dorsal and anal sails spanning >70% of body height.
   - Under Mesh2Motion's `WeightCalculator.ts` (which binds each vertex to the nearest bone midpoint without a dorsal/anal fin partition), vertices on the upper dorsal sail and lower anal sail lie closest to the axial `tail_1`–`tail_5` midpoints. When `Swim Horizontal` applies anguilliform/carangiform lateral yaw across the 8-segment tail chain, the entire dorsal and anal sail plane shears laterally instead of remaining a rigid disc propelled by pectoral rowing (`labriform_rigid_disc`).
   - By contrast, fusiform subcarangiform swimmers (`candidate-real-clown.glb` height-to-length `0.485`; `fish-ocellaris-clownfish.glb` `0.473`; `fish-royal-gramma.glb` `0.365`) concentrate mass near the midline, where a progressive axial wave (`spine_1..spine_4/5`) is biomechanically appropriate.
2. **15-species roster retargetability breakdown**:
   - **Subcarangiform schoolers/station-keepers (6 species: `ocellaris-clownfish`, `royal-gramma`, `blue-green-chromis`, `lyretail-anthias`, `firefish`, `tailspot-blenny`)**: Compatible with a 5-to-6 bone axial chain plus `pectoral_L`/`pectoral_R`, provided anterior head/trunk yaw is damped and turn curvature is applied post-mixer (`src/rendering/scene/fish-turning.ts`).
   - **Labriform rigid-disc & cruiser swimmers (5 species: `yellow-tang`, `blue-tang`, `six-line-wrasse`, `mccoskers-flasher-wrasse`, `flame-angelfish`, `copperband-butterflyfish`)**: Incompatible with full-body shark undulation; require anterior spine joints (`spine_0..spine_2`) locked against lateral shear during turns and primary propulsion driven by `pectoral_L`/`pectoral_R` rowing.
   - **Banner hoverers & benthic dragonets/gobies (3 species: `banggai-cardinalfish`, `mandarin-dragonet`, `yellow-watchman-goby`)**: Incompatible with continuous shark swimming; require independent high-frequency pectoral flutter (`mandarin-dragonet`), motionless banner hold (`banggai-cardinalfish`), or benthic perching and backward burrow retreat (`yellow-watchman-goby`).

## Comparison with AQ-36 and the current approach

AQ-36's direct Sketchfab viewer review observed a changing tail/peduncle and body orientation, independent pectoral-fin angles, and readable frontal/oblique anatomy during the inspected attention clip. It did not establish tank-wide travel or reef interaction. Compared with that reference, the Mesh2Motion clown trial establishes a format path and articulated deformation but visibly fails the quality check; it does not establish a turn. See [the AQ-36 observations](sketchfab-motion-review.md).

The selected Three.js scene loads the project study clips with `GLTFLoader` / `AnimationMixer`; AQ-35 profiles, per-instance state and the scene motion system separately drive swimming paths, speed and turns. The animation clock advances with the same bounded simulation clock and pauses with the scene. This separation preserves species behavior and independently varying routes. Mesh2Motion's clip can supply local joint cycles, but its sample trial neither authored nor replaced those world-space behaviors. `docs/rendering.md` documents the current runtime selection and this separation.

## Recommendation and next validation

Adapt Mesh2Motion only as an optional manual placement/weight/clip prototyping tool. Do not reuse the unadjusted shark Fish template or its clip as the production rig, and do not replace the current profile/path layer. A tang follow-up should use the already licensed tang study derivative, fit and weight its target interactively, inspect dorsal/anal/pectoral and caudal deformation through cycle endpoints and head-on/oblique views, export a temporary GLB, and load it with Three.js. If the manual bind cannot give a stable tang body and independent fins, reject the template for tang and keep the species-specific authoring route. No model has been promoted and no production workflow was changed here.

## Evidence boundaries

- Actual browser evidence exists for the earlier clown export/load at the local proof fixture, observed by Root and recorded on AQ-37; no current re-run was performed because its ignored output GLB is missing.
- The contrasting tang evidence in this iteration is read-only GLB joint/clip/weight metadata plus inspection of the pinned app's Fish rig and weighting code. It is **not** a tang Mesh2Motion animation preview, output export, or browser-load verification.
- The official app's tang file picker was attempted once after verifying from the pinned app source that import reads a selected file with `FileReader`; Chrome blocked `setFiles` because its extension lacks file URL access. The local sample copy remains unmodified under `/private/tmp`; no upload or browser-side processing occurred.
- No responsive viewport measurements are claimed; the isolated proof is a study fixture, not the responsive aquarium scene.
- No fish GLB, application runtime, model authoring script, or production rendering code was modified.
