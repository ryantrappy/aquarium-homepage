"""Original meandroid labyrinth brain coral morphology (AQ-70.11), not specimen-scale calibration.
Custom meter-scale Diploria-like dome with isotropic Turing-style meandering valleys,
ambulacral colline walls, septal costae, and valley-only fluorescence mask in COLOR_0.g.
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-brain-meandroid-diploria"
OUT = ROOT / "src/rendering/assets/splat-fish"


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
scene.cycles.device = "CPU"
scene.cycles.samples = 8
scene.cycles.seed = 2026
scene.render.threads_mode = "FIXED"
scene.render.threads = 4

# Build dense closed watertight hemisphere dome (subdivisions=6 + 1 Subsurf = 327,680 tris).
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=6, radius=1.0, location=(0, 0, 0))
body = bpy.context.active_object
body.name = "Brain_High_Source"
subsurf = body.modifiers.new("High_Detail_Subsurf", "SUBSURF")
subsurf.levels = 1
subsurf.render_levels = 1
bpy.ops.object.modifier_apply(modifier=subsurf.name)

# Read all vertices via numpy for fast vectorized sculpting.
n_verts = len(body.data.vertices)
coords = np.empty(n_verts * 3, dtype=np.float64)
body.data.vertices.foreach_get("co", coords)
coords = coords.reshape((n_verts, 3))

x0, y0, z0 = coords[:, 0], coords[:, 1], coords[:, 2]
theta = np.arctan2(y0, x0)
r_xy = np.sqrt(x0 * x0 + y0 * y0)

# Organic natural oval dome cushion with tucked carbonate basal skirt grounded at z=0.
wobble = 1.0 + 0.055 * np.sin(3.0 * theta + 0.4) + 0.030 * np.cos(5.0 * theta - 0.9)
rad_scale_xy = 0.074 * wobble
base_height = 0.090

pos_mask = z0 >= 0.0
z_mapped = np.where(pos_mask, base_height * (np.maximum(0.0, z0) ** 0.86) + 0.008, 0.008 * np.maximum(0.0, 1.0 + z0))
skirt_tuck = np.where(pos_mask, 1.0, 0.84 + 0.16 * np.maximum(0.0, 1.0 + z0))
px = x0 * rad_scale_xy * skirt_tuck
py = y0 * rad_scale_xy * skirt_tuck
pz = z_mapped

# Generate 28 isotropic 3D unit wavevectors for uniform-width meandering brain labyrinth.
rng = np.random.default_rng(20261122)
dirs_raw = rng.normal(size=(28, 3))
dirs = dirs_raw / np.linalg.norm(dirs_raw, axis=1, keepdims=True)
phases = rng.uniform(0.0, 2.0 * np.pi, size=(28,))

# Domain warp slightly to enhance natural irregular biological twisting without pinching.
p_stack = np.stack([px, py, pz], axis=1)
warp_x = 0.0045 * np.sin(px * 75.0 + py * 55.0 + 0.3) + 0.0025 * np.cos(pz * 95.0 - py * 65.0)
warp_y = 0.0045 * np.cos(py * 72.0 - pz * 58.0 + 1.1) + 0.0025 * np.sin(px * 88.0 + pz * 70.0)
warp_z = 0.0040 * np.sin(pz * 68.0 + px * 60.0 + 2.0)
p_warped = p_stack + np.stack([warp_x, warp_y, warp_z], axis=1)

k_labyrinth = 415.0  # ~15 mm characteristic wavelength (~7.5 mm valley-to-ridge)
proj = p_warped @ dirs.T * k_labyrinth + phases[None, :]
field = np.sum(np.cos(proj), axis=1) / np.sqrt(28.0 * 0.5)

# Smoothly attenuate labyrinth at the grounded base skirt (pz < 0.016 m).
skirt_fade = np.clip((pz - 0.006) / 0.014, 0.0, 1.0)
skirt_fade = skirt_fade * skirt_fade * (3.0 - 2.0 * skirt_fade)

# Diploria labyrinth profile:
# - Deep rounded meandering valleys where field < 0
# - Rounded colline ridges where field > 0 with subtle ambulacral summit groove near peak
# - Transverse septal costae ridges along the sloped valley walls
val_t = np.clip(-field / 1.15, 0.0, 1.0)
val_t = val_t * val_t * (3.0 - 2.0 * val_t)
ridge_t = np.clip(field / 1.15, 0.0, 1.0)
ridge_t = ridge_t * ridge_t * (3.0 - 2.0 * ridge_t)
ambulacral_groove = 0.00085 * np.exp(-((field - 0.95) / 0.32) ** 2)

# High-frequency isotropic septal teeth field (~1.9 mm spacing) strongest along valley slopes.
septa_dirs_raw = rng.normal(size=(18, 3))
septa_dirs = septa_dirs_raw / np.linalg.norm(septa_dirs_raw, axis=1, keepdims=True)
septa_phases = rng.uniform(0.0, 2.0 * np.pi, size=(18,))
septa_proj = p_stack @ septa_dirs.T * 2900.0 + septa_phases[None, :]
septa_field = np.sum(np.cos(septa_proj), axis=1) / np.sqrt(18.0 * 0.5)
slope_weight = np.exp(-((field + 0.05) / 0.65) ** 2)
septa_disp = 0.00055 * np.tanh(septa_field * 1.4) * slope_weight

disp = skirt_fade * (-0.0068 * val_t + 0.0024 * ridge_t - ambulacral_groove + septa_disp)

# Compute outward unit direction from dome center (0, 0, 0.008) for displacement.
center_offset = np.stack([px, py, pz - 0.008], axis=1)
center_norms = np.maximum(1e-6, np.linalg.norm(center_offset, axis=1, keepdims=True))
out_dir = center_offset / center_norms
# Keep base bottom flat at z >= 0.
out_dir[:, 2] = np.where(pz < 0.005, 0.0, out_dir[:, 2])

final_pos = p_stack + out_dir * disp[:, None]
final_pos[:, 2] = np.maximum(0.0, final_pos[:, 2])

# Store normalized valley fluorescence mask on a vertex float attribute so low-res decimated mesh inherits exact valleys!
valley_mask = skirt_fade * np.clip((-field - 0.05) / 0.85, 0.0, 1.0)
valley_mask = valley_mask * valley_mask * (3.0 - 2.0 * valley_mask)
# Guarantee exact [0, 1] extremes in the vertex mask.
valley_mask = np.clip(valley_mask, 0.0, 1.0)
valley_mask[np.argmin(field)] = 1.0
valley_mask[np.argmax(field)] = 0.0

body.data.vertices.foreach_set("co", final_pos.ravel().tolist())
body.data.update()
for poly in body.data.polygons:
    poly.use_smooth = True

v_attr = body.data.attributes.new(name="__valley_mask", type="FLOAT", domain="POINT")
v_attr.data.foreach_set("value", valley_mask.tolist())

body.data.validate(verbose=True)
body.data.calc_loop_triangles()
high_final = len(body.data.loop_triangles)

# Duplicate and decimate to runtime low mesh (~24,000 triangles).
low = body.copy()
low.data = body.data.copy()
low.name = "Reef_Brain_Meandroid_Diploria"
bpy.context.collection.objects.link(low)
body.select_set(False)
low.select_set(True)
bpy.context.view_layer.objects.active = low

decimate = low.modifiers.new("Runtime_LOD", "DECIMATE")
decimate.ratio = min(1.0, 24000.0 / high_final)
bpy.ops.object.modifier_apply(modifier=decimate.name)
low.data.validate(verbose=True)
low.data.update()
for poly in low.data.polygons:
    poly.use_smooth = True

bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003)
bpy.ops.object.mode_set(mode="OBJECT")

# Build COLOR_0 raw masks from the preserved valley attribute and coordinates.
low_verts = len(low.data.vertices)
low_co = np.empty(low_verts * 3, dtype=np.float64)
low.data.vertices.foreach_get("co", low_co)
low_co = low_co.reshape((low_verts, 3))

low_valley_attr = low.data.attributes.get("__valley_mask")
low_valley = np.zeros(low_verts, dtype=np.float64)
if low_valley_attr is not None:
    low_valley_attr.data.foreach_get("value", low_valley)
# Stretch valley mask cleanly to [0, 1] after decimation.
v_lo, v_hi = float(np.min(low_valley)), float(np.max(low_valley))
if v_hi > v_lo + 1e-4:
    low_valley = np.clip((low_valley - v_lo) / (v_hi - v_lo), 0.0, 1.0)

attr = low.data.color_attributes.new(name="COLOR_0", type="FLOAT_COLOR", domain="CORNER")
low.data.color_attributes.active_color = attr
low.data.color_attributes.render_color_index = 0
max_z = max(0.01, float(np.max(low_co[:, 2])))

for loop in low.data.loops:
    vi = loop.vertex_index
    p = low_co[vi]
    g_val = float(low_valley[vi])
    phase = 0.05 + 0.90 * ((math.atan2(p[1], p[0]) / (2.0 * math.pi) + 0.5 + 0.43 * (p[2] / max_z)) % 1.0)
    attr.data[loop.index].color = (0.0, g_val, phase, 1.0)

# Muted olive-umber colline ridges with emerald-teal fluorescent valleys (no blanket emissive!).
mat = bpy.data.materials.new("Diploria_Meandroid_Tissue")
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
bsdf.inputs["Roughness"].default_value = 0.72

geom = nodes.new("ShaderNodeNewGeometry")
noise = nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 280.0
noise.inputs["Detail"].default_value = 5.0
links.new(geom.outputs["Position"], noise.inputs["Vector"])

ridge_ramp = nodes.new("ShaderNodeValToRGB")
ridge_ramp.color_ramp.elements[0].color = (0.11, 0.095, 0.052, 1.0)
ridge_ramp.color_ramp.elements[1].color = (0.28, 0.25, 0.14, 1.0)
links.new(noise.outputs["Fac"], ridge_ramp.inputs["Fac"])

valley_ramp = nodes.new("ShaderNodeValToRGB")
valley_ramp.color_ramp.elements[0].color = (0.06, 0.22, 0.14, 1.0)
valley_ramp.color_ramp.elements[1].color = (0.14, 0.44, 0.27, 1.0)
links.new(noise.outputs["Fac"], valley_ramp.inputs["Fac"])

vc = nodes.new("ShaderNodeVertexColor")
vc.layer_name = "COLOR_0"
sep = nodes.new("ShaderNodeSeparateColor")
links.new(vc.outputs["Color"], sep.inputs["Color"])

tissue = nodes.new("ShaderNodeMix")
tissue.data_type = "RGBA"
links.new(sep.outputs["Green"], tissue.inputs["Factor"])
links.new(ridge_ramp.outputs["Color"], tissue.inputs["A"])
links.new(valley_ramp.outputs["Color"], tissue.inputs["B"])
links.new(tissue.outputs["Result"], bsdf.inputs["Base Color"])

rough = nodes.new("ShaderNodeMath")
rough.operation = "MULTIPLY_ADD"
rough.inputs[1].default_value = 0.18
rough.inputs[2].default_value = 0.60
links.new(noise.outputs["Fac"], rough.inputs[0])

low.data.materials.clear()
low.data.materials.append(mat)
high_mat = bpy.data.materials.new("High_Source_Clay")
high_mat.use_nodes = True
body.data.materials.clear()
body.data.materials.append(high_mat)

target = nodes.new("ShaderNodeTexImage")
target.name = "Bake_Target"
image_dir = OUT / "blend" / f"{ID}-textures"
image_dir.mkdir(parents=True, exist_ok=True)


def make_image(name, noncolor=True):
    im = bpy.data.images.new(f"{ID}-{name}", width=512, height=512, alpha=False)
    im.colorspace_settings.name = "Non-Color" if noncolor else "sRGB"
    fill = {
        "normal": (0.5, 0.5, 1.0, 1.0),
        "contact-ao": (1.0, 1.0, 1.0, 1.0),
        "roughness": (0.68, 0.68, 0.68, 1.0),
        "tissue": (0.18, 0.16, 0.09, 1.0),
    }[name]
    im.pixels.foreach_set(list(fill) * (512 * 512))
    return im


normal_image = make_image("normal")
target.image = normal_image
nodes.active = target
body.hide_render = False
body.select_set(True)
low.select_set(True)
bpy.context.view_layer.objects.active = low
bpy.ops.object.bake(
    type="NORMAL",
    normal_space="TANGENT",
    use_selected_to_active=True,
    use_cage=False,
    cage_extrusion=0.0025,
    max_ray_distance=0.006,
    margin=8,
    margin_type="EXTEND",
    use_clear=False,
)
body.select_set(False)
body.hide_render = True

ao_image = make_image("contact-ao")
target.image = ao_image
nodes.active = target
bpy.ops.object.bake(type="AO", use_selected_to_active=False, margin=8, margin_type="EXTEND", use_clear=False)

ao_pixels = list(ao_image.pixels)
uv = low.data.uv_layers.active
raw_ao_vals = []
for loop in low.data.loops:
    u, v = uv.data[loop.index].uv
    x = max(0, min(511, round(u * 511)))
    y = max(0, min(511, round(v * 511)))
    raw_ao_vals.append(ao_pixels[(y * 512 + x) * 4])
ao_lo = min(raw_ao_vals)
ao_hi = max(raw_ao_vals)
ao_span = max(1e-4, ao_hi - ao_lo)
for loop, val in zip(low.data.loops, raw_ao_vals):
    norm_ao = 0.18 + 0.82 * max(0.0, min(1.0, (val - ao_lo) / ao_span))
    rgba = list(attr.data[loop.index].color)
    rgba[3] = norm_ao
    attr.data[loop.index].color = rgba

emission = nodes.new("ShaderNodeEmission")
links.new(emission.outputs[0], output.inputs["Surface"])

base_image = make_image("tissue", False)
target.image = base_image
nodes.active = target
links.new(tissue.outputs["Result"], emission.inputs["Color"])
bpy.ops.object.bake(type="EMIT", use_selected_to_active=False, margin=8, margin_type="EXTEND", use_clear=False)

rough_image = make_image("roughness")
target.image = rough_image
nodes.active = target
links.new(rough.outputs[0], emission.inputs["Color"])
bpy.ops.object.bake(type="EMIT", use_selected_to_active=False, margin=8, margin_type="EXTEND", use_clear=False)

for im in (normal_image, ao_image, base_image, rough_image):
    im.filepath_raw = str(image_dir / f"{im.name}.png")
    im.file_format = "PNG"
    im.save()
    im.pack()

nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
links.new(bsdf.outputs[0], output.inputs["Surface"])
tex = nodes.new("ShaderNodeTexImage")
tex.image = base_image
links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
rtex = nodes.new("ShaderNodeTexImage")
rtex.image = rough_image
links.new(rtex.outputs["Color"], bsdf.inputs["Roughness"])
ntex = nodes.new("ShaderNodeTexImage")
ntex.image = normal_image
nm = nodes.new("ShaderNodeNormalMap")
nm.inputs["Strength"].default_value = 0.78
links.new(ntex.outputs["Color"], nm.inputs["Color"])
links.new(nm.outputs[0], bsdf.inputs["Normal"])
mat.use_backface_culling = True

if low.data.validate(verbose=True):
    raise RuntimeError("Runtime mesh changed after bake; rebuild before persisting")

body.hide_set(True)
low.select_set(True)
bpy.context.view_layer.objects.active = low
low["authoring_notes"] = (
    "Original meandroid Diploria-like labyrinth brain coral with isotropic Turing valleys, "
    "ambulacral colline walls, transverse septal costae, baked normal/tissue/roughness maps, "
    "and raw COLOR_0 masks (R=0 rigid, G=valley-only fluorescence mask, B=meander phase, A=baked AO floored 0.18)."
)
low.data.calc_loop_triangles()
triangles = len(low.data.loop_triangles)

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
    export_all_vertex_colors=False,
    export_active_vertex_color_when_no_material=True,
    export_attributes=False,
)
print(
    "BRAIN_MEANDROID_SAVED_EXPORTED",
    json.dumps({"triangles": triangles, "highTriangles": high_final, "vertices": len(low.data.vertices), "dimensions": list(low.dimensions)}),
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
    lo.rotation_euler = (Vector((0, 0, 0.04)) - lo.location).to_track_quat("-Z", "Y").to_euler()
