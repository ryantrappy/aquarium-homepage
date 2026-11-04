"""Render neutral inspection views (front, oblique, top, closeup) of a modular coral GLB.

Because modular coral assets store the 4-channel shader data contract in COLOR_0
(R=flexibilityMask, G=growthTipOrPolypMask, B=phaseSeed, A=contactAO) per
docs/modular-coral-and-live-rock-spec.md, Blender's default glTF importer wires
COLOR_0 into a Multiply node on Base Color. This script inspects and reports the
COLOR_0 channel ranges first, then unlinks the importer's automatic COLOR_0
diffuse multiply so Cycles renders the true PBR baseColor, normal, roughness,
and emissive maps.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --threads 4 -b --python src/rendering/modeling/render_coral_views.py -- /path/to/coral.glb /tmp/coral-models/renders/coral-name
"""
import json
import sys

import bmesh
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
source_glb, output_prefix = args[:2]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.threads_mode = 'FIXED'
bpy.context.scene.render.threads = 4

bpy.ops.import_scene.gltf(filepath=source_glb)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not meshes:
    raise ValueError(f'No meshes found in {source_glb}')

# Inspect topology & COLOR_0 channel distributions
mesh_reports = []
for obj in meshes:
    m = obj.data
    m.calc_loop_triangles()
    bm = bmesh.new()
    bm.from_mesh(m)
    boundary_edges = sum(1 for e in bm.edges if e.is_boundary)
    nonmanifold_edges = sum(1 for e in bm.edges if not e.is_manifold)
    bm.free()

    color_ranges = {}
    if m.color_attributes:
        ca = m.color_attributes[0]
        rs = [c.color[0] for c in ca.data]
        gs = [c.color[1] for c in ca.data]
        bs = [c.color[2] for c in ca.data]
        als = [c.color[3] for c in ca.data]
        color_ranges = {
            'R_flexibility': [round(min(rs), 4), round(max(rs), 4)],
            'G_growthOrPolyp': [round(min(gs), 4), round(max(gs), 4)],
            'B_phaseSeed': [round(min(bs), 4), round(max(bs), 4)],
            'A_contactAO': [round(min(als), 4), round(max(als), 4)],
        }
    mesh_reports.append({
        'name': obj.name,
        'vertices': len(m.vertices),
        'triangles': len(m.loop_triangles),
        'boundaryEdges': boundary_edges,
        'nonmanifoldEdges': nonmanifold_edges,
        'uvLayers': [u.name for u in m.uv_layers],
        'color0Ranges': color_ranges,
    })

# Unlink automatic glTF importer VERTEX_COLOR -> Base Color multiply so PBR maps render accurately
for mat in bpy.data.materials:
    if not mat.node_tree:
        continue
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf:
        continue
    for link in list(links):
        if link.to_node == bsdf and link.to_socket.name == 'Base Color' and link.from_node.type == 'MIX':
            mix_node = link.from_node
            for sub_link in list(links):
                if sub_link.to_node == mix_node and sub_link.to_socket.name == 'A' and sub_link.from_node.type == 'TEX_IMAGE':
                    tex_node = sub_link.from_node
                    links.remove(link)
                    links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
                    break

corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
low = Vector([min(point[i] for point in corners) for i in range(3)])
high = Vector([max(point[i] for point in corners) for i in range(3)])
center = (low + high) * 0.5
extent = max(high - low)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 28
scene.render.resolution_x = 800
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
if scene.world is None:
    scene.world = bpy.data.worlds.new('InspectionWorld')
scene.world.use_nodes = True
bg_node = scene.world.node_tree.nodes.get('Background')
if bg_node:
    bg_node.inputs['Color'].default_value = (0.06, 0.14, 0.20, 1.0)
    bg_node.inputs['Strength'].default_value = 0.85
scene.view_settings.view_transform = 'AgX'


def point_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()


# 3-point reef-inspired inspection lighting (overhead 14,000K + actinic blue rim + warm sand bounce)
light_specs = [
    ((2.2, -2.8, 4.5), 480.0, 4.0, (0.86, 0.93, 1.00)),
    ((-3.2, 2.2, 2.5), 260.0, 4.5, (0.35, 0.58, 1.00)),
    ((0.0, -2.5, -2.5), 140.0, 5.0, (0.85, 0.78, 0.65)),
]
for offset, energy, size, col in light_specs:
    data = bpy.data.lights.new('Reef inspection area', 'AREA')
    data.energy = energy * extent * extent
    data.shape = 'DISK'
    data.size = size * extent
    data.color = col
    obj = bpy.data.objects.new('Reef inspection area', data)
    scene.collection.objects.link(obj)
    obj.location = center + Vector(offset) * extent
    point_at(obj, center)

camera_data = bpy.data.cameras.new('Inspection camera')
camera_data.type = 'ORTHO'
camera_data.clip_end = max(100.0, extent * 20.0)
camera = bpy.data.objects.new('Inspection camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera

views = [
    ('front',   (0.0, -1.0, 0.12), 1.25),
    ('oblique', (0.82, -0.78, 0.48), 1.28),
    ('top',     (0.0, -0.08, 1.0), 1.25),
    ('closeup', (0.45, -0.88, 0.28), 0.68),
]
for label, direction, scale_mult in views:
    camera_data.ortho_scale = extent * scale_mult
    camera.location = center + Vector(direction).normalized() * extent * 4.0
    point_at(camera, center)
    scene.render.filepath = f'{output_prefix}-{label}.png'
    bpy.ops.render.render(write_still=True)

print('CORAL_INSPECTION_REPORT=' + json.dumps({
    'source': source_glb,
    'boundsMin': [round(v, 4) for v in low],
    'boundsMax': [round(v, 4) for v in high],
    'extent': round(extent, 4),
    'meshes': mesh_reports,
}, sort_keys=True), flush=True)
