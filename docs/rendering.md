# Controlled rendering study (AQ-5)

This is a standalone compatibility study, not the production aquarium or an engine selection. It compares Three.js, Babylon.js and PlayCanvas with the same two animated fish and reef LOD. The viewer reports nearest visible targets but does not navigate to services or establish production accessibility.

## Open the study

From the repository root, start the dev server:

```sh
npx vite --config src/rendering/proof/vite.config.js
```

Open one of these pages; select a different engine from the page menu or change the query parameter:

- `http://127.0.0.1:5188/engine-study.html?engine=three`
- `http://127.0.0.1:5188/engine-study.html?engine=babylon`
- `http://127.0.0.1:5188/engine-study.html?engine=playcanvas`

The isolated Vite config explicitly builds `engine-study.html`; it excludes the older `index.html` and prototype entry pages. The fixture needs only the checked-in files `candidate-real-clown.glb`, `candidate-real-tang.glb`, and `candidate-reef.glb`. The engine loader uses build-aware asset URLs so dev and production builds load the same files.

To build the standalone production fixture:

```sh
npx vite build --config src/rendering/proof/vite.config.js --outDir /tmp/aq-engine-study-build --emptyOutDir
```

The verified build contains only `engine-study.html` and three hashed GLBs whose SHA-256 and byte sizes match the checked-in derivatives. See `asset-manifest.json` for those outputs. The combined engine bundles produce Vite's large-chunk advisory; this is not a runtime performance measurement.

## Assets and reproducibility

The two fish and reef scan are CC BY 4.0 technical-study assets. Their creator credit, source listing, license, source hash and modification notes are in [ASSET_NOTICES.md](../src/rendering/proof/ASSET_NOTICES.md). The original 244 MB reef and fish source GLBs are external; a clean checkout can build and open the study without them. The compact derivatives are the exact shared assets loaded in every engine.

[asset-manifest.json](../src/rendering/proof/asset-manifest.json) records source and derivative hashes, bytes, geometry and image counts, Blender version, regeneration commands, decimation measurements, tangent-export repair, and fixture-build outputs. Fish derivatives can be regenerated with Blender 5.0.1 and `rig-candidate.py`; reef can be regenerated with Blender 5.0.1 and `prepare-reef.py` after reacquiring and hash-checking its licensed source. [validation-report.json](../src/rendering/proof/validation-report.json) contains the full official Khronos glTF Validator 2.0.0-dev.3.10 report. Current results: clown 0 errors/3 warnings/1 info; tang 0/5/5; reef 0/0/0.

Reef geometry counts differ at each stage: source 3,513,714 triangles; saved Blender checkpoint 99,999; exported GLB 99,985. The 5,002-point RMS, p95 and maximum nearest-surface errors are one-way samples computed on the Blender checkpoint only; they are not bounds on the exported GLB or unsampled geometry. The initial validator error was a zero tangent vector even though none of the materials uses a normal texture. The checkpoint had no zero-normal or zero-area faces, so the repair omitted tangents at export without changing topology, normals, UVs, materials or textures.

## Evidence and limits

Earlier browser checks at 402×874 and 1440×900 exercised the two fish without the corrected reef LOD: all three engines displayed and animated both fish, pause and 45-degree turns worked, and nearest-target picking reported the foreground gray blocker when visible, then the clownfish at the same point when the blocker was hidden. Those checks are fish-only compatibility evidence. The normalized gray direct-light comparison was measured at 1440×900; it is fixture-specific, not a universal engine conversion or fidelity ranking.

Root reviewed offline front and oblique renders of the corrected reef and accepted it for technical engine comparison only. Browser review with this corrected reef at 402×874 and 1440×900 is pending. The scan retains baked underwater shading, open/cut edges and underside, and a flat substrate footprint.

No renderer has been selected. The fish meshes and motion remain technical baselines with baked shading, approximate fins and no independently articulated eyes, gills or mouth. The study does not establish production-quality anatomy, equivalent reef lighting, underwater optics, full-school performance, habitat-aware navigation, service-link accessibility, or renderer lifecycle integration with the application. Translating a still image alone remains insufficient for the product's realistic-fish goal.

Detailed earlier asset comparisons, local rig and Mesh2Motion experiments, calibration notes, and historical limitations are preserved in [rendering-research-history.md](rendering-research-history.md); they are not current entrypoints or claims that those historical prototypes ship.
