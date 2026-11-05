// AQ-58 read-only real-loader reset regression. Materials are bypassed; this is not an art or continuous-envelope certificate.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshBasicMaterial, SkinnedMesh } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { createFishClipPlayer } from '../src/rendering/scene/fish-animation.ts'
import { bindFishTurningRig, applyFishTurningRigOverlay } from '../src/rendering/scene/fish-turning.ts'
const repo=fileURLToPath(new URL('..',import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex')
const loader=new GLTFLoader().register(()=>({name:'AQ58_OFFLINE_SKIP_MATERIALS',loadMaterial:async()=>new MeshBasicMaterial()}))
const supplied=JSON.parse(await readFile(repo+'/src/rendering/assets/fish/manifest.json','utf8')).assets
const inputs=process.argv.slice(2)
if(inputs.some(a=>a!=='--include-unreviewed-splats'))throw Error('Usage: node scripts/verify-fish-clip-player.mjs [--include-unreviewed-splats]')
const includeSplats=inputs.includes('--include-unreviewed-splats')
const active=[
 ['ocellaris-clownfish','src/rendering/proof/candidate-real-clown.glb','study'],['yellow-tang','src/rendering/proof/candidate-real-tang.glb','study'],
 ...supplied.filter(a=>!['ocellaris-clownfish','yellow-tang'].includes(a.fishSpeciesId)).map(a=>[a.fishSpeciesId,a.path,'supplied']),
 ...(includeSplats?['blue-green-chromis','firefish','yellow-watchman-goby','tailspot-blenny','six-line-wrasse','mccoskers-flasher-wrasse','lyretail-anthias','flame-angelfish','copperband-butterflyfish'].map(id=>[id,'src/rendering/assets/splat-fish/'+id+'.glb','unreviewed-splat']):[])
]
const alternatives=supplied.filter(a=>['ocellaris-clownfish','yellow-tang'].includes(a.fishSpeciesId)).map(a=>[a.fishSpeciesId,a.path,'inactive-supplied-alternative'])
const packet={scope:'real GLTFLoader skeletal/clip/reset compatibility only; material decoding bypassed, no visual/envelope/metric acceptance',resetAdapterSha256:sha(await readFile(repo+'/src/rendering/scene/fish-animation.ts')),producerSha256:sha(await readFile(repo+'/src/rendering/scene/fish-turning.ts')),assets:[]}
function boneList(root){const s=new Set();root.traverse(n=>{if(n instanceof SkinnedMesh)n.skeleton.bones.forEach(b=>s.add(b))});return [...s]}
for(const [id,path,group] of [...active,...alternatives]){
 const bytes=await readFile(repo+'/'+path),gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')
 if(gltf.animations.length!==1)throw Error('not single clip '+id)
 const sourceTrackHash=sha(Buffer.from(JSON.stringify(gltf.animations.map(c=>c.tracks.map(t=>[t.name,[...t.times],[...t.values]])))))
 const model=clone(gltf.scene),reference=clone(gltf.scene),player=createFishClipPlayer(model,gltf.animations[0],.137),refPlayer=createFishClipPlayer(reference,gltf.animations[0],.137),rig=bindFishTurningRig(model,id),bones=boneList(model),refBones=boneList(reference)
 let maxCleanQuaternionError=0
 for(let frame=0;frame<120;frame++){
  player.advance(1/60);refPlayer.advance(1/60)
  bones.forEach((b,i)=>{const error=1-Math.min(1,Math.abs(b.quaternion.dot(refBones[i].quaternion)));maxCleanQuaternionError=Math.max(maxCleanQuaternionError,error);if(error>1e-12)throw Error('overlay accumulation '+id)})
  applyFishTurningRigOverlay(rig,{yawRateRadPerSec:2,smoothedYawRate:2,turnCurvature:.8,turnCurvatureDelayed:.5,turnPhase:frame*.21,maneuverStage:'exit-stroke',exitStrokeSeconds:.3,speed:.5,startleSeconds:.4},false)
  bones.forEach(b=>{if(Math.abs(b.quaternion.length()-1)>1e-12)throw Error('nonunit overlay '+id)})
 }
 const paused=bones.map(b=>b.quaternion.toArray());player.advance(0);if(JSON.stringify(paused)!==JSON.stringify(bones.map(b=>b.quaternion.toArray())))throw Error('pause modified overlay '+id)
 player.dispose();refPlayer.dispose()
 const currentTrackHash=sha(Buffer.from(JSON.stringify(gltf.animations.map(c=>c.tracks.map(t=>[t.name,[...t.times],[...t.values]])))))
 if(sourceTrackHash!==currentTrackHash)throw Error('shared source tracks changed '+id)
 packet.assets.push({id,path,group,sourceSha256:sha(bytes),skinBoneCount:bones.length,clip:gltf.animations[0].name,frames:120,maxCleanQuaternionError,pausePreservesOverlay:true,sourceTracksUnchanged:true})

}
console.log(JSON.stringify(packet,null,2))
