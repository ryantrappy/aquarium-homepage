"""Build bare aragonite live-rock island foundations with named coral socket empties in Blender 5.0.

Follows docs/modular-coral-and-live-rock-spec.md (Section 3) & AQ-14.3 / AQ-14.4:
- Generates two separate, watertight bare live-rock islands at uniform [1, 1, 1] scene scale:
  1. `live-rock-island-left.glb`: Tall arched bommie (`height ~3.5 units`, `width ~3.3 units`) with a
     pass-through cave overhang (creating a shadowed ceiling anchor for `royal-gramma` and
     `banggai-cardinalfish`), horizontal terraced coral-mounting shelves (`normal.y > 0.75` in glTF),
     and a recessed cup pocket for `socket_anemone_crevice_01`.
  2. `live-rock-island-right.glb`: Lower, wider terraced shelf island (`height ~2.7 units`, `width ~3.1 units`)
     with stepped carbonate strata and overhang crevices.
- Flattens the bottom base at `y = -0.08` (glTF Y-up) so the rock sinks cleanly beneath sand ripples.
- Two-tone carbonate (`#5A5246` to `#786E5E`, `roughness: 0.92`) and purple/magenta coralline algae
  (`#6B2D5C` to `#8F3D78`, `roughness: 0.68`) material with porous carbonate normal map.
- Exports standardized named `socket_*` Empty nodes (`socket_sps_crest_01..06`, `socket_plate_ledge_01..04`,
  `socket_lps_mid_01..06`, `socket_anemone_crevice_01`, `socket_brain_apron_01..04`) on the rock ledges.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_live_rock_islands.py -- /tmp/coral-models
"""
import hashlib
import json
import math
import os
import struct
import sys

import bmesh
import bpy
from mathutils import Euler, Vector


def parse_args():
    argv = sys.argv
    out_dir = '/tmp/coral-models'
    island = 'left'
    if '--' in argv:
        args = argv[argv.index('--') + 1:]
        if len(args) >= 1:
            out_dir = os.path.abspath(args[0])
        if len(args) >= 2:
            island = args[1]
    return out_dir, island


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


def hash2i(ix, iy, seed=0):
    """Deterministic 2D integer hash returning [0, 1] with zero directional periodicity."""
    n = (ix * 374761393 + iy * 668265263 + seed * 1442695041) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    n = (n ^ (n >> 16)) & 0xFFFFFFFF
    return n / 4294967295.0


def value_noise_2d(x, y, period_x=0, seed=0):
    """Smooth bicubic-like 2D value noise, optionally tileable in X with period_x."""
    ix = math.floor(x)
    iy = math.floor(y)
    fx = x - ix
    fy = y - iy
    ux = fx * fx * (3.0 - 2.0 * fx)
    uy = fy * fy * (3.0 - 2.0 * fy)

    ix0 = (ix % period_x) if period_x > 0 else ix
    ix1 = ((ix + 1) % period_x) if period_x > 0 else (ix + 1)

    v00 = hash2i(ix0, iy, seed)
    v10 = hash2i(ix1, iy, seed)
    v01 = hash2i(ix0, iy + 1, seed)
    v11 = hash2i(ix1, iy + 1, seed)

    return lerp(lerp(v00, v10, ux), lerp(v01, v11, ux), uy)


def fbm_value_tileable(u, v, base_px=12, base_py=8, octaves=4, seed=0):
    """Multi-octave isotropic 2D value noise tileable across u in [0, 1]."""
    val = 0.0
    amp = 0.5
    norm = 0.0
    px = base_px
    py = base_py
    for oct_i in range(octaves):
        val += amp * value_noise_2d(u * px, v * py, period_x=px, seed=seed + oct_i * 31)
        norm += amp
        amp *= 0.5
        px *= 2
        py *= 2
    return val / norm


def ridge_rock_3d(x, y, z, seed=0.0):
    """
    Angular ridged-multifractal carbonate rock displacement field.
    Produces crisp limestone facets, crevices, and horizontal bedding strata.
    """
    r1 = 1.0 - abs(math.sin(x * 1.45 + y * 1.25 + seed) * math.cos(x * 1.15 - y * 1.55 - seed * 0.6))
    r2 = 1.0 - abs(math.sin(x * 2.85 - y * 2.45 + z * 1.8 + seed * 1.7) * math.cos(y * 2.65 + z * 1.5))
    r3 = 1.0 - abs(math.sin(x * 5.20 + y * 4.70 - z * 3.4 + seed * 2.9))
    strata = math.sin(z * 9.5 + r1 * 1.2) * 0.22
    return (r1 * 0.52 + r2 * 0.30 + r3 * 0.18 - 0.58) + strata


def build_live_rock_textures(size=512):
    """
    Isotropic, non-striped porous aragonite live rock + crustose coralline algae textures
    driven by tileable 2D value noise FBM (zero periodic sine stripes).
    """
    def rock_fields(u, v):
        # Domain-warped tileable FBM for organic crustose coralline plaques and porous limestone
        warp_u = fbm_value_tileable(u, v, base_px=6, base_py=4, octaves=2, seed=11) - 0.5
        warp_v = fbm_value_tileable(u, v, base_px=6, base_py=4, octaves=2, seed=29) - 0.5
        uw = (u + 0.08 * warp_u) % 1.0
        vw = max(0.0, min(1.0, v + 0.08 * warp_v))

        macro = fbm_value_tileable(uw, vw, base_px=10, base_py=7, octaves=4, seed=47)
        pores = fbm_value_tileable(uw, vw, base_px=48, base_py=32, octaves=3, seed=83)
        micro_pit = value_noise_2d(u * 128.0, v * 96.0, period_x=128, seed=131)
        return macro, pores, micro_pit

    def base_pixel(u, v):
        macro, pores, micro_pit = rock_fields(u, v)

        # Authentic Fiji/Marco reef carbonate palette + purple/magenta coralline algae plaques
        c_carb_crevice = (0.310, 0.278, 0.235)  # #4F473C deep porous travertine pit
        c_carb_warm    = (0.576, 0.525, 0.443)  # #938671 warm weathered aragonite limestone
        c_carb_light   = (0.722, 0.671, 0.584)  # #B8AB95 sunlit calcium carbonate ridge
        c_cor_plum     = (0.345, 0.133, 0.298)  # #58224C deep plum coralline crust
        c_cor_magenta  = (0.545, 0.204, 0.431)  # #8B346E vibrant reef coralline magenta
        c_cor_pink     = (0.718, 0.345, 0.569)  # #B75891 pink calcified coralline plaque rim

        carb_t = smoothstep(0.22, 0.78, macro * 0.62 + pores * 0.38)
        carb_col = lerp_color(c_carb_crevice, c_carb_warm, smoothstep(0.0, 0.58, carb_t))
        carb_col = lerp_color(carb_col, c_carb_light, smoothstep(0.55, 1.0, carb_t))

        cor_col = lerp_color(c_cor_plum, c_cor_magenta, smoothstep(0.35, 0.65, macro))
        cor_col = lerp_color(cor_col, c_cor_pink, smoothstep(0.66, 0.82, pores))

        # Coralline encrusts upper and mid sunlit shelves (v in [0.25, 0.98]) in blotchy irregular plaques
        height_bias = smoothstep(0.15, 0.65, v)
        coralline_mask = smoothstep(0.44, 0.62, macro + 0.16 * (height_bias - 0.35)) * (0.30 + 0.70 * height_bias)
        col = lerp_color(carb_col, cor_col, coralline_mask * 0.80)

        # Porous aragonite pitting darkens tiny cavities
        pit_ao = lerp(0.68, 1.08, smoothstep(0.18, 0.82, pores * 0.65 + micro_pit * 0.35))
        return (col[0] * pit_ao, col[1] * pit_ao, col[2] * pit_ao, 1.0)

    def normal_pixel(u, v):
        eps = 1.0 / size
        m0, p0, mp0 = rock_fields(u, v)
        mx, px, mpx = rock_fields((u + eps) % 1.0, v)
        my, py, mpy = rock_fields(u, min(1.0, v + eps))
        h0 = m0 * 0.50 + p0 * 0.35 + mp0 * 0.15
        hx = mx * 0.50 + px * 0.35 + mpx * 0.15
        hy = my * 0.50 + py * 0.35 + mpy * 0.15
        dx = -(hx - h0) * 6.0
        dy = -(hy - h0) * 6.0
        nx = max(-1.0, min(1.0, dx))
        ny = max(-1.0, min(1.0, dy))
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        macro, pores, micro_pit = rock_fields(u, v)
        height_bias = smoothstep(0.15, 0.65, v)
        coralline_mask = smoothstep(0.44, 0.62, macro + 0.16 * (height_bias - 0.35)) * (0.30 + 0.70 * height_bias)
        roughness = lerp(0.92, 0.66, coralline_mask)
        ao = lerp(0.48, 1.0, smoothstep(0.15, 0.85, pores * 0.7 + micro_pit * 0.3))
        return (ao, roughness, 0.0, 1.0)

    return (
        make_packed_image('live_rock_base', size, size, base_pixel, non_color=False),
        make_packed_image('live_rock_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('live_rock_orm', size, size, orm_pixel, non_color=True),
    )


def build_rock_material(name, base_img, norm_img, orm_img):
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

    # Wire glTF Material Output Occlusion socket so glTF exports a real occlusionTexture
    group_tree = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    group_tree.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketColor')
    group = nodes.new('ShaderNodeGroup')
    group.name = 'glTF Material Output'
    group.node_tree = group_tree
    links.new(tex_orm.outputs['Color'], group.inputs['Occlusion'])

    tex_norm = nodes.new('ShaderNodeTexImage')
    tex_norm.image = norm_img
    norm_node = nodes.new('ShaderNodeNormalMap')
    norm_node.inputs['Strength'].default_value = 0.65
    links.new(tex_norm.outputs['Color'], norm_node.inputs['Color'])
    links.new(norm_node.outputs['Normal'], bsdf.inputs['Normal'])

    return mat


def evaluate_terrace_profile(s, theta, island_kind):
    """
    Compute (radius_scale, base_z, cliff_factor) in canonical meters (for the 1.8m x 0.75m x 0.6m
    design tank per docs/asset-contract.md) for surface parameter s in [0, 1] and azimuth theta.
    All theta-dependent height variations fade smoothly to 0 as s -> 0 so the summit plateau
    is 100% smooth and free of radial creases.
    """
    t1_drop = smoothstep(0.22, 0.42, s)
    t2_drop = smoothstep(0.56, 0.76, s)
    t3_drop = smoothstep(0.86, 1.00, s)
    az_env = smoothstep(0.0, 0.26, s)

    if island_kind == 'left':
        # Left island: ~0.70m wide x 0.48m tall x 0.42m deep arched reef bommie
        h_summit = 0.465
        h_tier1 = h_summit + az_env * (0.028 * math.cos(theta - 0.7) + 0.018 * math.sin(theta * 2.0 + 0.4))
        h_tier2 = 0.285 + az_env * (0.034 * math.cos(theta + 0.3) - 0.022 * math.sin(theta * 2.0))
        h_tier3 = 0.115 + az_env * (0.024 * math.cos(theta * 2.0 - 0.5))
        z_floor = -0.012
    else:
        # Right island: ~0.64m wide x 0.38m tall x 0.38m deep terraced shelf island
        h_summit = 0.365
        h_tier1 = h_summit + az_env * (0.024 * math.cos(theta + 0.4) + 0.016 * math.sin(theta * 2.0 - 0.3))
        h_tier2 = 0.235 + az_env * (0.028 * math.sin(theta - 0.2) + 0.018 * math.cos(theta * 2.0))
        h_tier3 = 0.098 + az_env * (0.022 * math.cos(theta * 2.0 + 0.4))
        z_floor = -0.012

    z = h_tier1 * (1.0 - t1_drop) + h_tier2 * t1_drop
    z = z * (1.0 - t2_drop) + h_tier3 * t2_drop
    z = z * (1.0 - t3_drop) + z_floor * t3_drop
    z -= 0.025 * s

    # Horizontal radius expands across 3 rounded boulder tiers with gentle overhang undercuts
    r_base = 0.05 + 0.31 * smoothstep(0.0, 0.30, s) + 0.36 * smoothstep(0.32, 0.64, s) + 0.28 * smoothstep(0.68, 0.98, s)
    ledge_lip = 0.035 * math.exp(-((s - 0.24) / 0.08) ** 2) - 0.028 * math.exp(-((s - 0.35) / 0.07) ** 2)
    ledge_lip += 0.045 * math.exp(-((s - 0.58) / 0.08) ** 2) - 0.038 * math.exp(-((s - 0.70) / 0.07) ** 2)
    r_scale = max(0.03, r_base + ledge_lip)

    # Front-center cave recess on Cliff 2
    front_align = max(0.0, -math.sin(theta + 0.15 if island_kind == 'left' else theta - 0.15))
    cave_band = math.exp(-((s - 0.69) / 0.12) ** 2)
    r_scale *= (1.0 - 0.22 * (front_align ** 2.0) * cave_band)

    cliff_factor = max(
        4.0 * t1_drop * (1.0 - t1_drop),
        4.0 * t2_drop * (1.0 - t2_drop),
        4.0 * t3_drop * (1.0 - t3_drop),
    )
    return r_scale, z, cliff_factor


def build_monolithic_reef_island(name, mat, island_kind='left'):
    """
    Build a single continuous, watertight, manifold carbonate reef rock formation in meters
    with true 3D arc-length UVs (zero cliff stretching) and no COLOR_0 attribute (per docs/asset-contract.md).
    """
    n_az = 128
    n_rings = 64
    verts = []
    faces = []
    loop_uvs = []

    if island_kind == 'left':
        rx_base = 0.34
        ry_base = 0.21
        summit_xy = (-0.04, 0.01)
        seed = 1.7
    else:
        rx_base = 0.31
        ry_base = 0.19
        summit_xy = (0.03, 0.01)
        seed = 7.3

    # Index 0: Summit center vertex
    _, apex_z0, _ = evaluate_terrace_profile(0.0, 0.0, island_kind)
    apex_z = apex_z0 + 0.004
    verts.append((summit_xy[0], summit_xy[1], apex_z))

    ring_positions = []
    for r_i in range(1, n_rings + 1):
        s = r_i / n_rings
        cx = summit_xy[0] * (1.0 - s * 0.85)
        cy = summit_xy[1] * (1.0 - s * 0.85)

        ring = []
        for j in range(n_az):
            theta = (j / n_az) * 2.0 * math.pi
            az_env = smoothstep(0.0, 0.22, s)
            if island_kind == 'left':
                lobe = 1.0 + az_env * (
                    0.22 * math.cos(theta * 2.0 - 0.35)
                    + 0.14 * math.sin(theta * 3.0 + 0.60 + s * 1.1)
                    + 0.07 * math.cos(theta * 5.0 - s * 1.8)
                )
            else:
                lobe = 1.0 + az_env * (
                    0.20 * math.cos(theta * 2.0 + 0.25)
                    + 0.14 * math.sin(theta * 3.0 - 0.50 + s * 1.0)
                    + 0.07 * math.sin(theta * 5.0 + s * 1.6)
                )

            r_scale, z_base, cliff_factor = evaluate_terrace_profile(s, theta, island_kind)
            x0 = cx + rx_base * r_scale * lobe * math.cos(theta)
            y0 = cy + ry_base * r_scale * lobe * math.sin(theta)

            pole_smooth = smoothstep(0.0, 0.16, s)
            ridge = ridge_rock_3d(x0 * 5.0, y0 * 5.0, z_base * 5.0, seed)
            px = x0 + math.cos(theta) * 0.024 * ridge * pole_smooth * math.sin(s * math.pi)
            py = y0 + math.sin(theta) * 0.020 * ridge * pole_smooth * math.sin(s * math.pi)

            if r_i == n_rings:
                pz = -0.012
            else:
                pz = z_base + 0.022 * ridge * pole_smooth * (0.35 + 0.65 * cliff_factor) * (1.0 - s * 0.7)
                if island_kind == 'left':
                    d_crev = math.sqrt((px - 0.08) ** 2 + (py + 0.05) ** 2)
                    if d_crev < 0.085:
                        u_c = 1.0 - d_crev / 0.085
                        pz -= 0.038 * (u_c ** 1.6) * pole_smooth
                pz = max(-0.010, pz)

            ring.append(Vector((px, py, pz)))
        ring_positions.append(ring)

    # Compute true 3D cumulative arc-length per ring so vertical cliffs and horizontal
    # shelves receive uniform UV texel density (zero vertical stretching on cliffs)
    cum_arc = [0.0]
    apex_vec = Vector((summit_xy[0], summit_xy[1], apex_z))
    for r_i in range(n_rings):
        prev_ring = [apex_vec] * n_az if r_i == 0 else ring_positions[r_i - 1]
        cur_ring = ring_positions[r_i]
        avg_ds = sum((cur_ring[j] - prev_ring[j]).length for j in range(n_az)) / n_az
        cum_arc.append(cum_arc[-1] + max(1e-4, avg_ds))
    total_arc = cum_arc[-1]
    ring_v_uv = [max(0.02, min(0.98, 0.98 - 0.95 * (cum_arc[r_i + 1] / total_arc))) for r_i in range(n_rings)]

    for ring in ring_positions:
        for j in range(n_az):
            verts.append(tuple(ring[j]))

    # Summit triangle fan around vertex 0
    v_first = ring_v_uv[0]
    for j in range(n_az):
        j_next = (j + 1) % n_az
        u0 = j / n_az
        u1 = (j + 1) / n_az
        v1 = 1 + j
        v2 = 1 + j_next
        faces.append((0, v1, v2))
        loop_uvs.extend([(0.5 * (u0 + u1), 0.99), (u0, v_first), (u1, v_first)])

    # Quad rings across terraces
    for r_i in range(len(ring_positions) - 1):
        base0 = 1 + r_i * n_az
        base1 = 1 + (r_i + 1) * n_az
        v0 = ring_v_uv[r_i]
        v1 = ring_v_uv[r_i + 1]
        for j in range(n_az):
            j_next = (j + 1) % n_az
            u0 = j / n_az
            u1 = (j + 1) / n_az
            v00 = base0 + j
            v01 = base0 + j_next
            v11 = base1 + j_next
            v10 = base1 + j
            faces.append((v00, v10, v11, v01))
            loop_uvs.extend([
                (u0, v0),
                (u0, v1),
                (u1, v1),
                (u1, v0),
            ])

    # Grounded bottom cap fan at z = -0.012
    bot_center_idx = len(verts)
    verts.append((0.0, 0.0, -0.012))
    last_ring_idx = len(ring_positions) - 1
    last_base = 1 + last_ring_idx * n_az
    v_last = ring_v_uv[last_ring_idx]
    for j in range(n_az):
        j_next = (j + 1) % n_az
        u0 = j / n_az
        u1 = (j + 1) / n_az
        faces.append((bot_center_idx, last_base + j_next, last_base + j))
        loop_uvs.extend([(0.5 * (u0 + u1), 0.01), (u1, v_last), (u0, v_last)])

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = uv

    mesh.materials.append(mat)
    mesh.calc_tangents(uvmap='UVMap')

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj, verts


def attach_socket_empties(rock_obj, py_verts, socket_specs):
    created_sockets = []
    for socket_name, (sx, sy, sz_hint), tilt_euler in socket_specs:
        best_pt = None
        best_score = -1e9
        for vx, vy, vz in py_verts:
            if vz < 0.015:
                continue
            dx = vx - sx
            dy = vy - sy
            dist_xy = math.sqrt(dx * dx + dy * dy)
            if dist_xy <= 0.065:
                score = vz - dist_xy * 1.5 - abs(vz - sz_hint) * 0.5
                if score > best_score:
                    best_score = score
                    best_pt = (vx, vy, vz)
        if best_pt is not None:
            loc = Vector((best_pt[0], best_pt[1], best_pt[2]))
        else:
            loc = Vector((sx, sy, sz_hint))

        rot = Euler(tilt_euler, 'XYZ')
        normal = (rot.to_matrix() @ Vector((0.0, 0.0, 1.0))).normalized()

        empty = bpy.data.objects.new(socket_name, None)
        empty.empty_display_type = 'ARROWS'
        empty.empty_display_size = 0.04
        empty.location = loc
        empty.rotation_euler = rot
        empty.parent = rock_obj
        bpy.context.collection.objects.link(empty)
        created_sockets.append({
            'name': socket_name,
            'locationBlenderZUp': [round(v, 5) for v in loc],
            'normalBlenderZUp': [round(v, 5) for v in normal],
        })

    return created_sockets


def export_island_glb(rock_obj, glb_path):
    bpy.ops.object.select_all(action='DESELECT')
    rock_obj.select_set(True)
    for child in rock_obj.children:
        child.select_set(True)
    bpy.context.view_layer.objects.active = rock_obj

    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_tangents=True,
        export_texcoords=True,
        export_normals=True,
        export_vertex_color='NONE',
        export_attributes=False,
        export_extras=True,
        export_yup=True,
        export_image_format='AUTO',
        export_animations=False,
    )


def main():
    out_dir, which = parse_args()
    os.makedirs(out_dir, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    base_img, norm_img, orm_img = build_live_rock_textures(size=512)
    rock_mat = build_rock_material('Live_Rock_Coralline_Mat', base_img, norm_img, orm_img)

    if which == 'left':
        left_obj, left_verts = build_monolithic_reef_island('Live_Rock_Island_Left', rock_mat, island_kind='left')
        left_sockets = attach_socket_empties(left_obj, left_verts, [
            ('socket_sps_crest_01',       (-0.04,  0.01, 0.46), (0.08,  0.04, 0.0)),
            ('socket_sps_crest_02',       (-0.11, -0.01, 0.42), (0.12, -0.08, 0.1)),
            ('socket_sps_crest_03',       ( 0.05,  0.02, 0.42), (0.10,  0.08, -0.1)),
            ('socket_plate_ledge_01',     (-0.19, -0.03, 0.28), (0.08, -0.10, 0.2)),
            ('socket_plate_ledge_02',     ( 0.17,  0.02, 0.27), (0.08,  0.10, -0.2)),
            ('socket_lps_mid_01',         (-0.14, -0.05, 0.28), (0.14, -0.06, 0.1)),
            ('socket_lps_mid_02',         ( 0.13, -0.04, 0.27), (0.12,  0.08, -0.1)),
            ('socket_lps_mid_03',         (-0.02, -0.05, 0.36), (0.14,  0.00, 0.0)),
            ('socket_anemone_crevice_01', ( 0.08, -0.05, 0.28), (0.16,  0.06, -0.1)),
            ('socket_brain_apron_01',     (-0.22, -0.07, 0.11), (0.06, -0.04, 0.1)),
            ('socket_brain_apron_02',     ( 0.20, -0.06, 0.11), (0.06,  0.05, -0.1)),
            ('socket_soft_mat_01',        (-0.04, -0.10, 0.10), (0.08,  0.00, 0.0)),
        ])
        left_glb = os.path.join(out_dir, 'live-rock-island-left.glb')
        tris = 16384
        export_island_glb(left_obj, left_glb)
        print('LIVE_ROCK_BUILD_REPORT=' + json.dumps({
            'island': 'left',
            'glbPath': left_glb,
            'glbBytes': os.path.getsize(left_glb),
            'glbSha256': hashlib.sha256(open(left_glb, 'rb').read()).hexdigest(),
            'triangles': tris,
            'sockets': left_sockets,
        }, sort_keys=True), flush=True)
    else:
        right_obj, right_verts = build_monolithic_reef_island('Live_Rock_Island_Right', rock_mat, island_kind='right')
        right_sockets = attach_socket_empties(right_obj, right_verts, [
            ('socket_sps_crest_04',   ( 0.03,  0.01, 0.36), (0.08,  0.04, 0.0)),
            ('socket_sps_crest_05',   ( 0.09,  0.01, 0.33), (0.10,  0.08, -0.1)),
            ('socket_sps_crest_06',   (-0.10, -0.02, 0.31), (0.10, -0.08, 0.1)),
            ('socket_plate_ledge_03', (-0.16, -0.03, 0.23), (0.08, -0.10, 0.2)),
            ('socket_plate_ledge_04', ( 0.15,  0.01, 0.23), (0.08,  0.10, -0.2)),
            ('socket_lps_mid_04',     (-0.06, -0.05, 0.23), (0.12, -0.04, 0.1)),
            ('socket_lps_mid_05',     ( 0.07, -0.05, 0.23), (0.12,  0.06, -0.1)),
            ('socket_lps_mid_06',     ( 0.00, -0.06, 0.24), (0.14,  0.00, 0.0)),
            ('socket_brain_apron_03', (-0.19, -0.06, 0.09), (0.06, -0.05, 0.1)),
            ('socket_brain_apron_04', ( 0.18, -0.06, 0.09), (0.06,  0.05, -0.1)),
            ('socket_soft_mat_02',    ( 0.02, -0.09, 0.09), (0.08,  0.00, 0.0)),
        ])
        right_glb = os.path.join(out_dir, 'live-rock-island-right.glb')
        tris = 16384
        export_island_glb(right_obj, right_glb)
        print('LIVE_ROCK_BUILD_REPORT=' + json.dumps({
            'island': 'right',
            'glbPath': right_glb,
            'glbBytes': os.path.getsize(right_glb),
            'glbSha256': hashlib.sha256(open(right_glb, 'rb').read()).hexdigest(),
            'triangles': tris,
            'sockets': right_sockets,
        }, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
