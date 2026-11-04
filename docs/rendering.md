# Rendering study and main scene

Three.js is selected for the first main-scene integration. The application now has the technical baseline described below. The separate `engine-study.html` fixture compares Three.js, Babylon.js and PlayCanvas with the same two animated fish and reef LOD; that fixture reports targets without opening services. Its results and limitations remain separate from main-page evidence.

Root finalized AQ-5 and AQ-38 as **bounded research investigations**. The fixture alone was insufficient for AQ-5 AC #3; root accepted the subsequent main integration's pipeline-capacity evidence separately. This does not complete photorealism, final swimming quality or the 15-species roster.

## Main-scene technical baseline (AQ-12, AQ-34, AQ-13)

`AquariumScene.tsx` dynamically mounts `src/rendering/scene/aquarium.ts` after React mount. It owns one Three.js renderer, loaded resources, listeners and resize observer, with late-load disposal and a native-link fallback on GPU/asset failure. The main scene consumes AQ-35 profiles, AQ-44 per-instance state, and AQ-34 free-water routes: fish now travel, turn and accelerate through the water while their clips articulate, rather than remaining at the fixture's fixed positions. The bounded rAF clock advances behavior, travel, startle and clips with the same simulation steps; pause/hidden time does not become a catch-up jump.

The real reef is arranged into an asymmetric aquascape above textured sand. [`scripts/build-reef-habitat.mjs`](../scripts/build-reef-habitat.mjs) derives the checked-in [`reef-habitat.json`](../src/rendering/scene/reef-habitat.json) from the exact reef GLB SHA-256. The browser transforms those conservative triangle-covering columns and actual substrate approach points, avoiding the original 23-second mount-time extraction. These volumes fill unverified overhang voids. No host anemone, burrow or refuge is invented; candidate grazing locations still require biological/interaction review.

Only `ocellaris-clownfish` and `yellow-tang` currently use rigged models. Other selected species retain their own correct artwork as temporary unrigged previews, identified in link metadata; a blue tang is never displayed as a yellow tang. The same CC BY 4.0 GLBs and notices are used, with an Asset credits link in Settings.

Root's rebuilt main passed all **94 tests**, typecheck and build. Browser review at 1440×900 and 402×874 checked visible travel, exact pause holds, reduced motion, context-loss/native-link fallback, phone resizing, and settings CRUD/reload/restore; the original configuration and exact ETag were restored afterward. Hidden-page suspension is supported by the visibility listener and bounded-clock source/tests, but a deliberate browser hidden→visible transition has **not** yet been exercised.

The former alpha-picking failure—an empty-water corner opening Jellyfin—is repaired. Artwork alpha is decoded once and used to filter sorted ray hits with the texture UV transform and material cutoff. In root's rebuilt stationary laptop check, empty-water `(670,271)` emitted no `Page.windowOpen`; visible blue-tang body `(720,235)` opened configured Jellyfin at `http://trappserv.er:8096/` with `_blank` and `userGesture=true`. Under reduced motion, fish positions stayed unchanged and only Jellyfin acknowledged the action. Five focused mask tests also cover transparent hits passing through to real geometry behind, opaque reef ordering and transformed UV/cutoff behavior. This verifies that concrete empty-water regression; it is not a claim of exhaustive pixel-edge coverage.

Main links retain native actions and signal only the selected instance; label/keyboard activation refreshes occlusion, and body targets recheck the actual pointer point. A 60-rAF-sample main-page observation on the desktop in-app browser measured median **33.3 ms**, p95 **35.0 ms**, maximum **35.4 ms**. These are desktop-host frame intervals, not GPU timings, physical-phone measurements or full-roster performance evidence.

This is a functional technical baseline, not completed realism or all acceptance criteria. The reef remains a coarse/dead scan with baked shading and limited source coverage; the two fish retain approximate fins/materials, and thirteen roster species lack rigged assets. Production-quality fish, a mature living reef, validated interactions, optics, full-roster performance and final accessibility remain open work. Development/review is local-first; the user handles deployment after approved source is pushed.

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

## Corrected-reef browser evidence

Root reviewed the same two fish and reef LOD in all three engines at the only target viewports, 1440×900 and 402×874. Running image crops changed, paused crops were byte-equal, and 45-degree turns changed the fish crop in each engine at both viewports. At laptop point `(624,468)`, picking returned `Reef geometry` with the reef visible and `Clownfish` when hidden in all three engines. At phone point `(250,580)`, the result was `Reef geometry` with the reef visible and `Yellow tang` when hidden in all three. A separate PlayCanvas phone pick at `(180,300)` returned the visible clownfish. These checks show that the study's mesh picking includes the real reef geometry in its nearest-hit result; they do not create service links.

The fish are a clownfish and yellow tang, compared visually with the [Monterey Bay Aquarium clownfish reference](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish) and [Oregon Coast Aquarium yellow tang reference](https://aquarium.org/animals/yellow-tang/). Root's earlier angle/playback review found recognizable volume and faces, but the current mesh, baked shading and approximate fins remain technical approximations rather than verified anatomical fidelity.

The viewport/emulation measurements below came from one desktop browser host. They are frame intervals sampled over 180 frames and renderer draw-call counts, not GPU render times, controlled device benchmarks, or physical-phone results.

| Engine | 1440×900 draw calls | Median / p95 interval | 402×874 emulated draw calls | Median / p95 interval |
| --- | ---: | ---: | ---: | ---: |
| Three.js | 29 | 16.7 / 27.5 ms | 29 | 16.7 / 22.1 ms |
| Babylon.js | 25 | 16.9 / 24.9 ms | 25 | 16.6 / 21.5 ms |
| PlayCanvas | 25 | 18.2 / 26.8 ms | 25 | 17.0 / 25.8 ms |

The captured fish motion, picking behavior and measurements do not reveal a photorealism or performance winner. Phone composition in this study hides most of the yellow tang behind the reef footprint; this is a limitation of the fixed proof composition, not a full-product layout test. Root's review captures remain temporary local files at `/tmp/aq-root-reef-{three,babylon,playcanvas}-{laptop,phone}.png`.

The normalized gray direct-light comparison was measured at 1440×900; it is fixture-specific, not a universal engine conversion or fidelity ranking. The fixture uses the source PBR materials and direct lights but has no caustics, volumetric scattering or water-clarity model. The reef scan retains baked underwater shading, open/cut edges and underside, and a flat substrate footprint. Root accepted the asset for technical engine comparison only.

## Capability summary and recommendations

The shared fixture isolates engine loading and interaction APIs from asset and rig quality. Three.js uses `GLTFLoader`, `AnimationMixer`, a `Raycaster`, and `WebGLRenderer`; Babylon.js uses `ImportMeshAsync`, `AnimationGroup`, `scene.pick`, and `SceneInstrumentation`; PlayCanvas uses container asset loading, an animation component, asynchronous `Picker`, and application draw-call counters. All three load the same two fish files, embedded clips and reef file. The gray direct-light fixture was normalized separately; none of these code paths establishes a general lighting equivalence or a fidelity ranking.

The standalone study's picker reports only the nearest tagged visible mesh (fish, reef or the gray control). It does not create service links or keyboard-accessible fish targets. Its placement is fixed by viewport and its 45-degree control rotates the fish; the three comparison paths do not consume AQ-34 routes, detect reef obstacles for motion, or resolve AQ-35 habitat anchors. The main-scene adapter described above supplies that separate route integration.

Related work remains deliberately separate from this engine proof. AQ-37's Mesh2Motion binding/export trial used a stylized CC0 clownfish and showed loader/clip compatibility, but distorted deformation and no second realistic species; it does not validate these licensed rigs. AQ-34's tested engine-independent 3D route planner, AQ-35 profiles and AQ-44 timers/events are consumed by the main-scene adapter, while the comparison fixture remains independent. AQ-36's aquarium reference informs observed motion only; it is not an asset or animation transfer.

The fixture's lifecycle evidence is limited to its standalone page: it reads the DOM at module load and tears down on `pagehide`, rather than using a route component. Babylon's scene/engine disposal and PlayCanvas's app destruction are wired to that page exit. The main Three.js route instead uses React effect ownership, browser-only creation, unmount cleanup and late-load disposal as described above; fixture results alone do not verify that implementation.

**AQ-5 recommendation:** use Three.js for the first renderer-integration slice. The controlled evidence shows the same assets, clips, pause/turn behavior and real-reef occlusion picking work across all three engines, with similar desktop-host frame intervals. It therefore does not support a rendering-fidelity or performance victory. Three.js is the most direct fit for the existing React/Vite/TanStack Start TypeScript app: the study already uses `GLTFLoader`, `AnimationMixer`, `Raycaster` and one renderer loop without an engine-specific application wrapper, so one scene can be owned by a mounted React effect. The main implementation now supplies that lifecycle ownership and demonstrates pipeline capacity for rigged body/fin/tail motion, profile-driven travel/turns, reef depth/lighting and native service links. Root accepted that main-integration evidence for AQ-5 AC #3 separately from the fixture and finalized the investigation; final motion/art fidelity and the full roster remain separate implementation work.

**AQ-38 recommendation:** keep Babylon.js as a compatible candidate, but reject a Babylon-only production migration on this evidence. Its `ImportMeshAsync`, animation groups, scene picking, instrumentation, and scene/engine disposal all worked in the controlled study; the tests found no visible or interval advantage that outweighs the simpler Three.js project fit. PlayCanvas also passed compatibility checks, with its own container asset, animation component, and asynchronous picker APIs. Main Three.js lifecycle, route and link integration is now implemented as a technical baseline; underwater optics and final interaction/accessibility validation remain follow-up work.

For AQ-38 AC #3, the combined research evaluates Babylon's actual two-species skeletal body/fin/caudal clips and GLB loading, AQ-37's Mesh2Motion export/load trial, and the selected main renderer's integration with AQ-35/AQ-44 without conflating paths with deformation. The Mesh2Motion trial was an unfitted stylized clownfish loaded in Three.js; it did not establish realistic tang transfer, all-species rig quality or a Babylon production behavior adapter. Those explicit limits informed the direct Blender-rig/Three.js choice rather than an assertion that every candidate workflow succeeded. Root accepted this bounded evaluation and finalized AQ-38; the remaining implementation and fidelity tasks stay open.

The fish meshes and motion remain technical baselines with baked shading, approximate fins and no independently articulated eyes, gills or mouth. The study does not establish production-quality anatomy, equivalent reef lighting, underwater optics, full-school performance, habitat-aware navigation, service-link accessibility, or renderer lifecycle integration with the application. Translating a still image alone remains insufficient for the product's realistic-fish goal.

Detailed earlier asset comparisons, local rig and Mesh2Motion experiments, calibration notes, and historical limitations are preserved in [rendering-research-history.md](rendering-research-history.md); they are not current entrypoints or claims that those historical prototypes ship.
