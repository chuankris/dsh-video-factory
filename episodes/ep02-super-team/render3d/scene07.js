// 段 7 · 新麻烦:以前活干不完,现在不知道怎么干;工具一周一换,做法一天一个样;今天搭好的路,明天就塌
import * as THREE from 'three';
import { board, terrain, pawn, clouds, hop, caption, tail, ramp, smooth, clamp, ACC, INK, TEAM, BIOME } from './board.js';
import { ptime } from './overlay.js';

export const A = 88.08, B = 106.8;
const S = board();
const T = { old: ptime(22, '以前就有'), neu: ptime(23, '新的'), before: ptime(24, '活干不完'), now: ptime(25, '不知道'), week: ptime(26, '一周一换'), day: ptime(26, '一天一个样'), road: ptime(27, '搭好的流程'), gone: ptime(27, '过时了') };
const map = terrain(S, { seed: 71, clear: 1.2, cz: 0, rx: 3.0, rz: 3.8 });
const fog = clouds(S, { r: 3.3 });
// alternative layouts: the same noise, shifted — each "day" the map is redrawn
const fbm = (x, z, sh) => { x += sh; z -= sh * .7; return Math.sin(x * .9 + 1.3) * Math.cos(z * .7) * .45 + Math.sin(x * .37 - z * .41 + 2) * .7 + Math.cos(z * .23 + x * .19) * .5 + Math.sin(x * 2.1 + z * 1.7) * .12; };
const biome = h => h < -.55 ? 'water' : h < -.38 ? 'sand' : h < .05 ? 'grass' : h < .35 ? 'forest' : h < .8 ? 'hill' : h < 1.2 ? 'rock' : 'peak';
const DAYS = [T.now - .2, T.week - .1, T.week + .9, T.day - .2, T.day + .8, T.gone - .3];
const layouts = [0, 2.3, 4.1, 6.7, 8.2, 10.9, 13.4].map(sh => map.cells.map(e => { const b = biome(fbm(e.x, e.z, sh)); return { b, h: BIOME[b][3] + (b === 'peak' || b === 'rock' ? .03 : 0) }; }));
// the road the team builds on "today", across the middle
const road = map.cells.filter(e => Math.abs(e.z - (-.15 + e.x * .25)) < .13 && Math.abs(e.x) < 1.9).sort((a, b) => a.x - b.x);
const crew = TEAM.slice(0, 5).map((c, i) => ({ p: pawn(S, c, { flag: false }), ph: i * 1.3 }));
const WORK = map.cells.filter(e => Math.hypot(e.x, e.z) < 1.5);

export const proj = {};
export function update(t) {
  const wide = smooth(ramp(t, A, T.neu + .5));
  S.cam(0, 6.3 + 1.6 * wide, 6.5 + 1.2 * wide, 0, 0, -.3, 36);
  // which day is it, and how far has today's wave travelled
  let day = 0; for (let i = 0; i < DAYS.length; i++) if (t >= DAYS[i]) day = i + 1;
  const tw = day > 0 ? t - DAYS[day - 1] : -1;
  const roadK = ramp(t, T.road - .2, T.road + 1.8);
  const before = smooth(ramp(t, T.before - .4, T.before + .3)) * (1 - smooth(ramp(t, T.now - .4, T.now)));
  map.apply(e => {
    const sweep = (e.x + 3) / 6 * .7;
    const k = tw < 0 ? 1 : clamp((tw - sweep) / .25);
    const cur = layouts[day][map.cells.indexOf(e)], prev = layouts[Math.max(0, day - 1)][map.cells.indexOf(e)];
    const L = tw < 0 || k >= 1 ? cur : prev;
    const flip = tw >= 0 && k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0;
    let o = { b: L.b, h: L.h, y: flip * .12, s: 1 - .35 * flip };
    if (before > 0 && WORK.includes(e)) o = { b: 'field', h: .1, y: .02 * Math.sin(t * 3 + e.x * 4) * before };
    const ri = road.indexOf(e);
    if (ri >= 0 && day === DAYS.length - 1 && ri / road.length < roadK) o = { b: 'road', h: .1, y: 0, s: 1 };
    if (ri >= 0 && day === DAYS.length && ri / road.length < 1) { const sink = clamp((tw - ri * .03) / .5); o = { b: sink > .5 ? 'water' : 'road', h: .1 - .07 * sink, y: 0, s: 1 }; }
    return o;
  });
  crew.forEach((o, i) => {
    let x, z; const show = 1;
    if (t < T.now) { const a = t * .9 + o.ph; x = Math.cos(a) * .8 * (.4 + i * .15); z = Math.sin(a * 1.3) * .6; }
    else if (day < DAYS.length - 1) { const a = o.ph * 1.7; x = Math.cos(a) * .6; z = Math.sin(a) * .5 + .4; }
    else { const r = road[Math.min(road.length - 1, Math.floor(roadK * road.length) - i * 2)] || road[0]; x = r.x; z = r.z + .14; }
    o.p.position.set(x, map.ground(x, z) + (t > T.now && day < DAYS.length - 1 ? Math.abs(Math.sin(t * 5 + i)) * .05 : 0), z); o.p.fade(show);
    o.p.rotation.y = t * .5 + i;
  });
  proj.day = day; proj.tw = tw;
  fog.set(t, { r: 3.3 + .5 * wide });
  S.done(t);
}

const WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export function overlay(ctx, t) {
  caption(ctx, '老麻烦', 540, 420, 60, smooth(ramp(t, T.old - .1, T.old + .3)) * (1 - ramp(t, T.neu - .3, T.neu)), { col: INK });
  caption(ctx, '+ 一个新的', 540, 420, 72, smooth(ramp(t, T.neu, T.neu + .3)) * (1 - ramp(t, T.before - .5, T.before - .2)), { col: ACC });
  caption(ctx, '以前 · 活干不完', 540, 420, 60, smooth(ramp(t, T.before - .2, T.before + .2)) * (1 - ramp(t, T.now - .4, T.now)), { col: '#8a6a3a' });
  caption(ctx, '现在 · 不知道怎么干', 540, 420, 60, smooth(ramp(t, T.now, T.now + .3)) * (1 - ramp(t, T.week - .4, T.week - .1)), { col: ACC });
  // the calendar that keeps flipping
  const ca = smooth(ramp(t, T.week - .3, T.week + .1));
  if (ca > 0) { const d = Math.max(0, proj.day - 1); const fl = proj.tw >= 0 && proj.tw < .25 ? proj.tw / .25 : 1;
    ctx.save(); ctx.globalAlpha = ca; ctx.translate(890, 330);
    ctx.fillStyle = 'rgba(255,253,248,.95)'; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-90, -80, 180, 170, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ACC; ctx.beginPath(); ctx.roundRect(-90, -80, 180, 46, [12, 12, 0, 0]); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 28px 'Noto Serif CJK SC','Songti SC',serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('今天', 0, -57);
    ctx.save(); ctx.scale(1, fl); ctx.fillStyle = INK; ctx.font = `800 64px 'Noto Serif CJK SC','Songti SC',serif`; ctx.fillText(WEEK[d % 7], 0, 22); ctx.restore(); ctx.restore(); }
  caption(ctx, '明天 · 塌了', 540, 420, 64, smooth(ramp(t, T.gone + .2, T.gone + .5)), { col: ACC });
  tail(ctx, t, A, B, '一天一个样');
}
