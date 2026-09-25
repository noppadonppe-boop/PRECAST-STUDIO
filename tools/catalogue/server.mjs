import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { loadCatalogue, studyIsStale } from './data.mjs';
import { loadCurrentCatalogue } from './current-data.mjs';
import { loadMouldCatalogue } from './mould-data.mjs';

const cookieName = 'pm_catalogue';
const random = () => randomBytes(32).toString('base64url');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Local-only owner preview. Team mode uses a separately configured, verified identity adapter.
export function allowed(principal, artifactId, now = Date.now()) {
  return Boolean(principal && !principal.anonymous && principal.orgActive && principal.projectActive
    && principal.canRead && Number.isFinite(principal.expiresAt) && principal.expiresAt > now
    && (principal.effectiveFrom ?? 0) <= now
    && (!artifactId || principal.artifactIds === '*' || principal.artifactIds?.includes(artifactId)));
}

export async function createCatalogueServer({ root, origin, ownerPreview = false, identityAdapter, now = Date.now }) {
  if (!origin || !/^https?:\/\//.test(origin)) throw new Error('An explicit origin is required.');
  if (ownerPreview && new URL(origin).hostname !== '127.0.0.1') throw new Error('Owner preview is loopback only.');
  if (!ownerPreview && !identityAdapter) throw new Error('Team identity adapter is required; no fallback to preview.');
  const { data, artifacts } = await loadCatalogue(root);
  const current = await loadCurrentCatalogue(root);
  const moulds = await loadMouldCatalogue(root);
  const sessions = new Map();
  let entryToken = ownerPreview ? random() : null;
  const entryExpires = now() + 10 * 60 * 1000;
  const app = resolve(root, 'apps/web/dist-catalogue');
  function send(res, status, value, type = 'application/json; charset=utf-8') {
    res.writeHead(status, { 'Content-Type': type });
    res.end(type.startsWith('application/json') ? JSON.stringify(value) : value);
  }
  async function json(req) {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 16384) throw new Error('Request too large.'); }
    return JSON.parse(body || '{}');
  }
  async function principal(req) {
    const id = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    const session = id && sessions.get(id);
    if (!session) return null;
    if (session.expiresAt <= now()) { sessions.delete(id); return null; }
    if (session.identity) return identityAdapter.resolve(session.identity, now());
    return session.principal;
  }
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) return send(res, 403, { error: 'Origin denied.' });
      const path = new URL(req.url, origin).pathname;
      if (req.method === 'POST' && req.headers.origin !== origin) return send(res, 403, { error: 'Origin required.' });
      if (path === '/api/catalogue/session' && req.method === 'POST') {
        const body = await json(req);
        let session;
        if (ownerPreview) {
          if (!entryToken || now() >= entryExpires || !equal(body.token, entryToken)) return send(res, 401, { error: 'Preview link expired or already used.' });
          entryToken = null;
          session = { expiresAt: now() + 4 * 60 * 60 * 1000, principal: { name: 'เจ้าของเครื่อง · Local preview', anonymous: false, orgActive: true, projectActive: true, canRead: true, canReadEngineering: true, artifactIds: '*', expiresAt: now() + 4 * 60 * 60 * 1000 } };
        } else {
          const identity = await identityAdapter.signIn(body.idToken);
          const member = await identityAdapter.resolve(identity, now());
          if (!allowed(member, undefined, now())) return send(res, 403, { error: 'Active catalogue membership is required.' });
          session = { identity, expiresAt: now() + 4 * 60 * 60 * 1000 };
        }
        for (const [key, value] of sessions) if (value.expiresAt <= now()) sessions.delete(key);
        const id = random(); sessions.set(id, session);
        res.setHeader('Set-Cookie', `${cookieName}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=14400${origin.startsWith('https:') ? '; Secure' : ''}`);
        return send(res, 200, { ok: true });
      }
      if (path === '/api/catalogue/session' && req.method === 'DELETE') {
        if (req.headers.origin !== origin) return send(res, 403, { error: 'Origin required.' });
        const id = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
        if (id) sessions.delete(id);
        res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
        return send(res, 200, { ok: true });
      }
      if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed.' });
      if (path === '/api/catalogue/access') return send(res, 200, { mode: ownerPreview ? 'LOCAL_OWNER_PREVIEW' : 'TEAM', login: identityAdapter?.clientConfig ?? null });
      if (path.startsWith('/api/catalogue/')) {
        const member = await principal(req);
        if (!allowed(member, undefined, now())) return send(res, 401, { error: 'Catalogue membership is required.' });
        const currentAllow = (principal, id) => allowed(principal, id, now());
        if (path === '/api/catalogue/moulds') {
          if (!member.canReadEngineering) return send(res,403,{error:'Engineering access required for planning mould drawings.'});
          return send(res,200,await moulds.view(member,currentAllow));
        }
        const mouldMatch = /^\/api\/catalogue\/moulds\/artifacts\/([A-Z0-9-]+)$/.exec(path);
        if (mouldMatch) {
          const a=moulds.artifacts.get(mouldMatch[1]);
          if(!a)return send(res,404,{error:'Not found.'});
          if(!moulds.mayRead(member,a,currentAllow))return send(res,403,{error:'Mould artifact denied.'});
          const b=await moulds.bytes(a.id);if(!b)return send(res,409,{error:'Mould source or file changed.'});
          if(a.contentType!=='image/png'||new URL(req.url,origin).searchParams.get('download')==='1')res.setHeader('Content-Disposition',`attachment; filename="${a.filename}"`);
          if(a.contentType==='image/svg+xml')res.setHeader('Content-Security-Policy',"sandbox; default-src 'none'");
          res.writeHead(200,{'Content-Type':a.contentType,'Content-Length':b.length});return res.end(b);
        }
        if (path === '/api/catalogue/current') return send(res, 200, { ...await current.view(member,currentAllow), access:{name:member.name,mode:ownerPreview?'LOCAL_OWNER_PREVIEW':'TEAM'} });
        const currentMatch = /^\/api\/catalogue\/current\/artifacts\/([A-Z0-9-]+)$/.exec(path);
        if (currentMatch) {
          const artifact = current.artifacts.get(currentMatch[1]);
          if (!artifact) return send(res,404,{error:'Artifact not found.'});
          if (!current.mayRead(member,artifact,currentAllow)) return send(res,403,{error:'Artifact access denied.'});
          const bytes = await current.readArtifact(artifact.id);
          if (!bytes) return send(res,409,{error:'Source or artifact changed. Refresh the verified revision before downloading.'});
          if (artifact.contentType !== 'image/png' || new URL(req.url,origin).searchParams.get('download') === '1')
            res.setHeader('Content-Disposition',`attachment; filename="${artifact.filename}"`);
          if (artifact.contentType === 'image/svg+xml') res.setHeader('Content-Security-Policy',"sandbox; default-src 'none'");
          // Raw JSON artifacts are bytes, not JSON-stringified Buffer objects.
          res.writeHead(200,{'Content-Type':artifact.contentType,'Content-Length':bytes.length});
          return res.end(bytes);
        }
        if (path === '/api/catalogue/data') {
          const visible = item => allowed(member, item.artifact.id, now());
          const mayReadStudy = member.canReadEngineering && allowed(member, data.pilotStudy.id, now());
          const stale = mayReadStudy && await studyIsStale(root, data.pilotStudy);
          const pilotStudy = mayReadStudy ? { ...data.pilotStudy, status: stale ? 'STALE' : data.pilotStudy.status, drawings: data.pilotStudy.drawings.filter(visible).map(d => ({ ...d, artifact: { ...d.artifact, status: stale ? 'STALE' : d.artifact.status } })) } : null;
          const mayReadShell=member.canReadEngineering && allowed(member,data.shellStudy.id,now());
          const shellStale=mayReadShell && await studyIsStale(root,data.shellStudy);
          const shellStudy=mayReadShell?{...data.shellStudy,status:shellStale?'STALE':data.shellStudy.status,drawings:data.shellStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:shellStale?'STALE':d.artifact.status}}))}:null;
          const mayReadDiagnostic=member.canReadEngineering && allowed(member,data.diagnosticStudy.id,now());
          const diagnosticStale=mayReadDiagnostic && await studyIsStale(root,data.diagnosticStudy);
          const diagnosticStudy=mayReadDiagnostic?{...data.diagnosticStudy,status:diagnosticStale?'STALE':data.diagnosticStudy.status,drawings:data.diagnosticStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:diagnosticStale?'STALE':d.artifact.status}}))}:null;
          const mayReadBay=member.canReadEngineering && allowed(member,data.bayStudy.id,now());
          const bayStale=mayReadBay && await studyIsStale(root,data.bayStudy);
          const bayStudy=mayReadBay?{...data.bayStudy,status:bayStale?'STALE':data.bayStudy.status,drawings:data.bayStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:bayStale?'STALE':d.artifact.status}}))}:null;
          const mayReadStress=member.canReadEngineering && allowed(member,data.stressStudy.id,now());
          const stressStale=mayReadStress && await studyIsStale(root,data.stressStudy);
          const stressStudy=mayReadStress?{...data.stressStudy,status:stressStale?'STALE':data.stressStudy.status,drawings:data.stressStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:stressStale?'STALE':d.artifact.status}}))}:null;
          const mayReadBenchmark=member.canReadEngineering && allowed(member,data.benchmarkStudy.id,now());
          const benchmarkStale=mayReadBenchmark && await studyIsStale(root,data.benchmarkStudy);
          const benchmarkStudy=mayReadBenchmark?{...data.benchmarkStudy,status:benchmarkStale?'STALE':data.benchmarkStudy.status,drawings:data.benchmarkStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:benchmarkStale?'STALE':d.artifact.status}}))}:null;
          const mayReadCurved=member.canReadEngineering && allowed(member,data.curvedStudy.id,now());
          const curvedStale=mayReadCurved && await studyIsStale(root,data.curvedStudy);
          const curvedStudy=mayReadCurved?{...data.curvedStudy,status:curvedStale?'STALE':data.curvedStudy.status,drawings:data.curvedStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:curvedStale?'STALE':d.artifact.status}}))}:null;
          const mayReadQuadratic=member.canReadEngineering && allowed(member,data.quadraticBayStudy.id,now());
          const quadraticStale=mayReadQuadratic && await studyIsStale(root,data.quadraticBayStudy);
          const quadraticBayStudy=mayReadQuadratic?{...data.quadraticBayStudy,status:quadraticStale?'STALE':data.quadraticBayStudy.status,drawings:data.quadraticBayStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:quadraticStale?'STALE':d.artifact.status}}))}:null;
          const mayReadLocal=member.canReadEngineering && allowed(member,data.localMeshStudy.id,now());
          const localStale=mayReadLocal && await studyIsStale(root,data.localMeshStudy);
          const localMeshStudy=mayReadLocal?{...data.localMeshStudy,status:localStale?'STALE':data.localMeshStudy.status,drawings:data.localMeshStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:localStale?'STALE':d.artifact.status}}))}:null;
          const mayReadGravity=member.canReadEngineering && allowed(member,data.gravityCouponStudy.id,now());
          const gravityStale=mayReadGravity && await studyIsStale(root,data.gravityCouponStudy);
          const gravityCouponStudy=mayReadGravity?{...data.gravityCouponStudy,status:gravityStale?'STALE':data.gravityCouponStudy.status,drawings:data.gravityCouponStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:gravityStale?'STALE':d.artifact.status}}))}:null;
          const mayReadProfile=member.canReadEngineering && allowed(member,data.profileThicknessStudy.id,now());
          const profileStale=mayReadProfile && await studyIsStale(root,data.profileThicknessStudy);
          const profileThicknessStudy=mayReadProfile?{...data.profileThicknessStudy,status:profileStale?'STALE':data.profileThicknessStudy.status,drawings:data.profileThicknessStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:profileStale?'STALE':d.artifact.status}}))}:null;
          const mayReadCombined=member.canReadEngineering && allowed(member,data.combinedMeshStudy.id,now());
          const combinedStale=mayReadCombined && await studyIsStale(root,data.combinedMeshStudy);
          const combinedMeshStudy=mayReadCombined?{...data.combinedMeshStudy,status:combinedStale?'STALE':data.combinedMeshStudy.status,drawings:data.combinedMeshStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:combinedStale?'STALE':d.artifact.status}}))}:null;
          const mayReadDirectional=member.canReadEngineering && allowed(member,data.directionalStudy.id,now());
          const directionalStale=mayReadDirectional && await studyIsStale(root,data.directionalStudy);
          const directionalStudy=mayReadDirectional?{...data.directionalStudy,status:directionalStale?'STALE':data.directionalStudy.status,drawings:data.directionalStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:directionalStale?'STALE':d.artifact.status}}))}:null;
          const mayReadBase=member.canReadEngineering && allowed(member,data.baseProfileStudy.id,now());
          const baseStale=mayReadBase && await studyIsStale(root,data.baseProfileStudy);
          const baseProfileStudy=mayReadBase?{...data.baseProfileStudy,status:baseStale?'STALE':data.baseProfileStudy.status,drawings:data.baseProfileStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:baseStale?'STALE':d.artifact.status}}))}:null;
          const mayReadArc=member.canReadEngineering && allowed(member,data.arcCrownStudy.id,now());
          const arcStale=mayReadArc && await studyIsStale(root,data.arcCrownStudy);
          const arcCrownStudy=mayReadArc?{...data.arcCrownStudy,status:arcStale?'STALE':data.arcCrownStudy.status,drawings:data.arcCrownStudy.drawings.filter(visible).map(d=>({...d,artifact:{...d.artifact,status:arcStale?'STALE':d.artifact.status}}))}:null;
          return send(res, 200, { ...data, baseProfileStudy, directionalStudy, pilotStudy, shellStudy, diagnosticStudy, bayStudy, stressStudy, benchmarkStudy, curvedStudy, quadraticBayStudy, localMeshStudy, gravityCouponStudy, profileThicknessStudy, combinedMeshStudy, arcCrownStudy, products: data.products.filter(visible), typical: data.typical.filter(visible), access: { name: member.name, mode: ownerPreview ? 'LOCAL_OWNER_PREVIEW' : 'TEAM' } });
        }
        const match = /^\/api\/catalogue\/artifacts\/([A-Z0-9-]+)$/.exec(path);
        if (match) {
          if (!allowed(member, match[1], now())) return send(res, 403, { error: 'Artifact access denied.' });
          const artifact = artifacts.get(match[1]);
          if (!artifact) return send(res, 404, { error: 'Artifact not found.' });
          if (artifact.classification === 'ENGINEERING_DRAFT' && !member.canReadEngineering) return send(res, 403, { error: 'Engineering access denied.' });
          return send(res, 200, await readFile(artifact.path), 'image/png');
        }
        return send(res, 404, { error: 'Not found.' });
      }
      // No workspace/static-public mount, source PDF, directory listing or Vite /@fs route.
      if (path === '/' || path === '/catalogue' || path === '/catalogue/') return send(res, 200, await readFile(resolve(app, 'catalogue.html')), 'text/html; charset=utf-8');
      if (/^\/assets\/[a-zA-Z0-9_.-]+\.(js|css|woff2?)$/.test(path)) {
        const mime = path.endsWith('.js') ? 'text/javascript; charset=utf-8' : path.endsWith('.css') ? 'text/css; charset=utf-8' : 'font/woff2';
        return send(res, 200, await readFile(resolve(app, 'assets', basename(path))), mime);
      }
      return send(res, 404, { error: 'Not found.' });
    } catch { return send(res, 400, { error: 'Request could not be completed.' }); }
  });
  return { server, entryToken };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(import.meta.dirname, '../..');
  const port = Number(process.env.CATALOGUE_PORT || 5186);
  const ownerPreview = process.argv.includes('--owner-preview');
  if (ownerPreview === process.argv.includes('--team')) throw new Error('Choose exactly one mode: --owner-preview or --team.');
  const origin = ownerPreview ? `http://127.0.0.1:${port}` : process.env.CATALOGUE_ORIGIN;
  let identityAdapter;
  if (!ownerPreview) {
    if (!origin?.startsWith('https://')) throw new Error('Team mode requires an explicit HTTPS origin and TLS reverse proxy.');
    const { createFirebaseIdentity } = await import('./firebase-identity.mjs');
    identityAdapter = createFirebaseIdentity({ projectId: process.env.CATALOGUE_FIREBASE_PROJECT_ID, orgId: process.env.CATALOGUE_ORG_ID, programmeId: process.env.CATALOGUE_PROJECT_ID, apiKey: process.env.CATALOGUE_FIREBASE_API_KEY });
  }
  const { server, entryToken } = await createCatalogueServer({ root, origin, ownerPreview, identityAdapter });
  server.listen(port, '127.0.0.1', () => console.log(ownerPreview ? `Catalogue local owner preview: ${origin}/catalogue#access=${entryToken}` : `Catalogue team service: ${origin}/catalogue (loopback upstream only)`));
}
