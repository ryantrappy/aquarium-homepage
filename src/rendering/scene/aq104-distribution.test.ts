import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { BoxGeometry } from 'three'
import { createSwimmingFish, stepSwimmingSchool, type WaterHabitat } from './motion'
import { fishBodyRadiusM, fishClearanceRadius } from './fish-scale'
import { findSafeFishSpawn, findSafeFishHeading } from './fish-spawn'
import { overviewHalfWidthAtDepth } from './camera-zoom'
import { buildMeshCollider } from '../../simulation/mesh-collision'
import { createMeshClearanceQuery } from '../../simulation/mesh-habitat'
import { MESH_NAVIGATION_PLANNER_BUDGET, MESH_NAVIGATION_MOVEMENT_BUDGET } from './reef-mesh-navigation'
import { isWaterSegmentSafe } from '../../simulation/habitat-navigation'

it('sustains a moving mixed roster across all three sectors with unchanged collision checks', () => {
 const captured = JSON.parse(readFileSync(new URL('../../../docs/asset-evidence/aq104/mixed-roster-fixture.json', import.meta.url),'utf8')) as { inhabitants: Array<{id:string;speciesId:string;position:{x:number;y:number;z:number};heightRange:readonly [number,number]}> }
 const bounds={min:{x:-5.2,y:-2.25,z:-4.6},max:{x:5.2,y:2.8,z:2.8}}
 const obstacles=[
  {id:'left',bounds:{min:{x:-3.2,y:-2.25,z:-1.6},max:{x:-1.15,y:1.05,z:.8}}},
  {id:'right',bounds:{min:{x:1.05,y:-2.25,z:-1.5},max:{x:3.2,y:.85,z:.8}}},
 ]
 const colliders=obstacles.map(box=>{
  const {min,max}=box.bounds; const g=new BoxGeometry(max.x-min.x,max.y-min.y,max.z-min.z);g.translate((min.x+max.x)/2,(min.y+max.y)/2,(min.z+max.z)/2)
  const a=g.getAttribute('position'), idx=g.index!; const p=(i:number)=>({x:a.getX(i),y:a.getY(i),z:a.getZ(i)})
  const triangles=[];for(let i=0;i<idx.count;i+=3)triangles.push({a:p(idx.getX(i)),b:p(idx.getX(i+1)),c:p(idx.getX(i+2))})
  const r=buildMeshCollider({id:box.id,sourceSha256:'1'.repeat(64),units:'meter',upAxis:'+Y',coordinateSpace:'world',triangles});if(r.status!=='ready')throw Error(r.reason);g.dispose();return r.collider
 })
 const query=createMeshClearanceQuery(colliders)
 const cases=[]
 for(const mode of ['aabb','mesh','aabb','mesh'] as const){
  const habitat:WaterHabitat={bounds,maxAbsXAtDepth:z=>overviewHalfWidthAtDepth(1440/900,z),obstacles:mode==='aabb'?obstacles:[],anchors:[],...(mode==='mesh'?{meshNavigation:{units:'meter' as const,spacingM:.5,budget:{...MESH_NAVIGATION_PLANNER_BUDGET},movementBudget:{...MESH_NAVIGATION_MOVEMENT_BUDGET},queryCapsule:query}}:{})}
  const occupied:{position:{x:number;y:number;z:number};clearance:number;bodyRadiusM:number}[]=[]
  const fish=captured.inhabitants.map(row=>{
   const clearance=fishClearanceRadius(row.speciesId)
   const position=findSafeFishSpawn(row.position,bounds,habitat.obstacles,clearance,occupied,mode==='mesh'?(p=>query(p,p,.04,{...MESH_NAVIGATION_MOVEMENT_BUDGET}).status==='clear'):undefined,fishBodyRadiusM(row.speciesId),row.heightRange,habitat.maxAbsXAtDepth)
   if(!position)throw Error('No spawn '+row.id)
   const yaw=findSafeFishHeading(position,position.x<0?Math.PI/2:-Math.PI/2,bounds,habitat.obstacles,clearance,habitat.maxAbsXAtDepth)
   if(yaw===undefined)throw Error('No heading '+row.id)
   occupied.push({position,clearance,bodyRadiusM:fishBodyRadiusM(row.speciesId)})
   return createSwimmingFish(row.id,row.speciesId,position,clearance,undefined,{initialYaw:yaw,...(mode==='mesh'?{collisionRadiusM:.04}:{})})
  })
  const starts=fish.map(f=>({...f.position}));const traveled=fish.map(()=>0);let unsafe=0
  const rows=[]
  for(let frame=0;frame<=3600;frame++){
   if(frame%60===0){const sectors=[fish.filter(f=>f.position.x< -1.5).length,fish.filter(f=>Math.abs(f.position.x)<=1.5).length,fish.filter(f=>f.position.x>1.5).length];rows.push({second:frame/60,sectors,meanAbsX:fish.reduce((s,f)=>s+Math.abs(f.position.x),0)/fish.length,positions:fish.map(f=>({...f.position}))})}
   if(frame===3600)break
   const previous=fish.map(f=>({...f.position}));stepSwimmingSchool(fish,habitat,1/60)
   for(let i=0;i<fish.length;i++){
    const f=fish[i];if(mode==='mesh' && query(previous[i],f.position,.04,{...MESH_NAVIGATION_MOVEMENT_BUDGET}).status!=='clear')unsafe++;traveled[i]+=Math.hypot(f.position.x-previous[i].x,f.position.y-previous[i].y,f.position.z-previous[i].z);if(!isWaterSegmentSafe({start:previous[i],target:f.position,waterBounds:bounds,obstacles:habitat.obstacles,fishClearanceRadius:mode==='mesh'?.04:f.clearance,maxAbsXAtDepth:habitat.maxAbsXAtDepth,lateralClearanceRadius:f.clearance}))unsafe++
   }
  }
  const settled=rows.filter(r=>r.second>=10), complete=settled.filter(r=>r.sectors.every(n=>n>0)).length/settled.length
  const shares=[0,1,2].map(i=>settled.reduce((s,r)=>s+r.sectors[i],0)/(settled.length*fish.length))
  let gap=0,longestGap=0;for(const r of settled){gap=r.sectors[0]===0||r.sectors[2]===0?gap+1:0;longestGap=Math.max(longestGap,gap)}
  const moved=fish.map((f,i)=>({id:f.id,species:f.speciesId,pathLength:traveled[i],distance:Math.hypot(f.position.x-starts[i].x,f.position.y-starts[i].y,f.position.z-starts[i].z)}))
  cases.push({mode,complete,shares,longestGap,unsafe,moved,rows})
 }
 for (const result of cases) {
  expect(result.unsafe).toBe(0)
  expect(result.complete).toBeGreaterThanOrEqual(.8)
  expect(result.shares[0]).toBeGreaterThanOrEqual(.2)
  expect(result.shares[1]).toBeGreaterThanOrEqual(.1)
  expect(result.shares[2]).toBeGreaterThanOrEqual(.2)
  expect(result.longestGap).toBeLessThanOrEqual(3)
  // Reject stationary staging masquerading as successful distribution.
  expect(Math.min(...result.moved.map(fish => fish.pathLength))).toBeGreaterThan(.1)
  expect(result.rows.every(row => row.positions.every(point => Object.values(point).every(Number.isFinite)))).toBe(true)
 }
 expect(cases[0]).toEqual(cases[2])
 expect(cases[1]).toEqual(cases[3])
}, 30000)
