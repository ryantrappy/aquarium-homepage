"""Original anchor/hammer coral morphology (AQ-70.11), not specimen-scale calibration.
Packed native + selected static two-material GLB; raw soft/rigid coral masks.
Safe for both live Blender MCP execution and background CLI Blender.
"""
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ID = "reef-euphyllia-anchor-hammer"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261120)


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


def vertex(p, mask):
    verts.append(tuple(p))
    masks.append(mask)
    return len(verts) - 1


def face(indices, uv, material):
    faces.append(tuple(indices))
    face_uvs.append(uv)
    materials.append(material)


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def cubic(a, b, c, d, t):
    return (1.0 - t) ** 3 * a + 3.0 * (1.0 - t) ** 2 * t * b + 3.0 * (1.0 - t) * t * t * c + t ** 3 * d


def frame(tangent, up_hint=None):
    t = tangent.normalized()
    seed = up_hint.normalized() if up_hint is not None and abs(t.dot(up_hint.normalized())) < 0.92 else (
        Vector((0, 0, 1)) if abs(t.z) < 0.90 else Vector((1, 0, 0))
    )
    n = seed.cross(t).normalized()
    b = t.cross(n).normalized()
    return n, b, t


def tube(points, radii, mask_fn, material, sides=10, phase=0.0, uvs_t=None):
    rings = []
    n_pts = len(points)
    for k, (p, radius) in enumerate(zip(points, radii)):
        n, b, _ = frame(points[min(k + 1, n_pts - 1)] - points[max(k - 1, 0)])
        ring = []
        t_val = uvs_t[k] if uvs_t is not None else k / (n_pts - 1)
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            ring.append(vertex(p + (math.cos(phi) * n + math.sin(phi) * b) * radius, mask_fn(t_val)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        v0 = uvs_t[k] if uvs_t is not None else k / (len(rings) - 1)
        v1 = uvs_t[k + 1] if uvs_t is not None else (k + 1) / (len(rings) - 1)
        for j in range(sides):
            nxt = (j + 1) % sides
            u0 = j / sides + phase
            u1 = (j + 1) / sides + phase
            face((rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]), [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], material)
    face(
        tuple(reversed(rings[0])),
        [(phase + 0.5 + 0.10 * math.cos(j * 2.0 * math.pi / sides), 0.015 + 0.012 * math.sin(j * 2.0 * math.pi / sides)) for j in reversed(range(sides))],
        material,
    )
    face(
        rings[-1],
        [(phase + 0.5 + 0.10 * math.cos(j * 2.0 * math.pi / sides), 0.985 + 0.012 * math.sin(j * 2.0 * math.pi / sides)) for j in range(sides)],
        material,
    )


def hammer_tentacle(points, ts, base_radius, bar_dir, mask_fn, material, sides=10, phase=0.0):
    rings = []
    n_pts = len(points)
    for k, (p, t) in enumerate(zip(points, ts)):
        tan = (points[min(k + 1, n_pts - 1)] - points[max(k - 1, 0)]).normalized()
        # Orthogonalize bar_dir against tangent so the anchor crescent spans cleanly across the tip.
        b_lat = (bar_dir - tan * bar_dir.dot(tan))
        if b_lat.length < 1e-5:
            b_lat = Vector((1, 0, 0)).cross(tan)
        b_lat.normalize()
        n_rad = tan.cross(b_lat).normalized()

        h = smooth(0.75, 0.93, t)
        tip_taper = math.sqrt(max(0.015, 1.0 - smooth(0.93, 1.0, t) ** 2))
        stalk_swell = 0.85 + 0.18 * math.sin(math.pi * min(1.0, t * 1.15))

        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            cx = math.cos(phi)
            sy = math.sin(phi)
            # Bilobed T-anchor / crescent profile: wide flared lateral arms, pinched center waist, curved lobes.
            lat_extent = base_radius * stalk_swell * (1.0 + 3.45 * h) * tip_taper
            lobe_bulge = 1.0 + 0.45 * h * (cx * cx) - 0.28 * h * (1.0 - cx * cx)
            rad_extent = base_radius * stalk_swell * lobe_bulge * (1.0 + 0.25 * h) * tip_taper

            offset = b_lat * (cx * lat_extent) + n_rad * (sy * rad_extent)
            # Crescent arch: outer lobes curl slightly downward/back along tangent and forward toward viewer.
            offset -= tan * (0.0036 * h * (cx * cx) * (0.5 + 0.5 * tip_taper))
            offset += n_rad * (0.0014 * h * (cx * cx))
            ring.append(vertex(p + offset, mask_fn(t)))
        rings.append(ring)

    for k in range(len(rings) - 1):
        v0 = ts[k]
        v1 = ts[k + 1]
        for j in range(sides):
            nxt = (j + 1) % sides
            u0 = j / sides + phase
            u1 = (j + 1) / sides + phase
            face((rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]), [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], material)
    face(
        tuple(reversed(rings[0])),
        [(phase + 0.5 + 0.10 * math.cos(j * 2.0 * math.pi / sides), 0.015 + 0.012 * math.sin(j * 2.0 * math.pi / sides)) for j in reversed(range(sides))],
        material,
    )
    face(
        rings[-1],
        [(phase + 0.5 + 0.10 * math.cos(j * 2.0 * math.pi / sides), 0.985 + 0.012 * math.sin(j * 2.0 * math.pi / sides)) for j in range(sides)],
        material,
    )


def disc(center, radius, material, mask):
    pole = vertex(center, mask)
    prev = None
    sides = 20
    for k in range(1, 5):
        r = radius * k / 4.0
        ring = []
        for j in range(sides):
            a = j * 2.0 * math.pi / sides
            p = center + Vector((math.cos(a) * r, math.sin(a) * r, -0.002 * (k / 4.0) ** 2 + 0.00035 * math.cos(10 * a)))
            ring.append(vertex(p, mask))
        for j in range(sides):
            nxt = (j + 1) % sides
            u0 = j / sides
            u1 = (j + 1) / sides
            if prev is None:
                face((pole, ring[j], ring[nxt]), [(u0, 0.0), (u0, 0.25), (u1, 0.25)], material)
            else:
                face((prev[j], ring[j], ring[nxt], prev[nxt]), [(u0, (k - 1) / 4.0), (u0, k / 4.0), (u1, k / 4.0), (u1, (k - 1) / 4.0)], material)
        prev = ring


heads = [Vector(p) for p in [(0, 0, 0.058), (-0.044, -0.012, 0.046), (0.041, -0.018, 0.043), (0.025, 0.036, 0.052), (-0.028, 0.038, 0.041)]]
for hi, center in enumerate(heads):
    a = Vector((0, 0, 0.002))
    b = Vector((center.x * 0.45, center.y * 0.45, 0.018))
    c = center - Vector((0, 0, 0.010))
    pts = [(1.0 - t) ** 2 * a + 2.0 * (1.0 - t) * t * b + t * t * c for t in [i / 7.0 for i in range(8)]]
    tube(pts, [0.0085 * (1.0 - i / 7.0) + 0.0062 * (i / 7.0) for i in range(8)], lambda t: (0.0, 0.0, 0.5, 0.42 + 0.38 * t), 1, 10, hi * 0.13)

    ring_spec = [(-0.014, 0.0085), (-0.008, 0.0125), (0.000, 0.0195), (0.004, 0.0205), (0.004, 0.0165), (-0.003, 0.0125)]
    rings = []
    sides = 20
    for k, (z, r) in enumerate(ring_spec):
        ring = []
        for j in range(sides):
            a_ang = j * 2.0 * math.pi / sides
            rr = r * (1.0 + 0.055 * math.cos(10 * a_ang))
            ring.append(vertex(center + Vector((rr * math.cos(a_ang), rr * math.sin(a_ang), z)), (0.0, 0.0, 0.5, 0.56 + 0.07 * k)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for j in range(sides):
            nxt = (j + 1) % sides
            face((rings[k][j], rings[k][nxt], rings[k + 1][nxt], rings[k + 1][j]), [(j / sides, k / 5.0), ((j + 1) / sides, k / 5.0), ((j + 1) / sides, (k + 1) / 5.0), (j / sides, (k + 1) / 5.0)], 1)

    disc(center + Vector((0, 0, 0.005)), 0.0168, 0, (0.0, 0.0, (hi + 0.25) / 5.0, 0.40))

    # 29 curved hammer tentacles per head (145 total) with T-shaped / crescent tips
    for ti in range(29):
        phi = ti * 2.399963 + hi * 0.91 + rng.uniform(-0.10, 0.10)
        radial = Vector((math.cos(phi), math.sin(phi), 0))
        side = Vector((-math.sin(phi), math.cos(phi), 0))
        r = 0.0028 + 0.0128 * math.sqrt((ti + 0.5) / 29.0)
        phase = rng.uniform(0.04, 0.96)
        p0 = center + radial * r + Vector((0, 0, 0.005))
        reach = 0.017 + 0.024 * (r / 0.016) + rng.uniform(-0.003, 0.005)
        height = 0.046 + 0.025 * (1.0 - r / 0.016) + rng.uniform(-0.007, 0.007)
        flow = Vector((0.011, -0.004, 0)) * rng.uniform(0.30, 1.10) + side * rng.uniform(-0.010, 0.010)
        p3 = p0 + radial * reach + flow + Vector((0, 0, height))
        p1 = p0 - radial * rng.uniform(0.001, 0.007) + side * rng.uniform(-0.007, 0.007) + Vector((0, 0, 0.032))
        p2 = p3 - radial * rng.uniform(0.002, 0.012) - flow * 0.15 + Vector((0, 0, rng.uniform(-0.008, 0.022))) + side * rng.uniform(-0.011, 0.011)
        ts = [0.0, 0.18, 0.38, 0.58, 0.74, 0.84, 0.915, 0.97, 1.0]
        points = [cubic(p0, p1, p2, p3, t) for t in ts]
        base = rng.uniform(0.0020, 0.0026)
        # Anchor bar direction oriented roughly tangent to head perimeter with natural twist
        twist = rng.uniform(-0.55, 0.55)
        bar_dir = (side * math.cos(twist) + radial * math.sin(twist) + Vector((0, 0, rng.uniform(-0.12, 0.12)))).normalized()

        def raw(t, ph=phase):
            return (t ** 1.8, smooth(0.76, 0.94, t), ph, 0.40 + 0.60 * smooth(0.0, 0.50, t))

        hammer_tentacle(points, ts, base, bar_dir, raw, 0, sides=10, phase=phase)

pts = [Vector((0, 0, z)) for z in [0.0, 0.002, 0.006]]
tube(pts, [0.018, 0.0185, 0.011], lambda t: (0.0, 0.0, 0.5, 0.40 + 0.30 * t), 1, 20)

z0 = min(p[2] for p in verts)
z1 = max(p[2] for p in verts)
scale = 0.172 / (z1 - z0)
verts = [(x * scale, y * scale, (z - z0) * scale) for x, y, z in verts]

mesh = bpy.data.meshes.new("Anchor_Hammer_Tissue_And_Skeleton")
mesh.from_pydata(verts, [], faces)
mesh.update()
if mesh.validate(verbose=True):
    raise RuntimeError("Construction needs correction before UV/masks")

obj = bpy.data.objects.new("Reef_Euphyllia_Anchor_Hammer", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Tissue_Radial_ArcLength")
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
    streak = 0.5 + 0.25 * math.sin(2.0 * math.pi * u * 8.0) + 0.14 * math.cos(2.0 * math.pi * (u * 19.0 + v * 4.0))
    tip = smooth(0.76, 0.94, v)
    shade = 0.78 + 0.22 * streak
    body = (0.14 * shade, 0.36 * shade, 0.28 * shade)
    hammer_tip = (0.42 + 0.18 * streak, 0.78 + 0.10 * streak, 0.52)
    return tuple(body[i] * (1.0 - tip) + hammer_tip[i] * tip for i in range(3))


def skeleton_albedo(u, v):
    rib = 0.5 + 0.5 * math.cos(20.0 * math.pi * u)
    patch = 0.5 + 0.5 * math.sin(2.0 * math.pi * (3.0 * u + v))
    collar = smooth(0.78, 0.98, v)
    stone = (0.38 + 0.08 * rib + 0.04 * patch, 0.34 + 0.07 * rib - 0.04 * patch, 0.29 + 0.06 * rib + 0.03 * patch)
    return tuple(stone[i] * (1.0 - collar) + (0.24, 0.17, 0.14)[i] * collar for i in range(3))


def normal_map(u, v, strength):
    x = strength * math.sin(16.0 * math.pi * u) * (0.6 + 0.4 * math.sin(2.0 * math.pi * v))
    y = strength * 0.18 * math.cos(6.0 * math.pi * v)
    n = Vector((x, y, 1.0)).normalized()
    return tuple(0.5 + 0.5 * c for c in n)


for label, material_id, size in [("tissue", 0, 512), ("skeleton", 1, 256)]:
    base = make_image(label + "-albedo", size, tissue_albedo if material_id == 0 else skeleton_albedo, False)
    nrm = make_image(label + "-normal", size, lambda u, v, mid=material_id: normal_map(u, v, 0.05 if mid == 0 else 0.08), True)
    rough = make_image(
        label + "-roughness",
        size,
        lambda u, v, mid=material_id: (((0.36 if mid == 0 else 0.78) + 0.08 * (0.5 + 0.5 * math.sin(2.0 * math.pi * (u * 5.0 + v * 3.0)))),) * 3,
        True,
    )
    mat = bpy.data.materials.new("Anchor_Hammer_" + label.title())
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
        "id": "anchor_hammer_crown" if material_id == 0 else "anchor_hammer_skeleton",
        "role": "coral-soft" if material_id == 0 else "coral-rigid",
        "maskSchema": "coral-raw-masks-v1",
    }
    mesh.materials.append(mat)

obj["authoring_notes"] = (
    "Original five-head Euphyllia anchor/hammer coral, 145 curved tentacles with bilobed T-crescent tips "
    "and fluted phaceloid skeleton calyces. Raw R arc flex on soft tissue only; rigid R=0, G crescent tips, "
    "B phase, A analytic contact. Chosen 0.172m comparison height, no imported visuals."
)
triangulate = obj.modifiers.new("Stable_Export_Triangles", "TRIANGULATE")
bpy.ops.object.modifier_apply(modifier=triangulate.name)
mesh = obj.data
if mesh.validate(verbose=True):
    raise RuntimeError("Final native mesh changed after assigning masks")
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
    "ANCHOR_HAMMER_SAVED_EXPORTED",
    json.dumps({"triangles": triangles, "vertices": len(mesh.vertices), "tentacles": 145, "heads": 5, "dimensions": list(obj.dimensions)}),
    flush=True,
)

# Add neutral inspection lighting in viewport AFTER saving/exporting so MCP `look` shows clearly.
world = bpy.data.worlds.new("Neutral_Review")
scene.world = world
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.12, 0.15, 0.18, 1.0)
bg.inputs[1].default_value = 0.55
for name, pos, energy, size in [("Key", (0.12, -0.35, 0.45), 4.0, 0.3), ("Fill", (-0.32, -0.15, 0.25), 1.5, 0.4), ("Rim", (0.05, 0.35, 0.35), 2.5, 0.25)]:
    light = bpy.data.lights.new(name, "AREA")
    light.energy = energy
    light.shape = "DISK"
    light.size = size
    lo = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(lo)
    lo.location = pos
    lo.rotation_euler = (Vector((0, 0, 0.08)) - lo.location).to_track_quat("-Z", "Y").to_euler()
