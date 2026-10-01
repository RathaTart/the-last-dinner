// Keep both loops alive. Interrupted fades/reset() used to restart the stride
// on quick direction changes; explicit weights blend without losing its phase.
export function turnToward(current,target,dt){
 const difference=Math.atan2(Math.sin(target-current),Math.cos(target-current));
 return current+difference*(1-Math.exp(-24*Math.max(0,dt)));
}
export function createLocomotionBlend(actions){
 const idle=actions.idle,walk=actions.walk;let weight=0;
 idle?.setEffectiveWeight(1).play();walk?.setEffectiveWeight(0).play();
 return function update(walking,dt){
  const target=walking?1:0;weight+=(target-weight)*(1-Math.exp(-18*Math.max(0,dt)));
  if(Math.abs(target-weight)<.001)weight=target;
  idle?.setEffectiveWeight(1-weight);walk?.setEffectiveWeight(weight);
  return weight;
 };
}
