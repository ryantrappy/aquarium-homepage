"""Original Rose Bubble-Tip Anemone (Entacmaea quadricolor) morphology (AQ-70.11).
Packed native + selected static two-material GLB; raw soft crown / rigid column masks.
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-anemone-rose-bta"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261121)


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
    """Twist-free parallel-transport frames along a polyline spline."""
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
            cos_a = math.cos(angle)
            sin_a = math.sin(angle)
            ni = prev_n * cos_a + axis.cross(prev_n) * sin_a + axis * axis.dot(prev_n) * (1.0 - cos_a)
            ni = (ni - ti * ni.dot(ti)).normalized()
        else:
            ni = prev_n
        bi = ti.cross(ni).normalized()
        frames.append((ni, bi, ti))
        prev_t, prev_n = ti, ni
    return frames


def bubble_tentacle(points, ts, base_r, has_bubble, bubble_gain, phase, stiff, material=0, sides=10):
    frames = build_bishop_frames(points)
    rings = []
    # Smooth tentacle profile: flared root -> constricted neck -> plump sub-terminal vesicle -> nipple tip
    for k, (p, t) in enumerate(zip(points, ts)):
        n, b, tan = frames[k]
        if has_bubble:
            root_flare = 1.0 + 0.36 * (1.0 - smooth(0.0, 0.20, t))
            neck_pinch = 1.0 - 0.42 * math.exp(-((t - 0.56) / 0.13) ** 2)
            vesicle = bubble_gain * math.exp(-((t - 0.825) / 0.082) ** 2)
            tip_taper = math.sqrt(max(0.018, 1.0 - smooth(0.905, 1.0, t) ** 2))
            radius = base_r * (root_flare * neck_pinch + vesicle) * tip_taper
            ecc = 0.06 * math.sin(phase * 11.0 + t * 5.0)
        else:
            root_flare = 1.0 + 0.34 * (1.0 - smooth(0.0, 0.22, t))
            mid_swell = 0.18 * math.exp(-((t - 0.72) / 0.16) ** 2)
            tip_taper = math.sqrt(max(0.018, 1.0 - smooth(0.87, 1.0, t) ** 2))
            radius = base_r * (root_flare * (1.0 - 0.34 * smooth(0.15, 0.72, t)) + mid_swell) * tip_taper
            ecc = 0.04 * math.cos(phase * 9.0 + t * 4.0)

        r_flex = 0.0 if t <= 0.0 else min(0.985, (t ** 1.55) * stiff)
        g_tip = smooth(0.68, 0.99, t)
        if t >= 0.999:
            g_tip = 1.0
        ao = 0.36 + 0.64 * smooth(0.0, 0.48, t)
        mask = (r_flex, g_tip, phase, ao)

        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            rx = radius * (1.0 + ecc)
            ry = radius * (1.0 - ecc * 0.6)
            offset = n * (math.cos(phi) * rx) + b * (math.sin(phi) * ry)
            ring.append(vertex(p + offset, mask))
        rings.append(ring)

    for k in range(len(rings) - 1):
        v0 = ts[k]
        v1 = ts[k + 1]
        for j in range(sides):
            nxt = (j + 1) % sides
            u0 = j / sides + phase * 0.5
            u1 = (j + 1) / sides + phase * 0.5
            face(
                (rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]),
                [(u0, v0), (u1, v0), (u1, v1), (u0, v1)],
                material,
            )

    face(
        tuple(reversed(rings[0])),
        [(0.5 + 0.10 * math.cos(j * 2.0 * math.pi / sides), 0.015 + 0.010 * math.sin(j * 2.0 * math.pi / sides)) for j in reversed(range(sides))],
        material,
    )
    tip_p = points[-1] + frames[-1][2] * (base_r * (0.24 if has_bubble else 0.22))
    tip_idx = vertex(tip_p, (min(0.99, stiff), 1.0, phase, 1.0))
    for j in range(sides):
        nxt = (j + 1) % sides
        u0 = j / sides + phase * 0.5
        u1 = (j + 1) / sides + phase * 0.5
        face((rings[-1][j], rings[-1][nxt], tip_idx), [(u0, 0.985), (u1, 0.985), (0.5 * (u0 + u1), 1.0)], material)


# 1. Rigid verrucose muscular pedal column tucked cleanly into crevice (material 1: anemone_column_disc, R = 0)
col_specs = [
    (-0.022, 0.017, 0.34, 0.0),
    (-0.015, 0.024, 0.44, 0.0),
    (-0.004, 0.029, 0.56, 0.0),
    ( 0.008, 0.032, 0.66, 0.04),
    ( 0.017, 0.0335, 0.74, 0.14),
    ( 0.023, 0.031, 0.78, 0.24),
]
col_sides = 24
col_rings = []
for k, (z_val, rad, ao, g_rim) in enumerate(col_specs):
    ring = []
    v_coord = 0.08 + 0.80 * (k / (len(col_specs) - 1))
    for j in range(col_sides):
        ang = j * 2.0 * math.pi / col_sides
        lobe = 1.0 + 0.08 * math.cos(ang * 5.0 + 0.35) + 0.03 * math.sin(ang * 10.0 + k * 0.8)
        rr = rad * lobe
        p = Vector((rr * math.cos(ang) * 1.02 + 0.003 * smooth(-0.015, 0.023, z_val),
                    rr * math.sin(ang) * 0.96,
                    z_val + 0.0012 * math.sin(ang * 2.0)))
        ring.append(vertex(p, (0.0, g_rim, 0.50, ao)))
    col_rings.append(ring)

for k in range(len(col_rings) - 1):
    v0 = 0.08 + 0.80 * (k / (len(col_specs) - 1))
    v1 = 0.08 + 0.80 * ((k + 1) / (len(col_specs) - 1))
    for j in range(col_sides):
        nxt = (j + 1) % col_sides
        u0 = j / col_sides
        u1 = (j + 1) / col_sides
        face((col_rings[k][j], col_rings[k][nxt], col_rings[k + 1][nxt], col_rings[k + 1][j]),
             [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], 1)

bot_center = vertex(Vector((0.0, 0.0, -0.022)), (0.0, 0.0, 0.50, 0.30))
top_center = vertex(Vector((0.003, 0.0, 0.019)), (0.0, 0.22, 0.50, 0.72))
for j in range(col_sides):
    nxt = (j + 1) % col_sides
    u0 = j / col_sides
    u1 = (j + 1) / col_sides
    face((bot_center, col_rings[0][nxt], col_rings[0][j]), [(u0, 0.02), (u1, 0.05), (u0, 0.05)], 1)
    face((col_rings[-1][j], col_rings[-1][nxt], top_center), [(u0, 0.88), (u1, 0.88), (0.5 * (u0 + u1), 0.96)], 1)

# 2. Pleated oral disc with central recessed slit mouth (material 0: anemone_tentacle_crown, pinned R = 0)
disc_center = Vector((0.006, -0.004, 0.023))
tilt_y = -0.18  # tilt gently forward toward viewer (-Y in Blender = +Z in glTF)
tilt_x = 0.06


def orient_disc_point(local_xy, z_local):
    px = disc_center.x + local_xy[0]
    py = disc_center.y + local_xy[1] * math.cos(tilt_y) - z_local * math.sin(tilt_y)
    pz = disc_center.z + local_xy[1] * math.sin(tilt_y) + z_local * math.cos(tilt_y) + local_xy[0] * tilt_x
    return Vector((px, py, pz))


disc_sides = 32
disc_radial = [
    (0.0035, -0.005, 0.34, 0.02),
    (0.0110,  0.002, 0.44, 0.05),
    (0.0230,  0.000, 0.42, 0.09),
    (0.0360,  0.002, 0.46, 0.13),
    (0.0470,  0.005, 0.52, 0.16),
]
disc_rings = []
for k, (r_base, dz, ao, g_disc) in enumerate(disc_radial):
    ring = []
    for j in range(disc_sides):
        ang = j * 2.0 * math.pi / disc_sides
        # Oval mouth cleft at center, scalloped organic disc edge outward
        rx = r_base * (1.28 if k == 0 else 1.06 + 0.07 * math.cos(ang * 5.0 + 0.25))
        ry = r_base * (0.68 if k == 0 else 0.96 + 0.07 * math.cos(ang * 5.0 + 0.25))
        pleat = 0.0014 * math.sin(ang * 16.0) * smooth(0.0, 3.0, k)
        p = orient_disc_point((rx * math.cos(ang), ry * math.sin(ang)), dz + pleat)
        ring.append(vertex(p, (0.0, g_disc, 0.50, ao)))
    disc_rings.append(ring)

for k in range(len(disc_rings) - 1):
    v0 = 0.02 + 0.12 * (k / (len(disc_radial) - 1))
    v1 = 0.02 + 0.12 * ((k + 1) / (len(disc_radial) - 1))
    for j in range(disc_sides):
        nxt = (j + 1) % disc_sides
        u0 = j / disc_sides
        u1 = (j + 1) / disc_sides
        face((disc_rings[k][j], disc_rings[k][nxt], disc_rings[k + 1][nxt], disc_rings[k + 1][j]),
             [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], 0)

mouth_pole = vertex(orient_disc_point((0.0, 0.0), -0.0065), (0.0, 0.01, 0.50, 0.30))
rim_pole = vertex(orient_disc_point((0.0, 0.0), -0.0030), (0.0, 0.0, 0.50, 0.34))
for j in range(disc_sides):
    nxt = (j + 1) % disc_sides
    u0 = j / disc_sides
    u1 = (j + 1) / disc_sides
    face((mouth_pole, disc_rings[0][j], disc_rings[0][nxt]), [(u0, 0.0), (u0, 0.02), (u1, 0.02)], 0)
    face((disc_rings[-1][nxt], disc_rings[-1][j], rim_pole), [(u1, 0.14), (u0, 0.14), (0.5 * (u0 + u1), 0.04)], 0)

# 3. Concentric phyllotactic rings of bubble-tipped tentacles (104 total -> ~26.7k triangles)
# Ring counts & bubble ratios match live Entacmaea quadricolor colonies
ring_configs = [
    # (count, r_min, r_max, len_min, len_max, elev_deg_range, outward_gain, base_r_range, bubble_prob, sides)
    (12, 0.012, 0.019, 0.068, 0.088, (70.0, 84.0), 0.36, (0.0041, 0.0048), 0.85, 10),
    (18, 0.019, 0.027, 0.082, 0.106, (54.0, 72.0), 0.68, (0.0045, 0.0053), 0.84, 10),
    (24, 0.027, 0.036, 0.090, 0.114, (34.0, 56.0), 0.94, (0.0046, 0.0054), 0.79, 10),
    (26, 0.034, 0.043, 0.088, 0.112, (12.0, 36.0), 1.08, (0.0044, 0.0052), 0.72, 10),
    (24, 0.040, 0.047, 0.074, 0.096, (-14.0, 14.0), 1.02, (0.0038, 0.0046), 0.60, 8),
]

ts = [0.0, 0.10, 0.22, 0.35, 0.48, 0.60, 0.70, 0.78, 0.84, 0.89, 0.935, 0.975, 1.0]
tentacle_idx = 0
for r_idx, (count, r0_min, r0_max, l_min, l_max, elev_rng, out_gain, br_rng, b_prob, sides) in enumerate(ring_configs):
    for i in range(count):
        tentacle_idx += 1
        ang = (i + 0.37 * r_idx) * (2.0 * math.pi / count) + rng.uniform(-0.09, 0.09)
        radial_xy = (math.cos(ang), math.sin(ang))
        r_foot = rng.uniform(r0_min, r0_max)
        # Anchor base just inside disc thickness for clean watertight overlap
        p0 = orient_disc_point((radial_xy[0] * r_foot * 1.05, radial_xy[1] * r_foot * 0.96), 0.001)
        radial_vec = Vector((radial_xy[0], radial_xy[1], 0.0)).normalized()
        side_vec = Vector((-radial_xy[1], radial_xy[0], 0.0))

        # Asymmetrical clownfish-cleared overhang toward +X (right) and -Y_bl (+Z_glTF viewer front)
        bias_x = 0.012 if radial_xy[0] > 0.0 else 0.006
        bias_front = -0.012 if radial_xy[1] < 0.0 else -0.005

        length = rng.uniform(l_min, l_max)
        elev = math.radians(rng.uniform(*elev_rng))
        sway = rng.uniform(-0.022, 0.022)
        dir_horiz = (radial_vec * math.cos(elev) + Vector((0.0, -math.sin(-tilt_y) * 0.35, 0.0))).normalized()

        p3 = p0 + radial_vec * (length * math.cos(elev) * out_gain) + side_vec * sway + Vector((bias_x, bias_front, length * math.sin(elev)))
        p1 = p0 + radial_vec * (length * 0.22 * out_gain) + side_vec * (sway * 0.45) + Vector((0.0, 0.0, length * (0.42 if r_idx <= 2 else 0.28)))
        p2 = p3 - radial_vec * (length * 0.16) - side_vec * (sway * 0.35) + Vector((0.0, -0.004, rng.uniform(0.012, 0.030)))

        pts = []
        for t in ts:
            pt = cubic(p0, p1, p2, p3, t)
            # Subtle organic sinusoidal ripple in mid-shaft
            pt += side_vec * (0.0032 * math.sin(t * math.pi * 1.6 + tentacle_idx * 1.1) * smooth(0.10, 0.85, t))
            pts.append(pt)

        has_bubble = rng.random() < b_prob
        bubble_gain = rng.uniform(0.95, 1.55) if has_bubble else 0.0
        phase = rng.uniform(0.05, 0.95)
        stiff = rng.uniform(0.84, 0.98)
        base_r = rng.uniform(*br_rng)
        bubble_tentacle(pts, ts, base_r, has_bubble, bubble_gain, phase, stiff, material=0, sides=sides)

# Gentle calibration to exact glTF +Y-up target bounds for Left Island clownfish host safety:
# Crown X in [-0.125, +0.155], Y in [0.008, 0.142], Z in [-0.125, +0.140] -> Blender Z in [0.008, 0.142]
max_z = max(v[2] for v in verts)
if max_z > 0.141:
    z_scale = 0.139 / max_z
    verts = [(x, y, z * (z_scale if z > 0.012 else 1.0)) for (x, y, z) in verts]

mesh = bpy.data.meshes.new("Reef_Anemone_Rose_BTA_Mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()
if mesh.validate(verbose=True):
    raise RuntimeError("Mesh validation failed before attributes")

obj = bpy.data.objects.new("Reef_Anemone_Rose_BTA", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Anemone_Arc_UV")
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
    stria = 0.5 + 0.5 * math.cos(ang * 24.0 + 0.3 * math.sin(v * 18.0))
    speckle = 0.5 + 0.5 * math.sin(u * 48.0 + math.cos(v * 64.0) * 1.4) * math.cos(v * 72.0 - u * 31.0)
    vein = 0.5 + 0.5 * math.sin(ang * 9.0 + 0.5 * math.cos(v * 20.0))

    # Creamy-coral oral disc striations -> deep ruby-rose hydrostat shaft -> translucent glowing rose-pink bubble -> pale ruby acrosphere
    c_disc = (0.48 + 0.24 * stria, 0.20 + 0.14 * stria, 0.22 + 0.14 * stria)
    c_shaft = (0.58 + 0.16 * vein, 0.08 + 0.06 * speckle, 0.18 + 0.09 * speckle)
    c_bubble = (0.90 + 0.08 * speckle, 0.22 + 0.16 * vein, 0.42 + 0.16 * speckle)
    c_tip = (0.96, 0.46 + 0.16 * speckle, 0.64)

    t1 = smooth(0.06, 0.26, v)
    t2 = smooth(0.62, 0.82, v)
    t3 = smooth(0.86, 0.97, v)
    col = [c_disc[i] * (1.0 - t1) + c_shaft[i] * t1 for i in range(3)]
    col = [col[i] * (1.0 - t2) + c_bubble[i] * t2 for i in range(3)]
    col = [col[i] * (1.0 - t3) + c_tip[i] * t3 for i in range(3)]
    return tuple(col)


def tissue_normal(u, v):
    ang = u * 2.0 * math.pi
    flute_x = 0.08 * math.sin(ang * 24.0) * (1.0 - 0.6 * smooth(0.55, 0.90, v))
    ring_y = 0.045 * math.cos(v * 34.0 * math.pi) * smooth(0.20, 0.78, v)
    n = Vector((flute_x, ring_y, 1.0)).normalized()
    return (0.5 + 0.5 * n.x, 0.5 + 0.5 * n.y, 0.5 + 0.5 * n.z)


def tissue_roughness(u, v):
    mucus = 0.26 + 0.12 * (1.0 - smooth(0.45, 0.90, v)) + 0.04 * math.sin(2.0 * math.pi * (u * 7.0 + v * 5.0))
    return (mucus, mucus, mucus)


def column_albedo(u, v):
    ang = u * 2.0 * math.pi
    pap = smooth(0.28, 0.82, 0.5 + 0.5 * math.sin(ang * 36.0 + v * 28.0) * math.cos(v * 38.0 - ang * 22.0))
    fold = 0.5 + 0.5 * math.cos(ang * 5.0 + 0.35)
    base = (0.42 + 0.22 * fold + 0.14 * pap, 0.10 + 0.08 * fold + 0.08 * pap, 0.09 + 0.06 * pap)
    rim = (0.64, 0.30, 0.26)
    t_rim = smooth(0.75, 0.98, v)
    return tuple(base[i] * (1.0 - t_rim) + rim[i] * t_rim for i in range(3))


def column_normal(u, v):
    ang = u * 2.0 * math.pi
    nx = 0.16 * math.cos(ang * 36.0 + v * 28.0) + 0.06 * math.sin(ang * 15.0)
    ny = 0.14 * math.sin(v * 38.0 - ang * 22.0)
    n = Vector((nx, ny, 1.0)).normalized()
    return (0.5 + 0.5 * n.x, 0.5 + 0.5 * n.y, 0.5 + 0.5 * n.z)


def column_roughness(u, v):
    val = 0.52 + 0.10 * math.sin(2.0 * math.pi * (u * 11.0 + v * 9.0))
    return (val, val, val)


for label, mat_id, size, fn_a, fn_n, fn_r in [
    ("tissue", 0, 512, tissue_albedo, tissue_normal, tissue_roughness),
    ("column", 1, 256, column_albedo, column_normal, column_roughness),
]:
    base = make_image(label + "-albedo", size, fn_a, False)
    nrm = make_image(label + "-normal", size, fn_n, True)
    rough = make_image(label + "-roughness", size, fn_r, True)

    mat = bpy.data.materials.new("Rose_BTA_" + label.title())
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
        bsdf.inputs["Coat Weight"].default_value = 0.16
        bsdf.inputs["Coat Roughness"].default_value = 0.24

    mat["reefPrimitive"] = {
        "id": "anemone_tentacle_crown" if mat_id == 0 else "anemone_column_disc",
        "role": "coral-soft" if mat_id == 0 else "coral-rigid",
        "maskSchema": "coral-raw-masks-v1",
    }
    mesh.materials.append(mat)

obj["authoring_notes"] = (
    "Original Rose Bubble-Tip Anemone (Entacmaea quadricolor), 104 hydrostat bubble-tipped tentacles, "
    "pleated oral disc, and crevice-tucked 5-lobed verrucose pedal column. Soft crown R arc flex (13 levels), "
    "rigid column R=0 everywhere, G acrosphere tip fluorescence mask, B strict (0,1) phase seed, A contact AO. "
    "Zero imported visual assets."
)

triangulate = obj.modifiers.new("Stable_Export_Triangles", "TRIANGULATE")
bpy.ops.object.modifier_apply(modifier=triangulate.name)
mesh = obj.data
if mesh.validate(verbose=True):
    raise RuntimeError("Final native mesh validation failed")
mesh.calc_loop_triangles()
triangles = len(mesh.loop_triangles)
if triangles > 29500:
    raise RuntimeError(f"Triangle count {triangles} exceeds target ceiling 29500")

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
print(
    "ROSE_BTA_SAVED_EXPORTED",
    json.dumps({
        "triangles": triangles,
        "vertices": len(mesh.vertices),
        "tentacles": tentacle_idx,
        "dimensions": [round(float(v), 4) for v in obj.dimensions],
        "bboxMin": [round(min(v[i] for v in verts), 4) for i in range(3)],
        "bboxMax": [round(max(v[i] for v in verts), 4) for i in range(3)],
    }),
    flush=True,
)

# Add neutral inspection lighting AFTER save/export so MCP `look` previews clearly without polluting exported GLB.
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
