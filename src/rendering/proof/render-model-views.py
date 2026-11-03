"""Render neutral side/front/top views of a GLB whose long axis is X or Y.

Run: blender -b --python render-model-views.py -- /absolute/input.glb /absolute/output-prefix [x|y] [frame] [side|front|top|oblique]
This is an inspection aid, not a production lighting or fidelity benchmark.
"""
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
source, prefix = args[:2]
axis = args[2] if len(args) > 2 else 'y'
frame = int(args[3]) if len(args) > 3 else 1
only_view = args[4] if len(args) > 4 else None
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
low = Vector([min(point[i] for point in corners) for i in range(3)])
high = Vector([max(point[i] for point in corners) for i in range(3)])
center = (low + high) * .5
extent = max(high - low)

scene = bpy.context.scene
scene.frame_set(frame)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 800
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
scene.world.color = (.18, .18, .18)
scene.view_settings.view_transform = 'AgX'

def point_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()

for offset, energy, size in [((3, -4, 5), 500, 5), ((-4, 3, 2), 300, 5)]:
    data = bpy.data.lights.new('Inspection area', 'AREA')
    data.energy = energy * extent * extent
    data.shape = 'DISK'
    data.size = size * extent
    obj = bpy.data.objects.new('Inspection area', data)
    scene.collection.objects.link(obj)
    obj.location = center + Vector(offset) * extent
    point_at(obj, center)

camera_data = bpy.data.cameras.new('Inspection camera')
camera_data.type = 'ORTHO'
camera_data.ortho_scale = extent * 1.35
camera_data.clip_end = max(1000, extent * 10)
camera = bpy.data.objects.new('Inspection camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
directions = [('side', (0, -1, 0)), ('front', (1, 0, 0)), ('top', (0, 0, 1))] if axis == 'x' else [('side', (1, 0, 0)), ('front', (0, -1, 0)), ('top', (0, 0, 1))]
directions.append(('oblique', (1, -.65, .25)))
for label, direction in directions:
    if only_view and label != only_view:
        continue
    camera.location = center + Vector(direction) * extent * 4
    point_at(camera, center)
    scene.render.filepath = f'{prefix}-{label}.png'
    bpy.ops.render.render(write_still=True)
