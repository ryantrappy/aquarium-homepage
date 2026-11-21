"""Shared Blender 5.2.3 LTS anatomical head sculpting & 768x768 PBR texture pipeline (`AQ-91` / `AQ-70.10`).

Loads each species's base GLB from `src/rendering/assets/splat-fish/<id>.glb`, preserves its 8-bone
skeleton, bounds, UV layout, and pectoral rig weighting while sculpting species-accurate 3D convex
cornea eye domes + orbital sockets, curved operculum gill-cover plates + gill slits, and buccal mouth
lips/clefts. Generates packed 768x768 BaseColor, biological Normal (scales, lateral line, fin rays,
cornea dome, gill/mouth creases), and ORM maps, saves `.blend`, exports `.glb` override, and renders
studio Cycles inspection images to the scratch directory. Safe for both CLI Blender and Blender MCP.
"""
import json
import math
import struct
import zlib
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

REPO_ROOT = Path(__file__).resolve().parents[3]
SPLAT_FISH_DIR = REPO_ROOT / "src" / "rendering" / "assets" / "splat-fish"
BLEND_DIR = SPLAT_FISH_DIR / "blend"
OVERRIDES_DIR = SPLAT_FISH_DIR / "overrides"
SCRATCH_DIR = Path(
    "/Users/ryantrapp/.gemini/antigravity/brain/28e98ec5-df1b-447c-b64c-b820b53bc38b/scratch"
)


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return lo if x < lo else (hi if x > hi else x)


def _smoothstep(edge0: float, edge1: float, x: float) -> float:
    t = _clamp((x - edge0) / (edge1 - edge0)) if edge1 != edge0 else (1.0 if x >= edge1 else 0.0)
    return t * t * (3.0 - 2.0 * t)


def _np_smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - edge0) / max(1e-8, edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def clear_scene() -> bpy.types.Scene:
    """Safely reset scene data blocks without unloading Blender add-ons or MCP."""
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for col in list(bpy.data.collections):
        bpy.data.collections.remove(col)
    for collection in (
        bpy.data.meshes,
        bpy.data.armatures,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.actions,
        bpy.data.worlds,
    ):
        for item in list(collection):
            collection.remove(item, do_unlink=True)
    return bpy.context.scene


def _find_base_color_image(mesh_obj: bpy.types.Object) -> bpy.types.Image:
    mat = mesh_obj.data.materials[0] if mesh_obj.data.materials else None
    if mat and mat.use_nodes and mat.node_tree:
        for node in mat.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                base_in = node.inputs.get("Base Color")
                if base_in and base_in.is_linked:
                    src = base_in.links[0].from_node
                    if src.type == "TEX_IMAGE" and src.image is not None:
                        return src.image
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image is not None and "base" in node.image.name.lower():
                return node.image
    for im in bpy.data.images:
        if im.size[0] > 0 and im.size[1] > 0 and im.type == "IMAGE":
            return im
    raise RuntimeError(f"Could not locate imported BaseColor image on {mesh_obj.name}")


def _auto_snap_pupil_uv(
    topdown_rgba: np.ndarray,
    u0: float,
    v0: float,
    ru: float,
    rv: float,
) -> tuple[float, float]:
    """Refine (u, v_top) cleanly toward the darkest opaque pupil pixel cluster near (u0, v0)."""
    h, w, _ = topdown_rgba.shape
    search_r = min(0.025, max(ru, rv) * 0.65)
    u_min = max(0.02, u0 - search_r)
    u_max = min(0.98, u0 + search_r)
    v_min = max(0.05, v0 - search_r)
    v_max = min(0.95, v0 + search_r)

    x0 = max(0, int(u_min * w))
    x1 = min(w, int(math.ceil(u_max * w)))
    y0 = max(0, int(v_min * h))
    y1 = min(h, int(math.ceil(v_max * h)))
    if x1 <= x0 or y1 <= y0:
        return u0, v0

    patch = topdown_rgba[y0:y1, x0:x1]
    luma = 0.299 * patch[:, :, 0] + 0.587 * patch[:, :, 1] + 0.114 * patch[:, :, 2]
    alpha = patch[:, :, 3]

    xs = (np.arange(x0, x1, dtype=np.float32) + 0.5) / w
    ys = (np.arange(y0, y1, dtype=np.float32) + 0.5) / h
    ug, vg = np.meshgrid(xs, ys)
    prior = np.exp(-(((ug - u0) ** 2 + (vg - v0) ** 2) / (0.015 ** 2)))

    mask = (alpha > 0.55) & (luma < 0.24)
    if np.count_nonzero(mask) < 6:
        return u0, v0
    weights = np.where(mask, ((0.24 - luma) ** 2) * prior, 0.0)
    w_sum = float(np.sum(weights))
    if w_sum <= 1e-8:
        return u0, v0
    u_snap = float(np.sum(ug * weights) / w_sum)
    v_snap = float(np.sum(vg * weights) / w_sum)
    return u_snap, v_snap


def _rasterize_flank_thickness_and_pectoral(
    mesh: bpy.types.Mesh,
    v_uvs: list[tuple[float, float]],
    is_pectoral: list[bool],
    res: int = 192,
) -> tuple[np.ndarray, np.ndarray]:
    """Rasterize vertex |x|/max_x flank thickness onto a coarse top-down (res x res) UV grid."""
    mesh.calc_loop_triangles()
    max_x = max(1e-4, max(abs(v.co.x) for v in mesh.vertices))
    accum = np.zeros((res, res), dtype=np.float32)
    pect_accum = np.zeros((res, res), dtype=np.float32)
    counts = np.zeros((res, res), dtype=np.float32)

    xs_norm = np.array([abs(v.co.x) / max_x for v in mesh.vertices], dtype=np.float32)
    us = np.array([u for (u, _vt) in v_uvs], dtype=np.float32)
    vs = np.array([vt for (_u, vt) in v_uvs], dtype=np.float32)

    for tri in mesh.loop_triangles:
        i0, i1, i2 = tri.vertices[:]
        u0, u1, u2 = float(us[i0]), float(us[i1]), float(us[i2])
        v0, v1, v2 = float(vs[i0]), float(vs[i1]), float(vs[i2])
        if abs((u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)) < 1e-9:
            continue

        c0 = max(0, int(math.floor(min(u0, u1, u2) * res)))
        c1 = min(res - 1, int(math.ceil(max(u0, u1, u2) * res)))
        r0 = max(0, int(math.floor(min(v0, v1, v2) * res)))
        r1 = min(res - 1, int(math.ceil(max(v0, v1, v2) * res)))
        if c1 < c0 or r1 < r0:
            continue

        grid_u = (np.arange(c0, c1 + 1, dtype=np.float32) + 0.5) / res
        grid_v = (np.arange(r0, r1 + 1, dtype=np.float32) + 0.5) / res
        gu, gv = np.meshgrid(grid_u, grid_v)

        denom = (v1 - v2) * (u0 - u2) + (u2 - u1) * (v0 - v2)
        if abs(denom) < 1e-9:
            continue
        w0 = ((v1 - v2) * (gu - u2) + (u2 - u1) * (gv - v2)) / denom
        w1 = ((v2 - v0) * (gu - u2) + (u0 - u2) * (gv - v2)) / denom
        w2 = 1.0 - w0 - w1
        inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        if not np.any(inside):
            continue

        val = np.maximum(
            0.0,
            w0 * xs_norm[i0] + w1 * xs_norm[i1] + w2 * xs_norm[i2],
        )
        p_val = (
            w0 * (1.0 if is_pectoral[i0] else 0.0)
            + w1 * (1.0 if is_pectoral[i1] else 0.0)
            + w2 * (1.0 if is_pectoral[i2] else 0.0)
        )
        accum[r0 : r1 + 1, c0 : c1 + 1] = np.where(
            inside, np.maximum(accum[r0 : r1 + 1, c0 : c1 + 1], val), accum[r0 : r1 + 1, c0 : c1 + 1]
        )
        pect_accum[r0 : r1 + 1, c0 : c1 + 1] = np.where(
            inside, np.maximum(pect_accum[r0 : r1 + 1, c0 : c1 + 1], p_val), pect_accum[r0 : r1 + 1, c0 : c1 + 1]
        )
        counts[r0 : r1 + 1, c0 : c1 + 1] += inside.astype(np.float32)

    return accum, pect_accum


def _upsample_bilinear(arr_small: np.ndarray, out_res: int) -> np.ndarray:
    in_res = arr_small.shape[0]
    coords = (np.arange(out_res, dtype=np.float32) + 0.5) * (in_res / out_res) - 0.5
    coords = np.clip(coords, 0.0, in_res - 1.0)
    i0 = np.floor(coords).astype(np.int32)
    i1 = np.minimum(in_res - 1, i0 + 1)
    f = (coords - i0).astype(np.float32)

    ry0 = i0[:, None]
    ry1 = i1[:, None]
    rx0 = i0[None, :]
    rx1 = i1[None, :]
    fy = f[:, None]
    fx = f[None, :]

    top = arr_small[ry0, rx0] * (1.0 - fx) + arr_small[ry0, rx1] * fx
    bot = arr_small[ry1, rx0] * (1.0 - fx) + arr_small[ry1, rx1] * fx
    return top * (1.0 - fy) + bot * fy


def _sculpt_head_geometry(
    mesh: bpy.types.Mesh,
    v_uvs: list[tuple[float, float]],
    is_pectoral: list[bool],
    u_eye: float,
    v_eye: float,
    spec: dict,
    smooth_pre_existing: bool = True,
) -> None:
    eye = spec["eye"]
    op = spec["operculum"]
    mouth = spec["mouth"]
    body = spec["body"]

    n_verts = len(mesh.vertices)
    is_edge = [abs(v.co.x) <= 0.0045 for v in mesh.vertices]

    if smooth_pre_existing:
        # Build vertex adjacency for gentle smoothing of any pre-existing generic head bumps
        adj: list[list[int]] = [[] for _ in range(n_verts)]
        for e in mesh.edges:
            a, b = e.vertices[0], e.vertices[1]
            adj[a].append(b)
            adj[b].append(a)

        for _pass in range(2):
            new_x = [v.co.x for v in mesh.vertices]
            for vi, v in enumerate(mesh.vertices):
                if is_pectoral[vi] or is_edge[vi]:
                    continue
                u, _vt = v_uvs[vi]
                if u < 0.58 or abs(v.co.x) < 0.006:
                    continue
                same_side = [
                    mesh.vertices[nb].co.x
                    for nb in adj[vi]
                    if not is_pectoral[nb] and (mesh.vertices[nb].co.x * v.co.x >= 0.0)
                ]
                if same_side:
                    avg_x = sum(same_side) / len(same_side)
                    new_x[vi] = v.co.x * 0.55 + avg_x * 0.45
            for vi, xval in enumerate(new_x):
                mesh.vertices[vi].co.x = xval

    ru = float(eye["ru"])
    rv = float(eye["rv"])
    dome_m = float(eye["dome_m"])
    rim_m = float(eye["rim_m"])

    u_arc_mid = float(op["u_arc_mid"])
    v_top_op = float(op["v_top"])
    v_bot_op = float(op["v_bot"])
    curve_quad = float(op.get("curve_quad", 0.35))
    plate_w = float(op.get("plate_width", 0.056))
    plate_m = float(op.get("plate_m", 0.0085))
    slit_m = float(op.get("slit_m", 0.0065))

    u_m_start = float(mouth["u_start"])
    u_m_end = float(mouth["u_end"])
    v_m_tip = float(mouth["v_tip"])
    slope_m = float(mouth.get("slope_dv_du", -0.25))
    cleft_m = float(mouth.get("cleft_m", 0.0045))
    lip_m = float(mouth.get("lip_m", 0.0042))
    cheek_m = float(body.get("cheek_puff_m", 0.0032))

    v_op_mid = 0.5 * (v_top_op + v_bot_op)

    for vi, v in enumerate(mesh.vertices):
        if is_pectoral[vi] or is_edge[vi]:
            continue
        x = v.co.x
        ax = abs(x)
        edge_fade = _smoothstep(0.0045, 0.022, ax)
        if edge_fade <= 1e-4:
            continue

        u, vt = v_uvs[vi]
        sign_x = 1.0 if x >= 0.0 else -1.0
        dx = 0.0

        # 1. Convex 3D eye cornea hemisphere + recessed orbital socket rim
        r_eye = math.hypot((u - u_eye) / ru, (vt - v_eye) / rv)
        if r_eye < 1.0:
            c2_dome = math.pow(0.5 + 0.5 * math.cos(r_eye * math.pi), 1.25)
            dx += dome_m * c2_dome
        if 0.80 < r_eye < 1.34:
            t_rim = (r_eye - 0.80) / 0.54
            c2_rim = math.pow(math.sin(t_rim * math.pi), 2.0)
            dx -= rim_m * c2_rim

        # 2. Curved 3D operculum (gill-cover) plate + recessed posterior gill slit
        v_t = (vt - v_top_op) / max(1e-4, v_bot_op - v_top_op)
        if 0.0 < v_t < 1.0:
            v_mask = math.pow(math.sin(v_t * math.pi), 1.5)
            u_gill = u_arc_mid + curve_quad * ((vt - v_op_mid) ** 2)
            du_gill = u - u_gill
            if 0.0 < du_gill < plate_w:
                t_p = du_gill / plate_w
                c2_p = (max(0.0, math.sin(t_p * math.pi)) ** 1.5) * (1.0 - 0.25 * t_p)
                dx += plate_m * v_mask * c2_p
            if du_gill > -0.018:
                slit_bell = math.exp(-(((du_gill + 0.0045) / 0.0055) ** 2))
                dx -= slit_m * v_mask * slit_bell

        # 3. Sculpted 3D buccal mouth cleft + upper/lower lip ridges
        u_m_mask = _smoothstep(u_m_start - 0.010, u_m_start + 0.010, u) * _smoothstep(
            u_m_end + 0.008, u_m_end - 0.008, u
        )
        if u_m_mask > 1e-4:
            v_cleft = v_m_tip + slope_m * (u_m_end - u)
            dv_m = vt - v_cleft
            cleft_b = math.exp(-((dv_m / 0.0055) ** 2))
            u_lip_b = math.exp(-(((dv_m + 0.0135) / 0.0068) ** 2))
            l_lip_b = math.exp(-(((dv_m - 0.0135) / 0.0068) ** 2))
            dx += u_m_mask * (-cleft_m * cleft_b + lip_m * u_lip_b + lip_m * 0.92 * l_lip_b)

        # 4. Subtle anatomical sub-orbital cheek swell behind mouth, ahead of operculum slit
        u_ch_center = 0.5 * (u_eye + u_arc_mid + 0.025)
        cheek_u = math.exp(-(((u - u_ch_center) / 0.048) ** 2))
        cheek_v = math.exp(-(((vt - (v_eye + 0.075)) / 0.065) ** 2))
        dx += cheek_m * cheek_u * cheek_v

        new_ax = max(0.004, ax + dx * edge_fade)
        v.co.x = sign_x * new_ax

    mesh.update()
    for poly in mesh.polygons:
        poly.use_smooth = True
    mesh.update()


def _generate_768_pbr_maps(
    species_id: str,
    tex_dir: Path,
    base_rgba_768: np.ndarray,
    thickness_768: np.ndarray,
    pectoral_768: np.ndarray,
    u_eye: float,
    v_eye: float,
    spec: dict,
) -> tuple[Path, Path, Path]:
    """Generate biological 768x768 BaseColor, Normal, and ORM PNG maps."""
    eye = spec["eye"]
    op = spec["operculum"]
    mouth = spec["mouth"]
    body = spec["body"]

    res = int(body.get("tex_size", 512))
    xs = (np.arange(res, dtype=np.float32) + 0.5) / res
    ys = (np.arange(res, dtype=np.float32) + 0.5) / res
    u, v = np.meshgrid(xs, ys)

    ru = float(eye["ru"])
    rv = float(eye["rv"])
    r_eye = np.hypot((u - u_eye) / ru, (v - v_eye) / rv)

    u_arc_mid = float(op["u_arc_mid"])
    v_top_op = float(op["v_top"])
    v_bot_op = float(op["v_bot"])
    curve_quad = float(op.get("curve_quad", 0.35))
    plate_w = float(op.get("plate_width", 0.056))
    v_op_mid = 0.5 * (v_top_op + v_bot_op)

    v_t_op = np.clip((v - v_top_op) / max(1e-4, v_bot_op - v_top_op), 0.0, 1.0)
    v_mask_op = np.maximum(0.0, np.sin(v_t_op * np.pi)) ** 1.6
    u_gill = u_arc_mid + curve_quad * ((v - v_op_mid) ** 2)
    du_gill = u - u_gill
    gill_slit = v_mask_op * np.exp(-(((du_gill + 0.0042) / 0.0048) ** 2))
    gill_plate = v_mask_op * np.where(
        (du_gill > 0.0) & (du_gill < plate_w),
        np.maximum(0.0, np.sin(np.clip(du_gill / plate_w, 0.0, 1.0) * np.pi)) ** 1.4,
        0.0,
    )

    u_m_start = float(mouth["u_start"])
    u_m_end = float(mouth["u_end"])
    v_m_tip = float(mouth["v_tip"])
    slope_m = float(mouth.get("slope_dv_du", -0.25))
    u_m_mask = _np_smoothstep(u_m_start - 0.010, u_m_start + 0.010, u) * _np_smoothstep(
        u_m_end + 0.008, u_m_end - 0.008, u
    )
    v_cleft = v_m_tip + slope_m * (u_m_end - u)
    dv_m = v - v_cleft
    mouth_cleft = u_m_mask * np.exp(-((dv_m / 0.0048) ** 2))
    mouth_lips = u_m_mask * (
        np.exp(-(((dv_m + 0.013) / 0.0060) ** 2)) + 0.92 * np.exp(-(((dv_m - 0.013) / 0.0060) ** 2))
    )

    # Trunk vs Fin vs Cornea anatomical masks
    alpha = base_rgba_768[:, :, 3]
    opaque_mask = _np_smoothstep(0.25, 0.65, alpha)
    body_mask = _np_smoothstep(0.18, 0.34, thickness_768) * (1.0 - pectoral_768) * opaque_mask
    fin_mask = (1.0 - _np_smoothstep(0.14, 0.28, thickness_768)) * opaque_mask
    head_smooth = _np_smoothstep(u_arc_mid - 0.03, u_arc_mid + 0.05, u)
    cornea_mask = 1.0 - _np_smoothstep(0.74, 0.98, r_eye)
    orbital_ring = np.exp(-(((r_eye - 0.96) / 0.14) ** 2))
    trunk_scale_mask = body_mask * (1.0 - head_smooth) * (1.0 - cornea_mask)

    # 1. Upgraded 768x768 BaseColor (preserves authentic markings + crisp eye/slit contrast)
    base_out = base_rgba_768.copy()
    pupil_mask = 1.0 - _np_smoothstep(0.32, 0.50, r_eye)
    iris_ring = _np_smoothstep(0.38, 0.50, r_eye) * (1.0 - _np_smoothstep(0.74, 0.92, r_eye))
    iris_rgb = np.array(eye.get("iris_rgb", [0.42, 0.28, 0.14]), dtype=np.float32)

    # Deepen wet dark pupil cleanly without erasing natural eye colors
    for ch in range(3):
        pupil_target = 0.018 + 0.01 * ch
        base_out[:, :, ch] = base_out[:, :, ch] * (1.0 - 0.80 * pupil_mask) + pupil_target * (0.80 * pupil_mask)
        base_out[:, :, ch] = base_out[:, :, ch] * (1.0 - 0.18 * iris_ring) + (
            0.55 * base_out[:, :, ch] + 0.45 * iris_rgb[ch]
        ) * (0.18 * iris_ring)

    crease_shade = np.clip(1.0 - 0.28 * gill_slit - 0.26 * mouth_cleft - 0.14 * orbital_ring, 0.62, 1.0)
    base_out[:, :, :3] = np.clip(base_out[:, :, :3] * crease_shade[:, :, None], 0.0, 1.0)

    # 2. Heightfield -> Biological Tangent-Space Normal (fine natural imbrication, zero dimples)
    scale_fu = float(body.get("scale_freq_u", 72.0)) * 1.20
    scale_fv = float(body.get("scale_freq_v", 54.0)) * 1.20
    scale_amp = float(body.get("scale_strength", 0.42)) * 0.36
    fin_ray_amp = float(body.get("fin_ray_strength", 0.34)) * 0.38
    lat_v0 = float(body.get("lateral_line_v", 0.36))

    # Staggered diagonal diamond/ctenoid fish scales facing posteriorly
    phase_u = u * scale_fu
    phase_v = v * scale_fv
    s_a = np.cos((phase_u + phase_v) * math.pi)
    s_b = np.cos((phase_u - phase_v) * math.pi)
    imbrication = np.maximum(0.0, 0.5 * (s_a * s_b + 1.0)) ** 0.72
    scales_h = scale_amp * trunk_scale_mask * imbrication

    # Curved lateral line canal along upper flank
    v_lat = lat_v0 + 0.08 * ((np.clip(u, 0.20, 0.78) - 0.50) ** 2) - 0.04 * (np.clip(u, 0.20, 0.78) - 0.50)
    u_lat_mask = _np_smoothstep(0.18, 0.26, u) * _np_smoothstep(u_arc_mid + 0.01, u_arc_mid - 0.04, u)
    lat_groove = -0.35 * scale_amp * u_lat_mask * np.exp(-(((v - v_lat) / 0.0055) ** 2))

    # Radial lepidotrichia fin rays across dorsal, anal, caudal, and pectoral fins
    du_fin = u - 0.48
    dv_fin = v - 0.50
    ang = np.arctan2(dv_fin, du_fin)
    ray_wave = 0.5 + 0.5 * np.sin(ang * 165.0)
    pect_rays = pectoral_768 * (0.5 + 0.5 * np.sin((v - 0.55) * 240.0 + u * 45.0))
    fins_h = fin_ray_amp * (fin_mask * ray_wave + 0.85 * pect_rays)

    # Head anatomical normal features
    cornea_dome_h = np.where(
        r_eye < 1.0,
        1.15 * (np.maximum(0.0, np.cos(np.minimum(r_eye, 1.0) * math.pi * 0.5)) ** 1.15),
        0.0,
    )
    cornea_socket_h = -0.30 * orbital_ring
    head_h = cornea_dome_h + cornea_socket_h + 0.45 * gill_plate - 0.75 * gill_slit + 0.42 * mouth_lips - 0.65 * mouth_cleft

    total_h = np.nan_to_num(scales_h + lat_groove + fins_h + head_h, nan=0.0, posinf=0.0, neginf=0.0)
    dh_du = (np.roll(total_h, -1, axis=1) - np.roll(total_h, 1, axis=1)) * 0.5
    dh_dv = (np.roll(total_h, -1, axis=0) - np.roll(total_h, 1, axis=0)) * 0.5

    # UV orientation match: +dh_du tilts X left, -dh_dv points Y up in glTF tangent frame
    n_strength = 2.05
    nx = -dh_du * n_strength
    ny = dh_dv * n_strength
    nz = np.ones_like(nx)
    n_len = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx /= n_len
    ny /= n_len
    nz /= n_len
    normal_rgba = np.stack([nx * 0.5 + 0.5, ny * 0.5 + 0.5, nz * 0.5 + 0.5, np.ones_like(nx)], axis=-1)

    # 3. Packed 768x768 ORM (R=AO, G=Roughness, B=Metallic)
    ao = np.clip(
        np.nan_to_num(
            1.0 - 0.34 * gill_slit - 0.32 * mouth_cleft - 0.22 * orbital_ring - 0.06 * trunk_scale_mask * (1.0 - imbrication),
            nan=1.0,
        ),
        0.45,
        1.0,
    )
    rough = (
        0.27
        + 0.13 * fin_mask
        + 0.32 * np.maximum(gill_slit, mouth_cleft)
        + 0.06 * orbital_ring
        - 0.03 * trunk_scale_mask * imbrication
    )
    rough = rough * (1.0 - cornea_mask) + 0.035 * cornea_mask
    rough = np.clip(np.nan_to_num(rough, nan=0.35), 0.03, 0.85)

    flank_met = float(body.get("flank_metallic", 0.08))
    metallic = np.clip(
        np.nan_to_num(
            flank_met * np.maximum(body_mask * (1.0 - cornea_mask), gill_plate * 0.85) * (1.0 - np.maximum(gill_slit, mouth_cleft)),
            nan=0.0,
        ),
        0.0,
        0.35,
    )
    orm_rgba = np.stack([ao, rough, metallic, np.ones_like(ao)], axis=-1)
    for arr in (base_out, normal_rgba, orm_rgba):
        if np.isnan(arr).any():
            raise RuntimeError(f"Generated NaN pixels in {species_id} texture map")

    tex_dir.mkdir(parents=True, exist_ok=True)
    base_path = tex_dir / f"{species_id}-basecolor.png"
    norm_path = tex_dir / f"{species_id}-normal.png"
    orm_path = tex_dir / f"{species_id}-orm.png"

    _write_png_rgb(base_path, base_out)
    _write_png_rgb(norm_path, normal_rgba)
    _write_png_rgb(orm_path, orm_rgba)
    return base_path, norm_path, orm_path


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag)
    crc = zlib.crc32(data, crc) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def _write_png_rgb(filepath: Path, topdown_rgba: np.ndarray) -> None:
    """Write a compact 24-bit RGB PNG using row Sub filtering and zlib level 9."""
    h, w, _ = topdown_rgba.shape
    rgb = np.clip(np.round(topdown_rgba[:, :, :3] * 255.0), 0, 255).astype(np.uint8)
    sub = np.empty_like(rgb)
    sub[:, 0, :] = rgb[:, 0, :]
    sub[:, 1:, :] = (rgb[:, 1:, :].astype(np.int16) - rgb[:, :-1, :].astype(np.int16)) & 0xFF
    rows = np.concatenate([np.ones((h, 1), dtype=np.uint8), sub.reshape(h, w * 3)], axis=1)
    idat = zlib.compress(rows.tobytes(), level=9)
    ihdr = struct.pack(">2I5B", w, h, 8, 2, 0, 0, 0)
    png_bytes = b"\x89PNG\r\n\x1a\n" + _png_chunk(b"IHDR", ihdr) + _png_chunk(b"IDAT", idat) + _png_chunk(b"IEND", b"")
    filepath.write_bytes(png_bytes)


def _wire_packed_material(mesh_obj: bpy.types.Object, base_path: Path, norm_path: Path, orm_path: Path) -> None:
    mat = mesh_obj.data.materials[0] if mesh_obj.data.materials else bpy.data.materials.new(f"{mesh_obj.name}_Mat")
    if not mesh_obj.data.materials:
        mesh_obj.data.materials.append(mat)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (450, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (120, 0)
    bsdf.inputs["IOR"].default_value = 1.38
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.55

    # glTF Material Output so Occlusion from ORM.R survives Blender -> GLB export
    gltf_group = nt.nodes.new("ShaderNodeGroup")
    if "glTF Material Output" not in bpy.data.node_groups:
        ng = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        ng.interface.new_socket(name="Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    gltf_group.node_tree = bpy.data.node_groups["glTF Material Output"]
    gltf_group.location = (450, -240)

    tex_base = nt.nodes.new("ShaderNodeTexImage")
    tex_base.image = bpy.data.images.load(str(base_path), check_existing=False)
    tex_base.image.colorspace_settings.name = "sRGB"
    tex_base.location = (-450, 260)

    tex_norm = nt.nodes.new("ShaderNodeTexImage")
    tex_norm.image = bpy.data.images.load(str(norm_path), check_existing=False)
    tex_norm.image.colorspace_settings.name = "Non-Color"
    tex_norm.location = (-450, -30)
    norm_map = nt.nodes.new("ShaderNodeNormalMap")
    norm_map.inputs["Strength"].default_value = 0.65
    norm_map.location = (-140, -50)

    tex_orm = nt.nodes.new("ShaderNodeTexImage")
    tex_orm.image = bpy.data.images.load(str(orm_path), check_existing=False)
    tex_orm.image.colorspace_settings.name = "Non-Color"
    tex_orm.location = (-450, -320)
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    sep.location = (-160, -300)

    nt.links.new(tex_base.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex_norm.outputs["Color"], norm_map.inputs["Color"])
    nt.links.new(norm_map.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(tex_orm.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    nt.links.new(sep.outputs["Red"], gltf_group.inputs["Occlusion"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    # Prune unlinked leftover images before pack_all
    used_imgs = {tex_base.image, tex_norm.image, tex_orm.image}
    for im in list(bpy.data.images):
        if im not in used_imgs and im.name not in {"Render Result", "Viewer Node"}:
            bpy.data.images.remove(im, do_unlink=True)
    bpy.ops.file.pack_all()


def _render_studio_inspection(species_id: str, mesh_obj: bpy.types.Object) -> tuple[str, str]:
    """Render side profile and close-up head 3/4 Cycles verification images into scratch/."""
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 640
    scene.render.resolution_y = 480
    scene.render.image_settings.file_format = "PNG"

    world = bpy.data.worlds.new("Fish_Studio_World")
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.04, 0.08, 0.13, 1.0)
    bg.inputs[1].default_value = 0.85

    for name, pos, energy, size in [
        ("StudioKey", (1.8, -1.3, 1.1), 42.0, 1.4),
        ("StudioCatch", (1.6, -1.6, 0.55), 24.0, 0.45),
        ("StudioFill", (-1.5, -0.6, 0.4), 14.0, 2.0),
        ("StudioRim", (0.2, 1.7, 1.2), 30.0, 1.2),
    ]:
        ldata = bpy.data.lights.new(name, "AREA")
        ldata.energy = energy
        ldata.shape = "DISK"
        ldata.size = size
        lobj = bpy.data.objects.new(name, ldata)
        bpy.context.collection.objects.link(lobj)
        lobj.location = pos
        lobj.rotation_euler = (Vector((0.0, -0.25, 0.05)) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()

    cam_data = bpy.data.cameras.new("StudioCam")
    cam_data.lens = 58.0
    cam = bpy.data.objects.new("StudioCam", cam_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam

    # 1. Right flank full profile (frames full 2.0m fish nose-to-tail + dorsal/ventral fins)
    profile_path = SCRATCH_DIR / f"aq91-{species_id}-profile.png"
    cam_data.lens = 52.0
    cam.location = (3.45, 0.0, 0.02)
    cam.rotation_euler = (Vector((0.0, 0.0, 0.02)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(profile_path)
    bpy.ops.render.render(write_still=True)

    # 2. Macro 3/4 head close-up focused on cornea, operculum & mouth relief
    head_path = SCRATCH_DIR / f"aq91-{species_id}-head-closeup.png"
    cam_data.lens = 64.0
    cam.location = (1.18, -0.78, 0.08)
    cam.rotation_euler = (Vector((0.04, -0.66, 0.02)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(head_path)
    bpy.ops.render.render(write_still=True)

    return str(profile_path), str(head_path)


def sculpt_and_export_fish_species(spec: dict) -> dict:
    """Run the full import -> sculpt -> 768 PBR -> .blend -> .glb override -> Cycles inspection pipeline."""
    species_id = spec["id"]
    clear_scene()

    source_glb = SPLAT_FISH_DIR / f"{species_id}.glb"
    if not source_glb.exists():
        raise FileNotFoundError(f"Missing canonical fish asset: {source_glb}")
    bpy.ops.import_scene.gltf(filepath=str(source_glb))

    mesh_obj = next(
        (o for o in bpy.data.objects if o.type == "MESH" and "spine_0" in o.vertex_groups),
        None,
    )
    if mesh_obj is None:
        raise RuntimeError(f"Could not find rigged fish mesh in {source_glb}")
    armature_obj = mesh_obj.parent if mesh_obj.parent and mesh_obj.parent.type == "ARMATURE" else next(
        (o for o in bpy.data.objects if o.type == "ARMATURE"),
        None,
    )
    if armature_obj is None:
        raise RuntimeError(f"Could not find fish armature in {source_glb}")

    # Remove auxiliary bone custom-shape objects imported by glTF
    for obj in list(bpy.data.objects):
        if obj not in (mesh_obj, armature_obj):
            bpy.data.objects.remove(obj, do_unlink=True)

    mesh = mesh_obj.data
    uv_layer = mesh.uv_layers.active
    n_verts = len(mesh.vertices)

    # Per-vertex average (u, v_top)
    u_sums = [0.0] * n_verts
    vt_sums = [0.0] * n_verts
    counts = [0] * n_verts
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            vi = mesh.loops[li].vertex_index
            uv = uv_layer.data[li].uv
            u_sums[vi] += float(uv[0])
            vt_sums[vi] += 1.0 - float(uv[1])
            counts[vi] += 1
    v_uvs = [
        (u_sums[i] / counts[i], vt_sums[i] / counts[i]) if counts[i] else (0.5, 0.5)
        for i in range(n_verts)
    ]

    # Pectoral fin exclusion mask (weights on pectoral_L / pectoral_R > 0.25)
    pect_group_indices = {
        vg.index for vg in mesh_obj.vertex_groups if vg.name in ("pectoral_L", "pectoral_R")
    }
    is_pectoral = [False] * n_verts
    for vi, v in enumerate(mesh.vertices):
        w_pect = sum(g.weight for g in v.groups if g.group in pect_group_indices)
        if w_pect > 0.05:
            is_pectoral[vi] = True

    base_img = _find_base_color_image(mesh_obj)
    bw, bh = int(base_img.size[0]), int(base_img.size[1])
    raw_base_gl = np.array(base_img.pixels[:], dtype=np.float32).reshape(bh, bw, 4)
    raw_base_topdown = np.flipud(raw_base_gl)

    u_eye0 = float(spec["eye"]["u"])
    v_eye0 = float(spec["eye"]["v"])
    ru = float(spec["eye"]["ru"])
    rv = float(spec["eye"]["rv"])
    if spec["eye"].get("auto_snap_pupil", True):
        u_eye, v_eye = _auto_snap_pupil_uv(raw_base_topdown, u_eye0, v_eye0, ru, rv)
    else:
        u_eye, v_eye = u_eye0, v_eye0

    _sculpt_head_geometry(mesh, v_uvs, is_pectoral, u_eye, v_eye, spec)

    # Validate geometry integrity & budget
    mesh.calc_loop_triangles()
    tri_count = len(mesh.loop_triangles)
    if tri_count > 24000:
        raise RuntimeError(f"{species_id} triangle count {tri_count} exceeds 24,000 cap")
    for v in mesh.vertices:
        if any(not math.isfinite(c) for c in v.co):
            raise RuntimeError(f"Non-finite vertex coordinate on {species_id}")
    zero_area = sum(1 for t in mesh.loop_triangles if t.area <= 1e-10)
    if zero_area:
        raise RuntimeError(f"Found {zero_area} degenerate triangles on {species_id}")

    # Upsample BaseColor smoothly to tex_size (default 512x512)
    tex_res = int(spec["body"].get("tex_size", 512))
    upscaled = base_img.copy()
    upscaled.scale(tex_res, tex_res)
    base_rgba_768 = np.flipud(np.array(upscaled.pixels[:], dtype=np.float32).reshape(tex_res, tex_res, 4))
    bpy.data.images.remove(upscaled, do_unlink=True)

    thick_192, pect_192 = _rasterize_flank_thickness_and_pectoral(mesh, v_uvs, is_pectoral, res=192)
    thickness_768 = _upsample_bilinear(thick_192, tex_res)
    pectoral_768 = _upsample_bilinear(pect_192, tex_res)

    tex_dir = BLEND_DIR / f"{species_id}-textures"
    base_path, norm_path, orm_path = _generate_768_pbr_maps(
        species_id, tex_dir, base_rgba_768, thickness_768, pectoral_768, u_eye, v_eye, spec
    )
    _wire_packed_material(mesh_obj, base_path, norm_path, orm_path)

    BLEND_DIR.mkdir(parents=True, exist_ok=True)
    OVERRIDES_DIR.mkdir(parents=True, exist_ok=True)
    blend_path = BLEND_DIR / f"{species_id}.blend"
    override_path = OVERRIDES_DIR / f"{species_id}.glb"

    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), compress=False)

    for o in bpy.context.selected_objects:
        o.select_set(False)
    armature_obj.select_set(True)
    mesh_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj

    bpy.ops.export_scene.gltf(
        filepath=str(override_path),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_skins=True,
        export_animations=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_vertex_color="NONE",
        export_attributes=False,
    )

    xs = [v.co.x for v in mesh.vertices]
    ys = [v.co.y for v in mesh.vertices]
    zs = [v.co.z for v in mesh.vertices]
    profile_png, head_png = _render_studio_inspection(species_id, mesh_obj)

    summary = {
        "id": species_id,
        "triangles": tri_count,
        "vertices": n_verts,
        "initial_eye_uv": [round(u_eye0, 4), round(v_eye0, 4)],
        "snapped_eye_uv": [round(u_eye, 4), round(v_eye, 4)],
        "bounds_blender": {
            "x": [round(min(xs), 4), round(max(xs), 4)],
            "y": [round(min(ys), 4), round(max(ys), 4)],
            "z": [round(min(zs), 4), round(max(zs), 4)],
        },
        "override_bytes": override_path.stat().st_size,
        "renders": [profile_png, head_png],
    }
    print(f"AQ91_FISH_SCULPTED {species_id} {json.dumps(summary)}", flush=True)
    return summary
