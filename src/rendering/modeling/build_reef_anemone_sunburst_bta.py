"""Original Colorado Sunburst Bubble-Tip Anemone (Entacmaea quadricolor) Variant #2 (AQ-70.11).
Lower, wider asymmetrical wind-swept rosette with double-pinched pear vesicles & sunburst palette.
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
ID = "reef-anemone-sunburst-bta"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261122)


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


def sunburst_tentacle(points, ts, base_r, has_bubble, bubble_gain, phase, stiff, material=0, sides=10):
    frames = build_bishop_frames(points)
    rings = []
    # Double-pinched pear-shaped sub-terminal vesicle profile for Variant #2
    for k, (p, t) in enumerate(zip(points, ts)):
        n, b, _tan = frames[k]
        if has_bubble:
            root_flare = 1.0 + 0.34 * (1.0 - smooth(0.0, 0.22, t))
            neck_pinch = 1.0 - 0.38 * math.exp(-((t - 0.50) / 0.12) ** 2)
            # Pear-shaped main bulb + subtle secondary mid-vesicle bead
            pear_vesicle = (
                bubble_gain * 0.92 * math.exp(-((t - 0.78) / 0.095) ** 2)
                + bubble_gain * 0.36 * math.exp(-((t - 0.88) / 0.055) ** 2)
            )
            tip_taper = math.sqrt(max(0.018, 1.0 - smooth(0.90, 1.0, t) ** 2))
            radius = base_r * (root_flare * neck_pinch + pear_vesicle) * tip_taper
            ecc = 0.09 * math.sin(phase * 13.0 + t * 6.0)
        else:
            root_flare = 1.0 + 0.32 * (1.0 - smooth(0.0, 0.24, t))
            beaded = 0.22 * math.exp(-((t - 0.74) / 0.14) ** 2)
            tip_taper = math.sqrt(max(0.018, 1.0 - smooth(0.87, 1.0, t) ** 2))
            radius = base_r * (root_flare * (1.0 - 0.35 * smooth(0.14, 0.72, t)) + beaded) * tip_taper
            ecc = 0.05 * math.cos(phase * 10.0 + t * 4.5)

        r_flex = 0.0 if t <= 0.0 else min(0.985, (t ** 1.55) * stiff)
        g_tip = smooth(0.66, 0.99, t)
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
    tip_p = points[-1] + frames[-1][2] * (base_r * (0.28 if has_bubble else 0.22))
    tip_idx = vertex(tip_p, (min(0.99, stiff), 1.0, phase, 1.0))
    for j in range(sides):
        nxt = (j + 1) % sides
        u0 = j / sides + phase * 0.5
        u1 = (j + 1) / sides + phase * 0.5
        face((rings[-1][j], rings[-1][nxt], tip_idx), [(u0, 0.985), (u1, 0.985), (0.5 * (u0 + u1), 1.0)], material)


# 1. Rigid tucked verrucose pedal column in burnt sienna / dark umber (anemone_column_disc, R = 0)
col_specs = [
    (-0.020, 0.016, 0.34, 0.0),
    (-0.013, 0.023, 0.44, 0.0),
    (-0.003, 0.029, 0.56, 0.0),
    ( 0.008, 0.032, 0.66, 0.05),
    ( 0.016, 0.034, 0.74, 0.14),
    ( 0.022, 0.031, 0.78, 0.22),
]
col_sides = 24
col_rings = []
for k, (z_val, rad, ao, g_rim) in enumerate(col_specs):
    ring = []
    for j in range(col_sides):
        ang = j * 2.0 * math.pi / col_sides
        lobe = 1.0 + 0.075 * math.sin(ang * 5.0 + 0.65) + 0.03 * math.cos(ang * 10.0 + k * 0.7)
        rr = rad * lobe
        p = Vector((rr * math.cos(ang) * 1.01,
                    rr * math.sin(ang) * 0.97,
                    z_val + 0.0010 * math.cos(ang * 2.0)))
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

bot_center = vertex(Vector((0.0, 0.0, -0.020)), (0.0, 0.0, 0.50, 0.30))
top_center = vertex(Vector((0.0, 0.0, 0.018)), (0.0, 0.20, 0.50, 0.72))
for j in range(col_sides):
    nxt = (j + 1) % col_sides
    u0 = j / col_sides
    u1 = (j + 1) / col_sides
    face((bot_center, col_rings[0][nxt], col_rings[0][j]), [(u0, 0.02), (u1, 0.05), (u0, 0.05)], 1)
    face((col_rings[-1][j], col_rings[-1][nxt], top_center), [(u0, 0.88), (u1, 0.88), (0.5 * (u0 + u1), 0.96)], 1)

# 2. Wider asymmetrical olive-bronze pleated oral disc tilted gently viewerward (pinned R = 0)
disc_center = Vector((0.0, -0.005, 0.020))
tilt_y = -0.22
tilt_x = -0.04


def orient_disc_point(local_xy, z_local):
    px = disc_center.x + local_xy[0]
    py = disc_center.y + local_xy[1] * math.cos(tilt_y) - z_local * math.sin(tilt_y)
    pz = disc_center.z + local_xy[1] * math.sin(tilt_y) + z_local * math.cos(tilt_y) + local_xy[0] * tilt_x
    return Vector((px, py, pz))


disc_sides = 32
disc_radial = [
    (0.0040, -0.005, 0.34, 0.02),
    (0.0130,  0.002, 0.44, 0.05),
    (0.0260,  0.000, 0.44, 0.09),
    (0.0400,  0.002, 0.48, 0.13),
    (0.0510,  0.004, 0.54, 0.16),
]
disc_rings = []
for k, (r_base, dz, ao, g_disc) in enumerate(disc_radial):
    ring = []
    for j in range(disc_sides):
        ang = j * 2.0 * math.pi / disc_sides
        rx = r_base * (1.24 if k == 0 else 1.08 + 0.08 * math.sin(ang * 5.0 + 0.4))
        ry = r_base * (0.72 if k == 0 else 0.96 + 0.07 * math.sin(ang * 5.0 + 0.4))
        pleat = 0.0014 * math.cos(ang * 16.0) * smooth(0.0, 3.0, k)
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

# 3. 108 sweeping wind-swept sunburst tentacles with cascading outer skirt (~26.7k tris)
ring_configs = [
    # (count, r_min, r_max, len_min, len_max, elev_deg_range, outward_gain, base_r_range, bubble_prob, sides)
    (12, 0.013, 0.020, 0.058, 0.076, (64.0, 79.0), 0.40, (0.0040, 0.0047), 0.85, 10),
    (18, 0.020, 0.028, 0.074, 0.094, (45.0, 64.0), 0.72, (0.0043, 0.0051), 0.84, 10),
    (24, 0.028, 0.037, 0.080, 0.102, (24.0, 46.0), 0.96, (0.0044, 0.0052), 0.78, 10),
    (28, 0.036, 0.045, 0.078, 0.098, (4.0, 26.0), 1.06, (0.0041, 0.0049), 0.70, 10),
    (26, 0.043, 0.051, 0.068, 0.086, (-20.0, 6.0), 1.00, (0.0036, 0.0044), 0.58,  8),
]

ts = [0.0, 0.10, 0.22, 0.35, 0.48, 0.60, 0.70, 0.78, 0.84, 0.89, 0.935, 0.975, 1.0]
tentacle_idx = 0
for r_idx, (count, r0_min, r0_max, l_min, l_max, elev_rng, out_gain, br_rng, b_prob, sides) in enumerate(ring_configs):
    for i in range(count):
        tentacle_idx += 1
        ang = (i + 0.41 * r_idx) * (2.0 * math.pi / count) + rng.uniform(-0.08, 0.08)
        radial_xy = (math.cos(ang), math.sin(ang))
        r_foot = rng.uniform(r0_min, r0_max)
        p0 = orient_disc_point((radial_xy[0] * r_foot * 1.06, radial_xy[1] * r_foot * 0.96), 0.001)
        radial_vec = Vector((radial_xy[0], radial_xy[1], 0.0)).normalized()
        side_vec = Vector((-radial_xy[1], radial_xy[0], 0.0))

        # Wind-swept asymmetrical drift in reef flow (+X slightly and front -Y_bl) while fitting inside legacy bounds
        drift_vec = Vector((0.011 * (0.4 + 0.6 * smooth(0.0, 4.0, r_idx)),
                            -0.008 * (0.4 + 0.6 * smooth(0.0, 4.0, r_idx)),
                            0.0))

        length = rng.uniform(l_min, l_max)
        elev = math.radians(rng.uniform(*elev_rng))
        sway = rng.uniform(-0.018, 0.018)

        p3 = p0 + radial_vec * (length * math.cos(elev) * out_gain) + side_vec * sway + drift_vec + Vector((0.0, 0.0, length * math.sin(elev)))
        p1 = p0 + radial_vec * (length * 0.22 * out_gain) + side_vec * (sway * 0.45) + Vector((0.0, 0.0, length * (0.36 if r_idx <= 2 else 0.22)))
        p2 = p3 - radial_vec * (length * 0.15) - side_vec * (sway * 0.35) + drift_vec * 0.35 + Vector((0.0, -0.003, rng.uniform(0.008, 0.022)))

        pts = []
        for t in ts:
            pt = cubic(p0, p1, p2, p3, t)
            # Gentle helical S-wave ripple along cascading tentacles
            pt += side_vec * (0.0038 * math.sin(t * math.pi * 1.9 + tentacle_idx * 0.85) * smooth(0.08, 0.85, t))
            pts.append(pt)

        has_bubble = rng.random() < b_prob
        bubble_gain = rng.uniform(0.92, 1.48) if has_bubble else 0.0
        phase = rng.uniform(0.05, 0.95)
        stiff = rng.uniform(0.84, 0.98)
        base_r = rng.uniform(*br_rng)
        sunburst_tentacle(pts, ts, base_r, has_bubble, bubble_gain, phase, stiff, material=0, sides=sides)

# Keep strict glTF +Y-up target bounds well inside legacy coral-anemone-bta so Right Island moray clearance is preserved:
# X in [-0.128, +0.128], Blender Z (glTF Y) <= 0.126, Blender Y in [-0.130, +0.114]
def clamp_axis(val, lo, hi):
    return max(lo, min(hi, val))

min_x = min(v[0] for v in verts)
max_x = max(v[0] for v in verts)
max_abs_x = max(abs(min_x), abs(max_x))
sx = 0.126 / max_abs_x if max_abs_x > 0.126 else 1.0
min_y = min(v[1] for v in verts)
max_y = max(v[1] for v in verts)
sy_neg = 0.128 / abs(min_y) if min_y < -0.128 else 1.0
sy_pos = 0.112 / max_y if max_y > 0.112 else 1.0
sy = min(sy_neg, sy_pos)
max_z = max(v[2] for v in verts)
sz = 0.124 / max_z if max_z > 0.124 else 1.0

verts = [
    (x * (sx if abs(x) > 0.036 else 1.0),
     y * (sy if abs(y) > 0.036 else 1.0),
     z * (sz if z > 0.025 else 1.0))
    for (x, y, z) in verts
]

mesh = bpy.data.meshes.new("Reef_Anemone_Sunburst_BTA_Mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()
if mesh.validate(verbose=True):
    raise RuntimeError("Mesh validation failed before attributes")

obj = bpy.data.objects.new("Reef_Anemone_Sunburst_BTA", mesh)
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
    stria = 0.5 + 0.5 * math.cos(ang * 26.0 + 0.35 * math.sin(v * 20.0))
    speckle = 0.5 + 0.5 * math.sin(u * 52.0 + math.cos(v * 68.0) * 1.5) * math.cos(v * 76.0 - u * 35.0)
    vein = 0.5 + 0.5 * math.sin(ang * 8.0 + 0.5 * math.cos(v * 18.0))

    # Dark olive-bronze speckled oral disc -> fiery tangerine-copper midshaft -> golden-apricot pear bubble -> rose-amber/chartreuse tip
    c_disc = (0.26 + 0.18 * stria + 0.08 * speckle, 0.25 + 0.16 * stria + 0.10 * speckle, 0.10 + 0.06 * stria)
    c_shaft = (0.86 + 0.10 * vein, 0.28 + 0.14 * speckle, 0.06 + 0.05 * speckle)
    c_bubble = (0.98, 0.62 + 0.18 * vein + 0.08 * speckle, 0.12 + 0.10 * speckle)
    c_tip = (0.98, 0.44 + 0.22 * speckle, 0.28 + 0.14 * stria)

    t1 = smooth(0.06, 0.26, v)
    t2 = smooth(0.58, 0.80, v)
    t3 = smooth(0.86, 0.97, v)
    col = [c_disc[i] * (1.0 - t1) + c_shaft[i] * t1 for i in range(3)]
    col = [col[i] * (1.0 - t2) + c_bubble[i] * t2 for i in range(3)]
    col = [col[i] * (1.0 - t3) + c_tip[i] * t3 for i in range(3)]
    return tuple(col)


def tissue_normal(u, v):
    ang = u * 2.0 * math.pi
    flute_x = 0.075 * math.sin(ang * 24.0) * (1.0 - 0.55 * smooth(0.52, 0.88, v))
    ring_y = 0.05 * math.cos(v * 38.0 * math.pi) * smooth(0.18, 0.78, v)
    n = Vector((flute_x, ring_y, 1.0)).normalized()
    return (0.5 + 0.5 * n.x, 0.5 + 0.5 * n.y, 0.5 + 0.5 * n.z)


def tissue_roughness(u, v):
    mucus = 0.24 + 0.13 * (1.0 - smooth(0.45, 0.90, v)) + 0.04 * math.cos(2.0 * math.pi * (u * 7.0 + v * 5.0))
    return (mucus, mucus, mucus)


def column_albedo(u, v):
    ang = u * 2.0 * math.pi
    pap = smooth(0.26, 0.82, 0.5 + 0.5 * math.cos(ang * 34.0 + v * 26.0) * math.sin(v * 36.0 - ang * 20.0))
    fold = 0.5 + 0.5 * math.sin(ang * 5.0 + 0.65)
    base = (0.36 + 0.20 * fold + 0.14 * pap, 0.14 + 0.08 * fold + 0.08 * pap, 0.08 + 0.05 * pap)
    rim = (0.56, 0.34, 0.20)
    t_rim = smooth(0.75, 0.98, v)
    return tuple(base[i] * (1.0 - t_rim) + rim[i] * t_rim for i in range(3))


def column_normal(u, v):
    ang = u * 2.0 * math.pi
    nx = 0.15 * math.cos(ang * 34.0 + v * 26.0) + 0.06 * math.sin(ang * 15.0)
    ny = 0.14 * math.sin(v * 36.0 - ang * 20.0)
    n = Vector((nx, ny, 1.0)).normalized()
    return (0.5 + 0.5 * n.x, 0.5 + 0.5 * n.y, 0.5 + 0.5 * n.z)


def column_roughness(u, v):
    val = 0.54 + 0.09 * math.sin(2.0 * math.pi * (u * 9.0 + v * 7.0))
    return (val, val, val)


for label, mat_id, size, fn_a, fn_n, fn_r in [
    ("tissue", 0, 512, tissue_albedo, tissue_normal, tissue_roughness),
    ("column", 1, 256, column_albedo, column_normal, column_roughness),
]:
    base = make_image(label + "-albedo", size, fn_a, False)
    nrm = make_image(label + "-normal", size, fn_n, True)
    rough = make_image(label + "-roughness", size, fn_r, True)

    mat = bpy.data.materials.new("Sunburst_BTA_" + label.title())
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
    "Original Colorado Sunburst Bubble-Tip Anemone (Entacmaea quadricolor) Variant #2, 108 wind-swept tentacles "
    "with double-pinched pear vesicles, wide olive-bronze oral disc, and compact burnt-sienna crevice column. "
    "Soft crown R arc flex (13 levels), rigid column R=0 everywhere, G tip fluorescence, B strict (0,1) phase seed, "
    "A contact AO. Zero imported visual assets."
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
    "SUNBURST_BTA_SAVED_EXPORTED",
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
