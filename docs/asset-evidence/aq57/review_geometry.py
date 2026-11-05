import bpy,bmesh,json,sys,hashlib,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
src,out=sys.argv[sys.argv.index('--')+1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
verts=[]; tris=[]; reports=[]
for obj in meshes:
 m=obj.data;m.calc_loop_triangles(); base=len(verts)
 verts.extend([obj.matrix_world@v.co for v in m.vertices]);tris.extend([tuple(base+i for i in t.vertices) for t in m.loop_triangles])
 bm=bmesh.new();bm.from_mesh(m); bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
 reports.append({'name':obj.name,'verticesBeforeWeld':len(m.vertices),'verticesAfterWeld':len(bm.verts),'triangles':len(m.loop_triangles),'boundaryEdges':sum(e.is_boundary for e in bm.edges),'nonmanifoldEdges':sum(not e.is_manifold for e in bm.edges),'eulerCharacteristic':len(bm.verts)-len(bm.edges)+len(bm.faces)})
 bm.free()
bvh=BVHTree.FromPolygons(verts,tris,all_triangles=True)
# Blender imports glTF +Y height as +Z and front +Z as -Y.
def hits(x,h):
 loc,normal,index,distance=bvh.ray_cast(Vector((x,-.6,h)),Vector((0,1,0)),1.2)
 return index is not None
rows=[]
for h in [.002,.04,.08,.12,.16,.175]:
 clear=[x/1000 for x in range(-200,201) if not hits(x/1000,h)]
 # contiguous interval surrounding x=0, ignore external background rays
 if hits(0,h): interval=None
 else:
  l=r=0
  while l>-200 and not hits((l-1)/1000,h):l-=1
  while r<200 and not hits((r+1)/1000,h):r+=1
  interval=[l/1000,r/1000]
 rows.append({'heightM':h,'clearWidthIntervalAt1mmResolutionM':interval})
path=[Vector((0,-.30+i*.005,.08)) for i in range(121)]
clearances=[bvh.find_nearest(v)[3] for v in path]
report={'source':src,'sourceSha256':hashlib.sha256(Path(src).read_bytes()).hexdigest(),'topologyAfterPositionWeldToleranceM':1e-7,'meshes':reports,'caveRows':rows,'axisPath':{'xM':0,'heightM':.08,'frontToBackM':[-.3,.3],'stepM':.005,'sampleCount':len(path),'rayBlocked':hits(0,.08),'minimumSurfaceDistanceAtSamplesM':min(clearances),'conservativeContinuousSurfaceClearanceM':min(clearances)-.0025,'note':'Distance-to-surface is 1-Lipschitz; subtract half the 5mm sampling step for this straight axis path. External sand is not included.'},'boundsBlender':{'min':[min(v[i] for v in verts) for i in range(3)],'max':[max(v[i] for v in verts) for i in range(3)]}}
Path(out).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
