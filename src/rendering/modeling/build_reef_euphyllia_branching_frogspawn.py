"""Original Branching Frogspawn / Octospawn coral (Euphyllia paradivisa) morphology (AQ-70.11).
Fleshy tentacles lined with translucent beaded lateral grape-egg vesicles over forked phaceloid skeleton.
Packed native + selected static two-material GLB; raw soft crown / rigid skeleton masks.
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-euphyllia-branching-frogspawn"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261124)


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

verts, faces, face_uvs, masks, materials = [], [], [], [], []


def vertex(p, mask):
    verts.append((float(p.x), float(p.y), float(p.z)))
    masks.append(tuple(max(0.0, min(1.0, float(c))) for c in mask))
    return len(verts) - 1


def face(indices, uv, material):
    faces.append(tuple(indices))
    face_uvs.append(uv)
    materials.append(material)


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


def tube(points, radii, mask_fn, material, sides=10, phase=0.5, uvs_t=None):
    frames = build_bishop_frames(points)
    rings = []
    n_pts = len(points)
    for k, (p, radius) in enumerate(zip(points, radii)):
        n, b, _ = frames[k]
        t_val = uvs_t[k] if uvs_t is not None else k / (n_pts - 1)
        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            ring.append(vertex(p + (math.cos(phi) * n + math.sin(phi) * b) * radius, mask_fn(t_val)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        v0 = uvs_t[k] if uvs_t is not None else k / (len(rings) - 1)
        v1 = uvs_t[k + 1] if uvs_t is not None else (k + 1) / (len(rings) - 1)
        for j in range(sides):
            nxt = (j + 1) % sides
            u0 = j / sides + phase
            u1 = (j + 1) / sides + phase
            face((rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]),
                 [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], material)
    face(
        tuple(reversed(rings[0])),
        [(phase + 0.5 + 0.10 * math.cos(j * 2.0 * math.pi / sides), 0.015 + 0.010 * math.sin(j * 2.0 * math.pi / sides)) for j in reversed(range(sides))],
        material,
    )
    face(
        rings[-1],
        [(phase + 0.5 + 0.10 * math.cos(j * 2.0 * math.pi / sides), 0.985 + 0.010 * math.sin(j * 2.0 * math.pi / sides)) for j in range(sides)],
        material,
    )


def lateral_grape_bud(anchor_p, dir_vec, bud_radius, parent_t, phase, stiff, material=0):
    """Plump closed lateral frogspawn vesicle bud anchored smoothly to parent tentacle."""
    t_dir = dir_vec.normalized()
    ref = Vector((0.0, 0.0, 1.0)) if abs(t_dir.z) < 0.88 else Vector((1.0, 0.0, 0.0))
    n = (ref - t_dir * ref.dot(t_dir)).normalized()
    b = t_dir.cross(n).normalized()

    # 3 rings -> stalk base -> equator bulge -> rounded crown -> tip pole (6 sides = 48 tris closed manifold!)
    sides = 6
    stations = [
        (-0.08, 0.52, max(0.05, parent_t - 0.03), 0.70),
        ( 0.52, 1.00, min(0.99, parent_t),        0.92),
        ( 1.10, 0.72, min(0.995, parent_t + 0.02), 0.98),
    ]
    rings = []
    for dist_k, r_k, t_eff, g_local in stations:
        c = anchor_p + t_dir * (bud_radius * dist_k)
        r_flex = min(0.985, (t_eff ** 1.65) * stiff)
        mask = (r_flex, g_local, phase, 0.45 + 0.55 * parent_t)
        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            ring.append(vertex(c + (math.cos(phi) * n + math.sin(phi) * b) * (bud_radius * r_k), mask))
        rings.append(ring)
    for k in range(len(rings) - 1):
        v0 = 0.72 + 0.12 * k
        v1 = 0.72 + 0.12 * (k + 1)
        for j in range(sides):
            nxt = (j + 1) % sides
            face((rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]),
                 [(j / sides, v0), ((j + 1) / sides, v0), ((j + 1) / sides, v1), (j / sides, v1)], material)
    r_tip = min(0.99, (min(1.0, parent_t + 0.03) ** 1.65) * stiff)
    base_pole = vertex(anchor_p - t_dir * (bud_radius * 0.25), (min(0.98, (max(0.05, parent_t - 0.04) ** 1.65) * stiff), 0.55, phase, 0.45 + 0.50 * parent_t))
    tip_pole = vertex(anchor_p + t_dir * (bud_radius * 1.45), (r_tip, 1.0, phase, 1.0))
    for j in range(sides):
        nxt = (j + 1) % sides
        face((base_pole, rings[0][nxt], rings[0][j]), [(j / sides, 0.65), ((j + 1) / sides, 0.72), (j / sides, 0.72)], material)
        face((rings[-1][j], rings[-1][nxt], tip_pole), [(j / sides, 0.96), ((j + 1) / sides, 0.96), ((j + 0.5) / sides, 1.0)], material)


def frogspawn_tentacle(points, ts, base_r, phase, stiff, bud_angles, material=0, sides=8):
    frames = build_bishop_frames(points)
    rings = []
    for k, (p, t) in enumerate(zip(points, ts)):
        n, b, _ = frames[k]
        # Undulating beaded shaft tapering into an apical frogspawn vesicle bulb
        bead = 0.18 * math.sin(t * math.pi * 4.0) ** 2 * smooth(0.35, 0.85, t)
        apical = 0.65 * math.exp(-((t - 0.91) / 0.065) ** 2)
        cap = math.sqrt(max(0.018, 1.0 - smooth(0.94, 1.0, t) ** 2))
        radius = base_r * (1.05 - 0.15 * smooth(0.10, 0.65, t) + bead + apical) * cap

        r_flex = 0.0 if t <= 0.0 else min(0.985, (t ** 1.65) * stiff)
        g_tip = smooth(0.58, 0.99, t)
        if t >= 0.999:
            g_tip = 1.0
        ao = 0.38 + 0.62 * smooth(0.0, 0.45, t)
        mask = (r_flex, g_tip, phase, ao)

        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            ring.append(vertex(p + (math.cos(phi) * n + math.sin(phi) * b) * radius, mask))
        rings.append(ring)

    for k in range(len(rings) - 1):
        v0, v1 = ts[k], ts[k + 1]
        for j in range(sides):
            nxt = (j + 1) % sides
            u0 = j / sides + phase * 0.4
            u1 = (j + 1) / sides + phase * 0.4
            face((rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]),
                 [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], material)

    face(
        tuple(reversed(rings[0])),
        [(0.5 + 0.10 * math.cos(j * 2.0 * math.pi / sides), 0.015 + 0.010 * math.sin(j * 2.0 * math.pi / sides)) for j in reversed(range(sides))],
        material,
    )
    tip_idx = vertex(points[-1] + frames[-1][2] * (base_r * 0.30), (min(0.99, stiff), 1.0, phase, 1.0))
    for j in range(sides):
        nxt = (j + 1) % sides
        u0 = j / sides + phase * 0.4
        u1 = (j + 1) / sides + phase * 0.4
        face((rings[-1][j], rings[-1][nxt], tip_idx), [(u0, 0.985), (u1, 0.985), (0.5 * (u0 + u1), 1.0)], material)

    # 3 distinct lateral grape-egg vesicles along distal half of tentacle (classic Euphyllia paradivisa look!)
    for idx_b, (st_idx, ang_off) in enumerate(zip((5, 7, 8), bud_angles)):
        p_st = points[st_idx]
        t_st = ts[st_idx]
        n, b, tan = frames[st_idx]
        radial_bud = (math.cos(ang_off) * n + math.sin(ang_off) * b + 0.45 * tan).normalized()
        anchor_p = p_st + (math.cos(ang_off) * n + math.sin(ang_off) * b) * (base_r * 0.65)
        bud_r = base_r * (1.28 + 0.25 * (idx_b / 2.0))
        lateral_grape_bud(anchor_p, radial_bud, bud_r, t_st, phase, stiff, material=material)


def oral_disc(center, radius, tilt_vec, material, ph):
    pole = vertex(center, (0.0, 0.02, ph, 0.40))
    bot_pole = vertex(center - Vector((0.0, 0.0, 0.004)), (0.0, 0.0, ph, 0.34))
    prev = None
    sides = 18
    for k in range(1, 4):
        r = radius * k / 3.0
        ring = []
        for j in range(sides):
            a = j * 2.0 * math.pi / sides
            lx, ly = math.cos(a) * r, math.sin(a) * r
            lz = -0.002 * (k / 3.0) ** 2 + 0.0003 * math.cos(9 * a) + tilt_vec.x * lx + tilt_vec.y * ly
            ring.append(vertex(center + Vector((lx, ly, lz)), (0.0, 0.04 * k, ph, 0.38 + 0.06 * k)))
        for j in range(sides):
            nxt = (j + 1) % sides
            u0, u1 = j / sides, (j + 1) / sides
            if prev is None:
                face((pole, ring[j], ring[nxt]), [(u0, 0.0), (u0, 0.04), (u1, 0.04)], material)
            else:
                face((prev[j], ring[j], ring[nxt], prev[nxt]),
                     [(u0, 0.04 * (k - 1)), (u0, 0.04 * k), (u1, 0.04 * k), (u1, 0.04 * (k - 1))], material)
        prev = ring
    for j in range(sides):
        nxt = (j + 1) % sides
        u0, u1 = j / sides, (j + 1) / sides
        face((prev[nxt], prev[j], bot_pole), [(u1, 0.12), (u0, 0.12), (0.5 * (u0 + u1), 0.02)], material)


# 5 forked phaceloid skeletal heads (85 tentacles + 255 lateral grape buds = ~26.2k tris)
head_specs = [
    (Vector(( 0.000, -0.004, 0.056)), Vector(( 0.00, -0.08, 0.0))),
    (Vector((-0.036, -0.012, 0.044)), Vector((-0.14, -0.10, 0.0))),
    (Vector(( 0.036, -0.010, 0.045)), Vector(( 0.14, -0.10, 0.0))),
    (Vector((-0.018,  0.028, 0.049)), Vector((-0.08,  0.12, 0.0))),
    (Vector(( 0.024,  0.028, 0.047)), Vector(( 0.10,  0.12, 0.0))),
]

ts = [0.0, 0.10, 0.21, 0.33, 0.45, 0.57, 0.69, 0.80, 0.90, 1.0]
tentacle_count = 0
for hi, (center, tilt_v) in enumerate(head_specs):
    a = Vector((0.0, 0.0, 0.002))
    b = Vector((center.x * 0.45, center.y * 0.45, 0.018))
    c = center - Vector((0.0, 0.0, 0.008))
    pts_sk = [(1.0 - t) ** 2 * a + 2.0 * (1.0 - t) * t * b + t * t * c for t in [i / 6.0 for i in range(7)]]
    tube(pts_sk, [0.0082 * (1.0 - i / 6.0) + 0.0058 * (i / 6.0) for i in range(7)],
         lambda t: (0.0, 0.0, 0.50, 0.38 + 0.42 * t), 1, sides=10, phase=hi * 0.17)

    ring_spec = [(-0.012, 0.0082), (-0.006, 0.0122), (0.001, 0.0182), (0.004, 0.0172), (0.000, 0.0130)]
    calyx_rings = []
    sides_c = 18
    for k, (dz, r_cal) in enumerate(ring_spec):
        ring = []
        for j in range(sides_c):
            ang = j * 2.0 * math.pi / sides_c
            rr = r_cal * (1.0 + 0.055 * math.sin(9 * ang))
            lx, ly = rr * math.cos(ang), rr * math.sin(ang)
            lz = dz + tilt_v.x * lx + tilt_v.y * ly
            ring.append(vertex(center + Vector((lx, ly, lz)), (0.0, 0.0, 0.50, 0.50 + 0.08 * k)))
        calyx_rings.append(ring)
    for k in range(len(calyx_rings) - 1):
        for j in range(sides_c):
            nxt = (j + 1) % sides_c
            face((calyx_rings[k][j], calyx_rings[k][nxt], calyx_rings[k + 1][nxt], calyx_rings[k + 1][j]),
                 [(j / sides_c, k / 4.0), ((j + 1) / sides_c, k / 4.0), ((j + 1) / sides_c, (k + 1) / 4.0), (j / sides_c, (k + 1) / 4.0)], 1)
    calyx_bot = vertex(center + Vector((0.0, 0.0, -0.012)), (0.0, 0.0, 0.50, 0.46))
    calyx_top = vertex(center + Vector((0.0, 0.0, 0.0)), (0.0, 0.0, 0.50, 0.78))
    for j in range(sides_c):
        nxt = (j + 1) % sides_c
        face((calyx_bot, calyx_rings[0][nxt], calyx_rings[0][j]), [(j / sides_c, 0.0), ((j + 1) / sides_c, 0.05), (j / sides_c, 0.05)], 1)
        face((calyx_rings[-1][j], calyx_rings[-1][nxt], calyx_top), [(j / sides_c, 0.92), ((j + 1) / sides_c, 0.92), ((j + 0.5) / sides_c, 0.98)], 1)

    head_ph = (hi + 0.30) / len(head_specs)
    oral_disc(center + Vector((0.0, 0.0, 0.004)), 0.0160, tilt_v, 0, head_ph)

    # 17 fleshy grape-budded frogspawn tentacles per head (85 tentacles + 255 lateral buds)
    for ti in range(17):
        tentacle_count += 1
        phi = ti * 2.399963 + hi * 0.95 + rng.uniform(-0.10, 0.10)
        radial = Vector((math.cos(phi), math.sin(phi), 0.0))
        side = Vector((-math.sin(phi), math.cos(phi), 0.0))
        r_disc = 0.0024 + 0.0122 * math.sqrt((ti + 0.5) / 17.0)
        lz0 = tilt_v.x * radial.x * r_disc + tilt_v.y * radial.y * r_disc
        p0 = center + radial * r_disc + Vector((0.0, 0.0, 0.003 + lz0))

        reach = 0.024 + 0.030 * (r_disc / 0.015) + rng.uniform(-0.003, 0.005)
        height = 0.044 + 0.024 * (1.0 - r_disc / 0.015) + rng.uniform(-0.006, 0.006)
        flow = side * rng.uniform(-0.011, 0.011)
        p3 = p0 + radial * reach + flow + Vector((0.0, 0.0, height))
        p1 = p0 + radial * (reach * 0.22) + side * rng.uniform(-0.006, 0.006) + Vector((0.0, 0.0, height * 0.48))
        p2 = p3 - radial * (reach * 0.16) - flow * 0.20 + side * rng.uniform(-0.008, 0.008) + Vector((0.0, 0.0, rng.uniform(0.006, 0.018)))

        pts = []
        for t in ts:
            pt = cubic(p0, p1, p2, p3, t)
            pt += side * (0.0026 * math.sin(t * math.pi * 1.7 + tentacle_count * 1.1) * smooth(0.10, 0.85, t))
            pts.append(pt)

        phase = rng.uniform(0.05, 0.95)
        stiff = rng.uniform(0.84, 0.98)
        base_r = rng.uniform(0.0021, 0.0027)
        bud_angs = [rng.uniform(0.0, 2.0 * math.pi) + idx_k * 2.1 for idx_k in range(3)]
        frogspawn_tentacle(pts, ts, base_r, phase, stiff, bud_angs, material=0, sides=8)

tube([Vector((0.0, 0.0, z)) for z in (0.0, 0.003, 0.007)], [0.017, 0.0175, 0.010],
     lambda t: (0.0, 0.0, 0.50, 0.36 + 0.30 * t), 1, sides=16)

# Calibrate glTF +Y-up dimensions strictly within legacy coral-euphyllia-hammer [0.203, 0.151, 0.178]:
z0 = min(v[2] for v in verts)
sx = 0.190 / max(1e-5, max(v[0] for v in verts) - min(v[0] for v in verts))
sy = 0.168 / max(1e-5, max(v[1] for v in verts) - min(v[1] for v in verts))
sz = 0.142 / max(1e-5, max(v[2] for v in verts) - z0)
sc = min(1.0, sx, sy, sz)
verts = [(x * sc, y * sc, (z - z0) * sc) for (x, y, z) in verts]

mesh = bpy.data.meshes.new("Reef_Euphyllia_Branching_Frogspawn_Mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()
if mesh.validate(verbose=True):
    raise RuntimeError("Mesh validation failed")

obj = bpy.data.objects.new("Reef_Euphyllia_Branching_Frogspawn", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Tissue_Radial_Arc")
attr = mesh.color_attributes.new(name="COLOR_0", type="FLOAT_COLOR", domain="CORNER")
mesh.color_attributes.active_color = attr
mesh.color_attributes.render_color_index = 0
for poly in mesh.polygons:
    poly.use_smooth = True
    poly.material_index = materials[poly.index]
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


def tissue_albedo(u, v):
    ang = u * 2.0 * math.pi
    stripe = 0.5 + 0.5 * math.cos(ang * 10.0 + 0.4 * math.sin(v * 14.0))
    speck = 0.5 + 0.5 * math.sin(u * 44.0 + v * 58.0) * math.cos(v * 48.0 - u * 30.0)
    # Deep jade-emerald shaft -> luminous mint-chartreuse mid -> pale lilac-rose / neon lime frogspawn grape tips
    c_jade = (0.07 + 0.05 * stripe, 0.30 + 0.11 * stripe, 0.22 + 0.09 * speck)
    c_mint = (0.18 + 0.12 * speck, 0.64 + 0.14 * stripe, 0.40 + 0.12 * speck)
    c_bead = (0.72 + 0.14 * stripe, 0.46 + 0.16 * speck, 0.80) if (math.sin(ang * 3.0) > 0.0) else (0.48 + 0.16 * speck, 0.84, 0.40)
    t1 = smooth(0.16, 0.62, v)
    t2 = smooth(0.68, 0.94, v)
    col = [c_jade[i] * (1.0 - t1) + c_mint[i] * t1 for i in range(3)]
    col = [col[i] * (1.0 - t2) + c_bead[i] * t2 for i in range(3)]
    return tuple(col)


def skeleton_albedo(u, v):
    rib = 0.5 + 0.5 * math.cos(18.0 * math.pi * u)
    patch = 0.5 + 0.5 * math.sin(2.0 * math.pi * (3.0 * u + v))
    collar = smooth(0.76, 0.98, v)
    stone = (0.38 + 0.08 * rib + 0.04 * patch, 0.35 + 0.07 * rib - 0.03 * patch, 0.29 + 0.06 * rib + 0.03 * patch)
    return tuple(stone[i] * (1.0 - collar) + (0.24, 0.19, 0.15)[i] * collar for i in range(3))


def normal_map(u, v, strength):
    nx = strength * math.sin(16.0 * math.pi * u) * (0.65 + 0.35 * math.sin(2.0 * math.pi * v))
    ny = strength * 0.20 * math.cos(8.0 * math.pi * v)
    n = Vector((nx, ny, 1.0)).normalized()
    return tuple(0.5 + 0.5 * c for c in n)


for label, mat_id, size in [("tissue", 0, 512), ("skeleton", 1, 256)]:
    base = make_image(label + "-albedo", size, tissue_albedo if mat_id == 0 else skeleton_albedo, False)
    nrm = make_image(label + "-normal", size, lambda u, v, mid=mat_id: normal_map(u, v, 0.05 if mid == 0 else 0.09), True)
    rough = make_image(
        label + "-roughness",
        size,
        lambda u, v, mid=mat_id: (((0.30 if mid == 0 else 0.80) + 0.08 * (0.5 + 0.5 * math.sin(2.0 * math.pi * (u * 5.0 + v * 3.0)))),) * 3,
        True,
    )
    mat = bpy.data.materials.new("Frogspawn_" + label.title())
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
    links.new(ntex.outputs["Color"], nm.inputs["Color"])
    links.new(nm.outputs[0], bsdf.inputs["Normal"])

    if mat_id == 0:
        bsdf.inputs["Transmission Weight"].default_value = 0.12
        bsdf.inputs["IOR"].default_value = 1.36
        bsdf.inputs["Coat Weight"].default_value = 0.14
        bsdf.inputs["Coat Roughness"].default_value = 0.24

    mat["reefPrimitive"] = {
        "id": "frogspawn_crown" if mat_id == 0 else "frogspawn_skeleton",
        "role": "coral-soft" if mat_id == 0 else "coral-rigid",
        "maskSchema": "coral-raw-masks-v1",
    }
    mesh.materials.append(mat)

obj["authoring_notes"] = (
    "Original five-head Branching Frogspawn Euphyllia paradivisa (AQ-70.11), 85 multi-budded tentacles "
    "with 255 lateral translucent grape vesicles over fluted phaceloid skeleton. Soft crown R arc flex "
    "(10 levels), rigid skeleton R=0, G tip fluorescence, B strict (0,1) phase seed, A contact AO."
)

triangulate = obj.modifiers.new("Stable_Export_Triangles", "TRIANGULATE")
bpy.ops.object.modifier_apply(modifier=triangulate.name)
mesh = obj.data
if mesh.validate(verbose=True):
    raise RuntimeError("Final mesh validation failed")
mesh.calc_loop_triangles()
triangles = len(mesh.loop_triangles)
if triangles > 29500:
    raise RuntimeError(f"Triangle count {triangles} exceeds target 29500")

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
print("FROGSPAWN_SAVED_EXPORTED", json.dumps({
    "triangles": triangles,
    "vertices": len(mesh.vertices),
    "tentacles": tentacle_count,
    "buds": tentacle_count * 3,
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
    lo.rotation_euler = (Vector((0.0, 0.0, 0.06)) - lo.location).to_track_quat("-Z", "Y").to_euler()
