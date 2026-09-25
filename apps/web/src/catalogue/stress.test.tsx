import {fireEvent,render,screen,within} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
import {StressStudyView} from './StressStudyView';
import type {StressStudy} from './model';
const raw=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../../../output/tsc-step2e-r00/web_summary.json'),'utf8'));
const study={...raw,drawings:raw.drawings.map((d:{id:string;title:string})=>({...d,artifact:{id:d.id,url:`/api/catalogue/artifacts/${d.id}`,bytes:100,revision:raw.revision,status:raw.status}}))} as StressStudy;
it('changes actual load/group results, exposes local failure and preserves fixed-image labels',()=>{
  render(<StressStudyView study={study}/>);
  expect(screen.getByText(/ยังไม่เข้าเกณฑ์ครบทั้ง 6 องค์ประกอบ/)).toBeInTheDocument();
  expect(screen.getByText('-297.23')).toBeInTheDocument();
  const table=screen.getByRole('table',{name:/การเปลี่ยนความเค้น/});
  expect(within(table).getAllByRole('row')).toHaveLength(7);
  fireEvent.change(screen.getByRole('combobox',{name:'โหลดความเค้น'}),{target:{value:'LEFT'}});
  expect(screen.getByText('-280.90')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox',{name:'บริเวณความเค้น'}),{target:{value:'base_probe'}});
  expect(screen.getByRole('heading',{name:/D2 → D3.*เหนือฐาน 50 มม.*70 จุด/})).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:/ดาวน์โหลด/})).toHaveLength(2);
  expect(screen.getByRole('heading',{name:/กราฟตัวอย่างคงที่ FULL/})).toBeInTheDocument();
});
it('warns on stale stress sources',()=>{
  render(<StressStudyView study={{...study,status:'STALE'}}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('STALE');
});
