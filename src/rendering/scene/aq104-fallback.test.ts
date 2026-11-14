import { expect, it } from 'vitest'
import { BoxGeometry } from 'three'
import { getNavigationRequest } from '../../simulation/behavior-runtime'
import { createSwimmingFish, seedForId, stepSwimmingFish, type WaterHabitat } from './motion'
import { buildMeshCollider } from '../../simulation/mesh-collision'
import { createMeshClearanceQuery } from '../../simulation/mesh-habitat'
import { MESH_NAVIGATION_PLANNER_BUDGET, MESH_NAVIGATION_MOVEMENT_BUDGET } from './reef-mesh-navigation'

it.each(['aabb','mesh'] as const)('keeps a free-water escape when the school preferred flank is blocked (%s)', mode=>{
 const side=(seedForId('lyretail-anthias')&1)?1:-1
 const blocked={min:{x:side<0?-5.2:.65,y:-2.25,z:-4.6},max:{x:side<0?-.65:5.2,y:2.8,z:2.8}}
 const g=new BoxGeometry(blocked.max.x-blocked.min.x,5.05,7.4);g.translate((blocked.min.x+blocked.max.x)/2,.275,-.9)
 const p=g.getAttribute('position'),idx=g.index!,at=(i:number)=>({x:p.getX(i),y:p.getY(i),z:p.getZ(i)}),triangles=[]
 for(let i=0;i<idx.count;i+=3)triangles.push({a:at(idx.getX(i)),b:at(idx.getX(i+1)),c:at(idx.getX(i+2))})
 const result=buildMeshCollider({id:'blocked-station',sourceSha256:'1'.repeat(64),units:'meter',upAxis:'+Y',coordinateSpace:'world',triangles});if(result.status!=='ready')throw Error(result.reason)
 const query=createMeshClearanceQuery([result.collider]);g.dispose()
 const h:WaterHabitat={bounds:{min:{x:-5.2,y:-2.25,z:-4.6},max:{x:5.2,y:2.8,z:2.8}},obstacles:mode==='aabb'?[{id:'blocked-school-flank',bounds:blocked}]:[],anchors:[],...(mode==='mesh'?{meshNavigation:{units:'meter' as const,spacingM:.5,budget:{...MESH_NAVIGATION_PLANNER_BUDGET},movementBudget:{...MESH_NAVIGATION_MOVEMENT_BUDGET},queryCapsule:query}}:{})}
 const fish=createSwimmingFish('fallback-anthias','lyretail-anthias',{x:0,y:.6,z:1.8},.5,undefined,{collisionRadiusM:.04})
 fish.behavior={...fish.behavior,state:'swim',stateDurationSeconds:100,stateElapsedSeconds:0,targetAnchor:'schoolCenter'}
 expect(getNavigationRequest(fish.behavior)?.anchor).toBe('schoolCenter')
 stepSwimmingFish(fish,h,1/60)
 expect(fish.route.length).toBeGreaterThan(1)
 expect(fish.route[fish.route.length-1].x*side).toBeLessThan(.65-.04)
})
