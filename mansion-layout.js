// One architectural source for rendering, collision, clues and actor placement.
// Coordinates are metres; +z faces the main entrance. Furniture positions are
// bottom centres and sizes are [width, height, depth]. Bounds are [left,right,back,front].
export const MANSION_BOUNDS = Object.freeze([-12,12,-9.5,9.5]);
export const floorY = Object.freeze({ground:0,upper:4.4,basement:-4.4});
const space=(floor,bounds,spawn)=>({floor,bounds,pos:[(bounds[0]+bounds[1])/2,(bounds[2]+bounds[3])/2],size:[bounds[1]-bounds[0],bounds[3]-bounds[2]],spawn});
export const roomLayouts={
 foyer:space('ground',[-2.8,2.8,5.5,9.5],[0,8.1]),
 grandHall:space('ground',[-2.8,2.8,-9.5,5.5],[0,3.1]),
 dining:space('ground',[-12,-2.8,-1.5,9.5],[-3.7,3.1]),
 kitchen:space('ground',[-12,-2.8,-9.5,-1.5],[-4.2,-4.9]),
 workshop:space('ground',[2.8,12,-9.5,-1.5],[4.2,-4.9]),
 library:space('ground',[2.8,12,-1.5,9.5],[4.2,3.1]),
 landing:space('upper',[-2.8,2.8,-9.5,9.5],[0,-5.5]),
 bedroom:space('upper',[-12,-2.8,-1.5,9.5],[-4.2,3.1]),
 infirmary:space('upper',[-12,-2.8,-9.5,-1.5],[-4.2,-4.9]),
 gallery:space('upper',[2.8,12,-9.5,9.5],[4.2,3.1]),
 cellarHall:space('basement',[-2.8,2.8,-9.5,9.5],[-1,-7]),
 mortuary:space('basement',[-12,-2.8,-9.5,9.5],[-4.2,3.1]),
 boiler:space('basement',[2.8,12,-9.5,-1.5],[4.2,-4.9]),
 sealed:space('basement',[2.8,12,-1.5,9.5],[8.8,-.3])
};
const door=(id,floor,rooms,axis,pos,width=2,locked=false)=>({id,floor,rooms,axis,pos,width,locked});
export const doors=[
 door('frontEntrance','ground',['foyer'],'x',[0,9.5],2.5),
 door('foyerHall','ground',['foyer','grandHall'],'x',[0,5.5],2.8),
 door('hallDining','ground',['grandHall','dining'],'z',[-2.8,3.1],2.1),
 door('hallKitchen','ground',['grandHall','kitchen'],'z',[-2.8,-4.9],2),
 door('hallWorkshop','ground',['grandHall','workshop'],'z',[2.8,-4.9],2),
 door('hallMusic','ground',['grandHall','library'],'z',[2.8,3.1],2.1),
 door('servingDoor','ground',['kitchen','dining'],'x',[-8.8,-1.5],1.8),
 door('landingBedroom','upper',['landing','bedroom'],'z',[-2.8,3.1],2),
 door('landingInfirmary','upper',['landing','infirmary'],'z',[-2.8,-4.9],2),
 door('landingGalleryNorth','upper',['landing','gallery'],'z',[2.8,-4.9],2),
 door('landingGallerySouth','upper',['landing','gallery'],'z',[2.8,3.1],2),
 door('cellarMortuary','basement',['cellarHall','mortuary'],'z',[-2.8,3.1],2),
 door('cellarBoiler','basement',['cellarHall','boiler'],'z',[2.8,-4.9],2),
 door('hiddenPanel','basement',['boiler','sealed'],'x',[8.8,-1.5],2.1,true)
];
// Door jamb bases are wider/deeper than plaster walls; preserve their actual
// .25 m × .47 m footprints so legs do not clip through decorative trim.
export const doorFrameObstacles=Object.fromEntries(Object.keys(floorY).map(floor=>[floor,doors.filter(d=>d.floor===floor).flatMap(d=>[-1,1].map(side=>{
 const x=d.pos[0]+(d.axis==='x'?side*d.width/2:0),z=d.pos[1]+(d.axis==='z'?side*d.width/2:0),hx=d.axis==='x'?.125:.235,hz=d.axis==='x'?.235:.125;
 return [x-hx,x+hx,z-hz,z+hz];
}))]));
const partitions=[
 ['ground','z',-2.8,-9.5,9.5,['dining','kitchen','grandHall','foyer']],
 ['ground','z',2.8,-9.5,9.5,['workshop','library','grandHall','foyer']],
 ['ground','x',-1.5,-12,-2.8,['kitchen','dining']],
 ['ground','x',-1.5,2.8,12,['workshop','library']],
 ['ground','x',5.5,-2.8,2.8,['grandHall','foyer']],
 ['upper','z',-2.8,-9.5,9.5,['infirmary','bedroom','landing']],
 ['upper','z',2.8,-9.5,9.5,['gallery','landing']],
 ['upper','x',-1.5,-12,-2.8,['infirmary','bedroom']],
 ['basement','z',-2.8,-9.5,9.5,['mortuary','cellarHall']],
 ['basement','z',2.8,-9.5,9.5,['boiler','sealed','cellarHall']],
 ['basement','x',-1.5,2.8,12,['boiler','sealed']]
];
// Each wall is split at the door opening. The renderer and physics consume
// these exact segments, avoiding invisible walls or apparent open passages.
function splitWall(floor,axis,fixed,start,end,rooms,exterior=false){
 const cuts=doors.filter(d=>d.floor===floor&&d.axis===axis&&Math.abs(d.pos[axis==='x'?1:0]-fixed)<.001)
  .map(d=>{const centre=d.pos[axis==='x'?0:1];return [Math.max(start,centre-d.width/2),Math.min(end,centre+d.width/2)];})
  .filter(([a,b])=>a<b).sort((a,b)=>a[0]-b[0]);
 let cursor=start;const segments=[];
 const add=(a,b)=>{if(b-a>.001)segments.push({floor,axis,x:axis==='x'?(a+b)/2:fixed,z:axis==='x'?fixed:(a+b)/2,width:axis==='x'?b-a:.22,depth:axis==='x'?.22:b-a,height:3.7,rooms,exterior});};
 for(const [a,b]of cuts){add(cursor,a);cursor=Math.max(cursor,b);}add(cursor,end);return segments;
}
export const walls=partitions.flatMap(p=>splitWall(...p));
for(const floor of Object.keys(floorY)){
 walls.push(...splitWall(floor,'x',-9.5,-12,12,[],true),...splitWall(floor,'x',9.5,-12,12,[],true),...splitWall(floor,'z',-12,-9.5,9.5,[],true),...splitWall(floor,'z',12,-9.5,9.5,[],true));
}
const f=(id,room,kind,x,z,width,height,depth,rotation=0,solid=true)=>({id,room,kind,pos:[x,0,z],size:[width,height,depth],rotation,solid});
export const furniture=[
 f('foyerConsole','foyer','console',-1.9,7.4,.62,.92,2.05),
 f('foyerCoatStand','foyer','coatStand',1.8,8.4,.62,2,.62),
 f('hallSideboard','grandHall','sideboard',-1.9,.1,.72,1.05,2.6),
 f('hallDisplay','grandHall','statue',1.8,.1,.68,1.9,.68),
 f('diningTable','dining','diningTable',-7.4,3.3,4.9,.92,2.3),
 ...[-9.3,-8,-6.7,-5.4].flatMap((x,i)=>[f('diningChairN'+i,'dining','chair',x,1.73,.62,1.1,.66),f('diningChairS'+i,'dining','chair',x,4.87,.62,1.1,.66,Math.PI)]),
 f('diningChairHeadW','dining','chair',-10.2,3.3,.66,1.1,.62,Math.PI/2),
 f('diningChairHeadE','dining','chair',-4.6,3.3,.66,1.1,.62,-Math.PI/2),
 f('grandfatherClock','dining','clock',-11.1,7.3,.8,2.45,.72),
 f('diningSideboard','dining','sideboard',-7.1,8.7,4.2,1.1,.85),
 f('diningFireplace','dining','fireplace',-11.5,-.3,.65,1.65,1.9),
 f('kitchenCounter','kitchen','counter',-8.05,-8.7,6.2,.94,.9),
 f('kitchenIsland','kitchen','prepTable',-7.2,-6.25,3.2,.95,1.3),
 f('kitchenStove','kitchen','stove',-11.1,-4.9,1.1,1.05,2),
 f('kitchenPantry','kitchen','cupboard',-11.2,-2.7,1,2.8,1.2),
 f('kitchenSink','kitchen','sink',-6,-8.7,1.4,.94,.9),
 f('workbench','workshop','workbench',7,-8.3,6.6,1.05,1.45),
 f('clockCabinet','workshop','clockCabinet',11.1,-6.3,.85,2.7,2.7),
 f('workshopDesk','workshop','desk',8.2,-2.45,2.2,.88,1.1),
 f('workshopToolRack','workshop','toolRack',4.5,-8.85,1.4,2.2,.42),
 f('grandPiano','library','piano',8.6,6.9,3.2,1.35,1.6),
 f('pianoBench','library','bench',8.6,5.55,1.6,.52,.55),
 f('musicBookcase','library','bookcase',11.3,2.7,.72,2.8,5),
 f('musicSofa','library','sofa',5.7,8.1,3.3,1.05,1.2),
 f('musicFireplace','library','fireplace',11.55,7.5,.65,1.65,2),
 f('landingCabinet','landing','displayCabinet',1.9,.1,.72,1.65,2.2),
 f('guestBed','bedroom','bed',-8.6,1.15,2.5,1.08,3.7),
 f('guestBedside','bedroom','bedside',-10.3,1.1,.66,.72,.66),
 f('guestWardrobe','bedroom','wardrobe',-11.25,7.5,.85,2.7,2),
 f('guestDesk','bedroom','desk',-7.4,8.65,2.1,.86,.95),
 f('guestArmchair','bedroom','armchair',-4.45,7.7,1.1,1.2,1.15),
 f('medicalBed','infirmary','medicalBed',-8.2,-7.1,2.1,.96,3.3),
 f('medicalDesk','infirmary','desk',-6.3,-2.6,2.4,.92,1.1),
 f('medicineCabinet','infirmary','medicineCabinet',-11.15,-3.1,1,2.5,1.7),
 f('medicalTrolley','infirmary','trolley',-10.5,-7.3,.85,.98,.8),
 f('galleryBenchNorth','gallery','bench',7.3,-5.7,3.2,.56,.8),
 f('galleryBenchSouth','gallery','bench',7.3,5.7,3.2,.56,.8),
 f('galleryStatue','gallery','statue',10.6,.2,.85,2.2,.85),
 f('cellarShelves','cellarHall','shelf',-1.9,-.4,.7,2.1,2.5),
 f('cellarCrates','cellarHall','crateStack',1.95,7.6,.8,1.1,1.2),
 f('mortuarySlabA','mortuary','coveredSlab',-8.7,-5.8,2,1,3.8),
 f('mortuarySlabB','mortuary','coveredSlab',-5.3,-5.8,2,1,3.8),
 f('mortuarySlabC','mortuary','coveredSlab',-8.7,.1,2,1,3.8),
 f('mortuaryRegister','mortuary','desk',-7.5,6.7,2.6,.9,1.25),
 f('mortuaryCabinet','mortuary','cabinet',-11.1,6.8,1.1,2.35,2.3),
 f('mainBoiler','boiler','boiler',8.2,-8,3.1,2.9,2),
 f('boilerWorkbench','boiler','workbench',5.6,-2.5,2.9,.96,1),
 f('boilerFuel','boiler','coalBin',11.1,-6.8,1.2,.92,1.5),
 f('boilerTools','boiler','toolRack',11.2,-4.5,.72,2.1,1.5),
 f('sealedArchive','sealed','bookcase',11.25,3,.8,2.9,5.5),
 f('sealedDesk','sealed','desk',7,6.7,3.1,1.05,1.65),
 f('sealedChair','sealed','chair',7,5.3,.7,1.05,.68),
 f('sealedCrates','sealed','crateStack',4.35,8.1,1.3,1.6,1.5)
];
// Horizontal [x,y,z] targets agree with the furniture beneath them.
export const evidencePositions={
 clock:[-11.1,1.9,7.3],ledger:[-7.2,1.08,-6.25],letter:[8.6,1.48,6.9],
 ward:[-6.3,1.03,-2.6],portrait:[-7.4,.98,8.65],maintenance:[5.6,1.08,-2.5],
 names:[-7.5,1.03,6.7],order:[7,1.18,6.7]
};
export const npcStations={father:[8,-4.9],cook:[-8,-4.5],sister:[7.1,3.2],doctor:[-8,-4.2],witness:[-7.2,4.3],caretaker:[8,-4.4]};
export const npcRooms={father:'workshop',cook:'kitchen',sister:'library',doctor:'infirmary',witness:'bedroom',caretaker:'boiler'};
export const npcRoutes={
 father:[[8,-4.9],[10.4,-3.7],[4.7,-3.8]],
 cook:[[-8,-4.5],[-4.7,-4.5],[-9.7,-3.1]],
 sister:[[7.1,3.2],[4.7,4.3],[9.9,3.2]],
 doctor:[[-8,-4.2],[-4.8,-4.2],[-10.3,-4.8]],
 witness:[[-7.2,4.3],[-4.5,5.7],[-10.2,5.7]],
 caretaker:[[8,-4.4],[9.8,-3.6],[5.2,-5.7]]
};
// Grand dogleg stair flights occupy the rear hall. The upstairs aperture is
// intentionally non-walkable; E changes floors from its safe front landing.
export const stairObstacles={
 ground:[
  [-2.45,-.25,-9.1,-5.8],[.25,2.45,-9.1,-5.8],
  [-2.42,-2.28,-5.69,-5.55],[2.28,2.42,-5.69,-5.55],
  [-4.6,-3.1,-8.9,-7.7],[-4.52,-4.44,-9.135,-7.565],[-3.16,-3.08,-9.135,-7.565]
 ],
 upper:[[-2.55,2.55,-9.4,-5.8],[-2.475,-.325,-5.77,-5.67],[.325,2.475,-5.77,-5.67]],
 basement:[[-1.625,-.375,-9.145,-7.65]]
};
export const passages={
 up:{room:'grandHall',floor:'ground',pos:[0,1,-5.5],to:'landing',spawn:[0,-5.5],th:'บันไดใหญ่ · ขึ้นชั้นสอง',en:'Grand staircase · upstairs'},
 down:{room:'kitchen',floor:'ground',pos:[-3.8,1,-7],to:'cellarHall',spawn:[-1,-7],th:'บันไดคนรับใช้ · ลงใต้ดิน',en:'Service staircase · cellar'},
 upstairsReturn:{room:'landing',floor:'upper',pos:[0,1,-5.5],to:'grandHall',spawn:[0,-5.5],th:'บันไดใหญ่ · ลงชั้นล่าง',en:'Grand staircase · downstairs'},
 cellarReturn:{room:'cellarHall',floor:'basement',pos:[-1,1,-7],to:'kitchen',spawn:[-3.8,-7],th:'บันไดคนรับใช้ · ขึ้นครัว',en:'Service staircase · kitchen'},
 secret:{room:'boiler',floor:'basement',pos:[8.8,1.1,-1.9],th:'ผนังลับ · เสียงเคาะ',en:'Hidden panel · the knocks'}
};
export const doorGraph=Object.fromEntries(Object.keys(roomLayouts).map(id=>[id,doors.filter(d=>d.rooms.includes(id)&&d.rooms.length===2).map(d=>({to:d.rooms.find(other=>other!==id),door:d.id,locked:d.locked}))]));
export function furnitureBounds(item){const [w,,d]=item.size,c=Math.abs(Math.cos(item.rotation)),s=Math.abs(Math.sin(item.rotation));const hx=(w*c+d*s)/2,hz=(w*s+d*c)/2;return [item.pos[0]-hx,item.pos[0]+hx,item.pos[2]-hz,item.pos[2]+hz];}
export function oldToMansion(roomId,position){const old={dining:[-2.9,2.35],kitchen:[-2.9,-2.35],workshop:[2.9,-2.35],library:[2.9,2.35],bedroom:[-2.9,2.35],infirmary:[-2.9,-2.35],gallery:[2.9,0],mortuary:[-2.9,0],boiler:[2.9,-2.35],sealed:[2.9,2.35]}[roomId],r=roomLayouts[roomId];if(!old||!r)throw new RangeError('Unknown original room: '+roomId);return [r.pos[0]+(position[0]-old[0])*1.25,position[1],r.pos[1]+(position[2]-old[1])*1.35];}
