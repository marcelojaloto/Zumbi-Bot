import * as THREE from 'three';
import './ui/styles/base.css';

// Cena provisória (M0): robô low-poly girando na névoa. Substituída pelo App no M1.
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d14);
scene.fog = new THREE.FogExp2(0x1b2233, 0.06);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
camera.position.set(0, 3, 9);
camera.lookAt(0, 1, 0);

scene.add(new THREE.HemisphereLight(0x8fa6ff, 0x1a1410, 0.6));
const moon = new THREE.DirectionalLight(0x9fb4ff, 1.4);
moon.position.set(4, 8, 5);
moon.castShadow = true;
scene.add(moon);
const lamp = new THREE.PointLight(0xff8c1a, 6, 8);
lamp.position.set(-2, 2, 1);
scene.add(lamp);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const steel = new THREE.MeshStandardMaterial({
  color: 0x7a8aa0,
  metalness: 0.6,
  roughness: 0.4,
  flatShading: true,
});
const accent = new THREE.MeshStandardMaterial({ color: 0xff8c1a, flatShading: true });
const visor = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x39e6ff).multiplyScalar(2) });
const robot = new THREE.Group();
const part = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z = 0) => {
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  robot.add(mesh);
  return mesh;
};
part(new THREE.BoxGeometry(0.7, 0.6, 0.45), steel, 0, 1.2);
part(new THREE.BoxGeometry(0.5, 0.35, 0.35), accent, 0, 0.8);
part(new THREE.BoxGeometry(0.45, 0.4, 0.4), steel, 0, 1.72);
part(new THREE.BoxGeometry(0.34, 0.1, 0.05), visor, 0, 1.75, 0.21);
for (const s of [-1, 1]) {
  part(new THREE.BoxGeometry(0.18, 0.6, 0.18), steel, s * 0.45, 1.15);
  part(new THREE.BoxGeometry(0.2, 0.7, 0.2), steel, s * 0.15, 0.35);
}
scene.add(robot);

ui.innerHTML = `<div class="splash"><h1>ZUMBI BOT</h1><p>A revolução dos robôs no apocalipse zumbi</p><button class="btn" data-nav>Jogar</button></div>`;

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

renderer.setAnimationLoop((t) => {
  robot.rotation.y = t / 1500;
  lamp.intensity = 5 + Math.sin(t / 90) * 0.6 + Math.random() * 0.8;
  renderer.render(scene, camera);
});
