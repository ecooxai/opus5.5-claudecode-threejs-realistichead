// Procedural strand hair: center part, swept back into a low bun, long face-framing locks.
import { rng, sstep, ribbons } from './util.js';

const HL = [[0, 0.64], [0.35, 0.6], [0.7, 0.5], [1.05, 0.12], [1.35, -0.15], [1.8, -0.35], [2.4, -0.62], [Math.PI, -0.72]];
export function hairlineY(x, z) {
  const a = Math.abs(Math.atan2(x, z));
  for (let i = 1; i < HL.length; i++) if (a <= HL[i][0]) { const f = (a - HL[i - 1][0]) / (HL[i][0] - HL[i - 1][0]); return HL[i - 1][1] + (HL[i][1] - HL[i - 1][1]) * f; }
  return -0.72;
}
const BUN = [0, -0.32, -0.92], BUNR = 0.3;

function hull(p, s) { // push point outside scaled head ellipsoid
  const a = 0.79 * s, b = 1.05 * s, c = 0.96 * s;
  const q = (p[0] / a) ** 2 + (p[1] / b) ** 2 + (p[2] / c) ** 2;
  if (q < 1 && p[1] > -1.0) { const k = 1 / Math.sqrt(q); p[0] *= k; p[1] *= k; p[2] *= k; }
  // neck / shoulders
  if (p[1] < -0.7) { const r = Math.hypot(p[0], p[2] + 0.12); if (r < 0.42) { p[0] *= 0.42 / r; p[2] = -0.12 + (p[2] + 0.12) * 0.42 / r; } }
}
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; v[0] /= l; v[1] /= l; v[2] /= l; return v; };

export function buildHair(THREE) {
  const r = rng(42), strands = [];
  const dark = [0.028, 0.011, 0.006], warm = [0.13, 0.052, 0.026];
  const colFor = () => { const t = Math.pow(r(), 1.6); return [dark[0] + (warm[0] - dark[0]) * t, dark[1] + (warm[1] - dark[1]) * t, dark[2] + (warm[2] - dark[2]) * t]; };
  const tipCol = (c) => [c[0] * 1.25, c[1] * 1.2, c[2] * 1.1];

  const sampleRoot = () => {
    for (;;) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const d = [s * Math.cos(th), u, s * Math.sin(th)];
      const p = [d[0] * 0.79, d[1] * 1.04, d[2] * 0.95];
      if (p[1] > hairlineY(p[0], p[2]) + 0.01) return p;
    }
  };

  // ---- swept-back strands into the bun ----
  for (let n = 0; n < 7000; n++) {
    const p = sampleRoot(), layer = 1.0 + r() * 0.07, sx = Math.sign(p[0]) || 1;
    const dir = norm([sx * (0.9 + r() * 0.3), -0.25, -0.35 - Math.max(0, -p[2]) * 0.5]);
    const pts = [[...p]];
    const twist = r() * 6.28;
    let k = 0;
    for (; k < 70; k++) {
      const to = norm([BUN[0] - p[0], BUN[1] - p[1], BUN[2] - p[2]]);
      const w = 0.06 + 0.25 * sstep(0, 40, k);
      for (let j = 0; j < 3; j++) dir[j] = dir[j] * (1 - w) + to[j] * w;
      dir[1] -= 0.02; norm(dir);
      for (let j = 0; j < 3; j++) p[j] += dir[j] * 0.035;
      hull(p, layer + 0.02 * sstep(0, 20, k));
      pts.push([...p]);
      if (Math.hypot(p[0] - BUN[0], p[1] - BUN[1], p[2] - BUN[2]) < BUNR) break;
    }
    // wrap around the bun
    const r0 = BUNR * (0.6 + r() * 0.5);
    for (let j = 0; j < 14; j++) {
      const a = twist + j * 0.45, ry = j * 0.004;
      pts.push([BUN[0] + Math.cos(a) * r0, BUN[1] + Math.sin(a) * r0 * 0.8 - ry, BUN[2] - 0.12 + Math.sin(a * 0.5) * 0.08 - 0.05 * Math.cos(a)]);
    }
    const c = colFor();
    strands.push({ pts, w0: 0.024, w1: 0.01, taper: 2, col: c, col1: tipCol(c) });
  }

  // ---- face-framing long locks (in front of ears, over cheeks) ----
  const lock = (side, count, len, fwd, spread) => {
    for (let n = 0; n < count; n++) {
      const a = (0.35 + r() * 0.55) * side, y = 0.55 - r() * 0.25;
      const p = [Math.sin(a) * 0.79 * 1.01, y, Math.cos(a) * 0.95 * 1.01];
      const dir = norm([side * 0.8, -0.6, 0.15]);
      const pts = [[...p]];
      const L = len * (0.7 + r() * 0.45), steps = Math.floor(L / 0.03), wob = r() * 6.28, wa = 0.004 + r() * 0.006;
      for (let k = 0; k < steps; k++) {
        dir[1] -= 0.09; dir[0] += side * 0.005 * spread; dir[2] += fwd * 0.01; norm(dir);
        for (let j = 0; j < 3; j++) p[j] += dir[j] * 0.03;
        p[0] += Math.sin(k * 0.25 + wob) * wa; p[2] += Math.cos(k * 0.2 + wob) * wa;
        hull(p, 1.02 + 0.03 * r());
        if (p[1] < 0.1 && Math.abs(p[0]) < 0.66) p[0] = side * 0.66; // keep off the face
        pts.push([...p]);
      }
      const c = colFor();
      strands.push({ pts, w0: 0.026, w1: 0.004, taper: 1.2, col: c, col1: tipCol(c) });
    }
  };
  lock(-1, 300, 1.55, 0.9, 0.6);
  lock(1, 360, 2.0, 0.7, 0.9);

  // ---- flyaway wisps ----
  for (let n = 0; n < 45; n++) {
    const p = sampleRoot(); for (let j = 0; j < 3; j++) p[j] *= 1.03;
    const sx = Math.sign(p[0]) || 1, dir = norm([sx * r(), r() - 0.2, r() - 0.6]);
    const pts = [[...p]];
    for (let k = 0; k < 12; k++) { dir[0] += (r() - 0.5) * 0.2; dir[1] += (r() - 0.6) * 0.2; norm(dir); for (let j = 0; j < 3; j++) p[j] += dir[j] * 0.025; hull(p, 1.06); pts.push([...p]); }
    strands.push({ pts, w0: 0.006, w1: 0.002, col: warm });
  }

  const geo = ribbons(THREE, strands, (p) => norm([p[0], p[1] * 0.8, p[2]]));
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.42, side: THREE.DoubleSide,
    sheen: 0.8, sheenRoughness: 0.35, sheenColor: new THREE.Color(0.75, 0.45, 0.3),
    anisotropy: 0.7, anisotropyRotation: Math.PI / 2,
  });
  const hair = new THREE.Mesh(geo, mat); hair.castShadow = hair.receiveShadow = true;

  // scalp cap so no skin shows between strands
  const cg = new THREE.SphereGeometry(1, 160, 120), cp = cg.attributes.position;
  for (let i = 0; i < cp.count; i++) cp.setXYZ(i, cp.getX(i) * 0.785, cp.getY(i) * 1.035, cp.getZ(i) * 0.945);
  const ix = cg.index.array, keep = [];
  for (let i = 0; i < ix.length; i += 3) {
    let ok = false;
    for (let j = 0; j < 3; j++) { const v = ix[i + j]; if (cp.getY(v) > hairlineY(cp.getX(v), cp.getZ(v)) + 0.02) ok = true; }
    if (ok) keep.push(ix[i], ix[i + 1], ix[i + 2]);
  }
  cg.setIndex(keep); cg.computeVertexNormals();
  const cap = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: '#1c0d07', roughness: 0.7 }));
  cap.receiveShadow = true;

  const g = new THREE.Group(); g.add(cap, hair);
  return g;
}
