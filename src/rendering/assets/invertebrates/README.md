# Rigged 3D Reef Clean-Up-Crew Invertebrate Assets (`AQ-109`)

All 4 invertebrate GLBs in this directory are **100% project-original (`license: "original"`)**, authored from scratch in Blender 5.2.3 LTS with `512×512` procedural BaseColor/Normal/ORM PBR textures (`occlusionTexture === metallicRoughnessTexture`), substrate-grounded rest pose (`boundsM.min.y ≈ 0.0`), `+Y` up / `+Z` forward orientation, skinned skeletal rigs, and seamless 49-frame (`2.0s @ 24fps`) animation clips.

> Existing canonical `fish/`, `corals/`, `splat-fish/` manifests and `src/rendering/assets/splat-fish/blend/blue_crab.blend` remain completely untouched.

## Packaged Inventory (`manifest.json`)

| Asset ID | `speciesId` | Species | Clip (`49f @ 24fps`) | Joints | Tris | Bytes | Dimensions (`[X, Y, Z]` m) | Thumbnail (`600×400` WebP) |
| :--- | :--- | :--- | :--- | ---: | ---: | ---: | :--- | :--- |
| `invertebrate-banded-trochus-snail` | `banded-trochus-snail` | *Trochus histrio* (Banded Trochus Snail) | `trochus_snail_glide` | 9 | 8,268 | 1,126,348 | `[0.0329, 0.0313, 0.0514]` | `public/fish/banded-trochus-snail.webp` |
| `invertebrate-emerald-mithrax-crab` | `emerald-mithrax-crab` | *Mithraculus sculptus* (Emerald Mithrax Crab) | `emerald_crab_forage` | 13 | 4,192 | 1,035,928 | `[0.0571, 0.0155, 0.0446]` | `public/fish/emerald-mithrax-crab.webp` |
| `invertebrate-scarlet-reef-hermit-crab` | `scarlet-reef-hermit-crab` | *Paguristes cadenati* (Scarlet Reef Hermit Crab) | `hermit_crab_scurry` | 12 | 7,104 | 1,067,576 | `[0.0416, 0.0220, 0.0535]` | `public/fish/scarlet-reef-hermit-crab.webp` |
| `invertebrate-scarlet-skunk-cleaner-shrimp` | `scarlet-skunk-cleaner-shrimp` | *Lysmata amboinensis* (Scarlet Skunk Cleaner Shrimp) | `cleaner_shrimp_rock` | 13 | 3,880 | 511,932 | `[0.0505, 0.0337, 0.0853]` | `public/fish/scarlet-skunk-cleaner-shrimp.webp` |

## Rebuilding & Syncing

Each invertebrate has:
- Generator script: `src/rendering/modeling/build_<id_underscored>.py` (sharing helpers in `src/rendering/modeling/invertebrate_common.py`)
- Native packed Blender workfile + textures: `src/rendering/assets/splat-fish/blend/<id>.blend` & `src/rendering/assets/splat-fish/blend/<id>-textures/`
- Raw glTF override: `src/rendering/assets/splat-fish/overrides/<id>.glb`
- Validated runtime asset + inspection JSON: `src/rendering/assets/invertebrates/<id>.glb` & `<id>-inspection.json`

To rebuild and re-sync a species:
```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python src/rendering/modeling/build_invertebrate_banded_trochus_snail.py
node scripts/sync-blender-override.mjs --invertebrate invertebrate-banded-trochus-snail --learn-guide
```
