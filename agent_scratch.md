<!-- Keep this header. Append brief handoff notes below, newest at the bottom, and trim stale entries when resolved. -->
<!-- Keep roughly the last 5 entries or ~100 lines max. Summarize what changed, verification run, and what remains. -->

### 2026-11-04 — Handoff: real service-link shortcuts

*Reviewed by Root and Gemini — 2026-11-04: Actioned into AQ56 for bounded link testing, separate from final mappings in AQ8. Connected Mintlify source read recovered documented candidates; native aquarium navigation remains pending browser access. No configuration changed.*
- Next agent: review https://docs.ryantr.app/overview#service-links and create a Backlog task to replace the current nonworking `trappserv.er:port` shortcut URLs with real documented service links. Choose only a few links for initial testing; leave other examples unchanged until individually verified. Test selected destinations from the aquarium and record observed results.
- Related existing task: AQ-8 tracks review of the final service list and mappings with the user; coordinate scope and avoid presenting unconfirmed URLs as verified. The earlier attempted task creation failed; Root has now created AQ56 and recorded the source-access result there.

### 2026-11-04 — Handoff: restore a livelier aquarium background
- Next agent: create a Backlog task to make the aquarium background more lively, using the original design as the visual reference. Review the original design and current scene before defining the change; retain the sharp, front-on reef tank and habitat perspective required by project guidance.

### In the future do not worry about having it deployed until it is working well locally. I can handle the deployments once it is pushed. I want to ensure that everything is working before we worry about incremental deployments

*Reviewed by Root — 2026-11-04: Retained as policy: work locally; user handles deployment after reviewed pushes.*

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
*Reviewed by Root and fish_framework — 2026-11-04: AQ49 turning changes are present locally and still need separate Root review; AQ55 framework acceptance does not approve this motion/visual work.*
- **User Direction**: Fix the lack of realism when a fish turns around or changes direction.
- **Root Causes Found in `src/rendering/scene/motion.ts` & `aquarium.ts`**:
  1. `integrateSwimmingFish()` (`motion.ts` line 70) translates position along `(dx/remaining, dy/remaining, dz/remaining)` while `fish.yaw` rotates separately—causing fish to crab-slide sideways/backward when a new waypoint is behind them.
  2. `aquarium.ts` (`line 118`) only rotates `item.root.rotation` as a rigid block over a straight-ahead swim clip—the spine never bends into the turn (`turnCurvature = 0`) and pectoral fins beat symmetrically during pivots.
  3. Waypoints switch abruptly at `remaining < 0.025` with no corner lookahead filleting, and 2D fallback sprites flip `scale.x` in a single frame.
- **Created Spec & High-Priority Task**:
  - Wrote [`docs/fish-turning-and-maneuvering-plan.md`](docs/fish-turning-and-maneuvering-plan.md).
  - Created [`backlog/tasks/aq-49 - Implement-biomechanical-fish-turning-and-curvilinear-spine-bending.md`](backlog/tasks/aq-49%20-%20Implement-biomechanical-fish-turning-and-curvilinear-spine-bending.md) (`priority: high`, `ordinal: 19500`, child of `AQ-12`) covering heading-locked translation, lookahead corner filleting, two-stage `brake-pivot` -> `exit-stroke` reversals, post-mixer procedural spine/pectoral turn overlays in `aquarium.ts`, and smoothed 2D fallback turn foreshortening.

## 2026-11-04 — Finished Rigged & Animated 3D Reef Fish Models Ready for Project Integration (`AQ-18`, `AQ-19`, `AQ-20`, `AQ-21`, `AQ-22`, `AQ-26`)

*Reviewed by Root — 2026-11-04: Supplied six-model fish library acknowledged for integration; preserve Gemini visual assets and verify current exports before use. Pending the current AQ55 framework review and existing priority gates; no model promotion or species-completion claim from this note alone.*

All **6 rigged and animated 3D reef fish species models** have been built in Blender 5.0.1 (`--threads 4 -b`), visually verified across `side`, `oblique`, `front`, and `top` Cycles views (`/tmp/fish-models/renders/`), stamped with in-band `extras.reefAsset` (`kind: "fish"`) and `extras.reefPrimitive` (`role: "fish"`) metadata (`src/rendering/modeling/package_modular_fish.mjs`), validated with `validateAssetContract` from `src/rendering/assets/contract.ts`, and placed in `src/rendering/assets/fish/` (`src/rendering/assets/fish/manifest.json` and `src/rendering/assets/fish/README.md`). **Use these finished fish assets directly in the project (`src/rendering/scene/aquarium.ts`):**

- `src/rendering/assets/fish/fish-ocellaris-clownfish.glb` (`ocellaris-clownfish`, *Amphiprion ocellaris*, `subcarangiform_schooler`, `16,534` tris, 7 joints, clip `clownfish_subcarangiform_swim`, generator: `src/rendering/modeling/build_clownfish.py`)
- `src/rendering/assets/fish/fish-yellow-tang.glb` (`yellow-tang`, *Zebrasoma flavescens*, `labriform_rigid_disc`, `17,226` tris, 7 joints, clip `yellow_tang_labriform_swim`, generator: `src/rendering/modeling/build_yellow_tang.py`)
- `src/rendering/assets/fish/fish-blue-tang.glb` (`blue-tang`, *Paracanthurus hepatus*, `labriform_cruiser`, `16,866` tris, 7 joints, clip `blue_tang_labriform_swim`, generator: `src/rendering/modeling/build_blue_tang.py` — provides the 3D rigged model for the default Jellyfin service in `EXAMPLE_SERVICES`)
- `src/rendering/assets/fish/fish-royal-gramma.glb` (`royal-gramma`, *Gramma loreto*, `subcarangiform_schooler`, `15,118` tris, 7 joints, clip `royal_gramma_subcarangiform_swim`, generator: `src/rendering/modeling/build_royal_gramma.py`)
- `src/rendering/assets/fish/fish-banggai-cardinalfish.glb` (`banggai-cardinalfish`, *Pterapogon kauderni*, `banner_hoverer`, `15,692` tris, 7 joints, clip `banggai_banner_hover_swim`, generator: `src/rendering/modeling/build_banggai_cardinalfish.py`)
- `src/rendering/assets/fish/fish-mandarin-dragonet.glb` (`mandarin-dragonet`, *Synchiropus splendidus*, `benthic_percher_dragonet`, `15,460` tris, 7 joints, clip `mandarin_dragonet_hover_swim`, generator: `src/rendering/modeling/build_mandarin_dragonet.py`)

### 2026-11-04 — Root reviewed framework and socket inspection checkpoint

*Reviewed by Root — 2026-11-04: AQ55 actioned and Done; AQ52 remains In Progress with measured evidence; visual/model integration stays separately gated.*
- AQ55 adds empty-by-default behavior/animation extension hooks with default → species → individual add/replace/disable resolution, isolated state, identity checks, frozen snapshots and robust cleanup. No new behavior or animation content is shipped. Details: docs/behavior-runtime-contract.md.
- Root verified isolated scaffold 131 tests/typecheck/production build, combined working tree 133 tests/typecheck, and exact old/default movement traces for all15 species. Native CUA/browser access failed; HTTP smoke passed with native links/controls. No new viewport/WebGL review is claimed.
- AQ52 independent exported-geometry checker and reports are in src/rendering/assets/socket-inspector.ts and docs/asset-evidence/. Current left12/right11 socket intents fail the documented conservative support settings; original source assets are unchanged. Packaging still needs measured-evidence adoption before AQ52 Done.
- AQ49 now names biomechanical turning. Backlog doctor moved the old master-handoff task to AQ54 after a duplicate ID collision. Turning changes and the six-model fish delivery remain separate from Root framework acceptance.
- Startup/resume rule: read every scratch entry before choosing work and add a dated disposition. Reviewed means inspected, not necessarily completed. Resolved historical checkpoints were trimmed here; their evidence remains in Backlog and AGENT_TASKS.md.
