"""
Build a photorealistic, anatomically sculpted, rigged and animated Ocellaris Clownfish
(Amphiprion ocellaris) in Blender 5.0 with procedural 1024x1024 PBR textures
(BaseColor, Tangent Normal, Packed ORM with glTF Occlusion), flush convex cornea eyes,
operculum gill relief, double-sided scalloped rayed fins, and a looping 48-frame
subcarangiform + pectoral-sculling swim cycle.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_clownfish.py -- /tmp/fish-models/fish-ocellaris-clownfish
  (Also supports legacy 2-arg invocation: -- /optional/skin.png /tmp/clown-study)
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
        raise SystemExit('Usage: blender --threads 4 -b --python build_clownfish.py -- [optional_skin.png] <output_prefix>')
    user_args = argv[argv.index('--') + 1:]
    if len(user_args) >= 2:
        return os.path.abspath(user_args[1])
    if len(user_args) == 1:
        return os.path.abspath(user_args[0])
    raise SystemExit('Expected output prefix after --')


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


def evaluate_bar_masks(u_body, z_norm):
    """
    Evaluate the 3 signature Amphiprion ocellaris white bars and their black outlines.
    u_body in [0, 1]: 0 = snout tip, 1 = caudal peduncle rear.
    z_norm in [0, 1]: 0 = ventral keel, 0.5 = lateral midline, 1 = dorsal ridge.
    """
    # Organic micro-waviness along bar edges
    wobble = 0.005 * (fbm2(u_body * 18.0, z_norm * 16.0) - 0.5)

    # Bar 1: Head / opercular bar behind eye (tilts slightly backward toward dorsal crest)
    b1_center = 0.225 + 0.025 * (z_norm - 0.50) + 0.018 * ((z_norm - 0.50) ** 2)
    b1_half = 0.045 * (0.65 + 0.42 * math.sin(z_norm * math.pi))
    d1 = abs(u_body - b1_center + wobble) - b1_half

    # Bar 2: Mid-trunk saddle bar with signature prominent forward bulge at the lateral midline
    bulge = 0.072 * math.exp(-((z_norm - 0.46) / 0.22) ** 2)
    b2_center = 0.545 - 0.52 * bulge + 0.015 * (z_norm - 0.5)
    b2_half = 0.044 + 0.50 * bulge
    d2 = abs(u_body - b2_center + wobble) - b2_half

    # Bar 3: Caudal peduncle bar ahead of caudal fin base
    b3_center = 0.815 + 0.008 * ((z_norm - 0.50) ** 2)
    b3_half = 0.036 * (0.84 + 0.20 * math.sin(z_norm * math.pi))
    d3 = abs(u_body - b3_center + wobble) - b3_half

    d_min = min(d1, d2, d3)

    white_mask = 1.0 - smoothstep(-0.006, 0.002, d_min)
    black_outer = (1.0 - smoothstep(0.001, 0.015, d_min)) * smoothstep(-0.007, -0.001, d_min)
    gill_crease = math.exp(-((u_body - 0.278) / 0.007) ** 2) * smoothstep(0.18, 0.36, z_norm) * (1.0 - smoothstep(0.68, 0.82, z_norm))
    black_mask = clamp(max(black_outer, 0.65 * gill_crease), 0.0, 1.0)

    return white_mask, black_mask


def build_clownfish_textures(size=1024):
    """
    Build 1024x1024 BaseColor, Tangent Normal, and Packed ORM (R=Occlusion, G=Roughness, B=Metallic)
    atlases covering:
      - Body UV island: u in [0.02, 0.98], v in [0.04, 0.60]
      - Fin UV island:  u in [0.02, 0.78], v in [0.66, 0.96]
      - Eye UV island:  polar disc around (0.90, 0.83) with radius 0.075
    """
    base_pixels = [0.0] * (size * size * 4)
    norm_pixels = [0.0] * (size * size * 4)
    orm_pixels = [0.0] * (size * size * 4)

    c_orange_mid = (0.91, 0.27, 0.022)    # Rich reef tangerine-orange flank
    c_orange_dorsal = (0.46, 0.11, 0.009) # Deep burnt-umber dorsal saddle (natural reef countershading)
    c_orange_belly = (0.97, 0.39, 0.055)  # Warm golden-orange snout & lower cheek/belly
    c_white_bar = (0.95, 0.97, 0.99)      # Snow-white bar with subtle cool pearl undertone
    c_black_rim = (0.016, 0.012, 0.014)   # Jet-black bar outline & fin sub-marginal band
    c_hyaline_tip = (0.86, 0.72, 0.58)    # Subtle warm translucent outer margin

    for py in range(size):
        v = (py + 0.5) / size
        row_off = py * size * 4
        for px in range(size):
            u = (px + 0.5) / size
            idx = row_off + px * 4

            r, g, b = c_orange_mid
            nx, ny, nz = 0.0, 0.0, 1.0
            ao = 1.0
            rough = 0.42
            metal = 0.0

            if v <= 0.63:
                # --- BODY UV ISLAND ---
                u_body = clamp((u - 0.02) / 0.96, 0.0, 1.0)
                z_norm = clamp((v - 0.04) / 0.56, 0.0, 1.0)

                # Organic skin mottling + dorsal countershading
                mottle = fbm2(u_body * 14.0, z_norm * 14.0)
                dorsal_shade = smoothstep(0.52, 0.96, z_norm) * (0.75 + 0.25 * mottle)
                belly_warm = (1.0 - smoothstep(0.06, 0.44, z_norm))
                snout_warm = (1.0 - smoothstep(0.0, 0.16, u_body))

                col = lerp_color(c_orange_mid, c_orange_belly, max(belly_warm * 0.60, snout_warm * 0.65))
                col = lerp_color(col, c_orange_dorsal, dorsal_shade * (1.0 - 0.45 * snout_warm))
                col = lerp_color(col, (col[0] * 0.88, col[1] * 0.84, col[2] * 0.80), (mottle - 0.5) * 0.22)

                # Fine micro-scale lattice (84 columns x 40 rows, very subtle so it never looks blocky)
                scale_env = smoothstep(0.24, 0.34, u_body) * (1.0 - 0.5 * smoothstep(0.86, 0.98, u_body))
                su = u_body * 84.0
                sv = z_norm * 40.0 + (0.5 if int(math.floor(su)) % 2 == 1 else 0.0)
                fu = su - math.floor(su) - 0.5
                fv = sv - math.floor(sv) - 0.5
                scale_dist = math.sqrt(fu * fu + fv * fv)
                scale_edge = smoothstep(0.34, 0.52, scale_dist) * scale_env

                col = lerp_color(col, (col[0] * 0.90, col[1] * 0.85, col[2] * 0.80), scale_edge * 0.22)

                # Evaluate 3 white bars & black outlines
                w_mask, k_mask = evaluate_bar_masks(u_body, z_norm)
                bar_pearl = lerp_color(c_white_bar, (0.78, 0.85, 0.93), 0.22 * (1.0 - math.sin(z_norm * math.pi)))
                col = lerp_color(col, bar_pearl, w_mask)
                col = lerp_color(col, c_black_rim, k_mask)

                # Subtle dark lip crease at very tip of snout (u_body < 0.025)
                if u_body < 0.028:
                    lip_line = math.exp(-((z_norm - 0.48) / 0.05) ** 2) * (1.0 - u_body / 0.028)
                    col = lerp_color(col, (0.18, 0.05, 0.01), lip_line * 0.70)

                r, g, b = col
                nx = -fu * 0.09 * scale_env * (1.0 - 0.75 * w_mask)
                ny = -fv * 0.09 * scale_env * (1.0 - 0.75 * w_mask)
                ao = 1.0 - 0.14 * k_mask - 0.04 * scale_edge - 0.08 * (1.0 - smoothstep(0.0, 0.12, z_norm))
                rough = lerp(0.42, 0.35, w_mask) + 0.06 * k_mask

            elif u >= 0.80 and v >= 0.64:
                # --- EYE UV ISLAND (center at u=0.90, v=0.83, radius=0.075) ---
                du = (u - 0.90) / 0.075
                dv = (v - 0.83) / 0.075
                r_eye = math.sqrt(du * du + dv * dv)
                ang = math.atan2(dv, du)

                # Pupil (r < 0.38), bright golden-orange iris (0.38..0.78), dark orange-brown orbital rim (> 0.78)
                pupil_m = 1.0 - smoothstep(0.34, 0.40, r_eye)
                iris_m = smoothstep(0.34, 0.40, r_eye) * (1.0 - smoothstep(0.74, 0.84, r_eye))
                fiber = 0.5 + 0.5 * math.sin(ang * 24.0 + math.sin(r_eye * 12.0))
                iris_col = lerp_color((0.82, 0.25, 0.02), (1.00, 0.62, 0.08), fiber * 0.70 + 0.30 * (1.0 - r_eye))
                limbus_col = (0.38, 0.11, 0.015)

                col = lerp_color(limbus_col, iris_col, iris_m)
                col = lerp_color(col, (0.01, 0.01, 0.015), pupil_m)

                # Subtle wet corneal highlight
                spec_d = math.sqrt((du + 0.14) ** 2 + (dv - 0.16) ** 2)
                spec_m = 1.0 - smoothstep(0.03, 0.10, spec_d)
                col = lerp_color(col, (1.0, 0.98, 0.95), spec_m * 0.88)

                r, g, b = col
                rough = 0.06
                ao = 1.0 - 0.18 * smoothstep(0.78, 1.0, r_eye)

            else:
                # --- FIN UV ISLAND (u in [0.02, 0.78] = ray coordinate, v in [0.66, 0.96] = base-to-tip) ---
                s_ray = clamp((u - 0.02) / 0.76, 0.0, 1.0)
                t_rad = clamp((v - 0.66) / 0.30, 0.0, 1.0)

                # 26 fine branching fin rays
                ray_wave = math.cos(s_ray * 26.0 * 2.0 * math.pi)
                ray_ridge = 0.5 + 0.5 * ray_wave

                c_fin_base = (0.93, 0.31, 0.028)
                c_fin_web = (0.78, 0.21, 0.015)
                col = lerp_color(c_fin_web, c_fin_base, ray_ridge * 0.65 + 0.35 * (1.0 - t_rad))

                # Crisp black sub-marginal band (t_rad in [0.76, 0.94]) with thin outer hyaline edge
                black_start = 0.76 - 0.018 * ray_ridge
                black_end = 0.94 + 0.010 * ray_ridge
                in_black = smoothstep(black_start - 0.04, black_start + 0.02, t_rad) * (1.0 - smoothstep(black_end - 0.02, black_end + 0.02, t_rad))
                in_hyaline = smoothstep(black_end - 0.01, black_end + 0.03, t_rad)

                col = lerp_color(col, c_black_rim, in_black)
                col = lerp_color(col, c_hyaline_tip, in_hyaline * 0.55)

                r, g, b = col
                nx = -math.sin(s_ray * 26.0 * 2.0 * math.pi) * 0.24 * (1.0 - 0.4 * in_black)
                ny = 0.05
                ao = lerp(0.80, 1.0, smoothstep(0.0, 0.30, t_rad))
                rough = lerp(0.44, 0.32, ray_ridge)

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

    base_img = create_packed_image('Clownfish_BaseColor', size, size, base_pixels, is_data=False)
    norm_img = create_packed_image('Clownfish_Normal', size, size, norm_pixels, is_data=True)
    orm_img = create_packed_image('Clownfish_ORM', size, size, orm_pixels, is_data=True)
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
        bsdf.inputs['Specular IOR Level'].default_value = 0.52
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


def evaluate_clownfish_profile(s):
    """
    Return (y_pos, z_dorsal, z_ventral, half_width) in canonical meters for longitudinal parameter s in [0, 1].
    Authentic Amphiprion ocellaris body proportions:
      - Snout at y = -0.054 m, caudal peduncle end at y = +0.035 m (body length 8.9 cm, total length with tail 11.0 cm).
      - Max body depth ~ 3.8 cm (z_top = +0.0195 m, z_bot = -0.0185 m), giving a natural 2.35:1 body length-to-depth ratio.
      - Blunt, rounded anemonefish snout (sqrt profile at s -> 0) and smooth caudal peduncle transition into the tail fin.
    """
    y_snout = -0.054
    y_peduncle = 0.035
    y = lerp(y_snout, y_peduncle, s)

    # Dorsal profile: blunt rounded snout -> convex nuchal forehead -> spinous/soft dorsal back -> muscular caudal peduncle
    if s < 0.34:
        u = s / 0.34
        z_top = 0.0195 * (math.sin(u * math.pi * 0.5) ** 0.56)
    elif s < 0.89:
        u = (s - 0.34) / 0.55
        z_top = lerp(0.0195, 0.0074, smoothstep(0.0, 1.0, u ** 1.12))
    else:
        u = (s - 0.89) / 0.11
        # Taper cleanly inside the caudal fin root so no peduncle step is visible inside the tail fan
        z_top = lerp(0.0074, 0.0046, smoothstep(0.0, 1.0, u))

    # Ventral profile: rounded chin -> deep thoracic belly -> upward anal sweep -> caudal peduncle
    if s < 0.38:
        u = s / 0.38
        z_bot = -0.0185 * (math.sin(u * math.pi * 0.5) ** 0.60)
    elif s < 0.89:
        u = (s - 0.38) / 0.51
        z_bot = lerp(-0.0185, -0.0072, smoothstep(0.0, 1.0, u ** 1.08))
    else:
        u = (s - 0.89) / 0.11
        z_bot = lerp(-0.0072, -0.0045, smoothstep(0.0, 1.0, u))

    # Lateral half-width: blunt rounded snout, fullest across operculum/mid-trunk (~12.2 mm half-width), thin at caudal base
    if s < 0.30:
        u = s / 0.30
        half_w = 0.0122 * (math.sin(u * math.pi * 0.5) ** 0.50)
    elif s < 0.89:
        u = (s - 0.30) / 0.59
        half_w = lerp(0.0122, 0.0030, smoothstep(0.0, 1.0, u))
    else:
        # Taper cleanly inside the caudal fin root so no peduncle cylinder pokes through the tail fin
        u = (s - 0.89) / 0.11
        half_w = lerp(0.0030, 0.00025, smoothstep(0.0, 1.0, u))

    return y, z_top, z_bot, half_w


def append_double_sided_fin(verts, faces, loop_uvs, vert_weights, columns):
    """
    Build a watertight, double-sided, scalloped 3D fin membrane from a list of ray columns.
    """
    n_cols = len(columns)
    m_rows = len(columns[0])
    base_v = len(verts)

    for sign in (1.0, -1.0):
        for c_i in range(n_cols):
            for r_j in range(m_rows):
                pos, n_vec, half_t, s_ray, t_rad, w_dict = columns[c_i][r_j]
                ray_rib = 0.5 + 0.5 * math.cos(s_ray * 26.0 * 2.0 * math.pi)
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
    joints = [-0.054, -0.025, 0.000, 0.018, 0.035, 0.056]
    centers = [0.5 * (joints[i] + joints[i + 1]) for i in range(len(joints) - 1)]
    if y <= -0.016:
        return {'spine_0': 1.0}
    progress = smoothstep(-0.016, 0.050, y)
    pos = 1.0 + progress * (len(centers) - 2)
    pos = clamp(pos, 0.0, len(centers) - 1.0)
    lo = int(pos)
    hi = min(len(centers) - 1, lo + 1)
    blend = pos - lo
    if lo == hi or blend <= 1e-6:
        return {f'spine_{lo}': 1.0}
    return {f'spine_{lo}': 1.0 - blend, f'spine_{hi}': blend}


def build_clownfish_mesh_and_rig(mat):
    verts = []
    faces = []
    loop_uvs = []
    vert_weights = []

    # =========================================================================
    # 1. HIGH-RESOLUTION ANATOMICAL TELEOST BODY (96 rings x 64 segments)
    # =========================================================================
    n_rings = 96
    n_seg = 64
    body_base = len(verts)

    ring_uvs = []
    for r_i in range(n_rings):
        s = ((r_i + 0.35) / (n_rings - 0.65)) ** 1.12
        y_ring, z_top, z_bot, half_w = evaluate_clownfish_profile(s)
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

            # Natural teleost cross-section: gently rounded dorsal & ventral ridges, fuller epaxial flank
            keel_pinch = 1.0 - 0.14 * (cos_t ** 4)
            epaxial_bulge = 1.0 + 0.06 * (sin_t ** 2) * smoothstep(-0.2, 0.6, cos_t)
            px = half_w * sin_t * keel_pinch * epaxial_bulge

            # (a) Subtle symmetrical terminal lip contour at snout tip (never mutating y_ring!)
            if s < 0.05:
                lip_env = smoothstep(0.008, 0.025, s) * (1.0 - s / 0.05)
                mouth_indent = math.exp(-((cos_t - 0.02) / 0.18) ** 2) * (1.0 - 0.4 * (sin_t ** 2))
                upper_lip = math.exp(-((cos_t - 0.22) / 0.16) ** 2)
                lower_lip = math.exp(-((cos_t + 0.16) / 0.16) ** 2)
                py += (0.00035 * mouth_indent - 0.0003 * (upper_lip + 0.8 * lower_lip)) * lip_env

            # (b) Subtle orbital socket rim around eye (s ~ 0.125, cos_t ~ 0.24)
            eye_ds = (s - 0.125) / 0.045
            eye_dc = (cos_t - 0.24) / 0.26
            eye_r2 = eye_ds * eye_ds + eye_dc * eye_dc
            if eye_r2 < 2.0 and abs(sin_t) > 0.40:
                orbital_rim = math.exp(-((math.sqrt(eye_r2) - 0.90) / 0.28) ** 2)
                px += (1.0 if sin_t > 0 else -1.0) * (0.00040 * orbital_rim)

            # (c) Curved operculum (gill cover) overlap ridge at s ~ 0.265
            gill_s = 0.265 - 0.020 * (cos_t * cos_t)
            gill_delta = (s - gill_s) / 0.016
            if abs(gill_delta) < 2.2 and abs(cos_t) < 0.76 and abs(sin_t) > 0.42:
                gill_step = -0.00075 * gill_delta * math.exp(-gill_delta * gill_delta)
                px += (1.0 if sin_t > 0 else -1.0) * gill_step

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
    verts.append((0.0, -0.0540, 0.0002))
    vert_weights.append({'spine_0': 1.0})
    for j in range(n_seg):
        jn = (j + 1) % n_seg
        faces.append((snout_c_idx, body_base + jn, body_base + j))
        loop_uvs.extend([(0.02, 0.32), ring_uvs[0][jn], ring_uvs[0][j]])

    tail_c_idx = len(verts)
    verts.append((0.0, 0.0351, 0.0))
    vert_weights.append({'spine_4': 1.0})
    last_b = body_base + (n_rings - 1) * n_seg
    for j in range(n_seg):
        jn = (j + 1) % n_seg
        faces.append((tail_c_idx, last_b + j, last_b + jn))
        loop_uvs.extend([(0.98, 0.32), ring_uvs[-1][j], ring_uvs[-1][jn]])

    # =========================================================================
    # 2. FLUSH CONVEX CORNEA EYES (Left & Right, nested inside orbital rim)
    # =========================================================================
    s_eye = 0.125
    y_eye, _, _, hw_e = evaluate_clownfish_profile(s_eye)
    z_eye = 0.0036
    x_eye = hw_e * 0.94
    r_eye_globe = 0.0038

    for side_sign in (1.0, -1.0):
        eye_center = Vector((side_sign * x_eye, y_eye, z_eye))
        eye_axis = Vector((side_sign * 0.95, -0.28, 0.10)).normalized()
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
    # 3. CONTINUOUS NOTCHED SPINOUS + SOFT DORSAL FIN
    # =========================================================================
    n_dorsal_cols = 32
    m_dorsal_rows = 7
    dorsal_cols = []
    for c_i in range(n_dorsal_cols):
        s_ray = c_i / (n_dorsal_cols - 1)
        s_body = lerp(0.23, 0.81, s_ray)
        y_b, z_top_b, _, _ = evaluate_clownfish_profile(s_body)

        spinous_arch = math.sin(clamp(s_ray / 0.55, 0.0, 1.0) * math.pi) ** 0.68
        soft_arch = math.sin(clamp((s_ray - 0.48) / 0.52, 0.0, 1.0) * math.pi) ** 0.72
        fin_h = 0.0098 * spinous_arch + 0.0128 * soft_arch
        scallop = 1.0 - 0.025 * (0.5 - 0.5 * math.cos(s_ray * 20.0 * 2.0 * math.pi))
        fin_h *= scallop
        sweep_y = 0.0018 + 0.0078 * (s_ray ** 1.35)

        col = []
        for r_j in range(m_dorsal_rows):
            t_rad = r_j / (m_dorsal_rows - 1)
            py = y_b - 0.0005 + sweep_y * (t_rad ** 1.15)
            pz = z_top_b - 0.0020 + fin_h * (t_rad ** 0.92)
            half_t = lerp(0.0010, 0.00018, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        dorsal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, dorsal_cols)

    # =========================================================================
    # 4. ROUNDED ANAL FIN
    # =========================================================================
    n_anal_cols = 18
    m_anal_rows = 6
    anal_cols = []
    for c_i in range(n_anal_cols):
        s_ray = c_i / (n_anal_cols - 1)
        s_body = lerp(0.55, 0.81, s_ray)
        y_b, _, z_bot_b, _ = evaluate_clownfish_profile(s_body)
        arch = math.sin(s_ray * math.pi) ** 0.68
        fin_h = 0.0102 * arch
        sweep_y = 0.0018 + 0.0068 * s_ray
        col = []
        for r_j in range(m_anal_rows):
            t_rad = r_j / (m_anal_rows - 1)
            py = y_b + sweep_y * (t_rad ** 1.1)
            pz = z_bot_b + 0.0018 - fin_h * (t_rad ** 0.92)
            half_t = lerp(0.0009, 0.00018, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        anal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, anal_cols)

    # =========================================================================
    # 5. SEAMLESS ROUNDED PADDLE CAUDAL (TAIL) FIN (Rooted at s=0.86 around peduncle)
    # =========================================================================
    n_caudal_cols = 28
    m_caudal_rows = 8
    caudal_cols = []
    y_ped, z_top_p, z_bot_p, hw_ped = evaluate_clownfish_profile(0.89)
    for c_i in range(n_caudal_cols):
        s_ray = c_i / (n_caudal_cols - 1)
        ang = lerp(-0.60, 0.60, s_ray)
        z_root = lerp(z_bot_p * 0.98, z_top_p * 0.98, s_ray)
        center_convex = 0.82 + 0.24 * math.cos((s_ray - 0.5) * math.pi * 1.15)
        scallop = 1.0 - 0.018 * (0.5 - 0.5 * math.cos(s_ray * 20.0 * 2.0 * math.pi))
        ray_len = 0.0265 * center_convex * scallop

        col = []
        for r_j in range(m_caudal_rows):
            t_rad = r_j / (m_caudal_rows - 1)
            py = y_ped + ray_len * t_rad * math.cos(ang * 0.50)
            pz = z_root + ray_len * (t_rad ** 0.94) * math.sin(ang)
            # Base thickness wraps around caudal peduncle width so there is zero step
            base_t = hw_ped * 0.96 * math.sqrt(max(0.12, 1.0 - 0.78 * ((s_ray - 0.5) * 2.0) ** 2))
            half_t = lerp(base_t, 0.00020, t_rad ** 0.65)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        caudal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, caudal_cols)

    # =========================================================================
    # 6. PAIRED ROUNDED PECTORAL FINS (Anchored cleanly behind gill bar, 20 deg flare)
    # =========================================================================
    s_pect = 0.285
    y_pect, _, _, hw_pect = evaluate_clownfish_profile(s_pect)
    z_pect = -0.0032
    x_pect = hw_pect * 0.88

    for side_label, side_sign in (('L', 1.0), ('R', -1.0)):
        n_p_cols = 20
        m_p_rows = 7
        p_cols = []
        bone_name = f'pectoral_{side_label}'
        for c_i in range(n_p_cols):
            s_ray = c_i / (n_p_cols - 1)
            ang = lerp(-0.72, 0.68, s_ray)
            dome = math.sin(s_ray * math.pi) ** 0.52
            ray_len = 0.0105 + 0.0098 * dome
            z_root_off = lerp(-0.0026, 0.0026, s_ray)

            col = []
            for r_j in range(m_p_rows):
                t_rad = r_j / (m_p_rows - 1)
                # Natural 20-degree hydrodynamic flare along flank
                out_x = side_sign * (x_pect + ray_len * t_rad * (0.28 + 0.07 * dome) + 0.0012 * math.sin(t_rad * math.pi))
                back_y = y_pect + ray_len * t_rad * 0.92 * math.cos(ang * 0.60)
                up_z = z_pect + z_root_off + ray_len * (t_rad ** 0.95) * math.sin(ang)
                n_vec = Vector((side_sign * 0.94, -0.32, 0.10)).normalized()
                half_t = lerp(0.0008, 0.00018, t_rad)
                w_fin = smoothstep(0.05, 0.32, t_rad)
                w_dict = {bone_name: w_fin, 'spine_1': 1.0 - w_fin} if w_fin < 0.999 else {bone_name: 1.0}
                col.append((Vector((out_x, back_y, up_z)), n_vec, half_t, s_ray, t_rad, w_dict))
            p_cols.append(col)
        append_double_sided_fin(verts, faces, loop_uvs, vert_weights, p_cols)

    # =========================================================================
    # 7. PAIRED VENTRAL PELVIC FINS
    # =========================================================================
    s_pelv = 0.345
    y_pelv, _, z_bot_pelv, _ = evaluate_clownfish_profile(s_pelv)
    for side_sign in (1.0, -1.0):
        n_v_cols = 12
        m_v_rows = 5
        v_cols = []
        for c_i in range(n_v_cols):
            s_ray = c_i / (n_v_cols - 1)
            dome = math.sin(s_ray * math.pi) ** 0.62
            ray_len = 0.0078 + 0.0052 * dome
            col = []
            for r_j in range(m_v_rows):
                t_rad = r_j / (m_v_rows - 1)
                px = side_sign * (0.0024 + 0.0030 * t_rad * (0.35 + 0.65 * s_ray))
                py = y_pelv + 0.0042 * s_ray + ray_len * t_rad * 0.72
                pz = z_bot_pelv + 0.0020 - ray_len * t_rad * 0.70
                n_vec = Vector((side_sign * 0.92, -0.25, -0.30)).normalized()
                half_t = lerp(0.0007, 0.00016, t_rad)
                col.append((Vector((px, py, pz)), n_vec, half_t, s_ray, t_rad, {'spine_1': 1.0}))
            v_cols.append(col)
        append_double_sided_fin(verts, faces, loop_uvs, vert_weights, v_cols)

    # =========================================================================
    # 8. BUILD MESH, UVS, ARMATURE & 48-FRAME SUBCARANGIFORM SWIM ANIMATION
    # =========================================================================
    mesh = bpy.data.meshes.new('Ocellaris_Clownfish_Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = uv

    mesh.materials.append(mat)

    fish_obj = bpy.data.objects.new('Ocellaris_Clownfish', mesh)
    bpy.context.collection.objects.link(fish_obj)

    arm_data = bpy.data.armatures.new('Ocellaris_Clownfish_Rig')
    arm_obj = bpy.data.objects.new('Ocellaris_Clownfish_Armature', arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')

    joint_y = [-0.054, -0.025, 0.000, 0.018, 0.035, 0.056]
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
        pb.tail = (side_sign * (x_pect + 0.009), y_pect + 0.015, z_pect + 0.002)
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

    max_deg = [0.0, 0.8, 2.2, 4.5, 7.5]
    phase_lag = 0.42
    pect_sweep_deg = 18.0
    pect_feather_deg = 12.0

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
        arm_obj.animation_data.action.name = 'clownfish_subcarangiform_swim'

    scene.frame_set(1)
    bpy.context.view_layer.update()
    return arm_obj, fish_obj


def main():
    prefix = parse_args()
    os.makedirs(os.path.dirname(prefix), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    base_img, norm_img, orm_img = build_clownfish_textures(size=1024)
    mat = build_pbr_fish_material('Ocellaris_Clownfish_Mat', base_img, norm_img, orm_img)
    arm_obj, fish_obj = build_clownfish_mesh_and_rig(mat)

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
    print('CLOWNFISH_BUILD_REPORT=' + json.dumps({
        'glbPath': glb_path,
        'glbBytes': os.path.getsize(glb_path),
        'glbSha256': sha256,
        'vertices': len(fish_obj.data.vertices),
        'polygons': len(fish_obj.data.polygons),
    }, sort_keys=True))


if __name__ == '__main__':
    main()
