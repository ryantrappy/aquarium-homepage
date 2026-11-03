"""Experimental, approximate fish rig for inspection, not production animation.

Run with Blender: blender -b --python rig-candidate.py -- input.glb output.glb clown|tang
The two known source meshes are normalized to Blender's Y axis (head at -Y).
This script does not modify the source file or author any texture pixels.
"""
import math
import sys

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

source, output, species = sys.argv[sys.argv.index('--') + 1:]
if species not in ('clown', 'tang'):
    raise ValueError('Expected clown or tang')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not meshes:
    raise ValueError('Input has no meshes')

# The downloaded clownfish is longitudinally aligned to Y and the tang to X.
# Rotate the tang's +X-facing snout toward -Y, then normalize the full model.
orientation = Matrix.Rotation(-math.pi / 2, 4, 'Z') if species == 'tang' else Matrix.Identity(4)
for obj in meshes:
    obj.data.transform(orientation @ obj.matrix_world)
    obj.parent = None
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.matrix_world = Matrix.Identity(4)
points = [vertex.co for obj in meshes for vertex in obj.data.vertices]
low = Vector([min(point[i] for point in points) for i in range(3)])
high = Vector([max(point[i] for point in points) for i in range(3)])
center = (low + high) * .5
scale = 2 / (high.y - low.y)
transform = Matrix.Scale(scale, 4) @ Matrix.Translation(-center)
for obj in meshes:
    obj.data.transform(transform)
    obj.data.update()

# Smooth the tang's coarse outline before assigning weights; preserve the
# source texture and UVs. This is an inspection derivative, not a final LOD.
if species == 'tang':
    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new('Inspection silhouette smoothing', 'SUBSURF')
        modifier.subdivision_type = 'CATMULL_CLARK'
        modifier.levels = 1
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        for face in obj.data.polygons:
            face.use_smooth = True
        for material in obj.data.materials:
            if material and material.use_nodes:
                shader = material.node_tree.nodes.get('Principled BSDF')
                if shader:
                    shader.inputs['Roughness'].default_value = .48
                    shader.inputs['Metallic'].default_value = 0
elif species == 'clown':
    # This source joins the pectoral fin to the body mesh. Give only its outer
    # surface a gently translucent variant of the existing textured material;
    # spatial selection is approximate and must be inspected for body leaks.
    for obj in meshes:
        if not obj.data.materials or not obj.data.materials[0]:
            continue
        translucent = obj.data.materials[0].copy()
        translucent.name = 'Experimental clown pectoral translucency'
        translucent.surface_render_method = 'DITHERED'
        if translucent.use_nodes:
            shader = translucent.node_tree.nodes.get('Principled BSDF')
            if shader and not shader.inputs['Alpha'].is_linked:
                shader.inputs['Alpha'].default_value = .8
        obj.data.materials.append(translucent)
        slot = len(obj.data.materials) - 1
        for face in obj.data.polygons:
            center = sum((obj.data.vertices[i].co for i in face.vertices), Vector()) / len(face.vertices)
            if abs(center.x) > .22 and -.42 < center.y < -.02 and -.09 < center.z < .23:
                face.material_index = slot

armature = bpy.data.armatures.new('Experimental fish skeleton')
rig = bpy.data.objects.new('Experimental fish rig', armature)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
ends = [-1.0, -.48, -.12, .23, .55, .78, 1.0]
spines = []
for i in range(len(ends) - 1):
    bone = armature.edit_bones.new(f'spine_{i}')
    bone.head = (0, ends[i], 0)
    bone.tail = (0, ends[i + 1], 0)
    if spines:
        bone.parent = spines[-1]
        bone.use_connect = True
    spines.append(bone)
for side, sign in [('L', 1), ('R', -1)]:
    bone = armature.edit_bones.new('pectoral_' + side)
    bone.head = (sign * (.148 if species == 'tang' else .17), -.47 if species == 'tang' else -.40, -.14 if species == 'tang' else .05)
    bone.tail = (sign * (.18 if species == 'tang' else .34), -.14 if species == 'tang' else -.12, .12 if species == 'tang' else .05)
    bone.parent = spines[1]
bpy.ops.object.mode_set(mode='OBJECT')

# Linear blend along the spine; an intentionally conservative local pectoral
# weight is spatially restricted. Weight quality must be visually checked.
centers = [(ends[i] + ends[i + 1]) / 2 for i in range(len(ends) - 1)]
def spine_weights(y):
    if y <= centers[0]: return [(0, 1.0)]
    if y >= centers[-1]: return [(len(centers) - 1, 1.0)]
    for i in range(len(centers) - 1):
        if centers[i] <= y <= centers[i + 1]:
            t = (y - centers[i]) / (centers[i + 1] - centers[i])
            return [(i, 1 - t), (i + 1, t)]
    raise ValueError('Could not assign spine weight')

for obj in meshes:
    groups = [obj.vertex_groups.new(name=f'spine_{i}') for i in range(len(centers))]
    fins = {side: obj.vertex_groups.new(name='pectoral_' + side) for side in ('L', 'R')}
    for vertex in obj.data.vertices:
        x, y, z = vertex.co
        fin_weight = 0.0
        if species == 'clown' and -.42 < y < -.02 and -.09 < z < .23:
            fin_weight = max(0.0, min(.95, (abs(x) - .20) / .07 * .95))
        for i, weight in spine_weights(y):
            if weight > 0:
                groups[i].add([vertex.index], weight * (1 - fin_weight), 'REPLACE')
        if fin_weight > 0:
            fins['L' if x > 0 else 'R'].add([vertex.index], fin_weight, 'REPLACE')
    modifier = obj.modifiers.new('Experimental armature', 'ARMATURE')
    modifier.object = rig
    obj.parent = rig

if species == 'tang':
    # Trace a subtle operculum edge on the actual body surface. This is a
    # static anatomical cue, not an independently animated gill cover.
    body = meshes[0]
    tree = BVHTree.FromPolygons([v.co.copy() for v in body.data.vertices], [list(p.vertices) for p in body.data.polygons])
    gill_material = bpy.data.materials.new('Experimental tang operculum edge')
    gill_material.use_nodes = True
    gill_shader = gill_material.node_tree.nodes.get('Principled BSDF')
    gill_shader.inputs['Base Color'].default_value = (.57, .45, .035, 1)
    gill_shader.inputs['Roughness'].default_value = .8
    for side, sign in [('L', 1), ('R', -1)]:
        curve = bpy.data.curves.new('Experimental operculum edge', 'CURVE')
        curve.dimensions = '3D'; curve.resolution_u = 12; curve.bevel_depth = .0011; curve.bevel_resolution = 2
        spline = curve.splines.new('POLY'); samples = []
        for i in range(13):
            t = i / 12
            y = (1-t)**2 * -.62 + 2*(1-t)*t * -.55 + t*t * -.39
            z = (1-t)**2 * .02 + 2*(1-t)*t * -.17 + t*t * -.19
            hit, normal, _, _ = tree.ray_cast(Vector((sign, y, z)), Vector((-sign, 0, 0)))
            if hit is not None:
                samples.append(hit + normal * .002)
        if len(samples) < 2:
            continue
        spline.points.add(len(samples) - 1)
        for point, coord in zip(spline.points, samples):
            point.co = (*coord, 1)
        gill = bpy.data.objects.new('Experimental operculum ' + side, curve)
        bpy.context.collection.objects.link(gill); gill.data.materials.append(gill_material)
        bpy.ops.object.select_all(action='DESELECT'); gill.select_set(True); bpy.context.view_layer.objects.active = gill
        bpy.ops.object.convert(target='MESH')
        group = gill.vertex_groups.new(name='spine_1'); group.add(list(range(len(gill.data.vertices))), 1.0, 'REPLACE')
        modifier = gill.modifiers.new('Experimental armature', 'ARMATURE'); modifier.object = rig
        gill.parent = rig

    # The source has no discernible pectoral fins. Add simple, thin curved
    # volume as an explicitly authored proxy; it needs anatomical/art review.
    fin_material = bpy.data.materials.new('Experimental translucent tang fin')
    fin_material.use_nodes = True
    shader = fin_material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (.85, .64, .055, 1)
    shader.inputs['Roughness'].default_value = .5
    shader.inputs['Alpha'].default_value = .2
    fin_material.surface_render_method = 'DITHERED'
    ray_material = bpy.data.materials.new('Experimental tang fin rays')
    ray_material.use_nodes = True
    ray_shader = ray_material.node_tree.nodes.get('Principled BSDF')
    ray_shader.inputs['Base Color'].default_value = (.48, .32, .035, 1)
    ray_shader.inputs['Roughness'].default_value = .55
    ray_shader.inputs['Alpha'].default_value = .6
    ray_material.surface_render_method = 'DITHERED'
    for side, sign in [('L', 1), ('R', -1)]:
        verts, faces = [], []
        radial, rows = 20, 5
        # Two slightly separated skins give a closed, tapered membrane.
        for surface in (-1, 1):
            for row in range(rows + 1):
                t = .015 + .985 * row / rows
                for i in range(radial + 1):
                    angle = -.35 + 1.45 * i / radial
                    reach = .78 + .22 * math.sin(math.pi * i / radial)
                    x = sign * (.148 + .045 * t + .008 * math.sin(math.pi * t)) + surface * .0015 * (1 - .9 * t)
                    y = -.47 + .39 * t * math.cos(angle) * reach
                    z = -.14 + .42 * t * math.sin(angle) * reach
                    verts.append((x, y, z))
        layer = (rows + 1) * (radial + 1)
        for s in range(2):
            base = s * layer
            for row in range(rows):
                for i in range(radial):
                    a = base + row * (radial + 1) + i
                    face = (a, a + 1, a + radial + 2, a + radial + 1)
                    faces.append(face if s else tuple(reversed(face)))
        boundary = list(range(radial + 1)) + [row * (radial + 1) + radial for row in range(1, rows + 1)] + [rows * (radial + 1) + i for i in range(radial - 1, -1, -1)] + [row * (radial + 1) for row in range(rows - 1, 0, -1)]
        for i, a in enumerate(boundary):
            b = boundary[(i + 1) % len(boundary)]
            faces.append((a, b, b + layer, a + layer))
        membrane_faces = len(faces)
        # Fine tapered strips sit just outside the membrane as visible fin rays.
        for i in range(1, radial):
            angle = -.35 + 1.45 * i / radial
            reach = .78 + .22 * math.sin(math.pi * i / radial)
            start = len(verts)
            for t in (.04, .35, .7, .98):
                for direction in (-1, 1):
                    a = angle + direction * .02 * (1 - t)
                    x = sign * (.148 + .045 * t + .008 * math.sin(math.pi * t) + .002)
                    y = -.47 + .39 * t * math.cos(a) * reach
                    z = -.14 + .42 * t * math.sin(a) * reach
                    verts.append((x, y, z))
            for row in range(3):
                j = start + row * 2
                faces.append((j, j + 1, j + 3, j + 2))
        data = bpy.data.meshes.new('Experimental pectoral membrane')
        data.from_pydata(verts, [], faces); data.update()
        fin = bpy.data.objects.new('Experimental pectoral ' + side, data)
        bpy.context.collection.objects.link(fin)
        fin.data.materials.append(fin_material)
        fin.data.materials.append(ray_material)
        for face in fin.data.polygons:
            face.use_smooth = True
            if face.index >= membrane_faces:
                face.material_index = 1
        group = fin.vertex_groups.new(name='pectoral_' + side)
        group.add(list(range(len(verts))), 1.0, 'REPLACE')
        modifier = fin.modifiers.new('Experimental armature', 'ARMATURE'); modifier.object = rig
        fin.parent = rig

scene = bpy.context.scene
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 49
for pose in rig.pose.bones:
    pose.rotation_mode = 'XYZ'
for frame in range(1, 50, 2):
    phase = 2 * math.pi * (frame - 1) / 48
    for i in range(len(centers)):
        pose = rig.pose.bones[f'spine_{i}']
        amplitudes = [0, .8, 2.5, 5, 9, 13] if species == 'clown' else [0, .5, 1.5, 3, 5, 8]
        amplitude = amplitudes[i] * math.pi / 180
        pose.rotation_euler.z = amplitude * math.sin(phase - i * .38)
        pose.keyframe_insert(data_path='rotation_euler', frame=frame, group=pose.name)
    for side, sign in [('L', 1), ('R', -1)]:
        pose = rig.pose.bones['pectoral_' + side]
        pose.rotation_euler.z = sign * (.30 if species == 'tang' else .36) * math.sin(phase * 2)
        pose.keyframe_insert(data_path='rotation_euler', frame=frame, group=pose.name)
if rig.animation_data and rig.animation_data.action:
    rig.animation_data.action.name = 'Experimental swim'
scene.frame_set(1)
bpy.context.view_layer.update()
for obj in [rig, *meshes]:
    print('AQ_TRANSFORM', obj.name, 'determinant', obj.matrix_world.determinant())
bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', export_animations=True)
