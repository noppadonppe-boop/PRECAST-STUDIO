import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {TableChannelPanel} from './TableChannelPanel';
const a=(extension:string)=>({id:'F2660-P94-'+extension,filename:'F2660.'+extension,href:'/api/catalogue/moulds/artifacts/F2660-P94-'+extension,bytes:100,sha256:'fixture',contentType:extension==='png'?'image/png':'application/json'});
it('P94 shows built-up candidate with stage limits',()=>{
 render(<TableChannelPanel files={[a('png'),a('json')]} typicalId="TS-C-F15-F01"/>);
 expect(screen.getByRole('heading',{name:'P94 — รางประกอบหลังแบบโต๊ะ'})).toBeInTheDocument();expect(screen.getByText(/แผ่นเหล็ก 3 ชิ้น/)).toBeInTheDocument();expect(screen.getByText(/ไม่ใช่ tolerance ที่ยอมรับ/)).toBeInTheDocument();expect(screen.getAllByRole('button')).toHaveLength(2);
});
it('P94 data-only grant does not add an image',()=>{render(<TableChannelPanel files={[a('json')]} typicalId="TS-C-F15-F01"/>);expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(screen.getAllByRole('button')).toHaveLength(1);});
it('P94 empty grant renders no panel',()=>{const {container}=render(<TableChannelPanel files={[]} typicalId="TS-C-F15-F01"/>);expect(container).toBeEmptyDOMElement();});
