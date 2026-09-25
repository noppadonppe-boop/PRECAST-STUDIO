import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { JointGroupId } from './joints';
import './joint-viewer.css';

const viewerHeight = 390;
const colours = {
  concrete: '#b9c9d5',
  concreteEdge: '#557487',
  concreteDark: '#859ba8',
  foundation: '#667b88',
  grout: '#9ca7aa',
  connector: '#e4933d',
  steel: '#b65a27',
  seal: '#2da3a1',
};

function material(colour: string, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color: colour, roughness: .72, metalness: .08, ...options });
}

function addBox(parent: THREE.Group, size: [number, number, number], position: [number, number, number], mat: THREE.Material, rotation?: [number, number, number]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent: THREE.Group, radius: number, length: number, position: [number, number, number], mat: THREE.Material, rotation: [number, number, number] = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 20), mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildJointModel(id: JointGroupId) {
  const model = new THREE.Group();
  const concrete = material(colours.concrete);
  const concreteDark = material(colours.concreteDark);
  const foundation = material(colours.foundation);
  const grout = material(colours.grout, { transparent: true, opacity: .82 });
  const connector = material(colours.connector, { metalness: .35, roughness: .42 });
  const steel = material(colours.steel, { metalness: .4, roughness: .38 });
  const seal = material(colours.seal, { transparent: true, opacity: .9 });

  if (id === 'J-S') {
    addBox(model, [2.4, 2.8, .28], [-1.55, 1.55, 0], concrete);
    addBox(model, [2.4, 2.8, .28], [1.55, 1.55, 0], concrete);
    addBox(model, [.22, .5, .38], [-.15, .9, 0], concreteDark);
    addBox(model, [.22, .5, .38], [.15, 2.05, 0], concreteDark);
    addBox(model, [.22, 2.3, .36], [0, 1.55, 0], grout);
    addBox(model, [1.05, .16, .12], [0, 1.98, -.24], connector);
    addCylinder(model, .07, 1.05, [0, 1.98, -.32], steel, [0, 0, Math.PI / 2]);
    addCylinder(model, .1, .12, [-.53, 1.98, -.32], steel, [0, 0, Math.PI / 2]);
    addCylinder(model, .1, .12, [.53, 1.98, -.32], steel, [0, 0, Math.PI / 2]);
    addBox(model, [.95, .09, .33], [0, .45, 0], seal);
  } else if (id === 'J-N') {
    addBox(model, [2.15, 2.7, .28], [-1.35, 1.55, 0], concrete);
    addBox(model, [2.15, 2.7, .28], [1.35, 1.55, 0], concrete);
    addBox(model, [.28, 2.7, 2.15], [0, 1.55, -1.35], concreteDark);
    addBox(model, [.28, 2.7, 2.15], [0, 1.55, 1.35], concreteDark);
    addBox(model, [.92, 1.2, .92], [0, 1.48, 0], grout);
    addCylinder(model, .065, 2.2, [0, 1.25, 0], steel);
    addCylinder(model, .065, 2.05, [0, 1.25, 0], steel, [0, 0, Math.PI / 2]);
    addCylinder(model, .065, 2.05, [0, 1.25, 0], steel, [Math.PI / 2, 0, 0]);
    addBox(model, [.68, .14, .18], [0, 1.72, -.52], connector);
    addBox(model, [.18, .14, .68], [.52, 1.25, 0], connector);
    addBox(model, [.82, .08, .82], [0, 2.13, 0], seal);
  } else {
    addBox(model, [4.5, .38, 3.2], [0, .2, 0], foundation);
    addBox(model, [2.55, .18, 1.45], [0, .48, 0], grout);
    addBox(model, [2.45, 2.75, .32], [0, 1.95, 0], concrete);
    addBox(model, [.46, .28, .58], [-.78, .7, 0], connector);
    addBox(model, [.46, .28, .58], [.78, .7, 0], connector);
    addCylinder(model, .075, 1.05, [-.78, .95, 0], steel);
    addCylinder(model, .075, 1.05, [.78, .95, 0], steel);
    addBox(model, [2.2, .1, .22], [0, .6, -.2], seal);
  }
  return model;
}

export function Joint3DViewer({ groupId, title }: { groupId: JointGroupId; title: string }) {
  const host = useRef<HTMLDivElement>(null);
  const resetView = useRef<() => void>(() => {});
  const [error, setError] = useState('');

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    if (typeof window.WebGLRenderingContext === 'undefined') {
      setError('เบราว์เซอร์นี้ยังเปิด WebGL ไม่ได้ สามารถดูคำอธิบายและ Catalog ด้านล่างแทนได้');
      return;
    }
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setError('เบราว์เซอร์นี้ยังเปิด WebGL ไม่ได้ สามารถดูคำอธิบายและ Catalog ด้านล่างแทนได้');
      return;
    }
    setError('');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.setClearColor('#edf2f6');
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', `ภาพ 3D ${title}`);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .01, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .08;
    controls.minDistance = 3;
    controls.maxDistance = 18;
    controls.target.set(0, 1.2, 0);
    const model = buildJointModel(groupId);
    scene.add(model);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x657887, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(5, 8, 6);
    key.castShadow = true;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb9d9e7, .9);
    fill.position.set(-5, 4, -4);
    scene.add(fill);
    const grid = new THREE.GridHelper(8, 16, '#b9c9d3', '#d8e2e7');
    grid.position.y = 0;
    scene.add(grid);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const size = Math.max(box.getSize(new THREE.Vector3()).length(), 1);
    controls.target.set(0, 0, 0);
    resetView.current = () => {
      camera.position.set(size * 1.45, size * .95, size * 1.45);
      controls.target.set(0, 0, 0);
      controls.update();
    };
    resetView.current();

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      renderer.setSize(width, viewerHeight, false);
      camera.aspect = width / viewerHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(container);
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return () => {
      resetView.current = () => {};
      observer?.disconnect();
      controls.dispose();
      renderer.setAnimationLoop(null);
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach(item => item.dispose());
        else if (mesh.material) mesh.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [groupId, title]);

  return <section className="cat-joint-viewer" aria-label={`ภาพ 3D ${title}`}>
    <div className="cat-joint-viewer-toolbar"><div><strong>ภาพประกอบ 3D · {groupId}</strong><span>ลากเพื่อหมุน · ล้อเมาส์เพื่อซูม</span></div><button type="button" onClick={() => resetView.current()}>มุมมองเริ่มต้น</button></div>
    <div className="cat-joint-canvas" ref={host}>{error && <div className="cat-joint-webgl-error" role="status">{error}</div>}</div>
    <div className="cat-joint-legend" aria-label="คำอธิบายสี 3D"><span><i className="legend-concrete" />คอนกรีต Precast</span><span><i className="legend-connector" />Connector / Plate / Shoe</span><span><i className="legend-steel" />เหล็ก / Anchor / Dowel</span><span><i className="legend-grout" />Grout / Closure</span><span><i className="legend-seal" />Seal / กันน้ำ</span></div>
  </section>;
}
