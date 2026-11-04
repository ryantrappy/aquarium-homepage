"""Build a realistic two-mesh Euphyllia glabrescens (Torch Coral) colony in Blender 5.0.

Follows docs/modular-coral-and-live-rock-spec.md (Section 4.1 & 4.4):
- Sub-mesh 1 (`Euphyllia_Skeleton`): Rigid calcified phaceloid skeleton (`COLOR_0.r = 0.0`)
  with a flared encrusting basal skirt (`2.5 cm` rim), branching stony stalks (5 heads),
  20 sharp longitudinal costae ribs per calyx cylinder, coralline-encrusted lower skeleton,
  and a glossy maroon-brown fleshy periderm collar below each polyp crown.
- Sub-mesh 2 (`Euphyllia_Polyp_Crown`): Inflated translucent polyp crown (`0.0 <= COLOR_0.r <= 1.0`,
  `COLOR_0.r = h^1.8`) with 220 tapered, organically curved tubular tentacles across the 5 heads,
  each ending in a swollen spherical/teardrop acrosphere bulb (`h in [0.82, 1.0]`, `COLOR_0.g = 1.0`),
  deterministic per-tentacle `COLOR_0.b` (`phaseSeed`), and `COLOR_0.a` (`contactAO`).
- Embedded procedural PBR textures (baseColor, normal, metallicRoughness, emissive) at <= 1024px.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_euphyllia_torch.py -- /tmp/coral-models/coral-euphyllia-torch
"""
import hashlib
import json
import math
import os
import random
import struct
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector


def parse_output_prefix():
    argv = sys.argv
    if '--' in argv:
        args = argv[argv.index('--') + 1:]
        if args:
            return os.path.abspath(args[0])
    return '/tmp/coral-models/coral-euphyllia-torch'


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
    # UV layout for skeleton:
    # u = radial angle around stalk/skirt [0..1]
    # v = normalized height from outer skirt rim (0.0) -> trunk (0.35) -> calyx rim (1.0)
    def base_pixel(u, v):
        rib_wave = 0.5 + 0.5 * math.cos(u * 20.0 * 2.0 * math.pi)
        fine_grain = 0.5 + 0.25 * math.sin(u * 97.0 + v * 63.0) + 0.25 * math.cos(u * 53.0 - v * 113.0)
        coralline_patch = smoothstep(0.35, 0.72, 0.5 + 0.35 * math.sin(u * 18.8 + v * 11.0) + 0.25 * math.cos(u * 31.4 - v * 19.0))
        # Base carbonate buff-grey + purple coralline algae
        carbonate = (0.34, 0.31, 0.27)
        coralline = (0.44, 0.17, 0.37)
        skirt_crust = (0.50, 0.21, 0.42)
        periderm = (0.24, 0.08, 0.11)

        rock_col = lerp_color(carbonate, coralline, coralline_patch * 0.78)
        # Flared skirt encrusting coralline rim at v < 0.22
        skirt_t = 1.0 - smoothstep(0.05, 0.24, v)
        col = lerp_color(rock_col, skirt_crust, skirt_t * 0.65)
        # Fleshy maroon-brown periderm collar at top 20% of stalk (v > 0.78)
        collar_t = smoothstep(0.76, 0.88, v)
        col = lerp_color(col, periderm, collar_t)
        # Costae ridge highlight on upper calyx
        costae_bright = (0.85 + 0.22 * rib_wave) * (0.90 + 0.10 * fine_grain)
        # Darken base contact slightly
        ao = lerp(0.55, 1.0, smoothstep(0.0, 0.22, v))
        return (col[0] * costae_bright * ao, col[1] * costae_bright * ao, col[2] * costae_bright * ao, 1.0)

    def normal_pixel(u, v):
        # Sharp longitudinal costae ribs + porous carbonate pitting
        costae_strength = smoothstep(0.18, 0.65, v)
        d_rib = -math.sin(u * 20.0 * 2.0 * math.pi) * 0.65 * costae_strength
        d_pit_u = math.cos(u * 120.0 + v * 80.0) * 0.18 * (1.0 - 0.6 * smoothstep(0.78, 0.92, v))
        d_pit_v = math.sin(v * 95.0 - u * 70.0) * 0.18
        nx = max(-1.0, min(1.0, d_rib + d_pit_u))
        ny = max(-1.0, min(1.0, d_pit_v))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        # glTF metallicRoughness texture: R = occlusion, G = roughness, B = metallic
        collar_t = smoothstep(0.76, 0.88, v)
        coralline_patch = smoothstep(0.35, 0.72, 0.5 + 0.35 * math.sin(u * 18.8 + v * 11.0))
        rock_rough = lerp(0.88, 0.68, coralline_patch)
        roughness = lerp(rock_rough, 0.34, collar_t)
        ao = lerp(0.35, 1.0, smoothstep(0.0, 0.25, v))
        return (ao, roughness, 0.0, 1.0)

    return (
        make_packed_image('euphyllia_skeleton_base', size, size, base_pixel, non_color=False),
        make_packed_image('euphyllia_skeleton_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('euphyllia_skeleton_orm', size, size, orm_pixel, non_color=True),
    )


def build_polyp_textures(size=512):
    # UV layout for tentacles:
    # u = circumferential angle around tentacle tube [0..1]
    # v = normalized position from calyx base (0.0) -> shaft -> acrosphere tip (1.0)
    def base_pixel(u, v):
        # Indo-Pacific Gold/Neon-Tip Torch Coral (Euphyllia glabrescens):
        # Deep cocoa-violet base -> warm golden-amber mid shaft with longitudinal striae -> vivid neon-green acrosphere bulb
        stria = 0.5 + 0.5 * math.sin(u * 12.0 * 2.0 * math.pi + v * 4.0)
        ring_ripple = 0.5 + 0.5 * math.sin(v * 38.0 * math.pi)
        c_base = (0.14, 0.05, 0.16)       # deep violet-chocolate calyx base
        c_shaft = (0.58, 0.34, 0.06)      # rich Indo-gold tentacle shaft
        c_shaft_hi = (0.85, 0.56, 0.10)   # bright golden longitudinal stripe
        c_neck = (0.10, 0.62, 0.36)       # emerald transition neck below bulb
        c_tip = (0.16, 0.98, 0.42)        # vivid fluorescent neon-green acrosphere bulb (#22FF66)

        shaft_col = lerp_color(c_shaft, c_shaft_hi, stria * 0.65 + ring_ripple * 0.15)
        col = lerp_color(c_base, shaft_col, smoothstep(0.06, 0.38, v))
        col = lerp_color(col, c_neck, smoothstep(0.70, 0.82, v))
        col = lerp_color(col, c_tip, smoothstep(0.81, 0.91, v))
        return (col[0], col[1], col[2], 1.0)

    def normal_pixel(u, v):
        # Subtle epidermis annulations (transverse nematocyst rings) along shaft, smooth taut bulb at tip
        bulb_smooth = 1.0 - smoothstep(0.78, 0.88, v)
        d_u = -math.cos(u * 12.0 * 2.0 * math.pi) * 0.16 * bulb_smooth
        d_v = -math.cos(v * 42.0 * math.pi) * 0.24 * bulb_smooth
        nx = max(-1.0, min(1.0, d_u))
        ny = max(-1.0, min(1.0, d_v))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        # Wet mucus coat: low roughness (0.16 on acrosphere, 0.22 on shaft)
        roughness = lerp(0.24, 0.14, smoothstep(0.75, 0.90, v))
        ao = lerp(0.25, 1.0, smoothstep(0.0, 0.35, v))
        return (ao, roughness, 0.0, 1.0)

    def emissive_pixel(u, v):
        # Actinic GFP/YFP fluorescence concentrated in the acrosphere tip and golden shaft striae
        stria = 0.5 + 0.5 * math.sin(u * 12.0 * 2.0 * math.pi + v * 4.0)
        gold_glow = smoothstep(0.22, 0.68, v) * (1.0 - smoothstep(0.72, 0.85, v)) * (0.18 + 0.22 * stria)
        tip_glow = smoothstep(0.78, 0.89, v)
        r = gold_glow * 0.55 + tip_glow * 0.08
        g = gold_glow * 0.36 + tip_glow * 0.88
        b = gold_glow * 0.04 + tip_glow * 0.28
        return (r, g, b, 1.0)

    return (
        make_packed_image('euphyllia_polyp_base', size, size, base_pixel, non_color=False),
        make_packed_image('euphyllia_polyp_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('euphyllia_polyp_orm', size, size, orm_pixel, non_color=True),
        make_packed_image('euphyllia_polyp_emissive', size, size, emissive_pixel, non_color=False),
    )


def build_pbr_material(name, base_img, norm_img, orm_img, emissive_img=None, emissive_strength=1.0):
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


def frame_from_tangent(tangent):
    t = tangent.normalized()
    up = Vector((0.0, 0.0, 1.0)) if abs(t.z) < 0.92 else Vector((1.0, 0.0, 0.0))
    b1 = t.cross(up).normalized()
    b2 = t.cross(b1).normalized()
    return t, b1, b2


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

    color_attr = mesh.color_attributes.new(name='COLOR_0', type='BYTE_COLOR', domain='CORNER')
    mesh.color_attributes.active_color = color_attr
    mesh.color_attributes.render_color_index = 0
    for li, rgba in enumerate(loop_colors):
        color_attr.data[li].color = rgba

    mesh.materials.append(mat)
    mesh.calc_tangents(uvmap='UVMap')
    return mesh


def build_skeleton_mesh(heads, mat):
    """Build Sub-mesh 1: Rigid calcified phaceloid skeleton + flared encrusting basal skirt."""
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    def append_tube(rings_pos_uv_col, close_bottom=False, close_top=False):
        # Each ring in rings_pos_uv_col is a list of (Vector, u_coord, v_coord, rgba_tuple) of length N+1
        # where the last item wraps u=1.0 but shares vertex index with j=0.
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
                v0 = base_idx + j_next
                v1 = base_idx + j
                faces.append((c_idx, v0, v1))
                loop_uvs.extend([(0.5, 0.0), (j_next / n_seg, 0.02), (j / n_seg, 0.02)])
                loop_colors.extend([c_col, rings_pos_uv_col[0][j + 1][3], rings_pos_uv_col[0][j][3]])

        if close_top:
            top_r = n_rings - 1
            c_pos = sum((rings_pos_uv_col[top_r][j][0] for j in range(n_seg)), Vector((0.0, 0.0, 0.0))) / n_seg
            c_pos = c_pos - Vector((0.0, 0.0, 0.008))  # recessed septum cup center
            c_idx = len(verts)
            verts.append(tuple(c_pos))
            c_col = (0.0, 0.0, 0.1, 0.22)
            for j in range(n_seg):
                j_next = (j + 1) % n_seg
                v0 = base_idx + top_r * n_seg + j
                v1 = base_idx + top_r * n_seg + j_next
                faces.append((c_idx, v0, v1))
                loop_uvs.extend([(0.5, 0.98), (j / n_seg, 0.95), (j_next / n_seg, 0.95)])
                loop_colors.extend([c_col, rings_pos_uv_col[top_r][j][3], rings_pos_uv_col[top_r][j + 1][3]])

    # 1. Flared encrusting basal skirt + smooth central pedestal dome (no exposed flat step)
    n_seg = 28
    skirt_profiles = [
        # (z, radius, v_coord, ao)
        (-0.004, 0.072, 0.00, 0.15),  # sunken outer basal contact edge
        (0.002,  0.078, 0.05, 0.18),  # flared encrusting lip (2.5-3 cm wider than trunk)
        (0.012,  0.060, 0.12, 0.28),  # encrusting apron slope
        (0.024,  0.044, 0.20, 0.38),  # trunk collar transition
        (0.038,  0.035, 0.30, 0.45),  # common basal trunk
        (0.050,  0.024, 0.38, 0.42),  # tapered inner crotch dome tucked inside the 5 stalks
        (0.056,  0.010, 0.42, 0.38),  # rounded apex inside stalk cluster
    ]
    skirt_rings = []
    for z, rad, v_coord, ao in skirt_profiles:
        ring = []
        for j in range(n_seg + 1):
            u = j / n_seg
            theta = u * 2.0 * math.pi
            # Organic lobed encrusting margin on the skirt
            lobe_factor = 1.0 - smoothstep(0.0, 0.040, z)
            lobe = 1.0 + lobe_factor * (0.14 * math.sin(theta * 5.0 + 0.4) + 0.08 * math.cos(theta * 8.0 - 0.9))
            r_local = rad * lobe
            x = r_local * math.cos(theta)
            y = r_local * math.sin(theta)
            z_local = z + lobe_factor * 0.003 * math.sin(theta * 6.0)
            # COLOR_0: R = 0.0 (rigid), G = 0.0, B = 0.05, A = contactAO
            rgba = (0.0, 0.0, 0.05, ao)
            ring.append((Vector((x, y, z_local)), u, v_coord, rgba))
        skirt_rings.append(ring)
    append_tube(skirt_rings, close_bottom=True, close_top=True)

    # 2. Five branching phaceloid calyx stalks rooted deep inside the basal trunk (z = 0.022)
    n_stalk_seg = 28
    n_stalk_rings = 10
    for h_idx, head in enumerate(heads):
        p0 = Vector((head['origin'][0] * 0.65, head['origin'][1] * 0.65, 0.022))
        p2 = Vector(head['center'])
        axis_dir = Vector(head['dir']).normalized()
        p1 = (p0 + p2) * 0.5 - axis_dir * 0.018
        calyx_radius = head['radius']
        phase_b = hash01(100 + h_idx)

        stalk_rings = []
        for r_idx in range(n_stalk_rings):
            t = r_idx / (n_stalk_rings - 1)
            # Quadratic Bezier curve along stalk
            center = ((1.0 - t) ** 2) * p0 + 2.0 * (1.0 - t) * t * p1 + (t ** 2) * p2
            tangent = (2.0 * (1.0 - t) * (p1 - p0) + 2.0 * t * (p2 - p1)).normalized()
            _, b1, b2 = frame_from_tangent(tangent)

            # Stalk blends out of the basal trunk, narrows slightly at waist, then flares into the calyx cup
            trunk_blend = lerp(0.88, 0.60, smoothstep(0.0, 0.35, t))
            calyx_flare = lerp(trunk_blend, 1.0, smoothstep(0.32, 1.0, t))
            base_r = calyx_radius * calyx_flare
            v_coord = lerp(0.24, 0.98, t)
            ao = lerp(0.35, 0.82, t)
            # Costae ribs become prominent along the phaceloid branch
            rib_amp = 0.095 * smoothstep(0.18, 0.88, t)

            ring = []
            for j in range(n_stalk_seg + 1):
                u = j / n_stalk_seg
                theta = u * 2.0 * math.pi
                # 20 sharp longitudinal costae ridges around the cylinder
                costa = max(0.0, math.cos(theta * 20.0)) ** 1.6
                r_local = base_r * (1.0 + rib_amp * costa)
                offset = (b1 * math.cos(theta) + b2 * math.sin(theta)) * r_local
                # Slight recessed lip on the final ring
                z_lip = 0.002 * costa if r_idx == n_stalk_rings - 1 else 0.0
                pos = center + offset + tangent * z_lip
                rgba = (0.0, 0.0, phase_b, ao)
                ring.append((pos, u, v_coord, rgba))
            stalk_rings.append(ring)
        append_tube(stalk_rings, close_bottom=True, close_top=True)

    return create_mesh_with_attributes('Euphyllia_Skeleton', verts, faces, loop_uvs, loop_colors, mat)


def build_polyp_crown_mesh(heads, mat):
    """Build Sub-mesh 2: Inflated translucent polyp crown with swollen acrosphere tips."""
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    n_rad = 8    # Spec Section 4.4: 8 radial segments
    # Non-uniform height stations concentrate curvature detail around the swollen teardrop acrosphere bulb:
    h_stations = [0.0, 0.20, 0.44, 0.66, 0.78, 0.84, 0.90, 0.955, 0.988]
    n_rings = len(h_stations)
    tentacle_counter = 0

    for h_idx, head in enumerate(heads):
        calyx_center = Vector(head['center'])
        head_dir = Vector(head['dir']).normalized()
        _, h_b1, h_b2 = frame_from_tangent(head_dir)
        calyx_r = head['radius']

        # 3 concentric rings of tentacles in each calyx cup (32 tentacles per head -> 160 total, ~23k tris)
        ring_specs = [
            (6,  0.22, 0.046, 0.14, 0.08),  # inner upright crown tentacles
            (11, 0.55, 0.054, 0.46, 0.25),  # mid arching tentacles
            (15, 0.85, 0.058, 0.80, 0.46),  # outer cascading perimeter tentacles
        ]

        for count, radial_frac, base_len, tilt_angle, droop_strength in ring_specs:
            for k in range(count):
                tentacle_counter += 1
                phase_seed = hash01(tentacle_counter * 37 + h_idx * 101)
                j_hash1 = hash01(tentacle_counter * 73 + 19)
                j_hash2 = hash01(tentacle_counter * 139 + 53)
                j_hash3 = hash01(tentacle_counter * 211 + 97)

                azimuth = (k + 0.35 * (j_hash1 - 0.5)) * (2.0 * math.pi / count) + h_idx * 0.7
                radial_dir = math.cos(azimuth) * h_b1 + math.sin(azimuth) * h_b2
                side_dir = -math.sin(azimuth) * h_b1 + math.cos(azimuth) * h_b2

                # Base point recessed slightly inside the calyx cup
                base_pos = (
                    calyx_center
                    + radial_dir * (calyx_r * radial_frac * (0.92 + 0.14 * j_hash2))
                    - head_dir * 0.004
                )
                length = base_len * (0.86 + 0.28 * j_hash1)
                stalk_r = 0.0027 * (0.90 + 0.20 * j_hash2)  # ~2.7 mm radius

                # Launch direction tilts outward from the calyx axis, then gently arches with current/gravity
                launch_tilt = tilt_angle * (0.85 + 0.30 * j_hash3)
                launch_dir = (
                    head_dir * math.cos(launch_tilt)
                    + radial_dir * math.sin(launch_tilt)
                    + side_dir * (0.14 * (j_hash2 - 0.5))
                ).normalized()

                # Gentle organic S-curve & droop direction
                curl_dir = (
                    radial_dir * (0.65 * droop_strength)
                    + Vector((0.0, 0.0, -0.38 * droop_strength + 0.16 * (1.0 - radial_frac)))
                    + side_dir * (0.22 * math.sin(phase_seed * 6.283))
                )

                base_idx = len(verts)
                ring_colors = []
                for r_idx, h in enumerate(h_stations):
                    # Centerline position along tentacle
                    center = (
                        base_pos
                        + launch_dir * (length * h)
                        + curl_dir * (length * (h ** 1.85))
                    )
                    tangent = (launch_dir + curl_dir * (1.85 * (max(1e-3, h) ** 0.85))).normalized()
                    _, t_b1, t_b2 = frame_from_tangent(tangent)

                    # Smooth teardrop acrosphere bulb at h in [0.78, 1.0] (1.65x stalk radius)
                    if h < 0.78:
                        profile_r = stalk_r * lerp(1.12, 0.84, h / 0.78)
                    else:
                        bulb_u = (h - 0.78) / 0.22
                        # Smooth hemispherical/teardrop dome curve
                        bulb_shape = math.sin(min(1.0, bulb_u) * math.pi * 0.82) * (1.0 - 0.35 * (bulb_u ** 3))
                        profile_r = stalk_r * max(0.38, 0.84 + 0.84 * bulb_shape)

                    # Standardized COLOR_0 contract (Spec Section 4.1 & 4.4):
                    flex_r = h ** 1.8
                    tip_g = smoothstep(0.76, 0.84, h)
                    ao_a = lerp(0.20 + 0.12 * radial_frac, 1.0, smoothstep(0.0, 0.65, h))
                    rgba = (flex_r, tip_g, phase_seed, ao_a)
                    ring_colors.append(rgba)

                    for j in range(n_rad):
                        theta = (j / n_rad) * 2.0 * math.pi
                        offset = (t_b1 * math.cos(theta) + t_b2 * math.sin(theta)) * profile_r
                        verts.append(tuple(center + offset))

                # Connect tentacle rings
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

                # Smooth rounded dome cap at the distal tip of the acrosphere (h = 1.0)
                tip_center = (
                    base_pos
                    + launch_dir * length
                    + curl_dir * length
                    + (launch_dir + curl_dir * 1.85).normalized() * (stalk_r * 0.22)
                )
                tip_idx = len(verts)
                verts.append(tuple(tip_center))
                tip_rgba = (1.0, 1.0, phase_seed, 1.0)
                top_ring_offset = base_idx + (n_rings - 1) * n_rad
                top_c = ring_colors[-1]
                for j in range(n_rad):
                    j_next = (j + 1) % n_rad
                    v0 = top_ring_offset + j
                    v1 = top_ring_offset + j_next
                    faces.append((tip_idx, v0, v1))
                    loop_uvs.extend([(0.5, 1.0), (j / n_rad, 0.96), ((j + 1) / n_rad, 0.96)])
                    loop_colors.extend([tip_rgba, top_c, top_c])

                # Close proximal base of tentacle inside the calyx cup so mesh is watertight/manifold
                base_cap_idx = len(verts)
                verts.append(tuple(base_pos))
                base_rgba = ring_colors[0]
                for j in range(n_rad):
                    j_next = (j + 1) % n_rad
                    v0 = base_idx + j_next
                    v1 = base_idx + j
                    faces.append((base_cap_idx, v0, v1))
                    loop_uvs.extend([(0.5, 0.0), ((j + 1) / n_rad, 0.02), (j / n_rad, 0.02)])
                    loop_colors.extend([base_rgba, base_rgba, base_rgba])

    return create_mesh_with_attributes('Euphyllia_Polyp_Crown', verts, faces, loop_uvs, loop_colors, mat)


def inspect_glb_json(glb_path):
    with open(glb_path, 'rb') as fp:
        magic, version, length = struct.unpack('<4sII', fp.read(12))
        if magic != b'glTF' or version != 2:
            raise ValueError('Invalid GLB header')
        chunk_len, chunk_type = struct.unpack('<I4s', fp.read(8))
        return json.loads(fp.read(chunk_len))


def main():
    prefix = parse_output_prefix()
    os.makedirs(os.path.dirname(prefix), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    # 5 phaceloid calyx heads arranged in a natural hemispherical bouquet
    heads = [
        {'origin': (0.000, 0.000),  'center': (0.000, 0.000, 0.118),  'dir': (0.00, 0.00, 1.00),  'radius': 0.020},
        {'origin': (0.012, 0.008),  'center': (0.044, 0.028, 0.104),  'dir': (0.36, 0.22, 0.90),  'radius': 0.019},
        {'origin': (-0.012, 0.009), 'center': (-0.042, 0.032, 0.102), 'dir': (-0.34, 0.26, 0.90), 'radius': 0.018},
        {'origin': (-0.010, -0.011),'center': (-0.036, -0.038, 0.096),'dir': (-0.30, -0.32, 0.90),'radius': 0.018},
        {'origin': (0.011, -0.010), 'center': (0.038, -0.035, 0.098), 'dir': (0.32, -0.30, 0.90), 'radius': 0.018},
    ]

    skel_base, skel_norm, skel_orm = build_skeleton_textures(size=512)
    polyp_base, polyp_norm, polyp_orm, polyp_em = build_polyp_textures(size=512)

    skel_mat = build_pbr_material('Euphyllia_Skeleton_Mat', skel_base, skel_norm, skel_orm)
    polyp_mat = build_pbr_material('Euphyllia_Polyp_Mat', polyp_base, polyp_norm, polyp_orm, polyp_em, emissive_strength=0.45)

    root_obj = bpy.data.objects.new('Coral_Euphyllia_Torch', None)
    bpy.context.collection.objects.link(root_obj)

    skel_mesh = build_skeleton_mesh(heads, skel_mat)
    skel_obj = bpy.data.objects.new('Euphyllia_Skeleton', skel_mesh)
    skel_obj.parent = root_obj
    bpy.context.collection.objects.link(skel_obj)

    polyp_mesh = build_polyp_crown_mesh(heads, polyp_mat)
    polyp_obj = bpy.data.objects.new('Euphyllia_Polyp_Crown', polyp_mesh)
    polyp_obj.parent = root_obj
    bpy.context.collection.objects.link(polyp_obj)

    # Verify triangle counts and attributes before export
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
    primitives_summary = []
    for m in doc.get('meshes', []):
        for p in m.get('primitives', []):
            primitives_summary.append({
                'mesh': m.get('name'),
                'attributes': sorted(p.get('attributes', {}).keys()),
            })

    with open(glb_path, 'rb') as fp:
        sha256 = hashlib.sha256(fp.read()).hexdigest()

    report = {
        'asset': 'coral-euphyllia-torch',
        'archetype': 'C - Tentaculate LPS (Euphyllia glabrescens Torch Coral)',
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
