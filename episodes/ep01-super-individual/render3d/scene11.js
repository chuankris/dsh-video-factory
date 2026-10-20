// Beat 11: 审美是练出来的 — 踩过的坑、见过的好东西、改过的无数遍;作品能学走,这些学不走
import * as THREE from 'three';
import { makeKnife } from './core.js';
import { stage, Morph, toScreen } from './kit.js';
import { drawChrome, drawSubtitle, ramp, clamp, smooth, ease, ptime, rng, rgba, GOLD, GOLD_HI, PAPER, SERIF, W } from './overlay.js';

export const A = 137.32, B = 149.24;
const S = stage({ bloom: .85, threshold: .55 });
const { scene, camera, env } = S;
const CZ = 10.5, CY = .3;

const T = {
  not: ptime(32, '不是凭空'), pit: ptime(33, '踩过的坑'), good: ptime(33, '见过的好东西'), redo: ptime(33, '改过的无数遍'), bit: ptime(33, '一点点'),
  copy: ptime(34, '学走你的作品'), cant: ptime(34, '学不走'),
};

// ---------- the knife that carries it all ----------
const knife = makeKnife(env); knife.scale.setScalar(1.15); knife.position.set(-.62, CY + .35, 0); knife.rotation.set(.12, -.18, .1); scene.add(knife);
const blade = knife.userData.blade.material; blade.emissive = new THREE.Color(0xffb060); blade.emissiveIntensity = 0;
// points on the blade face, in the knife's own frame
const top = x => x < 1.25 ? .15 : .15 - (x - 1.25) / .43 * .17, bot = x => x < .9 ? -.18 : -.18 + Math.pow((x - .9) / .78, 2) * .16;
function onBlade(n, seed, col, jit = .02) { const R = rng(seed); const pos = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { let x, y; do { x = R() * 1.68; y = -.18 + R() * .34; } while (y > top(x) || y < bot(x));
    pos.set([x, y, (R() < .5 ? -1 : 1) * (.022 + R() * jit)], i * 3); c.set(col.map(v => v * (.6 + .6 * R())), i * 3); } return { pos, col: c }; }
function cloud(n, seed, cx, cy, r, col) { const R = rng(seed); const pos = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = R() * 6.283, b = Math.acos(2 * R() - 1), rr = r * Math.cbrt(R()); pos.set([cx + rr * Math.sin(b) * Math.cos(a), cy + rr * Math.cos(b), rr * Math.sin(b) * Math.sin(a) * .6], i * 3); c.set(col, i * 3); } return { pos, col: c }; }
// 坑 (dark ember, from below), 好东西 (bright gold, from above), 无数遍 (pale, many thin passes from the right)
const PIT = [.9, .28, .12], GOODC = [1.2, .82, .4], REDO = [.85, .85, .9];
const groups = [
  [cloud(7000, 1, .2, -2.4, .7, PIT), onBlade(7000, 2, PIT), T.pit],
  [cloud(7000, 3, .9, 2.6, .7, GOODC), onBlade(7000, 4, GOODC), T.good],
  [cloud(9000, 5, 3.0, .1, .5, REDO), onBlade(9000, 6, REDO, .006), T.redo],
].map(([src, dst, t0], i) => { const m = new Morph([src, dst], { size: .0052, scatter: .6, seed: 20 + i, alpha: .32 }); knife.add(m.points); S.mats.push(m.mat); return { m, t0 }; });

// ---------- the copy: same shape, no history ----------
const copy = makeKnife(env); copy.scale.setScalar(1.15); copy.position.set(-.62, CY - 1.15, 0); copy.rotation.set(.12, -.18, .1); scene.add(copy);
const copyMats = []; copy.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshStandardMaterial({ color: 0x5a5650, roughness: .9, metalness: .1, envMap: env, envMapIntensity: .15, transparent: true, opacity: 0 }); copyMats.push(o.material); } });

export const proj = {};
export function update(t) {
  const c2 = smooth(ramp(t, T.copy - .4, T.copy + 1));
  camera.position.set(Math.sin(t * .31) * .04, CY + Math.sin(t * .23 + 1) * .03 - .45 * c2, CZ - .7 * smooth(ramp(t, A, T.redo + 1)) + .5 * c2);
  camera.lookAt(0, CY - .45 * c2, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  knife.rotation.y = -.18 + Math.sin(t * .35) * .12; knife.position.y = CY + .35 + Math.sin(t * .5) * .02;
  groups.forEach(({ m, t0 }, i) => { m.update(t, [[t0 - .3, t0 + 1.4, 0, 1]]); m.mat.uniforms.uShow.value = smooth(ramp(t, t0 - .4, t0 + .2)); });
  const fill = smooth(ramp(t, T.pit, T.bit + 1.2)); blade.emissiveIntensity = .05 + .17 * fill + .14 * smooth(ramp(t, T.cant - .2, T.cant + .6));
  copyMats.forEach(m => m.opacity = c2); copy.rotation.y = knife.rotation.y; copy.position.x = -.62 + (1 - c2) * .6;
  proj.k = toScreen(camera, new THREE.Vector3(.85, .25, 0).applyMatrix4(knife.matrixWorld));
  proj.c = toScreen(camera, new THREE.Vector3(.85, -.3, 0).applyMatrix4(copy.matrixWorld));
  S.finish(t, A, B, { aperture: .3, bloomK: .8 + .4 * fill });
}

function word(ctx, s, x, y, col, a, size = 50) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${size}px ${SERIF}`;
  ctx.shadowColor = rgba(col, .8); ctx.shadowBlur = 18; ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore(); }
export function overlay(ctx, t) {
  const out = 1 - ramp(t, T.copy - .5, T.copy);
  word(ctx, '踩过的坑', 300, 1300, '#e07a55', ramp(t, T.pit - .1, T.pit + .3) * (1 - ramp(t, T.pit + 1.6, T.pit + 2.2)) * out);
  word(ctx, '见过的好东西', 640, 400, GOLD_HI, ramp(t, T.good - .1, T.good + .3) * (1 - ramp(t, T.good + 1.6, T.good + 2.2)) * out);
  word(ctx, '改过的无数遍', 780, 1180, '#dcdce6', ramp(t, T.redo - .1, T.redo + .3) * (1 - ramp(t, T.redo + 1.7, T.redo + 2.3)) * out);
  if (proj.c) { const ca = ramp(t, T.copy, T.copy + .4);
    word(ctx, '作品 · 学得走', W / 2, 1400, PAPER, ca * .8, 40);
    word(ctx, '学不走', W / 2, 420, GOLD_HI, ramp(t, T.cant - .1, T.cant + .3), 64); }
  drawChrome(ctx, '练出来的', .9);
  drawSubtitle(ctx, t);
}
