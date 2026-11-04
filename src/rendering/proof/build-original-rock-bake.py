"""Build a deterministic original rock PBR-bake proof as a GLB.

Run with Blender 5.0.1:
  blender --threads 4 -b --python build-original-rock-bake.py -- output.glb source.blend report.json

The custom low/high rock pair demonstrates baked base color, roughness and
standalone glTF occlusionTexture export. Tangent-normal reprojection is covered
separately by the licensed Staghorn proof. All coordinates are authored in
meters, Blender Z-up, and exported to glTF +Y-up once.
"""
import hashlib
import json
import math
import os
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector


args = sys.argv[sys.argv.index('--') + 1:]
if len(args) != 3:
    raise ValueError('Expected output.glb source.blend report.json')
output_path, source_blend_path, report_path = map(os.path.abspath, args)
script_path = os.path.abspath(__file__)
generator_sha256 = hashlib.sha256(Path(script_path).read_bytes()).hexdigest()
SEED = 7319
TEXTURE_SIZE = 1024
ROCK_WIDTH_M = 0.40
ROCK_DEPTH_M = 0.30
ROCK_HEIGHT_M = 0.25


def clear_scene():
    for obj in list(bpy.context.scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def make_low_rock():
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = 'original_porous_rock'
    mesh = obj.data
    mesh.name = 'original_porous_rock_mesh'

    # Shape the coordinates directly in meters rather than applying a
    # non-uniform object transform. The broad asymmetry is intentional macro
    # geometry; procedural detail is baked from a separate high mesh.
    for vertex in mesh.vertices:
        direction = vertex.co.normalized()
        wave = (
            0.055 * math.sin(9.0 * direction.x + 3.0 * direction.z)
            + 0.035 * math.sin(13.0 * direction.y - 5.0 * direction.x)
            + 0.022 * math.cos(17.0 * direction.z + 4.0 * direction.y)
        )
        radial = 1.0 + wave
        flatten = 1.0 - 0.10 * max(0.0, -direction.z)
        vertex.co = Vector((
            direction.x * (ROCK_WIDTH_M * 0.5) * radial,
            direction.y * (ROCK_DEPTH_M * 0.5) * radial,
            direction.z * (ROCK_HEIGHT_M * 0.5) * radial * flatten,
        ))
    mesh.update()
    for face in mesh.polygons:
        face.use_smooth = True

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.0, island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')
    return obj


def make_high_source(low):
    high = low.copy()
    high.data = low.data.copy()
    high.name = 'high_detail_bake_source'
    high.data.name = 'high_detail_bake_source_mesh'
    bpy.context.collection.objects.link(high)
    high.hide_render = False
    high.hide_viewport = False

    bpy.context.view_layer.objects.active = high
    subdiv = high.modifiers.new('High source surface detail', 'SUBSURF')
    subdiv.subdivision_type = 'CATMULL_CLARK'
    subdiv.levels = 2
    subdiv.render_levels = 2
    bpy.ops.object.modifier_apply(modifier=subdiv.name)

    noise = bpy.data.textures.new('Original porous micro relief', type='CLOUDS')
    noise.noise_scale = 0.018
    noise.noise_depth = 2
    displace = high.modifiers.new('Subtle porous relief', 'DISPLACE')
    displace.texture = noise
    displace.texture_coords = 'GLOBAL'
    displace.strength = 0.006
    displace.mid_level = 0.52
    bpy.ops.object.modifier_apply(modifier=displace.name)
    for face in high.data.polygons:
        face.use_smooth = True
    return high


def make_color_source_material():
    material = bpy.data.materials.new('Original procedural aragonite source')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (560, 80)
    principled = nodes.new('ShaderNodeBsdfPrincipled')
    principled.location = (300, 80)
    principled.inputs['Metallic'].default_value = 0.0
    principled.inputs['Roughness'].default_value = 0.86
    noise = nodes.new('ShaderNodeTexNoise')
    noise.location = (-500, 140)
    noise.inputs['Scale'].default_value = 8.0
    noise.inputs['Detail'].default_value = 4.0
    noise.inputs['Roughness'].default_value = 0.72
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.location = (-220, 160)
    ramp.color_ramp.elements[0].position = 0.24
    ramp.color_ramp.elements[0].color = (0.20, 0.18, 0.14, 1.0)
    ramp.color_ramp.elements[1].position = 0.76
    ramp.color_ramp.elements[1].color = (0.56, 0.49, 0.37, 1.0)
    middle = ramp.color_ramp.elements.new(0.51)
    middle.color = (0.37, 0.34, 0.28, 1.0)
    rough_ramp = nodes.new('ShaderNodeValToRGB')
    rough_ramp.location = (-200, -100)
    rough_ramp.color_ramp.elements[0].position = 0.15
    rough_ramp.color_ramp.elements[0].color = (0.68, 0.68, 0.68, 1.0)
    rough_ramp.color_ramp.elements[1].position = 0.88
    rough_ramp.color_ramp.elements[1].color = (0.96, 0.96, 0.96, 1.0)
    texcoord = nodes.new('ShaderNodeTexCoord')
    texcoord.location = (-760, 140)
    links.new(texcoord.outputs['Generated'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(noise.outputs['Fac'], rough_ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], principled.inputs['Base Color'])
    links.new(rough_ramp.outputs['Color'], principled.inputs['Roughness'])
    links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    return material, rough_ramp


def make_image(name, color_space):
    image = bpy.data.images.new(name, width=TEXTURE_SIZE, height=TEXTURE_SIZE, alpha=False, float_buffer=False)
    image.colorspace_settings.name = color_space
    image.generated_color = (0.5, 0.5, 0.5, 1.0)
    return image


def make_target_material(base_image, roughness_image, ao_image):
    material = bpy.data.materials.new('Original porous rock baked PBR')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get('Principled BSDF')
    output = nodes.get('Material Output')
    principled.inputs['Metallic'].default_value = 0.0

    base = nodes.new('ShaderNodeTexImage')
    base.name = 'Baked baseColor texture'
    base.image = base_image
    links.new(base.outputs['Color'], principled.inputs['Base Color'])
    roughness = nodes.new('ShaderNodeTexImage')
    roughness.name = 'Baked roughness texture'
    roughness.image = roughness_image
    links.new(roughness.outputs['Color'], principled.inputs['Roughness'])

    ao = nodes.new('ShaderNodeTexImage')
    ao.name = 'Baked glTF occlusion texture'
    ao.image = ao_image
    group_tree = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    group_tree.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketColor')
    group = nodes.new('ShaderNodeGroup')
    group.name = 'glTF Material Output'
    group.node_tree = group_tree
    links.new(ao.outputs['Color'], group.inputs['Occlusion'])

    for image_node in (base, roughness, ao):
        image_node.select = False
    nodes.active = base
    return material, {'baseColor': base, 'roughness': roughness, 'occlusion': ao}


def bake_to_image(low, high, image_node, bake_type, color_pass=False):
    scene = bpy.context.scene
    scene.render.bake.use_selected_to_active = True
    scene.render.bake.cage_extrusion = 0.014
    scene.render.bake.use_pass_color = bool(color_pass)
    scene.render.bake.use_pass_direct = False
    scene.render.bake.use_pass_indirect = False
    for node in low.data.materials[0].node_tree.nodes:
        node.select = False
    image_node.select = True
    low.data.materials[0].node_tree.nodes.active = image_node

    bpy.ops.object.select_all(action='DESELECT')
    high.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type=bake_type, margin=8, use_clear=True)
    bpy.context.view_layer.update()


def make_roughness_emission_material(source_roughness_ramp):
    material = bpy.data.materials.new('Temporary roughness emission bake source')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')
    texcoord = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 8.0
    noise.inputs['Detail'].default_value = 4.0
    noise.inputs['Roughness'].default_value = 0.72
    ramp = nodes.new('ShaderNodeValToRGB')
    source_elements = source_roughness_ramp.color_ramp.elements
    ramp.color_ramp.elements[0].position = source_elements[0].position
    ramp.color_ramp.elements[0].color = source_elements[0].color
    ramp.color_ramp.elements[1].position = source_elements[-1].position
    ramp.color_ramp.elements[1].color = source_elements[-1].color
    links.new(texcoord.outputs['Generated'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], emission.inputs['Color'])
    links.new(emission.outputs[0], output.inputs['Surface'])
    return material


def glb_json_and_binary(path):
    data = Path(path).read_bytes()
    if data[:4] != b'glTF':
        raise ValueError('Exported file is not a GLB')
    offset = 12
    document = None
    binary = b''
    while offset < len(data):
        size, chunk_type = struct.unpack_from('<I4s', data, offset)
        offset += 8
        chunk = data[offset:offset + size]
        offset += size
        if chunk_type == b'JSON':
            document = json.loads(chunk.rstrip(b' \t\r\n\0'))
        elif chunk_type == b'BIN\0':
            binary = chunk
    if document is None:
        raise ValueError('GLB is missing its JSON chunk')
    return data, document, binary


def accessor_dimensions(document, accessor):
    if not accessor:
        return None
    return {
        'min': [round(float(v), 6) for v in accessor.get('min', [])],
        'max': [round(float(v), 6) for v in accessor.get('max', [])],
    }


def embedded_image_dimensions(document, binary, image):
    view = document['bufferViews'][image['bufferView']]
    start = view.get('byteOffset', 0)
    payload = binary[start:start + view['byteLength']]
    if payload.startswith(b'\x89PNG\r\n\x1a\n'):
        width, height = struct.unpack_from('>II', payload, 16)
        return [width, height]
    return None


def main():
    clear_scene()
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 16
    scene.cycles.seed = SEED
    scene.cycles.use_animated_seed = False
    scene.render.resolution_x = TEXTURE_SIZE
    scene.render.resolution_y = TEXTURE_SIZE
    scene.render.resolution_percentage = 100
    scene.render.bake.use_clear = True

    low = make_low_rock()
    low_material = bpy.data.materials.new('Temporary bake target')
    low_material.use_nodes = True
    low.data.materials.clear()
    low.data.materials.append(low_material)
    high = make_high_source(low)
    source_material, rough_ramp = make_color_source_material()
    high.data.materials.clear()
    high.data.materials.append(source_material)

    base_image = make_image('rock_baseColor_1k', 'sRGB')
    roughness_image = make_image('rock_roughness_1k', 'Non-Color')
    ao_image = make_image('rock_occlusion_1k', 'Non-Color')
    target_mat, image_nodes = make_target_material(base_image, roughness_image, ao_image)
    low.data.materials[0] = target_mat

    bpy.ops.object.select_all(action='DESELECT')
    high.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bake_to_image(low, high, image_nodes['baseColor'], 'DIFFUSE', color_pass=True)

    rough_material = make_roughness_emission_material(rough_ramp)
    high.data.materials.clear()
    high.data.materials.append(rough_material)
    bake_to_image(low, high, image_nodes['roughness'], 'EMIT')

    bake_to_image(low, high, image_nodes['occlusion'], 'AO')

    # Preserve map inputs for viewing in Blender and embed images in the GLB.
    high.data.calc_loop_triangles()
    low.data.calc_loop_triangles()
    high_source_triangles = len(high.data.loop_triangles)
    high_source_polygons = len(high.data.polygons)
    low_target_triangles = len(low.data.loop_triangles)
    low_target_polygons = len(low.data.polygons)
    high.data.materials.clear()
    high.data.materials.append(source_material)
    for image in (base_image, roughness_image, ao_image):
        image.pack()
    low.data.materials[0] = target_mat

    source_materials = {
        'baseColor': 'Cycles DIFFUSE bake, color pass only; procedural original aragonite ramp',
        'roughness': 'Cycles EMIT bake of procedural scalar roughness field; Non-Color data',
        'occlusion': 'Cycles AO bake in Non-Color; glTF exporter packs AO into ORM image R, roughness in G, metallic in B',
    }

    # Dimensions are measured from the authored Blender Z-up mesh and mapped
    # to the exporter's glTF +Y-up convention: (x,z,-y).
    low_points = [vertex.co for vertex in low.data.vertices]
    min_blender = [min(point[axis] for point in low_points) for axis in range(3)]
    max_blender = [max(point[axis] for point in low_points) for axis in range(3)]
    dimensions_gltf = [
        max_blender[0] - min_blender[0],
        max_blender[2] - min_blender[2],
        max_blender[1] - min_blender[1],
    ]

    # Add exporter metadata to the exported root mesh. The source SHA identifies
    # this versioned generator; the derivative hash is recorded externally.
    low['reefAsset'] = {
        'schema': 'reef-asset-v1',
        'id': 'original-rock-bake-probe',
        'kind': 'rock',
        'units': 'meter',
        'upAxis': '+Y',
        'origin': 'local',
        'dimensionsM': dimensions_gltf,
        'provenance': {
            'license': 'original',
            'creator': 'Aquarium project',
            'sourceSha256': generator_sha256,
            'recipe': f'Blender 5.0.1; {Path(script_path).name}; Cycles seed={SEED}, animated seed=false, samples=16; measured dimensionsM={dimensions_gltf}; low=Icosphere-3 ({low_target_triangles} triangles); high=low+Subdivision-2+Clouds-Displace-0.006 ({high_source_triangles} triangles); bake=1024px DIFFUSE-color/EMIT-roughness/AO; glTF GLB Y-up exporter once',
            'attribution': 'Original project test geometry and baked PBR materials; no imported source art.',
        },
    }
    low['reefPrimitive'] = {'id': 'porous-rock', 'role': 'rock'}

    # Persist an unpromoted Blender source file for repeatable offline inspection.
    Path(source_blend_path).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=source_blend_path)

    bpy.data.objects.remove(high, do_unlink=True)
    for obj in list(bpy.context.scene.objects):
        if obj != low:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB', export_extras=True, export_yup=True, export_animations=False)

    output_bytes, document, binary = glb_json_and_binary(output_path)
    mesh = document['meshes'][0]
    primitive = mesh['primitives'][0]
    position_accessor = document['accessors'][primitive['attributes']['POSITION']]
    triangles = sum(
        (document['accessors'][part['indices']]['count'] // 3) if 'indices' in part
        else document['accessors'][part['attributes']['POSITION']]['count'] // 3
        for part in mesh['primitives']
    )
    texture_roles = {}
    material = document.get('materials', [{}])[0]
    pbr = material.get('pbrMetallicRoughness', {})
    for role, info in {
        'baseColor': pbr.get('baseColorTexture'),
        'roughnessMetallic': pbr.get('metallicRoughnessTexture'),
        'normal': material.get('normalTexture'),
        'occlusion': material.get('occlusionTexture'),
    }.items():
        if info is not None:
            texture_index = info['index']
            texture = document['textures'][texture_index]
            image_index = texture['source']
            image = document['images'][image_index]
            texture_roles[role] = {
                'textureIndex': texture_index,
                'imageIndex': image_index,
                'imageName': image.get('name'),
                'uri': image.get('uri'),
                'mimeType': image.get('mimeType'),
                'dimensions': embedded_image_dimensions(document, binary, image),
                'byteLength': document['bufferViews'][image['bufferView']]['byteLength'] if 'bufferView' in image else None,
                'texCoord': info.get('texCoord', 0),
            }

    root_node = next((node for node in document.get('nodes', []) if node.get('mesh') == 0), {})
    position_bounds = accessor_dimensions(document, position_accessor)
    root_transform = {
        'translation': root_node.get('translation', [0.0, 0.0, 0.0]),
        'rotation': root_node.get('rotation', [0.0, 0.0, 0.0, 1.0]),
        'scale': root_node.get('scale', [1.0, 1.0, 1.0]),
    }
    root_extras = root_node.get('extras', {})
    primitive_extras = root_extras.get('reefPrimitive')
    position_accessor_count = position_accessor['count']
    inspection_record = {
        'extras': {'reefAsset': root_extras.get('reefAsset')},
        'rootTransform': root_transform,
        'boundsM': position_bounds,
        'primitives': [{
            'id': primitive_extras.get('id'),
            'role': primitive_extras.get('role'),
            'vertexCount': position_accessor_count,
            'boundsM': position_bounds,
            'material': {'vertexColors': False, 'vertexAlpha': False, 'aoSource': 'texture'},
        }],
        'sockets': [],
        'collisionParts': [],
    }
    report = {
        'generator': Path(script_path).name,
        'generatorSha256': generator_sha256,
        'seed': SEED,
        'cyclesSettings': {'seed': scene.cycles.seed, 'animatedSeed': scene.cycles.use_animated_seed, 'samples': scene.cycles.samples},
        'blenderVersion': bpy.app.version_string,
        'sourceBlend': source_blend_path,
        'sourceBlendBytes': os.path.getsize(source_blend_path),
        'sourceBlendSha256': hashlib.sha256(Path(source_blend_path).read_bytes()).hexdigest(),
        'outputGlb': output_path,
        'outputBytes': len(output_bytes),
        'outputSha256': hashlib.sha256(output_bytes).hexdigest(),
        'highSourceTriangles': high_source_triangles,
        'highSourcePolygons': high_source_polygons,
        'lowTargetTriangles': low_target_triangles,
        'lowTargetPolygons': low_target_polygons,
        'glbTriangles': triangles,
        'boundsM': position_bounds,
        'rootTransform': root_transform,
        'rootExtras': root_extras,
        'primitiveExtras': primitive_extras,
        'inspectionRecord': inspection_record,
        'textureChannels': {
            'occlusionTexture': 'R',
            'metallicRoughnessTexture': {'roughness': 'G', 'metallic': 'B'},
            'metallicFactor': pbr.get('metallicFactor', 1.0),
        },
        'materialMaps': texture_roles,
        'mapRoles': source_materials,
        'sockets': [],
        'collisionParts': [],
        'limitations': [
            'Original procedural specimen demonstrates a bounded bake/export path, not finished live-rock art.',
            'AO is exported as glTF occlusionTexture in the packed ORM image red channel; the specimen has no coral COLOR_0 mask.',
            'No tangent-space normal texture is included in this specimen; the licensed Staghorn normal reprojection is a separate proof.',
        ],
    }
    Path(report_path).parent.mkdir(parents=True, exist_ok=True)
    Path(report_path).write_text(json.dumps(report, indent=2) + '\n')
    print('AQ40_ORIGINAL_ROCK_BAKE ' + json.dumps(report, sort_keys=True))


main()
