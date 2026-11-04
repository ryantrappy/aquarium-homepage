import bpy, bmesh, sys, math
model, mesh_name, prefix, out = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=model)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = bpy.data.objects[mesh_name]
keep_groups = {v.index for v in mesh.vertex_groups if v.name.startswith(prefix + ':')}
remove = {v.index for v in mesh.data.vertices if not any(g.group in keep_groups and g.weight > 0.001 for g in v.groups)}
bm = bmesh.new(); bm.from_mesh(mesh.data);bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index in remove], context='VERTS');bm.to_mesh(mesh.data);bm.free()
print('RETAINED', len(mesh.data.vertices), len(mesh.data.polygons))
for o in list(bpy.data.objects):
 if o.type == 'MESH' and o != mesh: bpy.data.objects.remove(o, do_unlink=True)
arm.animation_data_clear()
for action in list(bpy.data.actions): bpy.data.actions.remove(action)
bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);bpy.context.view_layer.objects.active=arm
bpy.ops.object.mode_set(mode='EDIT')
for b in list(arm.data.edit_bones):
 if not (b.name.startswith(prefix + ':') or b.name in ['root.4_8', 'GLTF_created_0_rootJoint']): arm.data.edit_bones.remove(b)
bpy.ops.object.mode_set(mode='OBJECT')
# Export a common test clip so each renderer plays identical authored transforms.
# The angles are experimental and are not biological measurements.
for bone in arm.pose.bones:
 bone.rotation_mode = 'XYZ'
 for frame in range(1, 50, 2):
  phase = (frame - 1) * math.tau / 48
  if 'Spine_02' in bone.name: bone.rotation_euler.y = .08 * math.sin(phase)
  elif 'Spine_03' in bone.name: bone.rotation_euler.y = .14 * math.sin(phase - .5)
  elif 'Spine_04' in bone.name: bone.rotation_euler.y = .21 * math.sin(phase - 1.0)
  elif 'L_Upper_fin.' in bone.name: bone.rotation_euler.z = .2 * math.sin(2 * phase)
  elif 'R_Upper_fin.' in bone.name: bone.rotation_euler.z = -.2 * math.sin(2 * phase)
  else: continue
  bone.keyframe_insert(data_path='rotation_euler', frame=frame)
scene = bpy.context.scene
scene.frame_start = 1; scene.frame_end = 49; scene.render.fps = 24
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB', export_animations=True)

