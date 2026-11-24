// Entry: renderer setup (WebGPU default, WebGL on request), scene, lights, UI.
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHead } from './head.js';
import { buildHair } from './hair.js';
import { ITERATION, SCORE } from './meta.js';

const NECK_LIFT = 0.42;
const Q = new URLSearchParams(location.search);
const backend = Q.get('backend') || localStorage.getItem('backend') || 'webgpu';
const RES = { '900x1200': [900, 1200], '480x640': [480, 640], '720x1280': [720, 1280], '1280x720': [1280, 720], '1080x1920': [1080, 1920], '1920x1080': [1920, 1080], '1440x2560 (2K)': [1440, 2560], '2560x1440 (2K)': [2560, 1440], '2160x3840 (4K)': [2160, 3840], '3840x2160 (4K)': [3840, 2160] };
const resKey = Q.get('res') || localStorage.getItem('res') || '900x1200';
const [W, H] = RES[resKey] || RES['900x1200'];
if (Q.get('hideui')) document.body.classList.add('hideui');
const $ = (id) => document.getElementById(id);
const showErr = (m) => { $('err').hidden = false; $('err').textContent += m + '\n'; };
addEventListener('error', (e) => showErr(String(e.message)));
addEventListener('unhandledrejection', (e) => showErr(String(e.reason)));

// ---- settings UI ----
$('badge').textContent = `Iteration ${ITERATION} · Score ${SCORE}/100`;
$('backend').value = backend;
for (const k of Object.keys(RES)) $('res').add(new Option(k, k, false, k === resKey));
$('gear').onclick = () => { $('panel').hidden = !$('panel').hidden; };
const reload = (k, v) => { localStorage.setItem(k, v); Q.set(k, v); location.search = Q.toString(); };
$('backend').onchange = (e) => reload('backend', e.target.value);
$('res').onchange = (e) => reload('res', e.target.value);
$('toGL').onclick = () => reload('backend', 'webgl');

const canvas = $('c');
function sizeCanvas() {
  const half = innerWidth < 900 ? 0.5 : 1;
  canvas.style.width = W * half + 'px'; canvas.style.height = H * half + 'px';
}
sizeCanvas(); addEventListener('resize', sizeCanvas);

async function start() {
  if (backend === 'webgpu' && !(navigator.gpu && await navigator.gpu.requestAdapter())) { $('prompt').hidden = false; return; }
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL: backend === 'webgl' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  await renderer.init();
  window.__backend = renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl';

  const scene = new THREE.Scene();
  scene.background = bgTexture();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;

  // daylight: warm key from upper right, cool sky fill, soft rim
  const key = new THREE.DirectionalLight('#fff3e6', 3.0); key.position.set(3, 4, 5);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -4, near: 1, far: 15 });
  scene.add(key, new THREE.HemisphereLight('#dfe9ff', '#c8b8b0', 0.9));
  const rim = new THREE.DirectionalLight('#cfe0ff', 1.4); rim.position.set(-4, 3, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight('#ffe6e0', 0.6); fill.position.set(-4, 0, 3); scene.add(fill);

  const model = new THREE.Group();
  model.add(buildHead(THREE), buildHair(THREE));
  try {
    const { buildAccessories } = await import('./accessories.js');
    const acc = buildAccessories(THREE); model.add(acc);
    // shorter neck: lift torso pieces toward the head
    for (const n of ['necklace', 'outfit']) acc.getObjectByName(n).position.y += NECK_LIFT;
  } catch (e) { console.warn('accessories', e); }
  model.children[0].children.at(-1).position.y += NECK_LIFT;
  model.rotation.z = -0.04; // slight head tilt like the photo
  scene.add(model);
  scene.add(nameSprite());

  const camera = new THREE.PerspectiveCamera(24, W / H, 0.1, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, -0.35, 0); controls.enableDamping = true; controls.minDistance = 3; controls.maxDistance = 25;
  const setView = (v) => {
    const a = { front: 0, threequarter: 0.6, left: -Math.PI / 2, right: Math.PI / 2, back: Math.PI }[v] ?? 0;
    const d = (W / H < 1 ? 12 : 9.5);
    camera.position.set(Math.sin(a) * d, 0.1, Math.cos(a) * d); controls.update();
  };
  setView(Q.get('view') || 'front');
  $('view').value = Q.get('view') || 'front'; $('view').onchange = (e) => setView(e.target.value);
  $('spin').onchange = (e) => { controls.autoRotate = e.target.checked; };

  let frames = 0;
  renderer.setAnimationLoop(() => {
    controls.update(); renderer.render(scene, camera);
    if (++frames === 4) window.__ready = true;
  });
}

function bgTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#c9d3f3'); gr.addColorStop(0.55, '#dbe3fa'); gr.addColorStop(1, '#b9c8ec');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function nameSprite() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
  const g = c.getContext('2d');
  g.font = '700 84px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(20,30,60,0.85)'; g.fillText('Claude Opus 5.5', 512, 84);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(2.4, 0.375, 1); s.position.set(0, 1.95, 0); return s;
}

start().catch((e) => showErr(e.stack || e));
