import test from 'node:test';
import assert from 'node:assert/strict';
import {createMovementInput,bindKeyboardMovement} from '../movement-input.js';
import {moveInvestigator,cameraMovement,WALK_SPEED} from '../navigation.js';
import {createLocomotionBlend,turnToward} from '../locomotion.js';
import {AnimationMixer,AnimationClip,NumberKeyframeTrack,Group,Object3D} from 'three';

function rig(){let now=0;const input=createMovementInput(()=>now),keyboard=new EventTarget(),window=new EventTarget();let allowed=true,intents=0,position={x:.5,z:.5};
 bindKeyboardMovement(input,{keyboardTarget:keyboard,lifecycleTarget:window,canControl:()=>allowed,onMovementIntent:()=>intents++});
 function key(type,code,repeat=false,eventTime=now){const event=new Event(type,{cancelable:true});Object.assign(event,{code,repeat});Object.defineProperty(event,'timeStamp',{value:eventTime});keyboard.dispatchEvent(event);return event;}
 return {input,keyboard,window,key,get position(){return position;},get intents(){return intents;},set allowed(v){allowed=v;},time(v){now=v;},frame(v,yaw=0){now=v;for(const part of input.read())position=moveInvestigator(position,cameraMovement(part.horizontal,part.forward,yaw),part.dt);return position;}};
}
function close(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}

test('one held key walks continuously at equal speed at 15/30/60/144 FPS; release stops',()=>{
 for(const fps of [15,30,60,144]){const r=rig();r.key('keydown','KeyW');for(let i=1;i<=fps/2;i++)r.frame(i*1000/fps);r.frame(500);r.time(500);r.key('keyup','KeyW');close(r.position.z,.5-WALK_SPEED*.5);const stopped={...r.position};for(let i=1;i<8;i++)r.frame(500+i*33);assert.deepEqual(r.position,stopped);}
});
test('all four keyboard directions use the camera basis; there is no idle left drift',()=>{
 for(const [code,h,f]of [['KeyW',0,1],['KeyS',0,-1],['KeyA',-1,0],['KeyD',1,0],['ArrowUp',0,1],['ArrowDown',0,-1],['ArrowLeft',-1,0],['ArrowRight',1,0]]){
  const r=rig(),yaw=.635;const direction=cameraMovement(h,f,yaw);r.key('keydown',code);r.frame(100,yaw);close(r.position.x,.5+direction.x*WALK_SPEED*.1);close(r.position.z,.5+direction.z*WALK_SPEED*.1);
  r.key('keyup',code);const stopped={...r.position};r.frame(200,yaw);assert.deepEqual(r.position,stopped);
 }
});
test('a tap between frames keeps its actual duration, without a fixed extra impulse',()=>{
 const r=rig();r.time(2);r.key('keydown','KeyD');r.time(12);r.key('keyup','KeyD');r.frame(16);close(r.position.x,.5+WALK_SPEED*.01);r.frame(32);close(r.position.x,.5+WALK_SPEED*.01);
});
test('delayed keyboard dispatch uses event timestamps, not the time both handlers run',()=>{
 const r=rig();r.time(55);r.key('keydown','KeyD',false,10);r.key('keyup','KeyD',false,40);r.frame(60);close(r.position.x,.5+WALK_SPEED*.03);
});
test('OS key repeat does not boost speed or retrigger movement intent',()=>{
 const r=rig();r.key('keydown','KeyD');for(let i=1;i<=10;i++){r.time(i*10);r.key('keydown','KeyD',true);}r.frame(100);close(r.position.x,.5+WALK_SPEED*.1);assert.equal(r.intents,1);
});
test('opposite keys cancel; releasing one resumes the other; aliases and touch are independent',()=>{
 const r=rig();r.key('keydown','KeyA');r.key('keydown','KeyD');r.frame(50);close(r.position.x,.5);
 r.key('keyup','KeyA');r.frame(100);close(r.position.x,.5+WALK_SPEED*.05);
 r.input.set('ArrowRight','pointer-1',true);r.key('keyup','KeyD');r.frame(150);close(r.position.x,.5+WALK_SPEED*.1);
 r.key('keydown','KeyD');r.input.releaseSource('pointer-1');r.frame(200);close(r.position.x,.5+WALK_SPEED*.15);
});
test('focus loss and blocked views release movement; repeats cannot resurrect a cleared key',()=>{
 const r=rig();r.key('keydown','KeyA');r.frame(20);r.window.dispatchEvent(new Event('blur'));const stopped={...r.position};r.key('keydown','KeyA',true);r.frame(40);assert.deepEqual(r.position,stopped);
 r.allowed=false;r.key('keydown','KeyD');r.allowed=true;r.key('keydown','KeyD',true);r.frame(60);assert.deepEqual(r.position,stopped);
 r.key('keyup','KeyD');r.key('keydown','KeyD');r.frame(80);assert.ok(r.position.x>stopped.x);
});
test('movement keys from editable fields never move the investigator',()=>{
 let now=0;const input=createMovementInput(()=>now),listeners={};const keyboard={addEventListener(type,fn){listeners[type]=fn;}};
 bindKeyboardMovement(input,{keyboardTarget:keyboard,lifecycleTarget:new EventTarget(),canControl:()=>true});input.set('KeyA','keyboard',true);now=10;
 listeners.keydown({target:{closest:()=>true},code:'KeyD',repeat:false});now=40;assert.deepEqual(input.axes(),{horizontal:0,forward:0});assert.ok(input.read().every(s=>s.horizontal===0&&s.forward===0));
});
test('a long stalled frame is capped and does not queue movement after release',()=>{
 const r=rig();r.key('keydown','KeyD');r.frame(2000);close(r.position.x,.5+WALK_SPEED*.1);r.key('keyup','KeyD');r.frame(4000);close(r.position.x,.5+WALK_SPEED*.1);
});
test('rapid walk/idle changes retain animation phase and blend back to a neutral pose',()=>{
 const root=new Group(),leg=new Object3D();leg.name='leg';root.add(leg);const mixer=new AnimationMixer(root);
 const actions={idle:mixer.clipAction(new AnimationClip('idle',1,[new NumberKeyframeTrack('leg.rotation[x]',[0,1],[0,0])])),walk:mixer.clipAction(new AnimationClip('walk',1,[new NumberKeyframeTrack('leg.rotation[x]',[0,.25,.5,.75,1],[0,.6,0,-.6,0])]))};
 const blend=createLocomotionBlend(actions);for(let i=0;i<30;i++){blend(i%3!==0,1/60);mixer.update(1/60);}close(actions.walk.time,.5);assert.ok(actions.walk.getEffectiveWeight()>0);
 for(let i=0;i<60;i++){blend(false,1/60);mixer.update(1/60);}close(actions.walk.getEffectiveWeight(),0);close(leg.rotation.x,0);
});
test('a short direction tap finishes turning after release via the shortest angle',()=>{
 let angle=Math.PI;const target=-2.5;for(let i=0;i<30;i++)angle=turnToward(angle,target,1/60);assert.ok(Math.abs(Math.atan2(Math.sin(target-angle),Math.cos(target-angle)))<.001);
 assert.ok(turnToward(Math.PI-.01,-Math.PI+.01,1/60)>Math.PI-.01);
});
