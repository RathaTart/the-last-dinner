import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {MANSION_BOUNDS,roomLayouts,walls,doors,furniture,evidencePositions,staircases} from './mansion-layout.js';

// Original modular scenery. The same blueprint controls scenery and collision.
// Small repeated pieces are merged by parent/material, rather than separate draw calls.
export function buildMansion(THREE,floorGroups,fogMaterial){
 const textures={},materialCache=new Map(),geometryCache=new Map(),buckets=new Map(),occludingWalls=[],roomLights=[],stairGroups=[];
 const loader=new THREE.TextureLoader();
 for(const kind of ['wood_floor','beige_wall_001','stone_wall_02']){
  textures[kind]={};for(const type of ['diff','nor_gl','rough']){const t=loader.load('/assets/textures/'+kind+'_'+type+'_1k.jpg');t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=type==='diff'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=4;textures[kind][type]=t;}
 }
 function material(color,kind='',repeat=[1,1],metalness=0,emissive='black'){
  const key=[color,kind,repeat.join(','),metalness,emissive].join('|');if(materialCache.has(key))return materialCache.get(key);
  const options={color,roughness:metalness?.42:.83,metalness,emissive,emissiveIntensity:1.4};
  if(kind){const maps=textures[kind];for(const [type,name]of [['diff','map'],['nor_gl','normalMap'],['rough','roughnessMap']]){options[name]=maps[type];}options.normalScale=new THREE.Vector2(.45,.45);}
  const m=fogMaterial(new THREE.MeshStandardMaterial(options));if(kind)m.userData.uvRepeat=repeat;materialCache.set(key,m);return m;
 }
 const palette={wood:'#624636',darkWood:'#372b28',trim:'#b4a080',brass:'#b29663',black:'#252b2b',paper:'#d4c4a2',linen:'#c1b7a4',iron:'#4b5351',green:'#435b53',wine:'#633e48',stone:'#768078'};
 const mats=Object.fromEntries(Object.entries(palette).map(([k,c])=>[k,material(c,'',undefined,k==='brass'?.6:k==='iron'?.5:0)]));
 mats.flame=material('#e5a96a','',[1,1],0,'#ffac42');mats.glass=material('#68929a','',[1,1],.12,'#1e373b');mats.blood=material('#4f282b');
 const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,12,8),cylinderGeo=new THREE.CylinderGeometry(1,1,1,16),torusGeo=new THREE.TorusGeometry(1,.065,6,24);
 const position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3(),matrix=new THREE.Matrix4(),euler=new THREE.Euler();
 function bevel(w,h,d){const amount=Math.min(.035,w/7,h/7,d/7),key=[w,h,d,amount].join(',');if(geometryCache.has(key))return geometryCache.get(key);const shape=new THREE.Shape(),hw=w/2-amount,hh=h/2-amount;shape.moveTo(-hw,-hh);shape.lineTo(hw,-hh);shape.lineTo(hw,hh);shape.lineTo(-hw,hh);shape.closePath();const depth=d-amount*2,g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:amount,bevelThickness:amount,curveSegments:1});g.translate(0,0,-depth/2);geometryCache.set(key,g);return g;}
 function add(parent,geo,mat,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,base=null){position.set(x,y,z);scale.set(sx,sy,sz);quaternion.setFromEuler(euler.set(rx,ry,rz));matrix.compose(position,quaternion,scale);if(base)matrix.premultiply(base);const clone=geo.index?geo.toNonIndexed():geo.clone();clone.applyMatrix4(matrix);if(mat.userData.uvRepeat){const uv=clone.getAttribute('uv'),repeat=mat.userData.uvRepeat;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*repeat[0],uv.getY(i)*repeat[1]);}const key=parent.uuid+mat.uuid;if(!buckets.has(key))buckets.set(key,{parent,mat,parts:[]});buckets.get(key).parts.push(clone);}
 function context(parent,x=0,z=0,yaw=0,y=0){const base=new THREE.Matrix4().makeRotationY(yaw);base.setPosition(x,y,z);return {
  box:(w,h,d,x,y,z,m=mats.wood,rounded=false)=>add(parent,rounded?bevel(w,h,d):boxGeo,m,x,y,z,rounded?1:w,rounded?1:h,rounded?1:d,0,0,0,base),
  ball:(r,x,y,z,m=mats.brass,sx=1,sy=1,sz=1)=>add(parent,sphereGeo,m,x,y,z,r*sx,r*sy,r*sz,0,0,0,base),
  cyl:(r,h,x,y,z,m=mats.brass,rx=0,ry=0,rz=0)=>add(parent,cylinderGeo,m,x,y,z,r,h,r,rx,ry,rz,base),
  ring:(r,x,y,z,m=mats.brass,rx=0,ry=0)=>add(parent,torusGeo,m,x,y,z,r,r,r,rx,ry,0,base),
  diagonal:(w,h,d,x,y,z,m,rz=0)=>add(parent,boxGeo,m,x,y,z,w,h,d,0,h<.1?rz:0,h<.1?0:rz,base),
  beam:(a,b,r=.035,m=mats.darkWood)=>{const direction=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),length=direction.length(),rotation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()));add(parent,cylinderGeo,m,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,length,r,rotation.x,rotation.y,rotation.z,base);}
 };}
 function single(geo,mat,parent,x,y,z){const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 const roomColors={foyer:'#667268',grandHall:'#46564e',dining:'#674b48',kitchen:'#71847a',workshop:'#646a65',library:'#4c6064',landing:'#615862',bedroom:'#77626a',infirmary:'#7e887e',gallery:'#485d5d',cellarHall:'#414947',mortuary:'#465953',boiler:'#565348',sealed:'#564b43'};
 function floorPiece(c,x,z,w,d,mat){c.box(w,.13,d,x,.025,z,mat);c.box(w,.27,d,x,-.19,z,material('#2d2927'));}
 for(const [id,r]of Object.entries(roomLayouts)){
  const c=context(floorGroups[r.floor]),basement=r.floor==='basement',stone=basement||id==='kitchen'||id==='foyer',floorMat=material(stone?'#909486':'#967f65',stone?'stone_wall_02':'wood_floor',[r.size[0]/2,r.size[1]/2]);
  if(id==='landing'){
   floorPiece(c,0,2,5.6,15,floorMat);floorPiece(c,0,-9.45,5.6,.1,floorMat);for(const x of [-2.675,2.675])floorPiece(c,x,-7.45,.25,3.9,floorMat);
  }else if(id==='kitchen'){
   floorPiece(c,-8.25,-5.5,7.5,8,floorMat);floorPiece(c,-3.65,-3.5,1.7,4,floorMat);floorPiece(c,-3.65,-9.425,1.7,.15,floorMat);floorPiece(c,-2.95,-7.425,.3,3.85,floorMat);
  }else floorPiece(c,r.pos[0],r.pos[1],r.size[0]-.03,r.size[1]-.03,floorMat);
  // The bevelled plinth is readable even when a camera-side wall is cut away.
  // Each floor-piece owns its plinth; both stair apertures remain truly open.
  if(stone&&id==='foyer')for(const x of [-1.9,0,1.9])for(const z of [6.15,7.5,8.85]){const tile=c;c.diagonal(.65,.015,.65,x,.101,z,mats.black,Math.PI/4);}
  const light=new THREE.PointLight(basement?'#d69e73':'#f5d4ac',basement?17:20,Math.max(...r.size)*1.2,2);light.position.set(r.pos[0],2.8,r.pos[1]);floorGroups[r.floor].add(light);roomLights.push({room:id,light});
 }
 // Every actual opening is left open. The upper parts disappear as a single
 // cutaway group, including their mouldings, artwork and window dressings.
 for(const wall of walls){
  const group=new THREE.Group();group.position.set(wall.x,.1,wall.z);group.rotation.y=wall.axis==='z'?Math.PI/2:0;group.userData={...wall,cutaway:true};floorGroups[wall.floor].add(group);occludingWalls.push(group);
  const c=context(group),length=wall.axis==='x'?wall.width:wall.depth,basement=wall.floor==='basement';
  const plaster=material(basement?'#64736a':'#a29b89',basement?'stone_wall_02':'beige_wall_001',[Math.max(1,length/2),1.8]);
  c.box(length,3.62,.22,0,1.81,0,plaster);
  if(!basement){c.box(length,1.02,.25,0,.51,0,material(wall.floor==='upper'?'#63555a':'#4a5a50'));c.box(length,.08,.29,0,1.08,0,mats.trim);c.box(length,.12,.31,0,3.53,0,mats.trim);c.box(length,.055,.35,0,3.62,0,mats.trim);
   const panels=Math.max(1,Math.floor(length/1.4));for(let i=0;i<panels;i++){const x=-length/2+(i+.5)*length/panels,pw=length/panels-.18;for(const face of [-1,1]){c.box(pw,.025,.035,x,.25,face*.145,mats.trim);c.box(pw,.025,.035,x,.82,face*.145,mats.trim);for(const dx of [-pw/2,pw/2])c.box(.025,.6,.035,x+dx,.53,face*.145,mats.trim);}}
  }
  const stub=context(floorGroups[wall.floor],wall.x,wall.z,wall.axis==='z'?Math.PI/2:0);stub.box(length,.13,.3,0,.155,0,basement?mats.stone:mats.darkWood);stub.box(length,.05,.34,0,.24,0,mats.trim);
  // Windows sit in deep framed recesses; the glass does not create a doorway.
  if(wall.exterior&&!basement&&length>2.6){const count=Math.max(1,Math.floor(length/4.5));for(let i=0;i<count;i++){
    const x=-length/2+(i+.5)*length/count;
    for(const face of [-1,1]){const inset=face*.145;c.box(1.65,2.03,.04,x,2.07,inset,mats.darkWood);c.box(1.37,1.72,.025,x,2.09,inset+face*.035,mats.glass);for(const dx of [-.79,0,.79])c.box(.07,1.94,.12,x+dx,2.08,inset+face*.065,mats.trim);for(const y of [1.1,2.08,3.05])c.box(1.7,.07,.12,x,y,inset+face*.065,mats.trim);c.box(1.88,.12,.38,x,1.09,inset+face*.08,mats.trim);c.box(1.95,.12,.2,x,3.18,inset,mats.wood,true);
     for(const dx of [-.95,.95]){c.box(.37,2.03,.18,x+dx,2.09,inset+face*.11,material(wall.floor==='upper'?'#7a5964':'#73514d'));for(const fold of [-.12,0,.12])c.box(.035,1.97,.05,x+dx+fold,2.09,inset+face*.23,material('#946f61'));c.box(.39,.09,.22,x+dx,1.54,inset+face*.15,mats.brass);}
    }
   }}
 }
 const arches=[];
 for(const d of doors){
  if(d.stairOpening)continue; // This crossing is above the cellar floor; a normal header would hit a head.
  const group=new THREE.Group();group.position.set(d.pos[0],.1,d.pos[1]);group.rotation.y=d.axis==='z'?Math.PI/2:0;group.userData={floor:d.floor,axis:d.axis,x:d.pos[0],z:d.pos[1],width:d.axis==='x'?d.width:.22,depth:d.axis==='z'?d.width:.22,height:3.4,rooms:d.rooms,exterior:d.rooms.length===1,cutaway:true};floorGroups[d.floor].add(group);occludingWalls.push(group);arches.push(group);
  const c=context(group),stone=d.floor==='basement',m=stone?mats.stone:mats.trim;
  for(const x of [-d.width/2,d.width/2]){c.box(.16,2.75,.38,x,1.37,0,m,true);c.box(.25,.17,.47,x,.13,0,m);c.box(.23,.17,.46,x,2.75,0,m);}c.box(d.width+.25,.22,.38,0,2.88,0,m,true);c.box(d.width+.43,.1,.45,0,3.03,0,m);c.box(d.width+.3,.65,.22,0,3.37,0,material(stone?'#64736a':'#a29b89',stone?'stone_wall_02':'beige_wall_001',[1,.5]));
  if(d.id==='frontEntrance'){for(const x of [-.62,.62]){c.box(1.15,2.6,.12,x,1.3,0,mats.darkWood,true);c.box(.84,1.6,.035,x,1.1,-.085,mats.wood);c.box(.84,.6,.035,x,2.15,-.085,mats.glass);c.ball(.045,x*.15,1.2,-.14,mats.brass);}}
 }
 function rug(room,w,d,color){const r=roomLayouts[room],c=context(floorGroups[r.floor]),x=r.pos[0],z=r.pos[1];c.box(w,.026,d,x,.12,z,material('#9d8666'));c.box(w-.14,.027,d-.14,x,.125,z,material(color));for(const dx of [-w/2+.23,w/2-.23])c.box(.045,.031,d-.45,x+dx,.143,z,mats.trim);for(const dz of [-d/2+.23,d/2-.23])c.box(w-.45,.031,.045,x,.143,z+dz,mats.trim);for(let i=-2;i<=2;i++)c.diagonal(.29,.03,.29,x+i*.61,.149,z,mats.trim,Math.PI/4);}
 rug('foyer',2.65,2.3,'#475949');rug('dining',6.6,5.1,'#683d42');rug('library',6.2,7.5,'#425f61');rug('bedroom',5.5,6,'#785662');rug('grandHall',1.65,9.6,'#754b44');rug('landing',1.55,11.4,'#524d68');rug('gallery',4.3,14.8,'#4c6062');
 function table(c,w,h,d,m=mats.wood){c.box(w,.12,d,0,h,0,m,true);c.box(w-.16,.13,.08,0,h-.13,-d/2+.07,mats.darkWood);c.box(w-.16,.13,.08,0,h-.13,d/2-.07,mats.darkWood);for(const x of [-w/2+.15,w/2-.15])for(const z of [-d/2+.15,d/2-.15]){c.box(.12,h-.15,.12,x,(h-.15)/2,z,mats.darkWood,true);c.ball(.095,x,.15,z,mats.wood);}}
 function book(c,x,y,z,w=.11,h=.3,color='#986d58'){const m=material(color);c.box(w,h,.25,x,y,z,m,true);c.box(w-.025,h-.04,.23,x,y,z,mats.paper);c.box(w,.025,.27,x,y+h/2,z,m);c.box(w,.025,.27,x,y-h/2,z,m);}
 function paper(c,x,y,z,w=.4,d=.28){c.box(w,.015,d,x,y,z,mats.paper);for(let i=0;i<4;i++)c.box(w*.7,.018,.007,x,y+.003,z-d*.3+i*.045,mats.iron);}
 function lamp(c,x,y,z){c.cyl(.14,.04,x,y,z,mats.brass);c.cyl(.024,.4,x,y+.2,z,mats.brass);c.cyl(.23,.23,x,y+.47,z,material('#d5b88b'));c.ball(.07,x,y+.5,z,mats.flame);}
 function candle(c,x,y,z){c.cyl(.095,.025,x,y,z,mats.brass);c.cyl(.025,.19,x,y+.11,z,mats.brass);c.cyl(.043,.2,x,y+.27,z,mats.linen);c.ball(.025,x,y+.4,z,mats.flame,.65,1.65,.65);}
 let pendulum=null;
 for(const item of furniture){const r=roomLayouts[item.room],c=context(floorGroups[r.floor],item.pos[0],item.pos[2],item.rotation,.1),[w,h,d]=item.size;switch(item.kind){
  case 'console':case 'sideboard':case 'bedside':case 'cabinet':case 'cupboard':case 'wardrobe':case 'medicineCabinet':case 'displayCabinet':case 'clockCabinet':{
   const timber=['medicineCabinet'].includes(item.kind)?material('#889187'):mats.wood;c.box(w,h-.1,d,0,h/2,0,timber,true);c.box(w+.07,.07,d+.06,0,h,0,mats.darkWood,true);c.box(w+.09,.09,d+.09,0,.055,0,mats.darkWood);const wide=w>=d,panels=Math.max(1,Math.floor((wide?w:d)/.7));for(let i=0;i<panels;i++){const t=-(wide?w:d)/2+(i+.5)*(wide?w:d)/panels;if(wide){c.box(w/panels-.08,h-.26,.035,t,h/2,d/2+.018,mats.darkWood);c.box(w/panels-.15,h-.33,.04,t,h/2,d/2+.045,timber);c.ball(.035,t+.15,h*.54,d/2+.085,mats.brass);}else{c.box(.035,h-.26,d/panels-.08,w/2+.018,h/2,t,mats.darkWood);c.box(.04,h-.33,d/panels-.15,w/2+.045,h/2,t,timber);c.ball(.035,w/2+.085,h*.54,t+.15,mats.brass);}}
   if(item.kind==='medicineCabinet'){for(let k=0;k<3;k++)for(let j=0;j<4;j++){c.cyl(.046,.18,-.29+j*.18,.48+k*.6,d/2+.07,material(j%2?'#668779':'#887259'));c.box(.075,.06,.025,-.29+j*.18,.5+k*.6,d/2+.12,mats.paper);}}
   else if(item.kind==='displayCabinet'){c.ball(.18,0,h+.2,0,mats.stone);c.box(.4,.06,.6,0,h+.02,0,mats.paper);}
   else if(h<1.2){lamp(c,0,h+.06,0);c.cyl(.12,.18,.22,h+.1,.16,mats.linen);}
   break;}
  case 'diningTable':{
   table(c,w,h,d);c.box(w-.3,.015,d*.5,0,h+.075,0,mats.linen);for(let i=0;i<4;i++)for(const z of [-.85,.85]){const x=-1.9+i*1.3;c.cyl(.23,.035,x,h+.08,z,mats.linen);c.cyl(.165,.039,x,h+.095,z,material('#a0afa2'));c.box(.022,.03,.36,x+.31,h+.095,z,mats.brass);c.cyl(.057,.1,x-.32,h+.13,z,mats.glass);c.cyl(.015,.12,x-.32,h+.035,z,mats.glass);}
   for(const x of [-1,1])candle(c,x,h+.09,0);c.cyl(.12,.3,0,h+.23,0,mats.brass);for(let i=0;i<5;i++)c.ball(.105,Math.cos(i)*.14,h+.5,Math.sin(i)*.14,material(i%2?'#b89e80':'#833f4d'),1,.7,1);break;}
  case 'chair':{
   c.box(w,.1,d,0,.48,0,mats.darkWood,true);c.box(w-.11,.08,d-.12,0,.55,0,mats.wine,true);for(const x of [-w/2+.09,w/2-.09])for(const z of [-d/2+.09,d/2-.09])c.box(.07,.45,.07,x,.23,z,mats.wood);for(const x of [-w/2+.05,w/2-.05])c.box(.07,h-.35,.07,x,(h+.35)/2,-d/2+.06,mats.wood);c.box(w,.09,.11,0,h-.03,-d/2+.06,mats.wood,true);c.box(w-.14,h-.7,.075,0,.78,-d/2+.06,mats.wine,true);break;}
  case 'desk':case 'prepTable':case 'workbench':{
   table(c,w,h,d,item.room==='kitchen'?material('#b09b79'):mats.wood);if(item.kind==='workbench'){for(let i=0;i<4;i++){c.ring(.13,-w*.32+i*.27,h+.09,.05,mats.brass,Math.PI/2);c.box(.24,.02,.07,w*.24,h+.1,-.18+i*.12,mats.iron);}c.box(.21,.18,.2,w*.37,h+.13,.13,mats.iron);}
   else if(item.kind==='desk'){paper(c,-w*.24,h+.08,0,.42,.32);c.cyl(.042,.075,w*.27,h+.1,-.16,mats.iron);c.diagonal(.015,.18,.015,w*.27+.01,h+.2,-.16,mats.brass,.4);lamp(c,w*.32,h+.08,.22);}
   else{c.box(.5,.035,.36,-.7,h+.08,.1,mats.wood);for(let i=0;i<3;i++)c.ball(.09,-.8+i*.16,h+.15,.08,material('#a8654e'));c.cyl(.21,.08,.7,h+.1,0,mats.linen);}break;}
  case 'clock':{
   c.box(w,h,d,0,h/2,0,mats.darkWood,true);c.box(w-.13,1.2,.04,0,.86,d/2+.025,mats.black);c.box(w+.09,.1,d+.1,0,h-.07,0,mats.wood,true);c.cyl(.285,.035,0,1.92,d/2+.06,mats.paper,Math.PI/2);for(let i=0;i<12;i++){const a=i*Math.PI/6;c.ball(.022,Math.sin(a)*.24,1.92+Math.cos(a)*.24,d/2+.085,mats.black);}c.box(.022,.19,.025,0,2,d/2+.09,mats.black);c.box(.18,.025,.025,.07,1.92,d/2+.09,mats.black);
   const pivot=new THREE.Group();pivot.position.set(item.pos[0],1.48,item.pos[2]+d/2+.07);floorGroups[r.floor].add(pivot);single(new THREE.CylinderGeometry(.017,.017,.8,8),mats.brass,pivot,0,-.4,0);single(new THREE.SphereGeometry(.09,12,8),mats.brass,pivot,0,-.8,0);pendulum=pivot;break;}
  case 'counter':case 'sink':case 'stove':{
   const m=item.kind==='stove'?mats.iron:material('#59766a');c.box(w,h-.1,d,0,h/2,0,m,true);c.box(w+.035,.1,d+.07,0,h,0,item.kind==='stove'?mats.black:mats.stone,true);for(let i=0;i<Math.max(1,Math.floor(w/.9));i++){const x=-w/2+(i+.5)*w/Math.max(1,Math.floor(w/.9));c.box(.55,h*.62,.035,x,h*.45,d/2+.02,mats.darkWood);c.box(.22,.025,.055,x,h*.65,d/2+.055,mats.brass);}
   if(item.kind==='stove'){for(const z of [-.48,.48]){c.cyl(.27,.035,0,h+.065,z,mats.black);c.cyl(.19,.25,0,h+.2,z,mats.brass);c.ring(.14,0,h+.37,z,mats.iron,Math.PI/2);}c.box(.16,2,.17,-.28,h+1,-d/2+.2,mats.iron);}
   if(item.kind==='sink'){c.box(.92,.045,.57,0,h+.075,0,mats.iron,true);c.box(.72,.05,.4,0,h+.081,0,mats.black);c.cyl(.03,.42,0,h+.24,-.25,mats.brass);c.box(.28,.055,.06,.12,h+.43,-.25,mats.brass);}
   break;}
  case 'piano':{
   c.box(w,.28,d,0,.97,0,mats.black,true);c.box(w+.025,.07,d+.03,0,1.16,0,material('#3a3632'),true);c.box(w-.15,.13,.39,0,.95,-d/2-.13,mats.black,true);for(const x of [-w/2+.2,w/2-.2])for(const z of [-d/2+.15,d/2-.15])c.box(.12,.86,.12,x,.46,z,mats.black);const count=32;for(let i=0;i<count;i++){const x=-w/2+.16+i*(w-.3)/count;c.box((w-.3)/count-.008,.03,.34,x,1.035,-d/2-.13,mats.linen);if(![2,6].includes(i%7))c.box(.045,.052,.18,x+.035,1.055,-d/2-.03,mats.black);}c.box(.8,.55,.075,0,1.42,-.05,mats.darkWood);paper(c,0,1.22,.17,.47,.3);break;}
  case 'bench':case 'sofa':case 'armchair':{
   const sofa=item.kind!=='bench',fabric=material(item.room==='bedroom'?'#826274':'#67787a');for(const x of [-w/2+.16,w/2-.16])for(const z of [-d/2+.12,d/2-.12])c.box(.09,.36,.09,x,.18,z,mats.darkWood);c.box(w,.24,d,0,.45,0,sofa?fabric:mats.wood,true);if(sofa){c.box(w,.52,.2,0,.88,d/2-.08,fabric,true);for(const x of [-w/2+.08,w/2-.08])c.box(.2,.43,d,x,.71,0,fabric,true);const count=Math.max(1,Math.round(w));for(let i=0;i<count;i++)c.box(w/count-.08,.1,d-.28,-w/2+(i+.5)*w/count,.62,-.02,material('#8a8b80'),true);}break;}
  case 'bookcase':case 'shelf':{
   const wide=w>d,span=wide?w:d,depth=wide?d:w;
   if(wide){c.box(w,h,.1,0,h/2,-d/2,mats.darkWood);for(const x of [-w/2,w/2])c.box(.09,h,d,x,h/2,0,mats.wood);for(let k=0;k<5;k++){const y=.24+k*(h-.3)/5;c.box(w,.08,d,0,y,0,mats.wood);for(let j=0;j<Math.floor(w/.17);j++)book(c,-w/2+.15+j*.17,y+.2,0,.12,.31+k%2*.04,['#926a54','#556966','#87705d','#6c535c'][j%4]);}}
   else{c.box(.1,h,d,-w/2,h/2,0,mats.darkWood);for(const z of [-d/2,d/2])c.box(w,h,.09,0,h/2,z,mats.wood);for(let k=0;k<5;k++){const y=.24+k*(h-.3)/5;c.box(w,.08,d,0,y,0,mats.wood);for(let j=0;j<Math.floor(d/.17);j++){const z=-d/2+.15+j*.17;c.box(.3,.32,.12,0,y+.2,z,material(['#926a54','#556966','#87705d','#6c535c'][j%4]));c.box(.012,.27,.08,w/2+.01,y+.2,z,mats.paper);}}}
   break;}
  case 'bed':case 'medicalBed':{
   const medical=item.kind==='medicalBed';for(const x of [-w/2+.12,w/2-.12])for(const z of [-d/2+.16,d/2-.16])c.box(.11,.5,.11,x,.27,z,medical?mats.iron:mats.wood);c.box(w,.35,d,0,.54,0,medical?mats.iron:mats.darkWood,true);c.box(w-.13,.25,d-.14,0,.81,0,mats.linen,true);c.box(w-.14,.12,d*.6,0,.98,d*.14,material(medical?'#a7aaa0':'#65727c'),true);for(const x of [-w*.23,w*.23])c.box(w*.39,.14,.64,x,1.02,-d*.34,mats.linen,true);c.box(w+.07,medical?1.05:1.4,.12,0,medical?.74:.94,-d/2+.02,medical?mats.iron:mats.wood,true);if(medical){for(const x of [-w/2-.02,w/2+.02]){c.box(.045,.25,d*.6,x,1.15,0,mats.iron);c.box(.045,.05,d*.65,x,1.3,0,mats.iron);}}break;}
  case 'coveredSlab':{
   for(const z of [-d*.31,d*.31]){c.box(w*.75,.6,.22,0,.37,z,mats.iron);c.box(w*.85,.13,.45,0,.12,z,mats.iron);}c.box(w,.16,d,0,.82,0,mats.stone,true);c.box(w-.08,.08,d-.09,0,.95,0,mats.linen,true);c.ball(.44,0,1.02,-d*.22,mats.linen,.8,.36,.9);c.box(w*.57,.12,d*.57,0,1.02,d*.09,mats.linen,true);for(const x of [-w*.47,w*.47])c.box(.13,.3,d*.75,x,.85,0,mats.linen);break;}
  case 'trolley':{
   for(const x of [-w/2+.08,w/2-.08])for(const z of [-d/2+.08,d/2-.08]){c.cyl(.025,h,x,h/2,z,mats.iron);c.ball(.07,x,.08,z,mats.black);}for(const y of [.25,.8])c.box(w,.045,d,0,y,0,mats.iron,true);c.cyl(.17,.035,0,.84,0,mats.linen);c.box(.16,.12,.22,.19,.88,.17,mats.paper);break;}
  case 'statue':{
   c.box(w,.38,d,0,.23,0,mats.stone,true);c.cyl(w*.27,h*.45,0,.7+h*.15,0,mats.stone);c.ball(w*.23,0,h-.2,0,mats.stone);c.ball(w*.28,0,h*.61,0,mats.stone,1.3,.7,.9);break;}
  case 'boiler':{
   c.cyl(w*.36,h*.87,0,h*.47,0,mats.iron);for(const y of [.2,h*.7,h*.93])c.ring(w*.365,0,y,0,mats.brass,Math.PI/2);c.box(w*.58,h*.37,.15,0,h*.32,d/2,mats.black,true);for(const x of [-w*.3,w*.3]){c.cyl(.1,.7,x,h+.2,0,mats.iron);c.box(.2,.2,1.1,x,h+.54,-.5,mats.iron);}c.ring(.25,.35,h*.52,d/2+.12,mats.brass);c.cyl(.15,.04,-.38,h*.74,d/2+.07,mats.paper,Math.PI/2);c.box(.025,.12,.025,-.38,h*.78,d/2+.1,mats.black);break;}
  case 'coalBin':{c.box(w,h,d,0,h/2,0,mats.darkWood);for(let i=0;i<12;i++)c.ball(.16,(i%3-1)*w*.27,h+.02,((i/3|0)-1.5)*d*.21,mats.black,1,.7,1);break;}
  case 'crateStack':{
   for(let j=0;j<2;j++){const y=.32+j*.53;c.box(w*.86,.54,d*.85,0,y,0,mats.wood,true);for(const x of [-w*.36,w*.36])c.box(.08,.55,d*.89,x,y,0,mats.darkWood);for(const z of [-d*.36,d*.36])c.box(w*.9,.55,.06,0,y,z,mats.darkWood);c.box(w*.68,.03,d*.5,0,y+.29,0,mats.wood);}break;}
  case 'coatStand':{
   c.cyl(.055,h,0,h/2,0,mats.darkWood);c.cyl(.28,.07,0,.07,0,mats.wood);for(const x of [-.21,.21]){c.box(.36,.07,.07,x,h*.8,0,mats.wood,true);c.box(.08,.21,.09,x*1.6,h*.86,0,mats.wood,true);}c.box(.24,.9,.16,.2,1.1,0,material('#4c5d58'),true);break;}
  case 'toolRack':{
   c.box(w,h,d,0,h/2,0,mats.darkWood);for(let i=0;i<5;i++){const x=-w*.35+i*w*.17;c.box(.035,.5,.045,x,h*.57,d/2+.04,mats.iron);c.box(.2,.09,.07,x,h*.78,d/2+.06,mats.iron);}break;}
 }
 }
 const entry=context(floorGroups.ground);paper(entry,-1.9,1.04,6.8,.4,.29);entry.box(.26,.035,.2,-1.9,1.06,8,mats.wine,true);entry.cyl(.025,1.15,1.98,.66,8.46,mats.black);entry.box(.19,.3,.055,1.98,.18,8.46,mats.darkWood,true);entry.ring(.085,1.98,1.28,8.46,mats.brass);
 for(const wallGroup of occludingWalls){const wall=wallGroup.userData;if(wall.floor==='ground'&&wall.axis==='z'&&Math.abs(wall.x+2.8)<.01&&7.4>wall.z-wall.depth/2&&7.4<wall.z+wall.depth/2){const c=context(wallGroup),x=wall.z-7.4;c.box(1.38,1.55,.08,x,2.03,.18,mats.brass,true);c.box(1.22,1.39,.035,x,2.03,.24,material('#89a0a1','',[1,1],.55));for(const dx of [-.69,.69])c.ball(.065,x+dx,2.82,.18,mats.brass);}}
 // Continuous stair geometry is shared by both floors. The renderer attaches
 // these groups directly to the scene, avoiding duplicate treads while moving
 // between floors. Every flight and turn comes from the navigation blueprint.
 function guard(c,a,b,m=mats.darkWood){
  c.beam([a[0],a[1]+.98,a[2]],[b[0],b[1]+.98,b[2]],.035,m);
  const length=Math.hypot(b[0]-a[0],b[2]-a[2]),count=Math.max(1,Math.ceil(length/.42));
  for(let i=0;i<=count;i++){const t=i/count,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,z=a[2]+(b[2]-a[2])*t;c.cyl(.025,.86,x,y+.48,z,m);c.ball(.04,x,y+.93,z,mats.brass);}
 }
 for(const staircase of Object.values(staircases)){
  const group=new THREE.Group();group.name=staircase.id+'-continuous-stair';group.userData.staircase=staircase.id;floorGroups.ground.add(group);
  stairGroups.push({id:staircase.id,group,from:staircase.lowerFloor,to:staircase.upperFloor,lowerFloor:staircase.lowerFloor,upperFloor:staircase.upperFloor});
  const c=context(group),stone=staircase.id==='service',tread=stone?mats.stone:mats.wood,railMat=stone?mats.iron:mats.darkWood;
  for(const surface of staircase.surfaces){
   const [l,r,b,f]=surface.bounds,w=r-l,d=f-b,x=(l+r)/2,z=(b+f)/2;
   if(!surface.axis){
    c.box(w,.13,d,x,surface.y+.035,z,tread,true);
    if(!surface.exitFloor){
     guard(c,[l,surface.y+.1,b],[r,surface.y+.1,b],railMat);
     guard(c,[l,surface.y+.1,b],[l,surface.y+.1,f],railMat);
     guard(c,[r,surface.y+.1,b],[r,surface.y+.1,f],railMat);
     const flights=staircase.surfaces.filter(s=>s.axis&&Math.abs((s.start===f?s.yStart:s.end===f?s.yEnd:Infinity)-surface.y)<.01).sort((a,b)=>a.bounds[0]-b.bounds[0]);
     for(let i=1;i<flights.length;i++)guard(c,[flights[i-1].bounds[1],surface.y+.1,f],[flights[i].bounds[0],surface.y+.1,f],railMat);
    }
    continue;
   }
   const length=Math.abs(surface.end-surface.start),count=Math.max(1,Math.ceil(Math.abs(surface.yEnd-surface.yStart)/.16)),depth=length/count;
   for(let i=0;i<count;i++){
    const t=(i+.5)/count,coordinate=surface.start+(surface.end-surface.start)*t,y=surface.yStart+(surface.yEnd-surface.yStart)*t;
    if(surface.axis==='z'){
     c.box(w,.12,depth+.01,x,y+.04,coordinate,tread,true);
     c.box(w,.025,.035,x,y+.097,coordinate-Math.sign(surface.end-surface.start)*depth*.43,stone?mats.iron:mats.trim);
    }else{
     c.box(depth+.01,.12,d,coordinate,y+.04,z,tread,true);
     c.box(.035,.025,d,coordinate-Math.sign(surface.end-surface.start)*depth*.43,y+.097,z,stone?mats.iron:mats.trim);
    }
   }
   if(surface.axis==='z')for(const side of [l,r]){
    guard(c,[side,surface.yStart+.1,surface.start],[side,surface.yEnd+.1,surface.end],railMat);
    c.beam([side,surface.yStart-.09,surface.start],[side,surface.yEnd-.09,surface.end],stone?.065:.085,railMat);
   }else for(const side of [b,f])guard(c,[surface.start,surface.yStart+.1,side],[surface.end,surface.yEnd+.1,side],railMat);
  }
 }
 // Fixed floor-level guards protect the shaft edges without closing the
 // actual entrance or exit. The upper west edge is not a stair entrance.
 const upperGuard=context(floorGroups.upper);for(const x of [-2.55,2.55])guard(upperGuard,[x,.1,-9.4],[x,.1,-5.5]);guard(upperGuard,[-2.55,.1,-5.5],[-.275,.1,-5.5]);
 const kitchenGuard=context(floorGroups.ground);for(const x of [-4.5,-3.1])guard(kitchenGuard,[x,.1,-9.35],[x,.1,-5.5],mats.iron);guard(kitchenGuard,[-4.5,.1,-9.35],[-3.1,.1,-9.35],mats.iron);
 // The east grand flight rises from its rear turn; a low screen closes its
 // ground-level underside while the west bottom flight remains fully open.
 const hallGuard=context(floorGroups.ground);guard(hallGuard,[.275,.1,-5.5],[2.325,.1,-5.5]);
 // Room accents add readable function and story without filling walkways.
 for(const id of ['foyer','grandHall','dining','library','landing','bedroom','gallery']){
  const r=roomLayouts[id],c=context(floorGroups[r.floor]);if(['dining','library','grandHall'].includes(id)){const x=r.pos[0],z=r.pos[1];c.cyl(.028,.72,x,3.18,z,mats.brass);c.ring(.49,x,2.84,z,mats.brass,Math.PI/2);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;candle(c,x+Math.cos(a)*.47,2.82,z+Math.sin(a)*.47);}}
 }
 // Fireplace surrounds face into their room rather than through a wall.
 for(const item of furniture.filter(f=>f.kind==='fireplace')){
  const r=roomLayouts[item.room],inward=item.pos[0]<0?1:-1,c=context(floorGroups[r.floor],item.pos[0],item.pos[2],inward>0?Math.PI/2:-Math.PI/2,.1);const w=item.size[2];c.box(w,1.5,.4,0,.75,0,mats.stone,true);c.box(w*.7,1.04,.045,0,.57,.23,mats.black);c.box(w+.22,.12,.6,0,1.58,0,mats.trim,true);for(const x of [-w*.39,w*.39])c.box(.16,1.15,.48,x,.64,.06,mats.trim);c.box(w+.32,.06,.75,0,.1,.12,mats.stone);c.cyl(.065,w*.43,0,.22,.25,mats.darkWood,0,0,Math.PI/2);c.ball(.11,0,.31,.3,mats.flame,1.4,1.7,1);candle(c,-w*.36,1.68,0);candle(c,w*.36,1.68,0);
 }
 // Framed portraits and sconces are attached to exterior cutaway walls.
 for(const wallGroup of occludingWalls.filter(g=>g.userData.exterior)){
  const d=wallGroup.userData,length=d.axis==='x'?d.width:d.depth;if(length<3||d.floor==='basement')continue;const c=context(wallGroup);for(const x of [-length*.38,length*.38]){c.box(.58,.82,.07,x,2.1,.16,mats.brass,true);c.box(.46,.68,.025,x,2.1,.21,material('#3e4d48'));c.ball(.115,x,2.23,.25,material('#b29a7a'),.8,1.1,.3);c.box(.24,.24,.025,x,1.97,.255,material('#69766c'));}
 }
 const gallery=context(floorGroups.upper);for(const z of [-7.5,-2.6,2.6,7.7]){gallery.box(.07,1.42,1.1,11.82,2.22,z,mats.brass,true);gallery.box(.025,1.25,.92,11.75,2.22,z,material('#344d50'));gallery.ball(.19,11.71,2.4,z,material('#afa086'),.25,1,1);gallery.box(.027,.45,.46,11.7,2.01,z,material('#735d66'));}
 const kitchen=context(floorGroups.ground);kitchen.box(4.4,.11,.24,-7.6,2.6,-9.16,mats.darkWood);for(let i=0;i<5;i++){const x=-9.15+i*.72;kitchen.cyl(.2,.05,x,2.18,-9.02,mats.brass,Math.PI/2);kitchen.box(.04,.31,.045,x,2.43,-9.02,mats.brass);}
 const basement=context(floorGroups.basement);for(const x of [5.2,11.3]){basement.cyl(.065,2.2,x,2.12,-9.15,mats.iron);basement.box(.14,.14,4.7,x,3.16,-6.9,mats.iron);}for(const z of [-7.4,-2.1,2.9]){basement.box(.11,.3,.05,-11.82,2.75,z,mats.iron);basement.ring(.085,-11.77,2.56,z,mats.iron,0,Math.PI/2);}for(let i=0;i<4;i++){const stain=new THREE.Mesh(new THREE.CircleGeometry(.18,10),mats.blood);stain.rotation.x=-Math.PI/2;stain.scale.set(1.5,.75,1);stain.position.set(-10.1+i*.3,.11,2.45+i*.15);floorGroups.basement.add(stain);}
 const archive=context(floorGroups.basement);archive.box(.08,.9,1.05,11.82,.6,7.55,mats.black);for(const z of [7.02,8.08])archive.box(.14,1,.12,11.76,.6,z,mats.wood);archive.box(.15,.12,1.19,11.76,1.13,7.55,mats.wood);archive.box(.4,.025,.3,10.98,.12,7.65,mats.paper);
 // Materialized clues use the blueprint's anchors so memory and evidence agree.
 const evidence={};for(const [id,p]of Object.entries(evidencePositions)){
  if(id==='clock')continue;const room={ledger:'kitchen',letter:'library',ward:'infirmary',portrait:'bedroom',maintenance:'boiler',names:'mortuary',order:'sealed'}[id];const parent=floorGroups[roomLayouts[room].floor],color=id==='ledger'?'#794b40':id==='portrait'?'#96794f':'#d4c4a2';evidence[id]=single(bevel(id==='portrait'?.43:.5,.025,id==='portrait'?.33:.35),material(color),parent,...p);const c=context(parent);for(let i=0;i<4;i++)c.box(.3,.01,.008,p[0],p[1]+.02,p[2]-.1+i*.045,mats.iron);
 }
 const envelope=single(bevel(.46,.025,.3),mats.paper,floorGroups.ground,...evidencePositions.letter);envelope.position.y+=.032;envelope.visible=false;
 const bag=single(bevel(.5,.55,.3),material('#846044'),floorGroups.ground,-9.65,.42,-2.35);bag.visible=false;
 const hidden=new THREE.Group();hidden.position.set(8.8,.1,-1.5);floorGroups.basement.add(hidden);const hc=context(hidden);hc.box(2.04,2.7,.14,0,1.35,0,material('#47544c','stone_wall_02',[1,1]));hc.box(1.75,2.28,.17,0,1.4,0,material('#536158'));for(const y of [.37,.95,1.54,2.13])hc.box(1.76,.045,.19,0,y,0,mats.iron);hc.box(.12,.35,.22,.8,1.3,-.13,mats.brass);
 // Flush all static geometry. A few animated props remain independent meshes.
 for(const {parent,mat,parts}of buckets.values()){const geometry=mergeGeometries(parts,false);if(geometry){const mesh=new THREE.Mesh(geometry,mat);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);}for(const part of parts)part.dispose();}
 for(const g of geometryCache.values())g.dispose();for(const g of [boxGeo,sphereGeo,cylinderGeo,torusGeo])g.dispose();
 return {door:hidden,pendulum,letter:evidence.letter,ledger:evidence.ledger,envelope,bag,occludingWalls,roomLights,stairGroups,materials:[...materialCache.values()],bounds:MANSION_BOUNDS};
}
