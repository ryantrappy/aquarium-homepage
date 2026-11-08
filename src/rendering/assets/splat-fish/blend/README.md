# Editable Blender Source Files (`splat-fish`)

Store `.blend` workfiles here (for example `blue-tang.blend`).

When you finish editing or sculpting a fish in Blender:
1. Export to `../overrides/<species-id>.glb` (`File -> Export -> glTF 2.0 (.glb)`).
2. Run `node scripts/sync-blender-override.mjs` to copy the override into `src/rendering/assets/splat-fish/<species-id>.glb`, inject/validate the `reef-asset-v1` contract metadata and updated bounding box, and refresh `fish-<species-id>-inspection.json` and `manifest.json`.
