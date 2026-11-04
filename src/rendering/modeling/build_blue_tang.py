"""
Build a photorealistic, anatomically sculpted, rigged and animated Regal Blue Tang /
Palette Surgeonfish (Paracanthurus hepatus) in Blender 5.0 with procedural 1024x1024
PBR textures (BaseColor, Tangent Normal, Packed ORM with glTF Occlusion), iconic
royal-blue body with the black 'painter's palette' dorsal-and-flank swirl, canary-yellow
wedge caudal fin with black lateral borders, yellow-tipped pectoral rowing fins, flush
convex cornea eyes, caudal peduncle scalpel spine, and a looping 48-frame labriform swim cycle.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_blue_tang.py -- /tmp/fish-models/fish-blue-tang
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
        raise SystemExit('Usage: blender --threads 4 -b --python build_blue_tang.py -- <output_prefix>')
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


def evaluate_palette_mask(u_body, z_norm):
    """
    Evaluate the iconic Paracanthurus hepatus black 'painter's palette' marking and
    posterior canary-yellow caudal peduncle wedge:
      - Returns (black_mask, yellow_peduncle_mask, scalpel_white_mask)
    """
    wobble = 0.004 * (fbm2(u_body * 18.0, z_norm * 18.0) - 0.5)
    u = u_body + wobble
    z = z_norm + wobble

    # 1. Upper black band: eye mask from snout (u=0.03, z=0.52) sweeping over eye onto dorsal back to peduncle (u=0.92)
    upper_center = 0.52 + 0.28 * smoothstep(0.04, 0.34, u) - 0.14 * smoothstep(0.68, 0.92, u)
    # Smoothly widen upward to cover the dorsal ridge from u=0.28 to u=0.82 without any vertical step
    dorsal_saddle = smoothstep(0.24, 0.36, u) * (1.0 - smoothstep(0.76, 0.88, u))
    upper_top = lerp(upper_center + lerp(0.055, 0.115, smoothstep(0.10, 0.35, u)), 1.05, dorsal_saddle)
    upper_bot = upper_center - lerp(0.050, 0.110, smoothstep(0.10, 0.42, u)) * (1.0 - 0.30 * smoothstep(0.75, 0.95, u))
    d_upper = max(upper_bot - z, z - upper_top)

    # 2. Lower curved black palette arm: branches off posterior peduncle (u=0.82, z=0.62),
    # sweeps down to mid-flank (u=0.50, z=0.44) and hooks upward behind pectoral base (u=0.29, z=0.56)
    arm_t = clamp((u - 0.28) / 0.54, 0.0, 1.0)
    arm_z = 0.44 + 0.14 * ((arm_t - 0.42) * 2.1) ** 2
    arm_half = 0.058 * (math.sin(arm_t * math.pi) ** 0.50)
    if 0.27 <= u <= 0.83:
        d_arm = abs(z - arm_z) - arm_half
    else:
        d_arm = 1.0

    # 3. Ensure the central royal-blue oval window ('palette hole' around u=0.51, z=0.61) stays open
    hole_du = (u - 0.51) / 0.175
    hole_dz = (z - 0.615) / 0.088
    hole_r = math.sqrt(hole_du * hole_du + hole_dz * hole_dz)

    d_black = min(d_upper, d_arm)
    black_raw = 1.0 - smoothstep(-0.008, 0.008, d_black)
    hole_open = 1.0 - smoothstep(0.78, 1.02, hole_r)
    black_mask = clamp(black_raw * (1.0 - hole_open), 0.0, 1.0)

    # 4. Posterior peduncle black lateral borders & bright canary-yellow central wedge (u_body > 0.82)
    ped_t = smoothstep(0.82, 0.96, u_body)
    wedge_half_z = lerp(0.02, 0.25, ped_t)
    in_wedge_z = 1.0 - smoothstep(wedge_half_z - 0.03, wedge_half_z + 0.03, abs(z_norm - 0.50))
    yellow_ped_mask = ped_t * in_wedge_z

    border_z = smoothstep(wedge_half_z - 0.02, wedge_half_z + 0.02, abs(z_norm - 0.50)) * (1.0 - smoothstep(wedge_half_z + 0.12, wedge_half_z + 0.18, abs(z_norm - 0.50)))
    black_mask = clamp(max(black_mask * (1.0 - 0.88 * yellow_ped_mask), ped_t * border_z), 0.0, 1.0)

    # 5. White erectile caudal spine (scalpel) at u_body in [0.79, 0.86], z_norm ~ 0.50
    du_sp = (u_body - 0.825) / 0.034
    dz_sp = (z_norm - 0.500) / 0.018
    scalpel_mask = 1.0 - smoothstep(0.0, 0.85, math.sqrt(du_sp * du_sp + dz_sp * dz_sp))

    return black_mask, yellow_ped_mask, scalpel_mask


def build_blue_tang_textures(size=1024):
    """
    Build 1024x1024 BaseColor, Tangent Normal, and Packed ORM atlases for Paracanthurus hepatus:
      - Body UV island:                 u in [0.02, 0.98], v in [0.04, 0.60]
      - Dorsal/Anal/Pelvic Fin island:  u in [0.02, 0.44], v in [0.66, 0.96] (Royal blue + black margin)
      - Caudal/Pectoral Fin island:     u in [0.46, 0.78], v in [0.66, 0.96] (Canary yellow wedge + black borders)
      - Eye UV island:                  polar disc around (0.90, 0.83) with radius 0.075
    """
    base_pixels = [0.0] * (size * size * 4)
    norm_pixels = [0.0] * (size * size * 4)
    orm_pixels = [0.0] * (size * size * 4)

    c_royal_blue = (0.028, 0.22, 0.88)      # Deep saturated Indo-Pacific royal blue
    c_cobalt_belly = (0.055, 0.34, 0.96)    # Luminous ultramarine-cerulean lower flank & cheek
    c_palette_black = (0.012, 0.014, 0.022) # Jet-black painter's palette swirl
    c_canary_yellow = (0.99, 0.82, 0.035)   # Vivid canary-yellow caudal wedge & pectoral fan
    c_ice_margin = (0.35, 0.72, 0.99)       # Electric sky-blue dorsal/anal fin outer margin

    for py in range(size):
        v = (py + 0.5) / size
        row_off = py * size * 4
        for px in range(size):
            u = (px + 0.5) / size
            idx = row_off + px * 4

            r, g, b = c_royal_blue
            nx, ny, nz = 0.0, 0.0, 1.0
            ao = 1.0
            rough = 0.34
            metal = 0.0

            if v <= 0.63:
                # --- BODY UV ISLAND ---
                u_body = clamp((u - 0.02) / 0.96, 0.0, 1.0)
                z_norm = clamp((v - 0.04) / 0.56, 0.0, 1.0)

                mottle = fbm2(u_body * 16.0, z_norm * 16.0)
                belly_glow = 1.0 - smoothstep(0.08, 0.52, z_norm)
                col = lerp_color(c_royal_blue, c_cobalt_belly, belly_glow * 0.55 + 0.15 * mottle)

                # Fine surgeonfish micro-scale texture (115x64) + sensory pores on cheek
                scale_env = smoothstep(0.20, 0.32, u_body) * (1.0 - 0.4 * smoothstep(0.86, 0.98, u_body))
                su = u_body * 115.0
                sv = z_norm * 64.0 + (0.5 if int(math.floor(su)) % 2 == 1 else 0.0)
                fu = su - math.floor(su) - 0.5
                fv = sv - math.floor(sv) - 0.5
                scale_edge = smoothstep(0.36, 0.52, math.sqrt(fu * fu + fv * fv)) * scale_env
                col = lerp_color(col, (col[0] * 0.86, col[1] * 0.90, col[2] * 0.96), scale_edge * 0.18)

                b_mask, y_mask, sp_mask = evaluate_palette_mask(u_body, z_norm)
                col = lerp_color(col, c_canary_yellow, y_mask)
                col = lerp_color(col, c_palette_black, b_mask)
                col = lerp_color(col, (0.96, 0.97, 0.99), sp_mask)

                r, g, b = col
                nx = -fu * 0.07 * scale_env * (1.0 - 0.5 * b_mask)
                ny = -fv * 0.07 * scale_env * (1.0 - 0.5 * b_mask)
                ao = 1.0 - 0.10 * b_mask - 0.03 * scale_edge
                rough = lerp(0.34, 0.28, b_mask)

            elif u >= 0.80 and v >= 0.64:
                # --- EYE UV ISLAND ---
                du = (u - 0.90) / 0.075
                dv = (v - 0.83) / 0.075
                r_eye = math.sqrt(du * du + dv * dv)
                ang = math.atan2(dv, du)

                pupil_m = 1.0 - smoothstep(0.35, 0.41, r_eye)
                iris_m = smoothstep(0.35, 0.41, r_eye) * (1.0 - smoothstep(0.75, 0.85, r_eye))
                fiber = 0.5 + 0.5 * math.sin(ang * 26.0)
                iris_col = lerp_color((0.55, 0.42, 0.08), (0.95, 0.78, 0.22), fiber * 0.65 + 0.35 * (1.0 - r_eye))
                limbus_col = (0.02, 0.03, 0.06)

                col = lerp_color(limbus_col, iris_col, iris_m)
                col = lerp_color(col, (0.01, 0.01, 0.015), pupil_m)

                spec_d = math.sqrt((du + 0.14) ** 2 + (dv - 0.16) ** 2)
                spec_m = 1.0 - smoothstep(0.03, 0.10, spec_d)
                col = lerp_color(col, (1.0, 0.99, 0.96), spec_m * 0.88)

                r, g, b = col
                rough = 0.05
                ao = 1.0 - 0.16 * smoothstep(0.78, 1.0, r_eye)

            elif u <= 0.45:
                # --- DORSAL / ANAL / PELVIC FIN UV ISLAND (u in [0.02, 0.44], v in [0.66, 0.96]) ---
                s_ray = clamp((u - 0.02) / 0.42, 0.0, 1.0)
                t_rad = clamp((v - 0.66) / 0.30, 0.0, 1.0)

                ray_wave = math.cos(s_ray * 30.0 * 2.0 * math.pi)
                ray_ridge = 0.5 + 0.5 * ray_wave

                col = lerp_color((0.022, 0.17, 0.78), c_cobalt_belly, ray_ridge * 0.60 + 0.25 * (1.0 - t_rad))
                in_black = smoothstep(0.70, 0.80, t_rad) * (1.0 - smoothstep(0.89, 0.95, t_rad))
                in_ice = smoothstep(0.88, 0.96, t_rad)
                col = lerp_color(col, c_palette_black, in_black * 0.92)
                col = lerp_color(col, c_ice_margin, in_ice * 0.80)

                r, g, b = col
                nx = -math.sin(s_ray * 30.0 * 2.0 * math.pi) * 0.24
                ny = 0.05
                ao = lerp(0.82, 1.0, smoothstep(0.0, 0.28, t_rad))
                rough = lerp(0.40, 0.28, ray_ridge)

            else:
                # --- CAUDAL & PECTORAL YELLOW-WEDGE UV ISLAND (u in [0.46, 0.78], v in [0.66, 0.96]) ---
                s_ray = clamp((u - 0.46) / 0.32, 0.0, 1.0)
                t_rad = clamp((v - 0.66) / 0.30, 0.0, 1.0)

                ray_wave = math.cos(s_ray * 24.0 * 2.0 * math.pi)
                ray_ridge = 0.5 + 0.5 * ray_wave

                col = lerp_color((0.92, 0.72, 0.02), c_canary_yellow, ray_ridge * 0.68 + 0.32 * (1.0 - t_rad))
                # Bold black dorsal and ventral lobe borders (s_ray < 0.15 or s_ray > 0.85) + thin dark trailing edge
                edge_dist = min(s_ray, 1.0 - s_ray)
                lobe_black = 1.0 - smoothstep(0.11, 0.17, edge_dist)
                tip_black = smoothstep(0.90, 0.97, t_rad) * 0.75
                col = lerp_color(col, c_palette_black, max(lobe_black, tip_black))

                r, g, b = col
                nx = -math.sin(s_ray * 24.0 * 2.0 * math.pi) * 0.24
                ny = 0.05
                ao = lerp(0.84, 1.0, smoothstep(0.0, 0.25, t_rad))
                rough = lerp(0.38, 0.26, ray_ridge)

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

    base_img = create_packed_image('BlueTang_BaseColor', size, size, base_pixels, is_data=False)
    norm_img = create_packed_image('BlueTang_Normal', size, size, norm_pixels, is_data=True)
    orm_img = create_packed_image('BlueTang_ORM', size, size, orm_pixels, is_data=True)
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
        bsdf.inputs['Specular IOR Level'].default_value = 0.54
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


def evaluate_blue_tang_profile(s):
    """
    Return (y_pos, z_dorsal, z_ventral, half_width) in canonical meters for Paracanthurus hepatus.
      - Snout at y = -0.082 m, caudal peduncle end at y = +0.052 m (total length with tail ~16.5 cm).
      - Streamlined oval-fusiform compressed profile (z_top = +0.0345 m, z_bot = -0.0335 m).
    """
    y_snout = -0.082
    y_peduncle = 0.052
    y = lerp(y_snout, y_peduncle, s)

    if s < 0.36:
        u = s / 0.36
        z_top = 0.0345 * (math.sin(u * math.pi * 0.5) ** 0.62)
    elif s < 0.85:
        u = (s - 0.36) / 0.49
        z_top = lerp(0.0345, 0.0088, smoothstep(0.0, 1.0, u ** 1.12))
    else:
        u = (s - 0.85) / 0.15
        z_top = lerp(0.0088, 0.0052, smoothstep(0.0, 1.0, u))

    if s < 0.38:
        u = s / 0.38
        z_bot = -0.0335 * (math.sin(u * math.pi * 0.5) ** 0.64)
    elif s < 0.85:
        u = (s - 0.38) / 0.47
        z_bot = lerp(-0.0335, -0.0086, smoothstep(0.0, 1.0, u ** 1.10))
    else:
        u = (s - 0.85) / 0.15
        z_bot = lerp(-0.0086, -0.0050, smoothstep(0.0, 1.0, u))

    if s < 0.28:
        u = s / 0.28
        half_w = 0.0112 * (math.sin(u * math.pi * 0.5) ** 0.54)
    elif s < 0.85:
        u = (s - 0.28) / 0.57
        half_w = lerp(0.0112, 0.0032, smoothstep(0.0, 1.0, u))
    else:
        u = (s - 0.85) / 0.15
        half_w = lerp(0.0032, 0.00025, smoothstep(0.0, 1.0, u))

    return y, z_top, z_bot, half_w


def append_double_sided_fin(verts, faces, loop_uvs, vert_weights, columns, uv_u_range=(0.02, 0.44)):
    n_cols = len(columns)
    m_rows = len(columns[0])
    base_v = len(verts)
    u0, u1 = uv_u_range

    for sign in (1.0, -1.0):
        for c_i in range(n_cols):
            for r_j in range(m_rows):
                pos, n_vec, half_t, s_ray, t_rad, w_dict = columns[c_i][r_j]
                ray_rib = 0.5 + 0.5 * math.cos(s_ray * 28.0 * 2.0 * math.pi)
                t_actual = half_t * (0.78 + 0.38 * ray_rib)
                pt = pos + n_vec * (sign * t_actual)
                verts.append((pt.x, pt.y, pt.z))
                vert_weights.append(w_dict)

    stride = n_cols * m_rows

    def v_idx(side, c, r):
        return base_v + side * stride + c * m_rows + r

    def uv_at(c, r):
        _, _, _, s_ray, t_rad, _ = columns[c][r]
        return (lerp(u0, u1, clamp(s_ray)), 0.66 + 0.30 * clamp(t_rad))

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
    joints = [-0.082, -0.038, 0.002, 0.030, 0.052, 0.083]
    centers = [0.5 * (joints[i] + joints[i + 1]) for i in range(len(joints) - 1)]
    if y <= -0.025:
        return {'spine_0': 1.0}
    progress = smoothstep(-0.025, 0.074, y)
    pos = 1.0 + progress * (len(centers) - 2)
    pos = clamp(pos, 0.0, len(centers) - 1.0)
    lo = int(pos)
    hi = min(len(centers) - 1, lo + 1)
    blend = pos - lo
    if lo == hi or blend <= 1e-6:
        return {f'spine_{lo}': 1.0}
    return {f'spine_{lo}': 1.0 - blend, f'spine_{hi}': blend}


def build_blue_tang_mesh_and_rig(mat):
    verts = []
    faces = []
    loop_uvs = []
    vert_weights = []

    n_rings = 96
    n_seg = 64
    body_base = len(verts)

    ring_uvs = []
    for r_i in range(n_rings):
        s = ((r_i + 0.35) / (n_rings - 0.65)) ** 1.10
        y_ring, z_top, z_bot, half_w = evaluate_blue_tang_profile(s)
        w_dict = spine_weight_for_y(y_ring)

        z_center = 0.5 * (z_top + z_bot)
        z_half = max(1e-4, 0.5 * (z_top - z_bot))

        ring_uv_row = []
        for j in range(n_seg):
            theta = (j / n_seg) * 2.0 * math.pi
            cos_t = math.cos(theta)
            sin_t = math.sin(theta)

            py = y_ring
            pz = z_center + z_half * cos_t

            keel_taper = 1.0 - 0.22 * (cos_t ** 4)
            mid_flank_fullness = 1.0 + 0.07 * (sin_t ** 2) * (1.0 - 0.4 * (cos_t ** 2))
            px = half_w * sin_t * keel_taper * mid_flank_fullness

            if s < 0.045:
                lip_env = smoothstep(0.006, 0.020, s) * (1.0 - s / 0.045)
                mouth_indent = math.exp(-((cos_t + 0.04) / 0.16) ** 2) * (1.0 - 0.4 * (sin_t ** 2))
                py += 0.00038 * mouth_indent * lip_env

            eye_ds = (s - 0.145) / 0.042
            eye_dc = (cos_t - 0.28) / 0.24
            eye_r2 = eye_ds * eye_ds + eye_dc * eye_dc
            if eye_r2 < 2.0 and abs(sin_t) > 0.40:
                orbital_rim = math.exp(-((math.sqrt(eye_r2) - 0.90) / 0.28) ** 2)
                px += (1.0 if sin_t > 0 else -1.0) * (0.00040 * orbital_rim)

            gill_s = 0.265 - 0.018 * cos_t
            gill_delta = (s - gill_s) / 0.015
            if abs(gill_delta) < 2.2 and cos_t < 0.50 and cos_t > -0.78 and abs(sin_t) > 0.40:
                gill_step = -0.00070 * gill_delta * math.exp(-gill_delta * gill_delta)
                px += (1.0 if sin_t > 0 else -1.0) * gill_step

            sp_ds = (s - 0.825) / 0.034
            sp_dc = cos_t / 0.15
            sp_r2 = sp_ds * sp_ds + sp_dc * sp_dc
            if sp_r2 < 1.6 and abs(sin_t) > 0.55:
                scalpel_bump = 0.00085 * math.exp(-sp_r2 * 1.6)
                px += (1.0 if sin_t > 0 else -1.0) * scalpel_bump

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
    verts.append((0.0, -0.0820, -0.0005))
    vert_weights.append({'spine_0': 1.0})
    for j in range(n_seg):
        jn = (j + 1) % n_seg
        faces.append((snout_c_idx, body_base + jn, body_base + j))
        loop_uvs.extend([(0.02, 0.32), ring_uvs[0][jn], ring_uvs[0][j]])

    tail_c_idx = len(verts)
    verts.append((0.0, 0.0521, 0.0))
    vert_weights.append({'spine_4': 1.0})
    last_b = body_base + (n_rings - 1) * n_seg
    for j in range(n_seg):
        jn = (j + 1) % n_seg
        faces.append((tail_c_idx, last_b + j, last_b + jn))
        loop_uvs.extend([(0.98, 0.32), ring_uvs[-1][j], ring_uvs[-1][jn]])

    # =========================================================================
    # 2. FLUSH CONVEX CORNEA EYES
    # =========================================================================
    s_eye = 0.145
    y_eye, z_top_e, z_bot_e, hw_e = evaluate_blue_tang_profile(s_eye)
    z_eye = 0.5 * (z_top_e + z_bot_e) + 0.28 * 0.5 * (z_top_e - z_bot_e)
    x_eye = hw_e * 0.92
    r_eye_globe = 0.0044

    for side_sign in (1.0, -1.0):
        eye_center = Vector((side_sign * x_eye, y_eye, z_eye))
        eye_axis = Vector((side_sign * 0.96, -0.24, 0.10)).normalized()
        up_ref = Vector((0.0, 0.0, 1.0))
        tan_u = up_ref.cross(eye_axis).normalized()
        tan_v = eye_axis.cross(tan_u).normalized()

        n_e_rings = 8
        n_e_seg = 24
        eye_base = len(verts)
        apex = eye_center + eye_axis * (r_eye_globe * 0.68)
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
                axial_vec = eye_axis * (cos_p * r_eye_globe * 0.68)
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
    # 3. CONTINUOUS LOW-ARCHED SURGEONFISH DORSAL FIN
    # =========================================================================
    n_dorsal_cols = 34
    m_dorsal_rows = 7
    dorsal_cols = []
    for c_i in range(n_dorsal_cols):
        s_ray = c_i / (n_dorsal_cols - 1)
        s_body = lerp(0.24, 0.84, s_ray)
        y_b, z_top_b, _, _ = evaluate_blue_tang_profile(s_body)

        arch = (math.sin(s_ray * math.pi) ** 0.55) * (0.85 + 0.25 * s_ray)
        scallop = 1.0 - 0.018 * (0.5 - 0.5 * math.cos(s_ray * 26.0 * 2.0 * math.pi))
        fin_h = 0.0135 * arch * scallop
        sweep_y = 0.0020 + 0.0095 * (s_ray ** 1.2)

        col = []
        for r_j in range(m_dorsal_rows):
            t_rad = r_j / (m_dorsal_rows - 1)
            py = y_b - 0.0006 + sweep_y * (t_rad ** 1.15)
            pz = z_top_b - 0.0020 + fin_h * (t_rad ** 0.90)
            half_t = lerp(0.00095, 0.00018, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        dorsal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, dorsal_cols, uv_u_range=(0.02, 0.44))

    # =========================================================================
    # 4. CONTINUOUS ANAL FIN
    # =========================================================================
    n_anal_cols = 26
    m_anal_rows = 7
    anal_cols = []
    for c_i in range(n_anal_cols):
        s_ray = c_i / (n_anal_cols - 1)
        s_body = lerp(0.42, 0.84, s_ray)
        y_b, _, z_bot_b, _ = evaluate_blue_tang_profile(s_body)

        arch = (math.sin(s_ray * math.pi) ** 0.58) * (0.85 + 0.22 * s_ray)
        scallop = 1.0 - 0.018 * (0.5 - 0.5 * math.cos(s_ray * 20.0 * 2.0 * math.pi))
        fin_h = 0.0125 * arch * scallop
        sweep_y = 0.0020 + 0.0088 * (s_ray ** 1.2)

        col = []
        for r_j in range(m_anal_rows):
            t_rad = r_j / (m_anal_rows - 1)
            py = y_b + sweep_y * (t_rad ** 1.12)
            pz = z_bot_b + 0.0018 - fin_h * (t_rad ** 0.90)
            half_t = lerp(0.00090, 0.00018, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        anal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, anal_cols, uv_u_range=(0.02, 0.44))

    # =========================================================================
    # 5. EMARGINATE CANARY-YELLOW WEDGE CAUDAL FIN WITH BLACK LOBES
    # =========================================================================
    n_caudal_cols = 28
    m_caudal_rows = 8
    caudal_cols = []
    y_ped, z_top_p, z_bot_p, hw_ped = evaluate_blue_tang_profile(0.88)
    for c_i in range(n_caudal_cols):
        s_ray = c_i / (n_caudal_cols - 1)
        ang = lerp(-0.56, 0.56, s_ray)
        z_root = lerp(z_bot_p * 0.98, z_top_p * 0.98, s_ray)
        # Emarginate caudal fin with pointed upper and lower black-bordered lobes
        lobe_ext = 0.86 + 0.24 * (((s_ray - 0.5) * 2.0) ** 2)
        scallop = 1.0 - 0.015 * (0.5 - 0.5 * math.cos(s_ray * 22.0 * 2.0 * math.pi))
        ray_len = 0.0325 * lobe_ext * scallop

        col = []
        for r_j in range(m_caudal_rows):
            t_rad = r_j / (m_caudal_rows - 1)
            py = y_ped + ray_len * t_rad * math.cos(ang * 0.42)
            pz = z_root + ray_len * (t_rad ** 0.94) * math.sin(ang)
            base_t = hw_ped * 0.96 * math.sqrt(max(0.12, 1.0 - 0.78 * ((s_ray - 0.5) * 2.0) ** 2))
            half_t = lerp(base_t, 0.00020, t_rad ** 0.65)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        caudal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, caudal_cols, uv_u_range=(0.46, 0.78))

    # =========================================================================
    # 6. YELLOW-TIPPED LABRIFORM PECTORAL FINS
    # =========================================================================
    s_pect = 0.285
    y_pect, _, _, hw_pect = evaluate_blue_tang_profile(s_pect)
    z_pect = -0.0052
    x_pect = hw_pect * 0.90

    for side_label, side_sign in (('L', 1.0), ('R', -1.0)):
        n_p_cols = 20
        m_p_rows = 7
        p_cols = []
        bone_name = f'pectoral_{side_label}'
        for c_i in range(n_p_cols):
            s_ray = c_i / (n_p_cols - 1)
            ang = lerp(-0.62, 0.74, s_ray)
            wing_profile = (math.sin(s_ray * math.pi) ** 0.55) * (0.78 + 0.36 * s_ray)
            ray_len = 0.0110 + 0.0135 * wing_profile
            z_root_off = lerp(-0.0028, 0.0028, s_ray)

            col = []
            for r_j in range(m_p_rows):
                t_rad = r_j / (m_p_rows - 1)
                out_x = side_sign * (x_pect + ray_len * t_rad * (0.26 + 0.08 * wing_profile) + 0.0011 * math.sin(t_rad * math.pi))
                back_y = y_pect + ray_len * t_rad * 0.92 * math.cos(ang * 0.55)
                up_z = z_pect + z_root_off + ray_len * (t_rad ** 0.95) * math.sin(ang)
                n_vec = Vector((side_sign * 0.94, -0.30, 0.12)).normalized()
                half_t = lerp(0.0008, 0.00018, t_rad)
                w_fin = smoothstep(0.05, 0.30, t_rad)
                w_dict = {bone_name: w_fin, 'spine_1': 1.0 - w_fin} if w_fin < 0.999 else {bone_name: 1.0}
                col.append((Vector((out_x, back_y, up_z)), n_vec, half_t, s_ray, t_rad, w_dict))
            p_cols.append(col)
        append_double_sided_fin(verts, faces, loop_uvs, vert_weights, p_cols, uv_u_range=(0.46, 0.78))

    # =========================================================================
    # 7. PAIRED THORACIC PELVIC FINS
    # =========================================================================
    s_pelv = 0.335
    y_pelv, _, z_bot_pelv, _ = evaluate_blue_tang_profile(s_pelv)
    for side_sign in (1.0, -1.0):
        n_v_cols = 12
        m_v_rows = 5
        v_cols = []
        for c_i in range(n_v_cols):
            s_ray = c_i / (n_v_cols - 1)
            ray_len = 0.0095 + 0.0065 * (math.sin(s_ray * math.pi) ** 0.60)
            col = []
            for r_j in range(m_v_rows):
                t_rad = r_j / (m_v_rows - 1)
                px = side_sign * (0.0022 + 0.0028 * t_rad * (0.35 + 0.65 * s_ray))
                py = y_pelv + 0.0048 * s_ray + ray_len * t_rad * 0.78
                pz = z_bot_pelv + 0.0022 - ray_len * t_rad * 0.68
                n_vec = Vector((side_sign * 0.92, -0.25, -0.30)).normalized()
                half_t = lerp(0.0007, 0.00016, t_rad)
                col.append((Vector((px, py, pz)), n_vec, half_t, s_ray, t_rad, {'spine_1': 1.0}))
            v_cols.append(col)
        append_double_sided_fin(verts, faces, loop_uvs, vert_weights, v_cols, uv_u_range=(0.02, 0.44))

    # =========================================================================
    # 8. BUILD MESH, UVS, ARMATURE & 48-FRAME LABRIFORM SWIM ANIMATION
    # =========================================================================
    mesh = bpy.data.meshes.new('Blue_Tang_Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = uv

    mesh.materials.append(mat)

    fish_obj = bpy.data.objects.new('Blue_Tang', mesh)
    bpy.context.collection.objects.link(fish_obj)

    arm_data = bpy.data.armatures.new('Blue_Tang_Rig')
    arm_obj = bpy.data.objects.new('Blue_Tang_Armature', arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')

    joint_y = [-0.082, -0.038, 0.002, 0.030, 0.052, 0.083]
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
        pb.tail = (side_sign * (x_pect + 0.011), y_pect + 0.018, z_pect + 0.003)
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

    max_deg = [0.0, 0.35, 1.0, 2.8, 6.2]
    phase_lag = 0.48
    pect_sweep_deg = 25.0
    pect_feather_deg = 15.0

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
        arm_obj.animation_data.action.name = 'blue_tang_labriform_swim'

    scene.frame_set(1)
    bpy.context.view_layer.update()
    return arm_obj, fish_obj


def main():
    prefix = parse_args()
    os.makedirs(os.path.dirname(prefix), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    base_img, norm_img, orm_img = build_blue_tang_textures(size=1024)
    mat = build_pbr_fish_material('Blue_Tang_Mat', base_img, norm_img, orm_img)
    arm_obj, fish_obj = build_blue_tang_mesh_and_rig(mat)

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
    print('BLUE_TANG_BUILD_REPORT=' + json.dumps({
        'glbPath': glb_path,
        'glbBytes': os.path.getsize(glb_path),
        'glbSha256': sha256,
        'vertices': len(fish_obj.data.vertices),
        'polygons': len(fish_obj.data.polygons),
    }, sort_keys=True))


if __name__ == '__main__':
    main()
