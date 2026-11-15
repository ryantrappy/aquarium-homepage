import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const glbPath = process.argv[2]
const sourcePath = process.argv[3]
const fishWidthPx = Number(process.argv[4] || 350)
const glb = fs.readFileSync(glbPath)
let offset = 12, json, binary
while (offset < glb.length) {
  const length = glb.readUInt32LE(offset), type = glb.readUInt32LE(offset + 4); offset += 8
  const chunk = glb.subarray(offset, offset + length); offset += length
  if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'))
  else if (type === 0x004e4942) binary = chunk
}
const readAccessor = (index) => {
  const a = json.accessors[index], bv = json.bufferViews[a.bufferView]
  const compBytes = a.componentType === 5126 ? 4 : a.componentType === 5123 ? 2 : 1
  const n = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 })[a.type]
  const stride = bv.byteStride || compBytes * n
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0)
  const values = new Array(a.count * n)
  for (let i = 0; i < a.count; i++) for (let j = 0; j < n; j++) {
    const at = base + i * stride + j * compBytes
    values[i*n+j] = compBytes === 4 ? binary.readFloatLE(at) : compBytes === 2 ? binary.readUInt16LE(at) : binary[at]
  }
  return { values, count: a.count, components: n, componentType: a.componentType }
}
const mesh = json.meshes[0].primitives[0]
const pos = readAccessor(mesh.attributes.POSITION), uv = readAccessor(mesh.attributes.TEXCOORD_0), idx = readAccessor(mesh.indices)
const verts = pos.count
const xs = [], yzKey = (i) => `${pos.values[3*i+1].toFixed(8)},${pos.values[3*i+2].toFixed(8)}`
for(let i=0;i<verts;i++) if (Math.abs(pos.values[3*i]) <= 1e-7) xs.push(i)
const boundary = new Set(xs)
const edgeMap = new Map()
for(let i=0;i<idx.values.length;i+=3){
 const t=[idx.values[i],idx.values[i+1],idx.values[i+2]]
 for(const [a,b] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]) if(boundary.has(a)&&boundary.has(b)){
  const k=a<b?`${a},${b}`:`${b},${a}`; edgeMap.set(k,{vertices:[a,b],count:(edgeMap.get(k)?.count||0)+1})
 }
}
const edges=[...edgeMap.values()].filter(({vertices:[a,b]})=>Math.hypot(pos.values[3*a+1]-pos.values[3*b+1],pos.values[3*a+2]-pos.values[3*b+2])>1e-9); console.log('edge incidence counts',Object.fromEntries([1,2,3,4].map(n=>[n,edges.filter(e=>e.count===n).length])))
const outlineEdges=edges.filter(e=>e.count===2).map(e=>e.vertices); const lengths=outlineEdges.map(([a,b])=>Math.hypot(pos.values[3*a+1]-pos.values[3*b+1],pos.values[3*a+2]-pos.values[3*b+2])*fishWidthPx/2)
lengths.sort((a,b)=>a-b)
const q=(a,p)=>a[Math.min(a.length-1,Math.floor((a.length-1)*p))]

const pam=execFileSync('dwebp',[sourcePath,'-pam','-o','-'],{maxBuffer:8*1024*1024})
const end=pam.indexOf(Buffer.from('ENDHDR\n'))+7
const header=pam.subarray(0,end).toString('ascii')
const W=Number(header.match(/WIDTH\s+(\d+)/)[1]), H=Number(header.match(/HEIGHT\s+(\d+)/)[1]), rgba=pam.subarray(end)
const inside=new Uint8Array(W*H), outside=new Uint8Array(W*H)
let xmin=W,xmax=0,ymin=H,ymax=0
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(rgba[i*4+3]>=80){inside[i]=1;xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y)}else outside[i]=1}
function dist(mask){const INF=1e9,d=new Float32Array(W*H);for(let i=0;i<d.length;i++)d[i]=mask[i]?INF:0;const w2=Math.SQRT2
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;let z=d[i];if(z===0)continue;if(x>0)z=Math.min(z,d[i-1]+1);if(y>0){z=Math.min(z,d[i-W]+1);if(x>0)z=Math.min(z,d[i-W-1]+w2);if(x+1<W)z=Math.min(z,d[i-W+1]+w2)}d[i]=z}
 for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){const i=y*W+x;let z=d[i];if(z===0)continue;if(x+1<W)z=Math.min(z,d[i+1]+1);if(y+1<H){z=Math.min(z,d[i+W]+1);if(x+1<W)z=Math.min(z,d[i+W+1]+w2);if(x>0)z=Math.min(z,d[i+W-1]+w2)}d[i]=z}return d}
const di=dist(inside),doo=dist(outside),sdf=new Float32Array(W*H);for(let i=0;i<sdf.length;i++)sdf[i]=inside[i]?di[i]:-doo[i]
function clamp(v,l,h){return Math.max(l,Math.min(h,v))}
for(let p=0;p<3;p++){const next=new Float32Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){let sum=0,ws=0;for(let dy=-2;dy<=2;dy++){const ny=clamp(y+dy,0,H-1),wy=dy===0?6:Math.abs(dy)===1?4:1;for(let dx=-2;dx<=2;dx++){const nx=clamp(x+dx,0,W-1),wx=dx===0?6:Math.abs(dx)===1?4:1;const w=wx*wy;sum+=sdf[ny*W+nx]*w;ws+=w}}next[y*W+x]=sum/ws}sdf.set(next)}
function sample(u,v){const fx=clamp(u*(W-1),0,W-1),fy=clamp(v*(H-1),0,H-1),x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(W-1,x0+1),y1=Math.min(H-1,y0+1),tx=fx-x0,ty=fy-y0;return (sdf[y0*W+x0]*(1-tx)+sdf[y0*W+x1]*tx)*(1-ty)+(sdf[y1*W+x0]*(1-tx)+sdf[y1*W+x1]*tx)*ty}
let maxVertexResidual=0
for(const i of xs) maxVertexResidual=Math.max(maxVertexResidual,Math.abs(sample(uv.values[2*i],uv.values[2*i+1])))
const edgeSdf=[]
for(const [a,b] of outlineEdges){for(const t of [.25,.5,.75]){const u=uv.values[2*a]*(1-t)+uv.values[2*b]*t,v=uv.values[2*a+1]*(1-t)+uv.values[2*b+1]*t;edgeSdf.push(sample(u,v))}}
const absEdge=edgeSdf.map(Math.abs).sort((a,b)=>a-b)
console.log(JSON.stringify({
 glb:glbPath,source:sourcePath,fishWidthPx:fishWidthPx,
 sourceDimensions:[W,H],sourceAlphaBounds:[xmin,ymin,xmax,ymax],
 meshVertexCount:verts,indexCount:idx.values.length,boundaryPlanarVertexCount:xs.length,boundaryEdgeCount:outlineEdges.length,
 edgeProjectedPx:{p50:q(lengths,.5),p90:q(lengths,.9),p95:q(lengths,.95),max:lengths.at(-1)},
 smoothedSdfAtExportedContourVerticesSourcePixels:{maxAbs:maxVertexResidual},
 smoothedSdfAlongExportedStraightEdgesSourcePixels:{p50Abs:q(absEdge,.5),p90Abs:q(absEdge,.9),p95Abs:q(absEdge,.95),maxAbs:absEdge.at(-1),sampleCount:absEdge.length},
 smoothedSdfAlongEdgesProjectedPixels:{p95Abs:q(absEdge,.95)*fishWidthPx/W,maxAbs:absEdge.at(-1)*fishWidthPx/W},
 hashGlb:await import('node:crypto').then(({createHash})=>createHash('sha256').update(glb).digest('hex'))
},null,2))
