"""Shared AQ-94 Negative Space Aquascape (NSA) live-rock sculpting & 2048px PBR trim-sheet helper.

Generates and caches a deterministic 2048x2048 four-quadrant limestone trim sheet
(albedo RGB JPEG, normal JPEG, ORM JPEG where R=AO, G=Roughness, B=Metallic=0) under
src/rendering/assets/corals/custom-rocks/textures/ and provides watertight voxel-remesh +
Voronoi carbonate cavity sculpting + BVH-verified coral socket stamping + glTF export.

Safe for both live Blender MCP execution and headless background CLI Blender.
"""
from collections import Counter, deque
import json
import math
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.noise import noise as perlin_noise
from mathutils.noise import voronoi

ROOT = Path(__file__).resolve().parents[3]
SPLAT_FISH_DIR = ROOT / "src" / "rendering" / "assets" / "splat-fish"
TRIM_TEX_DIR = ROOT / "src" / "rendering" / "assets" / "corals" / "custom-rocks" / "textures"

TRIM_ALBEDO_PATH = TRIM_TEX_DIR / "reef-nsa-trim-2048-albedo.jpg"
TRIM_NORMAL_PATH = TRIM_TEX_DIR / "reef-nsa-trim-2048-normal.jpg"
TRIM_ORM_PATH = TRIM_TEX_DIR / "reef-nsa-trim-2048-orm.jpg"


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for datablock in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.textures,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.worlds,
        bpy.data.node_groups,
    ):
        for item in list(datablock):
            datablock.remove(item)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.seed = 2026
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    return scene


def _periodic_value_noise(u, v, nx, ny, rng):
    grid = rng.random((ny, nx), dtype=np.float32)
    sx = u * nx
    sy = v * ny
    ix = np.floor(sx).astype(np.int32)
    iy = np.floor(sy).astype(np.int32)
    fx = sx - ix
    fy = sy - iy
    fx = fx * fx * (3.0 - 2.0 * fx)
    fy = fy * fy * (3.0 - 2.0 * fy)
    ix0 = ix % nx
    ix1 = (ix + 1) % nx
    iy0 = iy % ny
    iy1 = (iy + 1) % ny
    a = grid[iy0, ix0] * (1.0 - fx) + grid[iy0, ix1] * fx
    b = grid[iy1, ix0] * (1.0 - fx) + grid[iy1, ix1] * fx
    return a * (1.0 - fy) + b * fy


def _periodic_worley_f1(u, v, cells, rng):
    """Fast vectorized periodic 2D Worley Voronoi F1 & F2-F1 cavity field on 1024x1024."""
    pts = rng.random((cells, cells, 2), dtype=np.float32) * 0.78 + 0.11
    sx = u * cells
    sy = v * cells
    ix = np.floor(sx).astype(np.int32)
    iy = np.floor(sy).astype(np.int32)
    d1 = np.full(u.shape, 1e6, dtype=np.float32)
    d2 = np.full(u.shape, 1e6, dtype=np.float32)
    for dy in (-1, 0, 1):
        ny = (iy + dy) % cells
        for dx in (-1, 0, 1):
            nx = (ix + dx) % cells
            px = ix + dx + pts[ny, nx, 0]
            py = iy + dy + pts[ny, nx, 1]
            dd = (sx - px) ** 2 + (sy - py) ** 2
            closer1 = dd < d1
            d2 = np.where(closer1, d1, np.minimum(d2, dd))
            d1 = np.where(closer1, dd, d1)
    f1 = np.sqrt(d1)
    edge = np.sqrt(np.maximum(0.0, d2)) - f1
    return f1, edge


def _build_quadrant(q_name, q_size=1024, seed=2026094):
    """Synthesize a 1024x1024 mature wet coralline reef live-rock quadrant (albedo, normal, orm)."""
    rng = np.random.default_rng(seed)
    idx_y, idx_x = np.mgrid[0:q_size, 0:q_size].astype(np.float32)
    u = (idx_x + 0.5) / q_size
    v = (idx_y + 0.5) / q_size

    # Heavily domain-warped multi-octave value noise (zero uniform polka dots!)
    n_broad = _periodic_value_noise(u, v, 5, 5, rng)
    n_macro = _periodic_value_noise(u, v, 11, 11, rng)
    n_med = _periodic_value_noise(u, v, 24, 24, rng)
    n_fine = _periodic_value_noise(u, v, 54, 54, rng)
    n_micro = _periodic_value_noise(u, v, 112, 112, rng)

    warp_u1 = _periodic_value_noise(u, v, 8, 8, rng) - 0.5
    warp_v1 = _periodic_value_noise(u, v, 9, 9, rng) - 0.5
    wu = (u + 0.085 * warp_u1 + 0.036 * (n_med - 0.5) + 0.014 * (n_fine - 0.5)) % 1.0
    wv = (v + 0.085 * warp_v1 + 0.036 * (n_macro - 0.5) + 0.014 * (n_fine - 0.5)) % 1.0

    # Worley F2-F1 fracture networks & high-frequency macro-masked pin-pores
    f1_crag, edge_crag = _periodic_worley_f1(wu, wv, 11, rng)
    _, edge_fissure = _periodic_worley_f1((wu * 1.3 + 0.17) % 1.0, (wv * 1.1 + 0.31) % 1.0, 19, rng)
    f1_pin, edge_pin = _periodic_worley_f1(
        (u + 0.03 * (n_med - 0.5)) % 1.0,
        (v + 0.03 * (n_fine - 0.5)) % 1.0,
        38,
        rng,
    )

    # Anisotropic horizontal/diagonal carbonate strata & branching coral-skeleton striae
    strata_wave = 0.5 + 0.5 * np.sin((wv * 6.0 + 0.42 * n_broad + 0.22 * n_med) * 2.0 * np.pi)
    striae = 0.5 + 0.5 * np.sin((wu * 14.0 + wv * 5.0 + 0.65 * n_macro + 0.30 * n_fine) * 2.0 * np.pi)
    ridged_strata = (1.0 - np.abs(2.0 * _periodic_value_noise(wu, (wv * 2.2) % 1.0, 9, 18, rng) - 1.0)) ** 1.6

    # Interconnected karst fracture crevices + clustered Pukani pin-pores (NO isolated circular discs)
    fissure_macro = np.clip((0.18 - edge_crag) / 0.18, 0.0, 1.0) ** 1.45
    fissure_med = np.clip((0.15 - edge_fissure) / 0.15, 0.0, 1.0) ** 1.55
    pore_cluster_mask = np.clip((n_macro * 0.6 + n_med * 0.4 - 0.42) * 2.4, 0.0, 1.0) ** 1.3
    pin_pores = (np.clip((0.25 - f1_pin) / 0.25, 0.0, 1.0) ** 1.8) * pore_cluster_mask * (0.4 + 0.6 * n_fine)
    mineral_ridge = np.clip((0.24 - edge_pin) * 1.8, 0.0, 1.0) * 0.35 + 0.65 * ridged_strata

    crevice = np.clip(
        0.58 * fissure_macro + 0.44 * fissure_med + 0.42 * pin_pores + 0.22 * (1.0 - ridged_strata) * (1.0 - n_med),
        0.0,
        1.0,
    )
    crevice_macro = np.clip(
        0.62 * fissure_macro + 0.42 * fissure_med + 0.22 * (1.0 - ridged_strata) * (1.0 - n_med),
        0.0,
        1.0,
    )

    # Shared base mature reef limestone & living coralline algae palettes (harmonized across Q1-Q4)
    slate_rock = np.stack([
        0.27 + 0.09 * n_macro + 0.04 * strata_wave + 0.03 * n_fine,
        0.23 + 0.08 * n_macro + 0.03 * strata_wave + 0.03 * n_fine,
        0.31 + 0.09 * n_macro + 0.04 * strata_wave + 0.03 * n_fine,
    ], axis=-1)
    plum_coralline = np.stack([
        0.41 + 0.10 * n_med + 0.05 * striae,
        0.16 + 0.07 * n_fine + 0.03 * n_macro,
        0.47 + 0.11 * n_med + 0.05 * striae,
    ], axis=-1)
    rose_coralline = np.stack([
        0.53 + 0.08 * n_fine + 0.04 * mineral_ridge,
        0.26 + 0.07 * n_med + 0.04 * mineral_ridge,
        0.52 + 0.09 * n_fine + 0.04 * mineral_ridge,
    ], axis=-1)
    wine_crust = np.stack([
        0.23 + 0.06 * n_macro,
        0.10 + 0.04 * n_med,
        0.25 + 0.06 * n_macro,
    ], axis=-1)
    calcified_rim = np.stack([
        0.60 + 0.07 * n_micro,
        0.44 + 0.06 * n_micro,
        0.61 + 0.07 * n_micro,
    ], axis=-1)
    biofilm_olive = np.stack([
        0.24 + 0.05 * n_med,
        0.26 + 0.06 * n_fine,
        0.20 + 0.04 * n_med,
    ], axis=-1)

    rgb = np.empty((q_size, q_size, 3), dtype=np.float32)

    if q_name == "limestone_wall":
        # Q1: Mature porous slate-plum reef wall richly colonized (~45%) by spreading coralline plates
        cor_field = 0.52 * n_broad + 0.32 * n_macro + 0.16 * n_med - 0.25 * fissure_macro
        cor_mask = np.clip((cor_field - 0.42) * 3.2, 0.0, 1.0)
        cor_mask = cor_mask * cor_mask * (3.0 - 2.0 * cor_mask)
        rim_mask = np.clip(1.0 - np.abs(cor_field - 0.49) * 14.0, 0.0, 1.0) * (1.0 - crevice)
        rose_blend = np.clip((n_med * 0.6 + striae * 0.4 - 0.45) * 2.2, 0.0, 1.0)
        olive_mask = np.clip((1.0 - n_broad - 0.52) * 2.4, 0.0, 0.38) * (1.0 - cor_mask)

        wall_base = slate_rock * (1.0 - olive_mask[:, :, None]) + biofilm_olive * olive_mask[:, :, None]
        cor_mix = plum_coralline * (1.0 - rose_blend[:, :, None]) + rose_coralline * rose_blend[:, :, None]
        rgb[:] = wall_base * (1.0 - cor_mask[:, :, None]) + cor_mix * cor_mask[:, :, None]
        rgb[:] = rgb * (1.0 - 0.35 * rim_mask[:, :, None]) + calcified_rim * (0.35 * rim_mask[:, :, None])
        rgb *= (1.0 - 0.56 * crevice[:, :, None])
        rgb += (0.025 * (n_micro - 0.5) + 0.032 * (mineral_ridge - 0.4))[:, :, None]

        height = -0.0048 * crevice + 0.0022 * mineral_ridge + 0.0016 * cor_mask + 0.0008 * (n_micro - 0.5)
        ao = np.clip(0.96 - 0.62 * crevice - 0.08 * (1.0 - mineral_ridge), 0.30, 1.0)
        rough = np.clip(0.84 - 0.16 * cor_mask + 0.12 * crevice + 0.04 * (n_micro - 0.5), 0.62, 0.95)

    elif q_name == "coralline_plateau":
        # Q2: Sunlit encrusting coralline plateau matching docs/more-realistic-reef-guide.png
        crust_field = 0.48 * n_broad + 0.34 * n_macro + 0.18 * n_med - 0.20 * fissure_macro
        crust_mask = np.clip((crust_field - 0.28) * 2.8, 0.18, 0.94)
        rose_zone = np.clip((n_macro * 0.55 + striae * 0.45 - 0.42) * 2.5, 0.0, 1.0)
        wine_zone = np.clip((0.48 - n_med) * 2.4, 0.0, 0.65)
        whorl_rim = np.clip(1.0 - np.abs(np.sin((wu * 7.0 + wv * 7.0 + 1.4 * n_broad) * np.pi)) * 4.5, 0.0, 1.0)
        rim_highlight = np.clip(whorl_rim * crust_mask * (1.0 - crevice), 0.0, 0.55)

        cor_plate = plum_coralline * (1.0 - rose_zone[:, :, None]) + rose_coralline * rose_zone[:, :, None]
        cor_plate = cor_plate * (1.0 - wine_zone[:, :, None]) + wine_crust * wine_zone[:, :, None]
        rgb[:] = slate_rock * (1.0 - crust_mask[:, :, None]) + cor_plate * crust_mask[:, :, None]
        rgb[:] = rgb * (1.0 - rim_highlight[:, :, None]) + calcified_rim * rim_highlight[:, :, None]
        rgb *= (1.0 - 0.54 * crevice[:, :, None])
        rgb += (0.022 * (n_micro - 0.5) + 0.028 * (mineral_ridge - 0.4))[:, :, None]

        height = -0.0044 * crevice + 0.0024 * crust_mask + 0.0018 * whorl_rim + 0.0008 * (n_micro - 0.5)
        ao = np.clip(0.98 - 0.58 * crevice - 0.06 * wine_zone, 0.32, 1.0)
        rough = np.clip(0.74 - 0.15 * crust_mask + 0.14 * crevice + 0.04 * (n_micro - 0.5), 0.56, 0.90)

    elif q_name == "shadow_cavern":
        # Q3: Deep moist indigo-charcoal-plum cavern stone & overhang grotto ceiling
        cavern_stone = np.stack([
            0.17 + 0.07 * n_macro + 0.03 * strata_wave,
            0.15 + 0.06 * n_macro + 0.02 * strata_wave,
            0.22 + 0.07 * n_macro + 0.03 * strata_wave,
        ], axis=-1)
        wine_patch = np.clip((n_broad * 0.6 + n_med * 0.4 - 0.44) * 2.4, 0.0, 0.58)
        sponge_ochre = np.clip((n_macro - 0.64) * 2.6, 0.0, 0.25) * (1.0 - crevice)
        sponge_col = np.stack([
            0.28 + 0.05 * n_fine,
            0.22 + 0.04 * n_fine,
            0.18 + 0.03 * n_fine,
        ], axis=-1)

        rgb[:] = cavern_stone * (1.0 - wine_patch[:, :, None]) + wine_crust * wine_patch[:, :, None]
        rgb[:] = rgb * (1.0 - sponge_ochre[:, :, None]) + sponge_col * sponge_ochre[:, :, None]
        rgb *= (1.0 - 0.60 * crevice[:, :, None])
        rgb += (0.020 * (n_micro - 0.5) + 0.024 * (mineral_ridge - 0.4))[:, :, None]

        height = -0.0052 * crevice + 0.0020 * mineral_ridge + 0.0008 * (n_micro - 0.5)
        ao = np.clip(0.86 - 0.62 * crevice - 0.08 * (1.0 - n_macro), 0.24, 0.92)
        rough = np.clip(0.86 + 0.08 * crevice - 0.06 * wine_patch + 0.03 * (n_micro - 0.5), 0.72, 0.97)

    else:  # "sand_talus"
        # Q4: Weathered purple-grey basal reef rock with settled aragonite sand pockets in hollows
        cor_fringe = np.clip((n_broad * 0.6 + n_macro * 0.4 - 0.42) * 2.4, 0.0, 0.52)
        basal_rock = slate_rock * (1.0 - cor_fringe[:, :, None]) + plum_coralline * cor_fringe[:, :, None]
        basal_rock *= (1.0 - 0.48 * crevice[:, :, None])

        hollow_field = 0.45 * (1.0 - mineral_ridge) + 0.35 * (1.0 - f1_crag) + 0.20 * n_med
        sand_pocket = np.clip((hollow_field - 0.46) * 2.9, 0.0, 0.78)
        sand_pocket = sand_pocket * sand_pocket * (3.0 - 2.0 * sand_pocket)
        sand_grain = 0.5 * n_fine + 0.5 * n_micro
        sand_col = np.stack([
            0.66 + 0.09 * sand_grain + 0.03 * strata_wave,
            0.63 + 0.08 * sand_grain + 0.03 * strata_wave,
            0.59 + 0.08 * sand_grain + 0.02 * strata_wave,
        ], axis=-1)

        rgb[:] = basal_rock * (1.0 - sand_pocket[:, :, None]) + sand_col * sand_pocket[:, :, None]
        rgb += (0.022 * (n_micro - 0.5))[:, :, None]

        height = -0.0038 * crevice * (1.0 - 0.75 * sand_pocket) + 0.0018 * mineral_ridge + 0.0012 * sand_pocket
        ao = np.clip(0.94 - 0.48 * crevice * (1.0 - 0.7 * sand_pocket) + 0.04 * sand_pocket, 0.34, 1.0)
        rough = np.clip(0.84 + 0.08 * crevice - 0.04 * cor_fringe + 0.04 * sand_pocket + 0.03 * (n_micro - 0.5), 0.70, 0.97)

    # Smooth tangent-space normal via finite difference (keeps JPEG compression efficient!)
    height_clean = -0.0036 * crevice_macro + 0.0016 * mineral_ridge
    h_smooth = 0.36 * height_clean + 0.16 * (
        np.roll(height_clean, 1, axis=0)
        + np.roll(height_clean, -1, axis=0)
        + np.roll(height_clean, 1, axis=1)
        + np.roll(height_clean, -1, axis=1)
    )
    dhdu = (np.roll(h_smooth, -2, axis=1) - np.roll(h_smooth, 2, axis=1)) * (q_size / (4.0 * 0.62))
    dhdv = (np.roll(h_smooth, -2, axis=0) - np.roll(h_smooth, 2, axis=0)) * (q_size / (4.0 * 0.62))
    nx = -dhdu
    ny = -dhdv
    nz = np.ones_like(height)
    inv = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz)
    nrm = np.stack([0.5 + 0.5 * nx * inv, 0.5 + 0.5 * ny * inv, 0.5 + 0.5 * nz * inv], axis=-1)

    orm = np.stack([ao, rough, np.zeros_like(ao)], axis=-1)
    return np.clip(rgb, 0.0, 1.0), np.clip(nrm, 0.0, 1.0), np.clip(orm, 0.0, 1.0)


def _write_jpeg_image(name, pixels_rgb, file_path, colorspace):
    h, w, _ = pixels_rgb.shape
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[:, :, :3] = pixels_rgb.astype(np.float32)
    im = bpy.data.images.new(name=name, width=w, height=h, alpha=False)
    im.colorspace_settings.name = colorspace
    im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = str(file_path)
    im.file_format = "JPEG"
    im.save(filepath=str(file_path), quality=68)
    bpy.data.images.remove(im)


def ensure_trim_sheet_files(force=False):
    """Ensure the shared 2048x2048 4-quadrant live-rock PBR maps exist on disk."""
    TRIM_TEX_DIR.mkdir(parents=True, exist_ok=True)
    if not force and all(p.is_file() for p in (TRIM_ALBEDO_PATH, TRIM_NORMAL_PATH, TRIM_ORM_PATH)):
        return (TRIM_ALBEDO_PATH, TRIM_NORMAL_PATH, TRIM_ORM_PATH)

    albedo = np.empty((2048, 2048, 3), dtype=np.float32)
    normal = np.empty((2048, 2048, 3), dtype=np.float32)
    orm = np.empty((2048, 2048, 3), dtype=np.float32)

    # OpenGL/Blender bottom-to-top rows: y in [0..1024) = V in [0.0..0.5], y in [1024..2048) = V in [0.5..1.0]
    quads = [
        ("limestone_wall",    1024, 2048,    0, 1024, 20260941),  # Q1 Top-Left  u[0.0, 0.5] v[0.5, 1.0]
        ("coralline_plateau", 1024, 2048, 1024, 2048, 20260942),  # Q2 Top-Right u[0.5, 1.0] v[0.5, 1.0]
        ("shadow_cavern",        0, 1024,    0, 1024, 20260943),  # Q3 Bot-Left  u[0.0, 0.5] v[0.0, 0.5]
        ("sand_talus",           0, 1024, 1024, 2048, 20260944),  # Q4 Bot-Right u[0.5, 1.0] v[0.0, 0.5]
    ]
    for q_name, y0, y1, x0, x1, seed in quads:
        a, n, o = _build_quadrant(q_name, q_size=1024, seed=seed)
        albedo[y0:y1, x0:x1] = a
        normal[y0:y1, x0:x1] = n
        orm[y0:y1, x0:x1] = o

    _write_jpeg_image("reef-nsa-trim-albedo-gen", albedo, TRIM_ALBEDO_PATH, "sRGB")
    _write_jpeg_image("reef-nsa-trim-normal-gen", normal, TRIM_NORMAL_PATH, "Non-Color")
    _write_jpeg_image("reef-nsa-trim-orm-gen", orm, TRIM_ORM_PATH, "Non-Color")
    return (TRIM_ALBEDO_PATH, TRIM_NORMAL_PATH, TRIM_ORM_PATH)


def build_shared_trim_material():
    """Load exact saved 2048px trim-sheet JPEGs, pack into blend, and wire glTF PBR + AO."""
    albedo_p, normal_p, orm_p = ensure_trim_sheet_files(force=False)

    im_alb = bpy.data.images.load(str(albedo_p), check_existing=False)
    im_alb.name = "reef-nsa-trim-2048-albedo"
    im_alb.colorspace_settings.name = "sRGB"
    im_alb.pack()

    im_nrm = bpy.data.images.load(str(normal_p), check_existing=False)
    im_nrm.name = "reef-nsa-trim-2048-normal"
    im_nrm.colorspace_settings.name = "Non-Color"
    im_nrm.pack()

    im_orm = bpy.data.images.load(str(orm_p), check_existing=False)
    im_orm.name = "reef-nsa-trim-2048-orm"
    im_orm.colorspace_settings.name = "Non-Color"
    im_orm.pack()

    mat = bpy.data.materials.new("NSA_Live_Rock_Trim_2048")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Metallic"].default_value = 0.0
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.45
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    t_alb = nodes.new("ShaderNodeTexImage")
    t_alb.image = im_alb
    links.new(t_alb.outputs["Color"], bsdf.inputs["Base Color"])

    t_orm = nodes.new("ShaderNodeTexImage")
    t_orm.image = im_orm
    sep = nodes.new("ShaderNodeSeparateColor")
    links.new(t_orm.outputs["Color"], sep.inputs["Color"])
    links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])

    gltf_group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
    gltf_group.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    gltf_node = nodes.new("ShaderNodeGroup")
    gltf_node.node_tree = gltf_group
    gltf_node.name = "glTF Material Output"
    links.new(sep.outputs["Red"], gltf_node.inputs["Occlusion"])

    t_nrm = nodes.new("ShaderNodeTexImage")
    t_nrm.image = im_nrm
    nrm_node = nodes.new("ShaderNodeNormalMap")
    nrm_node.inputs["Strength"].default_value = 0.92
    links.new(t_nrm.outputs["Color"], nrm_node.inputs["Color"])
    links.new(nrm_node.outputs["Normal"], bsdf.inputs["Normal"])

    return mat


def _ensure_outward(mesh):
    bm = bmesh.new()
    bm.from_mesh(mesh)
    if bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def fuse_and_carve_porous_rock(
    obj_name,
    parts,
    target_tris,
    voxel_size=0.0072,
    macro_disp=0.011,
    pore_depth=0.0042,
    ground_flat_z=True,
    ground_cut=0.024,
    noise_seed=Vector((1.3, 2.7, 0.9)),
):
    """Build fused stratified carbonate live rock via angular primitive breaking + Voxel Remesh + Voronoi karst carving."""
    created = []
    for idx, (p_kind, loc, radii, rot_euler) in enumerate(parts):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0, location=(0.0, 0.0, 0.0))
        part = bpy.context.active_object
        pmesh = part.data
        part_seed = noise_seed + Vector((idx * 1.73, idx * 2.41, idx * 0.89))

        # Break spherical symmetry in local unit sphere space BEFORE scaling/rotating
        for v in pmesh.vertices:
            co = v.co.copy()
            q = co * 2.0 + part_seed
            dists, _ = voronoi(q, distance_metric="DISTANCE")
            d1, d2 = dists[0], dists[1]
            facet = (0.48 - min(0.85, d1)) * 0.24 - max(0.0, 0.22 - (d2 - d1)) * 0.30
            irr = 0.14 * perlin_noise(co * 2.4 + part_seed, noise_basis="PERLIN_ORIGINAL")
            scale_f = max(0.72, min(1.28, 1.0 + facet + irr))
            if p_kind == "slab":
                # Tabular reef shelf: gently level top deck while keeping jagged craggy rim
                if co.z > 0.22:
                    co.z = 0.22 + 0.55 * (co.z - 0.22)
                v.co = Vector((co.x * scale_f, co.y * scale_f, co.z * (0.92 + 0.10 * irr)))
            else:
                # Tapered angular crag wedge (tapers top by ~20% to eliminate round knobs without bulging over shelves)
                xy_taper = max(0.62, min(1.10, 1.04 - 0.24 * co.z))
                v.co = Vector((co.x * scale_f * xy_taper, co.y * scale_f * xy_taper, co.z * scale_f))
        pmesh.update()

        part.scale = radii
        part.rotation_euler = rot_euler
        part.location = loc
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        created.append(part)

    bpy.ops.object.select_all(action="DESELECT")
    for p in created:
        p.select_set(True)
    rock = created[0]
    bpy.context.view_layer.objects.active = rock
    if len(created) > 1:
        bpy.ops.object.join()
    rock.name = obj_name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Weld overlapping carbonate slabs into one watertight manifold solid
    remesh = rock.modifiers.new("NSA_Rock_Union", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = voxel_size
    remesh.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=remesh.name)

    # Crisp 1-pass de-stairstep smooth so crevices and ledges remain sharp
    sm = rock.modifiers.new("NSA_Rock_Smooth", "SMOOTH")
    sm.factor = 0.26
    sm.iterations = 1
    bpy.ops.object.modifier_apply(modifier=sm.name)

    mesh = rock.data
    mesh.calc_loop_triangles()
    before_tris = len(mesh.loop_triangles)
    if before_tris > target_tris:
        dec = rock.modifiers.new("NSA_Rock_LOD", "DECIMATE")
        dec.ratio = max(0.35, target_tris / max(1, before_tris))
        bpy.ops.object.modifier_apply(modifier=dec.name)

    tri = rock.modifiers.new("NSA_Rock_Triangulate", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=tri.name)

    # Multi-scale geological chiseling: tilted horizontal strata ledges + Voronoi crag fractures + clustered Pukani pores
    mesh = rock.data
    mesh.update()
    z_min = min(v.co.z for v in mesh.vertices)
    z_max = max(v.co.z for v in mesh.vertices)
    z_span = max(0.05, z_max - z_min)
    max_inward = max(0.011, macro_disp * 0.85)
    max_outward = max(0.014, macro_disp * 1.15)

    for v in mesh.vertices:
        p = v.co + noise_seed
        ground_fade = 1.0 if not ground_flat_z else max(0.0, min(1.0, (v.co.z - z_min) / min(0.032, 0.25 * z_span)))

        p_strata = Vector((p.x * 5.0, p.y * 5.0, (p.z + 0.14 * p.x - 0.10 * p.y) * 14.0))
        strata = (1.0 - abs(perlin_noise(p_strata, noise_basis="PERLIN_ORIGINAL"))) ** 1.55 - 0.40

        dists, _ = voronoi(p * 6.8, distance_metric="DISTANCE")
        d1, d2 = dists[0], dists[1]
        edge = max(0.0, d2 - d1)
        crag = (
            (0.48 - min(0.80, d1))
            - max(0.0, 0.20 - edge) * 1.35
            + 0.45 * perlin_noise(p * 9.5, noise_basis="PERLIN_ORIGINAL")
        )

        p_dists, _ = voronoi(p * 18.0 + Vector((4.1, 1.9, 7.2)), distance_metric="DISTANCE")
        cluster_mask = max(
            0.0,
            min(1.0, 0.65 + 0.85 * perlin_noise(p * 7.5 + Vector((2.3, 5.1, 1.7)), noise_basis="PERLIN_ORIGINAL")),
        )
        cavity = (max(0.0, (0.34 - p_dists[0]) / 0.34) ** 1.5) * cluster_mask

        raw_disp = macro_disp * (0.74 * crag + 0.30 * strata) - pore_depth * 1.35 * cavity
        clamped_disp = max(-max_inward, min(max_outward, raw_disp))
        n_est = v.normal if v.normal.length > 1e-4 else Vector((0.0, 0.0, 1.0))
        v.co += n_est * (ground_fade * clamped_disp)
    mesh.update()

    # Bisect flat base cleanly & fill boundary -> 100% manifold flat bottom + XY center at z=0
    bm = bmesh.new()
    bm.from_mesh(mesh)
    if ground_flat_z:
        z_cut = min(v.co.z for v in bm.verts) + ground_cut
        bmesh.ops.bisect_plane(
            bm,
            geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
            plane_co=(0.0, 0.0, z_cut),
            plane_no=(0.0, 0.0, 1.0),
            clear_inner=True,
        )
        b_edges = [e for e in bm.edges if e.is_boundary]
        if b_edges:
            bmesh.ops.triangle_fill(bm, edges=b_edges, use_dissolve=False)

    xs = [v.co.x for v in bm.verts]
    ys = [v.co.y for v in bm.verts]
    z0 = min(v.co.z for v in bm.verts)
    cx = 0.5 * (min(xs) + max(xs))
    cy = 0.5 * (min(ys) + max(ys))
    for v in bm.verts:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= z0
    bmesh.ops.dissolve_degenerate(bm, dist=1e-4, edges=list(bm.edges))
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return rock


def attach_verified_sockets(rock, rock_id, socket_specs):
    """Prepare local support skins & attach BVH-verified empty coral-mount sockets.

    Each tuple in socket_specs: (name, origin_v, ray_dir_v, archetype, footprint_m, clearance_m)
    """
    mesh = rock.data
    parent_mesh_id = rock_id.replace("-", "_")

    for name, origin_v, ray_dir_v, archetype, footprint, clearance in socket_specs:
        # Step 1: Locate candidate anchor surface triangle via BVH raycast
        tree = BVHTree.FromPolygons([v.co for v in mesh.vertices], [p.vertices[:] for p in mesh.polygons])
        ray_dir = Vector(ray_dir_v).normalized()
        point, normal, _face_idx, _ = tree.ray_cast(Vector(origin_v), ray_dir)
        if point is None:
            raise RuntimeError(f"Socket {name} missed rock surface from {origin_v} dir {ray_dir_v}")
        normal = normal.normalized()
        if ray_dir.z < -0.5:
            normal = (normal * 0.35 + Vector((0.0, 0.0, 1.0)) * 0.65).normalized()

        # Step 2: Level support pad inside footprint and clear EVERY vertex inside clearance cylinder (bounded in height!).
        outer = clearance + 0.028
        inner = footprint + 0.014
        max_headroom = clearance + 0.045
        for v in mesh.vertices:
            delta = v.co - point
            signed = delta.dot(normal)
            radial = (delta - normal * signed).length
            if radial >= outer or signed < -0.026 or signed > max_headroom:
                continue
            # Clear any local protrusion rising into the cylindrical headroom (never pull distant upper arches!)
            if radial <= clearance + 0.020 and 0.0 < signed <= max_headroom:
                v.co -= normal * signed
                delta = v.co - point
                signed = delta.dot(normal)
                radial = (delta - normal * signed).length
            if v.normal.dot(normal) < 0.15:
                continue
            w = max(0.0, min(1.0, (outer - radial) / max(1e-4, outer - inner)))
            w = w * w * (3.0 - 2.0 * w)
            target = v.co - normal * signed
            v.co = v.co.lerp(target, w)
        mesh.update()

        _ensure_outward(mesh)
        tree2 = BVHTree.FromPolygons([v.co for v in mesh.vertices], [p.vertices[:] for p in mesh.polygons])
        tangent = Vector((0.0, 1.0, 0.0)).cross(normal)
        if tangent.length < 1e-4:
            tangent = Vector((1.0, 0.0, 0.0)).cross(normal)
        tangent.normalize()
        bitangent = normal.cross(tangent).normalized()

        best_hit = None
        for du, dv in ((0.0, 0.0), (0.0021, 0.0017), (-0.0019, 0.0023), (0.0013, -0.0021)):
            probe = point + normal * 0.04 + tangent * du + bitangent * dv
            p2, _n2, f2, _ = tree2.ray_cast(probe, -normal)
            if p2 is not None and f2 is not None:
                tri = mesh.polygons[f2]
                center_p = sum((mesh.vertices[vi].co for vi in tri.vertices), Vector((0.0, 0.0, 0.0))) / len(tri.vertices)
                tri_n = tri.normal.normalized()
                if tri_n.dot(normal) > 0.85:
                    best_hit = (center_p, tri_n, f2)
                    break
        if best_hit is None:
            raise RuntimeError(f"Post-flatten raycast failed for {name}")
        snap_pt, snap_n, snap_face_idx = best_hit

        # Second clearance pass relative to EXACT snapped (snap_pt, snap_n), strictly bounded to local headroom:
        protected = set(mesh.polygons[snap_face_idx].vertices)
        for v in mesh.vertices:
            if v.index in protected:
                continue
            delta = v.co - snap_pt
            signed = delta.dot(snap_n)
            if signed < -0.028 or signed > max_headroom:
                continue
            radial = (delta - snap_n * signed).length
            if radial <= footprint + 0.018 and v.normal.dot(snap_n) > -0.10:
                v.co -= snap_n * signed
            elif radial <= clearance + 0.038 and signed > -0.0006:
                v.co -= snap_n * (signed + 0.0006)
        mesh.update()
        _ensure_outward(mesh)
        tri_after = mesh.polygons[snap_face_idx]
        snap_pt = sum((mesh.vertices[vi].co for vi in tri_after.vertices), Vector((0.0, 0.0, 0.0))) / len(tri_after.vertices)
        snap_n = tri_after.normal.normalized()

        sock = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(sock)
        sock.parent = rock
        sock.location = snap_pt
        sock.rotation_mode = "QUATERNION"
        sock.rotation_quaternion = Vector((0.0, 0.0, 1.0)).rotation_difference(snap_n)
        sock.scale = (1.0, 1.0, 1.0)
        sock.empty_display_size = footprint
        sock["reefSocket"] = {
            "role": "coral-mount",
            "parentMesh": parent_mesh_id,
            "archetype": archetype,
            "footprintRadiusM": footprint,
            "clearanceRadiusM": clearance,
        }


def assign_trim_sheet_uvs(rock, mat, uv_scale=2.2):
    """Map connected macro regions into the 4 quadrants of the 2048px trim sheet with zero per-triangle confetti or seams."""
    mesh = rock.data
    mesh.update()

    if mesh.color_attributes:
        for attr in list(mesh.color_attributes):
            mesh.color_attributes.remove(attr)
    if not mesh.uv_layers:
        mesh.uv_layers.new(name="TrimAtlas_UV")
    uv_layer = mesh.uv_layers.active

    n_verts = len(mesh.vertices)
    n_polys = len(mesh.polygons)
    zs = [v.co.z for v in mesh.vertices]
    z_min, z_max = min(zs), max(zs)
    z_span = max(0.05, z_max - z_min)

    # Build vertex adjacency and face adjacency
    v_neighbors = [set() for _ in range(n_verts)]
    edge_to_faces = {}
    for fi, poly in enumerate(mesh.polygons):
        pverts = poly.vertices[:]
        for i in range(len(pverts)):
            v0 = pverts[i]
            v1 = pverts[(i + 1) % len(pverts)]
            v_neighbors[v0].add(v1)
            v_neighbors[v1].add(v0)
            ek = (v0, v1) if v0 < v1 else (v1, v0)
            edge_to_faces.setdefault(ek, []).append(fi)

    f_neighbors = [[] for _ in range(n_polys)]
    for flist in edge_to_faces.values():
        if len(flist) == 2:
            a, b = flist[0], flist[1]
            f_neighbors[a].append(b)
            f_neighbors[b].append(a)

    # 8 iterations of Laplacian normal smoothing on vertices -> macro geological face normals
    smooth_n = [v.normal.copy() if v.normal.length > 1e-4 else Vector((0.0, 0.0, 1.0)) for v in mesh.vertices]
    for _ in range(8):
        next_n = []
        for vi in range(n_verts):
            nbs = v_neighbors[vi]
            if not nbs:
                next_n.append(smooth_n[vi])
                continue
            avg_nb = sum((smooth_n[nb] for nb in nbs), Vector((0.0, 0.0, 0.0))) / len(nbs)
            blended = 0.45 * smooth_n[vi] + 0.55 * avg_nb
            next_n.append(blended.normalized() if blended.length > 1e-4 else smooth_n[vi])
        smooth_n = next_n

    # Initial macro quadrant & projection axis classification per face
    quad_ids = [0] * n_polys
    proj_axes = [2] * n_polys
    sand_z_thresh = 0.28 if z_span < 0.14 else 0.16

    for fi, poly in enumerate(mesh.polygons):
        poly.use_smooth = True
        fn = sum((smooth_n[vi] for vi in poly.vertices), Vector((0.0, 0.0, 0.0)))
        fn = fn.normalized() if fn.length > 1e-4 else poly.normal.copy()
        cz = sum(mesh.vertices[vi].co.z for vi in poly.vertices) / len(poly.vertices)
        fz_norm = (cz - z_min) / z_span

        # 0: Q1 limestone_wall, 1: Q2 coralline_plateau, 2: Q3 shadow_cavern, 3: Q4 sand_talus
        if (fz_norm < sand_z_thresh and fn.z > -0.35) or fz_norm < 0.03:
            qid = 3
        elif fn.z < -0.22 and fz_norm >= 0.03:
            qid = 2
        elif fn.z > 0.42 and fz_norm >= 0.16:
            qid = 1
        else:
            qid = 0
        quad_ids[fi] = qid

        ax, ay, az = abs(fn.x), abs(fn.y), abs(fn.z)
        if az >= ax and az >= ay:
            proj_axes[fi] = 2
        elif ax >= ay:
            proj_axes[fi] = 0
        else:
            proj_axes[fi] = 1

    # 3 rounds of neighbor majority-vote region cleanup to eliminate 1-6 triangle confetti patches
    for _ in range(3):
        new_quads = list(quad_ids)
        new_axes = list(proj_axes)
        for fi in range(n_polys):
            nbs = f_neighbors[fi]
            if not nbs:
                continue
            q_counts = Counter(quad_ids[nb] for nb in nbs)
            q_counts[quad_ids[fi]] += 1
            best_q, best_qc = q_counts.most_common(1)[0]
            if best_qc > q_counts[quad_ids[fi]]:
                new_quads[fi] = best_q

            a_counts = Counter(proj_axes[nb] for nb in nbs)
            a_counts[proj_axes[fi]] += 1
            best_a, best_ac = a_counts.most_common(1)[0]
            if best_ac > a_counts[proj_axes[fi]]:
                new_axes[fi] = best_a
        quad_ids = new_quads
        proj_axes = new_axes

    quad_offsets = {
        0: (0.00, 0.50),  # Q1: limestone_wall
        1: (0.50, 0.50),  # Q2: coralline_plateau
        2: (0.00, 0.00),  # Q3: shadow_cavern
        3: (0.50, 0.00),  # Q4: sand_talus
    }

    # Connected-component BFS over faces sharing (quad_id, proj_axis) -> 100% seamless continuous UVs per island
    visited = [False] * n_polys
    base_fit_m = 0.72 / max(0.5, uv_scale / 2.2)
    island_idx = 0

    for start_fi in range(n_polys):
        if visited[start_fi]:
            continue
        target_key = (quad_ids[start_fi], proj_axes[start_fi])
        island_faces = []
        queue = deque([start_fi])
        visited[start_fi] = True
        while queue:
            curr = queue.popleft()
            island_faces.append(curr)
            for nb in f_neighbors[curr]:
                if not visited[nb] and (quad_ids[nb], proj_axes[nb]) == target_key:
                    visited[nb] = True
                    queue.append(nb)

        qid, axis = target_key
        u_q0, v_q0 = quad_offsets[qid]

        loop_st = []
        s_min, s_max = 1e9, -1e9
        t_min, t_max = 1e9, -1e9
        for fi in island_faces:
            poly = mesh.polygons[fi]
            for loop_i in poly.loop_indices:
                p = mesh.vertices[mesh.loops[loop_i].vertex_index].co
                if axis == 2:
                    s, t = p.x, p.y
                elif axis == 0:
                    s, t = p.y, p.z
                else:
                    s, t = p.x, p.z
                if s < s_min:
                    s_min = s
                if s > s_max:
                    s_max = s
                if t < t_min:
                    t_min = t
                if t > t_max:
                    t_max = t
                loop_st.append((loop_i, s, t))

        s_span = max(1e-4, s_max - s_min)
        t_span = max(1e-4, t_max - t_min)
        span_fit = max(base_fit_m, s_span, t_span)

        # Deterministic offset within the safe [0.015, 0.485] box so smaller islands sample varied regions
        slack_u = max(0.0, 0.470 * (1.0 - s_span / span_fit))
        slack_v = max(0.0, 0.470 * (1.0 - t_span / span_fit))
        hash_u = ((island_idx * 37 + qid * 13 + axis * 7) % 29) / 28.0
        hash_v = ((island_idx * 53 + qid * 19 + axis * 11) % 31) / 30.0
        off_u = 0.015 + slack_u * hash_u
        off_v = 0.015 + slack_v * hash_v
        scale_uv = 0.470 / span_fit

        for loop_i, s, t in loop_st:
            u_local = max(0.015, min(0.485, off_u + (s - s_min) * scale_uv))
            v_local = max(0.015, min(0.485, off_v + (t - t_min) * scale_uv))
            uv_layer.data[loop_i].uv = (u_q0 + u_local, v_q0 + v_local)

        island_idx += 1

    mesh.materials.clear()
    mesh.materials.append(mat)


def finalize_and_export_nsa_rock(rock, rock_id, notes):
    """Validate zero non-manifold/boundary/loose verts, save .blend, export .glb, and add review lights."""
    mesh = rock.data
    if mesh.validate(verbose=True):
        raise RuntimeError(f"Final mesh validation failed for {rock_id}")

    bm = bmesh.new()
    bm.from_mesh(mesh)
    non_manifold = sum(1 for e in bm.edges if not e.is_manifold)
    boundary = sum(1 for e in bm.edges if e.is_boundary)
    loose_v = sum(1 for v in bm.verts if not v.link_edges)
    bm.free()
    if non_manifold or boundary or loose_v:
        raise RuntimeError(f"Rock topology invalid: non_manifold={non_manifold}, boundary={boundary}, loose={loose_v}")

    # Apply root transforms ONLY to rock (never sockets), then select rock + socket children
    for o in bpy.context.selected_objects:
        o.select_set(False)
    rock.select_set(True)
    bpy.context.view_layer.objects.active = rock
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for child in rock.children:
        child.select_set(True)

    rock["authoring_notes"] = notes

    mesh.calc_loop_triangles()
    triangles = len(mesh.loop_triangles)

    blend_path = SPLAT_FISH_DIR / "blend" / f"{rock_id}.blend"
    blend_path.parent.mkdir(parents=True, exist_ok=True)
    override_path = SPLAT_FISH_DIR / "overrides" / f"{rock_id}.glb"
    override_path.parent.mkdir(parents=True, exist_ok=True)

    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), compress=False)
    bpy.ops.export_scene.gltf(
        filepath=str(override_path),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_extras=True,
        export_animations=False,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_vertex_color="NONE",
        export_attributes=False,
    )

    dims = [round(float(v), 4) for v in rock.dimensions]
    print(f"NSA_ROCK_SAVED_EXPORTED {rock_id}", json.dumps({
        "triangles": triangles,
        "vertices": len(mesh.vertices),
        "sockets": [c.name for c in rock.children],
        "dimensions_blender": dims,
    }), flush=True)

    # Setup clean neutral review lights ONLY AFTER .blend save & .glb export
    scene = bpy.context.scene
    world = bpy.data.worlds.new("Neutral_Rock_Review")
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.10, 0.14, 0.19, 1.0)
    bg.inputs[1].default_value = 0.75
    span = max(0.35, max(rock.dimensions))
    z_mid = 0.45 * float(rock.dimensions.z)
    for name, pos, energy, size in [
        ("Key", (span * 0.6, -span * 1.6, z_mid + span * 1.1), 16.0 * span * span, span * 0.9),
        ("Fill", (-span * 1.3, -span * 0.9, z_mid + span * 0.5), 7.5 * span * span, span * 1.2),
        ("Rim", (span * 0.2, span * 1.5, z_mid + span * 0.9), 11.0 * span * span, span * 0.8),
    ]:
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.shape = "DISK"
        light.size = size
        lo = bpy.data.objects.new(name, light)
        bpy.context.collection.objects.link(lo)
        lo.location = pos
        lo.rotation_euler = (Vector((0.0, 0.0, z_mid)) - lo.location).to_track_quat("-Z", "Y").to_euler()
