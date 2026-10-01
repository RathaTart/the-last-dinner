// Keep the user's sound intent separate from the browser's actual audio state.
// The caller owns DOM listeners and any target-specific gesture exclusions.
export function createSoundControls({
 audio,
 getVolumes=()=>({music:.45,effects:.65}),
 getPreference=()=>true,
 persistPreference=()=>{},
 onChange=()=>{},
 onError=()=>{}
}={}){
 let requested=!!audio.getStatus().enabled,pending=false,generation=0;
 function getStatus(){
  const status=audio.getStatus();
  return {ready:!!status.enabled&&status.state==='running',pending,requested};
 }
 function publish(){const status=getStatus();onChange(status);return status;}
 async function request(action){
  const current=++generation;pending=true;publish();
  try{
   const result=await action();
   if(current!==generation)return false;
   pending=false;const status=publish();return !!result&&status.ready;
  }catch(error){
   if(current!==generation)return false;
   pending=false;publish();onError(error);return false;
  }
 }
 function enable(value,{persist=false,volumes=getVolumes()}={}){
  const target=!!value;requested=target;
  return request(()=>{
   if(persist)persistPreference(target);
   audio.setVolumes(volumes.music,volumes.effects);
   return audio.setEnabled(target);
  });
 }
 async function unlock(event){
  if(!event?.isTrusted||event.repeat||event.ctrlKey||event.altKey||event.metaKey||
     getPreference()===false||audio.getStatus().state==='running')return false;
  // A blocked resume may remain pending until a later genuine user gesture.
  return enable(true);
 }
 function setHidden(value){return request(()=>audio.setHidden(!!value));}
 return {enable,unlock,setHidden,getStatus};
}
