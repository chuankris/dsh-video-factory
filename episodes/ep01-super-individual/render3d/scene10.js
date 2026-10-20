// Beat 10: 让 AI 写这条片子的脚本 — 太浅 / 太深 / 少了点味道;写得出来,可对不对只有我能判
import * as THREE from 'three';
import { stage, toScreen } from './kit.js';
import { drawChrome, drawSubtitle, seal, ramp, clamp, smooth, ease, ptime, rng, rgba, GOLD, GOLD_HI, PAPER, CINNABAR, SERIF, W, H } from './overlay.js';

export const A = 123.0, B = 137.32;
const S = stage({ bloom: .7, threshold: .7, haloOp: .6 });
const { scene, camera } = S;
const CZ = 10.5, CY = .3;

const T = {
  ask: ptime(29, '脚本'), many: ptime(30, '好几个版本'), v1: ptime(30, '第一版'), v2: ptime(30, '第二版'), v3: ptime(30, '第三版'),
  ok: ptime(30, '好懂'), flat: ptime(30, '少了点味道'), every: ptime(31, '写得出来'), only: ptime(31, '只有我能判'),
};

// the script of this very film, as drafts on xuan paper
const LINES = window.CUES.slice(0, 9).map(c => c.text);
function paperTex(head, seed, shift = 0) {
  const c = document.createElement('canvas'); c.width = 420; c.height = 560; const x = c.getContext('2d'); const R = rng(seed);
  x.fillStyle = '#e6d9bf'; x.fillRect(0, 0, 420, 560);
  for (let i = 0; i < 2500; i++) { x.globalAlpha = .04 + R() * .05; x.fillStyle = R() < .5 ? '#a08a66' : '#fff'; x.fillRect(R() * 420, R() * 560, 1 + R() * 12, 1); }
  x.globalAlpha = 1; x.strokeStyle = 'rgba(150,40,30,.35)'; x.lineWidth = 1; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(34 + i * 30, 70); x.lineTo(34 + i * 30, 530); x.stroke(); }
  x.fillStyle = '#2a2018'; x.font = `700 30px ${SERIF}`; x.textAlign = 'left'; x.fillText(head, 30, 46);
  x.font = `400 19px ${SERIF}`; let y = 96; const lines = LINES.slice(shift).concat(LINES.slice(0, shift));
  for (const ln of lines) { let s = ''; for (const ch of ln) { if (x.measureText(s + ch).width > 360) { x.fillText(s, 30, y); y += 30; s = ''; } s += ch; } x.fillText(s, 30, y); y += 40; if (y > 530) break; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const PW = .82, PH = 1.09, geo = new THREE.PlaneGeometry(PW, PH);
const mk = (tex) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); scene.add(m); return m; };
const drafts = [mk(paperTex('第一版', 1, 0)), mk(paperTex('第二版', 2, 3)), mk(paperTex('第三版', 3, 6))];
const EXTRA = 22, extras = Array.from({ length: EXTRA }, (_, i) => mk(paperTex(`第${'四五六七八九十'[i % 7]}版`, 10 + i, i % 9)));
const R = rng(5); const exPos = extras.map((_, i) => ({ a: (i / EXTRA - .5) * 2.6 + (R() - .5) * .2, r: 1.5 + R() * .5, z: -1.4 - R() * 1.2, d: R() * .8 }));

export const proj = {};
export function update(t) {
  camera.position.set(Math.sin(t * .31) * .04, CY + Math.sin(t * .23 + 1) * .03, CZ - .8 * smooth(ramp(t, A, T.many)) + .9 * smooth(ramp(t, T.every - .3, T.every + 1.5)));
  camera.lookAt(0, CY, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const rise = ease(ramp(t, A + .2, T.ask + .3)); const fan = ease(ramp(t, T.many - .2, T.many + 1.0));
  const vs = [T.v1, T.v2, T.v3];
  drafts.forEach((m, i) => {
    const side = i - 1; const x = side * .92 * fan, y = CY + .15 - (1 - rise) * 2.2 + Math.abs(side) * .06 * fan, z = -Math.abs(side) * .15 * fan + i * .002;
    m.position.set(x, y, z); m.rotation.set(-.05, -side * .22 * fan, -side * .07 * fan);
    // judged one by one: the active draft comes forward, rejected ones fall back
    const on = smooth(ramp(t, vs[i] - .2, vs[i] + .4)); const next = i < 2 ? smooth(ramp(t, vs[i + 1] - .2, vs[i + 1] + .4)) : 0;
    m.position.z += .35 * on * (1 - next); m.scale.setScalar(1 + .08 * on * (1 - next));
    let b = .62; if (t > T.v1 - .2) b = .3 + .5 * on * (1 - next);
    if (i === 2) b *= 1 - .45 * smooth(ramp(t, T.flat - .1, T.flat + .6));
    const every = smooth(ramp(t, T.every - .2, T.every + 1));
    b *= 1 - .45 * every;
    m.material.color.setRGB(b, b * .97, b * .9); m.material.opacity = rise * (i === 1 || fan > .01 ? 1 : 0) || (i === 1 ? rise : 0);
    if (i !== 1) m.material.opacity = Math.min(rise, fan * 4);
    proj['d' + i] = toScreen(camera, new THREE.Vector3(0, PH / 2, 0).applyMatrix4(m.matrixWorld));
  });
  // and then it keeps writing — drafts without end
  extras.forEach((m, i) => { const p = exPos[i]; const k = ease(clamp((t - T.every + .2 - p.d) / .9));
    m.visible = k > .001; m.position.set(Math.sin(p.a) * p.r * 1.05, CY + .1 + Math.cos(p.a) * p.r * .55 - .2, p.z);
    m.position.y -= (1 - k) * 2.5; m.rotation.set(0, -Math.sin(p.a) * .4, -p.a * .25);
    const dim = 1 - .5 * smooth(ramp(t, T.only - .2, T.only + .5)); m.material.color.setScalar(.38 * dim); m.material.opacity = k; });
  S.finish(t, A, B, { aperture: .25 });
}

function tag(ctx, s, p, a, col = PAPER) {
  if (a <= 0 || !p) return; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 40px ${SERIF}`;
  const w = ctx.measureText(s).width + 36; ctx.fillStyle = 'rgba(10,8,6,.75)'; ctx.strokeStyle = rgba(col, .8); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(p[0] - w / 2, p[1] - 70, w, 56, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; ctx.fillText(s, p[0], p[1] - 42); ctx.restore();
}
export function overlay(ctx, t) {
  const fade = 1 - ramp(t, T.every - .3, T.every + .3);
  tag(ctx, '太浅', proj.d0, ramp(t, T.v1 + .5, T.v1 + .8) * fade);
  tag(ctx, '太深', proj.d1, ramp(t, T.v2 + .5, T.v2 + .8) * fade);
  tag(ctx, '好懂', proj.d2, ramp(t, T.ok - .1, T.ok + .2) * (1 - ramp(t, T.flat - .1, T.flat + .1)) * fade, GOLD_HI);
  tag(ctx, '少了点味道', proj.d2, ramp(t, T.flat, T.flat + .3) * fade);
  // 判 — the stamp comes down
  const st = t - T.only; if (st > -.1) { const k = clamp(st / .22); const sz = 220 * (1 + 1.6 * (1 - ease(k)));
    const sa = clamp(st / .12) * (1 - ramp(t, B - .6, B - .2));
    ctx.save(); ctx.globalAlpha = sa * .93; ctx.translate(W / 2, 860); ctx.rotate(-.06); ctx.scale(sz / 220, sz / 220);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.fillStyle = CINNABAR; ctx.beginPath(); ctx.roundRect(-110, -110, 220, 220, 14); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(239,232,216,.85)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-96, -96, 192, 192, 8); ctx.stroke();
    ctx.fillStyle = PAPER; ctx.font = `800 150px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('判', 0, 6); ctx.restore();
    if (st > .22 && st < .7) { ctx.save(); ctx.globalAlpha = (1 - (st - .22) / .48) * .5; ctx.strokeStyle = CINNABAR; ctx.lineWidth = 3; ctx.strokeRect(W / 2 - 150 - (st - .22) * 120, 710 - (st - .22) * 120, 300 + (st - .22) * 240, 300 + (st - .22) * 240); ctx.restore(); } }
  drawChrome(ctx, '一个例子 · 这条片子的脚本', .9);
  drawSubtitle(ctx, t);
}
