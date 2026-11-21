"""Shared procedural Blender 5.2 modeling, PBR texture, rigging, export, and thumbnail helpers for AQ-109 invertebrates."""

import math
import os
import shutil
import subprocess
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

REPO_ROOT = Path(__file__).resolve().parents[3]
SPLAT_FISH_DIR = REPO_ROOT / 'src/rendering/assets/splat-fish'
PUBLIC_FISH_DIR = REPO_ROOT / 'public/fish'


def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def smoothstep(edge0, edge1, x):
    if edge1 <= edge0:
        return 1.0 if x >= edge1 else 0.0
    t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def np_smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / max(1e-8, edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def np_value_noise(u, v, seed=17):
    """Tileable-friendly deterministic 2D value noise in numpy on arbitrary float arrays."""
    ix = np.floor(u).astype(np.int64)
    iy = np.floor(v).astype(np.int64)
    fx = u - ix
    fy = v - iy
    ux = fx * fx * (3.0 - 2.0 * fx)
    uy = fy * fy * (3.0 - 2.0 * fy)

    def _hash(x_arr, y_arr):
        n = (x_arr * 374761393 + y_arr * 668265263 + seed * 1442695041) & 0xFFFFFFFF
        n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
        n = (n ^ (n >> 16)) & 0xFFFFFFFF
        return n.astype(np.float64) / 4294967295.0

    v00 = _hash(ix, iy)
    v10 = _hash(ix + 1, iy)
    v01 = _hash(ix, iy + 1)
    v11 = _hash(ix + 1, iy + 1)
    return (v00 * (1.0 - ux) + v10 * ux) * (1.0 - uy) + (v01 * (1.0 - ux) + v11 * ux) * uy


def np_fbm(u, v, octaves=4, seed=17):
    total = np.zeros_like(u, dtype=np.float64)
    amp = 0.55
    freq = 1.0
    norm = 0.0
    for idx in range(octaves):
        total += amp * np_value_noise(u * freq + idx * 13.7, v * freq + idx * 7.3, seed=seed + idx * 101)
        norm += amp
        amp *= 0.5
        freq *= 2.13
    return total / norm


def clear_scene_and_setup(samples=24):
    """Clear all Blender datablocks and configure deterministic metric Cycles settings."""
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for datablock in (
        bpy.data.meshes,
        bpy.data.armatures,
        bpy.data.actions,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.textures,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.worlds,
        bpy.data.node_groups,
    ):
        for item in list(datablock):
            datablock.remove(item)

    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 49
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 4
    try:
        scene.render.engine = 'CYCLES'
    except TypeError:
        pass
    if scene.render.engine == 'CYCLES':
        scene.cycles.device = 'CPU'
        scene.cycles.samples = samples
        scene.cycles.seed = 2026
        scene.cycles.use_denoising = True
    return scene


def _orthogonal_frame(tangent, prev_normal=None):
    t = tangent.normalized()
    if prev_normal is not None:
        n = prev_normal - t * prev_normal.dot(t)
        if n.length > 1e-6:
            n.normalize()
            b = t.cross(n).normalized()
            return n, b
    ref = Vector((0.0, 0.0, 1.0)) if abs(t.z) < 0.9 else Vector((1.0, 0.0, 0.0))
    b = t.cross(ref).normalized()
    n = b.cross(t).normalized()
    return n, b


def append_surface_grid(
    verts,
    faces,
    loop_uvs,
    vert_weights,
    grid_pts,
    grid_uvs,
    grid_weights,
    closed_u=False,
    closed_v=False,
    reverse_winding=False,
):
    """Append an indexed quad surface grid of shape [n_u][n_v]."""
    n_u = len(grid_pts)
    n_v = len(grid_pts[0])
    base = len(verts)
    for iu in range(n_u):
        for iv in range(n_v):
            pt = grid_pts[iu][iv]
            verts.append((float(pt[0]), float(pt[1]), float(pt[2])))
            vert_weights.append(grid_weights[iu][iv])

    def idx(iu, iv):
        return base + (iu % n_u) * n_v + (iv % n_v)

    u_steps = n_u if closed_u else n_u - 1
    v_steps = n_v if closed_v else n_v - 1
    for iu in range(u_steps):
        iu1 = (iu + 1) % n_u
        for iv in range(v_steps):
            iv1 = (iv + 1) % n_v
            quad = (idx(iu, iv), idx(iu1, iv), idx(iu1, iv1), idx(iu, iv1))
            uvs = (grid_uvs[iu][iv], grid_uvs[iu1][iv], grid_uvs[iu1][iv1], grid_uvs[iu][iv1])
            if reverse_winding:
                quad = (quad[0], quad[3], quad[2], quad[1])
                uvs = (uvs[0], uvs[3], uvs[2], uvs[1])
            faces.append(quad)
            loop_uvs.extend(uvs)


def append_limb_tube(
    verts,
    faces,
    loop_uvs,
    vert_weights,
    spine_pts,
    radii,
    u_range,
    v_range,
    weights_per_ring,
    ring_seg=10,
    aspect=1.0,
    ridge_amp=0.0,
    ridge_freq=6,
    cap_start=True,
    cap_end=True,
):
    """Loft a smooth parallel-transport tube along spine_pts with clean UVs and joint weights."""
    n_rings = len(spine_pts)
    base = len(verts)
    prev_n = None

    for ri in range(n_rings):
        p = Vector(spine_pts[ri])
        if ri == 0:
            tan = Vector(spine_pts[1]) - p
        elif ri == n_rings - 1:
            tan = p - Vector(spine_pts[ri - 1])
        else:
            tan = Vector(spine_pts[ri + 1]) - Vector(spine_pts[ri - 1])
        n_vec, b_vec = _orthogonal_frame(tan, prev_n)
        prev_n = n_vec

        r_base = radii[ri]
        w_dict = weights_per_ring[ri]
        for si in range(ring_seg):
            ang = 2.0 * math.pi * si / ring_seg
            ridge = 1.0 + ridge_amp * math.cos(ridge_freq * ang)
            rx = r_base * ridge
            ry = r_base * aspect * ridge
            pos = p + n_vec * (math.cos(ang) * rx) + b_vec * (math.sin(ang) * ry)
            verts.append((float(pos.x), float(pos.y), float(pos.z)))
            vert_weights.append(w_dict)

    def v_idx(ri, si):
        return base + ri * ring_seg + (si % ring_seg)

    for ri in range(n_rings - 1):
        v0 = lerp(v_range[0], v_range[1], ri / max(1, n_rings - 1))
        v1 = lerp(v_range[0], v_range[1], (ri + 1) / max(1, n_rings - 1))
        for si in range(ring_seg):
            u0 = lerp(u_range[0], u_range[1], si / ring_seg)
            u1 = lerp(u_range[0], u_range[1], (si + 1) / ring_seg)
            faces.append((v_idx(ri, si), v_idx(ri, si + 1), v_idx(ri + 1, si + 1), v_idx(ri + 1, si)))
            loop_uvs.extend([(u0, v0), (u1, v0), (u1, v1), (u0, v1)])

    uv_mid = (0.5 * (u_range[0] + u_range[1]), v_range[0])
    uv_end = (0.5 * (u_range[0] + u_range[1]), v_range[1])

    if cap_start:
        c_idx = len(verts)
        p0 = spine_pts[0]
        verts.append((float(p0[0]), float(p0[1]), float(p0[2])))
        vert_weights.append(weights_per_ring[0])
        for si in range(ring_seg):
            faces.append((c_idx, v_idx(0, si + 1), v_idx(0, si)))
            u0 = lerp(u_range[0], u_range[1], si / ring_seg)
            u1 = lerp(u_range[0], u_range[1], (si + 1) / ring_seg)
            loop_uvs.extend([uv_mid, (u1, v_range[0]), (u0, v_range[0])])

    if cap_end:
        c_idx = len(verts)
        p1 = spine_pts[-1]
        verts.append((float(p1[0]), float(p1[1]), float(p1[2])))
        vert_weights.append(weights_per_ring[-1])
        r_last = n_rings - 1
        for si in range(ring_seg):
            faces.append((c_idx, v_idx(r_last, si), v_idx(r_last, si + 1)))
            u0 = lerp(u_range[0], u_range[1], si / ring_seg)
            u1 = lerp(u_range[0], u_range[1], (si + 1) / ring_seg)
            loop_uvs.extend([uv_end, (u0, v_range[1]), (u1, v_range[1])])


def append_ellipsoid(
    verts,
    faces,
    loop_uvs,
    vert_weights,
    center,
    radii,
    u_range,
    v_range,
    w_dict,
    seg_u=14,
    seg_v=10,
    rot_euler=(0.0, 0.0, 0.0),
):
    """Append a smooth UV ellipsoid (useful for glossy eyes, tubercles, operculum, nodules)."""
    from mathutils import Euler
    rot_mat = Euler(rot_euler, 'XYZ').to_matrix()
    c_vec = Vector(center)
    base = len(verts)
    for iv in range(seg_v + 1):
        phi = math.pi * iv / seg_v
        sp = math.sin(phi)
        cp = math.cos(phi)
        for iu in range(seg_u):
            th = 2.0 * math.pi * iu / seg_u
            local = Vector((radii[0] * sp * math.cos(th), radii[1] * sp * math.sin(th), radii[2] * cp))
            pos = c_vec + (rot_mat @ local)
            verts.append((float(pos.x), float(pos.y), float(pos.z)))
            vert_weights.append(w_dict)

    def idx(iv, iu):
        return base + iv * seg_u + (iu % seg_u)

    for iv in range(seg_v):
        vv0 = lerp(v_range[0], v_range[1], iv / seg_v)
        vv1 = lerp(v_range[0], v_range[1], (iv + 1) / seg_v)
        for iu in range(seg_u):
            uu0 = lerp(u_range[0], u_range[1], iu / seg_u)
            uu1 = lerp(u_range[0], u_range[1], (iu + 1) / seg_u)
            if iv == 0:
                faces.append((idx(0, iu), idx(1, iu), idx(1, iu + 1)))
                loop_uvs.extend([(uu0, vv0), (uu0, vv1), (uu1, vv1)])
            elif iv == seg_v - 1:
                faces.append((idx(iv, iu), idx(iv + 1, iu), idx(iv, iu + 1)))
                loop_uvs.extend([(uu0, vv0), (uu1, vv1), (uu1, vv0)])
            else:
                faces.append((idx(iv, iu), idx(iv + 1, iu), idx(iv + 1, iu + 1), idx(iv, iu + 1)))
                loop_uvs.extend([(uu0, vv0), (uu0, vv1), (uu1, vv1), (uu1, vv0)])


def derive_normal_from_height(height_grid, strength=2.6):
    """Convert a float32/64 height grid [H, W] into tangent-space RGB normal map [H, W, 3] in [0, 1]."""
    gy, gx = np.gradient(height_grid)
    nx = -gx * strength
    ny = -gy * strength
    nz = np.ones_like(height_grid)
    inv_len = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz)
    rgb = np.stack([
        0.5 + 0.5 * nx * inv_len,
        0.5 + 0.5 * ny * inv_len,
        0.5 + 0.5 * nz * inv_len,
    ], axis=-1)
    return np.clip(rgb, 0.0, 1.0)


def create_and_pack_pbr_textures(asset_id, rgb, norm, rough, metallic, ao, size=512):
    """Save BaseColor, Normal, and ORM PNGs to disk and pack into Blender with exact colorspaces."""
    tex_dir = SPLAT_FISH_DIR / 'blend' / f'{asset_id}-textures'
    tex_dir.mkdir(parents=True, exist_ok=True)

    orm = np.stack([np.clip(ao, 0.0, 1.0), np.clip(rough, 0.0, 1.0), np.clip(metallic, 0.0, 1.0)], axis=-1)
    specs = [
        (f'{asset_id}-albedo', np.clip(rgb, 0.0, 1.0), 'sRGB', tex_dir / f'{asset_id}-albedo.png'),
        (f'{asset_id}-normal', np.clip(norm, 0.0, 1.0), 'Non-Color', tex_dir / f'{asset_id}-normal.png'),
        (f'{asset_id}-orm', orm, 'Non-Color', tex_dir / f'{asset_id}-orm.png'),
    ]
    images = []
    for name, arr, colorspace, file_path in specs:
        rgba = np.empty((size, size, 4), dtype=np.float32)
        rgba[:, :, :3] = arr.astype(np.float32)
        rgba[:, :, 3] = 1.0
        img = bpy.data.images.new(name=name, width=size, height=size, alpha=True, float_buffer=False)
        img.colorspace_settings.name = colorspace
        img.pixels.foreach_set(rgba.ravel())
        img.filepath_raw = str(file_path)
        img.file_format = 'PNG'
        img.save()
        img.pack()
        images.append(img)
    return tuple(images)


def build_invertebrate_pbr_material(mat_name, albedo_img, norm_img, orm_img, normal_strength=0.65, spec=0.52):
    """Create a Principled BSDF material wired with BaseColor, Normal, and shared ORM -> Occ/Rough/Metal."""
    mat = bpy.data.materials.new(mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out_node = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = spec
    links.new(bsdf.outputs['BSDF'], out_node.inputs['Surface'])

    tex_base = nodes.new('ShaderNodeTexImage')
    tex_base.image = albedo_img
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
    norm_node.inputs['Strength'].default_value = normal_strength
    links.new(tex_norm.outputs['Color'], norm_node.inputs['Color'])
    links.new(norm_node.outputs['Normal'], bsdf.inputs['Normal'])

    return mat


def ground_vertices_to_zero(verts, bone_specs):
    """Shift vertices and bone heads/tails uniformly in Z so lowest contact vertex lies strictly at z = 0.0."""
    min_z = min(v[2] for v in verts)
    if abs(min_z) > 1e-6:
        verts = [(x, y, z - min_z) for (x, y, z) in verts]
        adjusted_bones = []
        for name, parent, head, tail in bone_specs:
            adjusted_bones.append((
                name,
                parent,
                (head[0], head[1], head[2] - min_z),
                (tail[0], tail[1], tail[2] - min_z),
            ))
        return verts, adjusted_bones
    return verts, bone_specs


def assemble_rigged_invertebrate(
    obj_prefix,
    verts,
    faces,
    loop_uvs,
    vert_weights,
    bone_specs,
    mat,
    clip_name,
    animate_frame_fn,
):
    """Create validated mesh, armature, normalized weights, and seamless 49-frame animation clip."""
    verts, bone_specs = ground_vertices_to_zero(verts, bone_specs)

    mesh = bpy.data.meshes.new(f'{obj_prefix}_Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    if mesh.validate(verbose=True):
        raise RuntimeError(f'{obj_prefix} generated invalid geometry (fixed on validate)')

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.active = uv_layer
    for li, uv in enumerate(loop_uvs):
        uv_layer.data[li].uv = (float(uv[0]), float(uv[1]))

    mesh.materials.append(mat)
    mesh_obj = bpy.data.objects.new(obj_prefix, mesh)
    bpy.context.collection.objects.link(mesh_obj)

    arm_data = bpy.data.armatures.new(f'{obj_prefix}_Rig')
    arm_obj = bpy.data.objects.new(f'{obj_prefix}_Armature', arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')

    edit_bones = {}
    for b_name, parent_name, head, tail in bone_specs:
        eb = arm_data.edit_bones.new(b_name)
        eb.head = head
        eb.tail = tail
        if parent_name:
            eb.parent = edit_bones[parent_name]
        edit_bones[b_name] = eb

    bpy.ops.object.mode_set(mode='OBJECT')

    bone_names = [spec[0] for spec in bone_specs]
    vgroups = {name: mesh_obj.vertex_groups.new(name=name) for name in bone_names}
    for v_idx, raw_dict in enumerate(vert_weights):
        cleaned = {k: float(v) for k, v in raw_dict.items() if float(v) > 1e-6}
        total = sum(cleaned.values())
        if total <= 1e-6:
            raise RuntimeError(f'Vertex {v_idx} on {obj_prefix} has zero skin weight')
        for k, val in cleaned.items():
            vgroups[k].add([v_idx], val / total, 'REPLACE')

    mesh_obj.parent = arm_obj
    arm_mod = mesh_obj.modifiers.new('Armature', 'ARMATURE')
    arm_mod.object = arm_obj

    for pbone in arm_obj.pose.bones:
        pbone.rotation_mode = 'XYZ'

    for frame in range(1, 50, 2):
        phase = 2.0 * math.pi * (frame - 1) / 48.0
        rotations = animate_frame_fn(phase)
        for b_name, euler in rotations.items():
            pbone = arm_obj.pose.bones[b_name]
            pbone.rotation_euler = euler
            pbone.keyframe_insert(data_path='rotation_euler', frame=frame)

    if arm_obj.animation_data and arm_obj.animation_data.action:
        arm_obj.animation_data.action.name = clip_name

    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    mesh.calc_loop_triangles()
    return arm_obj, mesh_obj, len(mesh.loop_triangles)


def setup_studio_lights(target_center, radius):
    """Set up neutral neutral-reef studio 3-point Cycles lighting + subtle ocean-floor world."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new('Invertebrate_Studio_World')
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (0.12, 0.16, 0.22, 1.0)
    bg.inputs[1].default_value = 0.45

    scale = max(0.03, radius)
    light_specs = [
        ('Key_Light', (-1.8 * scale, -2.1 * scale, 2.8 * scale), 6.0 * scale * scale * 25.0, 2.2 * scale, (1.0, 0.98, 0.96)),
        ('Fill_Light', (2.2 * scale, -1.6 * scale, 1.2 * scale), 2.5 * scale * scale * 25.0, 2.8 * scale, (0.76, 0.88, 1.0)),
        ('Rim_Light', (0.6 * scale, 2.4 * scale, 2.0 * scale), 4.0 * scale * scale * 25.0, 2.0 * scale, (0.85, 0.95, 1.0)),
    ]
    for name, offset, energy, size, color in light_specs:
        light = bpy.data.lights.new(name, 'AREA')
        light.energy = max(0.08, energy)
        light.shape = 'DISK'
        light.size = size
        light.color = color
        lo = bpy.data.objects.new(name, light)
        bpy.context.collection.objects.link(lo)
        lo.location = Vector(target_center) + Vector(offset)
        lo.rotation_euler = (Vector(target_center) - lo.location).to_track_quat('-Z', 'Y').to_euler()


def save_export_and_render_thumbnail(asset_id, species_id, arm_obj, mesh_obj, elev_deg=24.0, yaw_deg=44.0, margin=1.24):
    """Save packed uncompressed .blend, export selection-only .glb, and render 600x400 WebP thumbnail."""
    blend_dir = SPLAT_FISH_DIR / 'blend'
    override_dir = SPLAT_FISH_DIR / 'overrides'
    blend_dir.mkdir(parents=True, exist_ok=True)
    override_dir.mkdir(parents=True, exist_ok=True)
    PUBLIC_FISH_DIR.mkdir(parents=True, exist_ok=True)

    # Compute world bounds for studio lights and camera
    corners = [mesh_obj.matrix_world @ Vector(corner) for corner in mesh_obj.bound_box]
    b_min = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    b_max = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    center = 0.5 * (b_min + b_max)
    radius = 0.5 * (b_max - b_min).length

    setup_studio_lights(center, radius)

    # Set up studio camera facing creature (-Y nose) from front-right 3/4 so head points RIGHT on screen
    cam_data = bpy.data.cameras.new('Thumbnail_Cam')
    cam_data.lens = 52.0
    cam_data.sensor_width = 36.0
    cam_obj = bpy.data.objects.new('Thumbnail_Cam', cam_data)
    bpy.context.collection.objects.link(cam_obj)

    yaw = math.radians(yaw_deg)
    elev = math.radians(elev_deg)
    # Camera direction from center: (-sin(yaw)*cos(elev), -cos(yaw)*cos(elev), sin(elev))
    # With nose at -Y, negative X places nose toward screen right (+X).
    cam_dir = Vector((-math.sin(yaw) * math.cos(elev), -math.cos(yaw) * math.cos(elev), math.sin(elev))).normalized()
    look_quat = (-cam_dir).to_track_quat('-Z', 'Y')
    cam_right = look_quat @ Vector((1.0, 0.0, 0.0))
    cam_up = look_quat @ Vector((0.0, 1.0, 0.0))

    max_proj_x = max(abs((c - center).dot(cam_right)) for c in corners)
    max_proj_y = max(abs((c - center).dot(cam_up)) for c in corners)
    max_depth = max((c - center).dot(cam_dir) for c in corners)

    fov_h = 2.0 * math.atan((cam_data.sensor_width * 0.5) / cam_data.lens)
    fov_v = 2.0 * math.atan(((cam_data.sensor_width / 1.5) * 0.5) / cam_data.lens)
    dist_x = (max_proj_x * margin) / math.tan(fov_h * 0.5)
    dist_y = (max_proj_y * margin) / math.tan(fov_v * 0.5)
    dist = max(dist_x, dist_y) + max_depth

    cam_obj.location = center + cam_dir * dist
    cam_obj.rotation_euler = look_quat.to_euler()
    cam_data.clip_start = max(0.001, dist * 0.1)
    cam_data.clip_end = max(10.0, dist * 10.0)

    scene = bpy.context.scene
    scene.camera = cam_obj

    # 1. Save uncompressed packed .blend without .blend1 backups
    bpy.context.preferences.filepaths.save_version = 0
    blend_path = blend_dir / f'{asset_id}.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), compress=False)

    # 2. Export ONLY [arm_obj, mesh_obj] (never lights/camera) as Y-up rigged animated GLB
    bpy.ops.object.select_all(action='DESELECT')
    arm_obj.select_set(True)
    mesh_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    override_path = override_dir / f'{asset_id}.glb'
    bpy.ops.export_scene.gltf(
        filepath=str(override_path),
        export_format='GLB',
        use_selection=True,
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
        export_extras=True,
    )

    # 3. Render 600x400 transparent RGBA thumbnail and convert to WebP
    tmp_png = Path(f'/tmp/{asset_id}-thumb.png')
    webp_path = PUBLIC_FISH_DIR / f'{species_id}.webp'
    prev_res = (scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage)
    prev_trans = scene.render.film_transparent
    prev_samples = scene.cycles.samples if scene.render.engine == 'CYCLES' else 32
    try:
        scene.render.resolution_x = 600
        scene.render.resolution_y = 400
        scene.render.resolution_percentage = 100
        scene.render.film_transparent = True
        scene.render.image_settings.file_format = 'PNG'
        scene.render.image_settings.color_mode = 'RGBA'
        scene.render.filepath = str(tmp_png)
        if scene.render.engine == 'CYCLES':
            scene.cycles.samples = 32
        bpy.ops.render.render(write_still=True)
        cwebp_bin = shutil.which('cwebp') or '/opt/homebrew/bin/cwebp'
        subprocess.run([cwebp_bin, '-q', '88', str(tmp_png), '-o', str(webp_path)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    finally:
        if tmp_png.exists():
            tmp_png.unlink()
        scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = prev_res
        scene.render.film_transparent = prev_trans
        if scene.render.engine == 'CYCLES':
            scene.cycles.samples = prev_samples

    return {
        'blendPath': str(blend_path),
        'overridePath': str(override_path),
        'webpPath': str(webp_path),
        'dimensionsM': [float(b_max.x - b_min.x), float(b_max.y - b_min.y), float(b_max.z - b_min.z)],
        'boundsMinZ': float(b_min.z),
    }
