import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { App } from '../app/App';

function open(path = '/org/org-siam/projects') {
  render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
}
describe('Studio UX journeys', () => {
  it('creates an unapproved criteria draft, preserves edits during navigation and explains missing evidence', () => {
    open('/org/org-siam/projects/p-rama9/stages/g1');
    fireEvent.click(screen.getByRole('button', { name: 'ใช้ชุดมาตรฐานแนะนำสำหรับโครงการไทย' }));
    const precast = screen.getByRole('region', { name: 'มาตรฐานพรีคาสท์' });
    expect(within(precast).getByRole('textbox', { name: 'รหัส / ชื่อมาตรฐาน' })).toHaveValue('ACI/PCI CODE-319');
    fireEvent.change(screen.getByRole('textbox', { name: 'สถานที่ตั้งและเขตอำนาจ' }), { target: { value: 'โครงการทดสอบ จังหวัดระยอง' } });
    fireEvent.click(screen.getByRole('button', { name: 'พรีคาสท์และการติดตั้ง' }));
    expect(screen.getByRole('spinbutton', { name: 'ตัวคูณพลวัตขณะยก' })).toHaveValue(null);
    fireEvent.click(screen.getByRole('button', { name: 'ตรวจความพร้อม' }));
    expect(screen.getByRole('button', { name: /กำลังอัดขณะยก.*ยังไม่กำหนด/ })).toBeVisible();
    expect(screen.getByRole('button', { name: 'ส่งตรวจ Design Basis' })).toBeDisabled();
    expect(screen.getByText('ยังไม่รับรองการคำนวณตามมาตรฐาน')).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: /7 BOQ & Estimate/ }));
    fireEvent.click(screen.getByRole('link', { name: /2 Design Criteria/ }));
    expect(screen.getByRole('textbox', { name: 'สถานที่ตั้งและเขตอำนาจ' })).toHaveValue('โครงการทดสอบ จังหวัดระยอง');
    fireEvent.click(screen.getByRole('button', { name: 'หน่วยและแหล่งอ้างอิง' }));
    expect(screen.getByRole('table')).toHaveTextContent('1 MPa = 1 N/mm² = 1,000 kN/m²');
  });
  it('combines search, gate and assignee filters without changing portfolio totals', () => {
    open();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search projects' }), { target: { value: ' rayong ' } });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).queryByText('Rama IX Modular Residence')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by gate' }), { target: { value: 'needsAttention' } });
    expect(screen.getByText('ไม่พบโครงการ')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by gate' }), { target: { value: 'approved' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'ผู้รับผิดชอบ' }), { target: { value: 'ศุภชัย ก.' } });
    expect(within(table).getAllByRole('row')).toHaveLength(1);
    const issues = screen.getByText('ประเด็นที่ต้องแก้ไข').closest('.metric');
    expect(issues).toHaveTextContent('5');
    expect(screen.queryByText('Ready for release')).not.toBeInTheDocument();
  });
  it('opens the current stage through the project overview', () => {
    open('/org/org-siam/projects/p-rama9/overview');
    fireEvent.click(screen.getByRole('link', { name: 'เปิดขั้นตอนปัจจุบัน →' }));
    expect(screen.getByRole('heading', { name: 'ออกแบบเหล็กและตรวจชิ้นงาน' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'ส่งตรวจและอนุมัติ' })).toBeDisabled();
  });
  it('retains selected panel and edited quantity when navigating to BOQ and drawing', () => {
    open('/org/org-siam/projects/p-rama9/stages/g2?view=panel');
    fireEvent.click(screen.getByRole('button', { name: 'เลือกชิ้นงาน P-W01' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'ความหนาตัวอย่าง · mm' }), { target: { value: '150' } });
    const inspector = screen.getByRole('complementary', { name: 'คุณสมบัติและการตรวจสอบ' });
    expect(within(inspector).getByText('1.296 m³')).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: /7 BOQ & Estimate/ }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('1.296 m³')).toBeVisible();
    expect(within(table).getByText('1.354 m³')).toBeVisible();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'ราคาต่อหน่วยตัวอย่าง · THB/m³' }), { target: { value: '4000' } });
    expect(within(table).getByText('10,918.00 THB')).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: /9 Drawing & Export/ }));
    expect(screen.getByRole('img', { name: 'รูปด้าน P-W01 ความหนา 150 mm' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'สร้างชุดส่งออก' })).toBeDisabled();
  });
  it('supports model views, inspector visibility and keyboard selection', () => {
    open('/org/org-siam/projects/p-rama9/stages/g2?view=panel');
    fireEvent.click(screen.getByRole('button', { name: 'Plan' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'เลือกชิ้นงาน P-W01' }), { key: 'Enter' });
    expect(screen.getByRole('img', { name: /ผัง โมเดลตัวอย่าง เลือก P-W01/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'ซ่อนคุณสมบัติ' }));
    expect(screen.queryByRole('complementary', { name: 'คุณสมบัติและการตรวจสอบ' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'แสดงคุณสมบัติ' }));
    expect(screen.getByRole('complementary', { name: 'คุณสมบัติและการตรวจสอบ' })).toBeVisible();
  });
  it('filters members and shows selected member roles without granting access', () => {
    open('/org/org-siam/team');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search members' }), { target: { value: 'นรินทร์' } });
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    fireEvent.click(within(table).getByRole('button', { name: /นรินทร์/ }));
    expect(within(screen.getByRole('complementary', { name: 'สิทธิ์ของสมาชิกที่เลือก' })).getByRole('heading', { name: 'นรินทร์ วัฒนกิจ' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /บันทึกสิทธิ์/ })).not.toBeInTheDocument();
  });
});
