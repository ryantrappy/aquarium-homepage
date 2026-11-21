"""Original Dragon-Soul Favia / Favites pentagona War Coral colony (AQ-70.11).
Closed 20,480-tri geodesic dome using equidistant azimuthal UVs (zero flank stretch),
38 tightly packed angular polygonal Voronoi corallite calyces with sharp crimson-garnet
shared walls, radiating toothed septa, and sunken luminous emerald-green oral eyes.
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
ID = "reef-favia-war-coral"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261202)


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


# Strictly compact dims for Right Island cave-adjacent socket_brain_apron_03 (legacy [0.256, 0.082, 0.234])
RX = 0.091
RY = 0.082
HZ = 0.060

# 38 polygonal Favites corallite centers in equidistant azimuthal coordinates (26 dome + 12 flanks)
# Generated deterministically via staggered spiral + outer flank ring for natural hexagonal packing
polyp_sites = []
n_dome = 26
golden = math.pi * (3.0 - math.sqrt(5.0))
for k in range(n_dome):
    r_k = 0.68 * math.sqrt((k + 0.15) / n_dome)
    th = k * golden + 0.25
    polyp_sites.append((r_k * math.cos(th), r_k * math.sin(th), (k * 0.71) % (2.0 * math.pi)))
for k_side in range(12):
    a_side = (k_side + 0.40) * (2.0 * math.pi / 12.0)
    r_side = 0.80 + 0.04 * math.sin(k_side * 2.3)
    polyp_sites.append((r_side * math.cos(a_side), r_side * math.sin(a_side), (k_side * 0.83) % (2.0 * math.pi)))


def evaluate_favia_calyx(nx, ny):
    """Evaluate tight polygonal Favites calyx wall crest, toothed septa, and sunken emerald eye."""
    wx = nx + 0.018 * math.sin(ny * 8.2 + 0.4)
    wy = ny + 0.018 * math.cos(nx * 8.2 - 0.3)

    d1, d2 = 1e9, 1e9
    i1 = 0
    dx1, dy1 = 0.0, 0.0
    for idx, (sx, sy, _rot) in enumerate(polyp_sites):
        dx = wx - sx
        dy = wy - sy
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
    ang = math.atan2(dy1, dx1) + site[2]
    septa = 0.5 + 0.5 * math.cos(ang * 14.0)

    # Tall sharp polygonal shared ridge along Voronoi boundary, descending cleanly into bowl cavity & emerald mouth
    ridge_crest = 1.0 - smooth(0.008, 0.068, wall_dist)
    bowl_dip = smooth(0.025, 0.115, wall_dist) * (1.0 - smooth(0.08, 0.17, d1) * 0.45)
    mouth_eye = 1.0 - smooth(0.014, 0.078, d1)
    septa_ribs = septa * smooth(0.020, 0.11, d1) * smooth(0.006, 0.062, wall_dist)
    return i1, d1, wall_dist, ridge_crest, bowl_dip, mouth_eye, septa_ribs


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
    perim = 1.0 + 0.035 * math.cos(ang * 5.0 + 0.45) + 0.025 * math.sin(ang * 3.0 - 0.5)

    # Equidistant azimuthal dome mapping: zero vertical wall stretch!
    theta_dome = math.acos(max(-1.0, min(1.0, uz)))
    rho = (2.0 / math.pi) * theta_dome
    if r_horiz > 1e-6:
        nx = (ux / r_horiz) * rho
        ny = (uy / r_horiz) * rho
    else:
        nx, ny = 0.0, 0.0

    u_v = max(0.02, min(0.98, 0.5 + 0.45 * nx))
    v_v = max(0.02, min(0.98, 0.5 + 0.45 * ny))
    uv_per_vert.append((u_v, v_v))

    _i1, _d1, _wd, ridge_crest, bowl_dip, mouth_eye, septa_ribs = evaluate_favia_calyx(nx, ny)
    coralline_base = smooth(0.90, 0.99, rho)
    polyp_fade = (1.0 - coralline_base) if uz >= 0.0 else 0.0

    if uz >= 0.0:
        dome_z = HZ * (1.0 - (r_horiz * 0.94) ** 2.15) ** 0.58 if r_horiz < 1.06 else 0.0
        skirt_fade = smooth(0.02, 0.14, uz) * (1.0 - coralline_base * 0.85)
        calyx_disp = (0.0052 * ridge_crest + 0.0018 * septa_ribs - 0.0038 * bowl_dip - 0.0032 * mouth_eye) * skirt_fade
        px = ux * RX * perim
        py = uy * RY * perim
        pz = max(0.003, dome_z + calyx_disp)
        # Tip fluorescence peaks sharply in glowing emerald oral centers and delicate crest highlights
        g_val = min(1.0, max(0.0, polyp_fade * (0.14 + 0.78 * mouth_eye + 0.28 * septa_ribs + 0.18 * ridge_crest)))
        ao_val = min(1.0, max(0.15, 0.24 + 0.26 * polyp_fade + 0.50 * ridge_crest - 0.20 * mouth_eye))
    else:
        down = smooth(0.0, -0.35, uz)
        inset = 1.0 - 0.12 * down
        px = ux * RX * perim * inset
        py = uy * RY * perim * inset
        pz = max(0.0, 0.003 * (1.0 - smooth(0.0, -0.22, uz)))
        g_val = 0.0
        ao_val = 0.15 + 0.06 * (1.0 - down)

    v.co = Vector((px, py, pz))
    ph_val = max(0.08, min(0.92, 0.50 + 0.28 * math.cos(nx * 5.0 - ny * 4.2)))
    raw_masks.append((0.0, g_val, ph_val, ao_val))

g_max = max(m[1] for m in raw_masks)
ao_max = max(m[3] for m in raw_masks)
raw_masks = [
    (0.0, m[1] / max(1e-5, g_max), m[2], min(1.0, m[3] / max(1e-5, ao_max)))
    for m in raw_masks
]

mesh = bpy.data.meshes.new("Reef_Favia_War_Coral_Mesh")
bm.to_mesh(mesh)
bm.free()

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

obj = bpy.data.objects.new("Reef_Favia_War_Coral", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Favia_Azimuthal_UV")
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


def favia_albedo(u, v):
    nx = (u - 0.5) / 0.45
    ny = (v - 0.5) / 0.45
    rho = math.hypot(nx, ny)
    _i1, _d1, _wd, ridge_crest, bowl_dip, mouth_eye, septa_ribs = evaluate_favia_calyx(nx, ny)
    speck = 0.5 + 0.5 * math.sin(u * 78.0 + math.cos(v * 64.0) * 1.4) * math.cos(v * 84.0 - u * 48.0)

    c_burgundy = (0.28 + 0.06 * speck, 0.04 + 0.02 * speck, 0.08 + 0.03 * speck)
    c_crimson = (0.76 + 0.14 * speck, 0.10 + 0.05 * speck, 0.16 + 0.05 * speck)
    c_septa = (0.94, 0.34 + 0.12 * speck, 0.28 + 0.08 * speck)
    c_emerald = (0.12 + 0.08 * speck, 0.88 + 0.10 * speck, 0.42 + 0.12 * speck)
    c_coralline = (0.16 + 0.04 * speck, 0.12 + 0.03 * speck, 0.15 + 0.03 * speck)

    col = [c_burgundy[k] * (1.0 - ridge_crest) + c_crimson[k] * ridge_crest for k in range(3)]
    septa_mix = septa_ribs * (1.0 - mouth_eye * 0.8) * 0.65
    col = [col[k] * (1.0 - septa_mix) + c_septa[k] * septa_mix for k in range(3)]
    col = [col[k] * (1.0 - mouth_eye * 0.92) + c_emerald[k] * (mouth_eye * 0.92) for k in range(3)]
    cor_mix = smooth(0.90, 0.99, rho)
    col = [col[k] * (1.0 - cor_mix) + c_coralline[k] * cor_mix for k in range(3)]
    return tuple(col)


def favia_normal(u, v):
    eps = 0.0030
    def h_sample(uu, vv):
        nx = (uu - 0.5) / 0.45
        ny = (vv - 0.5) / 0.45
        rho = math.hypot(nx, ny)
        _i1, _d1, _wd, ridge_crest, bowl_dip, mouth_eye, septa_ribs = evaluate_favia_calyx(nx, ny)
        cor_fade = 1.0 - smooth(0.90, 0.99, rho)
        grain = 0.12 * math.sin(uu * 140.0) * math.cos(vv * 140.0)
        return (0.80 * ridge_crest + 0.36 * septa_ribs - 0.42 * bowl_dip - 0.40 * mouth_eye) * cor_fade + grain

    hx = (h_sample(u + eps, v) - h_sample(u - eps, v)) * 0.95
    hy = (h_sample(u, v + eps) - h_sample(u, v - eps)) * 0.95
    n = Vector((-hx, -hy, 1.0)).normalized()
    return (0.5 + 0.5 * n.x, 0.5 + 0.5 * n.y, 0.5 + 0.5 * n.z)


def favia_roughness(u, v):
    nx = (u - 0.5) / 0.45
    ny = (v - 0.5) / 0.45
    rho = math.hypot(nx, ny)
    _i1, _d1, _wd, ridge_crest, _bowl, mouth_eye, _septa = evaluate_favia_calyx(nx, ny)
    cor_mix = smooth(0.90, 0.99, rho)
    val = (0.58 - 0.14 * mouth_eye - 0.08 * ridge_crest) * (1.0 - cor_mix) + 0.84 * cor_mix + 0.04 * math.sin(u * 42.0 + v * 42.0)
    return (val, val, val)


base = make_image("albedo", 512, favia_albedo, False)
nrm = make_image("normal", 512, favia_normal, True)
rough = make_image("roughness", 512, favia_roughness, True)

mat = bpy.data.materials.new("Favia_War_Coral_LPS")
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
nm.inputs["Strength"].default_value = 0.88
links.new(ntex.outputs["Color"], nm.inputs["Color"])
links.new(nm.outputs[0], bsdf.inputs["Normal"])
mesh.materials.append(mat)

obj["authoring_notes"] = (
    "Original Dragon-Soul Favia / Favites pentagona War Coral colony (AQ-70.11), 20,480-tri watertight "
    "equidistant-azimuthal geodesic dome with 38 polygonal corallite calyces, raised crimson ridges, "
    "toothed septa, neon-emerald oral eyes, 512px PBR maps, and raw rigid COLOR_0 masks."
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
print("FAVIA_SAVED_EXPORTED", json.dumps({
    "triangles": triangles,
    "vertices": len(mesh.vertices),
    "calyces": len(polyp_sites),
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
