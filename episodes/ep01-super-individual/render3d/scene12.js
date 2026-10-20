// Beat 12: 适合一个人干的事 — 统一的品味,砸了代价也不大;一支短片、一个小产品,想法到成品一条直线
import * as THREE from 'three';
import { makeKnife, pointsMaterial } from './core.js';
import { buildOx } from './ox.js';
import { stage, sample, figure, Morph, toScreen } from './kit.js';
import { drawChrome, drawSubtitle, ramp, clamp, smooth, ease, ptime, rng, rgba, GOLD, GOLD_HI, PAPER, SERIF, W } from './overlay.js';

export const A = 149.24, B = 161.52;
const S = stage({ bloom: .85, threshold: .55 });
const { scene, camera, env } = S;
const CZ = 10.5, VH = 2 * CZ * Math.tan(THREE.MathUtils.degToRad(15)), VW = VH * 1080 / 1920, CY = .3;
const wp = (sx, sy, z = 0) => new THREE.Vector3((sx / 1080 - .5) * VW, CY + (.5 - sy / 1920) * VH, z);

const T = {
  solo: ptime(35, '一个人干'), taste: ptime(36, '统一的品味'), drop: ptime(36, '砸了') + .1, cheap: ptime(36, '代价也不大'),
  film: ptime(37, '一支短片'), app: ptime(37, '一个小产品'), idea: ptime(37, '想法'), done: ptime(37, '成品'), line: ptime(37, '一条直线'),
};

// one person, one knife, one small ox
const P0 = sample(x => figure(x, 300, 1150, 250), 12000, { w: VW, h: VH, cy: CY, res: 1080, seed: 41 });
const person = new Morph([P0], { size: .0062, scatter: 0, seed: 42, alpha: .4 }); scene.add(person.points); S.mats.push(person.mat);
const knife = makeKnife(env); knife.scale.setScalar(.45); scene.add(knife);
const kMats = []; knife.traverse(o => { if (o.material) { o.material.transparent = true; kMats.push(o.material); } });
const OX = buildOx({ surf: 16000, vol: 0, mem: 0, line: 0 });
const og = new THREE.BufferGeometry(); og.setAttribute('position', new THREE.BufferAttribute(OX.pos, 3)); og.setAttribute('aNrm', new THREE.BufferAttribute(OX.nrm, 3));
const oxMat = pointsMaterial({ uCam: { value: new THREE.Vector3() }, uGold: { value: 0 }, uShow: { value: 1 } }, { decl: 'attribute vec3 aNrm; uniform vec3 uCam; uniform float uGold,uShow;', main: `
  P=position; vec3 V=normalize(uCam-(modelMatrix*vec4(P,1.)).xyz); float rim=pow(1.-abs(dot(normalize(aNrm),V)),2.5);
  COL=mix(vec3(.75,.72,.66),vec3(1.,.7,.3),uGold)*(.08+.9*rim)*uShow; A=.4; S=.011;` });
const ox = new THREE.Points(og, oxMat); ox.frustumCulled = false; ox.scale.setScalar(.26); ox.position.copy(wp(740, 1150)); ox.rotation.y = -.5; scene.add(ox); S.mats.push(oxMat);
// a pebble: when it fails, it's small
const pebble = new THREE.Mesh(new THREE.IcosahedronGeometry(.09, 1), new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: .8, envMap: env, envMapIntensity: .6, flatShading: true }));
scene.add(pebble); const GROUND = wp(0, 1310).y;

// 想法 → 成品: a straight cut of light
const P_IDEA = wp(190, 1380), P_DONE = wp(800, 640);
const LN = 5000; const lp = new Float32Array(LN * 3), lu = new Float32Array(LN); { const R = rng(7); for (let i = 0; i < LN; i++) { const u = i / LN; const p = P_IDEA.clone().lerp(P_DONE, u); lp.set([p.x + (R() - .5) * .01, p.y + (R() - .5) * .01, (R() - .5) * .01], i * 3); lu[i] = u; } }
const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('aU', new THREE.BufferAttribute(lu, 1));
const lineMat = pointsMaterial({ uReach: { value: 0 } }, { decl: 'attribute float aU; uniform float uReach;', main: `P=position; float on=smoothstep(uReach,uReach-.02,aU); float head=exp(-pow((aU-uReach)/.02,2.));
  COL=vec3(1.,.74,.36)*on*1.1+vec3(1.,.95,.85)*head*3.*step(.001,uReach)*step(uReach,.999); A=.5; S=.006;` });
const line = new THREE.Points(lg, lineMat); line.frustumCulled = false; scene.add(line); S.mats.push(lineMat);

export const proj = {};
export function update(t) {
  camera.position.set(Math.sin(t * .31) * .04, CY + Math.sin(t * .23 + 1) * .03, CZ - .6 * smooth(ramp(t, A, B)));
  camera.lookAt(0, CY, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const gold = smooth(ramp(t, T.taste - .2, T.taste + 1)); const later = smooth(ramp(t, T.film - .4, T.film + .6));
  oxMat.uniforms.uGold.value = gold; oxMat.uniforms.uCam.value.copy(camera.position); oxMat.uniforms.uShow.value = 1 - .65 * later;
  ox.rotation.y = -.5 + Math.sin(t * .3) * .1;
  person.mat.uniforms.uBright.value = 1 - .55 * later;
  // knife: rests by the person, then rides the straight line from idea to product
  const ride = ease(ramp(t, T.idea - .1, T.line + .6));
  const rest = wp(420, 1180, .2);
  const onLine = P_IDEA.clone().lerp(P_DONE, ride);
  const k = smooth(ramp(t, T.idea - .5, T.idea));
  knife.position.copy(rest).lerp(onLine, k);
  const ang = Math.atan2(P_DONE.y - P_IDEA.y, P_DONE.x - P_IDEA.x);
  knife.rotation.set(.1, .15 * Math.sin(t * .4), THREE.MathUtils.lerp(.9, ang, k));
  kMats.forEach(m => { if (m.emissive) { m.emissive.setRGB(1, .65, .3); m.emissiveIntensity = .12 * gold; } });
  lineMat.uniforms.uReach.value = k > 0 ? ride : 0;
  // pebble drop, little bounce
  const s = t - (T.drop - .45); let y = GROUND + 2.2;
  if (s > 0) { const g = 22; const h0 = 2.2; const t1 = Math.sqrt(2 * h0 / g); if (s < t1) y = GROUND + h0 - .5 * g * s * s; else { const s2 = s - t1, v = g * t1 * .25, t2 = 2 * v / g; y = GROUND + (s2 < t2 ? v * s2 - .5 * g * s2 * s2 : 0); } }
  pebble.visible = s > 0; pebble.position.set(wp(560, 0).x + Math.max(s, 0) * .15, y + .06, .3); pebble.rotation.set(s * 3, s * 2, 0);
  pebble.material.opacity = 1;
  proj.idea = toScreen(camera, P_IDEA); proj.done = toScreen(camera, P_DONE); proj.peb = toScreen(camera, pebble.position);
  S.finish(t, A, B, { aperture: .3 });
}

function lbl(ctx, s, x, y, col, a, size = 40, align = 'center') { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.font = `700 ${size}px ${SERIF}`;
  ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 10; ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore(); }
export function overlay(ctx, t) {
  // 统一的品味: a single gold swatch
  const ga = ramp(t, T.taste, T.taste + .4) * (1 - ramp(t, T.film - .4, T.film));
  if (ga > 0) { ctx.save(); ctx.globalAlpha = ga; ctx.fillStyle = GOLD; ctx.fillRect(470, 420, 140, 14); ctx.restore(); lbl(ctx, '一种品味', 540, 380, GOLD_HI, ga, 40); }
  const ca = ramp(t, T.cheap, T.cheap + .4) * (1 - ramp(t, T.film - .4, T.film));
  if (proj.peb) lbl(ctx, '代价不大', proj.peb[0], proj.peb[1] + 90, PAPER, ca * .85, 34);
  // the product: a short film frame and a small app tile
  const fa = ramp(t, T.film - .1, T.film + .4), aa = ramp(t, T.app - .1, T.app + .4);
  const done = proj.done || [800, 640]; const lit = ramp(t, T.line + .3, T.line + .7);
  if (fa > 0) { ctx.save(); ctx.globalAlpha = fa; ctx.strokeStyle = GOLD_HI; ctx.lineWidth = 4; ctx.shadowColor = rgba(GOLD_HI, .9); ctx.shadowBlur = 14 + 30 * lit;
    ctx.beginPath(); ctx.roundRect(done[0] - 20, done[1] - 330, 170, 300, 18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(done[0] + 50, done[1] - 200); ctx.lineTo(done[0] + 90, done[1] - 180); ctx.lineTo(done[0] + 50, done[1] - 160); ctx.closePath(); ctx.fillStyle = GOLD_HI; ctx.fill(); ctx.restore();
    lbl(ctx, '一支短片', done[0] + 65, done[1] + 10, PAPER, fa * .8, 30); }
  if (aa > 0) { ctx.save(); ctx.globalAlpha = aa; ctx.strokeStyle = GOLD_HI; ctx.lineWidth = 4; ctx.shadowColor = rgba(GOLD_HI, .9); ctx.shadowBlur = 14 + 30 * lit;
    ctx.beginPath(); ctx.roundRect(done[0] - 230, done[1] - 230, 120, 120, 28); ctx.stroke(); ctx.beginPath(); ctx.arc(done[0] - 170, done[1] - 170, 26, 0, 6.283); ctx.stroke(); ctx.restore();
    lbl(ctx, '一个小产品', done[0] - 170, done[1] - 70, PAPER, aa * .8, 30); }
  if (proj.idea) { const ia = ramp(t, T.idea - .1, T.idea + .3);
    if (ia > 0) { ctx.save(); ctx.globalAlpha = ia; const g = ctx.createRadialGradient(proj.idea[0], proj.idea[1], 0, proj.idea[0], proj.idea[1], 40); g.addColorStop(0, 'rgba(255,245,220,1)'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(proj.idea[0] - 40, proj.idea[1] - 40, 80, 80); ctx.restore(); }
    lbl(ctx, '想法', proj.idea[0], proj.idea[1] + 60, PAPER, ia, 38);
    lbl(ctx, '成品', done[0] + 180, done[1] - 30, GOLD_HI, ramp(t, T.done - .1, T.done + .3), 38, 'left'); }
  drawChrome(ctx, '适合一个人干的事', .9);
  drawSubtitle(ctx, t);
}
