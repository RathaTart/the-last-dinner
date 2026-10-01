import {floors,rooms} from './content.js';
export const PLAYER_RADIUS=.2;
export const WALK_SPEED=2.3;
export const INTERACTION_RANGE=1.65;
export const obstacles=[[-.08,.08,-4.8,-1.4],[-.08,.08,1.4,4.8],[-6,-1.6,-.08,.08],[1.6,6,-.08,.08],[-4.3,-1.3,1.82,3.18],[-5.82,-5.05,.72,1.35],...[-3.8,-2.8,-1.8].flatMap(x=>[[x-.32,x+.32,1.12,1.73],[x-.32,x+.32,3.27,3.88]]),[-4.44,-2.16,-2.7,-1.55],[-5.3,-.48,-4.6,-3.62],[1.55,5.04,-4.32,-3.18],[4.83,5.73,-3.48,-2.84],[2.31,4.29,2.22,4.25],[3.47,5.76,.47,1.42]];
export const floorObstacles={ground:obstacles,upper:[[-.08,.08,-4.8,-1.3],[-.08,.08,1.3,4.8],[-6,-1.6,-.08,.08],[-4.5,-2.3,1.8,3.5],[-4.5,-2.3,-3,-1.5],[1.8,5.3,-4.5,-3.9]],basement:[[-.08,.08,-4.8,-1.3],[-.08,.08,1.3,4.8],[1.6,6,-.08,.08],[-4.5,-2.5,-3.6,-2.4],[-4.5,-2.5,1,2.2],[3,4.6,-3.9,-2.6],[2.6,4.6,2.4,3.4]]};
export const passages={
 up:{room:'library',floor:'ground',pos:[.7,1,.7],to:'gallery',spawn:[.7,.7],th:'ขึ้นชั้นสอง',en:'Climb to the second floor'},
 down:{room:'dining',floor:'ground',pos:[-.7,1,.7],to:'mortuary',spawn:[-.7,.7],th:'ลงห้องใต้ดิน',en:'Descend to the basement'},
 upstairsReturn:{room:'gallery',floor:'upper',pos:[.7,1,.7],to:'library',spawn:[.7,.7],th:'กลับชั้นล่าง',en:'Return downstairs'},
 cellarReturn:{room:'mortuary',floor:'basement',pos:[-.7,1,.7],to:'dining',spawn:[-.7,.7],th:'ขึ้นชั้นล่าง',en:'Return upstairs'},
 secret:{room:'boiler',floor:'basement',pos:[1.1,1.1,-.2],th:'ผนังลับ · เสียงเคาะ',en:'Hidden wall · the knocks'}
};
export function roomAt({x,z},floor='ground'){if(floor==='upper')return x<0?(z<0?'infirmary':'bedroom'):'gallery';if(floor==='basement')return x<0?'mortuary':z<0?'boiler':'sealed';return x<0?(z<0?'kitchen':'dining'):(z<0?'workshop':'library');}
export function walkable(x,z,{floor='ground',secretOpen=false}={}){if(!floors[floor]||!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>5.78-PLAYER_RADIUS||Math.abs(z)>4.6-PLAYER_RADIUS)return false;if(floor==='basement'&&!secretOpen&&x>-.2&&z>-.2)return false;return !floorObstacles[floor].some(([l,r,b,f])=>Math.hypot(x-Math.max(l,Math.min(r,x)),z-Math.max(b,Math.min(f,z)))<PLAYER_RADIUS);}
export function moveInvestigator(position,direction,dt,options={}){const length=Math.hypot(direction.x,direction.z),next={x:position.x,z:position.z};if(!length||!Number.isFinite(length)||!Number.isFinite(dt))return next;const distance=WALK_SPEED*Math.max(0,Math.min(dt,.1)),steps=Math.max(1,Math.ceil(distance/.04)),dx=direction.x/length*distance/steps,dz=direction.z/length*distance/steps;for(let i=0;i<steps;i++){if(walkable(next.x+dx,next.z,options))next.x+=dx;if(walkable(next.x,next.z+dz,options))next.z+=dz;}return next;}
export function cameraMovement(horizontal,forward,yaw){return {x:Math.cos(yaw)*horizontal-Math.sin(yaw)*forward,z:-Math.sin(yaw)*horizontal-Math.cos(yaw)*forward};}
export function nearestInteraction(position,candidates,room=roomAt(position)){return candidates.map(item=>({...item,distance:Math.hypot(item.x-position.x,item.z-position.z)})).filter(item=>item.room===room&&item.distance<=INTERACTION_RANGE).sort((a,b)=>a.distance-b.distance)[0]??null;}
export function roomSpawn(id){return {dining:[-.7,4.25],kitchen:[-.7,-1],workshop:[.7,-1],library:[.7,1.8],gallery:[.7,.7],bedroom:[-1.1,1.4],infirmary:[-1.1,-1.2],mortuary:[-.7,.7],boiler:[.7,-.7],sealed:[1.1,.7]}[id];}
