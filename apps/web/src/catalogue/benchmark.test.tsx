import {fireEvent,render,screen,within} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
import {BenchmarkStudyView} from './BenchmarkStudyView';
import type {BenchmarkStudy} from './model';
const raw=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../../../output/tsc-step2f-r00/web_summary.json'),'utf8'));
const study={...raw,drawings:raw.drawings.map((d:{id:string;title:string})=>({...d,artifact:{id:d.id,url:`/api/catalogue/artifacts/${d.id}`,bytes:100,revision:raw.revision,status:raw.status}}))} as BenchmarkStudy;
it('switches M/V real results without promoting coupon accuracy to module approval',()=>{
  render(<BenchmarkStudyView study={study}/>);
  const table=screen.getByRole('table',{name:/V \/ consistent traction/});
  expect(within(table).getAllByRole('row')).toHaveLength(13);
  expect(within(table).getAllByText('-0.345889').length).toBeGreaterThan(0);
  expect(screen.getByText(/NOT_ESTABLISHED/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox',{name:'กรณี benchmark'}),{target:{value:'M'}});
  expect(screen.getByRole('table',{name:/M \/ consistent traction/})).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:/ดาวน์โหลด/})).toHaveLength(2);
  expect(screen.getByRole('heading',{name:/การกระจายแรงต่างกัน · V คงที่/})).toBeInTheDocument();
});
it('warns on stale benchmark inputs',()=>{
  render(<BenchmarkStudyView study={{...study,status:'STALE'}}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('STALE');
});
