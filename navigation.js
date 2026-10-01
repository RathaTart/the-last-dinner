import {MANSION_BOUNDS,roomLayouts,walls,doors,doorFrameObstacles,furniture,furnitureBounds,floorY,stairObstacles,staircases,passages as architecturalPassages} from './mansion-layout.js';
export const PLAYER_RADIUS=.2;
export const WALK_SPEED=2.3;
export const RUN_SPEED=4.3;
export const CROUCH_SPEED=1.15;
export const INTERACTION_RANGE=1.65;
const wallBounds=w=>[w.x-w.width/2,w.x+w.width/2,w.z-w.depth/2,w.z+w.depth/2];
export const floorObstacles=Object.fromEntries(Object.keys(floorY).map(floor=>[floor,[...walls.filter(w=>w.floor===floor).map(wallBounds),...furniture.filter(f=>f.solid&&roomLayouts[f.room].floor===floor).map(furnitureBounds),...stairObstacles[floor],...doorFrameObstacles[floor]]]));
export const obstacles=floorObstacles.ground;
export const passages=architecturalPassages;
const lockedDoors=doors.filter(d=>d.locked).map(d=>({floor:d.floor,bounds:d.axis==='x'?[d.pos[0]-d.width/2,d.pos[0]+d.width/2,d.pos[1]-.11,d.pos[1]+.11]:[d.pos[0]-.11,d.pos[0]+.11,d.pos[1]-d.width/2,d.pos[1]+d.width/2]}));
export function roomAt({x,z}={},floor='ground'){
 if(!Number.isFinite(x)||!Number.isFinite(z))return null;
 for(const [id,r]of Object.entries(roomLayouts)){
  if(r.floor!==floor)continue;
  const [l,right,back,front]=r.bounds;
  if(x>=l&&x<=right&&z>=back&&z<=front)return id;
 }
 return null;
}
const intersects=(x,z,[l,r,b,f])=>Math.hypot(x-Math.max(l,Math.min(r,x)),z-Math.max(b,Math.min(f,z)))<PLAYER_RADIUS;
export function walkable(x,z,{floor='ground',secretOpen=false}={}){
 if(!floorObstacles[floor]||!Number.isFinite(x)||!Number.isFinite(z))return false;
 const [l,r,b,f]=MANSION_BOUNDS;
 if(x<l+PLAYER_RADIUS||x>r-PLAYER_RADIUS||z<b+PLAYER_RADIUS||z>f-PLAYER_RADIUS)return false;
 const room=roomAt({x,z},floor);
 if(!room||(room==='sealed'&&!secretOpen))return false;
 if(floorObstacles[floor].some(bounds=>intersects(x,z,bounds)))return false;
 return secretOpen||!lockedDoors.some(door=>door.floor===floor&&intersects(x,z,door.bounds));
}
export function moveInvestigator(position,direction,dt,options={}){
 if(options.continuous)return moveContinuous(position,direction,dt,options);
 const length=Math.hypot(direction.x,direction.z),next={x:position.x,z:position.z};
 if(!length||!Number.isFinite(length)||!Number.isFinite(dt))return next;
 const distance=WALK_SPEED*Math.max(0,Math.min(dt,.1)),steps=Math.max(1,Math.ceil(distance/.04)),dx=direction.x/length*distance/steps,dz=direction.z/length*distance/steps;
 for(let i=0;i<steps;i++){
  if(walkable(next.x+dx,next.z,options))next.x+=dx;
  if(walkable(next.x,next.z+dz,options))next.z+=dz;
 }
 return next;
}
export function movementSpeed(mode='walk'){return mode==='crouch'?CROUCH_SPEED:mode==='run'?RUN_SPEED:WALK_SPEED;}
const MAX_SURFACE_STEP=.1;
const inside=({x,z},[l,r,b,f])=>x>=l-1e-8&&x<=r+1e-8&&z>=b-1e-8&&z<=f+1e-8;
export function stairSurfaceHeight(surface,x,z){
 if(Number.isFinite(surface.y))return surface.y;
 const value=surface.axis==='x'?x:z,t=Math.max(0,Math.min(1,(value-surface.start)/(surface.end-surface.start)));
 return surface.yStart+(surface.yEnd-surface.yStart)*t;
}
function planesAt(x,z,staircase){
 const result=[];
 for(const stair of Object.values(staircases)){
  if(staircase&&stair.id!==staircase)continue;
  for(const surface of stair.surfaces)if(inside({x,z},surface.bounds))result.push({staircase:stair.id,surface,height:stairSurfaceHeight(surface,x,z),stair});
 }
 return result;
}
// Read-only sampling for camera/debugging. Traversal always remembers its
// current height: an upper flight cannot be selected from the floor beneath.
export function stairSurfaceAt(position,{floor=position.floor||'ground',staircase=position.staircase||null}={}){
 const y=Number.isFinite(position.y)?position.y:floorY[floor];
 return planesAt(position.x,position.z,staircase).filter(p=>(staircase||[p.stair.lowerFloor,p.stair.upperFloor].includes(floor))&&Math.abs(p.height-y)<=MAX_SURFACE_STEP+1e-8).sort((a,b)=>Math.abs(a.height-y)-Math.abs(b.height-y))[0]||null;
}
function continuousState(position,options){
 const floor=options.floor||position.floor||'ground',y=Number.isFinite(position.y)?position.y:Number.isFinite(options.y)?options.y:floorY[floor]??0;
 const requested=options.staircase!==undefined?options.staircase:position.staircase;
 return {x:position.x,z:position.z,y,floor,room:roomAt(position,floor),staircase:staircases[requested]?requested:null};
}
function supportedAround(point,stair,options){
 // Check a full body footprint instead of only the centre, including the
 // junction between a flight and its turn landing. This also guards the void.
 const nearbyFloors=[stair.lowerFloor,stair.upperFloor];
 for(let i=0;i<12;i++){
  const angle=i*Math.PI/6,x=point.x+Math.cos(angle)*PLAYER_RADIUS,z=point.z+Math.sin(angle)*PLAYER_RADIUS;
  const onStair=planesAt(x,z,stair.id).some(p=>Math.abs(p.height-point.y)<=.23);
  if(onStair)continue;
  if(!nearbyFloors.some(f=>Math.abs(floorY[f]-point.y)<=.08&&walkable(x,z,{...options,floor:f})))return false;
 }
 return true;
}
function candidateStep(current,x,z,options){
 const plane=stairSurfaceAt({x,z,y:current.y,floor:current.floor,staircase:current.staircase});
 if(plane){
  const floor=plane.surface.exitFloor||current.floor,candidate={x,z,y:plane.height,floor,room:roomAt({x,z},floor),staircase:plane.staircase};
  if(supportedAround(candidate,plane.stair,options))return candidate;
 }
 const possibleFloors=current.staircase?[staircases[current.staircase].lowerFloor,staircases[current.staircase].upperFloor]:[current.floor];
 for(const floor of possibleFloors)if(Math.abs(floorY[floor]-current.y)<=.08&&walkable(x,z,{...options,floor}))return {x,z,y:floorY[floor],floor,room:roomAt({x,z},floor),staircase:null};
 return null;
}
function budgetStep(current,dx,dz,budget,options){
 const initial=candidateStep(current,current.x+dx,current.z+dz,options);if(!initial)return null;
 const distance=Math.hypot(initial.x-current.x,initial.y-current.y,initial.z-current.z);
 if(distance<=budget+1e-9)return initial;
 // A flight is linear, so one scaling usually gives the exact 3D speed.
 // At the flight/flat junction the height is piecewise linear; solve the
 // remaining distance rather than repeatedly overshooting and getting stuck.
 let low=0,high=1,best=null,t=Math.min(1,budget/distance);
 for(let i=0;i<22;i++){
  const candidate=candidateStep(current,current.x+dx*t,current.z+dz*t,options);
  const d=candidate?Math.hypot(candidate.x-current.x,candidate.y-current.y,candidate.z-current.z):Infinity;
  if(d<=budget+1e-9){best=candidate;low=t;if(Math.abs(d-budget)<1e-9)return best;}else high=t;
  t=(low+high)/2;
 }
 return best;
}
function moveContinuous(position,direction,dt,options){
 let next=continuousState(position,options);
 const length=Math.hypot(direction.x,direction.z);
 if(!length||!Number.isFinite(length)||!Number.isFinite(dt))return next;
 const distance=movementSpeed(options.mode)*Math.max(0,Math.min(dt,.1)),steps=Math.max(1,Math.ceil(distance/.035)),budget=distance/steps,dx=direction.x/length*budget,dz=direction.z/length*budget;
 for(let i=0;i<steps;i++){
  const full=budgetStep(next,dx,dz,budget,options);
  if(full){next=full;continue;}
  const x=budgetStep(next,dx,0,Math.abs(dx),options);if(x)next=x;
  const z=budgetStep(next,0,dz,Math.abs(dz),options);if(z)next=z;
 }
 return next;
}
export function cameraMovement(horizontal,forward,yaw){return {x:Math.cos(yaw)*horizontal-Math.sin(yaw)*forward,z:-Math.sin(yaw)*horizontal-Math.cos(yaw)*forward};}
export function nearestInteraction(position,candidates,room=roomAt(position)){
 if(!room)return null;
 return candidates.map(item=>({...item,distance:Math.hypot(item.x-position.x,item.z-position.z)})).filter(item=>item.room===room&&item.distance<=INTERACTION_RANGE).sort((a,b)=>a.distance-b.distance)[0]??null;
}
export function roomSpawn(id){return roomLayouts[id]?.spawn;}
