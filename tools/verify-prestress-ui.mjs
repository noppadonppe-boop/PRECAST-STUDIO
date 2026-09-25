import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

// Local fixture only; run Vite with --mode test --port 5191 first.
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5191/org/org-siam/projects/p-rama9/stages/g1');
  await page.getByRole('button', { name: 'พรีคาสท์และการติดตั้ง', exact: true }).click();
  const calculator = page.getByRole('region', { name: 'คำนวณคอนกรีตอัดแรง', exact: true });
  await calculator.getByLabel('เปิดใช้การคำนวณ Prestress').check();
  await calculator.getByLabel('ชิ้นงาน / Revision / ชุดน้ำหนัก').fill('PS-01 TEST R1 / transfer and service UDL');
  await calculator.getByLabel('แหล่งอ้างอิงวัสดุ การสูญเสีย และขีดจำกัดหน่วยแรง').fill('Synthetic mechanics benchmark; limits for testing only');
  const inputs = calculator.getByRole('spinbutton');
  const values = [300, 600, 6, 100, 10, 100, 1860, 1000, 50, 0, 20, 10, 60, 40, 20, 30, 40, 30000, 35000, 10, 20, 18, 0, 24, 0];
  if (await inputs.count() !== values.length) throw new Error('Prestress field count changed; review test data.');
  for (let i = 0; i < values.length; i++) await inputs.nth(i).fill(String(values[i]));
  await calculator.getByLabel(/ยืนยันว่าข้อมูลนี้/).check();
  await calculator.getByText(/PRELIMINARY_NOT_VERIFIED/).waitFor();
  if (await calculator.getByText('อยู่ในขีดจำกัดที่กรอก', { exact: true }).count() !== 2) throw new Error('Unexpected comparisons.');
  await calculator.getByText('ข้อมูลที่ใช้คำนวณและแหล่งอ้างอิง', { exact: true }).click();
  await mkdir('output/prestress-qa', { recursive: true });
  await calculator.screenshot({ path: 'output/prestress-qa/calculation.png' });
  const downloadPromise = page.waitForEvent('download');
  await calculator.getByRole('button', { name: 'ดาวน์โหลดรายการคำนวณ Prestress JSON' }).click();
  const download = await downloadPromise;
  await download.saveAs('output/prestress-qa/calculation.json');
  await page.getByRole('link', { name: /5 วิเคราะห์ FEM/ }).click();
  await page.getByText(/PRELIMINARY_NOT_VERIFIED/).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('region', { name: 'คำนวณคอนกรีตอัดแรง', exact: true }).screenshot({ path: 'output/prestress-qa/calculation-mobile.png' });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Prestress browser flow passed: input, results, JSON download, navigation, desktop/mobile screenshots; no page errors.');
} finally { await browser.close(); }
