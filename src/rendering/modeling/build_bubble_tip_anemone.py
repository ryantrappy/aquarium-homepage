"""Build a realistic Rose / Sunburst Bubble-Tip Anemone (Entacmaea quadricolor) in Blender 5.0.

Follows docs/modular-coral-and-live-rock-spec.md (Section 4.1 & 4.6):
- Sub-mesh 1 (`Anemone_Column_Disc`): Recessed cylindrical pedal column (`COLOR_0.r = 0.0` at foot base
  so it anchors firmly inside `socket_anemone_crevice_01`) flaring into an undulating oral disc with a
  recessed central mouth and faint white radial striations around the oral disc.
- Sub-mesh 2 (`Anemone_Tentacle_Crown`): 78 tentacles (`COLOR_0.r = h^1.8`) that swell into the species-diagnostic
  sub-terminal **bubble bulbs** at `h = 0.70-0.85` before tapering to a pointed distal tip (`h = 1.0`).
- Colored with rose/sunburst orange-red (`#FF3B1F` tips over a warm amber-rose/emerald-flecked oral disc
  and deep magenta-crimson pedal column).
- Standardized 4-channel `COLOR_0` vertex attribute (`R = flexibilityMask`, `G = growthTipOrPolypMask`,
  `B = phaseSeed`, `A = contactAO`).

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_bubble_tip_anemone.py -- /tmp/coral-models/coral-anemone-bta
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
    return '/tmp/coral-models/coral-anemone-bta'


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


def build_disc_textures(size=512):
    # UV layout for column & oral disc:
    # u = circumferential angle [0..1]
    # v = 0.0 (recessed pedal base) -> 0.45 (column collar) -> 0.85 (oral disc) -> 1.0 (central mouth)
    def base_pixel(u, v):
        # Faint white radial mesentery lines on the oral disc (v in [0.48, 0.95])
        radial_line = max(0.0, math.cos(u * 24.0 * 2.0 * math.pi)) ** 8.0
        disc_mask = smoothstep(0.45, 0.58, v) * (1.0 - smoothstep(0.92, 0.99, v))
        verrucae = 0.5 + 0.5 * math.sin(u * 40.0 * math.pi) * math.cos(v * 36.0 * math.pi)

        c_foot  = (0.36, 0.10, 0.16)      # recessed crimson-rose pedal foot
        c_col   = (0.58, 0.16, 0.24)      # warm rose-magenta pedal column with verrucae
        c_disc  = (0.48, 0.22, 0.14)      # warm amber-rose oral disc with subtle green-gold undertone
        c_line  = (0.96, 0.88, 0.82)      # faint cream-white radial lines around the mouth
        c_mouth = (0.78, 0.26, 0.22)      # rose actinopharynx mouth lip

        col = lerp_color(c_foot, c_col, smoothstep(0.08, 0.38, v))
        col = lerp_color(col, c_disc, smoothstep(0.44, 0.62, v))
        col = lerp_color(col, c_line, radial_line * disc_mask * 0.58)
        col = lerp_color(col, c_mouth, smoothstep(0.90, 0.98, v))

        ao = lerp(0.38, 1.0, smoothstep(0.0, 0.48, v)) * (0.92 + 0.08 * verrucae)
        return (col[0] * ao, col[1] * ao, col[2] * ao, 1.0)

    def normal_pixel(u, v):
        disc_mask = smoothstep(0.45, 0.58, v)
        d_u = -math.sin(u * 24.0 * 2.0 * math.pi) * 0.32 * disc_mask
        d_v = -math.sin(v * 36.0 * math.pi) * 0.22 * (1.0 - disc_mask)
        nx = max(-1.0, min(1.0, d_u))
        ny = max(-1.0, min(1.0, d_v))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        roughness = lerp(0.38, 0.22, smoothstep(0.42, 0.65, v))
        ao = lerp(0.25, 0.95, smoothstep(0.0, 0.52, v))
        return (ao, roughness, 0.0, 1.0)

    return (
        make_packed_image('anemone_disc_base', size, size, base_pixel, non_color=False),
        make_packed_image('anemone_disc_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('anemone_disc_orm', size, size, orm_pixel, non_color=True),
    )


def build_tentacle_textures(size=512):
    # UV layout for BTA tentacles:
    # u = circumferential angle around tentacle [0..1]
    # v = normalized height h from oral disc base (0.0) -> sub-terminal bubble bulb (0.70..0.85) -> pointed tip (1.0)
    def base_pixel(u, v):
        stria = 0.5 + 0.5 * math.sin(u * 10.0 * 2.0 * math.pi)
        ring_tex = 0.5 + 0.5 * math.cos(v * 48.0 * math.pi)
        # Spec Section 4.6: rose/sunburst orange-red (#FF3B1F) tips over warm amber-rose shaft
        c_base  = (0.34, 0.16, 0.12)      # warm amber-brown tentacle root
        c_shaft = (0.76, 0.28, 0.12)      # glowing sunburst amber-orange lower shaft
        c_bulb  = (1.00, 0.231, 0.122)    # Spec #FF3B1F vivid rose/sunburst orange-red bubble bulb
        c_ring  = (1.00, 0.72, 0.42)      # pale gold/cream equatorial highlight ring at base of tip
        c_tip   = (0.98, 0.16, 0.34)      # intense magenta-rose distal acrosphere tip

        col = lerp_color(c_base, c_shaft, smoothstep(0.08, 0.42, v))
        col = lerp_color(col, c_bulb, smoothstep(0.55, 0.74, v))
        # Subtle pale ring right where the bubble narrows to the pointed tip (v ~ 0.87)
        ring_band = math.exp(-((v - 0.87) / 0.035) ** 2)
        col = lerp_color(col, c_ring, ring_band * 0.48)
        col = lerp_color(col, c_tip, smoothstep(0.88, 0.97, v))

        micro = 0.90 + 0.07 * stria + 0.05 * ring_tex * (1.0 - smoothstep(0.65, 0.82, v))
        return (col[0] * micro, col[1] * micro, col[2] * micro, 1.0)

    def normal_pixel(u, v):
        bulb_smooth = 1.0 - 0.75 * smoothstep(0.65, 0.85, v)
        d_u = -math.cos(u * 10.0 * 2.0 * math.pi) * 0.18 * bulb_smooth
        d_v = -math.sin(v * 48.0 * math.pi) * 0.24 * bulb_smooth
        nx = max(-1.0, min(1.0, d_u))
        ny = max(-1.0, min(1.0, d_v))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        roughness = lerp(0.24, 0.14, smoothstep(0.62, 0.84, v))
        ao = lerp(0.22, 1.0, smoothstep(0.0, 0.42, v))
        return (ao, roughness, 0.0, 1.0)

    def emissive_pixel(u, v):
        #RFP/OFP sunburst orange-red fluorescence on the swollen bubble bulb and tip
        bulb_glow = smoothstep(0.54, 0.74, v)
        r = bulb_glow * 0.78
        g = bulb_glow * 0.16
        b = bulb_glow * 0.08
        return (r, g, b, 1.0)

    return (
        make_packed_image('anemone_tentacle_base', size, size, base_pixel, non_color=False),
        make_packed_image('anemone_tentacle_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('anemone_tentacle_orm', size, size, orm_pixel, non_color=True),
        make_packed_image('anemone_tentacle_emissive', size, size, emissive_pixel, non_color=False),
    )


def build_pbr_material(name, base_img, norm_img, orm_img, emissive_img=None, emissive_strength=0.42):
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


def build_column_and_disc_mesh(mat):
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    n_seg = 40
    # Profile from recessed pedal foot (z = -0.018) -> flared ruffled oral disc margin (r = 0.088) -> central mouth pit
    # (z, radius, v_uv, flex_r, poly_g, ao_a, wave_amp)
    profiles = [
        (-0.018, 0.036, 0.00, 0.00, 0.00, 0.15, 0.000),  # Recessed pedal disc inside rock pocket
        (-0.006, 0.044, 0.14, 0.00, 0.00, 0.22, 0.002),  # Lower pedal column
        ( 0.010, 0.040, 0.28, 0.02, 0.00, 0.34, 0.003),  # Column waist
        ( 0.026, 0.062, 0.44, 0.06, 0.08, 0.48, 0.006),  # Flaring sub-marginal collar
        ( 0.040, 0.088, 0.58, 0.14, 0.22, 0.68, 0.010),  # Ruffled outer oral disc rim
        ( 0.042, 0.064, 0.72, 0.08, 0.35, 0.62, 0.007),  # Mid oral disc with radial striations
        ( 0.038, 0.034, 0.86, 0.04, 0.45, 0.52, 0.003),  # Peristome inner disc
        ( 0.034, 0.012, 0.96, 0.02, 0.55, 0.38, 0.001),  # Raised actinopharynx mouth lip
    ]

    rings = []
    for z, rad, v_uv, flex_r, poly_g, ao_a, wave_amp in profiles:
        ring = []
        for j in range(n_seg + 1):
            u = j / n_seg
            theta = u * 2.0 * math.pi
            # Undulating lobed fold on the oral disc margin
            lobe = 1.0 + (wave_amp / max(0.02, rad)) * (
                1.2 * math.sin(theta * 5.0 + 0.3) + 0.8 * math.cos(theta * 8.0 - 0.7)
            )
            r_loc = rad * lobe
            z_loc = z + wave_amp * math.sin(theta * 6.0 + 0.5)
            pos = Vector((r_loc * math.cos(theta), r_loc * math.sin(theta), z_loc))
            rgba = (flex_r, poly_g, 0.25, ao_a)
            ring.append((pos, u, v_uv, rgba))
        rings.append(ring)

    n_rings = len(rings)
    for r in range(n_rings):
        for j in range(n_seg):
            verts.append(tuple(rings[r][j][0]))

    for r in range(n_rings - 1):
        for j in range(n_seg):
            j_next = (j + 1) % n_seg
            v00 = r * n_seg + j
            v10 = r * n_seg + j_next
            v11 = (r + 1) * n_seg + j_next
            v01 = (r + 1) * n_seg + j
            faces.append((v00, v10, v11, v01))
            loop_uvs.extend([
                (rings[r][j][1], rings[r][j][2]),
                (rings[r][j + 1][1], rings[r][j + 1][2]),
                (rings[r + 1][j + 1][1], rings[r + 1][j + 1][2]),
                (rings[r + 1][j][1], rings[r + 1][j][2]),
            ])
            loop_colors.extend([
                rings[r][j][3],
                rings[r][j + 1][3],
                rings[r + 1][j + 1][3],
                rings[r + 1][j][3],
            ])

    # Close bottom of pedal foot
    bot_idx = len(verts)
    verts.append((0.0, 0.0, -0.018))
    bot_col = rings[0][0][3]
    for j in range(n_seg):
        j_next = (j + 1) % n_seg
        faces.append((bot_idx, j_next, j))
        loop_uvs.extend([(0.5, 0.0), (j_next / n_seg, 0.02), (j / n_seg, 0.02)])
        loop_colors.extend([bot_col, rings[0][j_next][3], rings[0][j][3]])

    # Close recessed mouth center at top
    top_r = n_rings - 1
    mouth_idx = len(verts)
    verts.append((0.0, 0.0, 0.029))
    mouth_col = (0.01, 0.60, 0.25, 0.25)
    for j in range(n_seg):
        j_next = (j + 1) % n_seg
        faces.append((mouth_idx, top_r * n_seg + j, top_r * n_seg + j_next))
        loop_uvs.extend([(0.5, 1.0), (j / n_seg, 0.96), (j_next / n_seg, 0.96)])
        loop_colors.extend([mouth_col, rings[top_r][j][3], rings[top_r][j_next][3]])

    return create_mesh_with_attributes('Anemone_Column_Disc', verts, faces, loop_uvs, loop_colors, mat)


def bta_radius_profile(h, base_r):
    """Species-diagnostic Entacmaea quadricolor bubble-tip radius profile along tentacle height h in [0, 1].

    - Tapered basal column: h in [0.0, 0.62]
    - Swollen sub-terminal bubble bulb: h in [0.64, 0.86] peaking around h = 0.76 at 2.15x shaft radius
    - Constricted neck & pointed nipple tip: h in [0.86, 1.0] tapering to a point
    """
    taper_shaft = lerp(1.22, 0.78, min(1.0, h / 0.68))
    # Gaussian-like sub-terminal bubble centered at h = 0.76 (span 0.70-0.85)
    bubble_env = math.exp(-((h - 0.76) / 0.088) ** 2)
    # Distal pointed tip taper for h > 0.83
    distal_taper = 1.0 - smoothstep(0.83, 1.0, h) * 0.82
    return base_r * (taper_shaft * distal_taper + 1.38 * bubble_env)


def build_tentacle_crown_mesh(mat):
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    n_rad = 10
    # Height stations concentrated around the sub-terminal bubble bulb (h = 0.70..0.85) and pointed tip (h = 0.85..1.0):
    h_stations = [0.0, 0.20, 0.42, 0.58, 0.67, 0.73, 0.78, 0.83, 0.88, 0.94, 0.985]
    n_rings = len(h_stations)

    # 4 concentric cycles of tentacles across the oral disc (78 tentacles total, Spec Section 4.6: 60-90 tentacles)
    cycles = [
        # (count, disc_radius, disc_z, base_len, base_r, tilt_angle, droop)
        (10, 0.026, 0.037, 0.064, 0.0042, 0.16, 0.08),
        (18, 0.044, 0.040, 0.072, 0.0046, 0.38, 0.18),
        (24, 0.064, 0.041, 0.076, 0.0048, 0.64, 0.34),
        (26, 0.082, 0.039, 0.070, 0.0044, 0.88, 0.52),
    ]

    t_idx = 0
    for count, disc_r, disc_z, base_len, base_r, tilt_angle, droop in cycles:
        for k in range(count):
            t_idx += 1
            phase_seed = hash01(t_idx * 47 + 13)
            jh1 = hash01(t_idx * 89 + 29)
            jh2 = hash01(t_idx * 151 + 71)
            jh3 = hash01(t_idx * 223 + 113)

            theta = (k + 0.35 * (jh1 - 0.5)) * (2.0 * math.pi / count) + disc_r * 12.0
            # Match oral disc undulation
            disc_wave = 0.006 * math.sin(theta * 6.0 + 0.5)
            r_anchor = disc_r * (0.92 + 0.16 * jh2)
            base_pos = Vector((r_anchor * math.cos(theta), r_anchor * math.sin(theta), disc_z + disc_wave - 0.003))

            radial_dir = Vector((math.cos(theta), math.sin(theta), 0.0))
            side_dir = Vector((-math.sin(theta), math.cos(theta), 0.0))
            up_dir = Vector((0.0, 0.0, 1.0))

            tilt = tilt_angle * (0.84 + 0.32 * jh3)
            launch_dir = (
                up_dir * math.cos(tilt)
                + radial_dir * math.sin(tilt)
                + side_dir * (0.18 * (jh2 - 0.5))
            ).normalized()

            curl_vec = (
                radial_dir * (0.55 * droop)
                + up_dir * (0.24 * (1.0 - droop) - 0.32 * droop)
                + side_dir * (0.22 * math.sin(phase_seed * 6.283))
            )

            length = base_len * (0.84 + 0.30 * jh1)
            stalk_r = base_r * (0.88 + 0.24 * jh2)

            base_v_idx = len(verts)
            ring_colors = []
            for r_i, h in enumerate(h_stations):
                center = base_pos + launch_dir * (length * h) + curl_vec * (length * (h ** 1.75))
                tangent = (launch_dir + curl_vec * (1.75 * (max(1e-3, h) ** 0.75))).normalized()
                _, b1, b2 = frame_from_tangent(tangent)

                rad_h = bta_radius_profile(h, stalk_r)

                # Standardized COLOR_0 contract (coral-raw-masks-v1, docs/asset-contract.md):
                # R = raw flexibility height h in [0, 1] (runtime applies pow(R, 1.8) once)
                # G = growthTipOrPolypMask (marks the sub-terminal bubble bulb and tip, h >= 0.62)
                # B = phaseSeed
                # A = contactAO
                flex_r = h
                bulb_g = smoothstep(0.58, 0.72, h)
                ao_a = lerp(0.22, 1.0, smoothstep(0.0, 0.58, h))
                rgba = (flex_r, bulb_g, phase_seed, ao_a)
                ring_colors.append(rgba)

                for j in range(n_rad):
                    ang = (j / n_rad) * 2.0 * math.pi
                    offset = (b1 * math.cos(ang) + b2 * math.sin(ang)) * rad_h
                    verts.append(tuple(center + offset))

            for r_i in range(n_rings - 1):
                h0 = h_stations[r_i]
                h1 = h_stations[r_i + 1]
                c0 = ring_colors[r_i]
                c1 = ring_colors[r_i + 1]
                for j in range(n_rad):
                    j_next = (j + 1) % n_rad
                    u0 = j / n_rad
                    u1 = (j + 1) / n_rad
                    v00 = base_v_idx + r_i * n_rad + j
                    v10 = base_v_idx + r_i * n_rad + j_next
                    v11 = base_v_idx + (r_i + 1) * n_rad + j_next
                    v01 = base_v_idx + (r_i + 1) * n_rad + j
                    faces.append((v00, v10, v11, v01))
                    loop_uvs.extend([(u0, h0), (u1, h0), (u1, h1), (u0, h1)])
                    loop_colors.extend([c0, c0, c1, c1])

            # Pointed distal tip cap at h = 1.0
            end_tangent = (launch_dir + curl_vec * 1.75).normalized()
            tip_pos = base_pos + launch_dir * length + curl_vec * length + end_tangent * (stalk_r * 0.45)
            tip_idx = len(verts)
            verts.append(tuple(tip_pos))
            tip_rgba = (1.0, 1.0, phase_seed, 1.0)
            top_ring_base = base_v_idx + (n_rings - 1) * n_rad
            top_c = ring_colors[-1]
            for j in range(n_rad):
                j_next = (j + 1) % n_rad
                faces.append((tip_idx, top_ring_base + j, top_ring_base + j_next))
                loop_uvs.extend([(0.5, 1.0), (j / n_rad, 0.985), ((j + 1) / n_rad, 0.985)])
                loop_colors.extend([tip_rgba, top_c, top_c])

            # Close proximal root inside oral disc
            root_idx = len(verts)
            verts.append(tuple(base_pos))
            root_c = ring_colors[0]
            for j in range(n_rad):
                j_next = (j + 1) % n_rad
                faces.append((root_idx, base_v_idx + j_next, base_v_idx + j))
                loop_uvs.extend([(0.5, 0.0), ((j + 1) / n_rad, 0.02), (j / n_rad, 0.02)])
                loop_colors.extend([root_c, root_c, root_c])

    return create_mesh_with_attributes('Anemone_Tentacle_Crown', verts, faces, loop_uvs, loop_colors, mat)


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

    disc_base, disc_norm, disc_orm = build_disc_textures(size=512)
    tent_base, tent_norm, tent_orm, tent_em = build_tentacle_textures(size=512)

    disc_mat = build_pbr_material('Anemone_Disc_Mat', disc_base, disc_norm, disc_orm, emissive_img=None)
    tent_mat = build_pbr_material('Anemone_Tentacle_Mat', tent_base, tent_norm, tent_orm, tent_em, emissive_strength=0.45)

    root_obj = bpy.data.objects.new('Coral_Anemone_BTA', None)
    bpy.context.collection.objects.link(root_obj)

    disc_mesh = build_column_and_disc_mesh(disc_mat)
    disc_obj = bpy.data.objects.new('Anemone_Column_Disc', disc_mesh)
    disc_obj.parent = root_obj
    bpy.context.collection.objects.link(disc_obj)

    tent_mesh = build_tentacle_crown_mesh(tent_mat)
    tent_obj = bpy.data.objects.new('Anemone_Tentacle_Crown', tent_mesh)
    tent_obj.parent = root_obj
    bpy.context.collection.objects.link(tent_obj)

    disc_mesh.calc_loop_triangles()
    tent_mesh.calc_loop_triangles()
    disc_tris = len(disc_mesh.loop_triangles)
    tent_tris = len(tent_mesh.loop_triangles)

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
        'asset': 'coral-anemone-bta',
        'archetype': 'E1 - Host Anemone (Entacmaea quadricolor Rose/Sunburst Bubble-Tip Anemone)',
        'license': 'CC0 / Custom project-authored procedural asset',
        'glbPath': glb_path,
        'glbBytes': os.path.getsize(glb_path),
        'glbSha256': sha256,
        'columnDiscTriangles': disc_tris,
        'tentacleCrownTriangles': tent_tris,
        'totalTriangles': disc_tris + tent_tris,
        'primitives': primitives_summary,
    }
    print('CORAL_BUILD_REPORT=' + json.dumps(report, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
