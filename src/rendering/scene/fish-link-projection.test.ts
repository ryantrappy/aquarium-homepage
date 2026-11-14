import { Bone, BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, InterleavedBuffer, InterleavedBufferAttribute, Mesh, MeshBasicMaterial, PerspectiveCamera, Skeleton, SkinnedMesh, Uint8BufferAttribute, Uint16BufferAttribute, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { projectFishBodyBounds, projectFishLinkBounds } from './fish-link-projection'

function fixture() {
  const camera = new PerspectiveCamera(42, 1440 / 900, .1, 60)
  camera.position.set(0, .15, 9); camera.lookAt(0, .15, 0); camera.updateMatrixWorld(true)
  const scratch = new Vector3()
  return { camera, project: (position: Vector3, width = 1440, height = 900) => projectFishLinkBounds(position, camera, width, height, 1, scratch) }
}

describe('fish link camera projection', () => {
  it('tracks every consecutive moving pose with positive bounds at both target viewports', () => {
    for (const [width, height] of [[1440, 900], [402, 874]]) {
      const { camera, project } = fixture()
      camera.aspect = width / height; camera.updateProjectionMatrix()
      let previousX = -Infinity
      for (let frame = 0; frame < 60; frame++) {
        const bounds = project(new Vector3(-.5 + frame / 60, 0, 0), width, height)!
        expect(bounds.x).toBeGreaterThan(previousX)
        expect(bounds.width).toBeGreaterThanOrEqual(44)
        expect(bounds.height).toBeGreaterThanOrEqual(44)
        expect(Object.values(bounds).every(Number.isFinite)).toBe(true)
        previousX = bounds.x
      }
    }
  })
  it('rejects points on/behind the camera, inside the near plane and beyond the far plane', () => {
    const { project } = fixture()
    for (const z of [9, 9.1, 20, 8.95, -52]) expect(project(new Vector3(0, 0, z))).toBeUndefined()
    expect(project(new Vector3(0, 0, 8.8))).toBeDefined()
  })
  it('rejects nonfinite projections instead of writing invalid CSS', () => {
    const { project } = fixture()
    for (const position of [new Vector3(NaN, 0, 0), new Vector3(0, Infinity, 0), new Vector3(0, 0, -Infinity)]) expect(project(position)).toBeUndefined()
  })
  it('uses camera-space depth when the camera direction changes', () => {
    const { camera, project } = fixture()
    camera.position.set(9, 0, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true)
    expect(project(new Vector3(0, 0, 0))).toBeDefined()
    expect(project(new Vector3(10, 0, 0))).toBeUndefined()
  })
})

describe('rendered fish body projection is separate from the native link target (AQ-89)', () => {
  it.each([[1440, 900], [402, 874]])('follows turned, nested geometry rather than its padded target at %ix%i', (width, height) => {
    const { camera } = fixture(); camera.aspect = width / height; camera.updateProjectionMatrix()
    const root = new Group(), mesh = new Mesh(new BoxGeometry(2, .4, .2), new MeshBasicMaterial())
    root.add(mesh); root.position.set(.7, .15, 0); mesh.scale.setScalar(.5); root.updateMatrixWorld(true)
    const first = projectFishBodyBounds(root, camera, width, height, new Vector3())!
    const target = projectFishLinkBounds(root.position, camera, width, height, 1, new Vector3())!
    expect(first.height).toBeLessThan(target.height)
    // Rotate the same visible body end-on. Its exact vertex projection narrows
    // while the minimum-size native service target is unchanged.
    root.rotation.y = Math.PI / 2; root.updateMatrixWorld(true)
    const turned = projectFishBodyBounds(root, camera, width, height, new Vector3())!
    expect(turned.width).toBeLessThan(first.width / 3)
    expect(projectFishLinkBounds(root.position, camera, width, height, 1, new Vector3())).toEqual(target)
  })

  it('uses the current bone pose and post-skinning deformation despite cached rest bounds', () => {
    const { camera } = fixture(), g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
    g.setAttribute('skinIndex', new Uint16BufferAttribute(new Array(12).fill(0), 4))
    g.setAttribute('skinWeight', new Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0], 4))
    const mesh = new SkinnedMesh(g, new MeshBasicMaterial()), bone = new Bone()
    mesh.add(bone); mesh.bind(new Skeleton([bone])); mesh.computeBoundingBox()
    const root = new Group().add(mesh); root.updateMatrixWorld(true)
    const before = projectFishBodyBounds(root, camera, 1440, 900, new Vector3())!
    bone.position.x = 2; root.updateMatrixWorld(true)
    const after = projectFishBodyBounds(root, camera, 1440, 900, new Vector3(), owner => owner === mesh ? vertex => { vertex.y -= .25 } : undefined)!
    const pixelsPerUnit = 900 / (2 * Math.tan(21 * Math.PI / 180) * 9)
    expect(after.x - before.x).toBeCloseTo(2 * pixelsPerUnit, 7)
    expect(after.y - before.y).toBeCloseTo(.25 * pixelsPerUnit, 7)
    expect(mesh.boundingBox!.min.x).toBe(0) // Cached rest bounds were not used.
  })

  it('ignores invisible parts and fails closed for invalid or depth-clipped geometry', () => {
    const { camera } = fixture(), root = new Group()
    const visible = new Mesh(new BoxGeometry(.5, .5, .5), new MeshBasicMaterial())
    const hidden = new Mesh(new BoxGeometry(100, 100, 100), new MeshBasicMaterial()); hidden.visible = false
    root.add(visible, hidden); root.updateMatrixWorld(true)
    expect(projectFishBodyBounds(root, camera, 1440, 900, new Vector3())!.width).toBeLessThan(100)
    visible.position.z = 8.9; root.updateMatrixWorld(true)
    expect(projectFishBodyBounds(root, camera, 1440, 900, new Vector3())).toEqual({x:0,y:0,width:1440,height:900})
    visible.position.x = NaN; root.updateMatrixWorld(true)
    expect(projectFishBodyBounds(root, camera, 1440, 900, new Vector3())).toBeUndefined()
  })

  it('respects material groups, indexed draw ranges and camera layers', () => {
    const {camera}=fixture(), geometry=new BufferGeometry()
    geometry.setAttribute('position',new Float32BufferAttribute([0,0,0,1,0,0,0,1,0,100,0,0,101,0,0,100,1,0],3))
    geometry.setIndex([0,1,2,3,4,5]);geometry.addGroup(0,3,0);geometry.addGroup(3,3,1)
    const active=new MeshBasicMaterial({opacity:0}), hidden=new MeshBasicMaterial();hidden.visible=false
    const mesh=new Mesh(geometry,[active,hidden]);mesh.updateMatrixWorld(true)
    const visible=projectFishBodyBounds(mesh,camera,1440,900,new Vector3())!
    expect(visible.width).toBeLessThan(200) // Opaque material still draws with opacity0.
    hidden.visible=true
    expect(projectFishBodyBounds(mesh,camera,1440,900,new Vector3())!.width).toBeGreaterThan(1000)
    geometry.setDrawRange(0,3)
    expect(projectFishBodyBounds(mesh,camera,1440,900,new Vector3())).toEqual(visible)
    mesh.layers.set(1)
    expect(projectFishBodyBounds(mesh,camera,1440,900,new Vector3())).toBeUndefined()
  })

  it('matches Three current-pose skinning with morphs, blended bones and nonidentity bind/ancestor transforms', () => {
    const {camera}=fixture(), geometry=new BufferGeometry()
    geometry.setAttribute('position',new Float32BufferAttribute([-.4,.2,.1,.6,-.3,-.2,.1,.7,.4],3))
    geometry.setAttribute('skinIndex',new Uint16BufferAttribute([0,1,0,0,0,1,0,0,0,1,0,0],4))
    geometry.setAttribute('skinWeight',new Float32BufferAttribute([.4,.6,0,0,.2,.8,0,0,.7,.3,0,0],4))
    geometry.morphTargetsRelative=true
    geometry.morphAttributes.position=[new Float32BufferAttribute([.2,.1,0,-.1,.05,.02,.1,-.2,.03],3)]
    const mesh=new SkinnedMesh(geometry,new MeshBasicMaterial()), first=new Bone(), second=new Bone()
    first.add(second);second.position.y=.3;mesh.add(first)
    const root=new Group().add(mesh);root.position.set(.2,-.1,0);root.scale.set(1.2,.8,1.1)
    mesh.position.set(.1,.2,0);mesh.scale.set(.7,1.3,.9);root.updateMatrixWorld(true)
    mesh.bind(new Skeleton([first,second]));mesh.morphTargetInfluences![0]=.4
    for(let frame=0;frame<20;frame++){
      first.rotation.z=frame*.013;second.rotation.x=-frame*.017;second.position.x=frame*.003
      root.rotation.y=frame*.021;root.updateMatrixWorld(true)
      const points=Array.from({length:3},(_,i)=>{
        const point=mesh.getVertexPosition(i,new Vector3());point.y-=.025
        return point.applyMatrix4(mesh.matrixWorld).project(camera)
      })
      const xs=points.map(p=>(p.x+1)*720),ys=points.map(p=>(1-p.y)*450)
      const bounds=projectFishBodyBounds(root,camera,1440,900,new Vector3(),()=>vertex=>{vertex.y-=.025})!
      expect(bounds.x).toBeCloseTo(Math.min(...xs)-1,5)
      expect(bounds.y).toBeCloseTo(Math.min(...ys)-1,5)
      expect(bounds.width).toBeCloseTo(Math.max(...xs)-Math.min(...xs)+2,5)
      expect(bounds.height).toBeCloseTo(Math.max(...ys)-Math.min(...ys)+2,5)
    }
  })

  it('retains accessor handling for interleaved positions and normalized skin weights', () => {
    const {camera}=fixture(), geometry=new BufferGeometry()
    geometry.setAttribute('position',new InterleavedBufferAttribute(new InterleavedBuffer(new Float32Array([99,0,0,0,99,1,0,0,99,0,1,0]),4),3,1))
    geometry.setAttribute('skinIndex',new Uint16BufferAttribute(new Array(12).fill(0),4))
    geometry.setAttribute('skinWeight',new Uint8BufferAttribute([255,0,0,0,255,0,0,0,255,0,0,0],4,true))
    const bone=new Bone(),mesh=new SkinnedMesh(geometry,new MeshBasicMaterial())
    mesh.add(bone);mesh.bind(new Skeleton([bone]));bone.position.y=.5;mesh.updateMatrixWorld(true)
    const actual=projectFishBodyBounds(mesh,camera,1440,900,new Vector3())!
    const top=mesh.getVertexPosition(2,new Vector3()).applyMatrix4(mesh.matrixWorld).project(camera)
    expect(actual.y).toBeCloseTo((1-top.y)*450-1,7)
    expect(actual.width).toBeLessThan(200) // Padding99 is not a position value.
  })
})
