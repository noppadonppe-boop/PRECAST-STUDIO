import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const environment = import.meta.env as Record<string, unknown>;

function environmentString(name: string, fallback: string): string {
  const value = environment[name];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export const dataMode = environmentString('VITE_DATA_MODE', 'fixture') === 'emulator' ? 'emulator' : 'fixture';

export const localIdentity = {
  email: environmentString('VITE_EMULATOR_USER_EMAIL', 'checker@precast.local'),
  password: environmentString('VITE_EMULATOR_USER_PASSWORD', 'local-emulator-only'),
  orgId: environmentString('VITE_DEFAULT_ORG_ID', 'org-siam'),
};

export const localEmulatorIdentities = {
  checker: localIdentity,
  engineer: { email: 'engineer@precast.local', password: 'local-emulator-only', orgId: localIdentity.orgId },
  bim: { email: 'bim@precast.local', password: 'local-emulator-only', orgId: localIdentity.orgId },
  pm: { email: 'pm@precast.local', password: 'local-emulator-only', orgId: localIdentity.orgId },
} as const;

const app = getApps().length > 0 ? getApp() : initializeApp({
  apiKey: environmentString('VITE_FIREBASE_API_KEY', 'demo-api-key'),
  authDomain: environmentString('VITE_FIREBASE_AUTH_DOMAIN', 'demo-precast-m1.firebaseapp.com'),
  projectId: environmentString('VITE_FIREBASE_PROJECT_ID', 'demo-precast-m1'),
  storageBucket: environmentString('VITE_FIREBASE_STORAGE_BUCKET', 'demo-precast-m1.appspot.com'),
  appId: environmentString('VITE_FIREBASE_APP_ID', 'demo-app-id'),
});

export const firebaseAuth = getAuth(app);
export const firestore = getFirestore(app);
export const functions = getFunctions(app, 'asia-southeast1');
export const storage = getStorage(app);

let emulatorsConnected = false;
export function connectLocalEmulators() {
  if (dataMode !== 'emulator' || emulatorsConnected) return;
  connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  emulatorsConnected = true;
}
