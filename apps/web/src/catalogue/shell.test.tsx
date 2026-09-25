import {fireEvent,render,screen} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
import {ShellStudyView} from './ShellStudyView';
import type {ShellStudy} from './model';
const root=resolve(import.meta.dirname,'../../../..');
const raw=JSON.parse(readFileSync(resolve(root,'output/tsc-step2b-r00/web_summary.json'),'utf8'));
const study={...raw,drawings:raw.drawings.map((d:{id:string;title:string})=>({...d,artifact:{id:d.id,url:`/api/catalogue/artifacts/${d.id}`,bytes:100,revision:raw.revision,status:raw.status}}))} as ShellStudy;
it('compares only computed cases while keeping QA warning and fixed-board labels',()=>{
  render(<ShellStudyView study={study}/>);
  expect(screen.getByText('คำนวณ shell แล้ว แต่ QA ยังไม่ครบ — ห้ามใช้เลือกเหล็กหรือผลิต')).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:/T175-P-H-FULL-M3/})).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('ความหนา shell'),{target:{value:'0.2'}});
  fireEvent.change(screen.getByLabelText('กรณีจุดต่อ shell'),{target:{value:'F-R'}});
  fireEvent.change(screen.getByLabelText('รูปแบบโหลด shell'),{target:{value:'LEFT'}});
  expect(screen.getByRole('heading',{name:/T200-F-R-LEFT-M3/})).toBeInTheDocument();
  expect(screen.getByText('แรงภายในยังไม่ครบเกณฑ์ 5%')).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:/ภาพอ้างอิงคงที่/})).toBeInTheDocument();
});
it('shows stale engineering results explicitly',()=>{
  render(<ShellStudyView study={{...study,status:'STALE'}}/>);
  expect(screen.getByText('ข้อมูลต้นทางเปลี่ยน — ผลนี้ต้องสร้างใหม่')).toBeInTheDocument();
});
