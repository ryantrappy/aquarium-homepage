"""Original Pocillopora cauliflower bush morphology (AQ-70.11 dense reef).
Wide (~0.30 m) lush verrucose/knobby cushion colony with solid basal holdfast,
packed 512x512 PBR maps, and raw rigidity/tip/phase/contact-AO masks.
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-pocillopora-cauliflower-bush"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261142)


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


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def bezier(a, b, c, t):
    return (1.0 - t) ** 2 * a + 2.0 * (1.0 - t) * t * b + t * t * c


def add_vertex(p, tip_glow, phase, ao):
    verts.append(tuple(p))
    masks.append((0.0, max(0.0, min(1.0, tip_glow)), max(0.02, min(0.98, phase)), max(0.0, min(1.0, ao))))
    return len(verts) - 1


def add_lobe(a, b, c, r0, r1, steps, sides, phase, knob_amp=0.14):
    start = len(verts)
    for i in range(steps + 1):
        t = i / steps
        p = bezier(a, b, c, t)
        tangent = (2.0 * (1.0 - t) * (b - a) + 2.0 * t * (c - b)).normalized()
        seed = Vector((0.0, 0.0, 1.0)) if abs(tangent.z) < 0.9 else Vector((1.0, 0.0, 0.0))
        n = seed.cross(tangent).normalized()
        v = tangent.cross(n).normalized()
        # Swell toward clubbed/cauliflower tips
        swell = 1.0 + 0.28 * math.sin(t * math.pi * 0.85)
        radius = (r0 * (1.0 - t) + r1 * t) * swell
        if t > 0.86:
            radius = max(0.0008, radius * math.cos((t - 0.86) / 0.14 * math.pi * 0.47))
        tip_base = smooth(0.35, 0.94, t)
        ao = min(1.0, 0.24 + 0.78 * smooth(0.0, 0.17, p.z))
        for j in range(sides):
            ang = j * 2.0 * math.pi / sides
            tip_glow = 0.0 if t == 0.0 else (1.0 if t >= 0.98 else tip_base * (0.92 + 0.08 * (0.5 + 0.5 * math.sin(ang + phase * 6.28318))))
            verruca = 1.0 + knob_amp * math.sin(9.0 * t + 3.0 * ang) * math.cos(5.0 * t - 2.0 * ang)
            pos = p + radius * verruca * (math.cos(ang) * n + math.sin(ang) * v)
            add_vertex(pos, tip_glow, phase, ao)
    for i in range(steps):
        u0 = i / steps
        u1 = (i + 1) / steps
        for j in range(sides):
            k = (j + 1) % sides
            v0 = j / sides
            v1 = (j + 1) / sides
            faces.append((start + i * sides + j, start + i * sides + k, start + (i + 1) * sides + k, start + (i + 1) * sides + j))
            face_uvs.append(((u0, v0), (u0, v1), (u1, v1), (u1, v0)))
    faces.append(tuple(start + j for j in reversed(range(sides))))
    face_uvs.append(tuple((0.0, j / sides) for j in reversed(range(sides))))
    faces.append(tuple(start + steps * sides + j for j in range(sides)))
    face_uvs.append(tuple((1.0, j / sides) for j in range(sides)))


# 1. Rock-hugging calcified holdfast base
ang_n, rad_n = 24, 5
bot_center = add_vertex(Vector((0.0, 0.0, 0.0)), 0.0, 0.5, 0.18)
top_center = add_vertex(Vector((0.0, 0.0, 0.025)), 0.05, 0.5, 0.28)
bot_rings, top_rings = [], []
for k in range(1, rad_n + 1):
    rn = k / rad_n
    br, tr = [], []
    for j in range(ang_n):
        ang = j * 2.0 * math.pi / ang_n
        max_r = 0.095 * (1.0 + 0.08 * math.sin(4.0 * ang + 0.3) + 0.05 * math.cos(6.0 * ang - 0.6))
        r = rn * max_r
        x, y = r * math.cos(ang), r * math.sin(ang)
        z_top = max(0.002, 0.025 * ((1.0 - rn * rn) ** 0.72))
        br.append(add_vertex(Vector((x, y, 0.0)), 0.0, 0.5, 0.18))
        tr.append(add_vertex(Vector((x, y, z_top)), 0.04, 0.5, 0.24 + 0.16 * (1.0 - rn)))
    bot_rings.append(br)
    top_rings.append(tr)

for j in range(ang_n):
    k = (j + 1) % ang_n
    faces.append((top_center, top_rings[0][j], top_rings[0][k]))
    face_uvs.append(((0.04, 0.5), (0.07, j / ang_n), (0.07, k / ang_n)))
    faces.append((bot_center, bot_rings[0][k], bot_rings[0][j]))
    face_uvs.append(((0.0, 0.5), (0.02, k / ang_n), (0.02, j / ang_n)))
    for r_i in range(rad_n - 1):
        faces.append((top_rings[r_i][j], top_rings[r_i + 1][j], top_rings[r_i + 1][k], top_rings[r_i][k]))
        face_uvs.append(((0.05, j / ang_n), (0.07, j / ang_n), (0.07, k / ang_n), (0.05, k / ang_n)))
        faces.append((bot_rings[r_i][k], bot_rings[r_i + 1][k], bot_rings[r_i + 1][j], bot_rings[r_i][j]))
        face_uvs.append(((0.02, k / ang_n), (0.02, k / ang_n), (0.02, j / ang_n), (0.02, j / ang_n)))
    faces.append((top_rings[-1][j], bot_rings[-1][j], bot_rings[-1][k], top_rings[-1][k]))
    face_uvs.append(((0.04, j / ang_n), (0.02, j / ang_n), (0.02, k / ang_n), (0.04, k / ang_n)))

# 2. Lush cauliflower Pocillopora lobes (~0.30 m wide, ~0.19 m tall)
num_stems = 20
for stem_i in range(num_stems):
    ring_t = (stem_i + 0.5) / num_stems
    ang = stem_i * 2.399963 + rng.uniform(-0.10, 0.10)
    radial = Vector((math.cos(ang), math.sin(ang), 0.0))
    lateral = Vector((-math.sin(ang), math.cos(ang), 0.0))
    phase = 0.08 + 0.84 * ((stem_i * 0.6180339) % 1.0)
    r_base = rng.uniform(0.010, 0.068)
    a = Vector((radial.x * r_base, radial.y * r_base, 0.008))
    reach = rng.uniform(0.065, 0.132) * (0.58 + 0.42 * ring_t)
    height = rng.uniform(0.105, 0.185) * (1.08 - 0.30 * ring_t)
    b = a + radial * (reach * 0.50) + lateral * rng.uniform(-0.015, 0.015) + Vector((0.0, 0.0, height * 0.55))
    c = a + radial * reach + lateral * rng.uniform(-0.018, 0.018) + Vector((0.0, 0.0, height))
    add_lobe(a, b, c, 0.011, 0.009, steps=7, sides=7, phase=phase, knob_amp=0.14)

    # 3 cauliflower sub-lobes per main stem -> 20 * (1 + 3) = 80 thick verrucose lobes
    for f_i, t_fork in enumerate((0.35, 0.60, 0.80)):
        p = bezier(a, b, c, t_fork)
        tang = (2.0 * (1.0 - t_fork) * (b - a) + 2.0 * t_fork * (c - b)).normalized()
        side = 1.0 if (f_i + stem_i) % 2 == 0 else -1.0
        f_dir = (tang * 0.68 + lateral * (side * rng.uniform(0.35, 0.62)) + radial * rng.uniform(0.10, 0.35) + Vector((0.0, 0.0, 0.30))).normalized()
        f_len = rng.uniform(0.036, 0.062)
        fb = p + f_dir * (f_len * 0.5)
        fc = p + f_dir * f_len + Vector((0.0, 0.0, 0.004))
        add_lobe(p, fb, fc, 0.0085, 0.0072, steps=5, sides=6, phase=(phase + 0.23 * f_i) % 1.0, knob_amp=0.18)

mesh = bpy.data.meshes.new("Reef_Pocillopora_Cauliflower_Bush")
mesh.from_pydata(verts, [], faces)
mesh.update()
if mesh.validate(verbose=True):
    raise RuntimeError("Mesh validation failed")

obj = bpy.data.objects.new("Reef_Pocillopora_Cauliflower_Bush", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Pocillopora_UV")
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


def pocillopora_albedo(u, v):
    tip = smooth(0.45, 0.96, u)
    verruca = 0.5 + 0.5 * math.sin(28.0 * math.pi * u) * math.cos(12.0 * math.pi * v)
    bump = smooth(0.45, 0.88, verruca)
    core = (0.14, 0.42, 0.24)
    ridge = (0.34, 0.68, 0.40)
    tip_col = (0.68, 0.90, 0.66)
    base_mix = tuple(core[i] * (1.0 - bump * 0.55) + ridge[i] * (bump * 0.55) for i in range(3))
    return tuple(base_mix[i] * (1.0 - tip) + tip_col[i] * tip for i in range(3))


def pocillopora_normal(u, v):
    nx = 0.16 * math.cos(28.0 * math.pi * u) * math.sin(12.0 * math.pi * v)
    ny = 0.16 * math.sin(28.0 * math.pi * u) * math.cos(12.0 * math.pi * v)
    n = Vector((nx, ny, 1.0)).normalized()
    return tuple(0.5 + 0.5 * c for c in n)


def pocillopora_rough(u, v):
    val = 0.60 + 0.14 * math.sin(20.0 * math.pi * u) * math.cos(10.0 * math.pi * v) - 0.10 * smooth(0.5, 1.0, u)
    return (val, val, val)


base_img = make_image("albedo", 512, pocillopora_albedo, False)
nrm_img = make_image("normal", 512, pocillopora_normal, True)
rough_img = make_image("roughness", 512, pocillopora_rough, True)

mat = bpy.data.materials.new("Pocillopora_Cauliflower_Bush")
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
bsdf.inputs["Metallic"].default_value = 0.0
tex = nodes.new("ShaderNodeTexImage")
tex.image = base_img
links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
rtex = nodes.new("ShaderNodeTexImage")
rtex.image = rough_img
links.new(rtex.outputs["Color"], bsdf.inputs["Roughness"])
ntex = nodes.new("ShaderNodeTexImage")
ntex.image = nrm_img
nm = nodes.new("ShaderNodeNormalMap")
links.new(ntex.outputs["Color"], nm.inputs["Color"])
links.new(nm.outputs[0], bsdf.inputs["Normal"])
mesh.materials.append(mat)

triangulate = obj.modifiers.new("Stable_Export_Triangles", "TRIANGULATE")
bpy.ops.object.modifier_apply(modifier=triangulate.name)
mesh = obj.data
if mesh.validate(verbose=True):
    raise RuntimeError("Final mesh validation failed")
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
    "POCILLOPORA_SAVED_EXPORTED",
    json.dumps({"triangles": triangles, "vertices": len(mesh.vertices), "dimensions": list(obj.dimensions)}),
    flush=True,
)

world = bpy.data.worlds.new("Neutral_Review")
scene.world = world
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.14, 0.14, 0.16, 1.0)
bg.inputs[1].default_value = 0.50
for name, pos, energy, size in [("Key", (0.18, -0.35, 0.45), 4.0, 0.35), ("Fill", (-0.32, -0.18, 0.28), 1.6, 0.40), ("Rim", (0.05, 0.36, 0.36), 2.5, 0.28)]:
    light = bpy.data.lights.new(name, "AREA")
    light.energy = energy
    light.shape = "DISK"
    light.size = size
    lo = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(lo)
    lo.location = pos
    lo.rotation_euler = (Vector((0.0, 0.0, 0.08)) - lo.location).to_track_quat("-Z", "Y").to_euler()
