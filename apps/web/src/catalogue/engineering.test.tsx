import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { EngineeringStudy } from './EngineeringStudy';
import type { PilotStudy } from './model';

const root = resolve(import.meta.dirname, '../../../..');
const generated = JSON.parse(readFileSync(resolve(root, 'output/tsc-step2a-r00/study_results.json'), 'utf8'));
const study = { ...generated, drawings: generated.drawings.map((d: { id: string; title: string }) => ({ ...d, artifact: { id: d.id, revision: generated.revision, status: 'DRAFT_PRE_ANALYSIS', visibility: 'INTERNAL_TEAM', bytes: 100, source_hash: 'test-hash', url: `/api/catalogue/artifacts/${d.id}` } })) } as PilotStudy;

it('shows conditional reaction coefficients from the study with explicit non-FEM status', () => {
  render(<EngineeringStudy study={study}/>);
  expect(screen.getByText('เริ่มเตรียมการวิเคราะห์แล้ว · ยังไม่ใช่ผล FEM')).toBeInTheDocument();
  const reactions = screen.getByRole('table', { name: /แรง = สัมประสิทธิ์/ });
  expect(within(reactions).getAllByRole('row')).toHaveLength(7);
  expect(within(reactions).getAllByText('ครึ่งซ้าย')).toHaveLength(3);
  expect(within(reactions).getByText('0.096076 γ + 0.266996')).toBeInTheDocument();
  expect(within(reactions).getByText('0.258726')).toBeInTheDocument();
  expect(screen.getAllByRole('img')).toHaveLength(3);
  expect(screen.getAllByRole('button', { name: /ดาวน์โหลด/ })).toHaveLength(3);
});

it('warns when study dependencies are stale instead of presenting a current result', () => {
  render(<EngineeringStudy study={{ ...study, status: 'STALE' }}/>);
  expect(screen.getByText('ข้อมูลต้นทางเปลี่ยน — ต้องสร้างผลใหม่ก่อนใช้อ้างอิง')).toBeInTheDocument();
  expect(screen.queryByText('เริ่มเตรียมการวิเคราะห์แล้ว · ยังไม่ใช่ผล FEM')).not.toBeInTheDocument();
});
