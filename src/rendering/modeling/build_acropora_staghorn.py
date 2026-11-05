"""Build an upright arborescent Staghorn SPS coral colony (Acropora formosa / cervicornis) in Blender 5.0.

Follows docs/modular-coral-and-live-rock-spec.md (Archetype A — Arborescent Staghorn SPS)
and docs/asset-contract.md (reef-asset-v1, coral-raw-masks-v1):
- Uniform [1, 1, 1] meter scale: ~26 cm wide x 24 cm deep x 23 cm tall.
- Upright antler-like cylindrical branches (12-18 mm diameter) bifurcating at 35-50 deg angles
  with protruding tubular radial corallites and rounded dome axial corallites at branch tips.
- Flared encrusting basal skirt (2.5 cm wide, z = -3 mm at outer rim) with contactAO = 0.15.
- Standardized 4-channel COLOR_0 vertex attribute:
  * R = 0.0 (100% rigid calcified aragonite skeleton)
  * G = growthTipOrPolypMask (0.0 on base -> 1.0 on axial growth tips and radial corallite lips)
  * B = phaseSeed (per-branch hash in [0, 1])
  * A = contactAO (0.15 at basal skirt edge and interior branch axils -> 1.0 on exposed tips)
- Embedded 512x512 procedural PBR textures (baseColor, normal, ORM, and actinic emissive).

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/build_acropora_staghorn.py -- /tmp/coral-models/coral-acropora-staghorn
"""
import hashlib
import json
import math
import os
import struct
import sys

import bpy
from mathutils import Matrix, Vector


def parse_output_prefix():
    argv = sys.argv
    if '--' in argv:
        args = argv[argv.index('--') + 1:]
        if args:
            return os.path.abspath(args[0])
    return '/tmp/coral-models/coral-acropora-staghorn'


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
    n = up.cross(t).normalized()
    b = t.cross(n).normalized()
    return t, n, b


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


def build_staghorn_textures(size=512):
    """
    UV convention:
    v in [0.0, 0.14]: encrusting basal skirt
    v in [0.14, 0.82]: staghorn antler branch wall with costae striations and radial corallite cups
    v in [0.82, 1.00]: bright electric-cyan / ice-blue axial growth tip
    """
    def corallite_bump(u, v):
        costae = math.sin(u * 2.0 * math.pi * 24.0)
        pores = math.sin(u * 2.0 * math.pi * 12.0 + math.sin(v * 32.0)) * math.cos(v * 48.0)
        return costae, pores

    def base_pixel(u, v):
        costae, pores = corallite_bump(u, v)
        c_skirt    = (0.14, 0.19, 0.24)  # #24303D shaded encrusting base
        c_stalk    = (0.09, 0.24, 0.36)  # #173D5C deep royal-teal lower branch
        c_mid      = (0.11, 0.44, 0.64)  # #1C70A3 marine cobalt-aqua mid branch
        c_subtip   = (0.04, 0.78, 0.92)  # #0AC7EB electric reef cyan sub-tip
        c_axial    = (0.86, 0.98, 1.00)  # #DCFAFF pale ice-cyan calcifying axial dome

        col = lerp_color(c_skirt, c_stalk, smoothstep(0.04, 0.22, v))
        col = lerp_color(col, c_mid, smoothstep(0.22, 0.62, v))
        col = lerp_color(col, c_subtip, smoothstep(0.60, 0.84, v))
        col = lerp_color(col, c_axial, smoothstep(0.84, 0.97, v))

        rib = 1.0 + 0.08 * costae + 0.06 * pores
        return (col[0] * rib, col[1] * rib, col[2] * rib, 1.0)

    def normal_pixel(u, v):
        nx = math.cos(u * 2.0 * math.pi * 24.0) * 0.28
        ny = math.sin(v * 48.0) * 0.20
        nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
        return (0.5 + 0.5 * nx, 0.5 + 0.5 * ny, 0.5 + 0.5 * nz, 1.0)

    def orm_pixel(u, v):
        roughness = lerp(0.76, 0.52, smoothstep(0.65, 0.95, v))
        ao = lerp(0.28, 1.0, smoothstep(0.0, 0.45, v))
        return (ao, roughness, 0.0, 1.0)

    def emissive_pixel(u, v):
        tip_glow = smoothstep(0.68, 0.96, v)
        polyp_glow = max(0.0, math.sin(u * 2.0 * math.pi * 12.0) * math.cos(v * 48.0)) * smoothstep(0.20, 0.80, v)
        g_strength = 0.35 * tip_glow + 0.14 * polyp_glow
        return (0.02 * g_strength, 0.78 * g_strength, 0.96 * g_strength, 1.0)

    return (
        make_packed_image('staghorn_base', size, size, base_pixel, non_color=False),
        make_packed_image('staghorn_norm', size, size, normal_pixel, non_color=True),
        make_packed_image('staghorn_orm', size, size, orm_pixel, non_color=True),
        make_packed_image('staghorn_emissive', size, size, emissive_pixel, non_color=False),
    )


def build_staghorn_material(name, base_img, norm_img, orm_img, emi_img):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = 0.0
    if 'Emission Strength' in bsdf.inputs:
        bsdf.inputs['Emission Strength'].default_value = 0.45

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
    norm_node.inputs['Strength'].default_value = 0.55
    links.new(tex_norm.outputs['Color'], norm_node.inputs['Color'])
    links.new(norm_node.outputs['Normal'], bsdf.inputs['Normal'])

    tex_emi = nodes.new('ShaderNodeTexImage')
    tex_emi.image = emi_img
    if 'Emission Color' in bsdf.inputs:
        links.new(tex_emi.outputs['Color'], bsdf.inputs['Emission Color'])

    return mat


def append_swept_tube(verts, faces, loop_uvs, loop_colors, rings, close_top=True, close_bottom=False):
    n_rings = len(rings)
    n_seg = len(rings[0])
    base_v = len(verts)

    for r_i in range(n_rings):
        for j in range(n_seg):
            verts.append(tuple(rings[r_i][j][0]))

    for r_i in range(n_rings - 1):
        b0 = base_v + r_i * n_seg
        b1 = base_v + (r_i + 1) * n_seg
        for j in range(n_seg):
            jn = (j + 1) % n_seg
            faces.append((b0 + j, b0 + jn, b1 + jn, b1 + j))
            u0 = j / n_seg
            u1 = (j + 1) / n_seg
            v0 = rings[r_i][j][1][1]
            v1 = rings[r_i + 1][j][1][1]
            loop_uvs.extend([(u0, v0), (u1, v0), (u1, v1), (u0, v1)])
            loop_colors.extend([
                rings[r_i][j][2],
                rings[r_i][jn][2],
                rings[r_i + 1][jn][2],
                rings[r_i + 1][j][2],
            ])

    if close_top:
        top_r = n_rings - 1
        top_center = sum((rings[top_r][j][0] for j in range(n_seg)), Vector((0.0, 0.0, 0.0))) / n_seg
        top_idx = len(verts)
        verts.append(tuple(top_center))
        top_b = base_v + top_r * n_seg
        top_v = rings[top_r][0][1][1]
        top_col = rings[top_r][0][2]
        for j in range(n_seg):
            jn = (j + 1) % n_seg
            u0 = j / n_seg
            u1 = (j + 1) / n_seg
            faces.append((top_idx, top_b + j, top_b + jn))
            loop_uvs.extend([(0.5 * (u0 + u1), min(0.99, top_v + 0.01)), (u0, top_v), (u1, top_v)])
            loop_colors.extend([top_col, rings[top_r][j][2], rings[top_r][jn][2]])

    if close_bottom:
        bot_center = sum((rings[0][j][0] for j in range(n_seg)), Vector((0.0, 0.0, 0.0))) / n_seg
        bot_idx = len(verts)
        verts.append(tuple(bot_center))
        bot_v = rings[0][0][1][1]
        bot_col = rings[0][0][2]
        for j in range(n_seg):
            jn = (j + 1) % n_seg
            u0 = j / n_seg
            u1 = (j + 1) / n_seg
            faces.append((bot_idx, base_v + jn, base_v + j))
            loop_uvs.extend([(0.5 * (u0 + u1), max(0.01, bot_v - 0.01)), (u1, bot_v), (u0, bot_v)])
            loop_colors.extend([bot_col, rings[0][jn][2], rings[0][j][2]])


def build_staghorn_mesh(mat):
    verts = []
    faces = []
    loop_uvs = []
    loop_colors = []

    # 1. Flared encrusting basal holdfast skirt (2.5 cm wide, contactAO = 0.15 at outer rim)
    skirt_rings = []
    n_skirt_seg = 32
    skirt_profile = [
        (0.064, -0.003, 0.02, 0.0, 0.15),
        (0.052,  0.002, 0.06, 0.0, 0.24),
        (0.038,  0.012, 0.11, 0.05, 0.36),
        (0.024,  0.026, 0.16, 0.10, 0.48),
        (0.012,  0.036, 0.20, 0.14, 0.56),
    ]
    for r_rad, z_h, v_uv, g_mask, ao_val in skirt_profile:
        ring = []
        for j in range(n_skirt_seg):
            theta = (j / n_skirt_seg) * 2.0 * math.pi
            lobe = 1.0 + 0.12 * math.sin(theta * 5.0 + 0.4) + 0.07 * math.cos(theta * 3.0 - 0.8)
            px = r_rad * lobe * math.cos(theta)
            py = r_rad * lobe * math.sin(theta)
            ring.append((Vector((px, py, z_h)), (j / n_skirt_seg, v_uv), (0.0, g_mask, 0.12, ao_val)))
        skirt_rings.append(ring)
    append_swept_tube(verts, faces, loop_uvs, loop_colors, skirt_rings, close_top=True, close_bottom=True)

    # 2. Upright arborescent Staghorn antler branches + secondary tines + radial corallites
    # Each branch spec: (p0, p1, p2, r_start, r_end, v_start, v_end, phase_seed, add_tines)
    primary_branches = []
    n_main = 9
    for b_i in range(n_main):
        az = (b_i / n_main) * 2.0 * math.pi + 0.18 * math.sin(b_i * 2.1)
        tilt = 0.32 + 0.24 * ((b_i % 3) / 2.0)  # 18 deg to 32 deg from vertical
        length = 0.175 + 0.035 * math.cos(b_i * 1.7)
        dx = math.sin(tilt) * math.cos(az)
        dy = math.sin(tilt) * math.sin(az)
        dz = math.cos(tilt)

        p0 = Vector((0.015 * math.cos(az), 0.015 * math.sin(az), 0.016))
        p1 = p0 + Vector((dx * length * 0.48, dy * length * 0.48, dz * length * 0.44))
        # Natural upward phototropic curve toward the reef lights
        p2 = p0 + Vector((dx * length * 0.92, dy * length * 0.92, dz * length * 0.98))
        seed = ((b_i * 0.137 + 0.09) % 0.92) + 0.04
        primary_branches.append((p0, p1, p2, 0.0105, 0.0055, 0.16, 0.98, seed, True, b_i))

    # Central vertical staghorn spire
    primary_branches.append((
        Vector((0.0, 0.0, 0.020)),
        Vector((0.008, -0.006, 0.115)),
        Vector((0.012, -0.008, 0.218)),
        0.0115, 0.0058, 0.18, 0.98, 0.51, True, 9,
    ))

    all_branches = []
    for p0, p1, p2, r0, r1, v0, v1, seed, has_tines, b_idx in primary_branches:
        all_branches.append((p0, p1, p2, r0, r1, v0, v1, seed, 14, 16))
        if has_tines:
            # 2 bifurcating antler tines per primary branch (at t = 0.42 and t = 0.66)
            for t_idx, t_fork in enumerate((0.40, 0.66)):
                u = 1.0 - t_fork
                f0 = (u * u) * p0 + (2.0 * u * t_fork) * p1 + (t_fork * t_fork) * p2
                tang = (2.0 * u * (p1 - p0) + 2.0 * t_fork * (p2 - p1)).normalized()
                _, n_vec, b_vec = frame_from_tangent(tang)
                fork_angle = (b_idx * 1.3 + t_idx * 2.8)
                side_dir = (math.cos(fork_angle) * n_vec + math.sin(fork_angle) * b_vec).normalized()
                tine_dir = (tang * 0.68 + side_dir * 0.62 + Vector((0.0, 0.0, 0.35))).normalized()
                tine_len = 0.078 if t_idx == 0 else 0.056
                f1 = f0 + tine_dir * (tine_len * 0.52)
                f2 = f0 + (tine_dir + Vector((0.0, 0.0, 0.22))).normalized() * tine_len
                r_fork = lerp(r0, r1, t_fork) * 0.84
                v_fork = lerp(v0, v1, t_fork)
                t_seed = ((seed + 0.19 * (t_idx + 1)) % 0.95) + 0.02
                all_branches.append((f0, f1, f2, r_fork, 0.0048, v_fork, 0.98, t_seed, 10, 12))

                # Sub-tine on longer lower forks
                if t_idx == 0 and b_idx % 2 == 0:
                    sf0 = 0.25 * f0 + 0.50 * f1 + 0.25 * f2
                    sub_dir = (tine_dir * 0.65 - side_dir * 0.45 + Vector((0.0, 0.0, 0.45))).normalized()
                    sf1 = sf0 + sub_dir * 0.024
                    sf2 = sf0 + (sub_dir + Vector((0.0, 0.0, 0.25))).normalized() * 0.046
                    all_branches.append((sf0, sf1, sf2, r_fork * 0.76, 0.0042, 0.55, 0.98, (t_seed + 0.11) % 0.96, 8, 10))

    # Build each antler branch + tubular radial corallites along its shaft
    for p0, p1, p2, r0, r1, v0, v1, seed, n_rings, n_seg in all_branches:
        rings = []
        for r_i in range(n_rings):
            s = r_i / (n_rings - 1)
            t = s
            # Rounded dome axial corallite profile at the tip (s > 0.84)
            if s <= 0.84:
                rad = lerp(r0, r1, (s / 0.84) ** 0.85)
            else:
                tip_u = (s - 0.84) / 0.16
                rad = r1 * math.cos(tip_u * math.pi * 0.43)

            um = 1.0 - t
            pos = (um * um) * p0 + (2.0 * um * t) * p1 + (t * t) * p2
            tang = (2.0 * um * (p1 - p0) + 2.0 * t * (p2 - p1)).normalized()
            _, n_vec, b_vec = frame_from_tangent(tang)

            v_uv = lerp(v0, v1, s)
            g_mask = smoothstep(0.58, 0.94, v_uv)
            ao_val = lerp(0.32, 1.0, smoothstep(0.14, 0.78, v_uv))
            rgba = (0.0, g_mask, seed, ao_val)

            ring = []
            for j in range(n_seg):
                ang = (j / n_seg) * 2.0 * math.pi
                pt = pos + (math.cos(ang) * n_vec + math.sin(ang) * b_vec) * rad
                ring.append((pt, (j / n_seg, v_uv), rgba))
            rings.append(ring)

        append_swept_tube(verts, faces, loop_uvs, loop_colors, rings, close_top=True, close_bottom=True)

        # Add protruding tubular radial corallites spiraling up the antler branch
        branch_len = (p2 - p0).length
        n_corallites = max(6, int(branch_len * 115.0))
        for c_i in range(n_corallites):
            t_c = 0.14 + 0.72 * (c_i / max(1, n_corallites - 1))
            um = 1.0 - t_c
            c_base = (um * um) * p0 + (2.0 * um * t_c) * p1 + (t_c * t_c) * p2
            tang = (2.0 * um * (p1 - p0) + 2.0 * t_c * (p2 - p1)).normalized()
            _, n_vec, b_vec = frame_from_tangent(tang)

            phi = c_i * 2.39996 + seed * 6.28  # Golden angle spiral
            out_dir = (math.cos(phi) * n_vec + math.sin(phi) * b_vec).normalized()
            cup_dir = (out_dir * 0.72 + tang * 0.69).normalized()
            _, cn, cb = frame_from_tangent(cup_dir)

            r_shaft = lerp(r0, r1, t_c ** 0.85)
            cup_origin = c_base + out_dir * (r_shaft * 0.82)
            v_cup_base = lerp(v0, v1, t_c)
            ao_cup = lerp(0.40, 0.96, t_c)

            cup_rings = []
            for k_r, (d_len, c_rad, g_val, v_off) in enumerate((
                (0.0,    0.0024, 0.35, 0.00),
                (0.0024, 0.0021, 0.75, 0.06),
                (0.0044, 0.0016, 1.00, 0.12),
            )):
                c_pos = cup_origin + cup_dir * d_len
                c_rgba = (0.0, g_val, seed, ao_cup)
                c_ring = []
                for j in range(6):
                    ang = (j / 6) * 2.0 * math.pi
                    pt = c_pos + (math.cos(ang) * cn + math.sin(ang) * cb) * c_rad
                    c_ring.append((pt, (j / 6, min(0.96, v_cup_base + v_off)), c_rgba))
                cup_rings.append(c_ring)
            append_swept_tube(verts, faces, loop_uvs, loop_colors, cup_rings, close_top=True, close_bottom=True)

    mesh = bpy.data.meshes.new('Acropora_Staghorn_Colony')
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


def main():
    prefix = parse_output_prefix()
    os.makedirs(os.path.dirname(prefix), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4

    base_img, norm_img, orm_img, emi_img = build_staghorn_textures(size=512)
    mat = build_staghorn_material('Acropora_Staghorn_Mat', base_img, norm_img, orm_img, emi_img)
    mesh = build_staghorn_mesh(mat)

    obj = bpy.data.objects.new('Coral_Acropora_Staghorn', mesh)
    bpy.context.collection.objects.link(obj)

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    glb_path = prefix + '.glb'
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=True,
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

    sha256 = hashlib.sha256(open(glb_path, 'rb').read()).hexdigest()
    print('STAGHORN_BUILD_REPORT=' + json.dumps({
        'glbPath': glb_path,
        'glbBytes': os.path.getsize(glb_path),
        'glbSha256': sha256,
    }, sort_keys=True))


if __name__ == '__main__':
    main()
