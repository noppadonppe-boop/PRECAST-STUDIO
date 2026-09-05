import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { resolveClientEnvironment } from '../packages/domain/src/environment.ts';

try {
  const target = JSON.parse(readFileSync('firebase/staging-target.json', 'utf8'));
  if (target.environment !== 'staging' || !target.projectId || !target.reviewedBy || !target.reviewedAt || target.releaseToFactory !== false) throw new Error('Operator-reviewed Staging target is pending in firebase/staging-target.json.');
  const aliases = JSON.parse(readFileSync('.firebaserc', 'utf8'));
  if (aliases.projects?.staging !== target.projectId) throw new Error('Staging alias must match the reviewed target.');
  const env = { ...loadEnv('staging', resolve('.'), 'VITE_'), ...process.env };
  const client = resolveClientEnvironment(env, target.projectId);
  if (client.mode !== 'staging') throw new Error('Set VITE_DATA_MODE=staging in local/deployment environment.');
  console.log(JSON.stringify({ status: 'LOCAL_CONFIG_VALID', environment: client.mode, projectId: client.config.projectId, deployed: false, next: 'Operator must verify cloud resources, IAM and App Check enforcement before explicit-target deployment.' }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
