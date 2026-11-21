"""Original whorled Montipora plate morphology (AQ-70.11), not specimen-scale calibration.
Custom meter-scale design with overlapping undulating whorls, verrucose corallites,
and pale growing rim. Save packed native, export override, bake PBR + raw contact AO.
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-montipora-whorled-plate"
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
scene.cycles.device = "CPU"
scene.cycles.samples = 8
scene.cycles.seed = 2026
scene.render.threads_mode = "FIXED"
scene.render.threads = 4

verts, faces = [], []
rim_points = []
corallite_sites = []


def add_whorl_tier(
    theta_start,
    theta_span,
    r_inner,
    r_outer_base,
    z_root,
    z_lift,
    lobe_freq,
    lobe_phase,
    lobe_amp,
    spiral_pitch,
    ang_steps=56,
    rad_steps=16,
):
    """Build a solid undulating logarithmic whorl plate tier with thickness."""
    top_grid = []
    bot_grid = []

    for i in range(ang_steps + 1):
        u = i / ang_steps
        theta = theta_start + u * theta_span
        spiral_scale = 1.0 + spiral_pitch * u
        ruffle = (
            lobe_amp * math.sin(lobe_freq * theta + lobe_phase)
            + 0.45 * lobe_amp * math.cos((lobe_freq + 3.0) * theta - lobe_phase * 0.7)
            + 0.20 * lobe_amp * math.sin((lobe_freq * 2.0 + 1.0) * theta)
        )
        r_max = (r_outer_base * spiral_scale) * (1.0 + ruffle)
        t_row = []
        b_row = []
        for j in range(rad_steps + 1):
            v = j / rad_steps
            # Non-linear spacing concentrates vertices toward the ruffled outer margin.
            vr = 1.0 - (1.0 - v) ** 1.15
            r = r_inner + vr * (r_max - r_inner)
            cup_curve = (vr ** 1.25) * z_lift
            wave_z = 0.0045 * (vr ** 1.4) * math.sin(lobe_freq * theta + lobe_phase + 0.6)
            concentric = 0.0008 * math.sin(vr * math.pi * 6.0) * (1.0 - 0.5 * vr)
            z_mid = z_root + cup_curve + wave_z + concentric + 0.008 * u * vr
            half_thick = 0.0024 * (1.0 - 0.48 * vr) + 0.0006 * (1.0 - vr)

            x = r * math.cos(theta)
            y = r * math.sin(theta)
            t_pos = Vector((x, y, z_mid + half_thick))
            b_pos = Vector((x, y, z_mid - half_thick))

            ti = len(verts)
            verts.append(tuple(t_pos))
            bi = len(verts)
            verts.append(tuple(b_pos))
            t_row.append(ti)
            b_row.append(bi)

            if j == rad_steps:
                rim_points.append(t_pos.copy())
            elif 0.18 < vr < 0.92 and i % 2 == 0 and j % 2 == 0:
                # Candidate upper surface site for verrucose corallites.
                radial_dir = Vector((math.cos(theta), math.sin(theta), 0.0))
                up_n = (Vector((0, 0, 1)) - radial_dir * 0.25).normalized()
                corallite_sites.append((t_pos.copy(), up_n))
        top_grid.append(t_row)
        bot_grid.append(b_row)

    for i in range(ang_steps):
        for j in range(rad_steps):
            faces.append((top_grid[i][j], top_grid[i + 1][j], top_grid[i + 1][j + 1], top_grid[i][j + 1]))
            faces.append((bot_grid[i][j], bot_grid[i][j + 1], bot_grid[i + 1][j + 1], bot_grid[i + 1][j]))

    # Stitch outer rim, inner edge, and two azimuthal end caps to form a closed shell.
    for i in range(ang_steps):
        faces.append((top_grid[i][rad_steps], top_grid[i + 1][rad_steps], bot_grid[i + 1][rad_steps], bot_grid[i][rad_steps]))
        faces.append((bot_grid[i][0], bot_grid[i + 1][0], top_grid[i + 1][0], top_grid[i][0]))
    for j in range(rad_steps):
        faces.append((bot_grid[0][j], bot_grid[0][j + 1], top_grid[0][j + 1], top_grid[0][j]))
        faces.append((top_grid[ang_steps][j], top_grid[ang_steps][j + 1], bot_grid[ang_steps][j + 1], bot_grid[ang_steps][j]))


# Three overlapping spiraling Montipora capricornis whorl tiers around a central trunk.
add_whorl_tier(
    theta_start=-0.35,
    theta_span=math.radians(248),
    r_inner=0.012,
    r_outer_base=0.072,
    z_root=0.016,
    z_lift=0.032,
    lobe_freq=5.0,
    lobe_phase=0.4,
    lobe_amp=0.14,
    spiral_pitch=0.28,
)
add_whorl_tier(
    theta_start=math.radians(115),
    theta_span=math.radians(235),
    r_inner=0.010,
    r_outer_base=0.056,
    z_root=0.034,
    z_lift=0.028,
    lobe_freq=6.0,
    lobe_phase=1.9,
    lobe_amp=0.13,
    spiral_pitch=0.25,
)
add_whorl_tier(
    theta_start=math.radians(230),
    theta_span=math.radians(205),
    r_inner=0.008,
    r_outer_base=0.039,
    z_root=0.052,
    z_lift=0.024,
    lobe_freq=4.0,
    lobe_phase=3.1,
    lobe_amp=0.12,
    spiral_pitch=0.22,
)

mesh = bpy.data.meshes.new("Montipora_Whorls_Construction")
mesh.from_pydata(verts, [], faces)
mesh.update()
body = bpy.data.objects.new("Montipora_High_Source", mesh)
bpy.context.collection.objects.link(body)
bpy.context.view_layer.objects.active = body
body.select_set(True)

# Add central calcified trunk & basal holdfast seated cleanly at z=0.
bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.022, radius2=0.014, depth=0.056, location=(0, 0, 0.028))
stem_obj = bpy.context.active_object
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=0.026, location=(0, 0, 0.003))
foot = bpy.context.active_object
foot.scale.z = 0.24
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
stem_obj.select_set(True)
foot.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

remesh = body.modifiers.new("Organic_Whorl_Union", "REMESH")
remesh.mode = "VOXEL"
remesh.voxel_size = 0.00085
remesh.use_smooth_shade = True
bpy.ops.object.modifier_apply(modifier=remesh.name)

smooth_mod = body.modifiers.new("Smooth_Whorls", "SMOOTH")
smooth_mod.factor = 0.30
smooth_mod.iterations = 2
bpy.ops.object.modifier_apply(modifier=smooth_mod.name)

# Normalize width to ~0.195m with z0=0.
xs = [v.co.x for v in body.data.vertices]
ys = [v.co.y for v in body.data.vertices]
zs = [v.co.z for v in body.data.vertices]
z0 = min(zs)
span_xy = max(max(xs) - min(xs), max(ys) - min(ys))
scale = 0.195 / span_xy
for v in body.data.vertices:
    v.co = Vector((v.co.x * scale, v.co.y * scale, (v.co.z - z0) * scale))
    if v.co.z < 0.0018:
        v.co.z = 0.0
scaled_rim_points = [Vector((p.x * scale, p.y * scale, (p.z - z0) * scale)) for p in rim_points]
scaled_sites = [(Vector((p.x * scale, p.y * scale, (p.z - z0) * scale)), n) for p, n in corallite_sites]
body.data.update()

# Fine calcified coenosteum relief for normal bake.
cloud = bpy.data.textures.new("Montipora_Coenosteum", type="CLOUDS")
cloud.noise_scale = 0.0028
cloud.noise_depth = 3
relief = body.modifiers.new("Fine_Plate_Relief", "DISPLACE")
relief.texture = cloud
relief.strength = 0.00024
relief.mid_level = 0.5
bpy.ops.object.modifier_apply(modifier=relief.name)
for p in body.data.polygons:
    p.use_smooth = True

low = body.copy()
low.data = body.data.copy()
low.name = "Reef_Montipora_Whorled_Plate"
bpy.context.collection.objects.link(low)
body.select_set(False)
low.select_set(True)
bpy.context.view_layer.objects.active = low
low.data.calc_loop_triangles()
before_tris = len(low.data.loop_triangles)
decimate = low.modifiers.new("Runtime_LOD", "DECIMATE")
decimate.ratio = min(1.0, 21000.0 / before_tris)
bpy.ops.object.modifier_apply(modifier=decimate.name)
low.data.validate(verbose=True)
low.data.update()

# Add fine verrucose polyp papillae across upper whorl surfaces on high source + sparse runtime silhouettes.
rng.shuffle(scaled_sites)
selected_sites = scaled_sites[:820]
cv, cf, lv, lf, lr = [], [], [], [], []
for idx, (origin, axis) in enumerate(selected_sites):
    cn = axis.cross(Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((1, 0, 0))).normalized()
    cb = axis.cross(cn).normalized()
    start = len(cv)
    for height, radius in ((-0.0002, 0.00055), (0.00045, 0.00070), (0.00075, 0.00056), (0.00075, 0.00026), (0.00040, 0.00016)):
        for j in range(6):
            phi = j * 2.0 * math.pi / 6.0
            cv.append(tuple(origin + axis * height + (math.cos(phi) * cn + math.sin(phi) * cb) * radius))
    for ring in range(4):
        for j in range(6):
            nxt = (j + 1) % 6
            cf.append((start + ring * 6 + j, start + ring * 6 + nxt, start + (ring + 1) * 6 + nxt, start + (ring + 1) * 6 + j))
    cf.append(tuple(start + 4 * 6 + j for j in range(6)))

    if idx % 14 == 0:
        lstart = len(lv)
        for height, radius, rim in ((-0.0002, 0.00055, 0.0), (0.00078, 0.00066, 0.95), (0.00078, 0.00032, 0.65)):
            for j in range(5):
                phi = j * 2.0 * math.pi / 5.0
                lv.append(tuple(origin + axis * height + (math.cos(phi) * cn + math.sin(phi) * cb) * radius))
                lr.append(rim)
        floor_i = len(lv)
        lv.append(tuple(origin + axis * 0.00042))
        lr.append(0.30)
        for ring in range(2):
            for j in range(5):
                nxt = (j + 1) % 5
                lf.append((lstart + ring * 5 + j, lstart + ring * 5 + nxt, lstart + (ring + 1) * 5 + nxt, lstart + (ring + 1) * 5 + j))
        for j in range(5):
            lf.append((lstart + 10 + j, lstart + 10 + (j + 1) % 5, floor_i))

cmesh = bpy.data.meshes.new("High_Montipora_Polyps")
cmesh.from_pydata(cv, [], cf)
cmesh.update()
cups = bpy.data.objects.new("High_Montipora_Polyps", cmesh)
bpy.context.collection.objects.link(cups)
for poly in cups.data.polygons:
    poly.use_smooth = True
bpy.ops.object.select_all(action="DESELECT")
cups.select_set(True)
body.hide_set(False)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.data.validate(verbose=True)
body.data.update()
body.data.calc_loop_triangles()
high_final = len(body.data.loop_triangles)
body.select_set(False)

lmesh = bpy.data.meshes.new("Runtime_Montipora_Polyps")
lmesh.from_pydata(lv, [], lf)
lmesh.update()
rims = lmesh.attributes.new(name="__polyp_rim", type="FLOAT", domain="POINT")
for i, val in enumerate(lr):
    rims.data[i].value = val
lcups = bpy.data.objects.new("Runtime_Montipora_Polyps", lmesh)
bpy.context.collection.objects.link(lcups)
bpy.ops.object.select_all(action="DESELECT")
lcups.select_set(True)
low.select_set(True)
bpy.context.view_layer.objects.active = low
bpy.ops.object.join()
low.data.validate(verbose=True)
low.data.update()
for p in low.data.polygons:
    p.use_smooth = True

bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003)
bpy.ops.object.mode_set(mode="OBJECT")

attr = low.data.color_attributes.new(name="COLOR_0", type="FLOAT_COLOR", domain="CORNER")
low.data.color_attributes.active_color = attr
low.data.color_attributes.render_color_index = 0
max_z = max(0.01, max(v.co.z for v in low.data.vertices))
rim_attr = low.data.attributes.get("__polyp_rim")

for loop in low.data.loops:
    p = low.data.vertices[loop.vertex_index].co
    d_rim = min((p - rp).length for rp in scaled_rim_points)
    t = max(0.0, min(1.0, (0.014 - d_rim) / 0.011))
    rim_growth = t * t * (3.0 - 2.0 * t)
    polyp_val = rim_attr.data[loop.vertex_index].value if rim_attr else 0.0
    growth = max(rim_growth, polyp_val)
    phase = 0.05 + 0.90 * ((math.atan2(p.y, p.x) / (2.0 * math.pi) + 0.5 + 0.31 * (p.z / max_z)) % 1.0)
    attr.data[loop.index].color = (0.0, growth, phase, 1.0)

mat = bpy.data.materials.new("Montipora_Calcified_Tissue")
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
bsdf.inputs["Roughness"].default_value = 0.82

geom = nodes.new("ShaderNodeNewGeometry")
sep_n = nodes.new("ShaderNodeSeparateXYZ")
links.new(geom.outputs["Normal"], sep_n.inputs["Vector"])

noise = nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 340.0
noise.inputs["Detail"].default_value = 4.0
links.new(geom.outputs["Position"], noise.inputs["Vector"])

ramp = nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.20, 0.055, 0.042, 1.0)
ramp.color_ramp.elements[1].color = (0.44, 0.145, 0.098, 1.0)
links.new(noise.outputs["Fac"], ramp.inputs["Fac"])

# Blend underside toward paler calcified carbonate skeleton where normal.z < 0.
underside_map = nodes.new("ShaderNodeMapRange")
underside_map.inputs["From Min"].default_value = -0.25
underside_map.inputs["From Max"].default_value = 0.25
links.new(sep_n.outputs["Z"], underside_map.inputs["Value"])

top_vs_under = nodes.new("ShaderNodeMix")
top_vs_under.data_type = "RGBA"
top_vs_under.inputs["A"].default_value = (0.31, 0.26, 0.22, 1.0)
links.new(underside_map.outputs["Result"], top_vs_under.inputs["Factor"])
links.new(ramp.outputs["Color"], top_vs_under.inputs["B"])

vc = nodes.new("ShaderNodeVertexColor")
vc.layer_name = "COLOR_0"
sep = nodes.new("ShaderNodeSeparateColor")
links.new(vc.outputs["Color"], sep.inputs["Color"])

tissue = nodes.new("ShaderNodeMix")
tissue.data_type = "RGBA"
tissue.inputs["B"].default_value = (0.78, 0.68, 0.66, 1.0)
links.new(sep.outputs["Green"], tissue.inputs["Factor"])
links.new(top_vs_under.outputs["Result"], tissue.inputs["A"])
links.new(tissue.outputs["Result"], bsdf.inputs["Base Color"])

rough = nodes.new("ShaderNodeMath")
rough.operation = "MULTIPLY_ADD"
rough.inputs[1].default_value = 0.16
rough.inputs[2].default_value = 0.70
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
        "roughness": (0.78, 0.78, 0.78, 1.0),
        "tissue": (0.34, 0.12, 0.08, 1.0),
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
    cage_extrusion=0.0020,
    max_ray_distance=0.005,
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

# Normalize contact AO cleanly into [0.18, 1.0] across loops so deep whorl overlaps ground dark and exposed rims hit 1.0.
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
nm.inputs["Strength"].default_value = 0.72
links.new(ntex.outputs["Color"], nm.inputs["Color"])
links.new(nm.outputs[0], bsdf.inputs["Normal"])
mat.use_backface_culling = True

if low.data.validate(verbose=True):
    raise RuntimeError("Runtime mesh changed after bake; rebuild before persisting")

body.hide_set(True)
low.select_set(True)
bpy.context.view_layer.objects.active = low
low["authoring_notes"] = (
    "Original 3-tier scrolling Montipora capricornis whorled plate with undulating ruffled margins, "
    "820 high-source verrucose corallites, baked normal/tissue/roughness PBR maps, and raw COLOR_0 masks "
    "(R=0 rigid, G=growing rim + corallites, B=continuous whorl phase, A=normalized baked AO floored 0.18)."
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
    "MONTIPORA_WHORLED_SAVED_EXPORTED",
    json.dumps({"triangles": triangles, "highTriangles": high_final, "vertices": len(low.data.vertices), "dimensions": list(low.dimensions)}),
    flush=True,
)

# Viewport review lights after save/export.
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
    lo.rotation_euler = (Vector((0, 0, 0.05)) - lo.location).to_track_quat("-Z", "Y").to_euler()
