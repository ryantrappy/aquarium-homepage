# Aquarium design principles

<!-- AGENT_DOC_METADATA
Category: Governance / Design Principles
Status: Canonical / Active
Authority: Binding Aesthetic & Architectural Guidance
Backlog: AQ-14, AQ-14.1, AQ-12
Owner: @root
Updated: 2026-11-05
Upstream: AGENTS.md, docs/requirements.md
Downstream: All 3D scene, shader, and UI implementations
-->

> [!NOTE]
> **Agent Context & Authority**
> - **Category**: Design Guidance & Visual Principles
> - **Status**: Canonical / Active
> - **Authority**: Binding Guidance
> - **Backlog Reference**: `AQ-14`
> - **Summary**: Architectural principles for realistic tank depth, crisp live rock/coral/sand habitat, living fish motion, unobtrusive controls, and $0 CC0/CC-BY 4.0 asset constraints.

## Primary goal

Make the homepage feel like a photorealistic, living reef aquarium. Realistic fish should fill almost the entire main view and act as the clickable links to configured homelab services. The aquarium and fish experience is the project's main success criterion.

Use [`docs/more-realistic-reef-guide.png`](more-realistic-reef-guide.png) (and its breakdown in [`docs/photorealism-reference.md`](photorealism-reference.md#0-project-goal-visual)) as the project's target **goal visual** for aquascape composition (Left Peak, Center Arch, Right Island), coral variety, modular Blender assets, and Three.js water/lighting realism.

## Build the tank as a crisp habitat

- Use a straight-on view through the front glass into the water portion of a reef display tank, with true perspective and deep focus.
- Keep live rock, coral, and sand crisp and recognizable as an actual aquascape. Do not use a blurry underwater background, generic open-ocean vignette, or a scene that reads as an ocean illustration instead of a contained aquarium.
- Let the habitat fill the main view so the fish and tank remain the subject.
- Model the reef in true 3D depth. Fish should move naturally in front of and behind reef structures, route around solid rock and coral, and use compatible habitat locations such as crevices, hideouts, perches, host anemones, and foraging surfaces. Keep the straight-on contained tank composition.
- Treat rock and coral as actual occluders for fish rendering, labels, and click targets: a fish hidden behind solid structure should not appear in front of it or remain clickable through it. Keep visible service labels and links correctly associated with their fish.

## Fish should look alive

- Use high-quality, appropriately licensed fish assets and rendering techniques that support realistic body, fin, and tail motion.
- Give species distinct swimming speed, turning, acceleration, and apparent depth. Fish should bank and change orientation as they swim, rather than translate as flat images.
- Integrate fish with the tank through believable light, color, scale, depth, and occlusion. Review choices against real fish, including the [NOAA Banggai cardinalfish reference](https://www.fisheries.noaa.gov/species/banggai-cardinalfish/resources) and [Monterey Bay Aquarium clownfish reference](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish).
- A still cutout moving across the scene can be a temporary scaffold or reduced-motion fallback, but it does not satisfy the finished lifelike animation goal.
- Define distinct stable-ID keyed behavior profiles for all 15 target species from the [sourced roster briefs](reef-fish-roster.md), and have a shared engine consume them. Each profile should describe appropriate locomotion, speed and turning, depth/zone preference, compatible habitat interactions, and only the supported idle, swim, forage, and retreat states. Individual fish should vary independently within their species profile; do not give every fish the same hard-coded movement. A user-facing profile editor is not part of this requirement. See [AQ-35](../backlog/tasks/aq-35%20-%20Define-typed-behavior-profiles-for-all-15-reef-fish-species.md).
- Use [Sketchfab's Virtual Aquarium ALL Fish Animated](https://sketchfab.com/3d-models/virtual-aquarium-all-fish-animated-8de6bc7d49c64649910a199e7405ecb6) only as an animation inspiration and guide. Attribute the reference, record observed playback separately from page metadata, and do not presume roster equivalence or reuse rights. See [AQ-36](../backlog/tasks/aq-36%20-%20Review-the-Sketchfab-animated-aquarium-as-a-fish-motion-reference.md).
- Mesh2Motion may be evaluated as a rigging and animation-transfer workflow, not presumed as the chosen approach. Verify the exact source and license for every candidate asset, assess whether body, fin, and caudal articulation suits different fish shapes, and preserve species-specific behavior and independently varied paths. A proof may import and export owned or appropriately licensed samples; consider any production workflow change separately after evidence. See [AQ-37](../backlog/tasks/aq-37%20-%20Investigate-Mesh2Motion-fish-rigs-and-animation-transfer.md).
- AQ-5 compares [PlayCanvas](https://playcanvas.com/), [Three.js](https://threejs.org/), and [Babylon.js](https://www.babylonjs.com/) as candidate engines; no engine is preselected. The investigator chooses the best fit based on the aquarium requirements and a fair comparison using the same fish and reef assets and comparable rig/animation inputs. Separate engine capability from source asset and rig quality, including limitations of the prior Three.js fish study. Evaluate realistic articulated swimming, reef depth and coral occlusion/interactions, materials and lighting, React/Vite/TanStack Start TypeScript integration, and the two target viewports. See [AQ-5](../backlog/tasks/aq-5%20-%20Select-realistic-fish-assets-and-animation-approach.md) and the Babylon.js candidate review in [AQ-38](../backlog/tasks/aq-38%20-%20Evaluate-Babylon.js-for-photorealistic-reef-and-animated-fish-rendering.md).

The scene-level implementation is tracked in [AQ-34](../backlog/tasks/aq-34%20-%20Build-a-true-3D-reef-scene-with-depth-aware-fish-and-habitat-interactions.md), which may depend on the rendering decision in AQ-5; AQ-5 itself remains unchanged.

## Keep service navigation inside the aquarium

- Fish are real service launch links. Their service names remain clear and readable while the fish turns and changes depth.
- Keep persistent controls small and aquarium-themed. Pause and settings should remain easy to find, while management lists and other secondary controls can live inside settings.
- Do not show a page header, marketing title, fixed service dock, or permanent "On the reef" list on the main view. A compact Services button opens the service list in a modal only after deliberate selection.
- Keep Pause, Services, and Settings controls compact. Avoid letting marketing copy, fixed docks, or app cards dominate the water or compete with the fish.
- When a fish is activated, open its URL in a new tab immediately. The fish can startle and recover as a later animation behavior without delaying navigation.

## Let the visual design evolve

The OpenPencil source and preview establish an editable starting direction. Refine and change the composition as needed to achieve the photorealistic aquarium goal; the existing typography and layout do not constrain later art direction. Keep the working design source editable and provide an updated preview as the design changes.

## Motion and access

Fish motion should feel natural without making links hard to select. Keep labels readable, provide a pause control, respect the system reduced-motion preference, and retain keyboard operation for service links and settings.

When the fish and tank foundation is ready, add restrained habitat movement: subtle surface ripples, physically coherent caustics across the reef, and gentle response from soft polyps or anemones. Keep rock and hard coral stable. Preserve the front-on perspective and deep focus; do not fake motion by panning or blurring the background. Pause and reduced-motion controls must cover these effects too.

## Responsive verification scope

Use only two browser viewport sizes for responsive checks: 402×874 CSS pixels for the iPhone 18 Pro proxy (inferred from Apple's [1206×2622 display resolution](https://www.apple.com/iphone-18-pro/specs/) at 3×) and 1440×900 for a normal laptop. Do not add a wider phone/tablet/device matrix unless requested. Keep earlier viewport results as historical review notes and do not rerun them.
