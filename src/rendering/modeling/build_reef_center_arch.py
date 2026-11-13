"""Original limestone arch; deterministic geometry and custom packed PBR textures.
Run Blender --background --threads 4 --python this_file (live user file untouched).
Textures are procedural surface detail, not claimed high-poly baking/AO proof.
"""
import bpy, bmesh, math
import numpy as np
from mathutils import Vector
from mathutils.noise import noise
from mathutils.bvhtree import BVHTree
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ID = 'reef-center-arch'
N, M, SIZE = 144, 64, 1024
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 1

# A single capped, continuous solid. No intersecting component shells/parity ambiguity.
def surface(u, v, detailed=True):
    t, p = u * math.pi, v * 2 * math.pi
    cx = -.435 * math.cos(t) - .025 * math.sin(t)
    cy = .475 * math.sin(t) + .035 * math.sin(2*t)
    dx = .435 * math.sin(t) - .025 * math.cos(t)
    dy = .475 * math.cos(t) + .07 * math.cos(2*t)
    mag = math.hypot(dx, dy)
    nx, ny = dy / mag, -dx / mag
    radius = .082 + .017 * math.sin(3*t + .5) + .009 * math.sin(7*t - .7)
    rough = .009 * math.sin(13*t + 2*math.sin(p)) * math.sin(5*p + 5*t)
    rough += .005 * math.cos(27*t - 7*p) + .003 * math.sin(55*t + 11*p)
    q = Vector((cx + nx * radius * math.cos(p), radius * math.sin(p), cy + ny * radius * math.cos(p)))
    # Coherent 3D erosion breaks the uniform tube into angular carbonate lobes.
    rough += .012 * noise(q * 44, noise_basis='PERLIN_ORIGINAL')
    rough += .004 * noise(q * 135, noise_basis='PERLIN_ORIGINAL')
    r = radius + (rough if detailed else 0)
    cs = math.copysign(abs(math.cos(p)) ** .78, math.cos(p))
    sn = math.copysign(abs(math.sin(p)) ** .78, math.sin(p))
    return (cx + nx * r * cs, r * .83 * sn + .018 * math.sin(2*t), cy + ny * r * cs)

verts = [surface(i/N, j/M) for i in range(N+1) for j in range(M)]
faces = []
for i in range(N):
    for j in range(M):
        k = (j+1) % M
        # Consistent outward orientation (recalculated independently below).
        faces.append((i*M+j, i*M+k, (i+1)*M+k, (i+1)*M+j))
for end in (0, N):
    center = tuple(np.mean(np.array(verts[end*M:(end+1)*M]), axis=0))
    index = len(verts); verts.append(center)
    for j in range(M):
        k = (j+1) % M
        faces.append((index,end*M+j,end*M+k))
mesh = bpy.data.meshes.new('Reef_Center_Arch'); mesh.from_pydata(verts, [], faces); mesh.update()
rock = bpy.data.objects.new('Reef_Center_Arch', mesh); bpy.context.collection.objects.link(rock)
bpy.context.view_layer.objects.active = rock; rock.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')

def ensure_outward():
    bm = bmesh.new(); bm.from_mesh(mesh)
    if bm.calc_volume(signed=True) < 0: bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.to_mesh(mesh); bm.free(); mesh.update()

ensure_outward()

# Small measured mounting skins follow the local rock normal. They are limited
# to colony feet; the bridge silhouette and open passage remain unchanged.
socket_specs = [
    ('socket_soft_mat_11', -.27, .025, .040, 'zoanthid-mat'),
    ('socket_plate_ledge_11', -.08, .024, .042, 'plating-sps'),
    ('socket_soft_mat_12', .14, .025, .040, 'zoanthid-mat'),
    ('socket_sps_crest_11', .23, .022, .040, 'branching-sps'),
]
for name, x, footprint, clearance, archetype in socket_specs:
    tree = BVHTree.FromPolygons([v.co for v in mesh.vertices], [p.vertices[:] for p in mesh.polygons])
    if archetype == 'zoanthid-mat':
        t=math.acos(max(-1,min(1,-x/.435)))
        center_h=.475*math.sin(t)+.035*math.sin(2*t)
        candidates=[]
        for step in range(16):
            hit=tree.ray_cast(Vector((x,-1.5,center_h+.005*step)),Vector((0,1,0)))
            if hit[0] is not None and hit[1].z>.15 and hit[1].y<-.4:
                score=abs(hit[1].z-.5)+.6*abs(hit[1].y+.8)+.2*abs(hit[1].x)
                candidates.append((score,hit[0],hit[1]))
        if not candidates: raise RuntimeError(f'No upward front slope for {name}')
        _,point,normal=min(candidates,key=lambda c:c[0])
    elif archetype == 'branching-sps':
        candidates=[]
        for dx in (-.01,0,.01):
            for depth in (-.045,-.030,-.015,0):
                hit=tree.ray_cast(Vector((x+dx,depth,1.5)),Vector((0,0,-1)))
                if hit[0] is not None and hit[1].z>.7 and hit[1].y<.1:
                    score=abs(hit[1].y+.25)+.3*abs(hit[1].x)+.3*abs(hit[1].z-.95)
                    candidates.append((score,hit[0],hit[1]))
        if not candidates: raise RuntimeError(f'No upward crest for {name}')
        _,point,normal=min(candidates,key=lambda c:c[0])
    else:
        point, normal, _, _ = tree.ray_cast(Vector((x, 0, 1.5)), Vector((0, 0, -1)))
    if point is None: raise RuntimeError(f'No actual rock surface for {name}')
    normal.normalize()
    for vertex in mesh.vertices:
        delta = vertex.co - point
        signed = delta.dot(normal)
        radial = (delta-normal*signed).length
        inner, outer = footprint+.012, clearance+.015
        if signed < -.065 or radial >= outer: continue
        # Remove small undercuts before projecting; smoothly blend the skin
        # back into porous rock instead of creating a hard platform edge.
        clean = Vector(surface((vertex.index//M)/N, (vertex.index%M)/M, False))
        target = clean-normal*(clean-point).dot(normal)
        blend = max(0,min(1,(outer-radial)/(outer-inner)))
        blend=blend*blend*(3-2*blend)
        vertex.co = vertex.co.lerp(target,blend)
        raised=(vertex.co-point).dot(normal)
        if raised>0: vertex.co-=normal*raised
    mesh.update()
    socket = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(socket)
    socket.parent = rock
    socket.location = point
    socket.rotation_mode = 'QUATERNION'
    socket.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(normal)
    socket.empty_display_size = footprint
    socket['reefSocket'] = {'role':'coral-mount', 'parentMesh':'reef_center_arch', 'archetype':archetype,
                           'footprintRadiusM':footprint, 'clearanceRadiusM':clearance}
    socket.select_set(True)
bpy.context.view_layer.objects.active = rock
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
ensure_outward()
uv = mesh.uv_layers.new(name='UVMap')
for poly in mesh.polygons:
    poly.use_smooth = True
    js = [index%M for index in poly.vertices if index<(N+1)*M]
    wraps = max(js)-min(js)>M/2
    for loop in poly.loop_indices:
        index=mesh.loops[loop].vertex_index
        if index>=(N+1)*M: xy=(0 if index==(N+1)*M else 1,.5)
        else:
            i,j=divmod(index,M)
            xy=(i/N,1 if wraps and j==0 else j/M)
        # Derive from vertex identity after winding correction, not loop order.
        uv.data[loop].uv=xy

# Seam-periodic isotropic value-noise fields remove the previous sine stripes.
# Approximately 3:1 UV metric: 1.45m length / .5m circumference. No external images.
v, u = np.mgrid[0:SIZE,0:SIZE].astype(np.float32); u=(u+.5)/SIZE; v=(v+.5)/SIZE
def field(nx, ny, seed):
    grid = np.random.default_rng(seed).random((ny,nx+1), dtype=np.float32)
    sx, sy = u*nx, v*ny
    ix, iy = np.floor(sx).astype(np.int32), np.floor(sy).astype(np.int32)
    fx, fy = sx-ix, sy-iy
    fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy)
    a=grid[iy%ny,ix]*(1-fx)+grid[iy%ny,ix+1]*fx
    b=grid[(iy+1)%ny,ix]*(1-fx)+grid[(iy+1)%ny,ix+1]*fx
    return a*(1-fy)+b*fy
macro = field(18,6,731)
medium = field(84,28,732)
fine = field(246,82,733)
pores = np.clip((medium*.7+fine*.3-.52)*4.5,0,1)**1.4
micro = (field(768,256,734)-.5)*2
patch = field(12,4,735)
coralline = np.clip((patch-.48)*2.7,0,.72)
base = np.empty((SIZE,SIZE,4),dtype=np.float32)
for c, carbonate, purple in ((0,.50,.44),(1,.465,.26),(2,.41,.38)):
    base[:,:,c] = (carbonate*(.84+.25*macro)*(1-.48*pores)+.035*micro)*(1-coralline)+purple*coralline
base[:,:,3]=1
height = -.0030*pores + .00016*micro
# Convert derivatives using approximate surface metric (1.45m arch / .5m circumference).
dhdu = np.gradient(height,axis=1)*SIZE/1.45
dhdv = np.gradient(height,axis=0)*SIZE/.5
normal = np.stack((-dhdu,-dhdv,np.ones_like(u)),axis=-1)
normal /= np.linalg.norm(normal,axis=-1,keepdims=True)
nrgba = np.ones((SIZE,SIZE,4),dtype=np.float32); nrgba[:,:,:3]=normal*.5+.5
orm = np.ones_like(base); orm[:,:,0]=1-.23*pores; orm[:,:,1]=.82+.12*pores; orm[:,:,2]=0
out = ROOT/'src/rendering/assets/splat-fish'; textures = out/'blend'/f'{ID}-textures'; textures.mkdir(parents=True,exist_ok=True)
def image(name, pixels, color):
    pixels = pixels if color else pixels[::2,::2].copy()
    side = pixels.shape[0]
    im=bpy.data.images.new(name,width=side,height=side,alpha=not color)
    im.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
    im.pixels.foreach_set(pixels.ravel()); im.filepath_raw=str(textures/f"{name}.{'jpg' if color else 'png'}"); im.file_format='JPEG' if color else 'PNG'; im.save(); im.pack(); return im
color_image=image(f'{ID}-carbonate',base,True)
normal_image=image(f'{ID}-normal',nrgba,False)
orm_image=image(f'{ID}-orm',orm,False)
mat=bpy.data.materials.new('Limestone_Carbonate_Coralline');mat.use_nodes=True
nodes,links=mat.node_tree.nodes,mat.node_tree.links
principled=nodes.get('Principled BSDF'); principled.inputs['Roughness'].default_value=.88
tex=nodes.new('ShaderNodeTexImage'); tex.image=color_image;links.new(tex.outputs['Color'],principled.inputs['Base Color'])
texn=nodes.new('ShaderNodeTexImage');texn.image=normal_image
n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.65;links.new(texn.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],principled.inputs['Normal'])
texorm=nodes.new('ShaderNodeTexImage');texorm.image=orm_image
sep=nodes.new('ShaderNodeSeparateColor');links.new(texorm.outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],principled.inputs['Roughness'])
rock.data.materials.append(mat)
# Apply coordinate conversion into vertex positions before export: Blender's +Z up
# becomes glTF +Y; export produces an identity root and meter positions.
for obj in bpy.context.selected_objects: obj.select_set(False)
rock.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for child in rock.children: child.select_set(True)
# Source provenance and limits stay with the packed native file.
rock['authoring_notes']='Original capped limestone arch with four local coral support skins and socket intents, independently measured after export. Custom 1024px carbonate and 512px normal/roughness surface fields; not a baked high-poly modular library or animated fish clearance claim.'
blend=out/'blend'/f'{ID}.blend'; blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=False)
override=out/'overrides'/f'{ID}.glb';override.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(override),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False,export_materials='EXPORT')
print('ARCH_SAVED_EXPORTED',blend,override,len(mesh.vertices),len(mesh.polygons))
