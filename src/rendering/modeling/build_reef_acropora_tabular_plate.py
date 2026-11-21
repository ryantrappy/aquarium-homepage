"""Original horizontal Acropora hyacinthus tabular plate colony (AQ-70.11).
Custom meter-scale design with stout basal pedicel, anastomosing horizontal radial lattice,
upturned vertical branchlets, baked PBR maps + raw COLOR_0 masks.
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-acropora-tabular-plate"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261124)


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

verts, faces, tips, branch_records = [], [], [], []


def bezier(a, b, c, t):
    return (1.0 - t) ** 2 * a + 2.0 * (1.0 - t) * t * b + t * t * c


def tube(a, b, c, r0, r1, tip=True, sides=10):
    branch_records.append((a.copy(), b.copy(), c.copy(), r0, r1))
    length = (b - a).length + (c - b).length
    steps = max(8, math.ceil(length / 0.0035))
    start = len(verts)
    for i in range(steps + 1):
        t = i / steps
        p = bezier(a, b, c, t)
        tangent = (2.0 * (1.0 - t) * (b - a) + 2.0 * t * (c - b))
        if tangent.length < 1e-6:
            tangent = Vector((0, 0, 1))
        tangent.normalize()
        seed = Vector((0, 0, 1)) if abs(tangent.z) < 0.9 else Vector((1, 0, 0))
        n = seed.cross(tangent).normalized()
        v = tangent.cross(n).normalized()
        radius = r0 * (1.0 - t) + r1 * t
        if tip and t > 0.96:
            radius = max(0.00045, radius * math.cos((t - 0.96) / 0.04 * math.pi * 0.44))
        for j in range(sides):
            angle = j * 2.0 * math.pi / sides
            radial = radius * (1.0 + 0.05 * math.sin(6.0 * t + 3.0 * angle))
            verts.append(tuple(p + radial * (math.cos(angle) * n + math.sin(angle) * v)))
    for i in range(steps):
        for j in range(sides):
            k = (j + 1) % sides
            faces.append((start + i * sides + j, start + i * sides + k, start + (i + 1) * sides + k, start + (i + 1) * sides + j))
    faces.append(tuple(start + j for j in reversed(range(sides))))
    faces.append(tuple(start + steps * sides + j for j in range(sides)))
    if tip:
        tips.append(c.copy())


# Stout central-offset calcified pedicel rising into a gently domed horizontal table fan.
stem = (Vector((0.0, -0.006, 0.002)), Vector((0.004, -0.004, 0.032)), Vector((0.0, 0.0, 0.068)))
tube(*stem, 0.014, 0.011, tip=False, sides=12)

arm_count = 13
arm_curves = []
for ai in range(arm_count):
    ang = ai * 2.0 * math.pi / arm_count + rng.uniform(-0.10, 0.10)
    # Elliptical horizontal spread (~1.38:1 aspect) fitting canonical coral-acropora-table envelope.
    rx = 0.082 + rng.uniform(-0.008, 0.010)
    ry = 0.056 + rng.uniform(-0.006, 0.008)
    dx = math.cos(ang) * rx
    dy = math.sin(ang) * ry
    a = Vector((math.cos(ang) * 0.008, math.sin(ang) * 0.008, 0.062 + rng.uniform(-0.003, 0.004)))
    b = Vector((dx * 0.52, dy * 0.52, 0.078 + rng.uniform(-0.004, 0.005)))
    c = Vector((dx, dy, 0.088 + rng.uniform(-0.005, 0.008)))
    tube(a, b, c, 0.0062, 0.0030, tip=False, sides=10)
    arm_curves.append((a, b, c, ang))

# Anastomosing cross-bridges linking adjacent radial arms into a fused tabular lattice.
for ai in range(arm_count):
    a0, b0, c0, _ = arm_curves[ai]
    a1, b1, c1, _ = arm_curves[(ai + 1) % arm_count]
    for bridge_t in (0.42, 0.72):
        p0 = bezier(a0, b0, c0, bridge_t + rng.uniform(-0.04, 0.04))
        p1 = bezier(a1, b1, c1, bridge_t + rng.uniform(-0.04, 0.04))
        mid = (p0 + p1) * 0.5 + Vector((0.0, 0.0, rng.uniform(-0.002, 0.003)))
        tube(p0, mid, p1, 0.0036, 0.0034, tip=False, sides=8)

# ~95 short stubby upturned axial branchlets carpeting the upper tabular plateau and rim.
branchlet_sites = []
for ai, (a, b, c, ang) in enumerate(arm_curves):
    for frac in (0.24, 0.40, 0.56, 0.72, 0.87, 0.98):
        p = bezier(a, b, c, min(1.0, frac + rng.uniform(-0.025, 0.025)))
        branchlet_sites.append((p, ang, frac))
    # Fork off-axis lateral branchlets between major arms.
    for side_sign in (-1.0, 1.0):
        p = bezier(a, b, c, rng.uniform(0.50, 0.85))
        lat_ang = ang + side_sign * rng.uniform(0.24, 0.42)
        p_off = p + Vector((math.cos(lat_ang) * 0.011, math.sin(lat_ang) * 0.008, 0.001))
        tube(p, (p + p_off) * 0.5, p_off, 0.0030, 0.0022, tip=False, sides=8)
        branchlet_sites.append((p_off, lat_ang, 0.85))

# Add central crown cluster over the pedicel apex.
for ci in range(7):
    ca = ci * 2.399963
    cr = 0.006 + 0.004 * (ci / 6.0)
    branchlet_sites.append((Vector((math.cos(ca) * cr, math.sin(ca) * cr, 0.072)), ca, 0.15))

for base_p, ang, frac in branchlet_sites:
    h = rng.uniform(0.017, 0.032) * (1.12 - 0.18 * frac)
    out_tilt = 0.005 + 0.007 * frac
    top = base_p + Vector((math.cos(ang) * out_tilt, math.sin(ang) * out_tilt * 0.8, h))
    mid = base_p + Vector((math.cos(ang) * out_tilt * 0.35, math.sin(ang) * out_tilt * 0.25, h * 0.55))
    tube(base_p - Vector((0, 0, 0.002)), mid, top, rng.uniform(0.0027, 0.0033), rng.uniform(0.0013, 0.0017), tip=True, sides=8)

mesh = bpy.data.meshes.new("Acropora_Tabular_Construction")
mesh.from_pydata(verts, [], faces)
mesh.update()
body = bpy.data.objects.new("Acropora_Table_High_Source", mesh)
bpy.context.collection.objects.link(body)
bpy.context.view_layer.objects.active = body
body.select_set(True)

bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=0.020, location=(0, -0.006, 0.003))
foot = bpy.context.active_object
foot.scale.z = 0.25
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

remesh = body.modifiers.new("Organic_Table_Union", "REMESH")
remesh.mode = "VOXEL"
remesh.voxel_size = 0.00085
remesh.use_smooth_shade = True
bpy.ops.object.modifier_apply(modifier=remesh.name)

smooth_mod = body.modifiers.new("Round_Junctions", "SMOOTH")
smooth_mod.factor = 0.30
smooth_mod.iterations = 2
bpy.ops.object.modifier_apply(modifier=smooth_mod.name)

# Uniformly fit inside canonical coral-acropora-table envelope (~0.210 x 0.152 x 0.150 m).
xs = [v.co.x for v in body.data.vertices]
ys = [v.co.y for v in body.data.vertices]
zs = [v.co.z for v in body.data.vertices]
z0, z1 = min(zs), max(zs)
span_x = max(xs) - min(xs)
span_y = max(ys) - min(ys)
scale = min(0.208 / span_x, 0.148 / span_y, 0.152 / (z1 - z0))
cx = 0.5 * (min(xs) + max(xs))
cy = 0.5 * (min(ys) + max(ys))
for v in body.data.vertices:
    v.co = Vector(((v.co.x - cx) * scale, (v.co.y - cy) * scale, (v.co.z - z0) * scale))
    if v.co.z < 0.0016:
        v.co.z = 0.0
scaled_tips = [Vector(((p.x - cx) * scale, (p.y - cy) * scale, (p.z - z0) * scale)) for p in tips]
body.data.update()

cloud = bpy.data.textures.new("Table_Calcified_Relief", type="CLOUDS")
cloud.noise_scale = 0.0025
cloud.noise_depth = 2
relief = body.modifiers.new("Fine_Corallite_Relief", "DISPLACE")
relief.texture = cloud
relief.strength = 0.00020
relief.mid_level = 0.5
bpy.ops.object.modifier_apply(modifier=relief.name)
for p in body.data.polygons:
    p.use_smooth = True

low = body.copy()
low.data = body.data.copy()
low.name = "Reef_Acropora_Tabular_Plate"
bpy.context.collection.objects.link(low)
body.select_set(False)
low.select_set(True)
bpy.context.view_layer.objects.active = low
low.data.calc_loop_triangles()
before = len(low.data.loop_triangles)
decimate = low.modifiers.new("Runtime_LOD", "DECIMATE")
decimate.ratio = min(1.0, 22000.0 / before)
bpy.ops.object.modifier_apply(modifier=decimate.name)
low.data.validate(verbose=True)
low.data.update()

# Add radial corallite cups onto high bake mesh + sparse runtime silhouette cups.
cv, cf, lv, lf, lr = [], [], [], [], []
cup_index = 0
for branch_index, (a, b, c, r0, r1) in enumerate(branch_records):
    blen = (b - a).length + (c - b).length
    count = max(3, int(blen * 360))
    for k in range(count):
        t = 0.14 + 0.74 * (k + 0.5) / count
        center = bezier(a, b, c, t)
        tangent = (2.0 * (1.0 - t) * (b - a) + 2.0 * t * (c - b))
        if tangent.length < 1e-6:
            tangent = Vector((0, 0, 1))
        tangent.normalize()
        seed = Vector((0, 0, 1)) if abs(tangent.z) < 0.9 else Vector((1, 0, 0))
        n = seed.cross(tangent).normalized()
        v = tangent.cross(n).normalized()
        angle = k * 2.39996 + branch_index * 1.173
        radial = (math.cos(angle) * n + math.sin(angle) * v).normalized()
        axis = (radial * 0.88 + tangent * 0.47).normalized()
        origin = center + radial * ((r0 * (1.0 - t) + r1 * t) * 0.86)
        origin = Vector(((origin.x - cx) * scale, (origin.y - cy) * scale, (origin.z - z0) * scale))
        cn = axis.cross(Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((1, 0, 0))).normalized()
        cb = axis.cross(cn).normalized()
        start = len(cv)
        for height, radius in ((0.0, 0.00058), (0.00052, 0.00076), (0.00095, 0.00066), (0.00095, 0.00034), (0.00055, 0.00020)):
            for j in range(6):
                phi = j * 2.0 * math.pi / 6.0
                cv.append(tuple(origin + axis * height + (math.cos(phi) * cn + math.sin(phi) * cb) * radius))
        for ring in range(4):
            for j in range(6):
                nxt = (j + 1) % 6
                cf.append((start + ring * 6 + j, start + ring * 6 + nxt, start + (ring + 1) * 6 + nxt, start + (ring + 1) * 6 + j))
        cf.append(tuple(start + 4 * 6 + j for j in range(6)))

        if cup_index % 15 == 0:
            low_start = len(lv)
            for height, radius, rim in ((0.0, 0.00058, 0.0), (0.00095, 0.00068, 1.0), (0.00095, 0.00034, 0.7)):
                for j in range(5):
                    phi = j * 2.0 * math.pi / 5.0
                    lv.append(tuple(origin + axis * height + (math.cos(phi) * cn + math.sin(phi) * cb) * radius))
                    lr.append(rim)
            floor_i = len(lv)
            lv.append(tuple(origin + axis * 0.00055))
            lr.append(0.3)
            for ring in range(2):
                for j in range(5):
                    nxt = (j + 1) % 5
                    lf.append((low_start + ring * 5 + j, low_start + ring * 5 + nxt, low_start + (ring + 1) * 5 + nxt, low_start + (ring + 1) * 5 + j))
            for j in range(5):
                lf.append((low_start + 10 + j, low_start + 10 + (j + 1) % 5, floor_i))
        cup_index += 1

cmesh = bpy.data.meshes.new("High_Table_Corallites")
cmesh.from_pydata(cv, [], cf)
cmesh.update()
cups = bpy.data.objects.new("High_Table_Corallites", cmesh)
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

lmesh = bpy.data.meshes.new("Runtime_Table_Corallites")
lmesh.from_pydata(lv, [], lf)
lmesh.update()
rims = lmesh.attributes.new(name="__polyp_rim", type="FLOAT", domain="POINT")
for i, val in enumerate(lr):
    rims.data[i].value = val
lcups = bpy.data.objects.new("Runtime_Table_Corallites", lmesh)
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
rim_attr = low.data.attributes.get("__polyp_rim")
for loop in low.data.loops:
    p = low.data.vertices[loop.vertex_index].co
    distances = [(p - tip).length for tip in scaled_tips]
    nearest = min(range(len(distances)), key=lambda i: distances[i])
    d = distances[nearest]
    t = max(0.0, min(1.0, (0.013 - d) / 0.010))
    growth = t * t * (3.0 - 2.0 * t)
    if rim_attr:
        growth = max(growth, rim_attr.data[loop.vertex_index].value)
    phase = 0.05 + 0.90 * (((nearest * 137 + 31) % 997) / 997.0)
    attr.data[loop.index].color = (0.0, growth, phase, 1.0)

mat = bpy.data.materials.new("Acropora_Tabular_Tissue")
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
bsdf.inputs["Roughness"].default_value = 0.80

geom = nodes.new("ShaderNodeNewGeometry")
noise = nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 360.0
noise.inputs["Detail"].default_value = 3.0
links.new(geom.outputs["Position"], noise.inputs["Vector"])

ramp = nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.14, 0.065, 0.075, 1.0)
ramp.color_ramp.elements[1].color = (0.36, 0.175, 0.21, 1.0)
links.new(noise.outputs["Fac"], ramp.inputs["Fac"])

vc = nodes.new("ShaderNodeVertexColor")
vc.layer_name = "COLOR_0"
sep = nodes.new("ShaderNodeSeparateColor")
links.new(vc.outputs["Color"], sep.inputs["Color"])

tissue = nodes.new("ShaderNodeMix")
tissue.data_type = "RGBA"
tissue.inputs["B"].default_value = (0.68, 0.56, 0.60, 1.0)
links.new(sep.outputs["Green"], tissue.inputs["Factor"])
links.new(ramp.outputs["Color"], tissue.inputs["A"])
links.new(tissue.outputs["Result"], bsdf.inputs["Base Color"])

rough = nodes.new("ShaderNodeMath")
rough.operation = "MULTIPLY_ADD"
rough.inputs[1].default_value = 0.18
rough.inputs[2].default_value = 0.66
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
        "roughness": (0.76, 0.76, 0.76, 1.0),
        "tissue": (0.25, 0.12, 0.14, 1.0),
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
    cage_extrusion=0.0018,
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
    "Original horizontal Acropora hyacinthus tabular plate with pedicel holdfast, anastomosing horizontal "
    "lattice, upturned axial branchlets, baked PBR maps, and raw COLOR_0 masks (R=0 rigid, G=tips/corallites, "
    "B=tip phase, A=normalized baked AO floored 0.18)."
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
    "TABULAR_PLATE_SAVED_EXPORTED",
    json.dumps({"triangles": triangles, "highTriangles": high_final, "tips": len(tips), "dimensions": list(low.dimensions)}),
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
    lo.rotation_euler = (Vector((0, 0, 0.07)) - lo.location).to_track_quat("-Z", "Y").to_euler()
