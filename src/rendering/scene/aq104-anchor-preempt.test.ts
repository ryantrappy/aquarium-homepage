import { BoxGeometry } from 'three'
import { expect, it } from 'vitest'
import { createSwimmingFish, stepSwimmingFish, type WaterHabitat } from './motion'
import { buildMeshCollider } from '../../simulation/mesh-collision'
import { createMeshClearanceQuery } from '../../simulation/mesh-habitat'
import { MESH_NAVIGATION_PLANNER_BUDGET, MESH_NAVIGATION_MOVEMENT_BUDGET } from './reef-mesh-navigation'

it.each(['aabb','mesh'] as const)('preserves an active safe crossing when an existing anchor is blocked (%s)', mode => {
  const box = { min:{x:-.4,y:-1,z:-1}, max:{x:.4,y:1,z:1} }
  const geometry = new BoxGeometry(.8,2,2), p = geometry.getAttribute('position'), index = geometry.index!
  const at = (i:number)=>({x:p.getX(i),y:p.getY(i),z:p.getZ(i)}), triangles=[]
  for(let i=0;i<index.count;i+=3)triangles.push({a:at(index.getX(i)),b:at(index.getX(i+1)),c:at(index.getX(i+2))})
  const built=buildMeshCollider({id:'anchor-rock',sourceSha256:'1'.repeat(64),units:'meter',upAxis:'+Y',coordinateSpace:'world',triangles})
  geometry.dispose(); expect(built.status).toBe('ready'); if(built.status!=='ready')return
  const query=createMeshClearanceQuery([built.collider])
  const habitat:WaterHabitat={bounds:{min:{x:-5.2,y:-2.25,z:-4.6},max:{x:5.2,y:2.8,z:2.8}},obstacles:mode==='aabb'?[{id:'rock',bounds:box}]:[],anchors:[{id:'blocked-graze',anchor:'grazingSurface',compatibleSpecies:['yellow-tang'],position:{x:0,y:0,z:0}}],...(mode==='mesh'?{meshNavigation:{units:'meter' as const,spacingM:.5,budget:{...MESH_NAVIGATION_PLANNER_BUDGET},movementBudget:{...MESH_NAVIGATION_MOVEMENT_BUDGET},queryCapsule:query}}:{})}
  const fish=createSwimmingFish('blocked-anchor-crossing','yellow-tang',{x:-3,y:1.8,z:1.8},.5,undefined,{collisionRadiusM:.04,initialYaw:Math.PI/2})
  fish.behavior={...fish.behavior,state:'forage',stateDurationSeconds:100,stateElapsedSeconds:0,navigationGeneration:4,targetAnchor:'grazingSurface'}
  fish.routeGeneration=3; fish.route=[{...fish.position},{x:3,y:1.8,z:1.8}];fish.waypoint=1;fish.targetWait=5
  const crossing=fish.route, before={...fish.position}
  stepSwimmingFish(fish,habitat,1/60)
  expect(fish.route).toBe(crossing)
  expect(fish.behavior.navigationOutcome).toBe('blocked')
  expect(fish.position.x).toBeGreaterThan(before.x)
  expect(query(before,fish.position,.04,{...MESH_NAVIGATION_MOVEMENT_BUDGET}).status).toBe('clear')
})
