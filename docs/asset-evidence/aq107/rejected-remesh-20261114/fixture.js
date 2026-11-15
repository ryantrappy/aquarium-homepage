import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const specs = [
  { id:'base', label:'Immutable base', extent:2, physicalLength:.48, hash:'c53ea07f3e6f96d254546cbb54f418106b268dcc00ea96c2aed14796e1b855de' },
  { id:'refined', label:'Refined chromis', extent:2.0089690685272217, physicalLength:.48, hash:'e6eccd0c16ebdb3fcfb5e7d788f3bae5f57607cbd84954175fc4fa58a8190bef' },
  { id:'peer', label:'Peer · royal gramma', extent:2, physicalLength:.44, hash:'ffb095bfc7f3e836971b0ef70c203e7c2e1301af2133efbbd4609db7f2af4d06' },
]
const status = document.querySelector('#status')
const canvas = document.querySelector('#canvas')
const phaseInput = document.querySelector('#phase'), yawInput = document.querySelector('#yaw')
let running = false, phase = 0, yaw = 0, previous = 0
const renderers = [], info = {}
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('')
function lightScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#04152d')
  scene.add(new THREE.HemisphereLight('#3b78b8','#080614',.22))
  const key = new THREE.DirectionalLight('#eef6ff',2.1); key.position.set(1.2,6.8,4.6); scene.add(key)
  const fill = new THREE.DirectionalLight('#2e6be6',.95); fill.position.set(-3.6,4.2,2.8); scene.add(fill)
  const rim = new THREE.DirectionalLight('#4a8ce0',.28); rim.position.set(0,4.2,-3.5); scene.add(rim)
  return scene
}
function metrics(gltf) {
  const meshes = [], bones = new Set(); let triangles = 0, vertices = 0
  gltf.scene.traverse(o => {
    if (o.isSkinnedMesh || o.isMesh) {
      meshes.push(o); const g = o.geometry
      triangles += (g.index ? g.index.count : g.attributes.position.count)/3
      vertices += g.attributes.position.count
      if (o.isSkinnedMesh) o.skeleton.bones.forEach(b => bones.add(b))
    }
  })
  gltf.scene.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(gltf.scene), size = bounds.getSize(new THREE.Vector3())
  return { meshes:meshes.length, triangles, vertices, bones:bones.size, clips:gltf.animations.map(c=>`${c.name} (${c.duration.toFixed(3)}s)`), bounds:size.toArray().map(x=>x.toFixed(4)).join(' × '), material:[...new Set(meshes.flatMap(m=>(Array.isArray(m.material)?m.material:[m.material]).map(x=>x.type)))].join(', ') }
}
function showLabels() {
  for (const row of ['normal','close']) document.querySelector(`#${row}`).innerHTML = specs.map(s => {
    const m=info[s.id]
    return `<div class="label"><b>${s.label}</b> · ${row === 'normal'?'normal':'350 px close'}<small>loader ${m.ready?'ready':'FAILED'} · ${m.meshes} mesh · ${m.triangles.toLocaleString()} triangles · ${m.vertices.toLocaleString()} vertices · ${m.bones} bones<br>bounds XYZ ${m.bounds} · ${m.material}<br>clip ${m.clips.join('; ') || 'none'}<br>sha256 ${m.hash} ${m.hash===s.hash?'✓':'MISMATCH'}</small></div>`
  }).join('')
}
try {
  const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'})
  renderer.setPixelRatio(1); renderer.setSize(1440,900,false); renderer.outputColorSpace=THREE.SRGBColorSpace
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.80
  renderer.autoClear=false
  const loader = new GLTFLoader()
  for (const spec of specs) {
    const response = await fetch(`./assets/${spec.id}.glb`)
    if (!response.ok) throw Error(`${spec.id}: HTTP ${response.status}`)
    const bytes = await response.arrayBuffer(), hash = hex(await crypto.subtle.digest('SHA-256',bytes))
    if (hash!==spec.hash) throw Error(`${spec.id}: SHA-256 mismatch ${hash}`)
    for (let row=0;row<2;row++) {
      const gltf = await loader.parseAsync(bytes.slice(0), './assets/')
      if (row===0) info[spec.id]={...metrics(gltf), hash, ready:true}
      const scene=lightScene(), wrapper=new THREE.Group(); wrapper.add(gltf.scene); scene.add(wrapper)
      // The source fish's longitudinal axis is Z. The production camera looks
      // front-on; rotate the source into profile, identically in each panel.
      wrapper.rotation.y=Math.PI/2
      // Normal: production fishModelScale (target physical length / measured axis).
      // Close: normalize each model to a 2-unit extent for a 350px view.
      const modelScale=row===0?spec.physicalLength/spec.extent:2/spec.extent
      wrapper.scale.setScalar(modelScale)
      const width=row===0?480*.48/130:480*2/350, height=width*340/480
      const camera=new THREE.OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,60)
      camera.position.set(0,0,9); camera.lookAt(0,0,0)
      const mixer=new THREE.AnimationMixer(gltf.scene), clip=gltf.animations[0]
      if(clip) mixer.clipAction(clip).play()
      renderers.push({scene,camera,wrapper,mixer,clip,row,column:specs.indexOf(spec)})
    }
  }
  showLabels()
  status.textContent='Ready · 6/6 models · hashes verified'
  window.fixtureStatus = { ready:true, info, source:'GLTFLoader / embedded PBR / production-colored direct lights', differences:['PMREM','fish flex','caustics','fog','habitat','runtime motion solver'] }
  document.querySelector('#motion').addEventListener('click',e=>{ running=!running; previous=0; e.currentTarget.textContent=running?'Freeze motion':'Play motion' })
  phaseInput.addEventListener('input',()=>{ phase=Number(phaseInput.value)/1000 })
  yawInput.addEventListener('input',()=>{ yaw=Number(yawInput.value); document.querySelector('#yawValue').textContent=`${yaw}°` })
  function frame(now) {
    if(running&&previous) phase=(phase+(now-previous)/1000/2)%1
    previous=now; phaseInput.value=Math.round(phase*1000);document.querySelector('#phaseValue').textContent=phase.toFixed(3)
    renderer.setScissorTest(false);renderer.setClearColor('#04152d');renderer.clear()
    renderer.setScissorTest(true)
    for(const v of renderers) {
      const x=v.column*480, y=v.row===0?460:70
      renderer.setViewport(x,y,480,340);renderer.setScissor(x,y,480,340)
      v.wrapper.rotation.y=Math.PI/2+yaw*Math.PI/180
      if(v.clip) v.mixer.setTime(phase*v.clip.duration)
      renderer.render(v.scene,v.camera)
    }
    renderer.setScissorTest(false);requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
} catch(error) {
  status.className='error';status.textContent=`FAILED: ${error.message}`
  window.fixtureStatus={ready:false,error:String(error)}
  console.error(error)
}
