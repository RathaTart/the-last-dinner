import test,{after,before} from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../server.mjs';
let base;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(resolve=>server.close(resolve)));
test('public assets load but local secrets and arbitrary files cannot be served',async()=>{for(const file of ['/','/app.js','/assets/characters/character-a.glb'])assert.equal((await fetch(base+file)).status,200);for(const file of ['/.env','/server.mjs','/README.md','/vendor/../.env','/../package.json'])assert.equal((await fetch(base+file)).status,404);});
test('dialogue validates requests and has a working no-key path',async()=>{const status=await(await fetch(base+'/api/status')).json();assert.equal(status.dialogue,'authored');const answer=await(await fetch(base+'/api/dialogue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person:'father',question:'What time was it?',language:'en',evidence:['clock']})})).json();assert.equal(answer.mode,'authored');assert.match(answer.reply,/hour fast/);assert.equal((await fetch(base+'/api/dialogue',{method:'POST',body:JSON.stringify({person:'unknown',question:'hi'})})).status,400);assert.equal((await fetch(base+'/api/dialogue',{method:'POST',headers:{Origin:'https://unrelated.example'},body:'{}'})).status,403);});
