import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { createCatalogueServer, allowed } from './server.mjs';
import { loadCatalogue, studyIsStale } from './data.mjs';

const root = resolve(import.meta.dirname, '../..');
let service, origin, cookie, member, clock = Date.now();
const active = () => ({ name: 'Test member', anonymous: false, orgActive: true, projectActive: true, canRead: true, canReadEngineering: true, artifactIds: '*', expiresAt: clock + 3600000 });
async function request(path, options = {}) { return fetch(origin + path, options); }
async function login(idToken = 'verified-test-identity') {
  return request('/api/catalogue/session', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
}
before(async () => {
  member = active();
  // A fake identity adapter tests the real HTTP enforcement, not Firebase credentials or deployed policy.
  let boundOrigin;
  const wrapper = await createCatalogueServer({ root, origin: 'http://127.0.0.1:5197', now: () => clock,
    identityAdapter: { signIn: async token => { if (token !== 'verified-test-identity') throw new Error('Invalid token'); return 'server-side-identity'; }, resolve: async () => member } });
  service = wrapper.server;
  await new Promise((resolve, reject) => { service.once('error', reject); service.listen(5197, '127.0.0.1', resolve); });
  boundOrigin = 'http://127.0.0.1:5197'; origin = boundOrigin;
});
after(async () => { await new Promise(r => service.close(r)); });

test('seed has 48 products, 52 concept + 28 engineering PNG artifacts and source hashes', async () => {
  const { data, artifacts } = await loadCatalogue(root);
  assert.equal(data.products.length, 48); assert.equal(data.typical.length, 4); assert.equal(artifacts.size, 80); assert.equal(data.pilotStudy.drawings.length, 3); assert.equal(data.shellStudy.drawings.length,3); assert.equal(data.diagnosticStudy.drawings.length,2); assert.equal(data.bayStudy.drawings.length,2); assert.equal(data.stressStudy.drawings.length,2); assert.equal(data.benchmarkStudy.drawings.length,2); assert.equal(data.curvedStudy.drawings.length,2); assert.equal(data.quadraticBayStudy.drawings.length,2); assert.equal(data.localMeshStudy.drawings.length,2); assert.equal(data.gravityCouponStudy.drawings.length,2); assert.equal(data.profileThicknessStudy.drawings.length,2); assert.equal(data.combinedMeshStudy.drawings.length,1); assert.equal(data.arcCrownStudy.drawings.length,1);
  assert.equal(new Set(data.products.map(p => p.product_id)).size, 48);
  for (const use of [1, 2, 3, 4]) assert.equal(data.products.filter(p => p.use === use).length, 12);
  for (const plan of ['I', 'L', 'U']) assert.equal(data.products.filter(p => p.type === plan).length, 16);
  for (const family of ['A', 'B', 'C', 'D']) assert.equal(data.products.filter(p => p.family === family).length, 12);
  for (const artifact of artifacts.values()) {
    const bytes = await readFile(artifact.path);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), artifact.source_hash);
  }
  assert.ok(data.products.filter(p => p.type === 'I').every(p => p.image_badge === 'LEGACY20 / NOT STD15 GEOMETRY'));
  assert.ok(data.products.every(p => !p.approved_for_manufacture && p.engineering_status === 'NOT_ANALYSED'));
  assert.equal(data.engineering.thickness.selected_thickness_mm, null);
});
test('anonymous metadata and direct image requests are denied', async () => {
  assert.equal((await request('/api/catalogue/artifacts/TS-C-BASE-PROFILE-QA-S2O-R00')).status,401);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-DIRECTIONAL-QA-S2N-R00')).status,401);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-ARC-CROWN-QA-S2M-R00')).status,401);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-COMBINED-QA-S2L-R00')).status,401);
  for(const id of ['TS-C-PROFILE-MESH-S2K-R00','TS-C-PROFILE-QA-S2K-R00'])assert.equal((await request('/api/catalogue/artifacts/'+id)).status,401);
  for (const path of ['/api/catalogue/data', '/api/catalogue/artifacts/PM-I-A1-R00', '/api/catalogue/artifacts/TS-C-R00', '/api/catalogue/artifacts/TS-C-FBD-S2A-R00','/api/catalogue/artifacts/TS-C-LOCAL-MESH-S2I-R00','/api/catalogue/artifacts/TS-C-TRACTION-S2I-R00','/api/catalogue/artifacts/TS-C-GRAVITY-FBD-S2J-R00','/api/catalogue/artifacts/TS-C-GRAVITY-QA-S2J-R00']) assert.equal((await request(path)).status, 401);
});
test('missing project member, expired, suspended, future, anonymous identities cannot establish a session', async () => {
  for (const change of [{ projectActive: false }, { orgActive: false }, { canRead: false }, { anonymous: true }, { expiresAt: clock }, { effectiveFrom: clock + 1000 }]) {
    member = { ...active(), ...change }; assert.equal((await login()).status, 403);
  }
  member = active(); assert.equal((await login('invalid')).status, 400);
});
test('active member can read catalogue and every allowlisted board over protected HTTP', async () => {
  member = active(); const response = await login(); assert.equal(response.status, 200);
  cookie = response.headers.get('set-cookie').split(';')[0];
  assert.match(response.headers.get('set-cookie'), /HttpOnly/); assert.match(response.headers.get('set-cookie'), /SameSite=Strict/);
  const result = await request('/api/catalogue/data', { headers: { Cookie: cookie } });
  assert.match(result.headers.get('cache-control'), /no-store/);
  const data = await result.json(); assert.equal(data.products.length, 48);
  assert.equal(JSON.stringify(data).includes('reference_image'), false);
  assert.equal(JSON.stringify(data).includes('E:\\'), false);
  for (const item of [...data.products, ...data.typical, ...data.pilotStudy.drawings, ...data.shellStudy.drawings, ...data.diagnosticStudy.drawings, ...data.bayStudy.drawings, ...data.stressStudy.drawings, ...data.benchmarkStudy.drawings, ...data.curvedStudy.drawings, ...data.quadraticBayStudy.drawings, ...data.localMeshStudy.drawings, ...data.gravityCouponStudy.drawings, ...data.profileThicknessStudy.drawings, ...data.combinedMeshStudy.drawings, ...data.arcCrownStudy.drawings, ...data.directionalStudy.drawings, ...data.baseProfileStudy.drawings]) {
    const image = await request(item.artifact.url, { headers: { Cookie: cookie } });
    assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/png');
    const bytes = Buffer.from(await image.arrayBuffer()); assert.equal(bytes.length, item.artifact.bytes);
  }
});
test('artifact ACL filters metadata and blocks disallowed direct file requests', async () => {
  member = { ...active(), artifactIds: ['PM-I-A1-R00'] };
  const data = await (await request('/api/catalogue/data', { headers: { Cookie: cookie } })).json();
  assert.equal(data.products.length, 1); assert.equal(data.typical.length, 0);
  assert.equal(data.pilotStudy, null);
  assert.equal(data.shellStudy, null);
  assert.equal(data.diagnosticStudy, null);
  assert.equal(data.bayStudy, null);
  assert.equal(data.stressStudy, null);
  assert.equal(data.benchmarkStudy, null);
  assert.equal(data.curvedStudy, null);
  assert.equal(data.quadraticBayStudy, null);
  assert.equal(data.localMeshStudy, null);
  assert.equal(data.gravityCouponStudy, null);
  assert.equal(data.profileThicknessStudy, null);
  assert.equal(data.combinedMeshStudy,null);
  assert.equal(data.baseProfileStudy,null);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-BASE-PROFILE-QA-S2O-R00',{headers:{Cookie:cookie}})).status,403);
  assert.equal(data.directionalStudy,null);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-DIRECTIONAL-QA-S2N-R00',{headers:{Cookie:cookie}})).status,403);
  assert.equal(data.arcCrownStudy,null);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-ARC-CROWN-QA-S2M-R00',{headers:{Cookie:cookie}})).status,403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-COMBINED-QA-S2L-R00',{headers:{Cookie:cookie}})).status,403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-PROFILE-MESH-S2K-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-GRAVITY-FBD-S2J-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-LOCAL-MESH-S2I-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/PM-U-C4-R00', { headers: { Cookie: cookie } })).status, 403);
});
test('catalogue-only member cannot read engineering metadata or download engineering images', async () => {
  member = { ...active(), canReadEngineering: false };
  const data = await (await request('/api/catalogue/data', { headers: { Cookie: cookie } })).json();
  assert.equal(data.pilotStudy, null); assert.equal(data.products.length, 48);
  assert.equal(data.shellStudy,null);
  assert.equal(data.diagnosticStudy,null);
  assert.equal(data.bayStudy,null);
  assert.equal(data.stressStudy,null);
  assert.equal(data.benchmarkStudy,null);
  assert.equal(data.curvedStudy,null);
  assert.equal(data.quadraticBayStudy,null);
  assert.equal(data.localMeshStudy,null);
  assert.equal(data.gravityCouponStudy,null);
  assert.equal(data.profileThicknessStudy,null);
  assert.equal(data.combinedMeshStudy,null);
  assert.equal(data.baseProfileStudy,null);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-BASE-PROFILE-QA-S2O-R00',{headers:{Cookie:cookie}})).status,403);
  assert.equal(data.directionalStudy,null);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-DIRECTIONAL-QA-S2N-R00',{headers:{Cookie:cookie}})).status,403);
  assert.equal(data.arcCrownStudy,null);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-ARC-CROWN-QA-S2M-R00',{headers:{Cookie:cookie}})).status,403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-COMBINED-QA-S2L-R00',{headers:{Cookie:cookie}})).status,403);
  for(const id of ['TS-C-PROFILE-MESH-S2K-R00','TS-C-PROFILE-QA-S2K-R00']) assert.equal((await request('/api/catalogue/artifacts/'+id,{headers:{Cookie:cookie}})).status,403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-GRAVITY-FBD-S2J-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-GRAVITY-QA-S2J-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-LOCAL-MESH-S2I-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-TRACTION-S2I-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-QBAY-FBD-S2H-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-QBAY-QA-S2H-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-CURVED-FBD-S2G-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-CURVED-QA-S2G-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-BENCHMARK-FBD-S2F-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-BENCHMARK-QA-S2F-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-STRESS-PROFILE-S2E-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-STRESS-QA-S2E-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-SOLID-BAY-S2D-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-CUT-FBD-S2D-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-COUPON-S2C-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-FORCES-S2B-R00', { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await request('/api/catalogue/artifacts/TS-C-FBD-S2A-R00', { headers: { Cookie: cookie } })).status, 403);
  member = active();
});
test('engineering input/code dependency changes are detected as stale without changing R01', async () => {
  const { data } = await loadCatalogue(root);
  assert.equal(await studyIsStale(root, data.pilotStudy), false);
  assert.equal(await studyIsStale(root, { ...data.pilotStudy, dependency_hashes: {} }), true);
  assert.equal(await studyIsStale(root, data.shellStudy),false);
  assert.equal(await studyIsStale(root, {...data.shellStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,data.diagnosticStudy),false);
  assert.equal(await studyIsStale(root,{...data.diagnosticStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.diagnosticStudy,raw_source_hashes:{}}),true);
  assert.equal(await studyIsStale(root,data.bayStudy),false);
  assert.equal(await studyIsStale(root,{...data.bayStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,data.stressStudy),false);
  assert.equal(await studyIsStale(root,{...data.stressStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.stressStudy,raw_source_hashes:{}}),true);
  assert.equal(await studyIsStale(root,data.benchmarkStudy),false);
  assert.equal(await studyIsStale(root,{...data.benchmarkStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.benchmarkStudy,raw_output_hashes:{}}),true);
  assert.equal(await studyIsStale(root,data.curvedStudy),false);
  assert.equal(await studyIsStale(root,{...data.curvedStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.curvedStudy,raw_output_hashes:{}}),true);
  assert.equal(await studyIsStale(root,data.quadraticBayStudy),false);
  assert.equal(await studyIsStale(root,{...data.quadraticBayStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.quadraticBayStudy,raw_output_hashes:{}}),true);
  assert.equal(await studyIsStale(root,data.localMeshStudy),false);
  assert.equal(await studyIsStale(root,{...data.localMeshStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.localMeshStudy,raw_output_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.localMeshStudy,raw_output_hashes:{...data.localMeshStudy.raw_output_hashes,'output/tsc-step2i-r00/TRACTION-QSB-T175-FR-FULL-H4.json':'changed'}}),true);
  assert.equal(await studyIsStale(root,data.gravityCouponStudy),false);
  assert.equal(await studyIsStale(root,data.profileThicknessStudy),false);
  assert.equal(await studyIsStale(root,data.combinedMeshStudy),false);
  assert.equal(await studyIsStale(root,data.baseProfileStudy),false);
  assert.equal(await studyIsStale(root,{...data.baseProfileStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.baseProfileStudy,raw_output_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.baseProfileStudy,raw_output_hashes:{...data.baseProfileStudy.raw_output_hashes,'output/tsc-step2o-r00/BASE-T175-FR-FULL-NB.json':'changed'}}),true);
  assert.equal(await studyIsStale(root,data.directionalStudy),false);
  assert.equal(await studyIsStale(root,{...data.directionalStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.directionalStudy,raw_output_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.directionalStudy,raw_output_hashes:{...data.directionalStudy.raw_output_hashes,'output/tsc-step2m-r00/ARC-T175-FR-FULL-M1.json':'changed'}}),true);
  assert.equal(await studyIsStale(root,data.arcCrownStudy),false);
  assert.equal(await studyIsStale(root,{...data.arcCrownStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.arcCrownStudy,raw_output_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.arcCrownStudy,raw_output_hashes:{...data.arcCrownStudy.raw_output_hashes,'output/tsc-step2m-r00/ARC-T175-FR-FULL-M1.json':'changed'}}),true);
  assert.equal(await studyIsStale(root,{...data.combinedMeshStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.combinedMeshStudy,raw_output_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.combinedMeshStudy,raw_output_hashes:{...data.combinedMeshStudy.raw_output_hashes,'output/tsc-step2l-r00/COMBINED-T175-FR-FULL-KPT.json':'changed'}}),true);
  assert.equal(await studyIsStale(root,{...data.profileThicknessStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.profileThicknessStudy,raw_output_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.profileThicknessStudy,raw_output_hashes:{...data.profileThicknessStudy.raw_output_hashes,'output/tsc-step2k-r00/PT-T175-FR-FULL-KT.json':'changed'}}),true);
  assert.equal(await studyIsStale(root,{...data.gravityCouponStudy,dependency_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.gravityCouponStudy,raw_output_hashes:{}}),true);
  assert.equal(await studyIsStale(root,{...data.gravityCouponStudy,raw_output_hashes:{...data.gravityCouponStudy.raw_output_hashes,'output/tsc-step2j-r00/GRAVITY-NU20-J7.json':'changed'}}),true);
});
test('membership changes take effect on every direct request, despite an existing session', async () => {
  for (const change of [{ projectActive: false }, { expiresAt: clock }, { orgActive: false }, { anonymous: true }]) {
    member = { ...active(), ...change };
    assert.equal((await request('/api/catalogue/artifacts/PM-I-A1-R00', { headers: { Cookie: cookie } })).status, 401);
  }
  member = active();
});
test('workspace, PDFs, legacy output paths, public files and Vite source mounts are never served', async () => {
  for (const path of ['/output/split-shell-16/A1_gable_office.png', '/knowledge/modular-program-r01/baseline.json', '/@fs/E:/1.0%20Project%20GPT%20Work/Precast-Module/output/ilu-standard-r00/TS-C_typical_segments.png', '/assets/../catalogue/server.mjs', '/revit/example.ifc', '/' + encodeURIComponent('วสท อนุญาติแล้ว.pdf')]) {
    assert.equal((await request(path, { headers: { Cookie: cookie } })).status, 404);
  }
});
test('cross-origin requests and wrong hosts fail closed', async () => {
  assert.equal((await request('/api/catalogue/data', { headers: { Cookie: cookie, Origin: 'https://example.invalid' } })).status, 403);
  const wrongHostStatus = await new Promise((resolve, reject) => {
    const req = httpRequest(origin + '/api/catalogue/data', { headers: { Cookie: cookie, Host: 'example.invalid' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject); req.end();
  });
  assert.equal(wrongHostStatus, 403);
  assert.equal((await request('/api/catalogue/session', { method: 'POST', body: '{}' })).status, 403);
});
test('logout revokes the server session', async () => {
  assert.equal((await request('/api/catalogue/session', { method: 'DELETE', headers: { Cookie: cookie, Origin: origin } })).status, 200);
  assert.equal((await request('/api/catalogue/data', { headers: { Cookie: cookie } })).status, 401);
});
test('preview link is one-time, expires, and never grants access on a non-loopback origin', async () => {
  await assert.rejects(() => createCatalogueServer({ root, origin: 'https://example.invalid', ownerPreview: true }));
  const preview = await createCatalogueServer({ root, origin: 'http://127.0.0.1:5198', ownerPreview: true, now: () => clock });
  await new Promise(r => preview.server.listen(5198, '127.0.0.1', r));
  try {
    const url = 'http://127.0.0.1:5198';
    const enter = token => fetch(url + '/api/catalogue/session', { method: 'POST', headers: { Origin: url, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    assert.equal((await enter('wrong-token')).status, 401);
    const first = await enter(preview.entryToken); assert.equal(first.status, 200);
    const ownerCookie = first.headers.get('set-cookie').split(';')[0];
    assert.equal((await enter(preview.entryToken)).status, 401);
    clock += 4 * 60 * 60 * 1000 + 1;
    assert.equal((await fetch(url + '/api/catalogue/data', { headers: { Cookie: ownerCookie } })).status, 401);
  } finally { await new Promise(r => preview.server.close(r)); }
  const expired = await createCatalogueServer({ root, origin: 'http://127.0.0.1:5198', ownerPreview: true, now: () => clock });
  clock += 10 * 60 * 1000 + 1;
  await new Promise(r => expired.server.listen(5198, '127.0.0.1', r));
  try {
    const result = await fetch('http://127.0.0.1:5198/api/catalogue/session', { method: 'POST', headers: { Origin: 'http://127.0.0.1:5198', 'Content-Type': 'application/json' }, body: JSON.stringify({ token: expired.entryToken }) });
    assert.equal(result.status, 401);
  } finally { await new Promise(r => expired.server.close(r)); }
});
test('public build contains only UI assets, no catalogue seed, source PDF or private image', async () => {
  const files = await readdir(resolve(root, 'apps/web/dist-catalogue/assets'));
  assert.ok(files.every(name => /\.(css|js)$/.test(name)));
  for (const file of files) {
    const text = await readFile(resolve(root, 'apps/web/dist-catalogue/assets', file), 'utf8');
    for (const forbidden of ['A1_gable_office.png', 'PM-U-C4-R00', 'วสท อนุญาติแล้ว.pdf', '011008-21', '0.4903325']) assert.equal(text.includes(forbidden), false, forbidden);
  }
  assert.equal(allowed({ ...active(), expiresAt: NaN }, undefined, clock), false);
});
