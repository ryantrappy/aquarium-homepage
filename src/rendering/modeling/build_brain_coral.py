"""Build a realistic mounded meandroid Brain Coral (Diploria labyrinthiformis / Trachyphyllia LPS) in Blender 5.0.

Follows docs/modular-coral-and-live-rock-spec.md (Section 4.1 & 4.5):
- Low fleshy dome (`80 x 44` hemisphere grid, ~7k triangles) with a flared encrusting basal skirt
  that hugs lower live-rock aprons or sandbed margins (`socket_brain_apron_*`).
- Coherent 3D domain-warped meandroid labyrinth displacement where plump fleshy ridges (`collines`)
  alternate with deep sinuous valleys (`ambulacra`) and fine transverse septal teeth along ridge walls.
- Two-tone fluorescent pigmentation synced 1:1 with the 3D labyrinth geometry: glowing cyan/neon-green
  recessed valleys (`#00F5D4` / `#39FF14`, `COLOR_0.g = 1.0`) framed by deep crimson/magenta/burnt-orange
  fleshy ridges (`#A8183B`, `COLOR_0.g = 0.0`) with a glossy mucus sheen (`roughness: 0.22`).
- Standardized 4-channel `COLOR_0` vertex attribute (`R <= 0.05` slow fleshy expansion only,
  `G = valleyMask`, `B = phaseSeed`, `A = contactAO`).

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_brain_coral.py -- /tmp/coral-models/coral-brain-diploria
"""
import hashlib
import json
import math
import os
import struct
import sys

import bpy
from mathutils import Vector


def parse_output_prefix():
    argv = sys.argv
    if '--' in argv:
        args = argv[argv.index('--') + 1:]
        if args:
            return os.path.abspath(args[0])
    return '/tmp/coral-models/coral-brain-diploria'


def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / max(1e-6, edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_color(c0, c1, t):
    return tuple(lerp(c0[i], c1[i], t) for i in range(len(c0)))


# Precompute 9 isotropic wave directions with golden-angle phases for a uniform Turing-like meandroid labyrinth
_TURING_MODES = [
    (math.cos(k * math.pi / 9.0 + 0.17), math.sin(k * math.pi / 9.0 + 0.17), 1.35 + k * 0.91)
    for k in range(9)
]


def labyrinth_field(nx, ny):
    """Evaluate an isotropic Turing/reaction-diffusion meandroid labyrinth on dome coordinates (nx, ny) in [-1, 1].

    Because a superposition of equal-wavelength plane waves at 9 angles has a uniform spatial wavelength
    everywhere on the dome, ridges (collines) and valleys (ambulacra) maintain consistent biological width
    without flat stationary patches.

    Returns:
      ridge_height in [0, 1] (0 = deep ambulacral valley floor, 1 = inflated colline ridge crest)
      septa_rib in [-1, 1] (transverse septal ridges perpendicular to the valley walls)
    """
    freq = 14.5
    # Slight organic domain warp so meanders bend smoothly toward the colony margin
    wx = nx + 0.08 * math.sin(ny * 5.0 + 0.4)
    wy = ny + 0.08 * math.cos(nx * 5.0 - 0.6)

    val = 0.0
    gx = 0.0
    gy = 0.0
    for dx, dy, phase in _TURING_MODES:
        arg = (wx * dx + wy * dy) * freq + phase
        val += math.cos(arg)
        s_arg = -math.sin(arg) * freq
        gx += s_arg * dx
        gy += s_arg * dy

    # Normalize wave sum roughly to [-1, 1]
    norm_wave = val / 3.4
    # Absolute value of the Turing field gives continuous meandering valley channels along zero-crossings
    # while rounded peaks form the inflated fleshy collines!
    abs_w = abs(norm_wave)
    ridge_height = smoothstep(0.04, 0.62, abs_w) ** 0.80

    # Transverse septal ridges run perpendicular to the local ridge gradient (along tangent (-gy, gx))
    grad_len = math.sqrt(gx * gx + gy * gy + 1e-4)
    tx = -gy / grad_len
    ty = gx / grad_len
    # High-frequency septal teeth along the valley walls
    septa_phase = (wx * tx + wy * ty) * 68.0 + math.atan2(wy, wx) * 18.0
    septa = math.sin(septa_phase)
    wall_mask = 4.0 * ridge_height * (1.0 - ridge_height)
    return ridge_height, septa * wall_mask


def make_packed_image(name, width, height, pixel_fn, non_color=False):
    img = bpy.data.images.new(name=name, width=width, height=height, alpha=True, float_buffer=False)
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    pixels = [0.0] * (width * height * 4)
    for y in range(height):
        v = y / max(1, height - 1)
        row_offset = y * width * 4
        for x in range(width):
            u = x / max(1, width - 1)
            r, g, b, a = pixel_fn(u, v)
            idx = row_offset + x * 4
            pixels[idx] = max(0.0, min(1.0, r))
            pixels[idx + 1] = max(0.0, min(1.0, g))
            pixels[idx + 2] = max(0.0, min(1.0, b))
            pixels[idx + 3] = max(0.0, min(1.0, a))
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def build_brain_textures(size=512):
    # UV layout maps top-down dome projection (u, v) in [0, 1]^2 -> (nx, ny) in [-1.15, 1.15]^2
    def coords(u, v):
        nx = (u - 0.5) * 2.3
        ny = (v - 0.5) * 2.3
        rad = math.sqrt(nx * nx + ny * ny)
        return nx, ny, rad

    def base_pixel(u, v):
        nx, ny, rad = coords(u, v)
        ridge_h, septa = labyrinth_field(nx, ny)
        skirt_t = smoothstep(0.88, 1.08, rad)

        # Spec Section 4.5 colors:
        # Glowing cyan/neon-green valleys (#00F5D4 / #39FF14)
        # Deep crimson/magenta/burnt-orange fleshy ridges (#A8183B)
        c_valley_center = (0.04, 0.96, 0.78)   # glowing bioluminescent cyan-green (#00F5D4)
        c_valley_edge   = (0.22, 0.92, 0.18)   # neon lime-green oral transition (#39FF14)
        c_ridge_wall    = (0.659, 0.094, 0.231)# deep crimson-magenta ridge (#A8183B)
        c_ridge_crest   = (0.84, 0.24, 0.16)   # warm burnt-orange/crimson fleshy crest
        c_skirt         = (0.34, 0.16, 0.26)   # basal encrusting periderm skirt

        col = lerp_color(c_valley_center, c_valley_edge, smoothstep(0.05, 0.35, ridge_h))
        col = lerp_color(col, c_ridge_wall, smoothstep(0.28, 0.68, ridge_h))
        col = lerp_color(col, c_ridge_crest, smoothstep(0.65, 0.96, ridge_h))

        # Accentuate transverse septal pleats along ridge slopes
        septa_bright = 1.0 + 0.16 * septa
        col = (col[0] * septa_bright, col[1] * septa_bright, col[2] * septa_bright)
        col = lerp_color(col, c_skirt, skirt_t)

        ao = lerp(0.52, 1.0, ridge_h) * (1.0 - 0.35 * skirt_t)
        return (col[0] * ao, col[1] * ao, col[2] * ao, 1.0)

    def normal_pixel(u, v):
        eps = 1.2 / size
        nx, ny, rad = coords(u, v)
        h0, s0 = labyrinth_field(nx, ny)
        hx, sx = labyrinth_field(nx + eps * 2.3, ny)
        hy, sy = labyrinth_field(nx, ny + eps * 2.3)
        skirt_fade = 1.0 - smoothstep(0.88, 1.08, rad)
        dx = -((hx - h0) * 6.5 + (sx - s0) * 2.2) * skirt_fade
        dy = -((hy - h0) * 6.5 + (sy - s0) * 2.2) * skirt_fade
        nx_v = max(-1.0, min(1.0, dx))
        ny_v = max(-1.0, min(1.0, dy))
        nz_v = math.sqrt(max(0.0, 1.0 - nx_v * nx_v - ny_v * ny_v))
        return (0.5 + 0.5 * nx_v, 0.5 + 0.5 * ny_v, 0.5 + 0.5 * nz_v, 1.0)

    def orm_pixel(u, v):
        nx, ny, rad = coords(u, v)
        ridge_h, _ = labyrinth_field(nx, ny)
        skirt_t = smoothstep(0.88, 1.08, rad)
        # Spec Section 4.5: glossy mucus coat roughness = 0.22 on fleshy dome, 0.65 on basal skirt
        roughness = lerp(0.20, 0.65, skirt_t)
        ao = lerp(0.32, 1.0, ridge_h) * (1.0 - 0.45 * skirt_t)
        return (ao, roughness, 0.0, 1.0)

    def emissive_pixel(u, v):
        nx, ny, rad = coords(u, v)
        ridge_h, _ = labyrinth_field(nx, ny)
        skirt_t = smoothstep(0.88, 1.08, rad)
        valley_glow = (1.0 - smoothstep(0.10, 0.58, ridge_h)) * (1.0 - skirt_t)
        crest_glow = smoothstep(0.65, 0.95, ridge_h) * (1.0 - skirt_t)
        r = valley_glow * 0.05 + crest_glow * 0.24
        g = valley_glow * 0.82 + crest_glow * 0.04
        b = valley_glow * 0.64 + crest_glow * 0.08
        return (r, g, b, 1.0)

    return (
        make_packed_image('brain_coral_base', size, size, base_pixel, non_color=False),
        make_packed_image('brain_coral_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('brain_coral_orm', size, size, orm_pixel, non_color=True),
        make_packed_image('brain_coral_emissive', size, size, emissive_pixel, non_color=False),
    )


def build_pbr_material(name, base_img, norm_img, orm_img, emissive_img):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = 0.0
    if 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = 0.75
    if 'Coat Roughness' in bsdf.inputs:
        bsdf.inputs['Coat Roughness'].default_value = 0.12

    tex_base = nodes.new('ShaderNodeTexImage')
    tex_base.image = base_img
    links.new(tex_base.outputs['Color'], bsdf.inputs['Base Color'])

    tex_orm = nodes.new('ShaderNodeTexImage')
    tex_orm.image = orm_img
    sep = nodes.new('ShaderNodeSeparateColor')
    links.new(tex_orm.outputs['Color'], sep.inputs['Color'])
    links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])

    tex_norm = nodes.new('ShaderNodeTexImage')
    tex_norm.image = norm_img
    norm_node = nodes.new('ShaderNodeNormalMap')
    norm_node.inputs['Strength'].default_value = 0.95
    links.new(tex_norm.outputs['Color'], norm_node.inputs['Color'])
    links.new(norm_node.outputs['Normal'], bsdf.inputs['Normal'])

    tex_em = nodes.new('ShaderNodeTexImage')
    tex_em.image = emissive_img
    if 'Emission Color' in bsdf.inputs:
        links.new(tex_em.outputs['Color'], bsdf.inputs['Emission Color'])
    if 'Emission Strength' in bsdf.inputs:
        bsdf.inputs['Emission Strength'].default_value = 0.42

    return mat


def build_brain_coral_mesh(mat):
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    # Concentric rings from apex (r_idx = 0) -> fleshy dome -> flared encrusting basal skirt -> flat bottom cap
    n_az = 112
    n_dome_rings = 56
    dome_radius = 0.095   # ~19 cm diameter cushion/brain colony
    dome_height = 0.068   # ~6.8 cm height

    ring_data = []  # Each ring is list of (Vector, u_uv, v_uv, rgba) of length n_az

    for r_i in range(1, n_dome_rings + 1):
        s = r_i / n_dome_rings  # 0 (apex) -> 1.0 (outer skirt edge)
        ring = []
        for j in range(n_az):
            theta = (j / n_az) * 2.0 * math.pi
            # Organic slightly trilobed cushion silhouette (like Trachyphyllia / Diploria)
            lobe = 1.0 + 0.08 * math.sin(theta * 3.0 + 0.4) + 0.05 * math.cos(theta * 5.0 - 0.8)

            if s <= 0.84:
                # Fleshy brain dome
                d_s = s / 0.84
                phi = d_s * (math.pi * 0.48)
                rad_xy = dome_radius * math.sin(phi) * lobe
                base_z = dome_height * math.cos(phi) + 0.008

                nx = (rad_xy / dome_radius) * math.cos(theta)
                ny = (rad_xy / dome_radius) * math.sin(theta)
                ridge_h, septa = labyrinth_field(nx, ny)

                # Labyrinth relief amplitude fades smoothly near the bottom collar and very center pole
                pole_smooth = smoothstep(0.0, 0.08, d_s)
                relief_env = smoothstep(0.0, 0.16, 1.0 - d_s) * pole_smooth
                disp = (0.0068 * (ridge_h - 0.45) + 0.0008 * septa) * relief_env
                n_out = Vector((math.sin(phi) * math.cos(theta), math.sin(phi) * math.sin(theta), math.cos(phi))).normalized()
                pos = Vector((rad_xy * math.cos(theta), rad_xy * math.sin(theta), base_z)) + n_out * disp

                # Standardized COLOR_0 contract (Spec Section 4.1 & 4.5):
                # R <= 0.05 (imperceptible slow fleshy expansion on ridges, 0.0 in valleys/base)
                # G = cavity/valley mask (1.0 in recessed valleys, 0.0 on inflated ridge crests)
                # B = phaseSeed
                # A = contactAO (darker in deep valleys and near bottom collar)
                flex_r = 0.045 * ridge_h * relief_env
                valley_g = 1.0 - smoothstep(0.15, 0.72, ridge_h)
                phase_b = 0.5 + 0.45 * math.sin(theta * 3.0 + d_s * 4.0)
                ao_a = lerp(0.28, 1.0, ridge_h) * lerp(0.45, 1.0, 1.0 - d_s * 0.65)
            else:
                # Flared encrusting basal skirt (s in [0.84, 1.0])
                sk_u = (s - 0.84) / 0.16
                skirt_lobe = lobe * (1.0 + 0.08 * math.sin(theta * 7.0 + 1.1) * sk_u)
                rad_xy = dome_radius * lerp(1.0, 1.18, sk_u) * skirt_lobe
                pos_z = lerp(0.010, -0.003, sk_u)
                pos = Vector((rad_xy * math.cos(theta), rad_xy * math.sin(theta), pos_z))

                nx = (rad_xy / dome_radius) * math.cos(theta)
                ny = (rad_xy / dome_radius) * math.sin(theta)
                flex_r = 0.0
                valley_g = 0.0
                phase_b = 0.15
                ao_a = lerp(0.35, 0.15, sk_u)

            u_uv = 0.5 + nx * 0.42
            v_uv = 0.5 + ny * 0.42
            rgba = (flex_r, valley_g, phase_b, max(0.15, min(1.0, ao_a)))
            ring.append((pos, u_uv, v_uv, rgba))
        ring_data.append(ring)

    # Apex vertex (index 0)
    apex_rh, _ = labyrinth_field(0.0, 0.0)
    apex_z = dome_height + 0.008 + 0.0085 * (apex_rh - 0.45)
    verts.append((0.0, 0.0, apex_z))
    apex_rgba = (0.04 * apex_rh, 1.0 - smoothstep(0.15, 0.72, apex_rh), 0.5, lerp(0.35, 1.0, apex_rh))

    for r_i, ring in enumerate(ring_data):
        for j in range(n_az):
            verts.append(tuple(ring[j][0]))

    # Apex triangle fan
    for j in range(n_az):
        j_next = (j + 1) % n_az
        v1 = 1 + j
        v2 = 1 + j_next
        faces.append((0, v1, v2))
        loop_uvs.extend([(0.5, 0.5), (ring_data[0][j][1], ring_data[0][j][2]), (ring_data[0][j_next][1], ring_data[0][j_next][2])])
        loop_colors.extend([apex_rgba, ring_data[0][j][3], ring_data[0][j_next][3]])

    # Quad rings across dome and skirt
    for r_i in range(len(ring_data) - 1):
        base0 = 1 + r_i * n_az
        base1 = 1 + (r_i + 1) * n_az
        for j in range(n_az):
            j_next = (j + 1) % n_az
            v00 = base0 + j
            v01 = base0 + j_next
            v11 = base1 + j_next
            v10 = base1 + j
            faces.append((v00, v10, v11, v01))
            loop_uvs.extend([
                (ring_data[r_i][j][1], ring_data[r_i][j][2]),
                (ring_data[r_i + 1][j][1], ring_data[r_i + 1][j][2]),
                (ring_data[r_i + 1][j_next][1], ring_data[r_i + 1][j_next][2]),
                (ring_data[r_i][j_next][1], ring_data[r_i][j_next][2]),
            ])
            loop_colors.extend([
                ring_data[r_i][j][3],
                ring_data[r_i + 1][j][3],
                ring_data[r_i + 1][j_next][3],
                ring_data[r_i][j_next][3],
            ])

    # Close bottom cap of the basal skirt
    bot_center_idx = len(verts)
    verts.append((0.0, 0.0, -0.003))
    bot_rgba = (0.0, 0.0, 0.15, 0.15)
    last_ring_idx = len(ring_data) - 1
    last_base = 1 + last_ring_idx * n_az
    for j in range(n_az):
        j_next = (j + 1) % n_az
        faces.append((bot_center_idx, last_base + j_next, last_base + j))
        loop_uvs.extend([(0.02, 0.02), (0.04, 0.02), (0.02, 0.04)])
        loop_colors.extend([bot_rgba, ring_data[last_ring_idx][j_next][3], ring_data[last_ring_idx][j][3]])

    mesh = bpy.data.meshes.new('Diploria_Brain_Colony')
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = uv

    color_attr = mesh.color_attributes.new(name='COLOR_0', type='BYTE_COLOR', domain='CORNER')
    mesh.color_attributes.active_color = color_attr
    mesh.color_attributes.render_color_index = 0
    for li, rgba in enumerate(loop_colors):
        color_attr.data[li].color = rgba

    mesh.materials.append(mat)
    mesh.calc_tangents(uvmap='UVMap')
    return mesh


def inspect_glb_json(glb_path):
    with open(glb_path, 'rb') as fp:
        magic, version, _ = struct.unpack('<4sII', fp.read(12))
        if magic != b'glTF' or version != 2:
            raise ValueError('Invalid GLB header')
        chunk_len, _ = struct.unpack('<I4s', fp.read(8))
        return json.loads(fp.read(chunk_len))


def main():
    prefix = parse_output_prefix()
    os.makedirs(os.path.dirname(prefix), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    base_img, norm_img, orm_img, em_img = build_brain_textures(size=512)
    mat = build_pbr_material('Diploria_Brain_Mat', base_img, norm_img, orm_img, em_img)

    mesh = build_brain_coral_mesh(mat)
    obj = bpy.data.objects.new('Coral_Brain_Diploria', mesh)
    bpy.context.collection.objects.link(obj)

    mesh.calc_loop_triangles()
    total_tris = len(mesh.loop_triangles)

    blend_path = prefix + '.blend'
    glb_path = prefix + '.glb'
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_apply=True,
        export_tangents=True,
        export_texcoords=True,
        export_normals=True,
        export_vertex_color='ACTIVE',
        export_all_vertex_colors=False,
        export_active_vertex_color_when_no_material=True,
        export_attributes=False,
        export_yup=True,
        export_image_format='AUTO',
        export_animations=False,
    )

    doc = inspect_glb_json(glb_path)
    primitives_summary = [
        {'mesh': m.get('name'), 'attributes': sorted(p.get('attributes', {}).keys())}
        for m in doc.get('meshes', [])
        for p in m.get('primitives', [])
    ]
    with open(glb_path, 'rb') as fp:
        sha256 = hashlib.sha256(fp.read()).hexdigest()

    report = {
        'asset': 'coral-brain-diploria',
        'archetype': 'D - Mounded Brain & Fleshy Cushion LPS (Diploria / Trachyphyllia)',
        'license': 'CC0 / Custom project-authored procedural asset',
        'glbPath': glb_path,
        'glbBytes': os.path.getsize(glb_path),
        'glbSha256': sha256,
        'totalTriangles': total_tris,
        'primitives': primitives_summary,
    }
    print('CORAL_BUILD_REPORT=' + json.dumps(report, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
