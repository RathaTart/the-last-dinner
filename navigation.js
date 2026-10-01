export const PLAYER_RADIUS=.2;
export const WALK_SPEED=2.3;
export const INTERACTION_RANGE=1.65;
export const obstacles=[
 // Interior walls leave a cross-shaped passage through the middle of the house.
 [-.08,.08,-4.8,-1.4],[-.08,.08,1.4,4.8],[-6,-1.6,-.08,.08],[1.6,6,-.08,.08],
 // Furniture footprints: table, chairs, clock, preparation bench, cupboards, workshop, piano and sofa.
 [-4.3,-1.3,1.82,3.18],[-5.82,-5.05,.72,1.35],
 ...[-3.8,-2.8,-1.8].flatMap(x=>[[x-.32,x+.32,1.12,1.73],[x-.32,x+.32,3.27,3.88]]),
 [-4.44,-2.16,-2.7,-1.55],[-5.3,-.48,-4.6,-3.62],
 [1.55,5.04,-4.32,-3.18],[4.83,5.73,-3.48,-2.84],
 [2.31,4.29,2.22,4.25],[3.47,5.76,.47,1.42]
];
export function roomAt({x,z}){return x<0?(z<0?'kitchen':'dining'):(z<0?'workshop':'library');}
export function walkable(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>5.78-PLAYER_RADIUS||Math.abs(z)>4.6-PLAYER_RADIUS)return false;
 return !obstacles.some(([left,right,back,front])=>Math.hypot(x-Math.max(left,Math.min(right,x)),z-Math.max(back,Math.min(front,z)))<PLAYER_RADIUS);
}
export function moveInvestigator(position,direction,dt){
 const length=Math.hypot(direction.x,direction.z),next={x:position.x,z:position.z};
 if(!length||!Number.isFinite(length)||!Number.isFinite(dt))return next;
 const distance=WALK_SPEED*Math.max(0,Math.min(dt,.1)),steps=Math.max(1,Math.ceil(distance/.04));
 const dx=direction.x/length*distance/steps,dz=direction.z/length*distance/steps;
 for(let i=0;i<steps;i++){if(walkable(next.x+dx,next.z))next.x+=dx;if(walkable(next.x,next.z+dz))next.z+=dz;}
 return next;
}
export function cameraMovement(horizontal,forward,yaw){return {x:Math.cos(yaw)*horizontal-Math.sin(yaw)*forward,z:-Math.sin(yaw)*horizontal-Math.cos(yaw)*forward};}
export function nearestInteraction(position,candidates,room=roomAt(position)){
 return candidates.map(item=>({...item,distance:Math.hypot(item.x-position.x,item.z-position.z)})).filter(item=>item.room===room&&item.distance<=INTERACTION_RANGE).sort((a,b)=>a.distance-b.distance)[0]??null;
}
