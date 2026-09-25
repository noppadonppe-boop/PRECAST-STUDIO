import {render,screen,within} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
import {DiagnosticStudyView} from './DiagnosticStudyView';
import type {DiagnosticStudy} from './model';
const raw=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../../../output/tsc-step2c-r00/web_summary.json'),'utf8'));
const study={...raw,drawings:raw.drawings.map((d:{id:string;title:string})=>({...d,artifact:{id:d.id,url:`/api/catalogue/artifacts/${d.id}`,bytes:100,revision:raw.revision,status:raw.status}}))} as DiagnosticStudy;
it('shows real coupon results and their limited scope with downloadable boards',()=>{
  render(<DiagnosticStudyView study={study}/>);
  expect(screen.getByText('ยังไม่พร้อมออกแบบ')).toBeInTheDocument();
  const table=screen.getByRole('table',{name:/ตัวคูณเป็นผลทฤษฎี/});
  expect(within(table).getAllByRole('row')).toHaveLength(4);
  expect(within(table).getByText('1.234')).toBeInTheDocument();
  expect(screen.getByText(/ไม่สรุปว่าสาเหตุเป็นเพียงตำแหน่ง peak/)).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:/ดาวน์โหลด/})).toHaveLength(2);
});
it('warns when diagnostic inputs have changed',()=>{
  render(<DiagnosticStudyView study={{...study,status:'STALE'}}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('STALE');
});
