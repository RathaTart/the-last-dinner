import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../audio.js';
import {stepInterval} from '../movement-profile.js';

class Param{
 constructor(value=0){this.value=value;this.events=[];}
 setValueAtTime(value,time){this.value=value;this.events.push({kind:'set',value,time});}
 exponentialRampToValueAtTime(value,time){assert.ok(value>0);this.events.push({kind:'ramp',value,time});}
 linearRampToValueAtTime(value,time){this.events.push({kind:'linear',value,time});}
 cancelScheduledValues(time){this.events.push({kind:'cancel',time});}
}
class Node{
 constructor(context,kind){this.context=context;this.kind=kind;this.connections=[];this.disconnected=false;context.nodes.push(this);}
 connect(destination){this.connections.push(destination);return destination;}
 disconnect(){this.disconnected=true;this.connections=[];}
}
class Source extends Node{
 constructor(context,kind){super(context,kind);this.frequency=new Param();this.playbackRate=new Param(1);this.starts=[];this.stops=[];this.onended=null;context.sources.push(this);}
 start(time){this.starts.push(time);}
 stop(time){this.stops.push(time);}
 finish(){this.onended?.();}
}
class FakeContext{
 constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=1000;this.nodes=[];this.sources=[];this.buffers=[];this.resumeCalls=0;this.suspendCalls=0;this.destination={kind:'destination'};}
 createGain(){const node=new Node(this,'gain');node.gain=new Param(1);return node;}
 createDynamicsCompressor(){const node=new Node(this,'limiter');for(const name of ['threshold','knee','ratio','attack','release'])node[name]=new Param();return node;}
 createAnalyser(){const node=new Node(this,'analyser');node.getFloatTimeDomainData=data=>{const samples=node.signalSamples??this.signalSamples;for(let i=0;i<data.length;i++)data[i]=samples?.[i%samples.length]??0;};return node;}
 createOscillator(){return new Source(this,'oscillator');}
 createBufferSource(){return new Source(this,'noise');}
 createBiquadFilter(){const node=new Node(this,'filter');node.frequency=new Param();node.Q=new Param();return node;}
 createBuffer(channels,length,rate){const data=new Float32Array(length),buffer={channels,numberOfChannels:channels,length,rate,duration:length/rate,getChannelData:()=>data};this.buffers.push(buffer);return buffer;}
 async resume(){this.resumeCalls++;this.state='running';}
 async suspend(){this.suspendCalls++;this.state='suspended';}
 async close(){this.state='closed';}
}
function harness(context=new FakeContext(),options={}){
 const intervals=new Map();let id=0,hidden=false,created=0,randomStep=0;
 const audio=createAudio({contextFactory:()=>{created++;return context;},isHidden:()=>hidden,random:()=>++randomStep%2?.25:.75,scheduleInterval:fn=>{intervals.set(++id,fn);return id;},cancelInterval:id=>intervals.delete(id),sampleLoader:async()=>{throw Error('synthetic-only test');},...options});
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
 assert.equal(music.gain.value,0);assert.equal(fx.gain.value,.28);assert.equal(master.gain.value,.8);
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
 assert.equal(h.context.buffers.length,1);assert.ok(h.context.buffers[0].getChannelData(0).some(value=>value!==0),'shared transient buffer contains nonzero samples');for(const source of h.context.sources.filter(s=>s.kind==='noise'))assert.equal(source.buffer,h.context.buffers[0]);
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
 const names=['bagOpen','bagClose','inspect','success','error','door','secretUnlock','memoryEnter','memoryExit','memoryStep','stance','ending','intro','testTone','preview'];
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
 assert.ok(tones[0].starts[0]>=2.02&&tones[0].starts[0]<=2.04);
 const onsets=tones.map(source=>source.starts[0]-tones[0].starts[0]);
 for(let i=0;i<knocks.length;i++){
  assert.ok(Math.abs(onsets[i]-knocks[i])<1e-9);assert.equal(noise[i].starts[0],tones[i].starts[0],'each impact pairs the low knock and its wood transient');
 }
 const groups=[];for(const onset of onsets){if(!groups.length||onset-groups.at(-1).at(-1)>.3)groups.push([]);groups.at(-1).push(onset);}
 assert.deepEqual(groups.map(group=>group.length),[3,1,2]);assert.equal(h.audio.getStatus().activeVoices,12);assert.ok(h.audio.getStatus().activeVoices<=24);
 await h.audio.dispose();
});

test('preview starts with clear midrange reference tones and bounded held envelopes',async()=>{
 const h=harness();h.audio.setVolumes(0,.65);await h.audio.setEnabled(true);assert.equal(h.audio.play('preview'),true);
 const reference=h.context.sources.slice(0,2);assert.deepEqual(reference.map(source=>source.frequency.events[0].value),[660,880]);assert.ok(reference[0].starts[0]>=.02&&reference[0].starts[0]<=.04);assert.ok(Math.abs(reference[1].starts[0]-reference[0].starts[0]-.2)<1e-9);
 const envelopes=h.context.nodes.filter(node=>node.kind==='gain').slice(3),first=envelopes[0];
 const peak=Math.max(...first.gain.events.filter(event=>event.kind==='ramp').map(event=>event.value));
 assert.ok(peak*.65*.8>.08,'the reference has a useful default digital peak before compression');
 assert.ok(first.gain.events.some(event=>event.kind==='set'&&event.value===peak&&event.time>reference[0].starts[0]+.018),'a held body prevents an immediately vanishing reference');
 for(const envelope of envelopes)assert.ok(envelope.gain.events.every(event=>event.value===undefined||event.value<=.26),'per-voice headroom remains bounded');
 assert.ok(h.audio.getStatus().activeVoices<=24);await h.audio.dispose();
});

test('RMS and peak read after the limiter and are cleared on mute, hidden and disposal',async()=>{
 const h=harness();h.audio.setVolumes(0,.6);await h.audio.setEnabled(true);
 const master=h.context.nodes.find(node=>node.kind==='gain'),limiter=h.context.nodes.find(node=>node.kind==='limiter'),analyser=h.context.nodes.find(node=>node.kind==='analyser');
 assert.deepEqual(master.connections,[limiter]);assert.deepEqual(limiter.connections,[analyser]);assert.deepEqual(analyser.connections,[h.context.destination]);assert.equal(analyser.fftSize,1024);
 h.context.signalSamples=[.2,-.2,.1,-.1];assert.equal(h.audio.getStatus().rms,.158114);assert.equal(h.audio.getStatus().peak,.2);
 await h.audio.setHidden(true);assert.equal(h.audio.getStatus().rms,0);assert.equal(h.audio.getStatus().peak,0);
 await h.audio.setHidden(false);assert.equal(h.audio.getStatus().peak,.2);await h.audio.setEnabled(false);assert.equal(h.audio.getStatus().rms,0);
 await h.audio.dispose();assert.ok(analyser.disconnected);assert.equal(h.audio.getStatus().peak,0);
});

test('the effects meter is isolated from music and measures after FX volume before master',async()=>{
 const h=harness();await h.audio.setEnabled(true);
 const [master,music,fx]=h.context.nodes.filter(node=>node.kind==='gain'),effectsMeter=fx.connections[0];
 assert.equal(effectsMeter.kind,'analyser');assert.deepEqual(effectsMeter.connections,[master]);assert.deepEqual(music.connections,[master]);assert.equal(effectsMeter.fftSize,1024);
 h.context.signalSamples=[.1,-.1];effectsMeter.signalSamples=[0];
 assert.equal(h.audio.getStatus().rms,.1);assert.equal(h.audio.getStatus().effectsRms,0,'music cannot masquerade as effects output');
 effectsMeter.signalSamples=[.3,-.3,.1,-.1];assert.equal(h.audio.getStatus().effectsPeak,.3);assert.equal(h.audio.getStatus().effectsRms,.223607);
 h.audio.setVolumes(.45,0);assert.equal(h.audio.getStatus().effectsPeak,0);assert.equal(h.audio.getStatus().rms,.1);
 h.audio.setVolumes(.45,.65);await h.audio.setHidden(true);assert.equal(h.audio.getStatus().effectsRms,0);
 await h.audio.setHidden(false);assert.equal(h.audio.getStatus().effectsPeak,.3);await h.audio.setEnabled(false);assert.equal(h.audio.getStatus().effectsPeak,0);
 await h.audio.dispose();assert.ok(effectsMeter.disconnected);assert.equal(h.audio.getStatus().effectsRms,0);
});

test('slow node allocation cannot expire short effects or split tone, noise and envelope timing',async()=>{
 const context=new FakeContext(),h=harness(context);h.audio.setVolumes(0,.65);await h.audio.setEnabled(true);
 for(const method of ['createOscillator','createBufferSource','createBiquadFilter','createGain']){
  const original=context[method].bind(context);context[method]=()=>{context.currentTime+=.05;return original();};
 }
 const requestedAt=context.currentTime;assert.equal(h.audio.play('footstep',{surface:'stone'}),true);
 const allocationFinished=context.currentTime,tone=context.sources[0],noise=context.sources[1];
 assert.ok(allocationFinished-requestedAt>.2,'test advances beyond the old short transient stop time');
 assert.equal(tone.starts[0],noise.starts[0],'all parts receive one uniform shift');
 assert.ok(tone.starts[0]>=allocationFinished+.02&&tone.starts[0]<=allocationFinished+.04);
 for(const source of [tone,noise]){
  assert.ok(source.stops[0]>source.starts[0]);assert.ok(source.stops[0]>allocationFinished);
  const envelope=source.kind==='oscillator'?source.connections[0]:source.connections[0].connections[0];
  assert.equal(envelope.gain.events[0].time,source.starts[0]);assert.ok(envelope.gain.events.every(event=>event.time>=source.starts[0]));
 }
 assert.equal(tone.frequency.events[0].time,tone.starts[0]);assert.ok(Math.abs(tone.frequency.events.at(-1).time-tone.starts[0]-.085)<1e-9);
 assert.ok(h.audio.getStatus().maxScheduleLateMs>=250);assert.ok(h.audio.getStatus().activeVoices<=24);await h.audio.dispose();
});

function woodBuffer(index=0){
 const data=Float32Array.from([.8,-.4,.2,0]);
 return {index,duration:.24,numberOfChannels:1,getChannelData:()=>data};
}
function pendingWood(){
 const jobs=[];return {jobs,loader:(url,context,{signal})=>new Promise((resolve,reject)=>jobs.push({url,context,signal,resolve,reject})),finish:()=>jobs.forEach((job,index)=>job.resolve(woodBuffer(index)))};
}

test('wood loads once without blocking startup, and uses synthesis until all samples decode',async()=>{
 const pending=pendingWood(),h=harness(new FakeContext(),{sampleLoader:pending.loader});h.audio.setVolumes(0,.65);
 assert.deepEqual(await h.audio.whenWoodReady(),{state:'unloaded',count:0});assert.equal(pending.jobs.length,0);
 await h.audio.setEnabled(true);assert.equal(pending.jobs.length,5);assert.equal(h.audio.getStatus().woodSampleState,'loading');
 assert.equal(h.audio.play('footstep',{surface:'wood'}),true);assert.equal(h.audio.getStatus().woodSampleSource,'synth');assert.equal(h.context.sources.length,2);
 await h.audio.setEnabled(false);await h.audio.setEnabled(true);assert.equal(pending.jobs.length,5,'re-enabling never starts a second download');
 const before=h.context.sources.length;pending.finish();assert.deepEqual(await h.audio.whenWoodReady(),{state:'ready',count:5});assert.equal(h.context.sources.length,before,'decoding cannot schedule a sound');
 h.context.currentTime+=.2;assert.equal(h.audio.play('footstep',{surface:'wood'}),true);assert.equal(h.context.sources.length,before+1);assert.equal(h.audio.getStatus().woodSampleSource,'sample');
 for(let i=0;i<5;i++){h.context.currentTime+=.2;h.audio.play('footstep');}assert.equal(pending.jobs.length,5);await h.audio.dispose();
});

test('default sample loader fetches each self-hosted file once and decodes it in the active context',async()=>{
 const context=new FakeContext(),requests=[],decoded=[];
 context.decodeAudioData=async bytes=>{decoded.push(bytes);return woodBuffer(decoded.length-1);};
 const h=harness(context,{sampleLoader:undefined,fetcher:async(url,options)=>{requests.push({url,options});return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}});h.audio.setVolumes(0,.6);
 await h.audio.setEnabled(true);assert.deepEqual(await h.audio.whenWoodReady(),{state:'ready',count:5});
 assert.deepEqual(requests.map(request=>request.url),Array.from({length:5},(_,index)=>`/assets/audio/wood-00${index}.ogg`));assert.equal(decoded.length,5);
 for(const request of requests){assert.equal(request.options.cache,'force-cache');assert.equal(request.options.signal.aborted,false);}
 await h.audio.setEnabled(false);await h.audio.setEnabled(true);assert.equal(requests.length,5);await h.audio.dispose();
});

test('failed decode and the total load deadline leave a permanent playable synthetic fallback',async()=>{
 const context=new FakeContext();let requests=0;context.decodeAudioData=async()=>{throw Error('unsupported codec');};
 const h=harness(context,{sampleLoader:undefined,fetcher:async()=>{requests++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}});h.audio.setVolumes(0,.65);
 await h.audio.setEnabled(true);assert.deepEqual(await h.audio.whenWoodReady(),{state:'failed',count:0});assert.equal(requests,5);
 assert.equal(h.audio.play('footstep'),true);assert.equal(h.audio.getStatus().woodSampleSource,'synth');await h.audio.setEnabled(false);await h.audio.setEnabled(true);assert.equal(requests,5);await h.audio.dispose();
 const pending=pendingWood(),timed=harness(new FakeContext(),{sampleLoader:pending.loader,sampleTimeoutMs:10});timed.audio.setVolumes(0,.65);await timed.audio.setEnabled(true);
 assert.deepEqual(await timed.audio.whenWoodReady(),{state:'failed',count:0});assert.ok(pending.jobs.every(job=>job.signal.aborted));assert.equal(timed.audio.play('footstep'),true);
 pending.finish();await Promise.resolve();assert.equal(timed.audio.getStatus().woodSampleCount,0,'late decode cannot undo timeout fallback');await timed.audio.dispose();
});

test('finishing sample downloads while muted or hidden never resumes or schedules audio',async()=>{
 for(const mode of ['mute','hidden','zero']){
  const pending=pendingWood(),h=harness(new FakeContext(),{sampleLoader:pending.loader});h.audio.setVolumes(0,.65);await h.audio.setEnabled(true);
  if(mode==='mute')await h.audio.setEnabled(false);else if(mode==='hidden')await h.audio.setHidden(true);else h.audio.setVolumes(0,0);
  const resumes=h.context.resumeCalls;pending.finish();assert.deepEqual(await h.audio.whenWoodReady(),{state:'ready',count:5});
  assert.equal(h.context.resumeCalls,resumes);assert.equal(h.context.sources.length,0);assert.equal(h.audio.getStatus().activeVoices,0);assert.equal(h.audio.play('woodWalkPreview'),false);
  if(mode==='mute')await h.audio.setEnabled(true);else if(mode==='hidden')await h.audio.setHidden(false);else h.audio.setVolumes(0,.65);
  assert.equal(h.context.sources.length,0,'re-enabling does not replay delayed footsteps');assert.equal(h.audio.play('footstep'),true);assert.equal(h.audio.getStatus().woodSampleSource,'sample');await h.audio.dispose();
 }
});

test('disposing aborts pending sample work promptly and ignores any late decoded buffers',async()=>{
 const pending=pendingWood(),h=harness(new FakeContext(),{sampleLoader:pending.loader});h.audio.setVolumes(0,.65);await h.audio.setEnabled(true);const ready=h.audio.whenWoodReady();
 await h.audio.dispose();assert.deepEqual(await ready,{state:'disposed',count:0});assert.ok(pending.jobs.every(job=>job.signal.aborted));
 pending.finish();await Promise.resolve();await Promise.resolve();assert.equal(h.audio.getStatus().woodSampleState,'disposed');assert.equal(h.audio.getStatus().woodSampleCount,0);assert.equal(h.context.sources.length,0);assert.equal(h.audio.play('footstep'),false);assert.equal(await h.audio.setEnabled(true),false);
});

test('recorded wood keeps its attack, varies all five contacts without repeats, and distinguishes run and crouch',async()=>{
 let choice=.5;const h=harness(new FakeContext(),{sampleLoader:async url=>woodBuffer(Number(url.match(/(\d+)\.ogg$/)[1])),random:()=>choice});h.audio.setVolumes(0,.65);await h.audio.setEnabled(true);await h.audio.whenWoodReady();
 const variants=[],steps=[];
 for(let i=0;i<25;i++){choice=(i%5)/5+.05;h.context.currentTime+=.2;assert.equal(h.audio.play('footstep',{surface:'wood'}),true);variants.push(h.audio.getStatus().woodSampleVariant);steps.push(h.context.sources.at(-1));}
 assert.equal(new Set(variants).size,5);assert.ok(variants.every((variant,index)=>!index||variant!==variants[index-1]));assert.ok(steps.every(source=>source.buffer!==h.context.buffers[0]));
 choice=.5;const modes={};for(const mode of ['walk','run','crouch']){h.context.currentTime+=.2;h.audio.play('footstep',{surface:'wood',mode,stair:true});const source=h.context.sources.at(-1),envelope=source.connections[0];modes[mode]={rate:source.playbackRate.events[0].value,gain:envelope.gain.events[0].value};
  assert.equal(source.playbackRate.events[0].time,source.starts[0]);assert.equal(envelope.gain.events[0].time,source.starts[0]);assert.ok(envelope.gain.events[0].value>.0001,'contact begins at full gain instead of swallowing the recording attack');assert.ok(!envelope.gain.events.some(event=>event.kind==='ramp'));assert.equal(envelope.gain.events.at(-1).kind,'linear');assert.equal(envelope.gain.events.at(-1).value,0);
  assert.ok(envelope.gain.events[0].value*source.buffer.getChannelData(0)[0]<=.26,'the decoded peak keeps per-source headroom');
 }
 assert.equal(modes.walk.rate,1);assert.equal(modes.run.rate,1.1);assert.equal(modes.crouch.rate,.96);assert.ok(modes.run.gain>modes.walk.gain);assert.ok(modes.crouch.gain<modes.walk.gain*.5);
 assert.ok(h.audio.getStatus().activeVoices<=24);for(const source of h.context.sources)source.finish();assert.equal(h.audio.getStatus().activeVoices,0);assert.ok(h.context.sources.every(source=>source.disconnected));await h.audio.dispose();
});

test('wood auditions use the live footstep path and shared walking versus running cadence',async()=>{
 const h=harness(new FakeContext(),{sampleLoader:async()=>woodBuffer()});h.audio.setVolumes(0,.65);await h.audio.setEnabled(true);await h.audio.whenWoodReady();
 for(const [name,mode,count] of [['woodWalkPreview','walk',4],['woodRunPreview','run',8]]){
  h.context.currentTime+=4;const before=h.context.sources.length;assert.equal(h.audio.play(name),true);const sources=h.context.sources.slice(before);assert.equal(sources.length,count);
  for(let i=0;i<sources.length;i++){assert.equal(sources[i].buffer.numberOfChannels,1);assert.ok(Math.abs(sources[i].starts[0]-sources[0].starts[0]-i*stepInterval(mode))<1e-9);}
  assert.ok(sources.at(-1).starts[0]-sources[0].starts[0]<2.3);assert.equal(h.audio.getStatus().lastEffect,name);
 }
 assert.ok(stepInterval('run')<stepInterval('walk')*.6);assert.ok(h.audio.getStatus().activeVoices<=24);await h.audio.setHidden(true);assert.equal(h.audio.getStatus().activeVoices,0);await h.audio.dispose();
});

test('a recorded contact retains FX routing and lookahead even when source allocation advances the clock',async()=>{
 const context=new FakeContext(),h=harness(context,{sampleLoader:async()=>woodBuffer()});h.audio.setVolumes(0,.4);await h.audio.setEnabled(true);await h.audio.whenWoodReady();
 for(const method of ['createBufferSource','createGain']){const original=context[method].bind(context);context[method]=()=>{context.currentTime+=.15;return original();};}
 assert.equal(h.audio.play('footstep',{surface:'wood',mode:'run'}),true);const source=context.sources.at(-1),envelope=source.connections[0],fx=context.nodes.filter(node=>node.kind==='gain')[2];
 assert.deepEqual(envelope.connections,[fx]);assert.equal(fx.gain.value,.4);assert.ok(source.starts[0]>=context.currentTime+.02&&source.starts[0]<=context.currentTime+.04);assert.equal(source.playbackRate.events[0].time,source.starts[0]);assert.equal(envelope.gain.events[0].time,source.starts[0]);assert.ok(source.stops[0]>context.currentTime);assert.ok(h.audio.getStatus().maxScheduleLateMs>=300);
 h.audio.setVolumes(0,0);assert.equal(h.audio.getStatus().activeVoices,0);assert.equal(source.stops.at(-1),context.currentTime);assert.ok(source.disconnected&&envelope.disconnected);await h.audio.dispose();
});

test('preview cancellation stops queued audition voices and permits immediate retests while preserving game sounds',async()=>{
 const h=harness(new FakeContext(),{sampleLoader:async()=>woodBuffer()});await h.audio.setEnabled(true);await h.audio.whenWoodReady();
 const music=[...h.context.sources];assert.ok(music.length>0);assert.equal(h.audio.play('bagOpen'),true);const bag=h.context.sources.slice(music.length);assert.equal(bag.length,2);
 const before=h.context.sources.length;assert.equal(h.audio.play('woodWalkPreview'),true);const walking=h.context.sources.slice(before);assert.equal(walking.length,4);assert.ok(walking.some(source=>source.starts[0]>h.context.currentTime+.5));
 assert.equal(h.audio.stopPreview(),4);for(const source of walking){assert.equal(source.stops.at(-1),h.context.currentTime);assert.ok(source.disconnected);}
 for(const source of [...music,...bag]){assert.equal(source.disconnected,false);assert.notEqual(source.stops.at(-1),h.context.currentTime);}assert.equal(h.intervals.size,1);assert.equal(h.audio.play('bagOpen'),false,'normal gameplay cooldown remains intact');
 assert.equal(h.audio.play('woodWalkPreview'),true,'cancel clears the walking audition cooldown');assert.equal(h.audio.stopPreview(),4);
 assert.equal(h.audio.play('woodRunPreview'),true);assert.equal(h.audio.stopPreview(),8);assert.equal(h.audio.play('woodRunPreview'),true,'running audition can be restarted immediately');h.audio.stopPreview();
 const fullBefore=h.context.sources.length;assert.equal(h.audio.play('preview'),true);const full=h.context.sources.slice(fullBefore);assert.ok(full.length>8);assert.equal(h.audio.stopPreview(),full.length,'nested preview bag and success cues belong to the top-level audition');assert.ok(full.every(source=>source.disconnected));assert.equal(h.audio.play('preview'),true);h.audio.stopPreview();
 assert.equal(h.audio.getStatus().activeVoices,music.length+bag.length);assert.equal(h.audio.stopPreview(),0);await h.audio.dispose();
});
