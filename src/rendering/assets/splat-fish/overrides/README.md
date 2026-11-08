# Manual Blender Overrides (`splat-fish`)

Place hand-edited `.glb` exports in this folder (`<species-id>.glb`) and optional `.blend` workfiles in `../blend/<species-id>.blend`.

- When `overrides/<species-id>.glb` is present, `scripts/build-splat-fish-glbs.mjs` preserves it instead of overwriting it with procedural geometry (unless `--force-procedural` is passed).
- Run `node scripts/sync-blender-override.mjs` after exporting a revised `.glb` from Blender to copy it to `src/rendering/assets/splat-fish/<species-id>.glb` and refresh its SHA-256 hash, triangle/vertex counts, bounding box, `fish-<species-id>-inspection.json`, and `manifest.json`.
