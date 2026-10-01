import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundControls} from '../sound-controls.js';

function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function harness({enabled=false,state='uninitialized',preference=true}={}){
 const changes=[],errors=[],persisted=[],enables=[],visibility=[],volumes=[];
 const engine={enabled,state},requests=[],hiddenRequests=[];
 const audio={
  getStatus:()=>({...engine}),
  setVolumes:(music,effects)=>volumes.push({music,effects}),
  setEnabled(value){enables.push(value);engine.enabled=value;const d=deferred();requests.push(d);return d.promise;},
  setHidden(value){visibility.push(value);const d=deferred();hiddenRequests.push(d);return d.promise;}
 };
 const controls=createSoundControls({audio,getVolumes:()=>({music:.3,effects:.8}),getPreference:()=>preference,
  persistPreference:value=>{persisted.push(value);preference=value;},onChange:status=>changes.push(status),onError:error=>errors.push(error)});
 return {controls,engine,changes,errors,persisted,enables,visibility,volumes,requests,hiddenRequests,
  setPreference:value=>{preference=value;},finish(index,state,result=state==='running'){engine.state=state;requests[index].resolve(result);},
  finishHidden(index,state,result=state==='running'){engine.state=state;hiddenRequests[index].resolve(result);}};
}
const gesture=(extra={})=>({isTrusted:true,...extra});

test('initial readiness and requested state follow the engine, not default preference',()=>{
 const silent=harness();assert.deepEqual(silent.controls.getStatus(),{ready:false,pending:false,requested:false});
 const suspended=harness({enabled:true,state:'suspended'});assert.deepEqual(suspended.controls.getStatus(),{ready:false,pending:false,requested:true});
 const running=harness({enabled:true,state:'running',preference:false});assert.deepEqual(running.controls.getStatus(),{ready:true,pending:false,requested:true});
 running.engine.state='interrupted';assert.equal(running.controls.getStatus().ready,false,'external interruption is noticed without a previous UI update');
 running.engine.enabled=false;running.engine.state='running';assert.equal(running.controls.getStatus().ready,false,'running alone does not mean enabled');
});

test('a resume resolving suspended cannot report ready and the next gesture can retry',async()=>{
 const h=harness(),first=h.controls.enable(true);
 assert.deepEqual(h.controls.getStatus(),{ready:false,pending:true,requested:true});
 h.finish(0,'suspended',false);assert.equal(await first,false);
 assert.deepEqual(h.changes.at(-1),{ready:false,pending:false,requested:true});
 const retry=h.controls.unlock(gesture());assert.deepEqual(h.enables,[true,true]);
 h.finish(1,'running');assert.equal(await retry,true);assert.equal(h.controls.getStatus().ready,true);
});

test('a second trusted gesture can resume audio while the first attempt remains pending',async()=>{
 const h=harness(),first=h.controls.unlock(gesture());h.engine.state='suspended';
 const second=h.controls.unlock(gesture());assert.deepEqual(h.enables,[true,true]);
 h.finish(0,'suspended',false);assert.equal(await first,false);
 assert.equal(h.controls.getStatus().pending,true,'old completion must not clear the latest pending attempt');
 assert.equal(h.changes.length,2,'old completion must not publish');
 h.finish(1,'running');assert.equal(await second,true);assert.deepEqual(h.controls.getStatus(),{ready:true,pending:false,requested:true});
});

test('old enable completion cannot publish over a newer mute',async()=>{
 const h=harness(),old=h.controls.enable(true),mute=h.controls.enable(false,{persist:true});
 h.finish(1,'suspended',false);assert.equal(await mute,false);const count=h.changes.length;
 h.requests[0].resolve(true);assert.equal(await old,false);assert.equal(h.changes.length,count);
 assert.deepEqual(h.controls.getStatus(),{ready:false,pending:false,requested:false});assert.deepEqual(h.persisted,[false]);
});

test('old mute completion cannot publish over a newer enable',async()=>{
 const h=harness({enabled:true,state:'running'}),mute=h.controls.enable(false),enable=h.controls.enable(true);
 h.finish(1,'running');assert.equal(await enable,true);const count=h.changes.length;
 h.requests[0].resolve(false);assert.equal(await mute,false);assert.equal(h.changes.length,count);
 assert.deepEqual(h.controls.getStatus(),{ready:true,pending:false,requested:true});
});

test('visibility return recomputes actual readiness and permits a trusted recovery',async()=>{
 const h=harness({enabled:true,state:'running'}),hide=h.controls.setHidden(true);
 h.finishHidden(0,'suspended',false);assert.equal(await hide,false);
 assert.deepEqual(h.controls.getStatus(),{ready:false,pending:false,requested:true});
 const show=h.controls.setHidden(false);h.finishHidden(1,'suspended',false);assert.equal(await show,false);
 assert.equal(h.controls.getStatus().ready,false);assert.deepEqual(h.persisted,[]);
 const retry=h.controls.unlock(gesture());h.finish(0,'running');assert.equal(await retry,true);
 assert.deepEqual(h.visibility,[true,false]);
});

test('latest visibility operation owns pending state when an earlier enable finishes',async()=>{
 const h=harness(),enable=h.controls.enable(true),hide=h.controls.setHidden(true);
 h.finish(0,'suspended',false);assert.equal(await enable,false);assert.equal(h.controls.getStatus().pending,true);
 h.finishHidden(0,'suspended',false);assert.equal(await hide,false);assert.equal(h.controls.getStatus().pending,false);
 assert.deepEqual(h.persisted,[]);
});

test('stale errors cannot show an error or clear a newer pending request',async()=>{
 const h=harness(),old=h.controls.enable(true),latest=h.controls.unlock(gesture());
 h.requests[0].reject(new Error('old interrupted request'));assert.equal(await old,false);
 assert.deepEqual(h.errors,[]);assert.equal(h.controls.getStatus().pending,true);
 h.finish(1,'running');assert.equal(await latest,true);
});

test('current errors publish unavailable state without persisting a mute',async()=>{
 const h=harness(),enable=h.controls.enable(true);h.engine.enabled=false;
 const error=new Error('device unavailable');h.requests[0].reject(error);assert.equal(await enable,false);
 assert.deepEqual(h.errors,[error]);assert.deepEqual(h.persisted,[]);
 assert.deepEqual(h.changes.at(-1),{ready:false,pending:false,requested:true});
 const show=h.controls.setHidden(false);h.hiddenRequests[0].reject(new Error('resume failed'));assert.equal(await show,false);
 assert.equal(h.errors.length,2);assert.deepEqual(h.persisted,[]);
});

test('automatic unlock requires an authentic unmodified gesture and honors persisted mute',async()=>{
 const h=harness();
 for(const event of [undefined,{},gesture({isTrusted:false}),gesture({repeat:true}),gesture({ctrlKey:true}),gesture({altKey:true}),gesture({metaKey:true})])assert.equal(await h.controls.unlock(event),false);
 h.setPreference(false);assert.equal(await h.controls.unlock(gesture()),false);assert.deepEqual(h.enables,[]);
 const visible=h.controls.setHidden(false);h.finishHidden(0,'suspended',false);await visible;
 assert.deepEqual(h.enables,[],'visibility must not automatically enable muted audio');assert.deepEqual(h.persisted,[]);
 const explicit=h.controls.enable(true,{persist:true});h.finish(0,'running');assert.equal(await explicit,true);assert.deepEqual(h.persisted,[true]);
 assert.equal(await h.controls.unlock(gesture()),false,'a running context does not need another unlock');assert.deepEqual(h.enables,[true]);
});

test('preview can use live volume levels while later unlocks use saved levels',async()=>{
 const h=harness(),preview=h.controls.enable(true,{persist:true,volumes:{music:.7,effects:.9}});
 assert.deepEqual(h.volumes,[{music:.7,effects:.9}]);h.finish(0,'running');assert.equal(await preview,true);
 h.engine.state='interrupted';const retry=h.controls.unlock(gesture());h.finish(1,'running');await retry;
 assert.deepEqual(h.volumes,[{music:.7,effects:.9},{music:.3,effects:.8}]);assert.deepEqual(h.persisted,[true]);
});

test('operation return requires the engine readiness as well as its awaited Boolean',async()=>{
 const h=harness(),enable=h.controls.enable(true);h.finish(0,'suspended',true);assert.equal(await enable,false);
 const retry=h.controls.enable(true);h.finish(1,'running',false);assert.equal(await retry,false,'a false engine result must not start a preview');
});
