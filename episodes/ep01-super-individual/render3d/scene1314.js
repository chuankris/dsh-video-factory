// Beat 13–14: 一个人干不了的事 — 事越大看得越多扛得越重;手可以无限加,脑子和肩膀不行;手可以复制,判断不能 → 审美
import * as THREE from 'three';
import { makeKnife, pointsMaterial } from './core.js';
import { buildOx } from './ox.js';
import { stage, sample, figure, glyph, Morph, toScreen } from './kit.js';
import { drawChrome, drawSubtitle, vtext, seal, ramp, clamp, smooth, ease, ptime, rng, rgba, GOLD, GOLD_HI, PAPER, SERIF, W } from './overlay.js';

export const A = 161.52, B = 178.96;
const S = stage({ bloom: .85, threshold: .55 });
const { scene, camera, env } = S;
const CZ = 10.5, VH = 2 * CZ * Math.tan(THREE.MathUtils.degToRad(15)), VW = VH * 1080 / 1920, CY = .3;
const wp = (sx, sy, z = 0) => new THREE.Vector3((sx / 1080 - .5) * VW, CY + (.5 - sy / 1920) * VH, z);
const scr = { w: VW, h: VH, cy: CY, res: 1080 };

const T = {
  cant: ptime(38, '干不了'), big: ptime(39, '事越大'), see: ptime(39, '要看的越多'), carry: ptime(39, '要扛的越重'),
  hands: ptime(40, '手可以无限加'), head: ptime(40, '脑子和肩膀'), no: ptime(40, '不行'),
  copy: ptime(41, '手可以复制'), judge: ptime(41, '判断不能'), name: ptime(42, '判断'), aes: ptime(42, '审美'),
};

// ---------- the job keeps growing ----------
const OX = buildOx({ surf: 36000, vol: 0, mem: 0, line: 24000 });
const og = new THREE.BufferGeometry(); og.setAttribute('position', new THREE.BufferAttribute(OX.pos, 3)); og.setAttribute('aNrm', new THREE.BufferAttribute(OX.nrm, 3)); og.setAttribute('aInfo', new THREE.BufferAttribute(OX.info, 4));
const oxMat = pointsMaterial({ uCam: { value: new THREE.Vector3() }, uSee: { value: 0 }, uShow: { value: 1 } }, { decl: 'attribute vec3 aNrm; attribute vec4 aInfo; uniform vec3 uCam; uniform float uSee,uShow;', main: `
  P=position; float id=float(gl_VertexID); vec3 h=hash3(id*.013); float line=aInfo.w>2.5?1.:0.;
  vec3 V=normalize(uCam-(modelMatrix*vec4(P,1.)).xyz); float rim=pow(1.-abs(dot(normalize(aNrm),V)),2.5);
  float lit=line*smoothstep(h.x,h.x+.08,uSee);
  COL=(vec3(.75,.7,.62)*(.06+.7*rim)*(1.-line)+vec3(1.,.72,.34)*(.08+2.2*lit)*line)*uShow; A=.4; S=.0105;` });
const ox = new THREE.Points(og, oxMat); ox.frustumCulled = false; scene.add(ox); S.mats.push(oxMat);

// ---------- the one person ----------
const PS = [230, 1360, 180];
const P0 = sample(x => figure(x, PS[0], PS[1], PS[2]), 9000, { ...scr, seed: 51 });
const person = new Morph([P0], { size: .006, scatter: 0, seed: 52, alpha: .45 }); scene.add(person.points); S.mats.push(person.mat);
const FOOT = wp(0, PS[1] + .5 * PS[2]).y;

// ---------- hands multiply ----------
const proto = makeKnife(env); proto.scale.setScalar(.16);
const KN = 120, knives = [], kMats = new Set(); const R = rng(61);
for (let i = 0; i < KN; i++) { const k = proto.clone(); scene.add(k); const row = Math.floor(Math.sqrt(i)), col = i - row * row;
  const a = .25 + (col / Math.max(1, 2 * row)) * 1.1 + (R() - .5) * .05, r = .45 + row * .2;
  knives.push({ k, a, r, z: -.4 - R() * .6 }); k.traverse(o => { if (o.material) kMats.add(o.material); }); }
kMats.forEach(m => m.transparent = true);
const kOrigin = wp(PS[0], PS[1] - .25 * PS[2], -.2);

// ---------- 判断 → 审美 in particles ----------
const GN = 26000;
const Ga = sample(x => { glyph(x, '判', 540, 720, 260); glyph(x, '断', 540, 1010, 260); }, GN, { ...scr, seed: 71 });
const Gb = sample(x => { glyph(x, '审', 540, 720, 260); glyph(x, '美', 540, 1010, 260); }, GN, { ...scr, seed: 72 });
const word = new Morph([Ga, Gb], { size: .0062, scatter: 1.1, seed: 73, alpha: .4 }); scene.add(word.points); S.mats.push(word.mat);

export const proj = {};
export function update(t) {
  camera.position.set(Math.sin(t * .31) * .04, CY + Math.sin(t * .23 + 1) * .03, CZ);
  camera.lookAt(0, CY, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  // ox grows until it overflows the frame; seams light up; then it recedes for the hands
  const grow = ease(ramp(t, A + .2, T.big + 1.8));
  const back = smooth(ramp(t, T.hands - .5, T.hands + .8));
  ox.scale.setScalar(THREE.MathUtils.lerp(.32, 1.25, grow) * (1 - .25 * back)); ox.position.copy(wp(THREE.MathUtils.lerp(700, 600, grow), THREE.MathUtils.lerp(1150, 820, grow), -.6 - 1.5 * back));
  ox.rotation.y = -.45 + Math.sin(t * .2) * .08;
  oxMat.uniforms.uSee.value = ramp(t, T.see - .2, T.carry + .3); oxMat.uniforms.uCam.value.copy(camera.position);
  const end = smooth(ramp(t, T.copy - .4, T.copy + .5));
  oxMat.uniforms.uShow.value = (1 - .6 * back) * (1 - end);
  // the weight on one pair of shoulders
  const press = smooth(ramp(t, T.carry - .1, T.carry + 1.2)) * (1 - smooth(ramp(t, T.hands - .4, T.hands + .4)));
  person.points.scale.y = 1 - .1 * press; person.points.position.y = FOOT * .1 * press;
  const headLit = smooth(ramp(t, T.head - .2, T.head + .5));
  person.mat.uniforms.uBright.value = (1 - .3 * press + .6 * headLit) * (1 - end);
  // knives: 1 → 10 → 100+
  const n = t < T.hands - .2 ? 0 : Math.floor(Math.pow(KN, clamp((t - T.hands + .2) / 2.4)));
  const kf = 1 - end;
  knives.forEach((o, i) => { const on = i < n ? 1 : 0; o.k.visible = on === 1 && kf > .01; const p = smooth(clamp((t - T.hands + .2 - Math.log(i + 1) / Math.log(KN) * 2.4) / .35));
    o.k.position.set(kOrigin.x + Math.cos(o.a) * o.r * p, kOrigin.y + Math.sin(o.a) * o.r * p, o.z); o.k.rotation.set(0, .3, o.a - .2); });
  kMats.forEach(m => m.opacity = kf * (1 - .5 * headLit));
  // 判断 → 审美
  word.update(t, [[T.aes - .4, T.aes + .9, 0, 1]]);
  word.mat.uniforms.uShow.value = smooth(ramp(t, T.name - .3, T.name + .4));
  word.mat.uniforms.uBright.value = 1 + .5 * Math.exp(-Math.pow((t - T.aes - 1) / .5, 2));
  proj.head = toScreen(camera, wp(PS[0], PS[1] - .62 * PS[2]).setY(person.points.position.y + wp(0, PS[1] - .62 * PS[2]).y * person.points.scale.y));
  S.finish(t, A, B, { aperture: .3 });
}

export function overlay(ctx, t) {
  // weight bars over the shoulders
  const wa = ramp(t, T.carry, T.carry + .3) * (1 - ramp(t, T.hands - .4, T.hands));
  if (wa > 0) { const nb = Math.min(6, 1 + Math.floor((t - T.carry) * 3)); ctx.save(); ctx.globalAlpha = wa; ctx.fillStyle = rgba(GOLD, .55);
    for (let i = 0; i < nb; i++) ctx.fillRect(PS[0] - 80 + i * 4, 1170 - i * 22, 160 - i * 8, 12); ctx.restore(); }
  // 手 ×N vs 脑子和肩膀 ×1
  const ha = ramp(t, T.hands, T.hands + .3) * (1 - ramp(t, T.copy - .4, T.copy));
  if (ha > 0) { const n = Math.floor(Math.pow(KN, clamp((t - T.hands + .2) / 2.4)));
    ctx.save(); ctx.globalAlpha = ha; ctx.textAlign = 'left'; ctx.font = `800 80px ${SERIF}`; ctx.fillStyle = '#d9a066'; ctx.shadowColor = 'rgba(217,160,102,.8)'; ctx.shadowBlur = 20; ctx.fillText(`手 ×${n >= KN ? '∞' : n}`, 560, 640); ctx.restore(); }
  const na = ramp(t, T.head, T.head + .4) * (1 - ramp(t, T.copy - .4, T.copy));
  if (na > 0 && proj.head) { ctx.save(); ctx.globalAlpha = na; ctx.textAlign = 'left'; ctx.font = `800 60px ${SERIF}`; ctx.fillStyle = GOLD_HI; ctx.shadowColor = rgba(GOLD_HI, .8); ctx.shadowBlur = 20;
    ctx.fillText('脑子 · 肩膀 ×1', proj.head[0] + 120, proj.head[1] + 10); ctx.restore(); }
  // the thesis, in two columns
  const ca = ramp(t, T.copy - .1, T.copy + .4) * (1 - ramp(t, T.name - .4, T.name + .1));
  vtext(ctx, '手可以复制', 680, 520, 96, '#d9a066', ca, ramp(t, T.copy - .1, T.copy + 1), 1.16, 700, 10);
  vtext(ctx, '判断不能', 400, 520, 96, GOLD_HI, ca, ramp(t, T.judge - .1, T.judge + .9), 1.16, 800, 26);
  seal(ctx, '审美', 810, 1300, 96, ramp(t, T.aes + .4, T.aes + .8));
  drawChrome(ctx, t < T.copy - .2 ? '一个人的上限' : '手 与 判断', .9);
  drawSubtitle(ctx, t);
}
