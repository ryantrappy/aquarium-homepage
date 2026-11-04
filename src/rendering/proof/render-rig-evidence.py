"""Render neutral and sampled swim poses for a rig candidate.

Run: blender --threads 4 -b --python render-rig-evidence.py -- input.glb output-prefix y 1,13,25,37 side,oblique
Frames are rendered with fixed neutral lighting and camera fitting. These are
offline comparison images, not a production aquarium lighting benchmark.
"""
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
source, prefix = args[:2]
axis = args[2] if len(args) > 2 else 'y'
frames = [int(value) for value in args[3].split(',')] if len(args) > 3 else [1, 13, 25, 37]
views = args[4].split(',') if len(args) > 4 else ['side', 'oblique']
if axis not in ('x', 'y'):
    raise ValueError('Axis must be x or y')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.visible_get()]
corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
low = Vector([min(point[i] for point in corners) for i in range(3)])
high = Vector([max(point[i] for point in corners) for i in range(3)])
center = (low + high) * .5
extent = max(high - low)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.resolution_x = 800
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
scene.world.color = (.18, .18, .18)
scene.view_settings.view_transform = 'AgX'

def point_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()

for offset, energy, size in [((3, -4, 5), 500, 5), ((-4, 3, 2), 300, 5)]:
    data = bpy.data.lights.new('Rig review area', 'AREA')
    data.energy = energy * extent * extent
    data.shape = 'DISK'
    data.size = size * extent
    obj = bpy.data.objects.new('Rig review area', data)
    scene.collection.objects.link(obj)
    obj.location = center + Vector(offset) * extent
    point_at(obj, center)

camera_data = bpy.data.cameras.new('Rig review camera')
camera_data.type = 'ORTHO'
camera_data.ortho_scale = extent * 1.35
camera_data.clip_end = max(1000, extent * 10)
camera = bpy.data.objects.new('Rig review camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
directions = {
    'side': (1, 0, 0) if axis == 'y' else (0, -1, 0),
    'front': (0, -1, 0) if axis == 'y' else (1, 0, 0),
    'top': (0, 0, 1),
    'oblique': (1, -.65, .25),
}
for view in views:
    if view not in directions:
        raise ValueError(f'Unsupported view: {view}')
    camera.location = center + Vector(directions[view]) * extent * 4
    point_at(camera, center)
    for frame in frames:
        scene.frame_set(frame)
        scene.render.filepath = f'{prefix}-frame{frame:02d}-{view}.png'
        bpy.ops.render.render(write_still=True)
