"""Bake source normal detail from PixForge's high mesh to its 30k UV-preserving LOD.

Run with Blender 5.0.1:
  blender --threads 4 -b --python bake-staghorn-normal.py -- HIGH.glb LOW.glb OUTPUT.glb OUTPUT_NORMAL.png

This is an AQ-40 texture-bake capability study. Both input SHA-256 hashes are
pinned to the reviewed source and 30k smooth-normal derivative. The high mesh
retains its imported tangent-space normal material during baking. The low mesh
keeps its source base-color map and UVMap; its normal-map slot is replaced by
the new tangent-space bake. Blender emits one invalid zero tangent on a
singular UV loop for this specimen, so the review GLB omits TANGENT and relies
on the selected Three.js loader to derive tangent space from UVs. Outputs must
stay outside git pending root review.
"""
import argparse
import hashlib
import json
import math
import os
import struct
import sys

import bpy
from mathutils import Vector

EXPECTED_HIGH_SHA256 = '96a57944bc5c68b6e2a8244b10a83d16aff1a761cdabbf5379e2a36169ccda55'
EXPECTED_LOW_SHA256 = '6f90a78ddf5df726f9fd466df4e709eb3eca6780fde2c0a5891f1560263eaec2'
RESOLUTIONS = (1024, 2048)


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def read_glb(path):
    with open(path, 'rb') as stream:
        header = stream.read(12)
        if len(header) != 12:
            raise ValueError(f'Not a complete GLB: {path}')
        magic, version, length = struct.unpack('<4sII', header)
        if magic != b'glTF' or version != 2 or length != os.path.getsize(path):
            raise ValueError(f'Expected a complete GLB 2 file: {path}')
        chunk_length, kind = struct.unpack('<I4s', stream.read(8))
        if kind != b'JSON' or chunk_length > 32 * 1024 * 1024:
            raise ValueError(f'Invalid GLB JSON chunk: {path}')
        return json.loads(stream.read(chunk_length))


def mesh_objects(objects):
    return [obj for obj in objects if obj.type == 'MESH']


def world_bounds(objects):
    points = [obj.matrix_world @ vertex.co for obj in objects for vertex in obj.data.vertices]
    if not points:
        raise ValueError('Cannot calculate bounds for empty meshes')
    low = [min(point[i] for point in points) for i in range(3)]
    high = [max(point[i] for point in points) for i in range(3)]
    return {'min': low, 'max': high, 'extent': [high[i] - low[i] for i in range(3)]}


def image_node_for_normal(material):
    tree = material.node_tree
    normal_nodes = [node for node in tree.nodes if node.type == 'NORMAL_MAP'
                    and node.inputs['Color'].is_linked]
    if len(normal_nodes) != 1:
        raise ValueError(f'{material.name}: expected exactly one linked Normal Map node')
    normal_node = normal_nodes[0]
    source_node = normal_node.inputs['Color'].links[0].from_node
    if source_node.type != 'TEX_IMAGE' or source_node.image is None:
        raise ValueError(f'{material.name}: source normal must come from an Image Texture node')
    principled = [node for node in tree.nodes if node.type == 'BSDF_PRINCIPLED'
                  and node.inputs['Normal'].is_linked]
    if len(principled) != 1 or principled[0].inputs['Normal'].links[0].from_node != normal_node:
        raise ValueError(f'{material.name}: Normal Map node is not connected to Principled BSDF')
    return normal_node, source_node


def material_record(material):
    normal_node, normal_image = image_node_for_normal(material)
    base_color = []
    for node in material.node_tree.nodes:
        if node.type != 'TEX_IMAGE' or node.image is None:
            continue
        linked_base = any(link.from_node == node and link.to_node.type == 'BSDF_PRINCIPLED'
                          and link.to_socket.name == 'Base Color' for link in material.node_tree.links)
        if linked_base:
            base_color.append({'image': node.image.name, 'size': list(node.image.size),
                               'colorSpace': node.image.colorspace_settings.name})
    return {
        'material': material.name,
        'normalMapNode': normal_node.name,
        'normalMapImage': normal_image.image.name,
        'normalMapSize': list(normal_image.image.size),
        'normalMapColorSpace': normal_image.image.colorspace_settings.name,
        'normalStrength': float(normal_node.inputs['Strength'].default_value),
        'normalMapConnectedToPrincipled': True,
        'baseColorImages': base_color,
    }, normal_node, normal_image


def set_image_node_active(material, node):
    for existing in material.node_tree.nodes:
        existing.select = False
    node.select = True
    material.node_tree.nodes.active = node


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('high_source')
    parser.add_argument('low_lod')
    parser.add_argument('output_glb')
    parser.add_argument('output_normal_png')
    parser.add_argument('--resolution', type=int, default=2048, choices=RESOLUTIONS)
    parser.add_argument('--ray-span-fraction', type=float, default=0.008)
    parser.add_argument('--margin', type=int, default=8)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    high_path, low_path = map(os.path.abspath, (args.high_source, args.low_lod))
    output_glb, output_png = map(os.path.abspath, (args.output_glb, args.output_normal_png))
    if output_glb == output_png or os.path.exists(output_glb) or os.path.exists(output_png):
        raise FileExistsError('Refusing to overwrite a bake output')
    high_hash, low_hash = sha256_file(high_path), sha256_file(low_path)
    if high_hash != EXPECTED_HIGH_SHA256:
        raise ValueError(f'Unexpected high-source hash: {high_hash}')
    if low_hash != EXPECTED_LOW_SHA256:
        raise ValueError(f'Unexpected low-LOD hash: {low_hash}')
    if not 0.001 <= args.ray_span_fraction <= 0.02:
        raise ValueError('Ray distance must stay between 0.1% and 2% of specimen bounds')
    high_json, low_json = read_glb(high_path), read_glb(low_path)
    if not any('TANGENT' in primitive.get('attributes', {})
               for mesh in high_json.get('meshes', []) for primitive in mesh.get('primitives', [])):
        raise ValueError('High source has no tangent attribute for its normal material')
    if not any('TEXCOORD_0' in primitive.get('attributes', {})
               for mesh in low_json.get('meshes', []) for primitive in mesh.get('primitives', [])):
        raise ValueError('Low LOD has no UVMap/TEXCOORD_0')

    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 4
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    bpy.ops.import_scene.gltf(filepath=high_path)
    high_objects = mesh_objects(list(bpy.context.scene.objects))
    if len(high_objects) != 18:
        raise ValueError(f'Expected 18 high source chunks, found {len(high_objects)}')
    high_bounds = world_bounds(high_objects)
    for obj in high_objects:
        obj.data.calc_loop_triangles()
    high_triangles = sum(len(obj.data.loop_triangles) for obj in high_objects)
    if high_triangles != 1_945_640:
        raise ValueError(f'Unexpected high-source triangle count: {high_triangles}')
    high_materials = {material for obj in high_objects for material in obj.data.materials if material}
    high_material_reports = []
    for material in high_materials:
        record, _, _ = material_record(material)
        high_material_reports.append(record)

    bpy.ops.import_scene.gltf(filepath=low_path)
    all_objects = list(bpy.context.scene.objects)
    low_objects = [obj for obj in mesh_objects(all_objects) if obj not in high_objects]
    if len(low_objects) != 1:
        raise ValueError(f'Expected one low mesh, found {len(low_objects)}')
    low_obj = low_objects[0]
    low_obj.data.calc_loop_triangles()
    low_triangles = len(low_obj.data.loop_triangles)
    if low_triangles != 30_000:
        raise ValueError(f'Unexpected low-LOD triangle count: {low_triangles}')
    low_bounds = world_bounds(low_objects)
    max_extent = max(high_bounds['extent'])
    center_delta = max(abs((high_bounds['min'][i] + high_bounds['max'][i] - low_bounds['min'][i] - low_bounds['max'][i]) * .5)
                       for i in range(3))
    extent_delta = max(abs(high_bounds['extent'][i] - low_bounds['extent'][i]) for i in range(3))
    if center_delta > max_extent * 0.01 or extent_delta > max_extent * 0.01:
        raise ValueError('High and low bounds differ by more than 1% of the high-mesh span')
    ray_distance = max_extent * args.ray_span_fraction
    low_materials = [material for material in low_obj.data.materials if material]
    if len(low_materials) != 1:
        raise ValueError(f'Expected one low material, found {len(low_materials)}')
    low_material = low_materials[0]
    low_material_report, low_normal_node, old_low_normal_image_node = material_record(low_material)
    if len(low_material_report['baseColorImages']) != 1:
        raise ValueError('Expected one preserved base-color image on the low material')

    target_image = bpy.data.images.new('AQ40 staghorn baked tangent normal',
                                       width=args.resolution, height=args.resolution,
                                       alpha=False, float_buffer=False)
    target_image.colorspace_settings.name = 'Non-Color'
    target_node = low_material.node_tree.nodes.new('ShaderNodeTexImage')
    target_node.name = 'AQ40 baked tangent normal target'
    target_node.label = 'AQ40 review bake — tangent-space NORMAL'
    target_node.image = target_image
    set_image_node_active(low_material, target_node)

    bpy.ops.object.select_all(action='DESELECT')
    for obj in high_objects:
        obj.select_set(True)
    low_obj.select_set(True)
    bpy.context.view_layer.objects.active = low_obj
    uv_layer = low_obj.data.uv_layers.active
    if uv_layer is None or uv_layer.name != 'UVMap':
        raise ValueError('Expected the preserved active UVMap on low LOD')

    # Short rays are sized from the source AABB and intentionally capped well
    # below 2% of the colony span to limit projections onto neighboring branches.
    bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT',
                        normal_r='POS_X', normal_g='POS_Y', normal_b='POS_Z',
                        use_selected_to_active=True, use_cage=False,
                        cage_extrusion=0.0, max_ray_distance=ray_distance,
                        margin=args.margin, margin_type='EXTEND',
                        target='IMAGE_TEXTURES', save_mode='INTERNAL',
                        use_clear=True, uv_layer='UVMap')

    os.makedirs(os.path.dirname(output_png), exist_ok=True)
    os.makedirs(os.path.dirname(output_glb), exist_ok=True)
    target_image.filepath_raw = output_png
    target_image.file_format = 'PNG'
    target_image.save()

    # Preserve the base-color node and replace only the normal-map input image.
    low_tree = low_material.node_tree
    for link in list(low_tree.links):
        if link.to_node == low_normal_node and link.to_socket.name == 'Color':
            low_tree.links.remove(link)
    low_tree.links.new(target_node.outputs['Color'], low_normal_node.inputs['Color'])
    if old_low_normal_image_node != target_node:
        low_tree.nodes.remove(old_low_normal_image_node)
    for node in low_tree.nodes:
        node.select = False
    low_tree.nodes.active = target_node
    target_node.select = True
    target_image.pack()

    bpy.ops.object.select_all(action='DESELECT')
    low_obj.select_set(True)
    bpy.context.view_layer.objects.active = low_obj
    bpy.ops.export_scene.gltf(filepath=output_glb, export_format='GLB', use_selection=True,
                              export_tangents=False, export_image_format='AUTO', export_animations=False)
    output_hash = sha256_file(output_glb)
    output_json = read_glb(output_glb)
    output_attributes = sorted({name for mesh in output_json.get('meshes', [])
                                for primitive in mesh.get('primitives', [])
                                for name in primitive.get('attributes', {})})
    if not {'NORMAL', 'TEXCOORD_0'}.issubset(output_attributes) or 'TANGENT' in output_attributes:
        raise ValueError(f'Expected normal/UV attributes and derived tangent space: {output_attributes}')
    if not any('normalTexture' in material for material in output_json.get('materials', [])):
        raise ValueError('Output GLB has no material normalTexture')

    # Sparse pixel sampling reports bake coverage/value range without copying
    # the full multi-megapixel float buffer into Python memory.
    pixel_count = target_image.size[0] * target_image.size[1]
    stride = max(1, pixel_count // 20_000)
    samples = []
    nonzero = 0
    for pixel_index in range(0, pixel_count, stride):
        rgba = target_image.pixels[pixel_index * 4:pixel_index * 4 + 3]
        rgb = [float(value) for value in rgba]
        if not all(math.isfinite(value) for value in rgb):
            raise ValueError('Baked normal map contains non-finite samples')
        samples.append(rgb)
        if max(rgb) > 0.05:
            nonzero += 1
    channel_ranges = [[min(row[c] for row in samples), max(row[c] for row in samples)] for c in range(3)]
    report = {
        'purpose': 'AQ-40 normal-map bake pipeline proof only; not approved production/runtime content.',
        'blenderVersion': bpy.app.version_string,
        'highSource': {'path': high_path, 'sha256': high_hash, 'bytes': os.path.getsize(high_path),
                       'triangles': high_triangles, 'bounds': high_bounds,
                       'materials': high_material_reports},
        'lowInput': {'path': low_path, 'sha256': low_hash, 'bytes': os.path.getsize(low_path),
                     'triangles': low_triangles, 'bounds': low_bounds,
                     'material': low_material_report, 'uvMap': uv_layer.name},
        'bake': {'type': 'NORMAL', 'space': 'TANGENT', 'resolution': [args.resolution, args.resolution],
                 'normalSwizzle': ['POS_X', 'POS_Y', 'POS_Z'], 'selectedToActive': True,
                 'cage': False, 'cageExtrusion': 0.0,
                 'maxRayDistance': ray_distance, 'maxRayFractionOfBounds': args.ray_span_fraction,
                 'marginPixels': args.margin, 'marginMode': 'EXTEND',
                 'highNormalMapNodeRemainedConnected': True},
        'normalBakeImage': {'path': output_png, 'bytes': os.path.getsize(output_png),
                            'sha256': sha256_file(output_png), 'colorSpace': 'Non-Color',
                            'sampleStride': stride, 'sampleCount': len(samples),
                            'sampledNonzeroPercent': nonzero / len(samples) * 100,
                            'sampledRgbRanges': channel_ranges},
        'output': {'path': output_glb, 'sha256': output_hash, 'bytes': os.path.getsize(output_glb),
                   'triangles': low_triangles, 'attributes': output_attributes,
                   'tangentSpacePolicy': 'omit TANGENT; selected Three.js runtime derives tangent space from UVs',
                   'sourceColorMapPreserved': True, 'outputNormalMapRole': 'normalTexture'},
    }
    print('AQ40_STAGHORN_NORMAL_BAKE=' + json.dumps(report, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
