"""Original Flowerpot Coral (Goniopora stokesi) dual-primitive colony (AQ-70.11).
Porous calcareous corallite-dimpled skeleton dome (rigid, R=0) topped with 58 swaying
elongated fleshy polyp stalks crowned by scalloped 12-petal rose-coral daisy rosettes
with bright mint-aqua oral centers (soft crown, R=0 pinned bases to flex=0.96).
Packed native + static two-material GLB; raw soft/rigid COLOR_0 masks.
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
ID = "reef-goniopora-flowerpot-lps"
OUT = ROOT / "src/rendering/assets/splat-fish"
rng = random.Random(20261201)


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
    verts.append((float(p.x), float(p.y), float(p.z)))
    masks.append((
        max(0.0, min(1.0, float(mask[0]))),
        max(0.0, min(1.0, float(mask[1]))),
        max(0.05, min(0.95, float(mask[2]))),
        max(0.0, min(1.0, float(mask[3]))),
    ))
    return len(verts) - 1


def face(indices, uv, material):
    faces.append(tuple(indices))
    face_uvs.append(uv)
    materials.append(material)


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / max(1e-6, b - a)))
    return t * t * (3.0 - 2.0 * t)


def cubic(a, b, c, d, t):
    u = 1.0 - t
    return (u ** 3) * a + 3.0 * (u ** 2) * t * b + 3.0 * u * (t ** 2) * c + (t ** 3) * d


def build_bishop_frames(points):
    tangents = []
    n_pts = len(points)
    for i in range(n_pts):
        tangents.append((points[min(i + 1, n_pts - 1)] - points[max(i - 1, 0)]).normalized())
    t0 = tangents[0]
    ref = Vector((0.0, 0.0, 1.0)) if abs(t0.z) < 0.88 else Vector((1.0, 0.0, 0.0))
    n0 = (ref - t0 * ref.dot(t0)).normalized()
    b0 = t0.cross(n0).normalized()
    frames = [(n0, b0, t0)]
    prev_t, prev_n = t0, n0
    for i in range(1, n_pts):
        ti = tangents[i]
        axis = prev_t.cross(ti)
        if axis.length > 1e-6:
            axis.normalize()
            angle = math.acos(max(-1.0, min(1.0, prev_t.dot(ti))))
            cos_a, sin_a = math.cos(angle), math.sin(angle)
            ni = prev_n * cos_a + axis.cross(prev_n) * sin_a + axis * axis.dot(prev_n) * (1.0 - cos_a)
            ni = (ni - ti * ni.dot(ti)).normalized()
        else:
            ni = prev_n
        bi = ti.cross(ni).normalized()
        frames.append((ni, bi, ti))
        prev_t, prev_n = ti, ni
    return frames


# 1. Build 58 Fibonacci hemisphere polyp sockets over a porous skeleton dome
DOME_RX = 0.052
DOME_RY = 0.044
DOME_HZ = 0.036

polyp_anchors = []
N_POLYPS = 58
golden_angle = math.pi * (3.0 - math.sqrt(5.0))
for k in range(N_POLYPS):
    # Distribute uniformly from apex down to equator (uz in 0.22..1.0)
    z_unit = 1.0 - (k + 0.35) / (N_POLYPS + 2.0) * 0.78
    r_unit = math.sqrt(max(0.0, 1.0 - z_unit * z_unit))
    theta = k * golden_angle
    ux = r_unit * math.cos(theta)
    uy = r_unit * math.sin(theta)
    uz = z_unit
    out_n = Vector((ux / DOME_RX, uy / DOME_RY, uz / DOME_HZ)).normalized()
    base_p = Vector((ux * DOME_RX, uy * DOME_RY, max(0.004, uz * DOME_HZ)))
    polyp_anchors.append((base_p, out_n, Vector((ux, uy, uz))))


# 2. Construct watertight corallite-dimpled rigid skeleton dome (material=1, R=0 everywhere)
bm_dome = bmesh.new()
bmesh.ops.create_icosphere(bm_dome, subdivisions=4, radius=1.0)
bm_dome.verts.ensure_lookup_table()
bm_dome.faces.ensure_lookup_table()

dome_v_idx = {}
dome_uvs = []
for i, bv in enumerate(bm_dome.verts):
    ux, uy, uz = bv.co.x, bv.co.y, bv.co.z
    r_horiz = math.hypot(ux, uy)
    ang = math.atan2(uy, ux)
    perim = 1.0 + 0.05 * math.cos(ang * 4.0 + 0.3) + 0.03 * math.sin(ang * 3.0)

    theta_dome = math.acos(max(-1.0, min(1.0, uz)))
    rho = (2.0 / math.pi) * theta_dome
    nx = (ux / r_horiz) * rho if r_horiz > 1e-6 else 0.0
    ny = (uy / r_horiz) * rho if r_horiz > 1e-6 else 0.0
    dome_uvs.append((max(0.02, min(0.98, 0.5 + 0.45 * nx)), max(0.02, min(0.98, 0.5 + 0.45 * ny))))

    if uz >= 0.0:
        px = ux * DOME_RX * perim
        py = uy * DOME_RY * perim
        pz = uz * DOME_HZ
        # Carve subtle corallite cup depression right around nearest polyp socket!
        min_d = 1e9
        for _, _, u_site in polyp_anchors:
            d = (Vector((ux, uy, uz)) - u_site).length
            if d < min_d:
                min_d = d
        cup_dip = (1.0 - smooth(0.06, 0.19, min_d)) * 0.0028 - (smooth(0.16, 0.24, min_d) - smooth(0.24, 0.32, min_d)) * 0.0014
        pos = Vector((px, py, max(0.003, pz))) - Vector((ux, uy, uz)).normalized() * cup_dip
        g_sk = 0.10 + 0.22 * smooth(0.18, 0.25, min_d) * smooth(0.10, 0.35, uz)
        ao_sk = 0.24 + 0.52 * smooth(0.05, 0.60, uz) - 0.14 * (1.0 - smooth(0.06, 0.18, min_d))
    else:
        down = smooth(0.0, -0.35, uz)
        inset = 1.0 - 0.12 * down
        pos = Vector((ux * DOME_RX * perim * inset, uy * DOME_RY * perim * inset, max(0.0, 0.003 * (1.0 - smooth(0.0, -0.22, uz)))))
        g_sk = 0.0
        ao_sk = 0.16 + 0.06 * (1.0 - down)

    ph_sk = max(0.08, min(0.92, 0.50 + 0.25 * math.sin(nx * 4.5 + ny * 4.0)))
    dome_v_idx[i] = vertex(pos, (0.0, g_sk, ph_sk, ao_sk))

for bf in bm_dome.faces:
    idxs = [dome_v_idx[v.index] for v in bf.verts]
    uvs = [dome_uvs[v.index] for v in bf.verts]
    face(idxs, uvs, 1)
bm_dome.free()


# 3. Watertight swaying polyp stalks + 12-petal scalloped daisy rosette heads (material=0, coral-soft)
def add_goniopora_polyp(base_p, out_n, length_m, base_r, flower_r, phase, stiff):
    """Build one complete Goniopora polyp: 10-ring swaying stalk + watertight 12-petal flower."""
    # Gentle ocean current sway drifting subtly +X and -Y_bl (toward front viewer)
    current_dir = Vector((0.18 + rng.uniform(-0.14, 0.18), -0.16 + rng.uniform(-0.14, 0.14), 0.24))
    dir_p = (out_n * 0.85 + Vector((0.0, 0.0, 0.25))).normalized()
    p0 = base_p - out_n * 0.0032
    p3 = base_p + dir_p * length_m + current_dir * (length_m * 0.26)
    p1 = p0 + dir_p * (length_m * 0.36) + Vector((rng.uniform(-0.002, 0.002), rng.uniform(-0.002, 0.002), 0.002))
    p2 = p0 + dir_p * (length_m * 0.74) + current_dir * (length_m * 0.14)

    ts = [0.0, 0.09, 0.19, 0.30, 0.42, 0.54, 0.66, 0.78, 0.89, 0.99]
    pts = [cubic(p0, p1, p2, p3, t) for t in ts]
    frames = build_bishop_frames(pts)

    sides = 7
    stalk_rings = []
    for k, (p, t) in enumerate(zip(pts, ts)):
        n, b, _ = frames[k]
        rad = base_r * (1.12 - 0.18 * smooth(0.15, 0.75, t) + 0.20 * smooth(0.84, 0.99, t))
        r_flex = 0.0 if t <= 0.0 else min(0.96, (t ** 1.48) * stiff)
        g_val = 0.06 + 0.52 * smooth(0.08, 0.95, t)
        ao_val = 0.26 + 0.62 * smooth(0.0, 0.55, t)
        ring = []
        for j in range(sides):
            phi = j * 2.0 * math.pi / sides
            ring.append(vertex(p + (math.cos(phi) * n + math.sin(phi) * b) * rad, (r_flex, g_val, phase, ao_val)))
        stalk_rings.append(ring)

    for k in range(len(stalk_rings) - 1):
        v0 = ts[k] * 0.62
        v1 = ts[k + 1] * 0.62
        for j in range(sides):
            nxt = (j + 1) % sides
            face(
                (stalk_rings[k][j], stalk_rings[k][nxt], stalk_rings[k + 1][nxt], stalk_rings[k + 1][j]),
                [(j / sides, v0), ((j + 1) / sides, v0), ((j + 1) / sides, v1), (j / sides, v1)],
                0,
            )

    # Cap stalk ends cleanly so stalk solid is 100% manifold & independent of flower cup
    s_bot = vertex(pts[0] - frames[0][2] * 0.001, (0.0, 0.04, phase, 0.24))
    s_top = vertex(pts[-1] + frames[-1][2] * 0.001, (min(0.96, stiff), 0.62, phase, 0.88))
    for j in range(sides):
        nxt = (j + 1) % sides
        face((s_bot, stalk_rings[0][nxt], stalk_rings[0][j]), [(j / sides, 0.01), ((j + 1) / sides, 0.02), (j / sides, 0.02)], 0)
        face((stalk_rings[-1][j], stalk_rings[-1][nxt], s_top), [(j / sides, 0.60), ((j + 1) / sides, 0.60), ((j + 0.5) / sides, 0.63)], 0)

    # Daisy rosette head (24-gon radial star cup: 12 plump petals alternating with 12 deep calyx notches!)
    hn, hb, htan = frames[-1]
    hc = pts[-1] + htan * 0.0010
    head_r_flex = min(0.985, (0.98 ** 1.48) * stiff)
    tip_r_flex = min(0.992, stiff)
    spin_off = rng.uniform(0.0, math.pi / 6.0)
    cup_sides = 24

    def head_ring(r_scale, notch_ratio, z_off, r_flex_val, g_val, v_coord, ao_val):
        ring = []
        for j in range(cup_sides):
            phi = j * 2.0 * math.pi / cup_sides + spin_off
            is_petal = (j % 2 == 0)
            rad_eff = flower_r * r_scale * (1.0 if is_petal else notch_ratio)
            cup_lift = (0.0016 if is_petal else 0.0005) * (r_scale ** 1.4)
            pos = hc + (math.cos(phi) * hn + math.sin(phi) * hb) * rad_eff + htan * (z_off + cup_lift)
            ring.append(vertex(pos, (r_flex_val, g_val, phase, ao_val)))
        return ring

    ring_oral = head_ring(0.25, 0.94, 0.0020, head_r_flex, 0.95, 0.94, 0.96)
    ring_mid = head_ring(0.68, 0.78, 0.0015, head_r_flex, 0.80, 0.78, 0.94)
    ring_top_tip = head_ring(1.00, 0.48, 0.0009, tip_r_flex, 0.92, 0.65, 1.00)
    ring_bot_mid = head_ring(0.60, 0.72, -0.0008, head_r_flex, 0.66, 0.56, 0.78)

    oral_pole = vertex(hc + htan * 0.0032, (head_r_flex, 1.0, phase, 0.98))
    under_pole = vertex(hc - htan * 0.0018, (min(0.95, head_r_flex * 0.96), 0.54, phase, 0.72))

    # Connect poles & closed petal cup rings: top center -> oral -> mid -> scalloped outer rim -> underside -> under pole
    for j in range(cup_sides):
        nxt = (j + 1) % cup_sides
        u0, u1 = j / cup_sides, (j + 1) / cup_sides
        # Top center oral disk (neon mint-aqua!)
        face((oral_pole, ring_oral[j], ring_oral[nxt]), [(0.5 * (u0 + u1), 0.995), (u0, 0.92), (u1, 0.92)], 0)
        # Inner petal base
        face((ring_oral[j], ring_mid[j], ring_mid[nxt], ring_oral[nxt]), [(u0, 0.90), (u0, 0.76), (u1, 0.76), (u1, 0.90)], 0)
        # Outer scalloped daisy petal upper face
        face((ring_mid[j], ring_top_tip[j], ring_top_tip[nxt], ring_mid[nxt]), [(u0, 0.76), (u0, 0.65), (u1, 0.65), (u1, 0.76)], 0)
        # Petal underside calyx return
        face((ring_top_tip[j], ring_bot_mid[j], ring_bot_mid[nxt], ring_top_tip[nxt]), [(u0, 0.64), (u0, 0.52), (u1, 0.52), (u1, 0.64)], 0)
        # Close flower cup cleanly at underside stem junction
        face((ring_bot_mid[j], under_pole, ring_bot_mid[nxt]), [(u0, 0.52), (0.5 * (u0 + u1), 0.44), (u1, 0.52)], 0)


for idx_p, (base_p, out_n, u_site) in enumerate(polyp_anchors):
    # Crown center stalks slightly taller than perimeter stalks to create a lush dome silhouette
    apex_boost = 1.0 + 0.24 * max(0.0, u_site.z)
    len_m = rng.uniform(0.026, 0.036) * apex_boost
    rad_stalk = rng.uniform(0.0021, 0.0026)
    rad_flower = rng.uniform(0.0098, 0.0120)
    ph = 0.06 + 0.88 * (((idx_p * 7) % N_POLYPS) / N_POLYPS)
    stiff = rng.uniform(0.86, 0.97)
    add_goniopora_polyp(base_p, out_n, len_m, rad_stalk, rad_flower, ph, stiff)


# Calibrate glTF +Y-up dimensions strictly <= [0.185, 0.105, 0.160] (Blender X<=0.185, Y<=0.160, Z<=0.105)
xs = [v[0] for v in verts]
ys = [v[1] for v in verts]
zs = [v[2] for v in verts]
cx = 0.5 * (min(xs) + max(xs))
cy = 0.5 * (min(ys) + max(ys))
z0 = min(zs)
sx = 0.180 / max(1e-5, max(xs) - min(xs))
sy = 0.156 / max(1e-5, max(ys) - min(ys))
sz = 0.102 / max(1e-5, max(zs) - z0)
sc = min(1.0, sx, sy, sz)
verts = [((x - cx) * sc, (y - cy) * sc, (z - z0) * sc) for (x, y, z) in verts]

mesh = bpy.data.meshes.new("Reef_Goniopora_Flowerpot_Mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()
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

obj = bpy.data.objects.new("Reef_Goniopora_Flowerpot_LPS", mesh)
bpy.context.collection.objects.link(obj)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

uv = mesh.uv_layers.new(name="Goniopora_Polyp_UV")
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


def tissue_albedo(u, v):
    # v in [0, 0.63]: rose-plum stalk; [0.63, 0.90]: 12-petal peach-coral rosette; [0.90, 1.0]: neon mint-aqua oral disk!
    ang = u * 2.0 * math.pi
    petal_wave = 0.5 + 0.5 * math.cos(ang * 12.0)
    vein = 0.5 + 0.5 * math.sin(ang * 24.0 + v * 12.0)
    mottle = 0.5 + 0.5 * math.sin(u * 38.0 + math.cos(v * 34.0))

    c_socket = (0.42 + 0.08 * mottle, 0.16 + 0.05 * vein, 0.22 + 0.06 * mottle)
    c_stalk = (0.84 + 0.10 * vein, 0.34 + 0.10 * mottle, 0.34 + 0.08 * vein)
    c_petal = (0.96, 0.52 + 0.16 * petal_wave, 0.44 + 0.14 * petal_wave)
    c_oral = (0.28 + 0.10 * mottle, 0.94, 0.72 + 0.10 * vein)

    t_stalk = smooth(0.06, 0.56, v)
    t_petal = smooth(0.62, 0.72, v)
    t_oral = smooth(0.89, 0.95, v)

    col = [c_socket[k] * (1.0 - t_stalk) + c_stalk[k] * t_stalk for k in range(3)]
    col = [col[k] * (1.0 - t_petal) + c_petal[k] * t_petal for k in range(3)]
    # Soft petal notch crease shading around petal margins
    if 0.64 <= v <= 0.89:
        crease = 1.0 - 0.16 * (1.0 - petal_wave) * smooth(0.65, 0.86, v)
        col = [c * crease for c in col]
    col = [col[k] * (1.0 - t_oral) + c_oral[k] * t_oral for k in range(3)]
    return tuple(col)


def skeleton_albedo(u, v):
    nx = (u - 0.5) / 0.45
    ny = (v - 0.5) / 0.45
    cell = 0.5 + 0.5 * math.sin(nx * 28.0) * math.cos(ny * 28.0)
    speck = 0.5 + 0.5 * math.sin(u * 44.0 + v * 36.0)
    return (0.48 + 0.12 * cell + 0.05 * speck, 0.44 + 0.11 * cell + 0.04 * speck, 0.38 + 0.10 * cell)


def normal_map(u, v, strength):
    nx = strength * math.sin(24.0 * math.pi * u) * (0.6 + 0.4 * math.sin(4.0 * math.pi * v))
    ny = strength * 0.35 * math.cos(14.0 * math.pi * v)
    n = Vector((nx, ny, 1.0)).normalized()
    return tuple(0.5 + 0.5 * c for c in n)


for label, mat_id, size in [("tissue", 0, 512), ("skeleton", 1, 256)]:
    base = make_image(label + "-albedo", size, tissue_albedo if mat_id == 0 else skeleton_albedo, False)
    nrm = make_image(label + "-normal", size, lambda u, v, mid=mat_id: normal_map(u, v, 0.06 if mid == 0 else 0.16), True)
    rough = make_image(
        label + "-roughness",
        size,
        lambda u, v, mid=mat_id: (((0.34 if mid == 0 else 0.84) + 0.08 * (0.5 + 0.5 * math.sin(2.0 * math.pi * (u * 5.0 + v * 3.0)))),) * 3,
        True,
    )
    mat = bpy.data.materials.new("Goniopora_" + label.title())
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

    if mat_id == 0:
        bsdf.inputs["Transmission Weight"].default_value = 0.12
        bsdf.inputs["IOR"].default_value = 1.36
        bsdf.inputs["Coat Weight"].default_value = 0.14
        bsdf.inputs["Coat Roughness"].default_value = 0.24

    mat["reefPrimitive"] = {
        "id": "goniopora_polyp_crown" if mat_id == 0 else "goniopora_skeleton_dome",
        "role": "coral-soft" if mat_id == 0 else "coral-rigid",
        "maskSchema": "coral-raw-masks-v1",
    }
    mesh.materials.append(mat)

obj["authoring_notes"] = (
    "Original Flowerpot Coral Goniopora stokesi (AQ-70.11), dimpled porous skeleton dome + 58 swaying "
    "polyp stalks crowned with closed 12-petal rose-coral daisy rosettes & mint-aqua oral centers, "
    "dual-primitive soft/rigid PBR maps & COLOR_0 masks."
)

triangulate = obj.modifiers.new("Stable_Export_Triangles", "TRIANGULATE")
bpy.ops.object.modifier_apply(modifier=triangulate.name)
mesh = obj.data
if mesh.validate(verbose=True):
    raise RuntimeError("Final mesh validation failed")
mesh.calc_loop_triangles()
triangles = len(mesh.loop_triangles)
if triangles > 29500:
    raise RuntimeError(f"Triangle count {triangles} exceeds target 29500")

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
print("GONIOPORA_SAVED_EXPORTED", json.dumps({
    "triangles": triangles,
    "vertices": len(mesh.vertices),
    "polyps": N_POLYPS,
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
    lo.rotation_euler = (Vector((0.0, 0.0, 0.04)) - lo.location).to_track_quat("-Z", "Y").to_euler()
