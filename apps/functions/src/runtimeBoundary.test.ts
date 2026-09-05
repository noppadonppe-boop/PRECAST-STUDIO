import { expect, it } from 'vitest';
import { assertCommandEnvironment } from './runtimeBoundary';
it('rejects unconfigured real runtimes and permits only the selected staging or local demo', () => {
  expect(() => assertCommandEnvironment({})).toThrow('configured Staging');
  expect(() => assertCommandEnvironment({ FUNCTIONS_EMULATOR: 'true', GCLOUD_PROJECT: 'live-project' })).toThrow();
  expect(() => assertCommandEnvironment({ FUNCTIONS_EMULATOR: 'true', GCLOUD_PROJECT: 'demo-precast-m1' })).not.toThrow();
  expect(() => assertCommandEnvironment({ PRECAST_ENVIRONMENT: 'staging', PRECAST_STAGING_PROJECT_ID: 'test-staging', GCLOUD_PROJECT: 'test-staging' })).not.toThrow();
  expect(() => assertCommandEnvironment({ PRECAST_ENVIRONMENT: 'staging', PRECAST_STAGING_PROJECT_ID: 'test-staging', GCLOUD_PROJECT: 'production-project' })).toThrow();
});
