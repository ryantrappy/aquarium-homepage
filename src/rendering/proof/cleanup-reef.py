"""AQ-14.3 review-only scan boundary/core experiment. Never overwrites source.

blender --factory-startup -b --python src/rendering/proof/cleanup-reef.py -- \
  src/rendering/proof/candidate-reef.glb /tmp/aq14-3-reef-cleanup

Retains source loop UVs/materials. Only geometry is trimmed; no image repainting.
New closed core and inspection sand are original procedural geometry. The core
is a backing/contact repair, not living coral. No production scene is changed.
"""
import argparse
import hashlib
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

parser = argparse.ArgumentParser()
parser.add_argument('source')
parser.add_argument('output_directory')
parser.add_argument('--skip-renders', action='store_true')
parser.add_argument('--interior-rock', action='store_true', help='One bounded original rock behind the exposed central scan aperture')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = os.path.abspath(args.source)
output = os.path.abspath(args.output_directory)
os.makedirs(output, exist_ok=True)
destination = os.path.join(output, 'reef-cleaned-review.glb')
if source == destination:
    raise ValueError('The experiment must not overwrite its input')
source_hash = hashlib.sha256(open(source, 'rb').read()).hexdigest()
expected = 'b8ad404d0caca115f22153d7d97642415412f4527391a7285da7fba190001a86'
if source_hash != expected:
    raise ValueError('Recipe expects the reviewed candidate-reef.glb hash')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
for obj in meshes:
    obj.data.transform(obj.matrix_world)
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
scan = bpy.context.object
scan.name = 'Retained VIVID REALITY scan surface'
bm = bmesh.new()
bm.from_mesh(scan.data)
# Welding keeps per-face loop UVs; GLB re-splits UV seams on export.
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)

def stats(mesh):
    return {
        'vertices_welded': len(mesh.verts), 'faces': len(mesh.faces),
        'triangles': sum(len(face.verts) - 2 for face in mesh.faces),
        'boundary_edges': sum(edge.is_boundary for edge in mesh.edges),
        'nonmanifold_edges': sum(not edge.is_manifold for edge in mesh.edges),
        'bounds_blender_z_up': [[min(v.co[i] for v in mesh.verts) for i in range(3)],
                                [max(v.co[i] for v in mesh.verts) for i in range(3)]],
    }

before = stats(bm)
# Explicit source-space recipe: discard the blue photographic floor/underside,
# crop rectangular outer edges into an oval, and discard long narrow torn faces
# touching the original reconstruction boundary. These are lossy art choices.
floor = -.17
cut_height = -.18
radius_x, radius_y, center_y = .77, .80, .02
deleted = {'below_contact': 0, 'outer_footprint': 0, 'boundary_slivers': 0}
faces = []
for face in bm.faces:
    center = face.calc_center_median()
    if center.z < cut_height:
        reason = 'below_contact'
    elif (center.x / radius_x) ** 2 + ((center.y - center_y) / radius_y) ** 2 > 1:
        reason = 'outer_footprint'
    else:
        longest = max(edge.calc_length() for edge in face.edges)
        boundary = any(any(edge.is_boundary for edge in vertex.link_edges) for vertex in face.verts)
        reason = 'boundary_slivers' if boundary and longest > .025 and face.calc_area() / max(longest * longest, 1e-12) < .055 else None
    if reason:
        deleted[reason] += 1
        faces.append(face)
bmesh.ops.delete(bm, geom=faces, context='FACES')
# Peel six triangle rings at reconstruction holes/cut edges. This removes thin
# dangling ribbons; it can also trim fine legitimate tips, so review is required.
peeled = 0
for _ in range(6):
    fringe = [face for face in bm.faces if any(edge.is_boundary for edge in face.edges)]
    peeled += len(fringe)
    bmesh.ops.delete(bm, geom=fringe, context='FACES')
# Drop disconnected reconstruction flecks below 24 faces; keep real small
# branches connected to the main scan. Do not pretend all boundary edges close.
seen = set()
flecks = []
components = []
for face in list(bm.faces):
    if face in seen:
        continue
    stack, group = [face], []
    seen.add(face)
    while stack:
        current = stack.pop()
        group.append(current)
        for edge in current.edges:
            for neighbor in edge.link_faces:
                if neighbor not in seen:
                    seen.add(neighbor)
                    stack.append(neighbor)
    components.append(len(group))
    if len(group) < 24:
        flecks.extend(group)
bmesh.ops.delete(bm, geom=flecks, context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
# Boundary fans meeting at one vertex make SOLIDIFY create multi-face edges.
# Separate only those junction neighborhoods; source coordinates/UVs stay put.
fan_junctions = [v for v in bm.verts if sum(e.is_boundary for e in v.link_edges) > 2]
split_edges = list({edge for vertex in fan_junctions for edge in vertex.link_edges})
if split_edges:
    bmesh.ops.split_edges(bm, edges=split_edges)
after = stats(bm)
bm.to_mesh(scan.data)
bm.free()
scan.data.update()
# Give the retained scan an inward, rimmed thickness. Unlike a top heightfield,
# this follows the original three-dimensional walls and does not cover their
# front with a draped roof. It closes each retained surface component; it does
# not claim to reconstruct the real unseen reef interior.
bpy.context.view_layer.objects.active = scan
shell = scan.modifiers.new('Inward closed scan backing', 'SOLIDIFY')
shell.thickness = .008
shell.offset = -1
shell.use_rim = True
shell.use_even_offset = False
bpy.ops.object.modifier_apply(modifier=shell.name)
bm_shell = bmesh.new()
bm_shell.from_mesh(scan.data)
shell_stats = stats(bm_shell)
bm_shell.free()

# Small closed original support below the main mound. Its top is only .025
# above inspection sand and its base is buried, avoiding a visible oval plinth.
vertices, polygons = [], []
segments = 96
for z, radius in [(floor-.10,.88),(floor+.025,1)]:
    for s in range(segments):
        angle = s * math.tau / segments
        ripple = 1 + .025 * math.sin(7*angle) + .012 * math.sin(13*angle+.4)
        vertices.append((.49*radius*math.cos(angle)*ripple,
                         .02+.52*radius*math.sin(angle)*ripple,z))
for s in range(segments):
    n=(s+1)%segments
    polygons.append((s,n,n+segments,s+segments))
polygons.append(tuple(reversed(range(segments))))
polygons.append(tuple(segments+s for s in range(segments)))
mesh = bpy.data.meshes.new('Closed original buried support')
mesh.from_pydata(vertices, [], polygons)
mesh.update()
core = bpy.data.objects.new('Original closed buried support - not coral', mesh)
bpy.context.collection.objects.link(core)
bm_core = bmesh.new()
bm_core.from_mesh(mesh)
bmesh.ops.recalc_face_normals(bm_core, faces=list(bm_core.faces))
core_stats = stats(bm_core)
bm_core.to_mesh(mesh)
bm_core.free()
material = bpy.data.materials.new('Original muted carbonate rock')
material.use_nodes = True
bsdf = material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (.23,.205,.16,1)
bsdf.inputs['Roughness'].default_value = .93
core.data.materials.append(material)
for face in core.data.polygons:
    face.use_smooth = True

interior = None
interior_stats = None
if args.interior_rock:
    # This is an original backing boulder, not a claimed reconstruction. Its
    # entire bounding box stays within the retained scan/shell envelope.
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1)
    interior = bpy.context.object
    interior.name = 'Original closed aperture backing rock - not coral'
    for vertex in interior.data.vertices:
        x, y, z = vertex.co
        variation = 1 + .065 * math.sin(11*x+7*y)*math.sin(9*z+2*x) + .025*math.sin(21*y-13*z)
        vertex.co = Vector((-.04+.37*x*variation, .20+.27*y*variation, .045+.245*z*variation))
    interior.data.update()
    colors = interior.data.color_attributes.new(name='OriginalRockColor', type='FLOAT_COLOR', domain='POINT')
    for vertex, color in zip(interior.data.vertices, colors.data):
        x, y, z = vertex.co
        variation = .92 + .10*math.sin(17*x+9*z)*math.sin(15*y-6*x)
        color.color = (.14*variation,.118*variation,.085*variation,1)
    rock_material = bpy.data.materials.new('Original matte backing stone with vertex color')
    rock_material.use_nodes = True
    nodes = rock_material.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = .94
    vertex_color = nodes.new('ShaderNodeVertexColor')
    vertex_color.layer_name = 'OriginalRockColor'
    rock_material.node_tree.links.new(vertex_color.outputs['Color'], bsdf.inputs['Base Color'])
    interior.data.materials.append(rock_material)
    for face in interior.data.polygons:
        face.use_smooth = True
    bm_interior = bmesh.new()
    bm_interior.from_mesh(interior.data)
    interior_stats = stats(bm_interior)
    bm_interior.free()

bpy.ops.object.select_all(action='DESELECT')
scan.select_set(True)
core.select_set(True)
if interior:
    interior.select_set(True)
bpy.ops.export_scene.gltf(filepath=destination, export_format='GLB', use_selection=True,
                         export_animations=False, export_tangents=False,
                         export_image_format='AUTO', export_extras=True)
report = {
    'purpose': 'AQ-14.3 unapproved review derivative; main asset unchanged',
    'blender_version': bpy.app.version_string,
    'source': source, 'source_sha256': source_hash,
    'creator': 'VIVID REALITY (@vividrealitysolutions)',
    'source_url': 'https://sketchfab.com/3d-models/ef94bf857d2a4af5b3691d19d57baaaa',
    'license': 'CC BY 4.0', 'license_url': 'https://creativecommons.org/licenses/by/4.0/',
    'modifications': 'Weld coincident seam positions retaining loop UVs; trim lower photographic floor and oval perimeter; peel six boundary face rings, remove narrow slivers and tiny disconnected fragments; split boundary fan junctions; close retained scan with inward rimmed thickness; add original closed buried support; no image repainting or nonuniform scaling.' + (' Add one original rough closed aperture backing boulder with vertex color; its texture is not derived from the scan.' if interior else ''),
    'recipe': {'contact_z':floor, 'cut_z':cut_height, 'ellipse_radii':[radius_x,radius_y],
               'ellipse_center_y':center_y, 'inward_shell_thickness':.008, 'boundary_rings_peeled':6,
               'interior_rock':args.interior_rock},
    'script_sha256':hashlib.sha256(open(__file__,'rb').read()).hexdigest(),
    'before': before, 'retained_scan': after, 'deleted_faces': deleted,
    'tiny_component_faces_removed':len(flecks), 'component_sizes_before_fleck_removal':sorted(components,reverse=True),
    'boundary_faces_peeled':peeled, 'boundary_fan_junctions_split':len(fan_junctions),
    'closed_scan_shell':shell_stats, 'closed_buried_support':core_stats,
    'original_aperture_backing_rock':interior_stats,
    'output':destination, 'output_bytes':os.path.getsize(destination),
    'output_sha256':hashlib.sha256(open(destination,'rb').read()).hexdigest(),
    'images':[{'name':image.name,'size':list(image.size)} for image in bpy.data.images if image.size[0]>0 and image.type!='RENDER_RESULT'],
    'limits':['Each scan component has inward rimmed thickness; components and buried support are not a boolean-unioned single rock. Shell self-intersections and unseen-back texture duplication remain possible.',
              'Baked underwater lighting/color and scan LOD limits remain.',
              'Review sand is inspection geometry only, excluded from exported GLB.',
              'Main integration needs new hash-pinned habitat data and clearance/picking checks before approval.'],
}
with open(os.path.join(output,'report.json'),'w') as file:
    json.dump(report,file,indent=2)
print('AQ_REEF_CLEANUP '+json.dumps(report),flush=True)
if args.skip_renders:
    sys.exit(0)

# Neutral, sharp, uniformly scaled review scene, not an aquarium optics test.
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,floor))
sand = bpy.context.object
sand.name = 'Inspection-only sand contact plane'
sand_material = bpy.data.materials.new('Neutral inspection sand')
sand_material.diffuse_color = (.39,.355,.28,1)
sand_material.use_nodes = True
sand_material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.39,.355,.28,1)
sand_material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.95
sand.data.materials.append(sand_material)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.threads_mode = 'FIXED'
scene.render.threads = 4
scene.cycles.use_denoising = True
scene.render.resolution_x,scene.render.resolution_y = 1000,700
scene.render.resolution_percentage = 100
scene.world.color = (.16,.16,.16)
scene.view_settings.view_transform = 'AgX'
def point_at(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
for location,energy,size in [((-1,-2,4),260,4),((2,1,3),100,3)]:
    data=bpy.data.lights.new('Neutral area','AREA')
    data.energy,data.size=energy,size
    light=bpy.data.objects.new('Neutral area',data)
    scene.collection.objects.link(light)
    light.location=location
    point_at(light,(0,0,0))
data=bpy.data.cameras.new('Review camera')
data.type='ORTHO'
camera=bpy.data.objects.new('Review camera',data)
scene.collection.objects.link(camera)
scene.camera=camera
for label,position,target,scale in [('front',(0,-4,.6),(0,0,.06),2.45),
                                    ('oblique',(2.8,-3,1.35),(0,0,.04),2.45),
                                    ('contact',(.9,-2.5,.15),(.20,-.38,-.12),1.2)]:
    camera.location=position
    data.ortho_scale=scale
    point_at(camera,target)
    scene.render.filepath=os.path.join(output,label+'.png')
    bpy.ops.render.render(write_still=True)
