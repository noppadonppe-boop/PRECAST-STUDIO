import {render,screen,fireEvent} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {MouldLibrary} from './MouldLibrary';
const artifact=(id:string,name:string)=>({id,filename:name,href:'/api/catalogue/moulds/artifacts/'+id,sha256:'test',bytes:100});
const setup={id:'MF-A-H15-LH-W01-P08-P38',typicalId:'TS-A-H15-LH-W01-P08',kind:'HALF_SHELL',concreteKg:1500,dimensionsMm:[1490,2500,1485],usedBy:[],files:[],developmentFiles:[],liftingFiles:[],hardwareStatus:'CONTACT_SKINS_AND_LOADS_ONLY',supplementGroups:[
 {revision:'P66',label:'ฐานเดิม',role:'HISTORICAL_SUBSYSTEM',files:[artifact('OLD','old.json')]},
 {revision:'P85',label:'ฐานล่าสุด',role:'CURRENT_BASE',files:[artifact('BASE','current.png')]},
 {revision:'P86',label:'แรงขาฐาน',role:'ANALYSIS_STUDY',files:[artifact('ANALYSIS','forces.png'),artifact('RAW','forces.json')]}
]};
const data={status:'STAGE5_PLANNING_SCOPE_COMPLETE',setups:[setup],archive:null,developmentRevision:'P61',supplementRevision:'P87',scopeClosureRevision:'P100',stageCompletionPercent:100,stageComplete:true,stageClosure:artifact('P100','register.json'),deferredWorkstreams:[{id:'PE-01',title:'รายละเอียดผลิต',ownerStage:'PRODUCTION_ENGINEERING'}]};
afterEach(()=>vi.unstubAllGlobals());
async function start(value:unknown=data){vi.stubGlobal('scrollTo',vi.fn());vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>value}));render(<MouldLibrary/>);await screen.findByText('พบ 1 setup');fireEvent.click(screen.getByRole('button',{name:'เปิดแม่แบบ '+setup.typicalId}));}
it('separates current geometry, study demand and historical components',async()=>{
 await start();expect(screen.getByRole('heading',{name:'P87 — รายละเอียดแม่แบบและผลตรวจล่าสุด'})).toBeInTheDocument();
 expect(screen.getByText(/ไม่รวมฐาน P66 หรือค้ำ P67 ซ้ำ/)).toBeInTheDocument();
 const old=screen.getByText(/P66 — ฐานเดิม/).closest('details'),base=screen.getByText(/P85 — ฐานล่าสุด/).closest('details');
 expect(old?.open).toBe(false);expect(base?.open).toBe(true);
 expect(screen.getByText(/P86 — แรงขาฐาน · กรณีศึกษาแรง ไม่ใช่กำลังรับได้/)).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'P86 · forces.json'})).toBeInTheDocument();
});
it('handles a single authorized analysis file without disclosing original images',async()=>{
 await start({...data,setups:[{...setup,supplementGroups:[{...setup.supplementGroups[2],files:[artifact('RAW','forces.json')]}]}]});
 expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'P85 · current.png'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'P86 · forces.json'})).toBeInTheDocument();
});
it('does not show mould data after denied membership',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:403}));render(<MouldLibrary/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('ไม่มีสิทธิ์อ่านแบบแม่แบบ');expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
it('distinguishes a conditional component check from full connection approval',async()=>{
 await start({...data,supplementRevision:'P88',setups:[{...setup,supplementGroups:[...setup.supplementGroups,{revision:'P88',label:'ตรวจตัวโบลต์',role:'CONDITIONAL_COMPONENT_CHECK',files:[artifact('P88','checks.png')]}]}]});
 expect(screen.getByText(/P88 ตรวจตัวโบลต์และแรงกดรูแผ่นขาแบบมีเงื่อนไข/)).toBeInTheDocument();
 expect(screen.getByText(/P88 — ตรวจตัวโบลต์ · ตรวจองค์ประกอบเฉพาะกรณี ยังไม่ผ่านทั้งจุดต่อ/)).toBeInTheDocument();
 expect(screen.getByText(/ไม่รวมฐาน P66 หรือค้ำ P67 ซ้ำ/)).toBeInTheDocument();
});
it('labels the new hardware as a candidate and keeps P85 current analysis geometry separate',async()=>{
 await start({...data,supplementRevision:'P89',setups:[{...setup,supplementGroups:[...setup.supplementGroups,{revision:'P89',label:'ทางเลือกเกลียว',role:'UNADOPTED_CANDIDATE',files:[artifact('P89','candidate.png')]}]}]});
 expect(screen.getByText(/P89 เป็นแบบทางเลือกโบลต์และแหวน ยังไม่แทน geometry P85/)).toBeInTheDocument();
 expect(screen.getByText(/P89 — ทางเลือกเกลียว · แบบทางเลือก ยังไม่เป็นรุ่นวิเคราะห์ที่ยืนยันแล้ว/).closest('details')?.open).toBe(true);
 expect(screen.getByText(/P85 — ฐานล่าสุด/).closest('details')?.open).toBe(true);
 expect(screen.getByRole('button',{name:'P89 · candidate.png'})).toBeInTheDocument();
});
it('shows new P90 demand without claiming candidate capacity approval',async()=>{
 await start({...data,supplementRevision:'P90',setups:[{...setup,supplementGroups:[...setup.supplementGroups,{revision:'P90',label:'แรง P89',role:'ANALYSIS_STUDY',files:[artifact('P90','candidate-forces.png')]}]}]});
 expect(screen.getByText(/P90 วิเคราะห์แรงขาฐาน W01 ใหม่/)).toBeInTheDocument();
 expect(screen.getByText(/ไม่รวมฐาน P66 หรือค้ำ P67 ซ้ำ/)).toBeInTheDocument();
 expect(screen.getByText(/P90 — แรง P89 · กรณีศึกษาแรง ไม่ใช่กำลังรับได้/)).toBeInTheDocument();
});
it('shows P92 updated static component checks without certifying repeated service',async()=>{
 await start({...data,supplementRevision:'P92',setups:[{...setup,supplementGroups:[...setup.supplementGroups,{revision:'P92',label:'จุดยึดขาผนัง',role:'CONDITIONAL_COMPONENT_CHECK',files:[artifact('P92','connection.png'),artifact('P92-QC','INSPECTION_TH.md')]}]}]});
 expect(screen.getByText(/P92 จับคู่แรงดึง P90 กับแรงเฉือน P85/)).toBeInTheDocument();
 expect(screen.getByText(/ไม่ใช่การรับรองใช้แม่แบบซ้ำ/)).toBeInTheDocument();
 expect(screen.getByText(/ไม่รวมฐาน P66 หรือค้ำ P67 ซ้ำ/)).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'P92 · INSPECTION_TH.md'})).toBeInTheDocument();
 expect(screen.getByText(/P92 — จุดยึดขาผนัง · ตรวจองค์ประกอบเฉพาะกรณี ยังไม่ผ่านทั้งจุดต่อ/)).toBeInTheDocument();
});
it('shows an authorized closure file alone without leaking engineering images',async()=>{
 await start({...data,setups:[{...setup,supplementGroups:[],closureFile:artifact('CLOSURE','closure.json'),closureReview:{revision:'P90',completeP40Design:false,next:'ตรวจระบบพยุง',liftingCoordinateReview:'REMAP_REQUIRED_P52_TO_P56',openDeliverables:8}}]});
 expect(screen.getByRole('button',{name:'ดาวน์โหลดบัญชีประวัติ P90 JSON'})).toBeInTheDocument();
 expect(screen.getByText(/ต้องปรับพิกัดยกจากP52/)).toBeInTheDocument();
 expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
it('reconciles the historical P90 remap note with a granted current P91 layout',async()=>{
 await start({...data,setups:[{...setup,sourceRevision:'P56',supplementGroups:[],liftingFiles:[artifact('P52','old-lift.png')],currentLiftingFiles:[artifact('P91','CS1.json')],developmentFiles:[artifact('M56','CS1.json')],closureFile:artifact('CLOSURE','closure.json'),closureReview:{revision:'P90',completeP40Design:false,next:'แปลงแผนยก P52',liftingCoordinateReview:'REMAP_REQUIRED_P52_TO_P56',openDeliverables:8}}]});
 expect(screen.getByText(/P91 ปรับพิกัดยกให้ตรงท่าหล่อ P56 แล้ว/)).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'P52 — โซนยกและแนวเหล็กคอนกรีต (ประวัติท่าหล่อเดิม)'})).toBeInTheDocument();
 expect(screen.queryByText(/ต้องปรับพิกัดยกจากP52ให้ตรง/)).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'ดาวน์โหลด P91 CS1.json'})).toBeInTheDocument();
 expect(screen.queryByText(/มีรายละเอียดโครง\/ฐาน\/ค้ำผนังเพิ่มแล้ว/)).not.toBeInTheDocument();
});
