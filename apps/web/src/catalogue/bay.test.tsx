import {fireEvent,render,screen,within} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
import {BayStudyView} from './BayStudyView';
import type {BayStudy} from './model';
const raw=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../../../output/tsc-step2d-r00/web_summary.json'),'utf8'));
const study={...raw,drawings:raw.drawings.map((d:{id:string;title:string})=>({...d,artifact:{id:d.id,url:`/api/catalogue/artifacts/${d.id}`,bytes:100,revision:raw.revision,status:raw.status}}))} as BayStudy;
it('selects actual FULL/LEFT solid results and keeps numerical QA separate from design',()=>{
  render(<BayStudyView study={study}/>);
  expect(screen.getByRole('heading',{name:'SOLID-T175-FR-FULL-D3'})).toBeInTheDocument();
  const cutTable=screen.getByRole('table',{name:/แรงรวม global axes/});
  expect(within(cutTable).getAllByRole('row')).toHaveLength(7);
  expect(within(cutTable).getByText('-3.547')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox',{name:'โหลด solid bay'}),{target:{value:'LEFT'}});
  expect(screen.getByRole('heading',{name:'SOLID-T175-FR-LEFT-D3'})).toBeInTheDocument();
  expect(within(cutTable).getByText('-3.359')).toBeInTheDocument();
  expect(screen.getByText(/ไม่ใช่การรับรอง local-stress convergence/)).toBeInTheDocument();
  expect(screen.getByText(/ยังไม่พร้อมเลือกเหล็กหรือจุดต่อ/)).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:/ดาวน์โหลด/})).toHaveLength(2);
  expect(screen.getByRole('heading',{name:/ตัวอย่าง FBD ใช้ FULL/})).toBeInTheDocument();
});
it('marks changed Step 2D inputs stale',()=>{
  render(<BayStudyView study={{...study,status:'STALE'}}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('STALE');
});
