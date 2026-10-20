// Procedural ox as an implicit surface + Voronoi "joints" (the seams the knife follows).
import { rng } from './overlay.js';

const v = (x, y, z) => [x, y, z];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = a => Math.hypot(a[0], a[1], a[2]);
const cl = (x, a, b) => Math.max(a, Math.min(b, x));

function sdEll(p, c, r) {
  const q = [(p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]];
  const k0 = len(q); const k1 = len([q[0] / r[0], q[1] / r[1], q[2] / r[2]]);
  return k1 === 0 ? -Math.min(...r) : k0 * (k0 - 1) / k1;
}
function sdCap(p, a, b, r1, r2) {
  const pa = sub(p, a), ba = sub(b, a); const h = cl(dot(pa, ba) / dot(ba, ba), 0, 1);
  return len([pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h]) - (r1 + (r2 - r1) * h);
}
function smin(a, b, k) { const h = cl(.5 + .5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }

// parts of the ox (x: head direction +, y up, z sideways)
const PARTS = [];
const E = (c, r) => PARTS.push(p => sdEll(p, c, r));
const C = (a, b, r1, r2) => PARTS.push(p => sdCap(p, a, b, r1, r2));
E(v(0.05, 0.18, 0), v(1.45, 0.66, 0.56));      // barrel
E(v(0.85, 0.44, 0), v(0.62, 0.56, 0.5));      // shoulder / hump
E(v(-1.15, 0.30, 0), v(0.55, 0.56, 0.52));     // rump
E(v(0.55, -0.32, 0), v(0.7, 0.22, 0.3));       // dewlap/chest underside
C(v(1.25, 0.55, 0), v(1.9, 0.38, 0), 0.38, 0.27);  // neck
C(v(1.92, 0.5, 0), v(2.36, -0.14, 0), 0.31, 0.23); // head
E(v(1.5, -0.08, 0), v(0.36, 0.34, 0.2));      // dewlap
E(v(2.42, -0.24, 0), v(0.23, 0.2, 0.25));       // muzzle
// horns (curving out and up)
for (const s of [-1, 1]) {
  C(v(1.96, 0.7, 0.18 * s), v(2.08, 0.8, 0.5 * s), 0.12, 0.09);
  C(v(2.08, 0.8, 0.5 * s), v(2.3, 1.02, 0.6 * s), 0.09, 0.055);
  C(v(2.3, 1.02, 0.6 * s), v(2.48, 1.22, 0.5 * s), 0.055, 0.02);
  E(v(1.86, 0.5, 0.3 * s), v(0.12, 0.05, 0.14)); // ears
}
// legs
for (const s of [-1, 1]) {
  C(v(0.95, -0.15, 0.27 * s), v(1.05, -0.95, 0.28 * s), 0.2, 0.11);
  C(v(1.05, -0.95, 0.28 * s), v(1.0, -1.62, 0.28 * s), 0.1, 0.085);
  C(v(-1.2, 0.0, 0.27 * s), v(-1.4, -0.85, 0.29 * s), 0.24, 0.11);
  C(v(-1.4, -0.85, 0.29 * s), v(-1.25, -1.62, 0.29 * s), 0.1, 0.085);
}
C(v(-1.68, 0.62, 0), v(-1.86, -0.6, 0.05), 0.04, 0.025); // tail

export function sdf(p) {
  let d = 1e9; for (const f of PARTS) d = smin(d, f(p), 0.12); return d;
}
function grad(p) {
  const e = 0.003;
  const n = [sdf([p[0] + e, p[1], p[2]]) - sdf([p[0] - e, p[1], p[2]]),
             sdf([p[0], p[1] + e, p[2]]) - sdf([p[0], p[1] - e, p[2]]),
             sdf([p[0], p[1], p[2] + e]) - sdf([p[0], p[1], p[2] - e])];
  const l = len(n) || 1; return [n[0] / l, n[1] / l, n[2] / l];
}
const BB = { x: [-2.0, 2.8], y: [-1.75, 1.15], z: [-0.7, 0.7] };

export function buildOx(counts = { surf: 120000, vol: 50000, mem: 30000, line: 40000 }) {
  const R = rng(20260);
  const rp = () => [BB.x[0] + R() * (BB.x[1] - BB.x[0]), BB.y[0] + R() * (BB.y[1] - BB.y[0]), BB.z[0] + R() * (BB.z[1] - BB.z[0])];
  // Voronoi seeds: volume-distributed + a few forced ones on limbs/head
  const seeds = [];
  const forced = [v(2.3, 0.05, 0), v(1.6, 0.45, 0), v(1.0, -0.6, .28), v(1.0, -0.6, -.28), v(1.02, -1.35, .28), v(1.02, -1.35, -.28),
    v(-1.32, -0.55, .29), v(-1.32, -0.55, -.29), v(-1.3, -1.35, .29), v(-1.3, -1.35, -.29), v(1.96, 0.9, .45), v(1.96, 0.9, -.45), v(-1.8, -0.1, 0.03)];
  forced.forEach(s => seeds.push(s));
  while (seeds.length < 58) { const p = rp(); if (sdf(p) < -0.12) { if (seeds.every(s => len(sub(s, p)) > 0.36)) seeds.push(p); } }
  const NS = seeds.length;
  // distance to Voronoi bisector planes
  function vor(p) {
    let i1 = 0, d1 = 1e9, i2 = 0, d2 = 1e9, i3 = 0, d3 = 1e9;
    for (let i = 0; i < NS; i++) { const s = seeds[i]; const dx = p[0] - s[0], dy = p[1] - s[1], dz = p[2] - s[2]; const d = dx * dx + dy * dy + dz * dz;
      if (d < d1) { i3 = i2; d3 = d2; i2 = i1; d2 = d1; i1 = i; d1 = d; } else if (d < d2) { i3 = i2; d3 = d2; i2 = i; d2 = d; } else if (d < d3) { i3 = i; d3 = d; } }
    const b2 = (d2 - d1) / (2 * len(sub(seeds[i2], seeds[i1])));
    const b3 = (d3 - d1) / (2 * len(sub(seeds[i3], seeds[i1])));
    return { c: i1, b2, b3 };
  }
  const pos = [], nrm = [], info = [];
  const push = (p, n, kind) => {
    const o = vor(p);
    const seam = Math.exp(-o.b2 / 0.018), edge = Math.exp(-Math.max(o.b2, o.b3) / 0.022);
    pos.push(p[0], p[1], p[2]); nrm.push(n[0], n[1], n[2]);
    info.push(o.c, kind === 2 ? 1 : seam, kind === 3 ? 1 : edge, kind);
  };
  // surface points (projected onto the skin)
  let n = 0;
  while (n < counts.surf) { const p = rp(); const d = sdf(p); if (Math.abs(d) > 0.08) continue; const g = grad(p);
    const q = [p[0] - g[0] * d, p[1] - g[1] * d, p[2] - g[2] * d]; if (Math.abs(sdf(q)) > 0.01) continue;
    push(q, g, 0); n++; }
  n = 0; while (n < counts.vol) { const p = rp(); if (sdf(p) > -0.02) continue; push(p, grad(p), 1); n++; }
  // membranes and lines (joints) inside the body
  let m = 0, l = 0, guard = 0;
  while ((m < counts.mem || l < counts.line) && guard++ < 6e6) {
    const p = rp(); if (sdf(p) > 0.0) continue; const o = vor(p);
    if (l < counts.line && Math.max(o.b2, o.b3) < 0.012) { push(p, grad(p), 3); l++; }
    else if (m < counts.mem && o.b2 < 0.006) { push(p, grad(p), 2); m++; }
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), info: new Float32Array(info), seeds, NS };
}
