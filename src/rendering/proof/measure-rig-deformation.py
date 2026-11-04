"""Measure per-frame vertex displacement from a neutral GLB pose.

Run: blender -b --python measure-rig-deformation.py -- input.glb clown|tang [1,13,25,37,49]
This is a diagnostic of the current exported animation, not a biological
fidelity or muscle/fin-kinematics measurement. Regions are normalized-axis
proxies chosen to compare the same source mesh across rig revisions.
"""
import json
import math
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:]
source, species = args[:2]
frames = [int(value) for value in args[2].split(',')] if len(args) > 2 else [1, 13, 25, 37, 49]
if species not in ('clown', 'tang'):
    raise ValueError('Expected clown or tang')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
scene = bpy.context.scene
# Blender may create hidden, non-exported placeholder meshes in the
# ``glTF_not_exported`` collection. Exclude them from the deformation sample.
meshes = [obj for obj in scene.objects if obj.type == 'MESH' and obj.visible_get()]
if not meshes:
    raise ValueError('Input has no meshes')

def evaluated_positions(frame):
    scene.frame_set(frame)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    result = {}
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        matrix = evaluated.matrix_world
        result[obj.name] = [matrix @ vertex.co for vertex in mesh.vertices]
        evaluated.to_mesh_clear()
    return result

neutral = evaluated_positions(1)
regions = {}
for obj in meshes:
    base_points = [vertex.co.copy() for vertex in obj.data.vertices]
    low_y = min(point.y for point in base_points)
    high_y = max(point.y for point in base_points)
    low_z = min(point.z for point in base_points)
    high_z = max(point.z for point in base_points)
    y_extent = max(1e-9, high_y - low_y)
    z_extent = max(1e-9, high_z - low_z)
    memberships = {'all': list(range(len(base_points)))}
    if species == 'clown':
        memberships['anterior_band_proxy'] = [i for i, point in enumerate(base_points) if -.50 <= point.y <= .15]
        memberships['posterior_body_proxy'] = [i for i, point in enumerate(base_points) if point.y >= .15]
    else:
        memberships['trunk_proxy'] = [i for i, point in enumerate(base_points) if point.y <= low_y + .79 * y_extent and abs(point.z) <= .42 * z_extent]
        memberships['dorsal_anal_sail_proxy'] = [i for i, point in enumerate(base_points) if point.y <= low_y + .80 * y_extent and abs(point.z) > .20 * z_extent]
        memberships['peduncle_tail_proxy'] = [i for i, point in enumerate(base_points) if point.y >= low_y + .73 * y_extent]
    regions[obj.name] = memberships

reports = []
for frame in frames:
    posed = evaluated_positions(frame)
    mesh_results = []
    for name, indices_by_region in regions.items():
        mesh_report = {'mesh': name, 'regions': {}}
        neutral_points = neutral[name]
        posed_points = posed[name]
        if len(neutral_points) != len(posed_points):
            raise RuntimeError(f'Vertex count changed for {name} at frame {frame}')
        for region_name, indices in indices_by_region.items():
            if not indices:
                continue
            deltas = [posed_points[index] - neutral_points[index] for index in indices]
            squared = [delta.length_squared for delta in deltas]
            count = len(deltas)
            mesh_report['regions'][region_name] = {
                'vertices': count,
                'rms_displacement': math.sqrt(sum(squared) / count),
                'max_displacement': max(math.sqrt(value) for value in squared),
                'rms_x': math.sqrt(sum(delta.x * delta.x for delta in deltas) / count),
                'rms_y': math.sqrt(sum(delta.y * delta.y for delta in deltas) / count),
                'rms_z': math.sqrt(sum(delta.z * delta.z for delta in deltas) / count),
            }
        mesh_results.append(mesh_report)
    reports.append({'frame': frame, 'meshes': mesh_results})

print('AQ_RIG_DEFORMATION ' + json.dumps({
    'source': source,
    'species': species,
    'neutral_frame': 1,
    'frames': frames,
    'region_definitions': {
        'clown': 'anterior_band_proxy is local Y [-0.50, 0.15]; posterior_body_proxy is local Y >= 0.15',
        'tang': 'trunk_proxy is local Y <= 79% extent and |Z| <= 42% extent; dorsal_anal_sail_proxy is local Y <= 80% and |Z| > 20%; peduncle_tail_proxy is local Y >= 73% extent',
    },
    'measurements': reports,
}, sort_keys=True))
