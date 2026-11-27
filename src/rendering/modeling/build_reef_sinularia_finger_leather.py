"""Original Sinularia fleshy finger-leather bush morphology (AQ-70.11 dense reef).
Dual-material static GLB: fleshy swaying finger-leather crown (coral-soft) +
rock-hugging calcified/leathery holdfast base (coral-rigid).
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-sinularia-finger-leather"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261143)


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


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def bezier(a, b, c, t):
    return (1.0 - t) ** 2 * a + 2.0 * (1.0 - t) * t * b + t * t * c


def add_vertex(p, mask):
    verts.append(tuple(p))
    masks.append(mask)
    return len(verts) - 1


def add_finger(a, b, c, r0, r1, steps, sides, phase, flex_base=0.0, flex_span=1.0):
    start = len(verts)
    for i in range(steps + 1):
        t = i / steps
        p = bezier(a, b, c, t)
        tangent = (2.0 * (1.0 - t) * (b - a) + 2.0 * t * (c - b)).normalized()
        seed = Vector((0.0, 0.0, 1.0)) if abs(tangent.z) < 0.9 else Vector((1.0, 0.0, 0.0))
        n = seed.cross(tangent).normalized()
        v = tangent.cross(n).normalized()
        # Fleshy tapered finger profile
        radius = r0 * (1.0 - 0.55 * t) + r1 * t
        if t > 0.88:
            radius = max(0.001, radius * math.cos((t - 0.88) / 0.12 * math.pi * 0.47))
        flex = 0.0 if (flex_base == 0.0 and i == 0) else min(1.0, flex_base + flex_span * (t ** 1.15))
        tip_glow = smooth(0.25, 0.96, t)
        ao = 0.28 + 0.68 * smooth(0.0, 0.18, p.z)
        mask = (flex, tip_glow, max(0.02, min(0.98, phase)), ao)
        for j in range(sides):
            ang = j * 2.0 * math.pi / sides
            fold = 1.0 + 0.08 * math.sin(4.0 * ang + 3.0 * t)
            pos = p + radius * fold * (math.cos(ang) * n + math.sin(ang) * v)
            add_vertex(pos, mask)
    for i in range(steps):
        u0 = i / steps
        u1 = (i + 1) / steps
        for j in range(sides):
            k = (j + 1) % sides
            v0 = j / sides
            v1 = (j + 1) / sides
            faces.append((start + i * sides + j, start + i * sides + k, start + (i + 1) * sides + k, start + (i + 1) * sides + j))
            face_uvs.append(((u0, v0), (u0, v1), (u1, v1), (u1, v0)))
            materials.append(0)
    faces.append(tuple(start + j for j in reversed(range(sides))))
    face_uvs.append(tuple((0.0, j / sides) for j in reversed(range(sides))))
    materials.append(0)
    faces.append(tuple(start + steps * sides + j for j in range(sides)))
    face_uvs.append(tuple((1.0, j / sides) for j in range(sides)))
    materials.append(0)


# 1. Rigid leathery holdfast base (material 1)
ang_n, rad_n = 28, 6
bot_center = add_vertex(Vector((0.0, 0.0, 0.0)), (0.0, 0.0, 0.5, 0.22))
top_center = add_vertex(Vector((0.0, 0.0, 0.032)), (0.0, 0.0, 0.5, 0.42))
bot_rings, top_rings = [], []
for k in range(1, rad_n + 1):
    rn = k / rad_n
    br, tr = [], []
    for j in range(ang_n):
        ang = j * 2.0 * math.pi / ang_n
        max_r = 0.102 * (1.0 + 0.10 * math.sin(3.0 * ang + 0.4) + 0.06 * math.cos(5.0 * ang - 0.8))
        r = rn * max_r
        x, y = r * math.cos(ang), r * math.sin(ang)
        z_top = max(0.002, 0.032 * ((1.0 - rn * rn) ** 0.65))
        br.append(add_vertex(Vector((x, y, 0.0)), (0.0, 0.0, 0.5, 0.22)))
        tr.append(add_vertex(Vector((x, y, z_top)), (0.0, 0.0, 0.5, 0.30 + 0.22 * (1.0 - rn))))
    bot_rings.append(br)
    top_rings.append(tr)

for j in range(ang_n):
    k = (j + 1) % ang_n
    faces.append((top_center, top_rings[0][j], top_rings[0][k]))
    face_uvs.append(((0.5, 0.5), (0.55, 0.5), (0.55, 0.55)))
    materials.append(1)
    faces.append((bot_center, bot_rings[0][k], bot_rings[0][j]))
    face_uvs.append(((0.5, 0.5), (0.55, 0.55), (0.55, 0.5)))
    materials.append(1)
    for r_i in range(rad_n - 1):
        faces.append((top_rings[r_i][j], top_rings[r_i + 1][j], top_rings[r_i + 1][k], top_rings[r_i][k]))
        face_uvs.append(((0.2, 0.2), (0.8, 0.2), (0.8, 0.8), (0.2, 0.8)))
        materials.append(1)
        faces.append((bot_rings[r_i][k], bot_rings[r_i + 1][k], bot_rings[r_i + 1][j], bot_rings[r_i][j]))
        face_uvs.append(((0.2, 0.2), (0.8, 0.2), (0.8, 0.8), (0.2, 0.8)))
        materials.append(1)
    faces.append((top_rings[-1][j], bot_rings[-1][j], bot_rings[-1][k], top_rings[-1][k]))
    face_uvs.append(((0.2, 0.2), (0.2, 0.8), (0.8, 0.8), (0.8, 0.2)))
    materials.append(1)

# 2. Soft Sinularia finger-leather lobes (material 0, ~0.30 m wide, ~0.20 m tall)
num_stalks = 16
for stalk_i in range(num_stalks):
    ring_t = (stalk_i + 0.5) / num_stalks
    ang = stalk_i * 2.399963 + rng.uniform(-0.10, 0.10)
    radial = Vector((math.cos(ang), math.sin(ang), 0.0))
    lateral = Vector((-math.sin(ang), math.cos(ang), 0.0))
    phase = 0.08 + 0.84 * ((stalk_i * 0.6180339) % 1.0)
    r_base = rng.uniform(0.010, 0.072)
    a = Vector((radial.x * r_base, radial.y * r_base, 0.012))
    reach = rng.uniform(0.068, 0.135) * (0.55 + 0.45 * ring_t)
    height = rng.uniform(0.115, 0.195) * (1.06 - 0.28 * ring_t)
    b = a + radial * (reach * 0.45) + lateral * rng.uniform(-0.016, 0.016) + Vector((0.0, 0.0, height * 0.55))
    c = a + radial * reach + lateral * rng.uniform(-0.020, 0.020) + Vector((0.0, 0.0, height))
    add_finger(a, b, c, 0.016, 0.0055, steps=11, sides=8, phase=phase, flex_base=0.0, flex_span=1.0)

    # 3 secondary finger lobes branching off each main stalk -> 16 * 4 = 64 fleshy fingers
    for f_i, t_fork in enumerate((0.36, 0.58, 0.78)):
        p = bezier(a, b, c, t_fork)
        tang = (2.0 * (1.0 - t_fork) * (b - a) + 2.0 * t_fork * (c - b)).normalized()
        side = 1.0 if (f_i + stalk_i) % 2 == 0 else -1.0
        f_dir = (tang * 0.65 + lateral * (side * rng.uniform(0.42, 0.68)) + radial * rng.uniform(0.08, 0.35) + Vector((0.0, 0.0, 0.35))).normalized()
        f_len = rng.uniform(0.045, 0.078)
        fb = p + f_dir * (f_len * 0.52)
        fc = p + f_dir * f_len + Vector((0.0, 0.0, 0.006))
        f_flex_base = min(0.85, t_fork * 0.72)
        add_finger(p, fb, fc, 0.0105, 0.0038, steps=8, sides=7, phase=(phase + 0.19 * f_i) % 1.0, flex_base=f_flex_base, flex_span=1.0 - f_flex_base)

mesh = bpy.data.meshes.new("Reef_Sinularia_Finger_Leather")
mesh.from_pydata(verts, [], faces)
mesh.update()
if mesh.validate(verbose=True):
    raise RuntimeError("Mesh validation failed")

obj = bpy.data.objects.new("Reef_Sinularia_Finger_Leather", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Sinularia_UV")
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
    tip = smooth(0.35, 0.96, u)
    polyp = 0.5 + 0.5 * math.sin(30.0 * math.pi * u) * math.cos(14.0 * math.pi * v)
    dot = smooth(0.55, 0.88, polyp)
    stalk = (0.28, 0.58, 0.34)
    tip_col = (0.64, 0.88, 0.56)
    polyp_col = (0.82, 0.94, 0.72)
    base_mix = tuple(stalk[i] * (1.0 - tip) + tip_col[i] * tip for i in range(3))
    return tuple(base_mix[i] * (1.0 - dot * 0.40) + polyp_col[i] * (dot * 0.40) for i in range(3))


def holdfast_albedo(u, v):
    mottle = 0.5 + 0.5 * math.sin(2.0 * math.pi * (u * 5.0 + v * 4.0)) * math.cos(2.0 * math.pi * (u * 4.0 - v * 7.0))
    return (0.22 + 0.08 * mottle, 0.30 + 0.10 * mottle, 0.22 + 0.08 * mottle)


def normal_map(u, v, strength):
    nx = strength * math.sin(24.0 * math.pi * u) * math.cos(12.0 * math.pi * v)
    ny = strength * math.cos(12.0 * math.pi * v)
    n = Vector((nx, ny, 1.0)).normalized()
    return tuple(0.5 + 0.5 * c for c in n)


for label, material_id, size in [("tissue", 0, 512), ("holdfast", 1, 256)]:
    base = make_image(label + "-albedo", size, tissue_albedo if material_id == 0 else holdfast_albedo, False)
    nrm = make_image(label + "-normal", size, lambda u, v, mid=material_id: normal_map(u, v, 0.08 if mid == 0 else 0.10), True)
    rough = make_image(
        label + "-roughness",
        size,
        lambda u, v, mid=material_id: (((0.42 if mid == 0 else 0.78) + 0.08 * (0.5 + 0.5 * math.sin(2.0 * math.pi * (u * 6.0 + v * 4.0)))),) * 3,
        True,
    )
    mat = bpy.data.materials.new("Sinularia_" + label.title())
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
        "id": "sinularia_finger_crown" if material_id == 0 else "sinularia_holdfast_base",
        "role": "coral-soft" if material_id == 0 else "coral-rigid",
        "maskSchema": "coral-raw-masks-v1",
    }
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
    "SINULARIA_SAVED_EXPORTED",
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
