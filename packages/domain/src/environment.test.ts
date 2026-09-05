import { describe, expect, it } from 'vitest';
import { resolveClientEnvironment } from './environment';

const env = { VITE_DATA_MODE: 'staging', VITE_FIREBASE_PROJECT_ID: 'precast-staging-test', VITE_FIREBASE_AUTH_DOMAIN: 'precast-staging-test.firebaseapp.com', VITE_FIREBASE_STORAGE_BUCKET: 'precast-staging-test.firebasestorage.app', VITE_FIREBASE_API_KEY: 'test-public-id', VITE_FIREBASE_APP_ID: 'test-app-id', VITE_FIREBASE_MESSAGING_SENDER_ID: '123456', VITE_APPCHECK_SITE_KEY: 'test-public-site-key', VITE_DEFAULT_ORG_ID: 'pilot-test' };
describe('M9 environment isolation', () => {
  it('allows shared Firebase without weakening local or staging isolation', () => {
    const shared = { ...env, VITE_DATA_MODE: 'shared', VITE_FIREBASE_PROJECT_ID: 'precast-studio', VITE_APPCHECK_SITE_KEY: '' };
    expect(resolveClientEnvironment(shared, null)).toMatchObject({ mode: 'shared', orgId: 'precast-studio', config: { projectId: 'precast-studio' } });
    expect(() => resolveClientEnvironment({ ...shared, VITE_FIREBASE_API_KEY: '' }, null)).toThrow('Missing Firebase');
    expect(() => resolveClientEnvironment({ ...shared, VITE_FIREBASE_PROJECT_ID: 'other-project' }, null)).toThrow('requires');
  });
  it('keeps local modes bound to the demo project', () => {
    expect(resolveClientEnvironment({}, null).config.projectId).toBe('demo-precast-m1');
    expect(() => resolveClientEnvironment({ VITE_FIREBASE_PROJECT_ID: 'live-project' }, null)).toThrow('Local modes');
  });
  it('requires a reviewed target and rejects unknown modes or mismatched services', () => {
    expect(() => resolveClientEnvironment(env, null)).toThrow('operator-reviewed');
    expect(() => resolveClientEnvironment(env, 'other-project')).toThrow('operator-reviewed');
    expect(() => resolveClientEnvironment({ VITE_DATA_MODE: 'production' }, null)).toThrow('Unsupported');
    expect(() => resolveClientEnvironment({ ...env, VITE_FIREBASE_STORAGE_BUCKET: 'live.appspot.com' }, env.VITE_FIREBASE_PROJECT_ID)).toThrow('belong');
  });
  it('requires App Check without bundling debug tokens', () => {
    expect(resolveClientEnvironment(env, env.VITE_FIREBASE_PROJECT_ID).mode).toBe('staging');
    expect(() => resolveClientEnvironment({ ...env, VITE_APPCHECK_SITE_KEY: '' }, env.VITE_FIREBASE_PROJECT_ID)).toThrow('Missing');
    expect(() => resolveClientEnvironment({ ...env, VITE_APPCHECK_DEBUG_TOKEN: 'secret' }, env.VITE_FIREBASE_PROJECT_ID)).toThrow('debug token');
  });
});
