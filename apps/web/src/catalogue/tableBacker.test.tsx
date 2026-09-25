import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {TableBackerPanel} from './TableBackerPanel';
const a=(extension:string)=>({id:'F2660-P96-'+extension,filename:'F2660.'+extension,href:'/api/catalogue/moulds/artifacts/F2660-P96-'+extension,bytes:100,sha256:'fixture',contentType:extension==='png'?'image/png':'application/json'});
it('P96 shows built-up candidate with stage limits',()=>{
 render(<TableBackerPanel files={[a('png'),a('json')]} typicalId="TS-C-F15-F01"/>);
 expect(screen.getByRole('heading',{name:'P96 — แถบรองซีลใต้โต๊ะ'})).toBeInTheDocument();expect(screen.getByText(/เพิ่มแถบเหล็กตั้ง/)).toBeInTheDocument();expect(screen.getByText(/คานรองรับอุดมคติ/)).toBeInTheDocument();expect(screen.getAllByRole('button')).toHaveLength(2);
});
it('P96 data-only grant does not add an image',()=>{render(<TableBackerPanel files={[a('json')]} typicalId="TS-C-F15-F01"/>);expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(screen.getAllByRole('button')).toHaveLength(1);});
it('P96 empty grant renders no panel',()=>{const {container}=render(<TableBackerPanel files={[]} typicalId="TS-C-F15-F01"/>);expect(container).toBeEmptyDOMElement();});
