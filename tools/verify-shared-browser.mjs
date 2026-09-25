import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(chromePath) ? { executablePath: chromePath } : {}) });
const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
const pages = await Promise.all(contexts.map((context) => context.newPage()));
const errors = [];
pages.forEach((page) => page.on('pageerror', (error) => errors.push(error.message)));
const base = 'http://127.0.0.1:5173';
const code = `VERIFY-${Date.now().toString().slice(-8)}`;
let projectId;
try {
  for (const page of pages) { await page.goto(base); await expect(page.getByRole('heading', { name: 'โครงการทั้งหมด', exact: true })).toBeVisible({ timeout: 30000 }); }
  await pages[0].getByRole('button', { name: '＋ สร้างโครงการ' }).click();
  const form = pages[0].getByRole('dialog');
  await form.getByLabel('รหัสโครงการ').fill(code);
  await form.getByLabel('ชื่อโครงการ').fill('ทดสอบการเชื่อมต่อ Firebase');
  await form.getByRole('button', { name: 'สร้างโครงการ', exact: true }).click();
  await expect(pages[0]).toHaveURL(/\/projects\/p-[^/]+\/overview/, { timeout: 20000 });
  projectId = new URL(pages[0].url()).pathname.split('/')[4];
  await expect(pages[1].getByRole('table').getByText(code, { exact: false })).toBeVisible({ timeout: 15000 });
  const stageUrl = `${base}/org/precast-studio/projects/${projectId}/stages/g2?view=panel`;
  for (const page of pages) { await page.goto(stageUrl); await expect(page.getByLabel('รายละเอียด / ข้อมูลอ้างอิง')).toBeEnabled({ timeout: 20000 }); }
  const note = `Shared verification ${code}`;
  await pages[0].getByLabel('รายละเอียด / ข้อมูลอ้างอิง').fill(note);
  await pages[0].getByRole('button', { name: 'บันทึกข้อมูลเมนู', exact: true }).click();
  await expect(pages[1].getByLabel('รายละเอียด / ข้อมูลอ้างอิง')).toHaveValue(note, { timeout: 15000 });
  await pages[0].getByRole('combobox', { name: 'ความหนาตัวอย่าง · mm' }).selectOption('150');
  await pages[0].getByRole('button', { name: 'บันทึกชิ้นงาน', exact: true }).click();
  await expect(pages[1].getByRole('combobox', { name: 'ความหนาตัวอย่าง · mm' })).toHaveValue('150', { timeout: 15000 });
  await pages[1].reload();
  await expect(pages[1].getByRole('combobox', { name: 'ความหนาตัวอย่าง · mm' })).toHaveValue('150', { timeout: 20000 });
  await pages[1].getByLabel('รายละเอียด / ข้อมูลอ้างอิง').fill('Uncommitted second user edit');
  await pages[0].getByLabel('รายละเอียด / ข้อมูลอ้างอิง').fill(`${note} newer`);
  await pages[0].getByRole('button', { name: 'บันทึกข้อมูลเมนู', exact: true }).click();
  await expect(pages[0].getByText('อ่านจาก Firebase แล้ว · Revision 2', { exact: true })).toBeVisible({ timeout: 15000 });
  await pages[1].getByRole('button', { name: 'บันทึกข้อมูลเมนู', exact: true }).click();
  await expect(pages[1].getByRole('alert')).toContainText('มีผู้ใช้อื่นแก้ไข', { timeout: 15000 });
  await pages[1].getByRole('button', { name: 'โหลดข้อมูลล่าสุด', exact: true }).click();
  await expect(pages[1].getByLabel('รายละเอียด / ข้อมูลอ้างอิง')).toHaveValue(`${note} newer`);
  await pages[0].goto(`${base}/org/precast-studio/projects/${projectId}/stages/g5?view=cost`);
  await expect(pages[0].getByLabel('รายละเอียด / ข้อมูลอ้างอิง')).toBeEnabled({ timeout: 20000 });
  await pages[0].getByRole('spinbutton', { name: 'ราคาต่อหน่วยตัวอย่าง · THB/m³' }).fill('4000');
  await pages[0].getByRole('button', { name: 'บันทึกราคาและสูญเสีย', exact: true }).click();
  await expect(pages[0].getByText('ชิ้นงานและราคา · ไม่มีการแก้ไขค้างบันทึก', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(pages[0].getByRole('button', { name: 'บันทึกราคาและสูญเสีย', exact: true })).toBeDisabled({ timeout: 15000 });
  await pages[0].reload();
  await expect(pages[0].getByRole('spinbutton', { name: 'ราคาต่อหน่วยตัวอย่าง · THB/m³' })).toHaveValue('4000', { timeout: 20000 });
  await mkdir('tmp/firebase-verification', { recursive: true });
  await pages[0].screenshot({ path: 'tmp/firebase-verification/shared-cost.png', fullPage: true });
  await pages[0].goto(`${base}/org/precast-studio/audit`);
  await expect(pages[0].getByRole('table').getByText(projectId, { exact: true }).first()).toBeVisible({ timeout: 20000 });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ blankScreen: false, createProject: 'passed', twoBrowserSharedReadWrite: 'passed', reloadPersistence: 'passed', concurrentEditProtection: 'passed', auditTrail: 'passed', pageErrors: errors }));
} finally {
  // Delete only documents created by this test; retain the user's shared workspace.
  if (projectId) await pages[0].evaluate(async (id) => {
    const { firebaseAuth } = await import('/src/firebase/client.ts');
    const token = await firebaseAuth.currentUser.getIdToken();
    const url = 'https://firestore.googleapis.com/v1/projects/precast-studio/databases/(default)/documents/PRECAST%20MODULE/root';
    const headers = { Authorization: `Bearer ${token}` };
    for (const path of [`projects/${id}`, `panel/${id}`, `panel/${id}-notes`, `cost/${id}`]) {
      const result = await fetch(`${url}/${path}`, { method: 'DELETE', headers });
      if (!result.ok && result.status !== 404) throw new Error(`Cleanup failed: ${path} ${result.status}`);
    }
  }, projectId);
  await browser.close();
}
