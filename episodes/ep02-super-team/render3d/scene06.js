// 段 6 · 最难的是判断(审美)→ 各插各的旗 → 互相拉扯 → 妥协成一块灰米色 / 嗓门大的说了算,其他人变回了手
import * as THREE from 'three';
import { makeKnife } from './core.js';
import { board, terrain, pawn, clouds, hop, caption, toScreen, tail, ramp, smooth, clamp, ACC, INK, COLORS } from './board.js';
import { ptime, rng } from './overlay.js';

export const A = 64.12, B = 88.08;
const S = board();
const T = { judge: ptime(16, '判断'), aes: ptime(17, '审美'), diff: ptime(18, '都不一样'), value: ptime(19, '才值钱'), hard: ptime(19, '最难合'), comp: ptime(20, '互相妥协'), meh: ptime(20, '谁都不讨厌'), loud: ptime(21, '嗓门大'), hands: ptime(21, '又变回了手') };
const map = terrain(S, { seed: 61, clear: 2.0, cz: -.2 });
const fog = clouds(S, { r: 2.5, cz: -.1 });
const CREW = ['red', 'blue', 'green', 'yellow', 'purple'];
const plot = map.cells.filter(e => Math.hypot(e.x, e.z + .35) < .62);
const owner = plot.map((e, i) => i % CREW.length);
const R = rng(3); const jitter = plot.map(() => R());
const ppl = CREW.map((c, i) => { const a = i / CREW.length * Math.PI * 2 - Math.PI / 2 + .4; return { p: pawn(S, c), x: Math.cos(a) * 1.25, z: Math.sin(a) * 1.15 - .35, a }; });
ppl.forEach(o => { o.p.position.set(o.x, map.ground(o.x, o.z), o.z); o.p.rotation.y = Math.atan2(-o.x, -.35 - o.z) - Math.PI / 2; });
const meg = new THREE.Mesh(new THREE.ConeGeometry(.08, .2, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: .4, side: THREE.DoubleSide })); meg.rotation.z = -Math.PI / 2; S.scene.add(meg);
const kproto = makeKnife(S.env); kproto.scale.setScalar(.16);
const knives = ppl.slice(1).map(() => { const k = kproto.clone(); k.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; } }); S.scene.add(k); return k; });
const col = c => { const x = new THREE.Color(COLORS[c]); return [x.r, x.g, x.b]; };
const BEIGE = [.78, .74, .66];

export const proj = {};
export function update(t) {
  S.cam(.05 + Math.sin(t * .12) * .1, 5.9, 6.0, 0, 0, -.45);
  const plant = i => smooth(ramp(t, T.diff - .3 + i * .18, T.diff + .1 + i * .18));
  const tug = smooth(ramp(t, T.hard - .3, T.hard + .3)) * (1 - smooth(ramp(t, T.comp - .2, T.comp + .4)));
  const meh = smooth(ramp(t, T.comp, T.meh + .4)) * (1 - smooth(ramp(t, T.loud - .3, T.loud + .2)));
  const loud = smooth(ramp(t, T.loud - .2, T.loud + .5));
  map.apply(e => { const i = plot.indexOf(e); if (i < 0) return null;
    const lit = smooth(ramp(t, T.judge - .2, T.judge + .6));
    let c = [.95, .9, .78]; const o = owner[i]; const pk = plant(o);
    if (pk > 0) { const cc = col(CREW[o]); c = c.map((v, j) => v + (cc[j] * .9 + .1 - v) * pk); }
    if (tug > 0) { const o2 = (o + 1 + Math.floor((t * 4 + jitter[i] * 5) % 4)) % CREW.length; const c2 = col(CREW[o2]); const w = .5 + .5 * Math.sin(t * 9 + jitter[i] * 20); c = c.map((v, j) => v + (c2[j] - v) * w * tug * .7); }
    if (meh > 0) c = c.map((v, j) => v + (BEIGE[j] - v) * meh);
    if (loud > 0) { const cr = col('red'); c = c.map((v, j) => v + (cr[j] - v) * loud * .85); }
    return { b: 'sand', col: c, h: .1 + .03 * lit + tug * .04 * Math.sin(t * 7 + jitter[i] * 9) };
  });
  ppl.forEach((o, i) => {
    const nod = meh * Math.max(0, Math.sin((t - T.meh) * 6)) * .04;
    const boss = i === 0 ? loud : 0; const grey = i === 0 ? 0 : loud;
    o.p.scale.setScalar(1 + .9 * boss - .25 * grey); o.p.position.y = map.ground(o.x, o.z) + nod + hop(t, T.diff - .3 + i * .18, .15, .3);
    o.p.tint(0xa3a8b0, grey); o.p.fade(1 - .7 * smooth(ramp(t, T.hands - .2, T.hands + .5)) * (i === 0 ? 0 : 1));
    if (o.p.userData.flag) o.p.userData.flag.visible = true;
  });
  const boss = ppl[0].p; meg.visible = loud > .02; meg.scale.setScalar(loud * 1.6);
  meg.position.set(boss.position.x + .22 * loud, boss.position.y + .55 * (1 + .9 * loud), boss.position.z); meg.rotation.set(0, boss.rotation.y, -Math.PI / 2);
  knives.forEach((k, i) => { const kk = smooth(ramp(t, T.hands - .1 + i * .1, T.hands + .4 + i * .1)); const o = ppl[i + 1];
    k.visible = kk > .01; k.traverse(m => { if (m.material) m.material.opacity = kk; });
    const tx = boss.position.x - .25 - i * .16, tz = boss.position.z + .35; k.position.set(THREE.MathUtils.lerp(o.x, tx, kk), .32 + .05 * Math.sin(t * 2 + i), THREE.MathUtils.lerp(o.z, tz, kk)); k.rotation.set(0, .3, Math.PI / 2 - .2); });
  proj.plot = toScreen(S.camera, new THREE.Vector3(0, .15, -.35));
  fog.set(t);
  S.done(t);
}

export function overlay(ctx, t) {
  caption(ctx, '判断 = 审美', 540, 430, 72, smooth(ramp(t, T.aes - .1, T.aes + .4)) * (1 - ramp(t, T.diff - .3, T.diff)), { col: ACC });
  caption(ctx, '才值钱', 540, 430, 66, smooth(ramp(t, T.value - .1, T.value + .3)) * (1 - ramp(t, T.hard - .3, T.hard)), { col: '#3f7fd0' });
  caption(ctx, '最难合到一起', 540, 430, 66, smooth(ramp(t, T.hard, T.hard + .3)) * (1 - ramp(t, T.comp - .3, T.comp)), { col: ACC });
  tail(ctx, t, A, B, '判断');
}
