"""Create one bounded, identically shared reef derivative for engine inspection.

blender -b --python prepare-reef.py -- source.glb output.glb --triangles 100000
Optional --rotation X Y Z applies degrees in Blender coordinates before fitting.
Original UV layout and material colors are retained; textures are mechanically
downsampled, never repainted. Tangents are omitted because these materials have
no normal maps. This is a study LOD, not the production habitat.
"""
import argparse
import hashlib
import math
import os
import sys

import bpy
from mathutils import Euler, Matrix, Vector
from mathutils.bvhtree import BVHTree

parser = argparse.ArgumentParser()
parser.add_argument('source')
parser.add_argument('output')
parser.add_argument('--triangles', type=int, default=100000)
parser.add_argument('--texture-size', type=int, default=1024)
parser.add_argument('--checkpoint', help='Optional temporary Blender checkpoint after geometry processing')
parser.add_argument('--rotation', type=float, nargs=3, default=[0, 0, 0])
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
if args.triangles < 1000 or args.texture_size < 256:
    raise ValueError('Expected at least 1000 triangles and 256-pixel textures')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=args.source)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not meshes:
    raise ValueError('Source has no mesh')
rotation = Euler([math.radians(angle) for angle in args.rotation]).to_matrix().to_4x4()
for obj in meshes:
    obj.data.transform(rotation @ obj.matrix_world)
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    obj.data.calc_loop_triangles()
original_triangles = sum(len(obj.data.loop_triangles) for obj in meshes)
# Rejoin the source's material/index chunks before simplifying. Coincident
# UV-seam vertices can share positions while retaining independent loop UVs.
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
body = bpy.context.object
meshes = [body]
stride = max(1, len(body.data.vertices) // 5000)
samples = [body.data.vertices[i].co.copy() for i in range(0, len(body.data.vertices), stride)]
body.data.update()
source_extent = max(max(v.co[i] for v in body.data.vertices) - min(v.co[i] for v in body.data.vertices) for i in range(3))
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=source_extent * 1e-7)
bpy.ops.object.mode_set(mode='OBJECT')
ratio = min(1, args.triangles / original_triangles)
print('AQ_REEF_DECIMATION_START', original_triangles, ratio, flush=True)
for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    if ratio < 1:
        modifier = obj.modifiers.new('Shared engine-study LOD', 'DECIMATE')
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for face in obj.data.polygons:
        face.use_smooth = True
tree = BVHTree.FromPolygons([v.co.copy() for v in body.data.vertices], [list(p.vertices) for p in body.data.polygons])
errors = sorted(tree.find_nearest(point)[3] / source_extent for point in samples)
print('AQ_REEF_SAMPLED_ERROR', {'samples': len(errors), 'rms_fraction_of_span': math.sqrt(sum(e*e for e in errors)/len(errors)), 'p95_fraction_of_span': errors[int(.95*(len(errors)-1))], 'max_fraction_of_span': errors[-1]})
points = [v.co for obj in meshes for v in obj.data.vertices]
low = Vector([min(p[i] for p in points) for i in range(3)])
high = Vector([max(p[i] for p in points) for i in range(3)])
center, extent = (low + high) * .5, max(high - low)
if extent <= 0:
    raise ValueError('Source bounds are degenerate')
normalize = Matrix.Scale(2 / extent, 4) @ Matrix.Translation(-center)
for obj in meshes:
    obj.data.transform(normalize)
    obj.data.update()
    obj.data.calc_loop_triangles()
print('AQ_REEF_SOURCE_TRIANGLES', original_triangles)
print('AQ_REEF_OUTPUT_TRIANGLES', sum(len(obj.data.loop_triangles) for obj in meshes))
print('AQ_REEF_SOURCE_BOUNDS', list(low), list(high))
if args.checkpoint:
    bpy.ops.wm.save_as_mainfile(filepath=args.checkpoint, compress=True)
images = {node.image for obj in meshes for material in obj.data.materials if material and material.use_nodes for node in material.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image}
for image in images:
    width, height = image.size
    if width <= 0 or height <= 0:
        raise ValueError(f'Used material image has no pixels: {image.name}')
    factor = min(1, args.texture_size / max(width, height))
    if factor < 1:
        image.scale(max(1, round(width * factor)), max(1, round(height * factor)))
        image.pack()
print('AQ_REEF_TEXTURES', [(image.name, list(image.size)) for image in images], flush=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=args.output, export_format='GLB', use_selection=True, export_animations=False, export_tangents=False, export_image_format='JPEG', export_jpeg_quality=90)
with open(args.output, 'rb') as exported:
    output_hash = hashlib.sha256(exported.read()).hexdigest()
print('AQ_REEF_OUTPUT', {'path': args.output, 'bytes': os.path.getsize(args.output), 'sha256': output_hash}, flush=True)
