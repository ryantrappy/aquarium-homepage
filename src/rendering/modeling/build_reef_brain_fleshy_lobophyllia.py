"""Original broad fleshy lobed Lobophyllia / Symphyllia brain coral morphology (AQ-70.11 Variant #2).
Custom meter-scale cushion dome with wide meandering inflated lobes, deep valleys,
bold transverse septal costae, baked PBR maps, and valley-only fluorescence mask in COLOR_0.g.
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-brain-fleshy-lobophyllia"
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

bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=6, radius=1.0, location=(0, 0, 0))
body = bpy.context.active_object
body.name = "Lobophyllia_High_Source"
subsurf = body.modifiers.new("High_Detail_Subsurf", "SUBSURF")
subsurf.levels = 1
subsurf.render_levels = 1
bpy.ops.object.modifier_apply(modifier=subsurf.name)

n_verts = len(body.data.vertices)
coords = np.empty(n_verts * 3, dtype=np.float64)
body.data.vertices.foreach_get("co", coords)
coords = coords.reshape((n_verts, 3))

x0, y0, z0 = coords[:, 0], coords[:, 1], coords[:, 2]
theta = np.arctan2(y0, x0)

# Broad low cushion silhouette (~0.182 x 0.172 x 0.078 m) grounded at z=0.
wobble = 1.0 + 0.07 * np.sin(2.0 * theta + 0.8) + 0.04 * np.cos(4.0 * theta - 0.5)
rad_x = 0.088 * wobble
rad_y = 0.082 * wobble
base_height = 0.068

pos_mask = z0 >= 0.0
z_mapped = np.where(pos_mask, base_height * (np.maximum(0.0, z0) ** 0.78) + 0.007, 0.007 * np.maximum(0.0, 1.0 + z0))
skirt_tuck = np.where(pos_mask, 1.0, 0.85 + 0.15 * np.maximum(0.0, 1.0 + z0))
px = x0 * rad_x * skirt_tuck
py = y0 * rad_y * skirt_tuck
pz = z_mapped

rng = np.random.default_rng(20261126)
dirs_raw = rng.normal(size=(24, 3))
dirs = dirs_raw / np.linalg.norm(dirs_raw, axis=1, keepdims=True)
phases = rng.uniform(0.0, 2.0 * np.pi, size=(24,))

p_stack = np.stack([px, py, pz], axis=1)
warp_x = 0.0055 * np.sin(px * 52.0 + py * 38.0 + 0.7)
warp_y = 0.0055 * np.cos(py * 49.0 - pz * 42.0 + 1.4)
warp_z = 0.0045 * np.sin(pz * 50.0 + px * 44.0 + 2.3)
p_warped = p_stack + np.stack([warp_x, warp_y, warp_z], axis=1)

# Broad inflated Lobophyllia lobes (~24 mm characteristic wavelength).
k_labyrinth = 265.0
proj = p_warped @ dirs.T * k_labyrinth + phases[None, :]
field = np.sum(np.cos(proj), axis=1) / np.sqrt(24.0 * 0.5)

skirt_fade = np.clip((pz - 0.005) / 0.013, 0.0, 1.0)
skirt_fade = skirt_fade * skirt_fade * (3.0 - 2.0 * skirt_fade)

val_t = np.clip(-field / 1.10, 0.0, 1.0)
val_t = val_t * val_t * (3.0 - 2.0 * val_t)
# Inflated broad rounded fleshy cushion lobes without narrow double-crest groove.
lobe_t = np.clip(field / 1.05, 0.0, 1.0)
lobe_t = np.sqrt(lobe_t) * (0.6 + 0.4 * lobe_t)

# Bold transverse fleshy septal ridges along lobe walls (~3.2 mm spacing).
septa_dirs_raw = rng.normal(size=(16, 3))
septa_dirs = septa_dirs_raw / np.linalg.norm(septa_dirs_raw, axis=1, keepdims=True)
septa_phases = rng.uniform(0.0, 2.0 * np.pi, size=(16,))
septa_proj = p_stack @ septa_dirs.T * 1950.0 + septa_phases[None, :]
septa_field = np.sum(np.cos(septa_proj), axis=1) / np.sqrt(16.0 * 0.5)
slope_weight = np.exp(-((field + 0.08) / 0.75) ** 2)
septa_disp = 0.00085 * np.tanh(septa_field * 1.5) * slope_weight

disp = skirt_fade * (-0.0080 * val_t + 0.0045 * lobe_t + septa_disp)

center_offset = np.stack([px, py, pz - 0.007], axis=1)
center_norms = np.maximum(1e-6, np.linalg.norm(center_offset, axis=1, keepdims=True))
out_dir = center_offset / center_norms
out_dir[:, 2] = np.where(pz < 0.004, 0.0, out_dir[:, 2])

final_pos = p_stack + out_dir * disp[:, None]
final_pos[:, 2] = np.maximum(0.0, final_pos[:, 2])

# Enforce strict bounds check inside canonical coral-brain-diploria ([0.256, 0.082, 0.234]).
min_z = float(np.min(final_pos[:, 2]))
final_pos[:, 2] -= min_z
max_z_raw = float(np.max(final_pos[:, 2]))
if max_z_raw > 0.078:
    final_pos[:, 2] *= 0.078 / max_z_raw

valley_mask = skirt_fade * np.clip((-field - 0.02) / 0.85, 0.0, 1.0)
valley_mask = valley_mask * valley_mask * (3.0 - 2.0 * valley_mask)
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

low = body.copy()
low.data = body.data.copy()
low.name = "Reef_Brain_Fleshy_Lobophyllia"
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

low_verts = len(low.data.vertices)
low_co = np.empty(low_verts * 3, dtype=np.float64)
low.data.vertices.foreach_get("co", low_co)
low_co = low_co.reshape((low_verts, 3))

low_valley_attr = low.data.attributes.get("__valley_mask")
low_valley = np.zeros(low_verts, dtype=np.float64)
if low_valley_attr is not None:
    low_valley_attr.data.foreach_get("value", low_valley)
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
    phase = 0.05 + 0.90 * ((math.atan2(p[1], p[0]) / (2.0 * math.pi) + 0.5 + 0.41 * (p[2] / max_z)) % 1.0)
    attr.data[loop.index].color = (0.0, g_val, phase, 1.0)

# Deep cobalt-slate outer fleshy lobes with bright turquoise-cyan valley centers (no emissive!).
mat = bpy.data.materials.new("Lobophyllia_Fleshy_Tissue")
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
bsdf.inputs["Roughness"].default_value = 0.68

geom = nodes.new("ShaderNodeNewGeometry")
noise = nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 240.0
noise.inputs["Detail"].default_value = 5.0
links.new(geom.outputs["Position"], noise.inputs["Vector"])

lobe_ramp = nodes.new("ShaderNodeValToRGB")
lobe_ramp.color_ramp.elements[0].color = (0.04, 0.07, 0.16, 1.0)
lobe_ramp.color_ramp.elements[1].color = (0.12, 0.18, 0.36, 1.0)
links.new(noise.outputs["Fac"], lobe_ramp.inputs["Fac"])

valley_ramp = nodes.new("ShaderNodeValToRGB")
valley_ramp.color_ramp.elements[0].color = (0.05, 0.34, 0.42, 1.0)
valley_ramp.color_ramp.elements[1].color = (0.14, 0.58, 0.68, 1.0)
links.new(noise.outputs["Fac"], valley_ramp.inputs["Fac"])

vc = nodes.new("ShaderNodeVertexColor")
vc.layer_name = "COLOR_0"
sep = nodes.new("ShaderNodeSeparateColor")
links.new(vc.outputs["Color"], sep.inputs["Color"])

tissue = nodes.new("ShaderNodeMix")
tissue.data_type = "RGBA"
links.new(sep.outputs["Green"], tissue.inputs["Factor"])
links.new(lobe_ramp.outputs["Color"], tissue.inputs["A"])
links.new(valley_ramp.outputs["Color"], tissue.inputs["B"])
links.new(tissue.outputs["Result"], bsdf.inputs["Base Color"])

rough = nodes.new("ShaderNodeMath")
rough.operation = "MULTIPLY_ADD"
rough.inputs[1].default_value = 0.16
rough.inputs[2].default_value = 0.56
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
        "roughness": (0.64, 0.64, 0.64, 1.0),
        "tissue": (0.08, 0.14, 0.28, 1.0),
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
    cage_extrusion=0.0028,
    max_ray_distance=0.007,
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
ao_lo, ao_hi = min(raw_ao_vals), max(raw_ao_vals)
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
    "Original broad fleshy lobed Lobophyllia/Symphyllia brain coral dome with wide meandering valleys, "
    "bold transverse septal ridges, baked PBR maps, and raw COLOR_0 masks (R=0 rigid, G=valley-only fluorescence "
    "mask, B=meander phase, A=normalized baked AO floored 0.18)."
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
    "LOBOPHYLLIA_SAVED_EXPORTED",
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
