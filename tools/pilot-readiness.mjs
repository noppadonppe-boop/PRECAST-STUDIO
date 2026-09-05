import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assessPilotEvidence } from '../packages/schemas/src/pilot.ts';

const input = JSON.parse(readFileSync(resolve(process.argv[2] || 'docs/pilot/evidence.json'), 'utf8'));
const result = assessPilotEvidence(input);
console.log(JSON.stringify(result, null, 2));
if (process.argv.includes('--require-ready') && result.status !== 'READY_FOR_OWNER_REVIEW') process.exitCode = 2;
