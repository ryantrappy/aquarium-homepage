"""Original Milka Rose-Magenta Club Stylophora pistillata SPS colony (AQ-70.11).
Thick blunt dichotomous Y-forked finger branches terminating in swollen rounded
blush-pink club tips studded with dense calcareous polyp verrucae.
Packed native + single-primitive static GLB with 3 PBR maps; raw rigid COLOR_0 masks.
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
import random
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-stylophora-magenta-club"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261128)


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
    ):
        for item in list(datablock):
            datablock.remove(item)


clear_scene()
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0
scene.render.engine = "CYCLES"
scene.cycles.samples = 12
scene.cycles.device = "CPU"
scene.cycles.seed = 2026
scene.render.threads_mode = "FIXED"
scene.render.threads = 4

verts, faces, face_uvs, masks = [], [], [], []


def vertex(p, mask):
    verts.append((float(p.x), float(p.y), float(p.z)))
    masks.append((0.0, max(0.0, min(1.0, float(mask[1]))), max(0.08, min(0.92, float(mask[2]))), max(0.0, min(1.0, float(mask[3])))))
    return len(verts) - 1


def face(indices, uv):
    faces.append(tuple(indices))
    face_uvs.append(uv)


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / max(1e-6, b - a)))
    return t * t * (3.0 - 2.0 * t)


def cubic(a, b, c, d, t):
    u = 1.0 - t
    return (u ** 3) * a + 3.0 * (u ** 2) * t * b + 3.0 * u * (t ** 2) * c + (t ** 3) * d


def build_bishop_frames(points):
    tangents = []
    n_pts = len(points)
    for i in range(n_pts):
        tangents.append((points[min(i + 1, n_pts - 1)] - points[max(i - 1, 0)]).normalized())
    t0 = tangents[0]
    ref = Vector((0.0, 0.0, 1.0)) if abs(t0.z) < 0.88 else Vector((1.0, 0.0, 0.0))
    n0 = (ref - t0 * ref.dot(t0)).normalized()
    b0 = t0.cross(n0).normalized()
    frames = [(n0, b0, t0)]
    prev_t, prev_n = t0, n0
    for i in range(1, n_pts):
        ti = tangents[i]
        axis = prev_t.cross(ti)
        if axis.length > 1e-6:
            axis.normalize()
            angle = math.acos(max(-1.0, min(1.0, prev_t.dot(ti))))
            cos_a, sin_a = math.cos(angle), math.sin(angle)
            ni = prev_n * cos_a + axis.cross(prev_n) * sin_a + axis * axis.dot(prev_n) * (1.0 - cos_a)
            ni = (ni - ti * ni.dot(ti)).normalized()
        else:
            ni = prev_n
        bi = ti.cross(ni).normalized()
        frames.append((ni, bi, ti))
        prev_t, prev_n = ti, ni
    return frames


def polyp_verruca(anchor_p, out_dir, bud_r, bud_h, g_base, phase, ao_base):
    """Rounded thumb-knob side bud characteristic of knobbly Stylophora pistillata clubs."""
    t_dir = out_dir.normalized()
    ref = Vector((0.0, 0.0, 1.0)) if abs(t_dir.z) < 0.88 else Vector((1.0, 0.0, 0.0))
    n = (ref - t_dir * ref.dot(t_dir)).normalized()
    b = t_dir.cross(n).normalized()

    sides = 8
    specs = [
        (-0.15, 0.92, max(0.05, g_base * 0.90), max(0.28, ao_base * 0.92)),
        ( 0.45, 1.00, min(0.92, g_base + 0.06), min(0.98, ao_base + 0.06)),
        ( 1.00, 0.68, min(0.96, g_base + 0.14), min(1.00, ao_base + 0.12)),
    ]
    rings = []
    for lk, rk, g_k, ao_k in specs:
        c = anchor_p + t_dir * (bud_h * lk)
        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            ring.append(vertex(c + (math.cos(phi) * n + math.sin(phi) * b) * (bud_r * rk), (0.0, g_k, phase, ao_k)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        v0 = min(0.84, max(0.22, g_base + 0.08 * k))
        v1 = min(0.90, max(0.25, g_base + 0.08 * (k + 1)))
        for j in range(sides):
            nxt = (j + 1) % sides
            face(
                (rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]),
                [(j / sides, v0), ((j + 1) / sides, v0), ((j + 1) / sides, v1), (j / sides, v1)],
            )
    bot = vertex(anchor_p - t_dir * (bud_h * 0.40), (0.0, max(0.02, g_base * 0.78), phase, max(0.24, ao_base * 0.86)))
    top = vertex(anchor_p + t_dir * (bud_h * 1.18), (0.0, min(0.98, g_base + 0.20), phase, min(1.0, ao_base + 0.14)))
    for j in range(sides):
        nxt = (j + 1) % sides
        face((bot, rings[0][nxt], rings[0][j]), [(j / sides, max(0.18, g_base - 0.04)), ((j + 1) / sides, max(0.20, g_base)), (j / sides, max(0.20, g_base))])
        face((rings[-1][j], rings[-1][nxt], top), [(j / sides, min(0.90, g_base + 0.12)), ((j + 1) / sides, min(0.90, g_base + 0.12)), ((j + 0.5) / sides, min(0.96, g_base + 0.18))])


def stylophora_club_branch(p0, p1, p2, p3, r_base, r_club, t_start_g, t_start_ao, phase, verrucae_target=10, sides=12):
    # Parameterize shaft up to t=1.0, then add 2 hemispherical club-cap rings so tips are plump & blunt
    ts = [0.0, 0.12, 0.25, 0.38, 0.52, 0.66, 0.78, 0.88, 0.94, 0.985]
    pts = [cubic(p0, p1, p2, p3, t) for t in ts]
    frames = build_bishop_frames(pts)

    rings = []
    for k, (p, t) in enumerate(zip(pts, ts)):
        n, b, tan = frames[k]
        # Swell smoothly toward a thick blunt Stylophora club head
        swell = 1.0 + 0.22 * smooth(0.50, 0.88, t)
        dome_t = smooth(0.86, 1.0, t)
        cap_round = math.sqrt(max(0.18, 1.0 - 0.62 * (dome_t ** 2)))
        rad = (r_base * (1.0 - t) + r_club * t) * swell * cap_round
        paddle = 1.0 + 0.16 * smooth(0.62, 0.95, t)
        g_val = t_start_g + (1.0 - t_start_g) * smooth(0.10, 0.985, t)
        if t <= 0.001 and t_start_g <= 0.001:
            g_val = 0.0
        ao_val = t_start_ao + (1.0 - t_start_ao) * smooth(0.0, 0.80, t)

        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            wobble = 1.0 + 0.07 * math.sin(phi * 3.0 + k * 2.3 + phase * 9.0) * math.cos(k * 1.4 - phi * 2.0)
            rx = math.cos(phi) * rad * paddle * wobble
            ry = math.sin(phi) * rad * (2.0 - paddle) * 0.92 * wobble
            ring.append(vertex(p + rx * n + ry * b, (0.0, g_val, phase, ao_val)))
        rings.append(ring)

    # Extra hemispherical dome ring past p3 to form a plush rounded thumb cap
    n_end, b_end, tan_end = frames[-1]
    c_cap = pts[-1] + tan_end * (r_club * 0.42)
    cap_ring = []
    for j in range(sides):
        phi = j * 2.0 * math.pi / sides
        rx = math.cos(phi) * r_club * 0.56
        ry = math.sin(phi) * r_club * 0.48
        cap_ring.append(vertex(c_cap + rx * n_end + ry * b_end, (0.0, 0.985, phase, 1.0)))
    rings.append(cap_ring)
    ts_ext = ts + [1.0]

    for k in range(len(rings) - 1):
        v0 = 0.08 + 0.90 * ts_ext[k]
        v1 = 0.08 + 0.90 * ts_ext[k + 1]
        for j in range(sides):
            nxt = (j + 1) % sides
            face(
                (rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]),
                [(j / sides + phase, v0), ((j + 1) / sides + phase, v0), ((j + 1) / sides + phase, v1), (j / sides + phase, v1)],
            )

    base_pole = vertex(pts[0] - frames[0][2] * (r_base * 0.30), (0.0, t_start_g, phase, t_start_ao))
    tip_pole = vertex(pts[-1] + tan_end * (r_club * 0.62), (0.0, 1.0, phase, 1.0))
    for j in range(sides):
        nxt = (j + 1) % sides
        face((base_pole, rings[0][nxt], rings[0][j]), [(j / sides, 0.06), ((j + 1) / sides, 0.08), (j / sides, 0.08)])
        face((rings[-1][j], rings[-1][nxt], tip_pole), [(j / sides, 0.97), ((j + 1) / sides, 0.97), ((j + 0.5) / sides, 1.0)])

    v_cnt = 0
    for ci in range(verrucae_target):
        frac = 0.18 + 0.68 * ((ci + 0.4) / verrucae_target)
        st = min(len(pts) - 3, max(2, round(frac * (len(pts) - 1))))
        p_st = pts[st]
        n, b, tan = frames[st]
        ang = ci * 2.399963 + phase * 10.0
        out_dir = (math.cos(ang) * n + math.sin(ang) * b + 0.35 * tan).normalized()
        rad_at = (r_base * (1.0 - frac) + r_club * frac) * (1.0 + 0.22 * smooth(0.50, 0.88, frac))
        anchor = p_st + out_dir * (rad_at * 0.72)
        g_loc = min(0.86, t_start_g + (1.0 - t_start_g) * frac)
        ao_loc = t_start_ao + (1.0 - t_start_ao) * frac
        polyp_verruca(anchor, out_dir, rad_at * 0.48, rad_at * 0.56, g_loc, phase, ao_loc)
        v_cnt += 1
    return pts, frames, v_cnt


# 1. Calcareous basal holdfast pad (z = 0.0 .. 0.022)
hold_sides = 16
hold_specs = [
    (0.000, 0.022, 0.00, 0.15),
    (0.005, 0.029, 0.03, 0.22),
    (0.014, 0.025, 0.07, 0.30),
    (0.024, 0.017, 0.12, 0.38),
]
hold_rings = []
for z_val, rad, g_val, ao_val in hold_specs:
    ring = []
    for j in range(hold_sides):
        ang = j * 2.0 * math.pi / hold_sides
        lobe = 1.0 + 0.14 * math.cos(ang * 4.0 + 0.5) + 0.07 * math.sin(ang * 3.0)
        ring.append(vertex(Vector((math.cos(ang) * rad * lobe, math.sin(ang) * rad * lobe, z_val)), (0.0, g_val, 0.50, ao_val)))
    hold_rings.append(ring)

for k in range(len(hold_rings) - 1):
    for j in range(hold_sides):
        nxt = (j + 1) % hold_sides
        face(
            (hold_rings[k][j], hold_rings[k][nxt], hold_rings[k + 1][nxt], hold_rings[k + 1][j]),
            [(j / hold_sides, k * 0.04), ((j + 1) / hold_sides, k * 0.04), ((j + 1) / hold_sides, (k + 1) * 0.04), (j / hold_sides, (k + 1) * 0.04)],
        )

h_bot = vertex(Vector((0.0, 0.0, 0.0)), (0.0, 0.0, 0.50, 0.14))
h_top = vertex(Vector((0.0, 0.0, 0.025)), (0.0, 0.14, 0.50, 0.42))
for j in range(hold_sides):
    nxt = (j + 1) % hold_sides
    face((h_bot, hold_rings[0][nxt], hold_rings[0][j]), [(j / hold_sides, 0.0), ((j + 1) / hold_sides, 0.02), (j / hold_sides, 0.02)])
    face((hold_rings[-1][j], hold_rings[-1][nxt], h_top), [(j / hold_sides, 0.12), ((j + 1) / hold_sides, 0.12), ((j + 0.5) / hold_sides, 0.15)])


# 2. Six stout outward-splaying trunks forking dichotomously into thick club fingers (~26 branches)
total_verrucae = 0
trunks = [
    (  12.0, 0.068, 0.168, 0.16),
    (  74.0, 0.066, 0.180, 0.30),
    ( 136.0, 0.070, 0.162, 0.45),
    ( 198.0, 0.068, 0.174, 0.60),
    ( 260.0, 0.065, 0.160, 0.74),
    ( 318.0, 0.064, 0.172, 0.88),
]

for idx_t, (az_deg, reach, height, ph) in enumerate(trunks):
    az = math.radians(az_deg + rng.uniform(-6.0, 6.0))
    rad_xy = Vector((math.cos(az), math.sin(az), 0.0))
    tan_xy = Vector((-math.sin(az), math.cos(az), 0.0))

    p0 = Vector((rad_xy.x * 0.011, rad_xy.y * 0.011, 0.014))
    p1 = p0 + rad_xy * (reach * 0.42) + tan_xy * rng.uniform(-0.008, 0.008) + Vector((0.0, 0.0, height * 0.24))
    p2 = p0 + rad_xy * (reach * 0.78) + tan_xy * rng.uniform(-0.010, 0.010) + Vector((0.0, 0.0, height * 0.60))
    p3 = p0 + rad_xy * reach + tan_xy * rng.uniform(-0.008, 0.008) + Vector((0.0, 0.0, height))
    pts_m, _, v1 = stylophora_club_branch(p0, p1, p2, p3, 0.0115, 0.0088, 0.08, 0.26, ph, verrucae_target=12, sides=12)
    total_verrucae += v1

    # Lower dichotomous Y-fork A (curving inward/upward to build crown volume)
    fp0 = pts_m[3]
    ang_a = az + math.radians(rng.uniform(36.0, 50.0))
    d_a = Vector((math.cos(ang_a), math.sin(ang_a), 0.0))
    h_a = rng.uniform(0.068, 0.086)
    r_a = rng.uniform(0.025, 0.036)
    fa3 = fp0 + d_a * r_a + Vector((0.0, 0.0, h_a))
    pts_a, _, v2 = stylophora_club_branch(
        fp0,
        fp0 + d_a * (r_a * 0.48) + Vector((0.0, 0.0, h_a * 0.34)),
        fp0 + d_a * (r_a * 0.85) + Vector((0.0, 0.0, h_a * 0.72)),
        fa3,
        0.0088,
        0.0078,
        0.34,
        0.50,
        min(0.90, ph + 0.07),
        verrucae_target=9,
        sides=10,
    )
    total_verrucae += v2

    # Tertiary club split off fork A on alternating trunks
    if idx_t % 2 == 0:
        tp0 = pts_a[4]
        ang_t = ang_a - math.radians(rng.uniform(38.0, 52.0))
        d_t = Vector((math.cos(ang_t), math.sin(ang_t), 0.0))
        h_t = rng.uniform(0.042, 0.056)
        _, _, v_t = stylophora_club_branch(
            tp0,
            tp0 + d_t * 0.014 + Vector((0.0, 0.0, h_t * 0.38)),
            tp0 + d_t * 0.022 + Vector((0.0, 0.0, h_t * 0.76)),
            tp0 + d_t * 0.024 + Vector((0.0, 0.0, h_t)),
            0.0072,
            0.0068,
            0.58,
            0.72,
            max(0.09, ph - 0.08),
            verrucae_target=7,
            sides=10,
        )
        total_verrucae += v_t

    # Upper dichotomous Y-fork B (sweeping outward on opposite side)
    bp0 = pts_m[5]
    ang_b = az - math.radians(rng.uniform(36.0, 50.0))
    d_b = Vector((math.cos(ang_b), math.sin(ang_b), 0.0))
    h_b = rng.uniform(0.054, 0.072)
    r_b = rng.uniform(0.024, 0.034)
    fb3 = bp0 + d_b * r_b + Vector((0.0, 0.0, h_b))
    pts_b, _, v3 = stylophora_club_branch(
        bp0,
        bp0 + d_b * (r_b * 0.50) + Vector((0.0, 0.0, h_b * 0.35)),
        bp0 + d_b * (r_b * 0.86) + Vector((0.0, 0.0, h_b * 0.72)),
        fb3,
        0.0082,
        0.0074,
        0.48,
        0.64,
        min(0.91, ph + 0.11),
        verrucae_target=8,
        sides=10,
    )
    total_verrucae += v3

    # Alternating outer basal spur (adds low breadth)
    if idx_t % 2 == 1:
        sp0 = Vector((rad_xy.x * 0.016, rad_xy.y * 0.016, 0.016))
        ang_s = az + math.radians(22.0)
        d_s = Vector((math.cos(ang_s), math.sin(ang_s), 0.0))
        sp3 = sp0 + d_s * 0.058 + Vector((0.0, 0.0, 0.080))
        _, _, vs = stylophora_club_branch(
            sp0,
            sp0 + d_s * 0.030 + Vector((0.0, 0.0, 0.022)),
            sp0 + d_s * 0.052 + Vector((0.0, 0.0, 0.052)),
            sp3,
            0.0084,
            0.0074,
            0.22,
            0.40,
            max(0.10, ph - 0.12),
            verrucae_target=8,
            sides=10,
        )
        total_verrucae += vs

# Fit strictly inside legacy coral-acropora-staghorn [0.175, 0.221, 0.194] -> target <= [0.166, 0.192, 0.176]
xs = [v[0] for v in verts]
ys = [v[1] for v in verts]
zs = [v[2] for v in verts]
cx = 0.5 * (min(xs) + max(xs))
cy = 0.5 * (min(ys) + max(ys))
z0 = min(zs)
sx = 0.166 / max(1e-5, max(xs) - min(xs))
sy = 0.174 / max(1e-5, max(ys) - min(ys))
sz = 0.188 / max(1e-5, max(zs) - z0)
sc = min(1.0, sx, sy, sz)
verts = [((x - cx) * sc, (y - cy) * sc, (z - z0) * sc) for (x, y, z) in verts]

mesh = bpy.data.meshes.new("Reef_Stylophora_Magenta_Club_Mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()
if mesh.validate(verbose=True):
    raise RuntimeError("Mesh validation failed")

bm_check = bmesh.new()
bm_check.from_mesh(mesh)
non_manifold = sum(1 for e in bm_check.edges if not e.is_manifold)
boundary = sum(1 for e in bm_check.edges if e.is_boundary)
loose_v = sum(1 for v in bm_check.verts if not v.link_edges)
bm_check.free()
if non_manifold or boundary or loose_v:
    raise RuntimeError(f"Topology not watertight: non_manifold={non_manifold}, boundary={boundary}, loose={loose_v}")

obj = bpy.data.objects.new("Reef_Stylophora_Magenta_Club", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Coenosteum_UV")
attr = mesh.color_attributes.new(name="COLOR_0", type="FLOAT_COLOR", domain="CORNER")
mesh.color_attributes.active_color = attr
mesh.color_attributes.render_color_index = 0
for poly in mesh.polygons:
    poly.use_smooth = True
    for j, loop_i in enumerate(poly.loop_indices):
        uv.data[loop_i].uv = face_uvs[poly.index][j]
        attr.data[loop_i].color = masks[mesh.loops[loop_i].vertex_index]

image_dir = OUT / "blend" / f"{ID}-textures"
image_dir.mkdir(parents=True, exist_ok=True)


def make_image(name, size, fn, noncolor):
    im = bpy.data.images.new(ID + "-" + name, width=size, height=size, alpha=False)
    im.colorspace_settings.name = "Non-Color" if noncolor else "sRGB"
    pixels = [0.0] * (size * size * 4)
    for y in range(size):
        v = y / max(1, size - 1)
        off = y * size * 4
        for x in range(size):
            r, g, b = fn(x / max(1, size - 1), v)
            i = off + x * 4
            pixels[i] = max(0.0, min(1.0, r))
            pixels[i + 1] = max(0.0, min(1.0, g))
            pixels[i + 2] = max(0.0, min(1.0, b))
            pixels[i + 3] = 1.0
    im.pixels.foreach_set(pixels)
    im.filepath_raw = str(image_dir / (im.name + ".png"))
    im.file_format = "PNG"
    im.save()
    im.pack()
    return im


def polyp_dimple_field(u, v):
    """Staggered hexagonal polyp-pore dimple pattern (no vertical streaks)."""
    su, sv = u * 28.0, v * 36.0
    row = math.floor(sv)
    fu = (su + 0.5 * (row % 2)) % 1.0 - 0.5
    fv = (sv % 1.0) - 0.5
    d = math.hypot(fu, fv)
    pore = 1.0 - smooth(0.14, 0.34, d)
    mottle = 0.5 + 0.5 * math.sin(u * 42.0 + math.sin(v * 34.0) * 1.6) * math.cos(v * 38.0 - u * 27.0)
    return pore, mottle


def stylophora_albedo(u, v):
    # Honeycomb polyp pores + velvety rose-magenta coenosteum + bright pastel pink club tips
    pore, mottle = polyp_dimple_field(u, v)
    c_base = (0.30 + 0.06 * mottle - 0.06 * pore, 0.08 + 0.03 * mottle, 0.20 + 0.06 * mottle)
    c_mid = (0.68 + 0.12 * mottle - 0.14 * pore, 0.15 + 0.07 * mottle + 0.05 * pore, 0.46 + 0.12 * mottle)
    c_tip = (0.96, 0.72 + 0.12 * mottle - 0.10 * pore, 0.86 + 0.08 * mottle)
    t1 = smooth(0.08, 0.46, v)
    t2 = smooth(0.78, 0.98, v)
    col = [c_base[i] * (1.0 - t1) + c_mid[i] * t1 for i in range(3)]
    col = [col[i] * (1.0 - t2) + c_tip[i] * t2 for i in range(3)]
    return tuple(col)


def stylophora_normal(u, v):
    eps = 0.0025
    h_fn = lambda uu, vv: polyp_dimple_field(uu, vv)[0] * -0.45 + polyp_dimple_field(uu, vv)[1] * 0.22
    hx = (h_fn(u + eps, v) - h_fn(u - eps, v)) * 0.85
    hy = (h_fn(u, v + eps) - h_fn(u, v - eps)) * 0.85
    n = Vector((-hx, -hy, 1.0)).normalized()
    return (0.5 + 0.5 * n.x, 0.5 + 0.5 * n.y, 0.5 + 0.5 * n.z)


def stylophora_roughness(u, v):
    pore, mottle = polyp_dimple_field(u, v)
    val = 0.72 - 0.18 * smooth(0.74, 0.98, v) + 0.10 * pore + 0.05 * mottle
    return (val, val, val)


base = make_image("albedo", 512, stylophora_albedo, False)
nrm = make_image("normal", 512, stylophora_normal, True)
rough = make_image("roughness", 512, stylophora_roughness, True)

mat = bpy.data.materials.new("Stylophora_Magenta_Club_SPS")
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
bsdf.inputs["Metallic"].default_value = 0.0

tex = nodes.new("ShaderNodeTexImage")
tex.image = base
links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])

rtex = nodes.new("ShaderNodeTexImage")
rtex.image = rough
links.new(rtex.outputs["Color"], bsdf.inputs["Roughness"])

ntex = nodes.new("ShaderNodeTexImage")
ntex.image = nrm
nm = nodes.new("ShaderNodeNormalMap")
nm.inputs["Strength"].default_value = 0.85
links.new(ntex.outputs["Color"], nm.inputs["Color"])
links.new(nm.outputs[0], bsdf.inputs["Normal"])
mesh.materials.append(mat)

obj["authoring_notes"] = (
    "Original Milka Rose-Magenta Club Stylophora pistillata (AQ-70.11), dichotomous blunt club-finger "
    "branches with rounded blush-pink tips & polyp verrucae, 3 packed 512px PBR maps, raw rigid COLOR_0 masks."
)

triangulate = obj.modifiers.new("Stable_Export_Triangles", "TRIANGULATE")
bpy.ops.object.modifier_apply(modifier=triangulate.name)
mesh = obj.data
if mesh.validate(verbose=True):
    raise RuntimeError("Final mesh validation failed")
mesh.calc_loop_triangles()
triangles = len(mesh.loop_triangles)
if triangles > 28000:
    raise RuntimeError(f"Triangle count {triangles} exceeds target 28000")

blend = OUT / "blend" / f"{ID}.blend"
blend.parent.mkdir(parents=True, exist_ok=True)
override = OUT / "overrides" / f"{ID}.glb"
override.parent.mkdir(parents=True, exist_ok=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=False)
bpy.ops.export_scene.gltf(
    filepath=str(override),
    export_format="GLB",
    use_selection=True,
    export_yup=True,
    export_extras=True,
    export_animations=False,
    export_tangents=True,
    export_vertex_color="ACTIVE",
    export_active_vertex_color_when_no_material=True,
)
print("STYLOPHORA_SAVED_EXPORTED", json.dumps({
    "triangles": triangles,
    "vertices": len(mesh.vertices),
    "verrucae": total_verrucae,
    "dimensions": [round(float(v), 4) for v in obj.dimensions],
}), flush=True)

world = bpy.data.worlds.new("Neutral_Review")
scene.world = world
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.10, 0.14, 0.19, 1.0)
bg.inputs[1].default_value = 0.65
for name, pos, energy, size in [
    ("Key", (0.14, -0.36, 0.44), 4.2, 0.28),
    ("Fill", (-0.30, -0.18, 0.26), 1.8, 0.36),
    ("Rim", (0.04, 0.34, 0.32), 2.8, 0.24),
]:
    light = bpy.data.lights.new(name, "AREA")
    light.energy = energy
    light.shape = "DISK"
    light.size = size
    lo = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(lo)
    lo.location = pos
    lo.rotation_euler = (Vector((0.0, 0.0, 0.08)) - lo.location).to_track_quat("-Z", "Y").to_euler()
