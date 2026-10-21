// 段 11 · 钩子:问题不是要不要团队,而是路一天一变的时候,一群人怎么一起找路 → 下一集
import * as THREE from 'three';
import { board, caption, tail, ramp, smooth, ACC, INK } from './board.js';
import { setup } from './team.js';
import { ptime } from './overlay.js';
import { W } from './overlay.js';

export const A = 138.64, B = 149.56;
const S = board();
const T = { notq: ptime(36, '要不要团队'), how: ptime(37, '一天一变'), together: ptime(37, '一起找路'), next: ptime(38, '下一集') };
const { map, fog, crew, curves, trails, fire } = setup(S, 82);

export function update(t) {
  const pull = smooth(ramp(t, A, T.how + 1));
  S.cam(Math.sin(t * .1) * .2, 7.6 + 2.6 * pull, 7.4 + 2.0 * pull, 0, 0, -.3, 36);
  // scattered pieces of road: everyone's trail, none of them joined
  map.apply(e => { for (let j = 0; j < trails.length; j++) { const k = trails[j].indexOf(e); if (k >= 0 && k / trails[j].length > .3 && k / trails[j].length < .9) return { b: 'road', col: [.98, .6, .22] }; } return null; });
  crew.forEach((p, i) => { const pos = curves[i].getPoint(.9); p.position.set(pos.x, map.ground(pos.x, pos.z), pos.z); });
  fire.set(.15, t);
  fog.set(t, { r: 3.4 - 1.3 * smooth(ramp(t, T.together, B)) });
  S.done(t);
}

export function overlay(ctx, t) {
  // "要不要团队" gets struck through
  const qa = smooth(ramp(t, T.notq - .2, T.notq + .2)) * (1 - ramp(t, T.how - .4, T.how));
  caption(ctx, '要不要团队?', 540, 430, 70, qa, { col: INK });
  if (qa > 0) { const k = smooth(ramp(t, T.notq + .5, T.notq + .9)); ctx.save(); ctx.globalAlpha = qa; ctx.strokeStyle = ACC; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(330, 432); ctx.lineTo(330 + 420 * k, 432); ctx.stroke(); ctx.restore(); }
  const ha = smooth(ramp(t, T.how, T.how + .4)) * (1 - ramp(t, T.next - .3, T.next));
  caption(ctx, '一群人', 540, 400, 92, ha, { col: INK });
  caption(ctx, '怎么一起找路?', 540, 520, 92, smooth(ramp(t, T.together - .3, T.together + .2)) * (1 - ramp(t, T.next - .3, T.next)), { col: ACC });
  const na = smooth(ramp(t, T.next, T.next + .4));
  caption(ctx, '下一集', 540, 400, 46, na, { col: INK, weight: 600 });
  caption(ctx, '超级团队,到底怎么搭', 540, 490, 76, na, { col: ACC });
  tail(ctx, t, A, B + 10, '怎么一起找路'); // last segment: no closing wipe, hold the final frame
}
