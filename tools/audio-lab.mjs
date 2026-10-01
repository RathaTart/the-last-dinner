// Development-only real Web Audio rendering; never included by build.mjs.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
let baseline;try{baseline=execFileSync('git',['show','v1.0.0-rc.7:audio.js'],{encoding:'utf8'});}catch{baseline=null;}
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Game audio signal checks</title><style>body{background:#182528;color:#eee;font:16px system-ui;margin:36px}button{padding:14px}table{border-collapse:collapse;margin-top:24px}td,th{padding:12px;border:1px solid #687e80}pre{white-space:pre-wrap}</style><h1>Real Web Audio signal checks</h1><p>Renders the game's own audio engine through OfflineAudioContext. This measures digital samples, not the physical speaker output.</p><button id="run">Render signal checks</button><p id="status">Ready</p><table><thead><tr><th>Case</th><th>Old RMS</th><th>New RMS</th><th>Gain dB</th><th>New peak</th><th>Pass</th></tr></thead><tbody id="results"></tbody></table><pre id="report"></pre><script type="module">
import {createAudio as current} from '/audio-current.js';
const baselineAvailable=${!!baseline};let previous;if(baselineAvailable)previous=(await import('/audio-baseline.js')).createAudio;
const cases=[['preview','preview',{},0,.65],['wood walking','footstep',{surface:'wood',mode:'walk'},0,.65],['stone walking','footstep',{surface:'stone',mode:'walk'},0,.65],['rug walking','footstep',{surface:'rug',mode:'walk'},0,.65],['rug crouching','footstep',{surface:'rug',mode:'crouch'},0,.65],['music','',{},.45,0],['silent effects','preview',{},0,0],['overlap stress','stress',{},.45,1]];
async function render(factory,name,options,music,effects){
 const offline=new OfflineAudioContext(1,44100*4,44100);let lifecycle='suspended',seed=17;
 const wrapper=new Proxy(offline,{get(target,key){if(key==='state')return lifecycle;if(key==='resume')return async()=>{lifecycle='running';};if(key==='suspend')return async()=>{lifecycle='suspended';};if(key==='close')return async()=>{lifecycle='closed';};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 const audio=factory({contextFactory:()=>wrapper,isHidden:()=>false,scheduleInterval:()=>1,cancelInterval:()=>{},random:()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}});
 audio.setVolumes(music,effects);await audio.setEnabled(true);if(name==='stress'){for(const cue of ['preview','secretUnlock','intro','ending','success','memoryEnter','memoryExit','door','inspect','error'])audio.play(cue,{step:3,id:'reunion'});}else if(name)audio.play(name,options);
 const buffer=await offline.startRendering(),samples=buffer.getChannelData(0);let sum=0,peak=0,activeSum=0,active=0;for(const value of samples){sum+=value*value;peak=Math.max(peak,Math.abs(value));if(Math.abs(value)>1e-7){activeSum+=value*value;active++;}}
 await audio.dispose();return {rms:Math.sqrt(sum/samples.length),activeRms:active?Math.sqrt(activeSum/active):0,peak,nonzeroSamples:active};
}
document.querySelector('#run').onclick=async()=>{
 const button=document.querySelector('#run');button.disabled=true;document.querySelector('#results').replaceChildren();const records=[];
 try{for(const [label,name,options,music,effects]of cases){document.querySelector('#status').textContent='Rendering '+label;const before=previous?await render(previous,name,options,music,effects):null,after=await render(current,name,options,music,effects);const gainDb=before?.rms>0?20*Math.log10(after.rms/before.rms):null;
 const pass=label==='silent effects'?after.peak===0:after.nonzeroSamples>100&&after.peak<.98&&(gainDb===null||label==='overlap stress'||gainDb>5);
 records.push({case:label,before,after,gainDb,pass});const row=document.createElement('tr');for(const value of [label,before?.rms.toFixed(5)??'n/a',after.rms.toFixed(5),gainDb?.toFixed(1)??'n/a',after.peak.toFixed(4),String(pass)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}document.querySelector('#results').append(row);}
 document.querySelector('#status').textContent=records.every(r=>r.pass)?'PASS: all rendered signal checks':'FAIL: inspect rendered signal checks';document.querySelector('#report').textContent=JSON.stringify({date:new Date().toISOString(),sampleRate:44100,seconds:4,baseline:'v1.0.0-rc.7',checks:records,pass:records.every(r=>r.pass)},null,2);
 }catch(error){document.querySelector('#status').textContent='FAILED';document.querySelector('#report').textContent=String(error.stack||error);}finally{button.disabled=false;}
};
</script></html>`;
http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;const source=path==='/'?html:path==='/audio-current.js'?await readFile('audio.js','utf8'):path==='/audio-baseline.js'&&baseline?baseline:null;if(source===null){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':path==='/'?'text/html; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(source);}catch{res.writeHead(500);res.end('Unable to read audio engine');}}).listen(8802,'127.0.0.1',()=>console.log('Audio lab: http://127.0.0.1:8802'));
