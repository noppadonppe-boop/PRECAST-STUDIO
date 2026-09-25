import {render,screen} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {DirectionalStudyView} from './DirectionalStudyView';
import type {DirectionalStudy} from './model';
const study:DirectionalStudy={id:'STUDY-TS-C-S2N-R00',revision:'S2N-R00',status:'DIAGNOSTIC',findings:['ไม่มีคู่ข้ามหน้า ไม่ใช่ค่าศูนย์'],drawings:[{id:'TS-C-DIRECTIONAL-QA-S2N-R00',title:'Step 2N',artifact:{id:'TS-C-DIRECTIONAL-QA-S2N-R00',revision:'S2N-R00',status:'DRAFT',visibility:'INTERNAL',bytes:1,source_hash:'x',url:'/api/catalogue/artifacts/TS-C-DIRECTIONAL-QA-S2N-R00'}}]};
describe('directional diagnostic',()=>{
  it('keeps postprocessing-only scope and download',()=>{render(<DirectionalStudyView study={study}/>);expect(screen.getByText(/ไม่มี FEM run ใหม่/)).toBeTruthy();expect(screen.getByText(/ไม่ใช่ค่าศูนย์/)).toBeTruthy();expect(screen.getByRole('button',{name:/ดาวน์โหลด/})).toBeTruthy();});
  it('warns on stale evidence',()=>{render(<DirectionalStudyView study={{...study,status:'STALE'}}/>);expect(screen.getByRole('alert').textContent).toContain('STALE');});
});
