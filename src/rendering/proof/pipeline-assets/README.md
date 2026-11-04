# AQ40 technical review specimens

These durable **technical review specimens** passed root's bounded pipeline browser gate. They remain unapproved final artwork or main-aquarium content. They demonstrate export/bake behavior; they do not complete AQ42 or the photorealism goal. AQ40 task status and remaining provenance audit are tracked in Backlog.

Only three compact GLBs belong here: `original-rock-bake.glb`, `staghorn-unbaked-lod.glb`, and `staghorn-normal-baked.glb`. No high/source GLB, `.blend`, texture intermediates or rejected tangent export is bundled. The copied rock is the confirmed final seed-pinned export (`Cycles seed=7319`, animated seed off, 16 samples), reproduced byte-for-byte in a fresh run; its final hash is in the provenance report.

`manifest.json` supplies view labels, comparison relationships and the explicit coral review scale. Per-specimen provenance and Khronos reports record actual hashes, bytes, geometry, map pointers, recipe/tool versions and known limits. [ASSET_NOTICES.md](ASSET_NOTICES.md) supplies attribution. Keep reports with the specimens; copied acquisition paths in reports are historical reproduction locations, never runtime dependencies.

The fixture uses direct `?url` imports for every curated GLB, notice and report, so the proof build owns its complete runtime dependency set. Temporary files are available only with explicit `?review=local` and the bounded dev mount. They are not the default and are never copied into a build by that mount.

Root's clean archived-source proof build emitted both explicit HTML entries and all three GLBs byte-identically without external source models, temporary review files or untracked prototypes. Reports preserve the final rock's deterministic repeat and the actual map/Khronos checks.

## Bounded browser evidence

Root's AQ40 comment #29 records native Chrome DevTools Responsive at exactly **1440×900** and **402×874 CSS pixels**. Both rock/coral comparisons loaded and fit in front/oblique views; pause/resume, normal/AO states and actual map bindings were inspected. The coral's shader-derived tangent frame rendered without shader failure. The fixed live phone drawing area reported 402×634 for coral and 402×648 for rock. Root observed no visible application errors after the fixture fixes.

Local evidence captures remain outside git: [rock laptop](/tmp/aq40-rock-laptop.png), [coral laptop](/tmp/aq40-coral-laptop.png), [rock phone](/tmp/aq40-rock-phone.png), [coral phone](/tmp/aq40-coral-phone.png). These paths are local review records, not clean-checkout runtime dependencies. Screenshots are 2× captures; the renderer remains DPR 1.

This was functional/appearance review, not a physical-phone or performance benchmark. The rock still reads as a faceted pebble; the coral retains coarse pointed branches and a detached chip. Baking did not fix silhouettes. Technical acceptance must not be reinterpreted as final asset or main-scene approval.
