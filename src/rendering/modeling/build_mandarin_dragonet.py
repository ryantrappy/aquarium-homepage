"""
Build a photorealistic, anatomically sculpted, rigged and animated Mandarin Dragonet
(Synchiropus splendidus) in Blender 5.0 exercising the `benthic_percher_dragonet` rig
archetype with procedural 1024x1024 PBR textures (BaseColor, Tangent Normal, Packed
ORM with glTF Occlusion), psychedelic vermiculated orange/teal/sapphire-blue labyrinth
bands outlined in black, protruding dorsal turret eyes with crimson-gold irises, tall
first dorsal spine pennant, broad splayed benthic pelvic fans, large rounded pectoral
hovering fans, and a looping 48-frame dragonet hovering swim animation.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_mandarin_dragonet.py -- /tmp/fish-models/fish-mandarin-dragonet
"""

import hashlib
import json
import math
import os
import sys

import bpy
from mathutils import Vector


def parse_args():
    argv = sys.argv
    if '--' not in argv:
        raise SystemExit('Usage: blender --threads 4 -b --python build_mandarin_dragonet.py -- <output_prefix>')
    user_args = argv[argv.index('--') + 1:]
    if not user_args:
        raise SystemExit('Expected output prefix after --')
    return os.path.abspath(user_args[-1])


def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def smoothstep(edge0, edge1, x):
    if edge1 <= edge0:
        return 1.0 if x >= edge1 else 0.0
    t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_color(c0, c1, t):
    return (
        lerp(c0[0], c1[0], t),
        lerp(c0[1], c1[1], t),
        lerp(c0[2], c1[2], t),
    )


def hash2(ix, iy):
    n = (ix * 374761393 + iy * 668265263) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFFFFFF) / 4294967295.0


def value_noise2(x, y):
    ix = int(math.floor(x))
    iy = int(math.floor(y))
    fx = x - ix
    fy = y - iy
    ux = fx * fx * (3.0 - 2.0 * fx)
    uy = fy * fy * (3.0 - 2.0 * fy)
    v00 = hash2(ix, iy)
    v10 = hash2(ix + 1, iy)
    v01 = hash2(ix, iy + 1)
    v11 = hash2(ix + 1, iy + 1)
    return lerp(lerp(v00, v10, ux), lerp(v01, v11, ux), uy)


def fbm2(x, y):
    return (
        0.55 * value_noise2(x, y)
        + 0.30 * value_noise2(x * 2.1 + 3.7, y * 2.1 + 1.9)
        + 0.15 * value_noise2(x * 4.3 + 8.1, y * 4.3 + 5.3)
    )


def create_packed_image(name, width, height, pixels, is_data=False):
    img = bpy.data.images.new(name=name, width=width, height=height, alpha=True, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color' if is_data else 'sRGB'
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def evaluate_dragonet_labyrinth(u, z):
    """
    Evaluate the psychedelic Synchiropus splendidus vermiculated labyrinth pattern:
    wavy interlocking bands of tangerine-orange, emerald-teal, and electric sapphire-blue
    separated by crisp jet-black hairline borders.
    """
    warp1 = fbm2(u * 9.5 + 1.3, z * 9.5 + 4.7) - 0.5
    warp2 = fbm2(u * 14.0 + 6.1, z * 14.0 + 2.9) - 0.5
    phase = (u * 5.2 + z * 2.6 + 0.58 * warp1 + 0.25 * warp2) * 2.0 * math.pi
    wave = math.sin(phase)

    # Blue labyrinth band when wave > 0.28, black border around wave in [0.14, 0.28], orange/teal background when wave < 0.14
    blue_band = smoothstep(0.24, 0.34, wave)
    black_rim = smoothstep(0.08, 0.18, wave) * (1.0 - smoothstep(0.24, 0.34, wave))
    teal_patch = smoothstep(-0.85, -0.35, math.cos(phase * 0.65 + 1.8 * warp2))
    return blue_band, black_rim, teal_patch, wave


def build_mandarin_textures(size=1024):
    """
    Build 1024x1024 BaseColor, Tangent Normal, and Packed ORM atlases for Synchiropus splendidus:
      - Body UV island:   u in [0.02, 0.98], v in [0.04, 0.60]
      - Fin UV island:    u in [0.02, 0.78], v in [0.66, 0.96]
      - Eye UV island:    polar disc around (0.90, 0.83) with crimson-magenta dragonet iris
    """
    base_pixels = [0.0] * (size * size * 4)
    norm_pixels = [0.0] * (size * size * 4)
    orm_pixels = [0.0] * (size * size * 4)

    c_tangerine = (0.96, 0.35, 0.025)       # Psychedelic tangerine-orange base
    c_emerald_teal = (0.045, 0.64, 0.42)    # Vivid emerald-turquoise head & flank patches
    c_sapphire_blue = (0.025, 0.28, 0.96)   # Electric cobalt-sapphire labyrinth bands & fin rims
    c_cyan_highlight = (0.12, 0.72, 0.99)   # Iridescent sky-cyan center inside blue bands
    c_jet_black = (0.015, 0.012, 0.022)     # Crisp black outline around blue bands

    for py in range(size):
        v = (py + 0.5) / size
        row_off = py * size * 4
        for px in range(size):
            u = (px + 0.5) / size
            idx = row_off + px * 4

            r, g, b = c_tangerine
            nx, ny, nz = 0.0, 0.0, 1.0
            ao = 1.0
            rough = 0.20
            metal = 0.04

            if v <= 0.63:
                # --- BODY UV ISLAND ---
                u_body = clamp((u - 0.02) / 0.96, 0.0, 1.0)
                z_norm = clamp((v - 0.04) / 0.56, 0.0, 1.0)

                blue_b, black_r, teal_p, wave = evaluate_dragonet_labyrinth(u_body, z_norm)
                # Head region (u_body < 0.28) has more turquoise-green with diagonal royal-blue cheek bars
                head_teal = (1.0 - smoothstep(0.16, 0.32, u_body)) * 0.72
                bg_col = lerp_color(c_tangerine, c_emerald_teal, clamp(teal_p * 0.68 + head_teal, 0.0, 1.0))

                cyan_core = smoothstep(0.68, 0.95, wave)
                blue_col = lerp_color(c_sapphire_blue, c_cyan_highlight, cyan_core * 0.55)

                col = lerp_color(bg_col, blue_col, blue_b)
                col = lerp_color(col, c_jet_black, black_r)

                r, g, b = col
                # Smooth mucus-coated scaleless dragonet skin with subtle labyrinth relief
                nx = -math.cos(wave * 3.14) * 0.06 * black_r
                ny = math.sin(wave * 3.14) * 0.06 * black_r
                ao = 1.0 - 0.12 * black_r
                rough = lerp(0.22, 0.16, blue_b)

            elif u >= 0.80 and v >= 0.64:
                # --- EYE UV ISLAND (Vivid crimson-ruby iris with golden inner ring) ---
                du = (u - 0.90) / 0.075
                dv = (v - 0.83) / 0.075
                r_eye = math.sqrt(du * du + dv * dv)
                ang = math.atan2(dv, du)

                pupil_m = 1.0 - smoothstep(0.34, 0.40, r_eye)
                iris_m = smoothstep(0.34, 0.40, r_eye) * (1.0 - smoothstep(0.76, 0.86, r_eye))
                gold_ring = smoothstep(0.36, 0.44, r_eye) * (1.0 - smoothstep(0.46, 0.54, r_eye))
                fiber = 0.5 + 0.5 * math.sin(ang * 24.0)
                iris_col = lerp_color((0.76, 0.04, 0.08), (0.98, 0.22, 0.06), fiber * 0.65)
                iris_col = lerp_color(iris_col, (1.00, 0.82, 0.12), gold_ring * 0.85)

                col = lerp_color(c_sapphire_blue, iris_col, iris_m)
                col = lerp_color(col, (0.01, 0.01, 0.015), pupil_m)

                spec_d = math.sqrt((du + 0.14) ** 2 + (dv - 0.16) ** 2)
                spec_m = 1.0 - smoothstep(0.03, 0.10, spec_d)
                col = lerp_color(col, (1.0, 0.99, 0.96), spec_m * 0.92)

                r, g, b = col
                rough = 0.04
                ao = 1.0 - 0.16 * smoothstep(0.78, 1.0, r_eye)

            else:
                # --- FIN UV ISLAND (Psychedelic orange-and-sapphire striped fans with cobalt margin) ---
                s_ray = clamp((u - 0.02) / 0.76, 0.0, 1.0)
                t_rad = clamp((v - 0.66) / 0.30, 0.0, 1.0)

                ray_wave = math.cos(s_ray * 22.0 * 2.0 * math.pi)
                ray_ridge = 0.5 + 0.5 * ray_wave

                band_wave = math.sin((t_rad * 3.2 + 0.25 * math.sin(s_ray * 12.0)) * 2.0 * math.pi)
                in_blue_band = smoothstep(0.20, 0.45, band_wave)
                in_black_edge = smoothstep(-0.05, 0.18, band_wave) * (1.0 - in_blue_band)
                outer_cobalt = smoothstep(0.78, 0.88, t_rad)

                col = lerp_color(c_tangerine, (0.99, 0.55, 0.06), ray_ridge * 0.60)
                col = lerp_color(col, c_sapphire_blue, max(in_blue_band * 0.88, outer_cobalt * 0.95))
                col = lerp_color(col, c_jet_black, in_black_edge * 0.85)

                r, g, b = col
                nx = -math.sin(s_ray * 22.0 * 2.0 * math.pi) * 0.24
                ny = 0.05
                ao = lerp(0.84, 1.0, smoothstep(0.0, 0.25, t_rad))
                rough = lerp(0.32, 0.20, ray_ridge)

            n_len = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
            base_pixels[idx] = clamp(r)
            base_pixels[idx + 1] = clamp(g)
            base_pixels[idx + 2] = clamp(b)
            base_pixels[idx + 3] = 1.0

            norm_pixels[idx] = clamp(0.5 + 0.5 * (nx / n_len))
            norm_pixels[idx + 1] = clamp(0.5 + 0.5 * (ny / n_len))
            norm_pixels[idx + 2] = clamp(0.5 + 0.5 * (nz / n_len))
            norm_pixels[idx + 3] = 1.0

            orm_pixels[idx] = clamp(ao)
            orm_pixels[idx + 1] = clamp(rough)
            orm_pixels[idx + 2] = clamp(metal)
            orm_pixels[idx + 3] = 1.0

    base_img = create_packed_image('MandarinDragonet_BaseColor', size, size, base_pixels, is_data=False)
    norm_img = create_packed_image('MandarinDragonet_Normal', size, size, norm_pixels, is_data=True)
    orm_img = create_packed_image('MandarinDragonet_ORM', size, size, orm_pixels, is_data=True)
    return base_img, norm_img, orm_img


def build_pbr_fish_material(name, base_img, norm_img, orm_img):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out_node = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Metallic'].default_value = 0.0
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.56
    links.new(bsdf.outputs['BSDF'], out_node.inputs['Surface'])

    tex_base = nodes.new('ShaderNodeTexImage')
    tex_base.image = base_img
    links.new(tex_base.outputs['Color'], bsdf.inputs['Base Color'])

    tex_orm = nodes.new('ShaderNodeTexImage')
    tex_orm.image = orm_img
    sep = nodes.new('ShaderNodeSeparateColor')
    links.new(tex_orm.outputs['Color'], sep.inputs['Color'])
    links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])

    gltf_group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    gltf_group.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    gltf_node = nodes.new('ShaderNodeGroup')
    gltf_node.node_tree = gltf_group
    gltf_node.name = 'glTF Material Output'
    links.new(sep.outputs['Red'], gltf_node.inputs['Occlusion'])

    tex_norm = nodes.new('ShaderNodeTexImage')
    tex_norm.image = norm_img
    norm_node = nodes.new('ShaderNodeNormalMap')
    norm_node.inputs['Strength'].default_value = 0.45
    links.new(tex_norm.outputs['Color'], norm_node.inputs['Color'])
    links.new(norm_node.outputs['Normal'], bsdf.inputs['Normal'])

    return mat


def evaluate_mandarin_profile(s):
    """
    Return (y_pos, z_dorsal, z_ventral, half_width) in canonical meters for Synchiropus splendidus.
      - Snout at y = -0.038 m, caudal peduncle end at y = +0.022 m (total length with rounded paddle tail ~7.8 cm).
      - Broad, sub-cylindrical benthic head/thorax with flattened ventral belly and tapering trunk.
    """
    y_snout = -0.038
    y_peduncle = 0.022
    y = lerp(y_snout, y_peduncle, s)

    if s < 0.32:
        u = s / 0.32
        z_top = -0.0018 * (1.0 - u) + 0.0102 * (math.sin(u * math.pi * 0.5) ** 0.58)
    elif s < 0.90:
        u = (s - 0.32) / 0.58
        z_top = lerp(0.0102, 0.0046, smoothstep(0.0, 1.0, u ** 1.08))
    else:
        u = (s - 0.90) / 0.10
        z_top = lerp(0.0046, 0.0022, smoothstep(0.0, 1.0, u))

    if s < 0.34:
        u = s / 0.34
        z_bot = -0.0022 * (1.0 - u) - 0.0082 * (math.sin(u * math.pi * 0.5) ** 0.52)
    elif s < 0.90:
        u = (s - 0.34) / 0.56
        z_bot = lerp(-0.0082, -0.0044, smoothstep(0.0, 1.0, u ** 1.05))
    else:
        u = (s - 0.90) / 0.10
        z_bot = lerp(-0.0044, -0.0020, smoothstep(0.0, 1.0, u))

    # Broad dragonet head & gill cheeks (~9.6 mm half-width = 1.92 cm wide!) tapering toward peduncle
    if s < 0.28:
        u = s / 0.28
        half_w = 0.0096 * (math.sin(u * math.pi * 0.5) ** 0.54)
    elif s < 0.90:
        u = (s - 0.28) / 0.62
        half_w = lerp(0.0096, 0.0024, smoothstep(0.0, 1.0, u ** 0.95))
    else:
        u = (s - 0.90) / 0.10
        half_w = lerp(0.0024, 0.00018, smoothstep(0.0, 1.0, u))

    return y, z_top, z_bot, half_w


def append_double_sided_fin(verts, faces, loop_uvs, vert_weights, columns):
    n_cols = len(columns)
    m_rows = len(columns[0])
    base_v = len(verts)

    for sign in (1.0, -1.0):
        for c_i in range(n_cols):
            for r_j in range(m_rows):
                pos, n_vec, half_t, s_ray, t_rad, w_dict = columns[c_i][r_j]
                ray_rib = 0.5 + 0.5 * math.cos(s_ray * 22.0 * 2.0 * math.pi)
                t_actual = half_t * (0.78 + 0.38 * ray_rib)
                pt = pos + n_vec * (sign * t_actual)
                verts.append((pt.x, pt.y, pt.z))
                vert_weights.append(w_dict)

    stride = n_cols * m_rows

    def v_idx(side, c, r):
        return base_v + side * stride + c * m_rows + r

    def uv_at(c, r):
        _, _, _, s_ray, t_rad, _ = columns[c][r]
        return (0.02 + 0.76 * clamp(s_ray), 0.66 + 0.30 * clamp(t_rad))

    for c in range(n_cols - 1):
        for r in range(m_rows - 1):
            uv00 = uv_at(c, r)
            uv10 = uv_at(c + 1, r)
            uv11 = uv_at(c + 1, r + 1)
            uv01 = uv_at(c, r + 1)

            faces.append((v_idx(0, c, r), v_idx(0, c + 1, r), v_idx(0, c + 1, r + 1), v_idx(0, c, r + 1)))
            loop_uvs.extend([uv00, uv10, uv11, uv01])

            faces.append((v_idx(1, c, r), v_idx(1, c, r + 1), v_idx(1, c + 1, r + 1), v_idx(1, c + 1, r)))
            loop_uvs.extend([uv00, uv01, uv11, uv10])

    r_top = m_rows - 1
    for c in range(n_cols - 1):
        uv0 = uv_at(c, r_top)
        uv1 = uv_at(c + 1, r_top)
        faces.append((v_idx(0, c, r_top), v_idx(0, c + 1, r_top), v_idx(1, c + 1, r_top), v_idx(1, c, r_top)))
        loop_uvs.extend([uv0, uv1, uv1, uv0])

    for r in range(m_rows - 1):
        uv_a = uv_at(0, r)
        uv_b = uv_at(0, r + 1)
        faces.append((v_idx(0, 0, r), v_idx(0, 0, r + 1), v_idx(1, 0, r + 1), v_idx(1, 0, r)))
        loop_uvs.extend([uv_a, uv_b, uv_b, uv_a])

        c_last = n_cols - 1
        uv_c = uv_at(c_last, r)
        uv_d = uv_at(c_last, r + 1)
        faces.append((v_idx(0, c_last, r + 1), v_idx(0, c_last, r), v_idx(1, c_last, r), v_idx(1, c_last, r + 1)))
        loop_uvs.extend([uv_d, uv_c, uv_c, uv_d])


def spine_weight_for_y(y):
    joints = [-0.038, -0.016, 0.000, 0.011, 0.022, 0.040]
    centers = [0.5 * (joints[i] + joints[i + 1]) for i in range(len(joints) - 1)]
    if y <= -0.010:
        return {'spine_0': 1.0}
    progress = smoothstep(-0.010, 0.036, y)
    pos = 1.0 + progress * (len(centers) - 2)
    pos = clamp(pos, 0.0, len(centers) - 1.0)
    lo = int(pos)
    hi = min(len(centers) - 1, lo + 1)
    blend = pos - lo
    if lo == hi or blend <= 1e-6:
        return {f'spine_{lo}': 1.0}
    return {f'spine_{lo}': 1.0 - blend, f'spine_{hi}': blend}


def build_mandarin_mesh_and_rig(mat):
    verts = []
    faces = []
    loop_uvs = []
    vert_weights = []

    n_rings = 92
    n_seg = 60
    body_base = len(verts)

    ring_uvs = []
    for r_i in range(n_rings):
        s = ((r_i + 0.35) / (n_rings - 0.65)) ** 1.10
        y_ring, z_top, z_bot, half_w = evaluate_mandarin_profile(s)
        w_dict = spine_weight_for_y(y_ring)

        z_center = 0.5 * (z_top + z_bot)
        z_half = max(1e-4, 0.5 * (z_top - z_bot))

        ring_uv_row = []
        for j in range(n_seg):
            theta = (j / n_seg) * 2.0 * math.pi
            cos_t = math.cos(theta)
            sin_t = math.sin(theta)

            py = y_ring
            # Flatten ventral belly slightly for benthic perching posture
            belly_flat = 1.0 - 0.18 * (smoothstep(0.0, -1.0, cos_t) ** 2) * (1.0 - smoothstep(0.45, 0.85, s))
            pz = z_center + z_half * cos_t * belly_flat

            # Broad rounded dragonet cheeks & supraorbital turret ridges
            cheek_swell = 1.0 + 0.14 * (sin_t ** 2) * smoothstep(-0.6, 0.2, cos_t) * (1.0 - smoothstep(0.18, 0.42, s))
            px = half_w * sin_t * cheek_swell

            # Raised supraorbital turret socket around dorsal-facing eyes (s ~ 0.145, cos_t ~ 0.62)
            eye_ds = (s - 0.145) / 0.048
            eye_dc = (cos_t - 0.62) / 0.28
            eye_r2 = eye_ds * eye_ds + eye_dc * eye_dc
            if eye_r2 < 1.8 and abs(sin_t) > 0.25:
                turret_bump = 0.0014 * math.exp(-eye_r2 * 1.4)
                pz += turret_bump * 0.75
                px += (1.0 if sin_t > 0 else -1.0) * turret_bump * 0.55

            verts.append((px, py, pz))
            vert_weights.append(w_dict)

            u_uv = 0.02 + 0.96 * s
            z_norm = clamp(0.5 * (1.0 + cos_t), 0.0, 1.0)
            v_uv = 0.04 + 0.56 * z_norm
            ring_uv_row.append((u_uv, v_uv))
        ring_uvs.append(ring_uv_row)

    for r_i in range(n_rings - 1):
        b0 = body_base + r_i * n_seg
        b1 = body_base + (r_i + 1) * n_seg
        for j in range(n_seg):
            jn = (j + 1) % n_seg
            faces.append((b0 + j, b0 + jn, b1 + jn, b1 + j))
            loop_uvs.extend([
                ring_uvs[r_i][j],
                ring_uvs[r_i][jn],
                ring_uvs[r_i + 1][jn],
                ring_uvs[r_i + 1][j],
            ])

    snout_c_idx = len(verts)
    verts.append((0.0, -0.0380, -0.0020))
    vert_weights.append({'spine_0': 1.0})
    for j in range(n_seg):
        jn = (j + 1) % n_seg
        faces.append((snout_c_idx, body_base + jn, body_base + j))
        loop_uvs.extend([(0.02, 0.30), ring_uvs[0][jn], ring_uvs[0][j]])

    tail_c_idx = len(verts)
    verts.append((0.0, 0.0221, 0.0))
    vert_weights.append({'spine_4': 1.0})
    last_b = body_base + (n_rings - 1) * n_seg
    for j in range(n_seg):
        jn = (j + 1) % n_seg
        faces.append((tail_c_idx, last_b + j, last_b + jn))
        loop_uvs.extend([(0.98, 0.32), ring_uvs[-1][j], ring_uvs[-1][jn]])

    # =========================================================================
    # 2. PROTRUDING DORSAL TURRET EYES (Signature Synchiropus frog-like eyes)
    # =========================================================================
    s_eye = 0.145
    y_eye, z_top_e, _, hw_e = evaluate_mandarin_profile(s_eye)
    z_eye = z_top_e * 0.78
    x_eye = hw_e * 0.68
    r_eye_globe = 0.0034

    for side_sign in (1.0, -1.0):
        eye_center = Vector((side_sign * x_eye, y_eye, z_eye))
        eye_axis = Vector((side_sign * 0.82, -0.26, 0.50)).normalized()
        up_ref = Vector((0.0, 0.0, 1.0))
        tan_u = up_ref.cross(eye_axis).normalized()
        tan_v = eye_axis.cross(tan_u).normalized()

        n_e_rings = 8
        n_e_seg = 24
        eye_base = len(verts)
        apex = eye_center + eye_axis * (r_eye_globe * 0.72)
        verts.append((apex.x, apex.y, apex.z))
        vert_weights.append({'spine_0': 1.0})

        eye_uv_rings = []
        for er in range(1, n_e_rings + 1):
            frac = er / n_e_rings
            phi = frac * (math.pi * 0.48)
            sin_p = math.sin(phi)
            cos_p = math.cos(phi)
            uv_row = []
            for ej in range(n_e_seg):
                ang = (ej / n_e_seg) * 2.0 * math.pi
                radial_vec = (tan_u * math.cos(ang) + tan_v * math.sin(ang)) * (sin_p * r_eye_globe)
                axial_vec = eye_axis * (cos_p * r_eye_globe * 0.72)
                pt = eye_center + axial_vec + radial_vec
                verts.append((pt.x, pt.y, pt.z))
                vert_weights.append({'spine_0': 1.0})
                u_e = 0.90 + 0.073 * frac * math.cos(ang) * side_sign
                v_e = 0.83 + 0.073 * frac * math.sin(ang)
                uv_row.append((u_e, v_e))
            eye_uv_rings.append(uv_row)

        for ej in range(n_e_seg):
            ejn = (ej + 1) % n_e_seg
            v1 = eye_base + 1 + ej
            v2 = eye_base + 1 + ejn
            faces.append((eye_base, v1, v2))
            loop_uvs.extend([(0.90, 0.83), eye_uv_rings[0][ej], eye_uv_rings[0][ejn]])

        for er in range(n_e_rings - 1):
            eb0 = eye_base + 1 + er * n_e_seg
            eb1 = eye_base + 1 + (er + 1) * n_e_seg
            for ej in range(n_e_seg):
                ejn = (ej + 1) % n_e_seg
                faces.append((eb0 + ej, eb1 + ej, eb1 + ejn, eb0 + ejn))
                loop_uvs.extend([
                    eye_uv_rings[er][ej],
                    eye_uv_rings[er + 1][ej],
                    eye_uv_rings[er + 1][ejn],
                    eye_uv_rings[er][ejn],
                ])

    # =========================================================================
    # 3A. FIRST DORSAL FIN WITH TALL ANTERIOR SPINE PENNANT
    # =========================================================================
    n_d1_cols = 14
    m_d1_rows = 7
    d1_cols = []
    for c_i in range(n_d1_cols):
        s_ray = c_i / (n_d1_cols - 1)
        s_body = lerp(0.27, 0.43, s_ray)
        y_b, z_top_b, _, _ = evaluate_mandarin_profile(s_body)

        pennant = (math.sin(clamp(s_ray * 1.1, 0.05, 0.98) * math.pi) ** 0.50) * (1.35 - 0.70 * s_ray)
        fin_h = 0.0155 * pennant
        sweep_y = 0.0020 + 0.0075 * (1.0 - 0.3 * s_ray)

        col = []
        for r_j in range(m_d1_rows):
            t_rad = r_j / (m_d1_rows - 1)
            py = y_b + sweep_y * (t_rad ** 1.25)
            pz = z_top_b - 0.0014 + fin_h * (t_rad ** 0.88)
            half_t = lerp(0.00070, 0.00014, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        d1_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, d1_cols)

    # =========================================================================
    # 3B. SECOND ROUNDED FAN DORSAL FIN
    # =========================================================================
    n_d2_cols = 20
    m_d2_rows = 7
    d2_cols = []
    for c_i in range(n_d2_cols):
        s_ray = c_i / (n_d2_cols - 1)
        s_body = lerp(0.47, 0.80, s_ray)
        y_b, z_top_b, _, _ = evaluate_mandarin_profile(s_body)

        arch = (math.sin(s_ray * math.pi) ** 0.55) * (0.88 + 0.25 * s_ray)
        fin_h = 0.0110 * arch
        sweep_y = 0.0018 + 0.0075 * (s_ray ** 1.2)

        col = []
        for r_j in range(m_d2_rows):
            t_rad = r_j / (m_d2_rows - 1)
            py = y_b + sweep_y * (t_rad ** 1.15)
            pz = z_top_b - 0.0014 + fin_h * (t_rad ** 0.90)
            half_t = lerp(0.00070, 0.00014, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        d2_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, d2_cols)

    # =========================================================================
    # 4. ROUNDED ANAL FIN
    # =========================================================================
    n_anal_cols = 18
    m_anal_rows = 6
    anal_cols = []
    for c_i in range(n_anal_cols):
        s_ray = c_i / (n_anal_cols - 1)
        s_body = lerp(0.50, 0.80, s_ray)
        y_b, _, z_bot_b, _ = evaluate_mandarin_profile(s_body)

        arch = math.sin(s_ray * math.pi) ** 0.58
        fin_h = 0.0092 * arch
        sweep_y = 0.0015 + 0.0068 * s_ray

        col = []
        for r_j in range(m_anal_rows):
            t_rad = r_j / (m_anal_rows - 1)
            py = y_b + sweep_y * (t_rad ** 1.12)
            pz = z_bot_b + 0.0014 - fin_h * (t_rad ** 0.90)
            half_t = lerp(0.00065, 0.00014, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        anal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, anal_cols)

    # =========================================================================
    # 5. ROUNDED PADDLE CAUDAL FIN
    # =========================================================================
    n_caudal_cols = 26
    m_caudal_rows = 8
    caudal_cols = []
    y_ped, z_top_p, z_bot_p, hw_ped = evaluate_mandarin_profile(0.90)
    for c_i in range(n_caudal_cols):
        s_ray = c_i / (n_caudal_cols - 1)
        ang = lerp(-0.62, 0.62, s_ray)
        z_root = lerp(z_bot_p * 0.98, z_top_p * 0.98, s_ray)
        center_convex = 0.80 + 0.28 * math.cos((s_ray - 0.5) * math.pi * 1.15)
        ray_len = 0.0195 * center_convex

        col = []
        for r_j in range(m_caudal_rows):
            t_rad = r_j / (m_caudal_rows - 1)
            py = y_ped + ray_len * t_rad * math.cos(ang * 0.50)
            pz = z_root + ray_len * (t_rad ** 0.94) * math.sin(ang)
            base_t = hw_ped * 0.96 * math.sqrt(max(0.12, 1.0 - 0.78 * ((s_ray - 0.5) * 2.0) ** 2))
            half_t = lerp(base_t, 0.00018, t_rad ** 0.65)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        caudal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, caudal_cols)

    # =========================================================================
    # 6. LARGE ROUNDED HOVERING PECTORAL FINS
    # =========================================================================
    s_pect = 0.295
    y_pect, _, _, hw_pect = evaluate_mandarin_profile(s_pect)
    z_pect = -0.0010
    x_pect = hw_pect * 0.88

    for side_label, side_sign in (('L', 1.0), ('R', -1.0)):
        n_p_cols = 20
        m_p_rows = 7
        p_cols = []
        bone_name = f'pectoral_{side_label}'
        for c_i in range(n_p_cols):
            s_ray = c_i / (n_p_cols - 1)
            ang = lerp(-0.74, 0.74, s_ray)
            dome = math.sin(s_ray * math.pi) ** 0.52
            ray_len = 0.0088 + 0.0085 * dome
            z_root_off = lerp(-0.0022, 0.0022, s_ray)

            col = []
            for r_j in range(m_p_rows):
                t_rad = r_j / (m_p_rows - 1)
                out_x = side_sign * (x_pect + ray_len * t_rad * (0.34 + 0.08 * dome) + 0.0010 * math.sin(t_rad * math.pi))
                back_y = y_pect + ray_len * t_rad * 0.88 * math.cos(ang * 0.55)
                up_z = z_pect + z_root_off + ray_len * (t_rad ** 0.95) * math.sin(ang)
                n_vec = Vector((side_sign * 0.90, -0.35, 0.15)).normalized()
                half_t = lerp(0.00065, 0.00014, t_rad)
                w_fin = smoothstep(0.05, 0.30, t_rad)
                w_dict = {bone_name: w_fin, 'spine_1': 1.0 - w_fin} if w_fin < 0.999 else {bone_name: 1.0}
                col.append((Vector((out_x, back_y, up_z)), n_vec, half_t, s_ray, t_rad, w_dict))
            p_cols.append(col)
        append_double_sided_fin(verts, faces, loop_uvs, vert_weights, p_cols)

    # =========================================================================
    # 7. BROAD SPLAYED BENTHIC PERCHING PELVIC FANS (Anterior to pectorals!)
    # =========================================================================
    s_pelv = 0.235
    y_pelv, _, z_bot_pelv, hw_pelv = evaluate_mandarin_profile(s_pelv)
    for side_sign in (1.0, -1.0):
        n_v_cols = 14
        m_v_rows = 6
        v_cols = []
        for c_i in range(n_v_cols):
            s_ray = c_i / (n_v_cols - 1)
            dome = math.sin(s_ray * math.pi) ** 0.50
            ray_len = 0.0085 + 0.0075 * dome
            col = []
            for r_j in range(m_v_rows):
                t_rad = r_j / (m_v_rows - 1)
                px = side_sign * (hw_pelv * 0.55 + ray_len * t_rad * (0.52 + 0.25 * dome))
                py = y_pelv + 0.0045 * s_ray + ray_len * t_rad * 0.65
                pz = z_bot_pelv + 0.0016 - ray_len * t_rad * 0.52
                n_vec = Vector((side_sign * 0.65, -0.25, -0.72)).normalized()
                half_t = lerp(0.00065, 0.00014, t_rad)
                col.append((Vector((px, py, pz)), n_vec, half_t, s_ray, t_rad, {'spine_1': 1.0}))
            v_cols.append(col)
        append_double_sided_fin(verts, faces, loop_uvs, vert_weights, v_cols)

    # =========================================================================
    # 8. BUILD MESH, UVS, ARMATURE & 48-FRAME DRAGONET HOVER ANIMATION
    # =========================================================================
    mesh = bpy.data.meshes.new('Mandarin_Dragonet_Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = uv

    mesh.materials.append(mat)

    fish_obj = bpy.data.objects.new('Mandarin_Dragonet', mesh)
    bpy.context.collection.objects.link(fish_obj)

    arm_data = bpy.data.armatures.new('Mandarin_Dragonet_Rig')
    arm_obj = bpy.data.objects.new('Mandarin_Dragonet_Armature', arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')

    joint_y = [-0.038, -0.016, 0.000, 0.011, 0.022, 0.040]
    spine_bones = []
    for i in range(len(joint_y) - 1):
        b = arm_data.edit_bones.new(f'spine_{i}')
        b.head = (0.0, joint_y[i], 0.0)
        b.tail = (0.0, joint_y[i + 1], 0.0)
        if spine_bones:
            b.parent = spine_bones[-1]
            b.use_connect = True
        spine_bones.append(b)

    for side_label, side_sign in (('L', 1.0), ('R', -1.0)):
        pb = arm_data.edit_bones.new(f'pectoral_{side_label}')
        pb.head = (side_sign * x_pect, y_pect, z_pect)
        pb.tail = (side_sign * (x_pect + 0.009), y_pect + 0.013, z_pect + 0.002)
        pb.parent = spine_bones[1]

    bpy.ops.object.mode_set(mode='OBJECT')

    all_bone_names = [f'spine_{i}' for i in range(len(joint_y) - 1)] + ['pectoral_L', 'pectoral_R']
    vgroups = {name: fish_obj.vertex_groups.new(name=name) for name in all_bone_names}
    for v_idx, w_dict in enumerate(vert_weights):
        for b_name, w_val in w_dict.items():
            if w_val > 1e-5:
                vgroups[b_name].add([v_idx], float(w_val), 'REPLACE')

    fish_obj.parent = arm_obj
    arm_mod = fish_obj.modifiers.new('Armature', 'ARMATURE')
    arm_mod.object = arm_obj

    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 49

    for pbone in arm_obj.pose.bones:
        pbone.rotation_mode = 'XYZ'

    # Dragonet hovering gait: active hummingbird-like pectoral fan sculling + gentle posterior tail wave
    max_deg = [0.0, 0.45, 1.4, 3.2, 5.8]
    phase_lag = 0.46
    pect_sweep_deg = 28.0
    pect_feather_deg = 18.0

    for frame in range(1, 50, 2):
        phase = 2.0 * math.pi * (frame - 1) / 48.0
        for i, deg in enumerate(max_deg):
            pbone = arm_obj.pose.bones[f'spine_{i}']
            amp = math.radians(deg)
            pbone.rotation_euler = (0.0, 0.0, amp * math.sin(phase - i * phase_lag))
            pbone.keyframe_insert(data_path='rotation_euler', frame=frame, group=pbone.name)

        for side_label, side_sign in (('L', 1.0), ('R', -1.0)):
            pbone = arm_obj.pose.bones[f'pectoral_{side_label}']
            sweep = math.radians(pect_sweep_deg) * math.sin(phase * 2.0)
            feather = math.radians(pect_feather_deg) * math.cos(phase * 2.0)
            pbone.rotation_euler = (feather, 0.0, side_sign * sweep)
            pbone.keyframe_insert(data_path='rotation_euler', frame=frame, group=pbone.name)

    if arm_obj.animation_data and arm_obj.animation_data.action:
        arm_obj.animation_data.action.name = 'mandarin_dragonet_hover_swim'

    scene.frame_set(1)
    bpy.context.view_layer.update()
    return arm_obj, fish_obj


def main():
    prefix = parse_args()
    os.makedirs(os.path.dirname(prefix), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    base_img, norm_img, orm_img = build_mandarin_textures(size=1024)
    mat = build_pbr_fish_material('Mandarin_Dragonet_Mat', base_img, norm_img, orm_img)
    arm_obj, fish_obj = build_mandarin_mesh_and_rig(mat)

    blend_path = prefix + '.blend'
    glb_path = prefix + '.glb'
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_apply=False,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_animations=True,
        export_skins=True,
        export_morph=False,
    )

    sha256 = hashlib.sha256(open(glb_path, 'rb').read()).hexdigest()
    print('MANDARIN_DRAGONET_BUILD_REPORT=' + json.dumps({
        'glbPath': glb_path,
        'glbBytes': os.path.getsize(glb_path),
        'glbSha256': sha256,
        'vertices': len(fish_obj.data.vertices),
        'polygons': len(fish_obj.data.polygons),
    }, sort_keys=True))


if __name__ == '__main__':
    main()
