// 段 4 · 老麻烦:林格尔曼拉绳子(八个人合力不到四倍)→ 三个和尚没水吃
import * as THREE from 'three';
import { board, terrain, pawn, clouds, hop, caption, seal, toScreen, tail, ramp, smooth, clamp, ACC, INK, TEAM } from './board.js';
import { ptime } from './overlay.js';

export const A = 32.64, B = 51.12;
const S = board();
const T = { old: ptime(9, '老麻烦'), ring: ptime(10, '林格尔曼'), one: ptime(11, '一个人拉'), eight: ptime(11, '八个人'), four: ptime(11, '不到'), monks: ptime(12, '三个和尚'), lazy: ptime(12, '越不使劲') };
const RIVER = .75;
const map = terrain(S, { seed: 41, clear: 2.4, cz: .2 });
map.apply(e => Math.abs(e.x - RIVER) < .2 && e.z > -2 && e.z < 1.6 ? { b: 'water' } : null);
map.base = map.cells.map(e => e.cur);
const fog = clouds(S, { r: 2.6, cx: .3 });
// raft and rope
const raft = new THREE.Mesh(new THREE.BoxGeometry(.5, .07, .38), new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: .8 })); raft.castShadow = true; S.scene.add(raft);
const cargo = new THREE.Mesh(new THREE.BoxGeometry(.22, .18, .22), new THREE.MeshStandardMaterial({ color: 0xb07a40, roughness: .8 })); cargo.castShadow = true; S.scene.add(cargo);
const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc8a060, roughness: .9 });
const rope = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1, 8), ropeMat); rope.rotation.z = Math.PI / 2; rope.castShadow = true; S.scene.add(rope);
const EFF = [1, .93, .85, .77, .70, .63, .56, .49]; // Ringelmann's per-person effort
const RZ = .05;
const pullers = TEAM.slice(0, 8).map((c, i) => ({ p: pawn(S, c, { flag: false }), x: .32 - i * .22, t0: i === 0 ? T.one - .3 : T.eight - .2 + (i - 1) * .22 }));
// the well and three monks
const W0 = new THREE.Vector3(1.6, 0, 1.15);
const well = new THREE.Mesh(new THREE.CylinderGeometry(.2, .22, .16, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: .9, side: THREE.DoubleSide })); well.castShadow = true; S.scene.add(well);
const bucket = new THREE.Mesh(new THREE.CylinderGeometry(.07, .055, .1, 14), new THREE.MeshStandardMaterial({ color: 0x7a5030, roughness: .8 })); bucket.castShadow = true; S.scene.add(bucket);
const monks = ['orange', 'yellow', 'lime'].map((c, i) => { const a = i / 3 * Math.PI * 2 + .5; return { p: pawn(S, c, { flag: false }), x: W0.x + Math.cos(a) * .42, z: W0.z + Math.sin(a) * .36 }; });

export const proj = {};
export function update(t) {
  const pan = smooth(ramp(t, T.monks - 1.0, T.monks + .4));
  S.cam(-.2 + 1.8 * pan, 5.6 - .8 * pan, 5.9 - .6 * pan + .4 * (1 - smooth(ramp(t, A, T.ring))), -.2 + 1.8 * pan, 0, -.1 + 1.25 * pan);
  const n = pullers.filter(o => t > o.t0).length;
  const prog = clamp((t - T.one) * .03 * Math.max(1, n * .49 * 1.6), 0, .6);
  const rx = RIVER + .05 - prog * .35;
  raft.position.set(rx, .06, RZ); cargo.position.set(rx, .16, RZ);
  const ropeShow = smooth(ramp(t, T.ring - .2, T.ring + .5));
  const x0 = pullers[0].x - Math.max(1, n) * .22 - .1; rope.position.set((rx - .25 + x0) / 2, .2, RZ); rope.scale.y = Math.max(.01, (rx - .25 - x0)) * ropeShow; rope.visible = ropeShow > .01;
  pullers.forEach((o, i) => { const k = smooth(ramp(t, o.t0, o.t0 + .3)); const lean = .35 * EFF[Math.max(0, n - 1)] * k;
    o.p.position.set(o.x - (1 - k) * .4, map.ground(o.x, RZ + .14) + hop(t, o.t0, .15, .3), RZ + .14); o.p.rotation.set(0, 0, lean); o.p.fade(k);
    proj['p' + i] = toScreen(S.camera, o.p.position.clone().setY(o.p.position.y + .62)); });
  well.position.set(W0.x, map.ground(W0.x, W0.z) + .08, W0.z); bucket.position.set(W0.x + .02, well.position.y + .14, W0.z);
  monks.forEach((o, i) => { const k = smooth(ramp(t, T.monks - .3 + i * .15, T.monks + .1 + i * .15)); o.p.position.set(o.x, map.ground(o.x, o.z) + hop(t, T.monks - .3 + i * .15, .2, .3), o.z); o.p.fade(k);
    o.p.rotation.y = t * .3 + i; });
  proj.bucket = toScreen(S.camera, bucket.position.clone().setY(bucket.position.y + .25));
  proj.n = n;
  fog.set(t, { r: 2.4 - .5 * smooth(ramp(t, T.old - .3, T.old + .6)) * (1 - ropeShow) + .2 * pan, cx: .3 + 1.2 * pan, cz: 1.0 * pan });
  S.done(t);
}

export function overlay(ctx, t) {
  caption(ctx, '老麻烦', 540, 450, 80, smooth(ramp(t, T.old - .1, T.old + .4)) * (1 - ramp(t, T.ring - .4, T.ring)), { col: INK });
  seal(ctx, '林格尔曼', 940, 300, 110, smooth(ramp(t, T.ring, T.ring + .3)) * (1 - ramp(t, T.monks - 1.2, T.monks - .8)));
  caption(ctx, '1913', 940, 390, 34, smooth(ramp(t, T.ring + .2, T.ring + .5)) * (1 - ramp(t, T.monks - 1.2, T.monks - .8)), { weight: 600 });
  // effort bars over each puller
  const out = 1 - ramp(t, T.monks - 1.2, T.monks - .8); const n = proj.n || 0;
  if (out > 0) for (let i = 0; i < n; i++) { const p = proj['p' + i]; if (!p) continue; const e = EFF[n - 1];
    ctx.save(); ctx.globalAlpha = out; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(p[0] - 12, p[1] - 100, 24, 100); ctx.fillStyle = ACC; ctx.fillRect(p[0] - 12, p[1] - 100 * e, 24, 100 * e); ctx.restore(); }
  if (n >= 2 && out > 0) { const tot = EFF[n - 1] * n;
    caption(ctx, `${n} 人 · 合力 ×${tot.toFixed(1)}`, 540, 470, 60, out * smooth(ramp(t, T.eight, T.eight + .3)), { col: ACC });
    caption(ctx, '不到 4 倍', 540, 545, 44, out * smooth(ramp(t, T.four, T.four + .4)), { col: INK, weight: 600 }); }
  if (proj.bucket) caption(ctx, '0', proj.bucket[0], proj.bucket[1] - 50, 90, smooth(ramp(t, T.monks + .4, T.monks + .8)), { col: ACC });
  tail(ctx, t, A, B, t < T.monks - .8 ? '林格尔曼 · 拉绳实验' : '三个和尚');
}
