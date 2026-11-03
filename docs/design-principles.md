# Aquarium design principles

## Primary goal

Make the homepage feel like a photorealistic, living reef aquarium. Realistic fish should fill almost the entire main view and act as the clickable links to configured homelab services. The aquarium and fish experience is the project's main success criterion.

## Build the tank as a crisp habitat

- Use a straight-on view through the front glass into the water portion of a reef display tank, with true perspective and deep focus.
- Keep live rock, coral, and sand crisp and recognizable as an actual aquascape. Do not use a blurry underwater background, generic open-ocean vignette, or a scene that reads as an ocean illustration instead of a contained aquarium.
- Let the habitat fill the main view so the fish and tank remain the subject.

## Fish should look alive

- Use high-quality, appropriately licensed fish assets and rendering techniques that support realistic body, fin, and tail motion.
- Give species distinct swimming speed, turning, acceleration, and apparent depth. Fish should bank and change orientation as they swim, rather than translate as flat images.
- Integrate fish with the tank through believable light, color, scale, depth, and occlusion. Review choices against real fish, including the [NOAA Banggai cardinalfish reference](https://www.fisheries.noaa.gov/species/banggai-cardinalfish/resources) and [Monterey Bay Aquarium clownfish reference](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish).
- A still cutout moving across the scene can be a temporary scaffold or reduced-motion fallback, but it does not satisfy the finished lifelike animation goal.

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
