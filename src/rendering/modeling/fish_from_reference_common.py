"""Shared standalone reference-to-Blender watertight fish builder (`AQ-91` / `AQ-70.9`).

Generates original $0, watertight, bilaterally symmetric 3D fusiform fish meshes with
separate paired 3D pectoral fins, an 8-joint `spine_0..spine_5` + `pectoral_L/R`
armature, seamless 48-frame quaternion swim clip, anatomical 3D cornea/operculum/mouth
sculpting, and 512x512 24-bit RGB PBR maps (BaseColor, Normal, packed ORM).
Saves uncompressed packed `.blend`, exports `.glb` override, and renders studio Cycles
inspection images to `SCRATCH_DIR`.
"""
from collections import deque
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Euler, Quaternion, Vector

MODELING_DIR = str(Path(__file__).resolve().parent)
if MODELING_DIR not in sys.path:
    sys.path.insert(0, MODELING_DIR)

from fish_head_sculpt_common import (  # noqa: E402
    BLEND_DIR,
    OVERRIDES_DIR,
    REPO_ROOT,
    _auto_snap_pupil_uv,
    _generate_768_pbr_maps,
    _rasterize_flank_thickness_and_pectoral,
    _render_studio_inspection,
    _sculpt_head_geometry,
    _upsample_bilinear,
    _wire_packed_material,
    clear_scene,
)

SPINE_Z = [1.0, 0.48, 0.12, -0.23, -0.55, -0.78]


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return lo if x < lo else (hi if x > hi else x)


def _smoothstep(edge0: float, edge1: float, x: float) -> float:
    t = _clamp((x - edge0) / (edge1 - edge0)) if edge1 != edge0 else (1.0 if x >= edge1 else 0.0)
    return t * t * (3.0 - 2.0 * t)


def load_webp_topdown_rgba(rel_path: str) -> np.ndarray:
    """Load a project-relative RGBA image into a top-down `(H, W, 4)` float32 array in `[0, 1]`."""
    abs_path = REPO_ROOT / rel_path
    if not abs_path.exists():
        raise FileNotFoundError(f"Missing reference image: {abs_path}")
    img = bpy.data.images.load(str(abs_path), check_existing=False)
    try:
        w, h = int(img.size[0]), int(img.size[1])
        rgba = np.flipud(np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)).copy()
        return rgba
    finally:
        bpy.data.images.remove(img, do_unlink=True)


def _largest_4connected_component(mask: np.ndarray) -> np.ndarray:
    """Keep only the largest 4-connected foreground component to remove stray edge pixels."""
    h, w = mask.shape
    visited = np.zeros((h, w), dtype=bool)
    best_comp: list[tuple[int, int]] = []
    ys, xs = np.where(mask)
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if visited[sy, sx]:
            continue
        q: deque[tuple[int, int]] = deque([(sy, sx)])
        visited[sy, sx] = True
        comp: list[tuple[int, int]] = []
        while q:
            cy, cx = q.popleft()
            comp.append((cy, cx))
            if cy > 0 and mask[cy - 1, cx] and not visited[cy - 1, cx]:
                visited[cy - 1, cx] = True
                q.append((cy - 1, cx))
            if cy + 1 < h and mask[cy + 1, cx] and not visited[cy + 1, cx]:
                visited[cy + 1, cx] = True
                q.append((cy + 1, cx))
            if cx > 0 and mask[cy, cx - 1] and not visited[cy, cx - 1]:
                visited[cy, cx - 1] = True
                q.append((cy, cx - 1))
            if cx + 1 < w and mask[cy, cx + 1] and not visited[cy, cx + 1]:
                visited[cy, cx + 1] = True
                q.append((cy, cx + 1))
        if len(comp) > len(best_comp):
            best_comp = comp

    out = np.zeros((h, w), dtype=bool)
    if best_comp:
        arr_y, arr_x = zip(*best_comp)
        out[np.array(arr_y), np.array(arr_x)] = True
    return out


def _chamfer_distance_transform(seed_mask: np.ndarray, max_iters: int = 44) -> np.ndarray:
    """Fast vectorized 8-neighbor Chamfer distance (0 on `seed_mask`, positive away from it)."""
    h, w = seed_mask.shape
    inf = float(max_iters + 10)
    dist = np.where(seed_mask, 0.0, inf).astype(np.float32)
    sqrt2 = np.float32(1.41421356)
    one = np.float32(1.0)

    pad = np.empty((h + 2, w + 2), dtype=np.float32)
    for _ in range(max_iters):
        pad.fill(inf)
        pad[1:-1, 1:-1] = dist
        d_new = np.minimum(dist, pad[:-2, 1:-1] + one)
        d_new = np.minimum(d_new, pad[2:, 1:-1] + one)
        d_new = np.minimum(d_new, pad[1:-1, :-2] + one)
        d_new = np.minimum(d_new, pad[1:-1, 2:] + one)
        d_new = np.minimum(d_new, pad[:-2, :-2] + sqrt2)
        d_new = np.minimum(d_new, pad[:-2, 2:] + sqrt2)
        d_new = np.minimum(d_new, pad[2:, :-2] + sqrt2)
        d_new = np.minimum(d_new, pad[2:, 2:] + sqrt2)
        if np.array_equal(d_new, dist):
            break
        dist = d_new
    return dist


def _dilate_interior_rgb(topdown_rgba: np.ndarray, dist_in: np.ndarray, min_core_dist: float = 2.4) -> np.ndarray:
    """Propagate clean interior RGB outward across the entire canvas to prevent boundary halos."""
    h, w, _ = topdown_rgba.shape
    core = (topdown_rgba[:, :, 3] > 0.75) & (dist_in >= min_core_dist)
    if not np.any(core):
        core = topdown_rgba[:, :, 3] > 0.45

    rgb = topdown_rgba[:, :, :3].copy()
    filled = core.copy()

    # 8-neighbor smooth expansion near silhouette (~30 px) for smooth edge colors
    for _ in range(32):
        if np.all(filled):
            break
        frontier = ~filled
        sum_rgb = np.zeros_like(rgb)
        cnt = np.zeros((h, w), dtype=np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                ys0, ys1 = max(0, -dy), h - max(0, dy)
                xs0, xs1 = max(0, -dx), w - max(0, dx)
                yd0, yd1 = max(0, dy), h - max(0, -dy)
                xd0, xd1 = max(0, dx), w - max(0, -dx)
                m = filled[ys0:ys1, xs0:xs1]
                sum_rgb[yd0:yd1, xd0:xd1] += rgb[ys0:ys1, xs0:xs1] * m[:, :, None]
                cnt[yd0:yd1, xd0:xd1] += m.astype(np.float32)
        upd = frontier & (cnt > 0.0)
        if not np.any(upd):
            break
        rgb[upd] = sum_rgb[upd] / cnt[upd, None]
        filled |= upd

    # Fast 4-pass nearest sweep guarantees every pixel across the entire sheet has valid color
    for y in range(1, h):
        upd = (~filled[y]) & filled[y - 1]
        if np.any(upd):
            rgb[y, upd] = rgb[y - 1, upd]
            filled[y, upd] = True
    for y in range(h - 2, -1, -1):
        upd = (~filled[y]) & filled[y + 1]
        if np.any(upd):
            rgb[y, upd] = rgb[y + 1, upd]
            filled[y, upd] = True
    for x in range(1, w):
        upd = (~filled[:, x]) & filled[:, x - 1]
        if np.any(upd):
            rgb[upd, x] = rgb[upd, x - 1]
            filled[upd, x] = True
    for x in range(w - 2, -1, -1):
        upd = (~filled[:, x]) & filled[:, x + 1]
        if np.any(upd):
            rgb[upd, x] = rgb[upd, x + 1]
            filled[upd, x] = True

    out = topdown_rgba.copy()
    out[:, :, :3] = np.clip(rgb, 0.0, 1.0)
    out[:, :, 3] = 1.0
    return out


def _bilinear_sample(arr: np.ndarray, u: float, v: float) -> float:
    h, w = arr.shape
    fx = _clamp(u * (w - 1), 0.0, float(w - 1))
    fy = _clamp(v * (h - 1), 0.0, float(h - 1))
    x0 = int(math.floor(fx))
    y0 = int(math.floor(fy))
    x1 = min(w - 1, x0 + 1)
    y1 = min(h - 1, y0 + 1)
    tx = fx - x0
    ty = fy - y0
    v0 = arr[y0, x0] * (1.0 - tx) + arr[y0, x1] * tx
    v1 = arr[y1, x0] * (1.0 - tx) + arr[y1, x1] * tx
    return float(v0 * (1.0 - ty) + v1 * ty)


def _compute_vertical_profile_spans(fg_mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Compute smoothed `(v_top[x], v_bot[x])` fractions per column for the dorsoventral arch."""
    h, w = fg_mask.shape
    v_top = np.full(w, 0.35, dtype=np.float32)
    v_bot = np.full(w, 0.65, dtype=np.float32)
    valid = np.zeros(w, dtype=bool)
    for x in range(w):
        ys = np.where(fg_mask[:, x])[0]
        if len(ys) >= 4:
            v_top[x] = (ys[0] + 0.5) / h
            v_bot[x] = (ys[-1] + 0.5) / h
            valid[x] = True

    xs = np.where(valid)[0]
    if len(xs) > 0:
        first_x, last_x = int(xs[0]), int(xs[-1])
        v_top[:first_x] = v_top[first_x]
        v_bot[:first_x] = v_bot[first_x]
        v_top[last_x + 1 :] = v_top[last_x]
        v_bot[last_x + 1 :] = v_bot[last_x]

    # Wide Gaussian smoothing along X so pelvic/anal fin notches never crease the flank convexity
    rad = min(40, max(6, w // 14))
    gx = np.arange(-rad, rad + 1, dtype=np.float32)
    kernel = np.exp(-0.5 * (gx / max(4.0, rad * 0.42)) ** 2)
    kernel /= np.sum(kernel)
    v_top_s = np.convolve(np.pad(v_top, rad, mode="edge"), kernel, mode="valid")
    v_bot_s = np.convolve(np.pad(v_bot, rad, mode="edge"), kernel, mode="valid")
    return v_top_s, np.maximum(v_bot_s, v_top_s + 0.08)


def _eval_fusiform_longitudinal(s: float) -> float:
    """Hydrodynamic teleost longitudinal half-width factor in `[0, 1]` from tail `0` to snout `1`."""
    if s <= 0.18:
        u_tail = _clamp(s / 0.18)
        return 0.025 + 0.115 * _smoothstep(0.0, 1.0, math.pow(u_tail, 1.25))
    if s <= 0.74:
        u_trunk = (s - 0.18) / 0.56
        teardrop = math.pow(max(0.0, math.sin(u_trunk * math.pi * 0.5)), 0.78)
        return 0.14 + 0.86 * teardrop
    u_head = _clamp((1.0 - s) / 0.26)
    ogive = math.pow(max(0.0, math.sin(u_head * math.pi * 0.5)), 0.62)
    return 0.16 + 0.84 * ogive


def _clean_quad_grid_to_manifold_component(kept: np.ndarray) -> np.ndarray:
    """Keep largest 4-connected cell component and remove diagonal vertex pinches."""
    nz, ny = kept.shape
    visited = np.zeros((nz, ny), dtype=bool)
    best: list[tuple[int, int]] = []
    for iz in range(nz):
        for iy in range(ny):
            if not kept[iz, iy] or visited[iz, iy]:
                continue
            q: deque[tuple[int, int]] = deque([(iz, iy)])
            visited[iz, iy] = True
            comp: list[tuple[int, int]] = []
            while q:
                cz, cy = q.popleft()
                comp.append((cz, cy))
                for dz, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nz2, ny2 = cz + dz, cy + dy
                    if 0 <= nz2 < nz and 0 <= ny2 < ny and kept[nz2, ny2] and not visited[nz2, ny2]:
                        visited[nz2, ny2] = True
                        q.append((nz2, ny2))
            if len(comp) > len(best):
                best = comp

    out = np.zeros((nz, ny), dtype=bool)
    for cz, cy in best:
        out[cz, cy] = True

    # Bridge diagonal checkerboards (prevents non-manifold boundary pinch vertices)
    for _ in range(3):
        changed = False
        for iz in range(nz - 1):
            for iy in range(ny - 1):
                c00, c10 = out[iz, iy], out[iz + 1, iy]
                c01, c11 = out[iz, iy + 1], out[iz + 1, iy + 1]
                if c00 and c11 and not c10 and not c01:
                    out[iz + 1, iy] = True
                    changed = True
                elif c10 and c01 and not c00 and not c11:
                    out[iz, iy] = True
                    changed = True
        if not changed:
            break
    return out


def _compute_spine_skinning(z_gltf: float) -> tuple[list[int], list[float]]:
    if z_gltf >= SPINE_Z[0]:
        return [0, 1, 0, 0], [1.0, 0.0, 0.0, 0.0]
    for i in range(len(SPINE_Z) - 1):
        z_hi, z_lo = SPINE_Z[i], SPINE_Z[i + 1]
        if z_lo <= z_gltf <= z_hi:
            t = (z_hi - z_gltf) / (z_hi - z_lo)
            s = t * t * (3.0 - 2.0 * t)
            return [i, i + 1, 0, 0], [1.0 - s, s, 0.0, 0.0]
    return [5, 4, 0, 0], [1.0, 0.0, 0.0, 0.0]


def _build_body_shell_data(
    fg_mask: np.ndarray,
    sdf: np.ndarray,
    dist_in: np.ndarray,
    shape_spec: dict,
) -> dict:
    """Build smoothed watertight bilateral fish shell vertices, faces, UVs, and edge flags."""
    h, w = fg_mask.shape
    ys_fg, xs_fg = np.where(fg_mask)
    u0_raw = float(xs_fg.min()) / w
    u1_raw = float(xs_fg.max() + 1) / w
    v0_raw = float(ys_fg.min()) / h
    v1_raw = float(ys_fg.max() + 1) / h

    grid_nz = int(shape_spec.get("grid_nz", 104))
    grid_ny = int(shape_spec.get("grid_ny", 64))
    du_cell = (u1_raw - u0_raw) / max(1, grid_nz - 2)
    dv_cell = (v1_raw - v0_raw) / max(1, grid_ny - 2)
    u_min_g = max(0.002, u0_raw - du_cell * 1.2)
    u_max_g = min(0.998, u1_raw + du_cell * 1.2)
    v_min_g = max(0.002, v0_raw - dv_cell * 1.2)
    v_max_g = min(0.998, v1_raw + dv_cell * 1.2)

    u_grid = np.linspace(u_min_g, u_max_g, grid_nz + 1)
    v_grid = np.linspace(v_min_g, v_max_g, grid_ny + 1)

    kept = np.zeros((grid_nz, grid_ny), dtype=bool)
    for iz in range(grid_nz):
        u_mid = 0.5 * (u_grid[iz] + u_grid[iz + 1])
        for iy in range(grid_ny):
            v_mid = 0.5 * (v_grid[iy] + v_grid[iy + 1])
            if _bilinear_sample(sdf, float(u_mid), float(v_mid)) > -0.15:
                kept[iz, iy] = True
    kept = _clean_quad_grid_to_manifold_component(kept)

    # Identify all vertices used by kept quads and classify boundary vertices
    vert_quad_count = np.zeros((grid_nz + 1, grid_ny + 1), dtype=np.int32)
    for iz in range(grid_nz):
        for iy in range(grid_ny):
            if kept[iz, iy]:
                vert_quad_count[iz : iz + 2, iy : iy + 2] += 1

    uv_pts = np.zeros((grid_nz + 1, grid_ny + 1, 2), dtype=np.float64)
    for iz in range(grid_nz + 1):
        uv_pts[iz, :, 0] = u_grid[iz]
    for iy in range(grid_ny + 1):
        uv_pts[:, iy, 1] = v_grid[iy]

    is_boundary_grid = (vert_quad_count > 0) & (vert_quad_count < 4)

    # Extract ordered boundary edges along outer silhouette perimeter
    boundary_edges: list[tuple[tuple[int, int], tuple[int, int]]] = []
    for iz in range(grid_nz):
        for iy in range(grid_ny):
            if not kept[iz, iy]:
                continue
            # Bottom (-v), Right (+u), Top (+v), Left (-u) edges oriented CCW around kept quad in (iz, iy)
            if iy == 0 or not kept[iz, iy - 1]:
                boundary_edges.append(((iz, iy), (iz + 1, iy)))
            if iz == grid_nz - 1 or not kept[iz + 1, iy]:
                boundary_edges.append(((iz + 1, iy), (iz + 1, iy + 1)))
            if iy == grid_ny - 1 or not kept[iz, iy + 1]:
                boundary_edges.append(((iz + 1, iy + 1), (iz, iy + 1)))
            if iz == 0 or not kept[iz - 1, iy]:
                boundary_edges.append(((iz, iy + 1), (iz, iy)))

    # Snap boundary vertices onto SDF=0 iso-contour & apply subtle contour smoothing
    eps_u = max(1e-4, 0.75 / w)
    eps_v = max(1e-4, 0.75 / h)
    du_max = (u_max_g - u_min_g) / grid_nz
    dv_max = (v_max_g - v_min_g) / grid_ny
    max_shift_u = 0.60 * du_max
    max_shift_v = 0.60 * dv_max

    bnd_indices = np.argwhere(is_boundary_grid)
    for iz, iy in bnd_indices.tolist():
        cu, cv = float(uv_pts[iz, iy, 0]), float(uv_pts[iz, iy, 1])
        u_orig, v_orig = cu, cv
        for _step in range(3):
            s_val = _bilinear_sample(sdf, cu, cv)
            gsx = (_bilinear_sample(sdf, cu + eps_u, cv) - _bilinear_sample(sdf, cu - eps_u, cv)) / (2.0 * eps_u * w)
            gsy = (_bilinear_sample(sdf, cu, cv + eps_v) - _bilinear_sample(sdf, cu, cv - eps_v)) / (2.0 * eps_v * h)
            g_norm2 = gsx * gsx + gsy * gsy
            if g_norm2 < 1e-6:
                break
            du_step = (-s_val * gsx / g_norm2) / w
            dv_step = (-s_val * gsy / g_norm2) / h
            cu = _clamp(cu + du_step, max(0.001, u_orig - max_shift_u), min(0.999, u_orig + max_shift_u))
            cv = _clamp(cv + dv_step, max(0.001, v_orig - max_shift_v), min(0.999, v_orig + max_shift_v))
        uv_pts[iz, iy, 0] = cu
        uv_pts[iz, iy, 1] = cv

    # Smooth boundary vertices along silhouette adjacency to eliminate staircase corners
    bnd_adj: dict[tuple[int, int], list[tuple[int, int]]] = {}
    for a, b in boundary_edges:
        bnd_adj.setdefault(a, []).append(b)
        bnd_adj.setdefault(b, []).append(a)
    for _pass in range(2):
        new_pos: dict[tuple[int, int], tuple[float, float]] = {}
        for node, nbs in bnd_adj.items():
            if len(nbs) != 2:
                continue
            p = uv_pts[node[0], node[1]]
            n0 = uv_pts[nbs[0][0], nbs[0][1]]
            n1 = uv_pts[nbs[1][0], nbs[1][1]]
            new_pos[node] = (
                float(0.56 * p[0] + 0.22 * (n0[0] + n1[0])),
                float(0.56 * p[1] + 0.22 * (n0[1] + n1[1])),
            )
        for node, (nu, nv) in new_pos.items():
            uv_pts[node[0], node[1], 0] = nu
            uv_pts[node[0], node[1], 1] = nv

    # Exact snapped mesh UV span for normalization -> glTF z in [-1.0, +1.0]
    used_mask = vert_quad_count > 0
    used_us = uv_pts[used_mask, 0]
    used_vs = uv_pts[used_mask, 1]
    u_mesh_min, u_mesh_max = float(used_us.min()), float(used_us.max())
    v_mesh_min, v_mesh_max = float(used_vs.min()), float(used_vs.max())
    aspect_px = (w * (u_mesh_max - u_mesh_min)) / max(1e-6, h * (v_mesh_max - v_mesh_min))

    v_top_col, v_bot_col = _compute_vertical_profile_spans(fg_mask)
    max_half_w = float(shape_spec.get("max_half_w", 0.145))
    fin_fade_px = float(shape_spec.get("fin_fade_px", 24.0))
    scalpel = shape_spec.get("caudal_scalpel")

    # Assign dense vertex indices for +X flank and -X flank
    pos_idx_map: dict[tuple[int, int], int] = {}
    neg_idx_map: dict[tuple[int, int], int] = {}
    verts: list[tuple[float, float, float]] = []
    v_uvs: list[tuple[float, float]] = []
    is_boundary_v: list[bool] = []

    used_coords = np.argwhere(used_mask)
    for iz, iy in used_coords.tolist():
        cu = float(uv_pts[iz, iy, 0])
        cv = float(uv_pts[iz, iy, 1])
        is_bnd = bool(is_boundary_grid[iz, iy])

        s_long = _clamp((cu - u_mesh_min) / max(1e-6, u_mesh_max - u_mesh_min))
        long_env = _eval_fusiform_longitudinal(s_long)

        col_idx = int(_clamp(round(cu * (w - 1)), 0, w - 1))
        vt_c = float(v_top_col[col_idx])
        vb_c = float(v_bot_col[col_idx])
        t_dv = _clamp((cv - vt_c) / max(1e-4, vb_c - vt_c))
        dv_arch = math.pow(max(0.0, math.sin(t_dv * math.pi)), 0.68)

        d_px = max(0.0, _bilinear_sample(dist_in, cu, cv))
        edge_taper = math.pow(_smoothstep(0.0, fin_fade_px, d_px), 0.82)

        scalpel_bump = 0.0
        if scalpel is not None:
            su = float(scalpel["u"])
            sv = float(scalpel["v"])
            sru = float(scalpel["ru"])
            srv = float(scalpel["rv"])
            sh = float(scalpel["height_m"])
            d2 = ((cu - su) / sru) ** 2 + ((cv - sv) / srv) ** 2
            if d2 < 3.5:
                scalpel_bump = sh * math.exp(-2.1 * d2)

        if is_bnd:
            hw = 0.0018
        else:
            hw = max(0.0018, 0.0018 + max_half_w * long_env * dv_arch * edge_taper + scalpel_bump)

        # y_bl in [-1.0 (snout, u_max), +1.0 (tail, u_min)] -> glTF z = -y_bl in [-1.0, +1.0]
        y_bl = 1.0 - 2.0 * s_long
        z_bl = (0.5 - (cv - v_mesh_min) / max(1e-6, v_mesh_max - v_mesh_min)) * (2.0 / aspect_px)

        vi_pos = len(verts)
        verts.append((+hw, y_bl, z_bl))
        v_uvs.append((cu, cv))
        is_boundary_v.append(is_bnd)

        vi_neg = len(verts)
        verts.append((-hw, y_bl, z_bl))
        v_uvs.append((cu, cv))
        is_boundary_v.append(is_bnd)

        pos_idx_map[(iz, iy)] = vi_pos
        neg_idx_map[(iz, iy)] = vi_neg

    faces: list[tuple[int, int, int]] = []
    for iz in range(grid_nz):
        for iy in range(grid_ny):
            if not kept[iz, iy]:
                continue
            p00 = pos_idx_map[(iz, iy)]
            p10 = pos_idx_map[(iz + 1, iy)]
            p11 = pos_idx_map[(iz + 1, iy + 1)]
            p01 = pos_idx_map[(iz, iy + 1)]
            # +X flank: tangent cross must face +X
            faces.append((p00, p01, p11))
            faces.append((p00, p11, p10))

            n00 = neg_idx_map[(iz, iy)]
            n10 = neg_idx_map[(iz + 1, iy)]
            n11 = neg_idx_map[(iz + 1, iy + 1)]
            n01 = neg_idx_map[(iz, iy + 1)]
            # -X flank: opposite winding faces -X
            faces.append((n00, n11, n01))
            faces.append((n00, n10, n11))

    # Connect boundary loop with watertight rim quads
    for a, b in boundary_edges:
        pa, pb = pos_idx_map[a], pos_idx_map[b]
        na, nb = neg_idx_map[a], neg_idx_map[b]
        faces.append((pa, pb, nb))
        faces.append((pa, nb, na))

    return {
        "verts": verts,
        "faces": faces,
        "v_uvs": v_uvs,
        "is_boundary_v": is_boundary_v,
        "u_mesh_min": u_mesh_min,
        "u_mesh_max": u_mesh_max,
        "v_mesh_min": v_mesh_min,
        "v_mesh_max": v_mesh_max,
        "aspect_px": aspect_px,
    }


def _append_pectoral_fins(
    verts: list[tuple[float, float, float]],
    faces: list[tuple[int, int, int]],
    v_uvs: list[tuple[float, float]],
    body_verts: list[tuple[float, float, float]],
    pect_spec: dict,
) -> list[int]:
    """Append closed double-sided 3D pectoral fins (left `+X` and right `-X`) matching glTF rig contract.

    Returns vertex labels `0 = body, 1 = pectoral_L, 2 = pectoral_R`.
    """
    labels = [0] * len(body_verts)
    z_root_gltf = float(pect_spec["z_gltf"])
    y_root_bl = -z_root_gltf  # glTF Z -> Blender -Y
    z_root_bl = float(pect_spec["y_gltf"])  # glTF Y -> Blender +Z
    fin_len = float(pect_spec["length"])
    spread_z = float(pect_spec["spread_y"])
    out_x = float(pect_spec["out_x"])
    u0 = float(pect_spec["u0"])
    u1 = float(pect_spec["u1"])
    v0 = float(pect_spec["v0"])
    v1 = float(pect_spec["v1"])

    # Measure local body half-width near pectoral wrist root so fin attaches seamlessly
    root_xs = [
        abs(vx)
        for (vx, vy, vz) in body_verts
        if abs(vy - y_root_bl) < 0.08 and abs(vz - z_root_bl) < 0.08
    ]
    local_hw = max(root_xs) if root_xs else 0.08
    anchor_x = local_hw * 0.80

    def local_flank_clearance_x(qy: float, qz: float) -> float:
        near = [
            abs(vx)
            for (vx, vy, vz) in body_verts
            if abs(vy - qy) < 0.075 and abs(vz - qz) < 0.075
        ]
        return max(near) if near else local_hw

    n_rad = 6
    n_ang = 7

    for side in (1, -1):  # +1 = pectoral_L, -1 = pectoral_R
        side_label = 1 if side > 0 else 2
        outer_grid = [[0] * n_ang for _ in range(n_rad)]
        inner_grid = [[0] * n_ang for _ in range(n_rad)]

        for ir in range(n_rad):
            tr = ir / (n_rad - 1)  # 0 wrist -> 1 fin tip
            # Rounded paddle contour along span with wafer-thin trailing edge
            ang_span = spread_z * (0.28 + 0.72 * math.sin(max(0.08, tr) * math.pi * 0.62))
            half_t = 0.0006 + 0.0011 * (1.0 - tr)
            flare = out_x * math.pow(tr, 0.78) + 0.010 * math.sin(tr * math.pi)
            for ia in range(n_ang):
                ta = ia / (n_ang - 1) - 0.5  # -0.5 top .. +0.5 bottom
                radial_arc = math.cos(ta * 1.45)  # longest near center rays
                y_bl = y_root_bl + fin_len * tr * (0.55 + 0.45 * radial_arc)
                z_bl = z_root_bl - ta * ang_span * (1.0 + 0.30 * tr) - 0.020 * tr
                base_clear = anchor_x + flare
                if tr > 0.12:
                    min_clear = local_flank_clearance_x(y_bl, z_bl) + 0.007 + 0.018 * tr
                    base_clear = max(base_clear, min_clear * (0.35 + 0.65 * _smoothstep(0.12, 0.45, tr)))
                x_center = side * base_clear

                # UV maps wrist near u1 (anterior) to margin near u0 (posterior)
                cu = u1 + (u0 - u1) * tr * (0.65 + 0.35 * radial_arc)
                cv = v0 + (v1 - v0) * (ta + 0.5)

                vo = len(verts)
                verts.append((x_center + side * half_t, y_bl, z_bl))
                v_uvs.append((cu, cv))
                labels.append(side_label)
                outer_grid[ir][ia] = vo

                vi = len(verts)
                verts.append((x_center - side * half_t, y_bl, z_bl))
                v_uvs.append((cu, cv))
                labels.append(side_label)
                inner_grid[ir][ia] = vi

        for ir in range(n_rad - 1):
            for ia in range(n_ang - 1):
                o00 = outer_grid[ir][ia]
                o10 = outer_grid[ir + 1][ia]
                o11 = outer_grid[ir + 1][ia + 1]
                o01 = outer_grid[ir][ia + 1]

                i00 = inner_grid[ir][ia]
                i10 = inner_grid[ir + 1][ia]
                i11 = inner_grid[ir + 1][ia + 1]
                i01 = inner_grid[ir][ia + 1]

                if side > 0:
                    faces.append((o00, o01, o11))
                    faces.append((o00, o11, o10))
                    faces.append((i00, i11, i01))
                    faces.append((i00, i10, i11))
                else:
                    faces.append((o00, o11, o01))
                    faces.append((o00, o10, o11))
                    faces.append((i00, i01, i11))
                    faces.append((i00, i11, i10))

        # Close 4 perimeter edges of fin blade into watertight shell
        loop_edges: list[tuple[int, int, int, int]] = []
        for ia in range(n_ang - 1):
            loop_edges.append((outer_grid[0][ia + 1], outer_grid[0][ia], inner_grid[0][ia], inner_grid[0][ia + 1]))
            loop_edges.append((outer_grid[n_rad - 1][ia], outer_grid[n_rad - 1][ia + 1], inner_grid[n_rad - 1][ia + 1], inner_grid[n_rad - 1][ia]))
        for ir in range(n_rad - 1):
            loop_edges.append((outer_grid[ir][0], outer_grid[ir + 1][0], inner_grid[ir + 1][0], inner_grid[ir][0]))
            loop_edges.append((outer_grid[ir + 1][n_ang - 1], outer_grid[ir][n_ang - 1], inner_grid[ir][n_ang - 1], inner_grid[ir + 1][n_ang - 1]))
        for oa, ob, ib, ia in loop_edges:
            if side > 0:
                faces.append((oa, ob, ib))
                faces.append((oa, ib, ia))
            else:
                faces.append((oa, ib, ob))
                faces.append((oa, ia, ib))

    return labels


def _create_rigged_animated_fish(
    species_id: str,
    mesh_data_dict: dict,
    pect_spec: dict,
    anim_spec: dict,
) -> tuple[bpy.types.Object, bpy.types.Object, list[int]]:
    verts = mesh_data_dict["verts"]
    faces = mesh_data_dict["faces"]
    v_uvs = mesh_data_dict["v_uvs"]

    n_body = len(verts)
    labels = _append_pectoral_fins(verts, faces, v_uvs, verts[:n_body], pect_spec)

    mesh = bpy.data.meshes.new(f"{species_id}_Geo")
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    mesh.uv_layers.active = uv_layer
    for poly in mesh.polygons:
        poly.use_smooth = True
        for li in poly.loop_indices:
            vi = mesh.loops[li].vertex_index
            cu, cv = v_uvs[vi]
            uv_layer.data[li].uv = (cu, 1.0 - cv)
    mesh.update()

    mesh_obj = bpy.data.objects.new(f"{species_id}_Mesh", mesh)
    scene_col = bpy.context.scene.collection
    scene_col.objects.link(mesh_obj)

    # Create 8-bone armature matching canonical splat-fish hierarchy
    arm_data = bpy.data.armatures.new(f"{species_id}_Armature")
    arm_obj = bpy.data.objects.new(f"{species_id}_Root", arm_data)
    scene_col.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")

    spine_y_bl = [-z for z in SPINE_Z]  # [-1.0, -0.48, -0.12, 0.23, 0.55, 0.78]
    spine_tails = spine_y_bl[1:] + [1.01]
    eb_map: dict[str, bpy.types.EditBone] = {}
    for i in range(6):
        eb = arm_data.edit_bones.new(f"spine_{i}")
        eb.head = (0.0, spine_y_bl[i], 0.0)
        eb.tail = (0.0, spine_tails[i], 0.0)
        eb.roll = 0.0
        if i > 0:
            eb.parent = eb_map[f"spine_{i - 1}"]
            eb.use_connect = False
        eb_map[f"spine_{i}"] = eb

    z_root_bl = float(pect_spec["y_gltf"])
    y_root_bl = -float(pect_spec["z_gltf"])
    fin_len = float(pect_spec["length"])
    out_x = float(pect_spec["out_x"])
    root_xs = [
        abs(vx)
        for (vx, vy, vz) in verts[:n_body]
        if abs(vy - y_root_bl) < 0.08 and abs(vz - z_root_bl) < 0.08
    ]
    base_px = (max(root_xs) * 0.72) if root_xs else 0.08
    for name, side in (("pectoral_L", 1.0), ("pectoral_R", -1.0)):
        eb = arm_data.edit_bones.new(name)
        eb.head = (side * base_px, y_root_bl, z_root_bl)
        eb.tail = (side * (base_px + out_x * 0.75 + 0.04), y_root_bl + fin_len * 0.60, z_root_bl)
        eb.align_roll(Vector((0.0, 0.0, 1.0)))
        eb.parent = eb_map["spine_1"]
        eb.use_connect = False
        eb_map[name] = eb

    bpy.ops.object.mode_set(mode="OBJECT")

    # Parent mesh to armature with ARMATURE modifier & smooth skin weights
    mesh_obj.parent = arm_obj
    mod = mesh_obj.modifiers.new(name="Armature", type="ARMATURE")
    mod.object = arm_obj

    bone_names = [f"spine_{i}" for i in range(6)] + ["pectoral_L", "pectoral_R"]
    vg_map = {name: mesh_obj.vertex_groups.new(name=name) for name in bone_names}
    for vi, (vx, vy, _vz) in enumerate(verts):
        lbl = labels[vi]
        if lbl == 1:
            vg_map["pectoral_L"].add([vi], 1.0, "REPLACE")
        elif lbl == 2:
            vg_map["pectoral_R"].add([vi], 1.0, "REPLACE")
        else:
            j_ids, j_ws = _compute_spine_skinning(-vy)
            for j, w in zip(j_ids, j_ws):
                if w > 1e-5:
                    vg_map[f"spine_{j}"].add([vi], w, "ADD")

    # Animate seamless 48-frame quaternion swim loop (`0..48` @ 24 fps)
    scene = bpy.context.scene
    scene.frame_start = 0
    scene.frame_end = 48
    scene.render.fps = 24

    clip_name = str(anim_spec["clip_name"])
    spine_amp_deg = [float(a) for a in anim_spec["spine_amp_deg"]]
    pect_sweep_deg = float(anim_spec.get("pect_sweep_deg", 25.0))
    pect_feather_deg = float(anim_spec.get("pect_feather_deg", 12.0))

    arm_obj.animation_data_create()
    action = bpy.data.actions.new(name=clip_name)
    arm_obj.animation_data.action = action

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="POSE")
    for pb in arm_obj.pose.bones:
        pb.rotation_mode = "QUATERNION"

    phase_lags = [0.0, 0.55, 1.15, 1.85, 2.55, 3.25]
    frames = list(range(0, 49, 4))
    for frame in frames:
        phase = 2.0 * math.pi * (frame / 48.0)
        cum_angles = [
            math.radians(spine_amp_deg[i]) * math.sin(phase - phase_lags[i])
            for i in range(6)
        ]
        rel_angles = [cum_angles[0]] + [cum_angles[i] - cum_angles[i - 1] for i in range(1, 6)]
        for i in range(6):
            pb = arm_obj.pose.bones[f"spine_{i}"]
            pb.rotation_quaternion = Quaternion((0.0, 0.0, 1.0), rel_angles[i])
            pb.keyframe_insert(data_path="rotation_quaternion", frame=frame)

        sweep_rad = math.radians(pect_sweep_deg) * math.sin(phase)
        feather_rad = math.radians(pect_feather_deg) * math.cos(phase)
        for name, side in (("pectoral_L", 1.0), ("pectoral_R", -1.0)):
            pb = arm_obj.pose.bones[name]
            q_sweep = Quaternion((0.0, 0.0, 1.0), side * sweep_rad)
            q_feather = Quaternion((0.0, 1.0, 0.0), side * feather_rad)
            pb.rotation_quaternion = q_sweep @ q_feather
            pb.keyframe_insert(data_path="rotation_quaternion", frame=frame)

    bpy.ops.object.mode_set(mode="OBJECT")
    scene.frame_set(0)
    return arm_obj, mesh_obj, labels


def build_fish_from_rgba_and_export(spec: dict, topdown_rgba: np.ndarray) -> dict:
    """Build original rigged, head-sculpted, PBR-textured fish from `(H, W, 4)` float32 RGBA."""
    species_id = spec["id"]
    clear_scene()
    bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection

    raw_mask = topdown_rgba[:, :, 3] > 0.45
    fg_mask = _largest_4connected_component(raw_mask)
    if not np.any(fg_mask):
        raise RuntimeError(f"Empty foreground silhouette for {species_id}")

    dist_in = _chamfer_distance_transform(~fg_mask, max_iters=48)
    dist_out = _chamfer_distance_transform(fg_mask, max_iters=24)
    sdf = dist_in - dist_out

    dilated_rgba = _dilate_interior_rgb(topdown_rgba, dist_in, min_core_dist=2.2)

    shell_data = _build_body_shell_data(fg_mask, sdf, dist_in, spec["shape"])
    arm_obj, mesh_obj, labels = _create_rigged_animated_fish(
        species_id,
        shell_data,
        spec["pectoral"],
        spec["animation"],
    )

    mesh = mesh_obj.data
    v_uvs = shell_data["v_uvs"]
    is_pectoral = [lbl != 0 for lbl in labels]

    u_eye0 = float(spec["eye"]["u"])
    v_eye0 = float(spec["eye"]["v"])
    ru = float(spec["eye"]["ru"])
    rv = float(spec["eye"]["rv"])
    if spec["eye"].get("auto_snap_pupil", True):
        u_eye, v_eye = _auto_snap_pupil_uv(topdown_rgba, u_eye0, v_eye0, ru, rv)
    else:
        u_eye, v_eye = u_eye0, v_eye0

    _sculpt_head_geometry(mesh, v_uvs, is_pectoral, u_eye, v_eye, spec, smooth_pre_existing=False)

    mesh.calc_loop_triangles()
    tri_count = len(mesh.loop_triangles)
    if tri_count > 16000:
        raise RuntimeError(f"{species_id} triangle count {tri_count} exceeds 16,000 cap")
    for v in mesh.vertices:
        if any(not math.isfinite(c) for c in v.co):
            raise RuntimeError(f"Non-finite vertex coordinate on {species_id}")
    zero_area = sum(1 for t in mesh.loop_triangles if t.area <= 1e-10)
    if zero_area:
        raise RuntimeError(f"Found {zero_area} degenerate triangles on {species_id}")

    tex_res = int(spec["body"].get("tex_size", 512))
    base_rgba_res = _upsample_bilinear_rgba(dilated_rgba, tex_res)
    # Restore true alpha on silhouette interior/exterior boundaries ONLY for _generate_768_pbr_maps mask extraction
    alpha_mask_res = _upsample_bilinear_scalar(fg_mask.astype(np.float32), tex_res)
    base_rgba_res[:, :, 3] = alpha_mask_res

    thick_192, pect_192 = _rasterize_flank_thickness_and_pectoral(mesh, v_uvs, is_pectoral, res=192)
    thickness_res = _upsample_bilinear(thick_192, tex_res)
    pectoral_res = _upsample_bilinear(pect_192, tex_res)

    tex_dir = BLEND_DIR / f"{species_id}-textures"
    base_path, norm_path, orm_path = _generate_768_pbr_maps(
        species_id, tex_dir, base_rgba_res, thickness_res, pectoral_res, u_eye, v_eye, spec
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
    arm_obj.select_set(True)
    mesh_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj

    bpy.ops.export_scene.gltf(
        filepath=str(override_path),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_skins=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
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
        "vertices": len(mesh.vertices),
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
    print(f"AQ91_FISH_BUILT {species_id} {json.dumps(summary)}", flush=True)
    return summary


def _upsample_bilinear_scalar(arr_small: np.ndarray, out_res: int) -> np.ndarray:
    in_h, in_w = arr_small.shape
    cx = np.clip((np.arange(out_res, dtype=np.float32) + 0.5) * (in_w / out_res) - 0.5, 0.0, in_w - 1.0)
    cy = np.clip((np.arange(out_res, dtype=np.float32) + 0.5) * (in_h / out_res) - 0.5, 0.0, in_h - 1.0)
    x0 = np.floor(cx).astype(np.int32)
    y0 = np.floor(cy).astype(np.int32)
    x1 = np.minimum(in_w - 1, x0 + 1)
    y1 = np.minimum(in_h - 1, y0 + 1)
    fx = (cx - x0).astype(np.float32)[None, :]
    fy = (cy - y0).astype(np.float32)[:, None]
    top = arr_small[y0[:, None], x0[None, :]] * (1.0 - fx) + arr_small[y0[:, None], x1[None, :]] * fx
    bot = arr_small[y1[:, None], x0[None, :]] * (1.0 - fx) + arr_small[y1[:, None], x1[None, :]] * fx
    return top * (1.0 - fy) + bot * fy


def _upsample_bilinear_rgba(rgba: np.ndarray, out_res: int) -> np.ndarray:
    channels = [_upsample_bilinear_scalar(rgba[:, :, c], out_res) for c in range(4)]
    return np.stack(channels, axis=-1)
