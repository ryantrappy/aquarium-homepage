"""
Build a photorealistic, anatomically sculpted, rigged and animated Banggai Cardinalfish
(Pterapogon kauderni) in Blender 5.0 exercising the `banner_hoverer` rig archetype with
procedural 1024x1024 PBR textures (BaseColor, Tangent Normal, Packed ORM with glTF
Occlusion), iridescent silver body, 3 bold jet-black vertical bars, brilliant white
pearl spots on flank and fin banners, separate first spinous dorsal and tall streaming
second dorsal/anal filaments, deeply forked caudal lobes, oversized nocturnal eyes,
and a looping 48-frame banner_hoverer swim animation.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_banggai_cardinalfish.py -- /tmp/fish-models/fish-banggai-cardinalfish
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
        raise SystemExit('Usage: blender --threads 4 -b --python build_banggai_cardinalfish.py -- <output_prefix>')
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


def pearl_spot_grid(u_coord, v_coord, freq_u, freq_v, radius=0.28):
    """Return smooth circular pearl spot mask in [0, 1] on a jittered lattice."""
    gu = u_coord * freq_u
    gv = v_coord * freq_v
    ix = int(math.floor(gu))
    iy = int(math.floor(gv))
    jx = 0.5 + 0.22 * (hash2(ix, iy) - 0.5)
    jy = 0.5 + 0.22 * (hash2(ix + 17, iy + 31) - 0.5)
    du = (gu - ix) - jx
    dv = (gv - iy) - jy
    r = math.sqrt(du * du + dv * dv)
    return 1.0 - smoothstep(radius * 0.65, radius, r)


def build_banggai_textures(size=1024):
    """
    Build 1024x1024 BaseColor, Tangent Normal, and Packed ORM atlases for Pterapogon kauderni:
      - Body UV island:        u in [0.02, 0.98], v in [0.04, 0.60]
      - Banner Fin island:     u in [0.02, 0.48], v in [0.66, 0.96] (Dorsal/Anal/Pelvic: black leading edge + white pearl spots + silver web)
      - Caudal/Pect island:    u in [0.50, 0.78], v in [0.66, 0.96] (Forked caudal with black lobe stripes & white pearl spots)
      - Eye UV island:         polar disc around (0.90, 0.83) with vertical black ocular bar across silver iris
    """
    base_pixels = [0.0] * (size * size * 4)
    norm_pixels = [0.0] * (size * size * 4)
    orm_pixels = [0.0] * (size * size * 4)

    c_silver_pearl = (0.85, 0.86, 0.90)     # Iridescent platinum-silver flank
    c_champagne_back = (0.68, 0.64, 0.58)   # Warm bronze-silver dorsal countershading
    c_jet_black = (0.016, 0.016, 0.022)     # Velvet jet-black vertical bars & fin banners
    c_snow_spot = (0.98, 0.99, 1.00)        # Brilliant snow-white pearl spots

    for py in range(size):
        v = (py + 0.5) / size
        row_off = py * size * 4
        for px in range(size):
            u = (px + 0.5) / size
            idx = row_off + px * 4

            r, g, b = c_silver_pearl
            nx, ny, nz = 0.0, 0.0, 1.0
            ao = 1.0
            rough = 0.26
            metal = 0.16

            if v <= 0.63:
                # --- BODY UV ISLAND ---
                u_body = clamp((u - 0.02) / 0.96, 0.0, 1.0)
                z_norm = clamp((v - 0.04) / 0.56, 0.0, 1.0)

                mottle = fbm2(u_body * 14.0, z_norm * 14.0)
                dorsal_warm = smoothstep(0.58, 0.96, z_norm)
                col = lerp_color(c_silver_pearl, c_champagne_back, dorsal_warm * 0.65 + 0.18 * (mottle - 0.5))

                # Fine ctenoid scale sheen (68x36)
                scale_env = smoothstep(0.20, 0.30, u_body) * (1.0 - 0.3 * smoothstep(0.86, 0.98, u_body))
                su = u_body * 68.0
                sv = z_norm * 36.0 + (0.5 if int(math.floor(su)) % 2 == 1 else 0.0)
                fu = su - math.floor(su) - 0.5
                fv = sv - math.floor(sv) - 0.5
                scale_edge = smoothstep(0.35, 0.52, math.sqrt(fu * fu + fv * fv)) * scale_env
                col = lerp_color(col, (col[0] * 0.88, col[1] * 0.89, col[2] * 0.92), scale_edge * 0.22)

                # 3 Bold Jet-Black Vertical Bars + Posterior Caudal Peduncle Spot/Bar:
                # Bar 1: Ocular bar through eye (u_body ~ 0.145, tilts slightly backward toward nape)
                b1_c = 0.145 + 0.032 * (z_norm - 0.50)
                d1 = abs(u_body - b1_c) - 0.046

                # Bar 2: First-dorsal-to-pelvic bar (u_body ~ 0.375)
                b2_c = 0.375 - 0.015 * (z_norm - 0.50)
                d2 = abs(u_body - b2_c) - 0.056

                # Bar 3: Second-dorsal-to-anal bar (u_body ~ 0.615)
                b3_c = 0.615 + 0.018 * (z_norm - 0.50)
                d3 = abs(u_body - b3_c) - 0.054

                # Bar 4 / Peduncle triangle at caudal base (u_body ~ 0.865)
                d4 = abs(u_body - 0.865) - (0.045 * (1.0 - 0.45 * abs(z_norm - 0.50)))

                d_bar = min(d1, d2, d3, d4)
                bar_mask = 1.0 - smoothstep(-0.008, 0.008, d_bar)

                # Brilliant white pearl spots arranged along edges of Bars 2, 3, and 4
                edge_zone = (1.0 - smoothstep(0.0, 0.038, abs(min(d2, d3, d4)))) * smoothstep(0.10, 0.20, z_norm) * (1.0 - smoothstep(0.82, 0.92, z_norm))
                pearls = pearl_spot_grid(u_body, z_norm, 28.0, 14.0, radius=0.30) * edge_zone

                col = lerp_color(col, c_jet_black, bar_mask)
                col = lerp_color(col, c_snow_spot, pearls)

                r, g, b = col
                nx = -fu * 0.08 * scale_env * (1.0 - 0.6 * bar_mask)
                ny = -fv * 0.08 * scale_env * (1.0 - 0.6 * bar_mask)
                ao = 1.0 - 0.10 * bar_mask - 0.04 * scale_edge
                rough = lerp(0.24, 0.42, bar_mask) * (1.0 - 0.35 * pearls)
                metal = lerp(0.18, 0.02, bar_mask)

            elif u >= 0.80 and v >= 0.64:
                # --- EYE UV ISLAND (Silver iris crossed by the vertical black ocular bar!) ---
                du = (u - 0.90) / 0.075
                dv = (v - 0.83) / 0.075
                r_eye = math.sqrt(du * du + dv * dv)
                ang = math.atan2(dv, du)

                pupil_m = 1.0 - smoothstep(0.38, 0.44, r_eye)
                iris_m = smoothstep(0.38, 0.44, r_eye) * (1.0 - smoothstep(0.76, 0.86, r_eye))
                fiber = 0.5 + 0.5 * math.sin(ang * 28.0)
                iris_col = lerp_color((0.68, 0.72, 0.78), (0.94, 0.96, 1.00), fiber * 0.70)
                # Vertical black ocular bar cuts through center of iris (abs(du) < 0.34)
                ocular_bar = 1.0 - smoothstep(0.28, 0.38, abs(du - 0.08 * dv))
                iris_col = lerp_color(iris_col, c_jet_black, ocular_bar * 0.88)

                col = lerp_color(c_jet_black, iris_col, iris_m)
                col = lerp_color(col, (0.01, 0.01, 0.015), pupil_m)

                spec_d = math.sqrt((du + 0.15) ** 2 + (dv - 0.16) ** 2)
                spec_m = 1.0 - smoothstep(0.03, 0.10, spec_d)
                col = lerp_color(col, (1.0, 0.99, 0.98), spec_m * 0.92)

                r, g, b = col
                rough = 0.05
                metal = 0.0
                ao = 1.0 - 0.16 * smoothstep(0.78, 1.0, r_eye)

            elif u <= 0.49:
                # --- BANNER FIN ISLAND (Dorsal 1, Dorsal 2, Anal, Pelvic: u in [0.02, 0.48], v in [0.66, 0.96]) ---
                s_ray = clamp((u - 0.02) / 0.46, 0.0, 1.0)
                t_rad = clamp((v - 0.66) / 0.30, 0.0, 1.0)

                ray_wave = math.cos(s_ray * 20.0 * 2.0 * math.pi)
                ray_ridge = 0.5 + 0.5 * ray_wave

                # Anterior 60% of banner fin is jet-black studded with glowing white pearl spots; posterior web is silver-pearl
                black_banner = 1.0 - smoothstep(0.48, 0.68, s_ray)
                tip_tassel = smoothstep(0.84, 0.94, t_rad) * (1.0 - smoothstep(0.45, 0.65, s_ray))
                fin_pearls = pearl_spot_grid(s_ray, t_rad, 11.0, 7.0, radius=0.31) * smoothstep(0.06, 0.82, t_rad)

                col = lerp_color((0.76, 0.78, 0.84), c_silver_pearl, ray_ridge * 0.65)
                col = lerp_color(col, c_jet_black, black_banner)
                col = lerp_color(col, c_snow_spot, max(fin_pearls * 0.95, tip_tassel * 0.92))

                r, g, b = col
                nx = -math.sin(s_ray * 20.0 * 2.0 * math.pi) * 0.24
                ny = 0.05
                ao = lerp(0.84, 1.0, smoothstep(0.0, 0.25, t_rad))
                rough = lerp(0.42, 0.28, ray_ridge)
                metal = lerp(0.12, 0.02, black_banner)

            else:
                # --- FORKED CAUDAL & PECTORAL ISLAND (u in [0.50, 0.78], v in [0.66, 0.96]) ---
                s_ray = clamp((u - 0.50) / 0.28, 0.0, 1.0)
                t_rad = clamp((v - 0.66) / 0.30, 0.0, 1.0)

                ray_wave = math.cos(s_ray * 22.0 * 2.0 * math.pi)
                ray_ridge = 0.5 + 0.5 * ray_wave

                # Black upper and lower lobe bands with white pearl spots
                edge_dist = min(s_ray, 1.0 - s_ray)
                lobe_black = 1.0 - smoothstep(0.12, 0.26, edge_dist)
                caudal_pearls = pearl_spot_grid(s_ray, t_rad, 10.0, 6.0, radius=0.29) * lobe_black * smoothstep(0.12, 0.88, t_rad)

                col = lerp_color((0.78, 0.80, 0.86), c_silver_pearl, ray_ridge * 0.65)
                col = lerp_color(col, c_jet_black, lobe_black * 0.92)
                col = lerp_color(col, c_snow_spot, caudal_pearls * 0.95)

                r, g, b = col
                nx = -math.sin(s_ray * 22.0 * 2.0 * math.pi) * 0.24
                ny = 0.05
                ao = lerp(0.84, 1.0, smoothstep(0.0, 0.25, t_rad))
                rough = lerp(0.38, 0.26, ray_ridge)
                metal = 0.08

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

    base_img = create_packed_image('BanggaiCardinal_BaseColor', size, size, base_pixels, is_data=False)
    norm_img = create_packed_image('BanggaiCardinal_Normal', size, size, norm_pixels, is_data=True)
    orm_img = create_packed_image('BanggaiCardinal_ORM', size, size, orm_pixels, is_data=True)
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
        bsdf.inputs['Specular IOR Level'].default_value = 0.55
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


def evaluate_banggai_profile(s):
    """
    Return (y_pos, z_dorsal, z_ventral, half_width) in canonical meters for Pterapogon kauderni.
      - Snout at y = -0.042 m, caudal peduncle end at y = +0.022 m (body length 6.4 cm, total length with forked tail ~9.2 cm).
      - Deep diamond-rhomboid mid-trunk (z_top = +0.0185 m at s=0.38, z_bot = -0.0175 m at s=0.38)
        tapering into an elongated, slender caudal peduncle.
    """
    y_snout = -0.042
    y_peduncle = 0.022
    y = lerp(y_snout, y_peduncle, s)

    if s < 0.38:
        u = s / 0.38
        z_top = 0.0185 * (math.sin(u * math.pi * 0.5) ** 0.72)
    elif s < 0.78:
        u = (s - 0.38) / 0.40
        z_top = lerp(0.0185, 0.0052, smoothstep(0.0, 1.0, u ** 1.05))
    else:
        u = (s - 0.78) / 0.22
        z_top = lerp(0.0052, 0.0036, smoothstep(0.0, 1.0, u))

    if s < 0.38:
        u = s / 0.38
        z_bot = -0.0175 * (math.sin(u * math.pi * 0.5) ** 0.68)
    elif s < 0.78:
        u = (s - 0.38) / 0.40
        z_bot = lerp(-0.0175, -0.0050, smoothstep(0.0, 1.0, u ** 1.05))
    else:
        u = (s - 0.78) / 0.22
        z_bot = lerp(-0.0050, -0.0035, smoothstep(0.0, 1.0, u))

    if s < 0.30:
        u = s / 0.30
        half_w = 0.0082 * (math.sin(u * math.pi * 0.5) ** 0.55)
    elif s < 0.86:
        u = (s - 0.30) / 0.56
        half_w = lerp(0.0082, 0.0022, smoothstep(0.0, 1.0, u))
    else:
        u = (s - 0.86) / 0.14
        half_w = lerp(0.0022, 0.00020, smoothstep(0.0, 1.0, u))

    return y, z_top, z_bot, half_w


def append_double_sided_fin(verts, faces, loop_uvs, vert_weights, columns, uv_u_range=(0.02, 0.48)):
    n_cols = len(columns)
    m_rows = len(columns[0])
    base_v = len(verts)
    u0, u1 = uv_u_range

    for sign in (1.0, -1.0):
        for c_i in range(n_cols):
            for r_j in range(m_rows):
                pos, n_vec, half_t, s_ray, t_rad, w_dict = columns[c_i][r_j]
                ray_rib = 0.5 + 0.5 * math.cos(s_ray * 20.0 * 2.0 * math.pi)
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
    joints = [-0.042, -0.018, 0.000, 0.012, 0.022, 0.048]
    centers = [0.5 * (joints[i] + joints[i + 1]) for i in range(len(joints) - 1)]
    if y <= -0.012:
        return {'spine_0': 1.0}
    progress = smoothstep(-0.012, 0.042, y)
    pos = 1.0 + progress * (len(centers) - 2)
    pos = clamp(pos, 0.0, len(centers) - 1.0)
    lo = int(pos)
    hi = min(len(centers) - 1, lo + 1)
    blend = pos - lo
    if lo == hi or blend <= 1e-6:
        return {f'spine_{lo}': 1.0}
    return {f'spine_{lo}': 1.0 - blend, f'spine_{hi}': blend}


def build_banggai_mesh_and_rig(mat):
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
        y_ring, z_top, z_bot, half_w = evaluate_banggai_profile(s)
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

            keel_taper = 1.0 - 0.20 * (cos_t ** 4)
            mid_flank = 1.0 + 0.07 * (sin_t ** 2)
            px = half_w * sin_t * keel_taper * mid_flank

            if s < 0.055:
                lip_env = smoothstep(0.008, 0.025, s) * (1.0 - s / 0.055)
                mouth_indent = math.exp(-((cos_t + 0.08) / 0.20) ** 2) * (1.0 - 0.4 * (sin_t ** 2))
                py += 0.00040 * mouth_indent * lip_env

            eye_ds = (s - 0.145) / 0.052
            eye_dc = (cos_t - 0.18) / 0.28
            eye_r2 = eye_ds * eye_ds + eye_dc * eye_dc
            if eye_r2 < 2.0 and abs(sin_t) > 0.40:
                orbital_rim = math.exp(-((math.sqrt(eye_r2) - 0.90) / 0.28) ** 2)
                px += (1.0 if sin_t > 0 else -1.0) * (0.00040 * orbital_rim)

            gill_s = 0.285 - 0.018 * (cos_t * cos_t)
            gill_delta = (s - gill_s) / 0.016
            if abs(gill_delta) < 2.2 and abs(cos_t) < 0.76 and abs(sin_t) > 0.42:
                gill_step = -0.00060 * gill_delta * math.exp(-gill_delta * gill_delta)
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
    verts.append((0.0, -0.0420, 0.0002))
    vert_weights.append({'spine_0': 1.0})
    for j in range(n_seg):
        jn = (j + 1) % n_seg
        faces.append((snout_c_idx, body_base + jn, body_base + j))
        loop_uvs.extend([(0.02, 0.32), ring_uvs[0][jn], ring_uvs[0][j]])

    tail_c_idx = len(verts)
    verts.append((0.0, 0.0221, 0.0))
    vert_weights.append({'spine_4': 1.0})
    last_b = body_base + (n_rings - 1) * n_seg
    for j in range(n_seg):
        jn = (j + 1) % n_seg
        faces.append((tail_c_idx, last_b + j, last_b + jn))
        loop_uvs.extend([(0.98, 0.32), ring_uvs[-1][j], ring_uvs[-1][jn]])

    # =========================================================================
    # 2. LARGE NOCTURNAL CARDINALFISH EYES (Crossed by Bar 1)
    # =========================================================================
    s_eye = 0.145
    y_eye, _, _, hw_e = evaluate_banggai_profile(s_eye)
    z_eye = 0.0022
    x_eye = hw_e * 0.94
    r_eye_globe = 0.0042

    for side_sign in (1.0, -1.0):
        eye_center = Vector((side_sign * x_eye, y_eye, z_eye))
        eye_axis = Vector((side_sign * 0.96, -0.24, 0.08)).normalized()
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
    # 3A. FIRST SPINOUS DORSAL BANNER FIN (Tall sickle fin with white tassel tips)
    # =========================================================================
    n_d1_cols = 14
    m_d1_rows = 7
    d1_cols = []
    for c_i in range(n_d1_cols):
        s_ray = c_i / (n_d1_cols - 1)
        s_body = lerp(0.31, 0.45, s_ray)
        y_b, z_top_b, _, _ = evaluate_banggai_profile(s_body)

        arch = (math.sin(s_ray * math.pi) ** 0.52) * (1.15 - 0.45 * s_ray)
        fin_h = 0.0185 * arch
        sweep_y = 0.0020 + 0.0065 * (s_ray ** 0.9)

        col = []
        for r_j in range(m_d1_rows):
            t_rad = r_j / (m_d1_rows - 1)
            py = y_b + sweep_y * (t_rad ** 1.25)
            pz = z_top_b - 0.0018 + fin_h * (t_rad ** 0.90)
            half_t = lerp(0.00075, 0.00015, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        d1_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, d1_cols, uv_u_range=(0.02, 0.48))

    # =========================================================================
    # 3B. SECOND SOFT DORSAL HIGH STREAMING BANNER FIN (Signature Pterapogon pennant!)
    # =========================================================================
    n_d2_cols = 18
    m_d2_rows = 9
    d2_cols = []
    for c_i in range(n_d2_cols):
        s_ray = c_i / (n_d2_cols - 1)
        s_body = lerp(0.54, 0.73, s_ray)
        y_b, z_top_b, _, _ = evaluate_banggai_profile(s_body)

        # Tall anterior banner rays sweeping dramatically upward and backward
        pennant = (math.sin(clamp(s_ray * 1.05, 0.04, 0.98) * math.pi) ** 0.48) * (1.28 - 0.68 * (s_ray ** 0.85))
        fin_h = 0.0320 * pennant
        sweep_y = 0.0040 + 0.0165 * (1.0 - 0.35 * s_ray)

        col = []
        for r_j in range(m_d2_rows):
            t_rad = r_j / (m_d2_rows - 1)
            py = y_b + sweep_y * (t_rad ** 1.35)
            pz = z_top_b - 0.0016 + fin_h * (t_rad ** 0.88)
            half_t = lerp(0.00075, 0.00014, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        d2_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, d2_cols, uv_u_range=(0.02, 0.48))

    # =========================================================================
    # 4. SYMMETRICAL STREAMING ANAL BANNER FIN
    # =========================================================================
    n_anal_cols = 18
    m_anal_rows = 9
    anal_cols = []
    for c_i in range(n_anal_cols):
        s_ray = c_i / (n_anal_cols - 1)
        s_body = lerp(0.53, 0.74, s_ray)
        y_b, _, z_bot_b, _ = evaluate_banggai_profile(s_body)

        pennant = (math.sin(clamp(s_ray * 1.05, 0.04, 0.98) * math.pi) ** 0.48) * (1.24 - 0.65 * (s_ray ** 0.85))
        fin_h = 0.0295 * pennant
        sweep_y = 0.0040 + 0.0155 * (1.0 - 0.35 * s_ray)

        col = []
        for r_j in range(m_anal_rows):
            t_rad = r_j / (m_anal_rows - 1)
            py = y_b + sweep_y * (t_rad ** 1.35)
            pz = z_bot_b + 0.0016 - fin_h * (t_rad ** 0.88)
            half_t = lerp(0.00075, 0.00014, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        anal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, anal_cols, uv_u_range=(0.02, 0.48))

    # =========================================================================
    # 5. DEEPLY FORKED SCISSOR CAUDAL FIN WITH EXTENDED LOBES
    # =========================================================================
    n_caudal_cols = 28
    m_caudal_rows = 9
    caudal_cols = []
    y_ped, z_top_p, z_bot_p, hw_ped = evaluate_banggai_profile(0.86)
    for c_i in range(n_caudal_cols):
        s_ray = c_i / (n_caudal_cols - 1)
        ang = lerp(-0.58, 0.58, s_ray)
        z_root = lerp(z_bot_p * 0.98, z_top_p * 0.98, s_ray)
        # Deep scissor V-fork: center rays are short (8.5 mm), outer dorsal & ventral lobe tips extend to 28.5 mm
        fork_factor = abs((s_ray - 0.5) * 2.0) ** 1.35
        ray_len = lerp(0.0085, 0.0285, fork_factor)

        col = []
        for r_j in range(m_caudal_rows):
            t_rad = r_j / (m_caudal_rows - 1)
            py = y_ped + ray_len * t_rad * math.cos(ang * 0.42)
            pz = z_root + ray_len * (t_rad ** 0.94) * math.sin(ang)
            base_t = hw_ped * 0.96 * math.sqrt(max(0.12, 1.0 - 0.78 * ((s_ray - 0.5) * 2.0) ** 2))
            half_t = lerp(base_t, 0.00018, t_rad ** 0.65)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        caudal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, caudal_cols, uv_u_range=(0.50, 0.78))

    # =========================================================================
    # 6. PAIRED HOVERING PECTORAL FINS
    # =========================================================================
    s_pect = 0.295
    y_pect, _, _, hw_pect = evaluate_banggai_profile(s_pect)
    z_pect = -0.0028
    x_pect = hw_pect * 0.90

    for side_label, side_sign in (('L', 1.0), ('R', -1.0)):
        n_p_cols = 18
        m_p_rows = 6
        p_cols = []
        bone_name = f'pectoral_{side_label}'
        for c_i in range(n_p_cols):
            s_ray = c_i / (n_p_cols - 1)
            ang = lerp(-0.62, 0.68, s_ray)
            dome = math.sin(s_ray * math.pi) ** 0.55
            ray_len = 0.0080 + 0.0072 * dome
            z_root_off = lerp(-0.0020, 0.0020, s_ray)

            col = []
            for r_j in range(m_p_rows):
                t_rad = r_j / (m_p_rows - 1)
                out_x = side_sign * (x_pect + ray_len * t_rad * (0.28 + 0.06 * dome) + 0.0009 * math.sin(t_rad * math.pi))
                back_y = y_pect + ray_len * t_rad * 0.92 * math.cos(ang * 0.55)
                up_z = z_pect + z_root_off + ray_len * (t_rad ** 0.95) * math.sin(ang)
                n_vec = Vector((side_sign * 0.94, -0.30, 0.10)).normalized()
                half_t = lerp(0.0006, 0.00014, t_rad)
                w_fin = smoothstep(0.05, 0.30, t_rad)
                w_dict = {bone_name: w_fin, 'spine_1': 1.0 - w_fin} if w_fin < 0.999 else {bone_name: 1.0}
                col.append((Vector((out_x, back_y, up_z)), n_vec, half_t, s_ray, t_rad, w_dict))
            p_cols.append(col)
        append_double_sided_fin(verts, faces, loop_uvs, vert_weights, p_cols, uv_u_range=(0.50, 0.78))

    # =========================================================================
    # 7. LARGE BLACK-AND-PEARL VENTRAL PELVIC FANS
    # =========================================================================
    s_pelv = 0.355
    y_pelv, _, z_bot_pelv, _ = evaluate_banggai_profile(s_pelv)
    for side_sign in (1.0, -1.0):
        n_v_cols = 14
        m_v_rows = 6
        v_cols = []
        for c_i in range(n_v_cols):
            s_ray = c_i / (n_v_cols - 1)
            fan = (math.sin(s_ray * math.pi) ** 0.52) * (1.10 - 0.30 * s_ray)
            ray_len = 0.0110 + 0.0095 * fan
            col = []
            for r_j in range(m_v_rows):
                t_rad = r_j / (m_v_rows - 1)
                px = side_sign * (0.0020 + 0.0032 * t_rad * (0.35 + 0.65 * s_ray))
                py = y_pelv + 0.0040 * s_ray + ray_len * t_rad * 0.68
                pz = z_bot_pelv + 0.0018 - ray_len * t_rad * 0.78
                n_vec = Vector((side_sign * 0.92, -0.25, -0.30)).normalized()
                half_t = lerp(0.00065, 0.00014, t_rad)
                col.append((Vector((px, py, pz)), n_vec, half_t, s_ray * 0.45, t_rad, {'spine_1': 1.0}))
            v_cols.append(col)
        append_double_sided_fin(verts, faces, loop_uvs, vert_weights, v_cols, uv_u_range=(0.02, 0.48))

    # =========================================================================
    # 8. BUILD MESH, UVS, ARMATURE & 48-FRAME BANNER_HOVERER ANIMATION
    # =========================================================================
    mesh = bpy.data.meshes.new('Banggai_Cardinalfish_Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = uv

    mesh.materials.append(mat)

    fish_obj = bpy.data.objects.new('Banggai_Cardinalfish', mesh)
    bpy.context.collection.objects.link(fish_obj)

    arm_data = bpy.data.armatures.new('Banggai_Cardinalfish_Rig')
    arm_obj = bpy.data.objects.new('Banggai_Cardinalfish_Armature', arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')

    joint_y = [-0.042, -0.018, 0.000, 0.012, 0.022, 0.048]
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
        pb.tail = (side_sign * (x_pect + 0.008), y_pect + 0.012, z_pect + 0.002)
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

    # Banner hoverer gait: poised upright diamond body with subtle tail/banner sway & active pectoral sculling
    max_deg = [0.0, 0.30, 0.85, 2.1, 4.2]
    phase_lag = 0.52
    pect_sweep_deg = 22.0
    pect_feather_deg = 14.0

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
        arm_obj.animation_data.action.name = 'banggai_banner_hover_swim'

    scene.frame_set(1)
    bpy.context.view_layer.update()
    return arm_obj, fish_obj


def main():
    prefix = parse_args()
    os.makedirs(os.path.dirname(prefix), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    base_img, norm_img, orm_img = build_banggai_textures(size=1024)
    mat = build_pbr_fish_material('Banggai_Cardinalfish_Mat', base_img, norm_img, orm_img)
    arm_obj, fish_obj = build_banggai_mesh_and_rig(mat)

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
    print('BANGGAI_CARDINALFISH_BUILD_REPORT=' + json.dumps({
        'glbPath': glb_path,
        'glbBytes': os.path.getsize(glb_path),
        'glbSha256': sha256,
        'vertices': len(fish_obj.data.vertices),
        'polygons': len(fish_obj.data.polygons),
    }, sort_keys=True))


if __name__ == '__main__':
    main()
