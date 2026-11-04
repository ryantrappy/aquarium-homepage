import * as BABYLON from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { assets, calibration, canvas, xPosition, yPosition, sample } from './shared'
export async function run() {
  const engine = new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true}), scene = new BABYLON.Scene(engine)
  scene.useRightHandedSystem = true; scene.clearColor = BABYLON.Color4.FromHexString('#183b48ff')
  const camera = new BABYLON.FreeCamera('camera',new BABYLON.Vector3(0,0,8),scene); camera.setTarget(BABYLON.Vector3.Zero()); camera.fov = 35*Math.PI/180
  const ambient = new BABYLON.HemisphericLight('ambient',new BABYLON.Vector3(0,1,0),scene); ambient.intensity = 1.4
  const light = new BABYLON.DirectionalLight('light',new BABYLON.Vector3(-1,-4,-6),scene); light.intensity = 1.5
  const roots: BABYLON.TransformNode[] = []
  for (const [i,url] of assets.entries()) {
    const loaded = await BABYLON.ImportMeshAsync(url,scene)
    const settings = calibration[i]; const model = loaded.meshes[0]; model.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, settings.yaw)
    const pivot = new BABYLON.TransformNode('pivot',scene); model.parent = pivot; model.position.set(-settings.center[0],-settings.center[1],-settings.center[2]); pivot.scaling.setAll(2/settings.width)
    const root = new BABYLON.TransformNode('fish',scene); pivot.parent=root; root.position.set(xPosition(i),yPosition(i),0); roots.push(root)
    loaded.animationGroups.forEach(a=>a.start(true))
  }
  const rock = BABYLON.MeshBuilder.CreateSphere('rock',{diameter:.8,segments:24},scene);rock.position.set(-.7,-.45,.7);rock.scaling.set(1.2,.65,.7)
  const mat = new BABYLON.StandardMaterial('rock material',scene);mat.diffuseColor=BABYLON.Color3.FromHexString('#7a6552');mat.specularColor=BABYLON.Color3.Black();rock.material=mat
  let elapsed=0
  engine.runRenderLoop(()=>{elapsed+=Math.min(.05,engine.getDeltaTime()/1000); roots.forEach((r,i)=>{r.rotation.y=.4*Math.sin(elapsed*.5+i);r.position.set(xPosition(i),yPosition(i),0)});scene.render();sample()})
  window.addEventListener('resize',()=>engine.resize())
}

