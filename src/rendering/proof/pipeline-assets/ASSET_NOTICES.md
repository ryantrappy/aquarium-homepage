# AQ40 technical review asset notices

Root accepted these specimens for bounded technical pipeline capability at 1440×900 and 402×874 CSS pixels. They remain unapproved for final aquarium art or main-scene use. Attribution does not imply creator endorsement.

## Original porous-rock bake probe

Original project test geometry and baked materials by the Aquarium project. This low-detail procedural specimen is for export/material inspection, not a completed live-rock island. The final corrected generator/seed, source and derivative hashes, dimensions, actual map roles and reproduction inputs are recorded in `original-rock-provenance.json`. Only the compact exported review GLB is bundled; source Blender files remain external.

## Staghorn Coral

- Creator: **PixForge (@pixforge.id)**.
- Verified exact source: [Staghorn Coral](https://sketchfab.com/3d-models/staghorn-coral-ede640745c16457a9345ef1fa9e8d4d4).
- License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
- The prior official-listing review recorded the label **“Generated with AI”** and the description **“Acropora sp.”** (AQ-42 comment #1, 2026-11-03). These are listing claims; exact species and living-coral provenance were not independently established. The latest attempted page recheck was blocked, so this records the earlier review rather than a fresh verification.
- Original external GLB SHA-256: `96a57944bc5c68b6e2a8244b10a83d16aff1a761cdabbf5379e2a36169ccda55` (93,766,820 bytes). The original is not redistributed here.
- Derivative changes: joined 18 meshes; reduced 1,945,640 source triangles to a 30,000-triangle LOD; rebuilt smooth normals; mechanically downscaled embedded 4096-pixel maps to 2048 while retaining UVs/base color. The normal-baked derivative adds a 2048² tangent-space normal bake and omits exported `TANGENT` after a singular tangent was detected. Three.js derives the tangent frame from UVs; the Khronos portability warning remains disclosed in `staghorn-validation.json`.
- No recolor or exact species assertion. The source normal map was connected during Cycles NORMAL baking, but its contribution to the baked result is unverified. This is supplementary pipeline evidence, not completed coral masks or accepted biological art.
- Both GLBs retain uncalibrated source coordinates and lack the new `reefAsset`/`COLOR_0` contract. Their identical uniform multiplier `0.2556040430654893` is a **review-only chosen design scale** giving a 0.25 m longest display dimension. It is not evidence of physical source dimensions or compliant meter-scale export roots.

Keep this creator/source/license credit and modification notice with redistributed derivatives. `staghorn-provenance.json` and the validator report preserve the distinct unbaked/baked hashes and known limits.
