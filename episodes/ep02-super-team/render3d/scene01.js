// 段 1 · 开场:一个人扛不住的事 → 找人 → 可大多数人都想错了
import * as THREE from 'three';
import { board, terrain, pawn, clouds, hop, caption, tail, ramp, smooth, ACC, INK, TEAM } from './board.js';
import { ptime } from './overlay.js';

export const A = 0, B = 6.72;
const S = board();
const T = { heavy: ptime(0, '扛不住'), find: ptime(0, '找人'), wrong: ptime(1, '都想错了') };
const M = { x: .5, z: -1.35, r: 1.3 }; // the mountain
const map = terrain(S, { seed: 11, clear: 1.6, cx: -.2, cz: .5 });
const gold = pawn(S, 'gold'); const gx = -.45, gz = .75;
const fog = clouds(S, { r: 2.5, cx: 0, cz: .1 });
// newcomers arrive out of the clouds at the edge
const NEW = TEAM.slice(0, 6).map((c, i) => { const a = -2.4 + i * .95; return { p: pawn(S, c), x: Math.cos(a) * 1.9, z: Math.sin(a) * 1.75 + .45, d: i * .12 }; });

export function update(t) {
  S.cam(.15 + Math.sin(t * .2) * .1, 6.6 - .5 * smooth(ramp(t, A, B)), 6.9 - .4 * smooth(ramp(t, A, B)));
  const rise = smooth(ramp(t, T.heavy - .4, T.heavy + 1.2));
  map.apply(e => { const d = Math.hypot(e.x - M.x, e.z - M.z); if (d > M.r) return null;
    const k = 1 - d / M.r; return { b: k > .78 ? 'peak' : k > .38 ? 'rock' : 'hill', col: k > .78 ? null : k > .38 ? [.58, .56, .53] : null, h: .12 + (.15 + 1.0 * k * k) * (.25 + .75 * rise) }; });
  gold.position.set(gx, map.ground(gx, gz), gz); gold.rotation.y = -.6;
  NEW.forEach((o, i) => { const t0 = T.find + o.d; const k = smooth(ramp(t, t0 - .1, t0 + .3));
    o.p.position.set(o.x, map.ground(o.x, o.z) + hop(t, t0, .3, .4) + (1 - k) * .6, o.z); o.p.fade(k); o.p.rotation.y = Math.atan2(gx - o.x, gz - o.z);
    o.p.tint(0xa3a8b0, smooth(ramp(t, T.wrong - .1 + i * .05, T.wrong + .4 + i * .05))); });
  fog.set(t, { r: 2.5 + .3 * smooth(ramp(t, T.find - .3, T.find + .8)) });
  S.done(t);
}

export function overlay(ctx, t) {
  caption(ctx, '?', 540, 520, 150, smooth(ramp(t, T.wrong + .2, T.wrong + .6)), { col: ACC });
  tail(ctx, t, A, B, '找人');
}
