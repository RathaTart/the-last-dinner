// Original procedural scenery; no purchased or copied game artwork.
export function buildExpansion({groups,box,cyl,ball}){
 for(const [id,g]of Object.entries(groups))if(id!=='ground'){
  const dark=id==='basement';box(12.6,.5,10.5,0,-.36,0,dark?'#172025':'#302c30',g);box(12.2,.12,9.7,0,.03,0,dark?'#465151':'#6e6157',g);
  for(let i=0;i<18;i++)box(12,.01,.014,0,.105,-4.5+i*.52,dark?'#343d3d':'#4f453e',g);
  box(12.2,2.7,.16,0,1.4,-4.85,dark?'#333d3b':'#4c4249',g);box(.16,2.7,9.7,-6.04,1.4,0,dark?'#333d3b':'#4c4249',g);
  for(const z of [-3.1,3.1])box(.16,.95,3.4,0,.56,z,'#655b52',g);
  if(id==='upper')box(4.4,.95,.14,-3.8,.56,0,'#655b52',g);else box(4.4,.95,.14,3.8,.56,0,'#414a47',g);
 }
 const u=groups.upper,b=groups.basement;
 // Upstairs guest bed, bedside photograph, medical cot and a tampered register.
 box(2.2,.55,1.7,-3.4,.48,2.65,'#514449',u);box(2.15,.15,1.65,-3.4,.82,2.65,'#b7b0a0',u);box(2.15,.08,1.1,-3.4,.95,2.9,'#5e6267',u);box(1.3,.15,.36,-3.4,.95,2.05,'#d0c6b0',u);box(.6,.65,.6,-5,.47,2.65,'#6b4e3d',u);box(.36,.03,.27,-3.4,1.03,2.6,'#ddd0b0',u);
 box(2.2,.6,1.5,-3.4,.49,-2.25,'#747b77',u);box(2.1,.16,1.4,-3.4,.88,-2.25,'#c8c5b5',u);box(.8,.05,.38,-3.5,1,-2.1,'#ad765e',u);
 for(let i=0;i<5;i++){box(.65,1.6,.4,-5.2+i*.82,.92,-4.4,'#67716a',u);box(.57,.04,.44,-5.2+i*.82,1.17,-4.34,'#b2b39f',u);}
 for(let i=0;i<6;i++){box(.06,.8,.6,5.8,1.6,-3.9+i*1.4,'#9c7e52',u);box(.07,.66,.47,5.75,1.6,-3.9+i*1.4,'#302d31',u);ball(.12,5.68,1.65,-3.9+i*1.4,'#777260',u);}
 box(3.5,.65,.65,3.5,.46,-4.2,'#614a42',u);
 // Basement: two covered slabs, rust hooks, dried stains, pressure pipes.
 for(const z of [-3,1.6]){box(2,.7,1.2,-3.5,.5,z,'#5a6865',b);box(1.9,.08,1.1,-3.5,.91,z,'#babdb0',b);for(const x of [-4.1,-2.9])box(.16,.36,.6,x,.25,z,'#333c3b',b);}
 box(.65,.02,.4,-3.4,1,1.7,'#d5c4a3',b);
 for(let i=0;i<4;i++){const stain=cyl(.22,.014,-4.8+i*.48,.12,-.5+i*.1,'#502b2d',b);stain.scale.z=.48;const hook=cyl(.025,.55,-5.6,1.95,-3+i*1.6,'#755c47',b);ball(.065,-5.55,1.69,-3+i*1.6,'#755c47',b);}
 cyl(.74,1.45,3.8,.89,-3.3,'#444c4b',b);for(const x of [3.4,4.2]){cyl(.08,1.4,x,2.1,-3.3,'#81755d',b);box(.16,.16,1.5,x,2.75,-2.65,'#81755d',b);}
 box(.8,.06,.5,3.1,1.05,-2.1,'#baa988',b);
 // The archive table and small escape opening become visible after unlocking.
 box(2,.85,1,3.6,.55,2.9,'#513f36',b);box(.65,.025,.46,3.2,1.05,2.7,'#d8c6a5',b);box(.8,.7,.1,5.8,.6,3.8,'#131d1f',b);box(.12,.75,.2,5.3,.6,3.8,'#846d52',b);
 const door=box(1.4,1.8,.16,1.02,.96,.02,'#333e3b',b);box(.1,1.1,.23,1.63,.97,-.12,'#9e8261',b);
 // Stair platforms are outside the furniture routes, at the central crossing.
 for(const [g,x,z]of [[groups.ground,.7,.7],[u,.7,.7],[groups.ground,-.7,.7],[b,-.7,.7]]){for(let i=0;i<4;i++)box(.65,.07,.14,x,.14+i*.07,z+i*.12,'#8e7d67',g);box(.05,.55,.6,x-.34,.48,z+.22,'#a18a64',g);}
 const blood=cyl(.18,.012,-3.8,1.1,-2.05,'#4b2526',groups.ground);blood.scale.z=.5;
 return {door};
}
