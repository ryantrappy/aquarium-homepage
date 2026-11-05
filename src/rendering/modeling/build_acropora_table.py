"""Build a realistic branching Acropora (Table / Corymbose SPS) coral colony in Blender 5.0.

Follows docs/modular-coral-and-live-rock-spec.md (Section 4.1 & 4.2):
- Flared encrusting basal skirt (`2.5 cm` margin) with lobed rock-hugging edge and contact AO.
- 4 branching generations (`34-46 deg` bifurcation, upward phototropic curl `+0.25`,
  branch radius tapering from `14 mm` at the trunk to `3.5 mm` at axial tips).
- Sculpted tubular radial corallite cups tilted `45 deg` toward the branch tips plus
  prominent apical corallite domes at every branch tip.
- Axial biological color gradient: zooxanthellae-rich cocoa-teal/olive-violet lower branches
  transitioning to vivid host-pigment pastel ice-blue (`#7CE8FF`) and neon violet (`#C86BFF`)
  axial growth tips (`COLOR_0.g > 0.75`).
- Standardized 4-channel `COLOR_0` vertex attribute (`R = 0.0` 100% rigid skeleton,
  `G = growthTipOrPolypMask`, `B = phaseSeed`, `A = contactAO`).

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_acropora_table.py -- /tmp/coral-models/coral-acropora-table
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
    return '/tmp/coral-models/coral-acropora-table'


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


def build_acropora_textures(size=512):
    # UV mapping convention:
    # u = circumferential coordinate around branch/corallite [0..1]
    # v = axial coordinate from encrusting base (0.0) -> mid branch (0.55) -> axial tip / corallite lip (1.0)
    def base_pixel(u, v):
        coenosteum_striation = 0.5 + 0.5 * math.sin(u * 28.0 * 2.0 * math.pi + v * 9.0)
        polyp_speckle = 0.5 + 0.5 * math.cos(u * 64.0 * math.pi - v * 48.0 * math.pi)
        # Symbiotic zooxanthellae base (cocoa-brown + deep reef teal) -> violet sub-tip -> ice-blue apical tip
        c_skirt = (0.32, 0.24, 0.22)      # encrusted basal skirt
        c_trunk = (0.26, 0.22, 0.16)      # rich cocoa-olive lower trunk
        c_mid   = (0.14, 0.44, 0.46)      # deep cyan-teal mid-branch tissue
        c_sub   = (0.64, 0.34, 0.88)      # vivid host-pigment lavender-violet sub-tip (#C86BFF)
        c_tip   = (0.54, 0.91, 1.00)      # calcifying pastel ice-blue apical tip (#7CE8FF)

        col = lerp_color(c_skirt, c_trunk, smoothstep(0.04, 0.22, v))
        col = lerp_color(col, c_mid, smoothstep(0.24, 0.58, v))
        col = lerp_color(col, c_sub, smoothstep(0.64, 0.82, v))
        col = lerp_color(col, c_tip, smoothstep(0.80, 0.94, v))

        micro = 0.88 + 0.10 * coenosteum_striation + 0.06 * polyp_speckle
        ao = lerp(0.58, 1.0, smoothstep(0.0, 0.18, v))
        return (col[0] * micro * ao, col[1] * micro * ao, col[2] * micro * ao, 1.0)

    def normal_pixel(u, v):
        # Fine longitudinal coenosteum spinules & porous corallite micro-velvet
        d_u = -math.cos(u * 32.0 * 2.0 * math.pi) * 0.38
        d_v = -math.sin(v * 64.0 * math.pi + u * 18.0) * 0.28
        nx = max(-1.0, min(1.0, d_u))
        ny = max(-1.0, min(1.0, d_v))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        # Spec Section 4.2: roughness = 0.42 micro-velvet polyp texture
        roughness = lerp(0.56, 0.38, smoothstep(0.15, 0.85, v))
        ao = lerp(0.32, 1.0, smoothstep(0.0, 0.22, v))
        return (ao, roughness, 0.0, 1.0)

    def emissive_pixel(u, v):
        # Subtle CFP/RFP fluorescence on axial tips and radial corallite rims
        tip_mask = smoothstep(0.68, 0.94, v)
        teal_mask = smoothstep(0.30, 0.65, v) * (1.0 - smoothstep(0.68, 0.85, v))
        r = tip_mask * 0.26 + teal_mask * 0.02
        g = tip_mask * 0.52 + teal_mask * 0.18
        b = tip_mask * 0.68 + teal_mask * 0.20
        return (r, g, b, 1.0)

    return (
        make_packed_image('acropora_base', size, size, base_pixel, non_color=False),
        make_packed_image('acropora_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('acropora_orm', size, size, orm_pixel, non_color=True),
        make_packed_image('acropora_emissive', size, size, emissive_pixel, non_color=False),
    )


def build_pbr_material(name, base_img, norm_img, orm_img, emissive_img):
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
    norm_node.inputs['Strength'].default_value = 0.9
    links.new(tex_norm.outputs['Color'], norm_node.inputs['Color'])
    links.new(norm_node.outputs['Normal'], bsdf.inputs['Normal'])

    tex_em = nodes.new('ShaderNodeTexImage')
    tex_em.image = emissive_img
    if 'Emission Color' in bsdf.inputs:
        links.new(tex_em.outputs['Color'], bsdf.inputs['Emission Color'])
    if 'Emission Strength' in bsdf.inputs:
        bsdf.inputs['Emission Strength'].default_value = 0.35

    return mat


def build_acropora_colony_mesh(mat):
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    def add_lofted_tube(rings, close_bottom=False, close_top=False, apical_cup=False):
        # Each ring: list of (Vector, u, v, rgba) of length n_seg + 1
        n_seg = len(rings[0]) - 1
        n_rings = len(rings)
        base_idx = len(verts)
        for r in range(n_rings):
            for j in range(n_seg):
                verts.append(tuple(rings[r][j][0]))

        for r in range(n_rings - 1):
            for j in range(n_seg):
                j_next = (j + 1) % n_seg
                v00 = base_idx + r * n_seg + j
                v10 = base_idx + r * n_seg + j_next
                v11 = base_idx + (r + 1) * n_seg + j_next
                v01 = base_idx + (r + 1) * n_seg + j
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

        if close_bottom:
            c_pos = sum((rings[0][j][0] for j in range(n_seg)), Vector((0.0, 0.0, 0.0))) / n_seg
            c_idx = len(verts)
            verts.append(tuple(c_pos))
            c_col = rings[0][0][3]
            for j in range(n_seg):
                j_next = (j + 1) % n_seg
                faces.append((c_idx, base_idx + j_next, base_idx + j))
                loop_uvs.extend([(0.5, rings[0][0][2]), (j_next / n_seg, rings[0][0][2]), (j / n_seg, rings[0][0][2])])
                loop_colors.extend([c_col, rings[0][j + 1][3], rings[0][j][3]])

        if close_top:
            top_r = n_rings - 1
            c_pos = sum((rings[top_r][j][0] for j in range(n_seg)), Vector((0.0, 0.0, 0.0))) / n_seg
            if apical_cup and n_rings >= 2:
                prev_pos = sum((rings[top_r - 1][j][0] for j in range(n_seg)), Vector((0.0, 0.0, 0.0))) / n_seg
                axis_d = (c_pos - prev_pos).normalized()
                # Recessed axial calice pit inside the apical corallite cylinder
                c_pos = c_pos - axis_d * 0.0018
            c_idx = len(verts)
            verts.append(tuple(c_pos))
            c_col = rings[top_r][0][3]
            for j in range(n_seg):
                j_next = (j + 1) % n_seg
                faces.append((c_idx, base_idx + top_r * n_seg + j, base_idx + top_r * n_seg + j_next))
                loop_uvs.extend([(0.5, 0.99), (j / n_seg, rings[top_r][0][2]), (j_next / n_seg, rings[top_r][0][2])])
                loop_colors.extend([c_col, rings[top_r][j][3], rings[top_r][j + 1][3]])

    # 1. Flared encrusting basal skirt (Spec Section 4.2: 2-3 cm wide flared skirt)
    n_skirt_seg = 24
    skirt_profiles = [
        (-0.004, 0.068, 0.00, 0.15),
        (0.002,  0.074, 0.04, 0.18),
        (0.010,  0.054, 0.10, 0.28),
        (0.020,  0.034, 0.18, 0.40),
        (0.030,  0.020, 0.24, 0.46),
        (0.038,  0.008, 0.28, 0.48),
    ]
    skirt_rings = []
    for z, rad, v_coord, ao in skirt_profiles:
        ring = []
        for j in range(n_skirt_seg + 1):
            u = j / n_skirt_seg
            theta = u * 2.0 * math.pi
            lobe_f = 1.0 - smoothstep(0.0, 0.032, z)
            lobe = 1.0 + lobe_f * (0.16 * math.sin(theta * 5.0 + 0.3) + 0.09 * math.cos(theta * 7.0 - 1.1))
            r_loc = rad * lobe
            pos = Vector((r_loc * math.cos(theta), r_loc * math.sin(theta), z))
            # COLOR_0: R=0.0 (rigid), G=0.0, B=0.05, A=ao
            ring.append((pos, u, v_coord, (0.0, 0.0, 0.05, ao)))
        skirt_rings.append(ring)
    add_lofted_tube(skirt_rings, close_bottom=True, close_top=True)

    # 2. Recursive bifurcation tree (4 generations, 34-46 deg divergence, upward phototropic curl +0.25)
    # Spec Section 4.2: branch radius tapering from 14 mm at trunk to 3.5 mm at axial tip
    branches = []

    def spawn_branch(p_start, direction, length, r_start, r_end, gen, max_gen, v_start, v_end, seed_id):
        dir_n = direction.normalized()
        # Upward phototropic curl (+0.25)
        curl_vec = Vector((0.0, 0.0, 0.25 + 0.08 * gen))
        p_mid = p_start + dir_n * (length * 0.52) + curl_vec * (length * 0.12)
        dir_end = (dir_n + curl_vec * 0.55).normalized()
        p_end = p_start + dir_n * (length * 0.48) + dir_end * (length * 0.52)

        is_terminal = (gen == max_gen)
        branches.append({
            'p0': p_start,
            'p1': p_mid,
            'p2': p_end,
            'r0': r_start,
            'r1': r_end,
            'v0': v_start,
            'v1': v_end,
            'gen': gen,
            'terminal': is_terminal,
            'seed': seed_id,
        })

        if not is_terminal:
            t_end, b1, b2 = frame_from_tangent(dir_end)
            # 2 or 3 daughter branches at 34-46 deg branching angle
            n_children = 3 if gen == 1 else 2
            base_twist = hash01(seed_id * 31 + 7) * 2.0 * math.pi
            for c_idx in range(n_children):
                child_seed = seed_id * 17 + c_idx * 53 + gen * 19
                azimuth = base_twist + (c_idx / n_children) * 2.0 * math.pi + 0.25 * (hash01(child_seed) - 0.5)
                # Branching angle between 34 and 46 degrees (0.59 to 0.80 rad)
                div_angle = math.radians(lerp(35.0, 45.0, hash01(child_seed + 11)))
                radial = math.cos(azimuth) * b1 + math.sin(azimuth) * b2
                # Slight corymbose table spread: horizontal components favored in mid generations, upward at tips
                child_dir = (t_end * math.cos(div_angle) + radial * math.sin(div_angle)).normalized()
                if gen >= 2:
                    child_dir = (child_dir + Vector((0.0, 0.0, 0.24))).normalized()

                child_len = length * lerp(0.74, 0.86, hash01(child_seed + 23))
                child_r0 = r_end * 0.94
                child_r1 = max(0.0035, r_end * (0.58 if gen < max_gen - 1 else 0.50))
                child_v0 = lerp(v_start, v_end, 0.82)
                child_v1 = 1.0 if (gen + 1 == max_gen) else min(0.88, child_v0 + 0.24)
                # Spawn from near end of parent branch
                spawn_pt = ((1.0 - 0.88) ** 2) * p_start + 2.0 * 0.12 * 0.88 * p_mid + (0.88 ** 2) * p_end
                spawn_branch(spawn_pt, child_dir, child_len, child_r0, child_r1, gen + 1, max_gen, child_v0, child_v1, child_seed)

    # 3 primary basal trunks radiating from the encrusting base into a rich table/staghorn thicket
    primary_specs = [
        (Vector((0.000, 0.000, 0.018)), Vector((0.08, 0.04, 0.95)),  0.056, 0.0140, 0.0092, 101),
        (Vector((0.014, -0.008, 0.016)), Vector((0.52, -0.22, 0.82)), 0.052, 0.0125, 0.0084, 203),
        (Vector((-0.014, 0.006, 0.016)), Vector((-0.48, 0.26, 0.84)), 0.052, 0.0125, 0.0084, 307),
    ]
    for p_start, d_init, length, r0, r1, seed in primary_specs:
        spawn_branch(p_start, d_init, length, r0, r1, gen=1, max_gen=4, v_start=0.22, v_end=0.48, seed_id=seed)

    # Also add 8 short peripheral basal branchlets emerging around the encrusting skirt
    for k in range(8):
        ang = (k / 8.0) * 2.0 * math.pi + 0.2
        p_b = Vector((0.036 * math.cos(ang), 0.036 * math.sin(ang), 0.014))
        d_b = Vector((0.55 * math.cos(ang), 0.55 * math.sin(ang), 0.84)).normalized()
        spawn_branch(p_b, d_b, 0.044, 0.0065, 0.0036, gen=4, max_gen=4, v_start=0.38, v_end=1.0, seed_id=900 + k)

    # Build each branch with 12-sided profile (Spec Section 4.2) + apical corallite tip + radial corallite cups
    n_branch_seg = 12
    corallite_counter = 0

    for b_idx, br in enumerate(branches):
        p0, p1, p2 = br['p0'], br['p1'], br['p2']
        r0, r1 = br['r0'], br['r1']
        v0, v1 = br['v0'], br['v1']
        phase_b = hash01(br['seed'] + b_idx * 13)
        n_steps = 8 if br['terminal'] else 6

        branch_rings = []
        for s_idx in range(n_steps):
            t = s_idx / (n_steps - 1)
            center = ((1.0 - t) ** 2) * p0 + 2.0 * (1.0 - t) * t * p1 + (t ** 2) * p2
            tangent = (2.0 * (1.0 - t) * (p1 - p0) + 2.0 * t * (p2 - p1)).normalized()
            _, b1, b2 = frame_from_tangent(tangent)

            v_coord = lerp(v0, v1, t)
            rad = lerp(r0, r1, t)
            # Apical corallite cylinder/dome shaping on terminal branches
            if br['terminal'] and s_idx == n_steps - 1:
                rad = r1 * 0.78  # slightly constricted apical calice rim

            # COLOR_0 contract (Spec Section 4.1 & 4.2):
            # R = 0.0 (100% rigid stony skeleton)
            # G = growthTipOrPolypMask (ramps to 1.0 on top 15% of branches)
            # B = phaseSeed
            # A = contactAO (0.28 in lower interior crotches -> 1.0 at exposed tips)
            growth_g = smoothstep(0.72, 0.88, v_coord)
            ao_a = lerp(0.28, 1.0, smoothstep(0.18, 0.85, v_coord))
            rgba = (0.0, growth_g, phase_b, ao_a)

            ring = []
            for j in range(n_branch_seg + 1):
                u = j / n_branch_seg
                theta = u * 2.0 * math.pi
                # Subtle organic cross-section undulation
                undul = 1.0 + 0.05 * math.sin(theta * 3.0 + t * 5.0)
                offset = (b1 * math.cos(theta) + b2 * math.sin(theta)) * (rad * undul)
                ring.append((center + offset, u, v_coord, rgba))
            branch_rings.append(ring)

        # If terminal branch, taper smoothly into a rounded dome-shaped apical corallite with recessed calice cup
        if br['terminal']:
            tangent = (2.0 * (p2 - p1)).normalized()
            _, b1, b2 = frame_from_tangent(tangent)
            for ext_len, rad_scale, ao_tip in [(0.0024, 0.72, 0.98), (0.0042, 0.46, 1.00)]:
                apical_center = p2 + tangent * ext_len
                apical_rad = r1 * rad_scale
                rgba_tip = (0.0, 1.0, phase_b, ao_tip)
                ring = []
                for j in range(n_branch_seg + 1):
                    u = j / n_branch_seg
                    theta = u * 2.0 * math.pi
                    offset = (b1 * math.cos(theta) + b2 * math.sin(theta)) * apical_rad
                    ring.append((apical_center + offset, u, 0.99, rgba_tip))
                branch_rings.append(ring)

        add_lofted_tube(branch_rings, close_bottom=True, close_top=True, apical_cup=br['terminal'])

        # Scatter tubular radial corallite cups tilted 45 deg toward the branch tip (Spec Section 4.2)
        n_radial_rings = 3 if br['terminal'] else 2
        cups_per_ring = 4 if br['gen'] >= 3 else 5
        for rr in range(n_radial_rings):
            t_cup = lerp(0.18, 0.84, (rr + 0.5) / n_radial_rings)
            c_pos = ((1.0 - t_cup) ** 2) * p0 + 2.0 * (1.0 - t_cup) * t_cup * p1 + (t_cup ** 2) * p2
            t_dir = (2.0 * (1.0 - t_cup) * (p1 - p0) + 2.0 * t_cup * (p2 - p1)).normalized()
            _, b1, b2 = frame_from_tangent(t_dir)
            branch_r = lerp(r0, r1, t_cup)
            v_cup_base = lerp(v0, v1, t_cup)

            for c_i in range(cups_per_ring):
                corallite_counter += 1
                # Spiral phyllotaxis arrangement around branch so cups never collide
                phi = (c_i / cups_per_ring) * 2.0 * math.pi + rr * 1.15 + phase_b * 6.283
                rad_out = math.cos(phi) * b1 + math.sin(phi) * b2
                # Tilted 45 degrees toward branch tip
                cup_axis = (rad_out * 0.7071 + t_dir * 0.7071).normalized()
                _, cb1, cb2 = frame_from_tangent(cup_axis)

                cup_root = c_pos + rad_out * (branch_r * 0.82)
                cup_len = 0.0034 * (0.85 + 0.30 * hash01(corallite_counter * 29))
                cup_r_base = 0.0019  # ~1.8-1.9 mm tubular cone
                cup_r_tip = 0.0013

                n_cup_seg = 6
                cup_rings = []
                for step_k, (frac, r_c, v_off, g_boost) in enumerate([
                    (0.0, cup_r_base, 0.00, 0.15),
                    (1.0, cup_r_tip,  0.14, 0.55),
                ]):
                    ring_center = cup_root + cup_axis * (cup_len * frac)
                    v_c = min(1.0, v_cup_base + v_off)
                    g_val = min(1.0, smoothstep(0.60, 0.85, v_c) + g_boost * smoothstep(0.45, 0.90, v_c))
                    ao_val = lerp(0.42, 0.96, frac)
                    rgba_c = (0.0, g_val, hash01(corallite_counter * 43), ao_val)
                    c_ring = []
                    for j in range(n_cup_seg + 1):
                        u = j / n_cup_seg
                        theta = u * 2.0 * math.pi
                        # Oblique nariform/tubular outer lip on the radial corallite
                        lip_ext = 1.0 + (0.28 * max(0.0, -math.cos(theta)) if step_k == 1 else 0.0)
                        off = (cb1 * math.cos(theta) + cb2 * math.sin(theta)) * r_c
                        pt = ring_center + off + cup_axis * (0.0007 * lip_ext if step_k == 1 else 0.0)
                        c_ring.append((pt, u, v_c, rgba_c))
                    cup_rings.append(c_ring)
                add_lofted_tube(cup_rings, close_bottom=True, close_top=True, apical_cup=True)

    mesh = bpy.data.meshes.new('Acropora_Table_Colony')
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

    base_img, norm_img, orm_img, em_img = build_acropora_textures(size=512)
    mat = build_pbr_material('Acropora_Table_Mat', base_img, norm_img, orm_img, em_img)

    mesh = build_acropora_colony_mesh(mat)
    obj = bpy.data.objects.new('Coral_Acropora_Table', mesh)
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
        'asset': 'coral-acropora-table',
        'archetype': 'A - Branching SPS (Acropora Corymbose/Table Colony)',
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
