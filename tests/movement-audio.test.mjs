import test from 'node:test';
import assert from 'node:assert/strict';
import {createMovementAudio,movementSurface,RUG_SIZES} from '../movement-audio.js';
import {moveInvestigator,roomAt,WALK_SPEED} from '../navigation.js';
import {doors,roomLayouts} from '../mansion-layout.js';
const fixture=()=>{const events=[];return {events,sound:createMovementAudio((name,options)=>events.push({name,...options}),{doorways:doors})};};
const feet=events=>events.filter(e=>e.name==='footstep');

test('actual travel produces the same footsteps at 15/30/60/144 FPS',()=>{
 for(const fps of [15,30,60,144]){
  const {events,sound}=fixture();let p={x:0,y:0,z:3.1,floor:'ground'};
  for(let i=0;i<fps*3;i++){
   sound.beginFrame();const next=moveInvestigator(p,{x:0,z:-1},1/fps,{continuous:true});
   sound.move({distance:Math.hypot(next.x-p.x,next.y-p.y,next.z-p.z),mode:'walk',surface:'wood'});p=next;
  }
  assert.equal(feet(events).length,11,fps+' FPS');assert.ok(feet(events).every(e=>e.mode==='walk'&&e.surface==='wood'&&!e.stair));
 }
});

test('first actual step is responsive, later steps use travelled stride distance',()=>{
 const {events,sound}=fixture();sound.beginFrame();sound.move({distance:.14});assert.equal(events.length,0);
 sound.move({distance:.01});assert.equal(feet(events).length,1);
 sound.beginFrame();sound.move({distance:.64});assert.equal(feet(events).length,1);
 sound.move({distance:.01});assert.equal(feet(events).length,2);
});

test('holding movement against a wall cannot emit footsteps',()=>{
 const {events,sound}=fixture();let p={x:-2.35,y:0,z:0,floor:'ground'};
 for(let i=0;i<100;i++){
  sound.beginFrame();const next=moveInvestigator(p,{x:-1,z:0},.04,{continuous:true});
  sound.move({distance:Math.hypot(next.x-p.x,next.y-p.y,next.z-p.z),input:true});p=next;
 }
 assert.equal(feet(events).length,0,'less than initial step distance before the actual partition');
});

test('idle, blocked, suppressed input and explicit reset cannot queue deferred footsteps',()=>{
 for(const stop of [{distance:0},{distance:1,input:false},{distance:10,allowed:false},{distance:NaN}]){
  const {events,sound}=fixture();sound.beginFrame();sound.move({distance:.1});sound.move(stop);sound.beginFrame();sound.move({distance:.1});assert.equal(events.length,0);
  sound.reset();sound.move({distance:.14});assert.equal(events.length,0);sound.move({distance:.01});assert.equal(feet(events).length,1);
 }
});

test('mode changes preserve normalized stride without emitting an extra stationary step',()=>{
 const {events,sound}=fixture();sound.beginFrame();sound.move({distance:.15});sound.beginFrame();sound.move({distance:.325,mode:'walk'});
 sound.move({distance:.525,mode:'run'});assert.equal(feet(events).length,2);assert.equal(feet(events)[1].mode,'run');
 sound.beginFrame();sound.move({distance:.225,mode:'crouch'});assert.equal(feet(events).length,2);
 sound.move({distance:.225,mode:'crouch'});assert.equal(feet(events).length,3);assert.equal(feet(events)[2].mode,'crouch');
 sound.move({distance:0,mode:'run'});assert.equal(feet(events).length,3);
});

test('stair footsteps count full 3D distance and carry stair material metadata',()=>{
 const {events,sound}=fixture();let p={x:-1.3,y:2.2*.7/3.15,z:-6.2,floor:'ground',staircase:'grand'},travel=0;
 for(let i=0;i<60;i++){
  sound.beginFrame();const next=moveInvestigator(p,{x:0,z:-1},1/60,{continuous:true}),d=Math.hypot(next.x-p.x,next.y-p.y,next.z-p.z);travel+=d;
  sound.move({distance:d,surface:movementSurface({staircase:'grand'}),stair:true});p=next;
 }
 assert.ok(Math.abs(travel-WALK_SPEED)<1e-6);assert.equal(feet(events).length,4);assert.ok(feet(events).every(e=>e.stair&&e.surface==='wood'));
 sound.beginFrame();sound.reset();sound.move({distance:.15,surface:movementSurface({staircase:'service'}),stair:true});assert.equal(feet(events).at(-1).surface,'stone');
});

test('per-frame cap consumes excess distance without an audio backlog',()=>{
 const {events,sound}=fixture();sound.beginFrame();sound.move({distance:100});sound.move({distance:100});assert.equal(feet(events).length,2);
 sound.beginFrame();sound.move({distance:0});assert.equal(feet(events).length,2);
 sound.move({distance:.14});assert.equal(feet(events).length,2);
});

test('crouch emits once per change and silent resets/suppression do not create a stance sound',()=>{
 const {events,sound}=fixture();for(let i=0;i<5;i++)sound.stance(true);for(let i=0;i<5;i++)sound.stance(false);
 assert.deepEqual(events,[{name:'stance',crouched:true},{name:'stance',crouched:false}]);
 sound.stance(true,{allowed:false});sound.stance(true);sound.reset({crouched:false});sound.stance(false);assert.equal(events.length,2);
});

test('room material mapping uses actual hard floors and stairs override the floor below',()=>{
 for(const room of ['foyer','kitchen'])assert.equal(movementSurface({room,floor:'ground'}),'stone');
 for(const room of ['mortuary','boiler','sealed','cellarHall'])assert.equal(movementSurface({room,floor:'basement'}),'stone');
 assert.equal(movementSurface({room:'library',floor:'ground'}),'wood');assert.equal(movementSurface({room:'bedroom',floor:'upper'}),'wood');
 assert.equal(movementSurface({room:'kitchen',floor:'ground',staircase:'grand'}),'wood');assert.equal(movementSurface({room:'grandHall',floor:'ground',staircase:'service'}),'stone');
});

test('exact visible rug rectangles change material at their boundaries and never override stairs',()=>{
 for(const [room,[w,d]]of Object.entries(RUG_SIZES)){
  const r=roomLayouts[room],position={x:r.pos[0],z:r.pos[1]},base={room,floor:r.floor};
  assert.equal(movementSurface({...base,position}),'rug',room+' centre');
  assert.equal(movementSurface({...base,position:{x:position.x+w/2-.001,z:position.z}}),'rug',room+' inner edge');
  const hard=room==='foyer'?'stone':'wood';
  assert.equal(movementSurface({...base,position:{x:position.x+w/2+.001,z:position.z}}),hard,room+' outer width edge');
  assert.equal(movementSurface({...base,position:{x:position.x,z:position.z+d/2+.001}}),hard,room+' outer depth edge');
  assert.equal(movementSurface({...base,position,staircase:'grand'}),'wood',room+' stair override');
  assert.equal(movementSurface({...base,position,staircase:'service'}),'stone',room+' service override');
 }
 const {events,sound}=fixture();sound.beginFrame();sound.move({distance:.15,surface:'rug'});assert.equal(events[0].surface,'rug');
});

test('real same-floor door crossing emits once; teleports, stairs and inactive views do not',()=>{
 const {events,sound}=fixture();let p={x:0,y:0,z:5.8,floor:'ground'};
 for(let i=0;i<15;i++){
  const next=moveInvestigator(p,{x:0,z:-1},.04,{continuous:true});
  sound.crossDoor({from:roomAt(p,p.floor),to:next.room,floor:next.floor,previousFloor:p.floor,position:next,moved:next.z!==p.z});p=next;
 }
 assert.equal(events.length,1);assert.equal(events[0].id,'foyerHall');
 const crossing={from:'foyer',to:'grandHall',floor:'ground',position:{x:0,z:5.49},moved:true};
 for(const override of [{moved:false},{stair:true},{allowed:false},{previousFloor:'upper'},{position:{x:0,z:0}}])assert.equal(sound.crossDoor({...crossing,...override}),false);
 assert.equal(events.length,1);
});

test('an unavailable optional audio callback does not break movement event generation',()=>{
 const sound=createMovementAudio(()=>{throw Error('Audio unavailable');});
 assert.doesNotThrow(()=>{sound.beginFrame();sound.move({distance:.2});sound.stance(true);});
});
