"""Shared AQ-94 Negative Space Aquascape (NSA) live-rock sculpting & 2048px PBR trim-sheet helper.

Generates and caches a deterministic 2048x2048 four-quadrant limestone trim sheet
(albedo RGB JPEG, normal JPEG, ORM JPEG where R=AO, G=Roughness, B=Metallic=0) under
src/rendering/assets/corals/custom-rocks/textures/ and provides watertight voxel-remesh +
Voronoi carbonate cavity sculpting + BVH-verified coral socket stamping + glTF export.

Safe for both live Blender MCP execution and headless background CLI Blender.
"""
import json
import math
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.noise import noise as perlin_noise

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
    """Synthesize a 1024x1024 seamless porous carbonate quadrant (albedo, height, rough, ao)."""
    rng = np.random.default_rng(seed)
    idx_y, idx_x = np.mgrid[0:q_size, 0:q_size].astype(np.float32)
    u = (idx_x + 0.5) / q_size
    v = (idx_y + 0.5) / q_size

    # Multi-scale domain-warped noise + Worley honeycomb carbonate fissures (no uniform dots!)
    macro = _periodic_value_noise(u, v, 7, 7, rng)
    med = _periodic_value_noise(u, v, 18, 18, rng)
    fine = _periodic_value_noise(u, v, 44, 44, rng)
    micro = _periodic_value_noise(u, v, 96, 96, rng)

    wu = (u + 0.045 * (macro - 0.5) + 0.020 * (med - 0.5)) % 1.0
    wv = (v + 0.045 * (_periodic_value_noise(u, v, 9, 9, rng) - 0.5) + 0.020 * (med - 0.5)) % 1.0
    f1_macro, _ = _periodic_worley_f1(wu, wv, 10, rng)
    f1_pore, edge_pore = _periodic_worley_f1(wu, wv, 22, rng)

    # Irregular eroded limestone cavities & angular rocky strata ridges
    hole_macro = np.clip((0.46 - f1_macro + 0.16 * (med - 0.5)) * 2.8, 0.0, 1.0) ** 1.5
    hole_fine = np.clip((0.36 - f1_pore + 0.12 * (fine - 0.5)) * 3.4, 0.0, 1.0) ** 1.5
    ridge = np.clip((0.28 - edge_pore) * 2.6, 0.0, 1.0)
    pits = np.clip((hole_macro * 0.65 + hole_fine * 0.48) * (0.60 + 0.55 * fine), 0.0, 1.0)

    rgb = np.empty((q_size, q_size, 3), dtype=np.float32)

    if q_name == "limestone_wall":
        blush = np.clip((macro - 0.58) * 2.2, 0.0, 0.36)
        base_r = 0.66 + 0.14 * macro + 0.06 * fine
        base_g = 0.61 + 0.13 * macro + 0.06 * fine
        base_b = 0.53 + 0.11 * macro + 0.05 * fine
        rgb[:, :, 0] = base_r * (1.0 - blush) + 0.58 * blush
        rgb[:, :, 1] = base_g * (1.0 - blush) + 0.42 * blush
        rgb[:, :, 2] = base_b * (1.0 - blush) + 0.48 * blush
        rgb *= (1.0 - 0.30 * pits[:, :, None])
        rgb += (0.025 * (micro - 0.5) + 0.03 * ridge)[:, :, None]
        height = -0.0038 * pits + 0.0014 * macro
        ao = np.clip(0.98 - 0.40 * pits - 0.08 * (1.0 - med), 0.38, 1.0)
        rough = np.clip(0.84 + 0.10 * pits - 0.04 * blush + 0.03 * (micro - 0.5), 0.70, 0.98)

    elif q_name == "coralline_plateau":
        crust = np.clip((macro * 0.65 + med * 0.35 - 0.38) * 2.0, 0.12, 0.78)
        rock_col = np.stack([
            0.66 + 0.10 * fine - 0.14 * pits,
            0.61 + 0.09 * fine - 0.13 * pits,
            0.54 + 0.08 * fine - 0.12 * pits,
        ], axis=-1)
        cor_col = np.stack([
            0.56 + 0.10 * med + 0.05 * ridge,
            0.34 + 0.08 * fine + 0.04 * macro,
            0.47 + 0.11 * med + 0.06 * ridge,
        ], axis=-1)
        rgb[:] = rock_col * (1.0 - crust[:, :, None]) + cor_col * crust[:, :, None]
        rgb *= (1.0 - 0.26 * pits[:, :, None])
        rgb += (0.02 * (micro - 0.5))[:, :, None]
        height = -0.0032 * pits + 0.0015 * crust
        ao = np.clip(0.98 - 0.36 * pits - 0.06 * (1.0 - macro), 0.40, 1.0)
        rough = np.clip(0.76 + 0.12 * pits - 0.08 * crust + 0.03 * (micro - 0.5), 0.62, 0.95)

    elif q_name == "shadow_cavern":
        algae = np.clip((macro * 0.7 + fine * 0.3 - 0.46) * 2.2, 0.0, 0.58)
        rgb[:, :, 0] = (0.48 + 0.09 * med) * (1.0 - algae) + 0.35 * algae
        rgb[:, :, 1] = (0.45 + 0.08 * med) * (1.0 - algae) + 0.37 * algae
        rgb[:, :, 2] = (0.40 + 0.07 * med) * (1.0 - algae) + 0.31 * algae
        rgb *= (1.0 - 0.32 * pits[:, :, None])
        rgb += (0.02 * (micro - 0.5))[:, :, None]
        height = -0.0040 * pits + 0.0012 * med
        ao = np.clip(0.88 - 0.42 * pits - 0.08 * (1.0 - macro), 0.30, 0.95)
        rough = np.clip(0.88 + 0.08 * pits + 0.03 * (micro - 0.5), 0.74, 0.98)

    else:  # "sand_talus"
        sand_pocket = np.clip((med * 0.6 + (1.0 - f1_macro) * 0.4 - 0.40) * 2.4, 0.0, 0.84)
        stria = 0.5 + 0.5 * np.sin(u * 52.0 + 2.5 * np.sin(v * 18.0))
        rock_col = np.stack([
            0.62 + 0.10 * macro - 0.14 * pits,
            0.57 + 0.09 * macro - 0.13 * pits,
            0.49 + 0.08 * macro - 0.12 * pits,
        ], axis=-1)
        sand_col = np.stack([
            0.84 + 0.07 * fine + 0.03 * stria,
            0.79 + 0.07 * fine + 0.03 * stria,
            0.68 + 0.06 * fine + 0.03 * stria,
        ], axis=-1)
        rgb[:] = rock_col * (1.0 - sand_pocket[:, :, None]) + sand_col * sand_pocket[:, :, None]
        rgb *= (1.0 - 0.22 * pits[:, :, None])
        rgb += (0.02 * (micro - 0.5))[:, :, None]
        height = -0.0030 * pits + 0.0014 * sand_pocket
        ao = np.clip(0.96 - 0.32 * pits + 0.04 * sand_pocket, 0.38, 1.0)
        rough = np.clip(0.86 + 0.08 * pits - 0.04 * sand_pocket + 0.03 * (micro - 0.5), 0.72, 0.98)

    # Smooth tangent-space normal via finite difference (keeps JPEG compression efficient!)
    dhdu = (np.roll(height, -2, axis=1) - np.roll(height, 2, axis=1)) * (q_size / (4.0 * 0.42))
    dhdv = (np.roll(height, -2, axis=0) - np.roll(height, 2, axis=0)) * (q_size / (4.0 * 0.42))
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
    bpy.context.scene.render.image_settings.quality = 80
    im.save()
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
        bsdf.inputs["Specular IOR Level"].default_value = 0.42
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
    nrm_node.inputs["Strength"].default_value = 0.80
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
    """Build fused organic carbonate live rock via Voxel Remesh + safe porous carving -> watertight tris."""
    created = []
    for _p_kind, loc, radii, rot_euler in parts:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0, location=loc)
        part = bpy.context.active_object
        part.scale = radii
        part.rotation_euler = rot_euler
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

    # Weld overlapping carbonate lobes into one watertight manifold solid
    remesh = rock.modifiers.new("NSA_Rock_Union", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = voxel_size
    remesh.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=remesh.name)

    sm = rock.modifiers.new("NSA_Rock_Smooth", "SMOOTH")
    sm.factor = 0.42
    sm.iterations = 2
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

    # Carve multi-scale Perlin limestone crags + vesicular pores safely along smooth normals
    mesh = rock.data
    mesh.update()
    z_min = min(v.co.z for v in mesh.vertices)
    z_max = max(v.co.z for v in mesh.vertices)
    z_span = max(0.05, z_max - z_min)
    for v in mesh.vertices:
        p = v.co + noise_seed
        # Taper relief near very bottom so ground bisect cut is clean
        ground_fade = 1.0 if not ground_flat_z else max(0.0, min(1.0, (v.co.z - z_min) / min(0.03, 0.25 * z_span)))
        crag = (
            0.65 * perlin_noise(p * 6.5, noise_basis="PERLIN_ORIGINAL")
            + 0.35 * perlin_noise(p * 14.0, noise_basis="PERLIN_ORIGINAL")
        )
        pore_raw = abs(perlin_noise(p * 26.0 + Vector((4.1, 1.9, 7.2)), noise_basis="PERLIN_ORIGINAL"))
        cavity = max(0.0, (0.28 - pore_raw) / 0.28) ** 1.35
        n_est = v.normal if v.normal.length > 1e-4 else Vector((0.0, 0.0, 1.0))
        v.co += n_est * ground_fade * (macro_disp * crag - pore_depth * cavity)
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
        point, normal, _face_idx, _ = tree.ray_cast(Vector(origin_v), Vector(ray_dir_v).normalized())
        if point is None:
            raise RuntimeError(f"Socket {name} missed rock surface from {origin_v} dir {ray_dir_v}")
        normal = normal.normalized()

        # Step 2: Level support pad inside footprint and clear EVERY vertex inside clearance cylinder > 0.
        outer = clearance + 0.018
        inner = footprint + 0.012
        for v in mesh.vertices:
            delta = v.co - point
            signed = delta.dot(normal)
            radial = (delta - normal * signed).length
            if radial >= outer or signed < -0.025:
                continue
            # First always clear any protrusion rising into the cylindrical headroom
            if radial <= clearance + 0.008 and signed > 0.0:
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

        # Second clearance pass relative to EXACT snapped (snap_pt, snap_n):
        # keep support footprint flush within +-0.0005 and push outer ring vertices within clearance + 0.014 down below -0.001.
        protected = set(mesh.polygons[snap_face_idx].vertices)
        for v in mesh.vertices:
            if v.index in protected:
                continue
            delta = v.co - snap_pt
            signed = delta.dot(snap_n)
            radial = (delta - snap_n * signed).length
            if radial <= clearance + 0.014 and signed > -0.045:
                if radial <= footprint + 0.008 and v.normal.dot(snap_n) > 0.25 and signed > -0.002:
                    v.co -= snap_n * signed
                elif signed > -0.0015:
                    v.co -= snap_n * (signed + 0.0015)
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
    """Map every face via triplanar box projection into the 4 quadrants of the 2048px trim sheet."""
    mesh = rock.data
    bm_clean = bmesh.new()
    bm_clean.from_mesh(mesh)
    bmesh.ops.dissolve_degenerate(bm_clean, dist=1e-4, edges=list(bm_clean.edges))
    bmesh.ops.triangulate(bm_clean, faces=list(bm_clean.faces))
    bmesh.ops.recalc_face_normals(bm_clean, faces=list(bm_clean.faces))
    bm_clean.to_mesh(mesh)
    bm_clean.free()
    mesh.update()
    if mesh.color_attributes:
        for attr in list(mesh.color_attributes):
            mesh.color_attributes.remove(attr)
    if not mesh.uv_layers:
        mesh.uv_layers.new(name="TrimAtlas_UV")
    uv_layer = mesh.uv_layers.active

    zs = [v.co.z for v in mesh.vertices]
    z_min, z_max = min(zs), max(zs)
    z_span = max(0.05, z_max - z_min)

    for poly in mesh.polygons:
        poly.use_smooth = True
        n = poly.normal
        cz = sum(mesh.vertices[vi].co.z for vi in poly.vertices) / len(poly.vertices)
        z_norm = (cz - z_min) / z_span

        # Select trim quadrant cleanly based on normal orientation & elevation
        if z_norm < 0.22 or n.z < -0.72:
            u_q0, v_q0 = 0.50, 0.00  # Q4: sand-dusted basal talus & underside shelf seam
        elif n.z > 0.56 and z_norm > 0.28:
            u_q0, v_q0 = 0.50, 0.50  # Q2: encrusting coralline algae plateau shelf
        elif n.z < -0.32:
            u_q0, v_q0 = 0.00, 0.00  # Q3: deep shaded overhang & cave grotto ceiling
        else:
            u_q0, v_q0 = 0.00, 0.50  # Q1: sunlit porous carbonate live-rock wall

        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        tri_st = []
        for loop_i in poly.loop_indices:
            p = mesh.vertices[mesh.loops[loop_i].vertex_index].co
            if az >= ax and az >= ay:
                s, t = p.x * uv_scale, p.y * uv_scale
            elif ax >= ay:
                s, t = p.y * uv_scale, p.z * uv_scale
            else:
                s, t = p.x * uv_scale, p.z * uv_scale
            tri_st.append((loop_i, s, t))

        # Continuous non-mirrored per-triangle tile shift inside [0.025, 0.475] (eliminates symmetry seams!)
        s0 = math.floor(sum(item[1] for item in tri_st) / len(tri_st))
        t0 = math.floor(sum(item[2] for item in tri_st) / len(tri_st))
        for loop_i, s, t in tri_st:
            su = max(0.0, min(1.0, (s - s0) * 0.85 + 0.075))
            tv = max(0.0, min(1.0, (t - t0) * 0.85 + 0.075))
            uv_layer.data[loop_i].uv = (
                u_q0 + 0.020 + su * 0.460,
                v_q0 + 0.020 + tv * 0.460,
            )

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
