"""Build a lifelike, photorealistic Host Sea Anemone (Heteractis magnifica / Entacmaea quadricolor) in Blender 5.x.

Synthesizes the anatomical details from the reference photographs:
- Sub-mesh 1 (`Anemone_Column_Disc`, 1,536 tris):
  - Plump, pillowed, multi-lobed pedal column (`COLOR_0.r = 0.0` at the recessed foot base so it anchors
    firmly inside `socket_anemone_crevice_01`) with 5 deep longitudinal cushion lobes that flare into a
    rock-gripping pedal skirt and ultra-fine micro-pebbled verrucae (adhesive papillae) in rich
    terracotta-orange to deep crimson-red (`#ED4D1C` -> `#98141E`).
  - Asymmetrically pillowed column foot on one side and a naturally tilted, deeply folded, multi-lobed
    oral disc (`~20 deg` reef posture) with 54 creamy-ivory radial mesentery striations radiating from
    the central mouth out into the flared tentacle bases.
- Sub-mesh 2 (`Anemone_Tentacle_Crown`, 180 tentacles x 13 stations x 8 radial = 37,440 tris; total = 38,976 tris <= 40,000 cap):
  - Twist-free Parallel-Transport (Bishop) frames along C^2-continuous cubic Bezier + harmonic S-wave
    tentacle splines so downward-cascading and curling tentacles never pinch or twist.
  - Slender, graceful hydrostat taper (flared 1.38x basal root -> supple 0.56x distal shaft -> rounded
    acrosphere tip) across 6 concentric cycles aligned with the oral disc's radial folds.
  - Cohesive biological coloration (`512x512` 4-band UV atlas): warm translucent champagne-ivory fluted
    bases transitioning smoothly into vivid rose-pink, orchid-magenta, and lavender-blush shafts with
    glowing magenta-crimson / pearl-chartreuse acrosphere tips.
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


def cubic_bezier(p0, p1, p2, p3, t):
    u = 1.0 - t
    return (
        p0 * (u * u * u)
        + p1 * (3.0 * u * u * t)
        + p2 * (3.0 * u * t * t)
        + p3 * (t * t * t)
    )


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
    def verrucae_micro_papillae(u, v):
        ang = u * 2.0 * math.pi
        g1 = 0.5 + 0.5 * math.sin(ang * 144.0 + 0.6 * math.cos(v * 190.0)) * math.cos(v * 220.0 + 0.6 * math.sin(ang * 118.0))
        g2 = 0.5 + 0.5 * math.cos(ang * 204.0 - v * 270.0) * math.sin(v * 300.0 + ang * 98.0)
        papilla = smoothstep(0.18, 0.86, 0.62 * g1 + 0.38 * g2)
        lobe_fold = (
            0.68 * (0.5 + 0.5 * math.cos(ang * 5.0 + 0.30))
            + 0.32 * (0.5 + 0.5 * math.sin(ang * 15.0 + 0.35 * math.cos(v * 20.0)))
        )
        return papilla, lobe_fold

    def base_pixel(u, v):
        ang = u * 2.0 * math.pi
        papilla, lobe_fold = verrucae_micro_papillae(u, v)
        col_mask = 1.0 - smoothstep(0.50, 0.60, v)
        disc_mask = smoothstep(0.46, 0.57, v) * (1.0 - smoothstep(0.93, 0.99, v))

        primary_rib = max(0.0, math.cos(ang * 54.0)) ** 3.2
        secondary_rib = max(0.0, math.cos(ang * 108.0 + 0.3)) ** 5.5 * 0.52
        radial_stria = min(1.0, primary_rib + secondary_rib)

        c_foot       = (0.52, 0.08, 0.07)
        c_col_crease = (0.76, 0.14, 0.08)
        c_col_mid    = (0.95, 0.31, 0.10)
        c_col_tip    = (1.00, 0.50, 0.18)
        c_collar     = (0.86, 0.60, 0.44)
        c_disc_base  = (0.72, 0.56, 0.42)
        c_disc_rib   = (0.99, 0.96, 0.89)
        c_mouth      = (0.92, 0.52, 0.58)

        col_body = lerp_color(c_col_crease, c_col_mid, 0.28 + 0.72 * lobe_fold)
        col_body = lerp_color(col_body, c_col_tip, papilla * 0.64)

        col = lerp_color(c_foot, col_body, smoothstep(0.02, 0.14, v))
        col = lerp_color(col, c_collar, smoothstep(0.48, 0.56, v))
        col = lerp_color(col, c_disc_base, smoothstep(0.54, 0.64, v))
        col = lerp_color(col, c_disc_rib, radial_stria * disc_mask * 0.88)
        col = lerp_color(col, c_mouth, smoothstep(0.92, 0.985, v))

        ao = lerp(0.52, 1.0, smoothstep(0.0, 0.20, v)) * (1.0 - col_mask * (1.0 - papilla) * 0.15)
        return (col[0] * ao, col[1] * ao, col[2] * ao, 1.0)

    def normal_pixel(u, v):
        ang = u * 2.0 * math.pi
        col_mask = 1.0 - smoothstep(0.50, 0.60, v)
        disc_mask = smoothstep(0.46, 0.57, v)

        du_col = (
            -math.cos(ang * 144.0 + 0.6 * math.cos(v * 190.0)) * 0.26
            + math.sin(ang * 204.0 - v * 270.0) * 0.16
            + math.sin(ang * 15.0) * 0.16
        ) * col_mask
        dv_col = (
            math.sin(v * 220.0 + 0.6 * math.sin(ang * 118.0)) * 0.26
            - math.cos(v * 300.0 + ang * 98.0) * 0.16
        ) * col_mask

        du_disc = -math.sin(ang * 54.0) * 0.36 * disc_mask - math.sin(ang * 108.0) * 0.16 * disc_mask
        dv_disc = 0.0

        nx = max(-1.0, min(1.0, du_col + du_disc))
        ny = max(-1.0, min(1.0, dv_col + dv_disc))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        papilla, _ = verrucae_micro_papillae(u, v)
        col_mask = 1.0 - smoothstep(0.50, 0.60, v)
        roughness = lerp(0.54 - 0.10 * papilla, 0.32, smoothstep(0.48, 0.64, v))
        ao = lerp(0.42, 0.98, smoothstep(0.0, 0.26, v)) * (0.88 + 0.12 * (papilla * col_mask + (1.0 - col_mask)))
        return (ao, roughness, 0.0, 1.0)

    return (
        make_packed_image('anemone_disc_base', size, size, base_pixel, non_color=False),
        make_packed_image('anemone_disc_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('anemone_disc_orm', size, size, orm_pixel, non_color=True),
    )


def build_tentacle_textures(size=512):
    def base_pixel(u, v):
        band = min(3, int(u * 4.0))
        u_local = (u * 4.0) - band
        ang = u_local * 2.0 * math.pi

        basal_flute = (0.5 + 0.5 * math.cos(ang * 6.0)) * (1.0 - smoothstep(0.06, 0.34, v))
        side_highlight = 0.5 + 0.5 * math.cos(ang - 0.6)

        c_root = (0.97, 0.91, 0.78)
        c_low  = (0.96, 0.78, 0.76)

        if band == 0:
            c_mid  = (0.96, 0.32, 0.64)
            c_high = (0.99, 0.20, 0.58)
            c_tip  = (1.00, 0.12, 0.48)
        elif band == 1:
            c_mid  = (0.92, 0.38, 0.72)
            c_high = (0.96, 0.24, 0.64)
            c_tip  = (1.00, 0.15, 0.54)
        elif band == 2:
            c_mid  = (0.86, 0.52, 0.78)
            c_high = (0.90, 0.38, 0.70)
            c_tip  = (0.95, 0.86, 0.64)
        else:
            c_mid  = (0.97, 0.36, 0.62)
            c_high = (1.00, 0.22, 0.55)
            c_tip  = (1.00, 0.14, 0.45)

        col = lerp_color(c_root, c_low, smoothstep(0.0, 0.18, v))
        col = lerp_color(col, c_mid, smoothstep(0.14, 0.46, v))
        col = lerp_color(col, c_high, smoothstep(0.42, 0.82, v))

        shaft_mask = smoothstep(0.18, 0.40, v) * (1.0 - smoothstep(0.78, 0.92, v))
        col = lerp_color(col, (0.98, 0.82, 0.90), side_highlight * shaft_mask * 0.20)

        ring_band = math.exp(-((v - 0.89) / 0.036) ** 2)
        col = lerp_color(col, (0.99, 0.90, 0.86), ring_band * 0.22)
        col = lerp_color(col, c_tip, smoothstep(0.89, 0.97, v))

        flute_boost = 0.96 + 0.09 * basal_flute
        return (col[0] * flute_boost, col[1] * flute_boost, col[2] * flute_boost, 1.0)

    def normal_pixel(u, v):
        u_local = (u * 4.0) - min(3, int(u * 4.0))
        ang = u_local * 2.0 * math.pi
        flute_env = 1.0 - smoothstep(0.05, 0.34, v)
        d_u = -math.sin(ang * 6.0) * 0.20 * flute_env
        d_v = 0.0
        nx = max(-1.0, min(1.0, d_u))
        ny = max(-1.0, min(1.0, d_v))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        roughness = lerp(0.28, 0.16, smoothstep(0.22, 0.85, v))
        ao = lerp(0.44, 1.0, smoothstep(0.0, 0.26, v))
        return (ao, roughness, 0.0, 1.0)

    def emissive_pixel(u, v):
        glow = smoothstep(0.22, 0.86, v)
        return (glow * 0.68, glow * 0.16, glow * 0.44, 1.0)

    return (
        make_packed_image('anemone_tentacle_base', size, size, base_pixel, non_color=False),
        make_packed_image('anemone_tentacle_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('anemone_tentacle_orm', size, size, orm_pixel, non_color=True),
        make_packed_image('anemone_tentacle_emissive', size, size, emissive_pixel, non_color=False),
    )


def build_pbr_material(name, base_img, norm_img, orm_img, emissive_img=None, emissive_strength=0.42):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = 0.0
    if 'Subsurface Weight' in bsdf.inputs:
        bsdf.inputs['Subsurface Weight'].default_value = 0.48

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
    norm_node.inputs['Strength'].default_value = 0.65
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


def evaluate_disc_pose(r, theta):
    r_norm = smoothstep(0.018, 0.092, r)
    fold_z = (
        0.014 * math.sin(theta * 3.0 + 0.45)
        + 0.008 * math.cos(theta * 5.0 - 0.70)
        + 0.004 * math.sin(theta * 2.0 + 1.10)
    ) * r_norm
    tilt_z = r * (0.18 * math.cos(theta - 0.65))
    return fold_z + tilt_z


def evaluate_disc_radial_fold(r, theta):
    r_norm = smoothstep(0.035, 0.092, r)
    return r_norm * (
        0.008 * math.sin(theta * 3.0 + 0.45)
        + 0.005 * math.cos(theta * 5.0 - 0.70)
    )


def build_column_and_disc_mesh(mat):
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    n_seg = 64
    profiles = [
        (-0.024, 0.068, 0.00, 0.00, 0.00, 0.28, 0.45, 0.00),
        (-0.014, 0.088, 0.09, 0.00, 0.00, 0.48, 0.85, 0.00),
        (-0.002, 0.098, 0.18, 0.01, 0.00, 0.68, 1.00, 0.06),
        ( 0.012, 0.096, 0.28, 0.02, 0.02, 0.80, 0.95, 0.16),
        ( 0.025, 0.090, 0.37, 0.04, 0.04, 0.84, 0.82, 0.34),
        ( 0.036, 0.084, 0.45, 0.06, 0.08, 0.80, 0.60, 0.56),
        ( 0.045, 0.089, 0.52, 0.10, 0.16, 0.86, 0.38, 0.82),
        ( 0.052, 0.092, 0.59, 0.14, 0.28, 0.90, 0.20, 1.00),
        ( 0.054, 0.077, 0.69, 0.10, 0.40, 0.86, 0.12, 0.86),
        ( 0.052, 0.055, 0.79, 0.07, 0.52, 0.80, 0.06, 0.62),
        ( 0.048, 0.032, 0.89, 0.04, 0.62, 0.70, 0.03, 0.32),
        ( 0.044, 0.012, 0.97, 0.02, 0.72, 0.54, 0.00, 0.10),
    ]

    rings = []
    for z, rad, v_uv, flex_r, poly_g, ao_a, lobe_str, fold_str in profiles:
        ring = []
        for j in range(n_seg + 1):
            u = j / n_seg
            theta = u * 2.0 * math.pi

            lobe_wave = (
                0.62 * math.cos(theta * 5.0 + 0.35)
                + 0.26 * math.sin(theta * 3.0 - 0.45)
                + 0.12 * math.cos(theta * 8.0 + 1.05)
            )
            disc_radial_fold = fold_str * evaluate_disc_radial_fold(rad, theta)

            r_loc = rad * (1.0 + 0.16 * lobe_str * lobe_wave) + disc_radial_fold
            z_loc = z + fold_str * evaluate_disc_pose(rad, theta) + 0.0022 * lobe_str * lobe_wave

            side_weight = max(0.0, math.cos(theta - 2.45)) ** 1.3
            foot_bulge_x = -0.028 * lobe_str * side_weight
            foot_bulge_y = -0.022 * lobe_str * side_weight
            pos = Vector((
                r_loc * math.cos(theta) + foot_bulge_x,
                r_loc * math.sin(theta) + foot_bulge_y,
                z_loc,
            ))
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

    bot_idx = len(verts)
    verts.append((0.0, 0.0, -0.024))
    bot_col = rings[0][0][3]
    for j in range(n_seg):
        j_next = (j + 1) % n_seg
        faces.append((bot_idx, j_next, j))
        loop_uvs.extend([(0.5, 0.0), (j_next / n_seg, 0.02), (j / n_seg, 0.02)])
        loop_colors.extend([bot_col, rings[0][j_next][3], rings[0][j][3]])

    top_r = n_rings - 1
    mouth_idx = len(verts)
    verts.append((0.0, 0.0, 0.038))
    mouth_col = (0.01, 0.65, 0.25, 0.35)
    for j in range(n_seg):
        j_next = (j + 1) % n_seg
        faces.append((mouth_idx, top_r * n_seg + j, top_r * n_seg + j_next))
        loop_uvs.extend([(0.5, 1.0), (j / n_seg, 0.97), (j_next / n_seg, 0.97)])
        loop_colors.extend([mouth_col, rings[top_r][j][3], rings[top_r][j_next][3]])

    return create_mesh_with_attributes('Anemone_Column_Disc', verts, faces, loop_uvs, loop_colors, mat)


def natural_tentacle_radius(h, base_r, swell_factor):
    root_flare = 1.0 + 0.38 * ((1.0 - smoothstep(0.0, 0.20, h)) ** 1.5)
    shaft_taper = lerp(1.0, 0.56, smoothstep(0.10, 0.90, h))
    sub_swell = swell_factor * math.exp(-((h - 0.86) / 0.080) ** 2)
    if h > 0.92:
        t_dome = min(1.0, (h - 0.92) / 0.08)
        dome = math.sqrt(max(0.08, 1.0 - t_dome * t_dome * 0.92))
    else:
        dome = 1.0
    return base_r * (root_flare * shaft_taper + sub_swell) * dome


def build_tentacle_crown_mesh(mat):
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    n_rad = 8
    h_stations = [
        0.00, 0.07, 0.15, 0.24, 0.34, 0.45, 0.56,
        0.67, 0.77, 0.85, 0.91, 0.96, 0.988,
    ]
    n_rings = len(h_stations)

    cycles = [
        (48, 0.091, 0.050, 0.092, 0.0040, 0.034, -0.052, 0.011),
        (42, 0.080, 0.052, 0.098, 0.0042, 0.054, -0.026, 0.013),
        (34, 0.067, 0.053, 0.102, 0.0042, 0.068,  0.008, 0.015),
        (28, 0.052, 0.052, 0.096, 0.0040, 0.054,  0.042, 0.015),
        (18, 0.037, 0.050, 0.088, 0.0038, 0.036,  0.062, 0.013),
        (10, 0.023, 0.046, 0.072, 0.0035, 0.022,  0.050, 0.010),
    ]

    current_dir = Vector((0.68, 0.42, 0.06)).normalized()

    t_idx = 0
    for count, disc_r, disc_z, base_len, base_r, out_reach, drop_z, s_wave_amp in cycles:
        for k in range(count):
            t_idx += 1
            phase_seed = hash01(t_idx * 47 + 13)
            jh1 = hash01(t_idx * 89 + 29)
            jh2 = hash01(t_idx * 151 + 71)
            jh3 = hash01(t_idx * 223 + 113)
            jh4 = hash01(t_idx * 311 + 179)

            theta = (k + 0.34 * (jh1 - 0.5)) * (2.0 * math.pi / count) + disc_r * 16.0
            r_anchor = disc_r * (0.95 + 0.10 * jh2) + evaluate_disc_radial_fold(disc_r, theta)
            z_pose = evaluate_disc_pose(r_anchor, theta)
            p0 = Vector((
                r_anchor * math.cos(theta),
                r_anchor * math.sin(theta),
                disc_z + z_pose - 0.003,
            ))

            radial_dir = Vector((math.cos(theta), math.sin(theta), 0.0))
            side_dir = Vector((-math.sin(theta), math.cos(theta), 0.0))
            up_dir = Vector((0.0, 0.0, 1.0))

            column_expose = max(0.0, math.cos(theta - 2.45)) ** 1.6
            len_scale = (0.86 + 0.28 * jh1) * (1.0 - 0.12 * column_expose)
            reach = out_reach * len_scale * (1.0 - 0.20 * column_expose)
            vertical_drop = drop_z * len_scale + 0.030 * column_expose

            swirl = 0.016 * math.cos(theta * 3.0 - 0.4) + 0.009 * (jh2 - 0.5)
            flow_shift = current_dir * (0.018 * (0.5 + 0.5 * math.cos(theta - 0.6)))

            p1 = (
                p0
                + radial_dir * (reach * 0.38)
                + up_dir * (0.030 * len_scale + max(0.0, vertical_drop * 0.35))
                + side_dir * (swirl * 0.4)
            )
            p2 = (
                p0
                + radial_dir * (reach * 0.88)
                + up_dir * (vertical_drop * 0.55 + 0.018 * len_scale)
                + side_dir * (swirl * 0.9)
                + flow_shift * 0.6
            )
            hook_lift = 0.012 * (jh3 - 0.35) + (0.008 if drop_z < -0.02 else 0.0)
            hook_side = 0.014 * math.sin(phase_seed * 6.283 + 0.8)
            p3 = (
                p0
                + radial_dir * (reach * (1.02 + 0.12 * (jh4 - 0.5)))
                + up_dir * (vertical_drop + hook_lift)
                + side_dir * (swirl + hook_side)
                + flow_shift
            )

            stalk_r = base_r * (0.90 + 0.20 * jh2)
            swell_factor = 0.04 + 0.08 * jh4
            s_freq = (1.20 + 0.50 * jh3) * math.pi
            s_phase = theta * 2.0 + phase_seed * 3.14

            uv_band = (k + int(disc_r * 40.0)) % 4
            u_min = uv_band * 0.25 + 0.015
            u_span = 0.22

            def eval_spine(h_val):
                env = math.sin(h_val * math.pi) * (h_val ** 0.6)
                s_lat = s_wave_amp * math.sin(h_val * s_freq + s_phase) * env
                s_vert = 0.55 * s_wave_amp * math.cos(h_val * s_freq * 0.9 + s_phase) * env
                return cubic_bezier(p0, p1, p2, p3, h_val) + side_dir * s_lat + up_dir * s_vert

            base_v_idx = len(verts)
            ring_colors = []

            t_prev = (eval_spine(0.015) - eval_spine(0.0)).normalized()
            b1 = (side_dir - t_prev * side_dir.dot(t_prev))
            if b1.length < 1e-5:
                b1 = radial_dir.cross(t_prev)
            b1.normalize()
            b2 = t_prev.cross(b1).normalized()

            for r_i, h in enumerate(h_stations):
                center = eval_spine(h)
                eps = 0.012
                tangent = (eval_spine(min(1.0, h + eps)) - eval_spine(max(0.0, h - eps))).normalized()
                b1_proj = b1 - tangent * b1.dot(tangent)
                if b1_proj.length > 1e-5:
                    b1 = b1_proj.normalized()
                b2 = tangent.cross(b1).normalized()

                rad_h = natural_tentacle_radius(h, stalk_r, swell_factor)

                flex_r = h
                tip_g = smoothstep(0.20, 0.84, h)
                ao_a = lerp(0.40, 1.0, smoothstep(0.0, 0.36, h))
                rgba = (flex_r, tip_g, phase_seed, ao_a)
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
                    u0 = u_min + (j / n_rad) * u_span
                    u1 = u_min + ((j + 1) / n_rad) * u_span
                    v00 = base_v_idx + r_i * n_rad + j
                    v10 = base_v_idx + r_i * n_rad + j_next
                    v11 = base_v_idx + (r_i + 1) * n_rad + j_next
                    v01 = base_v_idx + (r_i + 1) * n_rad + j
                    faces.append((v00, v10, v11, v01))
                    loop_uvs.extend([(u0, h0), (u1, h0), (u1, h1), (u0, h1)])
                    loop_colors.extend([c0, c0, c1, c1])

            end_tangent = (eval_spine(1.0) - eval_spine(0.96)).normalized()
            tip_pos = eval_spine(1.0) + end_tangent * (stalk_r * 0.10)
            tip_idx = len(verts)
            verts.append(tuple(tip_pos))
            tip_rgba = (1.0, 1.0, phase_seed, 1.0)
            top_ring_base = base_v_idx + (n_rings - 1) * n_rad
            top_c = ring_colors[-1]
            u_mid = u_min + 0.5 * u_span
            for j in range(n_rad):
                j_next = (j + 1) % n_rad
                u0 = u_min + (j / n_rad) * u_span
                u1 = u_min + ((j + 1) / n_rad) * u_span
                faces.append((tip_idx, top_ring_base + j, top_ring_base + j_next))
                loop_uvs.extend([(u_mid, 1.0), (u0, 0.988), (u1, 0.988)])
                loop_colors.extend([tip_rgba, top_c, top_c])

            root_idx = len(verts)
            verts.append(tuple(p0))
            root_c = ring_colors[0]
            for j in range(n_rad):
                j_next = (j + 1) % n_rad
                u0 = u_min + (j / n_rad) * u_span
                u1 = u_min + ((j + 1) / n_rad) * u_span
                faces.append((root_idx, base_v_idx + j_next, base_v_idx + j))
                loop_uvs.extend([(u_mid, 0.0), (u1, 0.02), (u0, 0.02)])
                loop_colors.extend([root_c, root_c, root_c])

    return create_mesh_with_attributes('Anemone_Tentacle_Crown', verts, faces, loop_uvs, loop_colors, mat)


def inspect_glb_json(glb_path):
    with open(glb_path, 'rb') as fp:
        magic, version, _ = struct.unpack('<4sII', fp.read(12))
        if magic != b'glTF' or version != 2:
            raise ValueError('Invalid GLB header')
        chunk_len, _ = struct.unpack('<I4s', fp.read(8))
        return json.loads(fp.read(chunk_len))


def clear_scene_in_place():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for block_list in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.lights, bpy.data.cameras, bpy.data.armatures, bpy.data.actions):
        for block in list(block_list):
            block_list.remove(block)


def main():
    prefix = parse_output_prefix()
    os.makedirs(os.path.dirname(prefix), exist_ok=True)

    clear_scene_in_place()
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    disc_base, disc_norm, disc_orm = build_disc_textures(size=512)
    tent_base, tent_norm, tent_orm, tent_em = build_tentacle_textures(size=512)

    disc_mat = build_pbr_material('Anemone_Disc_Mat', disc_base, disc_norm, disc_orm, emissive_img=None)
    tent_mat = build_pbr_material('Anemone_Tentacle_Mat', tent_base, tent_norm, tent_orm, tent_em, emissive_strength=0.42)

    root_obj = bpy.data.objects.new('Coral_Anemone_BTA', None)
    bpy.context.scene.collection.objects.link(root_obj)

    disc_mesh = build_column_and_disc_mesh(disc_mat)
    disc_obj = bpy.data.objects.new('Anemone_Column_Disc', disc_mesh)
    disc_obj.parent = root_obj
    bpy.context.scene.collection.objects.link(disc_obj)

    tent_mesh = build_tentacle_crown_mesh(tent_mat)
    tent_obj = bpy.data.objects.new('Anemone_Tentacle_Crown', tent_mesh)
    tent_obj.parent = root_obj
    bpy.context.scene.collection.objects.link(tent_obj)

    disc_mesh.calc_loop_triangles()
    tent_mesh.calc_loop_triangles()
    disc_tris = len(disc_mesh.loop_triangles)
    tent_tris = len(tent_mesh.loop_triangles)

    blend_path = prefix + '.blend'
    glb_path = prefix + '.glb'
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    export_kwargs = dict(
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
    if hasattr(bpy.context, 'active_object'):
        bpy.ops.export_scene.gltf(**export_kwargs)
    else:
        win = bpy.context.window_manager.windows[0] if bpy.context.window_manager.windows else None
        override_ctx = {'scene': bpy.context.scene, 'view_layer': bpy.context.scene.view_layer, 'active_object': root_obj, 'object': root_obj}
        if win is not None:
            override_ctx['window'] = win
            override_ctx['screen'] = win.screen
        with bpy.context.temp_override(**override_ctx):
            bpy.ops.export_scene.gltf(**export_kwargs)

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
        'archetype': 'E1 - Host Anemone (Heteractis magnifica / Entacmaea quadricolor Host Sea Anemone)',
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
