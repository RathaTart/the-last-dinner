// Original Web Audio score and house sounds. No recordings, remote assets or tracking.
export function createAudio({
 contextFactory=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),
 isHidden=()=>!!globalThis.document?.hidden,
 scheduleInterval=(fn,ms)=>globalThis.setInterval(fn,ms),
 cancelInterval=id=>globalThis.clearInterval(id),
 random=Math.random
}={}){
 const MAX_VOICES=24,melody=[196,246.94,293.66,246.94,174.61,220,261.63,220,164.81,196,246.94,196,146.83,196,220,0];
 let ctx,master,music,fx,limiter,noiseBuffer,timer=null,enabled=false,disposed=false,hiddenOverride=false;
 let generation=0,step=0,memory=false,ending=false,musicVolume=.45,effectsVolume=.65,played=0,lastEffect=null;
 const voices=new Set(),lastPlayed=new Map();
 const hidden=()=>hiddenOverride||isHidden(),canRun=()=>enabled&&!disposed&&!hidden();
 const clamp=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
 function busLevel(bus){return bus===music?musicVolume:effectsVolume;}
 function setGain(node,value){if(!node||!ctx)return;node.gain.cancelScheduledValues(ctx.currentTime);node.gain.setValueAtTime(value,ctx.currentTime);}
 function cleanup(voice){if(voice.cleaned)return;voice.cleaned=true;voices.delete(voice);voice.source.onended=null;for(const node of voice.nodes){try{node.disconnect();}catch{}}}
 function stopVoice(voice){try{voice.source.stop(ctx.currentTime);}catch{}cleanup(voice);}
 function stopVoices(bus){for(const voice of [...voices])if(!bus||voice.bus===bus)stopVoice(voice);}
 function stopTimer(){if(timer!==null){cancelInterval(timer);timer=null;}}
 function silence(){stopTimer();setGain(master,0);stopVoices();lastPlayed.clear();}
 function initialize(){
  ctx=contextFactory();master=ctx.createGain();music=ctx.createGain();fx=ctx.createGain();limiter=ctx.createDynamicsCompressor();
  master.gain.value=0;music.gain.value=musicVolume;fx.gain.value=effectsVolume;
  limiter.threshold.value=-14;limiter.knee.value=8;limiter.ratio.value=4;limiter.attack.value=.003;limiter.release.value=.18;
  music.connect(master);fx.connect(master);master.connect(limiter);limiter.connect(ctx.destination);
  noiseBuffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.8),ctx.sampleRate);
  const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(random()*2-1)*.68;
 }
 function register(source,nodes,bus,when,duration,volume,attack=.008){
  if(disposed||busLevel(bus)<=0){for(const node of nodes)node.disconnect();return false;}
  while(voices.size>=MAX_VOICES){const oldest=[...voices].find(v=>v.bus===music)||voices.values().next().value;stopVoice(oldest);}
  const gain=ctx.createGain();source.connect(nodes[1]||gain);if(nodes[1])nodes.at(-1).connect(gain);gain.connect(bus);
  gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),when+Math.min(attack,duration*.3));gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
  const voice={source,nodes:[...nodes,gain],bus,cleaned:false};voices.add(voice);source.onended=()=>cleanup(voice);
  source.start(when);source.stop(when+duration+.025);return true;
 }
 function tone(frequency,when,duration,volume=.025,type='sine',bus=fx,endFrequency=frequency){
  if(!frequency||!ctx||busLevel(bus)<=0)return false;
  const source=ctx.createOscillator();source.type=type;source.frequency.setValueAtTime(frequency,when);
  if(endFrequency!==frequency)source.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),when+duration);
  return register(source,[source],bus,when,duration,volume,.018);
 }
 function noise(when,duration,volume,frequency=700,type='lowpass',q=.7){
  if(!ctx||effectsVolume<=0)return false;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();source.buffer=noiseBuffer;
  // The same short buffer serves every transient; the envelope ends before its tail.
  filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;
  return register(source,[source,filter],fx,when,Math.min(duration,.75),volume,.012);
 }
 function footstep(at,{surface='wood',mode='walk',stair=false}={}){
  const scale=mode==='crouch'?.34:mode==='run'?1.2:1,pitch=.97+random()*.06;
  if(surface==='rug'){tone(88*pitch,at,.09,.017*scale,'sine',fx,48);noise(at,.08,.013*scale,450);}
  else if(surface==='stone'){tone(94*pitch,at,.085,.026*scale,'sine',fx,46);noise(at,.055,.033*scale,1250);}
  else{tone(142*pitch,at,.1,.034*scale,'triangle',fx,70);noise(at,.06,.024*scale,620,'bandpass',.8);if(stair)tone(215*pitch,at+.035,.16,.009*scale,'triangle',fx,145);}
 }
 function cue(name,at,options={}){
  switch(name){
   case 'footstep':footstep(at,options);break;
   case 'bagOpen':noise(at,.2,.031,840,'bandpass',.6);tone(110,at,.12,.012,'triangle',fx,170);break;
   case 'bagClose':noise(at,.14,.027,650,'bandpass',.7);tone(120,at+.015,.11,.017,'triangle',fx,66);break;
   case 'inspect':noise(at,.19,.032,1550,'bandpass',.7);tone(890,at+.035,.06,.006,'sine');break;
   case 'success':[329.63,493.88,659.25].forEach((f,i)=>tone(f,at+i*.085,.6,.023-i*.003));break;
   case 'error':tone(143,at,.23,.032,'sine',fx,98);noise(at,.09,.008,330);break;
   case 'door':tone(162,at,.18,.021,'triangle',fx,115);noise(at+.025,.12,.011,730,'bandpass',.6);break;
   case 'secretUnlock':tone(92,at,.25,.049,'triangle',fx,43);noise(at,.17,.038,370,'bandpass',.9);noise(at+.17,.58,.022,250);break;
   case 'memoryEnter':tone(110,at,1.1,.026,'sine',fx,82);noise(at+.045,.7,.024,650,'bandpass',.5);tone(330,at+.15,.85,.008,'sine',fx,440);break;
   case 'memoryExit':tone(330,at,.5,.019,'sine',fx,247);noise(at,.26,.019,950,'bandpass',.6);break;
   case 'memoryStep':tone(392+clamp(options.step,0,2,0)*49,at,.14,.015);noise(at,.06,.007,1050);break;
   case 'stance':noise(at,.12,.015,options.crouched?560:740,'bandpass',.6);break;
   case 'intro':{
    const shot=Math.round(clamp(options.step,0,3,0));
    if(shot===0){noise(at,.72,.012,1200);tone(55,at,1.5,.021);}
    else if(shot===1){tone(174.61,at,1.8,.021);tone(349.23,at+.08,1.4,.008);}
    else if(shot===2){noise(at,.72,.019,920,'bandpass',.5);tone(98,at,1.2,.013,'sine',fx,110);}
    else{for(const delay of [0,.16,.32,.8,1.28,1.44]){tone(94,at+delay,.09,.022,'triangle',fx,52);noise(at+delay,.04,.013,380);}}
    break;
   }
   case 'ending':{
    const notes=options.id==='distance'?[110,116.54]:options.id==='letter'?[146.83,220]:[164.81,246.94,329.63];
    notes.forEach((f,i)=>tone(f,at+i*.18,1.5,.021-i*.003));break;
   }
   case 'preview':
    footstep(at,{surface:'wood'});footstep(at+.33,{surface:'stone'});footstep(at+.66,{surface:'rug',mode:'crouch'});
    cue('bagOpen',at+.94);cue('memoryEnter',at+1.3);cue('success',at+2.35);break;
   default:return false;
  }
  return true;
 }
 function tick(){
  if(!canRun()||ctx?.state!=='running'||musicVolume<=0)return;
  const now=ctx.currentTime,note=melody[step++%melody.length]*(memory?.75:ending?1.12:1);
  tone(note,now,1.6,.018,'sine',music);if(note&&step%4===1){tone(note/2,now,2.8,.008,'sine',music);tone(note*1.5,now+.12,1.8,.004,'sine',music);}
 }
 function startMusic(){if(timer!==null||musicVolume<=0)return;timer=scheduleInterval(tick,900);tick();}
 async function reconcile(request){
  if(disposed)return false;
  if(!ctx){
   if(!canRun())return false;
   try{initialize();}catch(error){
    enabled=false;generation++;silence();for(const node of [music,fx,master,limiter]){try{node?.disconnect();}catch{}}
    const failedContext=ctx;ctx=master=music=fx=limiter=noiseBuffer=undefined;try{await failedContext?.close();}catch{}throw error;
   }
  }
  const active=canRun();if(!active)silence();
  try{await (active?ctx.resume():ctx.suspend());}
  catch(error){if(disposed)return false;if(request!==generation)return reconcile(generation);enabled=false;generation++;silence();throw error;}
  if(disposed)return false;
  // A completed old resume/suspend must not undo the latest mute or visibility request.
  if(request!==generation||active!==canRun())return reconcile(generation);
  if(active&&ctx.state==='running'){setGain(master,.68);startMusic();return true;}
  silence();return false;
 }
 const cooldown={footstep:.08,door:.35,bagOpen:.12,bagClose:.12,inspect:.12,success:.12,error:.12,secretUnlock:.5,memoryEnter:.3,memoryExit:.2,memoryStep:.05,stance:.1,intro:.12,ending:.6,preview:3};
 function play(name,options={}){
  if(!Object.hasOwn(cooldown,name)||!canRun()||ctx?.state!=='running'||effectsVolume<=0)return false;
  const now=ctx.currentTime;if(now-(lastPlayed.get(name)??-Infinity)<cooldown[name])return false;
  if(!cue(name,now,options||{}))return false;lastPlayed.set(name,now);played++;lastEffect=name;return true;
 }
 return {
  async setEnabled(value){if(disposed)return false;enabled=!!value;return reconcile(++generation);},
  async setHidden(value){if(disposed)return false;hiddenOverride=!!value;return reconcile(++generation);},
  setVolumes(m,s){musicVolume=clamp(m,0,1,musicVolume);effectsVolume=clamp(s,0,1,effectsVolume);setGain(music,musicVolume);setGain(fx,effectsVolume);if(musicVolume===0){stopTimer();stopVoices(music);}else if(canRun()&&ctx?.state==='running')startMusic();if(effectsVolume===0)stopVoices(fx);},
  setMemory(value){memory=!!value;},setEnding(value){ending=!!value;},
  play,chime:()=>play('success'),
  getStatus(){return {enabled:enabled&&!disposed,state:disposed?'closed':ctx?.state??'uninitialized',played,lastEffect,activeVoices:voices.size,musicVolume,effectsVolume};},
  async dispose(){if(disposed)return;disposed=true;enabled=false;generation++;silence();for(const node of [music,fx,master,limiter]){try{node?.disconnect();}catch{}}noiseBuffer=null;try{await ctx?.close();}catch{}}
 };
}
