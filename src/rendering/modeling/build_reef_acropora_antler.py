"""Original rigid Acropora-like antler morphology pilot (AQ-70.11).
Custom meter-scale design, not a taxonomic/physical specimen calibration.
Save packed source, export override, bake normal/albedo/roughness + raw contact AO.
Run Blender --background --threads 4 --python this_file.
"""
import bpy, math, random, json
from mathutils import Vector
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
ID='reef-acropora-antler'
OUT=ROOT/'src/rendering/assets/splat-fish'
REVIEW=Path('/tmp/aq70-11-antler-review'); REVIEW.mkdir(parents=True,exist_ok=True)
rng=random.Random(20261113)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=8;scene.cycles.seed=2026
scene.render.threads_mode='FIXED';scene.render.threads=4
verts,faces,tips,branch_records=[],[],[],[]

def bezier(a,b,c,t): return (1-t)**2*a+2*(1-t)*t*b+t*t*c

def tube(a,b,c,r0,r1,tip=True):
    branch_records.append((a.copy(),b.copy(),c.copy(),r0,r1))
    length=(b-a).length+(c-b).length
    steps=max(12,math.ceil(length/.003))
    sides=12
    start=len(verts)
    for i in range(steps+1):
        t=i/steps;p=bezier(a,b,c,t)
        tangent=(2*(1-t)*(b-a)+2*t*(c-b)).normalized()
        seed=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((1,0,0))
        n=seed.cross(tangent).normalized();v=tangent.cross(n).normalized()
        radius=r0*(1-t)+r1*t
        if tip and t>.98: radius=max(.00035,radius*math.cos((t-.98)/.02*math.pi*.45))
        for j in range(sides):
            angle=j*2*math.pi/sides
            # Mild irregularity, rather than identical straight circular rods.
            radial=radius*(1+.045*math.sin(7*t+3*angle))
            verts.append(tuple(p+radial*(math.cos(angle)*n+math.sin(angle)*v)))
    for i in range(steps):
        for j in range(sides):
            k=(j+1)%sides
            faces.append((start+i*sides+j,start+i*sides+k,start+(i+1)*sides+k,start+(i+1)*sides+j))
    faces.append(tuple(start+j for j in reversed(range(sides))))
    faces.append(tuple(start+steps*sides+j for j in range(sides)))
    if tip: tips.append(c.copy())

stem=(Vector((0,0,.002)),Vector((-.005,.003,.050)),Vector((.003,-.002,.108)))
tube(*stem,.008,.005,False)
# Unequal hierarchical limbs leave real negative space between visible forks.
branches=[
    (.43,(-.030,-.015,.095),(-.080,-.028,.174)),
    (.66,(-.035,.028,.135),(-.064,.060,.211)),
    (.80,(.017,.003,.163),(.043,.023,.238)),
    (.47,(.043,-.028,.105),(.093,-.062,.181)),
    (.63,(.047,.032,.132),(.101,.050,.191)),
    (.37,(-.015,-.025,.110),(-.025,-.055,.175)),
    (.58,(-.045,.005,.130),(-.110,.015,.188)),
    (.35,(.035,-.025,.085),(.075,-.040,.135)),
]
for index,(start_t,mid,end) in enumerate(branches):
    a=bezier(*stem,start_t);b=Vector(mid);c=Vector(end)
    r0=.0057+rng.uniform(-.0006,.0006);r1=.0026+rng.uniform(-.0002,.0002)
    tube(a,b,c,r0,r1)
    for fork_i,t in enumerate((.32+rng.uniform(-.06,.05),.64+rng.uniform(-.05,.06))):
        p=bezier(a,b,c,t);tangent=(2*(1-t)*(b-a)+2*t*(c-b)).normalized()
        side=Vector((math.cos(index*1.73+fork_i*2.5),math.sin(index*1.73+fork_i*2.5),.18))
        direction=(tangent*.40+side*.79+Vector((0,0,.20))).normalized()
        length=(.069 if fork_i==0 else .046)*rng.uniform(.88,1.12)
        q=p+direction*length*.53
        e=p+(direction+Vector((0,0,.13))).normalized()*length
        tube(p,q,e,r0*.62,.0021)
        if fork_i==0:
            base=bezier(p,q,e,.54)
            lateral=(direction*.45-side*.50+Vector((0,0,.55))).normalized()
            tube(base,base+lateral*.018,base+lateral*.038,.0027,.0017)
mesh=bpy.data.meshes.new('Antler_Branch_Construction');mesh.from_pydata(verts,[],faces);mesh.update()
body=bpy.data.objects.new('Antler_High_Source',mesh);bpy.context.collection.objects.link(body)
bpy.context.view_layer.objects.active=body;body.select_set(True)
# Basal holdfast is part of the solid branch graph, not a separate floating cap.
bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,radius=.014,location=(0,0,.002))
foot=bpy.context.object;foot.scale.z=.27
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
body.select_set(True);bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
remesh=body.modifiers.new('Organic_Branch_Junction_Union','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.0009;remesh.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth=body.modifiers.new('Round_Junctions','SMOOTH');smooth.factor=.32;smooth.iterations=2;bpy.ops.object.modifier_apply(modifier=smooth.name)
# Match the established colony height; proportions are a chosen art scale.
z0=min(v.co.z for v in body.data.vertices);z1=max(v.co.z for v in body.data.vertices)
scale=.218/(z1-z0)
for v in body.data.vertices:
    v.co=Vector((v.co.x*scale,v.co.y*scale,(v.co.z-z0)*scale))
    if v.co.z<.0015:v.co.z=0
scaled_tips=[Vector((p.x*scale,p.y*scale,(p.z-z0)*scale)) for p in tips]
body.data.update()
# Fine actual high-surface relief guarantees a geometric normal-bake source.
cloud=bpy.data.textures.new('Fine_Calcified_Surface',type='CLOUDS');cloud.noise_scale=.0025;cloud.noise_depth=2
relief=body.modifiers.new('Fine_Corallite_Relief','DISPLACE');relief.texture=cloud;relief.strength=.00020;relief.mid_level=.5
bpy.ops.object.modifier_apply(modifier=relief.name)
for p in body.data.polygons:p.use_smooth=True
low=body.copy();low.data=body.data.copy();low.name='Reef_Acropora_Antler';bpy.context.collection.objects.link(low)
body.select_set(False);low.select_set(True);bpy.context.view_layer.objects.active=low
low.data.calc_loop_triangles();before=len(low.data.loop_triangles)
decimate=low.modifiers.new('Runtime_LOD','DECIMATE');decimate.ratio=min(1,25000/before)
bpy.ops.object.modifier_apply(modifier=decimate.name)
low.data.validate(verbose=True);low.data.update()
# Bake the dense cups; retain every tenth cup as small silhouette geometry.
cv,cf,lv,lf,lr=[],[],[],[],[]
cup_index=0
for branch_index,(a,b,c,r0,r1) in enumerate(branch_records):
    count=max(5,int(((b-a).length+(c-b).length)*480))
    for k in range(count):
        t=.12+.76*(k+.5)/count
        center=bezier(a,b,c,t);tangent=(2*(1-t)*(b-a)+2*t*(c-b)).normalized()
        seed=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((1,0,0))
        n=seed.cross(tangent).normalized();v=tangent.cross(n).normalized()
        angle=k*2.39996+branch_index*1.173
        radial=(math.cos(angle)*n+math.sin(angle)*v).normalized()
        axis=(radial*.91+tangent*.41).normalized()
        origin=center+radial*((r0*(1-t)+r1*t)*.84)
        origin=Vector((origin.x*scale,origin.y*scale,(origin.z-z0)*scale))
        cn=axis.cross(Vector((0,0,1)) if abs(axis.z)<.9 else Vector((1,0,0))).normalized()
        cb=axis.cross(cn).normalized();start=len(cv)
        for height,radius in ((0,.00062),(.00060,.00083),(.00105,.00074),(.00105,.00039),(.00063,.00023)):
            for j in range(7):
                phi=j*2*math.pi/7
                cv.append(tuple(origin+axis*height+(math.cos(phi)*cn+math.sin(phi)*cb)*radius))
        for ring in range(4):
            for j in range(7):
                nxt=(j+1)%7
                cf.append((start+ring*7+j,start+ring*7+nxt,start+(ring+1)*7+nxt,start+(ring+1)*7+j))
        cf.append(tuple(start+4*7+j for j in range(7)))
        if cup_index%10==0:
            low_start=len(lv)
            for height,radius,rim in ((0,.00062,0),(.00105,.00074,1),(.00105,.00039,.7)):
                for j in range(5):
                    phi=j*2*math.pi/5
                    lv.append(tuple(origin+axis*height+(math.cos(phi)*cn+math.sin(phi)*cb)*radius));lr.append(rim)
            floor_index=len(lv);lv.append(tuple(origin+axis*.00063));lr.append(.3)
            for ring in range(2):
                for j in range(5):
                    nxt=(j+1)%5
                    lf.append((low_start+ring*5+j,low_start+ring*5+nxt,low_start+(ring+1)*5+nxt,low_start+(ring+1)*5+j))
            for j in range(5):lf.append((low_start+10+j,low_start+10+(j+1)%5,floor_index))
        cup_index+=1
cmesh=bpy.data.meshes.new('High_Radial_Corallite_Cups');cmesh.from_pydata(cv,[],cf);cmesh.update()
cups=bpy.data.objects.new('High_Radial_Corallites',cmesh);bpy.context.collection.objects.link(cups)
for poly in cups.data.polygons:poly.use_smooth=True
bpy.ops.object.select_all(action='DESELECT');cups.select_set(True);body.hide_set(False);body.select_set(True);bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
body.data.validate(verbose=True);body.data.update();body.data.calc_loop_triangles();high_final=len(body.data.loop_triangles)
body.select_set(False)
lmesh=bpy.data.meshes.new('Runtime_Corallite_Silhouettes');lmesh.from_pydata(lv,[],lf);lmesh.update()
rims=lmesh.attributes.new(name='__polyp_rim',type='FLOAT',domain='POINT')
for i,value in enumerate(lr):rims.data[i].value=value
lcups=bpy.data.objects.new('Runtime_Corallites',lmesh);bpy.context.collection.objects.link(lcups)
bpy.ops.object.select_all(action='DESELECT');lcups.select_set(True);low.select_set(True);bpy.context.view_layer.objects.active=low;bpy.ops.object.join()
low.data.validate(verbose=True);low.data.update()
for p in low.data.polygons:p.use_smooth=True
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.012);bpy.ops.object.mode_set(mode='OBJECT')
attr=low.data.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='CORNER')
low.data.color_attributes.active_color=attr;low.data.color_attributes.render_color_index=0
for loop in low.data.loops:
    p=low.data.vertices[loop.vertex_index].co
    distances=[(p-tip).length for tip in scaled_tips]
    nearest=min(range(len(distances)),key=lambda i:distances[i]);d=distances[nearest]
    t=max(0,min(1,(.014-d)/.011));growth=t*t*(3-2*t)
    rim=low.data.attributes.get('__polyp_rim')
    growth=max(growth,rim.data[loop.vertex_index].value if rim else 0)
    attr.data[loop.index].color=(0,growth,((nearest*137+31)%997)/997,1)

mat=bpy.data.materials.new('Living_Calcified_Tissue');mat.use_nodes=True
nodes,links=mat.node_tree.nodes,mat.node_tree.links;nodes.clear()
output=nodes.new('ShaderNodeOutputMaterial');bsdf=nodes.new('ShaderNodeBsdfPrincipled');links.new(bsdf.outputs['BSDF'],output.inputs['Surface'])
bsdf.inputs['Roughness'].default_value=.80
coord=nodes.new('ShaderNodeNewGeometry')
noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=380;noise.inputs['Detail'].default_value=3;links.new(coord.outputs['Position'],noise.inputs['Vector'])
ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.085,.035,.055,1);ramp.color_ramp.elements[1].color=(.26,.145,.18,1);links.new(noise.outputs['Fac'],ramp.inputs['Fac'])
vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='COLOR_0';sep=nodes.new('ShaderNodeSeparateColor');links.new(vc.outputs['Color'],sep.inputs['Color'])
tissue=nodes.new('ShaderNodeMixRGB');tissue.inputs[2].default_value=(.50,.39,.42,1);links.new(sep.outputs['Green'],tissue.inputs[0]);links.new(ramp.outputs['Color'],tissue.inputs[1]);links.new(tissue.outputs[0],bsdf.inputs['Base Color'])
rough=nodes.new('ShaderNodeMath');rough.operation='MULTIPLY_ADD';rough.inputs[1].default_value=.18;rough.inputs[2].default_value=.66;links.new(noise.outputs['Fac'],rough.inputs[0])
low.data.materials.clear();low.data.materials.append(mat)
# High source needs no material color for NORMAL baking.
high_mat=bpy.data.materials.new('High_Source_Clay');high_mat.use_nodes=True
body.data.materials.clear();body.data.materials.append(high_mat)
target=nodes.new('ShaderNodeTexImage');target.name='Bake_Target'
image_dir=OUT/'blend'/f'{ID}-textures';image_dir.mkdir(parents=True,exist_ok=True)
def make_image(name,noncolor=True):
    im=bpy.data.images.new(f'{ID}-{name}',width=512,height=512,alpha=False)
    im.colorspace_settings.name='Non-Color' if noncolor else 'sRGB'
    return im
normal_image=make_image('normal');target.image=normal_image;nodes.active=target
body.hide_render=False;body.select_set(True);low.select_set(True);bpy.context.view_layer.objects.active=low
bpy.ops.object.bake(type='NORMAL',normal_space='TANGENT',use_selected_to_active=True,use_cage=False,cage_extrusion=.0015,max_ray_distance=.004,margin=8)
body.select_set(False);body.hide_render=True
# Bake actual low-geometry ambient contact; encode it into raw mask A.
ao_image=make_image('contact-ao');target.image=ao_image;nodes.active=target
bpy.ops.object.bake(type='AO',use_selected_to_active=False,margin=8)
ao_pixels=list(ao_image.pixels);uv=low.data.uv_layers.active
for loop in low.data.loops:
    u,v=uv.data[loop.index].uv;x=max(0,min(511,round(u*511)));y=max(0,min(511,round(v*511)))
    rgba=list(attr.data[loop.index].color);rgba[3]=max(.18,min(1,ao_pixels[(y*512+x)*4]));attr.data[loop.index].color=rgba
emission=nodes.new('ShaderNodeEmission');links.new(emission.outputs[0],output.inputs['Surface'])
base_image=make_image('tissue',False);target.image=base_image;nodes.active=target;links.new(tissue.outputs[0],emission.inputs['Color'])
bpy.ops.object.bake(type='EMIT',use_selected_to_active=False,margin=8)
rough_image=make_image('roughness');target.image=rough_image;nodes.active=target;links.new(rough.outputs[0],emission.inputs['Color'])
bpy.ops.object.bake(type='EMIT',use_selected_to_active=False,margin=8)
for im in (normal_image,ao_image,base_image,rough_image):
    im.filepath_raw=str(image_dir/f'{im.name}.png');im.file_format='PNG';im.save();im.pack()
# Export only conventional opaque PBR links; fluorescence remains raw-G masked runtime work.
nodes.clear();output=nodes.new('ShaderNodeOutputMaterial');bsdf=nodes.new('ShaderNodeBsdfPrincipled');links.new(bsdf.outputs[0],output.inputs['Surface'])
tex=nodes.new('ShaderNodeTexImage');tex.image=base_image;links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
rtex=nodes.new('ShaderNodeTexImage');rtex.image=rough_image;links.new(rtex.outputs['Color'],bsdf.inputs['Roughness'])
ntex=nodes.new('ShaderNodeTexImage');ntex.image=normal_image;nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.70;links.new(ntex.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs[0],bsdf.inputs['Normal'])
mat.use_backface_culling=True
if low.data.validate(verbose=True): raise RuntimeError('Runtime mesh changed after bake; rebuild before persisting')
body.hide_set(True);low.select_set(True);bpy.context.view_layer.objects.active=low
low['authoring_notes']='Original custom thin irregular joined antler graph. Height0.218m is a chosen comparison scale. R0 rigid; G tip distance and corallite rims; B nearest tip phase; A sampled baked AO floored0.18. Native high mesh retained; no imported visuals. No taxonomy or animated clearance claim.'
low.data.calc_loop_triangles();triangles=len(low.data.loop_triangles)
blend=OUT/'blend'/f'{ID}.blend';blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=False)
override=OUT/'overrides'/f'{ID}.glb';override.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(override),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False,export_tangents=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False,export_active_vertex_color_when_no_material=True,export_attributes=False)
print('ANTLER_SAVED_EXPORTED',json.dumps({'native':str(blend),'override':str(override),'triangles':triangles,'highTriangles':high_final,'tips':len(tips),'runtimeCoralliteCups':math.ceil(cup_index/10),'coralliteCups':sum(max(5,int(((b-a).length+(c-b).length)*480)) for a,b,c,r0,r1 in branch_records)}),flush=True)
# Review-only views: after native/export persistence, never save these scene edits.
bpy.ops.object.select_all(action='DESELECT');before_objects=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'src/rendering/assets/corals/coral-acropora-staghorn.glb'))
old=[o for o in bpy.data.objects if o not in before_objects]
for o in old:
    if o.parent is None:o.location.x-=.15;o.location.z+=.003
low.location.x=.15
clay=bpy.data.materials.new('Neutral_Review_Clay');clay.diffuse_color=(.42,.42,.42,1);clay.use_nodes=True;clay.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.42,.42,.42,1);clay.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.85
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.004));floor=bpy.context.object;floor.data.materials.append(clay)
world=bpy.data.worlds.new('Neutral_Inspection');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.14,.14,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
for name,pos,energy,size in [('Key',(.05,-.22,.5),3.5,.3),('Fill',(-.3,-.10,.27),1.2,.4),('Rim',(.1,.3,.35),2.0,.25)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=pos;obj.rotation_euler=(Vector((0,0,.10))-obj.location).to_track_quat('-Z','Y').to_euler()
cam_data=bpy.data.cameras.new('Review');cam=bpy.data.objects.new('Review',cam_data);bpy.context.collection.objects.link(cam);scene.camera=cam;cam.location=(0,-.65,.28);cam.rotation_euler=(Vector((0,0,.11))-cam.location).to_track_quat('-Z','Y').to_euler();cam_data.type='ORTHO';cam_data.ortho_scale=.63
scene.render.resolution_x=1200;scene.render.resolution_y=850;scene.render.resolution_percentage=100;scene.cycles.samples=16
scene.view_settings.view_transform='AgX';scene.view_layers[0].material_override=clay;scene.render.filepath=str(REVIEW/'current-left-antler-right-clay.png');bpy.ops.render.render(write_still=True)
for o in old:o.hide_render=True
low.location.x=0;cam_data.ortho_scale=.30;scene.view_layers[0].material_override=None;scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.filepath=str(REVIEW/'antler-neutral-textured.png');bpy.ops.render.render(write_still=True)
print('ANTLER_REVIEW_COMPLETE',str(REVIEW),flush=True)
