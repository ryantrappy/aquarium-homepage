<!-- Keep this header. Append brief handoff notes below, newest at the bottom, and trim stale entries when resolved. -->
<!-- Keep roughly the last 5 entries or ~100 lines max. Summarize what changed, verification run, and what remains. -->

### 2026-11-04 — Handoff: real service-link shortcuts
- Next agent: review https://docs.ryantr.app/overview#service-links and create a Backlog task to replace the current nonworking `trappserv.er:port` shortcut URLs with real documented service links. Choose only a few links for initial testing; leave other examples unchanged until individually verified. Test selected destinations from the aquarium and record observed results.
- Related existing task: AQ-8 tracks review of the final service list and mappings with the user; coordinate scope and avoid presenting unconfirmed URLs as verified. The attempted task creation did not yield a task; this scratch note is the handoff until a task is successfully created.

### In the future do not worry about having it deployed until it is working well locally. I can handle the deployments once it is pushed. I want to ensure that everything is working before we worry about incremental deployments

*Reviewed by Root — 2026-11-04: Retained as policy: work locally; user handles deployment after reviewed pushes.*

### 2026-11-03 — Research handoff processed

*Reviewed by Root — 2026-11-04: Reviewed as historical context; current licensing and local-first constraints still apply.*
- Asset budget remains **$0: verified CC0, CC-BY 4.0, or custom-made only**. No paid, NC, or ND assets. This and the local-first/user-deployment policy are now durable in AGENTS.md, docs/requirements.md and AQ-40.
- Reviewed and corrected docs/open-source-asset-and-motion-research.md. Original vs derivative mesh counts are separated. Candidate videos/timestamps are linked from AQ-18–AQ-32 and AQ-35 but remain unverified; no video-review criteria were checked just from supplied URLs.
- Optics, coral rigidity/soft tissue, particles and schooling proposals are linked to AQ-39/AQ-41/AQ-42/AQ-43. Unsupported universal biology, exact lighting/attenuation claims and unmeasured CPU timings were withdrawn or qualified as hypotheses. Apply effects only after scene-scale/source review.
- AQ-48 now tracks four rig-family directions; clown/tang technical revisions are under review, the other two remain provisional. AQ-14.3 tracks scan boundary/rock contact cleanup. Both use review-only derivatives outside git until accepted.

### 2026-11-03 — Moving main-scene milestone

*Reviewed by Root — 2026-11-04: Reviewed as historical verified baseline; later focus fix is committed in af90d85.*
- Commit eee0efc connects the actual Three.js main aquarium to native service links with per-instance travel, articulation, bounded frame clock, typed profile/state/navigation, pause/reduced motion, occlusion and alpha-aware artwork picking. Only clownfish and yellow tang have rigged assets; the other thirteen species remain correct-species artwork previews.
- Root verified 94 tests, typecheck, production build, a clean committed-source build, normal Vite dev hydration, both agreed viewports, native blank-target events, pause/reduced-motion freezes, Settings save/reload/removal and exact original three-example config restoration. GPU context loss retains usable native links. Hidden-state behavior is source/clock-tested, not deliberately browser-transition tested; full-roster performance is unproven.
- AQ-5/AQ-38 are Done as bounded engine/pipeline investigations. AQ-12/AQ-13/AQ-34 and realism/species/habitat tasks remain open. Coarse dead scan, approximate fins/materials and missing roster meshes do not meet final photorealism.
- No new deployment: user handles deployment after reviewed pushes. Leave unrelated docs/deployment 2.md and old local research artifacts untouched.

### 2026-11-03 — User Direction: Separate Live-Rock Foundations & Modular Coral Authoring (`AQ-14.2`, `AQ-14.3`, `AQ-14.4`, `AQ-34`, `AQ-39`, `AQ-42`)

*Reviewed by Root — 2026-11-04: Actioned in the modular contract and Backlog; consume Gemini assets and keep coral separate from rock.*
- **User Decision**: Stop salvaging `candidate-reef.glb` as a single fused rock+coral scan. Model/source **bare live-rock foundations** separately and mount **individual coral colony assets** on top of the live rock at uniform `[1, 1, 1]` scale.
- **Specification & Backlog Updates**:
  1. Created [`docs/modular-coral-and-live-rock-spec.md`](docs/modular-coral-and-live-rock-spec.md) with full geometric, `COLOR_0` vertex attribute (`R = flexibilityMask`, `G = growthTipOrPolypMask`, `B = phaseSeed`, `A = contactAO`), material, shader, and socket placement instructions.
  2. Updated `AQ-14.3` (bare live-rock foundation + named `socket_*` attachment points), `AQ-42` (5 separate coral colony archetypes, flared encrusting basal skirts, 2-part rigid-stalk + swaying-polyp *Euphyllia* split, and `COLOR_0` contract), `AQ-14.2` (flow-driven vertex displacement and 3-point `14,000K` + `450 nm` actinic + sand-bounce lighting), and `AQ-39` (actinic coral fluorescence & depth-aware optics integration).
  3. Created child task `AQ-14.4` (`backlog/tasks/aq-14.4 - Assemble-modular-coral-colonies-on-separate-live-rock-foundations.md`) tracking the modular rock+coral scene assembly in `src/rendering/scene/aquarium.ts` (eliminating the `3.4x` non-uniform vertical stretch) and regenerating `reef-habitat.json` via `deriveReefHabitat()`.

### 2026-11-03 — Backlog Priority & Ordinal Re-Sequencing (All 37 Open Tasks)

*Reviewed by Root — 2026-11-04: Reviewed; current Backlog dependencies and ordinals control selection, including AQ51–AQ53.*
- Re-sequenced `priority` and `ordinal` across all 37 open tasks in `backlog/tasks/*.md` so agents execute work in strict dependency and visual-impact order:
  1. **Tier 1 (`high`, `ordinal 11000–21000`) — Core 3D Reef, Modular Corals, Fish Rigs & Navigation Foundation**: `AQ-40` (11000) -> `AQ-14.3` (12000, bare live rock + sockets) -> `AQ-42` (13000, modular coral colonies + `COLOR_0` contract) -> `AQ-14.4` (14000, modular coral+rock scene assembly) -> `AQ-34` (15000, 3D scene depth/anchors/occlusion) -> `AQ-48` (16000, 4 parametric fish rig archetypes) -> `AQ-35` (17000, behavior profiles) -> `AQ-44` (18000, behavior state runtime) -> `AQ-45` (19000, habitat anchor interactions) -> `AQ-12` (20000, lifelike fish swimming) -> `AQ-14` (21000, homepage fish tank milestone).
  2. **Tier 2 (`high`/`medium`, `ordinal 22000–26000`) — Hero Species & Reef Lighting/Optics**: `AQ-18` (22000, Ocellaris Clownfish + anemone) -> `AQ-19` (23000, Yellow Tang + rock grazing) -> `AQ-39` (24000, aquarium-scale optics & coral fluorescence) -> `AQ-14.2` (25000, caustics & soft-coral sway) -> `AQ-13` (26000, startle response).
  3. **Tier 3 (`medium`, `ordinal 27000–40000`) — Schooling & Remaining 13 Roster Species Grouped by Rig Archetype**: `AQ-41` (27000, schooling) -> Subcarangiform schoolers (`AQ-23` Chromis, `AQ-30` Anthias, `AQ-20` Royal Gramma) -> Labriform rigid-disc swimmers (`AQ-21` Blue Tang, `AQ-31` Flame Angel, `AQ-32` Copperband Butterfly, `AQ-28` Six-Line Wrasse, `AQ-29` Flasher Wrasse) -> Banner hoverers (`AQ-22` Banggai Cardinalfish, `AQ-24` Firefish) -> Benthic perchers/dragonets (`AQ-26` Mandarin Dragonet, `AQ-27` Tailspot Blenny, `AQ-25` Yellow Watchman Goby).
  4. **Tier 4 (`low`, `ordinal 41000–47000`) — Hardware Indicators, Optional Polish & Deferred Config**: `AQ-15` (CPU heater), `AQ-17` (network pump), `AQ-16` (disk reservoir), `AQ-43` (particles), `AQ-8` (user service mappings), `AQ-37` (legacy Mesh2Motion spike, superseded by `AQ-48`), `AQ-11` (decor link hotspots).

### 2026-11-04 — Modular pipeline contract checkpoint

*Reviewed by Root — 2026-11-04: Historical progress superseded by AQ40 Done; contract and separate modeling ownership remain current.*
- Root read and applied the new modular-reef direction and priority order. AQ-14.3 now tracks separate bare rock + real sockets instead of further fused-scan salvage; AQ-42/AQ-14.4/AQ-34 dependencies align with pipeline → foundations → corals → assembly → final scene. AQ-19 is queued until that gate.
- New docs/asset-contract.md and src/rendering/assets/contract.ts define canonical meter/Y-up/root identity, raw coral masks, support/clearance records and cave-preserving collision parts. Root independently ran all 104 tests successfully. The validator checks inspection consistency, not geometry truth, shader installation or visual quality.
- New rig-tool milestone 0d2ab1f is pushed. AQ-48 is Done as an experimental tool foundation only; shipped fish GLBs are byte-unchanged. Schematic fins and per-species realism remain open.
- AQ-40 stays In Progress: catalog is preparing an original baked-material proof; storage is testing licensed high-to-low Staghorn normal baking. Actual exports and two-viewport Three.js review remain before root completion. No new asset or scene promotion and no deployment.

### 2026-11-04 — AQ-40 technical pipeline specimens

*Reviewed by Root — 2026-11-04: Reviewed as bounded technical evidence; these studies are not final production art.*
- Curated review-only specimens now live in `src/rendering/proof/pipeline-assets/`: original rock baseColor/roughness/AO bake and licensed PixForge Staghorn unbaked/baked LOD pair. New `docs/asset-pipeline-proof.md` records licensing, commands, exact hashes/metrics, tangent basis diagnosis, and limits. Fresh Blender 5.0.1 four-thread source→smooth LOD→normal-bake commands ran successfully; final coral output is 30,000 triangles, preserves position/UV face topology and base-color bytes, adds a 2048² normal PNG, and omits `TANGENT` after one singular loop. Khronos reports zero errors with one disclosed generated-tangent portability warning; Three.js 0.187 uses derivative TBN in the normal-map shader.
- These are technical studies, not production coral or live-rock art. Staghorn source-scale calibration, contribution from its source normal map to the Cycles geometry-normal bake, adjacent-branch bleed, and browser appearance/performance remain unverified. At the time of this earlier note AQ-40 was still In Progress; the completed review is recorded in the newest checkpoint below. No main-scene proof specimen was promoted.
- AQ-14.3 separate bare live-rock foundations/sockets remains the next modular-reef gate after AQ-40 review. Keep work local-first; user handles deployment after reviewed pushes.

### 2026-11-04 — AQ-40 completed; AQ-50 next

*Reviewed by Root — 2026-11-04: Superseded in part: AQ50 is now Done and pushed as af90d85; configuration/deployment constraints retained.*
- Root marked AQ-40 Done with all three ACs checked after 104 tests, typecheck, main production build, and native-Chrome verification at 1440×900 and 402×874. The four approved v2 fish PNGs preserve natural aspect; temporary Firefish body-click/new-tab, deletion, API-body/ETag restoration and resumed motion were verified. Removed legacy WebPs/background return 404; v2 PNGs return 200. Provenance/history is in `docs/fish-art-provenance.json`.
- This accepts the asset-pipeline capability only. Main art is not photorealistic: two fish are rigged, thirteen remain static previews; coral/rock specimens are technical proofs. Do not promote them as final habitat art.
- AQ-50 is the next focused runtime fix before AQ-14.3: after activating a fish link, closing its tab returns focus to the fish; resizing while paused can attempt `aria-hidden` on that focused anchor. Keep it visible or move focus deterministically, preserve native navigation/pause/reduced motion, and root-verify both target viewports with no focused-aria-hidden warning.
- Native Chrome Device Toolbar at 1440×900 may retain pinch scale 2.406. Toggle toolbar off/on and read `visualViewport.scale === 1`; this was an emulation state, not an app zoom bug. Do not bypass DevTools self-XSS warnings.
- Preserve the current user config and revision on future temporary edits; never restore a historical three-example snapshot over newer changes. AQ-14.3 foundations follow AQ-50. User deploys after reviewed pushes; no auth/proxy changes or incremental deployment.

### 2026-11-04 — AQ-50 local implementation ready for Root review

*Reviewed by Root — 2026-11-04: Actioned: Root reviewed, verified, committed and pushed AQ50; this pending-review checkpoint is superseded.*
- Pushed handoff/AQ-40 baseline is `da043d2`. AQ-50 is In Progress; its three ACs remain unchecked. The source hold has been released and the worker finished a local implementation across six paths: `src/rendering/scene/aquarium.ts`, new `fish-link-focus.ts` and its test, `src/components/AquariumScene.tsx` and its test, and `src/routes/index.tsx`. These six source changes are not in `da043d2` or a fresh clone; inspect the local working-tree diff to resume.
- Worker-reported checks only: 17 focused tests (5 actual-DOM focus, 7 AquariumScene, 5 alpha-picking), `tsc --noEmit`, and `git diff --check` pass. Root code review, any needed full checks, production build, and native Chrome return-to-focused-fish plus paused resize QA at 1440×900/402×874 remain before ACs can be checked or AQ-50 completed.
- AQ-14.3 explicitly depends on AQ-50 and remains blocked; do not begin foundations during this review. Full acceptance status and iteration history are in the AQ-50 Backlog record.
- The Backlog notes and this handoff can guide a fresh agent, but the patch itself is local-only until Root review and a commit. Do not assume process IDs or tool session IDs persist; inspect actual listeners before attaching or starting servers.

## Finished Modular Coral & Live-Rock Assets Ready for Project Integration (`AQ-42`, `AQ-14.3`, `AQ-14.4`)

*Reviewed by Root — 2026-11-04: Actioned as supplied asset baseline; exact-export review findings are routed to Gemini in modeling-tagged AQ51, AQ52 and AQ53. No Codex model edits made; integration readiness remains under review.*

All **8 modular coral colonies** and **2 bare live-rock island foundations** have been built in Blender 5.0.1 (`--threads 4 -b`), visually verified across 4 Cycles inspection views each (`/tmp/coral-models/renders/`), stamped with in-band `extras.reefAsset` / `extras.reefPrimitive` / `extras.reefSocket` metadata (`src/rendering/modeling/package_modular_corals.mjs`), validated with `validateAssetContract` from `src/rendering/assets/contract.ts`, and placed in `src/rendering/assets/corals/` (`src/rendering/assets/corals/manifest.json` and `src/rendering/assets/corals/README.md`). **Use these finished pieces directly in the project for `AQ-42`, `AQ-14.3`, and `AQ-14.4`:**

- `src/rendering/assets/corals/coral-euphyllia-torch.glb` (`tentaculate-lps`, *Euphyllia glabrescens*, `26,232` tris, `euphyllia_skeleton` `coral-rigid` + `euphyllia_polyp_crown` `coral-soft`, generator: `src/rendering/modeling/build_euphyllia_torch.py`)
- `src/rendering/assets/corals/coral-euphyllia-hammer.glb` (`tentaculate-lps`, *Euphyllia ancora / parancora*, `24,112` tris, `euphyllia_hammer_skeleton` `coral-rigid` + `euphyllia_hammer_polyp_crown` `coral-soft`, generator: `src/rendering/modeling/build_euphyllia_hammer.py`)
- `src/rendering/assets/corals/coral-acropora-table.glb` (`branching-sps`, *Acropora hyacinthus / millepora*, `34,176` tris, `acropora_table_colony` `coral-rigid`, generator: `src/rendering/modeling/build_acropora_table.py`)
- `src/rendering/assets/corals/coral-acropora-staghorn.glb` (`branching-sps`, *Acropora formosa / cervicornis*, `23,648` tris, `acropora_staghorn_colony` `coral-rigid`, generator: `src/rendering/modeling/build_acropora_staghorn.py`)
- `src/rendering/assets/corals/coral-montipora-plate.glb` (`plating-sps`, *Montipora capricornis*, `4,560` tris, `montipora_plate_colony` `coral-rigid`, generator: `src/rendering/modeling/build_montipora_plate.py`)
- `src/rendering/assets/corals/coral-brain-diploria.glb` (`mounded-lps`, *Diploria / Symphyllia*, `12,544` tris, `diploria_brain_colony` `coral-soft` with `R <= 0.045`, generator: `src/rendering/modeling/build_brain_coral.py`)
- `src/rendering/assets/corals/coral-anemone-bta.glb` (`host-anemone`, *Entacmaea quadricolor*, `17,800` tris, `anemone_column_disc` + `anemone_tentacle_crown` `coral-soft`, generator: `src/rendering/modeling/build_bubble_tip_anemone.py`)
- `src/rendering/assets/corals/coral-zoanthid-mat.glb` (`zoanthid-mat`, *Zoanthus sp.*, `18,600` tris, `zoanthid_button_cluster` `coral-soft`, generator: `src/rendering/modeling/build_zoanthid_mat.py`)
- `src/rendering/assets/corals/live-rock-island-left.glb` (`rock`, left arched reef bommie foundation, `0.83 m × 0.51 m × 0.40 m`, `16,384` tris, 12 `socket_*` coral mount empties, `aoSource: "texture"`, generator: `src/rendering/modeling/build_live_rock_islands.py`)
- `src/rendering/assets/corals/live-rock-island-right.glb` (`rock`, right terraced shelf reef foundation, `0.78 m × 0.39 m × 0.35 m`, `16,384` tris, 11 `socket_*` coral mount empties, `aoSource: "texture"`, generator: `src/rendering/modeling/build_live_rock_islands.py`)

### 2026-11-04 — Biomechanical Fish Turning & Curvilinear Spine-Bending Plan (`AQ-49` / `AQ-12`)
*Reviewed by fish_framework — 2026-11-04: Pending as separately tracked AQ-49 work; current assignment is AQ-55's extension scaffold and excludes implementing turning behavior.*
- **User Direction**: Fix the lack of realism when a fish turns around or changes direction.
- **Root Causes Found in `src/rendering/scene/motion.ts` & `aquarium.ts`**:
  1. `integrateSwimmingFish()` (`motion.ts` line 70) translates position along `(dx/remaining, dy/remaining, dz/remaining)` while `fish.yaw` rotates separately—causing fish to crab-slide sideways/backward when a new waypoint is behind them.
  2. `aquarium.ts` (`line 118`) only rotates `item.root.rotation` as a rigid block over a straight-ahead swim clip—the spine never bends into the turn (`turnCurvature = 0`) and pectoral fins beat symmetrically during pivots.
  3. Waypoints switch abruptly at `remaining < 0.025` with no corner lookahead filleting, and 2D fallback sprites flip `scale.x` in a single frame.
- **Created Spec & High-Priority Task**:
  - Wrote [`docs/fish-turning-and-maneuvering-plan.md`](docs/fish-turning-and-maneuvering-plan.md).
  - Created [`backlog/tasks/aq-49 - Implement-biomechanical-fish-turning-and-curvilinear-spine-bending.md`](backlog/tasks/aq-49%20-%20Implement-biomechanical-fish-turning-and-curvilinear-spine-bending.md) (`priority: high`, `ordinal: 19500`, child of `AQ-12`) covering heading-locked translation, lookahead corner filleting, two-stage `brake-pivot` -> `exit-stroke` reversals, post-mixer procedural spine/pectoral turn overlays in `aquarium.ts`, and smoothed 2D fallback turn foreshortening.
