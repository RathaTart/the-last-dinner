import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {answerDialogue,validateQuestion} from './dialogue.mjs';
import {VERSION} from './game.js';
export function memoryStore(){const counters=new Map();return {async reserve(keys){for(const {key,limit}of keys){if((counters.get(key)||0)>=limit)return false;}for(const {key}of keys)counters.set(key,(counters.get(key)||0)+1);return true;}};}
export function createApi({enabled=false,invoke,store=memoryStore(),secret,limits={session:24,ip:80,daily:200,lifetime:2000}}={}){
 const signingSecret=secret||randomUUID();const sign=s=>createHmac('sha256',signingSecret).update(s).digest('hex');
 function session(cookie){const token=String(cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('dinner_session='))?.slice(15),parts=token?.split('.')||[];if(parts.length===3&&/^[a-zA-Z0-9-]+$/.test(parts[0])&&Number(parts[1])>Date.now()){const expected=Buffer.from(sign(parts[0]+'.'+parts[1])),actual=Buffer.from(parts[2]);if(expected.length===actual.length&&timingSafeEqual(expected,actual))return {id:parts[0]};}const id=randomUUID(),expiry=Date.now()+86400000,value=id+'.'+expiry;return {id,cookie:'dinner_session='+value+'.'+sign(value)+'; Path=/api; HttpOnly; SameSite=Strict; Max-Age=86400'};}
 return async function api({path,method='GET',headers={},body='',ip='local',secure=false}){
  const response=(status,data,extra={})=>({status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra},body:JSON.stringify(data)});
  if(path==='/api/status')return response(200,{dialogue:enabled?'llm':'authored',provider:enabled?'Amazon Bedrock':null,version:VERSION});
  if(path==='/api/health')return response(200,{ok:true});
  if(path!=='/api/dialogue')return response(404,{error:'Not found'});
  if(method!=='POST')return response(405,{error:'POST required'});
  if(headers.origin&&headers['sec-fetch-site']==='cross-site')return response(403,{error:'Origin rejected'});
  if(Buffer.byteLength(body)>10000)return response(413,{error:'Request too large'});
  let data;try{data=JSON.parse(body);}catch{return response(400,{error:'Invalid JSON'});}if(!validateQuestion(data))return response(400,{error:'Invalid dialogue request'});
  const player=session(headers.cookie),extra=player.cookie?{'Set-Cookie':player.cookie+(secure?'; Secure':'')}:{};
  let permitted=false;if(enabled){const day=new Date().toISOString().slice(0,10),ipKey=sign(ip).slice(0,24);try{permitted=await store.reserve([{key:'session#'+player.id,limit:limits.session},{key:'ip#'+day+'#'+ipKey,limit:limits.ip},{key:'day#'+day,limit:limits.daily},{key:'all-time',limit:limits.lifetime}]);}catch{permitted=false;}}
  const answer=await answerDialogue(data,{invoke:permitted?invoke:null});return response(200,answer,extra);
 };
}
