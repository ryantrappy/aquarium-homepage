# Modular Live Rock & Realistic Coral Authoring Specification

<!-- AGENT_DOC_METADATA
Category: Specification / Asset Design
Status: Canonical / Active
Authority: Binding Asset Authoring Specification
Backlog: AQ-14, AQ-14.2, AQ-14.3, AQ-34, AQ-39, AQ-42
Owner: @gemini
Updated: 2026-11-05
Upstream: docs/requirements.md, docs/asset-contract.md
Downstream: src/rendering/modeling/build_*.py, src/rendering/assets/corals/*
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Asset Specification & Biological Design
> - **Status**: Canonical / Active
> - **Authority**: Binding Specification
> - **Backlog Reference**: `AQ-14.3`, `AQ-42`
> - **Summary**: Detailed geometric, material, shader, and socket authoring instructions for 8 modular coral archetypes and 2 live-rock base foundations (left pass-through cave, right tiered shelf).

_Date: 2026-11-03_  
_Scope: Concrete geometric, material, shader, and placement instructions for replacing the monolithic stretched reef scan (`candidate-reef.glb`) with separate live-rock structures and modular, biologically accurate coral colonies (`AQ-14`, `AQ-14.2`, `AQ-14.3`, `AQ-34`, `AQ-39`, `AQ-42`)._

Implementation clarifications are recorded in [asset-contract.md](asset-contract.md): canonical meters and Y-up export, raw flexibility height with one runtime exponent, mask handling separate from display color/opacity, and cave-preserving collision parts. Numerical colors, lighting, dimensions and motion parameters below are art/engineering starting proposals, not universal biological measurements. Socket names alone do not establish fish habitat; actual geometry and reference review remain required.

## 1. Root Cause Diagnosis: Why the Current Coral Looks Unconvincing

Inspecting [`src/rendering/scene/aquarium.ts`](../src/rendering/scene/aquarium.ts) (`lines 70–77`) and [`src/rendering/proof/cleanup-reef.py`](../src/rendering/proof/cleanup-reef.py) reveals five specific reasons the current reef reads as an artificial scan rather than a living home reef aquarium:

1. **Monolithic Rock + Coral Fusion**: [`candidate-reef.glb`](../src/rendering/proof/candidate-reef.glb) ([VIVID REALITY GoPro photogrammetry scan](https://sketchfab.com/3d-models/ef94bf857d2a4af5b3691d19d57baaaa)) bakes rock, sand, and coral into one indivisible mesh. Because coral and rock share the same geometry and material slots (`Roughness = 1.0`, no normal maps, no thickness/transmission, no vertex attributes), coral tissue cannot transmit light, fluoresce, or move independently of the rock.
2. **Severe Non-Uniform Stretching**: `rebuildHabitat()` in [`src/rendering/scene/aquarium.ts`](../src/rendering/scene/aquarium.ts) scales the reef scan by `{ x: 4.6, y: 6.2, z: 1.8 }` on the left and `{ x: 3.4, y: 4.6, z: 1.5 }` on the right—stretching coral vertically by **3.4× relative to its depth** (`6.2 / 1.8`). This warps round coral heads and branching colonies into vertically smeared stalagmites.
3. **Photogrammetry "Webbing" Between Branches**: Underwater multi-view stereo reconstruction bridges the gaps between fine *Acropora* branches and *Euphyllia* tentacles with solid triangles, destroying negative space and silhouette crispness.
4. **Flat Baked Lighting & Zero Specular/Subsurface Response**: The GoPro scan has murky underwater ambient lighting baked into its diffuse JPEG atlases and exports with tangents disabled and no normal or roughness maps, making living coral tissue look like matte plaster under Three.js directional lights.
5. **Missing Encrusting Bases & Contact Grounding**: In a real reef tank, corals are mounted on frag plugs or rock ledges and grow a flared **encrusting basal skirt** that grips the live rock. Intersecting raw meshes without an encrusting base or contact ambient occlusion looks like floating geometry clipped into a rock.

## 2. Target Architecture: Bare Live-Rock Base + Socketed Coral Modules

Separate the aquascape into **two distinct asset tiers** assembled in Blender or at scene initialization:

```text
Aquascape Root (Uniform Scale [1, 1, 1])
├── 1. Bare Live-Rock Islands (Static solid collision & occlusion meshes)
│   ├── live-rock-island-left.glb   (Arched bommie with caves + named socket empties)
│   └── live-rock-island-right.glb  (Terraced shelf island + named socket empties)
└── 2. Modular Coral Colonies (Parented to rock sockets at uniform scale)
    ├── Category A: Branching SPS (Acropora staghorn & table colonies — rigid skeleton, axial tip gradient)
    ├── Category B: Plating/Foliose SPS (Montipora scrolling caps — rigid thin tiered plates, bright growing rim)
    ├── Category C: Tentaculate LPS (Euphyllia torch/hammer/frogspawn — rigid stony stalk + swaying polyp crown)
    ├── Category D: Mounded/Fleshy LPS (Diploria brain, Trachyphyllia, Acanthastrea — 2-tone valley/ridge glow)
    └── Category E: Softies & Host Anemone (Bubble-tip anemone in rock pocket + surface-hugging Zoanthid mats)
```

## 3. Layer 1: Authoring Realistic Live Rock (`live-rock-island-*.glb`)

Live rock is the structural skeleton of the aquascape—it should **never** contain melted photogrammetry coral blobs.

### 3.1 Geometry & Silhouette Rules
- **Build from terraced macro-shapes, not a single sphere**: In Blender (`build-live-rock.py`), boolean-union 4–7 displaced metaballs or subdivided icospheres arranged into:
  - **Left Island (`x ≈ -3.0`)**: A tall arched bommie (`height ~3.8 units`) with a pass-through cave overhang (creating a shadowed ceiling anchor for `royal-gramma` and `banggai-cardinalfish`) and 6–8 flat-topped horizontal ledges (`normal.y > 0.75`) for coral mounting.
  - **Right Island (`x ≈ +3.2`)**: A lower, wider terraced shelf island (`height ~2.8 units`) separated from the left island by a diagonal aragonite sand canyon.
- **Macro & Micro Porosity**:
  - Displace the unified rock mesh with two noise octaves: a macro terrace noise (`Voronoi F1, scale 1.8, strength 0.35` with Z-axis flattening `scale.z = 0.45` so ledges form horizontal strata) and a micro carbonate pitting noise (`Noise/Musgrave, scale 14.0, strength 0.04`).
  - Flatten the bottom faces at `y = floor - 0.08` so the rock base sinks cleanly beneath the sand ripples without floating gaps.

### 3.2 Two-Tone Coralline Algae & Carbonate Rock Material
Real cured reef live rock is not uniform brown—it shows a stark contrast between shaded porous calcium carbonate and light-exposed **coralline algae** (*Porolithon* / *Lithothamnion*):
- **Shaded / Underside Rock (`normal.y < 0.25` or `AO < 0.45`)**: Warm porous travertine/aragonite buff-grey (`#5A5246` to `#786E5E`), high roughness (`0.90–0.95`), strong micro-cavity normal map.
- **Lit Upper Ledges (`normal.y >= 0.25` and `AO >= 0.45`)**: Blended via a high-frequency cellular mask into crusty magenta, plum, and lavender coralline algae patches (`#6B2D5C`, `#8F3D78`, `#4A1E40`) with slightly smoother calcified roughness (`0.68–0.75`).
- **Contact Darkening**: Bake vertex ambient occlusion (`vertex color R = AO`) where rock meets sand and inside coral mounting sockets.

### 3.3 Explicit Coral Socket Empties
In Blender, place `Empty` objects (or extract surface points with `normal.y > 0.6` for upright corals and `0.2 < normal.y < 0.7` for overhangs) exported in the GLB with standardized names and metadata:
- `socket_sps_crest_01..06`: Upper third of the rockwork (`high PAR, high flow`), oriented upright with slight outward tilt (`10–25°` toward the front glass).
- `socket_plate_ledge_01..04`: Outer mid-level ledges for horizontal scrolling *Montipora* caps.
- `socket_lps_mid_01..06`: Mid-to-lower shelves for fleshy *Euphyllia* torches/hammers.
- `socket_anemone_crevice_01`: A concave cup-shaped depression (`radius ~0.25 units`) on the upper-mid island where the Bubble-Tip Anemone's foot is recessed out of sight.
- `socket_brain_apron_01..04`: Lower rock apron and sandbed margin for mounded brain/favia/acan colonies.

## 4. Layer 2: Modeling & Shading Each Coral Archetype Separately

Every coral colony must be authored as an independent `.glb` asset at **real-world meter scale (`1 unit = 1 meter` or consistent scene scale)** and placed at **uniform scale (`s = 0.85..1.25` equally on X, Y, Z)** so branches and polyps never shear.

### 4.1 Standardized Vertex Color Contract Across All Coral Meshes
To avoid custom shader permutations per asset, bake a consistent 4-channel vertex color attribute (`COLOR_0`) in Blender for every coral `.glb`:
- **`vColor.r` (`flexibilityMask`, `0.0–1.0`)**: Controls flow-driven vertex displacement. Must be **`0.0`** on all calcified stony skeletons (*Acropora*, *Montipora*, *Diploria*, and the stony stalks of *Euphyllia*), ramping smoothly from `0.0` at a fleshy polyp/tentacle base to `1.0` at the tentacle tip (`w(h) = h^1.8`).
- **`vColor.g` (`growthTipOrPolypMask`, `0.0–1.0`)**: Marks axial growth tips on SPS (`top 15%` of branches), growing perimeter rims on plating *Montipora*, swollen acrosphere tips on *Euphyllia* tentacles, and oral discs/valleys on LPS. Drives subsurface scattering thickness and fluorescent protein (`CFP`/`GFP`/`RFP`) intensity.
- **`vColor.b` (`phaseSeed`, `0.0–1.0`)**: Per-tentacle or per-branch random constant (`hash(island_index)`) used to offset oscillation phase in the vertex shader so adjacent tentacles never move in robotic lockstep.
- **`vColor.a` (`contactAO`, `0.0–1.0`)**: Ambient occlusion (`0.15` in deep interior crevices and at the rock-attachment base, `1.0` on exposed tips) to ground the colony onto the live rock.

### 4.2 Archetype A: Branching SPS (*Acropora* Staghorn, Table & Bottlebrush)
- **Geometry Pipeline**:
  1. **Decimated Scan Derivative**: Use the verified [PixForge Staghorn Coral](https://sketchfab.com/3d-models/staghorn-coral-ede640745c16457a9345ef1fa9e8d4d4) (`CC BY 4.0`, processed via [`src/rendering/proof/prepare-staghorn.py`](../src/rendering/proof/prepare-staghorn.py) to `20k–30k` tris and `<= 2048` textures), **plus** trim the flat bottom scan cut and sculpt a flared **encrusting basal skirt** (`2–3 cm` wide) that conforms to the rock socket.
  2. **Procedural Blender Geometry Nodes Alternative (`build-acropora.py`)**:
     - Generate a bifurcation curve skeleton (`3–4` branching generations, branching angle `34–46°`, branch radius tapering from `14 mm` at the trunk to `3.5 mm` at the axial tip, upward phototropic curl `+0.25`).
     - Convert curves to mesh (`12-sided` profile) and scatter **radial corallite cups** (small `1.8 mm` tilted tubular cones facing `45°` toward the branch tip) using Poisson Disk distribution (`distance_min = 3.2 mm`), plus one **apical corallite** cylinder at every branch tip.
- **Material & Axial Color Gradient (Crucial for SPS Realism)**:
  - Healthy *Acropora* tissue is never one flat brown color: symbiotic *Symbiodiniaceae* (zooxanthellae) are dense along the lower trunk/branches (producing rich cocoa-brown, deep teal, or olive-violet base colors), while the rapidly calcifying **apical tips (`vColor.g > 0.75`)** lack zooxanthellae and display vivid host pigments (pastel ice-blue `#7CE8FF`, neon violet `#C86BFF`, or cream-white `#FFF5E4`).
  - Set `roughness = 0.42` (micro-velvet polyp texture via normal map), `vColor.r = 0.0` (100% rigid skeleton), and boost backlit subsurface scatter on the pale tips (`vColor.g`).

### 4.3 Archetype B: Plating / Foliose SPS (*Montipora capricornis* & *Turbinaria*)
- **Geometry Pipeline**:
  - In Blender, deform a 2D spiral/kidney-shaped disc with a radial sine wave (`3–5` overlapping tiers), apply a `Solidify` modifier (`thickness = 4 mm`, beveled rounded rim), and add fine radial coenosteum ridges (`Voronoi/Wave` normal map).
- **Material & Rim Contrast**:
  - Paint `vColor.g = 1.0` along the outer `3 mm` perimeter boundary edge loop and `0.0` across the interior plate.
  - Shade the plate interior with saturated brick-red/orange (`#C83E2B`) or neon apple-green (`#2E9E4F`), and shade the perimeter rim (`vColor.g`) as a crisp bright-white/pale-lavender calcifying growth edge (`#F4EEFF`). Keep `vColor.r = 0.0` (100% rigid).

### 4.4 Archetype C: Tentaculate LPS (*Euphyllia glabrescens* Torch & *Euphyllia ancora* Hammer)
This is the highest-impact coral for making the tank feel alive, and it **must** be modeled as two distinct sub-meshes inside the colony `.glb`:
- **Sub-mesh 1: Rigid Calcified Phaceloid Skeleton (`vColor.r = 0.0`)**:
  - Branching stony stalks (`3–7` heads per colony) with vertical costae ribs (`16–24` longitudinal ridges around each cylinder).
  - The lower `75%` of the stalk is dull grey-purple coralline rock (`roughness: 0.85`); the top `1.5 cm` below the polyp crown is covered in dark maroon-brown fleshy periderm collar tissue (`roughness: 0.35`).
- **Sub-mesh 2: Inflated Translucent Polyp Crown (`0.0 <= vColor.r <= 1.0`)**:
  - From each calyx cup, instance `35–60` tapered tubular tentacles (`length: 3.5–6.0 cm`, `radius: 2.5 mm`, `8` radial segments × `10` height rings).
  - Shape the distal tip (`h in [0.82, 1.0]`, `vColor.g = 1.0`) into a swollen **acrosphere**:
    - **Torch Coral (*E. glabrescens*)**: Spherical/teardrop bulb (`1.6×` stalk radius).
    - **Hammer Coral (*E. ancora*)**: Laterally flattened kidney/anchor-shaped ridge (`2.4×` width × `0.8×` thickness).
- **Material & Flow Shader**:
  - Tentacle shaft (`vColor.g < 0.7`): Semi-translucent dark chocolate, emerald, or purple-violet (`transmission: 0.55`, `roughness: 0.18`, wet mucus `clearcoat: 0.8`).
  - Acrosphere tip (`vColor.g >= 0.7`): Vivid fluorescent neon-green (`#22FF66`), toxic gold (`#FFB81C`), or cyan (`#00F0FF`) emissive response.
  - Vertex displacement uses `w(h) = pow(vColor.r, 1.8)` sampled against a smooth divergence-free curl/gyre velocity field with per-tentacle phase `vColor.b * 6.283`, producing organic, non-synchronous tentacle rolling that freezes cleanly when `paused` or `prefers-reduced-motion` is active.

### 4.5 Archetype D: Mounded Brain & Fleshy Cushion LPS (*Diploria*, *Trachyphyllia*, *Acanthastrea*)
- **Geometry Pipeline**:
  - Start from a low dome or the CC0 [Smithsonian `Diploria labyrinthiformis`](https://sketchfab.com/3d-models/cbbf64f211f84a7cb62887fec11f54fe) scan decimated to `6k–10k` tris, or displace a UV hemisphere (`64 × 32` segments) with a labyrinthine reaction-diffusion / distorted wave heightmap so rounded fleshy ridges (`collines`) alternate with deep sinuous valleys (`ambulacra`).
- **Material & Shading**:
  - Bake cavity depth into `vColor.g` (`1.0` in recessed valleys/mouths, `0.0` on inflated ridge crests).
  - Drive a two-tone fluorescent gradient: glowing cyan/neon-green valleys (`#00F5D4` / `#39FF14`) framed by deep crimson, magenta, or burnt-orange fleshy ridges (`#A8183B`) with a glossy mucus coat (`roughness: 0.22`, `clearcoat: 0.75`).
  - Keep `vColor.r <= 0.05` (only an imperceptible slow fleshy expansion, no wave sway).

### 4.6 Archetype E: Host Anemone (*Entacmaea quadricolor*) & Encrusting *Zoanthid* Mats
- **Bubble-Tip Anemone (`socket_anemone_crevice_01`)**:
  - Model a recessed cylindrical pedal column tucked inside a rock hole, topped by a flared oral disc and `60–90` tentacles that swell into characteristic sub-terminal **bubble bulbs** at `h = 0.70–0.85` before tapering to a pointed tip (`h = 1.0`).
  - Color with rose/sunburst orange-red (`#FF3B1F` tips over a warm amber-rose oral disc with faint white radial lines around the mouth) and bind its world position directly to the `anemone` habitat anchor in [`src/rendering/scene/reef-habitat.json`](../src/rendering/scene/reef-habitat.json) so the Ocellaris Clownfish (`AQ-18`) hovers and settles directly within its tentacles.
- **Encrusting *Zoanthid* Button Mats (Transition Glue)**:
  - Scatter clusters of `12–30` small button polyps (`8 mm` diameter discs with a short 24-tentacle fringe skirt, `~120 tris` per polyp via `THREE.InstancedMesh` or merged rock-patch geometry) directly along the bare rock bridges between larger corals. Use contrasting radial bullseye textures (e.g., orange skirt, blue ring, neon-green center mouth) to break up bare rock seams.

## 5. Scene Integration & Runtime Performance Budget (`src/rendering/scene/aquarium.ts`)

1. **Remove Non-Uniform Reef Scaling**:
   - In `rebuildHabitat()` ([`src/rendering/scene/aquarium.ts`](../src/rendering/scene/aquarium.ts)), replace the stretched `{ x: 4.6, y: 6.2, z: 1.8 }` transforms with **uniformly scaled (`1.0`)** left and right live-rock island assemblies.
2. **Triangle & Draw-Call Budget (`1440×900` Desktop & `402×874` Mobile)**:
   - **Live Rock Islands (Left + Right)**: `25k–35k` triangles total, `2` draw calls (`1` shared 2K PBR + coralline atlas).
   - **Rigid SPS & Mounded LPS Colonies**: Merge static colonies sharing the same material atlas or use `THREE.InstancedMesh` for repeated *Acropora* / *Montipora* / *Zoanthid* clusters (`40k–60k` triangles total across `6–10` colonies, `<= 6` draw calls).
   - **Swaying LPS (*Euphyllia*) & Host Anemone**: `15k–25k` triangles total across `3–5` colonies + `1` host anemone (`<= 4` draw calls), deformed in the vertex shader via `vColor.r` (`flexibilityMask`) and `vColor.b` (`phaseSeed`) with zero CPU skinning overhead.
3. **Lighting & Shader Upgrades (`AQ-39`, `AQ-42`)**:
   - Replace the flat white `DirectionalLight` setup in `aquarium.ts` with:
     - **Primary Overhead Reef LED Light (`14,000K` crisp blue-white, `#D8ECFF`, intensity `2.8`)**: Casts top-down normal-masked caustics (`max(0, dot(N, L))`) across upper rock shelves, coral tips, and the sandbed.
     - **Actinic Royal-Blue Fill (`450 nm` accent, `#2B5BFF`, intensity `0.9`)**: Drives the `vColor.g` fluorescent emission term on coral tips, acrospheres, and brain valleys so corals pop with authentic reef-tank luminescence even in shadowed overhangs.
     - **Subtle Sandbed Bounce (`HemisphereLight`, sky `#1E6B8C`, ground `#8C7D65`, intensity `0.55`)**: Prevents coral undersides from turning pitch-black while preserving deep cave contrast.
4. **Habitat Navigation & Occlusion Sync (`AQ-14.3`, `AQ-34`)**:
   - Whenever the modular rock + coral assembly is updated, run `deriveReefHabitat()` ([`src/rendering/scene/habitat.ts`](../src/rendering/scene/habitat.ts)) offline to regenerate [`src/rendering/scene/reef-habitat.json`](../src/rendering/scene/reef-habitat.json) with exact obstacle boxes, grazing surfaces (`yellow-tang`, `flame-angelfish`), cave overhangs (`royal-gramma`, `banggai-cardinalfish`), and the host anemone tether (`ocellaris-clownfish`), and register all rock and stony coral meshes in `hitMeshes` for accurate fish label and click occlusion.
