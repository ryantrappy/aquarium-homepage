import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { expect, it } from 'vitest'
import { mountedAnemoneHosts } from './anemone-host'
import { assembleCoralsOnRockSockets, DEFAULT_LEFT_ISLAND_MOUNTS, DEFAULT_RIGHT_ISLAND_MOUNTS, LIVE_ROCK_ISLAND_URLS, MODULAR_CORAL_ASSET_URLS } from './reef-assembly'
import { overviewHalfWidthAtDepth } from './camera-zoom'
import { reefPlacementsForViewport } from './reef-layout'
import { createReefMeshNavigation, MESH_NAVIGATION_MOVEMENT_BUDGET } from './reef-mesh-navigation'
import { createSwimmingFish, distance, stepSwimmingFish } from './motion'

// Static positions/transforms/roles from the same runtime URLs, without image decoding.
function staticGlb(url: string): THREE.Group {
  const u = new URL(url); u.search = ''
  const bytes = readFileSync(u), length = bytes.readUInt32LE(12)
  const doc = JSON.parse(bytes.toString('utf8', 20, 20 + length))
  const bin = bytes.subarray(28 + length)
  const read = (id: number) => {
    const a = doc.accessors[id], view = doc.bufferViews[a.bufferView]
    const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0)
    const count = a.count * (a.type === 'VEC3' ? 3 : a.type === 'VEC4' ? 4 : 1)
    if (view.byteStride) throw new Error('Unsupported interleaved fixture')
    const constructors = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array }
    const Type = constructors[a.componentType as keyof typeof constructors]
    if (!Type) throw new Error('Unsupported fixture component')
    return new Type(bin.buffer.slice(bin.byteOffset + start, bin.byteOffset + start + count * Type.BYTES_PER_ELEMENT))
  }
  const nodes: THREE.Object3D[] = doc.nodes.map((n: any) => {
    let object: THREE.Object3D = new THREE.Group()
    if (n.mesh !== undefined) {
      const primitives = doc.meshes[n.mesh].primitives
      const meshes = primitives.map((primitive:any)=>{
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(read(primitive.attributes.POSITION), 3))
        if (primitive.attributes.COLOR_0 !== undefined) { const a = doc.accessors[primitive.attributes.COLOR_0]; g.setAttribute('color', new THREE.BufferAttribute(read(primitive.attributes.COLOR_0), 4, a.normalized === true)) }
        if (primitive.indices !== undefined) g.setIndex(new THREE.BufferAttribute(read(primitive.indices), 1))
        g.computeVertexNormals()
        // Match GLTFLoader.computeBounds, including its accessor-box sphere.
        const accessor = doc.accessors[primitive.attributes.POSITION]
        g.boundingBox = new THREE.Box3(new THREE.Vector3().fromArray(accessor.min), new THREE.Vector3().fromArray(accessor.max))
        g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere())
        const material = new THREE.MeshStandardMaterial(); material.userData = doc.materials?.[primitive.material]?.extras ?? {}
        const mesh = new THREE.Mesh(g, material); mesh.name = n.name ?? ''; mesh.userData = n.extras ?? {}; return mesh
      })
      object = meshes.length === 1 ? meshes[0] : new THREE.Group().add(...meshes)
    }
    object.name = n.name ?? ''; object.userData = n.extras ?? {}
    if (n.translation) object.position.fromArray(n.translation)
    if (n.rotation) object.quaternion.fromArray(n.rotation)
    if (n.scale) object.scale.fromArray(n.scale)
    if (n.matrix) { object.matrix.fromArray(n.matrix); object.matrix.decompose(object.position, object.quaternion, object.scale) }
    return object
  })
  doc.nodes.forEach((n: any, i: number) => { for (const child of n.children ?? []) nodes[i].add(nodes[child]) })
  const root = new THREE.Group(); for (const i of doc.scenes[doc.scene ?? 0].nodes) root.add(nodes[i]); return root
}

it.each([[false,'left'],[true,'left'],[false,'right']] as const)('keeps actual mounted crown hosting safe in the current layout (narrow=%s, island=%s)', async (narrow,island) => {
  const placement = reefPlacementsForViewport(narrow).find(p=>p.islandKind===island)!
  const reef = staticGlb(LIVE_ROCK_ISLAND_URLS[island])
  const templates = new Map(Object.entries(MODULAR_CORAL_ASSET_URLS).map(([id, url])=>[id, staticGlb(url)]))
  const assembly = assembleCoralsOnRockSockets(reef, templates, island==='left'?DEFAULT_LEFT_ISLAND_MOUNTS:DEFAULT_RIGHT_ISLAND_MOUNTS, { foundationHeightScale: placement.foundationHeightScale, includeScatter: true })
  reef.position.set(placement.position.x, placement.position.y, placement.position.z)
  reef.scale.setScalar(placement.uniformScale); reef.rotation.y = placement.yaw
  const hosts = mountedAnemoneHosts(assembly.mountedCorals, 'reef-0')
  expect(hosts).toHaveLength(1)
  const host = hosts[0]
  const crown = assembly.mountedCorals.find(c=>c.coralAssetId==='coral-anemone-bta')!.root.getObjectByName('Anemone_Tentacle_Crown')!
  expect(new THREE.Box3().setFromObject(crown).containsPoint(new THREE.Vector3(host.position.x, host.position.y, host.position.z))).toBe(true)
  const nav = await createReefMeshNavigation([{ reef, islandId: 'reef-0', mountedCorals: assembly.mountedCorals }])
  expect(nav.status, JSON.stringify(nav)).toBe('ready'); if (nav.status !== 'ready') return
  const config = nav.meshNavigation, resident = config.queryCapsuleForSpecies?.['ocellaris-clownfish']!
  expect(resident).toBeTypeOf('function')
  expect(config.queryCapsule!(host.position, host.position, .04, { ...MESH_NAVIGATION_MOVEMENT_BUDGET }).status).toBe('blocked')
  expect(resident(host.position, host.position, .04, { ...MESH_NAVIGATION_MOVEMENT_BUDGET }).status).toBe('clear')
  const aspect = narrow ? 402 / 874 : 1440 / 900, halfWidth = overviewHalfWidthAtDepth(aspect, -1.35)
  const bounds = { min: { x: -halfWidth, y: -2.25, z: -4.6 }, max: { x: halfWidth, y: 2.8, z: 2.8 } }
  const habitat = { bounds, maxAbsXAtDepth: (z:number)=>Math.min(halfWidth, overviewHalfWidthAtDepth(aspect,z)), obstacles: [], anchors: hosts, meshNavigation: config }
  const fish = createSwimmingFish('example-home-assistant', 'ocellaris-clownfish', { x: 0, y: 1.7, z: 1.8 }, .5, undefined, { collisionRadiusM: .04 })
  let path = 0, stationaryFrames = 0, longestStationaryFrames = 0; const samples: {x:number;y:number;z:number}[] = []
  for (let frame = 0; frame < 1800; frame++) {
    const before = { ...fish.position }; stepSwimmingFish(fish, habitat, 1 / 30)
    expect(resident(before, fish.position, .04, { ...MESH_NAVIGATION_MOVEMENT_BUDGET }).status).toBe('clear')
    expect(Object.values(fish.position).every(Number.isFinite)).toBe(true)
    if (frame > 900) { expect(distance(fish.position, host.position)).toBeLessThan(.8); samples.push({...fish.position}) }
    const travel = distance(before, fish.position)
    if (frame > 900) { stationaryFrames = travel < 1e-8 ? stationaryFrames + 1 : 0; longestStationaryFrames = Math.max(longestStationaryFrames, stationaryFrames) }
    path += travel
  }
  expect(path).toBeGreaterThan(.3)
  // The authored loop must not lose an entire cycle to a blocked target.
  expect(longestStationaryFrames / 30).toBeLessThan(8)
  expect(Math.max(...samples.map(p=>p.y))-Math.min(...samples.map(p=>p.y)), JSON.stringify({host,final:fish.position,state:fish.behavior.state,target:fish.behavior.targetAnchor,route:fish.route,wait:fish.targetWait})).toBeGreaterThan(.015)
  const paused = { ...fish.position }; stepSwimmingFish(fish, habitat, 10, true); expect(fish.position).toEqual(paused)
}, 15000)

it('does not invent a host for missing or malformed crown geometry', () => {
  expect(mountedAnemoneHosts([], 'reef')).toEqual([])
  expect(()=>mountedAnemoneHosts([{socketName:'socket_anemone_crevice_01',coralAssetId:'coral-anemone-bta',root:new THREE.Group(),materialControllers:[]}], 'reef')).toThrow(/unavailable/)
})

it('keeps the phone host available after sharing templates with both laptop reefs', async () => {
  const templates = new Map(Object.entries(MODULAR_CORAL_ASSET_URLS).map(([id,url])=>[id,staticGlb(url)]))
  const bases = {left:staticGlb(LIVE_ROCK_ISLAND_URLS.left),right:staticGlb(LIVE_ROCK_ISLAND_URLS.right)}
  for(const narrow of [false,true]){
    const hosts: ReturnType<typeof mountedAnemoneHosts> = []
    const islands = reefPlacementsForViewport(narrow).map((placement,index)=>{
      const reef=bases[placement.islandKind].clone(true)
      const assembly=assembleCoralsOnRockSockets(reef,templates,placement.islandKind==='left'?DEFAULT_LEFT_ISLAND_MOUNTS:DEFAULT_RIGHT_ISLAND_MOUNTS,{foundationHeightScale:placement.foundationHeightScale,includeScatter:true})
      reef.position.set(placement.position.x,placement.position.y,placement.position.z);reef.scale.setScalar(placement.uniformScale);reef.rotation.y=placement.yaw
      assembly.update(20)
      hosts.push(...mountedAnemoneHosts(assembly.mountedCorals,`reef-${index}`))
      return {reef,islandId:`reef-${index}`,mountedCorals:assembly.mountedCorals}
    })
    const navigation=await createReefMeshNavigation(islands)
    expect(navigation.status).toBe('ready');if(navigation.status!=='ready')return
    const query=navigation.meshNavigation.queryCapsuleForSpecies!['ocellaris-clownfish']
    for(const host of hosts)expect(query(host.position,host.position,.04,{...MESH_NAVIGATION_MOVEMENT_BUDGET}),JSON.stringify({narrow,host})).toMatchObject({status:'clear'})
  }
},15000)
