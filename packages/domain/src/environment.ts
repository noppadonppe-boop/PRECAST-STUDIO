export function resolveClientEnvironment(env: Record<string, unknown>, approvedStagingProjectId: string | null) {
  const value = (key: string) => typeof env[key] === 'string' ? env[key].trim() : '';
  const mode = value('VITE_DATA_MODE') || 'fixture';
  if (!['fixture', 'emulator', 'staging', 'shared'].includes(mode)) throw new Error('Unsupported data mode. Choose fixture, emulator, staging or shared.');
  const projectId = value('VITE_FIREBASE_PROJECT_ID') || 'demo-precast-m1';
  if (mode === 'shared') {
    const required = (key: string) => { const result = value(key); if (!result) throw new Error(`Missing Firebase setting: ${key}.`); return result; };
    if (projectId !== 'precast-studio') throw new Error('Shared mode requires the precast-studio project.');
    return { mode: 'shared' as const, orgId: 'precast-studio', appCheckSiteKey: value('VITE_APPCHECK_SITE_KEY'), config: {
      projectId, apiKey: required('VITE_FIREBASE_API_KEY'), authDomain: required('VITE_FIREBASE_AUTH_DOMAIN'),
      storageBucket: required('VITE_FIREBASE_STORAGE_BUCKET'), appId: required('VITE_FIREBASE_APP_ID'), messagingSenderId: required('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    } };
  }
  if (mode !== 'staging') {
    if (projectId !== 'demo-precast-m1') throw new Error('Local modes require the demo-precast-m1 project.');
    return { mode: mode as 'fixture' | 'emulator', orgId: 'org-siam', appCheckSiteKey: '', config: { projectId, apiKey: 'demo-api-key', authDomain: `${projectId}.firebaseapp.com`, storageBucket: `${projectId}.appspot.com`, appId: 'demo-app-id', messagingSenderId: '' } };
  }
  if (!approvedStagingProjectId || projectId !== approvedStagingProjectId || projectId.startsWith('demo-') || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) throw new Error('Staging project must match the operator-reviewed staging target.');
  const required = (key: string) => { const result = value(key); if (!result || /^(replace|your-|placeholder)/i.test(result)) throw new Error(`Missing staging setting: ${key}.`); return result; };
  const authDomain = required('VITE_FIREBASE_AUTH_DOMAIN');
  const storageBucket = required('VITE_FIREBASE_STORAGE_BUCKET');
  if (authDomain !== `${projectId}.firebaseapp.com` || ![`${projectId}.appspot.com`, `${projectId}.firebasestorage.app`].includes(storageBucket)) throw new Error('Staging Auth domain and Storage bucket must belong to the approved project.');
  const orgId = required('VITE_DEFAULT_ORG_ID');
  if (!/^[a-zA-Z0-9_-]+$/.test(orgId)) throw new Error('Invalid pilot organization ID.');
  if (value('VITE_APPCHECK_DEBUG_TOKEN')) throw new Error('Do not put an App Check debug token in the client bundle.');
  return { mode: 'staging' as const, orgId, appCheckSiteKey: required('VITE_APPCHECK_SITE_KEY'), config: { projectId, authDomain, storageBucket, apiKey: required('VITE_FIREBASE_API_KEY'), appId: required('VITE_FIREBASE_APP_ID'), messagingSenderId: required('VITE_FIREBASE_MESSAGING_SENDER_ID') } };
}
