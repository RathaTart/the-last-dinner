// Keep both loops alive. Interrupted fades/reset() used to restart the stride
// on quick direction changes; explicit weights blend without losing its phase.
export function turnToward(current,target,dt){
 const difference=Math.atan2(Math.sin(target-current),Math.cos(target-current));
 return current+difference*(1-Math.exp(-24*Math.max(0,dt)));
}
export function createLocomotionBlend(actions){
 const idle=actions.idle,walk=actions.walk,sprint=actions.sprint;let weight=0,runWeight=0;
 idle?.setEffectiveWeight(1).play();walk?.setEffectiveWeight(0).play();sprint?.setEffectiveWeight(0).play();
 return function update(walking,dt,mode='walk'){
  const target=walking?1:0;weight+=(target-weight)*(1-Math.exp(-18*Math.max(0,dt)));
  if(Math.abs(target-weight)<.001)weight=target;
  runWeight+=((walking&&mode==='run'&&sprint?1:0)-runWeight)*(1-Math.exp(-18*Math.max(0,dt)));
  if(runWeight<.001)runWeight=0;
  idle?.setEffectiveWeight(1-weight);walk?.setEffectiveWeight(weight*(1-runWeight));sprint?.setEffectiveWeight(weight*runWeight);
  walk?.setEffectiveTimeScale(mode==='crouch'?.52:1);
  return weight;
 };
}
import {Quaternion,Vector3} from 'three';

// The CC0 actor has separate rigid limbs. Layer a lowered, bent posture after
// the clip mixer, then restore before its next update to avoid accumulating it.
export function createCrouchPose(nodes){
 const xAxis=new Vector3(1,0,0);let snapshots=[];
 return {
  restore(){for(const {node,position,quaternion}of snapshots){node.position.copy(position);node.quaternion.copy(quaternion);}snapshots=[];},
  apply(weight){if(weight<.001)return;for(const node of nodes){snapshots.push({node,position:node.position.clone(),quaternion:node.quaternion.clone()});const leg=node.name.startsWith('leg'),torso=node.name==='torso',arm=node.name.startsWith('arm');node.position.y-=weight*(leg?.16:torso?.55:0);node.position.z+=weight*(leg?.03:torso?.1:.18);node.quaternion.multiply(new Quaternion().setFromAxisAngle(xAxis,weight*(leg?-.6:torso?.32:arm?-.18:-.12)));}}
 };
}
