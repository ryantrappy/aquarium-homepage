# Asset pipeline proofs

These are offline technical studies for AQ-40, not production aquarium assets. The three compact review GLBs and their notices, provenance, and validator reports are curated in [`src/rendering/proof/pipeline-assets/`](../src/rendering/proof/pipeline-assets/). Original source files and the saved procedural `.blend` remain external; the licensed Staghorn original is not bundled. The studies demonstrate bounded material baking and export, not completed reef art, modular-coral compliance, or final visual quality. Root browser review is pending; no specimen is approved for the main scene.

## Original procedural rock: base color, roughness, and AO

`src/rendering/proof/build-original-rock-bake.py` creates a custom low/high porous-rock pair and bakes base color, roughness, and ambient occlusion. It uses no external model. The current proof is reproducible in Blender 5.0.1 with four threads; the script pins Cycles seed 7319, disables animated seed, and uses 16 samples. From the repository root, use new, empty output paths:

```sh
AQ40_ROCK_OUTDIR="$(mktemp -d /tmp/aq40-rock-proof.XXXXXX)"
/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b \
  --python src/rendering/proof/build-original-rock-bake.py -- \
  "$AQ40_ROCK_OUTDIR/original-rock-bake.glb" \
  "$AQ40_ROCK_OUTDIR/original-rock-source.blend" \
  "$AQ40_ROCK_OUTDIR/provenance.json"
```

The test geometry is original project work (seed 7319). The high source has 3,840 quad polygons (7,680 loop triangles); the UV-mapped low target and exported GLB each have 320 triangles. The GLB is 1,295,952 bytes, SHA-256 `9959640beeae110ade6dca6a858ca87c568c62458139592ebeee342d1f1936b9`. A second fresh run produced the same output hash. Its measured dimensions are 0.408800 × 0.243664 × 0.299843 m. Two 1024² PNGs carry base color and packed ORM: occlusion in R, roughness in G, metallic in B (metallic factor 0). Khronos glTF Validator 2.0.0-dev.3.10 reports no issues; the actual inspection record passed `validateAssetContract`.

The curated rock GLB is [`original-rock-bake.glb`](../src/rendering/proof/pipeline-assets/original-rock-bake.glb), with [provenance](../src/rendering/proof/pipeline-assets/original-rock-provenance.json) and [Khronos report](../src/rendering/proof/pipeline-assets/original-rock-validation.json). The saved `.blend`, render views, and two byte-identical run directories remain under `/tmp/aq40-final-repro-20261104/` and `/tmp/aq40-final-repro-check-20261104/`. Generator SHA-256 is `39036ed42bd7968985f21399f1e15b8516a17e4b72c8d0b381b7168e5fa3e636`. There are no coral masks, sockets, collision proxies, or normal map in this specimen. It is a bake/export probe, not approved live-rock art.

## Licensed PixForge Staghorn: bounded LOD and tangent-normal bake

The source is **Staghorn Coral** by PixForge, [Sketchfab listing](https://sketchfab.com/3d-models/staghorn-coral-ede640745c16457a9345ef1fa9e8d4d4), licensed **CC BY 4.0**. The prior official-listing review recorded the label “Generated with AI” and description “Acropora sp.”; these are listing claims, not proof of exact taxonomy, living-coral provenance, or biological accuracy. Credit PixForge, link the source and license, and describe modifications when redistributing a derivative. The project obtained the GLB through the signed-in official download flow. The original file is not bundled: its historical location was `/Users/ryantrapp/Downloads/staghorn_coral.glb`, 93,766,820 bytes, SHA-256 `96a57944bc5c68b6e2a8244b10a83d16aff1a761cdabbf5379e2a36169ccda55`. A fresh checkout must acquire that exact source through the official listing and verify its hash before running the commands below.

Prerequisite: Blender 5.0.1. Run from the repository root; use a source path containing the verified original file and fresh output paths:

```sh
AQ40_SOURCE=/path/to/staghorn_coral.glb
AQ40_OUTDIR="$(mktemp -d /tmp/aq40-staghorn-proof.XXXXXX)"
AQ40_LOD="$AQ40_OUTDIR/staghorn-30k-smooth.glb"
/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b \
  --python src/rendering/proof/prepare-staghorn.py -- \
  "$AQ40_SOURCE" "$AQ40_LOD" \
  --triangles 30000 --smooth-normals

/Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b \
  --python src/rendering/proof/bake-staghorn-normal.py -- \
  "$AQ40_SOURCE" "$AQ40_LOD" \
  "$AQ40_OUTDIR/staghorn-normal-baked-no-tangents.glb" \
  "$AQ40_OUTDIR/staghorn-normal.png"
```

The preparation script hash-pins the input, joins its 18 mesh chunks, reduces 1,945,640 triangles to 30,000, clears the carried split-normal layer, rebuilds smooth shading, and downsizes its 4096² base-color and normal images to 2048². It does not recolor the source or create `COLOR_0` masks. The direct source-to-smooth command above was rerun and reproduced the 13,257,016-byte LOD exactly: SHA-256 `6f90a78ddf5df726f9fd466df4e709eb3eca6780fde2c0a5891f1560263eaec2`.

The bake script uses selected-to-active Cycles `NORMAL` bake in tangent space at 2048², 8-pixel `EXTEND` margin, no cage, and maximum ray distance 0.007835694 source-coordinate units (0.8% of the source's 0.9794618 longest AABB extent). The high source has a tangent-space normal image connected during the bake, but its contribution to Blender's geometry-normal bake is **not independently established**. The low geometry, UVs, and base-color image are not edited by the bake operation. The input 30k LOD and baked output base-color payloads match byte-for-byte (SHA-256 `a3a934e7891c964363d5304cc40732daf3b3941fa10aaa6cfbf38929ff3871fc`); this is not a comparison with the original 93 MB source image bytes. The new normal-map PNG is 2048² and 4,531,641 bytes (SHA-256 `59b86363e6e60078418aa6728f3695f90106e83d571eb6bf404c7aea19afb4bd`).

For this mesh, Blender's glTF export produced one zero-length tangent at a singular UV loop. The reproducible bake script therefore exports no `TANGENT` accessor; it preserves `NORMAL` and `TEXCOORD_0` so Three.js can derive a tangent frame in the normal-map shader from UV derivatives. Three.js 0.187.0's `normal_fragment_begin` uses `getTangentFrame(-vViewPosition, normal, vNormalMapUv)` for this path. Khronos Validator reports zero errors and one portability warning, `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE`; this does not establish cross-renderer portability or visual correctness.

The fresh direct-recipe review GLB is 13,340,472 bytes, SHA-256 `576aea21f0f2e8d191f6c5e1d572e9a1e5d82de87188dd4d6224403ac7519be7`; that is 83,456 bytes larger than the unbaked 30k LOD. Its mesh remains 30,000 triangles; the exported accessor has 43,124 vertices versus 43,122 in the unbaked LOD, from attribute seam splits. A rounded-six-decimal position+UV face/corner comparison found identical 30,000-face topology and positions. Normal vectors were normalized before angle comparison, pairing each triangle by its sorted position+UV corner keys (no nearest-position matching): median angular delta was 0°, p95 0.004679°, p99 0.010775°, maximum 0.273345°; 19 of 90,000 corners differed by more than 0.1°, none by more than 1°. A no-bake Blender import/export of the unbaked LOD showed the same maximum and count above 0.1°, identifying the small normal delta as round-trip normal splitting/recomputation rather than a bake-induced geometry change. A tangent-bearing diagnostic export's 89,999 non-singular corners differed from the input tangent by median 0°, p95 0.00571°, p99 0.00808°, maximum 1.0025°; no handedness flips were found, and maximum `|N·T|` was 0.000139. That diagnostic export had one singular zero tangent and is not the final output. The direct bake output omits tangents; these diagnostics support close basis agreement outside the singular loop but do not prove pixel-level visual correctness.

The comparison GLB retains the original base-color map and adds the baked normal map. Its visual comparison to the unbaked LOD therefore changes both normal-map content and the tangent-frame source (vertex tangents versus shader derivatives). Neutral offline renders showed no material silhouette or faceting improvement at 30k triangles. The selected-Three browser review remains the place to judge the actual map/shader result; do not attribute a visual change to the new image alone.

One fresh full direct-recipe run succeeded from the pinned original source and reproduced the smooth LOD hash, baked PNG hash, base-color payload, 30k triangle count, and output map roles. This is one successful run, not a claim of repeated fresh-bake byte-for-byte reproducibility. The superseded tangent-checkpoint re-export differed by 48 bytes and one accessor seam-split vertex; it is not the curated output. Script SHA-256 values are `prepare-staghorn.py`: `d84dff3dc02cdef68e6e2156717ccdd9dff249aeed884b07bb9bf3baad2268b9`; `bake-staghorn-normal.py`: `0aa25ce2f137381a47358fb8859add2b98fe63c9b6e0b60d1ce0dd2cb4f27ffc`. Curated review GLBs, provenance, notices, and validator report are in [`src/rendering/proof/pipeline-assets/`](../src/rendering/proof/pipeline-assets/); the fresh run report and PNG are in `/tmp/aq40-final-staghorn-rebuild-20261104/`.

The source's coordinates have no verified physical calibration. The staged browser fixture uses the same explicitly review-only multiplier (`0.2556040430654893`) on the baked and unbaked variants to display a chosen 0.25 m longest dimension; it is not a claim about the original specimen's physical size. This derivative is a technical study, not an exact-species claim, complete modular-coral asset, or production art. It has no verified `reefAsset` contract or coral `COLOR_0` raw masks, and it is not approved for the main scene.

## Review viewer

The isolated viewer build is opt-in and separate from the main app. From the repository root, start its strict loopback Vite server:

```sh
npx vite --config src/rendering/proof/vite.config.js
```

Open `http://127.0.0.1:5189/pipeline-study.html` for the curated technical specimens, or `http://127.0.0.1:5189/engine-study.html` for the retained engine comparison. The pipeline page uses durable review assets by default; `?review=local` is a separate dev-only route for explicitly mounted `/tmp/aq40-pipeline-review` files.

To build the isolated entries, including curated GLBs, into a separate directory:

```sh
npx vite build --config src/rendering/proof/vite.config.js --outDir /tmp/aq40-proof-build --emptyOutDir
```

Root's browser host is currently unavailable, so the required browser review at 1440×900 and 402×874 remains pending. Build/type checks do not establish visual quality or performance; do not infer photorealism or production approval from this fixture.
