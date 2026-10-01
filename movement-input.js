export const MOVEMENT_CODES=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
export const RUN_CODES=['ShiftLeft','ShiftRight'];
export function inputEventTime(event){return Number.isFinite(event.timeStamp)?event.timeStamp>1e12?event.timeStamp-performance.timeOrigin:event.timeStamp:undefined;}

// Integrate input between render frames, including a tap whose down/up both
// arrive before the next frame. Repeats never add distance or restart a walk.
export function createMovementInput(clock=()=>performance.now()){
 const held=new Map();let crouch=false,changes=[],last=clock(),sampled={horizontal:0,forward:0,run:false,crouch:false};
 function axes(){const codes=new Set(held.values());return {horizontal:Number(codes.has('KeyD')||codes.has('ArrowRight'))-Number(codes.has('KeyA')||codes.has('ArrowLeft')),forward:Number(codes.has('KeyW')||codes.has('ArrowUp'))-Number(codes.has('KeyS')||codes.has('ArrowDown'))};}
 function actions(){return {run:[...held.values()].some(code=>RUN_CODES.includes(code)),crouch};}
 function record(now){changes.push({time:Math.max(last,now),...axes(),...actions()});}
 return {
  set(code,source,down,now=clock()){
   if(!MOVEMENT_CODES.includes(code)&&!RUN_CODES.includes(code))return false;
   const token=source+':'+code;
   if(down){if(held.has(token))return true;held.set(token,code);}
   else if(!held.delete(token))return true;
   record(now);return true;
  },
  releaseSource(source,now=clock()){
   let changed=false;for(const token of held.keys())if(token.startsWith(source+':')){held.delete(token);changed=true;}
   if(changed)record(now);
  },
  read(now=clock()){
   now=Math.max(last,now);let cursor=Math.max(last,now-100),state=sampled;const segments=[];
   for(const change of changes){const time=Math.min(now,change.time);if(time>cursor)segments.push({...state,dt:(time-cursor)/1000});state={horizontal:change.horizontal,forward:change.forward,run:change.run,crouch:change.crouch};cursor=Math.max(cursor,time);}
   if(now>cursor)segments.push({...state,dt:(now-cursor)/1000});
   changes=[];sampled=state;last=now;return segments;
  },
  axes,
  actions,
  toggleCrouch(now=clock()){crouch=!crouch;record(now);return crouch;},
  clear(now=clock(),{resetCrouch=false}={}){held.clear();if(resetCrouch)crouch=false;changes=[];sampled={horizontal:0,forward:0,run:false,crouch};last=now;}
 };
}

export function bindKeyboardMovement(input,{keyboardTarget,lifecycleTarget,canControl,onMovementIntent=()=>{},onInteract=()=>{},onReset=()=>{},onEscape=()=>{},signal}){
 const options={signal,capture:true},editable=target=>!!target?.closest?.('input,textarea,select,[contenteditable="true"]');
 keyboardTarget.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&!e.repeat)onEscape();
  if(editable(e.target)){input.clear();return;}
  if(MOVEMENT_CODES.includes(e.code)){
   if(!e.repeat)onMovementIntent();
   if(!canControl()){input.clear();return;}
   e.preventDefault();
   // A held key cleared by a dialog/blur requires a fresh press afterward.
   if(!e.repeat)input.set(e.code,'keyboard',true,inputEventTime(e));
  }else if(!e.repeat&&canControl()){
   if(RUN_CODES.includes(e.code)){e.preventDefault();input.set(e.code,'keyboard',true,inputEventTime(e));}
   else if(e.code==='KeyC'){e.preventDefault();input.toggleCrouch(inputEventTime(e));}
   else if(e.code==='KeyE'){e.preventDefault();onInteract();}
   else if(e.code==='KeyR'){e.preventDefault();onReset();}
  }
 },options);
 keyboardTarget.addEventListener('keyup',e=>input.set(e.code,'keyboard',false,inputEventTime(e)),options);
 keyboardTarget.addEventListener('focusin',e=>{if(editable(e.target))input.clear();},options);
 keyboardTarget.addEventListener('visibilitychange',()=>{if(keyboardTarget.hidden)input.clear();},options);
 lifecycleTarget.addEventListener('blur',()=>input.clear(),options);
}
