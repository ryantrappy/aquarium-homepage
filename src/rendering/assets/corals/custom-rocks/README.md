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
or replacing its maps. It has no declared coral sockets. Navigation builds its
own closed-mesh collider and conservative startup bounds from the actual mesh.

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

The current native source has one9282-vertex mesh and three packed images:
1024×1024 carbonate,512×512 normal and512×512 roughness. These are procedural
surface fields, not a high-poly bake or the requested shared2048px modular
library. AQ-94 remains open for the full library, pinnacle/canyon art and grounding.
