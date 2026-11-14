# Custom reef modules

AQ-94 additive modules are separate from the fixed coral catalog and fish roster.
`reef-center-arch` is an original custom limestone arch and procedural textures
created for this project. No external visual assets, purchase, or attribution
obligation. The manifest records exact native source, generator, raw Blender
export and installed package hashes; the inspection validates units, identity
transform, bounds and rock role. It does not certify final art or fish clearance.

The website uses this module as the background central bridge at laptop width.
Phone keeps the taller single-island layout. It retains embedded carbonate,
normal and roughness textures rather than running the legacy foundation sculpt
or replacing its maps. Four saved socket empties support small reused Montipora,
Acropora and front-facing zoanthid colonies. Exported contact, orientation, radial
footprint support and local clearance are measured before installation. This is
not a continuous support certificate or whole-colony/body fit claim. Navigation
builds its own rock collider and shader-expanded mounted-coral bounds; the same
coral envelopes are used conservatively during startup.

Rebuild from the repository root (separate background process; leaves the live
Blender document untouched):

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_reef_center_arch.py
node scripts/sync-blender-override.mjs --reef reef-center-arch --learn-guide
```

Save packed native source in `splat-fish/blend/reef-center-arch.blend`, export raw
GLB in `splat-fish/overrides/reef-center-arch.glb`, then sync/install and commit
both plus this directory, the generator and integration. Reef IDs use the
`reef-` prefix. Reef mode dispatches before all fish documentation/guide/build
side effects and rejects fish flags. The standard fish learner skips that
reserved namespace. Do not run custom rock exports through fish anatomy guides.

The current native source has one9282-vertex mesh, four empty sockets, and three packed images:
1024×1024 carbonate,512×512 normal and512×512 roughness. These are procedural
surface fields, not a high-poly bake or the requested shared2048px modular
library. AQ-94 remains open for the full library, pinnacle/canyon art and grounding.

The mounting call explicitly preserves the authored rock and disables legacy
companions/scatter. Its coral materials retain the shared pause/reduced-motion
clock and depth shader. Placement teardown releases owned materials/depth
materials while maps and geometry remain owned by the loaded assets.
