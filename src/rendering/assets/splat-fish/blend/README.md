# Editable Blender Source Files (`splat-fish`)

Store `.blend` workfiles here (for example `blue-tang.blend`) with all textures packed (`File -> External Data -> Pack Resources`).

## Mandatory Rule: Always Export & Commit Blender Edits

Changes in an open Blender session are **not** tracked until saved, exported, synced, and committed:
1. Save `src/rendering/assets/splat-fish/blend/<species-id>.blend`.
2. Export `src/rendering/assets/splat-fish/overrides/<species-id>.glb`.
3. Run `node scripts/sync-blender-override.mjs --learn-guide`.
4. Commit the updated `.blend`, `overrides/`, `.glb`, inspection JSON, and `manifest.json` files to Git.
