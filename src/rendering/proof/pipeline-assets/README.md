# AQ40 technical review specimens

These are durable **technical review specimens**, not approved final artwork or main-aquarium content. Root browser QA is pending. They demonstrate export/bake behavior; they do not complete AQ40, AQ42 or the photorealism goal.

Only three compact GLBs belong here: `original-rock-bake.glb`, `staghorn-unbaked-lod.glb`, and `staghorn-normal-baked.glb`. No high/source GLB, `.blend`, texture intermediates or rejected tangent export is bundled. The copied rock is the confirmed final seed-pinned export (`Cycles seed=7319`, animated seed off, 16 samples), reproduced byte-for-byte in a fresh run; its final hash is in the provenance report.

`manifest.json` supplies view labels, comparison relationships and the explicit coral review scale. Per-specimen provenance and Khronos reports record actual hashes, bytes, geometry, map pointers, recipe/tool versions and known limits. [ASSET_NOTICES.md](ASSET_NOTICES.md) supplies attribution. Keep reports with the specimens; copied acquisition paths in reports are historical reproduction locations, never runtime dependencies.

The fixture uses direct `?url` imports for every curated GLB, notice and report, so the proof build owns its complete runtime dependency set. Temporary files are available only with explicit `?review=local` and the bounded dev mount. They are not the default and are never copied into a build by that mount.

Before committing this checkpoint, root verifies the final rock hash and deterministic repeat, all three copied GLB hashes, actual glTF map roles, Khronos reports, and the clean isolated proof bundle. Browser inspection remains limited to 1440×900 and 402×874: select each specimen, inspect front/oblique, pause light sweep, toggle actual normal/AO bindings, compare the matched sides, and check errors. Any remaining QA blocker stays recorded; do not reinterpret this checkpoint as production asset approval.
