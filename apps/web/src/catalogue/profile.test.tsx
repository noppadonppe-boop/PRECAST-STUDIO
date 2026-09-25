import {render,screen} from '@testing-library/react';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {expect,it} from 'vitest';
import {ProfileThicknessStudyView} from './ProfileThicknessStudyView';import type {ProfileThicknessStudy} from './model';
const raw=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../../../output/tsc-step2k-r00/web_summary.json'),'utf8'));
const study={...raw,drawings:raw.drawings.map((d:{id:string})=>({...d,artifact:{id:d.id,url:`/api/catalogue/artifacts/${d.id}`,bytes:100,revision:raw.revision,status:raw.status}}))} as ProfileThicknessStudy;
it('shows actual directional comparisons, full six-component cuts and download controls',()=>{
  render(<ProfileThicknessStudyView study={study}/>);
  expect(screen.getByRole('table',{name:'H4 control และสองชุดใหม่'})).toBeInTheDocument();
  expect(screen.getAllByRole('table')).toHaveLength(21);
  expect(screen.getAllByRole('button',{name:/ดาวน์โหลด/})).toHaveLength(2);
  expect(screen.getByText(/ยังไม่ได้รัน KP\+KT รวมกัน/)).toBeInTheDocument();
  expect(screen.getByText(/ยังไม่ยืนยันความเค้นลู่เข้าทั้งโมเดล/)).toBeInTheDocument();
});
it('marks stale evidence without approving design',()=>{render(<ProfileThicknessStudyView study={{...study,status:'STALE'}}/>);expect(screen.getByRole('alert')).toHaveTextContent('Step 2K');});
