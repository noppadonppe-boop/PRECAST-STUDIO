import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
const evidence = { projectId: null, revisions: [], status: 'started' };
await mkdir('output/bim-intake', { recursive: true });
const save = () => writeFile('output/bim-intake/live-evidence.json', JSON.stringify(evidence, null, 2));
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('https://precast-studio.web.app/org/precast-studio/projects');
  await page.getByRole('button', { name: '＋ สร้างโครงการ' }).click();
  await page.getByLabel('รหัสโครงการ', { exact: true }).fill('QA-BIM-20260907');
  await page.getByLabel('ชื่อโครงการ', { exact: true }).fill('Temporary BIM upload verification');
  await page.getByRole('button', { name: 'สร้างโครงการ', exact: true }).click();
  await page.waitForURL(/projects\/p-[^/]+\//);
  evidence.projectId = new URL(page.url()).pathname.split('/')[4]; await save();
  await page.goto(`https://precast-studio.web.app/org/precast-studio/projects/${evidence.projectId}/stages/g0?view=intake`);
  // Only this generated non-customer fixture may be sent to the live test project.
  await page.getByLabel('นำเข้า IFC', { exact: true }).setInputFiles('e2e/fixtures/synthetic-bim.ifc');
  await page.getByText(/บันทึก bim-.*แล้ว/).waitFor({ timeout: 120000 });
  await page.locator('canvas').waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'เปิดโมเดล', exact: true }).click();
  await page.getByText(/ตรวจ SHA-256 ตรงกัน/).waitFor({ timeout: 120000 });
  await page.locator('canvas').waitFor();
  await page.getByRole('button', { name: 'มุมมอง แปลน', exact: true }).click();
  await page.screenshot({ path: 'output/bim-intake/live-desktop.png', fullPage: true });
  evidence.revisions = await page.locator('tbody tr').allTextContents();
  evidence.status = errors.length ? 'page-errors' : 'passed'; evidence.errors = errors;
  await save();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ status: evidence.status, projectId: evidence.projectId, checks: ['Synthetic IFC parsed and persisted', 'reload and authenticated reopen', 'SHA-256 verified', '3D canvas and plan'], notTested: ['Real project upload', 'Native Revit execution'] }));
} catch (error) { evidence.status = 'failed'; evidence.error = error.message; await save(); throw error; }
finally { await browser.close(); }
