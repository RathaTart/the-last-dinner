import test from 'node:test';
import assert from 'node:assert/strict';
import {moveInvestigator,walkable,roomAt,cameraMovement,nearestInteraction,passages,roomSpawn,WALK_SPEED,RUN_SPEED,CROUCH_SPEED,INTERACTION_RANGE,stairSurfaceAt} from '../navigation.js';
import {roomLayouts,walls,doors,furniture,evidencePositions,npcStations,npcRooms,npcRoutes,doorGraph,floorY,staircases} from '../mansion-layout.js';

function flood(floor,secretOpen=false){
 const spawn=floor==='ground'?roomSpawn('foyer'):floor==='upper'?passages.up.spawn:passages.down.spawn;
 const [x,z]=spawn,step=.15,queue=[[0,0]],seen=new Set(['0,0']),points=[];
 assert.ok(walkable(x,z,{floor,secretOpen}),'flood origin is walkable');
 for(let i=0;i<queue.length;i++){
  const [a,b]=queue[i],p={x:x+a*step,z:z+b*step};points.push(p);
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const key=(a+dx)+','+(b+dz);
   if(!seen.has(key)&&walkable(p.x+dx*step,p.z+dz*step,{floor,secretOpen})){seen.add(key);queue.push([a+dx,b+dz]);}
  }
 }
 return points;
}
const physicalRooms={clock:'dining',ledger:'kitchen',letter:'library',ward:'infirmary',portrait:'bedroom',maintenance:'boiler',names:'mortuary',order:'sealed'};
const reaches=(points,target,floor)=>points.some(p=>nearestInteraction(p,[target],roomAt(p,floor)));

test('floor plan has 14 named rooms, circulation rooms and no invented outside rooms',()=>{
 assert.equal(Object.keys(roomLayouts).length,14);
 assert.equal(roomAt({x:0,z:8}),'foyer');assert.equal(roomAt({x:0,z:0}),'grandHall');
 assert.equal(roomAt({x:0,z:0},'upper'),'landing');assert.equal(roomAt({x:0,z:0},'basement'),'cellarHall');
 for(const p of [{x:12.001,z:0},{x:0,z:9.501},{x:-40,z:-40},{x:NaN,z:0}])assert.equal(roomAt(p),null);
 assert.equal(roomAt({x:0,z:0},'roof'),null);
});

test('rendered partitions block movement and their actual door openings permit crossing',()=>{
 let p={x:-2.35,z:0};for(let i=0;i<40;i++)p=moveInvestigator(p,{x:-1,z:0},.04);
 assert.equal(roomAt(p),'grandHall');assert.ok(p.x>=-2.8+.11+.2-1e-6);
 p={x:-2.35,z:3.1};for(let i=0;i<15;i++)p=moveInvestigator(p,{x:-1,z:0},.04);
 assert.equal(roomAt(p),'dining');
 p={x:-7.4,z:5.2};for(let i=0;i<40;i++)p=moveInvestigator(p,{x:0,z:-1},.04);
 assert.ok(p.z>=3.3+2.3/2+.2-1e-6,'table footprint stops movement');assert.ok(walkable(p.x,p.z));
 for(const wall of walls){assert.equal(walkable(wall.x,wall.z,{floor:wall.floor,secretOpen:true}),false,'render wall is solid');}
 for(const door of doors.filter(d=>d.rooms.length===2&&!d.locked&&!d.stairOpening))assert.ok(walkable(door.pos[0],door.pos[1],{floor:door.floor,secretOpen:true}),door.id+' opening');
});

test('walking preserves speed, diagonal normalization, frame cap and house boundaries',()=>{
 const start={x:0,z:3.1},p=moveInvestigator(start,{x:1,z:1},.04);
 assert.ok(Math.abs(Math.hypot(p.x-start.x,p.z-start.z)-WALK_SPEED*.04)<1e-9);
 const capped=moveInvestigator(start,{x:0,z:1},10);assert.ok(Math.hypot(capped.x-start.x,capped.z-start.z)<=WALK_SPEED*.1+1e-9);
 let edge={x:0,z:8.7};for(let i=0;i<80;i++)edge=moveInvestigator(edge,{x:0,z:1},10);
 assert.ok(edge.z<=9.3);assert.ok(walkable(edge.x,edge.z));
 assert.deepEqual(moveInvestigator(start,{x:0,z:0},.1),start);
 assert.deepEqual(moveInvestigator(start,{x:1,z:0},NaN),start);
});

test('actual doorway bases block edge clipping while the centre remains open',()=>{
 for(const d of doors.filter(d=>d.rooms.length===2&&!d.stairOpening)){
  assert.ok(d.width-.25>.4,'opening still clears player diameter: '+d.id);
  for(const side of [-1,1]){
   // This point clears the nominal plaster-wall corner, but the player's
   // circle overlaps the wider decorative base and must still be blocked.
   const along=side*(d.width/2-.26),x=d.pos[0]+(d.axis==='x'?along:.2),z=d.pos[1]+(d.axis==='z'?along:.2);
   assert.equal(walkable(x,z,{floor:d.floor,secretOpen:true}),false,d.id+' jamb edge '+side);
  }
  assert.ok(walkable(...d.pos,{floor:d.floor,secretOpen:true}),d.id+' unobstructed centre');
 }
});

test('camera relative movement and proximity cannot interact through another room',()=>{
 const north=cameraMovement(0,1,0),east=cameraMovement(0,1,Math.PI/2);
 assert.deepEqual(north,{x:0,z:-1});assert.ok(east.x<-.99);
 const p={x:-2.4,z:3.1},items=[{id:'other',room:'dining',x:-3.2,z:3.1},{id:'near',room:'grandHall',x:-1.2,z:3.1},{id:'far',room:'grandHall',x:0,z:-3}];
 assert.equal(nearestInteraction(p,items).id,'near');assert.equal(nearestInteraction(p,[items[0],items[2]]),null);
 assert.equal(nearestInteraction({x:50,z:50},items),null);
});

test('every open room, physical clue, NPC and stair is reachable from floor entry',()=>{
 for(const floor of Object.keys(floorY)){
  const points=flood(floor,true),expected=Object.keys(roomLayouts).filter(id=>roomLayouts[id].floor===floor);
  assert.deepEqual(new Set(points.map(p=>roomAt(p,floor))),new Set(expected),floor+' rooms');
  for(const [id,pos]of Object.entries(evidencePositions)){
   const room=physicalRooms[id];if(roomLayouts[room].floor!==floor)continue;
   assert.ok(reaches(points,{id,room,x:pos[0],z:pos[2]},floor),id+' must have an approach within '+INTERACTION_RANGE);
  }
  for(const [id,p]of Object.entries(passages).filter(([,p])=>p.floor===floor))assert.ok(reaches(points,{id,room:p.room,x:p.pos[0],z:p.pos[2]},floor),id+' passage');
  for(const [id,pos]of Object.entries(npcStations)){
   const room=npcRooms[id];if(roomLayouts[room].floor!==floor)continue;
   assert.ok(walkable(...pos,{floor,secretOpen:true}),id+' station is not inside furniture');
   assert.ok(reaches(points,{id,room,x:pos[0],z:pos[1]},floor),id+' can be approached');
  }
  for(const room of expected){const [x,z]=roomSpawn(room);assert.equal(roomAt({x,z},floor),room);assert.ok(walkable(x,z,{floor,secretOpen:true}),room+' spawn');}
 }
});

test('sealed room is accessible only through the boiler panel after unlocking',()=>{
 const closed=flood('basement',false),opened=flood('basement',true);
 assert.ok(!closed.some(p=>roomAt(p,'basement')==='sealed'));
 assert.ok(opened.some(p=>roomAt(p,'basement')==='sealed'));
 assert.deepEqual(doorGraph.sealed.map(d=>d.to),['boiler']);assert.equal(doorGraph.sealed[0].locked,true);
 const door=doors.find(d=>d.id==='hiddenPanel');
 assert.equal(walkable(...door.pos,{floor:'basement'}),false);assert.equal(walkable(...door.pos,{floor:'basement',secretOpen:true}),true);
 const marker=passages.secret;assert.ok(reaches(closed,{room:'boiler',x:marker.pos[0],z:marker.pos[2]},'basement'),'locked panel can be examined');
 assert.equal(walkable(7,4,{floor:'basement'}),false,'direct placement cannot bypass the lock');
 assert.equal(walkable(2.8,3.1,{floor:'basement',secretOpen:true}),false,'no invisible hall shortcut');
});

test('all six NPC routine segments stay in their rooms and outside solid furnishings',()=>{
 for(const [id,route]of Object.entries(npcRoutes)){
  const room=npcRooms[id],floor=roomLayouts[room].floor;
  for(let i=0;i<route.length;i++){
   const a=route[i],b=route[(i+1)%route.length],count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.06);
   for(let j=0;j<=count;j++){const t=j/count,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;assert.equal(roomAt({x,z},floor),room,id+' stays in assigned room');assert.ok(walkable(x,z,{floor}),id+' routine does not cut through furniture at '+x+','+z);}
  }
 }
});

test('grand staircase aperture blocks walking into air while both landing markers stay safe',()=>{
 assert.equal(walkable(0,-7,{floor:'upper'}),false,'upper floor opening');
 assert.equal(walkable(-1.3,-7,{floor:'ground'}),false,'west flight');
 assert.equal(walkable(1.3,-7,{floor:'ground'}),false,'east flight');
 assert.equal(walkable(1.4,-5.72,{floor:'upper'}),false,'front upper guardrail');
 assert.equal(walkable(-2.35,-5.62,{floor:'ground'}),false,'lower newel post');
 for(const id of ['up','upstairsReturn']){const p=passages[id];assert.ok(walkable(p.pos[0],p.pos[2],{floor:p.floor}),id+' safe approach');}
 const p=moveInvestigator({x:0,z:-5.5},{x:0,z:-1},.1,{floor:'upper'});
 assert.ok(p.z>=-5.6-1e-9,'void edge stops investigator');
});

test('service stair aperture and cellar flight block walking while transitions remain approachable',()=>{
 assert.equal(walkable(-3.3,-8.2,{floor:'ground'}),false,'kitchen void east edge');
 assert.equal(walkable(-3.8,-7.9,{floor:'ground'}),false,'kitchen aperture front');
 assert.equal(walkable(-1,-8.2,{floor:'basement'}),false,'cellar stair mesh');
 assert.equal(walkable(-3.12,-7.6,{floor:'ground'}),false,'service guardrail');
 for(const id of ['down','cellarReturn']){const p=passages[id];assert.ok(walkable(p.pos[0],p.pos[2],{floor:p.floor}),id+' safe marker');assert.ok(walkable(...p.spawn,{floor:roomLayouts[p.to].floor}),id+' safe arrival');}
 let kitchen={x:-3.8,z:-7},cellar={x:-1,z:-7};
 for(let i=0;i<20;i++){kitchen=moveInvestigator(kitchen,{x:0,z:-1},.05);cellar=moveInvestigator(cellar,{x:0,z:-1},.05,{floor:'basement'});}
 assert.ok(kitchen.z>=-7.5-1e-9,'kitchen opening edge');assert.ok(cellar.z>=-7.45-1e-9,'cellar flight edge');
});

test('furniture and circulation topology use the shared architectural source',()=>{
 assert.ok(furniture.length>=50,'detailed room furnishings');
 assert.ok(doorGraph.foyer.some(d=>d.to==='grandHall'));
 for(const room of ['dining','kitchen','workshop','library'])assert.ok(doorGraph.grandHall.some(d=>d.to===room));
 assert.ok(doorGraph.kitchen.some(d=>d.to==='dining'),'direct serving access');
 for(const [id,p]of Object.entries(passages).filter(([,p])=>p.to)){
  const destination=roomLayouts[p.to];assert.equal(roomAt({x:p.spawn[0],z:p.spawn[1]},destination.floor),p.to,id+' destination');assert.ok(walkable(...p.spawn,{floor:destination.floor}),id+' landing');
 }
});

function walkRoute(initial,waypoints,{mode='walk',dt=.04}={}){
 let p={...initial},travel=0,frames=0;const samples=[p],speed=mode==='run'?RUN_SPEED:mode==='crouch'?CROUCH_SPEED:WALK_SPEED;
 for(const [x,y,z]of waypoints){
  let attempts=0;
  while(Math.hypot(p.x-x,p.z-z)>.045){
   const remaining=Math.hypot(p.x-x,p.z-z),stepDt=Math.min(dt,remaining/speed),next=moveInvestigator(p,{x:x-p.x,z:z-p.z},stepDt,{floor:p.floor,staircase:p.staircase,continuous:true,mode});
   const distance=Math.hypot(next.x-p.x,next.y-p.y,next.z-p.z);assert.ok(distance<=speed*stepDt+1e-7,'3D speed budget');
   assert.ok(distance>1e-7,'route must keep moving at '+JSON.stringify(p)+' toward '+[x,y,z]);
   if(next.floor!==p.floor)assert.ok(Math.abs(next.y-floorY[next.floor])<1e-8,'floor changes only at matching height');
   travel+=distance;p=next;frames++;samples.push(p);assert.ok(++attempts<1000,'finite route');
  }
  assert.ok(Math.abs(p.y-y)<.05,'route height matches landing or endpoint');
 }
 return {p,travel,frames,samples};
}

test('grand dogleg can be climbed and descended continuously without a button or teleport',()=>{
 const up=walkRoute({x:-1.3,y:0,z:-4.7,floor:'ground',staircase:null},[[-1.3,0,-5.5],[-1.3,2.2,-8.95],[1.3,2.2,-8.95],[1.3,4.4,-5.5],[1.3,4.4,-4.7]]);
 assert.equal(up.p.floor,'upper');assert.equal(up.p.room,'landing');assert.equal(up.p.staircase,null);
 assert.ok(up.samples.some(p=>p.y>.4&&p.y<1.8));assert.ok(up.samples.some(p=>p.y>2.6&&p.y<4));
 const down=walkRoute(up.p,[[1.3,4.4,-5.5],[1.3,2.2,-8.95],[-1.3,2.2,-8.95],[-1.3,0,-5.5],[-1.3,0,-4.7]]);
 assert.equal(down.p.floor,'ground');assert.equal(down.p.room,'grandHall');assert.equal(down.p.staircase,null);
});

test('service dogleg joins kitchen and cellar at continuous heights with a real turn',()=>{
 const down=walkRoute({x:-3.8,y:0,z:-4.7,floor:'ground'},[[-3.8,0,-5.5],[-3.8,-2.2,-8.95],[-1,-2.2,-8.95],[-1,-4.4,-5.5],[-1,-4.4,-4.7]]);
 assert.equal(down.p.floor,'basement');assert.equal(down.p.room,'cellarHall');assert.equal(down.p.staircase,null);
 const up=walkRoute(down.p,[[-1,-4.4,-5.5],[-1,-2.2,-8.95],[-3.8,-2.2,-8.95],[-3.8,0,-5.5],[-3.8,0,-4.7]]);
 assert.equal(up.p.floor,'ground');assert.equal(up.p.room,'kitchen');
 assert.ok(doors.find(d=>d.id==='serviceCrossing').stairOpening);
});

test('run and crouch speeds are consistent on flat ground and full 3D stair slopes',()=>{
 for(const [mode,speed]of [['walk',WALK_SPEED],['run',RUN_SPEED],['crouch',CROUCH_SPEED]]){
  const flat={x:0,y:0,z:3.1,floor:'ground'},m=moveInvestigator(flat,{x:1,z:1},.05,{continuous:true,mode});
  assert.ok(Math.abs(Math.hypot(m.x-flat.x,m.y-flat.y,m.z-flat.z)-speed*.05)<1e-7);
  const slope={x:-1.3,y:2.2*.7/3.15,z:-6.2,floor:'ground',staircase:'grand'},s=moveInvestigator(slope,{x:0,z:-1},.05,{continuous:true,mode});
  assert.ok(Math.abs(Math.hypot(s.x-slope.x,s.y-slope.y,s.z-slope.z)-speed*.05)<1e-7,mode+' speed follows 3D surface');
 }
 const route=[[-1.3,0,-5.5],[-1.3,2.2,-8.95],[1.3,2.2,-8.95],[1.3,4.4,-5.5],[1.3,4.4,-4.7]],start={x:-1.3,y:0,z:-4.7,floor:'ground'};
 const walked=walkRoute(start,route),ran=walkRoute(start,route,{mode:'run'});assert.ok(ran.frames<walked.frames*.65,'run reaches upstairs faster');
});

test('stair sides, shaft void and wrong-height flights cannot be entered or exited in midair',()=>{
 const slope={x:-1.3,y:1.1,z:-7.075,floor:'ground',staircase:'grand'};
 let side=slope;for(let i=0;i<80;i++)side=moveInvestigator(side,{x:1,z:0},.05,{continuous:true});
 assert.ok(side.x<=-.275-.19);assert.ok(Math.abs(side.y-1.1)<1e-8);
 const below={x:1.3,y:0,z:-5.05,floor:'ground'},blocked=moveInvestigator(below,{x:0,z:-1},.1,{continuous:true});
 assert.ok(blocked.z>=-5.3-1e-8,'wrong-height upper flight remains solid from below');assert.equal(blocked.y,0);
 const voidStart={x:0,y:4.4,z:-5.05,floor:'upper'},voidStep=moveInvestigator(voidStart,{x:0,z:-1},.1,{continuous:true});assert.ok(voidStep.z>=-5.3-1e-8);
 assert.equal(stairSurfaceAt({x:1.3,y:0,z:-7,floor:'ground'}),null);
});

test('stationary and invalid continuous input preserves height, floor, room and stair context',()=>{
 const p={x:-1.3,y:1.1,z:-7.075,floor:'ground',staircase:'grand'};
 for(const [dir,dt]of [[{x:0,z:0},.1],[{x:1,z:0},NaN]])assert.deepEqual(moveInvestigator(p,dir,dt,{continuous:true}),{...p,room:'grandHall'});
 assert.ok(Object.values(staircases).every(s=>s.surfaces.every(p=>Number.isFinite(p.y)||Number.isFinite(p.yStart)&&Number.isFinite(p.yEnd))));
});
