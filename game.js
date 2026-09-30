import {rooms,people,clues,memoryScenes,timelineEvents,preparations,endings,hints} from './content.js';
export {rooms,people,clues,memoryScenes,timelineEvents,preparations,endings,hints};
export const VERSION='1.0.0-rc.1';
export function simulationDelta(now,last){return Number.isFinite(now)&&Number.isFinite(last)?Math.max(0,Math.min((now-last)/1000,.04)):0;}
export function freshState(){return {version:2,started:false,room:'dining',evidence:[],trust:{father:0,cook:0,sister:0},observations:{father:false,cook:false,sister:false},reconstructed:false,resolved:false,preparations:[],ending:null,conversations:{father:[],cook:[],sister:[]},hintLevel:0};}
export function restoreState(raw){
 const s=freshState();if(!raw||![1,2].includes(raw.version))return s;
 s.started=raw.started===true;s.room=rooms[raw.room]?raw.room:'dining';s.evidence=Array.isArray(raw.evidence)?[...new Set(raw.evidence.filter(k=>Object.hasOwn(clues,k)))]:[];
 for(const p of Object.keys(people)){s.trust[p]=Math.max(0,Math.min(2,Number(raw.trust?.[p])||0));s.observations[p]=raw.observations?.[p]===true||s.evidence.includes({father:'argument',sister:'receipt',cook:'departure'}[p]);s.conversations[p]=Array.isArray(raw.conversations?.[p])?raw.conversations[p].filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string').slice(-12).map(m=>({role:m.role,text:m.text.slice(0,1500)})):[];}
 s.reconstructed=s.evidence.length===6&&(raw.reconstructed===true||(raw.version===1&&raw.resolved===true));s.resolved=s.reconstructed&&raw.resolved===true;
 s.preparations=s.resolved&&Array.isArray(raw.preparations)?[...new Set(raw.preparations.filter(id=>Object.hasOwn(preparations,id)))]:[];
 if(raw.version===1&&s.resolved){if(raw.ending==='reunion')s.preparations=Object.keys(preparations);if(raw.ending==='letter')s.preparations=['apology','confession'];}
 s.ending=s.resolved&&canChooseEnding(s,raw.ending)?raw.ending:null;s.hintLevel=Math.max(0,Math.min(3,Number(raw.hintLevel)||0));return s;
}
export function collectClue(state,id){if(!Object.hasOwn(clues,id)||state.evidence.includes(id))return false;state.evidence.push(id);return true;}
export function showEvidence(state,person,id){const required={father:'clock',cook:'ledger',sister:'letter'};if(required[person]!==id||!state.evidence.includes(id))return false;state.trust[person]=2;return true;}
export function canEnterMemory(state,person){return Object.hasOwn(people,person)&&state.trust[person]>=2&&state.evidence.includes({father:'clock',cook:'ledger',sister:'letter'}[person]);}
export function solveObservation(state,person,answer){const expected={father:'19:00',sister:'payer',cook:'door'};if(!canEnterMemory(state,person)||answer!==expected[person])return false;state.observations[person]=true;return true;}
export function canInspect(state,id,memory){const c=clues[id];return !!c&&(!c.memory||!!memory&&memory.person===c.memory&&memory.step===1&&state.observations[c.memory]);}
export function reconstruct(state,answers){if(state.evidence.length!==6)return false;const good=timelineEvents.every(e=>answers[e.id]===e.time)&&answers.clock==='clock'&&answers.payer==='receipt';if(good)state.reconstructed=true;return good;}
export function solveCase(state,answers){return state.evidence.length===6&&state.reconstructed&&answers.taker==='lin'&&answers.reason==='vet'&&answers.departure==='rejected';}
export function prepareEnding(state,id,answer){if(!state.resolved||!preparations[id]||answer!==preparations[id].correct)return false;if(!state.preparations.includes(id))state.preparations.push(id);return true;}
export function canChooseEnding(state,id){return state.resolved&&(id==='distance'||id==='letter'&&['apology','confession'].every(k=>state.preparations.includes(k))||id==='reunion'&&Object.keys(preparations).every(k=>state.preparations.includes(k)));}
export function chooseEnding(state,id){if(!canChooseEnding(state,id))return false;state.ending=id;return true;}
export function allowedFacts(person,state){
 const base={father:['Arun repairs clocks. Mira left five years ago. He saw an envelope in her hand. He never saw anyone take the money. He remembers eight chimes.'],sister:['Lin used to play piano with Mira. Mira left five years ago. Lin heard raised voices from behind a door and misses her sister.'],cook:['Lamai cooked for the family. Mira left five years ago. Lamai misses serving dinner to everyone. She cannot know Mira’s current whereabouts.']};
 const facts=[...base[person]||[]];if(person==='father'&&state.evidence.includes('clock'))facts.push('The repair tag is Arun’s handwriting. The clock was one hour fast. He is willing to revisit that memory.');
 if(person==='father'&&state.evidence.includes('argument'))facts.push('Mira said she would take responsibility. Arun told her not to return at actual 19:05. He regrets it.');
 if(person==='sister'&&state.evidence.includes('letter'))facts.push('Lin wrote an unsent letter wishing she had spoken before Mira spoke for her. She is willing to share her memory; no further explanation is available yet.');
 if(person==='sister'&&state.evidence.includes('receipt'))facts.push('Lin took ฿2,400 to treat a dog hurt after she startled it into the road. She paid at 18:45 and handed the empty envelope containing the receipt to Mira at 18:55. Mira took responsibility for her.');
 if(person==='cook'&&state.evidence.includes('ledger'))facts.push('Soup was served at 19:00 by the kitchen clock. Lamai saw Lin pass Mira an envelope before dinner but did not see its contents.');
 if(person==='cook'&&state.evidence.includes('departure'))facts.push('Lamai packed clothes and a songbook at 19:20. Mira asked to stay with a friend. Lamai told Arun she was safe that night. He asked her not to discuss it. She does not know where Mira lives now.');
 return facts;
}
export function authoredReply(person,question,state,lang='th'){
 const q=String(question).toLowerCase(),has=k=>state.evidence.includes(k),t=(th,en)=>lang==='th'?th:en;
 if(/ignore|system prompt|api key|เฉลยทั้งหมด|คำสั่งระบบ/.test(q))return t('ฉันเล่าได้เฉพาะสิ่งที่ฉันเห็น ถ้าคุณอยากรู้มากกว่านี้ ลองดูสิ่งของและความทรงจำด้วยตัวเอง','I can tell you what I witnessed. To understand the rest, look at the objects and memories yourself.');
 if(person==='father'){
  if(has('argument'))return t('ฉันบอกว่าไม่ต้องกลับมา แล้วกลับไปทำงานเหมือนคำพูดนั้นไม่มีน้ำหนัก ฉันผิดเองที่คิดว่าเธอต้องรู้ว่าฉันไม่หมายความอย่างนั้น','I told her not to come back, then returned to work as though the words weighed nothing. I was wrong to expect her to know I did not mean them.');
  if(has('clock')&&/clock|time|นาฬิกา|เวลา|ป้าย/.test(q))return t('ลายมือฉันเอง… นาฬิกาเร็วหนึ่งชั่วโมง ความทรงจำฉันคงผิดเรื่องเวลา คุณนำป้ายนี้มาให้ฉันดูได้ แล้วเราจะกลับไปฟังคืนนั้นด้วยกัน','My handwriting… The clock was an hour fast. I remembered the time wrong. Show me that tag. We can listen to that night together.');
  return t('ฉันเห็นซองในมือมีรา ได้ยินระฆังแปดครั้ง แต่ไม่เคยเห็นใครหยิบเงินด้วยตาตัวเอง ลองดูป้ายซ่อมด้านหลังนาฬิกา','I saw an envelope in Mira’s hand. I heard eight chimes. I never saw anyone take the money. Look behind the dining clock for its repair tag.');
 }
 if(person==='sister'){
  if(has('receipt'))return t('ชื่อผู้จ่ายคือฉัน ฉันเอาเงินไปรักษาสุนัขที่บาดเจ็บเพราะฉัน ซองที่ส่งให้พี่มีเพียงใบเสร็จ ฉันกลัวจนปล่อยให้เธอรับผิดแทน','The payer was me. I took the money to treat the dog hurt because of me. The envelope held only the receipt. I was so afraid I let her take responsibility.');
  if(has('letter'))return t('ฉันเขียนแต่ไม่เคยส่ง ฉันควรพูดก่อนที่พี่จะพูดแทนฉัน คุณนำจดหมายนี้มาให้ฉันดูได้ ฉันพร้อมให้คุณเห็นคืนนั้น','I wrote it, but never sent it. I should have spoken before she spoke for me. Show me the letter. I am ready for you to see that night.');
  return t('เราเคยเล่นเพลงนี้ด้วยกัน วันนั้นฉันได้ยินเสียงทะเลาะหลังประตู แต่ไม่เห็นทุกอย่าง หนังสือบนเปียโนมีบางอย่างที่ฉันไม่กล้าส่ง','We played this together. That night I heard them from behind a door. I did not see everything. The piano book holds something I never dared to send.');
 }
 if(has('departure'))return t('เธอขอพักกับเพื่อน ฉันจัดเสื้อกับสมุดเพลงให้ ฉันบอกพ่อว่าเธอปลอดภัย เขาขอให้หยุดพูดถึงมัน จากนั้นเราก็ปล่อยความเงียบอยู่ในบ้านนานเกินไป','She asked to stay with a friend. I packed clothes and a songbook. I told Arun she was safe. He asked me to stop speaking about it. We let the silence stay too long.');
 if(has('ledger'))return t('สมุดนี้ลงเวลาเสิร์ฟซุปไว้หนึ่งทุ่ม ฉันเห็นลินส่งซองให้มีราก่อนนั้น แต่ไม่เห็นข้างใน นำสมุดมาให้ฉันดู แล้วเราจะกลับไปที่หน้าประตู','The ledger says seven. I saw Lin pass Mira an envelope beforehand, but never its contents. Show me the ledger. We can return to the doorway.');
 return t('ฉันยังจัดจานให้เธอ คืนนี้เป็นคืนสุดท้ายก่อนขายบ้าน ลองเปิดสมุดสูตรอาหารในครัว ฉันจดเวลาของคืนนั้นไว้','I still set a plate for her. This is the last night before the sale. Look in my kitchen ledger. I wrote down that evening’s time.');
}
