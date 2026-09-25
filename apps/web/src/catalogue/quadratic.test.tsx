import {fireEvent,render,screen,within} from '@testing-library/react';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {expect,it} from 'vitest';
import {QuadraticBayStudyView} from './QuadraticBayStudyView';import type {QuadraticBayStudy} from './model';
const raw=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../../../output/tsc-step2h-r00/web_summary.json'),'utf8'));
const study={...raw,drawings:raw.drawings.map((d:{id:string;title:string})=>({...d,artifact:{id:d.id,url:`/api/catalogue/artifacts/${d.id}`,bytes:100,revision:raw.revision,status:raw.status}}))} as QuadraticBayStudy;
it('switches actual load and stress groups while retaining fixed-board and unapproved labels',()=>{
  render(<QuadraticBayStudyView study={study}/>);
  expect(within(screen.getByRole('table',{name:/FULL \/ เปรียบเทียบ mesh/})).getAllByRole('row')).toHaveLength(5);
  fireEvent.change(screen.getByRole('combobox',{name:'โหลดโมดูล 20-node'}),{target:{value:'LEFT'}});
  expect(screen.getByRole('heading',{name:'แรงฐานและแนวตัด · H4 / LEFT'})).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox',{name:'บริเวณความเค้น 20-node'}),{target:{value:'base_probe'}});
  expect(screen.getByText(/ใกล้ฐาน 50 มม.: 70 จุด/)).toHaveTextContent('ยังไม่ครบทั้ง 6 องค์ประกอบ');
  expect(screen.getByRole('heading',{name:/ตัวอย่างคงที่ FULL \/ H4 \/ t175/})).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:/ดาวน์โหลด/})).toHaveLength(2);
});
it('warns about stale full-bay evidence',()=>{render(<QuadraticBayStudyView study={{...study,status:'STALE'}}/>);expect(screen.getByRole('alert')).toHaveTextContent('STALE');});
