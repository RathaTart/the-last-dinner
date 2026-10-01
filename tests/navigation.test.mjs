import test from 'node:test';
import assert from 'node:assert/strict';
import {moveInvestigator,walkable,roomAt,cameraMovement,nearestInteraction} from '../navigation.js';
test('walking collides with partitions and furniture but can cross the open hallway',()=>{
 let p={x:-.5,z:2};for(let i=0;i<80;i++)p=moveInvestigator(p,{x:1,z:0},.04);
 assert.equal(roomAt(p),'dining');assert.ok(p.x<-.27);
 p={x:-.5,z:.5};for(let i=0;i<15;i++)p=moveInvestigator(p,{x:1,z:0},.04);
 assert.equal(roomAt(p),'library');
 p={x:-.7,z:2.5};for(let i=0;i<40;i++)p=moveInvestigator(p,{x:-1,z:0},.04);
 assert.ok(p.x>-1.11);assert.ok(walkable(p.x,p.z));
});
test('diagonal walking cannot accelerate or escape the house after a long frame',()=>{
 const start={x:.5,z:.5},p=moveInvestigator(start,{x:1,z:1},.04);
 assert.ok(Math.hypot(p.x-start.x,p.z-start.z)<=2.3*.04+1e-9);
 let edge={x:5.4,z:2};for(let i=0;i<80;i++)edge=moveInvestigator(edge,{x:1,z:0},10);
 assert.ok(edge.x<=5.58);assert.ok(walkable(edge.x,edge.z));
});
test('walking follows the camera and interaction cannot reach into another room',()=>{
 const north=cameraMovement(0,1,0),east=cameraMovement(0,1,Math.PI/2);
 assert.deepEqual(north,{x:0,z:-1});assert.ok(east.x<-.99);
 const p={x:-.3,z:.5},items=[{id:'hidden',room:'library',x:.3,z:.5},{id:'near',room:'dining',x:-1,z:.5},{id:'far',room:'dining',x:-4,z:3}];
 assert.equal(nearestInteraction(p,items).id,'near');assert.equal(nearestInteraction(p,[items[0],items[2]]),null);
});
test('every room and all three physical evidence objects are reachable from the entrance',()=>{
 const step=.12,origin={x:-.7,z:4.25},queue=[[0,0]],seen=new Set(['0,0']),points=[];
 for(let index=0;index<queue.length;index++){
  const [a,b]=queue[index],p={x:origin.x+a*step,z:origin.z+b*step};points.push(p);
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const key=(a+dx)+','+(b+dz);if(!seen.has(key)&&walkable(p.x+dx*step,p.z+dz*step)){seen.add(key);queue.push([a+dx,b+dz]);}}
 }
 assert.deepEqual(new Set(points.map(roomAt)),new Set(['dining','kitchen','library','workshop']));
 for(const item of [{id:'clock',room:'dining',x:-5.4,z:1.55},{id:'ledger',room:'kitchen',x:-3.6,z:-2.05},{id:'letter',room:'library',x:3.2,z:3.2}])assert.ok(points.some(p=>nearestInteraction(p,[item])),item.id+' must remain accessible');
});
import {rooms,clues,people} from '../content.js';
import {passages,roomSpawn} from '../navigation.js';
function flood(floor,secretOpen){const origin={x:floor==='basement'?-.7:.7,z:.7},step=.12,queue=[[0,0]],seen=new Set(['0,0']),points=[];for(let i=0;i<queue.length;i++){const [a,b]=queue[i],p={x:origin.x+a*step,z:origin.z+b*step};points.push(p);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const key=(a+dx)+','+(b+dz);if(!seen.has(key)&&walkable(p.x+dx*step,p.z+dz*step,{floor,secretOpen})){seen.add(key);queue.push([a+dx,b+dz]);}}}return points;}
test('both added floors have accessible stairs, clues and resident positions',()=>{for(const floor of ['upper','basement']){const points=flood(floor,true);const expected=Object.keys(rooms).filter(id=>rooms[id].floor===floor);assert.deepEqual(new Set(points.map(p=>roomAt(p,floor))),new Set(expected));for(const [id,c]of Object.entries(clues).filter(([,c])=>c.pos&&rooms[c.room].floor===floor)){const item={id,room:c.room,x:c.pos[0],z:c.pos[2]};assert.ok(points.some(p=>nearestInteraction(p,[item],roomAt(p,floor))),id+' must be reachable');}for(const [id,p]of Object.entries(passages).filter(([,p])=>p.floor===floor)){const item={id,room:p.room,x:p.pos[0],z:p.pos[2]};assert.ok(points.some(p=>nearestInteraction(p,[item],roomAt(p,floor))),id+' must be reachable');}for(const id of expected){const [x,z]=roomSpawn(id);assert.ok(walkable(x,z,{floor,secretOpen:true}),id+' spawn');}}});
test('sealed room cannot be entered from either passage until unlocked',()=>{const points=flood('basement',false);assert.ok(!points.some(p=>roomAt(p,'basement')==='sealed'));assert.equal(walkable(1,.6,{floor:'basement'}),false);assert.equal(walkable(1,.6,{floor:'basement',secretOpen:true}),true);const p=moveInvestigator({x:.7,z:-.5},{x:0,z:1},.1,{floor:'basement'});assert.ok(p.z<=-.2);assert.equal(roomAt({x:3,z:2},'upper'),'gallery');assert.equal(roomAt({x:-3,z:-2},'basement'),'mortuary');});
