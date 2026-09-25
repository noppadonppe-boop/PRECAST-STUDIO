import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {TableWeldPanel} from './TableWeldPanel';
const a=(extension:string)=>({id:'F2660-P93-'+extension,filename:'F2660.'+extension,href:'/api/catalogue/moulds/artifacts/F2660-P93-'+extension,bytes:100,sha256:'fixture',contentType:extension==='png'?'image/png':'application/json'});
it('P93 shows current candidate without claiming connection or mould capacity',()=>{
 render(<TableWeldPanel files={[a('png'),a('json')]} typicalId="TS-C-F15-F01"/>);
 expect(screen.getByRole('heading',{name:'P93 — แนวเชื่อมจุดล็อกแม่แบบโต๊ะ'})).toBeInTheDocument();
 expect(screen.getByText(/ไม่เปลี่ยนช่องหล่อหรือรูโบลต์/)).toBeInTheDocument();
 expect(screen.getByText(/ไม่ครอบคลุมจุดต่อทั้งชุด/)).toBeInTheDocument();expect(screen.getAllByRole('button')).toHaveLength(2);
});
it('P93 JSON-only grant has no image or other download',()=>{
 render(<TableWeldPanel files={[a('json')]} typicalId="TS-C-F15-F01"/>);expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(screen.getAllByRole('button')).toHaveLength(1);
});
it('P93 empty grant renders nothing',()=>{const {container}=render(<TableWeldPanel files={[]} typicalId="TS-C-F15-F01"/>);expect(container).toBeEmptyDOMElement();});
