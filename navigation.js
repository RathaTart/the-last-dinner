import {MANSION_BOUNDS,roomLayouts,walls,doors,doorFrameObstacles,furniture,furnitureBounds,floorY,stairObstacles,passages as architecturalPassages} from './mansion-layout.js';
export const PLAYER_RADIUS=.2;
export const WALK_SPEED=2.3;
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
 const length=Math.hypot(direction.x,direction.z),next={x:position.x,z:position.z};
 if(!length||!Number.isFinite(length)||!Number.isFinite(dt))return next;
 const distance=WALK_SPEED*Math.max(0,Math.min(dt,.1)),steps=Math.max(1,Math.ceil(distance/.04)),dx=direction.x/length*distance/steps,dz=direction.z/length*distance/steps;
 for(let i=0;i<steps;i++){
  if(walkable(next.x+dx,next.z,options))next.x+=dx;
  if(walkable(next.x,next.z+dz,options))next.z+=dz;
 }
 return next;
}
export function cameraMovement(horizontal,forward,yaw){return {x:Math.cos(yaw)*horizontal-Math.sin(yaw)*forward,z:-Math.sin(yaw)*horizontal-Math.cos(yaw)*forward};}
export function nearestInteraction(position,candidates,room=roomAt(position)){
 if(!room)return null;
 return candidates.map(item=>({...item,distance:Math.hypot(item.x-position.x,item.z-position.z)})).filter(item=>item.room===room&&item.distance<=INTERACTION_RANGE).sort((a,b)=>a.distance-b.distance)[0]??null;
}
export function roomSpawn(id){return roomLayouts[id]?.spawn;}
