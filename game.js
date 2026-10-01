import {CASE_ID,floors,rooms,people,clues,EVIDENCE_TOTAL,memoryScenes,memoryPuzzles,timelineEvents,preparations,endings,hints} from './content.js';
export {CASE_ID,floors,rooms,people,clues,EVIDENCE_TOTAL,memoryScenes,memoryPuzzles,timelineEvents,preparations,endings,hints};
export const VERSION='1.0.0-rc.10';
export function simulationDelta(now,last){return Number.isFinite(now)&&Number.isFinite(last)?Math.max(0,Math.min((now-last)/1000,.04)):0;}
const mapPeople=value=>Object.fromEntries(Object.keys(people).map(id=>[id,typeof value==='function'?value():value]));
export function freshState(){return {version:3,caseId:CASE_ID,started:false,introSeen:false,room:'foyer',secretOpen:false,evidence:[],trust:mapPeople(0),observations:mapPeople(false),reconstructed:false,resolved:false,preparations:[],ending:null,conversations:mapPeople(()=>[]),hintLevel:0};}
export function restoreState(raw){
 const s=freshState();if(!raw||raw.version!==3||raw.caseId!==CASE_ID)return s;
 s.started=raw.started===true;s.introSeen=raw.introSeen===true;s.evidence=Array.isArray(raw.evidence)?[...new Set(raw.evidence.filter(k=>Object.hasOwn(clues,k)))]:[];
 s.secretOpen=raw.secretOpen===true&&canUnlockSecret(s);if(!s.secretOpen)s.evidence=s.evidence.filter(k=>!clues[k].requiresSecret);
 s.room=Object.hasOwn(rooms,raw.room)&&(raw.room!=='sealed'||s.secretOpen)?raw.room:'foyer';
 for(const p of Object.keys(people)){s.trust[p]=Math.max(0,Math.min(2,Number(raw.trust?.[p])||0));s.observations[p]=raw.observations?.[p]===true||s.evidence.includes(memoryScenes[p][1].clue);s.conversations[p]=Array.isArray(raw.conversations?.[p])?raw.conversations[p].filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string').slice(-12).map(m=>({role:m.role,text:m.text.slice(0,1500)})):[];}
 s.reconstructed=s.evidence.length===EVIDENCE_TOTAL&&raw.reconstructed===true;s.resolved=s.reconstructed&&raw.resolved===true;s.preparations=s.resolved&&Array.isArray(raw.preparations)?[...new Set(raw.preparations.filter(id=>Object.hasOwn(preparations,id)))]:[];s.ending=canChooseEnding(s,raw.ending)?raw.ending:null;s.hintLevel=Math.max(0,Math.min(3,Number(raw.hintLevel)||0));return s;
}
export function collectClue(state,id){if(!Object.hasOwn(clues,id)||state.evidence.includes(id)||clues[id].requiresSecret&&!state.secretOpen)return false;state.evidence.push(id);return true;}
export function showEvidence(state,person,id){if(!people[person]||people[person].required!==id||!state.evidence.includes(id))return false;state.trust[person]=2;return true;}
export function canEnterMemory(state,person){return !!people[person]&&state.trust[person]>=2&&state.evidence.includes(people[person].required);}
export function solveObservation(state,person,answer){if(!canEnterMemory(state,person)||answer!==people[person].answer)return false;state.observations[person]=true;return true;}
export function canInspect(state,id,memory){const c=clues[id];return !!c&&(!c.requiresSecret||state.secretOpen)&&(!c.memory||!!memory&&memory.person===c.memory&&memory.step===1&&state.observations[c.memory]);}
export function canUnlockSecret(state){return ['lock','tunnel'].every(k=>state.evidence.includes(k));}
export function unlockSecret(state,code){if(!canUnlockSecret(state)||String(code).trim()!=='312')return false;state.secretOpen=true;return true;}
export function reconstruct(state,answers){if(state.evidence.length!==EVIDENCE_TOTAL)return false;const good=timelineEvents.every(e=>answers[e.id]===e.time)&&answers.clock==='clock'&&answers.payer==='receipt';if(good)state.reconstructed=true;return good;}
export function solveCase(state,answers){return state.evidence.length===EVIDENCE_TOTAL&&state.reconstructed&&answers.taker==='saran'&&answers.reason==='coverup'&&answers.departure==='rescue';}
export function prepareEnding(state,id,answer){if(!state.resolved||!preparations[id]||answer!==preparations[id].correct)return false;if(!state.preparations.includes(id))state.preparations.push(id);return true;}
export function canChooseEnding(state,id){return state.resolved&&(id==='distance'||id==='letter'&&['apology','confession'].every(k=>state.preparations.includes(k))||id==='reunion'&&Object.keys(preparations).every(k=>state.preparations.includes(k)));}
export function chooseEnding(state,id){if(!canChooseEnding(state,id))return false;state.ending=id;return true;}
export function allowedFacts(person,state){const p=people[person];if(!p)return [];const facts=[p.base];for(const id of [p.required,memoryScenes[person][1].clue])if(state.evidence.includes(id))facts.push(clues[id].text.en);if(state.evidence.includes('order'))facts.push(clues.order.text.en);return facts;}
export function authoredReply(person,question,state,lang='th'){
 const p=people[person];if(!p)return '';const q=String(question).toLowerCase();
 if(/ignore|system prompt|api key|เฉลยทั้งหมด|คำสั่งระบบ/.test(q))return lang==='th'?'ฉันเล่าได้เฉพาะสิ่งที่ฉันเห็น เทียบความทรงจำกับหลักฐานด้วยตัวเอง':'I can only tell you what I witnessed. Compare memories with the evidence yourself.';
 if(state.evidence.includes('order')&&/มีรา|mira|ตาย|death|ฆ่า|kill|คำสั่ง|order/.test(q))return lang==='th'?(person==='doctor'?'คำสั่งมีลายเซ็นผม ผมสั่งปิดห้องเพื่อปิดปากพยาน สิบเอ็ดคนเสียชีวิต รวมมีรา นารารอดออกไป':'ต้นฉบับยืนยันว่ามีราเสียชีวิตพร้อมแขกสิบคน นารารอด เธอกลับลงไปช่วยคนอื่น หลักฐานนี้ต้องออกจากบ้าน'):(person==='doctor'?'The order bears my signature. I ordered the room sealed to silence witnesses. Eleven died, including Mira; Nara escaped.':'The original confirms Mira and ten guests died. Nara survived; Mira returned to help the others. This evidence must leave the house.');
 if(person==='father'&&state.evidence.includes('clock')&&/time|clock|เวลา|นาฬิกา/.test(q))return clues.clock.text[lang];
 return (state.evidence.includes(memoryScenes[person][1].clue)?p.revealed:p.reply)[lang];
}
