// Beat 1–2: 一个人 → 一支队伍 → 只对一半 → 超级个体(一个人干完一个小团队的活)
import * as THREE from 'three';
import { stage, sample, merge, figure, Morph, GOLDV, ASHV } from './kit.js';
import { drawChrome, drawSubtitle, vtext, seal, ramp, clamp, smooth, ease, ptime, rgba, GOLD, GOLD_HI, PAPER, SERIF, W } from './overlay.js';

export const A = 0, B = 17.6;
const S = stage({ bloom: .9, threshold: .5 });
const { scene, camera } = S;
// camera at z=10.5 → the z=0 plane maps 1:1 onto a 1080×1920 canvas, so shapes are drawn in screen pixels
const CZ = 10.5, VH = 2 * CZ * Math.tan(THREE.MathUtils.degToRad(15)), VW = VH * 1080 / 1920, CY = .3;
const scr = { w: VW, h: VH, cy: CY, res: 1080 };

const T = {
  team: ptime(0, '变成'), half: ptime(1, '一半'), other: ptime(2, '另一半'), key: ptime(2, '关键'),
  solo: ptime(3, '超级个体'), crew: ptime(3, '一个小团队'), job: ptime(3, '的活'),
  t1: ptime(4, '设计'), t2: ptime(4, '写代码'), t3: ptime(4, '剪视频'), run: ptime(4, '从头'),
};

const N = 46000;
const gold = (k = 1) => () => GOLDV.map(c => c * k);
// rows of the team, back to front
const ROWS = [[610, 140, 6, .45], [830, 180, 5, .7], [1085, 225, 4, 1]];
const teamDraw = (shift = 0) => (x) => ROWS.forEach(([y, s, n, _]) => { for (let i = 0; i < n; i++) { const cx = 540 + (i - (n - 1) / 2) * s * 1.02; figure(x, cx + Math.sign(cx - 540) * shift, y, s); } });
const rowK = Y => { const sy = (CY + VH / 2 - Y) / VH * 1920; return sy < 690 ? .45 : sy < 920 ? .7 : 1; };
const T0 = sample(x => figure(x, 540, 820, 300), N, { ...scr, seed: 1 });
const T1 = sample(teamDraw(0), N, { ...scr, seed: 2, color: (X, Y) => GOLDV.map(c => c * rowK(Y)) });
const T2 = sample(teamDraw(46), N, { ...scr, seed: 3, color: (X, Y) => X < 0 ? GOLDV.map(c => c * rowK(Y)) : ASHV.map(c => c * .8) });
const T2b = { pos: T2.pos, col: T2.col.map((c, i) => { const X = T2.pos[i - i % 3]; return X < 0 ? c * .35 : [1.05, .85, .55][i % 3] * 1.2; }) };
const T3 = sample(x => figure(x, 540, 830, 560, { fill: .22 }), N, { ...scr, seed: 4 });
const solo = new Morph([T0, T1, T2, T2b, T3], { size: .0068, scatter: .9 });
scene.add(solo.points); S.mats.push(solo.mat);
const soloKeys = [[T.team - .2, T.team + 1.6, 0, 1], [T.half - .1, T.half + .8, 1, 2], [T.other, T.key + .3, 2, 3], [T.solo - .3, T.solo + 1.4, 3, 4]];

// a small team's workstations: desk + monitor + chair, in a loose ring around the figure
const DESKS = [[175, 560], [150, 880], [215, 1200], [915, 900], [865, 1200], [540, 1290]];
const desk = (x, cx, cy) => { x.save(); x.translate(cx, cy); x.strokeStyle = '#fff'; x.lineWidth = 3;
  x.strokeRect(-70, 0, 140, 10); x.strokeRect(-38, -66, 76, 50); x.beginPath(); x.moveTo(0, -16); x.lineTo(0, 0); x.moveTo(-60, 10); x.lineTo(-60, 60); x.moveTo(60, 10); x.lineTo(60, 60);
  x.moveTo(-22, 34); x.lineTo(22, 34); x.moveTo(0, 34); x.lineTo(0, 70); x.stroke(); x.restore(); };
const DN = 9000;
const D0 = sample(x => DESKS.forEach(([cx, cy]) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, 60, 0, 6.283); x.fill(); }), DN, { ...scr, seed: 5, color: () => ASHV });
const D1 = sample(x => DESKS.forEach(([cx, cy]) => desk(x, cx, cy)), DN, { ...scr, seed: 6, color: () => [1.1, .95, .75] });
const D2 = sample(x => { x.fillStyle = '#fff'; x.beginPath(); x.arc(540, 700, 40, 0, 6.283); x.fill(); }, DN, { ...scr, seed: 7 });
const desks = new Morph([D0, D1, D2], { size: .006, scatter: .7, seed: 12, alpha: .8 });
scene.add(desks.points); S.mats.push(desks.mat);
const deskKeys = [[T.crew - .4, T.crew + .8, 0, 1], [T.job - .1, T.job + 1.1, 1, 2]];

export function update(t) {
  const push = smooth(ramp(t, A, B));
  camera.position.set(Math.sin(t * .31) * .04, CY + Math.sin(t * .23 + 1) * .03, CZ - .9 * push + .9 * smooth(ramp(t, T.team, T.team + 2)));
  camera.lookAt(0, CY, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  solo.update(t, soloKeys);
  solo.mat.uniforms.uBright.value = 1 + .5 * Math.exp(-Math.pow((t - T.solo - 1.2) / .5, 2)) - .35 * smooth(ramp(t, T.t1 - .5, T.run));
  desks.update(t, deskKeys);
  desks.mat.uniforms.uShow.value = smooth(ramp(t, T.crew - .4, T.crew + .4)) * (1 - smooth(ramp(t, T.job + .6, T.job + 1.2)));
  S.halo.material.opacity = .5 + .4 * smooth(ramp(t, T.solo, T.solo + 1));
  S.finish(t, A, B, { aperture: .35 });
}

// line-art tool icons
function icon(ctx, kind, cx, cy, a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.strokeStyle = GOLD_HI; ctx.lineWidth = 4; ctx.lineJoin = ctx.lineCap = 'round';
  ctx.shadowColor = rgba(GOLD_HI, .9); ctx.shadowBlur = 18; ctx.beginPath();
  if (kind === 0) { ctx.moveTo(-12, 46); ctx.lineTo(-30, -6); ctx.lineTo(0, -48); ctx.lineTo(30, -6); ctx.lineTo(12, 46); ctx.closePath(); ctx.moveTo(0, -48); ctx.lineTo(0, 4); ctx.moveTo(6, 10); ctx.arc(0, 10, 6, 0, 6.283); }
  else if (kind === 1) { ctx.moveTo(-22, -30); ctx.lineTo(-52, 0); ctx.lineTo(-22, 30); ctx.moveTo(22, -30); ctx.lineTo(52, 0); ctx.lineTo(22, 30); ctx.moveTo(10, -40); ctx.lineTo(-10, 40); }
  else { ctx.rect(-52, -36, 104, 72); for (let i = -1; i <= 1; i++) { ctx.rect(-46, -30 + (i + 1) * 22, 8, 10); ctx.rect(38, -30 + (i + 1) * 22, 8, 10); } ctx.moveTo(-26, -36); ctx.lineTo(-26, 36); ctx.moveTo(26, -36); ctx.lineTo(26, 36); }
  ctx.stroke(); ctx.restore();
}

function big(ctx, s, x, y, size, col, a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = `700 ${size}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = rgba(col, .8); ctx.shadowBlur = 16; ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore();
}

export function overlay(ctx, t) {
  // the split: a hairline down the middle, then 一半 / 另一半
  const sl = ramp(t, T.half - .15, T.half + .5) * (1 - ramp(t, T.solo - .4, T.solo + .2));
  if (sl > 0) { ctx.save(); ctx.globalAlpha = sl; const g = ctx.createLinearGradient(0, 380, 0, 1220); g.addColorStop(0, rgba(GOLD_HI, 0)); g.addColorStop(.5, rgba(GOLD_HI, .9)); g.addColorStop(1, rgba(GOLD_HI, 0));
    ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(540, 380); ctx.lineTo(540, 380 + 840 * smooth(ramp(t, T.half - .15, T.half + .5))); ctx.stroke(); ctx.restore(); }
  const ha = ramp(t, T.half, T.half + .4) * (1 - ramp(t, T.solo - .4, T.solo + .1));
  big(ctx, '一半', 300, 380, 68, GOLD_HI, ha * (1 - .55 * ramp(t, T.other, T.other + .4)));
  const oa = ramp(t, T.other, T.other + .5) * (1 - ramp(t, T.solo - .4, T.solo + .1));
  big(ctx, '另一半', 760, 380, 68, PAPER, oa);
  seal(ctx, '关键', 940, 370, 76, ramp(t, T.key, T.key + .3) * (1 - ramp(t, T.solo - .4, T.solo + .1)));
  // title
  const ta = ramp(t, T.solo - .1, T.solo + .6) * (1 - ramp(t, T.t1 - .4, T.t1 + .2));
  vtext(ctx, '超级个体', 930, 300, 88, GOLD_HI, ta, ramp(t, T.solo - .1, T.solo + 1.0), 1.12, 700, 18);
  // tools on a line, then the line runs end to end
  const keys = [T.t1, T.t2, T.t3]; const xs = [250, 540, 830];
  keys.forEach((k, i) => icon(ctx, i, xs[i], 1300, ramp(t, k - .1, k + .35)));
  ['设计', '代码', '视频'].forEach((s, i) => { const a = ramp(t, keys[i], keys[i] + .4); if (a <= 0) return; ctx.save(); ctx.globalAlpha = a * .8; ctx.fillStyle = PAPER; ctx.font = `500 28px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText(s, xs[i], 1388); ctx.restore(); });
  const rl = smooth(ramp(t, T.run, T.run + 1.4));
  if (rl > 0) { const x1 = 110 + 860 * rl; ctx.save(); ctx.strokeStyle = rgba(GOLD_HI, .85); ctx.lineWidth = 3; ctx.shadowColor = rgba(GOLD_HI, .9); ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(110, 1430); ctx.lineTo(x1, 1430); ctx.stroke();
    const hg = ctx.createRadialGradient(x1, 1430, 0, x1, 1430, 40); hg.addColorStop(0, 'rgba(255,245,220,.95)'); hg.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = hg; ctx.fillRect(x1 - 40, 1390, 80, 80);
    xs.forEach(x => { if (x < x1) { ctx.fillStyle = GOLD_HI; ctx.beginPath(); ctx.arc(x, 1430, 7, 0, 6.283); ctx.fill(); } }); ctx.restore(); }
  drawChrome(ctx, t < T.solo - .2 ? '一个人 · 一支队伍' : '超级个体', .9 * ramp(t, .3, 1.2));
  drawSubtitle(ctx, t);
}
