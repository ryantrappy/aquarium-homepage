from pathlib import Path
import struct,json,hashlib,math,collections
root=Path('/tmp/aq-asset-review-20261104'); assets=root/'src/rendering/assets/corals'
def decode(path):
 b=path.read_bytes();j=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]]); off=20+struct.unpack_from('<I',b,12)[0]; bin=b[off+8:]
 def accessor(i):
  a=j['accessors'][i];v=j['bufferViews'][a['bufferView']]; fmt,size={5121:('B',1),5123:('H',2),5125:('I',4),5126:('f',4)}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]; step=v.get('byteStride',n*size); start=v.get('byteOffset',0)+a.get('byteOffset',0)
  rows=[struct.unpack_from('<'+fmt*n,bin,start+r*step) for r in range(a['count'])]
  if a.get('normalized'): rows=[tuple(x/{5121:255,5123:65535}[a['componentType']] for x in row) for row in rows]
  return rows
 return b,j,accessor
reports=[]
for path in sorted(assets.glob('*.glb')):
 b,j,acc=decode(path); record=json.loads(path.with_name(path.stem+'-inspection.json').read_text());sha=hashlib.sha256(b).hexdigest();prims=[]; transforms=[]
 for node in j['nodes']:
  if 'mesh' not in node:continue
  transforms.append({k:node[k] for k in ['name','translation','rotation','scale','matrix'] if k in node})
  assert node.get('translation',[0,0,0])==[0,0,0] and node.get('rotation',[0,0,0,1])==[0,0,0,1] and node.get('scale',[1,1,1])==[1,1,1] and 'matrix' not in node
  for p in j['meshes'][node['mesh']]['primitives']:
   pos=acc(p['attributes']['POSITION']); role=node['extras']['reefPrimitive']['role']; primid=node['extras']['reefPrimitive']['id']; rec=next(x for x in record['primitives'] if x['id']==primid)
   item={'id':primid,'role':role,'vertexCount':len(pos),'triangleCount':len(acc(p['indices']))//3,'measuredBoundsM':{'min':[min(x[i] for x in pos) for i in range(3)],'max':[max(x[i] for x in pos) for i in range(3)]}}
   if 'COLOR_0' in p['attributes']:
    colors=acc(p['attributes']['COLOR_0']); flat=[v for row in colors for v in row]; r=[x[0] for x in colors]; saved=rec['color0']['values'];a=j['accessors'][p['attributes']['COLOR_0']]
    item['mask']={'accessorComponentType':a['componentType'],'normalized':a.get('normalized',False),'positionCount':len(pos),'maskCount':len(colors),'allFiniteInRange':all(math.isfinite(x) and 0<=x<=1 for x in flat),'ranges':[[min(c[i] for c in colors),max(c[i] for c in colors)] for i in range(4)],'redDistinctValues':[x for x in sorted(set(r))][:30],'redZeroVertexCount':r.count(0),'maxInspectionValueDifference':max(abs(a-b) for a,b in zip(flat,saved)),'inspectionCountMatches':len(flat)==len(saved),'minimumYVertices':{'count':sum(abs(p[1]-min(q[1] for q in pos))<1e-6 for p in pos),'nonzeroFlexCount':sum(abs(p[1]-min(q[1] for q in pos))<1e-6 and c[0]!=0 for p,c in zip(pos,colors))}}
    assert len(pos)==len(colors) and item['mask']['allFiniteInRange'] and len(flat)==len(saved)
    if role=='coral-rigid': assert all(x==0 for x in r)
   elif role=='rock':
    mat=j['materials'][p['material']];item['materialHasOcclusionTexture']='occlusionTexture' in mat
    boxes=record.get('collisionParts',[])
    covered=lambda v:any(all(box['boundsM']['min'][i]-1e-6<=v[i]<=box['boundsM']['max'][i]+1e-6 for i in range(3)) for box in boxes)
    uncovered=[v for v in pos if not covered(v)]
    item['collisionProxyVertexCoverage']={'proxyCount':len(boxes),'uncoveredVertexCount':len(uncovered),'uncoveredExamples':uncovered[:5]}
   prims.append(item)
 provenance=record['extras']['reefAsset']['provenance'];sourcehash=provenance['sourceSha256']; recipe=provenance['recipe']; gen=recipe.split('--python ')[1].split(' -- ')[0];gensha=hashlib.sha256((root/gen).read_bytes()).hexdigest()
 reports.append({'assetId':path.stem,'sha256':sha,'byteLength':len(b),'rootTransforms':transforms,'sourceGeneratorHashMatches':gensha==sourcehash,'sourceGeneratorSha256':gensha,'primitives':prims})
(root/'independent-asset-report.json').write_text(json.dumps(reports,indent=2)+'\n')
for r in reports:
 print(r['assetId'],r['sha256'][:12], 'sourcehash',r['sourceGeneratorHashMatches'])
 for p in r['primitives']:
  print(' ',p['id'], p.get('mask',p.get('collisionProxyVertexCoverage')))
