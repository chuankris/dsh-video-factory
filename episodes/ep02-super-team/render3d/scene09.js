// 段 9 · 一开始以为团队散了 → 其实是说了实话 → 路还没找到,硬绑在一起,只会一起走错
import * as THREE from 'three';
import { board, pawn, caption, tail, ramp, smooth, clamp, ACC, INK } from './board.js';
import { setup, CREW } from './team.js';
import { ptime } from './overlay.js';

export const A = 114.52, B = 125.44;
const S = board();
const T = { broke: ptime(30, '团队散了'), truth: ptime(31, '说了实话'), road: ptime(32, '路还没找到'), tied: ptime(32, '硬绑在一起'), wrong: ptime(32, '一起走错') };
const { map, fog, crew, curves, trails, fire } = setup(S);
// a lake the tied-up team walks into
const LAKE = { x: .9, z: 1.25, r: .55 };
map.base = null;
const ghosts = CREW.map(c => pawn(S, c, { flag: false }));
const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc8a060, roughness: .9, transparent: true });
const rope = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 1, 6), ropeMat); rope.rotation.z = Math.PI / 2; S.scene.add(rope);

export function update(t) {
  const truth = smooth(ramp(t, T.truth - .2, T.truth + 1.0));
  const ghost = smooth(ramp(t, T.tied - .4, T.tied)) * (1 - smooth(ramp(t, T.wrong + 1.0, T.wrong + 1.5)));
  S.cam(0, 7.4 - .6 * ghost, 7.3 - .6 * ghost, .3 * ghost, 0, -.2 + .6 * ghost);
  map.apply(e => { if (Math.hypot(e.x - LAKE.x, e.z - LAKE.z) < LAKE.r) return { b: 'water' };
    for (let j = 0; j < trails.length; j++) { const k = trails[j].indexOf(e); if (k >= 0 && k / trails[j].length < .8 + .2 * smooth(ramp(t, T.road, T.road + 1.5))) return { b: 'road', col: [.98, .6, .22] }; } return null; });
  // the real team: out on their own trails, far away
  crew.forEach((p, i) => { const u = .78 + .15 * smooth(ramp(t, T.road, T.road + 1.5)); const pos = curves[i].getPoint(u); p.position.set(pos.x, map.ground(pos.x, pos.z), pos.z); p.fade(1 - .7 * ghost); });
  fire.set(.25 * (1 - truth) + .1, t);
  // the "what if": tied together, walking one way, into the lake
  const walk = ramp(t, T.tied, T.wrong + .6);
  ghosts.forEach((g, i) => { const x = -.6 + walk * 1.5 + i * .18 - .27, z = .2 + walk * 1.0; const inLake = Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * .9;
    const sink = inLake ? clamp((t - (T.wrong + .1 + i * .1)) / .6) : 0;
    g.position.set(x, map.ground(x, z) - .4 * sink, z); g.fade(ghost * .75 * (1 - sink)); g.rotation.y = -.6; });
  const g0 = ghosts[0].position, g3 = ghosts[3].position; rope.position.set((g0.x + g3.x) / 2, g0.y + .2, (g0.z + g3.z) / 2); rope.scale.y = Math.max(.01, g3.x - g0.x); rope.rotation.set(0, Math.atan2(g3.z - g0.z, g3.x - g0.x) * -1, Math.PI / 2); ropeMat.opacity = ghost; rope.visible = ghost > .01;
  fog.set(t, { r: 2.9 + .4 * truth });
  S.done(t);
}

export function overlay(ctx, t) {
  caption(ctx, '散了?', 540, 420, 76, smooth(ramp(t, T.broke - .1, T.broke + .3)) * (1 - ramp(t, T.truth - .4, T.truth)), { col: INK });
  caption(ctx, '说了实话', 540, 420, 76, smooth(ramp(t, T.truth, T.truth + .3)) * (1 - ramp(t, T.tied - .6, T.tied - .3)), { col: ACC });
  caption(ctx, '如果绑在一起……', 540, 420, 60, smooth(ramp(t, T.tied - .2, T.tied + .2)) * (1 - ramp(t, T.wrong + 1.0, T.wrong + 1.4)), { col: INK, weight: 600 });
  tail(ctx, t, A, B, '说实话');
}
