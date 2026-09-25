import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {TableBasePanel} from './TableBasePanel';
const a=(extension:string)=>({id:'F2660-P97-'+extension,filename:'F2660.'+extension,href:'/api/catalogue/moulds/artifacts/F2660-P97-'+extension,bytes:100,sha256:'fixture',contentType:extension==='png'?'image/png':'application/json'});
it('P97 distinguishes physical base and proposed cradle contacts',()=>{render(<TableBasePanel files={[a('png'),a('json')]} typicalId="TS-C-F15-F01"/>);expect(screen.getByRole('heading',{name:'P97 — ฐานรองจุดล็อกและฐานเปล่าขณะยก'})).toBeInTheDocument();expect(screen.getByText(/52 ชิ้น/)).toBeInTheDocument();expect(screen.getByText(/จุดรับฐานในภาพไม่ใช่หูยก/)).toBeInTheDocument();expect(screen.getAllByRole('button')).toHaveLength(2);});
it('P97 data grant does not expose image',()=>{render(<TableBasePanel files={[a('json')]} typicalId="TS-C-F15-F01"/>);expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(screen.getAllByRole('button')).toHaveLength(1);});
it('P97 absent grant renders nothing',()=>{const {container}=render(<TableBasePanel files={[]} typicalId="TS-C-F15-F01"/>);expect(container).toBeEmptyDOMElement();});
