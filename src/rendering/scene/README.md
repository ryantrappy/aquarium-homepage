# Main aquarium renderer

The React component dynamically imports this browser-only renderer after mount.
One controller owns the canvas loop, resize/visibility listeners, scene resources
and asynchronous asset loads; unmount and partial-load failure dispose resolved
assets and late results. SSR renders fallback markup without constructing a GPU.

`motion.ts` gives each stable service ID its own seeded AQ-35/AQ-44 instance,
route, acceleration, bounded heading, bank and clip effort. Pause, reduced motion
(from the route), hidden state and focused keyboard targets stop motion. Native
anchors launch immediately; activation signals one instance without awaiting its
animation. If the species' anchored retreat requires unavailable habitat, the
adapter retains its valid state and uses only a temporary local evasive motion;
it never reports a fictional refuge arrival.

Only ocellaris-clownfish and yellow-tang have current rigged GLBs. Other catalog
IDs retain their own artwork as temporary unrigged previews, with that limitation
in link metadata. They are not substituted with a different species and do not
satisfy final fish-fidelity criteria. All three licensed GLB sources and changes
remain in the shared asset notices, linked from Settings. The reef and fish still
retain the source and rig limitations recorded in docs/rendering.md.

The reef is actual scanned geometry. `habitat.ts` derives at most sixteen
triangle-covering solid columns per reef instance, down to sand, allowing safe
free-water paths above, in front and behind. These conservative volumes fill
unverified overhang voids. Only sampled upward-facing lower exposed substrate
gets a grazingSurface position; no anemone, burrow, crevice or perch is invented.
These substrate tags and visible grazing poses need root biological review;
full reusable anchor interactions remain AQ-45 work.

The shared AQ-34 visibility graph handles generic point-to-point travel without
semantic-anchor substitution. The adapter tests every integration segment with
fish clearance; it decelerates into route corners while the head turns. Fish
avoid the reef, but schooling/collision between fish remains separate AQ-41 work.

Labels currently sample body/head/tail visibility against actual geometry;
pointer activation rechecks the nearest mesh at the clicked point. Extremely
small exposed tips may need further visibility sampling. Root browser review is
required for partial occlusion, readability, native link launch, the two target
viewports and visual swimming quality. Passing pure-motion and SSR tests alone
does not establish photorealism or production acceptance.
