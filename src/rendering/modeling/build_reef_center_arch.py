"""Original limestone arch; deterministic geometry and custom packed PBR textures.
Run Blender --background --threads 4 --python this_file (live user file untouched).
Textures are procedural surface detail, not claimed high-poly baking/AO proof.
"""
import bpy, math
import numpy as np
from mathutils import Vector
from mathutils.noise import noise
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ID = 'reef-center-arch'
N, M, SIZE = 144, 64, 1024
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 1

# A single capped, continuous solid. No intersecting component shells/parity ambiguity.
def surface(u, v):
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
    r = radius + rough
    cs = math.copysign(abs(math.cos(p)) ** .78, math.cos(p))
    sn = math.copysign(abs(math.sin(p)) ** .78, math.sin(p))
    return (cx + nx * r * cs, r * .83 * sn + .018 * math.sin(2*t), cy + ny * r * cs)

verts = [surface(i/N, j/M) for i in range(N+1) for j in range(M)]
faces, uvfaces = [], []
for i in range(N):
    for j in range(M):
        k = (j+1) % M
        # Consistent outward orientation (recalculated independently below).
        faces.append((i*M+j, i*M+k, (i+1)*M+k, (i+1)*M+j))
        uvfaces.append(((i/N,j/M), (i/N,(j+1)/M), ((i+1)/N,(j+1)/M), ((i+1)/N,j/M)))
for end in (0, N):
    center = tuple(np.mean(np.array(verts[end*M:(end+1)*M]), axis=0))
    index = len(verts); verts.append(center)
    for j in range(M):
        k = (j+1) % M
        faces.append((index,end*M+j,end*M+k))
        uvfaces.append(((end/N,.5),(end/N,j/M),(end/N,(j+1)/M)))
mesh = bpy.data.meshes.new('Reef_Center_Arch'); mesh.from_pydata(verts, [], faces); mesh.update()
rock = bpy.data.objects.new('Reef_Center_Arch', mesh); bpy.context.collection.objects.link(rock)
bpy.context.view_layer.objects.active = rock; rock.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
uv = mesh.uv_layers.new(name='UVMap')
for poly, coords in zip(mesh.polygons, uvfaces):
    poly.use_smooth = True
    for loop, xy in zip(poly.loop_indices, coords): uv.data[loop].uv = xy

# UV-periodic pores, restrained coralline patches and carbonate grains.
# No external imagery. Smooth multi-frequency field keeps the seam continuous.
v, u = np.mgrid[0:SIZE,0:SIZE].astype(np.float32); u=(u+.5)/SIZE; v=(v+.5)/SIZE
p = 2*np.pi*v
field = (.5 + .22*np.sin(35*u + 2*np.cos(3*p))*np.cos(7*p+9*u)
         + .13*np.sin(91*u-5*np.sin(4*p))*np.cos(19*p+31*u)
         + .08*np.sin(237*u+13*np.cos(7*p))*np.cos(47*p+43*u))
pores = np.clip((field-.57)*4.2,0,1)**1.3
micro = np.sin(937*u + 3*np.cos(17*p))*np.cos(163*p+181*u)
patch = .5+.5*np.sin(19*u+2*np.sin(3*p))*np.cos(3*p+4*u)
coralline = np.clip((patch-.63)*3.4,0,.65)
base = np.empty((SIZE,SIZE,4),dtype=np.float32)
for c, carbonate, purple in ((0,.59,.47),(1,.56,.30),(2,.49,.42)):
    base[:,:,c] = (carbonate*(1-.52*pores)+.045*micro)*(1-coralline)+purple*coralline
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
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# Source provenance and limits stay with the packed native file.
rock['authoring_notes']='Original capped parametric porous limestone arch. Custom 1024px carbonate and 512px normal/roughness surface fields; not a baked high-poly modular library. No coral sockets or animated fish clearance claim.'
blend=out/'blend'/f'{ID}.blend'; blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=False)
override=out/'overrides'/f'{ID}.glb';override.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(override),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False,export_materials='EXPORT')
print('ARCH_SAVED_EXPORTED',blend,override,len(mesh.vertices),len(mesh.polygons))
