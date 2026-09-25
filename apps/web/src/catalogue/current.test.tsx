import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import {CurrentCatalogue} from './CurrentCatalogue';
vi.mock('./Catalogue',()=>({Catalogue:()=> <div>Original collection fixture</div>}));
const root=resolve(import.meta.dirname,'../../../..');
const json=<T,>(p:string):T=>JSON.parse(readFileSync(resolve(root,p),'utf8')) as T;
const catalogue=json<{products:{model:string;id:string;displayCode:string;pieceCount:number}[]}>('output/stage3-designs-p36/catalogue.json');
const artifact=(id:string)=>({id,href:'/api/catalogue/current/artifacts/'+id,filename:id+'.png',bytes:1,sha256:'test',contentType:'image/png'});
const products=catalogue.products.map((p:{model:string;id:string;displayCode:string;pieceCount:number})=>{
 const m=json<Record<string,unknown>>('output/stage3-designs-p36/'+p.model);return {...m,pieceCount:p.pieceCount,sheets:[1,2,3].map(i=>({png:artifact(p.id+'-'+i),svg:null})),modelArtifact:null,scheduleArtifact:null,slots:[{id:p.id+'-RVT',kind:'RVT',dueStage:'P6',intakeStatus:'NOT_CREATED'},{id:p.id+'-STD',kind:'STD',dueStage:'P7',intakeStatus:'NOT_CREATED'}]};
});
const data={status:'CURRENT_DEVELOPMENT',products,typical:[],bundles:[],access:{name:'Test',mode:'LOCAL_OWNER_PREVIEW'}};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function start(value:unknown=data){vi.stubGlobal('scrollTo',vi.fn());vi.stubGlobal('fetch',vi.fn(()=>Promise.resolve({ok:true,json:()=>Promise.resolve(value)})));render(<CurrentCatalogue/>);await screen.findByText('Original collection fixture');fireEvent.click(screen.getByRole('button',{name:'แบบและข้อมูลชุดใหม่'}));}
it('shows48 current designs and filters by use, profile and tag',async()=>{
 await start();await screen.findByText('พบ 48 แบบ');fireEvent.click(screen.getByRole('button',{name:/ร้านกาแฟ 12 แบบ/}));expect(screen.getByText('พบ 12 แบบ')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'C · มุมหลังคา–ผนังโค้ง'}));expect(screen.getByText('พบ 3 แบบ')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('ค้นหาแบบหรือ Tag'),{target:{value:'U-C3'}});expect(screen.getByText('พบ 1 แบบ')).toBeInTheDocument();
});
it('opens current drawings, BOM, dimensions and honest native slots',async()=>{
 await start();await screen.findByText('พบ 48 แบบ');fireEvent.click(screen.getByRole('button',{name:'เปิด I-C1'}));expect(screen.getByText('01 · แปลน + ภาพ 3D')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'ชิ้นงาน / น้ำหนัก'}));expect(screen.getByText(/น้ำหนักคอนกรีตรวม/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'มิติ / ช่องเปิด'}));expect(screen.getByText('3000 × 6000 × 3000')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'BIM / Engineering / แม่แบบ'}));expect(screen.getAllByText(/ยังไม่สร้าง · NOT_CREATED/)).toHaveLength(2);
});
it('compares three current plans',async()=>{await start();await screen.findByText('พบ 48 แบบ');fireEvent.click(screen.getByRole('button',{name:'เปรียบเทียบ I/L/U'}));expect(screen.getAllByRole('button',{name:/^เปิด [ILU]-C1$/})).toHaveLength(3);});
it('shows verified Revit downloads while an unregistered STAAD slot remains uncreated',async()=>{
 const files=[{...artifact('PM-I-C1-P6-RVT'),kind:'RVT',filename:'PM-I-C1.rvt'}];
 await start({...data,nativeFileCount:1,products:products.map((p,index)=>catalogue.products[index]?.id==='PM-I-C1'?{...p,revitDelivery:{status:'NATIVE_AND_DRAWINGS_VERIFIED',softwareVersion:'2026',files},slots:p.slots.map(s=>s.kind==='RVT'?{...s,intakeStatus:'AVAILABLE'}:s)}:p)});
 fireEvent.click(screen.getByRole('button',{name:'เปิด I-C1'}));fireEvent.click(screen.getByRole('button',{name:'BIM / Engineering / แม่แบบ'}));
 expect(screen.getByRole('button',{name:/RVT ·/})).toBeInTheDocument();expect(screen.getByText('AVAILABLE')).toBeInTheDocument();expect(screen.getAllByText(/ยังไม่สร้าง · NOT_CREATED/)).toHaveLength(1);
});
it('shows P150 starter downloads and keeps analysis and design at zero',async()=>{
 const files=[{...artifact('PM-I-C1-P150-STD'),kind:'STD',filename:'PM-I-C1-STARTER-R01.STD'},{...artifact('PM-I-C1-P150-ZIP'),kind:'ZIP',filename:'PM-I-C1-STARTER-R01.zip'}];
 await start({...data,stage7Complete:true,starterFileCount:48,analysedProductCount:0,rcDesignedProductCount:0,products:products.map((p,index)=>catalogue.products[index]?.id==='PM-I-C1'?{...p,staadDelivery:{status:'LIBRARY_READY_STARTER',revision:'R01',nativeValidationStatus:'NOT_RUN_BY_CURRENT_SCOPE',analysisStatus:'NOT_RUN',designStatus:'NOT_RUN',engineerReviewStatus:'REQUIRED_BEFORE_RUN',files},slots:p.slots.map(s=>s.kind==='STD'?{...s,intakeStatus:'AVAILABLE',artifactStatus:'LIBRARY_READY_STARTER',nativeValidationStatus:'NOT_RUN_BY_CURRENT_SCOPE',analysisStatus:'NOT_RUN',designStatus:'NOT_RUN',engineerReviewStatus:'REQUIRED_BEFORE_RUN'}:s)}:p)});
 expect(screen.getByText(/STAAD starter 48\/48 แบบ.*วิเคราะห์ 0\/48.*RC design 0\/48/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'เปิด I-C1'}));fireEvent.click(screen.getByRole('button',{name:'BIM / Engineering / แม่แบบ'}));
 expect(screen.getByText('STAAD Starter · LIBRARY_READY_STARTER')).toBeInTheDocument();expect(screen.getByText(/NOT_RUN_BY_CURRENT_SCOPE · analysis NOT_RUN · design NOT_RUN/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'STD · PM-I-C1-STARTER-R01.STD'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'ZIP · PM-I-C1-STARTER-R01.zip'})).toBeInTheDocument();
});
it('fails closed for stale sources instead of showing outdated drawings',async()=>{await start({...data,status:'STALE'});await screen.findByText('ต้นทางมีการเปลี่ยนแปลง');expect(screen.queryByText('พบ 48 แบบ')).not.toBeInTheDocument();});
it('purges private data on unauthorized response',async()=>{vi.stubGlobal('fetch',vi.fn(()=>Promise.resolve({ok:false,status:401,json:()=>Promise.resolve(null)})));render(<CurrentCatalogue/>);await screen.findByRole('heading',{name:'เข้าสู่คลังแบบ'});expect(screen.queryByRole('button',{name:'เปิด I-C1'})).not.toBeInTheDocument();});
it('defaults to original collection and preserves an explicit new-data tab',async()=>{vi.stubGlobal('scrollTo',vi.fn());vi.stubGlobal('fetch',vi.fn(()=>Promise.resolve({ok:true,json:()=>Promise.resolve(data)})));render(<CurrentCatalogue/>);expect(await screen.findByText('Original collection fixture')).toBeInTheDocument();expect(screen.queryByText('พบ 48 แบบ')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'แบบและข้อมูลชุดใหม่'}));expect(screen.getByText('พบ 48 แบบ')).toBeInTheDocument();});
