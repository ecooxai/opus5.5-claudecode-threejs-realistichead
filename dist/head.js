// Procedural head: sculpted ellipsoid + painted skin, eyes, brows, lashes, neck/chest.
import { rng, sstep, g2, ribbons } from './util.js';

export const RX = 0.71, RY = 1.0, RZ = 0.9;
export const EYE = { x: 0.29, y: 0.035, r: 0.118, w: 0.13 };

const taperX = (dy) => 1 - 0.3 * sstep(-0.3, -0.98, dy) - 0.05 * sstep(0.3, 1, dy);
const taperZ = (dy) => 1 - 0.12 * sstep(-0.4, -1.0, dy);

// eyelid curves (t in -1..1, positive = outer corner)
const lidU = (t) => 0.068 * Math.pow(Math.max(0, 1 - t * t), 0.65) + 0.010 * t;
const lidL = (t) => -0.036 * Math.pow(Math.max(0, 1 - t * t), 0.85) + 0.008 * t;
// smile mouth line
export const mouthY = (x) => -0.575 + 0.95 * x * x;

function eyeTerms(x, y, noHole) {
  const s = Math.sign(x) || 1, u = (x - s * EYE.x) * s, v = y - EYE.y, t = u / EYE.w;
  let d = 0;
  const yu = lidU(t), yl = lidL(t), env = Math.exp(-Math.pow(Math.max(0, Math.abs(t) - 0.85) / 0.25, 2));
  d += 0.018 * Math.exp(-(((v - yu - 0.018) / 0.024) ** 2)) * env;          // upper lid fold
  d += 0.010 * Math.exp(-(((v - yu - 0.05) / 0.012) ** 2)) * env * 0.6;     // double-eyelid crease ridge
  d += 0.016 * Math.exp(-(((v - yl + 0.024) / 0.02) ** 2)) * env;          // aegyo-sal (smiling under-eye)
  if (!noHole && Math.abs(t) < 1) {
    const m = Math.min(v - yl, yu - v, (1 - Math.abs(t)) * EYE.w * 0.45);
    if (m > 0) d -= 0.2 * sstep(0, 0.01, m);
  }
  return d;
}

/** z-offset sculpt in front-projected (x,y). */
export function sculpt(x, y, noHole = false) {
  const ax = Math.abs(x);
  let d = 0;
  d -= 0.055 * g2(ax, y, EYE.x, EYE.y + 0.01, 0.15, 0.1);            // eye sockets
  d += 0.022 * g2(ax, y, 0.3, 0.21, 0.2, 0.05);                       // brow ridge
  d -= 0.02 * g2(ax, y, 0.5, 0.25, 0.12, 0.2);                        // temples
  d += 0.045 * g2(ax, y, 0.37, -0.22, 0.15, 0.13);                    // cheek apples (smile)
  d += 0.02 * g2(ax, y, 0.5, -0.05, 0.12, 0.15);                      // cheekbones
  // nose
  const bridge = sstep(0.12, -0.3, y) * (y > -0.33 ? 1 : Math.exp(-(((y + 0.33) / 0.03) ** 2)));
  d += (0.03 + 0.1 * bridge) * Math.exp(-((x / (0.05 + 0.03 * bridge)) ** 2)) * sstep(0.2, 0.05, y);
  d += 0.065 * g2(x, y, 0, -0.29, 0.06, 0.06);                         // tip
  d += 0.04 * g2(ax, y, 0.085, -0.325, 0.045, 0.035);                  // alae
  d -= 0.03 * g2(ax, y, 0.07, -0.37, 0.03, 0.015);                    // nostril shadows
  d -= 0.012 * g2(ax, y, 0.13, -0.33, 0.02, 0.05);                     // alar crease
  // mouth region
  const my = mouthY(x), mw = Math.exp(-Math.pow(ax / 0.21, 6));
  d += 0.035 * g2(x, y, 0, -0.43, 0.1, 0.12);                         // muzzle
  d -= 0.01 * g2(x, y, 0, -0.44, 0.022, 0.04);                        // philtrum groove
  d += 0.032 * Math.exp(-(((y - my - 0.035) / 0.022) ** 2)) * mw;      // upper lip
  d += 0.04 * Math.exp(-(((y - my + 0.07) / 0.03) ** 2)) * mw;         // lower lip
  d -= 0.03 * Math.exp(-(((y - my + 0.012) / 0.018) ** 2)) * mw;       // mouth opening
  d -= 0.018 * g2(ax, y, 0.22, -0.53, 0.025, 0.04);                    // mouth corner dimples
  d -= 0.015 * g2(x, y, 0, -0.72, 0.1, 0.03);                         // mentolabial sulcus
  d += 0.07 * g2(x, y, 0, -0.86, 0.13, 0.1);                         // chin
  d += 0.01 * g2(ax, y, 0.4, -0.6, 0.12, 0.15);                        // jaw fullness
  d += eyeTerms(x, y, noHole);
  return d;
}

/** surface point for front coordinates (used to place brows/lashes). */
export function faceZ(x, y, noHole = true) {
  const dy = y / RY, dx = x / (RX * taperX(dy));
  const dz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
  return dz * RZ * taperZ(dy) + sculpt(x, y, noHole) * sstep(0, 0.45, dz);
}

// ---------- skin texture (front planar projection) ----------
const U = (x) => (x + 0.85) / 1.7, V = (y) => (y + 1.25) / 2.5;
function skinTexture(THREE, S = 2048) {
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const P = (x, y) => [U(x) * S, (1 - V(y)) * S];
  const R = (r) => (r / 1.7) * S;
  c.fillStyle = '#f6dacb'; c.fillRect(0, 0, S, S);
  const rad = (x, y, r, col, a) => {
    const [px, py] = P(x, y), gr = c.createRadialGradient(px, py, 0, px, py, R(r));
    gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0));
    c.fillStyle = gr; c.fillRect(px - R(r), py - R(r), R(r) * 2, R(r) * 2);
  };
  // warm/cool variation
  rad(0, 0.55, 0.5, 'rgba(250,228,215,A)', 0.6);           // bright forehead
  for (const s of [-1, 1]) {
    rad(s * 0.38, -0.25, 0.22, 'rgba(240,130,140,A)', 0.3); // blush
    rad(s * 0.3, 0.12, 0.12, 'rgba(190,120,110,A)', 0.25);   // eyeshadow
    rad(s * 0.3, -0.02, 0.07, 'rgba(200,110,110,A)', 0.18);
  }
  rad(0, -0.27, 0.07, 'rgba(235,140,140,A)', 0.35);          // nose tip flush
  rad(0, -0.85, 0.12, 'rgba(240,160,150,A)', 0.2);
  // lips
  const lip = (s) => {
    c.beginPath();
    const pts = [];
    for (let i = 0; i <= 40; i++) { const x = -0.215 + 0.43 * i / 40; pts.push([x, mouthY(x) + 0.004 + 0.052 * Math.pow(1 - (x / 0.215) ** 2, 0.6) - 0.012 * Math.exp(-((x / 0.03) ** 2))]); }
    for (let i = 40; i >= 0; i--) { const x = -0.215 + 0.43 * i / 40; pts.push([x, mouthY(x) - 0.004 - 0.1 * Math.pow(1 - (x / 0.215) ** 2, 0.7)]); }
    pts.forEach((p, i) => { const [a, b] = P(p[0], p[1]); i ? c.lineTo(a, b) : c.moveTo(a, b); });
    c.closePath(); c.fillStyle = s; c.fill();
  };
  c.filter = 'blur(6px)'; lip('#d9707f'); c.filter = 'blur(1.5px)'; lip('#e07d8c');
  // lip gloss highlight
  c.filter = 'blur(4px)'; rad(0.03, -0.64, 0.05, 'rgba(255,215,220,A)', 0.5);
  // teeth band
  c.filter = 'blur(1px)';
  c.beginPath();
  for (let i = 0; i <= 30; i++) { const x = -0.17 + 0.34 * i / 30; const [a, b] = P(x, mouthY(x) + 0.004); i ? c.lineTo(a, b) : c.moveTo(a, b); }
  for (let i = 30; i >= 0; i--) { const x = -0.17 + 0.34 * i / 30; const [a, b] = P(x, mouthY(x) - 0.03 * Math.pow(1 - (x / 0.17) ** 2, 0.5)); c.lineTo(a, b); }
  c.closePath(); c.fillStyle = '#f6efe8'; c.fill();
  c.strokeStyle = 'rgba(150,110,100,0.45)'; c.lineWidth = 2;
  for (const tx of [-0.13, -0.085, -0.04, 0.04, 0.085, 0.13, 0]) { const [a, b] = P(tx, mouthY(tx) + 0.003); c.beginPath(); c.moveTo(a, b); c.lineTo(a, b + R(0.022)); c.stroke(); }
  for (const s of [-1, 1]) { c.filter = 'blur(4px)'; rad(s * 0.17, mouthY(0.17) - 0.01, 0.03, 'rgba(90,30,40,A)', 0.8); }
  // brows base tint
  c.filter = 'blur(5px)';
  for (const s of [-1, 1]) {
    c.beginPath();
    const b = [[0.1, 0.19], [0.22, 0.235], [0.34, 0.245], [0.47, 0.215]];
    b.forEach((p, i) => { const [a, q] = P(s * p[0], p[1] + 0.012); i ? c.lineTo(a, q) : c.moveTo(a, q); });
    [...b].reverse().forEach((p, i) => { const [a, q] = P(s * p[0], p[1] - 0.02 + i * 0.004); c.lineTo(a, q); });
    c.closePath(); c.fillStyle = 'rgba(110,70,55,0.55)'; c.fill();
    // eyeliner along upper lid
    c.filter = 'blur(2px)'; c.beginPath();
    for (let i = 0; i <= 30; i++) { const t = -1 + 2 * i / 30; const [a, q] = P(s * (EYE.x + t * EYE.w), EYE.y + lidU(t) + 0.004); i ? c.lineTo(a, q) : c.moveTo(a, q); }
    c.strokeStyle = 'rgba(40,20,20,0.85)'; c.lineWidth = R(0.012); c.stroke();
    c.filter = 'blur(5px)';
    for (let i = 0; i <= 20; i++) { const t = -1 + 2 * i / 20; const [a, q] = P(s * (EYE.x + t * EYE.w), EYE.y + lidU(t) + 0.05); i ? c.lineTo(a, q) : c.moveTo(a, q); }
    c.strokeStyle = 'rgba(150,90,85,0.35)'; c.lineWidth = R(0.006); c.stroke(); c.beginPath();
  }
  c.filter = 'none';
  // pores / freckle noise
  const img = c.getImageData(0, 0, S, S), d = img.data, r = rng(7);
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 7; d[i] += n; d[i + 1] += n * 0.9; d[i + 2] += n * 0.9; }
  for (let k = 0; k < 900; k++) { const x = (r() - 0.5) * 0.9, y = -0.4 + r() * 0.5; const [px, py] = P(x, y); const o = (Math.floor(py) * S + Math.floor(px)) * 4; for (const j of [0, 4, S * 4]) { d[o + j] -= 18; d[o + j + 1] -= 22; d[o + j + 2] -= 20; } }
  c.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

function irisTexture(THREE, S = 512) {
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d'), m = S / 2, r = rng(3);
  c.fillStyle = '#f4ece6'; c.fillRect(0, 0, S, S);
  const gs = c.createRadialGradient(m, m, S * 0.25, m, m, S * 0.5); gs.addColorStop(0, 'rgba(0,0,0,0)'); gs.addColorStop(1, 'rgba(210,150,150,0.6)');
  c.fillStyle = gs; c.fillRect(0, 0, S, S);
  c.strokeStyle = 'rgba(190,70,70,0.35)'; c.lineWidth = 1;
  for (let i = 0; i < 40; i++) { const a = r() * 6.28; let rr = S * 0.5; c.beginPath(); c.moveTo(m + Math.cos(a) * rr, m + Math.sin(a) * rr); for (let k = 0; k < 6; k++) { rr -= S * 0.03; const b = a + (r() - 0.5) * 0.3; c.lineTo(m + Math.cos(b) * rr, m + Math.sin(b) * rr); } c.stroke(); }
  const IR = S * 0.25;
  const gi = c.createRadialGradient(m, m, IR * 0.2, m, m, IR);
  gi.addColorStop(0, '#2a160d'); gi.addColorStop(0.45, '#5a3420'); gi.addColorStop(0.8, '#3d2215'); gi.addColorStop(0.93, '#1a0d08'); gi.addColorStop(1, 'rgba(20,10,6,0)');
  c.fillStyle = gi; c.beginPath(); c.arc(m, m, IR, 0, 7); c.fill();
  for (let i = 0; i < 260; i++) { const a = r() * 6.28, l = 0.35 + r() * 0.5; c.strokeStyle = `rgba(${150 + r() * 60},${90 + r() * 40},${50 + r() * 30},${0.15 + r() * 0.25})`; c.beginPath(); c.moveTo(m + Math.cos(a) * IR * 0.3, m + Math.sin(a) * IR * 0.3); c.lineTo(m + Math.cos(a + 0.05) * IR * l * 1.6, m + Math.sin(a + 0.05) * IR * l * 1.6); c.stroke(); }
  c.fillStyle = '#050302'; c.beginPath(); c.arc(m, m, IR * 0.36, 0, 7); c.fill();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

export function buildHead(THREE) {
  const group = new THREE.Group();
  // ---- head mesh ----
  const geo = new THREE.SphereGeometry(1, 360, 280);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const dx = p.getX(i), dy = p.getY(i), dz = p.getZ(i);
    const x = dx * RX * taperX(dy), y = dy * RY;
    let z = dz * RZ * taperZ(dy);
    if (dz > 0) z += sculpt(x, y) * sstep(0, 0.45, dz);
    p.setXYZ(i, x, y, z);
    uv.setXY(i, U(x), V(y));
  }
  geo.computeVertexNormals();
  const skin = new THREE.MeshPhysicalMaterial({
    map: skinTexture(THREE), roughness: 0.48, sheen: 0.35, sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0.9, 0.45, 0.4), clearcoat: 0.08, clearcoatRoughness: 0.5,
  });
  const head = new THREE.Mesh(geo, skin); head.castShadow = head.receiveShadow = true;
  group.add(head);

  // ---- eyes ----
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: irisTexture(THREE), roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 });
  const eg = new THREE.SphereGeometry(EYE.r, 64, 48), eu = eg.attributes.uv, ep = eg.attributes.position;
  for (let i = 0; i < ep.count; i++) { eu.setXY(i, 0.5 + 0.5 * ep.getX(i) / EYE.r, 0.5 + 0.5 * ep.getY(i) / EYE.r); }
  for (const s of [-1, 1]) {
    const zs = faceZ(s * EYE.x, EYE.y, true);
    const e = new THREE.Mesh(eg, eyeMat);
    e.position.set(s * EYE.x, EYE.y + 0.004, zs - EYE.r - 0.004);
    e.lookAt(0, -0.1, 9); // converge at camera
    e.receiveShadow = true;
    group.add(e);
  }

  // ---- brows + lashes (ribbon strands) ----
  const r = rng(11), strands = [];
  const lashCol = [0.04, 0.025, 0.02], browCol = [0.2, 0.11, 0.07];
  for (const s of [-1, 1]) {
    const B = [[0.1, 0.19], [0.22, 0.232], [0.34, 0.242], [0.47, 0.212]];
    for (let k = 0; k < 420; k++) {
      const t = r(), seg = Math.min(2, Math.floor(t * 3)), f = t * 3 - seg;
      const bx = B[seg][0] + (B[seg + 1][0] - B[seg][0]) * f, by = B[seg][1] + (B[seg + 1][1] - B[seg][1]) * f;
      const th = 0.032 * (1 - t) + 0.01;
      const x0 = bx + (r() - 0.5) * 0.01, y0 = by + (r() - 0.6) * th;
      const ang = t < 0.2 ? 1.2 - t * 3 : 0.25 - t * 0.35 + (r() - 0.5) * 0.3;
      const len = 0.03 + r() * 0.025;
      const pts = [];
      for (let j = 0; j < 4; j++) { const q = j / 3 * len; const x = x0 + Math.cos(ang) * q, y = y0 + Math.sin(ang) * q; pts.push([s * x, y, faceZ(s * x, y) + 0.003 + 0.004 * j / 3]); }
      strands.push({ pts, w0: 0.0035, w1: 0.001, col: browCol, nrm: () => [0, 0.2, 1] });
    }
    // upper lashes
    for (let k = 0; k < 90; k++) {
      const t = -0.95 + 1.9 * (k / 89) + (r() - 0.5) * 0.02;
      const x0 = EYE.x + t * EYE.w, y0 = EYE.y + lidU(t) + 0.002;
      const z0 = faceZ(s * x0, y0) - 0.004;
      const len = 0.04 + 0.035 * sstep(-0.6, 0.8, t) + r() * 0.01;
      const out = 0.4 * sstep(0, 1, t);
      const pts = [];
      for (let j = 0; j < 6; j++) { const q = j / 5; pts.push([s * (x0 + out * len * q), y0 + len * (0.15 * q + 0.75 * q * q), z0 + len * (0.9 * q - 0.35 * q * q)]); }
      strands.push({ pts, w0: 0.0045, w1: 0.0008, col: lashCol, nrm: () => [0, -0.6, 1] });
    }
    for (let k = 0; k < 40; k++) {
      const t = -0.8 + 1.7 * (k / 39);
      const x0 = EYE.x + t * EYE.w, y0 = EYE.y + lidL(t) - 0.002, z0 = faceZ(s * x0, y0) - 0.006, len = 0.018 + 0.012 * sstep(-0.3, 0.8, t);
      const pts = [];
      for (let j = 0; j < 4; j++) { const q = j / 3; pts.push([s * (x0 + 0.2 * len * q * t), y0 - len * q, z0 + len * 0.6 * q]); }
      strands.push({ pts, w0: 0.0025, w1: 0.0006, col: [0.12, 0.07, 0.06], nrm: () => [0, 0.5, 1] });
    }
  }
  const sg = ribbons(THREE, strands, () => [0, 0, 1]);
  const sm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(sg, sm));

  // ---- neck + upper chest ----
  group.add(buildBody(THREE, skin.clone()));
  return group;
}

function buildBody(THREE, mat) {
  const NY = 90, NA = 128, y0 = -0.55, y1 = -3.7;
  const pos = [], uvs = [], idx = [];
  for (let j = 0; j <= NY; j++) {
    const y = y0 + (y1 - y0) * j / NY;
    const sh = sstep(-1.75, -2.55, y);
    const a = 0.36 + (1.45 - 0.36) * Math.pow(sh, 0.8) - 0.05 * sstep(-0.9, -1.4, y) * (1 - sh);
    const b = 0.34 + (0.5 - 0.34) * sh;
    const cz = -0.12 + 0.05 * sh;
    for (let i = 0; i <= NA; i++) {
      const th = i / NA * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
      const e = 2 / (2 + 1.4 * sh);
      const x = a * Math.sign(sn) * Math.pow(Math.abs(sn), e), z = cz + b * Math.sign(cs) * Math.pow(Math.abs(cs), e);
      // trapezius slope: shoulders lower at the edges
      const yy = y - 0.18 * sh * Math.pow(Math.abs(x) / 1.45, 2) + 0.12 * sh * (1 - Math.min(1, Math.abs(x) / 0.6));
      pos.push(x, yy, z); uvs.push(0.5, 0.02);
    }
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + NA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx); g.computeVertexNormals();
  mat.map = null; mat.color = new THREE.Color('#f3d3c3');
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true;
  return m;
}
