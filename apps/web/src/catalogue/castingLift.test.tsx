import {render,screen} from '@testing-library/react';import {expect,it} from 'vitest';
import {CastingLiftPanel} from './CastingLiftPanel';
const a=(extension:string)=>({id:'CS1-P91-'+extension,filename:'CS1.'+extension,href:'/api/catalogue/moulds/artifacts/CS1-P91-'+extension,bytes:100,sha256:'fixture',contentType:extension==='png'?'image/png':extension==='svg'?'image/svg+xml':'application/json'});
it('shows only authorized P91 files with scope and unchanged concrete geometry',()=>{
 render(<CastingLiftPanel files={[a('png'),a('json'),a('svg')]} typicalId="TS-N90-CS1"/>);
 expect(screen.getByRole('heading',{name:'P91 — แผนยกครอบในท่าหล่อ P56'})).toBeInTheDocument();
 expect(screen.getByText(/น้ำหนักและรูปทรง Typical คงเดิม/)).toBeInTheDocument();
 expect(screen.getByText(/ไม่ครอบคลุมแรงดูดติด การพลิก หรือยกแม่แบบเหล็ก/)).toBeInTheDocument();
 expect(screen.getAllByRole('button')).toHaveLength(3);expect(screen.getByRole('img')).toHaveAttribute('src',a('png').href);
});
it('a JSON-only grant does not expose an image or SVG download',()=>{
 render(<CastingLiftPanel files={[a('json')]} typicalId="TS-N90-CS1"/>);
 expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(screen.getAllByRole('button')).toHaveLength(1);
 expect(screen.getByRole('button',{name:'ดาวน์โหลด P91 CS1.json'})).toBeInTheDocument();
});
it('no granted P91 artifacts means no P91 panel',()=>{
 const {container}=render(<CastingLiftPanel files={[]} typicalId="TS-N90-CS1"/>);expect(container).toBeEmptyDOMElement();
});
