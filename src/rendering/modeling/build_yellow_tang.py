"""
Build a photorealistic, anatomically sculpted, rigged and animated Yellow Tang
(Zebrasoma flavescens) in Blender 5.0 with procedural 1024x1024 PBR textures
(BaseColor, Tangent Normal, Packed ORM with glTF Occlusion), forceps-like grazing snout,
flush convex cornea eyes, raised white caudal peduncle scalpel spine, tall sail-like
dorsal and anal fins, and a looping 48-frame labriform_rigid_disc swim animation.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_yellow_tang.py -- /tmp/fish-models/fish-yellow-tang
  (Also supports legacy 2-arg invocation: -- /optional/skin.png /tmp/tang-study)
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
        raise SystemExit('Usage: blender --threads 4 -b --python build_yellow_tang.py -- [optional_skin.png] <output_prefix>')
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


def build_yellow_tang_textures(size=1024):
    """
    Build 1024x1024 BaseColor, Tangent Normal, and Packed ORM (R=Occlusion, G=Roughness, B=Metallic)
    atlases for Zebrasoma flavescens:
      - Body UV island: u in [0.02, 0.98], v in [0.04, 0.60]
      - Fin UV island:  u in [0.02, 0.78], v in [0.66, 0.96]
      - Eye UV island:  polar disc around (0.90, 0.83) with radius 0.075
    """
    base_pixels = [0.0] * (size * size * 4)
    norm_pixels = [0.0] * (size * size * 4)
    orm_pixels = [0.0] * (size * size * 4)

    c_lemon_flank = (0.98, 0.78, 0.032)     # Luminous Hawaiian canary / lemon-chrome yellow
    c_gold_dorsal = (0.91, 0.58, 0.014)     # Warm golden-amber upper back & supraorbital crest
    c_citrine_belly = (0.99, 0.86, 0.14)    # Bright sunlit lemon-cream cheek & lower abdomen
    c_mid_band = (0.95, 0.71, 0.022)        # Subtle horizontal mid-flank band visible in live Zebrasoma
    c_scalpel_white = (0.97, 0.98, 0.99)    # Porcelain-white caudal peduncle spine (scalpel)
    c_scalpel_sheath = (0.76, 0.46, 0.015)  # Amber groove around the scalpel spine

    for py in range(size):
        v = (py + 0.5) / size
        row_off = py * size * 4
        for px in range(size):
            u = (px + 0.5) / size
            idx = row_off + px * 4

            r, g, b = c_lemon_flank
            nx, ny, nz = 0.0, 0.0, 1.0
            ao = 1.0
            rough = 0.36
            metal = 0.0

            if v <= 0.63:
                # --- BODY UV ISLAND ---
                u_body = clamp((u - 0.02) / 0.96, 0.0, 1.0)
                z_norm = clamp((v - 0.04) / 0.56, 0.0, 1.0)

                mottle = fbm2(u_body * 16.0, z_norm * 16.0)
                dorsal_arch = smoothstep(0.58, 0.96, z_norm)
                ventral_glow = 1.0 - smoothstep(0.06, 0.42, z_norm)

                col = lerp_color(c_lemon_flank, c_citrine_belly, ventral_glow * 0.48)
                col = lerp_color(col, c_gold_dorsal, dorsal_arch * (0.72 + 0.28 * mottle))

                # Subtle horizontal mid-lateral tonal band & fine longitudinal sensory striations
                mid_band_m = math.exp(-((z_norm - 0.50) / 0.15) ** 2) * smoothstep(0.28, 0.42, u_body) * (1.0 - smoothstep(0.76, 0.88, u_body))
                striation = 0.5 + 0.5 * math.sin((z_norm * 46.0 + 0.18 * math.sin(u_body * 18.0)) * 2.0 * math.pi)
                col = lerp_color(col, c_mid_band, mid_band_m * (0.35 + 0.30 * striation))

                # High-arched lateral line following the dorsal contour from gill to peduncle
                lat_line_z = 0.52 + 0.24 * math.sin(clamp((u_body - 0.20) / 0.66, 0.0, 1.0) * math.pi)
                lat_dist = abs(z_norm - lat_line_z)
                lat_mask = math.exp(-((lat_dist / 0.009) ** 2)) * smoothstep(0.22, 0.28, u_body) * (1.0 - smoothstep(0.82, 0.88, u_body))
                col = lerp_color(col, c_gold_dorsal, lat_mask * 0.42)

                # Fine surgeonfish micro-ctenoid scale sheen (110x64)
                scale_env = smoothstep(0.22, 0.34, u_body) * (1.0 - 0.4 * smoothstep(0.86, 0.98, u_body))
                su = u_body * 110.0
                sv = z_norm * 64.0 + (0.5 if int(math.floor(su)) % 2 == 1 else 0.0)
                fu = su - math.floor(su) - 0.5
                fv = sv - math.floor(sv) - 0.5
                scale_edge = smoothstep(0.36, 0.52, math.sqrt(fu * fu + fv * fv)) * scale_env
                col = lerp_color(col, (col[0] * 0.94, col[1] * 0.89, col[2] * 0.78), scale_edge * 0.18)

                # Opercular gill slit shadow at u_body ~ 0.275
                gill_curve = 0.275 - 0.022 * ((z_norm - 0.45) ** 2)
                gill_m = math.exp(-((u_body - gill_curve) / 0.007) ** 2) * smoothstep(0.14, 0.28, z_norm) * (1.0 - smoothstep(0.62, 0.74, z_norm))
                col = lerp_color(col, c_scalpel_sheath, gill_m * 0.58)

                # Signature bright-white caudal peduncle scalpel spine (u_body in [0.79, 0.87], z_norm ~ 0.50)
                du_sp = (u_body - 0.832) / 0.036
                dz_sp = (z_norm - 0.500) / (0.022 * (1.0 - 0.35 * clamp(du_sp, -1.0, 1.0)))
                r_sp = math.sqrt(du_sp * du_sp + dz_sp * dz_sp)
                sheath_m = (1.0 - smoothstep(0.85, 1.35, r_sp)) * smoothstep(0.45, 0.85, r_sp)
                spine_m = 1.0 - smoothstep(0.0, 0.82, r_sp)

                col = lerp_color(col, c_scalpel_sheath, sheath_m * 0.70)
                col = lerp_color(col, c_scalpel_white, spine_m)

                # Subtle golden-olive lip tip at grazing snout (u_body < 0.032)
                if u_body < 0.032:
                    lip_m = (1.0 - u_body / 0.032) * math.exp(-((z_norm - 0.46) / 0.08) ** 2)
                    col = lerp_color(col, (0.72, 0.45, 0.02), lip_m * 0.65)

                r, g, b = col
                nx = -fu * 0.07 * scale_env + (-0.28 * du_sp * spine_m)
                ny = -fv * 0.07 * scale_env + (-0.28 * dz_sp * spine_m) + (0.14 * lat_mask * (1.0 if z_norm > lat_line_z else -1.0))
                ao = 1.0 - 0.14 * gill_m - 0.12 * sheath_m - 0.03 * scale_edge
                rough = lerp(0.35, 0.18, spine_m)

            elif u >= 0.80 and v >= 0.64:
                # --- EYE UV ISLAND (center at u=0.90, v=0.83, radius=0.075) ---
                du = (u - 0.90) / 0.075
                dv = (v - 0.83) / 0.075
                r_eye = math.sqrt(du * du + dv * dv)
                ang = math.atan2(dv, du)

                pupil_m = 1.0 - smoothstep(0.35, 0.41, r_eye)
                iris_m = smoothstep(0.35, 0.41, r_eye) * (1.0 - smoothstep(0.75, 0.85, r_eye))
                fiber = 0.5 + 0.5 * math.sin(ang * 28.0 + math.cos(r_eye * 10.0))
                iris_inner = (0.98, 0.78, 0.08)
                iris_outer = (0.68, 0.46, 0.02)
                iris_col = lerp_color(iris_outer, iris_inner, fiber * 0.65 + 0.35 * (1.0 - r_eye))
                limbus_col = (0.76, 0.52, 0.02)

                col = lerp_color(limbus_col, iris_col, iris_m)
                col = lerp_color(col, (0.012, 0.012, 0.016), pupil_m)

                spec_d = math.sqrt((du + 0.14) ** 2 + (dv - 0.16) ** 2)
                spec_m = 1.0 - smoothstep(0.03, 0.10, spec_d)
                col = lerp_color(col, (1.0, 0.99, 0.95), spec_m * 0.88)

                r, g, b = col
                rough = 0.05
                ao = 1.0 - 0.16 * smoothstep(0.78, 1.0, r_eye)

            else:
                # --- FIN UV ISLAND (u in [0.02, 0.78] = ray coordinate, v in [0.66, 0.96] = base-to-tip) ---
                s_ray = clamp((u - 0.02) / 0.76, 0.0, 1.0)
                t_rad = clamp((v - 0.66) / 0.30, 0.0, 1.0)

                # 32 crisp surgeonfish fin rays with delicate golden-yellow inter-radial webbing
                ray_wave = math.cos(s_ray * 32.0 * 2.0 * math.pi)
                ray_ridge = 0.5 + 0.5 * ray_wave

                c_fin_spine = (0.99, 0.83, 0.06)
                c_fin_web = (0.93, 0.66, 0.018)
                col = lerp_color(c_fin_web, c_fin_spine, ray_ridge * 0.72 + 0.28 * (1.0 - t_rad))

                # Delicate bright lemon sub-marginal line & warm golden tip margin
                sub_margin = smoothstep(0.78, 0.88, t_rad) * (1.0 - smoothstep(0.92, 0.98, t_rad))
                tip_edge = smoothstep(0.91, 0.99, t_rad)
                col = lerp_color(col, (1.0, 0.92, 0.24), sub_margin * 0.55)
                col = lerp_color(col, (0.86, 0.55, 0.015), tip_edge * 0.45)

                r, g, b = col
                nx = -math.sin(s_ray * 32.0 * 2.0 * math.pi) * 0.26
                ny = 0.05
                ao = lerp(0.82, 1.0, smoothstep(0.0, 0.28, t_rad))
                rough = lerp(0.42, 0.28, ray_ridge)

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

    base_img = create_packed_image('YellowTang_BaseColor', size, size, base_pixels, is_data=False)
    norm_img = create_packed_image('YellowTang_Normal', size, size, norm_pixels, is_data=True)
    orm_img = create_packed_image('YellowTang_ORM', size, size, orm_pixels, is_data=True)
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


def evaluate_yellow_tang_profile(s):
    """
    Return (y_pos, z_dorsal, z_ventral, half_width) in canonical meters for longitudinal parameter s in [0, 1].
    Authentic Zebrasoma flavescens proportions:
      - Snout tip at y = -0.078 m, caudal peduncle end at y = +0.048 m (body length 12.6 cm, total length with caudal fin ~15.6 cm).
      - Pointed, slightly upturned forceps-like grazing snout (s in [0, 0.18]) with concave supraorbital bridge (s in [0.10, 0.24])
        sweeping steeply upward into a deep, laterally compressed oval disc body (z_top = +0.041 m, z_bot = -0.039 m).
      - Narrow caudal peduncle housing the white erectile scalpel spine (s in [0.83, 0.92]).
    """
    y_snout = -0.078
    y_peduncle = 0.048
    y = lerp(y_snout, y_peduncle, s)

    # Dorsal profile: smooth C1-continuous concave supraorbital snout bridge rising into deep oval disc
    if s < 0.46:
        u = s / 0.46
        # Concave snout dip for u < 0.35 followed by steep smooth nuchal rise to z_top = +0.0415 m
        snout_base = -0.0032 * ((1.0 - u) ** 2.4) + 0.0040 * math.sin(min(1.0, u / 0.32) * math.pi * 0.5)
        disc_arch = 0.0375 * (smoothstep(0.10, 1.0, u) ** 1.15)
        z_top = snout_base + disc_arch
    elif s < 0.89:
        u = (s - 0.46) / 0.43
        z_top = lerp(0.0415, 0.0090, smoothstep(0.0, 1.0, u ** 1.12))
    else:
        u = (s - 0.89) / 0.11
        z_top = lerp(0.0090, 0.0052, smoothstep(0.0, 1.0, u))

    # Ventral profile: smooth concave lower jaw sweeping into deep thoracic belly -> anal base -> peduncle
    if s < 0.48:
        u = s / 0.48
        jaw_base = -0.0042 * ((1.0 - u) ** 2.2) - 0.0042 * math.sin(min(1.0, u / 0.32) * math.pi * 0.5)
        belly_arch = -0.0353 * (smoothstep(0.08, 1.0, u) ** 1.10)
        z_bot = jaw_base + belly_arch
    elif s < 0.89:
        u = (s - 0.48) / 0.41
        z_bot = lerp(-0.0395, -0.0086, smoothstep(0.0, 1.0, u ** 1.10))
    else:
        u = (s - 0.89) / 0.11
        z_bot = lerp(-0.0086, -0.0050, smoothstep(0.0, 1.0, u))

    # Lateral half-width: strongly compressed surgeonfish disc (~11.0 mm max half-width = 2.2 cm total thickness)
    if s < 0.26:
        u = s / 0.26
        half_w = 0.0108 * (math.sin(u * math.pi * 0.5) ** 0.62)
    elif s < 0.89:
        u = (s - 0.26) / 0.63
        half_w = lerp(0.0108, 0.0032, smoothstep(0.0, 1.0, u))
    else:
        u = (s - 0.89) / 0.11
        half_w = lerp(0.0032, 0.00025, smoothstep(0.0, 1.0, u))

    return y, z_top, z_bot, half_w


def append_double_sided_fin(verts, faces, loop_uvs, vert_weights, columns):
    n_cols = len(columns)
    m_rows = len(columns[0])
    base_v = len(verts)

    for sign in (1.0, -1.0):
        for c_i in range(n_cols):
            for r_j in range(m_rows):
                pos, n_vec, half_t, s_ray, t_rad, w_dict = columns[c_i][r_j]
                ray_rib = 0.5 + 0.5 * math.cos(s_ray * 32.0 * 2.0 * math.pi)
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
    joints = [-0.078, -0.036, 0.002, 0.028, 0.048, 0.077]
    centers = [0.5 * (joints[i] + joints[i + 1]) for i in range(len(joints) - 1)]
    if y <= -0.024:
        return {'spine_0': 1.0}
    progress = smoothstep(-0.024, 0.068, y)
    pos = 1.0 + progress * (len(centers) - 2)
    pos = clamp(pos, 0.0, len(centers) - 1.0)
    lo = int(pos)
    hi = min(len(centers) - 1, lo + 1)
    blend = pos - lo
    if lo == hi or blend <= 1e-6:
        return {f'spine_{lo}': 1.0}
    return {f'spine_{lo}': 1.0 - blend, f'spine_{hi}': blend}


def build_yellow_tang_mesh_and_rig(mat):
    verts = []
    faces = []
    loop_uvs = []
    vert_weights = []

    # =========================================================================
    # 1. LATERALLY COMPRESSED ZEBRASOMA DISC BODY + SCALPEL SPINE RELIEF
    # =========================================================================
    n_rings = 96
    n_seg = 64
    body_base = len(verts)

    ring_uvs = []
    for r_i in range(n_rings):
        s = ((r_i + 0.35) / (n_rings - 0.65)) ** 1.10
        y_ring, z_top, z_bot, half_w = evaluate_yellow_tang_profile(s)
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

            # Laterally compressed surgeonfish cross-section with tapered dorsal/ventral keels
            keel_taper = 1.0 - 0.24 * (cos_t ** 4)
            mid_flank_fullness = 1.0 + 0.08 * (sin_t ** 2) * (1.0 - 0.5 * (cos_t ** 2))
            px = half_w * sin_t * keel_taper * mid_flank_fullness

            # (a) Small grazing mouth cleft at tip of tubular snout (s < 0.045)
            if s < 0.045:
                lip_env = smoothstep(0.006, 0.020, s) * (1.0 - s / 0.045)
                mouth_indent = math.exp(-((cos_t + 0.06) / 0.16) ** 2) * (1.0 - 0.4 * (sin_t ** 2))
                py += 0.00040 * mouth_indent * lip_env

            # (b) Orbital socket rim high on forehead (s ~ 0.165, cos_t ~ 0.36)
            eye_ds = (s - 0.165) / 0.042
            eye_dc = (cos_t - 0.36) / 0.24
            eye_r2 = eye_ds * eye_ds + eye_dc * eye_dc
            if eye_r2 < 2.0 and abs(sin_t) > 0.40:
                orbital_rim = math.exp(-((math.sqrt(eye_r2) - 0.90) / 0.28) ** 2)
                px += (1.0 if sin_t > 0 else -1.0) * (0.00042 * orbital_rim)

            # (c) Oblique surgeonfish operculum (gill cover) ridge at s ~ 0.275
            gill_s = 0.275 - 0.018 * cos_t
            gill_delta = (s - gill_s) / 0.015
            if abs(gill_delta) < 2.2 and cos_t < 0.48 and cos_t > -0.78 and abs(sin_t) > 0.40:
                gill_step = -0.00070 * gill_delta * math.exp(-gill_delta * gill_delta)
                px += (1.0 if sin_t > 0 else -1.0) * gill_step

            # (d) Raised 3D caudal peduncle scalpel spine (s in [0.79, 0.87], cos_t ~ 0.0)
            sp_ds = (s - 0.832) / 0.034
            sp_dc = cos_t / 0.15
            sp_r2 = sp_ds * sp_ds + sp_dc * sp_dc
            if sp_r2 < 1.6 and abs(sin_t) > 0.55:
                scalpel_bump = 0.00095 * math.exp(-sp_r2 * 1.6)
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
    verts.append((0.0, -0.0780, -0.0038))
    vert_weights.append({'spine_0': 1.0})
    for j in range(n_seg):
        jn = (j + 1) % n_seg
        faces.append((snout_c_idx, body_base + jn, body_base + j))
        loop_uvs.extend([(0.02, 0.30), ring_uvs[0][jn], ring_uvs[0][j]])

    tail_c_idx = len(verts)
    verts.append((0.0, 0.0481, 0.0))
    vert_weights.append({'spine_4': 1.0})
    last_b = body_base + (n_rings - 1) * n_seg
    for j in range(n_seg):
        jn = (j + 1) % n_seg
        faces.append((tail_c_idx, last_b + j, last_b + jn))
        loop_uvs.extend([(0.98, 0.32), ring_uvs[-1][j], ring_uvs[-1][jn]])

    # =========================================================================
    # 2. FLUSH CONVEX CORNEA EYES (Positioned high above the grazing snout)
    # =========================================================================
    s_eye = 0.165
    y_eye, z_top_e, z_bot_e, hw_e = evaluate_yellow_tang_profile(s_eye)
    z_eye = 0.5 * (z_top_e + z_bot_e) + 0.36 * 0.5 * (z_top_e - z_bot_e)
    x_eye = hw_e * 0.92
    r_eye_globe = 0.0044

    for side_sign in (1.0, -1.0):
        eye_center = Vector((side_sign * x_eye, y_eye, z_eye))
        eye_axis = Vector((side_sign * 0.96, -0.24, 0.12)).normalized()
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
    # 3. TALL SAIL-LIKE DORSAL FIN (Characteristic Zebrasoma continuous high sail)
    # =========================================================================
    n_dorsal_cols = 36
    m_dorsal_rows = 8
    dorsal_cols = []
    for c_i in range(n_dorsal_cols):
        s_ray = c_i / (n_dorsal_cols - 1)
        s_body = lerp(0.24, 0.81, s_ray)
        y_b, z_top_b, _, _ = evaluate_yellow_tang_profile(s_body)

        # Tall anterior-mid sail arch that sweeps gracefully back toward the peduncle
        sail_env = (math.sin(s_ray * math.pi) ** 0.58) * (1.0 + 0.26 * math.sin(clamp(s_ray / 0.65, 0.0, 1.0) * math.pi))
        scallop = 1.0 - 0.022 * (0.5 - 0.5 * math.cos(s_ray * 26.0 * 2.0 * math.pi))
        fin_h = 0.0255 * sail_env * scallop
        sweep_y = 0.0020 + 0.0095 * (s_ray ** 1.25)

        col = []
        for r_j in range(m_dorsal_rows):
            t_rad = r_j / (m_dorsal_rows - 1)
            py = y_b - 0.0008 + sweep_y * (t_rad ** 1.15)
            pz = z_top_b - 0.0022 + fin_h * (t_rad ** 0.90)
            half_t = lerp(0.0010, 0.00018, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        dorsal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, dorsal_cols)

    # =========================================================================
    # 4. SYMMETRICAL SAIL-LIKE ANAL FIN
    # =========================================================================
    n_anal_cols = 28
    m_anal_rows = 8
    anal_cols = []
    for c_i in range(n_anal_cols):
        s_ray = c_i / (n_anal_cols - 1)
        s_body = lerp(0.40, 0.81, s_ray)
        y_b, _, z_bot_b, _ = evaluate_yellow_tang_profile(s_body)

        sail_env = (math.sin(s_ray * math.pi) ** 0.60) * (1.0 + 0.20 * math.sin(clamp(s_ray / 0.70, 0.0, 1.0) * math.pi))
        scallop = 1.0 - 0.020 * (0.5 - 0.5 * math.cos(s_ray * 20.0 * 2.0 * math.pi))
        fin_h = 0.0225 * sail_env * scallop
        sweep_y = 0.0020 + 0.0090 * (s_ray ** 1.20)

        col = []
        for r_j in range(m_anal_rows):
            t_rad = r_j / (m_anal_rows - 1)
            py = y_b + sweep_y * (t_rad ** 1.12)
            pz = z_bot_b + 0.0020 - fin_h * (t_rad ** 0.90)
            half_t = lerp(0.00095, 0.00018, t_rad)
            w_dict = spine_weight_for_y(py)
            col.append((Vector((0.0, py, pz)), Vector((1.0, 0.0, 0.0)), half_t, s_ray, t_rad, w_dict))
        anal_cols.append(col)
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, anal_cols)

    # =========================================================================
    # 5. TRUNCATE / SLIGHTLY EMARGINATE CAUDAL FIN (Rooted seamlessly at s=0.89)
    # =========================================================================
    n_caudal_cols = 28
    m_caudal_rows = 8
    caudal_cols = []
    y_ped, z_top_p, z_bot_p, hw_ped = evaluate_yellow_tang_profile(0.89)
    for c_i in range(n_caudal_cols):
        s_ray = c_i / (n_caudal_cols - 1)
        ang = lerp(-0.56, 0.56, s_ray)
        z_root = lerp(z_bot_p * 0.98, z_top_p * 0.98, s_ray)
        # Truncate/slightly emarginate surgeonfish tail: outer dorsal & ventral lobes slightly longer than center
        lobe_ext = 0.92 + 0.14 * (((s_ray - 0.5) * 2.0) ** 2)
        scallop = 1.0 - 0.016 * (0.5 - 0.5 * math.cos(s_ray * 22.0 * 2.0 * math.pi))
        ray_len = 0.0315 * lobe_ext * scallop

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
    append_double_sided_fin(verts, faces, loop_uvs, vert_weights, caudal_cols)

    # =========================================================================
    # 6. PAIRED LABRIFORM ROWING PECTORAL FINS (Primary propulsion fans)
    # =========================================================================
    s_pect = 0.295
    y_pect, _, _, hw_pect = evaluate_yellow_tang_profile(s_pect)
    z_pect = -0.0072
    x_pect = hw_pect * 0.90

    for side_label, side_sign in (('L', 1.0), ('R', -1.0)):
        n_p_cols = 20
        m_p_rows = 7
        p_cols = []
        bone_name = f'pectoral_{side_label}'
        for c_i in range(n_p_cols):
            s_ray = c_i / (n_p_cols - 1)
            ang = lerp(-0.62, 0.76, s_ray)
            # Asymmetrical surgeonfish pectoral wing: longer upper-posterior leading rays
            wing_profile = (math.sin(s_ray * math.pi) ** 0.55) * (0.78 + 0.38 * s_ray)
            ray_len = 0.0115 + 0.0145 * wing_profile
            z_root_off = lerp(-0.0032, 0.0032, s_ray)

            col = []
            for r_j in range(m_p_rows):
                t_rad = r_j / (m_p_rows - 1)
                out_x = side_sign * (x_pect + ray_len * t_rad * (0.26 + 0.08 * wing_profile) + 0.0012 * math.sin(t_rad * math.pi))
                back_y = y_pect + ray_len * t_rad * 0.92 * math.cos(ang * 0.55)
                up_z = z_pect + z_root_off + ray_len * (t_rad ** 0.95) * math.sin(ang)
                n_vec = Vector((side_sign * 0.94, -0.30, 0.12)).normalized()
                half_t = lerp(0.0008, 0.00018, t_rad)
                w_fin = smoothstep(0.05, 0.30, t_rad)
                w_dict = {bone_name: w_fin, 'spine_1': 1.0 - w_fin} if w_fin < 0.999 else {bone_name: 1.0}
                col.append((Vector((out_x, back_y, up_z)), n_vec, half_t, s_ray, t_rad, w_dict))
            p_cols.append(col)
        append_double_sided_fin(verts, faces, loop_uvs, vert_weights, p_cols)

    # =========================================================================
    # 7. PAIRED THORACIC PELVIC FINS
    # =========================================================================
    s_pelv = 0.335
    y_pelv, _, z_bot_pelv, _ = evaluate_yellow_tang_profile(s_pelv)
    for side_sign in (1.0, -1.0):
        n_v_cols = 12
        m_v_rows = 5
        v_cols = []
        for c_i in range(n_v_cols):
            s_ray = c_i / (n_v_cols - 1)
            ray_len = 0.0105 + 0.0075 * (math.sin(s_ray * math.pi) ** 0.60)
            col = []
            for r_j in range(m_v_rows):
                t_rad = r_j / (m_v_rows - 1)
                px = side_sign * (0.0022 + 0.0028 * t_rad * (0.35 + 0.65 * s_ray))
                py = y_pelv + 0.0050 * s_ray + ray_len * t_rad * 0.78
                pz = z_bot_pelv + 0.0024 - ray_len * t_rad * 0.68
                n_vec = Vector((side_sign * 0.92, -0.25, -0.30)).normalized()
                half_t = lerp(0.0007, 0.00016, t_rad)
                col.append((Vector((px, py, pz)), n_vec, half_t, s_ray, t_rad, {'spine_1': 1.0}))
            v_cols.append(col)
        append_double_sided_fin(verts, faces, loop_uvs, vert_weights, v_cols)

    # =========================================================================
    # 8. BUILD MESH, UVS, ARMATURE & 48-FRAME LABRIFORM_RIGID_DISC ANIMATION
    # =========================================================================
    mesh = bpy.data.meshes.new('Yellow_Tang_Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = uv

    mesh.materials.append(mat)

    fish_obj = bpy.data.objects.new('Yellow_Tang', mesh)
    bpy.context.collection.objects.link(fish_obj)

    arm_data = bpy.data.armatures.new('Yellow_Tang_Rig')
    arm_obj = bpy.data.objects.new('Yellow_Tang_Armature', arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')

    joint_y = [-0.078, -0.036, 0.002, 0.028, 0.048, 0.077]
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

    # Labriform rigid-disc gait: rigid anterior/mid disc trunk, active pectoral rowing + caudal peduncle trim
    max_deg = [0.0, 0.25, 0.75, 2.3, 5.8]
    phase_lag = 0.50
    pect_sweep_deg = 26.0
    pect_feather_deg = 16.0

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
        arm_obj.animation_data.action.name = 'yellow_tang_labriform_swim'

    scene.frame_set(1)
    bpy.context.view_layer.update()
    return arm_obj, fish_obj


def main():
    prefix = parse_args()
    os.makedirs(os.path.dirname(prefix), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    base_img, norm_img, orm_img = build_yellow_tang_textures(size=1024)
    mat = build_pbr_fish_material('Yellow_Tang_Mat', base_img, norm_img, orm_img)
    arm_obj, fish_obj = build_yellow_tang_mesh_and_rig(mat)

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
    print('YELLOW_TANG_BUILD_REPORT=' + json.dumps({
        'glbPath': glb_path,
        'glbBytes': os.path.getsize(glb_path),
        'glbSha256': sha256,
        'vertices': len(fish_obj.data.vertices),
        'polygons': len(fish_obj.data.polygons),
    }, sort_keys=True))


if __name__ == '__main__':
    main()
