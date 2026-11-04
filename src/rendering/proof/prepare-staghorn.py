"""Create a review-only, bounded LOD of the approved PixForge staghorn GLB.

Run with Blender 5.0.1:
  blender --threads 4 -b --python prepare-staghorn.py -- SOURCE.glb OUTPUT.glb

The source hashes are pinned to the approved listing and its own 30k review LOD,
to prevent processing a different asset by accident.
The script only joins the source mesh chunks, applies Blender's collapse
decimator, and downsizes embedded images mechanically to at most 2048 pixels
per side. It preserves the existing UVs, vertex colors, material slots, base
color map, and normal map. It does not recolor or author geometry. This is a
visual-review derivative, not approved runtime content.

It does not synthesize modular-coral COLOR_0 masks. Any future COLOR_0 channels
are shader metadata and must not be multiplied into display RGB or alpha.
"""
import argparse
import hashlib
import json
import math
import os
import struct
import sys

import bpy
from mathutils import Matrix, Vector

EXPECTED_SHA256 = '96a57944bc5c68b6e2a8244b10a83d16aff1a761cdabbf5379e2a36169ccda55'
EXPECTED_REVIEW_LOD_SHA256 = '1917a4749c6356bdc6f5f6bf799ace58c02ba1b71466bec6acd1252ca2d3ee9f'
MIN_TRIANGLES = 20_000
MAX_TRIANGLES = 40_000
MAX_TEXTURE_SIZE = 2_048


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def read_glb_json(path):
    with open(path, 'rb') as source:
        header = source.read(12)
        if len(header) != 12:
            raise ValueError('Input is too short to be a GLB')
        magic, version, declared_length = struct.unpack('<4sII', header)
        if magic != b'glTF' or version != 2 or declared_length != os.path.getsize(path):
            raise ValueError('Input must be a complete GLB 2 file')
        chunk_length, chunk_type = struct.unpack('<I4s', source.read(8))
        if chunk_type != b'JSON' or chunk_length > 32 * 1024 * 1024:
            raise ValueError('GLB JSON chunk is missing or outside the expected bound')
        document = json.loads(source.read(chunk_length))
    return document


def texture_roles(document):
    images = document.get('images', [])
    textures = document.get('textures', [])
    roles = {}
    for material in document.get('materials', []):
        pbr = material.get('pbrMetallicRoughness', {})
        links = {
            'baseColor': pbr.get('baseColorTexture'),
            'metallicRoughness': pbr.get('metallicRoughnessTexture'),
            'normal': material.get('normalTexture'),
            'occlusion': material.get('occlusionTexture'),
            'emissive': material.get('emissiveTexture'),
        }
        for role, link in links.items():
            if link is None:
                continue
            texture = textures[link['index']]
            image_index = texture['source']
            roles.setdefault(image_index, set()).add(role)
    return [
        {'image': index, 'mimeType': image.get('mimeType'), 'roles': sorted(roles.get(index, set()))}
        for index, image in enumerate(images)
    ]


def accessor_triangles(document):
    total = 0
    for mesh in document.get('meshes', []):
        for primitive in mesh.get('primitives', []):
            if primitive.get('mode', 4) != 4:
                raise ValueError('Only triangle-list source primitives are supported')
            index_accessor = primitive.get('indices')
            count = (document['accessors'][index_accessor]['count'] if index_accessor is not None
                     else document['accessors'][primitive['attributes']['POSITION']]['count'])
            if count % 3:
                raise ValueError('Source triangle-list accessor length is not divisible by three')
            total += count // 3
    return total


def bounds_for(meshes):
    points = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    low = [min(point[axis] for point in points) for axis in range(3)]
    high = [max(point[axis] for point in points) for axis in range(3)]
    return {'min': low, 'max': high, 'extent': [high[i] - low[i] for i in range(3)]}


def mesh_traits(meshes):
    return {
        'uvLayers': sorted({layer.name for obj in meshes for layer in obj.data.uv_layers}),
        'colorAttributes': sorted({attribute.name for obj in meshes for attribute in obj.data.color_attributes}),
        'materials': sorted({material.name for obj in meshes for material in obj.data.materials if material}),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('output')
    parser.add_argument('--triangles', type=int, default=30_000)
    parser.add_argument('--smooth-normals', action='store_true',
                        help='Clear carried custom split normals and rebuild smooth vertex shading after collapse')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source_path = os.path.abspath(args.source)
    output_path = os.path.abspath(args.output)
    if not MIN_TRIANGLES <= args.triangles <= MAX_TRIANGLES:
        raise ValueError(f'Target must be between {MIN_TRIANGLES:,} and {MAX_TRIANGLES:,} triangles')
    if os.path.exists(output_path):
        raise FileExistsError(f'Refusing to overwrite existing review output: {output_path}')
    source_hash = sha256_file(source_path)
    if source_hash not in (EXPECTED_SHA256, EXPECTED_REVIEW_LOD_SHA256):
        raise ValueError(f'Unexpected source SHA-256: {source_hash}')
    source_document = read_glb_json(source_path)
    source_triangles_json = accessor_triangles(source_document)
    source_roles = texture_roles(source_document)
    if not any('baseColor' in row['roles'] for row in source_roles):
        raise ValueError('Expected a source base-color map')
    if not any('normal' in row['roles'] for row in source_roles):
        raise ValueError('Expected a source normal map')

    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 4
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=source_path)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not meshes:
        raise ValueError('Source contains no mesh objects')
    for obj in meshes:
        obj.data.calc_loop_triangles()
    source_triangles = sum(len(obj.data.loop_triangles) for obj in meshes)
    if source_triangles != source_triangles_json:
        raise ValueError(f'Blender mesh triangles {source_triangles} do not match GLB accessors {source_triangles_json}')
    source_bounds = bounds_for(meshes)
    source_traits = mesh_traits(meshes)
    if not source_traits['uvLayers']:
        raise ValueError('Source mesh has no UV layer to preserve')

    # Apply transforms before joining so the source world-space shape is fixed.
    for obj in meshes:
        obj.data.transform(obj.matrix_world)
        obj.parent = None
        obj.matrix_parent_inverse = Matrix.Identity(4)
        obj.matrix_world = Matrix.Identity(4)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = 'PixForge Staghorn Coral — review LOD'
    if args.triangles > source_triangles:
        raise ValueError('Target may not add triangles to the supplied source')
    if args.triangles < source_triangles:
        ratio = args.triangles / source_triangles
        modifier = body.modifiers.new('Review-only collapse LOD', 'DECIMATE')
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    body.data.update()
    body.data.calc_loop_triangles()
    output_triangles = len(body.data.loop_triangles)
    if not MIN_TRIANGLES <= output_triangles <= MAX_TRIANGLES:
        raise ValueError(f'Decimator produced {output_triangles:,} triangles, outside the approved range')

    normal_report = {'treatment': 'preserve source/imported normals', 'customNormalsAfter': body.data.has_custom_normals}
    if args.smooth_normals:
        for polygon in body.data.polygons:
            polygon.use_smooth = True
        bpy.context.view_layer.objects.active = body
        body.select_set(True)
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
        body.data.update()
        if body.data.has_custom_normals:
            raise ValueError('Custom split normals were not cleared')
        smooth_faces = sum(1 for polygon in body.data.polygons if polygon.use_smooth)
        if smooth_faces != len(body.data.polygons):
            raise ValueError('Smooth-normal pass did not enable smooth shading on every face')
        active_uv = body.data.uv_layers.active
        if active_uv is None:
            raise ValueError('Tangent generation requires the retained active UV layer')
        body.data.calc_tangents(uvmap=active_uv.name)
        normal_lengths = []
        tangent_lengths = []
        tangent_normal_dots = []
        for loop in body.data.loops:
            normal = loop.normal
            tangent = loop.tangent
            if not all(math.isfinite(component) for component in (*normal, *tangent)):
                raise ValueError('Generated normal/tangent contains a non-finite component')
            normal_lengths.append(normal.length)
            tangent_lengths.append(tangent.length)
            tangent_normal_dots.append(abs(normal.dot(tangent)))
        if any(abs(length - 1.0) > 0.01 for length in normal_lengths + tangent_lengths):
            raise ValueError('Generated normal/tangent is not unit length within 0.01')
        if any(dot > 0.01 for dot in tangent_normal_dots):
            raise ValueError('Generated tangent is not orthogonal to its normal within 0.01')
        normal_report = {
            'treatment': 'clear carried custom split normals; all faces smooth; regenerate tangent space from retained UVMap',
            'customNormalsAfter': body.data.has_custom_normals,
            'smoothFaces': smooth_faces,
            'normalLengthRange': [min(normal_lengths), max(normal_lengths)],
            'tangentLengthRange': [min(tangent_lengths), max(tangent_lengths)],
            'maxAbsNormalTangentDot': max(tangent_normal_dots),
        }

    images = {node.image for material in body.data.materials if material and material.node_tree
              for node in material.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image}
    image_records = []
    for image in sorted(images, key=lambda value: value.name):
        width, height = image.size
        if width <= 0 or height <= 0:
            raise ValueError(f'Used source image has no pixels: {image.name}')
        factor = min(1.0, MAX_TEXTURE_SIZE / max(width, height))
        if factor < 1:
            image.scale(max(1, round(width * factor)), max(1, round(height * factor)))
            image.pack()
        image_records.append({'name': image.name, 'width': image.size[0], 'height': image.size[1]})
    if any(max(row['width'], row['height']) > MAX_TEXTURE_SIZE for row in image_records):
        raise ValueError('A packed material image exceeds the 2048-pixel cap')

    output_traits = mesh_traits([body])
    for key in ('uvLayers', 'colorAttributes', 'materials'):
        if source_traits[key] != output_traits[key]:
            raise ValueError(f'{key} changed during join/decimation: {source_traits[key]} -> {output_traits[key]}')
    output_bounds = bounds_for([body])
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB', use_selection=True,
                              export_tangents=True, export_image_format='AUTO', export_animations=False)
    output_document = read_glb_json(output_path)
    output_roles = texture_roles(output_document)
    for role in ('baseColor', 'normal'):
        if not any(role in row['roles'] for row in output_roles):
            raise ValueError(f'Export lost the source {role} texture assignment')
    output_attributes = sorted({name for mesh in output_document.get('meshes', [])
                                for primitive in mesh.get('primitives', [])
                                for name in primitive.get('attributes', {})})
    if args.smooth_normals and not {'NORMAL', 'TANGENT', 'TEXCOORD_0'}.issubset(output_attributes):
        raise ValueError(f'Export is missing required normal-map attributes: {output_attributes}')
    output_hash = sha256_file(output_path)
    report = {
        'purpose': 'Review-only geometry LOD; not approved production/runtime art.',
        'source': source_path,
        'sourceSha256': source_hash,
        'sourceBytes': os.path.getsize(source_path),
        'sourceTriangles': source_triangles,
        'sourceBounds': source_bounds,
        'sourceTraits': source_traits,
        'sourceTextureRoles': source_roles,
        'targetTriangles': args.triangles,
        'output': output_path,
        'outputSha256': output_hash,
        'outputBytes': os.path.getsize(output_path),
        'outputTriangles': output_triangles,
        'outputBounds': output_bounds,
        'outputTraits': output_traits,
        'outputImages': image_records,
        'outputTextureRoles': output_roles,
        'outputAttributes': output_attributes,
        'normalReport': normal_report,
        'blenderVersion': bpy.app.version_string,
        'changes': ['mesh chunks joined after world-transform baking',
                    'collapse decimation' if source_triangles > args.triangles else 'no geometry decimation',
                    'smooth-normal pass' if args.smooth_normals else 'preserve imported normal data',
                    'images mechanically downsampled to a 2048-pixel maximum dimension'],
    }
    print('AQ42_STAGHORN_REPORT=' + json.dumps(report, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
