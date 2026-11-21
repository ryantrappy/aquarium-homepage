"""Original Scrolling Chalice Whorl Montipora undata / capricornis colony (AQ-70.11).
Watertight multi-whorl cabbage-scroll plating SPS with heavily ruffled margins,
radial fluting, raised 3D verrucose polyp tubercles, and chalky calcareous underside.
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
ID = "reef-montipora-undata-cap"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261129)


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
verrucose_sites = []


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


def verruca_tubercle(anchor_p, up_n, rad, h, uv_site, g_val, phase, ao_val):
    """Low closed organic polyp verruca wart inheriting plate UV so it blends seamlessly."""
    n_u = up_n.normalized()
    ref = Vector((1.0, 0.0, 0.0)) if abs(n_u.x) < 0.88 else Vector((0.0, 1.0, 0.0))
    t1 = (ref - n_u * ref.dot(n_u)).normalized()
    t2 = n_u.cross(t1).normalized()
    u0, v0 = uv_site

    sides = 6
    ring_lo = [
        vertex(anchor_p - n_u * (h * 0.25) + (math.cos(j * 2.0 * math.pi / sides) * t1 + math.sin(j * 2.0 * math.pi / sides) * t2) * rad,
               (0.0, max(0.08, g_val * 0.90), phase, max(0.28, ao_val * 0.94)))
        for j in range(sides)
    ]
    ring_hi = [
        vertex(anchor_p + n_u * (h * 0.72) + (math.cos(j * 2.0 * math.pi / sides) * t1 + math.sin(j * 2.0 * math.pi / sides) * t2) * (rad * 0.65),
               (0.0, min(0.95, g_val + 0.14), phase, min(1.0, ao_val + 0.08)))
        for j in range(sides)
    ]
    for j in range(sides):
        nxt = (j + 1) % sides
        face(
            (ring_lo[j], ring_lo[nxt], ring_hi[nxt], ring_hi[j]),
            [(u0, v0), (u0 + 0.008, v0), (u0 + 0.008, min(0.90, v0 + 0.03)), (u0, min(0.90, v0 + 0.03))],
        )
    bot = vertex(anchor_p - n_u * (h * 0.55), (0.0, max(0.04, g_val * 0.80), phase, max(0.24, ao_val * 0.88)))
    top = vertex(anchor_p + n_u * (h * 1.10), (0.0, min(0.98, g_val + 0.20), phase, min(1.0, ao_val + 0.12)))
    for j in range(sides):
        nxt = (j + 1) % sides
        face((bot, ring_lo[nxt], ring_lo[j]), [(u0, v0), (u0 + 0.006, v0), (u0, v0)])
        face((ring_hi[j], ring_hi[nxt], top), [(u0, min(0.90, v0 + 0.03)), (u0 + 0.006, min(0.90, v0 + 0.03)), (u0 + 0.003, min(0.93, v0 + 0.05))])


def add_chalice_scroll(
    offset_xy,
    theta_start,
    theta_span,
    r_inner,
    r_outer,
    z_root,
    z_lift,
    lobe_freq,
    lobe_phase,
    lobe_amp,
    spiral_pitch,
    ang_steps=72,
    rad_steps=14,
):
    """Watertight double-sided chalice scroll with rounded calcified rim & analytical UVs."""
    ox, oy = offset_xy
    top_grid, bot_grid = [], []
    uv_top, uv_bot = [], []

    for i in range(ang_steps + 1):
        u_a = i / ang_steps
        theta = theta_start + u_a * theta_span
        end_taper = 0.42 + 0.58 * (math.sin(u_a * math.pi) ** 0.35)
        spiral = 1.0 + spiral_pitch * u_a
        ruffle = (
            lobe_amp * math.sin(lobe_freq * theta + lobe_phase)
            + 0.48 * lobe_amp * math.cos((lobe_freq + 2.0) * theta - lobe_phase * 0.6)
            + 0.24 * lobe_amp * math.sin((lobe_freq * 2.0 + 1.0) * theta)
        )
        r_edge = r_inner + (r_outer - r_inner) * spiral * end_taper * (1.0 + ruffle)
        # Wave crest rises and dips along the scrolling frond margin
        wave_edge = 0.0095 * math.sin(lobe_freq * theta + lobe_phase + 0.7) * (math.sin(u_a * math.pi) ** 0.5)

        t_row, b_row, ut_row, ub_row = [], [], [], []
        for j in range(rad_steps + 1):
            v_r = j / rad_steps
            vr = 1.0 - (1.0 - v_r) ** 1.16
            r = r_inner + vr * max(0.008, r_edge - r_inner)
            cup = z_lift * (vr ** 1.18) + 0.009 * u_a * vr
            flute = 0.0014 * (vr ** 1.1) * math.sin(theta * 18.0 + u_a * 4.0)
            undul = wave_edge * (vr ** 1.45)
            z_mid = z_root + cup + flute + undul
            half_t = 0.0028 * (1.0 - 0.50 * vr) + 0.0008 * (1.0 - vr)

            x = ox + r * math.cos(theta)
            y = oy + r * math.sin(theta)
            tp = Vector((x, y, z_mid + half_t))
            bp = Vector((x, y, z_mid - half_t))

            # Raw COLOR_0 masks: R=0, G increases sharply near growth margin, B smooth phase, A darker in inner funnel
            edge_rim = smooth(0.76, 0.99, vr)
            g_top = min(1.0, 0.14 + 0.34 * vr + 0.52 * edge_rim)
            g_bot = min(0.88, 0.06 + 0.24 * vr + 0.42 * edge_rim)
            ph = 0.09 + 0.82 * ((u_a * 0.72 + vr * 0.28 + lobe_phase * 0.11) % 1.0)
            ao_top = 0.28 + 0.72 * smooth(0.05, 0.88, vr)
            ao_bot = 0.20 + 0.48 * smooth(0.10, 0.95, vr)

            t_row.append(vertex(tp, (0.0, g_top, ph, ao_top)))
            b_row.append(vertex(bp, (0.0, g_bot, ph, ao_bot)))
            ut_row.append((u_a * 1.4, 0.19 + 0.80 * vr))
            ub_row.append((u_a * 1.4, 0.01 + 0.13 * vr))

            if 0.16 < vr < 0.84 and (i % 2 == 0) and (j % 2 == 0):
                n_est = Vector((-math.cos(theta) * 0.22, -math.sin(theta) * 0.22, 1.0)).normalized()
                verrucose_sites.append((tp.copy(), n_est, (u_a * 1.4, 0.19 + 0.80 * vr), g_top * 0.78, ph, ao_top))

        top_grid.append(t_row)
        bot_grid.append(b_row)
        uv_top.append(ut_row)
        uv_bot.append(ub_row)

    # Upper living sheet (+Z normal), lower calcareous sheet (-Z normal)
    for i in range(ang_steps):
        for j in range(rad_steps):
            face(
                (top_grid[i][j], top_grid[i + 1][j], top_grid[i + 1][j + 1], top_grid[i][j + 1]),
                [uv_top[i][j], uv_top[i + 1][j], uv_top[i + 1][j + 1], uv_top[i][j + 1]],
            )
            face(
                (bot_grid[i][j], bot_grid[i][j + 1], bot_grid[i + 1][j + 1], bot_grid[i + 1][j]),
                [uv_bot[i][j], uv_bot[i][j + 1], uv_bot[i + 1][j + 1], uv_bot[i + 1][j]],
            )
    # Outer bright growth lip & inner root edge
    for i in range(ang_steps):
        face(
            (top_grid[i][rad_steps], top_grid[i + 1][rad_steps], bot_grid[i + 1][rad_steps], bot_grid[i][rad_steps]),
            [(i / ang_steps, 0.96), ((i + 1) / ang_steps, 0.96), ((i + 1) / ang_steps, 0.99), (i / ang_steps, 0.99)],
        )
        face(
            (bot_grid[i][0], bot_grid[i + 1][0], top_grid[i + 1][0], top_grid[i][0]),
            [(i / ang_steps, 0.04), ((i + 1) / ang_steps, 0.04), ((i + 1) / ang_steps, 0.14), (i / ang_steps, 0.14)],
        )
    # Two radial end-caps closing the scroll manifold cleanly
    for j in range(rad_steps):
        face(
            (bot_grid[0][j], bot_grid[0][j + 1], top_grid[0][j + 1], top_grid[0][j]),
            [uv_bot[0][j], uv_bot[0][j + 1], uv_top[0][j + 1], uv_top[0][j]],
        )
        face(
            (top_grid[ang_steps][j], top_grid[ang_steps][j + 1], bot_grid[ang_steps][j + 1], bot_grid[ang_steps][j]),
            [uv_top[ang_steps][j], uv_top[ang_steps][j + 1], uv_bot[ang_steps][j + 1], uv_bot[ang_steps][j]],
        )


# 1. Calcified pedestal trunk + rocky holdfast foot nested cleanly under center whorls
ped_sides = 20
ped_specs = [
    (0.000, 0.024, 0.00, 0.14),
    (0.005, 0.028, 0.02, 0.22),
    (0.015, 0.020, 0.05, 0.30),
    (0.027, 0.013, 0.09, 0.36),
    (0.036, 0.009, 0.14, 0.40),
]
ped_rings = []
for z_val, r_val, g_val, ao_val in ped_specs:
    ring = []
    for j in range(ped_sides):
        ang = j * 2.0 * math.pi / ped_sides
        lobe = 1.0 + 0.12 * math.cos(ang * 5.0 + z_val * 20.0)
        ring.append(vertex(Vector((math.cos(ang) * r_val * lobe, math.sin(ang) * r_val * lobe, z_val)), (0.0, g_val, 0.45, ao_val)))
    ped_rings.append(ring)

for k in range(len(ped_rings) - 1):
    v0, v1 = 0.01 + k * 0.03, 0.01 + (k + 1) * 0.03
    for j in range(ped_sides):
        nxt = (j + 1) % ped_sides
        face((ped_rings[k][j], ped_rings[k][nxt], ped_rings[k + 1][nxt], ped_rings[k + 1][j]),
             [(j / ped_sides, v0), ((j + 1) / ped_sides, v0), ((j + 1) / ped_sides, v1), (j / ped_sides, v1)])
p_bot = vertex(Vector((0.0, 0.0, 0.0)), (0.0, 0.0, 0.45, 0.12))
p_top = vertex(Vector((0.0, 0.0, 0.037)), (0.0, 0.16, 0.45, 0.40))
for j in range(ped_sides):
    nxt = (j + 1) % ped_sides
    face((p_bot, ped_rings[0][nxt], ped_rings[0][j]), [(j / ped_sides, 0.01), ((j + 1) / ped_sides, 0.02), (j / ped_sides, 0.02)])
    face((ped_rings[-1][j], ped_rings[-1][nxt], p_top), [(j / ped_sides, 0.12), ((j + 1) / ped_sides, 0.12), ((j + 0.5) / ped_sides, 0.14)])


# 2. Three overlapping chalice whorls curling seamlessly into center heart
add_chalice_scroll((0.002, -0.004), math.radians(-20), math.radians(245), 0.008, 0.088, 0.016, 0.028, 5.0, 0.4, 0.14, 0.24, ang_steps=72, rad_steps=14)
add_chalice_scroll((-0.006, 0.004), math.radians(125), math.radians(225), 0.006, 0.072, 0.029, 0.025, 6.0, 2.0, 0.13, 0.20, ang_steps=64, rad_steps=13)
add_chalice_scroll((0.003, 0.003), math.radians(240), math.radians(220), 0.002, 0.046, 0.038, 0.022, 4.0, 3.4, 0.11, 0.18, ang_steps=48, rad_steps=11)

# 3. Populate 190 scattered organic verrucose polyp tubercles on upper surfaces
rng.shuffle(verrucose_sites)
tubercle_count = 0
for pos_s, norm_s, uv_s, g_s, ph_s, ao_s in verrucose_sites[:190]:
    verruca_tubercle(pos_s, norm_s, rng.uniform(0.0016, 0.0026), rng.uniform(0.0009, 0.0015), uv_s, g_s, ph_s, ao_s)
    tubercle_count += 1

# Fit strictly inside legacy coral-montipora-plate [0.230, 0.097, 0.241] -> target <= [0.212, 0.214, 0.086]
xs = [v[0] for v in verts]
ys = [v[1] for v in verts]
zs = [v[2] for v in verts]
cx = 0.5 * (min(xs) + max(xs))
cy = 0.5 * (min(ys) + max(ys))
z0 = min(zs)
sx = 0.212 / max(1e-5, max(xs) - min(xs))
sy = 0.214 / max(1e-5, max(ys) - min(ys))
sz = 0.086 / max(1e-5, max(zs) - z0)
sc = min(1.0, sx, sy, sz)
verts = [((x - cx) * sc, (y - cy) * sc, (z - z0) * sc) for (x, y, z) in verts]

mesh = bpy.data.meshes.new("Reef_Montipora_Undata_Cap_Mesh")
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

obj = bpy.data.objects.new("Reef_Montipora_Undata_Cap", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Montipora_Chalice_UV")
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


def undata_albedo(u, v):
    # v < 0.16: calcareous beige underside; v >= 0.16: organic concentric & domain-warped plate with crisp pale growth rim
    if v < 0.16:
        ring = 0.5 + 0.5 * math.sin(v * 140.0 + u * 8.0)
        return (0.42 + 0.08 * ring, 0.37 + 0.07 * ring, 0.31 + 0.05 * ring)

    tv = max(0.0, min(1.0, (v - 0.18) / 0.80))
    # Multi-angle organic fBm-like field (zero rectangular lattice grid!)
    warp_u = u + 0.04 * math.sin(v * 23.0 + u * 11.0) + 0.02 * math.cos(v * 47.0 - u * 19.0)
    warp_v = tv + 0.03 * math.cos(u * 31.0 - v * 17.0)
    concentric = 0.5 + 0.5 * math.sin(warp_v * 38.0 + 0.7 * math.sin(warp_u * 29.0))
    mottle = 0.5 + 0.5 * math.sin(warp_u * 23.0 + warp_v * 19.0) * math.cos(warp_v * 31.0 - warp_u * 13.0)
    p1 = math.sin(u * 41.0 + v * 67.0 + math.sin(v * 29.0) * 1.4)
    p2 = math.cos(u * 59.0 - v * 53.0 + math.cos(u * 37.0) * 1.3)
    p3 = math.sin((u + v) * 47.0 + math.cos((u - v) * 33.0))
    polyp_noise = 0.33 * (p1 + p2 + p3)

    c_funnel = (0.32 + 0.08 * mottle, 0.18 + 0.07 * concentric, 0.08 + 0.03 * mottle)
    c_plate = (0.78 + 0.14 * mottle, 0.30 + 0.10 * concentric, 0.08 + 0.05 * mottle)
    c_rim = (0.98, 0.82 + 0.10 * concentric, 0.52 + 0.10 * mottle)
    t1 = smooth(0.04, 0.45, tv)
    t2 = smooth(0.89, 0.99, tv)
    col = [c_funnel[k] * (1.0 - t1) + c_plate[k] * t1 for k in range(3)]
    col = [col[k] * (1.0 - t2) + c_rim[k] * t2 for k in range(3)]
    # Irregular organic verrucose chartreuse/gold polyp highlights (no regular grid!)
    dot_mask = smooth(0.55, 0.85, polyp_noise) * (1.0 - t2) * smooth(0.08, 0.30, tv)
    col = [
        col[0] * (1.0 - 0.35 * dot_mask) + 0.62 * dot_mask,
        col[1] * (1.0 - 0.35 * dot_mask) + 0.86 * dot_mask,
        col[2] * (1.0 - 0.35 * dot_mask) + 0.32 * dot_mask,
    ]
    return tuple(col)


def undata_normal(u, v):
    rad_rib = 0.18 * math.sin(u * 2.0 * math.pi * 24.0 + v * 12.0)
    verr = 0.20 * math.cos(u * 80.0 - v * 48.0) * math.sin(v * 76.0)
    n = Vector((rad_rib + verr * 0.6, verr, 1.0)).normalized()
    return (0.5 + 0.5 * n.x, 0.5 + 0.5 * n.y, 0.5 + 0.5 * n.z)


def undata_roughness(u, v):
    if v < 0.16:
        val = 0.84 + 0.04 * math.sin(v * 90.0)
    else:
        tv = max(0.0, min(1.0, (v - 0.18) / 0.80))
        val = 0.72 - 0.16 * smooth(0.75, 0.98, tv) + 0.06 * math.sin(u * 60.0 + v * 45.0)
    return (val, val, val)


base = make_image("albedo", 512, undata_albedo, False)
nrm = make_image("normal", 512, undata_normal, True)
rough = make_image("roughness", 512, undata_roughness, True)

mat = bpy.data.materials.new("Montipora_Undata_Cap_SPS")
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
    "Original Scrolling Chalice Whorl Montipora undata/capricornis (AQ-70.11), watertight multi-whorl "
    "cabbage scrolls with ruffled growth margin & 210 3D verrucose tubercles, 3 packed 512px PBR maps, "
    "and raw rigid COLOR_0 masks."
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
print("MONTIPORA_UNDATA_SAVED_EXPORTED", json.dumps({
    "triangles": triangles,
    "vertices": len(mesh.vertices),
    "tubercles": tubercle_count,
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
    lo.rotation_euler = (Vector((0.0, 0.0, 0.04)) - lo.location).to_track_quat("-Z", "Y").to_euler()
