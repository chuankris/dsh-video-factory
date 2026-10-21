// 段 5 · 沟通:五个人十条线,十个人四十五条 →《人月神话》:项目晚了再加人,只会更晚
import * as THREE from 'three';
import { board, terrain, pawn, clouds, link, hop, caption, seal, tail, ramp, smooth, clamp, ACC, INK, TEAM } from './board.js';
import { ptime } from './overlay.js';

export const A = 51.12, B = 64.12;
const S = board();
const T = { talk: ptime(13, '沟通'), ten: ptime(14, '十条线'), more: ptime(14, '十个人'), f45: ptime(14, '四十五条'), mm: ptime(15, '人月神话'), late: ptime(15, '项目已经晚了'), add: ptime(15, '再加人'), later: ptime(15, '更晚') };
const map = terrain(S, { seed: 51, clear: 2.0, cz: -.25 });
const fog = clouds(S, { r: 2.4, cz: -.1 });
const N = 10, RAD = 1.35; const P = [];
for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + .3; const x = Math.cos(a) * RAD, z = Math.sin(a) * RAD * 1.0 - .35;
  P.push({ p: pawn(S, TEAM[i]), x, z, t0: i < 5 ? T.talk - .2 + i * .12 : T.more - .3 + (i - 5) * .12 }); }
P.forEach(o => o.p.position.set(o.x, map.ground(o.x, o.z), o.z));
const L = []; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) L.push({ m: link(S, P[i].p.position, P[j].p.position, { arc: .08 + .04 * ((i + j) % 3) }), five: i < 5 && j < 5, k: L.length });
// the road that is already late
const road = map.cells.filter(e => Math.abs(e.z - 1.35) < .12 && Math.abs(e.x) < 1.5).sort((a, b) => a.x - b.x);
const extra = ['grey', 'grey', 'grey'].map((c, i) => ({ p: pawn(S, c, { flag: false }), x: -1.9 + i * .2, z: 1.65 }));
export const proj = {};
const progress = t => { const a = clamp((t - A) / (T.add - A)) * .78; const drop = smooth(ramp(t, T.add + .2, T.later + .4)) * .16; return a - drop; };

export function update(t) {
  const down = smooth(ramp(t, T.mm - .6, T.mm + .6));
  S.cam(.1, 6.2 - .3 * down, 6.3 + .5 * down, 0, 0, -.35 + .7 * down);
  P.forEach(o => { const k = smooth(ramp(t, o.t0, o.t0 + .3)); o.p.position.y = map.ground(o.x, o.z) + hop(t, o.t0, .2, .3); o.p.fade(k); });
  L.forEach(l => { const s = l.five ? T.ten - .3 + (l.k % 10) * .05 : T.f45 - .5 + (l.k % 35) * .022; l.m.show(smooth(ramp(t, s, s + .35)) * (1 - .7 * down)); });
  const pr = progress(t);
  map.apply(e => { const i = road.indexOf(e); if (i < 0) return null; return i / road.length < pr ? { b: 'road' } : { b: 'sand', col: [.75, .7, .62] }; });
  extra.forEach((o, i) => { const t0 = T.add - .1 + i * .15; const k = smooth(ramp(t, t0, t0 + .3)); const w = smooth(ramp(t, t0, t0 + 1.2));
    const x = o.x + w * (1.2 + i * .25); o.p.position.set(x, map.ground(x, o.z) + hop(t, t0, .2, .3), o.z); o.p.fade(k); });
  proj.pr = pr; proj.down = down;
  fog.set(t, { r: 2.4 + .6 * down, cz: -.1 + .6 * down });
  S.done(t);
}

export function overlay(ctx, t) {
  const many = t > T.f45 - .2; const n = many ? 45 : 10, p = many ? 10 : 5;
  const a = smooth(ramp(t, T.ten - .2, T.ten + .2)) * (1 - proj.down);
  caption(ctx, String(n), 80, 300, 130, a, { col: ACC, align: 'left' });
  caption(ctx, '条线', 80 + (n >= 10 ? 150 : 80), 318, 46, a, { align: 'left', weight: 600 });
  caption(ctx, `${p} 个人`, 86, 395, 36, a * .8, { align: 'left', weight: 500 });
  // progress bar
  const ba = proj.down; if (ba > 0) { ctx.save(); ctx.globalAlpha = ba; const x = 140, y = 420, w = 800, h = 22;
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = ACC; ctx.fillRect(x, y, w * proj.pr, h); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = INK; ctx.font = `600 34px 'Noto Serif CJK SC','Songti SC',serif`; ctx.textAlign = 'left'; ctx.fillText(`进度 ${Math.round(proj.pr * 100)}%`, x, y - 30);
    ctx.textAlign = 'right'; ctx.fillStyle = ACC; ctx.fillText('已经晚了', x + w, y - 30); ctx.restore(); }
  seal(ctx, '人月神话', 920, 560, 110, smooth(ramp(t, T.mm, T.mm + .3)));
  caption(ctx, '加人 → 更晚', 540, 600, 60, smooth(ramp(t, T.later - .1, T.later + .3)), { col: ACC });
  tail(ctx, t, A, B, '沟通 · n(n−1)/2');
}
