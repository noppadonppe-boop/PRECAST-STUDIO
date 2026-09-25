import {fireEvent,render,screen,within} from '@testing-library/react';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {expect,it} from 'vitest';
import {GravityCouponStudyView} from './GravityCouponStudyView';import type {GravityCouponStudy} from './model';
const raw=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../../../output/tsc-step2j-r00/web_summary.json'),'utf8'));
const study={...raw,drawings:raw.drawings.map((d:{id:string;title:string})=>({...d,artifact:{id:d.id,url:`/api/catalogue/artifacts/${d.id}`,bytes:100,revision:raw.revision,status:raw.status}}))} as GravityCouponStudy;
it('shows actual seven/two mesh groups, cut forces and coupon-only limitations without inventing controls',()=>{
  render(<GravityCouponStudyView study={study}/>);
  expect(within(screen.getByRole('table',{name:/Gravity coupon \/ ν=0.20/})).getAllByRole('row')).toHaveLength(8);
  fireEvent.change(screen.getByRole('combobox',{name:'ค่า nu ของ gravity coupon'}),{target:{value:'0'}});
  expect(within(screen.getByRole('table',{name:/Gravity coupon \/ ν=0.00/})).getAllByRole('row')).toHaveLength(3);
  const selector=screen.getByRole('combobox',{name:'mesh gravity coupon'});expect(within(selector).getAllByRole('option')).toHaveLength(2);
  fireEvent.change(selector,{target:{value:'J3'}});fireEvent.change(screen.getByRole('combobox',{name:'แนวตัด gravity coupon'}),{target:{value:'X-0.25L'}});
  expect(screen.getByRole('heading',{name:'Cut · GRAVITY-NU00-J3 / X-0.25L'})).toBeInTheDocument();
  const value=study.runs.find(v=>v.id==='GRAVITY-NU00-J3')!.cuts[0]!.traces.lower.order6.resultant_6[2]!;expect(screen.getByRole('cell',{name:value.toFixed(7)})).toBeInTheDocument();
  expect(screen.getByText(/ไม่เปลี่ยนผลที่ยังไม่ผ่านใน Step 2I/)).toBeInTheDocument();expect(screen.getAllByRole('button',{name:/ดาวน์โหลด/})).toHaveLength(2);
});
it('warns on stale gravity evidence',()=>{render(<GravityCouponStudyView study={{...study,status:'STALE'}}/>);expect(screen.getByRole('alert')).toHaveTextContent('Step 2J');});
