import bpy,json,hashlib,os
from pathlib import Path
p=Path(bpy.data.filepath)
r={'file':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'objects':[],'images':[],'collections':[]}
for o in bpy.data.objects:
 r['objects'].append({'name':o.name,'type':o.type,'mesh':o.data.name if o.type=='MESH' else None,'vertices':len(o.data.vertices) if o.type=='MESH' else None,'polygons':len(o.data.polygons) if o.type=='MESH' else None,'collections':[c.name for c in o.users_collection],'hiddenRender':o.hide_render,'scale':list(o.scale),'dimensions':list(o.dimensions),'materials':[s.material.name if s.material else None for s in o.material_slots]})
for i in bpy.data.images:r['images'].append({'name':i.name,'size':list(i.size),'source':i.source,'packed':bool(i.packed_file),'users':i.users})
for c in bpy.data.collections:r['collections'].append({'name':c.name,'objects':[o.name for o in c.objects]})
out=Path('/tmp/aq59-native-'+p.stem+'.json');out.write_text(json.dumps(r,indent=2)); print('NATIVE_REPORT',out,'objects',len(r['objects']),'images',r['images'])
