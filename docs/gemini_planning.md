
# Photorealistic WebGPU Reef Aquarium
## Consolidated Technical Specification, Mathematics, and Implementation Reasoning

<!-- AGENT_DOC_METADATA
Category: Archive / Planning Logs
Status: Archived
Authority: Historical Reference
Backlog: None
Owner: @gemini
Updated: 2026-11-05
Upstream: None
Downstream: None
-->

> [!WARNING]
> **Archived Planning Log**  
> This file is a historical consolidated technical design document from an external Gemini planning session.  
> It contains rich biological and mathematical rationale, but is non-binding exploratory reference material.

**Source:** Gemini conversation, "Photorealistic WebGPU Reef Aquarium Engine"  
**Purpose:** Build a highly realistic, interactive 3D coral reef aquarium in a web browser using open-source technologies.

> This specification consolidates the architectural decisions, mathematical models, physical reasoning, and implementation instructions discussed in the original conversation. It is a design reference, not a verified or fully executable codebase.

---

# 1. Project Goals and Rendering Architecture

## 1.1 Primary Objective

Build a browser-based reef aquarium with:

- Photorealistic reef fish, including accurate anatomy and skin materials.
- Realistic swimming driven by biomechanics rather than repetitive animation loops.
- Dense SPS and LPS coral colonies with independently moving polyps.
- Physically motivated underwater lighting, attenuation, fluorescence, and caustics.
- Fish schooling, collision avoidance, and obstacle navigation.
- Realistic aquarium glass, surface reflections, bubbles, and suspended particles.
- GPU-accelerated simulation and rendering.
- An entirely open-source development stack.

The guiding principle is that realism comes from the interaction of geometry, materials, lighting, and motion—not simply polygon count.

A high-resolution fish model will still look artificial if it moves rigidly, reflects light incorrectly, or appears unaffected by water.

## 1.2 Recommended Technology Stack

| Component | Recommended Technology | Reason |
|---|---|---|
| Rendering engine | Three.js WebGPURenderer | WebGPU access, shader flexibility, large ecosystem |
| Shader programming | Three Shading Language (TSL) | JavaScript/TypeScript shader graphs targeting WGSL |
| Application tooling | Vite + TypeScript | Fast development and bundling |
| Optional UI | React / React Three Fiber | Declarative scene management and interfaces |
| Modeling | Blender | Sculpting, retopology, animation, Geometry Nodes |
| Scan reconstruction | AliceVision Meshroom | Photogrammetry and scan processing |
| Procedural textures | Material Maker / ArmorPaint | Detailed biological and environmental materials |
| Asset format | glTF 2.0 / GLB | Portable PBR asset interchange |
| Mesh optimization | meshoptimizer / gltfpack | Compression, quantization, rendering efficiency |
| Texture compression | KTX2 / Basis Universal | Reduced GPU memory and transfer cost |

### Why WebGPU?

WebGL 2 is capable of sophisticated rendering, but large-scale fish simulation introduces significant CPU and GPU communication costs.

WebGPU provides compute shaders and storage buffers, enabling fish behavior, spatial indexing, and simulation data to remain on the GPU.

This is especially important when hundreds or thousands of fish interact simultaneously.

### Why Three.js?

Three.js offers extensive rendering customization and integrates with modern frontend tooling.

TSL allows shader behavior to be described through JavaScript/TypeScript nodes.

Babylon.js is a credible alternative because it provides many advanced rendering features directly in its engine.

Google Filament is another alternative when physically based material rendering is the primary priority.

**Decision:** Use Three.js with WebGPURenderer and TSL as the primary architecture.

---

# 2. Biological Asset Creation

## 2.1 Fish Modeling

Fish should be modeled from anatomical references, scans, or photogrammetry wherever practical.

Important structures include:

- Gill covers and opercula.
- Dorsal, anal, caudal, and pectoral fins.
- Individual fin rays.
- Scale patterns and overlapping scale geometry.
- Eye curvature and corneal reflections.
- Mouth geometry.
- Species-specific body proportions.

Blender should be used to sculpt high-resolution source models and bake fine detail into textures for real-time meshes.

## 2.2 Coral Modeling

Different coral groups require different procedural geometry.

### SPS Corals

Examples include Acropora and Seriatopora.

Use Blender Geometry Nodes to generate branching skeletons with controlled:

- Branch thickness.
- Growth direction.
- Branch separation.
- Colony density.
- Corallite distribution.
- Surface irregularity.

Procedural branching should avoid overly uniform repetition.

### LPS Corals

Examples include Euphyllia and Plerogyra.

These require more emphasis on:

- Soft tissue geometry.
- Tentacle shape.
- Inflated tissue volume.
- Translucency.
- Independent tissue movement.

The skeleton and soft tissue should be treated as separate systems.

## 2.3 Scanning and Reference Data

Potential sources include MorphoSource and Smithsonian 3D collections.

The suggested pipeline is:

1. Acquire usable anatomical reference or scan data.
2. Reconstruct or clean the source mesh.
3. Sculpt missing surface detail in Blender.
4. Retopologize for real-time rendering.
5. Bake normal, displacement, and other texture maps.
6. Export as glTF or GLB.
7. Optimize and compress for browser delivery.

Dataset access and individual asset licenses must be checked.

---

# 3. Physically Based Biological Materials

## 3.1 Why Standard PBR Is Insufficient

A basic metallic/roughness material frequently makes marine life resemble painted plastic.

Real fish and corals have layered biological materials that interact with light differently.

The renderer should account for:

- Structural iridescence.
- Translucent membranes.
- Epidermal mucus.
- Micro-roughness.
- Tissue absorption.
- Fluorescence.

## 3.2 Structural Iridescence

Many reef fish exhibit angle-dependent coloration associated with microscopic structures such as guanine crystal layers.

Use:

`KHR_materials_iridescence`

A simplified thin-film interference relationship is:

\[
2nt\cos(\theta_t)=m\lambda
\]

Where:

- \(n\): refractive index of the film.
- \(t\): film thickness.
- \(\theta_t\): internal transmission angle.
- \(m\): interference order.
- \(\lambda\): wavelength.

The optical path difference changes with viewing angle, producing changing reflected colors.

The original discussion uses a refractive index of approximately 1.83 for guanine-related structures.

**Implementation:** Apply iridescence selectively to relevant fish scales, rather than uniformly across the entire body.

## 3.3 Fin and Coral Translucency

Use transmission and volume-related material behavior:

- `KHR_materials_transmission`
- `KHR_materials_volume`

Thin fins should transmit light differently from thick body tissue.

For coral, fleshy polyps should glow softly when illuminated from behind.

A thickness-aware transmission approximation can use:

\[
T=e^{-\sigma_t d}
\]

Where:

- \(\sigma_t\): extinction coefficient.
- \(d\): tissue thickness.

Thicker tissue transmits less light.

## 3.4 Epidermal Mucus Layer

Use:

`KHR_materials_clearcoat`

The mucus layer creates a wet, glossy appearance over the underlying scales.

The conversation suggests an approximate refractive index of 1.35 for the mucus layer.

The clearcoat should preserve underlying scale detail and should not make the fish look uniformly varnished.

## 3.5 Material Authoring Strategy

Use separate material controls for:

1. Base pigmentation.
2. Micro-scale normal detail.
3. Iridescence.
4. Clearcoat.
5. Translucency.
6. Roughness.
7. Fluorescent response.

This makes it possible to tune species-specific appearances.

---

# 4. Underwater Spectral Absorption

## 4.1 Why Ordinary Blue Fog Looks Wrong

Simple blue distance fog treats water as a uniform colored atmosphere.

Real underwater light transport depends on wavelength, distance, scattering, and illumination direction.

Red wavelengths generally attenuate more strongly than blue-green wavelengths in clear water.

This produces a depth-dependent spectral shift.

## 4.2 Beer-Lambert Law

The fundamental equation is:

\[
T_\lambda(d)=e^{-\sigma_\lambda d}
\]

Where:

- \(T_\lambda\): transmittance for wavelength channel \(\lambda\).
- \(\sigma_\lambda\): wavelength-dependent extinction coefficient.
- \(d\): optical travel distance.

For RGB rendering:

\[
\mathbf{T}(d)=
\begin{bmatrix}
e^{-\sigma_R d}\\
e^{-\sigma_G d}\\
e^{-\sigma_B d}
\end{bmatrix}
\]

A basic attenuation model is:

\[
\mathbf{L}_{out}
=
\mathbf{L}_{in}\odot\mathbf{T}(d)
\]

Here, \(\odot\) represents component-wise multiplication.

This describes attenuation, not the complete scattering behavior of water.

## 4.3 Dual-Path Absorption

The original conversation emphasizes a critical distinction: light travels through water before hitting an object and again after leaving that object toward the camera.

Define:

- \(d_{down}\): distance from the aquarium lighting to the surface.
- \(d_{view}\): distance from the surface to the viewer.

The direct illumination component is approximately:

\[
L_{\lambda,object}
=
L_{\lambda,source}
e^{-\sigma_\lambda d_{down}}
\]

The reflected light reaching the camera is:

\[
L_{\lambda,camera}
=
L_{\lambda,object}
f_r
e^{-\sigma_\lambda d_{view}}
\]

Where \(f_r\) represents the surface reflectance response.

Combining both paths:

\[
L_{\lambda,camera}
=
L_{\lambda,source}
f_r
e^{-\sigma_\lambda(d_{down}+d_{view})}
\]

This is a simplified direct-light model.

### Why the Two Paths Matter

A fish near the front glass may receive light that has traveled through a substantial water depth, but its reflected light has only a short distance to travel before reaching the camera.

Using only camera distance would incorrectly illuminate the fish.

Using only vertical light distance would fail to account for the underwater viewing path.

Both matter.

## 4.4 Implementation Approach

The shader needs:

- Object world position.
- Camera position.
- Light source position.
- Water volume boundaries.
- RGB extinction coefficients.
- Surface normal.
- Material response.

For each shaded surface:

1. Calculate the underwater light path.
2. Apply wavelength-dependent attenuation.
3. Evaluate the surface BRDF.
4. Calculate the underwater camera path.
5. Apply the second attenuation.
6. Add separately modeled scattering and fluorescence contributions.

For greater accuracy, ray segments should be clipped to the actual aquarium water volume rather than using unrestricted Euclidean distances.

---

# 5. Actinic Coral Fluorescence

## 5.1 Physical Explanation

Reef aquarium lighting frequently includes strong royal-blue illumination around 440–460 nm.

Fluorescent proteins in coral tissue absorb excitation light and emit photons at longer wavelengths.

Examples include green and red fluorescent proteins.

This is different from simply painting a coral with an emissive texture.

The fluorescent response depends on the incoming excitation illumination.

## 5.2 Fluorescence Model

A simplified fluorescent emission model is:

\[
L_{emit,\lambda_e}
=
\eta_f
A_{\lambda_x}
L_{excitation,\lambda_x}
\]

Where:

- \(\lambda_x\): excitation wavelength.
- \(\lambda_e\): emitted wavelength.
- \(\eta_f\): effective fluorescence efficiency.
- \(A_{\lambda_x}\): excitation absorption fraction.
- \(L_{excitation,\lambda_x}\): incident excitation light.

The emitted light then travels toward the camera through water:

\[
L_{camera,\lambda_e}
=
L_{emit,\lambda_e}
e^{-\sigma_{\lambda_e}d_{view}}
\]

## 5.3 Why This Matters

Red light emitted directly from the aquarium fixture may be attenuated before reaching deeper coral.

However, blue light can excite fluorescent proteins within the coral.

The newly emitted red or orange light only needs to travel from the coral to the camera.

This can produce vivid fluorescent coral colors even when the surrounding illumination is strongly blue.

## 5.4 Implementation Instructions

Use a dedicated fluorescence response rather than treating all emissive material as constant.

The shader should:

1. Measure incoming blue excitation intensity.
2. Apply an artist-controlled excitation mask.
3. Compute the fluorescent response.
4. Assign an emission spectrum or RGB approximation.
5. Attenuate the emission over the camera path.
6. Integrate it with the physically based surface lighting.

Use separate fluorescent masks for different coral tissues.

---

# 6. Water Surface Caustics

## 6.1 Physical Explanation

Caustics are concentrated patterns of light formed by refraction through a changing water surface.

They appear as bright moving networks across sand, coral, rocks, and fish.

Static projected textures tend to look artificial because they do not respond coherently to water motion.

## 6.2 Snell's Law

\[
n_1\sin(\theta_1)
=
n_2\sin(\theta_2)
\]

Where:

- \(n_1\), \(n_2\): refractive indices.
- \(\theta_1\): incident angle.
- \(\theta_2\): refracted angle.

For air and water, approximate refractive indices are:

\[
n_{air}\approx1.0
\]

\[
n_{water}\approx1.333
\]

## 6.3 Caustic Formation

A varying surface normal changes the direction of refracted rays.

Neighboring rays can converge, increasing local light intensity.

A conceptual relationship is:

\[
I_{caustic}
\propto
\frac{1}{|J|}
\]

Where \(J\) is the Jacobian determinant describing how a small region of the incoming ray bundle maps to the receiving surface.

Smaller projected areas concentrate energy and create brighter caustics.

## 6.4 Implementation Strategy

The conversation recommends a WebGPU-based approach using surface wave deformation and refracted light projection.

A practical pipeline is:

1. Generate an animated water-height field.
2. Derive the local surface normals.
3. Refract incident light through the surface.
4. Estimate where the rays strike underwater geometry.
5. Accumulate the resulting intensity.
6. Apply the caustic contribution during surface shading.

Chromatic dispersion may be introduced by varying refractive behavior slightly between wavelength channels.

The effect should remain subtle in a realistic aquarium.

---

# 7. Fish Biomechanics and Swimming Motion

## 7.1 Why Keyframe Loops Are Insufficient

Repeated skeletal animation cycles often produce fish that appear robotic.

Real fish adapt body curvature, fin motion, and tail amplitude to:

- Swimming speed.
- Turning radius.
- Acceleration.
- Species-specific swimming style.
- Local flow conditions.

The simulation should generate motion from behavioral and biomechanical parameters.

## 7.2 Swimming Guilds

The original discussion identifies three important locomotion profiles.

### Labriform

Common in many wrasses and other pectoral-fin swimmers.

Characteristics:

- Propulsion dominated by pectoral fins.
- Relatively stable body.
- Subtle tail movement during slow swimming.
- Independent fin oscillation.

### Carangiform

Common in many actively swimming reef fish.

Characteristics:

- Propulsive body undulation concentrated toward the posterior body.
- Larger tail motion.
- Reduced head movement.
- Stronger axial movement at higher speeds.

### Balistiform

Associated with fish such as triggerfish.

Characteristics:

- Coordinated dorsal and anal fin movement.
- Relatively rigid body.
- Precise maneuvering.
- Different propulsion pattern from tail-dominated swimmers.

Each swimming guild should have its own deformation parameters.

## 7.3 Traveling-Wave Body Undulation

A simplified Lighthill-style swimming model is:

\[
y(x,t)
=
A(x)\sin(kx-\omega t+\phi)
\]

Where:

- \(x\): longitudinal body position.
- \(A(x)\): amplitude envelope.
- \(k\): spatial wave number.
- \(\omega\): angular frequency.
- \(t\): time.
- \(\phi\): phase.

The amplitude envelope may be represented as:

\[
A(x)=a_0+a_1x+a_2x^2
\]

For tail-driven swimming, the envelope should generally increase toward the posterior body.

This produces small head movement and larger tail excursions.

## 7.4 Speed-Dependent Motion

Swimming frequency and amplitude should respond to velocity.

A simple control relationship is:

\[
f(v)=f_0+k_f|v|
\]

\[
A(v)=A_0+k_A|v|
\]

Where:

- \(f_0\): baseline oscillation frequency.
- \(A_0\): baseline amplitude.
- \(k_f\), \(k_A\): tuning coefficients.

These are implementation controls rather than universal biological laws.

Different species should use different response curves.

## 7.5 Curvilinear Swimming

A critical issue is that fish must bend relative to their actual trajectory.

A fish turning through a coral formation should not simply rotate a rigid mesh while continuing a straight-line tail animation.

The body should respond to path curvature.

For trajectory \(\mathbf{r}(s)\), the local tangent is:

\[
\mathbf{T}(s)
=
\frac{d\mathbf{r}/ds}
{\|d\mathbf{r}/ds\|}
\]

The local frame can be constructed from the tangent and suitable up/right vectors.

Body deformation should be evaluated within this moving frame.

## 7.6 GPU Vertex Deformation

The conversation recommends vertex deformation on the GPU.

A fish mesh should contain attributes indicating:

- Longitudinal body position.
- Pectoral fin influence.
- Fin membrane flexibility.
- Iridescence distribution.

For each fish instance, the GPU receives:

- Position.
- Heading.
- Speed.
- Swimming phase.
- Locomotion type.
- Turning parameters.

The vertex shader then computes the appropriate body and fin deformation.

This avoids running a separate CPU skeletal animation system for every fish.

---

# 8. Fish Schooling and Autonomous Behavior

## 8.1 Behavioral Requirements

Fish should respond to:

- Nearby fish.
- Coral and rock geometry.
- Tank boundaries.
- Preferred swimming regions.
- Local flow.
- Species-specific behavior.
- Predetermined habitat preferences.

The goal is convincing autonomous movement rather than random wandering.

## 8.2 Boids-Based Schooling

The classic schooling model combines three forces.

### Separation

Move away from nearby fish to prevent collisions.

A simplified form is:

\[
\mathbf{F}_{sep}
=
\sum_j
\frac{\mathbf{x}_i-\mathbf{x}_j}
{\|\mathbf{x}_i-\mathbf{x}_j\|^2+\epsilon}
\]

### Alignment

Steer toward the average heading of nearby fish.

\[
\mathbf{F}_{align}
=
\overline{\mathbf{v}}_{neighbors}
-
\mathbf{v}_i
\]

### Cohesion

Steer toward the local group's center.

\[
\mathbf{F}_{coh}
=
\overline{\mathbf{x}}_{neighbors}
-
\mathbf{x}_i
\]

## 8.3 Combined Steering

\[
\mathbf{F}_{total}
=
w_s\mathbf{F}_{sep}
+
w_a\mathbf{F}_{align}
+
w_c\mathbf{F}_{coh}
+
w_o\mathbf{F}_{obstacle}
+
w_h\mathbf{F}_{habitat}
\]

Where the weights control the importance of each behavior.

These weights should differ by species.

For example, a tightly schooling fish may use stronger alignment and cohesion than a solitary territorial fish.

## 8.4 Velocity Integration

A simplified simulation update is:

\[
\mathbf{v}_{t+\Delta t}
=
\mathbf{v}_t
+
\mathbf{a}_t\Delta t
\]

\[
\mathbf{x}_{t+\Delta t}
=
\mathbf{x}_t
+
\mathbf{v}_{t+\Delta t}\Delta t
\]

The simulation should impose biologically plausible acceleration, speed, and turn-rate limits.

## 8.5 Why GPU Compute Is Necessary

Naively checking every fish against every other fish requires:

\[
O(N^2)
\]

neighbor comparisons.

At 2,000 fish, this could involve roughly four million pairwise comparisons per update.

The proposed solution is a GPU spatial hash grid.

---

# 9. GPU Spatial Hash Grid

## 9.1 Purpose

Divide the aquarium into 3D cells.

Each fish is assigned to a cell based on its position.

When evaluating neighbors, inspect the current cell and adjacent cells instead of the entire population.

## 9.2 Cell Coordinates

For world position \(\mathbf{x}\), origin \(\mathbf{o}\), and cell size \(h\):

\[
\mathbf{c}
=
\left\lfloor
\frac{\mathbf{x}-\mathbf{o}}{h}
\right\rfloor
\]

The integer cell coordinates can be mapped to a linear index or hashed key.

## 9.3 Neighborhood Search

A 3D neighborhood includes:

\[
3\times3\times3=27
\]

cells.

This captures the current cell and its 26 immediate neighbors.

The cell size should be selected relative to the fish perception radius.

## 9.4 WebGPU Implementation

Use compute passes to:

1. Clear cell counters.
2. Assign each fish to a grid cell.
3. Atomically increment cell occupancy.
4. Store fish indices in the spatial structure.
5. Query neighboring cells.
6. Calculate steering forces.
7. Integrate velocity and position.

The original conversation proposes atomic operations for parallel cell construction.

### Why This Helps

The cost becomes dependent on local neighborhood density rather than the total number of fish.

This is particularly useful for large schools of Chromis or Anthias.

---

# 10. Coral and Rock Collision Avoidance

## 10.1 Why Bounding Boxes Are Inadequate

Complex reef geometry contains:

- Narrow channels.
- Branching coral structures.
- Overhangs.
- Cavities.
- Irregular rock surfaces.

Simple bounding boxes prevent fish from swimming naturally through these spaces.

The proposed solution is a 3D signed distance field.

## 10.2 Signed Distance Field

Define:

\[
\phi(\mathbf{x})
\]

as the signed distance from point \(\mathbf{x}\) to the nearest surface.

A common convention is:

- Positive outside solid geometry.
- Zero on the surface.
- Negative inside solid geometry.

The sign convention must remain consistent throughout the implementation.

## 10.3 Surface Gradient

The gradient is:

\[
\nabla\phi(\mathbf{x})
\]

The normalized gradient provides an approximate outward surface direction:

\[
\mathbf{n}_{sdf}
=
\frac{\nabla\phi}
{\|\nabla\phi\|}
\]

This can be used to steer fish away from obstacles.

## 10.4 Tetrahedral Gradient Approximation

The conversation recommends a four-sample tetrahedral approximation rather than six-sample central differences.

Use the offset vectors:

\[
\mathbf{k}_0=(1,-1,-1)
\]

\[
\mathbf{k}_1=(-1,-1,1)
\]

\[
\mathbf{k}_2=(-1,1,-1)
\]

\[
\mathbf{k}_3=(1,1,1)
\]

A gradient estimate is:

\[
\nabla\phi(\mathbf{x})
\approx
\frac{1}{4h}
\sum_{i=0}^{3}
\mathbf{k}_i
\phi(\mathbf{x}+h\mathbf{k}_i)
\]

Where \(h\) is the sampling offset.

The scaling factor is less important when only the normalized gradient is required.

## 10.5 Tangential Obstacle Avoidance

Directly steering away from an obstacle normal can produce abrupt, unnatural movement.

Instead, fish should often turn around the obstacle.

Let:

- \(\mathbf{v}\): current velocity.
- \(\mathbf{n}\): obstacle normal.

A tangential velocity component can be calculated as:

\[
\mathbf{v}_{tan}
=
\mathbf{v}
-
(\mathbf{v}\cdot\mathbf{n})\mathbf{n}
\]

Normalize this vector to obtain a direction approximately parallel to the surface.

Blend tangential steering with outward avoidance based on distance.

## 10.6 Safety Radius

Avoidance strength can increase as the fish approaches the obstacle.

For example:

\[
w(d)
=
\operatorname{clamp}
\left(
\frac{r_{safe}-d}{r_{safe}},
0,1
\right)
\]

Where:

- \(d\): distance to obstacle.
- \(r_{safe}\): desired clearance.

This creates stronger avoidance near coral branches.

---

# 11. GPU SDF Generation

## 11.1 Why Bake an SDF?

Computing the distance from every fish to every triangle of a dense reef mesh would be too expensive.

Instead, the static reef geometry can be converted into a 3D distance texture.

Fish then sample the texture at their current or predicted positions.

## 11.2 Jump Flooding Algorithm

The original conversation proposes a WebGPU-based 3D Jump Flooding Algorithm.

The general procedure is:

1. Voxelize the coral and rock geometry.
2. Identify surface voxels.
3. Initialize each surface voxel with its seed position.
4. Propagate nearest-seed candidates through the volume.
5. Reduce the propagation step size across passes.
6. Calculate approximate distances to the nearest surface.
7. Apply the inside/outside sign.

For a grid resolution \(R\), the jump sizes decrease approximately as:

\[
R/2,\ R/4,\ R/8,\ldots,1
\]

The number of jump scales is approximately:

\[
\log_2(R)
\]

## 11.3 Memory Considerations

A volume of resolution:

\[
256^3
\]

contains:

\[
16,777,216
\]

voxels.

At two bytes per voxel, a single-channel 16-bit distance volume requires approximately 32 MiB before additional storage, mipmaps, or temporary buffers.

Temporary multi-channel textures can require substantially more memory.

The final runtime SDF should therefore use a compact representation where practical.

## 11.4 Recommended Architecture

Bake the SDF when static reef geometry changes.

Do not regenerate the entire volume every frame.

Dynamic fish should query the existing volume, while dynamic obstacles may require additional local avoidance logic.

---

# 12. Coral Polyp Hydrodynamics

## 12.1 Why Coral Must Move

Static coral colonies look artificial, particularly when viewed close up.

Real soft tissue responds continuously to aquarium circulation.

The conversation recommends driving coral movement with a shared 3D flow field.

## 12.2 Curl Noise

Start with a procedural vector potential:

\[
\mathbf{A}(\mathbf{x},t)
\]

Construct the flow field:

\[
\mathbf{u}(\mathbf{x},t)
=
\nabla\times\mathbf{A}(\mathbf{x},t)
\]

A curl field is divergence-free under the usual smoothness assumptions:

\[
\nabla\cdot\mathbf{u}=0
\]

This is useful for creating swirling motion without artificial sources or sinks in the procedural velocity field.

It is not a full fluid simulation, but it can provide convincing aquarium circulation.

## 12.3 Tentacle Deformation

For a tentacle vertex with normalized height \(h\):

\[
h\in[0,1]
\]

the displacement can be modeled as:

\[
\Delta\mathbf{x}
=
w(h)\mathbf{u}(\mathbf{x},t)
\]

A common weighting function is:

\[
w(h)=h^p
\]

Where \(p\) controls how strongly motion is concentrated toward the tip.

The base remains relatively fixed while the distal tissue moves more freely.

## 12.4 Different Coral Motion Profiles

### SPS Coral

- Mostly rigid skeleton.
- Small, fine polyp motion.
- High instance counts.
- Low deformation amplitude.

### LPS Coral

- Large fleshy tentacles.
- More visible bending.
- Slower movement.
- Stronger translucency.
- Greater variation between neighboring tentacles.

The same flow field can drive both types, with different response parameters.

## 12.5 Instancing Strategy

Rather than creating a separate draw call for each polyp:

1. Build reusable polyp and tentacle geometry.
2. Store instance transforms.
3. Store per-instance phase and flexibility parameters.
4. Evaluate flow deformation in the vertex shader.
5. Render large groups using GPU instancing.

This reduces CPU overhead and helps support dense coral colonies.

---

# 13. Coral Subsurface Appearance

## 13.1 Optical Goals

Coral tentacles should exhibit:

- Soft transmitted light.
- Tissue-dependent absorption.
- Backlit edge glow.
- Surface gloss.
- Fluorescent emission under actinic lighting.

## 13.2 Thickness-Aware Transmission

Use a simplified Beer-Lambert model:

\[
T=e^{-\sigma_t d}
\]

Where \(d\) represents local tissue thickness.

Thin tentacle edges should transmit more light than thick tissue regions.

## 13.3 Backlighting Approximation

A real-time approximation may depend on the relationship between light direction and surface normal.

For example:

\[
B=
\max(0,-\mathbf{N}\cdot\mathbf{L})
\]

Where:

- \(\mathbf{N}\): surface normal.
- \(\mathbf{L}\): direction toward the light.

The backlighting factor can be modulated by thickness and tissue color.

This is an artistic approximation of subsurface transport rather than a complete volumetric scattering solution.

## 13.4 Fluorescence Integration

Use separate excitation and emission responses.

Fluorescence should not be confused with ordinary specular reflection or transmission.

The final material combines:

\[
L_{final}
=
L_{surface}
+
L_{transmitted}
+
L_{fluorescent}
\]

Each term should be evaluated consistently with underwater attenuation.

---

# 14. Aquarium Glass and Refraction

## 14.1 Why Glass Matters

The aquarium should look like a physical glass enclosure, not simply an underwater scene with a camera placed inside it.

Glass introduces:

- Refraction.
- Fresnel reflection.
- Multiple optical boundaries.
- Distortion.
- Potential total internal reflection.
- Edge reflections.

## 14.2 Snell's Law

\[
n_1\sin\theta_1
=
n_2\sin\theta_2
\]

The ray direction changes when crossing between media with different refractive indices.

For an aquarium, relevant interfaces include:

- Air to glass.
- Glass to water.
- Water to glass.
- Glass to air.

## 14.3 Fresnel Reflection

The Schlick approximation is:

\[
F(\theta)
=
F_0+(1-F_0)(1-\cos\theta)^5
\]

Where:

\[
F_0=
\left(
\frac{n_1-n_2}{n_1+n_2}
\right)^2
\]

This approximates how reflectivity increases at grazing angles.

For realistic glass, reflectivity should vary with viewing angle.

## 14.4 Total Internal Reflection

For light traveling from a higher-index medium to a lower-index medium:

\[
\theta_c
=
\arcsin\left(\frac{n_2}{n_1}\right)
\]

For water to air:

\[
\theta_c
=
\arcsin\left(\frac{1.0}{1.333}\right)
\]

\[
\theta_c\approx48.6^\circ
\]

Above this incidence angle, total internal reflection occurs at the ideal interface.

For water to glass, where ordinary glass has a higher refractive index than water, this particular transition does not produce total internal reflection.

The original conversation also discusses a critical angle near 61 degrees for glass-to-air transitions, depending on the assumed glass index.

## 14.5 Rendering Strategy

The aquarium glass system should:

1. Identify the current optical medium.
2. Evaluate the interface normal.
3. Calculate Fresnel reflection.
4. Calculate the refracted direction.
5. Detect total internal reflection where physically possible.
6. Blend reflected and transmitted contributions.
7. Apply underwater absorption to relevant ray segments.

A simplified screen-space approach may be used for performance.

For higher realism, thickness-aware refraction or more advanced ray-based rendering can be considered.

---

# 15. Marine Snow and Micro-Bubbles

## 15.1 Purpose

Perfectly clear water often looks synthetic.

Real aquariums contain suspended particles, fine debris, and occasionally microscopic bubbles.

These help communicate depth and water movement.

## 15.2 Particle Advection

Particle positions evolve according to the flow field:

\[
\frac{d\mathbf{x}}{dt}
=
\mathbf{u}(\mathbf{x},t)
+
\mathbf{v}_{drift}
\]

Where:

- \(\mathbf{u}\): local water velocity.
- \(\mathbf{v}_{drift}\): buoyancy or settling velocity.

For a discrete timestep:

\[
\mathbf{x}_{t+\Delta t}
=
\mathbf{x}_t
+
\left(
\mathbf{u}(\mathbf{x}_t,t)
+
\mathbf{v}_{drift}
\right)\Delta t
\]

## 15.3 Different Particle Types

### Marine Snow

- Slow movement.
- Low opacity.
- Irregular particle sizes.
- Weak light scattering.
- May settle or remain suspended.

### Micro-Bubbles

- Positive buoyancy.
- Faster upward movement.
- Stronger highlights.
- Small refractive or reflective appearance.

## 15.4 GPU Implementation

Use instanced particles or GPU-driven particle buffers.

Each particle stores:

- Position.
- Size.
- Velocity or drift parameter.
- Random phase.
- Lifetime or recycling state.

The GPU updates positions without individual CPU object management.

Particle density should remain subtle.

Excessive particles can make the aquarium resemble murky water rather than a clean reef display.

---

# 16. Rendering and Simulation Integration

## 16.1 Separate Simulation From Rendering

The application should have distinct responsibilities:

### Simulation

- Fish behavior.
- Neighbor searches.
- Collision avoidance.
- Position and velocity integration.
- Flow-field evaluation.

### Rendering

- Fish deformation.
- Biological materials.
- Coral motion.
- Water optics.
- Glass.
- Particles.
- Postprocessing.

This separation allows simulation and rendering to operate at different update frequencies if necessary.

## 16.2 Recommended Frame Sequence

A conceptual frame pipeline is:

1. Update global simulation time.
2. Update flow-field parameters.
3. Rebuild the fish spatial grid.
4. Evaluate schooling and obstacle avoidance.
5. Integrate fish positions and velocities.
6. Update fish instance data.
7. Evaluate fish vertex deformation.
8. Evaluate coral polyp deformation.
9. Render opaque reef geometry.
10. Render fish and biological materials.
11. Render translucent effects and particles.
12. Composite water, glass, and postprocessing effects.

The exact pass order must account for transparency, depth, and the renderer's supported pipeline.

## 16.3 GPU Data Layout

Fish instance data should remain in GPU buffers wherever possible.

Useful fields include:

- Position.
- Velocity.
- Heading.
- Species identifier.
- Animation phase.
- Swimming speed.
- Behavior parameters.
- Random seed.

Avoid transferring large simulation arrays between CPU and GPU every frame.

---

# 17. Asset Optimization

## 17.1 Why Optimization Is Necessary

Photorealistic assets can consume substantial memory and bandwidth.

Potential bottlenecks include:

- High polygon counts.
- Thousands of draw calls.
- Large textures.
- Excessive material variants.
- Repeated mesh data.
- Expensive transparency.
- High-resolution volumetric textures.

Optimization must preserve perceptually important detail.

## 17.2 Mesh Optimization

Use gltfpack and meshoptimizer for:

- Vertex cache optimization.
- Attribute quantization.
- Mesh compression.
- Efficient glTF packaging.
- Level-of-detail workflows.

Retain high detail for nearby fish and coral.

Use lower-detail representations for distant or small objects.

## 17.3 Texture Compression

Use KTX2 with Basis Universal.

The original discussion recommends:

- UASTC for quality-sensitive normal maps.
- ETC1S where smaller texture sizes are acceptable.
- Mipmaps for efficient sampling at different distances.

Texture format selection should depend on the visual importance of the map.

## 17.4 Asset Pipeline Example

```bash
#!/bin/bash
set -e

mkdir -p public/models public/textures

# Optimize source meshes.
for file in assets_raw/models/*.gltf; do
    name=$(basename "$file" .gltf)

    gltfpack \
      -i "$file" \
      -o "public/models/$name.glb" \
      -cc \
      -tc \
      -qi 10
done

# Compress textures.
for file in assets_raw/textures/*.png; do
    name=$(basename "$file" .png)

    toktx \
      --t2 \
      --genmipmap \
      "public/textures/$name.ktx2" \
      "$file"
done
```

This is an illustrative pipeline from the conversation, not a validated production script. Compression settings, gltfpack flags, and texture encoding should be reviewed for the installed tool versions and the intended material types.

---

# 18. Performance Strategy

## 18.1 Main Performance Principles

The conversation repeatedly emphasizes that rendering performance should be addressed architecturally.

Important techniques include:

- GPU compute for fish behavior.
- Spatial hashing for neighborhood searches.
- Instanced fish and coral geometry.
- Vertex shaders for biological deformation.
- Precomputed reef distance fields.
- Compressed GPU textures.
- Mesh optimization.
- Level of detail.
- Minimal CPU-to-GPU transfers.
- Reduced draw-call counts.

## 18.2 Level of Detail

Use different representations based on projected screen size.

### Near Camera

- High-detail geometry.
- Full biological materials.
- Fin deformation.
- Detailed scale normal maps.

### Mid Distance

- Reduced geometry.
- Simplified materials.
- Lower-frequency deformation.
- Reduced texture resolution.

### Far Distance

- Aggressively simplified meshes.
- Minimal shader complexity.
- Reduced animation detail.
- Potentially batched schools.

## 18.3 GPU Memory

Track the memory required for:

- Fish meshes and instance buffers.
- Coral geometry.
- Texture arrays.
- SDF volumes.
- Compute scratch buffers.
- Render targets.
- Transparency and postprocessing.

Do not assume that high-end desktop performance translates directly to mobile devices.

## 18.4 Performance Targets

The conversation proposes a goal of approximately 60 FPS or higher while displaying dense reef geometry and large fish populations.

This should be treated as a target rather than a demonstrated result.

Performance must be measured on representative hardware.

---

# 19. Suggested Source Organization

A possible project structure is:

```text
src/
  main.ts

  engine/
    renderer.ts
    scene.ts
    simulation.ts

  shaders/
    aquariumOptics.ts
    fishBiomechanics.ts
    fishSchoolCompute.ts
    coralPolypShader.ts
    aquariumEnvironment.ts

  simulation/
    fishBehavior.ts
    spatialGrid.ts
    flowField.ts

  utils/
    sdfBaker.ts
    assetLoader.ts

  assets/
    species/
    corals/
    environment/

scripts/
  optimizeAssets.sh

public/
  models/
  textures/
```

The original conversation specifically discusses modules corresponding to:

- Aquarium optics.
- Fish kinematics.
- Fish schooling compute.
- Coral polyp shaders.
- Aquarium environment rendering.
- SDF baking.
- Asset optimization.

These modules should have clearly defined GPU resource ownership and data interfaces.

---

# 20. Recommended Development Sequence

The conversation provides the major systems rather than a fully tested build sequence. The following order organizes those systems by dependency.

## Phase 1: Renderer Foundation

- Initialize Vite and TypeScript.
- Configure Three.js WebGPURenderer.
- Build a basic aquarium enclosure.
- Add a camera and lighting.
- Load a glTF test model.
- Verify material and shader compatibility.

**Goal:** Establish a stable rendering foundation.

## Phase 2: Underwater Optics

- Implement spectral Beer-Lambert attenuation.
- Distinguish illumination and viewing paths.
- Add underwater scattering approximations.
- Implement moving caustics.
- Add fluorescence controls.

**Goal:** Make the aquarium environment visually convincing before introducing complex behavior.

## Phase 3: Biological Assets

- Build one detailed reef fish.
- Add scale, fin, and mucus materials.
- Build one SPS coral.
- Build one LPS coral.
- Implement reusable material configurations.

**Goal:** Establish a high-quality visual reference.

## Phase 4: Fish Locomotion

- Implement body-wave deformation.
- Add swimming guild parameters.
- Implement pectoral and other fin movement.
- Connect swimming speed to deformation.
- Support curvilinear movement.

**Goal:** Make one fish move convincingly.

## Phase 5: Autonomous Fish Simulation

- Add GPU instance data.
- Implement schooling forces.
- Build the spatial hash grid.
- Add speed and acceleration limits.
- Introduce species-specific behavior.

**Goal:** Support many fish without CPU bottlenecks.

## Phase 6: Reef Navigation

- Voxelize static reef geometry.
- Generate the 3D SDF.
- Implement gradient sampling.
- Add tangential obstacle avoidance.
- Test narrow coral passages.

**Goal:** Make fish navigate dense reef structures naturally.

## Phase 7: Coral Animation

- Implement the shared curl-noise flow field.
- Add instanced SPS polyps.
- Add flexible LPS tentacles.
- Integrate translucency and fluorescence.

**Goal:** Create a living, responsive reef environment.

## Phase 8: Aquarium Enclosure

- Add glass refraction.
- Implement Fresnel reflection.
- Handle total internal reflection.
- Add suspended particles and bubbles.

**Goal:** Make the scene appear to exist inside a physical aquarium.

## Phase 9: Optimization

- Compress meshes and textures.
- Introduce LOD.
- Profile compute passes.
- Profile shader complexity.
- Reduce draw calls.
- Measure memory and frame time.

**Goal:** Approach the desired frame rate while retaining realism.

---

# 21. Mathematical Reference

## Beer-Lambert Attenuation

\[
T_\lambda(d)=e^{-\sigma_\lambda d}
\]

Models wavelength-dependent attenuation through water or tissue.

## Dual-Path Attenuation

\[
L_{\lambda,camera}
=
L_{\lambda,source}
f_r
e^{-\sigma_\lambda(d_{down}+d_{view})}
\]

Simplified model of direct underwater illumination and viewing.

## Snell's Law

\[
n_1\sin\theta_1=n_2\sin\theta_2
\]

Determines refraction between media.

## Critical Angle

\[
\theta_c=\arcsin(n_2/n_1)
\]

Applies to light traveling from a higher to a lower refractive index.

## Fresnel-Schlick Approximation

\[
F=F_0+(1-F_0)(1-\cos\theta)^5
\]

Approximates angle-dependent reflection.

## Swimming Body Wave

\[
y(x,t)=A(x)\sin(kx-\omega t+\phi)
\]

Models traveling-wave fish body deformation.

## Swimming Amplitude Envelope

\[
A(x)=a_0+a_1x+a_2x^2
\]

Controls deformation along the fish's body.

## Boids Steering

\[
F=
w_sF_{sep}
+w_aF_{align}
+w_cF_{coh}
+w_oF_{obstacle}
\]

Combines schooling and obstacle avoidance.

## Signed Distance Gradient

\[
n_{sdf}
=
\frac{\nabla\phi}{\|\nabla\phi\|}
\]

Provides the local outward obstacle direction.

## Tangential Steering

\[
v_{tan}=v-(v\cdot n)n
\]

Projects movement along a surface.

## Curl-Noise Flow

\[
u=\nabla\times A
\]

Generates a divergence-free procedural flow field.

## Particle Integration

\[
x_{t+\Delta t}
=
x_t+v_t\Delta t
\]

Updates particle or fish position.

## Fluorescence

\[
L_{emit}
=
\eta_f A L_{excitation}
\]

Simplified excitation-dependent fluorescent emission.

---

# 22. Final Architectural Principles

The original discussion establishes several recurring principles.

**1. Prioritize physically motivated rendering.**

Water should affect light through spectral attenuation, scattering, refraction, and caustics. It should not be represented solely by colored fog.

**2. Biological materials require layers.**

Fish scales, mucus, translucent fins, and coral tissue need distinct optical responses.

**3. Fish movement must be biomechanical.**

Body undulation, fin motion, turning, and acceleration should respond to swimming behavior.

**4. Schooling must scale efficiently.**

Use GPU compute and spatial partitioning instead of all-pairs CPU neighbor searches.

**5. Reef navigation requires geometric awareness.**

Use signed distance fields and tangential avoidance to navigate complex coral structures.

**6. Coral must respond to water movement.**

A shared flow field can animate thousands of coral polyps efficiently.

**7. The aquarium enclosure is part of the visual simulation.**

Glass, surface reflections, suspended particles, and optical boundaries contribute significantly to realism.

**8. Asset quality and runtime optimization must coexist.**

High-resolution source models should be converted into efficient real-time representations without sacrificing important visual detail.

**9. Simulation and rendering should be decoupled.**

Maintain reusable GPU data structures and avoid unnecessary transfers between CPU and GPU.

**10. Validate the integrated system incrementally.**

Each shader, compute pass, and asset pipeline stage should be tested independently before combining all systems.

---

# 23. Implementation Caveats

The original Gemini conversation includes extensive proposed Three.js TSL and WebGPU source code.

Those examples should be treated as implementation proposals, not confirmed working APIs.

Before using them in production:

- Verify current Three.js TSL and WebGPU interfaces.
- Confirm WebGPU storage texture and compute capabilities.
- Validate glTF material extension support in the chosen renderer.
- Check the behavior of compressed texture loaders.
- Test the 3D SDF generation and sign conventions.
- Confirm synchronization between GPU compute and rendering.
- Check shader compilation on target browsers.
- Validate performance on actual hardware.
- Review the licenses of scanned models, textures, and reference assets.

Some equations are simplified physical approximations, especially those concerning fluorescence, underwater scattering, and coral subsurface transport.

The intended outcome is a visually convincing real-time simulation, not a fully spectrally accurate path-traced aquarium.

---

# Conclusion

The proposed aquarium is best understood as a GPU-driven real-time ecosystem rather than a conventional 3D scene.

Its major systems are:

1. WebGPU rendering and compute.
2. High-quality biological geometry.
3. Layered physically based materials.
4. Spectral underwater optics.
5. Biomechanical fish locomotion.
6. GPU schooling and spatial indexing.
7. SDF-based reef navigation.
8. Flow-driven coral animation.
9. Aquarium glass and suspended particles.
10. Automated asset optimization.

The strongest overall recommendation from the conversation is to use **Three.js WebGPURenderer with TSL, Blender, glTF 2.0, GPU compute shaders, and an optimized asset pipeline**.

The most important realism improvements are expected to come from accurate underwater light transport, species-specific fish movement, convincing biological materials, and coordinated environmental motion.


