import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/functions/package.json', import.meta.url));

export function createFirebaseIdentity({ projectId, orgId, programmeId, apiKey }) {
  if (![projectId, orgId, programmeId].every(v => typeof v === 'string' && /^[a-zA-Z0-9_-]+$/.test(v)) || !apiKey) throw new Error('Explicit Firebase project, organization, programme and client API key are required.');
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Team mode cannot use emulator identity.');
  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = initializeApp({ projectId, credential: applicationDefault() }, 'modular-private-catalogue');
  const auth = getAuth(app);
  const db = getFirestore(app);
  const expires = v => v === undefined ? Infinity : v?.toMillis ? v.toMillis() : typeof v === 'number' ? v : Date.parse(v);
  return {
    clientConfig: { apiKey }, // Firebase web API key is a project identifier, not an Admin credential.
    async signIn(idToken) {
      if (typeof idToken !== 'string') throw new Error('ID token required.');
      const token = await auth.verifyIdToken(idToken, true);
      if (token.firebase?.sign_in_provider === 'anonymous' || !token.email_verified || !Number.isFinite(token.auth_time) || Date.now() / 1000 - token.auth_time > 300) throw new Error('Recent verified team sign-in required.');
      return auth.createSessionCookie(idToken, { expiresIn: 4 * 60 * 60 * 1000 });
    },
    async resolve(identity, now) {
      try {
        const token = await auth.verifySessionCookie(identity, true);
        if (token.firebase?.sign_in_provider === 'anonymous' || !token.email_verified) return null;
        const [org, project] = await Promise.all([
          db.doc(`organizations/${orgId}/members/${token.uid}`).get(),
          db.doc(`organizations/${orgId}/projects/${programmeId}/members/${token.uid}`).get(),
        ]);
        if (!org.exists || !project.exists) return null;
        const o = org.data(), p = project.data();
        const expiresAt = Math.min(token.exp * 1000, expires(o.expiresAt), expires(p.expiresAt));
        const effectiveFrom = Math.max(o.effectiveFrom === undefined ? 0 : expires(o.effectiveFrom), p.effectiveFrom === undefined ? 0 : expires(p.effectiveFrom));
        return { uid: token.uid, name: token.name || token.email || token.uid, anonymous: false,
          orgActive: o.status === 'active', projectActive: p.status === 'active',
          canRead: Array.isArray(p.capabilities) && p.capabilities.includes('catalogue:read'),
          canReadEngineering: Array.isArray(p.capabilities) && p.capabilities.includes('catalogue:engineering'),
          expiresAt, effectiveFrom, artifactIds: Array.isArray(p.catalogueArtifactIds) ? p.catalogueArtifactIds.filter(v => typeof v === 'string') : '*',
          checkedAt: now,
        };
      } catch { return null; }
    },
  };
}
