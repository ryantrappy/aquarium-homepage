"""Scale the CC0 Innerscene sample for the Mesh2Motion UI, not for production.

Run with Blender: blender -b --python scale-m2m-sample.py -- input.glb output.glb
The original model is in meters and is too small for the default UI view. This
only applies a uniform scale to root objects; it does not alter textures.
"""
import sys
import bpy

source, destination = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
for obj in bpy.context.scene.objects:
    if obj.parent is None:
        obj.scale *= 25
bpy.ops.export_scene.gltf(filepath=destination, export_format='GLB')
