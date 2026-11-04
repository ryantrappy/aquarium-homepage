"""Report topology, materials, rig and animation counts for a candidate GLB.

Run: blender -b --python inspect-model.py -- /absolute/path/to/model.glb
This reports evidence for review; it cannot establish anatomy or licensing.
Imported glTF may split vertices at UV or normal seams. Raw boundary counts
therefore do not by themselves prove that the visible surface has holes.
"""
import json
import sys

import bmesh
import bpy

path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=path)

objects = []
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    mesh.calc_loop_triangles()
    objects.append({
        'name': obj.name,
        'vertices': len(mesh.vertices),
        'triangles': len(mesh.loop_triangles),
        'boundary_edges': sum(1 for edge in bm.edges if edge.is_boundary),
        'nonmanifold_edges': sum(1 for edge in bm.edges if not edge.is_manifold),
        'materials': [slot.material.name if slot.material else None for slot in obj.material_slots],
        'uv_layers': [layer.name for layer in mesh.uv_layers],
        'vertex_groups': [group.name for group in obj.vertex_groups],
        'armature_modifier': any(modifier.type == 'ARMATURE' for modifier in obj.modifiers),
    })
    bm.free()

result = {
    'source': path,
    'meshes': objects,
    'armatures': [{'name': obj.name, 'bones': [bone.name for bone in obj.data.bones]} for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'],
    'actions': [{'name': action.name, 'frames': list(action.frame_range)} for action in bpy.data.actions],
    'images': [{'name': image.name, 'size': list(image.size), 'packed': bool(image.packed_file)} for image in bpy.data.images if image.source != 'GENERATED'],
}
print('AQ_MODEL_REPORT ' + json.dumps(result))
