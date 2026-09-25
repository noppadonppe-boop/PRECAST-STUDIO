import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {TableSealPanel} from './TableSealPanel';
const a=(extension:string)=>({id:'F2660-P95-'+extension,filename:'F2660.'+extension,href:'/api/catalogue/moulds/artifacts/F2660-P95-'+extension,bytes:100,sha256:'fixture',contentType:extension==='png'?'image/png':'application/json'});
it('P95 shows built-up candidate with stage limits',()=>{
 render(<TableSealPanel files={[a('png'),a('json')]} typicalId="TS-C-F15-F01"/>);
 expect(screen.getByRole('heading',{name:'P95 — ร่องและซีลแม่แบบโต๊ะ'})).toBeInTheDocument();expect(screen.getByText(/ยาง 12 ชิ้น/)).toBeInTheDocument();expect(screen.getByText(/ยังไม่ผ่านการทดสอบวัสดุ/)).toBeInTheDocument();expect(screen.getAllByRole('button')).toHaveLength(2);
});
it('P95 data-only grant does not add an image',()=>{render(<TableSealPanel files={[a('json')]} typicalId="TS-C-F15-F01"/>);expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(screen.getAllByRole('button')).toHaveLength(1);});
it('P95 empty grant renders no panel',()=>{const {container}=render(<TableSealPanel files={[]} typicalId="TS-C-F15-F01"/>);expect(container).toBeEmptyDOMElement();});
