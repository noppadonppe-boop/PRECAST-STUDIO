import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { BimModel } from './types';
import { classifyPrecast } from './precast';

export function BimViewer({ model }: { model: BimModel }) {
  const host = useRef<HTMLDivElement>(null);
  const classified = useMemo(() => model.elements.map((element) => ({ ...element, precast: element.precast ?? classifyPrecast(element.type, []) })), [model]);
  const [confirmed, setConfirmed] = useState<Set<number>>(() => new Set());
  const geometryIds = useMemo(() => new Set(model.meshes.map((mesh) => mesh.id)), [model]);
  const selectable = useMemo(() => classified.filter((element) => (element.precast.status === 'precast' || confirmed.has(element.id)) && geometryIds.has(element.id)), [classified, confirmed, geometryIds]);
  const [selected, setSelected] = useState<number | null>(() => selectable[0]?.id ?? null);
  const allowed = useRef(new Set<number>());
  const [contextVisible, setContextVisible] = useState(true);
  const showReference = contextVisible || selectable.length === 0;
  const pending = classified.filter((element) => element.precast.status === 'review' && !confirmed.has(element.id) && geometryIds.has(element.id));
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [isolated, setIsolated] = useState(false);
  const [search, setSearch] = useState('');
  const select = useRef<(id: number | null, isolate: boolean, context: boolean) => void>(() => {});
  const view = useRef<(top: boolean) => void>(() => {});
  const zoom = useRef<(factor: number) => void>(() => {});
  const choose = (id: number) => { setSelected(id); setInspectorOpen(true); };
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { setError('เปิด 3D ไม่สำเร็จ กรุณาเปิด WebGL / hardware acceleration ในเบราว์เซอร์'); return; }
    setError('');
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#edf2f6');
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true; controls.enableZoom = true; controls.enablePan = true;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    renderer.domElement.style.touchAction = 'none';
    const group = new THREE.Group();
    for (const item of model.meshes) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(item.vertices.length / 2);
      const normals = new Float32Array(item.vertices.length / 2);
      for (let i = 0; i < item.vertices.length / 6; i++) {
        positions.set(item.vertices.subarray(i * 6, i * 6 + 3), i * 3);
        normals.set(item.vertices.subarray(i * 6 + 3, i * 6 + 6), i * 3);
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geometry.setIndex(new THREE.BufferAttribute(item.indices, 1));
      geometry.applyMatrix4(new THREE.Matrix4().fromArray(item.transform));
      const color = new THREE.Color(item.color[0]!, item.color[1]!, item.color[2]!);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
      mesh.userData = { id: item.id, color: color.clone() };
      group.add(mesh);
    }
    scene.add(group, new THREE.HemisphereLight(0xffffff, 0x637181, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(10, 20, 10); scene.add(light);
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.sub(center);
    const size = Math.max(box.getSize(new THREE.Vector3()).length(), 1);
    camera.near = size / 10000; camera.far = size * 100; camera.updateProjectionMatrix();
    select.current = (id, isolate, context) => {
      for (const child of group.children) {
        const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
        mesh.material.color.copy(mesh.userData.id === id ? new THREE.Color('#ef8c43') : mesh.userData.color as THREE.Color);
        mesh.material.emissive.set(mesh.userData.id === id ? '#542408' : '#000000');
        const isPrecast = allowed.current.has(Number(mesh.userData.id));
        mesh.visible = isolate ? mesh.userData.id === id : isPrecast || context;
        // With no classified pieces, render the reference clearly instead of an empty canvas.
        const referenceOnly = allowed.current.size === 0;
        mesh.material.transparent = !isPrecast && !referenceOnly; mesh.material.opacity = isPrecast || referenceOnly ? 1 : 0.3;
        mesh.material.depthWrite = isPrecast || referenceOnly;
      }
    };
    view.current = (top) => {
      camera.position.set(top ? 0 : size, top ? size * 1.4 : size * 0.7, top ? 0.001 : size);
      controls.target.set(0, 0, 0); controls.update();
    };
    zoom.current = (factor) => { camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target); controls.update(); };
    controls.minDistance = size / 100; controls.maxDistance = size * 10;
    view.current(false);
    const resize = new ResizeObserver(() => {
      const width = Math.max(container.clientWidth, 1); renderer.setSize(width, 460);
      camera.aspect = width / 460; camera.updateProjectionMatrix();
    }); resize.observe(container);
    const pointer = new THREE.Vector2(); const ray = new THREE.Raycaster();
    let down: { x: number; y: number; id: number } | null = null;
    const start = (event: PointerEvent) => { down = event.button === 0 ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null; };
    const cancel = () => { down = null; };
    const click = (event: PointerEvent) => {
      const initial = down; down = null;
      if (!initial || event.pointerId !== initial.id || Math.hypot(event.clientX - initial.x, event.clientY - initial.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(group.children.filter((child) => child.visible && allowed.current.has(Number(child.userData.id))))[0];
      if (hit) { setSelected(Number(hit.object.userData.id)); setInspectorOpen(true); }
    };
    renderer.domElement.addEventListener('pointerdown', start);
    renderer.domElement.addEventListener('pointerup', click);
    renderer.domElement.addEventListener('pointercancel', cancel);
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return () => {
      select.current = () => {}; view.current = () => {}; zoom.current = () => {}; resize.disconnect(); controls.dispose(); renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('pointerdown', start);
      renderer.domElement.removeEventListener('pointerup', click);
      renderer.domElement.removeEventListener('pointercancel', cancel);
      for (const child of group.children) { const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material>; mesh.geometry.dispose(); mesh.material.dispose(); }
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [model]);
  useEffect(() => { allowed.current = new Set(selectable.map((element) => element.id)); select.current(selected, isolated && selectable.length > 0, showReference); }, [selected, isolated, model, selectable, showReference]);
  useEffect(() => { view.current(plan); }, [plan, model]);
  const item = selectable.find((element) => element.id === selected);
  const dimensions = useMemo(() => {
    const box = new THREE.Box3(); const point = new THREE.Vector3();
    for (const mesh of model.meshes.filter((mesh) => mesh.id === selected)) {
      const transform = new THREE.Matrix4().fromArray(mesh.transform);
      for (let i = 0; i < mesh.vertices.length; i += 6) box.expandByPoint(point.fromArray(mesh.vertices, i).applyMatrix4(transform));
    }
    return box.isEmpty() ? null : box.getSize(new THREE.Vector3()).multiplyScalar(1000);
  }, [model, selected]);
  const filtered = selectable.filter((element) => `${element.id} ${element.name} ${element.type} ${element.guid}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="bim-viewer" aria-label="เลือกชิ้นส่วน BIM">
    <div className="bim-precast-filter"><strong>เลือกเฉพาะพรีคาสท์ · {selectable.length} ชิ้น</strong><p>ไม่รวมประตู หน้าต่าง ช่องเปิด และงานประกอบอื่นในรายการเลือก</p><label><input type="checkbox" checked={showReference} disabled={!selectable.length} onChange={(event) => setContextVisible(event.target.checked)} /> แสดงส่วนอื่นจาง ๆ เป็นแบบอ้างอิง (เลือกไม่ได้)</label>
      {pending.length > 0 && <details><summary>รอยืนยันชนิดพรีคาสท์ {pending.length} ชิ้น</summary><p>IFC ยังไม่ระบุว่าเป็นพรีคาสท์ ผนังหรือพื้นอาจเป็นงานหล่อในที่ ให้ยืนยันเฉพาะชิ้นที่ทราบจากแบบต้นฉบับ การยืนยันนี้ใช้ในการเปิดโมเดลครั้งนี้และยังไม่ใช่อนุมัติส่ง FEM</p><div className="bim-pending-list">{pending.slice(0, 200).map((element) => <div key={element.id}><span>#{element.id} · {element.name}<small>{element.type}</small></span><button className="button button--secondary" aria-label={`ยืนยันพรีคาสท์ #${element.id}`} onClick={() => { setConfirmed((ids) => new Set([...ids, element.id])); choose(element.id); }}>ยืนยันเป็นพรีคาสท์</button></div>)}</div>{pending.length > 200 && <p>แสดง 200 รายการแรก ควรระบุ IsPrecast ใน IFC สำหรับโมเดลขนาดใหญ่</p>}</details>}
      {!selectable.length && <p>กำลังแสดงโมเดลต้นฉบับเพื่ออ้างอิง หมุนและซูมได้ · ยังไม่มีข้อมูลยืนยันพรีคาสท์ ให้เปิด “รอยืนยันชนิดพรีคาสท์” เพื่อยืนยันชิ้นงาน หรือส่งออก IFC ที่มี IsPrecast=true / Precast=true</p>}
      {item && <p>#{item.id} · {confirmed.has(item.id) ? 'ผู้ใช้ยืนยันสำหรับการเปิดโมเดลครั้งนี้' : item.precast.reason} {confirmed.has(item.id) && <button className="button button--secondary" onClick={() => { setConfirmed((ids) => { const next = new Set(ids); next.delete(item.id); return next; }); setSelected(null); setIsolated(false); }}>ถอนการยืนยันชิ้นนี้</button>}</p>}
    </div>
    <div className="studio-context-tools"><p>คลิกชิ้นส่วนในโมเดลหรือรายการด้านล่าง · สีส้มคือชิ้นงานที่เลือก</p><button className="button button--secondary" aria-expanded={inspectorOpen} aria-controls="bim-inspector" onClick={() => setInspectorOpen(!inspectorOpen)}>{inspectorOpen ? 'ซ่อน' : 'แสดง'}คุณสมบัติ</button></div>
    <div className={`bim-selection-layout ${inspectorOpen ? '' : 'bim-inspector-hidden'}`}><div className="bim-selection-main">
      <div className="studio-viewer-toolbar"><span>เลือกชิ้นงาน</span><button aria-pressed={isolated} disabled={!dimensions} onClick={() => setIsolated(!isolated)}>เฉพาะชิ้นที่เลือก</button><div className="studio-segment" aria-label="มุมมองโมเดล"><button aria-label="มุมมอง 3D" aria-pressed={!plan} onClick={() => setPlan(false)}>3D</button><button aria-label="มุมมอง แปลน" aria-pressed={plan} onClick={() => setPlan(true)}>Plan</button></div></div>
      {error && <p role="alert">{error}</p>}<div className="bim-canvas-wrap"><div ref={host} aria-label="โมเดล IFC ที่นำเข้า" role="img" /><div className="studio-zoom"><button aria-label="ย่อโมเดล" onClick={() => zoom.current(1.2)}>−</button><button aria-label="พอดีหน้าจอ" onClick={() => view.current(plan)}>พอดี</button><button aria-label="ขยายโมเดล" onClick={() => zoom.current(1 / 1.2)}>＋</button></div></div>
      <p className="bim-selected-caption" role="status">{item ? `เลือก #${item.id} · ${item.name}` : 'คลิกชิ้นงานเพื่อดูคุณสมบัติ'} · ลากเมาส์ซ้าย: หมุน · ลากขวา: เลื่อน · ล้อเมาส์: ซูม</p>
      <label className="bim-search">ค้นหาชิ้นงาน<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ชื่อ ชนิด หมายเลข หรือ GlobalId" /></label>
      <div className="studio-object-strip bim-object-strip" aria-label="รายการชิ้นงาน">{filtered.slice(0, 200).map((element) => <button key={element.id} aria-label={`เลือกชิ้นงาน #${element.id} ${element.name}`} aria-pressed={selected === element.id} onClick={() => { choose(element.id); if (!model.meshes.some((mesh) => mesh.id === element.id)) setIsolated(false); }}>#{element.id} · {element.name}<span>{element.type}</span></button>)}</div>
      {!filtered.length && <p>ไม่พบชิ้นงานที่ตรงกับคำค้น</p>}{filtered.length > 200 && <p>แสดง 200 จาก {filtered.length} ชิ้น · ค้นหาเพื่อจำกัดรายการ</p>}
      <label className="bim-search">ชิ้นงานจาก IFC <select value={selected ?? ''} onChange={(event) => { if (event.target.value) { choose(Number(event.target.value)); setIsolated(false); } }}><option value="">เลือกพรีคาสท์ ({selectable.length})</option>{selectable.map((element) => <option key={element.id} value={element.id}>{element.type} · {element.name}</option>)}</select></label>
    </div><aside className="studio-inspector" id="bim-inspector" aria-label="คุณสมบัติชิ้นงาน BIM" hidden={!inspectorOpen}><header><h2>{item ? `#${item.id} · ${item.name}` : 'คุณสมบัติชิ้นงาน'}</h2><p>ข้อมูลจาก IFC ที่นำเข้า</p></header><div className="studio-inspector-body">{item ? <><label>ชนิดชิ้นงาน<input readOnly value={item.type} /></label><label>ชื่อชิ้นงาน<input readOnly value={item.name} /></label><dl className="studio-facts"><div><dt>Express ID</dt><dd>{item.id}</dd></div><div><dt>GlobalId</dt><dd className="bim-guid">{item.guid || 'ไม่มี'}</dd></div></dl>{dimensions ? <><strong>กรอบครอบตามแกนโมเดล · mm</strong><dl className="studio-facts">{(['x', 'y', 'z'] as const).map((axis) => <div key={axis}><dt>แกน {axis.toUpperCase()}</dt><dd>{dimensions[axis].toLocaleString('th-TH', { maximumFractionDigits: 1 })}</dd></div>)}</dl><small>ขนาดกรอบครอบเรขาคณิต ไม่ใช่ค่าความหนาหรือขนาดผลิตของชิ้นงาน</small></> : <p>ชิ้นนี้มีข้อมูล IFC แต่ไม่มีเรขาคณิตแสดงแยกในตัวอ่าน เช่น ช่องเปิด</p>}<div className="studio-validation-note">ข้อมูลต้นฉบับอ่านอย่างเดียว การแก้ขนาดให้แก้ใน Revit และนำเข้า IFC Revision ใหม่</div></> : <p>เลือกชิ้นงานจากโมเดลหรือรายการด้านซ้าย</p>}</div></aside></div>
  </section>;
}
