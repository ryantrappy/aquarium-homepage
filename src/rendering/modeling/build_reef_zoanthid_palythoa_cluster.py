"""Original large-polyp Palythoa / Zoanthid cluster morphology (AQ-70.11 Variant #2).
Packed native + selected static two-material GLB with 18 taller-stalked varied polyps,
468 long wispy marginal tentacles, deeply-cupped emerald-teal oral discs with peach-gold mouths,
and a rigid rocky leathery coenenchyme mat.
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-zoanthid-palythoa-cluster"
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

verts, faces, face_uvs, masks, materials = [], [], [], [], []


def vertex(p, mask):
    verts.append(tuple(p))
    masks.append(mask)
    return len(verts) - 1


def face(indices, uv, material):
    faces.append(tuple(indices))
    face_uvs.append(uv)
    materials.append(material)


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def cubic(a, b, c, d, t):
    return (1.0 - t) ** 3 * a + 3.0 * (1.0 - t) ** 2 * t * b + 3.0 * (1.0 - t) * t * t * c + t ** 3 * d


def mat_height(x, y):
    r = math.hypot(x / 1.04, y / 0.96)
    ang = math.atan2(y, x)
    max_r = 0.080 * (1.0 + 0.09 * math.sin(2.0 * ang + 0.9) + 0.05 * math.cos(4.0 * ang - 0.6))
    rn = min(1.0, r / max(1e-5, max_r))
    dome = 0.017 * ((1.0 - rn * rn) ** 0.76) if rn < 1.0 else 0.0
    lump = 0.0028 * math.sin(x * 38.0 - 0.4) * math.cos(y * 44.0 + 0.7) * (1.0 - 0.4 * rn)
    return max(0.0, dome + lump)


# 1. Rigid rocky leathery coenenchyme mat (material 1)
ang_n, rad_n = 32, 10
top_rings, bot_rings = [], []
center_top = vertex(Vector((0.0, 0.0, mat_height(0.0, 0.0) + 0.0018)), (0.0, 0.0, 0.5, 0.72))
center_bot = vertex(Vector((0.0, 0.0, 0.0)), (0.0, 0.0, 0.5, 0.36))

for k in range(1, rad_n + 1):
    rn = k / rad_n
    t_ring, b_ring = [], []
    for j in range(ang_n):
        ang = j * 2.0 * math.pi / ang_n
        max_r = 0.080 * (1.0 + 0.09 * math.sin(2.0 * ang + 0.9) + 0.05 * math.cos(4.0 * ang - 0.6))
        r = rn * max_r
        x, y = r * math.cos(ang) * 1.04, r * math.sin(ang) * 0.96
        z_top = mat_height(x, y) + 0.0018 * (1.0 - rn * rn)
        z_bot = 0.0 if rn > 0.85 else 0.0008
        if k == rad_n:
            z_top = 0.0012
            z_bot = 0.0
        t_ring.append(vertex(Vector((x, y, z_top)), (0.0, 0.0, 0.5, 0.40 + 0.44 * (1.0 - rn))))
        b_ring.append(vertex(Vector((x, y, z_bot)), (0.0, 0.0, 0.5, 0.36)))
    top_rings.append(t_ring)
    bot_rings.append(b_ring)

for j in range(ang_n):
    nxt = (j + 1) % ang_n
    u0, u1 = j / ang_n, (j + 1) / ang_n
    face((center_top, top_rings[0][j], top_rings[0][nxt]), [(0.5, 0.5), (u0, 0.1), (u1, 0.1)], 1)
    face((center_bot, bot_rings[0][nxt], bot_rings[0][j]), [(0.5, 0.5), (u1, 0.1), (u0, 0.1)], 1)

for k in range(rad_n - 1):
    v0, v1 = (k + 1) / rad_n, (k + 2) / rad_n
    for j in range(ang_n):
        nxt = (j + 1) % ang_n
        u0, u1 = j / ang_n, (j + 1) / ang_n
        face((top_rings[k][j], top_rings[k + 1][j], top_rings[k + 1][nxt], top_rings[k][nxt]), [(u0, v0), (u0, v1), (u1, v1), (u1, v0)], 1)
        face((bot_rings[k][j], bot_rings[k][nxt], bot_rings[k + 1][nxt], bot_rings[k + 1][j]), [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], 1)

for j in range(ang_n):
    nxt = (j + 1) % ang_n
    u0, u1 = j / ang_n, (j + 1) / ang_n
    face((top_rings[-1][j], bot_rings[-1][j], bot_rings[-1][nxt], top_rings[-1][nxt]), [(u0, 1.0), (u0, 0.95), (u1, 0.95), (u1, 1.0)], 1)

# 2. Place 18 larger tall-stalked varied-size Palythoa polyps across the domed mat.
polyp_specs = []
desired_radii = (
    [rng.uniform(0.0138, 0.0165) for _ in range(5)]
    + [rng.uniform(0.0108, 0.0136) for _ in range(8)]
    + [rng.uniform(0.0085, 0.0106) for _ in range(5)]
)
for idx, disc_r in enumerate(desired_radii):
    placed = False
    for attempt in range(450):
        ang = idx * 2.399963 + rng.uniform(-0.35, 0.35) + attempt * 0.08
        max_center_r = 0.064 - disc_r * 0.85
        radial_t = math.sqrt((idx + 0.35) / len(desired_radii)) * (0.88 + 0.12 * rng.random())
        r = radial_t * max_center_r if idx > 0 else rng.uniform(0.0, 0.008)
        cx, cy = r * math.cos(ang) * 1.04, r * math.sin(ang) * 0.96
        if all(math.hypot(cx - ox, cy - oy) >= (disc_r + orad) * 1.24 for ox, oy, orad in polyp_specs):
            polyp_specs.append((cx, cy, disc_r))
            placed = True
            break
    if not placed:
        for attempt in range(350):
            ang = rng.uniform(0.0, 2.0 * math.pi)
            r = rng.uniform(0.036, 0.063)
            cx, cy = r * math.cos(ang) * 1.04, r * math.sin(ang) * 0.96
            if all(math.hypot(cx - ox, cy - oy) >= (disc_r + orad) * 1.12 for ox, oy, orad in polyp_specs):
                polyp_specs.append((cx, cy, disc_r))
                break

while len(polyp_specs) < 18:
    ang = len(polyp_specs) * 2.399963
    r = 0.054 + rng.uniform(-0.010, 0.008)
    polyp_specs.append((r * math.cos(ang), r * math.sin(ang), 0.0086))

for pi, (cx, cy, disc_r) in enumerate(polyp_specs[:18]):
    base_z = mat_height(cx, cy) - 0.001
    radial_xy = Vector((cx, cy, 0.0))
    tilt_dir = radial_xy.normalized() if radial_xy.length > 1e-4 else Vector((1.0, 0.0, 0.0))
    tilt_amount = min(0.45, radial_xy.length / 0.075 * 0.42)
    axis = (Vector((0.0, 0.0, 1.0)) + tilt_dir * tilt_amount).normalized()
    ref = Vector((1.0, 0.0, 0.0)) if abs(axis.x) < 0.85 else Vector((0.0, 1.0, 0.0))
    u_vec = ref.cross(axis).normalized()
    v_vec = axis.cross(u_vec).normalized()

    col_height = min(0.022, disc_r * rng.uniform(1.15, 1.48) + 0.004)
    phase = 0.04 + 0.92 * ((pi * 0.417 + rng.uniform(0.0, 0.14)) % 1.0)
    polyp_flex = 0.84 + 0.16 * ((pi % 8) / 7.0)

    # A. Rigid tall fluted column stalk (material 1, R=0)
    col_sides = 16
    col_rings = []
    col_spec = [(0.0, disc_r * 0.86, 0.36), (0.36, disc_r * 0.64, 0.54), (0.72, disc_r * 0.74, 0.72), (0.98, disc_r * 0.90, 0.85)]
    origin_base = Vector((cx, cy, base_z))
    for frac, rad, ao_v in col_spec:
        ring = []
        center_p = origin_base + axis * (col_height * frac)
        for j in range(col_sides):
            a = j * 2.0 * math.pi / col_sides
            ring.append(vertex(center_p + (math.cos(a) * u_vec + math.sin(a) * v_vec) * rad, (0.0, 0.0, 0.5, ao_v)))
        col_rings.append(ring)
    for k in range(len(col_rings) - 1):
        v0, v1 = k / 3.0, (k + 1) / 3.0
        for j in range(col_sides):
            nxt = (j + 1) % col_sides
            u0, u1 = j / col_sides, (j + 1) / col_sides
            face((col_rings[k][j], col_rings[k][nxt], col_rings[k + 1][nxt], col_rings[k + 1][j]), [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], 1)

    # B. Deeply-cupped broader oral disc with raised central mouth cone (material 0)
    disc_sides = 26
    disc_top = origin_base + axis * (col_height * 0.96)
    mouth_peak = vertex(disc_top + axis * (0.0026 * (disc_r / 0.013)), (0.0, 0.90, phase, 0.56))
    disc_spec = [
        (0.18, 0.0025, 0.00, 0.96, 0.06, 0.62),
        (0.48, -0.0004, 0.08 * polyp_flex, 0.22, 0.18, 0.68),
        (0.78, 0.0005, 0.16 * polyp_flex, 0.90, 0.31, 0.78),
        (1.00, 0.0018, 0.24 * polyp_flex, 0.40, 0.43, 0.86),
    ]
    d_rings = []
    for rf, zoff, flex_r, g_f, v_uv, ao_v in disc_spec:
        ring = []
        for j in range(disc_sides):
            a = j * 2.0 * math.pi / disc_sides
            p = disc_top + (math.cos(a) * u_vec + math.sin(a) * v_vec) * (disc_r * rf) + axis * (zoff * (disc_r / 0.013))
            ring.append(vertex(p, (flex_r, g_f, phase, ao_v)))
        d_rings.append((ring, v_uv))

    for j in range(disc_sides):
        nxt = (j + 1) % disc_sides
        u0, u1 = j / disc_sides, (j + 1) / disc_sides
        face((mouth_peak, d_rings[0][0][j], d_rings[0][0][nxt]), [(u0, 0.02), (u0, d_rings[0][1]), (u1, d_rings[0][1])], 0)
    for k in range(len(d_rings) - 1):
        r0, v0 = d_rings[k]
        r1, v1 = d_rings[k + 1]
        for j in range(disc_sides):
            nxt = (j + 1) % disc_sides
            u0, u1 = j / disc_sides, (j + 1) / disc_sides
            face((r0[j], r1[j], r1[nxt], r0[nxt]), [(u0, v0), (u0, v1), (u1, v1), (u1, v0)], 0)

    # C. 26 longer wispy tapered marginal tentacles per polyp (468 total)
    tent_sides = 5
    ts = [0.0, 0.25, 0.52, 0.78, 1.0]
    for ti in range(disc_sides):
        ang = ti * 2.0 * math.pi / disc_sides + rng.uniform(-0.04, 0.04)
        rad_dir = (math.cos(ang) * u_vec + math.sin(ang) * v_vec).normalized()
        lat_dir = axis.cross(rad_dir).normalized()
        p0 = disc_top + rad_dir * (disc_r * 0.96) + axis * (0.0017 * (disc_r / 0.013))
        t_len = disc_r * rng.uniform(0.72, 0.98)
        p3 = p0 + rad_dir * t_len + axis * (disc_r * rng.uniform(0.14, 0.34)) + lat_dir * (disc_r * rng.uniform(-0.10, 0.10))
        p1 = p0 + rad_dir * (t_len * 0.42) - axis * (disc_r * 0.06)
        p2 = p0 + rad_dir * (t_len * 0.82) + axis * (disc_r * 0.08)
        t_pts = [cubic(p0, p1, p2, p3, t) for t in ts]
        base_tr = disc_r * rng.uniform(0.085, 0.108)
        t_phase = max(0.02, min(0.98, phase + rng.uniform(-0.03, 0.03)))

        t_rings = []
        for k, (pt, t) in enumerate(zip(t_pts, ts)):
            tan = (t_pts[min(k + 1, 4)] - t_pts[max(k - 1, 0)]).normalized()
            n_t = lat_dir.cross(tan).normalized()
            b_t = tan.cross(n_t).normalized()
            radius = base_tr * (1.0 - 0.80 * (t ** 1.10))
            flex_r = min(1.0, (0.24 + 0.76 * (t ** 1.6)) * polyp_flex)
            g_fluor = smooth(0.40, 0.95, t)
            ao_v = 0.45 + 0.55 * smooth(0.0, 0.65, t)
            ring = []
            for j in range(tent_sides):
                phi = j * 2.0 * math.pi / tent_sides
                ring.append(vertex(pt + (math.cos(phi) * n_t + math.sin(phi) * b_t) * radius, (flex_r, g_fluor, t_phase, ao_v)))
            t_rings.append(ring)

        for k in range(len(t_rings) - 1):
            v0 = 0.46 + 0.52 * ts[k]
            v1 = 0.46 + 0.52 * ts[k + 1]
            for j in range(tent_sides):
                nxt = (j + 1) % tent_sides
                u0 = j / tent_sides
                u1 = (j + 1) / tent_sides
                face((t_rings[k][j], t_rings[k][nxt], t_rings[k + 1][nxt], t_rings[k + 1][j]), [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], 0)
        face(tuple(reversed(t_rings[0])), [(0.5, 0.46) for _ in range(tent_sides)], 0)
        face(t_rings[-1], [(0.5, 0.98) for _ in range(tent_sides)], 0)

z_min = min(p[2] for p in verts)
verts = [(x, y, z - z_min) for x, y, z in verts]

mesh = bpy.data.meshes.new("Zoanthid_Palythoa_Cluster_Mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()
if mesh.validate(verbose=True):
    raise RuntimeError("Construction needs correction before UV/masks")

obj = bpy.data.objects.new("Reef_Zoanthid_Palythoa_Cluster", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Palythoa_Polyp_Atlas")
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
    pixels = []
    for y in range(size):
        for x in range(size):
            pixels.extend((*fn(x / (size - 1), y / (size - 1)), 1.0))
    im.pixels.foreach_set(pixels)
    im.filepath_raw = str(image_dir / (im.name + ".png"))
    im.file_format = "PNG"
    im.save()
    im.pack()
    return im


def tissue_albedo(u, v):
    if v <= 0.45:
        vr = v / 0.45
        rays = 0.5 + 0.5 * math.cos(26.0 * 2.0 * math.pi * u)
        mouth = 1.0 - smooth(0.08, 0.22, vr)
        ring = smooth(0.36, 0.58, vr) * (1.0 - smooth(0.76, 0.94, vr))
        speckle = smooth(0.20, 0.85, rays)
        base_col = (0.06, 0.24, 0.20)
        sunburst_col = (0.18, 0.68, 0.52)
        mouth_col = (0.94, 0.58, 0.24)
        col = [base_col[i] * (1.0 - ring * speckle) + sunburst_col[i] * (ring * speckle) for i in range(3)]
        return tuple(col[i] * (1.0 - mouth) + mouth_col[i] * mouth for i in range(3))
    vt = (v - 0.45) / 0.55
    band = smooth(0.28, 0.86, vt)
    streak = 0.85 + 0.15 * math.sin(2.0 * math.pi * u * 5.0)
    stalk_col = (0.12 * streak, 0.34 * streak, 0.28 * streak)
    tip_col = (0.48, 0.88, 0.32)
    return tuple(stalk_col[i] * (1.0 - band) + tip_col[i] * band for i in range(3))


def skeleton_albedo(u, v):
    mottle = 0.5 + 0.5 * math.sin(2.0 * math.pi * (u * 8.0 + v * 6.0)) * math.cos(2.0 * math.pi * (u * 6.0 - v * 8.0))
    return (0.28 + 0.08 * mottle, 0.24 + 0.07 * mottle, 0.21 + 0.06 * mottle)


def normal_map(u, v, strength):
    x = strength * math.sin(26.0 * 2.0 * math.pi * u) * (0.5 + 0.5 * math.sin(2.0 * math.pi * v))
    y = strength * 0.30 * math.cos(8.0 * math.pi * v)
    n = Vector((x, y, 1.0)).normalized()
    return tuple(0.5 + 0.5 * c for c in n)


for label, material_id, size in [("tissue", 0, 512), ("skeleton", 1, 256)]:
    base = make_image(label + "-albedo", size, tissue_albedo if material_id == 0 else skeleton_albedo, False)
    nrm = make_image(label + "-normal", size, lambda u, v, mid=material_id: normal_map(u, v, 0.06 if mid == 0 else 0.10), True)
    rough = make_image(
        label + "-roughness",
        size,
        lambda u, v, mid=material_id: (((0.42 if mid == 0 else 0.80) + 0.08 * (0.5 + 0.5 * math.sin(2.0 * math.pi * (u * 6.0 + v * 4.0)))),) * 3,
        True,
    )
    mat = bpy.data.materials.new("Zoanthid_Palythoa_" + label.title())
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
    if material_id == 0:
        bsdf.inputs["Transmission Weight"].default_value = 0.12
        bsdf.inputs["IOR"].default_value = 1.36
        bsdf.inputs["Coat Weight"].default_value = 0.12
        bsdf.inputs["Coat Roughness"].default_value = 0.30
    mat["reefPrimitive"] = {
        "id": "zoanthid_palythoa_polyp_crowns" if material_id == 0 else "zoanthid_palythoa_mat_base",
        "role": "coral-soft" if material_id == 0 else "coral-rigid",
        "maskSchema": "coral-raw-masks-v1",
    }
    mesh.materials.append(mat)

obj["authoring_notes"] = (
    "Original 18-polyp tall-stalked Palythoa/zoanthid cluster with 468 wispy recurved marginal tentacles, "
    "cupped emerald-teal oral discs with peach-gold mouths, and rigid leathery coenenchyme mat grounded at z=0."
)
triangulate = obj.modifiers.new("Stable_Export_Triangles", "TRIANGULATE")
bpy.ops.object.modifier_apply(modifier=triangulate.name)
mesh = obj.data
if mesh.validate(verbose=True):
    raise RuntimeError("Final native mesh changed after assigning masks")
mesh.calc_loop_triangles()
triangles = len(mesh.loop_triangles)

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
    "PALYTHOA_CLUSTER_SAVED_EXPORTED",
    json.dumps({"triangles": triangles, "vertices": len(mesh.vertices), "polyps": 18, "tentacles": 468, "dimensions": list(obj.dimensions)}),
    flush=True,
)

world = bpy.data.worlds.new("Neutral_Review")
scene.world = world
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.14, 0.14, 0.16, 1.0)
bg.inputs[1].default_value = 0.50
for name, pos, energy, size in [("Key", (0.10, -0.32, 0.45), 4.0, 0.3), ("Fill", (-0.30, -0.15, 0.25), 1.5, 0.4), ("Rim", (0.05, 0.35, 0.35), 2.5, 0.25)]:
    light = bpy.data.lights.new(name, "AREA")
    light.energy = energy
    light.shape = "DISK"
    light.size = size
    lo = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(lo)
    lo.location = pos
    lo.rotation_euler = (Vector((0, 0, 0.02)) - lo.location).to_track_quat("-Z", "Y").to_euler()
