"""Original Xenia pulsing plume soft-coral colony morphology (AQ-70.11 dense reef).
Dual-material static GLB: cascading fleshy stalks + feathery pinnate polyp pom-poms
(coral-soft) on a rock-hugging encrusting stolon mat (coral-rigid).
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-xenia-pulsing-plume"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261144)


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


def add_stalk(a, b, c, r0, r1, steps, sides, phase):
    start = len(verts)
    for i in range(steps + 1):
        t = i / steps
        p = bezier(a, b, c, t)
        tangent = (2.0 * (1.0 - t) * (b - a) + 2.0 * t * (c - b)).normalized()
        seed = Vector((0.0, 0.0, 1.0)) if abs(tangent.z) < 0.9 else Vector((1.0, 0.0, 0.0))
        n = seed.cross(tangent).normalized()
        v = tangent.cross(n).normalized()
        radius = r0 * (1.0 - t) + r1 * t
        flex = 0.0 if i == 0 else min(0.85, (t ** 1.1) * 0.85)
        tip_glow = smooth(0.35, 1.0, t) * 0.65
        ao = 0.30 + 0.65 * smooth(0.0, 0.16, p.z)
        mask = (flex, tip_glow, max(0.02, min(0.98, phase)), ao)
        for j in range(sides):
            ang = j * 2.0 * math.pi / sides
            pos = p + radius * (math.cos(ang) * n + math.sin(ang) * v)
            add_vertex(pos, mask)
    for i in range(steps):
        u0 = 0.45 * (i / steps)
        u1 = 0.45 * ((i + 1) / steps)
        for j in range(sides):
            k = (j + 1) % sides
            faces.append((start + i * sides + j, start + i * sides + k, start + (i + 1) * sides + k, start + (i + 1) * sides + j))
            face_uvs.append(((u0, j / sides), (u0, (j + 1) / sides), (u1, (j + 1) / sides), (u1, j / sides)))
            materials.append(0)
    faces.append(tuple(start + j for j in reversed(range(sides))))
    face_uvs.append(tuple((0.0, j / sides) for j in reversed(range(sides))))
    materials.append(0)


def add_polyp_pompom(origin, axis, phase):
    # Build 8 feathery flared tentacles per Xenia polyp head
    seed = Vector((0.0, 0.0, 1.0)) if abs(axis.z) < 0.9 else Vector((1.0, 0.0, 0.0))
    n = seed.cross(axis).normalized()
    v = axis.cross(n).normalized()
    for tent_i in range(8):
        ang = tent_i * 2.0 * math.pi / 8.0 + rng.uniform(-0.08, 0.08)
        radial = (math.cos(ang) * n + math.sin(ang) * v).normalized()
        side_vec = (-math.sin(ang) * n + math.cos(ang) * v).normalized()
        t_len = rng.uniform(0.022, 0.032)
        p0 = origin + radial * 0.002
        p1 = origin + radial * (t_len * 0.58) + axis * (t_len * 0.65)
        p2 = origin + radial * (t_len * 1.08) + axis * (t_len * 0.42)
        steps = 3
        sides = 4
        start = len(verts)
        for i in range(steps + 1):
            t = i / steps
            pos_c = bezier(p0, p1, p2, t)
            # Flattened feathery pinnule silhouette
            w_rad = 0.0036 * (0.45 + 0.75 * math.sin(t * math.pi))
            w_thick = 0.0014 * (1.0 - 0.5 * t)
            flex = 0.78 + 0.22 * t
            tip_glow = 0.55 + 0.45 * t
            mask = (flex, tip_glow, max(0.02, min(0.98, phase)), 0.75 + 0.25 * t)
            for j in range(sides):
                theta = j * 2.0 * math.pi / sides
                offset = side_vec * (math.cos(theta) * w_rad) + axis * (math.sin(theta) * w_thick)
                add_vertex(pos_c + offset, mask)
        for i in range(steps):
            u0 = 0.48 + 0.52 * (i / steps)
            u1 = 0.48 + 0.52 * ((i + 1) / steps)
            for j in range(sides):
                k = (j + 1) % sides
                faces.append((start + i * sides + j, start + i * sides + k, start + (i + 1) * sides + k, start + (i + 1) * sides + j))
                face_uvs.append(((u0, j / sides), (u0, (j + 1) / sides), (u1, (j + 1) / sides), (u1, j / sides)))
                materials.append(0)
        faces.append(tuple(start + steps * sides + j for j in range(sides)))
        face_uvs.append(tuple((1.0, j / sides) for j in range(sides)))
        materials.append(0)


# 1. Rigid encrusting stolon mat (material 1)
ang_n, rad_n = 28, 6
bot_center = add_vertex(Vector((0.0, 0.0, 0.0)), (0.0, 0.0, 0.5, 0.22))
top_center = add_vertex(Vector((0.0, 0.0, 0.024)), (0.0, 0.0, 0.5, 0.40))
bot_rings, top_rings = [], []
for k in range(1, rad_n + 1):
    rn = k / rad_n
    br, tr = [], []
    for j in range(ang_n):
        ang = j * 2.0 * math.pi / ang_n
        max_r = 0.115 * (1.0 + 0.09 * math.sin(3.0 * ang + 0.3) + 0.06 * math.cos(5.0 * ang - 0.5))
        r = rn * max_r
        x, y = r * math.cos(ang), r * math.sin(ang)
        z_top = max(0.002, 0.024 * ((1.0 - rn * rn) ** 0.72))
        br.append(add_vertex(Vector((x, y, 0.0)), (0.0, 0.0, 0.5, 0.22)))
        tr.append(add_vertex(Vector((x, y, z_top)), (0.0, 0.0, 0.5, 0.28 + 0.20 * (1.0 - rn))))
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

# 2. Dense cascading Xenia stalks & pom-poms (~0.32 m wide, ~0.20 m tall)
num_polyps = 48
for idx in range(num_polyps):
    ring_t = (idx + 0.5) / num_polyps
    ang = idx * 2.399963 + rng.uniform(-0.10, 0.10)
    radial = Vector((math.cos(ang), math.sin(ang), 0.0))
    lateral = Vector((-math.sin(ang), math.cos(ang), 0.0))
    phase = 0.08 + 0.84 * ((idx * 0.6180339) % 1.0)
    r_base = 0.095 * math.sqrt(ring_t)
    a = Vector((radial.x * r_base, radial.y * r_base, 0.010))
    reach = rng.uniform(0.032, 0.068) * (0.45 + 0.75 * ring_t)
    height = rng.uniform(0.090, 0.165) * (1.08 - 0.26 * ring_t)
    b = a + radial * (reach * 0.55) + lateral * rng.uniform(-0.012, 0.012) + Vector((0.0, 0.0, height * 0.62))
    c = a + radial * reach + lateral * rng.uniform(-0.014, 0.014) + Vector((0.0, 0.0, height))
    add_stalk(a, b, c, 0.0085, 0.0045, steps=6, sides=6, phase=phase)
    head_axis = (c - b).normalized()
    add_polyp_pompom(c, head_axis, phase)

mesh = bpy.data.meshes.new("Reef_Xenia_Pulsing_Plume")
mesh.from_pydata(verts, [], faces)
mesh.update()
if mesh.validate(verbose=True):
    raise RuntimeError("Mesh validation failed")

obj = bpy.data.objects.new("Reef_Xenia_Pulsing_Plume", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Xenia_UV")
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
    # u in [0..0.46]: pale fleshy stalk; u in [0.46..1.0]: feathery lavender-pink pinnate crown
    if u < 0.46:
        t = u / 0.46
        stalk_base = (0.68, 0.44, 0.56)
        stalk_top = (0.86, 0.66, 0.78)
        return tuple(stalk_base[i] * (1.0 - t) + stalk_top[i] * t for i in range(3))
    vt = (u - 0.46) / 0.54
    pinnule = 0.5 + 0.5 * math.sin(24.0 * math.pi * vt) * math.cos(8.0 * math.pi * v)
    feather = smooth(0.35, 0.85, pinnule)
    crown_col = (0.88, 0.62, 0.78)
    tip_col = (0.98, 0.88, 0.95)
    base_mix = tuple(crown_col[i] * (1.0 - vt) + tip_col[i] * vt for i in range(3))
    return tuple(base_mix[i] * (0.86 + 0.14 * feather) for i in range(3))


def mat_albedo(u, v):
    mottle = 0.5 + 0.5 * math.sin(2.0 * math.pi * (u * 5.0 + v * 5.0)) * math.cos(2.0 * math.pi * (u * 4.0 - v * 6.0))
    return (0.34 + 0.08 * mottle, 0.24 + 0.06 * mottle, 0.30 + 0.08 * mottle)


def normal_map(u, v, strength):
    nx = strength * math.sin(26.0 * math.pi * u) * math.cos(10.0 * math.pi * v)
    ny = strength * math.cos(10.0 * math.pi * v)
    n = Vector((nx, ny, 1.0)).normalized()
    return tuple(0.5 + 0.5 * c for c in n)


for label, material_id, size in [("tissue", 0, 512), ("stolon", 1, 256)]:
    base = make_image(label + "-albedo", size, tissue_albedo if material_id == 0 else mat_albedo, False)
    nrm = make_image(label + "-normal", size, lambda u, v, mid=material_id: normal_map(u, v, 0.07 if mid == 0 else 0.10), True)
    rough = make_image(
        label + "-roughness",
        size,
        lambda u, v, mid=material_id: (((0.40 if mid == 0 else 0.78) + 0.08 * (0.5 + 0.5 * math.sin(2.0 * math.pi * (u * 6.0 + v * 4.0)))),) * 3,
        True,
    )
    mat = bpy.data.materials.new("Xenia_" + label.title())
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
        "id": "xenia_pulsing_fronds" if material_id == 0 else "xenia_stolon_mat",
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
    "XENIA_SAVED_EXPORTED",
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
