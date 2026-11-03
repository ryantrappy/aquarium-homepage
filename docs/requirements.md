# Aquarium Homepage requirements

## Product goal

The primary goal is a photorealistic, living reef aquarium: realistic fish should fill almost the entire main view and serve as clickable links to configured homelab services. Service navigation and configuration should support that aquarium experience while staying visually unobtrusive.

## Prototype status and success criterion

The existing OpenPencil file is an editable starting point, not a fixed final composition. The design can change substantially as the aquarium is refined. The current translating fish cutouts are scaffolding only; they do not yet achieve the main goal of photorealistic fish with lifelike swimming. A finished implementation must show fish as living animals through body, fin, and tail movement, species-aware turns and speed, and convincing integration with the water and lighting. Moving a still sprite across the tank does not count as completed lifelike animation.

## First-pass requirements

- Use Vite, React, TypeScript, and TanStack Start.
- Show a reef aquarium with service entries represented by selectable fish or aquarium objects.
- Give aquarium inhabitants randomized swimming movement so they do not all follow the same fixed path.
- Provide settings to add and edit a service's display name, URL, and fish choice.
- Show a small species thumbnail beside every fish option in the service fish selector so names and appearances are easy to match ([AQ-33](../backlog/tasks/aq-33%20-%20Show-species-thumbnails-in-service-fish-selectors.md)).
- Persist settings simply on the client for the initial version.
- Make service and settings controls operable by keyboard and respect the system reduced-motion preference in the first-pass prototype.
- Keep the initial catalogue focused on reef fish; freshwater mode and catalog separation are future work.

## Responsive verification scope

Verify responsive behavior at two CSS viewports only: **402×874** as an iPhone 18 Pro proxy and **1440×900** as a normal laptop viewport. The iPhone proxy is inferred from Apple's [1206×2622 native display resolution](https://www.apple.com/iphone-18-pro/specs/) divided by a 3× pixel ratio; it is a CSS viewport estimate, not an Apple-published CSS dimension. Do not expand this into a broad phone, tablet, or device matrix unless requested. Older viewport measurements and review comments remain historical records; do not repeat those checks.

The planned supported reef roster contains 15 species and is documented in the [reef fish roster target](reef-fish-roster.md). This is a planning target, not a claim that all 15 species or licensed visual assets are currently implemented in the app.

## Design direction

- The primary goal is a highly creative, cool homepage that reads as an actual fish tank. Realistic fish swimming should occupy almost the entire main view.
- Show the front-on water portion of a reef display tank with crisp, deep focus and true perspective. Make live rock, coral, and sand clearly visible in the habitat; avoid a blurry background or open-ocean vignette.
- Remove the page header and marketing title. Do not show the "On the reef" service list, a fixed dock, or app cards on the main view. Show the service list only inside a modal opened when the user deliberately selects a small Services button.
- Keep only compact, aquarium-themed Pause, Services, and Settings controls visible. Settings and the Services list remain available without competing with the fish or habitat.
- Preserve working pause and settings behavior while prioritizing the aquarium experience. Accessibility, keyboard operation, and reduced-motion behavior remain requirements.
- Fish and aquarium life should read as realistic. Future asset work may explore realistic images, 3D, video, or animation, subject to an appropriate asset source and licensing.
- Aquarium decor may become link hotspots in a later pass.
- Deliver the visual direction as an editable design file in OpenPencil, along with a preview that can be opened and reviewed.
- A later accessibility task performs a thorough audit and polish pass on the keyboard and reduced-motion support already present in the first-pass prototype.
- Follow the primary success criterion above and the detailed [design principles](design-principles.md); use the editable OpenPencil composition as a baseline that may evolve to achieve photorealism.

### Read-only aquarium telemetry

Add three separate, configurable aquarium equipment indicators. They visualize actual homelab measurements as part of the scene, not as conventional dashboard overlays:

- A heater thermometer displays the real CPU temperature from a selected homelab server or temperature sensor.
- A top-off reservoir displays remaining disk space. Settings allow choosing one disk or aggregating all unique disks. An aggregate uses the correct free-space-to-total-space weighted percentage and avoids counting duplicate mounts; the selected scope is visible.
- A pump gear or flow element displays actual network traffic rates for a chosen interface or source, with ingress and egress clearly distinguished.

The implementation worker researches current integration options and leaves the data-source choice configurable rather than assuming a specific source. These indicators are read-only: they do not change the server, disk, or network configuration. If a source is unavailable or stale, show that state honestly and never substitute simulated or fabricated healthy-looking measurements. This telemetry is not service health monitoring.

### Marine-life visual references

- [NOAA Fisheries: Banggai cardinalfish resources](https://www.fisheries.noaa.gov/species/banggai-cardinalfish/resources)
- [Monterey Bay Aquarium: clownfish](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish)

These are biological and visual references, not permission to reuse their photography or other assets. Any selected production asset needs a verified usable license.

### First-pass design deliverables

- Original editable baseline: [design/reef-control.fig](../design/reef-control.fig)
- Original review preview: [design/reef-control-preview.png](../design/reef-control-preview.png)
- Current front-on aquarium revision: [design/reef-control-v2.fig](../design/reef-control-v2.fig), [main preview](../design/reef-control-v2-preview.png), and [Services modal preview](../design/reef-control-v2-modal-preview.png)
- Reproducible design builder: [design/build-openpencil.js](../design/build-openpencil.js)

## Future work to track separately

- **Highest priority:** Choose licensed, photorealistic fish assets and a rendering approach that supports believable deformation, turns, depth, and light integration (AQ-5).
- **Highest priority:** Build species-aware lifelike swimming and prevent still-sprite translation from being treated as completion (AQ-12).
- Add the realistic startle-and-recover reaction while opening the selected service in a new tab immediately (AQ-13).
- After AQ-5, AQ-12, and the front-on environment iteration, add restrained habitat motion: subtle water ripples and coherent caustics, gentle motion in soft polyps/anemones, and stable hard coral and rock (AQ-14.2).
- Add a freshwater toggle and keep freshwater and saltwater catalogs separate. [Backlog draft 1](../backlog/drafts/draft-1%20-%20Plan-a-future-Rio-Negro-freshwater-roster-and-habitat.md) is a low-readiness, unready planning draft; it narrows future roster planning to a Rio Negro blackwater flooded-forest margin. Do not treat it as promoted work or as an existing freshwater species list.
- Conduct a thorough keyboard, focus, screen-reader, and reduced-motion accessibility audit and polish pass.
- Refine and verify the layout at the two target viewports in the [responsive verification scope](#responsive-verification-scope) (AQ-7).
- Finalize service mappings with the user.
- Add shared configuration storage and deploy the app to the Ubuntu homelab server at `trappserv.er`.
- Add explicit link hotspots to aquarium decor.
- Refine the main aquarium scene around the primary success criterion above (AQ-14).
- Add the configurable, read-only CPU-temperature heater thermometer, disk-space top-off reservoir, and network-rate pump indicator.

## Out of scope

- Service health monitoring or status checks.
