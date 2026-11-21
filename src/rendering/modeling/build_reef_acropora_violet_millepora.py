"""Original Royal Violet Cushion Acropora millepora colony (AQ-70.11).
Dense corymbose cushion of sturdy upward-curving branches studded with scale-like
nariform radial corallite cups and stubby lilac axial growth tips.
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
ID = "reef-acropora-violet-millepora"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261127)


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


def nariform_corallite_cup(anchor_p, out_dir, branch_tan, cup_r, cup_len, g_base, phase, ao_base):
    """Scale-like labiate/nariform radial corallite cup typical of Acropora millepora."""
    t_dir = (out_dir * 0.65 + branch_tan * 0.76).normalized()
    ref = branch_tan if abs(t_dir.dot(branch_tan)) < 0.92 else Vector((0.0, 0.0, 1.0))
    n = (ref - t_dir * ref.dot(t_dir)).normalized()
    b = t_dir.cross(n).normalized()

    sides = 6
    # Base collar -> flared scoop belly -> pursed rim
    specs = [
        (0.00, 1.15, max(0.06, g_base * 0.92), max(0.28, ao_base * 0.90)),
        (0.58, 0.98, min(0.88, g_base + 0.08), min(0.98, ao_base + 0.08)),
        (1.00, 0.62, min(0.95, g_base + 0.14), min(1.00, ao_base + 0.14)),
    ]
    rings = []
    for lk, rk, g_k, ao_k in specs:
        c = anchor_p + t_dir * (cup_len * lk)
        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            # Slightly flatten the inner face and flare the outer lower lip like a scallop scale
            lip_flare = 1.0 + 0.18 * math.cos(phi - math.pi) if lk > 0.3 else 1.0
            ring.append(
                vertex(
                    c + (math.cos(phi) * n * 0.88 + math.sin(phi) * b * 1.10) * (cup_r * rk * lip_flare),
                    (0.0, g_k, phase, ao_k),
                )
            )
        rings.append(ring)

    for k in range(len(rings) - 1):
        v0 = min(0.80, 0.24 + 0.25 * k)
        v1 = min(0.84, 0.24 + 0.25 * (k + 1))
        for j in range(sides):
            nxt = (j + 1) % sides
            face(
                (rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]),
                [(j / sides, v0), ((j + 1) / sides, v0), ((j + 1) / sides, v1), (j / sides, v1)],
            )
    bot = vertex(anchor_p - t_dir * (cup_len * 0.25), (0.0, max(0.02, g_base * 0.78), phase, max(0.24, ao_base * 0.85)))
    tip = vertex(anchor_p + t_dir * (cup_len * 0.88), (0.0, min(0.96, g_base + 0.18), phase, min(1.0, ao_base + 0.16)))
    for j in range(sides):
        nxt = (j + 1) % sides
        face((bot, rings[0][nxt], rings[0][j]), [(j / sides, 0.20), ((j + 1) / sides, 0.24), (j / sides, 0.24)])
        face((rings[-1][j], rings[-1][nxt], tip), [(j / sides, 0.80), ((j + 1) / sides, 0.80), ((j + 0.5) / sides, 0.86)])


def millepora_branch(p0, p1, p2, p3, r0, r1, t_start_g, t_start_ao, phase, cups_target=13, sides=10):
    steps = 11
    ts = [i / (steps - 1) for i in range(steps)]
    pts = [cubic(p0, p1, p2, p3, t) for t in ts]
    frames = build_bishop_frames(pts)

    rings = []
    for k, (p, t) in enumerate(zip(pts, ts)):
        n, b, _ = frames[k]
        # Sturdy slightly clubbed millepora profile with a stubby blunt dome axial corallite tip
        club = 1.0 + 0.10 * math.sin(smooth(0.15, 0.85, t) * math.pi)
        taper = 1.0 - smooth(0.84, 1.0, t) * 0.42
        rad = (r0 * (1.0 - t) + r1 * t) * club * taper
        g_val = t_start_g + (1.0 - t_start_g) * smooth(0.10, 0.99, t)
        if t <= 0.001 and t_start_g <= 0.001:
            g_val = 0.0
        elif t >= 0.999:
            g_val = 1.0
        ao_val = t_start_ao + (1.0 - t_start_ao) * smooth(0.0, 0.82, t)
        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            bump = 1.0 + 0.05 * math.sin(phi * 4.0 + k * 1.9 + phase * 8.0)
            ring.append(vertex(p + (math.cos(phi) * n + math.sin(phi) * b) * (rad * bump), (0.0, g_val, phase, ao_val)))
        rings.append(ring)

    for k in range(len(rings) - 1):
        v0 = 0.08 + 0.90 * ts[k]
        v1 = 0.08 + 0.90 * ts[k + 1]
        for j in range(sides):
            nxt = (j + 1) % sides
            face(
                (rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]),
                [(j / sides + phase, v0), ((j + 1) / sides + phase, v0), ((j + 1) / sides + phase, v1), (j / sides + phase, v1)],
            )

    base_pole = vertex(pts[0] - frames[0][2] * (r0 * 0.30), (0.0, t_start_g, phase, t_start_ao))
    axial_tip = vertex(pts[-1] + frames[-1][2] * (r1 * 0.68), (0.0, 1.0, phase, 1.0))
    for j in range(sides):
        nxt = (j + 1) % sides
        face((base_pole, rings[0][nxt], rings[0][j]), [(j / sides, 0.05), ((j + 1) / sides, 0.08), (j / sides, 0.08)])
        face((rings[-1][j], rings[-1][nxt], axial_tip), [(j / sides, 0.96), ((j + 1) / sides, 0.96), ((j + 0.5) / sides, 1.0)])

    cup_count = 0
    for ci in range(cups_target):
        frac = 0.14 + 0.76 * ((ci + 0.35) / cups_target)
        st = min(steps - 2, max(1, round(frac * (steps - 1))))
        p_st = pts[st]
        n, b, tan = frames[st]
        ang = ci * 2.399963 + phase * 11.0
        out_dir = (math.cos(ang) * n + math.sin(ang) * b).normalized()
        rad_at = (r0 * (1.0 - frac) + r1 * frac) * (1.0 - smooth(0.84, 1.0, frac) * 0.42)
        anchor = p_st + out_dir * (rad_at * 0.70)
        g_local = min(0.90, t_start_g + (1.0 - t_start_g) * frac)
        ao_local = t_start_ao + (1.0 - t_start_ao) * frac
        nariform_corallite_cup(anchor, out_dir, tan, rad_at * 0.40, rad_at * 0.72, g_local, phase, ao_local)
        cup_count += 1
    return pts, cup_count


# 1. Broad encrusted calcareous holdfast cushion (z = 0.0 .. 0.022)
hold_sides = 18
hold_specs = [
    (0.000, 0.028, 0.00, 0.14),
    (0.005, 0.036, 0.03, 0.22),
    (0.014, 0.032, 0.07, 0.30),
    (0.024, 0.022, 0.12, 0.38),
]
hold_rings = []
for z_val, rad, g_val, ao_val in hold_specs:
    ring = []
    for j in range(hold_sides):
        ang = j * 2.0 * math.pi / hold_sides
        lobe = 1.0 + 0.16 * math.cos(ang * 5.0 + 0.3) + 0.08 * math.sin(ang * 3.0 - 0.7)
        ring.append(vertex(Vector((math.cos(ang) * rad * lobe, math.sin(ang) * rad * lobe * 0.80, z_val)), (0.0, g_val, 0.50, ao_val)))
    hold_rings.append(ring)

for k in range(len(hold_rings) - 1):
    for j in range(hold_sides):
        nxt = (j + 1) % hold_sides
        face(
            (hold_rings[k][j], hold_rings[k][nxt], hold_rings[k + 1][nxt], hold_rings[k + 1][j]),
            [(j / hold_sides, k * 0.04), ((j + 1) / hold_sides, k * 0.04), ((j + 1) / hold_sides, (k + 1) * 0.04), (j / hold_sides, (k + 1) * 0.04)],
        )

h_bot = vertex(Vector((0.0, 0.0, 0.0)), (0.0, 0.0, 0.50, 0.14))
h_top = vertex(Vector((0.0, 0.0, 0.026)), (0.0, 0.14, 0.50, 0.42))
for j in range(hold_sides):
    nxt = (j + 1) % hold_sides
    face((h_bot, hold_rings[0][nxt], hold_rings[0][j]), [(j / hold_sides, 0.0), ((j + 1) / hold_sides, 0.02), (j / hold_sides, 0.02)])
    face((hold_rings[-1][j], hold_rings[-1][nxt], h_top), [(j / hold_sides, 0.12), ((j + 1) / hold_sides, 0.12), ((j + 0.5) / hold_sides, 0.15)])


# 2. Dense corymbose cushion dome: central upright stalks + two concentric rings curving upward
# Elliptical footprint matching legacy table space (wider X, shallower Y)
total_cups = 0
center_stems = [
    (Vector((-0.012,  0.002, 0.016)), Vector((-0.020,  0.005, 0.138)), 0.0095, 0.0058, 0.18),
    (Vector(( 0.014, -0.004, 0.016)), Vector(( 0.022, -0.006, 0.142)), 0.0095, 0.0058, 0.34),
    (Vector(( 0.000,  0.014, 0.016)), Vector(( 0.002,  0.028, 0.134)), 0.0088, 0.0054, 0.52),
    (Vector((-0.002, -0.012, 0.016)), Vector((-0.004, -0.026, 0.132)), 0.0088, 0.0054, 0.68),
]
for p0, p3, r0, r1, ph in center_stems:
    mid1 = p0.lerp(p3, 0.35) + Vector((rng.uniform(-0.006, 0.006), rng.uniform(-0.006, 0.006), 0.004))
    mid2 = p0.lerp(p3, 0.72) + Vector((rng.uniform(-0.005, 0.005), rng.uniform(-0.005, 0.005), 0.002))
    pts_m, cnt = millepora_branch(p0, mid1, mid2, p3, r0, r1, 0.12, 0.28, ph, cups_target=15, sides=10)
    total_cups += cnt

    # Side bifurcation off upper center stem for cushion fullness
    fp0 = pts_m[4]
    off_ang = ph * 9.0 + rng.uniform(-0.4, 0.4)
    fp3 = fp0 + Vector((math.cos(off_ang) * 0.022, math.sin(off_ang) * 0.016, 0.054))
    _, cnt_f = millepora_branch(
        fp0,
        fp0 + Vector((math.cos(off_ang) * 0.014, math.sin(off_ang) * 0.010, 0.018)),
        fp3 - Vector((0.0, 0.0, 0.020)),
        fp3,
        0.0065,
        0.0048,
        0.44,
        0.58,
        min(0.90, ph + 0.09),
        cups_target=9,
        sides=8,
    )
    total_cups += cnt_f

# Inner & outer radiating corymbose whorl rings (20 upturned perimeter branches)
for ring_idx, (count, rx_rad, ry_rad, z_apex, r_base, r_tip, fork_prob) in enumerate([
    (9,  0.064, 0.044, 0.122, 0.0084, 0.0052, 0.65),
    (13, 0.094, 0.062, 0.096, 0.0076, 0.0048, 0.40),
]):
    for i in range(count):
        az = (i + 0.35 * ring_idx) * (2.0 * math.pi / count) + rng.uniform(-0.08, 0.08)
        ca, sa = math.cos(az), math.sin(az)
        ph = 0.10 + 0.80 * (((ring_idx * 13 + i) % 19) / 19.0)
        p0 = Vector((ca * 0.016, sa * 0.012, 0.014 + 0.002 * (1 - ring_idx)))
        px_out = ca * (rx_rad + rng.uniform(-0.007, 0.008))
        py_out = sa * (ry_rad + rng.uniform(-0.005, 0.006))
        pz_out = z_apex + rng.uniform(-0.008, 0.010)
        # Graceful sweeping curve: radiates outward low over rock, then turns crisp vertically upward
        p1 = Vector((px_out * 0.55, py_out * 0.55, 0.022 + 0.008 * (1 - ring_idx)))
        p2 = Vector((px_out * 0.94, py_out * 0.94, pz_out * 0.55))
        p3 = Vector((px_out, py_out, pz_out))
        pts_r, cnt_r = millepora_branch(p0, p1, p2, p3, r_base, r_tip, 0.08, 0.24, ph, cups_target=12, sides=10)
        total_cups += cnt_r

        if rng.random() < fork_prob:
            st_idx = 5 if ring_idx == 0 else 4
            sp0 = pts_r[st_idx]
            sub_az = az + rng.choice((-1.0, 1.0)) * rng.uniform(0.24, 0.44)
            s_reach = 0.022 if ring_idx == 0 else 0.020
            sp3 = sp0 + Vector((math.cos(sub_az) * s_reach, math.sin(sub_az) * s_reach * 0.82, rng.uniform(0.036, 0.050)))
            sp1 = sp0 + Vector((math.cos(sub_az) * s_reach * 0.55, math.sin(sub_az) * s_reach * 0.45, 0.014))
            sp2 = sp3 - Vector((0.0, 0.0, 0.018))
            _, cnt_s = millepora_branch(
                sp0, sp1, sp2, sp3, r_base * 0.72, r_tip * 0.92, 0.38, 0.52, max(0.09, ph - 0.07), cups_target=8, sides=8
            )
            total_cups += cnt_s

# Fit strictly inside legacy coral-acropora-table [0.223, 0.173, 0.156] -> target <= [0.208, 0.152, 0.146]
xs = [v[0] for v in verts]
ys = [v[1] for v in verts]
zs = [v[2] for v in verts]
cx = 0.5 * (min(xs) + max(xs))
cy = 0.5 * (min(ys) + max(ys))
z0 = min(zs)
sx = 0.206 / max(1e-5, max(xs) - min(xs))
sy = 0.146 / max(1e-5, max(ys) - min(ys))
sz = 0.150 / max(1e-5, max(zs) - z0)
sc = min(1.0, sx, sy, sz)
verts = [((x - cx) * sc, (y - cy) * sc, (z - z0) * sc) for (x, y, z) in verts]

mesh = bpy.data.meshes.new("Reef_Acropora_Violet_Millepora_Mesh")
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

obj = bpy.data.objects.new("Reef_Acropora_Violet_Millepora", mesh)
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


def millepora_albedo(u, v):
    grain = 0.5 + 0.5 * math.sin(u * 62.0 + math.cos(v * 58.0) * 1.5) * math.cos(v * 52.0 - u * 34.0)
    flute = 0.5 + 0.5 * math.cos(u * 2.0 * math.pi * 16.0 + 0.4 * math.sin(v * 22.0))
    # Deep indigo holdfast -> rich royal violet stem -> bright lilac-lavender axial tips
    c_base = (0.16 + 0.05 * grain, 0.10 + 0.04 * grain, 0.24 + 0.06 * flute)
    c_mid = (0.36 + 0.10 * flute, 0.20 + 0.07 * grain, 0.58 + 0.12 * flute)
    c_tip = (0.80 + 0.12 * grain, 0.68 + 0.14 * grain, 0.96)
    t1 = smooth(0.06, 0.50, v)
    t2 = smooth(0.76, 0.98, v)
    col = [c_base[i] * (1.0 - t1) + c_mid[i] * t1 for i in range(3)]
    col = [col[i] * (1.0 - t2) + c_tip[i] * t2 for i in range(3)]
    return tuple(col)


def millepora_normal(u, v):
    ang = u * 2.0 * math.pi
    nx = 0.16 * math.sin(ang * 22.0 + v * 30.0)
    ny = 0.16 * math.cos(v * 42.0 - ang * 14.0)
    n = Vector((nx, ny, 1.0)).normalized()
    return (0.5 + 0.5 * n.x, 0.5 + 0.5 * n.y, 0.5 + 0.5 * n.z)


def millepora_roughness(u, v):
    val = 0.74 - 0.18 * smooth(0.72, 0.98, v) + 0.08 * math.sin(2.0 * math.pi * (u * 11.0 + v * 7.0))
    return (val, val, val)


base = make_image("albedo", 512, millepora_albedo, False)
nrm = make_image("normal", 512, millepora_normal, True)
rough = make_image("roughness", 512, millepora_roughness, True)

mat = bpy.data.materials.new("Acropora_Millepora_Violet_SPS")
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
nm.inputs["Strength"].default_value = 0.80
links.new(ntex.outputs["Color"], nm.inputs["Color"])
links.new(nm.outputs[0], bsdf.inputs["Normal"])
mesh.materials.append(mat)

obj["authoring_notes"] = (
    "Original Royal Violet Cushion Acropora millepora (AQ-70.11), corymbose cushion dome with "
    "nariform scale corallites & lilac axial tips, 3 packed 512px PBR maps, raw rigid COLOR_0 masks."
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
print("MILLEPORA_SAVED_EXPORTED", json.dumps({
    "triangles": triangles,
    "vertices": len(mesh.vertices),
    "coralliteCups": total_cups,
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
