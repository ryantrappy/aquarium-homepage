# Manual Blender Overrides & Shape Guides (`splat-fish`)

## Mandatory Blender Persistence & Git Commit Rule

**Any edits made to a fish in Blender MUST always be exported, synced, and committed to Git before finishing a task:**

1. **Save the `.blend` workfile** (with packed textures) to `src/rendering/assets/splat-fish/blend/<species-id>.blend`.
2. **Export the `.glb`** from Blender (`File -> Export -> glTF 2.0 (.glb)`) to `src/rendering/assets/splat-fish/overrides/<species-id>.glb`.
3. **Sync the override & propagate its learned shape guide** to the procedural fish roster:
   ```bash
   node scripts/sync-blender-override.mjs --learn-guide
   ```
4. **Verify tests & commit to Git** (`blend/`, `overrides/`, `src/rendering/assets/splat-fish/*.glb`, `fish-*-inspection.json`, and `manifest.json`):
   ```bash
   npx vitest run src/rendering/assets/splat-fish-contract.test.ts src/rendering/assets/manifest-checker.test.ts
   git add src/rendering/assets/splat-fish scripts/build-splat-fish-glbs.mjs scripts/sync-blender-override.mjs
   git commit -m "feat(fish): update Blender override and learned shape guide"
   ```

Never leave Blender sculpting or material edits only in live Blender memory.

## How Manual Overrides Guide Procedural Fish (`--learn-guide`)

- `sync-blender-override.mjs --learn-guide` inspects every `.glb` in `overrides/`, extracts its normalized longitudinal thickness envelope and dorsoventral arch profile into `overrides/learned-shape-guide.json`, and feeds those curves into `scripts/build-splat-fish-glbs.mjs`.
- Procedural species in the same body-plan archetype blend in the learned longitudinal and dorsoventral contour adjustments while preserving each species's own silhouette and `maxHalfW`.
