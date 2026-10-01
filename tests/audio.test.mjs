import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../audio.js';

class Param{
 constructor(value=0){this.value=value;this.events=[];}
 setValueAtTime(value,time){this.value=value;this.events.push({kind:'set',value,time});}
 exponentialRampToValueAtTime(value,time){assert.ok(value>0);this.events.push({kind:'ramp',value,time});}
 cancelScheduledValues(time){this.events.push({kind:'cancel',time});}
}
class Node{
 constructor(context,kind){this.context=context;this.kind=kind;this.connections=[];this.disconnected=false;context.nodes.push(this);}
 connect(destination){this.connections.push(destination);return destination;}
 disconnect(){this.disconnected=true;this.connections=[];}
}
class Source extends Node{
 constructor(context,kind){super(context,kind);this.frequency=new Param();this.starts=[];this.stops=[];this.onended=null;context.sources.push(this);}
 start(time){this.starts.push(time);}
 stop(time){this.stops.push(time);}
 finish(){this.onended?.();}
}
class FakeContext{
 constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=1000;this.nodes=[];this.sources=[];this.buffers=[];this.resumeCalls=0;this.suspendCalls=0;this.destination={kind:'destination'};}
 createGain(){const node=new Node(this,'gain');node.gain=new Param(1);return node;}
 createDynamicsCompressor(){const node=new Node(this,'limiter');for(const name of ['threshold','knee','ratio','attack','release'])node[name]=new Param();return node;}
 createOscillator(){return new Source(this,'oscillator');}
 createBufferSource(){return new Source(this,'noise');}
 createBiquadFilter(){const node=new Node(this,'filter');node.frequency=new Param();node.Q=new Param();return node;}
 createBuffer(channels,length,rate){const data=new Float32Array(length),buffer={channels,length,rate,getChannelData:()=>data};this.buffers.push(buffer);return buffer;}
 async resume(){this.resumeCalls++;this.state='running';}
 async suspend(){this.suspendCalls++;this.state='suspended';}
 async close(){this.state='closed';}
}
function harness(context=new FakeContext()){
 const intervals=new Map();let id=0,hidden=false,created=0;
 const audio=createAudio({contextFactory:()=>{created++;return context;},isHidden:()=>hidden,random:()=>.5,scheduleInterval:fn=>{intervals.set(++id,fn);return id;},cancelInterval:id=>intervals.delete(id)});
 return {audio,context,intervals,created:()=>created,setDocumentHidden:value=>hidden=value};
}

test('sound stays lazy and mute cannot allocate or count effects',async()=>{
 const h=harness();assert.equal(h.audio.play('footstep'),false);assert.equal(h.audio.chime(),false);
 await h.audio.setEnabled(false);assert.equal(h.created(),0);assert.equal(h.audio.getStatus().played,0);assert.equal(h.audio.getStatus().state,'uninitialized');
 await h.audio.dispose();assert.equal(h.audio.getStatus().state,'closed');assert.equal(await h.audio.setEnabled(true),false);assert.equal(h.created(),0);
});

test('volumes are remembered before initialization and every effect reaches the effects bus',async()=>{
 const h=harness();h.audio.setVolumes(0,.28);await h.audio.setEnabled(true);
 assert.equal(h.intervals.size,0);const gains=h.context.nodes.filter(n=>n.kind==='gain'),[master,music,fx]=gains;
 assert.equal(music.gain.value,0);assert.equal(fx.gain.value,.28);assert.equal(master.gain.value,.68);
 assert.equal(h.audio.play('inspect'),true);assert.equal(h.audio.getStatus().played,1);assert.equal(h.audio.getStatus().lastEffect,'inspect');
 const envelopes=h.context.nodes.filter(n=>n.kind==='gain').slice(3);assert.equal(envelopes.length,2);
 for(const envelope of envelopes)assert.deepEqual(envelope.connections,[fx]);
 h.audio.setVolumes(-1,2);assert.equal(h.audio.getStatus().musicVolume,0);assert.equal(h.audio.getStatus().effectsVolume,1);
 await h.audio.dispose();
});

test('zero music and effects volumes prevent first-tick leakage and SFX statistics',async()=>{
 const h=harness();h.audio.setVolumes(0,0);await h.audio.setEnabled(true);
 assert.equal(h.context.sources.length,0);assert.equal(h.audio.play('preview'),false);assert.equal(h.audio.getStatus().played,0);
 h.audio.setVolumes(.1,.4);assert.equal(h.intervals.size,1);assert.ok(h.context.sources.length>0);
 assert.equal(h.audio.play('footstep',{surface:'stone'}),true);
 h.audio.setVolumes(0,0);assert.equal(h.intervals.size,0);assert.equal(h.audio.getStatus().activeVoices,0);
 await h.audio.dispose();
});

test('hidden and muted transitions cancel current and future preview voices',async()=>{
 const h=harness();h.audio.setVolumes(0,.6);await h.audio.setEnabled(true);
 assert.equal(h.audio.play('preview'),true);assert.ok(h.context.sources.some(s=>s.starts[0]>2));assert.equal(h.audio.getStatus().lastEffect,'preview');
 const scheduled=[...h.context.sources];await h.audio.setHidden(true);
 assert.equal(h.context.state,'suspended');assert.equal(h.audio.getStatus().activeVoices,0);assert.equal(h.audio.play('success'),false);
 for(const source of scheduled){assert.ok(source.disconnected);assert.equal(source.stops.at(-1),h.context.currentTime);}
 await h.audio.setHidden(false);assert.equal(h.audio.play('preview'),true,'interrupted cooldown is cleared');
 await h.audio.setEnabled(false);assert.equal(h.audio.getStatus().activeVoices,0);assert.equal(h.audio.play('bagOpen'),false);
 await h.audio.setHidden(true);await h.audio.setHidden(false);assert.equal(h.context.state,'suspended','visibility cannot unmute user preference');
 await h.audio.dispose();
});

test('document-hidden guard rejects new effects before visibility reconciliation',async()=>{
 const h=harness();await h.audio.setEnabled(true);h.setDocumentHidden(true);
 assert.equal(h.audio.play('error'),false);const count=h.context.sources.length;for(const tick of h.intervals.values())tick();assert.equal(h.context.sources.length,count);
 await h.audio.setHidden(true);assert.equal(h.audio.getStatus().activeVoices,0);await h.audio.dispose();
});

test('one shared noise buffer, bounded source budget, and natural ending cleanup',async()=>{
 const h=harness();h.audio.setVolumes(0,.65);await h.audio.setEnabled(true);
 for(let i=0;i<80;i++){h.context.currentTime+=.13;assert.equal(h.audio.play('footstep',{surface:'wood',stair:true,mode:'run'}),true);assert.ok(h.audio.getStatus().activeVoices<=24);}
 assert.equal(h.context.buffers.length,1);for(const source of h.context.sources.filter(s=>s.kind==='noise'))assert.equal(source.buffer,h.context.buffers[0]);
 assert.equal(h.audio.getStatus().activeVoices,24);assert.ok(h.context.sources[0].disconnected,'oldest voices are disconnected under budget pressure');
 for(const source of h.context.sources)source.finish();assert.equal(h.audio.getStatus().activeVoices,0);
 assert.ok(h.context.nodes.filter(n=>['oscillator','noise','filter'].includes(n.kind)).every(n=>n.disconnected));await h.audio.dispose();
});

test('crouch and rug footsteps attenuate transients and rapid duplicates are rejected',async()=>{
 const h=harness();h.audio.setVolumes(0,.6);await h.audio.setEnabled(true);
 const peak=()=>Math.max(...h.context.nodes.filter(n=>n.kind==='gain').slice(-2).flatMap(n=>n.gain.events.filter(e=>e.kind==='ramp').map(e=>e.value)));
 h.audio.play('footstep',{surface:'wood',mode:'walk'});const walking=peak();assert.equal(h.audio.play('footstep'),false);
 h.context.currentTime+=.2;h.audio.play('footstep',{surface:'wood',mode:'crouch'});const crouching=peak();assert.ok(crouching<walking*.5);
 h.context.currentTime+=.2;h.audio.play('footstep',{surface:'rug',mode:'walk'});const rug=peak();assert.ok(rug<walking);
 assert.equal(h.audio.play('unknown'),false);await h.audio.dispose();
});

test('late enable completion cannot restart music after mute',async()=>{
 const context=new FakeContext();let finishResume;
 context.resume=()=>{context.resumeCalls++;return new Promise(resolve=>finishResume=()=>{context.state='running';resolve();});};
 const h=harness(context),enable=h.audio.setEnabled(true);assert.equal(context.resumeCalls,1);
 await h.audio.setEnabled(false);finishResume();assert.equal(await enable,false);
 assert.equal(context.state,'suspended');assert.equal(h.intervals.size,0);assert.equal(h.audio.getStatus().enabled,false);assert.equal(h.audio.getStatus().activeVoices,0);await h.audio.dispose();
});

test('late suspend completion cannot override a newer enable',async()=>{
 const context=new FakeContext(),h=harness(context);await h.audio.setEnabled(true);let finishSuspend;
 context.suspend=()=>{context.suspendCalls++;return new Promise(resolve=>finishSuspend=()=>{context.state='suspended';resolve();});};
 const mute=h.audio.setEnabled(false);await h.audio.setEnabled(true);finishSuspend();assert.equal(await mute,true);
 assert.equal(context.state,'running');assert.equal(h.audio.getStatus().enabled,true);assert.equal(h.intervals.size,1);await h.audio.dispose();
});

test('dispose during pending enable prevents timers, sources and later re-enabling',async()=>{
 const context=new FakeContext();let finishResume;context.resume=()=>new Promise(resolve=>finishResume=()=>{context.state='running';resolve();});
 const h=harness(context),pending=h.audio.setEnabled(true);await h.audio.dispose();finishResume();assert.equal(await pending,false);
 assert.equal(h.audio.getStatus().state,'closed');assert.equal(h.audio.getStatus().activeVoices,0);assert.equal(h.intervals.size,0);assert.equal(h.context.sources.length,0);
});

test('failed resume reports disabled and can be retried using the same context',async()=>{
 const context=new FakeContext(),h=harness(context);context.resume=async()=>{throw Error('gesture required');};
 await assert.rejects(h.audio.setEnabled(true),/gesture required/);assert.equal(h.audio.getStatus().enabled,false);assert.equal(h.intervals.size,0);
 context.resume=FakeContext.prototype.resume;await h.audio.setEnabled(true);assert.equal(h.created(),1);assert.equal(h.audio.getStatus().enabled,true);await h.audio.dispose();
});

test('every authored cue schedules bounded effects and rejected names cannot allocate',async()=>{
 const h=harness();h.audio.setVolumes(0,.6);await h.audio.setEnabled(true);
 const names=['bagOpen','bagClose','inspect','success','error','door','secretUnlock','memoryEnter','memoryExit','memoryStep','stance','ending','intro','preview'];
 for(const name of names){h.context.currentTime+=4;assert.equal(h.audio.play(name,{step:2,crouched:true,id:'distance'}),true,name);assert.equal(h.audio.getStatus().lastEffect,name);assert.ok(h.audio.getStatus().activeVoices<=24);}
 for(const step of [0,1,3]){h.context.currentTime+=4;assert.equal(h.audio.play('intro',{step}),true);}
 for(const id of ['letter','reunion']){h.context.currentTime+=4;assert.equal(h.audio.play('ending',{id}),true);}
 const before=h.context.nodes.length;assert.equal(h.audio.play('__proto__'),false);assert.equal(h.audio.play('missing'),false);assert.equal(h.context.nodes.length,before);
 assert.equal(h.context.buffers.length,1);await h.audio.dispose();assert.equal(h.audio.getStatus().activeVoices,0);
});

test('partially failed initialization releases its graph and retries cleanly',async()=>{
 const failed=new FakeContext(),working=new FakeContext();failed.createBuffer=()=>{throw Error('allocation failed');};let attempt=0;
 const audio=createAudio({contextFactory:()=>++attempt===1?failed:working,isHidden:()=>false,scheduleInterval:()=>1,cancelInterval:()=>{}});audio.setVolumes(0,.5);
 await assert.rejects(audio.setEnabled(true),/allocation failed/);assert.equal(audio.getStatus().enabled,false);assert.equal(audio.getStatus().state,'uninitialized');assert.equal(failed.state,'closed');assert.ok(failed.nodes.every(n=>n.disconnected));
 await audio.setEnabled(true);assert.equal(audio.play('bagOpen'),true);assert.equal(attempt,2);assert.equal(working.buffers.length,1);await audio.dispose();
});

test('the tape knock cue uses six paired impacts grouped three, one, two',async()=>{
 const h=harness();h.audio.setVolumes(0,.6);await h.audio.setEnabled(true);h.context.currentTime=2;
 assert.equal(h.audio.play('intro',{step:3}),true);
 const knocks=[0,.16,.32,.8,1.28,1.44],tones=h.context.sources.filter(s=>s.kind==='oscillator'),noise=h.context.sources.filter(s=>s.kind==='noise');
 assert.equal(tones.length,6);assert.equal(noise.length,6);
 const onsets=tones.map(source=>source.starts[0]-2);
 for(let i=0;i<knocks.length;i++){
  assert.ok(Math.abs(onsets[i]-knocks[i])<1e-9);assert.equal(noise[i].starts[0],tones[i].starts[0],'each impact pairs the low knock and its wood transient');
 }
 const groups=[];for(const onset of onsets){if(!groups.length||onset-groups.at(-1).at(-1)>.3)groups.push([]);groups.at(-1).push(onset);}
 assert.deepEqual(groups.map(group=>group.length),[3,1,2]);assert.equal(h.audio.getStatus().activeVoices,12);assert.ok(h.audio.getStatus().activeVoices<=24);
 await h.audio.dispose();
});
