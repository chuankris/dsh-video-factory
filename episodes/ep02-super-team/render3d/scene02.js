// 段 2 · 三十个 AI 一起辩论 → 想法跟一个差不多 → 复制三十份,还是一个脑子
import * as THREE from 'three';
import { board, terrain, pawn, clouds, hop, caption, tail, ramp, smooth, clamp, ACC, INK } from './board.js';
import { ptime, rng } from './overlay.js';

export const A = 6.72, B = 17.56;
const S = board();
const T = { drop: ptime(2, '三十个'), argue: ptime(2, '辩论'), same: ptime(3, '跟一个'), copy: ptime(4, '复制三十份'), one: ptime(4, '还是一个脑子') };
const map = terrain(S, { seed: 21, clear: 2.2, cz: 0 });
const fog = clouds(S, { r: 2.6 });
const R = rng(5);
const COLS = 6, ROWS = 5, SP = .42;
const arrowMat = new THREE.MeshStandardMaterial({ color: 0xc2481e, roughness: .5, transparent: true });
const AIs = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const p = pawn(S, 'grey', { flag: false }); const x = (c - (COLS - 1) / 2) * SP, z = (r - (ROWS - 1) / 2) * SP * .95;
  const ar = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .16, 8), arrowMat); shaft.rotation.z = Math.PI / 2; ar.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(.035, .07, 10), arrowMat); head.rotation.z = -Math.PI / 2; head.position.x = .11; ar.add(head); S.scene.add(ar);
  AIs.push({ p, ar, x, z, d: (r * COLS + c) / (ROWS * COLS) * 1.4 + R() * .1, a0: R() * Math.PI * 2 });
}

export function update(t) {
  S.cam(0, 6.4 - .4 * smooth(ramp(t, T.one - .6, B)), 6.4 - .6 * smooth(ramp(t, T.one - .6, B)), 0, 0, -.25);
  const merge = smooth(ramp(t, T.one - .5, T.one + 1.0));
  const align = smooth(ramp(t, T.same - .2, T.same + .9));
  AIs.forEach((o, i) => {
    const t0 = T.drop - .3 + o.d; const k = smooth(ramp(t, t0, t0 + .25));
    const x = o.x * (1 - merge), z = o.z * (1 - merge);
    o.p.position.set(x, map.ground(x, z) + (1 - k) * 1.2 + hop(t, t0 + .25, .08, .2), z); o.p.fade(k * (i === 0 ? 1 : 1 - smooth(ramp(merge, .3, .7))));
    const show = smooth(ramp(t, T.argue - .1 + o.d * .2, T.argue + .3 + o.d * .2)) * (1 - merge);
    const wob = (1 - align) * Math.sin(t * 3 + o.a0 * 5) * .5;
    const ang = THREE.MathUtils.lerp(o.a0, -.4, align) + wob;
    o.ar.position.set(x, o.p.position.y + .56, z); o.ar.rotation.set(0, ang, 0); o.ar.visible = show > .01; arrowMat.opacity = 1;
    o.ar.scale.setScalar(show);
  });
  const one = AIs[0].p; one.scale.setScalar(1 + .6 * merge);
  fog.set(t);
  S.done(t);
}

export function overlay(ctx, t) {
  const n = Math.round(clamp(30 * ramp(t, T.drop - .3, T.drop + 1.5), 1, 30));
  const merge = smooth(ramp(t, T.one - .5, T.one + 1.0));
  const ca = ramp(t, T.drop - .2, T.drop + .2);
  if (ca > 0) {
    const shown = merge > .5 ? 1 : n;
    caption(ctx, String(shown), 90, 300, 130, ca, { col: ACC, align: 'left' });
    caption(ctx, '个 AI', 90 + (shown >= 10 ? 150 : 80), 318, 46, ca, { align: 'left', weight: 600 });
  }
  caption(ctx, '想法 ≈ 1 个', 540, 470, 64, smooth(ramp(t, T.same + .3, T.same + .8)) * (1 - ramp(t, T.one - .4, T.one)), { col: INK });
  caption(ctx, '还是一个脑子', 540, 470, 64, smooth(ramp(t, T.one + .4, T.one + .9)), { col: ACC });
  tail(ctx, t, A, B, '三十个 AI');
}
