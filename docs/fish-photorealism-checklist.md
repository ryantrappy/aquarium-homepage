# Fish Photorealism Checklist — Blue Tang Benchmark & Remaining 14 Species

This checklist captures every anatomical, geometric, UV/PBR texture, rigging, and shader improvement completed on the **Blue Tang** (`blue-tang`) and its test counterparts (`ocellaris-clownfish`, `yellow-tang`), followed by the step-by-step requirements to bring all **15 aquarium species** up to the same photorealistic bar.

---

## Part 1: Completed Improvements (Blue Tang & Test Copies)

### 1. 3D Anatomy & Top-Down Fusiform Profile
- [x] **Replaced uniform slab thickness with a hydrodynamic fusiform top-down taper** (`evaluateFusiformLongitudinalHalfWidth` in `scripts/build-splat-fish-glbs.mjs` and extracted profile in `src/rendering/assets/splat-fish/overrides/learned-shape-guide.json`):
  - Ogive snout entry (`s = 0.96..1.00`) with rounded anterior lip termination instead of a razor-sharp wedge.
  - Peak lateral breadth at the opercular shoulder (`s ≈ 0.74`, `halfWidth/length = 0.0723` on `blue-tang`).
  - Continuous hydrodynamic mid-trunk taper (`s = 0.70 -> 0.25`) narrowing smoothly into a slender muscular caudal peduncle (`s = 0.17`).
- [x] **Separated muscular trunk from thin median fin blades (`pterygiophore` step)**:
  - Dorsal, anal, and caudal fins step down to thin (`~1.5–3.0 mm`) articulated ray membranes (`inTrunkBand` vertical envelope in `scripts/build-splat-fish-glbs.mjs`) rather than ballooning to the full trunk width.
- [x] **Sculpted 3D protruding eyes and circumorbital sockets** (`scripts/prepare-download-testing-copies.mjs` & `scripts/build-splat-fish-glbs.mjs`):
  - Added an annular recessed circumorbital socket groove (`-1.8 mm`) around the eye margin so the eyeball sits inside an anatomical cranial orbit.
  - Sculpted a protruding 3D spherical cornea hemisphere (`+8.2 mm` per side) clearly visible in head-on, 3/4, and top-down views.
- [x] **Sculpted 3D mouth lips, oral cleft, and opercular gill plates**:
  - Raised upper and lower lip cushions (`+3.2 mm` forward, `+2.0 mm` lateral) framing a recessed horizontal oral cleft (`-3.8 mm`).
  - Sculpted a raised convex opercular gill cover (`+4.2 mm`) bordered posteriorly by a recessed crescent gill-slit crease (`-3.6 mm`).
- [x] **Welded sagittal midline vertex normals (`x = 0`)**:
  - Averaged vertex normals across co-located left/right UV-seam vertices along `|x| <= 0.015` and zeroed residual lateral normal skew at the midline so head-on and top-down views have a smooth, seamless snout and dorsal bridge.

### 2. UV Layout & PBR Material / Texture Pipeline
- [x] **Adopted non-mirrored dual-flank UV mapping**:
  - Separated `+X` (left flank), `-X` (right flank), and paired pectoral/pelvic fin UV islands so tangent-space normal maps never invert across `x = 0`.
  - Feathered tangent-space normals to neutral `(128, 128, 255)` within a `14 px` band along the `x = 0` sagittal UV seam to prevent normal-map lighting steps on the snout bridge.
- [x] **Authored 3-map PBR textures (`BaseColor`, `Normal`, `ORM`) within strict asset budgets**:
  - **BaseColor (`sRGB`)**: High-frequency biological pigmentation, cranial/snout pore mottling, fin-ray banding, dark iris ring, deep pupil core, and crisp corneal highlight glint.
  - **Tangent-Space Normal Map (`Non-Color`, `scale = 0.65`)**: Imbricated hexagonal ctenoid scale micro-relief across the trunk, pebbled cephalic snout pores, radial fin-ray corrugations, circumorbital socket rim, and opercular crease.
  - **Packed ORM (`Occlusion / Roughness / Metallic`, `Non-Color`)**:
    - `R (Occlusion)`: Cavity darkening inside the oral cleft, gill slit, circumorbital groove, and fin-base crease (`0.35..1.0`).
    - `G (Roughness)`: Glassy wet cornea (`roughness = 0.03`) over the 3D eye dome, satin mucous-coated body scales (`roughness = 0.32..0.40`), and slightly rougher fin membranes (`0.42..0.52`).
    - `B (Metallic)`: `0.0` dielectric skin/cornea with subtle `0.06..0.10` iridophore sheen on metallic iris/scale zones.
- [x] **Compressed embedded PNGs with Paeth scanline filtering (`768×768`)**:
  - Keeps full 3-texture photorealistic `.glb` files at `0.98–1.56 MiB`—well below the `2.5 MiB` `background-fish` cap in `src/rendering/assets/budgets.ts`.

### 3. Skeleton Rigging, Swim Clips & Mouth/Gill Articulation
- [x] **Normalized 8-joint contract armature (`spine_0..spine_5`, `pectoral_L`, `pectoral_R`)**:
  - Measured true 3D pectoral fin-root sockets (`pectX`, `pectY`, `pectZ`) directly from the mesh geometry so pectoral sculling pivots cleanly at the shoulder without tearing flank vertices.
  - Built 49-frame (`2.0 s` at `24 fps`) seamless looping swim clips tailored to each locomotion archetype (`labriform`, `subcarangiform`, `carangiform`, `balistiform`).
- [x] **Implemented natural 3D jaw-hinge & opercular gill articulation (`src/rendering/scene/fish-body-flex.ts` & `src/rendering/scene/fish-flex-material.ts`)**:
  - **Mandibular Hinge Depression (`-Y`) & Retraction (`-Z`)**: Lower jaw (`yNorm` below the oral cleft) hinges downward (`-0.0085 L`) and slightly backward (`-0.0028 L`) during the buccal inhalation phase while the upper lip lifts subtly (`+0.0020 L`).
  - **Ventral-Snout & Terminal-Snout Coverage**: Expanded the lower-jaw vertical window (`yNorm ∈ [-0.48, -0.02]`) to articulate both ventral-snout surgeonfish/angelfish (`y ≈ -0.18`) and centered terminal-snout species (`y ≈ 0`).
  - **Phase-Lagged Opercular Gill Abduction (`±X`)**: Opercular gill plates (`s ∈ [0.16, 0.30]`) flare outward laterally (`+0.0048 L` per side) with a `90°` (`-π/2`) phase lag behind the mouth opening to simulate water expulsion across the gills.

### 4. Fin Geometry, Ray Fluting & Translucency Standard ("See-Through" Fins)
- [x] **Replaced flat slab fins with 3D ray-fluted geometry & tapered margins**:
  - **Dorsal & Anal Fin Taper**: Fins taper from structural root thickness (`~2.5 mm`) down to a sharp, delicate anatomical margin (`< 0.5 mm`) rather than a blunt extruded box/slab.
  - **3D Fin-Ray Corrugation**: Vertices along dorsal, anal, and pectoral fin blades undulate with micro-rib fluting matching the painted fin rays in the texture (convex crests along rays, subtle troughs in inter-radial membrane).
  - **Curved 3D Pectoral Fan Blades**: Pectoral fins curve organically away from the opercular socket with anatomical ray thickness rather than sitting as planar cutouts.
- [x] **High-Translucency Gossamer Fin Membranes ("See-Through" Standard)**:
  - **Pectoral Fin Webbing**: Delicate inter-radial webbing authored with high-transparency alpha (`alpha ≈ 0.22..0.38`) so the background reef, coral polyps, and water column are clearly visible through the fin fan, matching biological reference photographs of live surgeonfish/tangs.
  - **Dorsal & Anal Margin Translucency**: Trailing margins and inter-spine membranes authored with distinct translucency (`alpha ≈ 0.38..0.55` on anal fin, `0.45..0.60` on dorsal fin), with solid structural spine cores (`alpha = 0.88..1.0`).
  - **Material Shader Architecture**: Principled BSDF `Alpha` mapped to `BaseColor` alpha channel with `blend_method = 'HASHED'` (or `'BLEND'`), maintaining specular wet glint on ray ridges while transmitting background light through thin membranes.
- [x] **Rounded Anatomical Ventral Keel & Belly Profile**:
  - **Eliminated Pointy V-Wedge Keel**: The bottom of the fish (throat, chest, and ventral abdomen, `y ∈ [0.0, 0.70]`) is sculpted with a full, rounded U-shaped cross-section (`half-width ≈ 25–45 mm`) representing the visceral belly cavity, rather than an unnatural razor-sharp inverted triangle or pointy droop.
  - **Natural Ventral Keel Depth**: Belly depth is smoothly rounded from the throat (`z ≈ -0.32` at `y = 0.50`) to the pelvic keel (`z ≈ -0.44` at `y = 0.15`), cleanly separating the muscular abdomen from the posterior anal fin (`y < 0.05`).

### 5. Blender Workflow & Non-Destructive UI Testing
- [x] **Synced live Blender 5.2.3 LTS workfile (`src/rendering/assets/splat-fish/blend/blue-tang.blend`)**:
  - Packed `768×768` `BaseColor`, `Normal`, and `ORM` maps into `Blue_Tang_Photoreal_Mat`, applied welded custom split normals, and verified with 3/4, head-on, and top-down renders.

---

## Part 2: Master Checklist to Bring All 15 Species to the Blue Tang Standard

### A. Per-Species Geometry, UV & Texture Requirements (Apply to Every Species)
- [ ] **1. Non-Mirrored Dual-Flank UV Unwrap (`+X` Left, `-X` Right, Separate Fin Islands)**
  - Replace the shared planar UV projection (`u = (1 - z) / 2`) in `scripts/build-splat-fish-glbs.mjs` (or per-species Blender `.blend` workfiles) with separate upper/lower UV islands for the left (`+X`) and right (`-X`) flanks plus dedicated islands for `pectoral_L` and `pectoral_R`.
  - Feather tangent-space normal maps to `(128, 128, 255)` across the `x = 0` sagittal seam and weld co-located midline vertex normals.
- [ ] **2. Species-Specific Top-Down Fusiform Profile (`evaluateFusiformLongitudinalHalfWidth`)**
  - Verify each species' dorsal/top-down silhouette has a distinct opercular shoulder peak (`s ≈ 0.68..0.76`), smooth mid-trunk taper (`s = 0.68 -> 0.22`), narrow caudal peduncle (`s = 0.14..0.20`), and rounded ogive snout (`s = 0.96..1.00`)—tuned to its biological body plan:
    - *Laterally compressed reef discs* (`yellow-tang`, `flame-angelfish`, `copperband-butterflyfish`): `maxHalfW ≈ 0.065–0.078`, thin `1.5 mm` dorsal/anal blades.
    - *Fusiform reef cruisers & wrasses* (`royal-gramma`, `six-line-wrasse`, `mccoskers-flasher-wrasse`, `lyretail-anthias`, `blue-green-chromis`): `maxHalfW ≈ 0.085–0.105`, muscular shoulder taper.
    - *Cylindrical / benthic gobies, blennies & dragonets* (`yellow-watchman-goby`, `tailspot-blenny`, `mandarin-dragonet`, `firefish`): `maxHalfW ≈ 0.095–0.125`, broader cranial cheek bulge (`s ≈ 0.78`) and long tapered tail.
- [ ] **3. Protruding 3D Eye Dome + Recessed Circumorbital Socket Ring**
  - Align each species' 3D eye center `(eyeY, eyeZ, eyeRadius)` with its exact cranial anatomy (e.g., high dorsolateral turret eyes on `mandarin-dragonet`, `yellow-watchman-goby`, and `tailspot-blenny`; forward-set eyes on `copperband-butterflyfish`).
  - Sculpt the `-1.8 mm` circumorbital socket groove and `+7.5–9.0 mm` protruding spherical cornea hemisphere with `roughness = 0.03` and `AO = 1.0` in the ORM map.
- [ ] **4. Sculpted 3D Mouth Cleft, Lips & Opercular Gill Plate at Species-Accurate Snout Coordinates**
  - Match the sculpted 3D oral cleft and lip cushions to each species' true mouth height (`mouthY`) and snout extension (e.g., elongated forceps rostrum on `copperband-butterflyfish`; upturned superior mouth on `lyretail-anthias` and `yellow-watchman-goby`; ventral grazing mouth on `yellow-tang` and `flame-angelfish`).
  - Ensure `evaluateBuccalPulseOffset` in `src/rendering/scene/fish-body-flex.ts` and `FLEX_VERTEX_DISPLACEMENT` in `src/rendering/scene/fish-flex-material.ts` align the jaw hinge pivot (`yMouthCleft`) with each species' mouth position.
- [ ] **5. High-Frequency Species Normal & ORM Micro-Relief**
  - Bake or synthesize species-authentic micro-relief into `norm.png` and `orm.png`:
    - *Scaleless/mucous skin* (`mandarin-dragonet`, `tailspot-blenny`): smooth satin skin (`roughness = 0.22`) with cephalic sensory pores and raised fin-ray ribs instead of large ctenoid scales.
    - *Coarse ctenoid scales & preopercular spines* (`flame-angelfish`, `banggai-cardinalfish`, `royal-gramma`): pronounced imbricated scale pockets and gill-cover serrations.
    - *Fine surgeonfish/butterflyfish squamation* (`yellow-tang`, `copperband-butterflyfish`): tight micro-scales + pebble snout pores + deep dorsal/anal spine flutes.
- [ ] **6. Ray-Fluted 3D Fin Geometry, Rounded Ventral Keel & High-Translucency Webbing**
  - Model `pectoral_L` and `pectoral_R` as thin, ribbed, highly translucent fan blades socketed cleanly into the opercular shoulder (`spine_1`), with `alpha ≈ 0.22..0.38` on inter-radial webbing so the reef behind is clearly visible through the fan.
  - Round the ventral belly and throat profile (`y ∈ [0.0, 0.70]`) into a smooth, plump U-shaped hull (`half-width ≈ 25–45 mm`) rather than a pointy V-wedge or knife-edge keel.
  - Taper dorsal and anal fins from base to a sharp outer margin (`< 0.5 mm`) instead of flat extruded slabs.
  - Sculpt 3D corrugation (convex ridges along rays, subtle concave troughs between rays) matching texture ray positions, and author distinct translucency (`alpha ≈ 0.38..0.55` on anal fin, `0.45..0.60` on dorsal fin).

---

### B. Species-by-Species Rollout Tracker (All 15 Species)

#### Tier 1: Completed / In-Scene Reference & Override Models
- [x] **1. `blue-tang` (Regal Blue Tang — *Paracanthurus hepatus*)**: Full photorealistic mesh, dual-flank UVs, `768×768` PBR trio (`1.52 MiB`), 3D protruding eyes, sculpted mouth/operculum, synced in `src/rendering/assets/splat-fish/blue-tang.glb` and `src/rendering/assets/splat-fish/blend/blue-tang.blend`.
- [ ] **2. `ocellaris-clownfish` (Ocellaris Clownfish — *Amphiprion ocellaris*)**: Non-destructive photorealistic copy (`clownfish-copy.glb`, `979.8 KB`) is live in `aquarium.ts`; promote into canonical production asset (`candidate-real-clown.glb` / `splat-fish/ocellaris-clownfish.glb`) + create `.blend` workfile and update `fish-scale.test.ts` / `budgets.test.ts` when promoted.
- [ ] **3. `yellow-tang` (Yellow / Sailfin Tang — *Zebrasoma*)**: Non-destructive photorealistic copy (`zebrasoma_desjardinii-copy.glb`, `1453.4 KB`) is live in `aquarium.ts`; either re-palette to bright Hawaiian *Zebrasoma flavescens* yellow or promote into canonical production asset + create `.blend` workfile.

#### Tier 2: Remaining 12 Procedural / Blender-Override Species in `src/rendering/assets/splat-fish/`
- [ ] **4. `flame-angelfish` (*Centropyge loriculus*)**: Apply dual-flank UVs, coarse angelfish ctenoid scale normal relief (matching `Screenshot 11.21.51 PM`), preopercular spine detail, vertical black bars with feathered edges, electric-blue dorsal/anal trailing tips, and `.blend` workfile.
- [ ] **5. `copperband-butterflyfish` (*Chelmon rostratus*)**: Apply elongated forceps snout profile and protruding circumorbital eye dome (matching `Screenshot 11.23.43 PM` & `11.23.48 PM`), metallic copper-orange bands with black border rims, false eyespot (ocellus) on soft dorsal fin, and terminal rostrum jaw articulation.
- [ ] **6. `royal-gramma` (*Gramma loreto*)**: Apply dual-flank UVs, royal-purple to golden-yellow mid-body gradient with organic scale-edge stippling, dark eye-streak, black anterior dorsal spot, and deep pelvic fins.
- [ ] **7. `banggai-cardinalfish` (*Pterapogon kauderni*)**: Apply high-contrast silver iridophore metallic sheen (`metallic = 0.12`), three bold black vertical bands, white starry spots across the second dorsal/anal/caudal banners, deeply forked caudal lobes, and elongated first dorsal tassel.
- [ ] **8. `mandarin-dragonet` (*Synchiropus splendidus*)**: Apply scaleless satin-mucous skin (`roughness = 0.22`), protruding dorsolateral turret eyes, broad depressed head with frog-like preopercular cheek bulge, and high-contrast psychedelic mandarin orange/lazuli-blue labyrinth scroll patterns.
- [ ] **9. `blue-green-chromis` (*Chromis viridis*)**: Apply iridescent aquamarine-to-viridian scale normals (`metallic = 0.10`, `roughness = 0.28`) so the 6-fish school catches overhead LED caustics from every yaw angle, plus deeply forked swallowtail caudal fin.
- [ ] **10. `firefish` (*Nemateleotris magnifica*)**: Apply slender dart-shaped goby profile, towering erect first-dorsal pennant spine with red/black tip, pearlescent white forebody fading to fiery orange-red posterior, and dark sub-marginal anal/dorsal stripes.
- [ ] **11. `yellow-watchman-goby` (*Cryptocentrus cinctus*)**: Apply benthic cylindrical body with broad cheek bulge, high-set turret eyes, upturned superior mouth with pronounced mandibular hinge, sulphur-yellow skin with iridescent blue head speckles, and rounded paddle caudal fin.
- [ ] **12. `tailspot-blenny` (*Ecsenius stigmatura*)**: Apply blunt-headed cylindrical blenny silhouette, large high-set expressive eyes with supraorbital cirrus profile, copper-brown head with neon-blue cheek stripe, dark caudal peduncle spot with yellow halo, and smooth mucous normal map.
- [ ] **13. `six-line-wrasse` (*Pseudocheilinus hexataenia*)**: Apply streamlined torpedo wrasse profile, six crisp horizontal cobalt-blue stripes alternating with orange flanks, red iris with two horizontal white corneal bars, and high-frequency labriform pectoral sculling.
- [ ] **14. `mccoskers-flasher-wrasse` (*Paracheilinus mccoskeri*)**: Apply flared filamented dorsal fin rays, neon electric-blue longitudinal flash stripes over rose-orange flanks, and translucent corrugated fin membranes.
- [ ] **15. `lyretail-anthias` (*Pseudanthias squamipinnis*)**: Apply sleek schooling fusiform body, violet-rimmed eye with suborbital orange-violet cheek stripe, elongated third dorsal spine and lunate lyretail lobes, and warm peach-orange scale shimmer across the 4-fish school.

---

### C. Verification Gates Required Before Closing Every Species
- [ ] **Multi-Angle Studio Render Audit**: Render **3/4**, **head-on**, and **top-down** previews in Blender (`BLENDER_EEVEE`) and verify:
  1. Top-down silhouette shows a clear opercular shoulder peak and continuous taper to the caudal peduncle (zero slab-like uniform width).
  2. Head-on view shows protruding 3D eye domes, recessed orbital sockets, sculpted mouth cleft, and zero vertical lighting seam down `x = 0`.
  3. 3/4 view shows crisp scale/pore normal relief, wet eye specular glint, and ribbed fin rays.
- [ ] **Export, Sync & Automated Contract/Budget Checks**:
  1. Save `.blend` to `src/rendering/assets/splat-fish/blend/<species>.blend` and export `.glb` to `src/rendering/assets/splat-fish/overrides/<species>.glb`.
  2. Run `node scripts/sync-blender-override.mjs --learn-guide` to sync into `src/rendering/assets/splat-fish/` and regenerate `manifest.json` + `fish-<species>-inspection.json`.
  3. Run `npm run typecheck && npx vitest run` to verify `budgets.test.ts` (`<= 2.5 MiB`, `<= 25,000 tris`, `<= 1024 px`), `splat-fish-contract.test.ts`, `manifest-checker.test.ts`, and `fish-scale.test.ts`.
