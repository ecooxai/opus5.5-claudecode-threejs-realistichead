// Shared helpers: seeded RNG, smooth math, ribbon (strand) geometry builder.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const g2 = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));

/**
 * Build one merged BufferGeometry of flat tapered ribbons.
 * strands: [{ pts:[[x,y,z]...], w0, w1, col:[r,g,b], col1?:[r,g,b], nrm?:(p)=>[x,y,z] }]
 */
export function ribbons(THREE, strands, defaultNormal) {
  let nv = 0, ni = 0;
  for (const s of strands) { nv += s.pts.length * 2; ni += (s.pts.length - 1) * 6; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = new Uint32Array(ni);
  let v = 0, i = 0;
  const t = [0, 0, 0], n = [0, 0, 0], sd = [0, 0, 0];
  for (const s of strands) {
    const P = s.pts, L = P.length, base = v;
    for (let k = 0; k < L; k++) {
      const a = P[Math.max(0, k - 1)], b = P[Math.min(L - 1, k + 1)];
      t[0] = b[0] - a[0]; t[1] = b[1] - a[1]; t[2] = b[2] - a[2];
      const nn = (s.nrm || defaultNormal)(P[k]);
      // side = t x n
      sd[0] = t[1] * nn[2] - t[2] * nn[1]; sd[1] = t[2] * nn[0] - t[0] * nn[2]; sd[2] = t[0] * nn[1] - t[1] * nn[0];
      const sl = Math.hypot(sd[0], sd[1], sd[2]) || 1;
      const f = k / (L - 1);
      const w = (s.w0 + (s.w1 - s.w0) * Math.pow(f, s.taper || 1.5)) * 0.5 / sl;
      // re-orthogonalised normal = side x t
      n[0] = sd[1] * t[2] - sd[2] * t[1]; n[1] = sd[2] * t[0] - sd[0] * t[2]; n[2] = sd[0] * t[1] - sd[1] * t[0];
      const nl = Math.hypot(n[0], n[1], n[2]) || 1;
      const c0 = s.col, c1 = s.col1 || s.col;
      for (let e = -1; e <= 1; e += 2) {
        pos[v * 3] = P[k][0] + sd[0] * w * e; pos[v * 3 + 1] = P[k][1] + sd[1] * w * e; pos[v * 3 + 2] = P[k][2] + sd[2] * w * e;
        nor[v * 3] = n[0] / nl; nor[v * 3 + 1] = n[1] / nl; nor[v * 3 + 2] = n[2] / nl;
        col[v * 3] = c0[0] + (c1[0] - c0[0]) * f; col[v * 3 + 1] = c0[1] + (c1[1] - c0[1]) * f; col[v * 3 + 2] = c0[2] + (c1[2] - c0[2]) * f;
        uv[v * 2] = e < 0 ? 0 : 1; uv[v * 2 + 1] = f;
        v++;
      }
      if (k < L - 1) {
        const q = base + k * 2;
        idx[i++] = q; idx[i++] = q + 1; idx[i++] = q + 2; idx[i++] = q + 1; idx[i++] = q + 3; idx[i++] = q + 2;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}
