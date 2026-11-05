"""Build a realistic two-mesh Bi-Color Hammer Coral (Euphyllia ancora / parancora) in Blender 5.0.

Follows docs/modular-coral-and-live-rock-spec.md (Section 4.1 & 4.4):
- Sub-mesh 1 (`Euphyllia_Hammer_Skeleton`): Rigid calcified phaceloid skeleton (`COLOR_0.r = 0.0`)
  with flared encrusting basal skirt, 4 branching costae-ribbed calyx heads, coralline lower stalks,
  and dark maroon-brown fleshy periderm collars.
- Sub-mesh 2 (`Euphyllia_Hammer_Polyp_Crown`): Inflated translucent polyp crown (`COLOR_0.r = h^1.8`)
  where each tentacle terminates in a laterally flattened kidney/anchor-shaped hammer acrosphere
  (`2.4x` width x `0.8x` thickness, `h in [0.80, 1.0]`, `COLOR_0.g = 1.0`).
- Bi-color reef pigmentation: deep purple-violet translucent tentacle shafts topped with glowing
  cyan (`#00F0FF`) and neon-green (`#22FF66`) anchor ridges.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_euphyllia_hammer.py -- /tmp/coral-models/coral-euphyllia-hammer
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
    return '/tmp/coral-models/coral-euphyllia-hammer'


def hash01(seed_int):
    h = ((seed_int * 747796405) + 2891336453) & 0xFFFFFFFF
    h = (((h >> ((h >> 28) + 4)) ^ h) * 277803737) & 0xFFFFFFFF
    h = (h >> 22) ^ h
    return (h & 0xFFFFFF) / float(0x1000000)


def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / max(1e-6, edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_color(c0, c1, t):
    return tuple(lerp(c0[i], c1[i], t) for i in range(len(c0)))


def frame_from_tangent(tangent):
    t = tangent.normalized()
    up = Vector((0.0, 0.0, 1.0)) if abs(t.z) < 0.92 else Vector((1.0, 0.0, 0.0))
    b1 = t.cross(up).normalized()
    b2 = t.cross(b1).normalized()
    return t, b1, b2


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


def build_skeleton_textures(size=512):
    def base_pixel(u, v):
        rib_wave = 0.5 + 0.5 * math.cos(u * 20.0 * 2.0 * math.pi)
        coralline_patch = smoothstep(0.32, 0.72, 0.5 + 0.35 * math.sin(u * 16.0 + v * 13.0) + 0.25 * math.cos(u * 29.0 - v * 17.0))
        carbonate = (0.33, 0.30, 0.26)
        coralline = (0.46, 0.18, 0.39)
        periderm = (0.22, 0.07, 0.12)

        col = lerp_color(carbonate, coralline, coralline_patch * 0.80)
        col = lerp_color(col, periderm, smoothstep(0.75, 0.88, v))
        costae_bright = 0.84 + 0.22 * rib_wave
        ao = lerp(0.52, 1.0, smoothstep(0.0, 0.24, v))
        return (col[0] * costae_bright * ao, col[1] * costae_bright * ao, col[2] * costae_bright * ao, 1.0)

    def normal_pixel(u, v):
        costae_strength = smoothstep(0.18, 0.65, v)
        d_rib = -math.sin(u * 20.0 * 2.0 * math.pi) * 0.65 * costae_strength
        d_pit = math.cos(u * 110.0 + v * 75.0) * 0.16
        nx = max(-1.0, min(1.0, d_rib + d_pit))
        ny = max(-1.0, min(1.0, d_pit))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        collar_t = smoothstep(0.75, 0.88, v)
        roughness = lerp(0.82, 0.34, collar_t)
        ao = lerp(0.32, 1.0, smoothstep(0.0, 0.25, v))
        return (ao, roughness, 0.0, 1.0)

    return (
        make_packed_image('hammer_skeleton_base', size, size, base_pixel, non_color=False),
        make_packed_image('hammer_skeleton_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('hammer_skeleton_orm', size, size, orm_pixel, non_color=True),
    )


def build_hammer_polyp_textures(size=512):
    # UV layout: u = circumferential [0..1], v = height h from calyx base (0.0) to hammer ridge crest (1.0)
    def base_pixel(u, v):
        # Bi-color Hammer Coral: deep purple-violet translucent shaft -> glowing cyan (#00F0FF) & neon-green (#22FF66) anchor ridge
        stria = 0.5 + 0.5 * math.sin(u * 10.0 * 2.0 * math.pi)
        # Anchor ends (around u=0.0/0.5) are cyan-tipped, central ridge is toxic neon-green
        anchor_lobe = 0.5 + 0.5 * math.cos(u * 2.0 * 2.0 * math.pi)

        c_base  = (0.14, 0.04, 0.20)      # dark plum-violet calyx base
        c_shaft = (0.32, 0.11, 0.46)      # rich purple-violet tentacle shaft
        c_cyan  = (0.04, 0.94, 1.00)      # Spec #00F0FF fluorescent cyan hammer horn
        c_green = (0.14, 0.98, 0.44)      # Spec #22FF66 neon-green hammer ridge

        hammer_col = lerp_color(c_green, c_cyan, anchor_lobe * 0.72)
        shaft_col = lerp_color(c_base, c_shaft, smoothstep(0.08, 0.45, v))
        shaft_col = tuple(shaft_col[i] * (0.88 + 0.16 * stria) for i in range(3))

        col = lerp_color(shaft_col, hammer_col, smoothstep(0.76, 0.86, v))
        return (col[0], col[1], col[2], 1.0)

    def normal_pixel(u, v):
        bulb_smooth = 1.0 - smoothstep(0.74, 0.86, v)
        d_u = -math.cos(u * 10.0 * 2.0 * math.pi) * 0.15 * bulb_smooth
        d_v = -math.cos(v * 38.0 * math.pi) * 0.20 * bulb_smooth
        nx = max(-1.0, min(1.0, d_u))
        ny = max(-1.0, min(1.0, d_v))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        roughness = lerp(0.22, 0.14, smoothstep(0.74, 0.88, v))
        ao = lerp(0.22, 1.0, smoothstep(0.0, 0.38, v))
        return (ao, roughness, 0.0, 1.0)

    def emissive_pixel(u, v):
        anchor_lobe = 0.5 + 0.5 * math.cos(u * 2.0 * 2.0 * math.pi)
        tip_glow = smoothstep(0.76, 0.87, v)
        r = tip_glow * 0.04
        g = tip_glow * 0.86
        b = tip_glow * lerp(0.36, 0.92, anchor_lobe)
        return (r, g, b, 1.0)

    return (
        make_packed_image('hammer_polyp_base', size, size, base_pixel, non_color=False),
        make_packed_image('hammer_polyp_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('hammer_polyp_orm', size, size, orm_pixel, non_color=True),
        make_packed_image('hammer_polyp_emissive', size, size, emissive_pixel, non_color=False),
    )


def build_pbr_material(name, base_img, norm_img, orm_img, emissive_img=None, emissive_strength=0.45):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = 0.0

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
    norm_node.inputs['Strength'].default_value = 0.85
    links.new(tex_norm.outputs['Color'], norm_node.inputs['Color'])
    links.new(norm_node.outputs['Normal'], bsdf.inputs['Normal'])

    if emissive_img is not None:
        tex_em = nodes.new('ShaderNodeTexImage')
        tex_em.image = emissive_img
        if 'Emission Color' in bsdf.inputs:
            links.new(tex_em.outputs['Color'], bsdf.inputs['Emission Color'])
        if 'Emission Strength' in bsdf.inputs:
            bsdf.inputs['Emission Strength'].default_value = emissive_strength

    return mat


def create_mesh_with_attributes(name, verts, faces, loop_uvs, loop_colors, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = uv

    color_attr = mesh.color_attributes.new(name='COLOR_0', type='FLOAT_COLOR', domain='CORNER')
    mesh.color_attributes.active_color = color_attr
    mesh.color_attributes.render_color_index = 0
    for li, rgba in enumerate(loop_colors):
        color_attr.data[li].color = rgba

    mesh.materials.append(mat)
    mesh.calc_tangents(uvmap='UVMap')
    return mesh


def build_skeleton_mesh(heads, mat):
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    def append_tube(rings_pos_uv_col, close_bottom=False, close_top=False):
        n_seg = len(rings_pos_uv_col[0]) - 1
        n_rings = len(rings_pos_uv_col)
        base_idx = len(verts)
        for r in range(n_rings):
            for j in range(n_seg):
                verts.append(tuple(rings_pos_uv_col[r][j][0]))

        for r in range(n_rings - 1):
            for j in range(n_seg):
                j_next = (j + 1) % n_seg
                v00 = base_idx + r * n_seg + j
                v10 = base_idx + r * n_seg + j_next
                v11 = base_idx + (r + 1) * n_seg + j_next
                v01 = base_idx + (r + 1) * n_seg + j
                faces.append((v00, v10, v11, v01))
                loop_uvs.extend([
                    (rings_pos_uv_col[r][j][1], rings_pos_uv_col[r][j][2]),
                    (rings_pos_uv_col[r][j + 1][1], rings_pos_uv_col[r][j + 1][2]),
                    (rings_pos_uv_col[r + 1][j + 1][1], rings_pos_uv_col[r + 1][j + 1][2]),
                    (rings_pos_uv_col[r + 1][j][1], rings_pos_uv_col[r + 1][j][2]),
                ])
                loop_colors.extend([
                    rings_pos_uv_col[r][j][3],
                    rings_pos_uv_col[r][j + 1][3],
                    rings_pos_uv_col[r + 1][j + 1][3],
                    rings_pos_uv_col[r + 1][j][3],
                ])

        if close_bottom:
            c_pos = sum((rings_pos_uv_col[0][j][0] for j in range(n_seg)), Vector((0.0, 0.0, 0.0))) / n_seg
            c_idx = len(verts)
            verts.append(tuple(c_pos))
            c_col = rings_pos_uv_col[0][0][3]
            for j in range(n_seg):
                j_next = (j + 1) % n_seg
                faces.append((c_idx, base_idx + j_next, base_idx + j))
                loop_uvs.extend([(0.5, 0.0), (j_next / n_seg, 0.02), (j / n_seg, 0.02)])
                loop_colors.extend([c_col, rings_pos_uv_col[0][j + 1][3], rings_pos_uv_col[0][j][3]])

        if close_top:
            top_r = n_rings - 1
            c_pos = sum((rings_pos_uv_col[top_r][j][0] for j in range(n_seg)), Vector((0.0, 0.0, 0.0))) / n_seg
            c_pos = c_pos - Vector((0.0, 0.0, 0.007))
            c_idx = len(verts)
            verts.append(tuple(c_pos))
            c_col = (0.0, 0.0, 0.1, 0.22)
            for j in range(n_seg):
                j_next = (j + 1) % n_seg
                faces.append((c_idx, base_idx + top_r * n_seg + j, base_idx + top_r * n_seg + j_next))
                loop_uvs.extend([(0.5, 0.98), (j / n_seg, 0.95), (j_next / n_seg, 0.95)])
                loop_colors.extend([c_col, rings_pos_uv_col[top_r][j][3], rings_pos_uv_col[top_r][j + 1][3]])

    n_seg = 28
    skirt_profiles = [
        (-0.004, 0.068, 0.00, 0.15),
        (0.002,  0.074, 0.05, 0.18),
        (0.012,  0.056, 0.14, 0.28),
        (0.024,  0.040, 0.24, 0.38),
        (0.038,  0.028, 0.34, 0.44),
        (0.050,  0.012, 0.42, 0.40),
    ]
    skirt_rings = []
    for z, rad, v_coord, ao in skirt_profiles:
        ring = []
        for j in range(n_seg + 1):
            u = j / n_seg
            theta = u * 2.0 * math.pi
            lobe_f = 1.0 - smoothstep(0.0, 0.038, z)
            lobe = 1.0 + lobe_f * (0.15 * math.sin(theta * 5.0 + 0.2) + 0.08 * math.cos(theta * 7.0 - 0.8))
            r_loc = rad * lobe
            pos = Vector((r_loc * math.cos(theta), r_loc * math.sin(theta), z))
            ring.append((pos, u, v_coord, (0.0, 0.0, 0.05, ao)))
        skirt_rings.append(ring)
    append_tube(skirt_rings, close_bottom=True, close_top=True)

    n_stalk_seg = 28
    n_stalk_rings = 9
    for h_idx, head in enumerate(heads):
        p0 = Vector((head['origin'][0] * 0.65, head['origin'][1] * 0.65, 0.020))
        p2 = Vector(head['center'])
        axis_dir = Vector(head['dir']).normalized()
        p1 = (p0 + p2) * 0.5 - axis_dir * 0.016
        calyx_radius = head['radius']
        phase_b = hash01(200 + h_idx)

        stalk_rings = []
        for r_idx in range(n_stalk_rings):
            t = r_idx / (n_stalk_rings - 1)
            center = ((1.0 - t) ** 2) * p0 + 2.0 * (1.0 - t) * t * p1 + (t ** 2) * p2
            tangent = (2.0 * (1.0 - t) * (p1 - p0) + 2.0 * t * (p2 - p1)).normalized()
            _, b1, b2 = frame_from_tangent(tangent)

            trunk_blend = lerp(0.85, 0.58, smoothstep(0.0, 0.35, t))
            calyx_flare = lerp(trunk_blend, 1.0, smoothstep(0.32, 1.0, t))
            base_r = calyx_radius * calyx_flare
            v_coord = lerp(0.24, 0.98, t)
            ao = lerp(0.34, 0.82, t)
            rib_amp = 0.095 * smoothstep(0.18, 0.88, t)

            ring = []
            for j in range(n_stalk_seg + 1):
                u = j / n_stalk_seg
                theta = u * 2.0 * math.pi
                costa = max(0.0, math.cos(theta * 20.0)) ** 1.6
                # Slightly oval calyx cup on E. ancora
                oval_x = 1.12 * math.cos(theta)
                oval_y = 0.92 * math.sin(theta)
                r_local = base_r * (1.0 + rib_amp * costa)
                offset = (b1 * oval_x + b2 * oval_y) * r_local
                pos = center + offset
                ring.append((pos, u, v_coord, (0.0, 0.0, phase_b, ao)))
            stalk_rings.append(ring)
        append_tube(stalk_rings, close_bottom=True, close_top=True)

    return create_mesh_with_attributes('Euphyllia_Hammer_Skeleton', verts, faces, loop_uvs, loop_colors, mat)


def build_hammer_crown_mesh(heads, mat):
    """Build Sub-mesh 2: Polyp crown with laterally flattened kidney/anchor-shaped hammer acrospheres (2.4x width x 0.8x thickness)."""
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    n_rad = 10
    h_stations = [0.0, 0.24, 0.50, 0.72, 0.80, 0.86, 0.92, 0.975]
    n_rings = len(h_stations)
    tentacle_counter = 0

    for h_idx, head in enumerate(heads):
        calyx_center = Vector(head['center'])
        head_dir = Vector(head['dir']).normalized()
        _, h_b1, h_b2 = frame_from_tangent(head_dir)
        calyx_r = head['radius']

        # 3 concentric rings per head (34 tentacles per head x 4 heads = 136 tentacles)
        ring_specs = [
            (6,  0.24, 0.036, 0.14, 0.06),
            (12, 0.56, 0.042, 0.44, 0.20),
            (16, 0.85, 0.045, 0.74, 0.36),
        ]

        for count, radial_frac, base_len, tilt_angle, droop_strength in ring_specs:
            for k in range(count):
                tentacle_counter += 1
                phase_seed = hash01(tentacle_counter * 41 + h_idx * 107)
                jh1 = hash01(tentacle_counter * 79 + 23)
                jh2 = hash01(tentacle_counter * 149 + 61)
                jh3 = hash01(tentacle_counter * 227 + 97)

                azimuth = (k + 0.32 * (jh1 - 0.5)) * (2.0 * math.pi / count) + h_idx * 0.6
                radial_dir = math.cos(azimuth) * h_b1 + math.sin(azimuth) * h_b2
                side_dir = -math.sin(azimuth) * h_b1 + math.cos(azimuth) * h_b2

                base_pos = (
                    calyx_center
                    + radial_dir * (calyx_r * radial_frac * (0.92 + 0.15 * jh2))
                    - head_dir * 0.004
                )
                length = base_len * (0.86 + 0.26 * jh1)
                stalk_r = 0.0028 * (0.90 + 0.20 * jh2)

                launch_tilt = tilt_angle * (0.86 + 0.28 * jh3)
                launch_dir = (
                    head_dir * math.cos(launch_tilt)
                    + radial_dir * math.sin(launch_tilt)
                    + side_dir * (0.12 * (jh2 - 0.5))
                ).normalized()

                curl_dir = (
                    radial_dir * (0.52 * droop_strength)
                    + Vector((0.0, 0.0, -0.28 * droop_strength + 0.14 * (1.0 - radial_frac)))
                )

                # Orientation of the hammer/anchor bar (aligned tangentially + slight twist)
                hammer_twist = azimuth + math.pi * 0.5 + 0.45 * (jh3 - 0.5)

                base_idx = len(verts)
                ring_colors = []
                for r_idx, h in enumerate(h_stations):
                    center = base_pos + launch_dir * (length * h) + curl_dir * (length * (h ** 1.8))
                    tangent = (launch_dir + curl_dir * (1.8 * (max(1e-3, h) ** 0.8))).normalized()
                    _, t_b1, t_b2 = frame_from_tangent(tangent)

                    # Rotate local cross-section frame by hammer_twist so hammer widths align organically
                    w_axis = math.cos(hammer_twist) * t_b1 + math.sin(hammer_twist) * t_b2
                    th_axis = -math.sin(hammer_twist) * t_b1 + math.cos(hammer_twist) * t_b2

                    # Spec Section 4.4: Hammer Coral (E. ancora) acrosphere at h in [0.80, 1.0]:
                    # Laterally flattened kidney/anchor-shaped ridge (2.4x width x 0.8x thickness)
                    hammer_env = smoothstep(0.74, 0.88, h) * math.sin(min(1.0, max(0.0, (1.02 - h) / 0.26)) * math.pi * 0.5) ** 0.45
                    shaft_scale = lerp(1.10, 0.86, min(1.0, h / 0.76))

                    width_mult = lerp(shaft_scale, 2.42, hammer_env)
                    thick_mult = lerp(shaft_scale, 0.80, hammer_env)

                    # Standardized COLOR_0 contract (coral-raw-masks-v1, docs/asset-contract.md):
                    # R stores raw normalized height h in [0, 1]; runtime applies pow(R, 1.8) once.
                    flex_r = h
                    tip_g = smoothstep(0.75, 0.83, h)
                    ao_a = lerp(0.20 + 0.10 * radial_frac, 1.0, smoothstep(0.0, 0.62, h))
                    rgba = (flex_r, tip_g, phase_seed, ao_a)
                    ring_colors.append(rgba)

                    for j in range(n_rad):
                        theta = (j / n_rad) * 2.0 * math.pi
                        c_th = math.cos(theta)
                        s_th = math.sin(theta)
                        # Kidney/anchor indentation along the narrow waist & upward horn curve at ends (cos(theta) = +-1)
                        kidney_bend = 0.28 * hammer_env * (c_th * c_th - 0.35)
                        anchor_horn_lift = 0.0022 * hammer_env * (c_th * c_th - 0.45)

                        w_coord = stalk_r * width_mult * c_th
                        th_coord = stalk_r * (thick_mult * s_th + kidney_bend)
                        pos = center + w_axis * w_coord + th_axis * th_coord + tangent * anchor_horn_lift
                        verts.append(tuple(pos))

                for r_idx in range(n_rings - 1):
                    h0 = h_stations[r_idx]
                    h1 = h_stations[r_idx + 1]
                    c0 = ring_colors[r_idx]
                    c1 = ring_colors[r_idx + 1]
                    for j in range(n_rad):
                        j_next = (j + 1) % n_rad
                        u0 = j / n_rad
                        u1 = (j + 1) / n_rad
                        v00 = base_idx + r_idx * n_rad + j
                        v10 = base_idx + r_idx * n_rad + j_next
                        v11 = base_idx + (r_idx + 1) * n_rad + j_next
                        v01 = base_idx + (r_idx + 1) * n_rad + j
                        faces.append((v00, v10, v11, v01))
                        loop_uvs.extend([(u0, h0), (u1, h0), (u1, h1), (u0, h1)])
                        loop_colors.extend([c0, c0, c1, c1])

                # Distal anchor ridge crest cap
                end_tangent = (launch_dir + curl_dir * 1.8).normalized()
                tip_center = base_pos + launch_dir * length + curl_dir * length + end_tangent * (stalk_r * 0.18)
                tip_idx = len(verts)
                verts.append(tuple(tip_center))
                tip_rgba = (1.0, 1.0, phase_seed, 1.0)
                top_ring_offset = base_idx + (n_rings - 1) * n_rad
                top_c = ring_colors[-1]
                for j in range(n_rad):
                    j_next = (j + 1) % n_rad
                    faces.append((tip_idx, top_ring_offset + j, top_ring_offset + j_next))
                    loop_uvs.extend([(0.5, 1.0), (j / n_rad, 0.97), ((j + 1) / n_rad, 0.97)])
                    loop_colors.extend([tip_rgba, top_c, top_c])

                # Close proximal base inside calyx
                base_cap_idx = len(verts)
                verts.append(tuple(base_pos))
                base_rgba = ring_colors[0]
                for j in range(n_rad):
                    j_next = (j + 1) % n_rad
                    faces.append((base_cap_idx, base_idx + j_next, base_idx + j))
                    loop_uvs.extend([(0.5, 0.0), ((j + 1) / n_rad, 0.02), (j / n_rad, 0.02)])
                    loop_colors.extend([base_rgba, base_rgba, base_rgba])

    return create_mesh_with_attributes('Euphyllia_Hammer_Polyp_Crown', verts, faces, loop_uvs, loop_colors, mat)


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

    heads = [
        {'origin': (0.010, 0.008),  'center': (0.032, 0.024, 0.098),  'dir': (0.28, 0.20, 0.94),  'radius': 0.022},
        {'origin': (-0.010, 0.008), 'center': (-0.034, 0.022, 0.096), 'dir': (-0.30, 0.18, 0.94), 'radius': 0.021},
        {'origin': (-0.008, -0.010),'center': (-0.024, -0.030, 0.092),'dir': (-0.22, -0.26, 0.94),'radius': 0.020},
        {'origin': (0.009, -0.009), 'center': (0.028, -0.026, 0.094), 'dir': (0.24, -0.24, 0.94), 'radius': 0.020},
    ]

    skel_base, skel_norm, skel_orm = build_skeleton_textures(size=512)
    polyp_base, polyp_norm, polyp_orm, polyp_em = build_hammer_polyp_textures(size=512)

    skel_mat = build_pbr_material('Euphyllia_Hammer_Skeleton_Mat', skel_base, skel_norm, skel_orm, emissive_img=None)
    polyp_mat = build_pbr_material('Euphyllia_Hammer_Polyp_Mat', polyp_base, polyp_norm, polyp_orm, polyp_em, emissive_strength=0.45)

    root_obj = bpy.data.objects.new('Coral_Euphyllia_Hammer', None)
    bpy.context.collection.objects.link(root_obj)

    skel_mesh = build_skeleton_mesh(heads, skel_mat)
    skel_obj = bpy.data.objects.new('Euphyllia_Hammer_Skeleton', skel_mesh)
    skel_obj.parent = root_obj
    bpy.context.collection.objects.link(skel_obj)

    polyp_mesh = build_hammer_crown_mesh(heads, polyp_mat)
    polyp_obj = bpy.data.objects.new('Euphyllia_Hammer_Polyp_Crown', polyp_mesh)
    polyp_obj.parent = root_obj
    bpy.context.collection.objects.link(polyp_obj)

    skel_mesh.calc_loop_triangles()
    polyp_mesh.calc_loop_triangles()
    skel_tris = len(skel_mesh.loop_triangles)
    polyp_tris = len(polyp_mesh.loop_triangles)

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
        'asset': 'coral-euphyllia-hammer',
        'archetype': 'C2 - Tentaculate LPS (Euphyllia ancora Bi-Color Hammer Coral)',
        'license': 'CC0 / Custom project-authored procedural asset',
        'glbPath': glb_path,
        'glbBytes': os.path.getsize(glb_path),
        'glbSha256': sha256,
        'skeletonTriangles': skel_tris,
        'polypCrownTriangles': polyp_tris,
        'totalTriangles': skel_tris + polyp_tris,
        'primitives': primitives_summary,
    }
    print('CORAL_BUILD_REPORT=' + json.dumps(report, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
