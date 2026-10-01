import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../game.js';
import {roomAt,roomSpawn,walkable,nearestInteraction,passages} from '../navigation.js';
import {npcStations,npcRoutes} from '../mansion-layout.js';

const timeline={payment:'18:45',envelope:'18:55',dinner:'19:00',words:'19:05',leaving:'19:20',closure:'19:25',escape:'19:30',deaths:'19:40',clock:'clock',payer:'receipt'};
const conclusion={taker:'saran',reason:'coverup',departure:'rescue'};
const saveReload=state=>g.restoreState(JSON.parse(JSON.stringify(state)));

test('fresh investigation can recover from wrong answers, reload mid-run, finish reunion and restart through production actions',()=>{
 let state=g.freshState();
 assert.equal(state.room,'foyer');assert.equal(state.secretOpen,false);assert.equal(state.ending,null);
 for(const person of Object.keys(g.people))assert.equal(g.canEnterMemory(state,person),false);
 assert.equal(g.canInspect(state,'order',null),false);
 assert.equal(g.unlockSecret(state,'312'),false);assert.equal(g.solveCase(state,conclusion),false);
 assert.equal(g.chooseEnding(state,'reunion'),false);

 function inspect(id,memory=null){
  assert.equal(g.canInspect(state,id,memory),true,'player can inspect '+id);
  assert.equal(g.collectClue(state,id),true,'new evidence '+id);
  assert.equal(g.collectClue(state,id),false,'reinspection cannot duplicate evidence');
 }
 function remember(person,required,wrong,answer,evidence){
  const memory={person,step:1};
  assert.equal(g.people[person].required,required);assert.equal(g.memoryScenes[person][1].clue,evidence);
  assert.equal(g.canEnterMemory(state,person),false,'the object must be shown, not merely collected');
  assert.equal(g.showEvidence(state,person,'names'),false,'unrelated evidence cannot unlock a memory');
  assert.equal(g.showEvidence(state,person,required),true);assert.equal(g.canEnterMemory(state,person),true);
  assert.equal(g.canInspect(state,evidence,memory),false,'observation must be solved first');
  assert.ok(g.memoryPuzzles[person].choices.some(([id])=>id===wrong),'wrong choice is actually offered in the UI');
  const before=structuredClone(state);assert.equal(g.solveObservation(state,person,wrong),false);assert.deepEqual(state,before,'wrong observation is recoverable');
  assert.equal(g.solveObservation(state,person,answer),true);
  assert.equal(g.canInspect(state,evidence,{person,step:0}),false);assert.equal(g.canInspect(state,evidence,{person,step:2}),false);
  assert.equal(g.canInspect(state,evidence,null),false,'memory evidence is unavailable in the present');
  inspect(evidence,memory);
 }

 // Ground floor: dining -> kitchen -> workshop -> music room.
 inspect('clock');inspect('ledger');
 remember('cook','ledger','stove','door','departure');
 remember('father','clock','20:00','19:00','argument');
 inspect('letter');remember('sister','letter','time','payer','receipt');
 assert.deepEqual(state.evidence,['clock','ledger','departure','argument','letter','receipt']);
 const halfway=structuredClone(state);state=saveReload(state);assert.deepEqual(state,halfway,'a real earned-progress save survives JSON reload');

 // Upper floor, then service basement: obtain both corroborating witnesses.
 inspect('ward');remember('doctor','ward','colour','signature','dose');
 inspect('portrait');remember('witness','portrait','231','312','tunnel');
 assert.equal(g.canUnlockSecret(state),false,'knocks alone cannot open the panel');
 assert.equal(g.unlockSecret(state,'312'),false);
 inspect('names');inspect('maintenance');remember('caretaker','maintenance','inside','outside','lock');
 assert.equal(g.canUnlockSecret(state),true);
 const beforePanel=structuredClone(state);assert.equal(g.unlockSecret(state,'231'),false);assert.deepEqual(state,beforePanel);
 assert.equal(g.unlockSecret(state,'312'),true);inspect('order');
 assert.equal(state.evidence.length,14);assert.deepEqual(new Set(state.evidence),new Set(Object.keys(g.clues)));
 assert.ok(Object.values(state.observations).every(Boolean));

 assert.equal(g.solveCase(state,conclusion),false,'the timeline still needs corroboration');
 for(const wrong of [{...timeline,closure:'19:30'},{...timeline,clock:'ledger'},{...timeline,payer:'letter'}]){
  const before=structuredClone(state);assert.equal(g.reconstruct(state,wrong),false);assert.deepEqual(state,before);
 }
 assert.equal(g.reconstruct(state,timeline),true);assert.equal(state.reconstructed,true);
 const beforeConclusion=structuredClone(state);assert.equal(g.solveCase(state,{...conclusion,taker:'mira'}),false);assert.deepEqual(state,beforeConclusion);
 assert.equal(g.solveCase(state,conclusion),true);assert.equal(state.resolved,true,'the successful production action completes the case');
 assert.equal(g.canChooseEnding(state,'distance'),true);assert.equal(g.chooseEnding(state,'reunion'),false);
 for(const [id,wrong,answer]of [['apology','excuse','own'],['confession','replace','support'],['invitation','duty','choice']]){
  assert.ok(g.preparations[id].options.some(option=>option.id===wrong));
  const before=structuredClone(state);assert.equal(g.prepareEnding(state,id,wrong),false);assert.deepEqual(state,before);
  assert.equal(g.prepareEnding(state,id,answer),true);
  if(id!=='invitation')assert.equal(g.chooseEnding(state,'reunion'),false,'all three preparations are required');
 }
 assert.equal(g.canChooseEnding(state,'letter'),true);assert.equal(g.chooseEnding(state,'reunion'),true);
 assert.equal(state.ending,'reunion');assert.deepEqual(saveReload(state),state,'the completed ending survives reload');

 const ended=structuredClone(state),restarted=g.freshState();
 assert.deepEqual(restarted.evidence,[]);assert.equal(restarted.secretOpen,false);assert.equal(restarted.reconstructed,false);assert.equal(restarted.resolved,false);assert.equal(restarted.ending,null);
 assert.deepEqual(restarted.preparations,[]);assert.ok(Object.values(restarted.trust).every(value=>value===0));assert.ok(Object.values(restarted.observations).every(value=>value===false));
 assert.deepEqual(state,ended,'restart creates an independent investigation without altering an exported completed save');
});

function reachable(floor,secretOpen){
 const [x,z]=floor==='ground'?roomSpawn('foyer'):floor==='upper'?passages.up.spawn:passages.down.spawn;
 const increment=.15,queue=[[0,0]],seen=new Set(['0,0']),points=[];
 for(let index=0;index<queue.length;index++){
  const [a,b]=queue[index],point={x:x+a*increment,z:z+b*increment};points.push(point);
  for(const [da,db]of [[-1,0],[1,0],[0,-1],[0,1]]){
   const key=(a+da)+','+(b+db);
   if(!seen.has(key)&&walkable(point.x+da*increment,point.z+db*increment,{floor,secretOpen})){seen.add(key);queue.push([a+da,b+db]);}
  }
 }
 return points;
}
test('story objects and all resident routes match reachable physical rooms; memory targets are available at their observation scene',()=>{
 const floors=Object.keys(g.floors),points=Object.fromEntries(floors.map(floor=>[floor,reachable(floor,true)]));
 for(const [id,clue]of Object.entries(g.clues)){
  if(clue.memory){
   const person=g.people[clue.memory],observation=g.memoryScenes[clue.memory][1];
   assert.equal(observation.clue,id);assert.equal(observation.room,person.memoryRoom,id+' renders in its actual observation scene');
   continue;
  }
  const floor=g.rooms[clue.room].floor,target={id,room:clue.room,x:clue.pos[0],z:clue.pos[2]};
  assert.equal(roomAt(target,floor),clue.room,id+' actual rendered anchor belongs to its authored room');
  assert.ok(points[floor].some(point=>nearestInteraction(point,[target],roomAt(point,floor))),id+' has a reachable same-room approach');
 }
 for(const [id,person]of Object.entries(g.people)){
  const floor=g.rooms[person.room].floor;
  for(const [x,z]of [npcStations[id],...npcRoutes[id]]){
   const target={id,room:person.room,x,z};assert.equal(roomAt(target,floor),person.room,id+' station is in its authored room');
   assert.ok(points[floor].some(point=>nearestInteraction(point,[target],roomAt(point,floor))),id+' can be approached throughout its routine');
  }
 }
 const closed=reachable('basement',false);assert.ok(!closed.some(point=>roomAt(point,'basement')==='sealed'),'the file cannot be reached before legitimately opening the panel');
});
