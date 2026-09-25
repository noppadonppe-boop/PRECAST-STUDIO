import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(), work=path.join(root,'output/revit-p61-batch');fs.mkdirSync(work,{recursive:true});
const data=JSON.parse(fs.readFileSync('output/revit-p6/input.json','utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const types={};
const B=(x,y,z,w,l,h,m)=>['box',x,y,z,w,l,h,m];
const C=(x,y,z,r,h,m)=>['cyl',x,y,z,r,h,m];
function type(role,w,l,h){
 const key=`P104_${role}_${w}x${l}x${h}`;if(types[key])return key;
 let p=[],cat='OST_Furniture';
 if(role==='Table'){
  p=[C(w/2,l/2,h-35,Math.min(w,l)/2,35,'oak'),C(w/2,l/2,40,38,h-75,'black'),C(w/2,l/2,0,210,40,'black')];
 }else if(['Desk','Meeting','Dressing'].includes(role)){
  p.push(B(0,0,h-35,w,l,35,'oak'));for(const x of [40,w-70])for(const y of [40,l-70])p.push(B(x,y,0,30,30,h-35,'black'));
  if(role==='Desk')p.push(B(50,l/2-220,h,25,440,280,'black'));
 }else if(role==='Bed'){
  p=[B(0,0,60,w,l,230,'oak'),B(30,30,290,w-60,l-60,h-290,'white'),B(0,l-70,60,w,70,800,'oak'),B(80,l-500,h,w/2-120,360,80,'stone'),B(w/2+40,l-500,h,w/2-120,360,80,'stone')];
 }else if(role==='Sofa'){
  const narrow=w<l;p=[B(0,0,80,w,l,260,'oak'),B(30,30,340,w-60,l-60,120,'stone')];
  p.push(narrow?B(0,0,460,100,l,h-460,'stone'):B(0,l-100,460,w,100,h-460,'stone'));
 }else if(['Counter','Kitchen','Minibar'].includes(role)){
  p=[B(20,20,80,w-40,l-40,h-115,'oak'),B(0,0,h-35,w,l,35,'stone'),B(35,35,0,w-70,l-70,80,'black')];
 }else if(role==='Storage'){
  p=[B(0,0,60,w,20,h-60,'oak'),B(0,l-20,60,w,20,h-60,'oak'),B(0,20,60,20,l-40,h-60,'oak'),B(w-20,20,60,20,l-40,h-60,'oak'),B(0,0,h-20,w,l,20,'oak')];
  for(let z=60;z<h-30;z+=350)p.push(B(20,20,z,w-40,l-40,20,'oak'));
 }else if(role==='Deck'){
  cat='OST_GenericModel';for(let x=0;x<w;x+=146)p.push(B(x,0,157,Math.min(140,w-x),l,28,'deck'));
  for(let y=75;y<l;y+=450){p.push(B(25,y,57,w-50,50,100,'black'));for(let x=50;x<w-50;x+=950)p.push(B(x,y,-115,50,50,172,'black'));}
 }else if(role==='WC'){
  cat='OST_PlumbingFixtures';p=[B(50,l-180,0,w-100,160,700,'white'),C(w/2,l/2-60,200,180,180,'white'),C(w/2,l/2-60,380,190,25,'stone'),B(w/2-90,100,0,180,350,200,'white')];
 }else if(role==='Basin'){
  cat='OST_PlumbingFixtures';p=[B(0,0,h-120,w,25,120,'white'),B(0,l-25,h-120,w,25,120,'white'),B(0,25,h-120,25,l-50,120,'white'),B(w-25,25,h-120,25,l-50,120,'white'),B(25,25,h-120,w-50,l-50,10,'white'),C(50,l-60,h,12,150,'steel')];
 }else if(role==='Shower'){
  cat='OST_PlumbingFixtures';p=[B(0,0,0,30,50,h,'steel'),C(80,25,h-30,80,20,'steel')];
 }else if(role==='SlopedWindow'){
  cat='OST_Windows';p=[B(10,0,0,40,l,h,'black'),B(w-50,0,0,40,l,h,'black'),B(50,0,h-40,w-100,l,40,'black'),B(50,0,0,w-100,l,40,'black'),B(50,28,40,w-100,12,h-80,'glass')];
 }else if(role==='SlidingDoor'){
  cat='OST_Doors';p=[B(0,0,0,w,30,h,'oak'),B(w-90,-15,850,15,15,200,'black'),B(-30,-75,h+15,w+60,50,30,'black')];
 }else throw Error('Unmapped role '+role);
 types[key]={key,role,category:cat,parts:p,description:`${role} schematic ${w}x${l}x${h}mm; editable native extrusions; not procurement or structural design`};return key;
}
function clip(poly,axis,bound,greater){let r=[];for(let i=0;i<poly.length;i++){let a=poly[i],b=poly[(i+1)%poly.length],ia=greater?a[axis]>=bound:a[axis]<=bound,ib=greater?b[axis]>=bound:b[axis]<=bound;if(ia)r.push(a);if(ia!==ib){let t=(bound-a[axis])/(b[axis]-a[axis]);r.push(a.map((v,j)=>v+t*(b[j]-v)));}}return r;}
const models=[];
for(const m of data.models){
 if(m.id==='PM-I-B3')continue;
 const source=`deliverables/PM_Revit_48_P6/${m.id}/${m.id}_R2026_P01.rvt`;if(!fs.existsSync(source))throw Error(source);
 const r={id:m.id,plan:m.plan,profile:m.family,use:m.use,useName:['','Office','Home','Cafe','Resort'][m.use],source,sourceSha256:sha(source),sourceGeometrySha256:m.sourceSha256,dimensions:m.externalDimensionsMm,concreteCount:m.instances.length,openings:m.openings,items:[],partitions:m.fitout.partitions,internalDoors:m.fitout.doors,toiletProvision:m.fitout.toiletProvision,finishFloors:[],changes:[],status:'PREPARED_NOT_BUILT'};
 function add(family,mark,p,angle=0,group='ARC',note=''){r.items.push({family,mark,p,angle,group,note});}
 for(const f of m.instances.filter(i=>i.kind==='FLOOR')){
  const lib=data.library.find(l=>l.key===f.familyKey),b=f.boundsMm;
  let poly=lib.prisms[0].profile.map(p=>[p[0]+b.min[0],p[1]+b.min[1]]);
  let bounds=[b.min[0]+3,b.min[1]+3,b.max[0]-3,b.max[1]-3];
  if(b.min[1]<160)bounds[1]=160;
  if(m.plan==='I')bounds[3]=Math.min(bounds[3],5840);
  if(m.plan==='L')bounds[2]=Math.min(bounds[2],5840);
  for(const [a,n,g] of [[0,bounds[0],true],[1,bounds[1],true],[0,bounds[2],false],[1,bounds[3],false]])poly=clip(poly,a,n,g);
  if(poly.length<3)throw Error('Finish floor disappeared '+f.id);
  r.finishFloors.push({sourceId:f.id,poly,top:185,thickness:10});
 }
 const occupied=[];const seats=[];
 for(const f of m.fitout.items){
  if(f.kind==='WET_ROOM')continue;
  let role=f.label.includes('เตียง')?'Bed':f.label.includes('โต๊ะทำงาน')||f.label==='ทำงาน'?'Desk':f.label.includes('แต่งตัว')?'Dressing':f.label.includes('ประชุม')?'Meeting':f.label.includes('โต๊ะลูกค้า')?'Table':f.label.includes('เคาน์เตอร์')?'Counter':f.label.includes('ครัว')?'Kitchen':f.label.includes('มินิบาร์')?'Minibar':f.label.includes('ตู้')?'Storage':['โซฟา','ที่นั่ง','พักคอย'].includes(f.label)?'Sofa':null;
  if(!role)throw Error('Unmapped '+f.label);
  const p=[...f.minMm];p[2]=185;let [w,l,h]=f.sizeMm;
  // Reuse the reviewed cafe arrangement in the other three I profiles.
  if(m.plan==='I'&&m.use===3){if(f.id==='F02')p[1]=1025;if(f.id==='F03')p[1]=2575;if(f.id==='F04')p[0]=2150;}
  add(type(role,w,l,h),f.id,p,0,'ARC',f.label+' / source P36 footprint; study finish datum+185');
  occupied.push([p[0],p[1],p[0]+w,p[1]+l]);
  if(['Desk','Dressing','Table','Meeting'].includes(role))seats.push({f,p,w,l,role});
  if(['Kitchen','Counter','Minibar'].includes(role)){
   add(type('Basin',Math.min(400,w-60),Math.min(450,l-100),170),'SN-'+f.id,[p[0]+30,p[1]+50,185+h],0,'MEP','Countertop basin location; no designed services');
   if(role==='Counter')add('P61_Espresso_Placeholder','EQ-'+f.id,[p[0]+50,p[1]+l-680,185+h]);
  }
 }
 function inside(x,y){if(m.plan==='I')return x>200&&x<2800&&y>220&&y<5780;return ((x>220&&x<2780&&y>220&&y<5780)||(x>220&&x<m.externalDimensionsMm[0]-220&&y>3220&&y<5780)||(m.plan==='U'&&x>6220&&x<8780&&y>220&&y<5780));}
 const wet=m.fitout.items.find(f=>f.kind==='WET_ROOM');if(wet)occupied.push([wet.minMm[0],wet.minMm[1],wet.minMm[0]+wet.sizeMm[0],wet.minMm[1]+wet.sizeMm[1]]);
 for(const s of seats){
  const {p,w,l,role,f}=s,candidates=role==='Desk'||role==='Dressing'?[[p[0]+w+230,p[1]+l/2,Math.PI/2],[p[0]-230,p[1]+l/2,-Math.PI/2]]:[[p[0]+w/2,p[1]-230,Math.PI],[p[0]+w/2,p[1]+l+230,0],[p[0]-230,p[1]+l/2,-Math.PI/2],[p[0]+w+230,p[1]+l/2,Math.PI/2]];
  let count=0;
  for(const [x,y,a] of candidates){const b=[x-210,y-210,x+210,y+210];if(![[b[0],b[1]],[b[2],b[1]],[b[0],b[3]],[b[2],b[3]]].every(([x,y])=>inside(x,y)))continue;if(occupied.some(o=>b[0]<o[2]+5&&b[2]>o[0]-5&&b[1]<o[3]+5&&b[3]>o[1]-5))continue;add('P61_Chair','CH-'+f.id+'-'+(++count),[x,y,185],a);occupied.push(b);if(count===(role==='Desk'||role==='Dressing'?1:2))break;}
  r.changes.push({sourceItem:f.id,addedChairs:count,basis:'2D non-overlapping spatial proposal; native solid QA still required'});
 }
 if(wet){
  const [x,y]=wet.minMm,[w,l]=wet.sizeMm;
  add(type('WC',500,650,700),'WC-01',[x+w-650,y+l-750,185],0,'MEP','WC spatial proposal; trap and clearances by architect/plumbing designer');
  add(type('Basin',320,380,800),'WB-01',[x+100,y+450,185],0,'MEP','Compact basin spatial proposal');
  if(m.use===2||m.use===4)add(type('Shower',30,50,1800),'SHR-01',[x+90,y+l-250,185],0,'MEP','Wet-room shower position; no dedicated enclosure or drainage falls designed');
  add('P61_WaterDrainPoint','WP-WC',[x+w/2,y+l/2,185],0,'MEP','Drain/water interface only; no slab penetration');
 }
 for(const d of m.fitout.doors)add(type('SlidingDoor',780,30,1970),d.id,[d.fromMm[0]+10,d.fromMm[1]+20,185],0,'ARC','Sliding leaf closed proposal; head/track clearance and clear passage pending');
 for(const o of m.openings){
  const host=m.instances.find(i=>i.id===o.instanceId),a=o.cornersMm[0],b=o.cornersMm[1],alongX=Math.abs(b[0]-a[0])>1;
  const normalAxis=alongX?1:0,plane=a[normalAxis],min=host.boundsMm.min[normalAxis],max=host.boundsMm.max[normalAxis];
  const inward=Math.abs(plane-min)<=Math.abs(plane-max)?1:-1;
  let p=[...a],angle=0;
  if(alongX){angle=inward>0?0:Math.PI;p[0]=inward>0?Math.min(a[0],b[0]):Math.max(a[0],b[0]);p[1]+=inward*35;}
  else{angle=inward<0?Math.PI/2:-Math.PI/2;p[1]=inward<0?Math.min(a[1],b[1]):Math.max(a[1],b[1]);p[0]+=inward*35;}
  p[2]+=10;
  const slope=200/2825,tilted=m.family==='D'&&o.type==='W01';
  if(tilted)p[normalAxis]+=inward*slope*(p[2]-175);
  add(o.type==='W01'?(tilted?type('SlopedWindow',900,70,1180*Math.sqrt(1+slope*slope)):'P61_Window_900x1200'):'P61_Door_1000x2100',o.id,p,angle,'ARC','Existing rough opening '+o.instanceId);
  if(tilted){r.items.at(-1).tilt=-Math.atan(slope);r.changes.push({opening:o.id,adaptation:'Frame follows D inclined wall: source200mm offset /2825mm rise; vertical rough opening retained'});}
 }
 add('P61_AC_Indoor','AC-I01',[1050,180,2370],0,'MEP','Above front door; no capacity selection');
 if(m.plan==='L'||m.plan==='U')add('P61_AC_Indoor','AC-I02',[5820,4050,2370],Math.PI/2,'MEP','East wing location; capacities and piping TBD');
 if(m.plan==='U')add('P61_AC_Indoor','AC-I03',[7050,180,2370],0,'MEP','Right wing location only');
 add('P61_AC_Outdoor','AC-O01',[m.externalDimensionsMm[0]+250,6200,-45],0,'MEP','Outdoor equipment zone only; number and duties by designer');
 for(const [j,p] of [[1500,1200,2490],[1500,2800,2490],...(m.plan==='I'?[[1500,4000,2490]]:[[4300,4500,2450]]),...(m.plan==='U'?[[7500,1250,2490],[7500,2800,2490],[7500,4500,2450]]:[])].entries())add('P61_Pendant','LT-'+(j+1),p,0,'MEP','Lighting location only');
 add('P61_DB','DB-01',[2700,180,1185],Math.PI/2,'MEP','Front-wall electrical board coordination zone; service access to coordinate');
 for(const [j,p] of [[190,1300,485],[190,3000,1185],...(m.plan==='I'?[]:[[4000,5700,485]]),...(m.plan==='U'?[[6200,1500,485]]:[])].entries())add('P61_Socket','SO-'+(j+1),p,0,'MEP','Outlet coordination zone only; wall mounting, type/circuit/protection TBD');
 for(const x of (m.plan==='U'?[0,6000]:[0])){add(type('Deck',3000,1500,185),'DK-'+x,[x,-1515,0],0,'ARC','Entrance timber terrace; support geometry is a reservation, not engineered');add('P61_Step','ST-'+x,[x+900,-1815,7]);add('P61_Planter','PL-'+x,[x+450,-900,185]);}
 if(m.use===3){
  if(m.plan==='I'){
   add(type('Deck',1454,6000,185),'DK-SIDE',[3015,0,0]);
   for(const [j,y] of [900,2550].entries()){
    add('P61_Table_R650','OT-'+j,[3790,y,185]);
    add('P61_Chair','OC-'+j+'-1',[3790,y-550,185],Math.PI);
    add('P61_Chair','OC-'+j+'-2',[3790,y+550,185]);
   }
   for(const [j,y] of [3200,4700].entries()){add('P61_Awning_1100','AW-'+j,[3010,y,2330]);add('P61_ServiceShelf_900','SS-'+j,[3010,y+100,1040]);}
  }else{
   for(const [j,x] of [3200,4700].entries()){add('P61_Awning_1100','AW-'+j,[x,2990,2330],-Math.PI/2);add('P61_ServiceShelf_900','SS-'+j,[x+100,2990,1040],-Math.PI/2);}
  }
 }
 if(m.family==='D'){
  for(const it of r.items){
   if(it.mark.startsWith('SO-')&&it.p[0]<300)it.p[0]=150.375441+(it.p[2]+85-175)*200/2825+10;
   if(it.mark.startsWith('AW-')||it.mark.startsWith('SS-')){
    const delta=(it.p[2]-175)*200/2825;
    if(m.plan==='I')it.p[0]-=delta;else it.p[1]+=delta;
   }
  }
 }
 models.push(r);
}
if(models.length!==47||new Set(models.map(m=>m.id)).size!==47)throw Error('Wrong scope');
for(const r of models){if(r.items.some(i=>!i.p.every(Number.isFinite)||!Number.isFinite(i.angle)))throw Error('Nonfinite '+r.id);if(new Set(r.items.map(i=>i.mark)).size!==r.items.length)throw Error('Duplicate marks '+r.id);if(r.items.filter(i=>/^W\d/.test(i.mark)).length!==r.openings.filter(o=>o.type==='W01').length)throw Error('Missing openings '+r.id);}
fs.writeFileSync(path.join(work,'input.json'),JSON.stringify({revision:'P104',models,types:Object.values(types),pilotPreserved:'PM-I-B3/P103'},null,2));
fs.writeFileSync(path.join(work,'preparation-audit.json'),JSON.stringify({preparedModels:47,uniqueFurnitureTypes:Object.keys(types).length,sourceRvtHashes:47,sourceConcreteCounts:[...new Set(models.map(m=>m.concreteCount))],sourceUntouched:true,nativeBuild:'NOT_STARTED',perProduct:models.map(m=>({id:m.id,items:m.items.length,windows:m.openings.filter(o=>o.type==='W01').length,floors:m.finishFloors.length,partitions:m.partitions.length,use:m.useName}))},null,2));
if(!fs.existsSync(path.join(work,'progress.json')))fs.writeFileSync(path.join(work,'progress.json'),JSON.stringify({revision:'P104',authorizedAdditional:47,acceptedPilot:1,newDelivered:0,totalDelivered:1,totalTarget:48,completionPercent:100/48,preparedRecipes:47,nativeChecksPending:47,status:'IN_PROGRESS'},null,2));
console.log(JSON.stringify({recipes:models.length,newFamilyTypes:Object.keys(types).length,status:'PREPARED_NOT_NATIVE_BUILT'}));
