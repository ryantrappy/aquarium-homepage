"""Original flowing torch morphology (AQ-70.11), not specimen-scale calibration.
Packed native + selected static two-material GLB; raw soft/rigid coral masks.
Run Blender --background --threads 4 --python this_file. No imported visuals.
"""
import bpy, math, random, json
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
ID='reef-euphyllia-flowing-torch';OUT=ROOT/'src/rendering/assets/splat-fish'
REVIEW=Path('/tmp/aq70-11-flowing-torch-review');REVIEW.mkdir(exist_ok=True)
rng=random.Random(20261115)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.device='CPU';scene.cycles.seed=2026
scene.render.threads_mode='FIXED';scene.render.threads=4
verts,faces,face_uvs,masks,materials=[],[],[],[],[]
def vertex(p,mask):
    verts.append(tuple(p));masks.append(mask);return len(verts)-1

def face(indices,uv,material):
    faces.append(tuple(indices));face_uvs.append(uv);materials.append(material)

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

def cubic(a,b,c,d,t):return (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d

def frame(tangent):
    tangent.normalize();seed=Vector((0,0,1)) if abs(tangent.z)<.90 else Vector((1,0,0))
    n=seed.cross(tangent).normalized();return n,tangent.cross(n).normalized()

def tube(points,radii,mask_fn,material,sides=7,phase=0):
    rings=[]
    for k,(p,radius) in enumerate(zip(points,radii)):
        n,b=frame(points[min(k+1,len(points)-1)]-points[max(k-1,0)])
        ring=[]
        for j in range(sides):
            phi=j*2*math.pi/sides;ring.append(vertex(p+(math.cos(phi)*n+math.sin(phi)*b)*radius,mask_fn(k/(len(points)-1))))
        rings.append(ring)
    for k in range(len(rings)-1):
        v0=k/(len(rings)-1);v1=(k+1)/(len(rings)-1)
        for j in range(sides):
            nxt=(j+1)%sides;u0=j/sides+phase;u1=(j+1)/sides+phase
            face((rings[k][j],rings[k][nxt],rings[k+1][nxt],rings[k+1][j]),[(u0,v0),(u1,v0),(u1,v1),(u0,v1)],material)
    face(tuple(reversed(rings[0])),[(phase+.5+.10*math.cos(j*2*math.pi/sides),.015+.012*math.sin(j*2*math.pi/sides)) for j in reversed(range(sides))],material)
    face(rings[-1],[(phase+.5+.10*math.cos(j*2*math.pi/sides),.985+.012*math.sin(j*2*math.pi/sides)) for j in range(sides)],material)

def disc(center,radius,material,mask):
    pole=vertex(center,mask);prev=None;sides=24
    for k in range(1,5):
        r=radius*k/4;ring=[]
        for j in range(sides):
            a=j*2*math.pi/sides;p=center+Vector((math.cos(a)*r,math.sin(a)*r,-.002*(k/4)**2+.00035*math.cos(12*a)))
            ring.append(vertex(p,mask))
        for j in range(sides):
            nxt=(j+1)%sides;u0=j/sides;u1=(j+1)/sides
            if prev is None:face((pole,ring[j],ring[nxt]),[(u0,0),(u0,.25),(u1,.25)],material)
            else:face((prev[j],ring[j],ring[nxt],prev[nxt]),[(u0,(k-1)/4),(u0,k/4),(u1,k/4),(u1,(k-1)/4)],material)
        prev=ring

heads=[Vector(p) for p in [(0,0,.060),(-.043,-.010,.047),(.039,-.020,.044),(.024,.037,.054),(-.027,.039,.042)]]
# Calcified branching stalks and flared ribbed calyces remain a rigid primitive.
for hi,center in enumerate(heads):
    a=Vector((0,0,.002));b=Vector((center.x*.45,center.y*.45,.018));c=center-Vector((0,0,.010))
    pts=[(1-t)**2*a+2*(1-t)*t*b+t*t*c for t in [i/7 for i in range(8)]]
    tube(pts,[.008*(1-i/7)+.006*i/7 for i in range(8)],lambda t:(0,0,.5,.42+.38*t),1,12,hi*.13)
    # An open calyx with fluted carbonate walls and an inward rim, not a solid ball.
    ring_spec=[(-.014,.008),(-.008,.012),(.000,.019),(.004,.020),(.004,.016),(-.003,.012)]
    rings=[];sides=24
    for k,(z,r) in enumerate(ring_spec):
        ring=[]
        for j in range(sides):
            a=j*2*math.pi/sides;rr=r*(1+.055*math.cos(12*a));ring.append(vertex(center+Vector((rr*math.cos(a),rr*math.sin(a),z)),(0,0,.5,.56+.07*k)))
        rings.append(ring)
    for k in range(len(rings)-1):
        for j in range(sides):
            n=(j+1)%sides;face((rings[k][j],rings[k][n],rings[k+1][n],rings[k+1][j]),[(j/sides,k/5),((j+1)/sides,k/5),((j+1)/sides,(k+1)/5),(j/sides,(k+1)/5)],1)
    disc(center+Vector((0,0,.005)),.0165,0,(0,0,(hi+.25)/5,.40))
    for ti in range(33):
        phi=ti*2.399963+hi*.83+rng.uniform(-.10,.10);radial=Vector((math.cos(phi),math.sin(phi),0));side=Vector((-math.sin(phi),math.cos(phi),0))
        r=.003+.0125*math.sqrt((ti+.5)/33);phase=rng.random();p0=center+radial*r+Vector((0,0,.005))
        reach=.018+.025*(r/.016)+rng.uniform(-.004,.006)
        height=.052+.027*(1-r/.016)+rng.uniform(-.009,.009)
        flow=Vector((.013,-.005,0))*rng.uniform(.35,1.20)+side*rng.uniform(-.012,.012)
        p3=p0+radial*reach+flow+Vector((0,0,height))
        p1=p0-radial*rng.uniform(.002,.010)+side*rng.uniform(-.009,.009)+Vector((0,0,.036))
        p2=p3-radial*rng.uniform(.002,.015)-flow*.15+Vector((0,0,rng.uniform(-.010,.028)))+side*rng.uniform(-.014,.014)
        ts=[0,.13,.26,.40,.54,.68,.81,.91,.965,.990,1]
        points=[cubic(p0,p1,p2,p3,t) for t in ts]
        base=rng.uniform(.0020,.0028)
        radii=[base*(.86+.14*math.sin(math.pi*t))*(1+.18*smooth(.82,.93,t))*math.sqrt(max(.012,1-smooth(.955,1,t)**2)) for t in ts]
        def raw(t,phase=phase):return (t**1.8,smooth(.85,.98,t),phase,.40+.60*smooth(0,.50,t))
        tube(points,radii,raw,0,7,phase)
# Small holdfast is a rigid attachment, placed at the origin for socket seating.
pts=[Vector((0,0,z)) for z in [0,.002,.006]]
tube(pts,[.018,.0185,.011],lambda t:(0,0,.5,.40+.30*t),1,24)
z0=min(p[2] for p in verts);z1=max(p[2] for p in verts);scale=.177/(z1-z0)
verts=[(x*scale,y*scale,(z-z0)*scale) for x,y,z in verts]
mesh=bpy.data.meshes.new('Flowing_Torch_Tissue_And_Skeleton');mesh.from_pydata(verts,[],faces);mesh.update()
if mesh.validate(verbose=True):raise RuntimeError('Construction needs correction before UV/masks')
obj=bpy.data.objects.new('Reef_Euphyllia_Flowing_Torch',mesh);bpy.context.collection.objects.link(obj);obj.select_set(True);bpy.context.view_layer.objects.active=obj
uv=mesh.uv_layers.new(name='Tissue_Radial_ArcLength')
attr=mesh.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='CORNER');mesh.color_attributes.active_color=attr;mesh.color_attributes.render_color_index=0
for poly in mesh.polygons:
    poly.use_smooth=True;poly.material_index=materials[poly.index]
    for j,loop_i in enumerate(poly.loop_indices):
        uv.data[loop_i].uv=face_uvs[poly.index][j];attr.data[loop_i].color=masks[mesh.loops[loop_i].vertex_index]
image_dir=OUT/'blend'/f'{ID}-textures';image_dir.mkdir(parents=True,exist_ok=True)
def image(name,size,fn,noncolor):
    im=bpy.data.images.new(ID+'-'+name,width=size,height=size,alpha=False);im.colorspace_settings.name='Non-Color' if noncolor else 'sRGB';pixels=[]
    for y in range(size):
        for x in range(size):pixels.extend((*fn(x/(size-1),y/(size-1)),1))
    im.pixels.foreach_set(pixels);im.filepath_raw=str(image_dir/(im.name+'.png'));im.file_format='PNG';im.save();im.pack();return im

def tissue(u,v):
    streak=.5+.25*math.sin(2*math.pi*u*9)+.12*math.cos(2*math.pi*(u*23+v*3))
    tip=smooth(.86,.98,v);shade=.78+.22*streak;body=(.30*shade,.43*shade,.20*shade);end=(.74,.74,.50)
    return tuple(body[i]*(1-tip)+end[i]*tip for i in range(3))

def skeleton(u,v):
    rib=.5+.5*math.cos(24*math.pi*u);patch=.5+.5*math.sin(2*math.pi*(3*u+v));collar=smooth(.78,.98,v);stone=(.38+.08*rib+.04*patch,.34+.07*rib-.04*patch,.29+.06*rib+.03*patch);return tuple(stone[i]*(1-collar)+(.25,.16,.13)[i]*collar for i in range(3))

def normal(u,v,strength):
    x=strength*math.sin(18*math.pi*u)*(.6+.4*math.sin(2*math.pi*v));y=strength*.18*math.cos(6*math.pi*v);n=Vector((x,y,1)).normalized();return tuple(.5+.5*c for c in n)
for label,material_id,size in [('tissue',0,512),('skeleton',1,256)]:
    base=image(label+'-albedo',size,tissue if material_id==0 else skeleton,False)
    n=image(label+'-normal',size,lambda u,v:normal(u,v,.05 if material_id==0 else .08),True)
    rough=image(label+'-roughness',size,lambda u,v:((.38 if material_id==0 else .78)+.08*(.5+.5*math.sin(2*math.pi*(u*5+v*3))),)*3,True)
    mat=bpy.data.materials.new('Flowing_Torch_'+label.title());mat.use_nodes=True;nodes,links=mat.node_tree.nodes,mat.node_tree.links
    bsdf=nodes.get('Principled BSDF');bsdf.inputs['Metallic'].default_value=0
    tex=nodes.new('ShaderNodeTexImage');tex.image=base;links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    tex=nodes.new('ShaderNodeTexImage');tex.image=rough;links.new(tex.outputs['Color'],bsdf.inputs['Roughness'])
    tex=nodes.new('ShaderNodeTexImage');tex.image=n;nm=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs[0],bsdf.inputs['Normal'])
    if material_id==0:
        bsdf.inputs['Transmission Weight'].default_value=.12;bsdf.inputs['IOR'].default_value=1.36;bsdf.inputs['Coat Weight'].default_value=.12;bsdf.inputs['Coat Roughness'].default_value=.30
    mat['reefPrimitive']={'id':'flowing_torch_crown' if material_id==0 else 'flowing_torch_skeleton','role':'coral-soft' if material_id==0 else 'coral-rigid','maskSchema':'coral-raw-masks-v1'}
    mesh.materials.append(mat)
obj['authoring_notes']='Original five-head flowing torch,165slender irregular tentacles,smallroundedtips,flutedcalyces. RawRarcflex onsofttissue only; rigidR0, Gtips, Bphase, Aanalyticcontact. Chosen0.177m comparisonheight, no measuredspecimen/scene calibration. Originalproceduralmaps and restrainedtransmission; noexternalvisuals.'
triangulate=obj.modifiers.new('Stable_Export_Triangles','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=triangulate.name);mesh=obj.data
if mesh.validate(verbose=True):raise RuntimeError('Final native mesh changed after assigning masks')
mesh.calc_loop_triangles();triangles=len(mesh.loop_triangles)
blend=OUT/'blend'/f'{ID}.blend';override=OUT/'overrides'/f'{ID}.glb';override.parent.mkdir(parents=True,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=False)
bpy.ops.export_scene.gltf(filepath=str(override),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False,export_tangents=True,export_vertex_color='ACTIVE',export_active_vertex_color_when_no_material=True)
print('FLOWING_TORCH_SAVED_EXPORTED',json.dumps({'triangles':triangles,'vertices':len(mesh.vertices),'tentacles':165,'heads':5,'dimensions':list(obj.dimensions)}),flush=True)
# Review-only scene edits after source/export persistence. Never save these.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'src/rendering/assets/corals/coral-euphyllia-torch.glb'));old=[o for o in bpy.data.objects if o not in before]
for o in old:
    if o.parent is None:o.location.x=-.17
obj.location.x=.17
clay=bpy.data.materials.new('Neutral_Clay');clay.use_nodes=True;clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.42,.42,.42,1);clay.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.82
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.004));bpy.context.object.data.materials.append(clay)
world=bpy.data.worlds.new('Neutral_Review');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.14,.14,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
for name,pos,energy,size in [('Key',(.05,-.22,.5),3.5,.3),('Fill',(-.3,-.10,.27),1.2,.4),('Rim',(.1,.3,.35),2,.25)]:
    light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.shape='DISK';light.size=size;o=bpy.data.objects.new(name,light);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.08))-o.location).to_track_quat('-Z','Y').to_euler()
cam_data=bpy.data.cameras.new('Review');cam=bpy.data.objects.new('Review',cam_data);bpy.context.collection.objects.link(cam);scene.camera=cam;cam.location=(0,-.65,.29);cam.rotation_euler=(Vector((0,0,.085))-cam.location).to_track_quat('-Z','Y').to_euler();cam_data.type='ORTHO';cam_data.ortho_scale=.70
scene.render.resolution_x=1200;scene.render.resolution_y=850;scene.render.resolution_percentage=100;scene.cycles.samples=16;scene.view_settings.view_transform='AgX';scene.view_layers[0].material_override=clay;scene.render.filepath=str(REVIEW/'current-left-flowing-right-clay.png');bpy.ops.render.render(write_still=True)
for o in old:o.hide_render=True
obj.location.x=0;cam_data.ortho_scale=.34;scene.view_layers[0].material_override=None;scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.filepath=str(REVIEW/'flowing-torch-neutral-textured.png');bpy.ops.render.render(write_still=True)
print('FLOWING_TORCH_REVIEW_COMPLETE',flush=True)
