"""Original Fiery Acan Lord (Micromussa lordhowensis) cushioned polyp colony (AQ-70.11).
Closed 20,480-tri geodesic mound with 30 equidistant-azimuthal Voronoi polyps, radiating septal costae,
recessed oral mouths, zero side-wall stretching, sub-pixel aligned 512px PBR maps, and raw rigid COLOR_0 masks.
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
ID = "reef-acanthastrea-lordhowensis"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261126)


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


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / max(1e-6, b - a)))
    return t * t * (3.0 - 2.0 * t)


# Colony dome extents in Blender coordinates (Z up, -Y front): stays strictly inside [0.215, 0.195, 0.076]
RX = 0.098
RY = 0.086
HZ = 0.065

# 30 staggered Voronoi corallite polyp centers in equidistant azimuthal dome coordinates (rho in [0, 0.90]):
# 20 upper dome sites + 10 staggered side-flank sites around rho ~ 0.78..0.86
polyp_sites = [
    ( 0.00,  0.02, 1.00, 0.0),
    ( 0.28,  0.12, 0.96, 0.7),
    (-0.24,  0.15, 0.98, 1.4),
    ( 0.05, -0.27, 0.96, 2.1),
    (-0.12,  0.34, 0.94, 0.3),
    ( 0.39, -0.18, 0.92, 1.9),
    (-0.41, -0.12, 0.94, 2.7),
    ( 0.24,  0.40, 0.90, 1.1),
    (-0.38,  0.35, 0.89, 2.2),
    (-0.22, -0.40, 0.91, 0.5),
    ( 0.26, -0.45, 0.88, 1.6),
    ( 0.56,  0.06, 0.86, 2.4),
    (-0.58,  0.08, 0.87, 0.9),
    ( 0.46,  0.36, 0.84, 1.8),
    (-0.50, -0.35, 0.85, 0.2),
    ( 0.02,  0.56, 0.83, 2.9),
    ( 0.02, -0.57, 0.84, 1.3),
    ( 0.54, -0.31, 0.82, 0.6),
    (-0.28,  0.55, 0.82, 2.5),
    ( 0.34,  0.54, 0.81, 1.5),
]
for k_side in range(10):
    a_side = (k_side + 0.35) * (2.0 * math.pi / 10.0)
    r_side = 0.79 + 0.06 * math.sin(k_side * 2.1)
    polyp_sites.append((r_side * math.cos(a_side), r_side * math.sin(a_side), 0.78, k_side * 0.63))


def evaluate_voronoi_polyp(nx, ny):
    """Evaluate closest & second-closest Voronoi polyp center in azimuthal coordinates."""
    d1, d2 = 1e9, 1e9
    i1 = 0
    dx1, dy1 = 0.0, 0.0
    for idx, (sx, sy, _w, _rot) in enumerate(polyp_sites):
        dx = nx - sx
        dy = ny - sy
        d = math.hypot(dx, dy)
        if d < d1:
            d2 = d1
            d1 = d
            i1 = idx
            dx1, dy1 = dx, dy
        elif d < d2:
            d2 = d
    wall_dist = max(0.0, d2 - d1)
    site = polyp_sites[i1]
    ang = math.atan2(dy1, dx1) + site[3]
    septa = 0.5 + 0.5 * math.cos(ang * 16.0)
    mouth = 1.0 - smooth(0.015, 0.095, d1)
    puff = smooth(0.012, 0.082, wall_dist) * (1.0 - 0.60 * mouth)
    septa_relief = septa * smooth(0.03, 0.16, d1) * smooth(0.008, 0.075, wall_dist)
    trough = 1.0 - smooth(0.0, 0.055, wall_dist)
    return i1, d1, wall_dist, mouth, puff, septa_relief, trough


# Build 20,480-tri watertight geodesic sphere (subdivisions=6 -> zero poles, zero boundaries)
bm = bmesh.new()
bmesh.ops.create_icosphere(bm, subdivisions=6, radius=1.0)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()

raw_masks = []
uv_per_vert = []
for v in bm.verts:
    ux, uy, uz = v.co.x, v.co.y, v.co.z
    r_horiz = math.hypot(ux, uy)
    ang = math.atan2(uy, ux)
    perim = 1.0 + 0.06 * math.cos(ang * 5.0 + 0.35) + 0.03 * math.sin(ang * 3.0 - 0.7)

    # Equidistant azimuthal dome mapping: zero vertical wall stretch!
    theta_dome = math.acos(max(-1.0, min(1.0, uz)))
    rho = (2.0 / math.pi) * theta_dome
    if r_horiz > 1e-6:
        nx = (ux / r_horiz) * rho
        ny = (uy / r_horiz) * rho
    else:
        nx, ny = 0.0, 0.0

    # Clamp UVs strictly inside [0.02, 0.98]; outer rim > 0.98 wraps seamlessly into base limestone
    u_v = max(0.02, min(0.98, 0.5 + 0.45 * nx))
    v_v = max(0.02, min(0.98, 0.5 + 0.45 * ny))
    uv_per_vert.append((u_v, v_v))

    _i1, _d1, _wd, mouth, puff, septa_rel, trough = evaluate_voronoi_polyp(nx, ny)
    coralline_base = smooth(0.89, 0.98, rho)
    polyp_fade = (1.0 - coralline_base) if uz >= 0.0 else 0.0

    if uz >= 0.0:
        dome_z = HZ * (1.0 - (r_horiz * 0.94) ** 2.1) ** 0.56 if r_horiz < 1.06 else 0.0
        skirt_fade = smooth(0.02, 0.14, uz) * (1.0 - coralline_base * 0.85)
        polyp_bump = (0.0074 * puff + 0.0016 * septa_rel - 0.0038 * mouth - 0.0024 * trough) * skirt_fade
        px = ux * RX * perim
        py = uy * RY * perim
        pz = max(0.004, dome_z + polyp_bump)
        g_val = min(1.0, max(0.0, polyp_fade * (0.12 + 0.70 * puff + 0.18 * septa_rel - 0.35 * mouth)))
        ao_val = min(1.0, max(0.16, 0.22 + 0.30 * polyp_fade + 0.44 * puff - 0.18 * trough - 0.15 * mouth))
    else:
        down = smooth(0.0, -0.35, uz)
        inset = 1.0 - 0.12 * down
        px = ux * RX * perim * inset
        py = uy * RY * perim * inset
        pz = max(0.0, 0.004 * (1.0 - smooth(0.0, -0.22, uz)))
        g_val = 0.0
        ao_val = 0.16 + 0.06 * (1.0 - down)

    v.co = Vector((px, py, pz))
    ph_val = max(0.08, min(0.92, 0.50 + 0.28 * math.sin(nx * 5.2 + ny * 3.8)))
    raw_masks.append((0.0, g_val, ph_val, ao_val))

g_max = max(m[1] for m in raw_masks)
ao_max = max(m[3] for m in raw_masks)
raw_masks = [
    (0.0, m[1] / max(1e-5, g_max), m[2], min(1.0, m[3] / max(1e-5, ao_max)))
    for m in raw_masks
]

mesh = bpy.data.meshes.new("Reef_Acanthastrea_Lordhowensis_Mesh")
bm.to_mesh(mesh)
bm.free()

if mesh.validate(verbose=True):
    raise RuntimeError("Mesh validation failed")

obj = bpy.data.objects.new("Reef_Acanthastrea_Lordhowensis", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Acan_Azimuthal_UV")
attr = mesh.color_attributes.new(name="COLOR_0", type="FLOAT_COLOR", domain="CORNER")
mesh.color_attributes.active_color = attr
mesh.color_attributes.render_color_index = 0

for poly in mesh.polygons:
    poly.use_smooth = True
    for loop_i in poly.loop_indices:
        vi = mesh.loops[loop_i].vertex_index
        uv.data[loop_i].uv = uv_per_vert[vi]
        attr.data[loop_i].color = raw_masks[vi]

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


def acan_albedo(u, v):
    nx = (u - 0.5) / 0.45
    ny = (v - 0.5) / 0.45
    rho = math.hypot(nx, ny)
    i1, d1, _wd, mouth, puff, septa_rel, trough = evaluate_voronoi_polyp(nx, ny)
    speck = 0.5 + 0.5 * math.sin(u * 85.0 + math.cos(v * 70.0) * 1.4) * math.cos(v * 92.0 - u * 54.0)

    c_trough = (0.05, 0.13 + 0.05 * speck, 0.15 + 0.06 * speck)
    c_crimson = (0.64 + 0.14 * speck, 0.10 + 0.05 * speck, 0.07)
    c_fire = (0.92, 0.30 + 0.14 * septa_rel, 0.10 + 0.08 * speck)
    c_stripe = (0.96, 0.68 + 0.14 * speck, 0.44)
    c_mouth = (0.26 + 0.08 * ((i1 % 3) / 2.0), 0.16, 0.15)
    c_coralline = (0.15 + 0.04 * speck, 0.12 + 0.03 * speck, 0.14 + 0.03 * speck)

    ring_band = smooth(0.06, 0.17, d1)
    col = [c_crimson[k] * (1.0 - ring_band) + c_fire[k] * ring_band for k in range(3)]
    stripe_mix = septa_rel * smooth(0.05, 0.19, d1) * (1.0 - 0.7 * trough) * 0.52
    col = [col[k] * (1.0 - stripe_mix) + c_stripe[k] * stripe_mix for k in range(3)]
    col = [col[k] * (1.0 - mouth * 0.85) + c_mouth[k] * (mouth * 0.85) for k in range(3)]
    col = [col[k] * (1.0 - trough * 0.90) + c_trough[k] * (trough * 0.90) for k in range(3)]
    cor_mix = smooth(0.90, 0.99, rho)
    col = [col[k] * (1.0 - cor_mix) + c_coralline[k] * cor_mix for k in range(3)]
    return tuple(col)


def acan_normal(u, v):
    eps = 0.0032
    def h_sample(uu, vv):
        nx = (uu - 0.5) / 0.45
        ny = (vv - 0.5) / 0.45
        rho = math.hypot(nx, ny)
        _i1, _d1, _wd, mouth, puff, septa_rel, trough = evaluate_voronoi_polyp(nx, ny)
        cor_fade = 1.0 - smooth(0.90, 0.99, rho)
        grain = 0.14 * math.sin(uu * 150.0) * math.cos(vv * 150.0)
        return (0.7 * puff + 0.30 * septa_rel - 0.45 * mouth - 0.40 * trough) * cor_fade + grain

    hx = (h_sample(u + eps, v) - h_sample(u - eps, v)) * 0.95
    hy = (h_sample(u, v + eps) - h_sample(u, v - eps)) * 0.95
    n = Vector((-hx, -hy, 1.0)).normalized()
    return (0.5 + 0.5 * n.x, 0.5 + 0.5 * n.y, 0.5 + 0.5 * n.z)


def acan_roughness(u, v):
    nx = (u - 0.5) / 0.45
    ny = (v - 0.5) / 0.45
    rho = math.hypot(nx, ny)
    _i1, _d1, _wd, _mouth, puff, _septa, trough = evaluate_voronoi_polyp(nx, ny)
    cor_mix = smooth(0.90, 0.99, rho)
    val = (0.48 + 0.28 * trough - 0.06 * puff) * (1.0 - cor_mix) + 0.84 * cor_mix + 0.04 * math.sin(u * 40.0 + v * 40.0)
    return (val, val, val)


base = make_image("albedo", 512, acan_albedo, False)
nrm = make_image("normal", 512, acan_normal, True)
rough = make_image("roughness", 512, acan_roughness, True)

mat = bpy.data.materials.new("Acan_Lord_Fiery_LPS")
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
    "Original Fiery Acan Lord Micromussa lordhowensis cushioned polyp colony (AQ-70.11), 20,480-tri "
    "watertight geodesic mound with 30 equidistant-azimuthal Voronoi polyps covering dome & flanks, "
    "mottled coralline basal apron, sub-pixel aligned 512px PBR maps, and raw rigid COLOR_0 masks."
)

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
print("ACAN_SAVED_EXPORTED", json.dumps({
    "triangles": triangles,
    "vertices": len(mesh.vertices),
    "polyps": len(polyp_sites),
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
    lo.rotation_euler = (Vector((0.0, 0.0, 0.03)) - lo.location).to_track_quat("-Z", "Y").to_euler()
