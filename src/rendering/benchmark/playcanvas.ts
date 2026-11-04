import * as pc from 'playcanvas'
import { assets, calibration, canvas, xPosition, yPosition, sample } from './shared'
export async function run() {
  const app = new pc.Application(canvas,{mouse:new pc.Mouse(canvas),touch:new pc.TouchDevice(canvas),graphicsDeviceOptions:{antialias:true}})
  app.graphicsDevice.maxPixelRatio = 1; app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW); app.setCanvasResolution(pc.RESOLUTION_AUTO); app.scene.ambientLight = new pc.Color(.45,.48,.5); app.start()
  const camera = new pc.Entity('camera'); camera.addComponent('camera',{clearColor:new pc.Color(24/255,59/255,72/255),fov:35});camera.setPosition(0,0,8);camera.lookAt(0,0,0);app.root.addChild(camera)
  const light = new pc.Entity('light');light.addComponent('light',{type:'directional',color:new pc.Color(1,1,1),intensity:1.5});light.setEulerAngles(35,15,0);app.root.addChild(light)
  const roots: pc.Entity[] = []
  for (const [i,url] of assets.entries()) {
    const asset = await new Promise<pc.Asset>((resolve,reject)=>app.assets.loadFromUrl(url,'container',(err,a)=>err?reject(err):resolve(a!)))
    const container = asset.resource as pc.ContainerResource
    const settings = calibration[i]; const model = container.instantiateRenderEntity(); model.setLocalEulerAngles(0,settings.yaw*180/Math.PI,0); app.root.addChild(model)
    model.setLocalPosition(-settings.center[0],-settings.center[1],-settings.center[2])
    const pivot = new pc.Entity('pivot');app.root.addChild(pivot);pivot.addChild(model);pivot.setLocalScale(2/settings.width,2/settings.width,2/settings.width)
    const root = new pc.Entity('fish');app.root.addChild(root);root.addChild(pivot);root.setLocalPosition(xPosition(i),yPosition(i),0);roots.push(root)
    if (container.animations.length) { model.addComponent('anim',{activate:true}); const animation = model.anim; const track = container.animations[0].resource as pc.AnimTrack | undefined; if (animation && track) { animation.assignAnimation('swim',track); animation.baseLayer?.play('swim') } }
  }
  const rock=new pc.Entity('rock');rock.addComponent('render',{type:'sphere'});rock.setPosition(-.7,-.45,.7);rock.setLocalScale(.96,.52,.56);const mat=new pc.StandardMaterial();mat.diffuse=new pc.Color(122/255,101/255,82/255);mat.shininess=0;mat.update();rock.render!.meshInstances.forEach(instance=>{instance.material=mat});app.root.addChild(rock)
  let elapsed=0;app.on('update',(dt:number)=>{elapsed+=Math.min(.05,dt);roots.forEach((r,i)=>{r.setLocalEulerAngles(0, .4*Math.sin(elapsed*.5+i)*180/Math.PI,0);r.setLocalPosition(xPosition(i),yPosition(i),0)});sample()})
  window.addEventListener('resize',()=>app.resizeCanvas())
}
