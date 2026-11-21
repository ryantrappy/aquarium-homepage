"""Original Open Staghorn Acropora (A. cervicornis / A. formosa) thicket morphology (AQ-70.11).
Dichotomous antler-like branches studded with 3D tubular radial corallites & tapered axial tips.
Packed native + single-primitive static GLB with 3 PBR maps; raw rigid COLOR_0 masks.
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-acropora-staghorn-thicket"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261125)


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


def radial_corallite_bud(anchor_p, axis_dir, bud_r, bud_len, g_base, phase, ao_base):
    """Scale-like closed tubular radial corallite angled toward axial growth tip."""
    t_dir = axis_dir.normalized()
    ref = Vector((0.0, 0.0, 1.0)) if abs(t_dir.z) < 0.88 else Vector((1.0, 0.0, 0.0))
    n = (ref - t_dir * ref.dot(t_dir)).normalized()
    b = t_dir.cross(n).normalized()

    sides = 6
    specs = [
        (0.00, 1.05, max(0.05, g_base * 0.90), max(0.28, ao_base * 0.90)),
        (0.55, 0.86, min(0.86, g_base + 0.08), min(0.98, ao_base + 0.08)),
        (1.00, 0.58, min(0.92, g_base + 0.14), min(1.00, ao_base + 0.14)),
    ]
    rings = []
    for lk, rk, g_k, ao_k in specs:
        c = anchor_p + t_dir * (bud_len * lk)
        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            ring.append(vertex(c + (math.cos(phi) * n + math.sin(phi) * b) * (bud_r * rk), (0.0, g_k, phase, ao_k)))
        rings.append(ring)

    for k in range(len(rings) - 1):
        v0 = min(0.76, 0.25 + 0.22 * k)
        v1 = min(0.80, 0.25 + 0.22 * (k + 1))
        for j in range(sides):
            nxt = (j + 1) % sides
            face((rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]),
                 [(j / sides, v0), ((j + 1) / sides, v0), ((j + 1) / sides, v1), (j / sides, v1)])
    bot = vertex(anchor_p - t_dir * (bud_len * 0.20), (0.0, max(0.02, g_base * 0.75), phase, max(0.24, ao_base * 0.85)))
    tip = vertex(anchor_p + t_dir * (bud_len * 1.08), (0.0, min(0.95, g_base + 0.18), phase, min(1.0, ao_base + 0.16)))
    for j in range(sides):
        nxt = (j + 1) % sides
        face((bot, rings[0][nxt], rings[0][j]), [(j / sides, 0.22), ((j + 1) / sides, 0.25), (j / sides, 0.25)])
        face((rings[-1][j], rings[-1][nxt], tip), [(j / sides, 0.76), ((j + 1) / sides, 0.76), ((j + 0.5) / sides, 0.82)])


def staghorn_branch(p0, p1, p2, p3, r0, r1, t_start_g, t_start_ao, phase, corallites_target=16, sides=12):
    ts = [i / 13.0 for i in range(14)]
    pts = []
    for t in ts:
        pt = cubic(p0, p1, p2, p3, t)
        # Subtle organic surface undulation
        pts.append(pt)

    frames = build_bishop_frames(pts)
    rings = []
    for k, (p, t) in enumerate(zip(pts, ts)):
        n, b, _ = frames[k]
        # Taper into blunt conical axial corallite tip near t = 1.0
        taper = (1.0 - smooth(0.75, 1.0, t) * 0.55)
        rad = (r0 * (1.0 - t) + r1 * t) * taper
        g_val = t_start_g + (1.0 - t_start_g) * smooth(0.08, 0.99, t)
        if t <= 0.001 and t_start_g <= 0.001:
            g_val = 0.0
        elif t >= 0.999:
            g_val = 1.0
        ao_val = t_start_ao + (1.0 - t_start_ao) * smooth(0.0, 0.85, t)
        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            bump = 1.0 + 0.06 * math.sin(phi * 5.0 + k * 2.1 + phase * 10.0)
            ring.append(vertex(p + (math.cos(phi) * n + math.sin(phi) * b) * (rad * bump), (0.0, g_val, phase, ao_val)))
        rings.append(ring)

    for k in range(len(rings) - 1):
        v0 = 0.08 + 0.90 * ts[k]
        v1 = 0.08 + 0.90 * ts[k + 1]
        for j in range(sides):
            nxt = (j + 1) % sides
            face((rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]),
                 [(j / sides + phase, v0), ((j + 1) / sides + phase, v0), ((j + 1) / sides + phase, v1), (j / sides + phase, v1)])

    base_pole = vertex(pts[0] - frames[0][2] * (r0 * 0.25), (0.0, t_start_g, phase, t_start_ao))
    axial_tip = vertex(pts[-1] + frames[-1][2] * (r1 * 0.85), (0.0, 1.0, phase, 1.0))
    for j in range(sides):
        nxt = (j + 1) % sides
        face((base_pole, rings[0][nxt], rings[0][j]), [(j / sides, 0.05), ((j + 1) / sides, 0.08), (j / sides, 0.08)])
        face((rings[-1][j], rings[-1][nxt], axial_tip), [(j / sides, 0.96), ((j + 1) / sides, 0.96), ((j + 0.5) / sides, 1.0)])

    # Populate spiral Fibonacci radial corallite tubercles angled smoothly toward growth tip
    cor_count = 0
    for ci in range(corallites_target):
        frac = 0.16 + 0.72 * ((ci + 0.4) / corallites_target)
        st = min(12, max(1, round(frac * 13)))
        p_st = pts[st]
        n, b, tan = frames[st]
        ang = ci * 2.399963 + phase * 12.0
        out_dir = (math.cos(ang) * n + math.sin(ang) * b).normalized()
        rad_at = (r0 * (1.0 - frac) + r1 * frac) * (1.0 - smooth(0.75, 1.0, frac) * 0.55)
        anchor = p_st + out_dir * (rad_at * 0.72)
        cup_dir = (out_dir * 0.52 + tan * 0.85).normalized()
        g_local = min(0.88, t_start_g + (1.0 - t_start_g) * frac)
        ao_local = t_start_ao + (1.0 - t_start_ao) * frac
        radial_corallite_bud(anchor, cup_dir, rad_at * 0.44, rad_at * 0.88, g_local, phase, ao_local)
        cor_count += 1
    return pts, cor_count


# 1. Encrusted coralline holdfast base (0.0 .. 0.018 m, G = 0 at very base, A min = 0.16)
hold_sides = 16
hold_specs = [
    (0.000, 0.017, 0.00, 0.16),
    (0.004, 0.024, 0.02, 0.22),
    (0.011, 0.022, 0.06, 0.30),
    (0.018, 0.016, 0.12, 0.38),
]
hold_rings = []
for k, (z_val, rad, g_val, ao_val) in enumerate(hold_specs):
    ring = []
    for j in range(hold_sides):
        ang = j * 2.0 * math.pi / hold_sides
        lobe = 1.0 + 0.14 * math.cos(ang * 5.0 + 0.4) + 0.06 * math.sin(ang * 7.0)
        ring.append(vertex(Vector((math.cos(ang) * rad * lobe, math.sin(ang) * rad * lobe, z_val)), (0.0, g_val, 0.50, ao_val)))
    hold_rings.append(ring)

for k in range(len(hold_rings) - 1):
    for j in range(hold_sides):
        nxt = (j + 1) % hold_sides
        face((hold_rings[k][j], hold_rings[k][nxt], hold_rings[k + 1][nxt], hold_rings[k + 1][j]),
             [(j / hold_sides, k * 0.04), ((j + 1) / hold_sides, k * 0.04), ((j + 1) / hold_sides, (k + 1) * 0.04), (j / hold_sides, (k + 1) * 0.04)])

h_bot = vertex(Vector((0.0, 0.0, 0.0)), (0.0, 0.0, 0.50, 0.15))
h_top = vertex(Vector((0.0, 0.0, 0.020)), (0.0, 0.14, 0.50, 0.40))
for j in range(hold_sides):
    nxt = (j + 1) % hold_sides
    face((h_bot, hold_rings[0][nxt], hold_rings[0][j]), [(j / hold_sides, 0.0), ((j + 1) / hold_sides, 0.02), (j / hold_sides, 0.02)])
    face((hold_rings[-1][j], hold_rings[-1][nxt], h_top), [(j / hold_sides, 0.12), ((j + 1) / sides if False else (j + 1) / hold_sides, 0.12), ((j + 0.5) / hold_sides, 0.14)])

# 2. Spreading deer-antler dichotomous Staghorn branches + forks (22 branches total)
total_corallites = 0
primary_specs = [
    # (azimuth_deg, reach, height, fork_frac, fork_spread_deg, seed_ph)
    ( 12.0, 0.070, 0.195, 0.42, 34.0, 0.14),
    ( 76.0, 0.068, 0.184, 0.46, 38.0, 0.26),
    (142.0, 0.072, 0.175, 0.40, 35.0, 0.39),
    (208.0, 0.066, 0.188, 0.45, 36.0, 0.52),
    (272.0, 0.074, 0.168, 0.43, 34.0, 0.68),
    (326.0, 0.064, 0.192, 0.48, 32.0, 0.81),
]

for idx_p, (az_deg, reach, height, f_frac, spread_deg, ph) in enumerate(primary_specs):
    az = math.radians(az_deg + rng.uniform(-6.0, 6.0))
    rad_xy = Vector((math.cos(az), math.sin(az), 0.0))
    tan_xy = Vector((-math.sin(az), math.cos(az), 0.0))

    p0 = Vector((rad_xy.x * 0.010, rad_xy.y * 0.010, 0.012))
    p1 = p0 + rad_xy * (reach * 0.32) + tan_xy * rng.uniform(-0.010, 0.010) + Vector((0.0, 0.0, height * 0.30))
    p2 = p0 + rad_xy * (reach * 0.85) + tan_xy * rng.uniform(-0.014, 0.014) + Vector((0.0, 0.0, height * 0.64))
    p3 = p0 + rad_xy * reach + tan_xy * rng.uniform(-0.012, 0.012) + Vector((0.0, 0.0, height))

    pts_main, c_cnt = staghorn_branch(p0, p1, p2, p3, 0.0085, 0.0040, 0.10, 0.30, ph, corallites_target=24, sides=12)
    total_corallites += c_cnt

    # Secondary fork A (lower inner upward tine)
    st_f = min(10, max(3, round(f_frac * 13)))
    fp0 = pts_main[st_f]
    ang_a = az + math.radians(spread_deg * rng.uniform(0.75, 1.15))
    d_a = Vector((math.cos(ang_a), math.sin(ang_a), 0.0))
    f_len_a = rng.uniform(0.072, 0.095)
    fp1 = fp0 + d_a * (f_len_a * 0.42) + Vector((0.0, 0.0, f_len_a * 0.34))
    fp2 = fp0 + d_a * (f_len_a * 0.72) + Vector((0.0, 0.0, f_len_a * 0.72))
    fp3 = fp0 + d_a * (f_len_a * 0.68) + Vector((0.0, 0.0, f_len_a * 1.05))
    pts_sub, c_cnt = staghorn_branch(fp0, fp1, fp2, fp3, 0.0056, 0.0032, 0.35, 0.56, min(0.90, ph + 0.07), corallites_target=17, sides=10)
    total_corallites += c_cnt

    # Secondary fork B (higher sweeping outer tine)
    st_f2 = min(11, max(5, round((f_frac + 0.18) * 13)))
    bp0 = pts_main[st_f2]
    ang_b = az - math.radians(spread_deg * rng.uniform(0.80, 1.20))
    d_b = Vector((math.cos(ang_b), math.sin(ang_b), 0.0))
    f_len_b = rng.uniform(0.062, 0.084)
    bp1 = bp0 + d_b * (f_len_b * 0.44) + Vector((0.0, 0.0, f_len_b * 0.32))
    bp2 = bp0 + d_b * (f_len_b * 0.76) + Vector((0.0, 0.0, f_len_b * 0.68))
    bp3 = bp0 + d_b * (f_len_b * 0.75) + Vector((0.0, 0.0, f_len_b * 0.96))
    _, c_cnt = staghorn_branch(bp0, bp1, bp2, bp3, 0.0048, 0.0030, 0.48, 0.66, max(0.10, ph - 0.06), corallites_target=15, sides=10)
    total_corallites += c_cnt

    # Tertiary short tine on alternating primaries (adds rich organic antler asymmetry -> 22 branches total)
    if idx_p % 2 == 0 or idx_p == 1:
        tp0 = pts_sub[6]
        ang_t = ang_a - math.radians(28.0)
        d_t = Vector((math.cos(ang_t), math.sin(ang_t), 0.0))
        t_len = rng.uniform(0.042, 0.056)
        _, c_cnt = staghorn_branch(
            tp0,
            tp0 + d_t * (t_len * 0.32) + Vector((0.0, 0.0, t_len * 0.45)),
            tp0 + d_t * (t_len * 0.54) + Vector((0.0, 0.0, t_len * 0.82)),
            tp0 + d_t * (t_len * 0.60) + Vector((0.0, 0.0, t_len * 1.08)),
            0.0038, 0.0026, 0.62, 0.76, min(0.90, ph + 0.11), corallites_target=8, sides=8,
        )
        total_corallites += c_cnt

# Fit strictly inside legacy coral-acropora-staghorn [0.175, 0.221, 0.194] -> target [0.168, 0.208, 0.180]
z0 = min(v[2] for v in verts)
sx = 0.166 / max(1e-5, max(v[0] for v in verts) - min(v[0] for v in verts))
sy = 0.178 / max(1e-5, max(v[1] for v in verts) - min(v[1] for v in verts))
sz = 0.208 / max(1e-5, max(v[2] for v in verts) - z0)
sc = min(1.0, sx, sy, sz)
verts = [(x * sc, y * sc, (z - z0) * sc) for (x, y, z) in verts]

mesh = bpy.data.meshes.new("Reef_Acropora_Staghorn_Thicket_Mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()
if mesh.validate(verbose=True):
    raise RuntimeError("Mesh validation failed")

obj = bpy.data.objects.new("Reef_Acropora_Staghorn_Thicket", mesh)
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


def staghorn_albedo(u, v):
    grain = 0.5 + 0.5 * math.sin(u * 48.0 + math.cos(v * 64.0) * 1.4) * math.cos(v * 56.0 - u * 31.0)
    ridge = 0.5 + 0.5 * math.cos(u * 2.0 * math.pi * 14.0 + 0.5 * math.sin(v * 20.0))
    # Olive-emerald base -> luminous chartreuse-mint branch -> pale cream-lime axial growth tips
    c_base = (0.14 + 0.06 * grain, 0.24 + 0.08 * ridge, 0.14 + 0.05 * grain)
    c_mid = (0.18 + 0.10 * ridge, 0.56 + 0.14 * grain, 0.26 + 0.08 * ridge)
    c_tip = (0.64 + 0.16 * grain, 0.90 + 0.08 * ridge, 0.56 + 0.14 * grain)
    t1 = smooth(0.08, 0.55, v)
    t2 = smooth(0.72, 0.98, v)
    col = [c_base[i] * (1.0 - t1) + c_mid[i] * t1 for i in range(3)]
    col = [col[i] * (1.0 - t2) + c_tip[i] * t2 for i in range(3)]
    return tuple(col)


def staghorn_normal(u, v):
    ang = u * 2.0 * math.pi
    nx = 0.14 * math.sin(ang * 20.0 + v * 32.0)
    ny = 0.14 * math.cos(v * 38.0 - ang * 16.0)
    n = Vector((nx, ny, 1.0)).normalized()
    return (0.5 + 0.5 * n.x, 0.5 + 0.5 * n.y, 0.5 + 0.5 * n.z)


def staghorn_roughness(u, v):
    val = 0.72 + 0.10 * math.sin(2.0 * math.pi * (u * 13.0 + v * 9.0))
    return (val, val, val)


base = make_image("albedo", 512, staghorn_albedo, False)
nrm = make_image("normal", 512, staghorn_normal, True)
rough = make_image("roughness", 512, staghorn_roughness, True)

mat = bpy.data.materials.new("Staghorn_Emerald_SPS")
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
mesh.materials.append(mat)

obj["authoring_notes"] = (
    "Original Open Staghorn Acropora cervicornis/formosa thicket (AQ-70.11), 22 dichotomous "
    "deer-antler branches studded with 3D tubular radial corallites & tapered axial growth tips, "
    "3 packed 512px PBR maps, and raw rigid COLOR_0 masks (R=0 everywhere, G=0..1 axial tip gradient, "
    "B in (0.08, 0.92), A contact AO 0.15..1.0)."
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
print("STAGHORN_SAVED_EXPORTED", json.dumps({
    "triangles": triangles,
    "vertices": len(mesh.vertices),
    "corallites": total_corallites,
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
