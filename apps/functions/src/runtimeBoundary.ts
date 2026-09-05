import { AuthorizationError } from './authorization';

export function assertCommandEnvironment(env: Record<string, string | undefined>) {
  if (env.FUNCTIONS_EMULATOR === 'true' && env.GCLOUD_PROJECT === 'demo-precast-m1') return;
  if (env.PRECAST_ENVIRONMENT !== 'staging' || !env.PRECAST_STAGING_PROJECT_ID || env.GCLOUD_PROJECT !== env.PRECAST_STAGING_PROJECT_ID || env.GCLOUD_PROJECT.startsWith('demo-')) throw new AuthorizationError('Command runtime must be the configured Staging project.', 'failed-precondition');
}
