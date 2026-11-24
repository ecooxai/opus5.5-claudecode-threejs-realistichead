// Procedural accessories + upper outfit for the bust.
// buildAccessories(THREE) -> THREE.Group containing:
//   - pearl cat-ear headband
//   - thin silver necklace with crystal + pearl pendant
//   - white sailor blouse (puffy shoulders) with teal striped sailor collar + scarf knot
// THREE is the 'three/webgpu' namespace passed in by the caller (no imports here).

export function buildAccessories(THREE) {
  const root = new THREE.Group();
  root.name = 'accessories';

  // ---------- small helpers ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const addMesh = (parent, geo, mat, name) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    if (name) m.name = name;
    parent.add(m);
    return m;
  };

  // ---------- procedural fabric weave normal map ----------
  function makeWeaveNormalMap() {
    const S = 256, P = 8; // texture size, thread period (px)
    const h = new Float32Array(S * S);
    let seed = 1234567;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const cx = Math.floor(x / P), cy = Math.floor(y / P);
        const fx = (x % P + 0.5) / P, fy = (y % P + 0.5) / P;
        // plain weave: alternate warp / weft on top
        const v = ((cx + cy) & 1) ? Math.sin(Math.PI * fy) : Math.sin(Math.PI * fx);
        h[y * S + x] = 0.75 * v + 0.12 * rnd();
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(S, S);
    const H = (x, y) => h[((y + S) % S) * S + ((x + S) % S)];
    const k = 2.0;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let nx = -(H(x + 1, y) - H(x - 1, y)) * k;
        let ny = (H(x, y + 1) - H(x, y - 1)) * k;
        let nz = 1;
        const l = Math.hypot(nx, ny, nz);
        nx /= l; ny /= l; nz /= l;
        const i = (y * S + x) * 4;
        img.data[i] = (nx * 0.5 + 0.5) * 255;
        img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
        img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }
  const weave = makeWeaveNormalMap();

  // ---------- materials ----------
  const wireMat = new THREE.MeshStandardMaterial({ color: '#d8d2c4', metalness: 1, roughness: 0.25 });
  const silverMat = new THREE.MeshStandardMaterial({ color: '#e6e6ea', metalness: 1, roughness: 0.18 });
  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: '#f3eadb', metalness: 0, roughness: 0.22,
    clearcoat: 1, clearcoatRoughness: 0.06,
    sheen: 0.6, sheenColor: new THREE.Color('#ffe9f2'), sheenRoughness: 0.4,
    iridescence: 0.35, iridescenceIOR: 1.4,
  });
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0, roughness: 0.02, ior: 2.4,
    clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1,
    iridescence: 0.5, iridescenceIOR: 1.6, flatShading: true,
    emissive: '#1a1a22',
  });
  const fabricMat = new THREE.MeshPhysicalMaterial({
    color: '#f5f5f1', roughness: 0.8, metalness: 0,
    sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.55,
    normalMap: weave, normalScale: new THREE.Vector2(0.35, 0.35),
    side: THREE.DoubleSide,
  });
  const collarMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', vertexColors: true, roughness: 0.75, metalness: 0,
    sheen: 0.7, sheenColor: new THREE.Color('#d8f6ff'), sheenRoughness: 0.5,
    normalMap: weave, normalScale: new THREE.Vector2(0.3, 0.3),
    side: THREE.DoubleSide,
  });
  const scarfMat = new THREE.MeshPhysicalMaterial({
    color: '#1499b8', roughness: 0.65, metalness: 0,
    sheen: 0.8, sheenColor: new THREE.Color('#bff3ff'), sheenRoughness: 0.45,
    normalMap: weave, normalScale: new THREE.Vector2(0.3, 0.3),
  });

  const pearlGeo = new THREE.SphereGeometry(1, 24, 16);
  const addPearl = (parent, pos, r) => {
    const m = addMesh(parent, pearlGeo, pearlMat, 'pearl');
    m.position.copy(pos);
    m.scale.setScalar(r);
    return m;
  };

  // =====================================================================
  // 1. Pearl cat-ear headband
  // =====================================================================
  const headband = new THREE.Group();
  headband.name = 'headband';
  root.add(headband);
  {
    // Band: elliptical arc over the hair, top slightly further back.
    const BA = 0.96, BB = 1.02, BC = 0.12; // x semi-axis, y semi-axis, y center
    const bandPt = (t) => V3(BA * Math.sin(t), BC + BB * Math.cos(t), 0.06 - 0.1 * Math.cos(t));
    const T = Math.acos((0.2 - BC) / BB); // ends at y = 0.2
    const bandPts = [];
    for (let i = 0; i <= 64; i++) bandPts.push(bandPt(lerp(-T, T, i / 64)));
    const bandCurve = new THREE.CatmullRomCurve3(bandPts);
    addMesh(headband, new THREE.TubeGeometry(bandCurve, 200, 0.012, 8, false), wireMat, 'band');
    // rounded end caps
    const capGeo = new THREE.SphereGeometry(0.016, 12, 8);
    addMesh(headband, capGeo, wireMat).position.copy(bandPt(-T));
    addMesh(headband, capGeo, wireMat).position.copy(bandPt(T));

    // Cat ears: open wire triangles rising from the band, leaning outward.
    for (const side of [-1, 1]) {
      const cx = 0.5 * side, half = 0.17;
      const tA = Math.asin((cx - half) / BA);
      const tB = Math.asin((cx + half) / BA);
      const b1 = bandPt(tA), b2 = bandPt(tB);
      const mid = b1.clone().add(b2).multiplyScalar(0.5);
      const apex = V3(mid.x + 0.09 * side, mid.y + 0.55, mid.z - 0.06);
      const along = (p, f) => p.clone().lerp(apex, f);
      const apexRound = apex.clone().add(V3(0, -0.012, 0));
      const earCurve = new THREE.CatmullRomCurve3([
        b1, along(b1, 0.33), along(b1, 0.66), along(b1, 0.93),
        apexRound,
        along(b2, 0.93), along(b2, 0.66), along(b2, 0.33), b2,
      ], false, 'centripetal');
      addMesh(headband, new THREE.TubeGeometry(earCurve, 120, 0.009, 8, false), wireMat, 'catEar');

      // ~10 pearls strung along the outline
      const N = 10;
      for (let i = 0; i < N; i++) {
        const u = lerp(0.07, 0.93, i / (N - 1));
        const p = earCurve.getPointAt(u);
        addPearl(headband, p.add(V3(0, 0, 0.004)), 0.031);
      }
    }
  }

  // =====================================================================
  // 2. Necklace: thin chain, crystal on right branch, pearl pendant
  // =====================================================================
  const necklace = new THREE.Group();
  necklace.name = 'necklace';
  root.add(necklace);
  {
    const bottom = V3(0.05, -2.75, 0.55);
    const chainCurve = new THREE.CatmullRomCurve3([
      V3(-0.335, -1.95, 0.065),
      V3(-0.25, -2.3, 0.37),
      V3(-0.1, -2.6, 0.5),
      bottom,
      V3(0.17, -2.58, 0.5),
      V3(0.27, -2.3, 0.37),
      V3(0.335, -1.95, 0.065),
      // around the back of the neck (mostly hidden by hair)
      V3(0.375, -1.85, -0.2),
      V3(0.2, -1.8, -0.46),
      V3(-0.2, -1.8, -0.46),
      V3(-0.375, -1.85, -0.2),
    ], true, 'centripetal');
    addMesh(necklace, new THREE.TubeGeometry(chainCurve, 600, 0.0048, 6, true), silverMat, 'chain');

    // crystal on the right branch near y = -2.5
    let best = null, bestD = Infinity;
    for (let i = 0; i <= 400; i++) {
      const p = chainCurve.getPointAt(i / 400);
      if (p.x <= 0.02 || p.z < 0.2) continue;
      const d = Math.abs(p.y + 2.5);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best) {
      const crystal = addMesh(necklace, new THREE.OctahedronGeometry(0.024, 0), crystalMat, 'crystal');
      crystal.position.copy(best).add(V3(0, 0, 0.014));
      crystal.scale.set(1, 1.25, 0.7);
      crystal.rotation.z = 0.35;
      const setting = addMesh(necklace, new THREE.TorusGeometry(0.02, 0.004, 6, 20), silverMat);
      setting.position.copy(crystal.position).add(V3(0, 0, -0.004));
    }

    // pendant: short drop + bail + pearl
    const pearlC = bottom.clone().add(V3(0, -0.115, 0.012));
    const bailC = bottom.clone().add(V3(0, -0.04, 0.008));
    const drop = new THREE.LineCurve3(bottom, bailC);
    addMesh(necklace, new THREE.TubeGeometry(drop, 4, 0.004, 6, false), silverMat);
    const bail = addMesh(necklace, new THREE.TorusGeometry(0.011, 0.0035, 6, 16), silverMat, 'bail');
    bail.position.copy(bailC);
    bail.rotation.y = Math.PI / 2;
    const cap = addMesh(necklace, new THREE.SphereGeometry(0.016, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), silverMat);
    cap.position.copy(pearlC).add(V3(0, 0.062, 0));
    addPearl(necklace, pearlC, 0.07);
  }

  // =====================================================================
  // 3. Sailor blouse + collar + scarf knot
  // =====================================================================
  const outfit = new THREE.Group();
  outfit.name = 'outfit';
  root.add(outfit);
  {
    const AX = 2.0, BZ = 0.70, RN = 0.40; // torso ellipse semi-axes, neckline radius
    const ellR = (th) => 1 / Math.hypot(Math.sin(th) / AX, Math.cos(th) / BZ);
    const centerZ = (y) => lerp(-0.1, -0.18, smooth(-1.9, -2.4, y));

    // Profile curve (r, y) for direction th (th = 0 faces +z): neck -> shoulder slope -> torso side
    function makeProfile(th) {
      const r = ellR(th);
      const front = Math.max(0, Math.cos(th)) ** 2; // flatten upper chest in front
      const pts = [
        [RN, -1.90],
        [RN + 0.3 * (r - RN), -1.96],
        [RN + 0.62 * (r - RN) - 0.08 * front, -2.05],
        [r - 0.06 - 0.12 * front, -2.2],
        [r, -2.45],
        [r, -3.1],
        [r * 0.97, -3.62],
      ];
      const c = new THREE.CatmullRomCurve3(pts.map((p) => V3(p[0], p[1], 0)));
      c.arcLengthDivisions = 300;
      return c;
    }

    // Surface point for direction th at profile param u, offset along profile normal
    const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3();
    function surf(th, curve, u, off) {
      u = clamp(u, 0, 1);
      curve.getPointAt(u, tmpP);
      curve.getTangentAt(u, tmpT);
      const nl = Math.hypot(tmpT.x, tmpT.y) || 1;
      const r = tmpP.x + (-tmpT.y / nl) * off;
      const y = tmpP.y + (tmpT.x / nl) * off;
      return V3(Math.sin(th) * r, y, centerZ(y) + Math.cos(th) * r);
    }

    // V neckline: y of the neckline edge as a function of |x|, blended in at the front only
    const yV = (x, z) => {
      const v = -3.0 + 1.1 * Math.pow(Math.min(1, Math.abs(x) / 0.5), 1.3);
      return lerp(-1.9, v, smooth(-0.1, 0.15, z));
    };
    // Collar outer edge (front lapel line / back flap bottom) and shoulder limit
    const yOuter = (x, z) => lerp(-3.05, -3.12 + 0.75 * Math.abs(x), smooth(-0.15, 0.2, z));
    const XLIM = 1.25;

    const NU = 160, NV = 70, STEPS = 260;
    const cols = [];
    for (let j = 0; j <= NU; j++) {
      const th = -Math.PI + (2 * Math.PI * j) / NU;
      const curve = makeProfile(th);
      const L = curve.getLength();
      // neckline start s0: first u below the V line
      let s0 = 0, k = 0;
      for (; k <= STEPS; k++) {
        const u = k / STEPS;
        const p = surf(th, curve, u, 0);
        if (p.y - yV(p.x, p.z) <= 1e-4) { s0 = u; break; }
      }
      if (k > STEPS) s0 = 1;
      // collar outer edge s1
      let s1 = s0;
      for (let m = Math.ceil(s0 * STEPS); m <= STEPS; m++) {
        const u = Math.max(s0, m / STEPS);
        const p = surf(th, curve, u, 0);
        if (Math.abs(p.x) > XLIM || p.y < yOuter(p.x, p.z)) break;
        s1 = u;
      }
      cols.push({ th, curve, L, s0, s1 });
    }

    // ---- blouse body ----
    {
      const pos = [], uv = [], idx = [];
      for (let i = 0; i <= NV; i++) {
        for (let j = 0; j <= NU; j++) {
          const c = cols[j];
          const u = lerp(c.s0, 1, i / NV);
          const base = surf(c.th, c.curve, u, 0);
          // subtle fabric folds, stronger lower down
          const fold = 0.006 * Math.sin(c.th * 14 + base.y * 5) + 0.008 * smooth(-2.6, -3.5, base.y) * Math.sin(c.th * 23 + 1.3);
          const p = surf(c.th, c.curve, u, 0.012 + fold);
          pos.push(p.x, p.y, p.z);
          uv.push((j / NU) * 48, u * c.L * 14);
        }
      }
      const W = NU + 1;
      for (let i = 0; i < NV; i++) {
        for (let j = 0; j < NU; j++) {
          const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      addMesh(outfit, g, fabricMat, 'blouse');
    }

    // ---- puffy short sleeves (gathered ellipsoids over the shoulders) ----
    for (const side of [-1, 1]) {
      const g = new THREE.SphereGeometry(1, 64, 40);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const a = Math.atan2(z, x);
        const gather = 1 + 0.045 * Math.sin(a * 18) * (0.3 + 0.7 * y * y) + 0.02 * Math.sin(a * 7 + y * 3);
        p.setXYZ(i, x * gather, y, z * gather);
      }
      const uvA = g.attributes.uv;
      for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * 22, uvA.getY(i) * 12);
      g.computeVertexNormals();
      const m = addMesh(outfit, g, fabricMat, 'sleeve');
      m.position.set(1.8 * side, -2.6, -0.17);
      m.scale.set(0.46, 0.62, 0.62);
      m.rotation.z = -0.28 * side;
    }

    // ---- sailor collar (strip on top of blouse, with two white stripes near the edge) ----
    {
      const teal = new THREE.Color('#1aa6c4');
      const tealDeep = new THREE.Color('#0e8aa8');
      const white = new THREE.Color('#f7f7f4');
      // distances from the outer edge; duplicated rows give crisp stripe borders
      const D = [0, 0.04, 0.0415, 0.062, 0.0635, 0.09, 0.0915, 0.112, 0.1135];
      const STRIPE = [false, false, true, true, false, false, true, true, false];
      const NIN = 12; // extra rows from last stripe to neckline
      const rows = D.length + NIN;
      const pos = [], uv = [], col = [], idx = [];
      const cc = new THREE.Color();
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j <= NU; j++) {
          const c = cols[j];
          const Wd = Math.max(0, (c.s1 - c.s0) * c.L);
          let d, stripe = false;
          if (i < D.length) { d = D[i]; stripe = STRIPE[i]; }
          else d = lerp(D[D.length - 1], Wd, (i - D.length + 1) / NIN);
          d = Math.min(d, Wd);
          const u = c.L > 0 ? c.s1 - d / c.L : c.s1;
          const f = Wd > 0 ? d / Wd : 0; // 0 outer edge -> 1 neckline
          const p = surf(c.th, c.curve, u, 0.032 + 0.018 * f * f);
          pos.push(p.x, p.y, p.z);
          uv.push((j / NU) * 48, u * c.L * 14);
          if (stripe && Wd > d + 0.02) cc.copy(white);
          else cc.copy(tealDeep).lerp(teal, clamp(f * 1.4, 0, 1));
          col.push(cc.r, cc.g, cc.b);
        }
      }
      const W = NU + 1;
      for (let i = 0; i < rows - 1; i++) {
        for (let j = 0; j < NU; j++) {
          const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
          idx.push(a, b, c, b, d, c);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      addMesh(outfit, g, collarMat, 'sailorCollar');
    }

    // ---- scarf knot at the bottom of the V + two short tails ----
    {
      const knotY = -3.1;
      const frontZ = centerZ(knotY) + BZ;
      const knot = addMesh(outfit, new THREE.SphereGeometry(1, 32, 20), scarfMat, 'scarfKnot');
      knot.position.set(0, knotY, frontZ + 0.05);
      knot.scale.set(0.13, 0.095, 0.06);
      // wrap band around the knot for a tied look
      const band = addMesh(outfit, new THREE.TorusGeometry(0.075, 0.03, 10, 28), scarfMat);
      band.position.copy(knot.position).add(V3(0, 0, 0.012));
      band.scale.set(1.15, 0.75, 0.5);
      for (const side of [-1, 1]) {
        const g = new THREE.CylinderGeometry(0.055, 0.085, 0.42, 16, 6);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          // slight ripple along the tail
          const y = p.getY(i);
          p.setX(i, p.getX(i) * (1 + 0.08 * Math.sin(y * 18)));
        }
        g.computeVertexNormals();
        const tail = addMesh(outfit, g, scarfMat, 'scarfTail');
        tail.position.set(0.075 * side, knotY - 0.24, frontZ + 0.035);
        tail.scale.set(1, 1, 0.28);
        tail.rotation.z = 0.2 * side;
        tail.rotation.x = -0.08;
      }
    }
  }

  return root;
}
