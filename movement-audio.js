import {roomLayouts} from './mansion-layout.js';
export const STEP_STRIDES=Object.freeze({walk:.65,run:1.05,crouch:.45});
// These are the aligned, room-centred rugs rendered by buildMansion's rug()
// calls, including their actual visible border. Stairs always override them.
export const RUG_SIZES=Object.freeze({foyer:[2.65,2.3],dining:[6.6,5.1],library:[6.2,7.5],bedroom:[5.5,6],grandHall:[1.65,9.6],landing:[1.55,11.4],gallery:[4.3,14.8]});
export function movementSurface({room,floor,staircase,position}={}){
 if(staircase)return staircase==='service'?'stone':'wood';
 const rug=RUG_SIZES[room],centre=roomLayouts[room]?.pos;
 if(rug&&centre&&position&&Math.abs(position.x-centre[0])<=rug[0]/2&&Math.abs(position.z-centre[1])<=rug[1]/2)return 'rug';
 return floor==='basement'||room==='foyer'||room==='kitchen'?'stone':'wood';
}

// Game events only: callers own audio devices, volumes and provider failures.
// Stride phase follows actual 3D travel, rather than held keys or wall time.
export function createMovementAudio(onSound=()=>{},{doorways=[],firstStepDistance=.15,maxPerFrame=2}={}){
 let firstDistance=0,phase=0,started=false,emitted=0,crouched=false;
 const clearStride=()=>{firstDistance=0;phase=0;started=false;};
 const dispatch=(name,options)=>{try{onSound(name,options);}catch{/* Optional effects must never interrupt movement. */}};
 const emitStep=options=>{if(emitted<maxPerFrame){dispatch('footstep',options);emitted++;}};
 return {
  beginFrame(){emitted=0;},
  reset({crouched:stance=crouched}={}){clearStride();crouched=!!stance;emitted=0;},
  stance(value,{allowed=true}={}){const next=!!value,changed=next!==crouched;crouched=next;if(changed&&allowed)dispatch('stance',{crouched:next});return changed&&allowed;},
  move({distance=0,mode='walk',surface='wood',stair=false,input=true,allowed=true}={}){
   if(!allowed||!input||!Number.isFinite(distance)||distance<=1e-7){clearStride();return 0;}
   const options={surface:['wood','stone','rug'].includes(surface)?surface:'wood',mode:Object.hasOwn(STEP_STRIDES,mode)?mode:'walk',stair:!!stair},before=emitted;
   let remaining=distance;
   if(!started){
    const needed=firstStepDistance-firstDistance;
    if(remaining+1e-10<needed){firstDistance+=remaining;return 0;}
    remaining=Math.max(0,remaining-needed);firstDistance=0;started=true;emitStep(options);
   }
   // Store a dimensionless phase so changing speed/stance cannot create a
   // step without further travel or erase the current stride halfway through.
   phase+=remaining/STEP_STRIDES[options.mode];
   const count=Math.floor(phase+1e-10);phase=Math.max(0,phase-count);
   const available=Math.min(count,Math.max(0,maxPerFrame-emitted));for(let i=0;i<available;i++)emitStep(options);
   return emitted-before;
  },
  crossDoor({from,to,floor,previousFloor=floor,position,stair=false,moved=false,allowed=true}={}){
   if(!allowed||!moved||stair||from===to||!from||!to||floor!==previousFloor||!position)return false;
   const door=doorways.find(d=>!d.stairOpening&&d.floor===floor&&d.rooms.length===2&&d.rooms.includes(from)&&d.rooms.includes(to)&&
    Math.abs((d.axis==='x'?position.z:position.x)-d.pos[d.axis==='x'?1:0])<=.5&&
    Math.abs((d.axis==='x'?position.x:position.z)-d.pos[d.axis==='x'?0:1])<=d.width/2);
   if(!door)return false;
   dispatch('door',{id:door.id,from,to,floor});return true;
  }
 };
}
